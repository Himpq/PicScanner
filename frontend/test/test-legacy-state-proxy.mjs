// P1 真源代理的行为验证（node 环境，不依赖浏览器）
// 覆盖三个最关键的风险点：
//   1) 标量字段双向代理（legacy 写 ↔ Pinia 读）
//   2) 集合字段原地改动触发同步
//   3) resetGallery 式的整体替换后仍触发同步（这是最容易漏的坑）
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

const { installLegacyStateProxy, isSsotActive, registerLegacySyncer } =
  await import('../src/bridge/legacyStateProxy.js');

// --- 假 Pinia store：只记录赋值 ---
const store = {};
const syncLog = [];

// 构造一个形态接近真实 PS.state 的对象
const state = {
  sortKey: 'datetime_desc',
  activeFilter: {},
  currentRootPath: '',
  galleryItemSize: 168,
  galleryItemSizeRaw: 168,
  dates: [],
  dateCounts: new Map(),
  dateCovers: new Map(),
  dateNotes: new Map(),
  visibleDates: new Set(),
  dateFocus: new Map(),
};
globalThis.window.PS = { state };

const ok = installLegacyStateProxy(null, { galleryStore: () => store });
assert.equal(ok, true, '代理应安装成功');
assert.equal(isSsotActive(), true, 'isSsotActive 应为 true');
registerLegacySyncer(() => syncLog.push('sync'));

const tick = () => new Promise((r) => setTimeout(r, 5));

// --- 1) 标量双向代理 ---
syncLog.length = 0;
state.sortKey = 'datetime_asc';
assert.equal(store.sortKey, 'datetime_asc', 'legacy 写应直达 Pinia');
assert.equal(state.sortKey, 'datetime_asc', 'legacy 读应来自 Pinia');
store.galleryItemSize = 240;
assert.equal(state.galleryItemSize, 240, 'Pinia 写应被 legacy 读到');

// 初值播种：代理安装时应把 legacy 的值写进 Pinia
assert.equal(store.sortKey, 'datetime_asc', '安装后 store 应持有 legacy 的 sortKey');

// --- 2) 集合原地改动触发同步 ---
syncLog.length = 0;
state.dateCounts.set('2025-03-22', 1806);
state.dates.push({ date_key: '2025-03-22' });
state.dates.sort((a, b) => String(a.date_key).localeCompare(b.date_key));
state.visibleDates.add('2025-03-22');
await tick();
assert.ok(syncLog.length > 0, '原地改动应触发同步');
assert.equal(syncLog.length, 1, 'rAF 合并后一帧内只应同步一次，实际 ' + syncLog.length);
assert.equal(state.dateCounts.get('2025-03-22'), 1806, 'Map 读写应正常');
assert.equal(state.dates.length, 1, 'Array 读写应正常');
assert.equal(state.visibleDates.has('2025-03-22'), true, 'Set 读写应正常');

// --- 3) 整体替换（resetGallery 的真实写法）后仍触发同步 ---
syncLog.length = 0;
state.dates = [];
state.dateCounts = new Map();
state.dateNotes = new Map();
state.dateCovers = new Map();
state.visibleDates = new Set();
state.dateFocus = new Map();
await tick();
assert.ok(syncLog.length > 0, '整体替换应触发同步（否则重置后 Vue 侧永远收不到）');

// 替换后仍然是可通知的代理
syncLog.length = 0;
state.dates.push({ date_key: '2026-01-01' });
await tick();
assert.ok(syncLog.length > 0, '替换后的新容器应重新被代理包住');

// --- 4) 读操作不应触发同步 ---
syncLog.length = 0;
void state.dateCounts.get('2025-03-22');
void state.dates.length;
for (const d of state.dates) void d;
Array.from(state.dateCounts.keys());
state.dates.map((d) => d.date_key);
await tick();
assert.equal(syncLog.length, 0, '纯读操作不应触发同步，实际 ' + syncLog.length);

// --- 5) Object.keys 仍应看到被代理的字段（防止 legacy 遍历 state 时漏字段）---
const keys = Object.keys(state);
for (const k of ['sortKey', 'dates', 'dateCounts', 'activeFilter']) {
  assert.ok(keys.includes(k), 'Object.keys 应包含 ' + k);
}

// --- 6) 类型判定必须能穿透代理 ---
// gallery.hydrateFromLegacy() 用 Array.isArray / instanceof Map / instanceof Set
// 做守卫，代理若破坏这些判定，hydrate 会静默失效、界面不再刷新。
assert.equal(Array.isArray(state.dates), true, 'Array.isArray 必须穿透代理');
assert.equal(state.dateCounts instanceof Map, true, 'instanceof Map 必须穿透代理');
assert.equal(state.visibleDates instanceof Set, true, 'instanceof Set 必须穿透代理');
// 整体替换之后同样要成立
assert.equal(Array.isArray(state.dates), true, '替换后 Array.isArray 仍需成立');
assert.equal(state.dateCounts instanceof Map, true, '替换后 instanceof Map 仍需成立');

console.log('P1 真源代理：全部 6 组断言通过');
