import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { call } from '../bridge/index.js';

export const useSourceStore = defineStore('source', () => {
  const sources = ref([]);
  const sourceConflicts = ref([]);
  const discoveryErrors = ref([]);
  const loading = ref(false);
  const error = ref('');
  const selectedPath = ref('');
  const selectedSourceId = ref('');
  const config = ref(null);

  const hasSources = computed(() => sources.value.length > 0);
  const count = computed(() => sources.value.length);

  function syncToLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state) return;
    if (selectedPath.value) PS.state.currentRootPath = selectedPath.value;
    if (selectedSourceId.value) PS.state.currentSourceId = selectedSourceId.value;
    if (config.value && PS.applyAppConfig) PS.applyAppConfig(config.value);
  }

  function hydrateFromLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state) return;
    if (PS.state.currentRootPath && !selectedPath.value) selectedPath.value = PS.state.currentRootPath;
    if (PS.state.currentSourceId && !selectedSourceId.value) selectedSourceId.value = PS.state.currentSourceId;
  }

  function sourceSummaryText(item) {
    if (item?.unavailable) return item.unavailable_message || '来源未插入或已更换';
    const summary = item?.summary || {};
    if (summary.has_cache) return '已扫描 ' + (summary.visible_files || summary.total_files || 0) + ' 张';
    if (item?.exists === false) return '目录不可用';
    return item?.subtitle || item?.path || '';
  }

  async function fetchSources() {
    loading.value = true;
    error.value = '';
    try {
      const res = await call('get_sources');
      if (res && res.config) {
        config.value = res.config;
        const PS = window.PS;
        if (PS && PS.applyAppConfig) PS.applyAppConfig(res.config);
      }
      if (!res || !Array.isArray(res.sources)) throw new Error(res?.message || '来源响应缺少 sources 列表');
      sources.value = res.sources;
      sourceConflicts.value = res.source_conflicts || [];
      discoveryErrors.value = res.source_discovery_errors || [];
      return res;
    } catch (err) {
      error.value = String(err?.message || err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function chooseFolder() {
    const res = await call('choose_folder');
    if (!res || !res.success) {
      if (res && res.cancelled) return null;
      throw new Error(res?.message || '选择目录失败');
    }
    await fetchSources();
    const created = {
      kind: 'folder',
      path: res.path,
      title: res.title || res.path,
      subtitle: res.path,
      summary: res.summary || {},
      source_id: res.summary?.source_id || '',
    };
    return created;
  }

  function selectSource(source) {
    if (!source || source.unavailable) return false;
    selectedPath.value = source?.path || source?.root_path || '';
    selectedSourceId.value = source?.source_id || source?.summary?.source_id || '';
    syncToLegacy();
    // 双轨期：仍委托给 legacy 的进入工作区流程，保持扫描/状态机一致
    const PS = window.PS;
    if (PS && typeof PS.enterSourceWorkspace === 'function') {
      PS.enterSourceWorkspace(source);
      return true;
    }
    // 兜底：若 legacy 未就绪，仅记录状态
    return true;
  }

  return {
    sources,
    sourceConflicts,
    discoveryErrors,
    loading,
    error,
    selectedPath,
    selectedSourceId,
    config,
    hasSources,
    count,
    fetchSources,
    chooseFolder,
    selectSource,
    sourceSummaryText,
    hydrateFromLegacy,
    syncToLegacy,
  };
});
