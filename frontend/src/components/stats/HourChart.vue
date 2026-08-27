<script setup>
import { computed } from 'vue';
import { useStatsStore } from '../../stores/stats.js';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  title: { type: String, default: '拍摄时段' },
});

const store = useStatsStore();
const lookup = computed(() => new Map((props.rows || []).map((r) => [String(r.name || '').slice(0,2), Number(r.count || 0)])));
const data = computed(() => Array.from({ length: 24 }, (_, h) => {
  const key = String(h).padStart(2,'0');
  return { name: key + ':00', count: lookup.value.get(key) || 0 };
}));
const max = computed(() => data.value.reduce((m, r) => Math.max(m, r.count), 1));
const hasData = computed(() => data.value.some((r) => r.count > 0));
</script>

<template>
  <section class="stats-panel">
    <h2>{{ title }}</h2>
    <div v-if="!hasData" class="chart-empty">暂无数据</div>
    <div v-else class="hour-rhythm">
      <div v-for="row in data" :key="row.name" class="hour-cell" :data-chart-tip="row.name + ' · ' + row.count + ' 张'">
        <div class="hour-bar"><div :style="{ height: Math.max(6, row.count/max*100).toFixed(1) + '%', background: store.statsColor(row.count === max ? 0 : 1) }"></div></div>
        <span v-if="['00','06','12','18','23'].includes(row.name.slice(0,2))" class="hour-label">{{ row.name.slice(0,2) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chart-empty { padding:16px; color:var(--muted,#9aa0a6); text-align:center; }
.hour-rhythm { display:flex; align-items:flex-end; gap:4px; height:120px; }
.hour-cell { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; }
.hour-bar { width:100%; height:90px; display:flex; align-items:flex-end; justify-content:center; }
.hour-bar > div { width:70%; border-radius:2px 2px 0 0; }
.hour-label { font-size:10px; margin-top:4px; color:var(--muted,#9aa0a6); }
</style>
