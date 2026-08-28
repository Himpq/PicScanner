/**
 * useVirtualGrid — 轻量虚拟网格（不依赖 @tanstack/virtual）
 * 针对 PicScanner 照片墙场景优化：
 * - 按日期分组，列数随容器宽度 + --photo-min-size 动态计算
 * - 行高 = itemSize + gap，整块日期高度精确可预测，无需测量 DOM
 * - 滚动容器为 #gallery-scroll，支持 ResizeObserver + RAF 节流
 */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';

export function useVirtualGrid(options) {
  const {
    getItemSize, // () => number
    getGap = () => 10,
    getHeaderHeight = () => 36,
    getMoreHeight = () => 34,
    getContentWidth, // () => number — sections 18px 留白时用实际栅格宽度
    overscanRows = 4,
  } = options || {};

  const scrollEl = ref(null);
  const viewportHeight = ref(0);
  const viewportWidth = ref(0);
  const scrollTop = ref(0);
  let rafPending = false;
  let resizeObserver = null;

  // 列数：必须和 CSS auto-fill 实际渲染的列数一致。
  // PhotoGrid 在 section 上用 left/right 18px 模拟 .gallery padding，
  // 真正的 .photo-grid 宽度 = viewportWidth - 36，所以用 getContentWidth 拿去掉留白后的宽度。
  function columns() {
    const w = (typeof getContentWidth === 'function' ? getContentWidth() : 0) || viewportWidth.value || 800;
    const size = Math.max(1, Number(getItemSize ? getItemSize() : 168));
    const gap = Math.max(0, Number(getGap()));
    return Math.max(1, Math.floor((w + gap) / (size + gap)));
  }

  function rowHeight() {
    const size = Math.max(1, Number(getItemSize ? getItemSize() : 168));
    return size + Math.max(0, Number(getGap()));
  }

  function dateHeight(count) {
    const total = Math.max(0, Number(count || 0));
    if (total <= 0) return getHeaderHeight() + getMoreHeight() + 40;
    const cols = columns();
    const rows = Math.ceil(total / cols);
    // 40 = date-more margin-top 12 + date-section margin-bottom 28（对齐 style.css 4583/4836）
    return getHeaderHeight() + rows * rowHeight() + getMoreHeight() + 40;
  }

  // 布局缓存：对应 dates[i] 的 top/height/rows
  function buildLayouts(dates, getCount) {
    const layouts = [];
    let top = 0;
    const cols = columns();
    const rh = rowHeight();
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      const key = d.date_key;
      const count = Math.max(0, Number(getCount ? getCount(d) : 0));
      const rows = count > 0 ? Math.ceil(count / cols) : 0;
      // 40 = date-more margin-top 12 + date-section margin-bottom 28
      const h = count > 0
        ? getHeaderHeight() + rows * rh + getMoreHeight() + 40
        : getHeaderHeight() + getMoreHeight() + 40;
      layouts.push({ key, index: i, date: d, count, rows, cols, top, height: h });
      top += h;
    }
    return { layouts, totalHeight: top, cols, rowHeight: rh };
  }

  function visibleRange(totalHeight) {
    const top = scrollTop.value;
    const vh = viewportHeight.value || 600;
    const buffer = overscanRows * rowHeight();
    // 上下各多渲染 overscanRows
    const start = Math.max(0, top - buffer);
    const end = Math.min(totalHeight, top + vh + buffer);
    return { start, end, top, vh };
  }

  // 二分找首个可见日期
  function firstVisibleIndex(layouts, start) {
    let lo = 0, hi = layouts.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const L = layouts[mid];
      if (L.top + L.height <= start) lo = mid + 1;
      else if (L.top > start) hi = mid - 1;
      else { ans = mid; break; }
    }
    // 找到后向前回溯确保真正首个相交
    if (layouts[ans] && layouts[ans].top > start) {
      while (ans > 0 && layouts[ans - 1].top + layouts[ans - 1].height > start) ans--;
    } else {
      while (ans > 0 && layouts[ans].top > start) ans--;
      while (ans < layouts.length - 1 && layouts[ans].top + layouts[ans].height <= start) ans++;
    }
    return Math.max(0, ans);
  }

  function handleScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (!scrollEl.value) return;
      scrollTop.value = scrollEl.value.scrollTop;
    });
  }

  function measure() {
    if (!scrollEl.value) return;
    viewportHeight.value = scrollEl.value.clientHeight;
    viewportWidth.value = scrollEl.value.clientWidth;
    scrollTop.value = scrollEl.value.scrollTop;
  }

  function attach(el) {
    if (!el) return;
    scrollEl.value = el;
    measure();
    el.addEventListener('scroll', handleScroll, { passive: true });
    // ResizeObserver 监听容器尺寸变化（Ctrl+滚轮改缩略图会触发）
    try {
      resizeObserver = new ResizeObserver(() => {
        measure();
      });
      resizeObserver.observe(el);
    } catch {}
    window.addEventListener('resize', measure);
  }

  function detach() {
    const el = scrollEl.value;
    if (el) el.removeEventListener('scroll', handleScroll);
    if (resizeObserver) {
      try { resizeObserver.disconnect(); } catch {}
      resizeObserver = null;
    }
    window.removeEventListener('resize', measure);
    scrollEl.value = null;
  }

  // 对外：给定 layouts 与可视窗口，算出每个日期需要渲染的行区间
  function sliceForLayout(layout, viewport) {
    const { start, end } = viewport;
    if (layout.top + layout.height <= start || layout.top >= end) return null;
    const rh = rowHeight();
    const header = getHeaderHeight();
    const gridTop = layout.top + header;
    const gridBottom = gridTop + layout.rows * rh;
    // 可视部分在 grid 上的区间
    const visTop = Math.max(gridTop, start);
    const visBottom = Math.min(gridBottom, end);
    if (visBottom <= visTop || layout.rows <= 0) {
      // 头部或 more 区域可见时，仍需渲染 1 行兜底，避免空白
      const anyVisible = layout.top < end && layout.top + layout.height > start;
      if (!anyVisible) return null;
      // 若视口只命中 header/more，仍渲染首行
      const firstRowVisible = gridTop < end && gridBottom > start;
      if (!firstRowVisible) return { rowStart: 0, rowEnd: 0, cols: layout.cols, offsetY: 0 };
      // 计算实际行
      const s = Math.max(0, Math.floor((visTop - gridTop) / rh));
      const e = Math.min(layout.rows, Math.ceil((visBottom - gridTop) / rh));
      return { rowStart: s, rowEnd: e, cols: layout.cols, offsetY: s * rh };
    }
    const s = Math.max(0, Math.floor((visTop - gridTop) / rh));
    const e = Math.min(layout.rows, Math.ceil((visBottom - gridTop) / rh));
    return { rowStart: s, rowEnd: e, cols: layout.cols, offsetY: s * rh };
  }

  onBeforeUnmount(detach);

  return {
    scrollEl,
    viewportHeight,
    viewportWidth,
    scrollTop,
    columns,
    rowHeight,
    dateHeight,
    buildLayouts,
    visibleRange,
    firstVisibleIndex,
    sliceForLayout,
    attach,
    detach,
    measure,
    handleScroll,
  };
}
