// P2 · 画廊高度模型（纯函数）
//
// 背景：legacy 的 app_gallery.js 是"从 DOM 反推数据" —— renderPhotoPlaceholders 塞空卡、
// fillVisiblePlaceholders 逐个 getBoundingClientRect、ensureRenderBuffer 数 DOM 卡片数、
// updateDateReserve 测 offsetHeight 后写 --date-section-intrinsic-size。
// 四步全都依赖真实 DOM，与 Vue 的数据→DOM 方向相反，这是 PhotoGrid 迁不动的根因。
//
// 本模块把高度模型改成纯数学计算，不读任何 DOM。legacy 与 Vue 共用同一套公式，
// 因此 P2 之后 legacy 的滚动行为不变，而 Vue 侧获得了做 windowing 的前提。
//
// 常量来自 style.css：
//   .photo-grid  gap: 10px
//   .date-header height: 36px
//   .date-more   margin-top: 12px + height: 34px = 46px
//   .photo-card  aspect-ratio: 1/1（条目高度恒等于条目宽度）

export const PHOTO_GRID_GAP = 10;
export const DATE_HEADER_HEIGHT = 36;
export const DATE_MORE_HEIGHT = 46;

// ---------- 基础公式 ----------

// 与 CSS `repeat(auto-fill, minmax(S, S))` + gap 的换列规则一致
export function columnsFor(gridWidth, itemSize, gap = PHOTO_GRID_GAP) {
  const w = Math.max(1, Number(gridWidth) || 0);
  const s = Math.max(1, Number(itemSize) || 0);
  const g = Math.max(0, Number(gap) || 0);
  return Math.max(1, Math.floor((w + g) / (s + g)));
}

// 单个日期分区的固有高度（等价于 legacy 的 dateSectionIntrinsicHeight）
export function dateSectionHeight({
  count = 0,
  itemSize,
  gridWidth,
  gap = PHOTO_GRID_GAP,
  headerHeight = DATE_HEADER_HEIGHT,
  moreHeight = 0,
} = {}) {
  const cols = columnsFor(gridWidth, itemSize, gap);
  const total = Math.max(0, Number(count) || 0);
  const rows = total > 0 ? Math.ceil(total / cols) : 0;
  const gridHeight = rows > 0 ? rows * itemSize + (rows - 1) * gap : 0;
  return {
    cols,
    rows,
    gridHeight,
    height: Math.max(80, Math.ceil(headerHeight + gridHeight + moreHeight)),
  };
}

// 条目在分区内的绝对定位偏移（供 windowing 用 translate3d 布局）
export function itemPosition({ index, cols, itemSize, gap = PHOTO_GRID_GAP, headerHeight = DATE_HEADER_HEIGHT }) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: col * (itemSize + gap), y: headerHeight + row * (itemSize + gap), col, row };
}

// ---------- 分区级 windowing ----------

// 预计算所有分区的偏移与高度（O(n)，n = 日期分组数，实测 431）
export function sectionMetrics(dates, { counts, itemSize, gridWidth, gap, hasMore }) {
  const list = [];
  let top = 0;
  for (let i = 0; i < dates.length; i += 1) {
    const dateKey = dates[i].date_key;
    const count = counts.get(dateKey) || 0;
    const moreHeight = hasMore && hasMore(dateKey, count) ? DATE_MORE_HEIGHT : 0;
    const m = dateSectionHeight({ count, itemSize, gridWidth, gap, moreHeight });
    list.push({ dateKey, count, top, height: m.height, cols: m.cols, rows: m.rows, moreHeight });
    top += m.height;
  }
  return { sections: list, totalHeight: top };
}

// 二分定位第一个「底边超过 scrollTop - buffer」的分区
function firstVisibleIndex(sections, y) {
  let lo = 0;
  let hi = sections.length - 1;
  let ans = sections.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sections[mid].top + sections[mid].height > y) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return ans;
}

// 返回 [start, end) 的分区下标区间
export function visibleSectionRange(metrics, { scrollTop, viewportHeight, bufferPx = 400 } = {}) {
  const sections = metrics.sections;
  if (!sections.length) return { start: 0, end: 0 };
  const top = scrollTop - bufferPx;
  const bottom = scrollTop + viewportHeight + bufferPx;
  let start = firstVisibleIndex(sections, top);
  if (start >= sections.length) start = sections.length - 1;
  let end = start;
  while (end < sections.length && sections[end].top < bottom) end += 1;
  return { start, end: Math.max(end, start + 1) };
}

// ---------- 分区内条目级 windowing ----------

// 单个日期最多可能有 1806 张（实测 2025-03-22），只渲染可视行 ± 缓冲行
export function visibleItemRange(section, {
  scrollTop,
  viewportHeight,
  itemSize,
  gap = PHOTO_GRID_GAP,
  headerHeight = DATE_HEADER_HEIGHT,
  bufferRows = 2,
} = {}) {
  if (!section || !section.count) return { start: 0, end: 0 };
  const stride = itemSize + gap;
  const gridTop = section.top + headerHeight;
  const rel = scrollTop - gridTop;
  const firstRow = Math.floor(rel / stride) - bufferRows;
  const lastRow = Math.ceil((rel + viewportHeight) / stride) + bufferRows;
  const maxRow = Math.max(0, Math.ceil(section.count / section.cols) - 1);
  const from = Math.max(0, Math.min(maxRow, firstRow));
  const to = Math.max(0, Math.min(maxRow, lastRow));
  return {
    start: from * section.cols,
    end: Math.min(section.count, (to + 1) * section.cols),
  };
}

// ---------- 缩放锚点 ----------

// Ctrl+滚轮缩放时保持光标下的照片不位移。
// legacy 靠 holdDateSectionLayout + 三层嵌套 rAF 反复滚动（app_gallery.js:2589-2609），
// 纯模型下可以直接算出目标 scrollTop，一次到位。
// 注意：metrics 是按「缩放前」的 itemSize 算的，section.top 会随缩放变化。
// 所以必须传入新的 itemSize 与 gridWidth 重新计算，不能直接复用 metrics 里的 cols/top。
export function zoomAnchorScrollTop({
  dates,
  counts,
  gridWidth,
  itemSize,
  anchorDateKey,
  anchorIndex,
  offsetInViewport,
  gap = PHOTO_GRID_GAP,
  headerHeight = DATE_HEADER_HEIGHT,
  hasMore,
} = {}) {
  const next = sectionMetrics(dates, { counts, itemSize, gridWidth, gap, hasMore });
  const section = next.sections.find((s) => s.dateKey === anchorDateKey);
  if (!section) return { scrollTop: null, metrics: next };
  const { y } = itemPosition({ index: anchorIndex, cols: section.cols, itemSize, gap, headerHeight });
  return { scrollTop: Math.max(0, section.top + y - offsetInViewport), metrics: next };
}

// 给定 scrollTop 反查「哪个分区的哪一张」在视口顶部（用于确定缩放锚点）
export function anchorAtPoint(metrics, { scrollTop, pointOffset = 0, itemSize, gap = PHOTO_GRID_GAP, headerHeight = DATE_HEADER_HEIGHT }) {
  const sections = metrics.sections;
  if (!sections.length) return null;
  const y = scrollTop + pointOffset;
  let i = Math.max(0, firstVisibleIndex(sections, y));
  if (i >= sections.length) i = sections.length - 1;
  while (i < sections.length - 1 && sections[i].top + sections[i].height <= y) i += 1;
  while (i > 0 && sections[i].top > y) i -= 1;
  const s = sections[i];
  const stride = itemSize + gap;
  const row = Math.max(0, Math.floor((y - s.top - headerHeight) / stride));
  const maxRow = Math.max(0, Math.ceil(s.count / s.cols) - 1);
  const index = Math.min(s.count - 1, Math.min(row, maxRow) * s.cols);
  return { dateKey: s.dateKey, index, offsetInViewport: y - scrollTop };
}
