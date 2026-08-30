// P2 纯函数高度模型的数学验证
// 重点是缩放锚点：Ctrl+滚轮改条目尺寸后，光标下的照片必须停在原处，
// 否则就是用户能直接感知到�?缩放时画面乱�?�?import assert from 'node:assert/strict';
import * as L from '../src/gallery/layout.js';

const GRID_W = 1200;
const GAP = L.PHOTO_GRID_GAP;
const HEADER = L.DATE_HEADER_HEIGHT;

// 贴近真实的分布：431 个日期分组，单组最�?1806 �?const dates = [
  { date_key: '2025-03-21' },
  { date_key: '2025-03-22' },
  { date_key: '2025-03-23' },
];
const counts = new Map([
  ['2025-03-21', 120],
  ['2025-03-22', 1806],
  ['2025-03-23', 95],
]);
const mk = (itemSize) => L.sectionMetrics(dates, { counts, itemSize, gridWidth: GRID_W });

// --- 1) 列数�?CSS auto-fill 一�?---
// gridWidth 1200, item 168, gap 10 -> floor((1200+10)/178) = 6
assert.equal(L.columnsFor(1200, 168), 6);
// item 缩小�?112 -> floor(1210/122) = 9
assert.equal(L.columnsFor(1200, 112), 9);
// 极窄容器不应退化为 0 �?assert.equal(L.columnsFor(10, 168), 1);

// --- 2) 单分区高�?= header + ceil(n/cols) �?* itemSize + (�?1) * gap ---
{
  const m = L.dateSectionHeight({ count: 1806, itemSize: 168, gridWidth: GRID_W });
  assert.equal(m.cols, 6);
  assert.equal(m.rows, Math.ceil(1806 / 6));
  const expectGrid = m.rows * 168 + (m.rows - 1) * GAP;
  assert.equal(m.gridHeight, expectGrid);
  assert.equal(m.height, Math.ceil(HEADER + expectGrid));
}
// 空分区不应算出负高度
assert.equal(L.dateSectionHeight({ count: 0, itemSize: 168, gridWidth: GRID_W }).height, 80);

// --- 3) 前缀和必须连续，总高等于各分区之�?---
{
  const m = mk(168);
  let acc = 0;
  for (const s of m.sections) {
    assert.equal(s.top, acc, '分区 top 必须紧接上一个分�?);
    acc += s.height;
  }
  assert.equal(m.totalHeight, acc);
}

// --- 4) 可视区间必须覆盖视口，且不能渲染整组�?806 张不能全上）---
{
  const m = mk(168);
  const big = m.sections[1];
  const viewportH = 900;
  // 滚到最大的那个分区中间
  const scrollTop = big.top + 20 * (168 + GAP);
  const sec = L.visibleSectionRange(m, { scrollTop, viewportHeight: viewportH, bufferPx: 400 });
  assert.ok(sec.start <= 1 && sec.end >= 2, '可视分区区间应覆盖第 2 个分�?);
  const item = L.visibleItemRange(big, { scrollTop, viewportHeight: viewportH, itemSize: 168, bufferRows: 2 });
  assert.ok(item.end - item.start < 1806, '不应渲染整个分区');
  // 1806 张�? 列、视�?900px �?-> �?6 �?* 6 �?+ 缓冲，明显小�?100
  assert.ok(item.end - item.start < 100, '可视条目数应远小于总数，实�?' + (item.end - item.start));
  // 光标所在行必须在区间内
  assert.ok(item.start <= 20 * 6 && item.end > 20 * 6, '可视区间必须包含光标所在行');
}

// --- 5) 缩放锚点：改�?itemSize 后，锚点照片在视口中的偏移保持不�?---
{
  const before = 168;
  const after = 240;
  const m0 = mk(before);
  const scrollTop = m0.sections[1].top + 5000;
  const viewportH = 900;
  // 取视口中心作为锚�?  const anchor = L.anchorAtPoint(m0, { scrollTop, pointOffset: viewportH / 2, itemSize: before });
  assert.ok(anchor, '应能定位到锚�?);

  const { scrollTop: nextTop, metrics: m1 } = L.zoomAnchorScrollTop({
    dates,
    counts,
    gridWidth: GRID_W,
    itemSize: after,
    anchorDateKey: anchor.dateKey,
    anchorIndex: anchor.index,
    offsetInViewport: anchor.offsetInViewport,
  });
  assert.ok(nextTop !== null, '应能算出缩放后的 scrollTop');

  const s1 = m1.sections.find((s) => s.dateKey === anchor.dateKey);
  const pos = L.itemPosition({ index: anchor.index, cols: s1.cols, itemSize: after });
  const newOffsetInViewport = (s1.top + pos.y) - nextTop;
  const drift = Math.abs(newOffsetInViewport - anchor.offsetInViewport);
  // 行对齐后允许一行以内的误差（照片在行内会随列数变化而左移，这是预期行为�?  assert.ok(drift <= after + GAP, `缩放后锚点漂移应在一行内，实�?${drift.toFixed(1)}px`);
}

// --- 6) anchorAtPoint �?offsetInViewport 必须等于传入�?pointOffset ---
{
  const m = mk(168);
  const a = L.anchorAtPoint(m, { scrollTop: 3000, pointOffset: 250, itemSize: 168 });
  assert.equal(a.offsetInViewport, 250);
}

console.log('P2 高度模型：全�?6 组断言通过');
console.log('  1200px �?/ 168px 条目 ->', L.columnsFor(1200, 168), '列；1806 �?->',
  L.dateSectionHeight({ count: 1806, itemSize: 168, gridWidth: 1200 }).height, 'px �?);
console.log('  缩放 168 -> 240 后锚点漂移在可接受范围内');
