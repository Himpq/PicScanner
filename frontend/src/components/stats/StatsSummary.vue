<script setup>
import { computed } from 'vue';
import { useStatsStore } from '../../stores/stats.js';

const store = useStatsStore();
const stats = computed(() => store.statistics || {});

function percent(row, total) {
  const base = Number(total || 0);
  if (!row || base <= 0) return '0%';
  return Math.round(Number(row.count || 0) / base * 100) + '%';
}

const summaryCells = computed(() => {
  const s = stats.value;
  const total = Number(s.total_files || 0);
  const complete = Number(s.exif_complete || 0);
  const pending = Number(s.exif_pending || 0);
  const completePct = total > 0 ? Math.round(complete / total * 100) : 0;
  const focal = store.topRow(s.by_focal_bucket || []);
  const lens = store.topRow(s.by_lens || []);
  const aperture = store.topRow(s.by_aperture || []);
  const iso = store.topRow(s.by_iso_bucket || []);
  return [
    { label: '照片总数', value: store.compactNumber(total), meta: '当前图库' },
    { label: 'EXIF 完成', value: completePct + '%', meta: store.compactNumber(complete) + ' 已读 / ' + store.compactNumber(pending) + ' 待读' },
    { label: '常用焦段', value: focal ? focal.name : '未知', meta: focal ? percent(focal, complete) : '暂无数据' },
    { label: '常用镜头', value: lens ? lens.name : '未知', meta: lens ? percent(lens, complete) : '暂无数据' },
    { label: '常用光圈', value: aperture ? aperture.name : '未知', meta: aperture ? percent(aperture, complete) : '暂无数据' },
    { label: '常用 ISO', value: iso ? iso.name : '未知', meta: iso ? percent(iso, complete) : '暂无数据' },
  ];
});
</script>

<template>
  <div class="stats-summary">
    <div v-for="cell in summaryCells" :key="cell.label" class="stats-summary-item">
      <span>{{ cell.label }}</span>
      <strong>{{ cell.value }}</strong>
      <em>{{ cell.meta }}</em>
    </div>
  </div>
</template>

<style scoped>
.stats-summary { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
@media (max-width: 720px) { .stats-summary { grid-template-columns: repeat(2, 1fr); } }
</style>
