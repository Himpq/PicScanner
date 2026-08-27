import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { call } from '../bridge/index.js';

export const useStatsStore = defineStore('stats', () => {
  const loading = ref(false);
  const error = ref('');
  const sources = ref([]);
  const statistics = ref({});
  const activeTab = ref('overview');

  const total = computed(() => Number(statistics.value.total_files || 0));
  const exifComplete = computed(() => Number(statistics.value.exif_complete || 0));

  function hydrateFromLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state) return;
    if (PS.state.statsTab) activeTab.value = PS.state.statsTab;
  }

  function setTab(key) {
    activeTab.value = String(key || 'overview');
    const PS = window.PS;
    if (PS && PS.state) PS.state.statsTab = activeTab.value;
  }

  function currentPath() {
    const PS = window.PS;
    return (PS?.state?.currentRootPath) || '';
  }
  function currentSourceId() {
    const PS = window.PS;
    return (PS?.state?.currentSourceId) || '';
  }

  async function fetchDetail({ rootPath, sourceId } = {}) {
    loading.value = true;
    error.value = '';
    try {
      const rp = rootPath !== undefined ? rootPath : (currentPath() || null);
      const sid = sourceId !== undefined ? sourceId : (currentSourceId() || null);
      // 双轨期：若 legacy 已有 renderStatsWindow，优先复用以保持图表逻辑一致，但 Vue 侧仍镜像数据
      const res = await call('get_statistics_detail', rp, sid);
      if (!res || !res.success) throw new Error(res?.message || '读取统计信息失败');
      sources.value = res.sources || [];
      statistics.value = res.statistics || {};
      // 同步 signature 到 legacy，避免重复刷新
      const PS = window.PS;
      if (PS && res.statistics) {
        try {
          const sig = JSON.stringify(res.statistics).slice(0, 120);
          PS.state.lastStatsSignature = sig;
        } catch {}
      }
      return res;
    } catch (err) {
      error.value = String(err?.message || err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // 供图表复用的纯函数（从 app_gallery.js 抽离，不依赖 DOM）
  function cleanName(name) {
    const v = String(name || '').trim();
    if (!v || v === '?' || v === '----') return '未知';
    return v;
  }
  function chartRows(rows, limit) {
    return (rows || [])
      .map((r) => ({ name: cleanName(r.name), count: Number(r.count || 0) }))
      .filter((r) => r.count > 0)
      .slice(0, limit || rows.length);
  }
  function compactNumber(value) {
    const n = Number(value || 0);
    if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '万';
    return String(n);
  }
  function topRow(rows) {
    const data = chartRows(rows || [], 1);
    return data.length ? data[0] : null;
  }
  function statsColor(index) {
    const alphas = [0.92, 0.78, 0.64, 0.52, 0.42, 0.34, 0.28, 0.22];
    const a = alphas[Math.abs(Number(index || 0)) % alphas.length];
    return 'rgba(224,164,90,' + a + ')';
  }

  return {
    loading,
    error,
    sources,
    statistics,
    activeTab,
    total,
    exifComplete,
    hydrateFromLegacy,
    setTab,
    fetchDetail,
    chartRows,
    compactNumber,
    topRow,
    statsColor,
    cleanName,
  };
});
