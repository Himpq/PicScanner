// P4 渲染计划测试（纯函数，无浏览器）
//
// 数据量级取自真实�?data/picscanner.db�?//   18,694 �?/ 431 个日期分�?/ 单分组最�?1,806 张（2025-03-22�?// 断言围绕三件事：
//   1. 节点数被压住（这才是 P4 的目的）
//   2. 窗口切换连续，不漏不重（否则滚动会闪空或重复�?//   3. 缩放锚点不漂（legacy 靠三�?rAF 反复滚都没修好）
import assert from 'node:assert/strict';
import { PHOTO_GRID_GAP, DATE_HEADER_HEIGHT, sectionMetrics, itemPosition } from '../src/gallery/layout.js';
import { renderPlan, zoomPlan, DEFAULT_ROW_BUFFER } from '../src/gallery/windowing.js';

const ITEM = 168;
const GAP = PHOTO_GRID_GAP;
const HEADER = DATE_HEADER_HEIGHT;
const GRID_W = 1200;          // 典型窗口宽度
const VIEWPORT = 900;

// --- 构造一个贴近真实的库：431 个日期分组，其中一个是 1806 张的大分�?---
const dates = [];
const counts = new Map();
// �?desc 排列（与默认排序一致）
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
  // 滚到大分区中�?  const before = dates.slice(0, 200).reduce((n, d) => n + counts.get(d.date_key), 0);
  const perRow = Math.max(1, Math.floor((GRID_W + GAP) / (ITEM + GAP)));
  const rowsBefore = Math.ceil(before / perRow);
  const scrollTop = rowsBefore * (ITEM + GAP);
  const plan = planAt(scrollTop);

  // 分区级：431 个里只渲染少数几�?  assert.ok(plan.renderedSections <= 6,
    '可视分区应远小于总数，实�?' + plan.renderedSections + ' / 431');

  // 条目级：这是关键。legacy 会为 1806 张全建占位卡，这里必须只有几十张
  assert.ok(plan.renderedItems <= 400,
    '单帧渲染卡片数应被压住，实际 ' + plan.renderedItems);
  assert.ok(plan.renderedItems > 0, '应当渲染出卡�?);

  console.log('  节点数：431 个分区中渲染 ' + plan.renderedSections +
              ' 个，单帧 ' + plan.renderedItems + ' 张卡片（legacy 会建 1806 张占位）');
}

// ============ 2) 窗口切换连续（滚动扫描不漏不重）============
{
  const totalHeight = planAt(0).totalHeight;
  let prevCovered = null;
  let maxItems = 0;
  let gaps = 0;

  // �?300px 采一次样，检查相邻采样点覆盖的分区索引是否连�?  for (let y = 0; y < totalHeight; y += 300) {
    const plan = planAt(y);
    maxItems = Math.max(maxItems, plan.renderedItems);
    const idx = plan.sections.map((s) => dates.findIndex((d) => d.date_key === s.dateKey));
    assert.ok(idx.length > 0, 'scrollTop=' + y + ' 应至少渲染一个分�?);
    if (prevCovered) {
      // 相邻采样点的分区区间必须有交集或紧邻，不能出现整段空�?      const contiguous = idx[0] <= prevCovered.last + 1;
      if (!contiguous) gaps += 1;
    }
    prevCovered = { first: idx[0], last: idx[idx.length - 1] };
  }
  assert.equal(gaps, 0, '滚动扫描不应出现分区空洞，实�?' + gaps + ' �?);
  assert.ok(maxItems <= 400, '任意位置的单帧卡片数都应被压住，峰�?' + maxItems);

  console.log('  窗口连续性：全程扫描无空洞，单帧卡片峰�?' + maxItems);
}

// ============ 3) 条目坐标与列数一�?============
{
  const plan = planAt(0);
  const s = plan.sections[0];
  const perRow = Math.max(1, Math.floor((GRID_W + GAP) / (ITEM + GAP)));
  assert.equal(s.cols, perRow, 'cols 应与 CSS auto-fill 的换列结果一�?);

  // 同一行的 y 相同，同一列的 x 相同，且相邻列相�?itemSize+gap
  for (const it of s.items) {
    assert.equal(it.x, (it.index % s.cols) * (ITEM + GAP), 'x 应由列号决定');
    assert.equal(it.y, HEADER + Math.floor(it.index / s.cols) * (ITEM + GAP), 'y 应由行号决定');
  }
  // 索引连续递增（窗口内不能跳号，否则会出现空洞�?  for (let i = 1; i < s.items.length; i += 1) {
    assert.equal(s.items[i].index, s.items[i - 1].index + 1, '窗口内索引应连续');
  }
  console.log('  坐标：cols=' + s.cols + '，窗口内索引连续，x/y 与行列一�?);
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

  // 缩放后同一张照片应仍停在光标附近（误差�?1 个条目尺寸内�?  const afterSec = after.sections.find((s) => s.dateKey === sec.dateKey);
  assert.ok(afterSec, '缩放后锚点所在分区应仍在渲染窗口�?);
  const afterPerRow = Math.max(1, Math.floor((GRID_W + GAP) / (NEW + GAP)));
  const afterRow = Math.floor(anchorIndex / afterPerRow);
  const photoY = afterSec.top + HEADER + afterRow * (NEW + GAP);
  const drift = Math.abs(photoY - nextScroll - cursorY);
  assert.ok(drift < NEW,
    '锚点漂移应在 1 个条目尺寸内，实�?' + Math.round(drift) + 'px（itemSize=' + NEW + '�?);

  // 放大后列数应变少
  assert.ok(afterPerRow < perRow, '放大后每行应容纳更少卡片');
  console.log('  缩放锚点�? + ITEM + ' -> ' + NEW + '，列�?' + perRow + ' -> ' + afterPerRow +
              '，锚点漂�?' + Math.round(drift) + 'px');
}

// ============ 5) 边界：空�?/ 单个分区 / 滚到�?============
{
  const empty = renderPlan({ dates: [], counts: new Map(), itemSize: ITEM, gridWidth: GRID_W, scrollTop: 0, viewportHeight: VIEWPORT });
  assert.equal(empty.renderedSections, 0, '空库不应渲染分区');
  assert.equal(empty.totalHeight, 0, '空库总高度应�?0');

  const one = renderPlan({
    dates: [{ date_key: 'd1' }], counts: new Map([['d1', 3]]),
    itemSize: ITEM, gridWidth: GRID_W, scrollTop: 0, viewportHeight: VIEWPORT,
    photoAt: (dk, i) => ({ id: i }),
  });
  assert.equal(one.renderedSections, 1, '单个分区应被渲染');
  assert.equal(one.renderedItems, 3, '分区内卡片不足一行时也应全部渲染');

  // 滚到底部：最后一个分区应被渲染，且不越界
  const full = planAt(planAt(0).totalHeight + 5000);
  assert.ok(full.renderedSections > 0, '滚过底部仍应渲染最后一个分�?);
  const lastIdx = dates.length - 1;
  const keys = full.sections.map((s) => s.dateKey);
  assert.ok(keys.includes(dates[lastIdx].date_key), '滚到底应包含最后一个分�?);
  for (const s of full.sections) {
    for (const it of s.items) {
      assert.ok(it.index >= 0 && it.index < s.count, '条目索引不得越界');
    }
  }
  console.log('  边界：空�?/ 单分�?/ 滚过底部 均正确，索引无越�?);
}

// ============ 6) 未加载的照片渲染为占位（photo �?null�?===========
{
  const plan = renderPlan({
    dates: [{ date_key: 'd1' }], counts: new Map([['d1', 10]]),
    itemSize: ITEM, gridWidth: GRID_W, scrollTop: 0, viewportHeight: VIEWPORT,
    // 只加载到�?4 �?    photoAt: (dk, i) => (i < 4 ? { id: i } : null),
  });
  const items = plan.sections[0].items;
  assert.equal(items.length, 10, '占位也应占满窗口，否则布局会塌');
  assert.equal(items.filter((it) => it.photo).length, 4, '已加载的 4 张应�?photo');
  assert.equal(items.filter((it) => !it.photo).length, 6, '其余 6 张应为占位（photo=null�?);
  console.log('  占位�?0 格中 4 张真�?+ 6 个占位，占位与真图共用同一套坐�?);
}

console.log('P4 渲染计划：全�?6 组断言通过');

// ============ 7) sectionGap：分区间�?28px margin 必须进数学，锚点才不�?============
// legacy �?.date-section �?margin-bottom: 28px，正常流布局下第 i 个分区的实际
// 位置 = Σ(前序高度 + 28)。windowing 用绝对定位复刻布局时若不把间距算进 top�?// 缩放锚点会随分区下标线性漂移（�?200 个分区偏 200*28 = 5600px）�?// 注意：renderPlan 返回�?sections 只是「可视窗口」（431 个里通常 2~4 个）�?// 全量断言必须�?sectionMetrics�?{
  const GAP_BETWEEN = 28;
  const fullGap = sectionMetrics(dates, { counts, itemSize: ITEM, gridWidth: GRID_W, sectionGap: GAP_BETWEEN });
  const fullNo = sectionMetrics(dates, { counts, itemSize: ITEM, gridWidth: GRID_W });

  // top 逐分区累加间�?  assert.equal(fullGap.sections[1].top, fullNo.sections[1].top + GAP_BETWEEN,
    '�?2 个分区的 top 应包�?1 �?sectionGap');
  assert.equal(fullGap.sections[3].top - fullGap.sections[2].top,
    fullGap.sections[2].height + GAP_BETWEEN, '相邻分区 top �?= 高度 + gap');

  // 总高�?= 最后分区底边（末尾不留 gap�?  const mLast = fullGap.sections[fullGap.sections.length - 1];
  assert.equal(fullGap.totalHeight, mLast.top + mLast.height,
    '总高�?= 最后分区底边（末尾不留 gap�?);
  assert.ok(fullGap.totalHeight > fullNo.totalHeight, '带间距的总高度应更大');

  // 二分定位在带间距�?top 序列上仍要单调有效：滚到�?�?尾分区头部都应命中自�?  for (const idx of [0, 1, Math.floor(dates.length / 2), dates.length - 1]) {
    const sec = fullGap.sections[idx];
    const plan = renderPlan({
      dates, counts, itemSize: ITEM, gridWidth: GRID_W,
      scrollTop: sec.top + 10, viewportHeight: VIEWPORT,
      photoAt: (dk, i) => ({ id: dk + ':' + i }),
      sectionGap: GAP_BETWEEN,
    });
    assert.ok(plan.sections.some((s) => s.dateKey === sec.dateKey),
      '滚到分区 ' + idx + ' 头部时应命中该分�?);
  }

  // 缩放锚点端到端：缩放后锚点照片应回到光标原位�?  const NEW = 240;
  const bigSecIdx = 200; // 1806 张的大分区，下标高，gap 累积最�?  const scrollTop = fullGap.sections[bigSecIdx].top + 300;
  const cursorY = 300;
  const { scrollTop: nextScroll, anchor, plan: after } = zoomPlan({
    dates, counts, gridWidth: GRID_W,
    prevItemSize: ITEM, itemSize: NEW,
    scrollTop, viewportHeight: VIEWPORT, cursorY,
    photoAt: (dk, i) => ({ id: dk + ':' + i }),
    sectionGap: GAP_BETWEEN,
  });
  assert.ok(anchor, '缩放应产生锚�?);
  const afterSec = after.sections.find((s) => s.dateKey === anchor.dateKey);
  assert.ok(afterSec, '锚点分区应仍在缩放后的渲染窗口内');
  const { y } = itemPosition({ index: anchor.index, cols: afterSec.cols, itemSize: NEW, gap: GAP, headerHeight: HEADER });
  const onScreenY = afterSec.top + y - nextScroll;
  assert.ok(Math.abs(onScreenY - anchor.offsetInViewport) < 1,
    '�?sectionGap 时锚点照片应精确回到光标位置，偏�?'
    + Math.abs(onScreenY - anchor.offsetInViewport).toFixed(2) + 'px');

  // 反证：不�?sectionGap �?zoom 在同一位置会漂�?28*下标 量级 —�?证明参数有效
  const { scrollTop: driftScroll } = zoomPlan({
    dates, counts, gridWidth: GRID_W,
    prevItemSize: ITEM, itemSize: NEW,
    scrollTop, viewportHeight: VIEWPORT, cursorY,
    photoAt: (dk, i) => ({ id: dk + ':' + i }),
  });
  const driftNoGap = Math.abs(driftScroll - nextScroll);
  assert.ok(driftNoGap >= 28 * (bigSecIdx - 2),
    '不带 sectionGap 的缩放应漂移�?28*下标 px，实�?' + Math.round(driftNoGap) + 'px');

  console.log('  sectionGap：top 累加 28px 间距、二分定位全 range 命中�?
    + '缩放锚点精确复位；不�?gap 的同位置缩放漂移 ' + Math.round(driftNoGap) + 'px（参数有效）');
}

console.log('P4 渲染计划：全�?7 组断言通过');
