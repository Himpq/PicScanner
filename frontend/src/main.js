import { createApp, reactive } from 'vue';
import { createPinia } from 'pinia';
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

// 尽早同步常量与桥接到 legacy PS（若 PS 已存在）
try { syncToLegacyPS(); } catch {}
try { syncBridgeToLegacyPS(); } catch {}

function withPinia(vueApp) {
  vueApp.use(pinia);
  return vueApp;
}

window.PicScannerVue = {
  // 暴露 pinia 供调试与后续 stores 使用
  pinia,
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
  _phase0Ready: true,
  _p1Ready: true,
  _p2Ready: true,
};
