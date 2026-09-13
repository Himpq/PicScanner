import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { call } from '../bridge/index.js';

const STATS_COLORS = [
  '#e0a45a',
  '#79a9d1',
  '#8ebf9b',
  '#c88b9f',
  '#9a91c7',
  '#c7a76b',
  '#6ea6a6',
  '#b57e61',
];

export const useStatsStore = defineStore('stats', () => {
  const loading = ref(false);
  const error = ref('');
  const sources = ref([]);
  const statistics = ref({});
  const activeTab = ref('overview');
  // P3：统计屏内容归 Vue 后，开关与数据源都落在 store 上。
  // 注意显隐动画（entering / leaving / hidden）仍由 legacy 的
  // openStatsPage / closeStatsPage 操作 #stats-screen 完成，Vue 只负责内容。
  const open = ref(false);
  const visualStats = ref({ labels: [], coverage: null, total_classified: 0, uncertain_count: 0 });
  const visualLoading = ref(false);
  const visualError = ref('');

  const total = computed(() => Number(statistics.value.total_files || 0));
  const exifComplete = computed(() => Number(statistics.value.exif_complete || 0));

  function hydrateFromLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state) return;
    if (PS.state.statsTab) activeTab.value = PS.state.statsTab;
    if (typeof PS.state.statsOpen === 'boolean') open.value = PS.state.statsOpen;
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
      const res = await call('get_statistics_detail', rp, sid);
      if (!res || !res.success) throw new Error(res?.message || '读取统计信息失败');
      sources.value = res.sources || [];
      statistics.value = res.statistics || {};
      return res;
    } catch (err) {
      error.value = String(err?.message || err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchVisualStats({ sourceId } = {}) {
    visualError.value = '';
    try {
      const sid = sourceId !== undefined ? sourceId : (currentSourceId() || null);
      const res = await call('module_api', 'visual_stats', 'stats', sid);
      if (!res || !res.success) throw new Error(res?.message || '读取题材统计失败');
      visualStats.value = res;
      return res;
    } catch (err) {
      visualError.value = String(err?.message || err);
      throw err;
    }
  }

  async function runVisualAnalysis(force = false) {
    const sid = currentSourceId();
    if (!sid) {
      visualError.value = '请先选择来源';
      return null;
    }
    visualLoading.value = true;
    visualError.value = '';
    try {
      const started = await call('module_api', 'visual_stats', 'analyze', sid, !!force);
      if (!started || !started.success) throw new Error(started?.message || '题材分析启动失败');
      for (let attempt = 0; attempt < 900; attempt += 1) {
        const current = await fetchVisualStats({ sourceId: sid });
        const coverage = current.coverage || {};
        if (!coverage.running) {
          if (coverage.error) throw new Error(coverage.error);
          return current;
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      throw new Error('题材分析等待超时，请查看 Python Terminal 日志');
    } catch (err) {
      visualError.value = String(err?.message || err);
      throw err;
    } finally {
      visualLoading.value = false;
    }
  }

  // P3：legacy 的 openStatsPage 调这个来触发取数，不再自己渲染
  function openPage() {
    open.value = true;
    const PS = window.PS;
    if (PS && PS.state) PS.state.statsOpen = true;
    return fetchDetail().catch(() => {});
  }

  function closePage() {
    open.value = false;
    const PS = window.PS;
    if (PS && PS.state) PS.state.statsOpen = false;
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
    const normalized = Math.abs(Number(index || 0)) % STATS_COLORS.length;
    return STATS_COLORS[normalized];
  }

  return {
    loading,
    error,
    sources,
    statistics,
    activeTab,
    open,
    visualStats,
    visualLoading,
    visualError,
    total,
    exifComplete,
    hydrateFromLegacy,
    setTab,
    openPage,
    closePage,
    fetchDetail,
    fetchVisualStats,
    runVisualAnalysis,
    chartRows,
    compactNumber,
    topRow,
    statsColor,
    cleanName,
  };
});
