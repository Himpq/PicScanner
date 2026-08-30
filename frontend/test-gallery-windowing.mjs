// P4 渲染计划测试（纯函数，无浏览器）
//
// 数据量级取自真实库 data/picscanner.db：
//   18,694 张 / 431 个日期分组 / 单分组最多 1,806 张（2025-03-22）
// 断言围绕三件事：
//   1. 节点数被压住（这才是 P4 的目的）
//   2. 窗口切换连续，不漏不重（否则滚动会闪空或重复）
//   3. 缩放锚点不漂（legacy 靠三层 rAF 反复滚都没修好）
import assert from 'node:assert/strict';
import { PHOTO_GRID_GAP, DATE_HEADER_HEIGHT } from './src/gallery/layout.js';
import { renderPlan, zoomPlan, DEFAULT_ROW_BUFFER } from './src/gallery/windowing.js';

const ITEM = 168;
const GAP = PHOTO_GRID_GAP;
const HEADER = DATE_HEADER_HEIGHT;
const GRID_W = 1200;          // 典型窗口宽度
const VIEWPORT = 900;

// --- 构造一个贴近真实的库：431 个日期分组，其中一个是 1806 张的大分区 ---
const dates = [];
const counts = new Map();
// 按 desc 排列（与默认排序一致）
for (let i = 0; i < 431; i += 1) {
  const key = '2025-' + String(12 - (i % 12)).padStart(2, '0') + '-' + String((i % 28) + 1).padStart(2, '0');
  const key2 = key + '#' + i;
  dates.push({ date_key: key2 });
  counts.set(key2, i === 200 ? 1806 : (i % 37) + 1);
}
const BIG = dates[200].date_key;

function planAt(scrollTop, { itemSize = ITEM, gridWidth = GRID_W, viewportHeight = VIEWPORT } = {}) {
  return renderPlan({
    dates, counts, itemSize, gridWidth, scrollTop, viewportHeight,
    photoAt: (dk, idx) => ({ id: dk + ':' + idx }),
  });
}

// ============ 1) 节点数被压住 ============
{
  // 滚到大分区中部
  const before = dates.slice(0, 200).reduce((n, d) => n + counts.get(d.date_key), 0);
  const perRow = Math.max(1, Math.floor((GRID_W + GAP) / (ITEM + GAP)));
  const rowsBefore = Math.ceil(before / perRow);
  const scrollTop = rowsBefore * (ITEM + GAP);
  const plan = planAt(scrollTop);

  // 分区级：431 个里只渲染少数几个
  assert.ok(plan.renderedSections <= 6,
    '可视分区应远小于总数，实际 ' + plan.renderedSections + ' / 431');

  // 条目级：这是关键。legacy 会为 1806 张全建占位卡，这里必须只有几十张
  assert.ok(plan.renderedItems <= 400,
    '单帧渲染卡片数应被压住，实际 ' + plan.renderedItems);
  assert.ok(plan.renderedItems > 0, '应当渲染出卡片');

  console.log('  节点数：431 个分区中渲染 ' + plan.renderedSections +
              ' 个，单帧 ' + plan.renderedItems + ' 张卡片（legacy 会建 1806 张占位）');
}

// ============ 2) 窗口切换连续（滚动扫描不漏不重）============
{
  const totalHeight = planAt(0).totalHeight;
  let prevCovered = null;
  let maxItems = 0;
  let gaps = 0;

  // 每 300px 采一次样，检查相邻采样点覆盖的分区索引是否连续
  for (let y = 0; y < totalHeight; y += 300) {
    const plan = planAt(y);
    maxItems = Math.max(maxItems, plan.renderedItems);
    const idx = plan.sections.map((s) => dates.findIndex((d) => d.date_key === s.dateKey));
    assert.ok(idx.length > 0, 'scrollTop=' + y + ' 应至少渲染一个分区');
    if (prevCovered) {
      // 相邻采样点的分区区间必须有交集或紧邻，不能出现整段空洞
      const contiguous = idx[0] <= prevCovered.last + 1;
      if (!contiguous) gaps += 1;
    }
    prevCovered = { first: idx[0], last: idx[idx.length - 1] };
  }
  assert.equal(gaps, 0, '滚动扫描不应出现分区空洞，实际 ' + gaps + ' 处');
  assert.ok(maxItems <= 400, '任意位置的单帧卡片数都应被压住，峰值 ' + maxItems);

  console.log('  窗口连续性：全程扫描无空洞，单帧卡片峰值 ' + maxItems);
}

// ============ 3) 条目坐标与列数一致 ============
{
  const plan = planAt(0);
  const s = plan.sections[0];
  const perRow = Math.max(1, Math.floor((GRID_W + GAP) / (ITEM + GAP)));
  assert.equal(s.cols, perRow, 'cols 应与 CSS auto-fill 的换列结果一致');

  // 同一行的 y 相同，同一列的 x 相同，且相邻列相差 itemSize+gap
  for (const it of s.items) {
    assert.equal(it.x, (it.index % s.cols) * (ITEM + GAP), 'x 应由列号决定');
    assert.equal(it.y, HEADER + Math.floor(it.index / s.cols) * (ITEM + GAP), 'y 应由行号决定');
  }
  // 索引连续递增（窗口内不能跳号，否则会出现空洞）
  for (let i = 1; i < s.items.length; i += 1) {
    assert.equal(s.items[i].index, s.items[i - 1].index + 1, '窗口内索引应连续');
  }
  console.log('  坐标：cols=' + s.cols + '，窗口内索引连续，x/y 与行列一致');
}

// ============ 4) 缩放锚点不漂 ============
{
  const perRow = Math.max(1, Math.floor((GRID_W + GAP) / (ITEM + GAP)));
  const rowsBeforeBig = Math.ceil(
    dates.slice(0, 200).reduce((n, d) => n + counts.get(d.date_key), 0) / perRow);
  const scrollTop = rowsBeforeBig * (ITEM + GAP);
  const cursorY = 300;

  const before = planAt(scrollTop, { itemSize: ITEM });
  // 锚点：光标下那张照片
  const anchorY = scrollTop + cursorY;
  const sec = before.sections.find((s) => anchorY >= s.top && anchorY < s.top + s.height)
           || before.sections[0];
  const row = Math.floor((anchorY - sec.top - HEADER) / (ITEM + GAP));
  const anchorIndex = Math.min(sec.count - 1, row * sec.cols);

  const NEW = 280;
  const { scrollTop: nextScroll, plan: after } = zoomPlan({
    dates, counts, gridWidth: GRID_W,
    prevItemSize: ITEM, itemSize: NEW,
    scrollTop, viewportHeight: VIEWPORT, cursorY,
    photoAt: (dk, idx) => ({ id: dk + ':' + idx }),
  });

  // 缩放后同一张照片应仍停在光标附近（误差在 1 个条目尺寸内）
  const afterSec = after.sections.find((s) => s.dateKey === sec.dateKey);
  assert.ok(afterSec, '缩放后锚点所在分区应仍在渲染窗口内');
  const afterPerRow = Math.max(1, Math.floor((GRID_W + GAP) / (NEW + GAP)));
  const afterRow = Math.floor(anchorIndex / afterPerRow);
  const photoY = afterSec.top + HEADER + afterRow * (NEW + GAP);
  const drift = Math.abs(photoY - nextScroll - cursorY);
  assert.ok(drift < NEW,
    '锚点漂移应在 1 个条目尺寸内，实际 ' + Math.round(drift) + 'px（itemSize=' + NEW + '）');

  // 放大后列数应变少
  assert.ok(afterPerRow < perRow, '放大后每行应容纳更少卡片');
  console.log('  缩放锚点：' + ITEM + ' -> ' + NEW + '，列数 ' + perRow + ' -> ' + afterPerRow +
              '，锚点漂移 ' + Math.round(drift) + 'px');
}

// ============ 5) 边界：空库 / 单个分区 / 滚到底 ============
{
  const empty = renderPlan({ dates: [], counts: new Map(), itemSize: ITEM, gridWidth: GRID_W, scrollTop: 0, viewportHeight: VIEWPORT });
  assert.equal(empty.renderedSections, 0, '空库不应渲染分区');
  assert.equal(empty.totalHeight, 0, '空库总高度应为 0');

  const one = renderPlan({
    dates: [{ date_key: 'd1' }], counts: new Map([['d1', 3]]),
    itemSize: ITEM, gridWidth: GRID_W, scrollTop: 0, viewportHeight: VIEWPORT,
    photoAt: (dk, i) => ({ id: i }),
  });
  assert.equal(one.renderedSections, 1, '单个分区应被渲染');
  assert.equal(one.renderedItems, 3, '分区内卡片不足一行时也应全部渲染');

  // 滚到底部：最后一个分区应被渲染，且不越界
  const full = planAt(planAt(0).totalHeight + 5000);
  assert.ok(full.renderedSections > 0, '滚过底部仍应渲染最后一个分区');
  const lastIdx = dates.length - 1;
  const keys = full.sections.map((s) => s.dateKey);
  assert.ok(keys.includes(dates[lastIdx].date_key), '滚到底应包含最后一个分区');
  for (const s of full.sections) {
    for (const it of s.items) {
      assert.ok(it.index >= 0 && it.index < s.count, '条目索引不得越界');
    }
  }
  console.log('  边界：空库 / 单分区 / 滚过底部 均正确，索引无越界');
}

// ============ 6) 未加载的照片渲染为占位（photo 为 null）============
{
  const plan = renderPlan({
    dates: [{ date_key: 'd1' }], counts: new Map([['d1', 10]]),
    itemSize: ITEM, gridWidth: GRID_W, scrollTop: 0, viewportHeight: VIEWPORT,
    // 只加载到第 4 张
    photoAt: (dk, i) => (i < 4 ? { id: i } : null),
  });
  const items = plan.sections[0].items;
  assert.equal(items.length, 10, '占位也应占满窗口，否则布局会塌');
  assert.equal(items.filter((it) => it.photo).length, 4, '已加载的 4 张应有 photo');
  assert.equal(items.filter((it) => !it.photo).length, 6, '其余 6 张应为占位（photo=null）');
  console.log('  占位：10 格中 4 张真图 + 6 个占位，占位与真图共用同一套坐标');
}

console.log('P4 渲染计划：全部 6 组断言通过');
