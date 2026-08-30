// 整屏渲染验证（无浏览器环境）
// 用 Vite 的 ssrLoadModule 加载 SFC，配合 vue/server-renderer 渲染出 HTML 后断言结构。
//
// 存在的理由：P3 迁移统计屏时，两次把 wrapper 放错层级（一次在组件内、一次在 HTML 里），
// 布局都塌了，而 `vite build` 全部通过 —— "构建成功"完全发现不了这类问题。
// 这里重点验证：组件的多根节点必须是「兄弟」，且不能被任何 wrapper 包住，
// 这样它们才能成为外层容器（#stats-screen 是 grid / #settings-screen 是 flex column）
// 的直接子项。
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia } from 'pinia';

// --- 浏览器环境桩 ---
const state = {
  currentRootPath: 'F:\\Photos',
  currentSourceId: 'src-1',
  statsTab: 'overview',
  statsOpen: true,
  settingsTab: 'about',
  settingsOpen: true,
  galleryItemSize: 168,
};
const PS = {
  state,
  APP_BUILD: 'test-build',
  PROJECT_URL: 'https://github.com/Himpq/PicScanner',
  SETTINGS_TABS: [
    { key: 'interface', label: '界面', hint: '缩略图与参数面板' },
    { key: 'export', label: '导出', hint: '目录与命名模板' },
    { key: 'storage', label: '存储', hint: '已登记来源' },
    { key: 'plugins', label: '插件', hint: '已装载模块与状态' },
    { key: 'shortcuts', label: '快捷键', hint: '查看现有键位' },
    { key: 'about', label: '关于', hint: '版本与项目' },
  ],
  closeStatsPage() {},
  closeSettingsPage() {},
};
globalThis.window = { PS };
globalThis.document = { getElementById: () => null };

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

const { default: StatsScreen } = await server.ssrLoadModule('/src/islands/StatsScreen.vue');
const { default: SettingsScreen } = await server.ssrLoadModule('/src/islands/SettingsScreen.vue');
const { default: SourceScreen } = await server.ssrLoadModule('/src/islands/SourceScreen.vue');
const { default: CollectionsScreen } = await server.ssrLoadModule('/src/islands/CollectionsScreen.vue');
const { default: CollectionDetailScreen } = await server.ssrLoadModule('/src/islands/CollectionDetailScreen.vue');
const { useStatsStore } = await server.ssrLoadModule('/src/stores/stats.js');
const { useSettingsStore } = await server.ssrLoadModule('/src/stores/settings.js');

async function render(Comp, seed) {
  const pinia = createPinia();
  const app = createSSRApp(Comp);
  app.use(pinia);
  seed(pinia);
  return renderToString(app);
}

// 一组通用断言：确认两个/多个根节点是同级兄弟，中间没有 wrapper
function assertSiblingRoots(html, roots) {
  const pos = roots.map((r) => {
    const i = html.indexOf(r.tag);
    assert.ok(i >= 0, '应渲染出 ' + r.tag + ' (' + r.label + ')');
    return { ...r, i };
  });
  for (let k = 1; k < pos.length; k += 1) {
    assert.ok(pos[k].i > pos[k - 1].i, pos[k].label + ' 应排在 ' + pos[k - 1].label + ' 之后');
    const closePrev = html.indexOf(pos[k - 1].close, pos[k - 1].i);
    assert.ok(closePrev > pos[k - 1].i && closePrev < pos[k].i,
      pos[k - 1].label + ' 必须先闭合再出现 ' + pos[k].label +
      ' —— 否则说明两者被某个 wrapper 嵌套了');
  }
}

// ===================== 统计屏 =====================
{
  const html = await render(StatsScreen, (pinia) => {
    const s = useStatsStore(pinia);
    s.sources = [{ id: 1, source_id: 'src-1', root_path: 'F:\\Photos', cover_url: '', scanned_count: 16989, registered_count: 18694 }];
    s.statistics = {
      total_files: 16989,
      exif_complete: 12109,
      exif_pending: 4880,
      by_lens: [{ name: 'E 50mm F1.8 OSS', count: 2512 }],
      by_model: [{ name: 'SONY ZV-E10', count: 7468 }],
      by_focal_bucket: [{ name: '70-135mm (中长焦)', count: 4130 }, { name: '24-35mm (广角)', count: 2036 }],
      by_aperture: [{ name: 'F2.8-4.0', count: 3681 }],
      // 故意按 count 降序给（后端就是这个顺序），验证前端重排
      by_iso_bucket: [{ name: 'ISO ≤3200', count: 649 }, { name: 'ISO ≤100', count: 5555 }],
      by_shutter: [{ name: '1/250-1/60s', count: 5867 }, { name: '<1/1000s', count: 1264 }],
      by_hour: [{ name: '15:00', count: 1459 }],
      by_month: [{ name: '2025-03', count: 120 }],
    };
  });

  assert.ok(!html.includes('ps-stats-screen'), '统计屏不应有多余 wrapper');
  assertSiblingRoots(html, [
    { tag: 'class="stats-side', close: '</aside>', label: '.stats-side' },
    { tag: 'class="stats-main', close: '</section>', label: '.stats-main' },
  ]);
  assert.ok(html.includes('已扫描 16989'), '侧栏应渲染来源计数');
  assert.ok(html.includes('返回图库') && html.includes('统计信息'), '应渲染标题与返回按钮');

  const pane = html.match(/<div class="[^"]*\bstats-pane\b[^"]*"[^>]*data-stats-pane="(\w+)"/);
  assert.ok(pane && /\bactive\b/.test(pane[0]) && pane[1] === 'overview', '默认应停在概览页');

  // 排序必须在「拍摄参数」面板内部验证：概览页的 StatsSummary 也会显示"常用焦段"
  const iParams = html.indexOf('data-stats-pane="params"');
  const iTime = html.indexOf('data-stats-pane="time"');
  assert.ok(iParams > 0 && iTime > iParams, '应能定位到拍摄参数面板');
  const paramsHtml = html.slice(iParams, iTime);
  const distBlocks = paramsHtml.split('class="distribution-chart"').slice(1);
  assert.equal(distBlocks.length, 3, '拍摄参数面板应有 3 张分布图');
  const unesc = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const namesIn = (b) => [...b.matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map((m) => unesc(m[1])).filter((t) => !/^[\d,]+$/.test(t));
  const rankNames = [...paramsHtml.matchAll(/<b[^>]*>([^<]+)<\/b>/g)].map((m) => m[1]);
  assert.deepEqual(rankNames, ['24-35mm (广角)', '70-135mm (中长焦)'], '焦段应由广到长');
  assert.deepEqual(namesIn(distBlocks[1]), ['ISO ≤100', 'ISO ≤3200'], 'ISO 应由低到高');
  assert.deepEqual(namesIn(distBlocks[2]), ['<1/1000s', '1/250-1/60s'], '快门应由快到慢');
  console.log('  统计屏：根节点为兄弟结构，排序正确');
}

// ===================== 设置屏 =====================
{
  const html = await render(SettingsScreen, (pinia) => {
    const s = useSettingsStore(pinia);
    s.openPage();          // open=true 且 openSeq 自增
    s.setTab('about');     // 用最不依赖 PS 的「关于」页，避免给桩补太多字段
  });

  assert.ok(!html.includes('ps-settings-screen'), '设置屏不应有多余 wrapper');
  assertSiblingRoots(html, [
    { tag: 'class="settings-topbar', close: '</div>', label: '.settings-topbar' },
    { tag: 'class="settings-scroll', close: '', label: '.settings-scroll' },
  ]);
  assert.ok(html.indexOf('class="settings-body') > html.indexOf('class="settings-scroll'),
    '.settings-body 应位于 .settings-scroll 内部');
  assert.ok(html.includes('返回图库'), '顶栏应有返回按钮');

  const navBtns = [...html.matchAll(/data-settings-tab="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(navBtns, ['interface', 'export', 'storage', 'plugins', 'shortcuts', 'about'],
    '应渲染 6 个设置标签，实际 ' + JSON.stringify(navBtns));
  assert.ok(html.includes('settings-nav-label'), '标签文字应使用 .settings-nav-label');

  // 打开时才渲染内容；未打开应为空
  assert.ok(html.includes('settings-panel'), '打开时应渲染设置面板内容');
  assert.ok(html.includes('项目主页'), '关于页内容应渲染');

  const closed = await render(SettingsScreen, () => {});
  assert.ok(!closed.includes('settings-panel'), '未打开时不应渲染面板内容');

  console.log('  设置屏：根节点为兄弟结构，6 个标签齐全，未打开时不渲染内容');
}

// ===================== 来源屏 =====================
{
  const { useSourceStore } = await server.ssrLoadModule('/src/stores/source.js');
  const html = await render(SourceScreen, (pinia) => {
    const s = useSourceStore(pinia);
    s.sources = [
      { kind: 'source', title: 'PhotoLib', path: 'F:\\Photos', source_id: 'src-1',
        summary: { has_cache: true, visible_files: 16989, cover_url: 'file:///c.jpg' } },
      { kind: 'folder', title: 'Backup', path: 'D:\\Backup', source_id: 'src-2', summary: {} },
      { kind: 'source', title: 'Offline', path: 'G:\\', source_id: 'src-3',
        unavailable: true, unavailable_message: '来源未插入', summary: {} },
    ];
    s.sourceConflicts = [{ id: 'dup' }];
  });

  // 与统计屏 / 设置屏相反：来源屏是单根 .source-layout
  // （#source-screen 是 grid + place-items:center，只有一个子项位；
  //   真正的两列布局在 .source-layout 上）
  assert.ok(!html.includes('ps-source-screen'), '不应再使用已废弃的 ps-source-screen wrapper');
  assert.ok(html.trimStart().startsWith('<div class="source-layout"'),
    '根节点应是 .source-layout，实际 ' + html.slice(0, 80));
  const layoutClose = html.lastIndexOf('</div>');
  assert.ok(layoutClose === html.length - 6, '.source-layout 应是唯一的根节点');

  assert.ok(html.includes('class="source-panel"'), '应渲染 .source-panel');
  assert.ok(html.includes('class="shortcut-panel"'), '应渲染 .shortcut-panel 快捷键栏');
  assert.ok(html.indexOf('class="source-panel"') < html.indexOf('class="shortcut-panel"'),
    '主面板应排在快捷键栏之前');

  // 卡片：沿用 Vanilla 的 .source-item / .source-cover / .source-kicker / .source-title / .source-sub
  const items = [...html.matchAll(/<button[^>]*class="([^"]*\bsource-item\b[^"]*)"[^>]*/g)].map((m) => m[1]);
  assert.equal(items.length, 4, '应有 3 个来源卡片 + 1 个添加卡片，实际 ' + items.length);
  assert.ok(items.some((c) => /\bhas-cover\b/.test(c)), '有封面的来源应带 has-cover');
  assert.ok(items.some((c) => /\bunavailable\b/.test(c)), '不可用的来源应带 unavailable');
  assert.ok(items.some((c) => /\badd\b/.test(c)), '应有添加文件夹卡片');

  assert.ok(html.includes('已扫描 16989 张'), '有缓存的来源应显示已扫描数量');
  assert.ok(html.includes('来源未插入'), '不可用来源应显示提示文案');
  assert.ok(html.includes('添加文件夹'), '应渲染添加卡片文案');
  assert.ok(html.includes('发现 1 个重复来源 ID'), '应渲染来源冲突提示');

  // 计数与快捷键
  assert.ok(html.includes('可用来源 <span>3</span>') || /可用来源\s*<span[^>]*>3<\/span>/.test(html),
    '应显示来源数量 3');
  assert.ok(html.includes('快捷键') && html.includes('Ctrl'), '应渲染快捷键面板');

  console.log('  来源屏：单根 .source-layout，卡片类名沿用 Vanilla，冲突提示正确');
}

// ===================== 集锦列表屏 =====================
{
  const { useCollectionsStore } = await server.ssrLoadModule('/src/stores/collections.js');

  const seed = (pinia) => {
    const s = useCollectionsStore(pinia);
    s.open = true;
    s.status = '';
    s.items = [
      { id: 'c1', title: '京都秋天', subtitle: '2025-11 关西', type: 'geo',
        photo_count: 23, time_start: '2025-11-08', time_end: '2025-11-15',
        photos: Array.from({ length: 7 }, (_, i) => ({ id: i + 1, preview_url: 'file:///p' + i + '.jpg', filename: 'p' + i + '.jpg' })) },
      { id: 'c2', title: '鸟类', subtitle: '', type: 'semantic', photo_count: 3,
        time_start: '', time_end: '',
        photos: [{ id: 11, preview_url: '', filename: 'no-preview.jpg' }] },
    ];
  };

  const html = await render(CollectionsScreen, seed);

  // 与设置屏同构：flex column，多根
  assertSiblingRoots(html, [
    { tag: 'class="collections-topbar', close: '</div>', label: '.collections-topbar' },
    { tag: 'class="collections-scroll', close: '', label: '.collections-scroll' },
  ]);
  assert.ok(html.indexOf('class="collections-grid"') > html.indexOf('class="collections-scroll"'),
    '.collections-grid 应位于 .collections-scroll 内部');

  assert.ok(html.includes('返回图库') && html.includes('集锦'), '顶栏应有返回与标题');
  assert.ok(html.includes('生成集锦'), '顶栏应有生成集锦按钮');
  assert.ok(html.includes('2 个集锦'), '应显示集锦数量');

  // 卡片结构沿用 collections.css 的类名
  const cards = [...html.matchAll(/class="collection-card"/g)].length;
  assert.equal(cards, 2, '应渲染 2 张集锦卡片，实际 ' + cards);
  assert.ok(html.includes('class="collection-head"'), '应有 .collection-head');
  assert.ok(html.includes('class="collection-foot"'), '应有 .collection-foot');

  // 类型标签与张数
  assert.ok(html.includes('地理 · 23张'), 'geo 类型应显示「地理 · 23张」');
  assert.ok(html.includes('语义 · 3张'), 'semantic 类型应显示「语义 · 3张」');

  // 拼贴：最多 7 张，超出部分用 +N 角标
  const mosaicItems = [...html.matchAll(/class="mosaic-item"/g)].length;
  assert.equal(mosaicItems, 8, '第1张7个 + 第2张1个 = 8 个 mosaic-item，实际 ' + mosaicItems);
  assert.ok(html.includes('class="mosaic-more"') && html.includes('+16'),
    '23 张的第 7 格应显示 +16 角标');

  // 无预览图时用占位渐变（legacy 行为：img.style.background）
  assert.ok(html.includes('linear-gradient(135deg, #1a1a1f, #0a0a0c)'), '无预览应套占位渐变');
  // lazy 加载
  assert.ok(html.includes('loading="lazy"'), '缩略图应 lazy 加载');

  // 时间范围
  assert.ok(html.includes('2025-11-08 ~ 2025-11-15'), '应显示时间范围');

  // 空态
  const emptyHtml = await render(CollectionsScreen, (pinia) => {
    const s = useCollectionsStore(pinia);
    s.open = true;
    s.status = '';
    s.items = [];
  });
  assert.ok(emptyHtml.includes('class="collections-empty"'), '无数据时显示空态');
  assert.ok(!emptyHtml.includes('class="collection-card"'), '空态下不应有卡片');
  assert.ok(emptyHtml.includes('生成集锦'), '空态文案应提示生成集锦');

  console.log('  集锦屏：多根结构正确，卡片/拼贴/+N 角标/空态齐全');
}

// ===================== 集锦详情屏 =====================
{
  const { useCollectionsStore: useCols } = await server.ssrLoadModule('/src/stores/collections.js');

  const full = {
    id: 'c1', title: '京都秋天', subtitle: '关西 12张', type: 'geo',
    photo_count: 5, time_start: '2025-11-08', time_end: '2025-11-15',
    photo_ids: [3, 1, 2],
    photos: [
      { id: 1, preview_url: 'file:///a.jpg', filename: 'a.jpg' },
      { id: 2, preview_url: '', filename: 'b.jpg' },
      { id: 3, preview_url: 'file:///c.jpg', filename: 'c.jpg' },
    ],
  };

  const html = await render(CollectionDetailScreen, (pinia) => {
    const s = useCols(pinia);
    s.detail = full;
    s.detailOpen = true;
    s.detailStatus = '';
  });

  // 与设置屏/列表屏同构：flex column，多根
  assertSiblingRoots(html, [
    { tag: 'class="collection-detail-topbar', close: '</div>', label: '.collection-detail-topbar' },
    { tag: 'class="collection-detail-scroll', close: '', label: '.collection-detail-scroll' },
  ]);

  assert.ok(html.includes('返回集锦'), '顶栏应有返回按钮');
  assert.ok(html.includes('京都秋天'), '应显示集锦标题');
  assert.ok(html.includes('5 张'), '应显示张数');
  // 副标题里的“12张”应被剥掉（避免与右上角计数重复），但剩下的“关西”要保留
  assert.ok(!html.includes('关西 12张'), '副标题应剥离计数，避免与右上角重复');
  assert.ok(html.includes('关西'), '剥离计数后剩下的地名应保留');

  // 副标题被剥空时才回退显示时间范围
  const noSubHtml = await render(CollectionDetailScreen, (pinia) => {
    const s = useCols(pinia);
    s.detail = Object.assign({}, full, { subtitle: '12张' });
    s.detailOpen = true;
  });
  assert.ok(!noSubHtml.includes('12张'), '剥空后不应残留计数');
  assert.ok(noSubHtml.includes('2025-11-08 ~ 2025-11-15'), '副标题剥空时应回退显示时间范围');

  // 拼贴顺序以 photo_ids 为准（3, 1, 2），不是 photos 的声明顺序
  const ids = [...html.matchAll(/data-photo-id="(\d+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['3', '1', '2'], '拼贴顺序应跟随 photo_ids，实际 ' + JSON.stringify(ids));

  const items = [...html.matchAll(/class="mosaic-item"/g)].length;
  assert.equal(items, 3, '应渲染 3 个拼贴格，实际 ' + items);
  assert.ok(html.includes('class="mosaic mosaic--detail"'), '拼贴应带 mosaic--detail');
  assert.ok(html.includes('loading="lazy"'), '缩略图应 lazy 加载');
  // 无预览图的那张（id=2）套占位渐变
  assert.ok(html.includes('linear-gradient(135deg, #1a1a1f, #0a0a0c)'), '无预览应套占位渐变');

  // 空态
  const emptyHtml = await render(CollectionDetailScreen, (pinia) => {
    const s = useCols(pinia);
    s.detail = { id: 'c2', title: '空集锦', photos: [] };
    s.detailOpen = true;
  });
  assert.ok(emptyHtml.includes('class="collections-empty"'), '无照片时显示空态');
  assert.ok(emptyHtml.includes('该集锦暂无照片'), '空态文案正确');
  assert.ok(!emptyHtml.includes('class="mosaic-item"'), '空态下不应有拼贴格');

  // 单图 / 双图的特殊布局类（collections.css 里有 .single / .count-2 规则）
  // 注意：Vue 会把 :class 的动态部分排在静态 class 之前，
  // 实际输出是 class="single mosaic mosaic--detail"，所以不能直接整串匹配。
  const mosaicClass = (h) => {
    const m = h.match(/<div class="([^"]*\bmosaic--detail\b[^"]*)"/);
    return m ? m[1] : '';
  };

  const oneHtml = await render(CollectionDetailScreen, (pinia) => {
    const s = useCols(pinia);
    s.detail = { id: 'c3', title: '单图', photos: [{ id: 9, preview_url: 'x', filename: 'x' }] };
    s.detailOpen = true;
  });
  assert.match(mosaicClass(oneHtml), /(^| )single( |$)/, '单图应带 single 类，实际 ' + mosaicClass(oneHtml));

  const twoHtml = await render(CollectionDetailScreen, (pinia) => {
    const s = useCols(pinia);
    s.detail = { id: 'c4', title: '双图', photos: [{ id: 7, preview_url: 'x', filename: 'x' }, { id: 8, preview_url: 'y', filename: 'y' }] };
    s.detailOpen = true;
  });
  assert.match(mosaicClass(twoHtml), /(^| )count-2( |$)/, '双图应带 count-2 类，实际 ' + mosaicClass(twoHtml));

  // 三图时两个特殊类都不该出现
  assert.ok(!/(^| )(single|count-2)( |$)/.test(mosaicClass(html)), '三图时不应带 single / count-2');

  console.log('  集锦详情屏：多根结构正确，photo_ids 排序/占位渐变/空态/single/count-2 齐全');
}

// ===================== 集锦灯箱导航（navList）=====================
{
  const { useCollectionsStore: useCols } = await server.ssrLoadModule('/src/stores/collections.js');
  const { useLightboxStore } = await server.ssrLoadModule('/src/stores/lightbox.js');
  const pinia = createPinia();

  const cols = useCols(pinia);
  const lb = useLightboxStore(pinia);

  cols.detail = {
    id: 'c1', title: 'T', photo_ids: [3, 1, 2],
    photos: [
      { id: 1, preview_url: 'a', filename: 'a.jpg', iso: 100 },
      { id: 2, preview_url: 'b', filename: 'b.jpg', iso: 200 },
      { id: 3, preview_url: 'c', filename: 'c.jpg', iso: 400 },
    ],
  };

  // 打开第 2 张（photoId=1，在 photo_ids 里是下标 1）
  await cols.openPhoto(1);
  assert.ok(Array.isArray(lb.navList) && lb.navList.length === 3, 'navList 应有 3 项');
  assert.deepEqual(lb.navList.map((p) => p.id), [3, 1, 2], 'navList 顺序应跟随 photo_ids');
  assert.equal(lb.photo.id, 1, '应打开被点击的那张');

  // 集锦内翻页：循环
  lb.prevPhoto();
  assert.equal(lb.photo.id, 3, '上一张应回到 3（顺序 3,1,2）');
  lb.prevPhoto();
  assert.equal(lb.photo.id, 2, '再上一张应到 2（首尾循环）');
  lb.nextPhoto();
  assert.equal(lb.photo.id, 3, '下一张应回到 3（越过末尾循环到开头）');

  // 字段完整性：灯箱需要完整 EXIF，不能是精简对象
  assert.equal(lb.photo.iso, 400, '翻到的照片应带完整字段（iso 保留）');
  assert.equal(lb.photo.previewable, true, 'previewable 应为 true');

  // 关闭灯箱 -> navList 自动清空（legacy 的语义：灯箱一关就丢集锦上下文）
  lb.open = false;
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(lb.navList, null, '灯箱关闭后 navList 应被清空');

  console.log('  集锦灯箱导航：navList 顺序/循环翻页/字段完整/关闭清空 全部正确');
}

await server.close();
console.log('整屏渲染：全部断言通过');
