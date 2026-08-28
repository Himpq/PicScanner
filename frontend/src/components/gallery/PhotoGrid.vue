<script setup>
/**
 * PhotoGrid — PR4 虚拟滚动照片墙
 * 手写虚拟化，不引入 @tanstack/virtual，完全贴合 PicScanner 场景：
 * - 按日期分组，CSS grid 用固定列宽（贴合 style.css auto-fill 行为）
 * - 绝对定位 + 总高度占位，仅渲染视口 ±4 行
 * - 滚动容器复用 #gallery-scroll（legacy 与 Vue 共享），ResizeObserver 响应 Ctrl+滚轮改缩略图
 * - 3000 张/百日规模下 DOM 节点从 3000 降至 80 左右，首屏 <50ms
 */
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { useGalleryStore } from '../../stores/gallery.js';
import { useBatchStore } from '../../stores/batch.js';
import { useVirtualGrid } from '../../composables/useVirtualGrid.js';

const store = useGalleryStore();
const batch = useBatchStore();

const dates = computed(() => store.dates);
const hasDates = computed(() => dates.value.length > 0);
const isEmpty = computed(() => !dates.value.length && !store.loadingDates && store.noMoreDates);
const isLoadingInitial = computed(() => !dates.value.length && store.loadingDates);
// 虚拟网格：列数随 --photo-min-size 动态算
const grid = useVirtualGrid({
  getItemSize: () => store.galleryItemSizeRaw || store.galleryItemSize || 168,
  getGap: () => 10,
  getHeaderHeight: () => 38,
  getMoreHeight: () => 34,
  overscanRows: 5,
});

// 调试：暴露到 window 供控制台查看
if (typeof window !== 'undefined') window.__photoGridDebug = { store, grid, dates };

// 本地状态
const scrollContainer = ref(null); // 若找到 #gallery-scroll 则复用，否则用自建容器
// 仅当复用 legacy 滚动容器时隐藏自建容器；
// 不能用 v-if="!scrollContainer" —— 模板读取 ref 又通过 ref 写回同一变量，
// 会形成 "渲染 → setRef → 重渲" 的无限递归（栈溢出崩溃）
const fallbackScrollHidden = ref(
    typeof document !== 'undefined' && !!document.getElementById('gallery-scroll'),
);
const virtualHost = ref(null);
const totalHeight = ref(0);
const layouts = ref([]); // [{key, top, height, rows, cols, count, date}]
const visibleLayouts = ref([]); // 仅保留视口相交的日期布局 + 切片信息
let rafSync = 0;
let batchTimer = null;

// 工具
function countFor(d) { return Number(store.dateCounts.get(d.date_key) || d.count || 0); }
function loadedFor(d) { return store.photosForDate(d.date_key).length; }
function photosFor(d) { return store.photosForDate(d.date_key); }
function isLoading(d) { return store.isPhotoLoading(d.date_key); }
function thumbUrl(p) { return p.thumbnail_url || p.preview_url || p.lightbox_url || ''; }
function photoId(p) { return String(p.id || p.photo_id || p.path || ''); }

function isBatchSelected(photo) {
  const id = photo.id || photo.photo_id;
  if (id == null) return false;
  return batch.selected.some((p) => String(p.id || p.photo_id) === String(id));
}

// 灯箱：优先 Vue 真源（PR6），legacy 仅镜像
function openLightbox(photo) {
  const PS = window.PS;
  try { if (PS && PS.state && PS.state.photoCache) PS.state.photoCache.set(Number(photo.id), photo); } catch {}
  // 优先 Vue store（避免 PS.openLightbox 劫持时序竞态）
  try {
    if (window.__lightboxStore && typeof window.__lightboxStore.openLightbox === 'function') {
      window.__lightboxStore.openLightbox(photo);
      return;
    }
  } catch {}
  // 同步 import 兜底
  import('../../stores/lightbox.js').then(({ useLightboxStore }) => {
    try { useLightboxStore().openLightbox(photo); } catch {}
    // 若 Vue 灰度关闭，回退 legacy
    const PS2 = window.PS;
    if (PS2 && typeof PS2._origOpenLightbox === 'function' && !document.querySelector('#vue-lightbox .ps-lightbox-shell')) {
      PS2._origOpenLightbox(photo);
    } else if (PS2 && typeof PS2.openLightbox === 'function' && !window.__lightboxStore) {
      PS2.openLightbox(photo);
    }
  }).catch(()=>{
    if (PS && typeof PS.openLightbox === 'function') PS.openLightbox(photo);
  });
}

function handleCardClick(photo, ev) {
  // 批量模式 / 对比模式优先
  if (ev && (ev.ctrlKey || ev.metaKey)) {
    const PS = window.PS;
    if (PS && PS.batchSelectionController && typeof PS.batchSelectionController.toggle === 'function') {
      PS.batchSelectionController.toggle(photo);
      batch.hydrateFromLegacy();
      return;
    }
    // 无 PS 时本地切换（兜底）
    const idx = batch.selected.findIndex((p) => String(p.id || p.photo_id) === String(photo.id || photo.photo_id));
    if (idx >= 0) batch.selected.splice(idx, 1);
    else batch.selected.push(photo);
    return;
  }
  const PS = window.PS;
  if (PS && PS.batchSelectionController && PS.batchSelectionController.handlePhotoClick) {
    const current = (PS.state && PS.state.photoCache && PS.state.photoCache.get(Number(photo.id))) || photo;
    if (PS.batchSelectionController.handlePhotoClick(ev, current)) return;
  }
  if (window.PS && window.PS.state && window.PS.state.compare && window.PS.state.compare.open) {
    const PS2 = window.PS;
    if (typeof PS2.toggleComparePhoto === 'function') {
      PS2.toggleComparePhoto(photo);
      return;
    }
  }
  openLightbox(photo);
}

function handleContextMenu(photo, ev) {
  ev.preventDefault();
  const PS = window.PS;
  if (PS && typeof PS.showPhotoContextMenu === 'function') {
    PS.showPhotoContextMenu(ev.clientX, ev.clientY, photo);
    return;
  }
  if (PS && typeof PS.showContextMenu === 'function') {
    // 兜底：收藏 / 隐藏 / 笔记
    PS.showContextMenu?.(ev.clientX, ev.clientY, photo);
  }
}

function handleDateContextMenu(dateKey, ev) {
  ev.preventDefault();
  const PS = window.PS;
  if (PS && typeof PS.showDateContextMenu === 'function') PS.showDateContextMenu(ev.clientX, ev.clientY, dateKey);
}

// 双轨显隐：Vue 有数据时才隐藏 vanilla，空数据时保留 vanilla 兜底
function syncVanillaVisibility() {
  const vanilla = document.getElementById('gallery');
  const sentinel = document.getElementById('older-sentinel');
  const vueEl = document.getElementById('vue-photo-grid');
  const has = hasDates.value && totalHeight.value > 0 && visibleLayouts.value.length > 0;
  if (vanilla) vanilla.classList.toggle('hidden', has);
  if (sentinel) sentinel.classList.toggle('hidden', has);
  if (vueEl) vueEl.classList.toggle('hidden', false); // vue 始终可见（内部自行显示 loading/empty）
}

// 虚拟化核心：重建布局 + 求可见切片
function rebuild() {
  const ds = dates.value;
  if (!ds.length) {
    layouts.value = [];
    totalHeight.value = 0;
    visibleLayouts.value = [];
    syncVanillaVisibility();
    return;
  }
  const built = grid.buildLayouts(ds, countFor);
  layouts.value = built.layouts;
  totalHeight.value = built.totalHeight;
  syncVisible();
  syncVanillaVisibility();
}

function syncVisible() {
  if (!layouts.value.length) { visibleLayouts.value = []; return; }
  const vp = grid.visibleRange(totalHeight.value);
  const first = grid.firstVisibleIndex(layouts.value, vp.start);
  const out = [];
  // 从 first 向后扫描直到超出 end
  for (let i = first; i < layouts.value.length; i++) {
    const L = layouts.value[i];
    if (L.top >= vp.end) break;
    const slice = grid.sliceForLayout(L, vp);
    if (!slice && L.top + L.height <= vp.start) continue;
    // 即使 slice 为 null（仅 header 可见），也保留该日期以显示 header
    out.push({
      layout: L,
      slice: slice || { rowStart: 0, rowEnd: Math.min(L.rows, 1), cols: L.cols, offsetY: 0 },
      // 额外标记：是否需要渲染 header/more
      headerVisible: L.top < vp.end && L.top + 38 > vp.start,
    });
    // 提前触发按需加载：可见末行接近已加载末尾时自动加载下一批
    const loaded = loadedFor(L.date);
    const total = L.count;
    if (total > 0 && loaded < total) {
      const visibleEndRow = slice ? slice.rowEnd : 1;
      const visibleEndIndex = visibleEndRow * L.cols;
      const remainingInView = loaded - visibleEndIndex;
      // 当视口末尾距离已加载末尾 < 2 行时，预加载
      if (remainingInView < L.cols * 2 && !isLoading(L.date)) {
        store.fetchPhotosForDate(L.date.date_key).catch(() => {});
      }
    }
  }
  visibleLayouts.value = out;

  // 尾部预取：若视口接近总高度底部，触发更早日期
  const nearBottom = grid.scrollTop.value + grid.viewportHeight.value >= totalHeight.value - 800;
  if (nearBottom && !store.loadingDates && !store.noMoreDates) {
    store.fetchDates().catch(() => {});
  }
}

function onScrollFrame() {
  if (rafSync) cancelAnimationFrame(rafSync);
  rafSync = requestAnimationFrame(() => { syncVisible(); });
}

function attachScroll() {
  // 优先复用 legacy 的 #gallery-scroll，保证与 DateRail/灯箱共享同一滚动上下文
  const legacy = document.getElementById('gallery-scroll');
  const host = legacy || scrollContainer.value || document.getElementById('vue-photo-grid');
  if (!host) return;
  // 若 host 是 #gallery-scroll，则虚拟内容直接渲染到 #vue-photo-grid（其内部），滚动仍在外层
  // 保持 scrollContainer 指向真正的可滚动元素
  const scrollHost = legacy || host;
  scrollContainer.value = scrollHost;
  // legacy 容器可用时自建容器退居隐藏；自建容器自身作为滚动宿主时必须保持可见
  fallbackScrollHidden.value = !!legacy;
  grid.attach(scrollHost);
  // 接管滚动事件做虚拟同步（grid.attach 已监听，此处额外补同步）
  scrollHost.addEventListener('scroll', onScrollFrame, { passive: true });
  // 初始测量
  nextTick(() => { grid.measure(); rebuild(); });
}

function detachScroll() {
  const host = scrollContainer.value;
  if (host) host.removeEventListener('scroll', onScrollFrame);
  grid.detach();
}

// 监听 store 变化：dates / counts / galleryItemSize
watch(dates, () => { nextTick(rebuild); }, { deep: false });
watch(() => store.galleryItemSizeRaw, () => { nextTick(rebuild); });
watch(() => store.photoCache, () => { nextTick(rebuild); }, { deep: false });
watch(() => store.dateCounts, () => { nextTick(rebuild); }, { deep: true });


let sourceSyncTimer = null;
let workspaceObserver = null;

function syncSourceFromPS() {
  const PS = window.PS;
  if (!PS || !PS.state) return false;
  const root = String(PS.state.currentRootPath || '');
  const sid = String(PS.state.currentSourceId || '');
  if (!root && !sid) return false;
  // Pinia store 外部是解包后的值，不能用 .value
  if (root !== store.currentRootPath || sid !== store.currentSourceId) {
    store.syncSourceContext(root, sid);
    // syncSourceContext 已清空 photoCache/offsets，这里再强制重置日期分页
    store.dates = [];
    store.dateCursor = null;
    store.noMoreDates = false;
    // 触发真源拉取（store 内部会处理 loading 互斥）
    store.fetchDates({ reset: true }).then(() => nextTick(rebuild)).catch(() => {});
    console.log('[PhotoGrid] source switched', root, sid);
    return true;
  }
  return false;
}

function observeWorkspace() {
  const ws = document.getElementById('workspace');
  if (!ws) return;
  // 当 workspace 从 hidden 变可见时，重新测量 + 重建
  workspaceObserver = new MutationObserver(() => {
    const hidden = ws.classList.contains('hidden');
    if (!hidden) {
      nextTick(() => {
        grid.measure();
        rebuild();
        const PS = window.PS;
        if (PS && typeof PS.scheduleDateHighlight === 'function') PS.scheduleDateHighlight();
      });
    }
  });
  workspaceObserver.observe(ws, { attributes: true, attributeFilter: ['class'] });
}

onMounted(() => {
  store.hydrateFromLegacy();
  batch.hydrateFromLegacy();
  syncSourceFromPS();
  // 若 hydrate 后仍无 dates，说明 legacy 已有数据或需拉取，这里先 hydrate 再拉
  hydrateAndRebuildIfNeeded();
  if (!dates.value.length && !store.loadingDates) {
    // 优先用 legacy 的 PS.state.dates，若仍空则走 bridge
    if (!hasDates.value) store.fetchDates().catch(() => {});
  } else nextTick(rebuild);

  nextTick(() => {
    attachScroll();
    rebuild();
    // 首次测量可能在 workspace hidden 时为 0，延迟再测一次
    setTimeout(() => { grid.measure(); rebuild(); }, 300);
    setTimeout(() => { grid.measure(); rebuild(); }, 900);
    // legacy 的占位填充与日期高亮仍触发一次，保持双轨兼容
    const PS = window.PS;
    if (PS && typeof PS.schedulePlaceholderPhotoFill === 'function') PS.schedulePlaceholderPhotoFill();
    if (PS && typeof PS.scheduleDateHighlight === 'function') PS.scheduleDateHighlight();
  });

  // 轮询同步 legacy 真源（dates/photoCache/batch）+ source 上下文 —— 灯箱打开时暂停以避免拖拽掉帧
  batchTimer = setInterval(() => batch.hydrateFromLegacy(), 600);
  // 同步 legacy 的 dates/photoCache 到 Vue store（双轨期真源仍在 PS.state）
  function hydrateAndRebuildIfNeeded() {
    // PR6 优化：Vue 灯箱打开时跳过重度 DOM 扫描，避免 pointermove 抢主线程
    try {
      const lb = window.__lightboxStore;
      if (lb && lb.open) return false;
      const PS = window.PS;
      if (PS && PS.state && PS.state.lightbox && PS.state.lightbox.photo) {
        const el = document.getElementById('lightbox');
        if (el && !el.classList.contains('hidden')) return false;
        const vl = document.getElementById('vue-lightbox');
        if (vl && vl.childElementCount > 0 && vl.querySelector('.ps-lightbox-shell')) return false;
      }
    } catch {}
    const before = dates.value.length;
    const beforeCounts = store.dateCounts.size;
    store.hydrateFromLegacy();
    // legacy 的 photoCache 是 Map<id,photo>，Vue 的 photoCache 是 Map<dateKey, photo[]>
    // 若 Vue 侧某日期的 loaded 为 0 但 legacy 已有 DOM/PS cache，则尝试从 PS 侧回填
    try {
      const PS = window.PS;
      if (PS && PS.state && PS.els && PS.els.gallery) {
        const sections = PS.els.gallery.querySelectorAll('.date-section');
        sections.forEach((sec) => {
          const dk = sec.dataset.date || '';
          if (!dk) return;
          if ((store.photoCache.get(dk) || []).length > 0) return;
          // 从 legacy DOM 的 .photo-card 中提取已加载的 photo
          const cards = sec.querySelectorAll('.photo-card[data-photo-id]:not(.photo-placeholder)');
          if (!cards.length) return;
          const arr = [];
          cards.forEach((card) => {
            const pid = Number(card.dataset.photoId || 0);
            const fromCache = PS.state.photoCache ? PS.state.photoCache.get(pid) : null;
            if (fromCache) arr.push(fromCache);
          });
          if (arr.length) {
            store.photoCache.set(dk, arr);
            store.photoOffsets.set(dk, arr.length);
          }
        });
        if (sections.length) {
          store.photoCache = new Map(store.photoCache);
          store.photoOffsets = new Map(store.photoOffsets);
        }
      }
    } catch {}
    if (dates.value.length !== before || store.dateCounts.size !== beforeCounts) {
      grid.measure();
      rebuild();
      return true;
    }
    return false;
  }
  sourceSyncTimer = setInterval(() => {
    if (syncSourceFromPS()) { grid.measure(); rebuild(); }
    else if (hydrateAndRebuildIfNeeded()) {
      // 已在内部 rebuild
    } else {
      // 轮询测量：处理 Ctrl+滚轮改缩略图等尺寸变化，或 hidden→可见
      const host = scrollContainer.value;
      if (host) {
        const h = host.clientHeight;
        const w = host.clientWidth;
        if (h !== grid.viewportHeight.value || w !== grid.viewportWidth.value) {
          grid.measure();
          rebuild();
        }
      }
    }
  }, 400);

  observeWorkspace();
  // 监听窗口 resize 触发重建
  window.addEventListener('resize', () => { grid.measure(); rebuild(); });
});

onBeforeUnmount(() => {
  detachScroll();
  if (batchTimer) clearInterval(batchTimer);
  if (sourceSyncTimer) clearInterval(sourceSyncTimer);
  if (workspaceObserver) workspaceObserver.disconnect();
  window.removeEventListener('resize', () => { grid.measure(); rebuild(); });
  if (rafSync) cancelAnimationFrame(rafSync);
});

// 暴露给父级：跳转到指定日期
function scrollToDate(dateKey) {
  const idx = layouts.value.findIndex((L) => L.key === dateKey);
  if (idx < 0) {
    // 未加载的日期：先拉取 dates
    store.fetchDates().then(() => {
      nextTick(() => scrollToDate(dateKey));
    });
    return;
  }
  const L = layouts.value[idx];
  const host = scrollContainer.value;
  if (host) host.scrollTo({ top: L.top, behavior: 'smooth' });
}

defineExpose({ scrollToDate });
</script>

<template>
  <div class="ps-photo-grid-host" ref="virtualHost">
    <!-- 调试条（无日期时显示状态，便于排障） -->
    <div v-if="!hasDates && !isLoadingInitial && !isEmpty" class="gallery-empty">
      <p>等待日期数据…</p>
      <small>root={{ store.currentRootPath || '—' }} sid={{ store.currentSourceId || '—' }} loading={{ store.loadingDates }} noMore={{ store.noMoreDates }} dates={{ dates.length }}</small>
      <button class="ghost-btn" style="margin-top:12px" @click="store.fetchDates({reset:true}).catch(()=>{})">重试加载</button>
    </div>
    <!-- 加载中 -->
    <div v-else-if="isLoadingInitial" class="gallery-empty">
      <p>加载照片中…</p>
      <small>正在从 {{ store.currentRootPath || '当前来源' }} 读取日期列表</small>
    </div>
    <!-- 空态 -->
    <div v-else-if="isEmpty" class="gallery-empty">
      <p>暂无照片</p>
      <small>扫描完成后照片会按日期分组显示。已启用虚拟滚动，3000 张也流畅。</small>
    </div>

    <!-- 虚拟容器：仅当有日期时渲染，否则占位高度为 0 会导致黑屏 -->
    <div
      v-else-if="hasDates"
      class="virtual-scroll-host"
      :style="{ height: totalHeight ? totalHeight + 'px' : 'auto', position: 'relative', minHeight: '200px' }"
    >
      <!-- 按可见日期渲染 -->
      <section
        v-for="v in visibleLayouts"
        :key="v.layout.key"
        class="date-section vue-date-section"
        :id="'date-' + v.layout.key"
        :data-date="v.layout.key"
        :style="{
          position: 'absolute',
          top: v.layout.top + 'px',
          left: 0,
          right: 0,
          height: v.layout.height + 'px',
        }"
      >
        <div class="date-header" :data-date-header="v.layout.key">
          <strong>{{ v.layout.key }}</strong>
          <span>{{ v.layout.count }} 张 · 已加载 {{ loadedFor(v.layout.date) }}</span>
          <button
            v-if="v.layout.count > 0"
            class="ghost-btn date-note-btn"
            title="右键菜单"
            @contextmenu="handleDateContextMenu(v.layout.key, $event)"
            @click="(e) => handleDateContextMenu(v.layout.key, e)"
          >⋯</button>
        </div>

        <!-- 网格：仅渲染可见行 -->
        <div
          class="photo-grid"
          :style="{
            '--photo-min-size': (store.galleryItemSizeRaw || 168) + 'px',
            position: 'relative',
            height: (v.layout.rows * grid.rowHeight()) + 'px',
          }"
        >
          <!-- 行内偏移容器 -->
          <div
            class="virtual-row-window"
            :style="{
              position: 'absolute',
              top: v.slice.offsetY + 'px',
              left: 0,
              right: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(' + v.slice.cols + ', minmax(0, 1fr))',
              gap: '10px',
            }"
          >
            <template
              v-for="photo in photosFor(v.layout.date).slice(
                v.slice.rowStart * v.slice.cols,
                v.slice.rowEnd * v.slice.cols
              )"
              :key="photoId(photo)"
            >
              <article
                class="photo-card"
                :class="{
                  'batch-selected': isBatchSelected(photo),
                  favorite: !!photo.favorite,
                  'has-note': !!photo.note,
                  'has-category': !!photo.category,
                  'is-raw': !!photo.is_raw && !thumbUrl(photo),
                }"
                :data-photo-id="photo.id || photo.photo_id"
                :data-filename="photo.filename || ''"
                :title="photo.note || photo.category || ''"
                @click="handleCardClick(photo, $event)"
                @contextmenu="handleContextMenu(photo, $event)"
              >
                <img
                  v-if="thumbUrl(photo)"
                  :src="thumbUrl(photo)"
                  :alt="photo.filename || ''"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                  :data-photo-id="photo.id || photo.photo_id"
                  @error="(e) => { e.target.style.display = 'none'; }"
                />
                <div v-else class="raw-placeholder">{{ photo.format || 'RAW' }}</div>
                <div class="photo-meta"><span class="badge">{{ photo.format_label || photo.format || '' }}</span><span class="badge" style="display:none"></span></div>
                <div v-if="photo.favorite" class="photo-fav-badge" title="收藏">★</div>
                <div v-if="photo.note" class="note-icon photo-note-icon" :data-note="photo.note">✎</div>
                <div v-if="photo.category" class="photo-category-badge" :title="photo.category">{{ String(photo.category).slice(0,1) }}</div>
              </article>
            </template>

            <!-- 占位：未加载的格子 -->
            <template v-if="loadedFor(v.layout.date) < v.layout.count">
              <div
                v-for="n in Math.min(
                  v.slice.cols * (v.slice.rowEnd - v.slice.rowStart) - photosFor(v.layout.date).slice(v.slice.rowStart * v.slice.cols, v.slice.rowEnd * v.slice.cols).length,
                  Math.max(0, v.layout.count - loadedFor(v.layout.date))
                )"
                :key="'ph-' + v.layout.key + '-' + v.slice.rowStart + '-' + n"
                class="photo-card photo-placeholder"
              >
                <div class="placeholder-fill"></div>
              </div>
            </template>
          </div>
        </div>

        <div
          class="date-more"
          :data-date-key="v.layout.key"
          @click="store.fetchPhotosForDate(v.layout.key).catch(() => {})"
        >
          <span v-if="isLoading(v.layout.date)">加载中…</span>
          <span v-else-if="loadedFor(v.layout.date) < v.layout.count">滚动继续加载（{{ loadedFor(v.layout.date) }}/{{ v.layout.count }}）</span>
          <span v-else>已加载全部</span>
        </div>
      </section>

      <!-- 底部哨兵：更早日期 -->
      <div
        class="older-sentinel"
        :style="{ position: 'absolute', left: 0, right: 0, top: (totalHeight - 36) + 'px', height: '36px', display: 'grid', placeItems: 'center' }"
        @click="store.fetchDates().catch(() => {})"
      >
        <span v-if="store.loadingDates">加载日期中…</span>
        <span v-else-if="store.noMoreDates">没有更早日期</span>
        <span v-else>点击加载更早日期</span>
      </div>
    </div>

    <!-- 自建滚动容器兜底（当 #gallery-scroll 不存在时作为滚动宿主，否则隐藏） -->
    <div ref="scrollContainer" class="virtual-fallback-scroll" :class="{ hidden: fallbackScrollHidden }"></div>
  </div>
</template>

<style scoped>
.gallery-empty { padding: 24px; text-align: center; color: var(--muted, #9aa0a6); }
.gallery-empty small { display: block; margin-top: 8px; font-size: 12px; line-height: 1.6; max-width: 560px; margin-left: auto; margin-right: auto; }

.ps-photo-grid-host { min-height: 200px; background: var(--bg, #050505); }
.virtual-scroll-host { background: var(--bg, #050505); }
/* 复用 style.css 原类名，零漂移 */
.vue-date-section { /* 绝对定位由 inline style 控制 */ background: transparent; }
.date-header { display: flex; align-items: center; gap: 10px; padding: 8px 4px; font-size: 13px; color: var(--text, #f4f4f5); }
.date-header strong { font-weight: 700; }
.date-header span { font-size: 12px; color: var(--muted, #9aa0a6); }
.date-note-btn { margin-left: auto; opacity: 0.6; }
.photo-grid { /* 高度由虚拟行精确控制 */ min-height: 48px; }
.photo-card { position: relative; aspect-ratio: 1; overflow: hidden; border-radius: 8px; background: #0d0d10; cursor: grab; border: 1px solid transparent; }
.photo-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.photo-card.batch-selected { border-color: rgba(224,164,90,0.72) !important; box-shadow: 0 0 0 2px rgba(224,164,90,0.32); }
.photo-card.favorite { border-color: #f5c84c; box-shadow: 0 0 0 1px rgba(245,200,76,0.32); }
.photo-fav-badge { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%; background: #ffb817; color: #000; display: grid; place-items: center; font-size: 11px; z-index: 2; }
.photo-category-badge { position: absolute; top: 6px; left: 6px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: rgba(0,0,0,0.62); color: #fff; display: grid; place-items: center; font-size: 11px; z-index: 2; }
.photo-note-icon { position: absolute; bottom: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.62); color: #fff; display: grid; place-items: center; font-size: 11px; z-index: 2; }
.raw-placeholder { width: 100%; height: 100%; display: grid; place-items: center; color: var(--muted, #9aa0a6); font-size: 12px; background: #111114; }
.photo-meta { display: none; } /* 缩略图右下角已按需求隐藏 EXIF 角标 */
.placeholder-fill { width: 100%; height: 100%; background: linear-gradient(90deg, #111 25%, #17171a 37%, #111 63%); background-size: 400% 100%; animation: shimmer 1.2s ease-in-out infinite; }
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.date-more, .older-sentinel { font-size: 12px; color: var(--muted, #9aa0a6); cursor: pointer; border: 1px dashed transparent; border-radius: 8px; text-align: center; padding: 8px; }
.date-more:hover, .older-sentinel:hover { border-color: rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); }
.virtual-fallback-scroll { height: 60vh; overflow: auto; }
</style>
