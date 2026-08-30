<script setup>
import { onMounted, computed, watch } from 'vue';
import { useStatsStore } from '../stores/stats.js';
import * as bucketSort from '../stats/bucketSort.js';
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
});

// P3：只在打开时取数，不在启动时预取（屏幕常驻挂载）
watch(() => store.open, (isOpen) => {
  if (!isOpen) return;
  if (currentPath.value) store.fetchDetail().catch(() => {});
});

// P3：分桶排序抽到 src/stats/bucketSort.js，纯函数且有单元测试。
// 后端返回的是按 count 降序，横轴顺序必须在这里重排；
// 未知桶（'?'）沉底，ISO 的 ≤ / ≥ 同值时 ≤ 在前，快门按曝光秒数由快到慢。
const {
  sortFocalBuckets,
  sortApertureBuckets,
  sortIsoBuckets,
  sortShutterBuckets,
} = bucketSort;
</script>

<!-- P3：多根组件，且由 main.js 直接挂载到 #stats-screen 本身（不是它的子节点）。
     .stats-screen 是 display:grid（280px 侧栏 + 1fr 主区），
     这里的两个根节点必须成为它的直接网格项：
     侧栏要靠 grid 拿到高度约束，overflow:auto 才会生效；
     一旦中间多一层普通 div，grid 只认到一个子元素，布局与滚动都会失效。
     注释放在 template 外，避免被渲染成 DOM 节点。 -->
<template>
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
          <div class="storage-counts">已扫描 {{ Number(s.scanned_count || 0) }} · 登记 {{ Number(s.registered_count || 0) }}</div>
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
</template>

<style scoped>
/* 网格列宽与响应式交给 style.css 的 .stats-screen 规则，这里不重复定义 */
.stats-pane { display:none; }
.stats-pane.active { display:block; }
.stats-tabs { display:flex; gap:8px; margin-bottom:16px; }

/* style.css 把 .stats-side / .stats-content 设成了 scrollbar-width:none，
   内容溢出时完全没有滚动条、也没有任何可滚动的视觉提示。
   这里用 scoped 规则（选择器带 data-v 属性，优先级高于 style.css 的同类名规则）
   恢复一条细滚动条，只作用于 Vue 渲染的统计屏，不影响 legacy 其他地方。 */
.stats-side,
.stats-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.22) transparent;
}
.stats-side::-webkit-scrollbar,
.stats-content::-webkit-scrollbar { width: 8px; height: 8px; }
.stats-side::-webkit-scrollbar-track,
.stats-content::-webkit-scrollbar-track { background: transparent; }
.stats-side::-webkit-scrollbar-thumb,
.stats-content::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.18);
  border-radius: 4px;
}
.stats-side::-webkit-scrollbar-thumb:hover,
.stats-content::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.32); }
</style>
