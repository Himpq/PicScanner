<script setup>
import { computed, onMounted, watch } from 'vue';
import { useGalleryStore } from '../../stores/gallery.js';

const store = useGalleryStore();
const dates = computed(() => store.dates);
const activeDate = computed(() => store.activeDate);

function jump(dateKey) {
  const PS = window.PS;
  if (PS && typeof PS.jumpToDate === 'function') PS.jumpToDate(dateKey);
  else {
    store.activeDate = dateKey;
    const el = document.getElementById('date-' + dateKey);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function label(dateKey) {
  const PS = window.PS;
  if (PS && PS.formatDateLabel) return PS.formatDateLabel(dateKey);
  return String(dateKey);
}

// 保持与 legacy 的日期高亮同步：监听 activeDate 变化时可扩展
watch(activeDate, () => {});
onMounted(() => {
  store.hydrateFromLegacy();
});
</script>

<template>
  <nav class="date-rail">
    <div class="section-title">日期</div>
    <div class="date-rail-list">
      <button
        v-for="d in dates"
        :key="d.date_key"
        class="date-pill"
        :class="{ active: activeDate === d.date_key }"
        :data-date-pill="d.date_key"
        @click="jump(d.date_key)"
      >{{ label(d.date_key) }}</button>
      <div v-if="!dates.length" class="date-rail-empty">暂无日期</div>
    </div>
  </nav>
</template>

<style scoped>
.date-rail-empty { font-size:12px; color:var(--muted, #9aa0a6); padding:8px; }
</style>
