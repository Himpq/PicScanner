<script setup>
import { computed } from 'vue';
import StatsEChart from './StatsEChart.vue';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  title: { type: String, default: '拍摄时段' },
});

const lookup = computed(() => new Map((props.rows || []).map((r) => [String(r.name || '').slice(0,2), Number(r.count || 0)])));
const data = computed(() => Array.from({ length: 24 }, (_, h) => {
  const key = String(h).padStart(2,'0');
  return { name: key + ':00', count: lookup.value.get(key) || 0 };
}));
const hasData = computed(() => data.value.some((r) => r.count > 0));
</script>

<template>
  <section class="stats-panel">
    <h2>{{ title }}</h2>
    <div v-if="!hasData" class="chart-empty">暂无数据</div>
    <StatsEChart
      v-else
      :rows="data"
      :height="230"
      :show-percent="false"
      :single-color="true"
      :label-interval="5"
      :horizontal="false"
      :aria-label="title || '拍摄时段统计图'"
    />
  </section>
</template>

<style scoped>
.chart-empty { padding:16px; color:var(--muted,#9aa0a6); text-align:center; }
</style>
