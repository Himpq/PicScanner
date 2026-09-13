<script setup>
import { computed } from 'vue';
import { useStatsStore } from '../../stores/stats.js';
import StatsEChart from './StatsEChart.vue';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  limit: { type: Number, default: 7 },
  title: { type: String, default: '' },
});

const store = useStatsStore();
const data = computed(() => store.chartRows(props.rows, props.limit));
</script>

<template>
  <section class="stats-panel">
    <h2 v-if="title">{{ title }}</h2>
    <div v-if="!data.length" class="chart-empty">暂无数据</div>
    <StatsEChart
      v-else
      :rows="data"
      :height="220"
      :show-percent="true"
      :aria-label="title || '分布统计图'"
    />
  </section>
</template>

<style scoped>
.chart-empty { padding:16px; color:var(--muted,#9aa0a6); text-align:center; }
</style>
