import { createApp, reactive } from 'vue';
import StorageSettings from './settings/StorageSettings.vue';
import ShortcutsSettings from './settings/ShortcutsSettings.vue';
import AboutSettings from './settings/AboutSettings.vue';
import ExportSettings from './settings/ExportSettings.vue';
import InterfaceSettings from './settings/InterfaceSettings.vue';
import LightboxInfoContent from './lightbox/LightboxInfoContent.vue';
import QuickEditSliders from './quickedit/QuickEditSliders.vue';

const COMPONENTS = {
  storage: StorageSettings,
  shortcuts: ShortcutsSettings,
  about: AboutSettings,
  export: ExportSettings,
  interface: InterfaceSettings,
};

let app = null;

const lightboxInfoState = reactive({ photo: null });
let lightboxInfoApp = null;

let quickEditSlidersApp = null;
let quickEditSlidersInstance = null;

window.PicScannerVue = {
  mount(tabKey, el) {
    const component = COMPONENTS[tabKey];
    if (!component) return false;
    if (app) app.unmount();
    app = createApp(component);
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
      lightboxInfoApp = createApp(LightboxInfoContent, { state: lightboxInfoState });
      lightboxInfoApp.mount(el);
    }
  },
  mountQuickEditSliders(el) {
    if (!el) return false;
    if (!quickEditSlidersApp) {
      quickEditSlidersApp = createApp(QuickEditSliders);
      quickEditSlidersInstance = quickEditSlidersApp.mount(el);
    }
    return true;
  },
  syncQuickEditSliders() {
    if (quickEditSlidersInstance && quickEditSlidersInstance.refresh) {
      quickEditSlidersInstance.refresh();
    }
  },
};
