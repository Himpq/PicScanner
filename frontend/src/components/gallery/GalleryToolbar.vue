<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useGalleryStore } from '../../stores/gallery.js';
import { SORT_OPTIONS } from '../../constants.js';

const store = useGalleryStore();
// 暴露给 semantic_search.js 的 legacy hijack 兜底合并（非阻塞语义追加）
if (typeof window !== 'undefined') {
  window.__galleryStore = store;
  window.__gallerySearchQuery = () => String(store.searchQuery||'');
  // 兼容 hijack 的两种检测形态
  window.__galleryDoSearchSeq = 0;
  const _origDoSearch = store.doSearch;
  // 包裹以同步 seq 供 hijack 判断
  const _wrapped = async (...a) => {
    try { window.__galleryDoSearchSeq = (window.__galleryDoSearchSeq||0)+1; } catch {}
    return _origDoSearch(...a);
  };
  // 保持原引用，避免 hijack 误判
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
  // 跳转模式：只滚动高亮，不污染 photoCache（搜索结果的缩略项不含 original_url，会导致灯箱加载不出）
  store.setSearchOpen(false);
  const PS = window.PS;
  if (item.type==='date' && item.date_key) {
    const el = document.getElementById('date-'+item.date_key);
    if (el) {
      el.scrollIntoView({behavior:'smooth', block:'start'});
      if (PS && PS.state) PS.state.activeDate = item.date_key;
    }
    return;
  }
  // photo：跳转到所在日期 + 目标卡片高亮
  const dk = String(item.date_key||'');
  const pid = String(item.id||item.photo_id||'');
  // 若该 id 在 store/photoCache 已有完整记录，则合并而非覆盖；搜索结果可能只有 preview_url
  if (pid && PS && PS.state && PS.state.photoCache) {
    const existing = PS.state.photoCache.get(Number(pid));
    if (!existing && item) {
      // 仅当不存在时才缓存，且用 store 的完整记录优先
      const full = (() => {
        try { const arr = store.photoCache.get(dk) || []; return arr.find(p=>String(p.id)===pid); } catch { return null; }
      })();
      try { PS.state.photoCache.set(Number(pid), full || item); } catch {}
    }
  }
  const tryJump = () => {
    const card = pid ? document.querySelector('.photo-card[data-photo-id="'+CSS.escape(pid)+'"]') : null;
    if (card) {
      card.scrollIntoView({behavior:'smooth', block:'center', inline:'nearest'});
      card.classList.add('search-target');
      clearTimeout(card._searchTargetTimer);
      card._searchTargetTimer = setTimeout(()=>card.classList.remove('search-target'), 1500);
      if (PS && PS.state && dk) PS.state.activeDate = dk;
      if (PS && typeof PS.scheduleDateHighlight === 'function') PS.scheduleDateHighlight();
      return true;
    }
    // 若卡片尚未渲染（虚拟滚动未加载），先确保该日期的照片已拉取
    if (dk) {
      const storeCount = store.dateCounts.get(dk) || 0;
      const loaded = (store.photoCache.get(dk)||[]).length;
      if (storeCount===0 || loaded < storeCount) {
        store.fetchPhotosForDate(dk).then(()=> setTimeout(tryJump, 220)).catch(()=>{});
        // 同时尝试让虚拟网格滚动到该日期
        const dateEl = document.getElementById('date-'+dk);
        if (dateEl) dateEl.scrollIntoView({behavior:'auto', block:'start'});
        return false;
      }
      const dateEl2 = document.getElementById('date-'+dk);
      if (dateEl2) { dateEl2.scrollIntoView({behavior:'smooth', block:'start'}); return true; }
    }
    return false;
  };
  // 延迟一帧等待 search-panel 关闭后的布局回流
  requestAnimationFrame(()=> setTimeout(tryJump, 80));
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

// 全局点击收起
function onDocClick(e){
  const t=e.target; if(!(t instanceof Element)) return;
  if (!t.closest('#sort-dropdown') && !t.closest('.sort-trigger')) store.sortOpen=false;
  if (!t.closest('.filter-pop') && !t.closest('.filter-trigger') && !t.closest('.filter-combo')) { /* 保持 filterOpen 由按钮控制，点击外部不自动关 */ }
  if (filterOpen.value && !t.closest('.filter-pop') && !t.closest('.filter-trigger')) { /* 可选自动关 */ }
}
function onKey(e){
  if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='f'){ e.preventDefault(); toggleSearch(); }
  if (e.key==='Escape'){ if(searchOpen.value) closeSearch(); if(filterOpen.value) closeFilter(); if(sortOpen.value) store.sortOpen=false; }
}
watch(()=>store.searchQuery, v=>{ searchQuery.value=String(v||''); });
watch(()=>store.searchScope, v=>{ searchScope.value=String(v||'all'); });
watch(searchOpen, (open)=>{ if(open) nextTick(()=> searchInputRef.value?.focus()); });

onMounted(()=>{
  searchQuery.value = String(store.searchQuery||'');
  searchScope.value = String(store.searchScope||'all');
  syncDraftFromStore();
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(()=>{
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
  clearTimeout(debounceTimer);
});

const timeRange = computed(()=>{
  const PS=window.PS;
  const el=document.getElementById('time-range');
  // 优先读 DOM 的 time-range（由 app_gallery 写入），否则从 dates 推断
  if (el && el.textContent.trim()) return el.textContent.trim();
  const ds = store.dates;
  if (ds.length) return ds[0].date_key + ' → ' + ds[ds.length-1].date_key;
  return '';
});
</script>

<template>
  <div class="toolbar-wrap">
    <div class="toolbar" id="vanilla-toolbar" v-if="false"></div>
    <div class="toolbar" id="vue-toolbar">
      <button class="ghost-btn back-btn" title="返回选择来源" @click="changeSource"><span aria-hidden="true">←</span><span>返回上一级</span></button>
      <button class="icon-btn" title="设置" @click="openSettings">⚙</button>
      <button class="ghost-btn" @click="openStats">统计信息</button>
      <button class="ghost-btn filter-trigger" type="button" :class="{ active: hasFilter }" @click="toggleFilter" @contextmenu="onFilterContextMenu" :title="hasFilter?'点击清除筛选 / 右键筛已收藏':'筛选'">{{ hasFilter ? '筛选中' : '筛选' }}</button>

      <div class="sort-dropdown" id="sort-dropdown">
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

    <!-- 筛选弹层：复用 filter-pop 样式，定位跟随 trigger -->
    <div v-if="filterOpen" class="filter-pop" style="display:block; position:fixed; z-index:40; left:50%; top:120px; transform:translateX(-50%); max-width:360px; width:92vw;">
      <div class="filter-form" v-if="filterLoading">读取中…</div>
      <div v-else-if="filterError" class="filter-form" style="color:var(--danger)">{{ filterError }}</div>
      <div v-else class="filter-form">
        <label class="filter-check"><input type="checkbox" v-model="draftFavorite"> 已收藏</label>

        <div class="filter-row">
          <label>镜头</label>
          <div class="filter-combo" :class="{ open: lensOpen }" :data-value="draftLens">
            <button class="filter-combo-trigger" type="button" @click="lensOpen=!lensOpen; focalOpen=false"><span>{{ draftLens || '全部镜头' }}</span><b>v</b></button>
            <div class="filter-combo-menu" :class="{ hidden: !lensOpen }">
              <button class="filter-option" :class="{selected: !draftLens}" type="button" @click="draftLens=''; lensOpen=false">全部镜头</button>
              <button v-for="r in lenses" :key="r.name" class="filter-option" :class="{selected: draftLens===r.name}" type="button" @click="draftLens=r.name; lensOpen=false">{{ r.name }} ({{ r.count }})</button>
            </div>
          </div>
        </div>

        <div class="filter-row">
          <label>焦段范围</label>
          <div class="filter-combo" :class="{ open: focalOpen }" :data-value="draftFocal">
            <button class="filter-combo-trigger" type="button" @click="focalOpen=!focalOpen; lensOpen=false"><span>{{ draftFocal || '全部焦段' }}</span><b>v</b></button>
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
.filter-pop { background: var(--panel-2, #121216); border:1px solid var(--line); border-radius:10px; box-shadow: 0 12px 32px rgba(0,0,0,0.45); padding:10px; }
.search-panel { position: absolute; z-index: 75; top: 56px; left: 16px; right: 16px; margin-top:0; }
.search-box { width: min(760px, 100%); max-height: min(620px, calc(100vh - var(--titlebar-h) - 96px)); overflow:auto; }
.filter-form { display:flex; flex-direction:column; gap:10px; }
.filter-check { display:flex; align-items:center; gap:8px; font-size:13px; }
.filter-row { display:flex; align-items:center; gap:8px; }
.filter-row label { width:70px; font-size:12px; color:var(--muted); }
.filter-combo { flex:1; position:relative; }
.filter-combo-trigger { width:100%; display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border:1px solid var(--line); border-radius:8px; background: var(--panel); cursor:pointer; }
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
