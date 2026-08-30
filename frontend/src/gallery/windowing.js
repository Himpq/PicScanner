// P4 · 渲染计划（纯函数，不读 DOM）
//
// layout.js 提供数学原语（前缀和、二分、行裁剪、坐标计算），
// 本模块把它们组装成「这一帧该渲染什么」：
//
//   renderPlan() -> { totalHeight, sections: [{ ..., items: [{ index, photo, x, y }] }] }
//
// 之所以单独拆一层：layout.js 保持无业务语义的纯数学，
// 这里才引入「照片数据」「占位」这些概念。两者都可独立测试。
//
// 与 legacy 的关键差别：
//   legacy 是先建满全部占位卡，再逐个 getBoundingClientRect 筛可视（O(n) 强制布局/帧）；
//   这里是先算 window，再只建 window 内的节点（O(log n + k)）。

import {
  PHOTO_GRID_GAP,
  DATE_HEADER_HEIGHT,
  sectionMetrics,
  visibleSectionRange,
  visibleItemRange,
  itemPosition,
  anchorAtPoint,
  zoomAnchorScrollTop,
} from './layout.js';

// 默认缓冲：分区级上下各 400px，条目级上下各 2 行
export const DEFAULT_SECTION_BUFFER_PX = 400;
export const DEFAULT_ROW_BUFFER = 2;

/**
 * 组装一帧的渲染计划。
 *
 * @param dates         有序日期分组（与 compareDatesForCurrentSort 的顺序一致）
 * @param counts        Map<dateKey, number>
 * @param itemSize      当前条目边长（CSS --photo-min-size）
 * @param gridWidth     网格可用宽度
 * @param scrollTop     滚动容器的 scrollTop
 * @param viewportHeight 滚动容器可视高度
 * @param photoAt       (dateKey, index) => photo | null，未加载到就返回 null（渲染为占位卡）
 * @param hasMore       (dateKey, count) => boolean，是否渲染「继续检查这一天」
 * @param sectionGap    分区之间的视觉间距（legacy .date-section 的 margin-bottom: 28px）
 */
export function renderPlan({
  dates = [],
  counts,
  itemSize,
  gridWidth,
  scrollTop = 0,
  viewportHeight = 0,
  gap = PHOTO_GRID_GAP,
  headerHeight = DATE_HEADER_HEIGHT,
  sectionBufferPx = DEFAULT_SECTION_BUFFER_PX,
  rowBuffer = DEFAULT_ROW_BUFFER,
  photoAt = () => null,
  hasMore = null,
  sectionGap = 0,
} = {}) {
  const metrics = sectionMetrics(dates, { counts, itemSize, gridWidth, gap, hasMore, sectionGap });
  const { start, end } = visibleSectionRange(metrics, {
    scrollTop,
    viewportHeight,
    bufferPx: sectionBufferPx,
  });

  const sections = [];
  for (let i = start; i < end; i += 1) {
    const s = metrics.sections[i];
    const { start: from, end: to } = visibleItemRange(s, {
      scrollTop,
      viewportHeight,
      itemSize,
      gap,
      headerHeight,
      bufferRows: rowBuffer,
    });
    const items = [];
    for (let index = from; index < to; index += 1) {
      const pos = itemPosition({ index, cols: s.cols, itemSize, gap, headerHeight });
      items.push({
        index,
        photo: photoAt(s.dateKey, index),
        x: pos.x,
        y: pos.y,
        col: pos.col,
        row: pos.row,
      });
    }
    sections.push({
      dateKey: s.dateKey,
      count: s.count,
      top: s.top,
      height: s.height,
      cols: s.cols,
      rows: s.rows,
      moreHeight: s.moreHeight,
      // 渲染窗口的起止，便于组件判断"这一屏是否包含了分区的首/尾"
      windowStart: from,
      windowEnd: to,
      items,
    });
  }

  return {
    totalHeight: metrics.totalHeight,
    // 每帧实际要建的节点数，供调试与测试断言
    renderedSections: sections.length,
    renderedItems: sections.reduce((n, s) => n + s.items.length, 0),
    sections,
  };
}

/**
 * 缩放：算出缩放后应保持的 scrollTop，以及新的渲染计划。
 *
 * legacy 用 holdDateSectionLayout + 三层嵌套 rAF 反复滚动去"猜"位置；
 * 这里一次算到位（底层是 layout.zoomAnchorScrollTop）。
 *
 * 必须同时给 prevItemSize 与 itemSize：
 * 锚点要用「缩放前」的布局反查是哪张照片，定位要用「缩放后」的布局算 scrollTop。
 * 只给一个就会算错，而且错得很隐蔽（锚点漂移但看起来能滚）。
 *
 * @param prevItemSize 缩放前的条目边长
 * @param itemSize     缩放后的条目边长
 * @param cursorY      光标相对滚动容器顶部的位置
 */
export function zoomPlan({
  dates,
  counts,
  gridWidth,
  prevItemSize,
  itemSize,
  scrollTop,
  viewportHeight,
  cursorY = 0,
  gap = PHOTO_GRID_GAP,
  headerHeight = DATE_HEADER_HEIGHT,
  sectionBufferPx = DEFAULT_SECTION_BUFFER_PX,
  rowBuffer = DEFAULT_ROW_BUFFER,
  photoAt = () => null,
  hasMore = null,
  sectionGap = 0,
} = {}) {
  const planArgs = {
    dates, counts, gridWidth, gap, headerHeight,
    sectionBufferPx, rowBuffer, photoAt, hasMore, sectionGap,
  };
  if (!Number.isFinite(prevItemSize)) {
    throw new Error('zoomPlan 需要 prevItemSize（缩放前的条目边长）');
  }

  const prevMetrics = sectionMetrics(dates, { counts, itemSize: prevItemSize, gridWidth, gap, hasMore, sectionGap });
  const anchor = anchorAtPoint(prevMetrics, {
    scrollTop,
    pointOffset: cursorY,
    itemSize: prevItemSize,
    gap,
    headerHeight,
  });
  if (!anchor) {
    return { scrollTop, anchor: null, plan: renderPlan({ ...planArgs, itemSize, scrollTop, viewportHeight }) };
  }

  const { scrollTop: next } = zoomAnchorScrollTop({
    dates,
    counts,
    gridWidth,
    itemSize,
    anchorDateKey: anchor.dateKey,
    anchorIndex: anchor.index,
    offsetInViewport: anchor.offsetInViewport,
    gap,
    headerHeight,
    hasMore,
    sectionGap,
  });

  const nextScroll = next == null ? scrollTop : next;
  return {
    scrollTop: nextScroll,
    anchor,
    plan: renderPlan({ ...planArgs, itemSize, scrollTop: nextScroll, viewportHeight }),
  };
}
