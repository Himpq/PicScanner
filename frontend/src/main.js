import { createApp, reactive } from 'vue';
import { createPinia } from 'pinia';
import './islands-shared.css';
import StorageSettings from './settings/StorageSettings.vue';
import ShortcutsSettings from './settings/ShortcutsSettings.vue';
import AboutSettings from './settings/AboutSettings.vue';
import ExportSettings from './settings/ExportSettings.vue';
import InterfaceSettings from './settings/InterfaceSettings.vue';
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

const COMPONENTS = {
  storage: StorageSettings,
  shortcuts: ShortcutsSettings,
  about: AboutSettings,
  export: ExportSettings,
  interface: InterfaceSettings,
};

// 单例 Pinia，供所有岛屿共享（双轨期与 PS.state 共存）
const pinia = createPinia();

let app = null;

const lightboxInfoState = reactive({ photo: null });
let lightboxInfoApp = null;

let quickEditSlidersApp = null;
let quickEditSlidersInstance = null;

let sourceScreenApp = null;
let galleryShellApp = null;
let statsScreenApp = null;
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
    console.warn('[PicScannerVue] resyncToLegacyPS failed', e);
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
  mount(tabKey, el) {
    const component = COMPONENTS[tabKey];
    if (!component) return false;
    if (app) app.unmount();
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
  _photoGridVirtualReady: false, // legacy 画廊激活，Vue PhotoGrid 已回退
};

// PR2: DateRail 原位岛 — 特性开关，默认关闭，?vue_date=1 或 localStorage vue_date=1 开启
function isVueDateRailEnabled() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.has('vue_date')) return params.get('vue_date') !== '0';
    return localStorage.getItem('vue_date') === '1';
  } catch { return false; }
}
function autoMountDateRail() {
  if (!isVueDateRailEnabled()) return;
  const vueEl = document.getElementById('vue-date-rail');
  const vanillaEl = document.getElementById('vanilla-date-rail');
  if (!vueEl) return;
  vueEl.classList.remove('hidden');
  if (vanillaEl) vanillaEl.classList.add('hidden');
  const tryMount = () => {
    if (window.PicScannerVue && typeof window.PicScannerVue.mountDateRailIsland === 'function') {
      window.PicScannerVue.mountDateRailIsland(vueEl);
    } else setTimeout(tryMount, 100);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryMount);
  else tryMount();
}
window.toggleVueDateRail = (on) => {
  try {
    if (on) localStorage.setItem('vue_date', '1');
    else localStorage.removeItem('vue_date');
    location.reload();
  } catch {}
};
autoMountDateRail();

// PR3: CategoryPanel 原位岛 — 特性开关 ?vue_category=1 / localStorage
function isVueCategoryEnabled() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.has('vue_category')) return params.get('vue_category') !== '0';
    return localStorage.getItem('vue_category') === '1';
  } catch { return false; }
}
function autoMountCategory() {
  if (!isVueCategoryEnabled()) return;
  const vueEl = document.getElementById('vue-category-panel');
  const vanillaEl = document.getElementById('vanilla-category-panel');
  if (!vueEl) return;
  vueEl.classList.remove('hidden');
  if (vanillaEl) vanillaEl.classList.add('hidden');
  const tryMount = () => {
    if (window.PicScannerVue && typeof window.PicScannerVue.mountCategoryPanelIsland === 'function') {
      window.PicScannerVue.mountCategoryPanelIsland(vueEl);
    } else setTimeout(tryMount, 100);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryMount);
  else tryMount();
}
window.toggleVueCategory = (on) => {
  try {
    if (on) localStorage.setItem('vue_category', '1');
    else localStorage.removeItem('vue_category');
    location.reload();
  } catch {}
};
autoMountCategory();

// PR4: PhotoGrid 已回退至 legacy — Vue 版不再自动挂载
// 画廊渲染完全由 legacy app_gallery.js 接管（#gallery / IntersectionsObserver）
// 如需恢复 Vue 版，恢复 PhotoGrid.vue 完整实现并在此处恢复 autoMount 逻辑
window.toggleVuePhoto = () => {
  console.warn('[PicScanner] PhotoGrid Vue 已回退，当前为 legacy 画廊。按 git 历史恢复 PhotoGrid.vue 即可重新启用。');
};

// PR5: Toolbar 工具栏 — 特性开关 ?vue_toolbar=1 / localStorage，默认灰度开启
function isVueToolbarEnabled() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.has('vue_toolbar')) return params.get('vue_toolbar') !== '0';
    const v = localStorage.getItem('vue_toolbar');
    if (v === '0') return false;
    if (v === '1') return true;
    return true;
  } catch { return true; }
}
function autoMountToolbar() {
  if (!isVueToolbarEnabled()) return;
  const vueEl = document.getElementById('vue-toolbar');
  const vanillaEl = document.getElementById('vanilla-toolbar');
  if (!vueEl) return;
  vueEl.classList.remove('hidden');
  if (vanillaEl) vanillaEl.classList.add('hidden');
  const tryMount = () => {
    if (window.PicScannerVue && typeof window.PicScannerVue.mountToolbarIsland === 'function') window.PicScannerVue.mountToolbarIsland(vueEl);
    else setTimeout(tryMount, 100);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryMount);
  else tryMount();
}
window.toggleVueToolbar = (on) => {
  try {
    if (on === false) localStorage.setItem('vue_toolbar', '0');
    else if (on === true) localStorage.setItem('vue_toolbar', '1');
    else localStorage.removeItem('vue_toolbar');
    location.reload();
  } catch {}
};
autoMountToolbar();

// PR6: Lightbox 灯箱 — 已完成 Vue 迁移，与 legacy 像素一致（close 36x36 圆角8px / toolbar 居中 / info fixed 定位 / compare 双栏）
// 特性开关 ?vue_lightbox=0 可回退 legacy，默认开启 Vue 版
function isVueLightboxEnabled() {
  try {
    const p = new URLSearchParams(location.search);
    if (p.has('vue_lightbox')) return p.get('vue_lightbox') !== '0';
    const v = localStorage.getItem('vue_lightbox');
    if (v === '0') return false;
    if (v === '1') return true;
    return true;
  } catch { return true; }
}
function autoMountLightbox() {
  if (!isVueLightboxEnabled()) return;
  const el = document.getElementById('vue-lightbox');
  if (!el) return;
  // 灯箱为全局覆盖层，无需 hidden 切换，由 store.open 控制显隐
  const tryMount = () => {
    if (window.PicScannerVue && typeof window.PicScannerVue.mountLightboxShell === 'function') window.PicScannerVue.mountLightboxShell(el);
    else setTimeout(tryMount, 200);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryMount);
  else tryMount();
}
window.toggleVueLightbox = (on) => {
  try {
    if (on === false) localStorage.setItem('vue_lightbox', '0');
    else if (on === true) localStorage.setItem('vue_lightbox', '1');
    else localStorage.removeItem('vue_lightbox');
    location.reload();
  } catch {}
};
autoMountLightbox();
