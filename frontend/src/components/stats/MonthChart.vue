<script setup>
import { computed } from 'vue';
import { useStatsStore } from '../../stores/stats.js';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  title: { type: String, default: '月份分布' },
});

const store = useStatsStore();
const data = computed(() => store.chartRows(props.rows, 12));
const max = computed(() => data.value.reduce((m,r) => Math.max(m, r.count), 1));
</script>

<template>
  <section class="stats-panel">
    <h2>{{ title }}</h2>
    <div v-if="!data.length" class="chart-empty">暂无数据</div>
    <div v-else class="distribution-chart">
      <div v-for="(row, idx) in data" :key="row.name + idx" class="distribution-row" :data-chart-tip="row.name + ' · ' + row.count + ' 张'">
        <span>{{ row.name }}</span>
        <div class="distribution-track"><div :style="{ width: Math.max(4, row.count/max*100).toFixed(1) + '%', background: store.statsColor(idx) }"></div></div>
        <em>{{ row.count }}</em>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chart-empty { padding:16px; color:var(--muted,#9aa0a6); text-align:center; }
</style>
