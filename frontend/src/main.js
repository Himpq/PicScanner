import { createApp, reactive } from 'vue';
import { createPinia } from 'pinia';
import './islands-shared.css';
import StorageSettings from './settings/StorageSettings.vue';
import ShortcutsSettings from './settings/ShortcutsSettings.vue';
import AboutSettings from './settings/AboutSettings.vue';
import ExportSettings from './settings/ExportSettings.vue';
import InterfaceSettings from './settings/InterfaceSettings.vue';
import PluginsSettings from './settings/PluginsSettings.vue';
import LightboxInfoContent from './lightbox/LightboxInfoContent.vue';
import QuickEditSliders from './quickedit/QuickEditSliders.vue';
import SourceScreen from './islands/SourceScreen.vue';
import GalleryShell from './islands/GalleryShell.vue';
import StatsScreen from './islands/StatsScreen.vue';
import LightboxShell from './islands/LightboxShell.vue';
import QuickEditShell from './islands/QuickEditShell.vue';
import BatchModulesShell from './islands/BatchModulesShell.vue';
import DateRailIsland from './islands/DateRailIsland.vue';
import CategoryPanelIsland from './islands/CategoryPanelIsland.vue';
import ToolbarIsland from './islands/ToolbarIsland.vue';
import { syncToLegacyPS } from './constants.js';
import { syncBridgeToLegacyPS } from './bridge/index.js';
import { installLegacyStateProxy, isSsotActive, registerLegacySyncer } from './bridge/legacyStateProxy.js';
import * as layout from './gallery/layout.js';
import { useGalleryStore } from './stores/gallery.js';
import { useBatchStore } from './stores/batch.js';
import { useModulesStore } from './stores/modules.js';
import { useQuickEditStore } from './stores/quickEdit.js';
import { useLightboxStore } from './stores/lightbox.js';
import { useStatsStore } from './stores/stats.js';
import { useSettingsStore } from './stores/settings.js';
import { useSourceStore } from './stores/source.js';
import { useCollectionsStore } from './stores/collections.js';
import CollectionsScreen from './islands/CollectionsScreen.vue';
import CollectionDetailScreen from './islands/CollectionDetailScreen.vue';
import SettingsScreen from './islands/SettingsScreen.vue';
import { logWarn } from './utils/log.js';

const COMPONENTS = {
  storage: StorageSettings,
  shortcuts: ShortcutsSettings,
  about: AboutSettings,
  export: ExportSettings,
  interface: InterfaceSettings,
  plugins: PluginsSettings,
};

// 单例 Pinia，供所有岛屿共享（双轨期与 PS.state 共存）
const pinia = createPinia();

// P1：把所有 store 的 hydrate 注册成同步器。
// 之后 legacy 的任何状态改动（集合字段走 notifying proxy，控制器改动走 PS.notifyVue）
// 都汇入同一个 rAF 合并器，各岛屿不再需要各自的 setInterval。
[
  () => useGalleryStore(pinia).hydrateFromLegacy(),
  () => useBatchStore(pinia).hydrateFromLegacy(),
  () => useModulesStore(pinia).hydrateFromLegacy(),
  () => useQuickEditStore(pinia).hydrateFromLegacy(),
  () => useLightboxStore(pinia).hydrateFromLegacy(),
].forEach(registerLegacySyncer);

// P3：供 legacy 的 openStatsPage / closeStatsPage 调用。
// 统计屏内容已归 Vue，legacy 只负责外层容器的显隐动画，取数交给 store。
const statsBridge = {
  open: () => useStatsStore(pinia).openPage(),
  close: () => useStatsStore(pinia).closePage(),
};

// P3：供 legacy 的 openSettingsPage / closeSettingsPage 调用。
// 设置屏整体已归 Vue，legacy 只负责外层容器的显隐动画。
const settingsBridge = {
  open: () => useSettingsStore(pinia).openPage(),
  close: () => useSettingsStore(pinia).closePage(),
};

// P3：供 legacy 的 openScreen / closeScreen / openCollectionDetail / closeCollectionDetail 调用。
// 集锦列表屏与详情屏的内容都归 Vue；legacy 只保留两个容器的显隐与动画。
const collectionsBridge = {
  open: () => useCollectionsStore(pinia).openPage(),
  close: () => useCollectionsStore(pinia).closePage(),
  fetch: () => useCollectionsStore(pinia).fetchList(),
  sync: (items) => { useCollectionsStore(pinia).items = items || []; },
  setStatus: (msg) => { useCollectionsStore(pinia).status = msg || ''; },
  // 详情屏：legacy 只保留容器显隐与动画，取数与渲染都在 store 里
  openDetail: (col) => useCollectionsStore(pinia).openDetail(col),
  closeDetail: () => useCollectionsStore(pinia).closeDetail(),
  refreshDetail: () => useCollectionsStore(pinia).refreshDetail(),
  setDetailStatus: (msg) => { useCollectionsStore(pinia).detailStatus = msg || ''; },
};

// P3：供 legacy 的 loadSources / showSourceStartupError 调用。
// 来源首页已归 Vue，legacy 只保留启动编排与外层容器的显隐。
const sourceBridge = {
  refresh: () => useSourceStore(pinia).refresh(),
  showError: (prefix, err) => useSourceStore(pinia).showStartupError(prefix, err),
  chooseFolder: () => {
    const store = useSourceStore(pinia);
    return store.chooseFolder().then((created) => {
      if (created) store.selectSource(created);
      return created;
    });
  },
};

let app = null;

const lightboxInfoState = reactive({ photo: null });
let lightboxInfoApp = null;

let quickEditSlidersApp = null;
let quickEditSlidersInstance = null;

let sourceScreenApp = null;
let galleryShellApp = null;
let statsScreenApp = null;
let settingsScreenApp = null;
let collectionsScreenApp = null;
let collectionDetailScreenApp = null;
let lightboxShellApp = null;
let quickEditShellApp = null;
let batchModulesShellApp = null;
let dateRailIslandApp = null;
let categoryPanelIslandApp = null;
let toolbarIslandApp = null;

// 尽早尝试同步常量与桥接到 legacy PS（若 PS 已存在）。
// 注意：在 index.html 既定加载顺序下，Vue 包先于 app_core.js 求值，而 window.PS
// 由 app_core.js 定义，所以此时 PS 通常尚未就绪，下面的 try/catch 会静默 return。
// 真正的同步发生在 app_core.js 定义 window.PS 之后，它会调用
// window.PicScannerVue.resyncToLegacyPS()（见下方暴露的方法）—— 此时 PS 已存在，
// syncToLegacyPS / syncBridgeToLegacyPS 才会真正执行 Object.assign / 补 bridgeCall。
try { syncToLegacyPS(); } catch {}
try { syncBridgeToLegacyPS(); } catch {}

// 暴露一个安全的 PS 读取器，供各 store 在 PS 未就绪时返回 null 而非抛错
window.__getPS = function () {
  return (typeof window !== 'undefined' && window.PS) ? window.PS : null;
};

// P2: 双轨重同步。app_core.js 在 window.PS 定义完成后调用此方法，
// 把 Vue 包（constants.js / bridge）中的权威常量与 bridgeCall 写入 window.PS。
// 之所以需要它：模块求值期 PS 不存在，上面的早期同步是 no-op；
// 此处 PS 已存在，syncToLegacyPS 会真正执行，bridgeCall 也会被补齐。
// （app_core.js 的 PS 对象只挂了 call，没有 bridgeCall，这一步是补齐的关键。）
function resyncToLegacyPS() {
  try {
    syncToLegacyPS();
    syncBridgeToLegacyPS();
  } catch (e) {
    logWarn('[PicScannerVue] resyncToLegacyPS failed', e);
  }
  // P1 真源反转：此刻 window.PS 已存在，把 PS.state 代理到 Pinia。
  // 安装成功后各岛屿不再起轮询定时器；失败则自动回退到原来的轮询，行为不变。
  try {
    installLegacyStateProxy(pinia);
  } catch (e) {
    logWarn('[PicScannerVue] installLegacyStateProxy failed', e);
  }
}

function withPinia(vueApp) {
  vueApp.use(pinia);
  return vueApp;
}

window.PicScannerVue = {
  // 暴露 pinia 供调试与后续 stores 使用
  pinia,
  // P2: app_core.js 定义 window.PS 后调用，把 Vue 侧常量/桥接重同步进 PS
  resyncToLegacyPS,
  // 设置面板的独立挂载入口。P3 之后设置屏整体由 SettingsScreen 岛屿渲染，
  // 但 collections.js 仍会调 mount('plugins', <#settings-body>)（该节点已随迁移移除），
  // 因此这里对 el 为空的情况改为驱动 settings store 切页，避免那个兜底按钮失效。
  mount(tabKey, el) {
    const component = COMPONENTS[tabKey];
    if (!component) return false;
    if (app) app.unmount();
    if (!el) {
      try {
        const s = useSettingsStore(pinia);
        if (!s.setTab(tabKey)) return false;
        s.openPage();
        return true;
      } catch {
        return false;
      }
    }
    app = withPinia(createApp(component));
    app.mount(el);
    return true;
  },
  unmount() {
    if (app) {
      app.unmount();
      app = null;
    }
  },
  mountLightboxInfo(el, photo) {
    lightboxInfoState.photo = photo;
    if (!lightboxInfoApp) {
      lightboxInfoApp = withPinia(createApp(LightboxInfoContent, { state: lightboxInfoState }));
      lightboxInfoApp.mount(el);
    }
  },
  updateLightboxInfo(photo) {
    lightboxInfoState.photo = photo;
  },
  mountQuickEditSliders(el) {
    if (!el) return false;
    if (!quickEditSlidersApp) {
      quickEditSlidersApp = withPinia(createApp(QuickEditSliders));
      quickEditSlidersInstance = quickEditSlidersApp.mount(el);
    }
    return true;
  },
  syncQuickEditSliders() {
    if (quickEditSlidersInstance && quickEditSlidersInstance.refresh) {
      quickEditSlidersInstance.refresh();
    }
  },
  // P1 岛屿挂载（双轨期：与 legacy DOM 共存，Vue 负责数据与交互，legacy 仍保留作为兜底）
  mountSourceScreen(el) {
    if (!el) return false;
    if (sourceScreenApp) sourceScreenApp.unmount();
    sourceScreenApp = withPinia(createApp(SourceScreen));
    sourceScreenApp.mount(el);
    return true;
  },
  unmountSourceScreen() {
    if (sourceScreenApp) { sourceScreenApp.unmount(); sourceScreenApp = null; }
  },
  mountGalleryShell(el) {
    if (!el) return false;
    if (galleryShellApp) galleryShellApp.unmount();
    galleryShellApp = withPinia(createApp(GalleryShell));
    galleryShellApp.mount(el);
    return true;
  },
  unmountGalleryShell() {
    if (galleryShellApp) { galleryShellApp.unmount(); galleryShellApp = null; }
  },
  mountStatsScreen(el) {
    if (!el) return false;
    if (statsScreenApp) statsScreenApp.unmount();
    statsScreenApp = withPinia(createApp(StatsScreen));
    statsScreenApp.mount(el);
    return true;
  },
  mountSettingsScreen(el) {
    if (!el) return false;
    if (settingsScreenApp) settingsScreenApp.unmount();
    settingsScreenApp = withPinia(createApp(SettingsScreen));
    settingsScreenApp.mount(el);
    return true;
  },
  mountCollectionsScreen(el) {
    if (!el) return false;
    if (collectionsScreenApp) collectionsScreenApp.unmount();
    collectionsScreenApp = withPinia(createApp(CollectionsScreen));
    collectionsScreenApp.mount(el);
    return true;
  },
  mountCollectionDetailScreen(el) {
    if (!el) return false;
    if (collectionDetailScreenApp) collectionDetailScreenApp.unmount();
    collectionDetailScreenApp = withPinia(createApp(CollectionDetailScreen));
    collectionDetailScreenApp.mount(el);
    return true;
  },
  unmountStatsScreen() {
    if (statsScreenApp) { statsScreenApp.unmount(); statsScreenApp = null; }
  },
  mountLightboxShell(el) {
    if (!el) return false;
    if (lightboxShellApp) lightboxShellApp.unmount();
    lightboxShellApp = withPinia(createApp(LightboxShell));
    lightboxShellApp.mount(el);
    return true;
  },
  unmountLightboxShell() {
    if (lightboxShellApp) { lightboxShellApp.unmount(); lightboxShellApp = null; }
  },
  mountQuickEditShell(el) {
    if (!el) return false;
    if (quickEditShellApp) quickEditShellApp.unmount();
    quickEditShellApp = withPinia(createApp(QuickEditShell));
    quickEditShellApp.mount(el);
    return true;
  },
  unmountQuickEditShell() {
    if (quickEditShellApp) { quickEditShellApp.unmount(); quickEditShellApp = null; }
  },
  mountBatchModulesShell(el) {
    if (!el) return false;
    if (batchModulesShellApp) batchModulesShellApp.unmount();
    batchModulesShellApp = withPinia(createApp(BatchModulesShell));
    batchModulesShellApp.mount(el);
    return true;
  },
  unmountBatchModulesShell() {
    if (batchModulesShellApp) { batchModulesShellApp.unmount(); batchModulesShellApp = null; }
  },
  mountDateRailIsland(el) {
    if (!el) return false;
    if (dateRailIslandApp) dateRailIslandApp.unmount();
    dateRailIslandApp = withPinia(createApp(DateRailIsland));
    dateRailIslandApp.mount(el);
    return true;
  },
  unmountDateRailIsland() {
    if (dateRailIslandApp) { dateRailIslandApp.unmount(); dateRailIslandApp = null; }
  },
  mountCategoryPanelIsland(el) {
    if (!el) return false;
    if (categoryPanelIslandApp) categoryPanelIslandApp.unmount();
    categoryPanelIslandApp = withPinia(createApp(CategoryPanelIsland));
    categoryPanelIslandApp.mount(el);
    return true;
  },
  unmountCategoryPanelIsland() {
    if (categoryPanelIslandApp) { categoryPanelIslandApp.unmount(); categoryPanelIslandApp = null; }
  },
  mountToolbarIsland(el) {
    if (!el) return false;
    if (toolbarIslandApp) toolbarIslandApp.unmount();
    toolbarIslandApp = withPinia(createApp(ToolbarIsland));
    toolbarIslandApp.mount(el);
    return true;
  },
  unmountToolbarIsland() {
    if (toolbarIslandApp) { toolbarIslandApp.unmount(); toolbarIslandApp = null; }
  },
  _phase0Ready: true,
  _p1Ready: true,
  _p2Ready: true,
  _p3Ready: true,
  _p4Ready: true,
  _p5Ready: true,
  // PhotoGrid 由 legacy #gallery 渲染（P4 前不做 Vue 版，避免双轨竞态）
  // P2 纯函数高度模型，供 legacy 与未来的 Vue PhotoGrid 共用
  layout,
  // P1 真源代理状态
  isSsotActive,
  registerLegacySyncer,
  // P3：统计屏桥接，供 legacy 的 openStatsPage / closeStatsPage 调用
  stats: statsBridge,
  // P3：设置屏桥接，供 legacy 的 openSettingsPage / closeSettingsPage 调用
  settings: settingsBridge,
  // P3：来源屏桥接，供 legacy 的 loadSources / showSourceStartupError 调用
  source: sourceBridge,
  // P3：集锦列表屏桥接，供 legacy 的 openScreen / closeScreen 调用
  collections: collectionsBridge,
};

// ---------------------------------------------------------------------------
// 岛屿注册表（P0 收敛）
//
// 原先每个岛都有三件套：isVueXxxEnabled / autoMountXxx / toggleVueXxx，
// 六份几乎一样的代码。这里收敛成一张表 + 两个通用函数。
//
// flag 优先级：URL 查询参数 > localStorage > defaultOn
//   ?vue_toolbar=0  -> 临时关
//   localStorage    -> 持久开关
//   defaultOn       -> 灰度默认值
// ---------------------------------------------------------------------------
const ISLANDS = [
  {
    name: 'dateRail',
    vueId: 'vue-date-rail',
    vanillaId: 'vanilla-date-rail',
    flag: 'vue_date',
    defaultOn: false,
    mount: (el) => window.PicScannerVue.mountDateRailIsland(el),
  },
  {
    name: 'category',
    vueId: 'vue-category-panel',
    vanillaId: 'vanilla-category-panel',
    flag: 'vue_category',
    defaultOn: false,
    mount: (el) => window.PicScannerVue.mountCategoryPanelIsland(el),
  },
  // toolbar 不在这里：#vanilla-toolbar 已删除，Vue 工具栏是唯一实现，
  // 必须无条件挂载。若仍走开关，用户 localStorage 里残留的 vue_toolbar=0
  // 会让整个工具栏消失。见下方 autoMountToolbar()。
  {
    name: 'lightbox',
    vueId: 'vue-lightbox',
    vanillaId: null, // 全局覆盖层，无 vanilla 对应容器，显隐由 store.open 控制
    flag: 'vue_lightbox',
    defaultOn: true,
    retryMs: 200,
    mount: (el) => window.PicScannerVue.mountLightboxShell(el),
  },
];

function isIslandEnabled(cfg) {
  try {
    const params = new URLSearchParams(location.search);
    if (params.has(cfg.flag)) return params.get(cfg.flag) !== '0';
    const v = localStorage.getItem(cfg.flag);
    if (v === '0') return false;
    if (v === '1') return true;
    return !!cfg.defaultOn;
  } catch {
    return !!cfg.defaultOn;
  }
}

// 统一的开关入口，替代原先的 toggleVueDateRail / toggleVueCategory /
// toggleVueToolbar / toggleVueLightbox 四个全局函数
window.setVueIsland = function setVueIsland(name, on) {
  const cfg = ISLANDS.find((c) => c.name === name);
  if (!cfg) return false;
  try {
    if (on === false) localStorage.setItem(cfg.flag, '0');
    else if (on === true) localStorage.setItem(cfg.flag, '1');
    else localStorage.removeItem(cfg.flag);
    location.reload();
  } catch {}
  return true;
};

function autoMountIsland(cfg) {
  if (!isIslandEnabled(cfg)) return;
  const vueEl = document.getElementById(cfg.vueId);
  if (!vueEl) return;
  const vanillaEl = cfg.vanillaId ? document.getElementById(cfg.vanillaId) : null;
  if (vanillaEl) vanillaEl.classList.add('hidden');
  vueEl.classList.remove('hidden');
  const tryMount = () => {
    if (window.PicScannerVue && typeof cfg.mount === 'function') cfg.mount(vueEl);
    else setTimeout(tryMount, cfg.retryMs || 100);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryMount);
  else tryMount();
}

ISLANDS.forEach(autoMountIsland);

// 工具栏常驻：vanilla 版已删除，没有回退分支，不做开关判定。
(function autoMountToolbar() {
  const el = document.getElementById('vue-toolbar');
  if (!el) return;
  el.classList.remove('hidden');
  const tryMount = () => {
    if (window.PicScannerVue && typeof window.PicScannerVue.mountToolbarIsland === 'function') {
      window.PicScannerVue.mountToolbarIsland(el);
    } else {
      setTimeout(tryMount, 100);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryMount);
  else tryMount();
}());

// P3：统计屏 / 设置屏常驻挂载。
//
// 两条共同约束（迁移整屏前务必先确认）：
//   1) 必须挂到外层容器本身，不能挂到它内部的子 div
//   2) 组件必须用多根模板，让各分区成为外层容器的直接子项
//
// #stats-screen 是 display:grid（280px 侧栏 + 1fr 主区），
// #settings-screen 是 display:flex column（topbar flex:none + scroll flex:1）。
// 只要中间多一层普通 wrapper，grid / flex 的子项计算、高度约束与 overflow 全部失效。
//
// 显隐与动画仍由 legacy 操作容器的 hidden / entering / leaving 完成，
// Vue 不会动容器自身的 class，只负责内容。
function autoMountScreen(id, mountName) {
  const el = document.getElementById(id);
  if (!el) return;
  const tryMount = () => {
    const PV = window.PicScannerVue;
    if (PV && typeof PV[mountName] === 'function') PV[mountName](el);
    else setTimeout(tryMount, 100);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryMount);
  else tryMount();
}

autoMountScreen('stats-screen', 'mountStatsScreen');
autoMountScreen('settings-screen', 'mountSettingsScreen');
autoMountScreen('source-screen', 'mountSourceScreen');
autoMountScreen('collections-screen', 'mountCollectionsScreen');
autoMountScreen('collection-detail-screen', 'mountCollectionDetailScreen');

