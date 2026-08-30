// P4 Vue PhotoGrid 渲染验证（无浏览器环境）
// 用 Vite ssrLoadModule + vue/server-renderer 渲染 PhotoGrid，断言 windowing 输出
// 真正变成了正确的 DOM 结构：只渲染可视分区、卡片绝对定位、角标/标记/占位齐全。
//
// 存在的理由与 check-screens-render.mjs 相同：vite build 通过 ≠ 渲染正确。
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia } from 'pinia';

// --- 浏览器环境桩 ---
const PS = {
  state: {
    currentRootPath: 'F:\\Photos',
    currentSourceId: 'src-1',
    galleryItemSize: 168,
    galleryItemSizeRaw: 168,
    quickEdit: { open: false, picking: false },
    compare: { open: false, lightbox: false, selected: [null, null] },
    photoCache: new Map(),
    photoOffsets: new Map(),
    dates: [], dateCounts: new Map(), dateExifCounts: new Map(),
    dateCovers: new Map(), dateNotes: new Map(),
    visibleDates: new Set(), dateFocus: new Map(),
    loadingDates: false, noMoreDates: false, activeDate: null,
  },
};
globalThis.window = {
  PS,
  // bridge 的 waitBridgeReady 轮询会在超时回调里调用这两个方法，桩里补上避免进程崩溃
  addEventListener() {},
  removeEventListener() {},
};
globalThis.document = { getElementById: () => null };

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

const { default: PhotoGrid } = await server.ssrLoadModule('/src/components/gallery/PhotoGrid.vue');
const { useGalleryStore } = await server.ssrLoadModule('/src/stores/gallery.js');
const { useBatchStore } = await server.ssrLoadModule('/src/stores/batch.js');

// 注意：SSR 不跑 onMounted，gridWidth 保持初始 1px → cols=1、viewportH=0。
// 正好利用这个极端配置做确定性的结构断言：只有第一个分区进入渲染窗口，
// 且条目级窗口只露出前 3 张（行缓冲 2 行 × 每行 1 列）。
const pinia = createPinia();
const g = useGalleryStore(pinia);
g.dates = [{ date_key: '2025-03-21' }, { date_key: '2025-03-22' }, { date_key: '2025-03-23' }];
g.dateCounts = new Map([['2025-03-21', 8], ['2025-03-22', 1806], ['2025-03-23', 2]]);
g.dateExifCounts = new Map([['2025-03-21', 8], ['2025-03-22', 1500], ['2025-03-23', 0]]);
g.photoCache = new Map([
  ['2025-03-21', Array.from({ length: 8 }, (_, i) => ({
    id: 100 + i,
    filename: 'a' + i + '.jpg',
    preview_url: i < 5 ? 'file:///p' + i + '.jpg' : '',
    previewable: true,
    note: i === 0 ? '岩顶的日落' : '',
    category: i === 1 ? '人物' : '',
    favorite: i === 2,
  }))],
  ['2025-03-23', [{ id: 300, preview_url: '', previewable: false, format: 'ARW' }]],
]);
g.photoOffsets = new Map([['2025-03-21', 8], ['2025-03-22', 0], ['2025-03-23', 1]]);

const b = useBatchStore(pinia);
// 故意倒序：验证角标编号跟随选择顺序而不是照片 id
b.selected = [{ id: 102 }, { id: 100 }];

const html = await renderToString(createSSRApp(PhotoGrid).use(pinia));

// ---- 1) 分区级 windowing：只有第一个分区进入渲染窗口 ----
assert.ok(html.includes('data-date="2025-03-21"'), '第一个分区应渲染');
assert.ok(!html.includes('data-date="2025-03-22"'), '1806 张的大分区在缓冲外，不应渲染（SSR 视口为 0）');
assert.ok(!html.includes('data-date="2025-03-23"'), '第三个分区不应渲染');

// ---- 2) 分区头：日期 + 「N 张 · EXIF M」 ----
assert.ok(html.includes('2025-03-21'), '应渲染日期标题');
assert.ok(html.includes('8 张 · EXIF 8'), '应渲染「N 张 · EXIF M」计数（dateExifCounts 来自 hydrate）');
// 该日已全部加载 → 页脚仍在（几何恒定，防瞬移），但文案是「这一天已加载完」
assert.ok(html.includes('date-more'), 'date-more 页脚必须恒在（高度与加载状态无关，否则滚动会瞬移）');
assert.ok(html.includes('这一天已加载完'), '已加载完的分区页脚文案应为「这一天已加载完」');
assert.ok(!html.includes('滚动到这里会继续加载'), '未缺量的分区不应显示继续加载文案');

// ---- 3) 条目级 windowing：只渲染窗口内 3 张，绝对定位坐标正确 ----
// 注意只匹配 <article>：img 上也有 data-photo-id（预览队列契约），会重复计数
const cardIds = [...html.matchAll(/<article[^>]*data-photo-id="(\d+)"/g)].map((m) => m[1]);
assert.deepEqual(cardIds, ['100', '101', '102'], '应只渲染条目窗口内的 3 张，实际 ' + JSON.stringify(cardIds));
assert.ok(html.includes('width:168px'), '卡片宽应为当前条目尺寸');
assert.ok(html.includes('translate3d(0px, 36px, 0)'), '第一张卡 y 应在 header(36px) 之下');
assert.ok(html.includes('translate3d(0px, 214px, 0)'), '第二张卡 y = 36 + 168 + gap(10)');
// 预览图直出
assert.ok(html.includes('src="file:///p0.jpg"'), '已有 preview_url 的照片应直出 img');

// ---- 4) 标记 / 角标（复用 legacy 的 .photo-card 类名体系）----
assert.match(html, /class="[^"]*\bfavorite\b[^"]*"/, '收藏卡应带 favorite 类');
assert.ok(html.includes('data-note="岩顶的日落"'), '笔记图标应带 data-note（document 级 tooltip 委托依赖它）');
assert.ok(html.includes('photo-note-icon'), '应渲染 note-icon');
assert.ok(html.includes('photo-category-badge') && html.includes('人物'), '分类徽标应渲染');
assert.ok(html.includes('photo-batch-badge'), '批量选择应渲染角标');
assert.ok(/<b[^>]*>2<\/b>/.test(html) && /<b[^>]*>1<\/b>/.test(html), '批量角标编号应跟随选择顺序（102→1, 100→2）');
assert.match(html, /class="[^"]*\bbatch-selected\b[^"]*"/, '选中卡应带 batch-selected 类');
assert.ok(!html.includes('photo-compare-badge'), '对比未开启时不应有对比角标');

// ---- 5) 占位卡：photo=null 时渲染 placeholder-fill ----
{
  // 把该日照片清到只剩 1 张，窗口内第 2、3 格应是占位
  g.photoCache = new Map([
    ['2025-03-21', [g.photoCache.get('2025-03-21')[0]]],
    ['2025-03-23', [{ id: 300, preview_url: '', previewable: false, format: 'ARW' }]],
  ]);
  g.photoOffsets = new Map([['2025-03-21', 1], ['2025-03-22', 0], ['2025-03-23', 1]]);
  const html2 = await renderToString(createSSRApp(PhotoGrid).use(pinia));
  assert.ok(html2.includes('photo-placeholder'), '未加载到的窗口格应渲染占位卡');
  assert.ok(html2.includes('placeholder-fill'), '占位卡应有 placeholder-fill');
  assert.ok(html2.includes('data-photo-id="100"'), '已加载的 1 张仍渲染真卡');
  // count(8) > loaded(1) → 应有「继续检查」footer。
  // 注意 watch(plan, immediate) 会在 setup 里同步触发一次补拉取（本环境 mock 失败），
  // 拉取进行中渲染出的文案是「加载中...」，与 legacy 行为一致，两种都算对。
  assert.ok(html2.includes('date-more'), '未加载完的分区应渲染 date-more footer');
  assert.ok(html2.includes('滚动到这里会继续加载') || html2.includes('加载中...'),
    'footer 文案应为「滚动到这里会继续加载」或拉取中的「加载中...」');
}

await server.close();
console.log('PhotoGrid 渲染验证：全部断言通过');
