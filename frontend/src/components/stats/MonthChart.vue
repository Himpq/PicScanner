<script setup>
import { computed } from 'vue';
import { useStatsStore } from '../../stores/stats.js';
import StatsEChart from './StatsEChart.vue';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  title: { type: String, default: '月份分布' },
});

const store = useStatsStore();
const data = computed(() => store.chartRows(props.rows, 12));
</script>

<template>
  <section class="stats-panel">
    <h2>{{ title }}</h2>
    <div v-if="!data.length" class="chart-empty">暂无数据</div>
    <StatsEChart
      v-else
      :rows="data"
      type="line"
      :height="230"
      :show-percent="false"
      :single-color="true"
      :horizontal="false"
      :label-interval="0"
      :aria-label="title || '月份统计图'"
    />
  </section>
</template>

<style scoped>
.chart-empty { padding:16px; color:var(--muted,#9aa0a6); text-align:center; }
</style>
