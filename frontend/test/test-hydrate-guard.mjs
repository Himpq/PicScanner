// P4 回归：hydrate 的「对称守卫」——resetGallery 瞬间清空 legacy 集合时，
// store 的 dates 保留（既有守卫），dateCounts/dateExifCounts 也必须保留。
// 缺陷背景：曾出现头部全部「0 张 · EXIF 0」+ 页脚全部「这一天已加载完」。
globalThis.window = globalThis;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 16);
import assert from 'node:assert/strict';

const { createPinia } = await import('pinia');
const { installLegacyStateProxy, registerLegacySyncer } = await import('../src/bridge/legacyStateProxy.js');
const { useGalleryStore } = await import('../src/stores/gallery.js');

const pinia = createPinia();
const store = useGalleryStore(pinia);

const state = {
  dates: [], dateCounts: new Map(), dateExifCounts: new Map(), dateCovers: new Map(),
  dateNotes: new Map(), visibleDates: new Set(), dateFocus: new Map(),
  sortKey: 'datetime_desc', sortOpen: false, filterOpen: false, activeFilter: {}, filterOptions: null,
  searchOpen: false, searchScope: 'all', categories: [], favoriteCount: 0, hiddenCount: 0, activeCategory: null,
  galleryItemSize: 168, galleryItemSizeRaw: 168, currentRootPath: 'F:\\x', currentSourceId: 'src-1',
  activeDate: null, dateCursor: null, noMoreDates: false, loadingDates: false,
};
globalThis.window.PS = { state };
assert.equal(installLegacyStateProxy(pinia), true, '代理应安装成功');
registerLegacySyncer(() => store.hydrateFromLegacy());
const tick = () => new Promise((r) => setTimeout(r, 30));

// 1) legacy 首轮加载 → store 同步
for (const [k, c] of [['2026-08-26', 9], ['2026-06-14', 5]]) {
  state.dateCounts.set(k, c);
  state.dateExifCounts.set(k, c);
  state.dates.push({ date_key: k });
}
await tick();
assert.equal(store.dateCounts.get('2026-08-26'), 9, 'counts 应同步进 store');
assert.equal(store.dates.length, 2, 'dates 应同步进 store');

// 2) resetGallery 瞬态（有来源上下文）：dates 与 counts 都必须保留
state.dates = [];
state.dateCounts = new Map();
state.dateExifCounts = new Map();
await tick();
assert.equal(store.dates.length, 2, 'resetGallery 瞬态：store dates 应保留');
assert.equal(store.dateCounts.get('2026-08-26'), 9, 'resetGallery 瞬态：store counts 应保留（不得清成 0 张）');
assert.equal(store.dateExifCounts.get('2026-06-14'), 5, 'resetGallery 瞬态：store exif counts 应保留');

// 3) 重填到达 → 新数据正常覆盖
state.dateCounts.set('2026-08-26', 10);
await tick();
assert.equal(store.dateCounts.get('2026-08-26'), 10, '重填数据应正常覆盖');

// 4) 退回来源屏（isReset：无来源上下文）→ dates 与 counts 一起清空
state.currentSourceId = '';
state.dates = [];
state.dateCounts = new Map();
state.dateExifCounts = new Map();
await tick();
assert.equal(store.dates.length, 0, 'isReset 时 store dates 应清空');
assert.equal(store.dateCounts.size, 0, 'isReset 时 store counts 应清空');

console.log('hydrate 对称守卫：全部 8 组断言通过');
