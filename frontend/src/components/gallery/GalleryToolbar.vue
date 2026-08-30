<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useGalleryStore } from '../../stores/gallery.js';
import { SORT_OPTIONS } from '../../constants.js';
import { logWarn } from '../../utils/log.js';

const store = useGalleryStore();
// 这里只升级 __galleryStore 为真正的 store 实例（store 模块里给的是一个
// 只有 get/set 的兜底门面）。
//
// __gallerySearchQuery / __galleryDoSearchSeq 的契约**不要在这里覆写** ——
// 唯一定义在 stores/gallery.js 末尾，两个都必须是函数：
//   __gallerySearchQuery() 被当函数调用（semantic_search.js:170）
//   __galleryDoSearchSeq   只做真值判断（:146）
// 以前这里把 __galleryDoSearchSeq 赋成 0（假值），hijack 就判定
// vueHandles=false，于是自己又追加一份语义结果，与 Vue 侧重复。
if (typeof window !== 'undefined') {
  window.__galleryStore = store;
}

// sort
const sortLabel = computed(() => store.currentSortLabel());
const sortOpen = computed(() => store.sortOpen);
function toggleSort() { store.sortOpen = !store.sortOpen; if (store.sortOpen) store.filterOpen = false; }
function pickSort(key) { store.applySort(key); }

// filter
const hasFilter = computed(() => store.hasActiveFilter);
const filterOpen = computed(() => store.filterOpen);
const filterOptions = computed(() => store.filterOptions);
const filterLoading = ref(false);
const filterError = ref('');
// draft
const draftFavorite = ref(false);
const draftLens = ref('');
const draftFocal = ref('');
const draftStart = ref('');
const draftEnd = ref('');
const lensOpen = ref(false);
const focalOpen = ref(false);
const filterTriggerRef = ref(null);
const filterPopRef = ref(null);

function syncDraftFromStore() {
  const f = store.activeFilter || {};
  draftFavorite.value = !!f.favorite;
  draftLens.value = String(f.lens || '');
  draftFocal.value = String(f.focal_bucket || '');
  draftStart.value = String(f.start_date || '');
  draftEnd.value = String(f.end_date || '');
}

async function toggleFilter(ev) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  if (hasFilter.value) {
    store.clearFilter();
    return;
  }
  if (filterOpen.value) { store.filterOpen = false; return; }
  store.sortOpen = false;
  syncDraftFromStore();
  store.filterOpen = true;
  filterError.value = '';
  if (!store.filterOptions) {
    filterLoading.value = true;
    try { await store.fetchFilterOptions(); } catch (e) { filterError.value = String(e.message||e); }
    finally { filterLoading.value = false; }
  }
}
function closeFilter() { store.filterOpen = false; lensOpen.value=false; focalOpen.value=false; }
function applyFilter() {
  const next = {};
  if (draftFavorite.value) next.favorite = true;
  if (draftLens.value.trim()) next.lens = draftLens.value.trim();
  if (draftFocal.value.trim()) next.focal_bucket = draftFocal.value.trim();
  if (draftStart.value.trim()) next.start_date = draftStart.value.trim();
  if (draftEnd.value.trim()) next.end_date = draftEnd.value.trim();
  store.applyFilter(next);
}
function onFilterContextMenu(ev) {
  ev.preventDefault(); ev.stopPropagation();
  // 右键直接筛已收藏
  store.applyFilter({ favorite: true });
}

const lenses = computed(() => (filterOptions.value && filterOptions.value.lenses) || []);
const focals = computed(() => (filterOptions.value && filterOptions.value.focal_buckets) || []);
const dateRange = computed(() => (filterOptions.value && filterOptions.value.date_range) || {});

// search — 无按钮，Ctrl+F 触发，floating 在 toolbar 下方
const searchOpen = computed(() => store.searchOpen);
const searchQuery = ref('');
const searchScope = ref('all');
const searchInputRef = ref(null);
let debounceTimer = null;
function toggleSearch() {
  const next = !store.searchOpen;
  store.setSearchOpen(next);
  if (next) {
    nextTick(() => {
      // 用 ref 聚焦，确保在 panel 渲染后
      if (searchInputRef.value) searchInputRef.value.focus();
      else document.querySelector('#vue-toolbar .search-input')?.focus();
      // 若 gallery-wrap 隐藏时首次聚焦失败，延迟再试
      setTimeout(() => searchInputRef.value?.focus(), 120);
    });
  }
}
function closeSearch() { store.setSearchOpen(false); }
function onSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=>store.doSearch(searchQuery.value, searchScope.value), 180);
}
function onScope(s) { searchScope.value=s; store.doSearch(searchQuery.value, s); }
function openSearchResult(item) {
  if (!item) return;
  store.setSearchOpen(false);
  const PS = window.PS;

  // ---- 日期型结果 ----
  // 走 legacy 的 jumpToDate：目标分区可能还没被虚拟化渲染出来，
  // 直接 getElementById 会得到 null，那就什么都不发生。
  if (item.type === 'date' && item.date_key) {
    if (PS && typeof PS.jumpToDate === 'function') PS.jumpToDate(item.date_key);
    else {
      const el = document.getElementById('date-' + item.date_key);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }

  // ---- 照片型结果 ----
  //
  // 这里**必须**委托给 legacy 的 PS.jumpToSearchPhoto，不能自己实现。
  // 原因：分区内的 .photo-card 是 legacy 虚拟化渲染的。
  // store.fetchPhotosForDate() 只更新 Pinia，不会创建任何 DOM 节点，
  // 于是 querySelector 永远找不到卡片，跳转就退化成"只滚到日期分区"
  // —— 这正是之前"搜索跳不到具体图片"的根因。
  //
  // legacy 那边还掌握着一个 Vue 没有的关键数据：photo.search_offset
  // （后端 api.py 给出，是该照片在日期组内的下标），
  // 配合 loadPhotosForDate({limit: offset+1-loaded}) 可以一次请求加载到目标位置。
  if (PS && typeof PS.jumpToSearchPhoto === 'function') {
    try {
      const r = PS.jumpToSearchPhoto(item);
      if (r && typeof r.catch === 'function') {
        r.catch(() => { if (item.date_key && PS.jumpToDate) PS.jumpToDate(item.date_key); });
      }
    } catch {
      if (item.date_key && PS.jumpToDate) PS.jumpToDate(item.date_key);
    }
    return;
  }

  // 兜底（legacy 接口缺失时）：至少滚到所在日期
  const dk = String(item.date_key || '');
  if (dk && PS && typeof PS.jumpToDate === 'function') PS.jumpToDate(dk);
}
function highlightParts(text, query) {
  const t = String(text||''); const q = String(query||'').trim();
  if (!q) return [{text:t, hit:false}];
  const terms = q.split(/\s+/).filter(Boolean).sort((a,b)=>b.length-a.length);
  if (!terms.length) return [{text:t, hit:false}];
  // 简单首词高亮
  const lower = t.toLowerCase(); const lowerTerms = terms.map(x=>x.toLowerCase());
  let idx=-1, len=0; lowerTerms.forEach(term=>{ const i=lower.indexOf(term); if(i>=0 && (idx<0||i<idx||(i===idx&&term.length>len))){idx=i; len=term.length;}});
  if (idx<0) return [{text:t, hit:false}];
  return [{text:t.slice(0,idx), hit:false},{text:t.slice(idx,idx+len), hit:true},{text:t.slice(idx+len), hit:false}];
}

function changeSource(){ const PS=window.PS; if(PS&&PS.showSourceChooser) PS.showSourceChooser(); }
function openStats(){ const PS=window.PS; if(PS&&PS.openStatsPage) PS.openStatsPage(); }
function openSettings(){ const PS=window.PS; if(PS&&PS.openSettingsPage) PS.openSettingsPage('interface'); }
function openCollections(){ const PS=window.PS; if(PS&&PS.openCollections) PS.openCollections(); else { // fallback: dispatch legacy button click
  const btn=document.getElementById('open-collections'); if(btn) btn.click(); else logWarn('openCollections not ready'); } }

// 全局点击收起
function onDocClick(e){
  const t=e.target; if(!(t instanceof Element)) return;
  // 用 class 而不是 #sort-dropdown：#id 选择器与 getElementById 都只认文档里
  // 第一个匹配项，一旦将来再出现第二份 .sort-dropdown 就会指向错误节点。
  // 按 class 向上找则与 id 无关。
  if (!t.closest('.sort-dropdown') && !t.closest('.sort-trigger')) store.sortOpen=false;
}
function onKey(e){
  if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='f'){
    e.preventDefault();
    // 必须阻止冒泡：legacy 在 document 的**冒泡**阶段还有一条 Ctrl+F 处理器
    // （app.js 的 keydown 监听），它调 PS.toggleSearchPanel()，读的是同一个
    // 被代理的 state.searchOpen —— 我们刚打开，它就判定"已打开"于是立刻关掉。
    // 捕获阶段先跑 + 不阻止传播 = 开了就关。
    e.stopPropagation();
    toggleSearch();
    return;
  }
  if (e.key==='Escape'){
    // 优先关闭画廊对比面板（legacy），避免被 Vue 的 filter/search 抢占导致 Esc 失效
    try {
      const PS = window.PS;
      if (PS && PS.state && PS.state.compare && PS.state.compare.open && !PS.state.compare.lightbox) {
        if (typeof PS.closeComparePanel === 'function') PS.closeComparePanel();
        else if (PS.state.compare.panel) PS.state.compare.panel.classList.add('hidden');
        PS.state.compare.open = false;
        e.preventDefault(); e.stopPropagation();
        return;
      }
    } catch {}
    if(searchOpen.value) closeSearch();
    if(filterOpen.value) closeFilter();
    if(sortOpen.value) store.sortOpen=false;
    // 若 document 层级已处理，仍确保阻止冒泡避免重复触发
    if (searchOpen.value || filterOpen.value || sortOpen.value) {
      // 已在上行关闭，无需额外阻止
    }
  }
}
watch(()=>store.searchQuery, v=>{ searchQuery.value=String(v||''); });
watch(()=>store.searchScope, v=>{ searchScope.value=String(v||'all'); });
watch(searchOpen, (open)=>{ if(open) nextTick(()=> searchInputRef.value?.focus()); });

onMounted(()=>{
  searchQuery.value = String(store.searchQuery||'');
  searchScope.value = String(store.searchScope||'all');
  syncDraftFromStore();
  document.addEventListener('click', onDocClick);
  // 捕获阶段监听 Esc，确保 compare-picker 优先于 legacy 的其它 Esc 分支关闭
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('keydown', onKey, true);
});
onBeforeUnmount(()=>{
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey, true);
  window.removeEventListener('keydown', onKey, true);
  clearTimeout(debounceTimer);
});

// 时间范围：直接由 store 的日期分组推算。
// 以前先去读 #time-range 的 textContent（由 app_gallery 的 applyScanData 写入），
// 那是隐藏的 vanilla 工具栏里的节点 —— 依赖一个看不见的 DOM 来渲染看得见的 UI，
// 正是重复 id / 双轨那类 bug 的温床。vanilla 工具栏删除后该节点已不存在。
const timeRange = computed(()=>{
  const ds = store.dates;
  if (!ds.length) return '';
  const first = ds[0].date_key;
  const last = ds[ds.length - 1].date_key;
  return first === last ? first : first + ' → ' + last;
});
</script>

<template>
  <div class="toolbar-wrap">
    <div class="toolbar" id="vue-toolbar-content">
      <button class="ghost-btn back-btn" title="返回选择来源" @click="changeSource"><span aria-hidden="true">←</span><span>返回上一级</span></button>
      <button class="icon-btn" title="设置" @click="openSettings">⚙</button>
      <button class="ghost-btn" @click="openCollections">集锦</button>
      <button class="ghost-btn" @click="openStats">统计信息</button>
      <div class="filter-anchor">
        <button ref="filterTriggerRef" class="ghost-btn filter-trigger" type="button" :class="{ active: hasFilter }" @click="toggleFilter" @contextmenu="onFilterContextMenu" :title="hasFilter?'点击清除筛选 / 右键筛已收藏':'筛选'">{{ hasFilter ? '筛选中' : '筛选' }}</button>
        <div ref="filterPopRef" v-if="filterOpen" class="filter-pop">
      <div class="filter-form" v-if="filterLoading">读取中…</div>
      <div v-else-if="filterError" class="filter-form" style="color:var(--danger)">{{ filterError }}</div>
      <div v-else class="filter-form">
        <label class="filter-check"><input type="checkbox" v-model="draftFavorite"> 已收藏</label>

        <div class="filter-row">
          <label>镜头</label>
          <div class="filter-combo" :class="{ open: lensOpen }" :data-value="draftLens">
            <button class="filter-combo-trigger" type="button" @click="lensOpen=!lensOpen; focalOpen=false"><span>{{ draftLens || '全部镜头' }}</span><svg class="filter-caret" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <div class="filter-combo-menu" :class="{ hidden: !lensOpen }">
              <button class="filter-option" :class="{selected: !draftLens}" type="button" @click="draftLens=''; lensOpen=false">全部镜头</button>
              <button v-for="r in lenses" :key="r.name" class="filter-option" :class="{selected: draftLens===r.name}" type="button" @click="draftLens=r.name; lensOpen=false">{{ r.name }} ({{ r.count }})</button>
            </div>
          </div>
        </div>

        <div class="filter-row">
          <label>焦段范围</label>
          <div class="filter-combo" :class="{ open: focalOpen }" :data-value="draftFocal">
            <button class="filter-combo-trigger" type="button" @click="focalOpen=!focalOpen; lensOpen=false"><span>{{ draftFocal || '全部焦段' }}</span><svg class="filter-caret" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <div class="filter-combo-menu" :class="{ hidden: !focalOpen }">
              <button class="filter-option" :class="{selected: !draftFocal}" type="button" @click="draftFocal=''; focalOpen=false">全部焦段</button>
              <button v-for="r in focals" :key="r.name" class="filter-option" :class="{selected: draftFocal===r.name}" type="button" @click="draftFocal=r.name; focalOpen=false">{{ r.name }} ({{ r.count }})</button>
            </div>
          </div>
        </div>

        <div class="filter-row"><label>开始日期</label><input type="date" v-model="draftStart" :min="dateRange.earliest||''" :max="dateRange.latest||''"></div>
        <div class="filter-row"><label>结束日期</label><input type="date" v-model="draftEnd" :min="dateRange.earliest||''" :max="dateRange.latest||''"></div>
        <div class="filter-actions"><button class="ghost-btn" type="button" @click="closeFilter">取消</button><button class="primary-btn" type="button" @click="applyFilter">应用</button></div>
      </div>
    </div>
      </div>

      <!-- 不要在这里加 id="sort-dropdown"。历史上页面上有两份同 id 节点，
           getElementById 只命中文档里第一个，导致“点了下拉却判定在外部”的怪 bug。
           排序状态完全由 store.sortOpen 驱动，不需要 id 寻址。 -->
      <div class="sort-dropdown">
        <button class="sort-trigger" type="button" aria-haspopup="listbox" :aria-expanded="sortOpen?'true':'false'" @click="toggleSort">
          <span>{{ sortLabel }}</span>
          <svg class="sort-caret" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="sort-menu" :class="{ hidden: !sortOpen }" role="listbox">
          <button v-for="opt in SORT_OPTIONS" :key="opt.key" type="button" class="sort-option" :aria-selected="opt.key===store.sortKey?'true':'false'" @click="pickSort(opt.key)">{{ opt.label }}</button>
        </div>
      </div>

      <div class="toolbar-spacer"></div>
      <span class="time-range">{{ timeRange }}</span>
    </div>

    <section v-if="searchOpen" class="search-panel" aria-label="搜索">
      <div class="search-box">
        <div class="search-input-row">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input ref="searchInputRef" class="search-input" type="search" placeholder="搜索文件名、镜头、日期或备注" autocomplete="off" v-model="searchQuery" @input="onSearchInput" />
          <button class="icon-btn search-close" title="关闭搜索" type="button" @click="closeSearch">×</button>
        </div>
        <div class="search-scope-row">
          <button class="search-scope" :class="{active: searchScope==='all'}" type="button" @click="onScope('all')">全部</button>
          <button class="search-scope" :class="{active: searchScope==='filename'}" type="button" @click="onScope('filename')">文件名</button>
          <button class="search-scope" :class="{active: searchScope==='metadata'}" type="button" @click="onScope('metadata')">参数</button>
          <button class="search-scope" :class="{active: searchScope==='note'}" type="button" @click="onScope('note')">备注</button>
        </div>
        <div class="search-status">{{ store.searchStatus }}</div>
        <div class="search-results">
          <button v-for="item in store.searchResults" :key="(item.type==='date'?'date:'+item.date_key:'photo:'+item.id)" type="button" class="search-result" @click="openSearchResult(item)">
            <span class="search-thumb" :class="{date: item.type==='date'}">
              <img v-if="item.type==='date' ? item.cover_url : item.preview_url" :src="item.type==='date'?item.cover_url:item.preview_url" alt="" />
            </span>
            <span class="search-result-main">
              <strong class="search-hit-title">
                <template v-for="(p,i) in highlightParts(item.search_title||item.filename||item.date_key||'未命名', store.searchQuery)" :key="i"><mark v-if="p.hit">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template>
              </strong>
              <span>{{ item.type==='date' ? (item.date_key + ' · ' + (item.count||0)+'张') : [item.date_key, item.model, item.lens_model].filter(Boolean).join(' · ') }}</span>
            </span>
            <span class="search-result-meta">{{ item.search_label || (item.type==='date'?'日期':(item.format_label||item.format||'')) }}</span>
          </button>
          <div v-if="!store.searchResults.length && store.searchStatus.includes('没有找到')" class="search-empty">换个关键词或搜索范围试试</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.toolbar-wrap { display:block; position:relative; }
.toolbar { position:relative; }
/* 归一化 toolbar 按钮高度：抹平全局 style.css 中 .sort-trigger 30px vs .ghost-btn 32px 的差异 */
#vue-toolbar .ghost-btn,
#vue-toolbar .icon-btn,
#vue-toolbar .sort-trigger {
  height: 32px;
  min-height: 32px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
#vue-toolbar .sort-trigger { border-radius: 8px; }
.filter-anchor { position: relative; display: inline-flex; align-items: center; }
.filter-anchor .filter-pop {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 340px;
  max-width: min(340px, calc(100vw - 24px));
  z-index: 100;
  background: var(--panel-2, #121216);
  border:1px solid var(--line);
  border-radius:10px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.45);
  padding:10px;
}
.filter-pop { background: var(--panel-2, #121216); border:1px solid var(--line); border-radius:10px; box-shadow: 0 12px 32px rgba(0,0,0,0.45); padding:10px; }
.search-panel { position: absolute; z-index: 75; top: 56px; left: 16px; right: 16px; margin-top:0; }
.search-box { width: min(760px, 100%); max-height: min(620px, calc(100vh - var(--titlebar-h) - 96px)); overflow:auto; }
.filter-form { display:flex; flex-direction:column; gap:10px; }
.filter-check { display:flex; align-items:center; gap:8px; font-size:13px; }
.filter-row { display:flex; align-items:center; gap:8px; }
.filter-row label { width:70px; font-size:12px; color:var(--muted); }
.filter-combo { flex:1; position:relative; }
.filter-combo-trigger { width:100%; display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border:1px solid var(--line); border-radius:8px; background: var(--panel); cursor:pointer; }
.filter-caret { color: var(--muted); flex-shrink:0; transition: transform .16s ease; }
.filter-combo.open .filter-caret { transform: rotate(180deg); color: var(--text); }
.filter-combo-menu { position:absolute; left:0; right:0; top:calc(100% + 6px); max-height:220px; overflow:auto; background: var(--panel); border:1px solid var(--line); border-radius:8px; z-index:5; }
.filter-combo-menu.hidden { display:none; }
.filter-option { display:block; width:100%; text-align:left; padding:6px 8px; border:none; background:transparent; cursor:pointer; }
.filter-option.selected, .filter-option:hover { background: rgba(255,255,255,0.06); }
.filter-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:4px; }

.search-result { width:100%; display:flex; align-items:center; gap:10px; padding:8px; border:none; background:transparent; cursor:pointer; text-align:left; border-radius:8px; }
.search-result:hover { background: rgba(255,255,255,0.06); }
.search-thumb { width:44px; height:44px; border-radius:6px; overflow:hidden; background:#0d0d10; flex-shrink:0; display:grid; place-items:center; }
.search-thumb img { width:100%; height:100%; object-fit:cover; }
.search-thumb.date { background: var(--panel-3); }
.search-result-main { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.search-result-main strong { font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.search-result-main span { font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.search-result-meta { font-size:11px; color:var(--muted); }
.search-hit-title mark { background: rgba(224,164,90,0.32); color: inherit; padding:0 1px; border-radius:2px; }
</style>
