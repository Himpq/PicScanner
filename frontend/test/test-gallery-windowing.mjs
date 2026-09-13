// P4 渲染计划测试（纯函数，无浏览器）
//
// 数据量级取自真实库 data/picscanner.db：
//   18,694 张 / 431 个日期分组 / 单分组最多 1,806 张（2025-03-22）
// 断言围绕三件事：
//   1. 节点数被压住（这才是 P4 的目的）
//   2. 窗口切换连续，不漏不重（否则滚动会闪空或重复）
//   3. 缩放锚点不漂（legacy 靠三层 rAF 反复滚都没修好）
import assert from 'node:assert/strict';
import { PHOTO_GRID_GAP, DATE_HEADER_HEIGHT, sectionMetrics, itemPosition } from '../src/gallery/layout.js';
import { renderPlan, zoomPlan, DEFAULT_ROW_BUFFER } from '../src/gallery/windowing.js';

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

// ============ 7) sectionGap：复刻 28px margin 间距后锚点仍不漂 ============
//
// legacy 的 .date-section 有 margin-bottom: 28px，分区 i 的实际占位 =
// 高度 + 28。windowing 用绝对定位复刻布局时若不把这段算进 top（即
// sectionGap 默认 0），分区越靠后 top 偏差越大 —— 缩放锚点会随分区下标
// 线性漂移（实测第 200 分区漂 6150px）。带 sectionGap 后定位与缩放都应无漂。
{
  const GAP_BETWEEN = 28;
  const fullGap = sectionMetrics(dates, { counts, itemSize: ITEM, gridWidth: GRID_W, sectionGap: GAP_BETWEEN });
  const fullNo = sectionMetrics(dates, { counts, itemSize: ITEM, gridWidth: GRID_W });

  // top 逐分区累加 gap
  assert.equal(fullGap.sections[1].top, fullNo.sections[1].top + GAP_BETWEEN,
    '第 2 个分区的 top 应包含第 1 个分区后的 sectionGap');
  assert.equal(fullGap.sections[3].top - fullGap.sections[2].top,
    fullGap.sections[2].height + GAP_BETWEEN, '相邻分区 top 差 = 分区高度 + gap');

  // 总高 = 最后分区底边（末尾不留 gap）
  const mLast = fullGap.sections[fullGap.sections.length - 1];
  assert.equal(fullGap.totalHeight, mLast.top + mLast.height,
    '总高度 = 最后分区底边，末尾不加 gap');
  assert.ok(fullGap.totalHeight > fullNo.totalHeight, '带间距的总高度应更大');

  // 带间距布局下抽查各位置的分区都能被 windowing 命中（top 算错就会漏渲染）
  for (const idx of [0, 1, Math.floor(dates.length / 2), dates.length - 1]) {
    const sec = fullGap.sections[idx];
    const plan = renderPlan({
      dates, counts, itemSize: ITEM, gridWidth: GRID_W,
      scrollTop: sec.top + 10, viewportHeight: VIEWPORT,
      photoAt: (dk, i) => ({ id: dk + ':' + i }),
      sectionGap: GAP_BETWEEN,
    });
    assert.ok(plan.sections.some((s) => s.dateKey === sec.dateKey),
      '第 ' + idx + ' 个分区在带间距布局下应被命中');
  }

  // 带 sectionGap 时缩放锚点误差 < 1px（间距已算进 top，不再随下标漂移）
  const NEW = 240;
  const bigSecIdx = 200; // 1806 张大分区，间距累积的放大器
  const scrollTop = fullGap.sections[bigSecIdx].top + 300;
  const cursorY = 300;
  const { scrollTop: nextScroll, anchor, plan: after } = zoomPlan({
    dates, counts, gridWidth: GRID_W,
    prevItemSize: ITEM, itemSize: NEW,
    scrollTop, viewportHeight: VIEWPORT, cursorY,
    photoAt: (dk, i) => ({ id: dk + ':' + i }),
    sectionGap: GAP_BETWEEN,
  });
  assert.ok(anchor, '缩放应能找到锚点');
  const afterSec = after.sections.find((s) => s.dateKey === anchor.dateKey);
  assert.ok(afterSec, '锚点分区在缩放后仍应在渲染窗口内');
  const { y } = itemPosition({ index: anchor.index, cols: afterSec.cols, itemSize: NEW, gap: GAP, headerHeight: HEADER });
  const onScreenY = afterSec.top + y - nextScroll;
  assert.ok(Math.abs(onScreenY - anchor.offsetInViewport) < 1,
    '带 sectionGap 时锚点误差应 < 1px，实际 '
    + Math.abs(onScreenY - anchor.offsetInViewport).toFixed(2) + 'px');

  // 反证：若布局带 28px 间距而计算不带（sectionGap 缺省 0，即修复前的模型），
  // 同一位置的锚点 scrollTop 会差出 28*分区下标 量级
  const { scrollTop: driftScroll } = zoomPlan({
    dates, counts, gridWidth: GRID_W,
    prevItemSize: ITEM, itemSize: NEW,
    scrollTop, viewportHeight: VIEWPORT, cursorY,
    photoAt: (dk, i) => ({ id: dk + ':' + i }),
  });
  const driftNoGap = Math.abs(driftScroll - nextScroll);
  assert.ok(driftNoGap >= 28 * (bigSecIdx - 2),
    '不带 sectionGap 锚点漂移应达 28*下标 px 量级，实际 ' + Math.round(driftNoGap) + 'px');

  console.log('  sectionGap：top 累计 28px 间距后可视 range 正确、缩放锚点无漂；'
    + '不带 gap 的旧模型漂移 ' + Math.round(driftNoGap) + 'px（反证成立）');
}

// ============ 8) 窗口 resize：宽度变化后视口顶部仍是同一张照片 ============
//
// 复现报障：改窗体大小 → 列数变化 → 同一 scrollTop 落到别的日期分区。
// zoomPlan 走"宽度重排"路径：prevGridWidth + itemSize 不变 + pinItemTop，
// 锚点照片相对视口顶部的距离分毫不差（可为负），而不是被吸附到行首。
{
  const W_WIDE = 1200;   // 6 列
  const W_NARROW = 700;  // 3 列
  const colsWide = Math.max(1, Math.floor((W_WIDE + GAP) / (ITEM + GAP)));
  const colsNarrow = Math.max(1, Math.floor((W_NARROW + GAP) / (ITEM + GAP)));
  assert.ok(colsWide !== colsNarrow,
    '测试宽度必须跨列数，实际 ' + colsWide + ' vs ' + colsNarrow);

  const GAP_BETWEEN = 28;
  function dateAt(gridWidth, y) {
    const m = sectionMetrics(dates, { counts, itemSize: ITEM, gridWidth, sectionGap: GAP_BETWEEN });
    const secs = m.sections;
    let i = secs.findIndex((s) => y < s.top + s.height);
    if (i < 0) i = secs.length - 1;
    return { metrics: m, dateKey: secs[i].dateKey };
  }

  function widthCheck(fromW, toW, label) {
    const mOld = sectionMetrics(dates, { counts, itemSize: ITEM, gridWidth: fromW, sectionGap: GAP_BETWEEN });
    // 大分区中部、行内偏移 37px：验证 pinItemTop 精确保留行内距离，而非吸附行首
    const scrollTop = mOld.sections[200].top + 500 + 37;
    const { scrollTop: nextScroll, anchor, plan: after } = zoomPlan({
      dates, counts, gridWidth: toW, prevGridWidth: fromW,
      prevItemSize: ITEM, itemSize: ITEM,
      scrollTop, viewportHeight: VIEWPORT, cursorY: 0, pinItemTop: true,
      photoAt: (dk, idx) => ({ id: dk + ':' + idx }),
      sectionGap: GAP_BETWEEN,
    });
    assert.ok(anchor, label + '：宽度重排应能找到视口顶部锚点');

    // 锚点照片在新布局下与视口顶部的距离，应与旧布局完全一致（误差 < 1px）
    const afterSec = after.sections.find((s) => s.dateKey === anchor.dateKey);
    assert.ok(afterSec, label + '：锚点分区在重排后仍应在渲染窗口内');
    const { y } = itemPosition({ index: anchor.index, cols: afterSec.cols, itemSize: ITEM, gap: GAP, headerHeight: HEADER });
    const oldSec = mOld.sections.find((s) => s.dateKey === anchor.dateKey);
    const oldPos = itemPosition({ index: anchor.index, cols: oldSec.cols, itemSize: ITEM, gap: GAP, headerHeight: HEADER });
    const oldOffset = oldSec.top + oldPos.y - scrollTop;
    assert.ok(oldOffset !== 0, label + '：测试位置应带行内偏移（否则测不出 pinItemTop）');
    assert.ok(Math.abs((afterSec.top + y - nextScroll) - oldOffset) < 1,
      label + '：锚点相对距离应分毫不差，实际偏差 '
      + Math.abs((afterSec.top + y - nextScroll) - oldOffset).toFixed(2) + 'px');

    // 视口顶部仍是同一日期（没跳到别的日期）
    assert.equal(dateAt(toW, nextScroll).dateKey, anchor.dateKey,
      label + '：重排后视口顶部应仍是同一日期');

    // 反证：沿用旧 scrollTop 则顶部已是别的日期（否则测不出修复效果）
    assert.notEqual(dateAt(toW, scrollTop).dateKey, anchor.dateKey,
      label + '：旧 scrollTop 在新宽度下顶部应已是别的日期');
  }
  widthCheck(W_WIDE, W_NARROW, '变窄');
  widthCheck(W_NARROW, W_WIDE, '变宽');

  // 列数不变的宽度微调（1200 -> 1150，同为 6 列）：scrollTop 应原样返回
  {
    const W_SLIGHT = 1150;
    assert.equal(Math.max(1, Math.floor((W_SLIGHT + GAP) / (ITEM + GAP))), colsWide,
      '1150px 宽仍应是 6 列');
    const m = sectionMetrics(dates, { counts, itemSize: ITEM, gridWidth: W_WIDE, sectionGap: GAP_BETWEEN });
    const scrollTop = m.sections[200].top + 537;
    const { scrollTop: nextScroll } = zoomPlan({
      dates, counts, gridWidth: W_SLIGHT, prevGridWidth: W_WIDE,
      prevItemSize: ITEM, itemSize: ITEM,
      scrollTop, viewportHeight: VIEWPORT, cursorY: 0, pinItemTop: true,
      photoAt: (dk, idx) => ({ id: dk + ':' + idx }),
      sectionGap: GAP_BETWEEN,
    });
    assert.equal(nextScroll, scrollTop, '列数不变时 scrollTop 应原样保留');
  }

  // 空库：无锚点，原样返回
  {
    const { scrollTop: nextScroll, anchor } = zoomPlan({
      dates: [], counts: new Map(), gridWidth: W_NARROW, prevGridWidth: W_WIDE,
      prevItemSize: ITEM, itemSize: ITEM,
      scrollTop: 100, viewportHeight: VIEWPORT, cursorY: 0, pinItemTop: true,
    });
    assert.equal(anchor, null, '空库应无锚点');
    assert.equal(nextScroll, 100, '空库 scrollTop 应原样返回');
  }

  console.log('  宽度锚点：1200<->700 跨列重排后视口顶部仍是同一张照片（像素级）；同列微调位置不变');
}

console.log('P4 渲染计划：全部 8 组断言通过');
