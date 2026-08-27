import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  const tab = ref('interface');
  function setTab(key) { tab.value = key; }
  function hydrateFromLegacy() {
    const PS = window.PS;
    if (PS?.state?.settingsTab) tab.value = PS.state.settingsTab;
  }
  return { tab, setTab, hydrateFromLegacy };
});
