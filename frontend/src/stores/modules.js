import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useModulesStore = defineStore('modules', () => {
  const modules = ref([]);
  const activeKey = ref('');
  const menuOpen = ref(false);

  function hydrateFromLegacy() {
    const M = window.PicScannerModules;
    if (!M) return;
    try {
      const PS = window.PS;
      // 模块元数据在 app_modules 的 moduleMeta，需通过 bootstrap 后的暴露
      // 兜底：尝试从已注册的 DOM 中读取
      const menu = document.querySelector('[data-qe-module-menu]');
      if (menu) {
        const items = Array.from(menu.querySelectorAll('[data-module-key]')).map((el) => ({
          key: el.dataset.moduleKey || '',
          name: el.textContent.trim().split('\n')[0] || el.dataset.moduleKey,
        }));
        if (items.length) modules.value = items;
      }
      if (PS && PS.state && PS.state.openModuleKey) activeKey.value = PS.state.openModuleKey || '';
    } catch {}
    // 若有全局注册表，同步
    try {
      if (M && typeof M.renderDropdown === 'function') M.renderDropdown();
    } catch {}
  }

  const hasModules = computed(() => modules.value.length > 0);
  const activeModule = computed(() => modules.value.find((m) => m.key === activeKey.value) || null);

  function setMenuOpen(open) {
    menuOpen.value = !!open;
    const M = window.PicScannerModules;
    if (M && M.renderDropdown) try { M.renderDropdown(); } catch {}
    const PS = window.PS;
    // 同步到 legacy 的下拉
    const els = document.querySelector('[data-qe-module-dropdown]');
    if (els) els.classList.toggle('hidden', !menuOpen.value && !hasModules.value);
  }

  function openModule(key) {
    const M = window.PicScannerModules;
    if (M && typeof M.openModule === 'function') {
      M.openModule(key);
      activeKey.value = key;
      return true;
    }
    activeKey.value = key;
    return false;
  }

  function closeModule() {
    const M = window.PicScannerModules;
    if (M && typeof M.closeModule === 'function') M.closeModule();
    activeKey.value = '';
  }

  async function bootstrap() {
    const M = window.PicScannerModules;
    if (M && typeof M.bootstrap === 'function') {
      try { await M.bootstrap(); } catch {}
    }
    hydrateFromLegacy();
  }

  return { modules, activeKey, menuOpen, hasModules, activeModule, hydrateFromLegacy, setMenuOpen, openModule, closeModule, bootstrap };
});
