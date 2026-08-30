import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  const tab = ref('interface');
  // P3：设置屏外壳（顶栏 + 标签 + 滚动区）归 Vue 后，开关状态也落在 store 上。
  // 显隐动画（entering / leaving / hidden）仍由 legacy 操作 #settings-screen 完成。
  const open = ref(false);
  // 每次打开自增，用作内容组件的 :key —— 强制重建，让各设置页重新读取 PS.state 的当前值
  // （这些组件在 setup 时读 ref(PS.state.xxx)，不重建就会显示上一次打开时的旧值）
  const openSeq = ref(0);

  function tabs() {
    const PS = (typeof window !== 'undefined') ? window.PS : null;
    if (PS && Array.isArray(PS.SETTINGS_TABS) && PS.SETTINGS_TABS.length) return PS.SETTINGS_TABS;
    return [
      { key: 'interface', label: '界面', hint: '缩略图与参数面板' },
      { key: 'export', label: '导出', hint: '目录与命名模板' },
      { key: 'storage', label: '存储', hint: '已登记来源' },
      { key: 'plugins', label: '插件', hint: '已装载模块与状态' },
      { key: 'shortcuts', label: '快捷键', hint: '查看现有键位' },
      { key: 'about', label: '关于', hint: '版本与项目' },
    ];
  }

  const tabKeys = computed(() => tabs().map((t) => t.key));

  function hydrateFromLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state) return;
    if (PS.state.settingsTab) tab.value = PS.state.settingsTab;
    if (typeof PS.state.settingsOpen === 'boolean') open.value = PS.state.settingsOpen;
  }

  function setTab(key) {
    if (!tabKeys.value.includes(key)) return false;
    tab.value = key;
    const PS = window.PS;
    if (PS && PS.state) PS.state.settingsTab = key;
    return true;
  }

  // P3：legacy 的 openSettingsPage / closeSettingsPage 调这两个
  function openPage() {
    open.value = true;
    openSeq.value += 1;
    const PS = window.PS;
    if (PS && PS.state) PS.state.settingsOpen = true;
    hydrateFromLegacy();
  }

  function closePage() {
    open.value = false;
    const PS = window.PS;
    if (PS && PS.state) PS.state.settingsOpen = false;
  }

  return { tab, open, openSeq, tabKeys, tabs, setTab, openPage, closePage, hydrateFromLegacy };
});
