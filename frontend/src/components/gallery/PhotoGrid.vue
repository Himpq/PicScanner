<template>
  <!-- 根节点 display:contents(见 scoped 样式):#vue-photogrid 才是唯一的
       .gallery-scroll 滚动容器,canvas 必须直接成为它的布局子项。
       此前根节点带 .gallery-scroll 会形成双层滚动容器 —— 滚动发生在内层,
       而任何按容器 id 定位的代码读到的都是外层(scrollTop 恒 0)。 -->
  <div
    ref="rootEl"
    class="photogrid-root"
    @mouseover="onHoverOver"
    @mousemove="onHoverMove"
    @mouseout="onHoverOut"
    @click="onCardClick"
    @contextmenu.prevent="onContextMenu"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div ref="canvasEl" class="photogrid-canvas" :class="{ zooming: zoomPreview.active }" :style="canvasStyle">
      <section
        v-for="s in plan.sections"
        :key="s.dateKey"
        class="date-section photogrid-section"
        :data-date="s.dateKey"
        :style="sectionStyle(s)"
      >
        <div class="date-header" :data-date-header="s.dateKey" @contextmenu.stop.prevent="onDateHeaderContext(s, $event)">
          <strong><span class="date-label-stack"><span class="date-label-text">{{ s.dateKey }}</span></span></strong>
          <span>{{ headerCount(s) }}</span>
        </div>
        <PhotoCard
          v-for="it in s.items"
          :key="itemKey(s, it)"
          :photo="it.photo"
          :item="it"
          :item-size="itemSize"
          :date-key="s.dateKey"
          :batch-index="batchIndexOf(it)"
          :compare-index="compareIndexOf(it)"
          :search-target="searchTargetId !== '' && it.photo && String(it.photo.id ?? '') === searchTargetId"
        />
        <div
          v-if="s.moreHeight"
          class="date-more photogrid-more"
          :style="{ top: (s.height - s.moreHeight) + 'px' }"
        >{{ moreText(s) }}</div>
      </section>
    </div>
  </div>
</template>

<script setup>
// P4 · Vue PhotoGrid —— 两级 windowing 的照片墙。
//
// 数据方向与 legacy 相反：legacy 先建满占位卡再逐个 getBoundingClientRect 反推可视；
// 这里先由 windowing.renderPlan() 算出「这一帧该渲染什么」，再只建窗口内的节点。
//
// 职责边界（与 legacy 的分工，双轨期的契约面）：
//   dates / dateCounts / covers / notes / 标记写入口 / 批量选择状态 / 对比状态
//     -> 仍归 legacy，Vue 通过 PS.* 与 hydrate 同步读取
//   每日照片列表 / 预览队列 / 渲染窗口 / 缩放 / 滚动定位
//     -> 归 Vue（store.fetchPhotosForDate + usePreviewQueue + zoomPlan）
//
// 挂载时劫持三个 legacy 入口（卸载时恢复）：
//   PS.jumpToDate          —— 日期胶囊点击 / 搜索日期跳转 / 上次浏览位置恢复
//   PS.jumpToSearchPhoto   —— 搜索命中具体照片的定位
//   PS.resetGallery        —— 排序/筛选/切源重置时同步清空 store 照片数据
// 并包装对比入口以驱动卡片的响应式高亮（state.compare 非响应式）。
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useGalleryStore } from '../../stores/gallery.js';
import { useBatchStore } from '../../stores/batch.js';
import { usePreviewQueue } from '../../composables/usePreviewQueue.js';
import { renderPlan, zoomPlan } from '../../gallery/windowing.js';
import { sectionMetrics, itemPosition, PHOTO_GRID_GAP, DATE_HEADER_HEIGHT } from '../../gallery/layout.js';
import { call } from '../../bridge/index.js';
import { log, logWarn } from '../../utils/log.js';
import PhotoCard from './PhotoCard.vue';

// 与 style.css 对齐的布局常量：
//   .gallery            padding: 18px
//   .date-section       margin-bottom: 28px（分区间距，进 windowing 数学）
//   .photo-grid         gap: 10px；.date-header 36px（这两项在 layout.js 里）
const CANVAS_PAD = 18;
const SECTION_GAP = 28;
const ITEM_SIZE_MIN = 112;
const ITEM_SIZE_MAX = 280;
const WHEEL_SCALE = 0.12;          // = app_core GALLERY_ITEM_SIZE_WHEEL_SCALE
const MORE_SCAN_BOTTOM_MARGIN = 80;
const LOAD_DATE_BOTTOM_MARGIN = 700;

const store = useGalleryStore();
const batchStore = useBatchStore();

// rootEl 是 display:contents 的组件根;真正的滚动容器是它的父元素
// (#vue-photogrid,挂载契约要求它带 .gallery-scroll)。scrollEl 指向滚动容器。
const rootEl = ref(null);
const scrollEl = ref(null);
const canvasEl = ref(null);

const scrollTop = ref(0);
const viewportH = ref(0);
const gridWidth = ref(1);

const searchTargetId = ref('');
let searchTargetTimer = null;

// 点击抑制：拖拽起手后的一小段时间内吞掉 click（等价 legacy 的 suppressPhotoClickUntil）
let clickSuppressUntil = 0;

const queue = usePreviewQueue({ getStore: () => store });

// ---- 坐标系约定 ----
// metrics/plan 的 scrollTop 与 section.top 都是「内容坐标」（canvas 顶部为 0）；
// 实际渲染时分区再整体下移 CANVAS_PAD（左右内边距同理）。滚动容器读写的
// scrollTop 需要在边界上加减 CANVAS_PAD。
const contentScrollTop = computed(() => Math.max(0, scrollTop.value - CANVAS_PAD));

function photoAt(dateKey, index) {
  const arr = store.photosForDate(dateKey);
  return arr[index] || null;
}
// 页脚高度必须与加载状态无关（legacy 的 .date-more 永远存在，只改文字）。
// 若按「是否加载完」翻转 46px，该分区下方的内容会整体位移 —— 快速滑动时
// 连续多个日期加载完成就表现为视图反复瞬移/弹回，缩放锚点也随之漂移。
function hasMore() {
  return true;
}

const itemSize = computed(() => Math.max(ITEM_SIZE_MIN, Math.min(ITEM_SIZE_MAX, Math.round(Number(store.galleryItemSize) || 168))));

const planArgs = computed(() => ({
  dates: store.dates,
  counts: store.dateCounts,
  itemSize: itemSize.value,
  gridWidth: gridWidth.value,
  gap: PHOTO_GRID_GAP,
  headerHeight: DATE_HEADER_HEIGHT,
  photoAt,
  hasMore,
  sectionGap: SECTION_GAP,
}));

const plan = computed(() => renderPlan({
  ...planArgs.value,
  scrollTop: contentScrollTop.value,
  viewportHeight: viewportH.value,
}));

// 跳转/滚动副作用用的 pitched metrics（含 map 索引）
const metricsPitched = computed(() => {
  const m = sectionMetrics(store.dates, {
    counts: store.dateCounts,
    itemSize: itemSize.value,
    gridWidth: gridWidth.value,
    gap: PHOTO_GRID_GAP,
    hasMore,
    sectionGap: SECTION_GAP,
  });
  const map = new Map(m.sections.map((s) => [s.dateKey, s]));
  return { ...m, map };
});

// ---- 模板辅助 ----
const canvasStyle = computed(() => {
  const style = { height: (plan.value.totalHeight + CANVAS_PAD * 2) + 'px' };
  if (zoomPreview.active) {
    // 手势期间的预览缩放（原版方案：transform 预览 + 松手按锚点落位）
    style['--gallery-zoom-preview'] = String(zoomPreview.scale);
    style['--gallery-zoom-origin-x'] = zoomPreview.originX + 'px';
    style['--gallery-zoom-origin-y'] = zoomPreview.originY + 'px';
  }
  return style;
});

function sectionStyle(s) {
  return {
    top: (CANVAS_PAD + s.top) + 'px',
    left: CANVAS_PAD + 'px',
    width: gridWidth.value + 'px',
    height: s.height + 'px',
  };
}

function itemKey(s, it) {
  return it.photo ? 'p' + String(it.photo.id ?? it.photo.photo_id) : s.dateKey + '#' + it.index;
}

function headerCount(s) {
  const exif = store.dateExifCounts.get(s.dateKey) || 0;
  return s.count + ' 张 · EXIF ' + exif;
}

function moreText(s) {
  const loaded = store.photoOffsets.get(s.dateKey) || 0;
  if (store.isPhotoLoading(s.dateKey)) return '加载中...';
  if (loaded >= s.count) return '这一天已加载完';
  return '滚动到这里会继续加载';
}

// 批量选择序号：batch store 的快照保持插入顺序，与 legacy 的角标编号一致
const batchIndexMap = computed(() => {
  const map = new Map();
  (batchStore.selected || []).forEach((p, i) => {
    const id = String(p.id ?? p.photo_id ?? '');
    if (id) map.set(id, i + 1);
  });
  return map;
});
function batchIndexOf(it) {
  if (!it.photo) return 0;
  return batchIndexMap.value.get(String(it.photo.id ?? it.photo.photo_id ?? '')) || 0;
}

// 对比槽位：state.compare 非响应式，靠包装 legacy 入口同步到本地 ref
const compareLocal = reactive({ open: false, lightbox: false, ids: [null, null] });
function syncCompareLocal() {
  const PS = window.PS;
  const c = PS && PS.state && PS.state.compare;
  if (!c) return;
  compareLocal.open = !!c.open;
  compareLocal.lightbox = !!c.lightbox;
  compareLocal.ids = Array.isArray(c.selected) ? [...c.selected] : [null, null];
}
function compareIndexOf(it) {
  if (!it.photo || (!compareLocal.open && !compareLocal.lightbox)) return -1;
  const id = Number(it.photo.id ?? it.photo.photo_id);
  return compareLocal.ids.findIndex((x) => Number(x && x.id) === id);
}

// ---- 数据加载：可视分区缺照片就拉，预览缺 src 就入队 ----
watch(plan, (p) => {
  for (const s of p.sections) {
    if (!s.count) continue;
    const loaded = store.photoOffsets.get(s.dateKey) || 0;
    if (loaded < s.count && loaded < s.windowEnd + s.cols) {
      store.fetchPhotosForDate(s.dateKey);
    }
  }
  enqueueVisiblePreviews(p);
}, { immediate: true });

function enqueueVisiblePreviews(p) {
  const normal = [];
  const priority = [];
  for (const s of p.sections) {
    for (const it of s.items) {
      const ph = it.photo;
      if (!ph) continue;
      if (ph.thumbnail_url || ph.preview_url || ph.lightbox_url) continue;
      if (ph.preview_failed) continue;
      if (ph.previewable === false && !ph.is_raw) continue;
      const absTop = s.top + it.y;
      const inView = absTop >= contentScrollTop.value - 40 &&
        absTop + itemSize.value <= contentScrollTop.value + viewportH.value + 40;
      (inView ? priority : normal).push(ph);
    }
  }
  if (priority.length) queue.enqueueMany(priority, true);
  if (normal.length) queue.enqueueMany(normal, false);
}

// ---- 滚动：scrollTop 记账 + rAF 合并的副作用（日期栏回写 / 续扫）----
let sideTicking = false;
function onScroll() {
  const el = scrollEl.value;
  if (!el) return;
  scrollTop.value = el.scrollTop;
  if (sideTicking) return;
  sideTicking = true;
  requestAnimationFrame(() => {
    sideTicking = false;
    syncRailFromScroll();
    maybeLoadMore();
  });
}

// 等价 legacy 的 updateDateHighlight（app.js），但坐标来自纯函数 metrics，不读 DOM
function syncRailFromScroll() {
  const PS = window.PS;
  if (!PS || typeof PS.setVisibleDates !== 'function') return;
  const st = contentScrollTop.value;
  const vh = Math.max(1, viewportH.value);
  const viewTop = st;
  const viewBottom = st + vh;
  const anchorY = st + vh / 2;
  const bandHalf = Math.max(72, vh * 0.22);
  const centerTop = anchorY - bandHalf;
  const centerBottom = anchorY + bandHalf;
  const bandH = Math.max(1, centerBottom - centerTop);
  const visible = [];
  const focusByDate = new Map();
  let best = null;
  let bestDistance = Infinity;
  for (const sec of metricsPitched.value.sections) {
    const top = sec.top;
    const bottom = sec.top + sec.height;
    const overlap = Math.min(bottom, viewBottom) - Math.max(top, viewTop);
    if (overlap > 12) {
      visible.push(sec.dateKey);
      const centerOverlap = Math.min(bottom, centerBottom) - Math.max(top, centerTop);
      focusByDate.set(sec.dateKey, Math.max(0, Math.min(1, centerOverlap / bandH)));
    }
    if (top <= anchorY && bottom >= anchorY) {
      best = sec.dateKey;
      bestDistance = 0;
      continue;
    }
    const distance = Math.min(Math.abs(top - anchorY), Math.abs(bottom - anchorY));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = sec.dateKey;
    }
  }
  try {
    PS.setVisibleDates(visible);
    PS.setDateFocus(focusByDate);
    if (best) PS.setActiveDate(best);
  } catch (e) {
    logWarn('[PhotoGrid] rail sync failed', e);
  }
}

function isNearBottom(margin) {
  const el = scrollEl.value;
  if (!el) return false;
  return contentScrollTop.value + viewportH.value >= (plan.value.totalHeight) - margin;
}

let moreScanTicking = false;
function maybeLoadMore() {
  const PS = window.PS;
  if (!PS || !PS.state) return;
  if (isNearBottom(LOAD_DATE_BOTTOM_MARGIN)) {
    if (!PS.state.noMoreDates && !PS.state.loadingDates && typeof PS.loadOlderDates === 'function') {
      PS.loadOlderDates({ allowScanRequest: false }).catch(() => {});
    }
  }
  // 接近底部的滚轮/滚动继续触发增量扫描（与 legacy requestMoreScanFromWheel 同义）
  if (isNearBottom(MORE_SCAN_BOTTOM_MARGIN) && !moreScanTicking && typeof PS.requestMoreScan === 'function') {
    moreScanTicking = true;
    requestAnimationFrame(() => {
      moreScanTicking = false;
      if (isNearBottom(MORE_SCAN_BOTTOM_MARGIN)) PS.requestMoreScan({ userGesture: true });
    });
  }
}

// ---- 滚轮：Ctrl 缩放（原版两段式）/ Alt 横向 ----
//
// Ctrl+滚轮的接入口在 document 捕获阶段 —— 与 legacy 完全一致
// （app.js:11672 就是这样接的），不依赖容器冒泡路径。
// 缩放本体是 legacy 两段式：手势期间 CSS transform 预览（zooming 类），
// 松手（180ms 无滚轮）后 zoomPlan 一次算出锚点落位 + 应用新尺寸。
const zoom = reactive({ active: false, base: 168, target: 168, cursorY: 0, timer: null });
const zoomPreview = reactive({ active: false, scale: 1, originX: 0, originY: 0 });

// 等价 legacy 的 normalizedWheelDelta（app_gallery.js）
function normalizedWheelDelta(ev) {
  let delta = Number(ev.deltaY || 0);
  if (ev.deltaMode === 1) delta *= 16;
  else if (ev.deltaMode === 2) delta *= (scrollEl.value && scrollEl.value.clientHeight) || 480;
  return delta;
}

function onDocCaptureWheel(ev) {
  if (!ev.ctrlKey) return;
  const el = scrollEl.value;
  // 只接管照片墙区域（与 legacy 的 galleryScroll.contains 守卫同义）
  if (!el || !el.contains(ev.target)) return;
  ev.preventDefault();
  ev.stopPropagation();
  zoomFromWheel(ev);
}

function onWheelNative(ev) {
  const el = scrollEl.value;
  if (!el || !Number.isFinite(ev.deltaY) || ev.deltaY === 0) return;
  if (ev.ctrlKey) return; // Ctrl 已由 document 捕获阶段处理
  if (ev.altKey) {
    // 等价 legacy 的 scrollGalleryFromAltWheel（它滚的也是 scrollTop）
    ev.preventDefault();
    ev.stopPropagation();
    const unit = ev.deltaMode === 1 ? 40 : (ev.deltaMode === 2 ? el.clientHeight : 1);
    el.scrollTop += ev.deltaY * unit;
    return;
  }
  if (ev.deltaY > 0) maybeLoadMore();
}

function zoomFromWheel(ev) {
  const el = scrollEl.value;
  if (!el) return;
  const PS = window.PS;
  if (PS && PS.state && (PS.state.settingsOpen || PS.state.statsOpen)) return;
  // 灯箱（legacy 或 Vue）打开时不缩放，与 legacy zoomGalleryItemsFromWheel 的守卫一致
  const legacyLb = document.getElementById('lightbox');
  if (legacyLb && !legacyLb.classList.contains('hidden')) return;
  const vueLb = document.getElementById('vue-lightbox');
  if (vueLb && vueLb.children.length && !vueLb.classList.contains('hidden')) return;
  if (!zoom.active) {
    zoom.active = true;
    zoom.base = itemSize.value;
    zoom.target = zoom.base;
    const canvasRect = (canvasEl.value || el).getBoundingClientRect();
    zoomPreview.originX = Math.max(0, Math.min(ev.clientX - canvasRect.left, canvasRect.width || 0));
    zoomPreview.originY = Math.max(0, Math.min(ev.clientY - canvasRect.top, canvasRect.height || 0));
    zoom.cursorY = ev.clientY - el.getBoundingClientRect().top;
    zoomPreview.active = true;
    try {
      if (typeof PS.hideContextMenu === 'function') PS.hideContextMenu();
      if (typeof PS.hideNoteTooltip === 'function') PS.hideNoteTooltip();
    } catch {}
  }
  zoom.target = Math.max(ITEM_SIZE_MIN, Math.min(ITEM_SIZE_MAX, zoom.target - normalizedWheelDelta(ev) * WHEEL_SCALE));
  zoomPreview.scale = Math.max(0.4, Math.min(2.8, zoom.target / zoom.base));
  clearTimeout(zoom.timer);
  zoom.timer = setTimeout(finishZoom, 180);
}

// legacy 靠 holdDateSectionLayout + 三层 rAF 反复滚动"猜"位置；
// 这里 zoomPlan 一次算到位（文档 P4：缩放锚点）。
async function finishZoom() {
  clearTimeout(zoom.timer);
  if (!zoom.active) return;
  if (zoom.target === zoom.base) {
    zoom.active = false;
    zoomPreview.active = false;
    return;
  }
  const { scrollTop: nextContent } = zoomPlan({
    ...planArgs.value,
    prevItemSize: zoom.base,
    itemSize: zoom.target,
    scrollTop: contentScrollTop.value,
    viewportHeight: viewportH.value,
    cursorY: zoom.cursorY,
  });
  zoom.active = false;
  zoomPreview.active = false;
  store.applyGallerySize(zoom.target);
  // 手势级诊断日志(经 PS.call 转 Python Terminal;若真机上这行都没出现,
  // 说明 ctrl+wheel 事件根本没送达 —— 排查方向就是事件派发而非处理逻辑)
  log('[PhotoGrid] 缩放手势完成', zoom.base, '->', zoom.target);
  if (Number.isFinite(nextContent) && nextContent != null) {
    await nextTick();
    const el = scrollEl.value;
    if (el) el.scrollTop = nextContent + CANVAS_PAD;
  }
}

// ---- 交互：容器级事件委托 ----
function cardFromEvent(ev) {
  const t = ev.target;
  return t && t.closest ? t.closest('.photo-card') : null;
}
function currentPhoto(card) {
  const PS = window.PS;
  const id = Number(card && card.dataset.photoId || 0);
  // PS.state.photoCache 是 legacy 的扁平缓存：Vue 拉取/预览回填/标记都会写它，
  // 取它保证点击/EXIF/右键拿到的是最新字段
  return (PS && PS.state && PS.state.photoCache && PS.state.photoCache.get(id)) || null;
}

function onCardClick(ev) {
  if (Date.now() < clickSuppressUntil) return;
  const card = cardFromEvent(ev);
  if (!card || !card.dataset.photoId) return;
  const PS = window.PS;
  const photo = currentPhoto(card);
  if (!photo) return;
  if (PS && PS.state && PS.state.quickEdit && PS.state.quickEdit.picking) {
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof PS.openQuickEdit === 'function') PS.openQuickEdit(photo);
    return;
  }
  if (PS && PS.batchSelectionController && typeof PS.batchSelectionController.handlePhotoClick === 'function') {
    if (PS.batchSelectionController.handlePhotoClick(ev, photo)) return;
  }
  if (PS && PS.state && PS.state.compare && PS.state.compare.open) {
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof PS.toggleComparePhoto === 'function') PS.toggleComparePhoto(photo);
    return;
  }
  if (typeof PS.openLightbox === 'function') PS.openLightbox(photo);
}

function onContextMenu(ev) {
  const PS = window.PS;
  if (!PS) return;
  const header = ev.target && ev.target.closest ? ev.target.closest('.date-header') : null;
  if (header && header.dataset.dateHeader) {
    ev.preventDefault();
    if (typeof PS.showDateContextMenu === 'function') PS.showDateContextMenu(ev.clientX, ev.clientY, header.dataset.dateHeader);
    return;
  }
  const card = cardFromEvent(ev);
  if (!card || !card.dataset.photoId) return;
  ev.preventDefault();
  // legacy 的 showPhotoContextMenu 从扁平缓存读照片（Vue 拉取时已双写进去）
  if (typeof PS.showPhotoContextMenu === 'function') PS.showPhotoContextMenu(ev.clientX, ev.clientY, card);
}

function onDateHeaderContext(s, ev) {
  const PS = window.PS;
  if (PS && typeof PS.showDateContextMenu === 'function') {
    PS.showDateContextMenu(ev.clientX, ev.clientY, s.dateKey);
  }
}

// ---- 悬停 EXIF：复刻 bindGalleryHover 的语义，落到 PS.showExif 原语 ----
let hoverCard = null;
let hoverTimer = null;

function canShowExif() {
  const PS = window.PS;
  if (!PS || !PS.state) return false;
  const st = PS.state;
  if (st.nativePhotoDragging || st.settingsOpen || st.statsOpen || st.searchOpen) return false;
  if (st.quickEdit && (st.quickEdit.open || st.quickEdit.picking)) return false;
  const lb = document.getElementById('lightbox');
  if (lb && !lb.classList.contains('hidden')) return false;
  const vueLb = document.getElementById('vue-lightbox');
  if (vueLb && vueLb.children.length && !vueLb.classList.contains('hidden')) return false;
  return true;
}

function onHoverOver(ev) {
  const card = cardFromEvent(ev);
  if (!card || card === hoverCard || card.contains(ev.relatedTarget)) return;
  hoverCard = card;
  // legacy 的快捷键路径（F 收藏 / 笔记 / W-S-Space 分类选择器）经
  // activePointerCard() 读 PS.hoverCard —— 同步它，Vue 卡片才能被识别
  const PS0 = window.PS;
  if (PS0) PS0.hoverCard = card;
  clearTimeout(hoverTimer);
  const PS = window.PS;
  if (!canShowExif()) return;
  if (ev.altKey) {
    showExifFor(card, ev);
    return;
  }
  hoverTimer = setTimeout(() => showExifFor(card, ev), 560);
}

function onHoverMove(ev) {
  const PS = window.PS;
  if (!PS || !hoverCard || !hoverCard.contains(ev.target)) return;
  if (!canShowExif()) return;
  if (ev.altKey && PS.els && PS.els.exifPop && PS.els.exifPop.classList.contains('hidden')) {
    showExifFor(hoverCard, ev);
  }
  if (typeof PS.positionExif === 'function') PS.positionExif(ev);
}

function onHoverOut(ev) {
  if (!hoverCard || hoverCard.contains(ev.relatedTarget)) return;
  hoverCard = null;
  const PS = window.PS;
  if (PS) PS.hoverCard = null;
  clearTimeout(hoverTimer);
  if (PS && PS.els && PS.els.exifPop && typeof PS.hide === 'function') PS.hide(PS.els.exifPop);
}

function showExifFor(card, ev) {
  const PS = window.PS;
  if (!PS || typeof PS.showExif !== 'function') return false;
  const photo = currentPhoto(card);
  if (!photo) return false;
  PS.showExif(card, photo, ev);
  return true;
}

// ---- 原生拖拽（等价 bindPhotoDrag 的容器级版本）----
let dragStart = null;

function resetNativeDragCursor() {
  call('reset_drag_cursor').catch(() => {});
}

function onPointerDown(ev) {
  if (ev.button !== 0) return;
  const card = cardFromEvent(ev);
  if (!card || !card.dataset.photoId) return;
  const photo = currentPhoto(card);
  if (!photo || !photo.original_url) return;
  dragStart = { x: ev.clientX, y: ev.clientY, pointerId: ev.pointerId };
}

function onPointerMove(ev) {
  if (!dragStart || dragStart.pointerId !== ev.pointerId) return;
  const dx = ev.clientX - dragStart.x;
  const dy = ev.clientY - dragStart.y;
  if (Math.hypot(dx, dy) < 8) return;
  const card = cardFromEvent(ev);
  const photo = card ? currentPhoto(card) : null;
  dragStart = null;
  if (!photo || !photo.original_url || !photo.path) return;
  ev.preventDefault();
  clickSuppressUntil = Date.now() + 700;
  const PS = window.PS;
  if (PS && PS.state) PS.state.nativePhotoDragging = true;
  clearTimeout(hoverTimer);
  hoverCard = null;
  if (PS && PS.els && PS.els.exifPop && typeof PS.hide === 'function') PS.hide(PS.els.exifPop);
  if (typeof PS.hideNoteTooltip === 'function') PS.hideNoteTooltip();
  if (card) card.classList.add('dragging');
  resetNativeDragCursor();
  call('start_photo_drag', Number(photo.id ?? photo.photo_id)).catch((err) => {
    logWarn('[PhotoGrid] start_photo_drag failed', err);
  }).finally(() => {
    clickSuppressUntil = Date.now() + 350;
    resetNativeDragCursor();
    setTimeout(resetNativeDragCursor, 120);
    setTimeout(resetNativeDragCursor, 900);
    setTimeout(() => {
      if (PS && PS.state) PS.state.nativePhotoDragging = false;
      resetNativeDragCursor();
    }, 2500);
    if (card) card.classList.remove('dragging');
  });
}

function onPointerUp() {
  dragStart = null;
}

// ---- 劫持 legacy 入口（挂载安装，卸载恢复）----
const originals = {};

function ensureDatesLoaded(dateKey) {
  // 目标日期不在列表：让 legacy 分页补齐（它会把 state.dates 填满 → 同步到 store）。
  // 注意用 legacy 的 state.dateCounts 判断命中——它是 addDateSection 里同步写入的，
  // 而 store 侧要等 notify 的 rAF 合并器跑完才可见，用它会多分好几页。
  const PS = window.PS;
  if (!PS) return Promise.resolve(false);
  let attempts = 80; // 上限，防止异常数据下死循环
  const hit = () => store.dateCounts.has(dateKey)
    || !!(PS.state && PS.state.dateCounts instanceof Map && PS.state.dateCounts.has(dateKey));
  const step = () => {
    if (hit()) return Promise.resolve(true);
    if (!PS.state || PS.state.noMoreDates || attempts <= 0) return Promise.resolve(false);
    attempts -= 1;
    return PS.loadOlderDates({ allowScanRequest: false })
      .then((loaded) => (loaded ? step() : false))
      .catch(() => false);
  };
  return step();
}

function vueJumpToDate(dateKey, offset = 0, options = {}) {
  const behavior = (options && options.behavior) || 'auto';
  const PS = window.PS;
  return ensureDatesLoaded(dateKey).then((found) => {
    // 立即同步一次：notify 的 rAF 合并器可能还没跑，metrics 需要新鲜的日期列表
    try { store.hydrateFromLegacy(); } catch {}
    if (!found && !store.dateCounts.has(dateKey)) return false;
    try { if (PS && typeof PS.setActiveDate === 'function') PS.setActiveDate(dateKey); } catch {}
    return store.fetchPhotosForDate(dateKey).finally(() => {
      const sec = metricsPitched.value.map.get(dateKey);
      const el = scrollEl.value;
      if (!sec || !el) return;
      el.scrollTo({ top: CANVAS_PAD + sec.top + Math.max(0, Number(offset) || 0), behavior });
      syncRailFromScroll();
    }).then(() => true);
  });
}

async function vueJumpToSearchPhoto(item) {
  const PS = window.PS;
  if (!item) return false;
  const dateKey = String(item.date_key || '');
  const targetId = String(item.id ?? item.photo_id ?? '');
  if (!dateKey) return false;
  const found = await ensureDatesLoaded(dateKey);
  // 同 vueJumpToDate：先补一次同步，metrics/offsets 才是新鲜的
  try { store.hydrateFromLegacy(); } catch {}
  if (!found && !store.dateCounts.has(dateKey)) return false;
  try { if (PS && typeof PS.setActiveDate === 'function') PS.setActiveDate(dateKey); } catch {}
  const targetOffset = Math.max(0, Number(item.search_offset || 0));
  let guard = 0;
  while ((store.photoOffsets.get(dateKey) || 0) < targetOffset + 1 && guard < 400) {
    guard += 1;
    const got = await store.fetchPhotosForDate(dateKey);
    if (!got) break;
  }
  const arr = store.photosForDate(dateKey);
  let index = arr.findIndex((p) => String(p.id ?? p.photo_id ?? '') === targetId);
  if (index < 0) index = Math.min(targetOffset, Math.max(0, arr.length - 1));
  const sec = metricsPitched.value.map.get(dateKey);
  const el = scrollEl.value;
  if (!sec || !el) return false;
  const { y } = itemPosition({ index, cols: sec.cols, itemSize: itemSize.value, gap: PHOTO_GRID_GAP, headerHeight: DATE_HEADER_HEIGHT });
  if (targetId) {
    searchTargetId.value = targetId;
    clearTimeout(searchTargetTimer);
    searchTargetTimer = setTimeout(() => { searchTargetId.value = ''; }, 1500);
  }
  const cardTop = CANVAS_PAD + sec.top + y;
  el.scrollTo({ top: Math.max(0, cardTop - Math.max(0, viewportH.value / 2 - itemSize.value / 2)), behavior: 'smooth' });
  syncRailFromScroll();
  return true;
}

function installHijacks() {
  const PS = window.PS;
  if (!PS) return;
  // legacy 的闭包直调入口（日期胶囊 addDateSection 里 bind 的是本地 jumpToDate）
  // 经这里委托；PS.jumpToDate 的劫持只覆盖经 PS 的调用方。
  const PV = window.PicScannerVue;
  if (PV) PV.photoGridJumpToDate = vueJumpToDate;
  if (typeof PS.jumpToDate === 'function' && !PS.jumpToDate.__photoGrid) {
    originals.jumpToDate = PS.jumpToDate;
    const wrapped = function jumpToDatePhotoGrid(dateKey, offset, options) {
      return vueJumpToDate(dateKey, offset, options);
    };
    wrapped.__photoGrid = true;
    PS.jumpToDate = wrapped;
  }
  if (typeof PS.jumpToSearchPhoto === 'function' && !PS.jumpToSearchPhoto.__photoGrid) {
    originals.jumpToSearchPhoto = PS.jumpToSearchPhoto;
    const wrapped = function jumpToSearchPhotoPhotoGrid(item) {
      return vueJumpToSearchPhoto(item);
    };
    wrapped.__photoGrid = true;
    PS.jumpToSearchPhoto = wrapped;
  }
  if (typeof PS.resetGallery === 'function' && !PS.resetGallery.__photoGrid) {
    originals.resetGallery = PS.resetGallery;
    const wrapped = function resetGalleryPhotoGrid(...args) {
      const r = originals.resetGallery.apply(PS, args);
      store.resetPhotoData();
      // legacy 的 applySort/applyFilter 只把隐藏的 #gallery-scroll 滚回顶部,
      // 可见的 Vue 网格要同步归零,否则切排序后停在旧位置中部
      const el = scrollEl.value;
      if (el) {
        el.scrollTop = 0;
        scrollTop.value = 0;
      }
      return r;
    };
    wrapped.__photoGrid = true;
    PS.resetGallery = wrapped;
  }
  // 对比入口包装：state.compare 非响应式，调用后把选择同步进本地 reactive
  ['toggleComparePhoto', 'clearCompareSelection', 'openComparePanel', 'closeComparePanel', 'renderComparePanel'].forEach((name) => {
    if (typeof PS[name] !== 'function' || PS[name].__photoGrid) return;
    originals[name] = PS[name];
    const wrapped = function comparePhotoGridFn(...args) {
      const r = originals[name].apply(PS, args);
      syncCompareLocal();
      return r;
    };
    wrapped.__photoGrid = true;
    PS[name] = wrapped;
  });
  syncCompareLocal();
}

function restoreHijacks() {
  const PS = window.PS;
  const PV = window.PicScannerVue;
  if (PV && PV.photoGridJumpToDate === vueJumpToDate) delete PV.photoGridJumpToDate;
  if (!PS) return;
  Object.entries(originals).forEach(([name, fn]) => {
    // 只在仍是我们的包装时恢复，避免覆盖其它模块后来的 patch
    if (PS[name] && PS[name].__photoGrid) PS[name] = fn;
  });
}

// ---- 尺寸测量 ----
let resizeObserver = null;
function measure() {
  const el = scrollEl.value;
  if (!el) return;
  viewportH.value = el.clientHeight;
  gridWidth.value = Math.max(1, el.clientWidth - CANVAS_PAD * 2);
  scrollTop.value = el.scrollTop;
}

onMounted(() => {
  // 挂载契约:组件根(display:contents)的父元素就是滚动容器
  scrollEl.value = rootEl.value ? rootEl.value.parentElement : null;
  const el = scrollEl.value;
  measure();
  if (el) {
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(el);
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('wheel', onWheelNative, { passive: false });
  }
  // Ctrl+滚轮接 document 捕获阶段 —— 与 legacy app.js:11672 同款接法,
  // 不依赖容器冒泡路径(这正是此前缩放"完全没反应"的原因)
  document.addEventListener('wheel', onDocCaptureWheel, { passive: false, capture: true });
  installHijacks();
});

onBeforeUnmount(() => {
  restoreHijacks();
  document.removeEventListener('wheel', onDocCaptureWheel, { capture: true });
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  const el = scrollEl.value;
  if (el) {
    el.removeEventListener('scroll', onScroll);
    el.removeEventListener('wheel', onWheelNative);
  }
  clearTimeout(hoverTimer);
  clearTimeout(searchTargetTimer);
  clearTimeout(zoom.timer);
});
</script>

<style scoped>
/* display:contents 让组件根不生成盒子,canvas 直接成为
   #vue-photogrid(.gallery-scroll)的布局子项 —— 单一滚动容器,
   与 legacy 的 #gallery-scroll 角色完全一致。 */
.photogrid-root {
  display: contents;
}

.photogrid-canvas {
  position: relative;
  /* 高度由 canvasStyle 内联给出(totalHeight + 上下内边距) */
}

/* 缩放手势预览（原版 .gallery.zooming 同款，缩放原点是光标位置） */
.photogrid-canvas.zooming {
  transform: scale(var(--gallery-zoom-preview, 1));
  transform-origin: var(--gallery-zoom-origin-x, 0px) var(--gallery-zoom-origin-y, 0px);
  will-change: transform;
}

.photogrid-canvas.zooming :deep(.photo-card img) {
  transition: none;
}

/* windowing 只挂载可视分区：
   - 绝对定位复刻正常流（含 28px 分区间距，进 sectionStyle 的 top）
   - content-visibility 的跳过会干扰 sticky 头部定位，关掉
   （scoped 的 data-v 属性选择器优先级高于 style.css 同名规则，不影响 legacy） */
.date-section {
  position: absolute;
  margin-bottom: 0;
  content-visibility: visible;
  contain-intrinsic-size: auto;
}

/* 卡片是绝对定位、不占常规流，页脚若用静态位置会紧跟 sticky 标题、
   叠在第一行卡上。改为绝对定位到网格底部：top = 分区高 - 页脚高(46)，
   自身的 margin-top:12 + height:34（style.css）正好占满最后 46px。 */
.photogrid-more {
  position: absolute;
  left: 0;
  right: 0;
}
</style>
