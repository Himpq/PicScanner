<script setup>
import { onMounted, computed, watch } from 'vue';
import { useStatsStore } from '../stores/stats.js';
import StatsSummary from '../components/stats/StatsSummary.vue';
import RankChart from '../components/stats/RankChart.vue';
import DistributionChart from '../components/stats/DistributionChart.vue';
import HourChart from '../components/stats/HourChart.vue';
import MonthChart from '../components/stats/MonthChart.vue';

const store = useStatsStore();
const stats = computed(() => store.statistics || {});
const sources = computed(() => store.sources || []);
const activeTab = computed(() => store.activeTab);
const loading = computed(() => store.loading);
const error = computed(() => store.error);
const currentPath = computed(() => {
  const PS = window.PS;
  return (PS?.state?.currentRootPath) || '';
});

function setTab(key) {
  store.setTab(key);
}

function close() {
  const PS = window.PS;
  if (PS && PS.closeStatsPage) PS.closeStatsPage();
}

onMounted(() => {
  store.hydrateFromLegacy();
  // 若已在统计页或图库已选来源，立即拉取
  if (currentPath.value) store.fetchDetail().catch(() => {});
});

// 当路径变化时自动刷新（双轨期轮询 legacy 的来源切换）
watch(currentPath, () => {
  if (currentPath.value) store.fetchDetail().catch(() => {});
});

function sortFocalBuckets(rows) {
  // 焦段按数值排序，复用 legacy 逻辑的近似：按 name 提取数字排序
  return [...(rows || [])].sort((a,b) => {
    const na = parseFloat(String(a.name || '').replace(/[^0-9.]/g,'')) || 0;
    const nb = parseFloat(String(b.name || '').replace(/[^0-9.]/g,'')) || 0;
    return na - nb;
  });
}
function sortApertureBuckets(rows) {
  return [...(rows || [])].sort((a,b) => {
    const na = parseFloat(String(a.name || '').replace('F','')) || 0;
    const nb = parseFloat(String(b.name || '').replace('F','')) || 0;
    return na - nb;
  });
}
function sortIsoBuckets(rows) {
  return [...(rows || [])].sort((a,b) => (Number(a.name)||0)-(Number(b.name)||0));
}
function sortShutterBuckets(rows) {
  // 快门按分母排序，简化为字符串比较
  return [...(rows || [])];
}
</script>

<template>
  <div class="ps-stats-screen">
    <aside class="stats-side">
      <div class="brand-block">
        <div class="brand-title">统计信息</div>
        <div class="brand-sub">{{ currentPath || '未选择来源' }}</div>
      </div>
      <div v-if="loading && !sources.length" class="ps-settings-empty">读取中...</div>
      <div v-else-if="error && !sources.length" class="ps-settings-empty">{{ error }}</div>
      <div v-else class="storage-list compact">
        <article v-for="s in sources" :key="s.source_id || s.root_path" class="storage-row">
          <div class="storage-cover"><div class="storage-id">ID {{ s.id || '--' }}</div><img v-if="s.cover_url" :src="s.cover_url" alt="" /></div>
          <div class="storage-info">
            <div class="storage-path">{{ s.root_path || s.path || '' }}</div>
            <div class="storage-counts">已扫描 {{ Number(s.scanned_count || s.visible_files || 0) }} · 登记 {{ Number(s.registered_count || s.total_files || 0) }}</div>
          </div>
        </article>
        <div v-if="!sources.length" class="ps-settings-empty">暂无来源</div>
      </div>
    </aside>

    <section class="stats-main">
      <div class="ps-settings-toolbar">
        <button class="ghost-btn back-btn" @click="close"><span aria-hidden="true">←</span><span>返回图库</span></button>
        <div class="toolbar-spacer"></div>
        <button class="ghost-btn" @click="() => store.fetchDetail().catch(()=>{})">刷新</button>
      </div>

      <div class="stats-content">
        <div v-if="loading && !stats.total_files" class="ps-settings-empty">统计加载中...</div>
        <div v-else-if="error && !stats.total_files" class="ps-settings-empty">{{ error }}</div>
        <template v-else>
          <div class="stats-tabs" role="tablist" aria-label="统计分页">
            <button class="stats-tab" :class="{ active: activeTab === 'overview' }" type="button" data-stats-tab="overview" @click="setTab('overview')">概览</button>
            <button class="stats-tab" :class="{ active: activeTab === 'gear' }" type="button" data-stats-tab="gear" @click="setTab('gear')">器材</button>
            <button class="stats-tab" :class="{ active: activeTab === 'params' }" type="button" data-stats-tab="params" @click="setTab('params')">拍摄参数</button>
            <button class="stats-tab" :class="{ active: activeTab === 'time' }" type="button" data-stats-tab="time" @click="setTab('time')">时间</button>
          </div>

          <div class="stats-pane" :class="{ active: activeTab === 'overview' }" data-stats-pane="overview">
            <StatsSummary />
          </div>

          <div class="stats-pane" :class="{ active: activeTab === 'gear' }" data-stats-pane="gear">
            <div class="stats-grid stats-grid-gear">
              <RankChart :rows="stats.by_lens || []" :limit="8" title="镜头排行" />
              <RankChart :rows="stats.by_model || []" :limit="5" title="机身统计" />
            </div>
          </div>

          <div class="stats-pane" :class="{ active: activeTab === 'params' }" data-stats-pane="params">
            <div class="stats-grid stats-grid-params">
              <RankChart :rows="sortFocalBuckets(stats.by_focal_bucket || [])" :limit="8" title="焦段范围" />
              <DistributionChart :rows="sortApertureBuckets(stats.by_aperture || [])" :limit="7" title="光圈分布" />
              <DistributionChart :rows="sortIsoBuckets(stats.by_iso_bucket || [])" :limit="7" title="ISO 分布" />
              <DistributionChart :rows="sortShutterBuckets(stats.by_shutter || [])" :limit="7" title="快门分布" />
            </div>
          </div>

          <div class="stats-pane" :class="{ active: activeTab === 'time' }" data-stats-pane="time">
            <div class="stats-grid stats-grid-time">
              <HourChart :rows="stats.by_hour || []" title="拍摄时段" />
              <MonthChart :rows="stats.by_month || []" title="月份分布" />
            </div>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ps-stats-screen { display:flex; width:100%; min-height:100%; }
.ps-stats-screen .stats-side { width: 280px; flex-shrink:0; }
.ps-stats-screen .stats-main { flex:1; min-width:0; }
.stats-pane { display:none; }
.stats-pane.active { display:block; }
.stats-tabs { display:flex; gap:8px; margin-bottom:16px; }
@media (max-width: 900px) {
  .ps-stats-screen { flex-direction:column; }
  .ps-stats-screen .stats-side { width:100%; }
}
</style>
