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
 * 缩放 / 宽度重排：算出新布局下应保持的 scrollTop，以及新的渲染计划。
 *
 * legacy 用 holdDateSectionLayout + 三层嵌套 rAF 反复滚动去"猜"位置；
 * 这里一次算到位（底层是 layout.zoomAnchorScrollTop）。
 *
 * 两种调用场景共用同一条锚点路径：
 *   缩放（Ctrl+滚轮）—— prevItemSize/itemSize 变化，gridWidth 不变，
 *     锚点取光标位置（cursorY），光标下的照片不位移；
 *   窗口 resize —— gridWidth 变化（列数变化），itemSize 不变，
 *     锚点取视口顶部（cursorY 传 0），顶部的照片不动。
 *     若不做这一步，同一 scrollTop 在重排后会落到别的日期分区，
 *     表现为"改窗体大小就跳到新的日期"。
 *
 * 必须同时给 prevItemSize 与 itemSize：
 * 锚点要用「变化前」的布局反查是哪张照片，定位要用「变化后」的布局算 scrollTop。
 * 只给一个就会算错，而且错得很隐蔽（锚点漂移但看起来能滚）。
 *
 * @param prevItemSize 缩放前的条目边长
 * @param itemSize     缩放后的条目边长
 * @param prevGridWidth 变化前的网格宽度（仅 resize 传；缺省等于 gridWidth）
 * @param gridWidth    变化后的网格宽度
 * @param cursorY      锚点相对滚动容器顶部的位置（缩放传光标，resize 传 0 取视口顶部）
 * @param pinItemTop   resize 专用：true 时不按 cursorY 落位，而是精确保留
 *   「锚点照片顶部与视口顶部的相对距离」（可为负，即照片顶部已滚出上沿；
 *   顶部是分区头时为正）。效果是像素级稳定 —— 列数不变的宽度微调与纯高度
 *   变化会原样返回 scrollTop，一点都不动。缩放保持 cursorY 语义，不得传它。
 */
export function zoomPlan({
  dates,
  counts,
  gridWidth,
  prevGridWidth,
  prevItemSize,
  itemSize,
  scrollTop,
  viewportHeight,
  cursorY = 0,
  pinItemTop = false,
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

  const prevW = Number.isFinite(prevGridWidth) ? prevGridWidth : gridWidth;
  const prevMetrics = sectionMetrics(dates, { counts, itemSize: prevItemSize, gridWidth: prevW, gap, hasMore, sectionGap });
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

  // pinItemTop：把落位基准从 cursorY 换成"锚点照片在旧布局下的屏内位置"。
  // cursorY=0 只能保证"同一张照片回到顶部"，行内偏移会被吸附到行首；
  // 这里保留精确距离，新 scrollTop = 新照片顶部 − 旧相对距离，分毫不差。
  if (pinItemTop) {
    const prevSec = prevMetrics.sections.find((s) => s.dateKey === anchor.dateKey);
    if (prevSec) {
      const prevPos = itemPosition({ index: anchor.index, cols: prevSec.cols, itemSize: prevItemSize, gap, headerHeight });
      anchor.offsetInViewport = (prevSec.top + prevPos.y) - scrollTop;
    }
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
