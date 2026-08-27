<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useGalleryStore } from '../stores/gallery.js';
import GalleryToolbar from '../components/gallery/GalleryToolbar.vue';
import CategoryPanel from '../components/gallery/CategoryPanel.vue';
import DateRail from '../components/gallery/DateRail.vue';
import PhotoGrid from '../components/gallery/PhotoGrid.vue';

const store = useGalleryStore();
const currentSource = computed(() => {
  const PS = window.PS;
  const fromPS = PS?.state?.selectedSource?.path || PS?.state?.currentRootPath || '';
  return store.currentRootPath || fromPS || '';
});
const timeRange = ref('');

function syncTimeRange() {
  const PS = window.PS;
  const el = document.getElementById('time-range');
  if (el) timeRange.value = el.textContent || '';
  else if (PS?.state?.dates?.length) {
    const dates = PS.state.dates;
    if (dates.length) timeRange.value = dates[0].date_key + ' — ' + dates[dates.length - 1].date_key;
  }
}

onMounted(() => {
  store.hydrateFromLegacy();
  // 同步来源上下文
  const PS = window.PS;
  if (PS?.state) {
    store.syncSourceContext(PS.state.currentRootPath, PS.state.currentSourceId);
    // 拉取分类与日期（若 legacy 未拉取，Vue 侧兜底）
    if (!store.categories.length) store.fetchCategories().catch(() => {});
    if (!store.dates.length) store.fetchDates().catch(() => {});
  }
  syncTimeRange();
  // 监听 legacy 的日期变化（轮询轻量同步，双轨期）
  const timer = setInterval(() => {
    store.hydrateFromLegacy();
    syncTimeRange();
  }, 1000);
  window.__galleryShellSyncTimer = timer;
});

import { onBeforeUnmount } from 'vue';
onBeforeUnmount(() => {
  if (window.__galleryShellSyncTimer) {
    clearInterval(window.__galleryShellSyncTimer);
    delete window.__galleryShellSyncTimer;
  }
});

function onGallerySizeInput(e) {
  store.applyGallerySize(e.target.value);
}
</script>

<template>
  <div class="ps-gallery-shell">
    <!-- 侧边栏：已隔离为 ps-side，分类面板已 Vue 化 -->
    <aside class="ps-side">
      <div class="brand-block">
        <div class="ps-side-path">{{ currentSource || '未选择来源' }}</div>
      </div>

      <div class="progress-card">
        <div class="progress-block">
          <div class="progress-top"><span class="progress-label">等待扫描</span></div>
          <div class="progress-meter"><div class="progress-track"><div style="width:0%"></div></div><span class="progress-count">0 / 0</span></div>
          <div class="progress-msg">由 legacy 驱动，Pinia 镜像中…</div>
        </div>
      </div>

      <CategoryPanel />
    </aside>

    <section class="ps-gallery-wrap">
      <GalleryToolbar />
      <div class="time-range-mirror">{{ timeRange }}</div>
      <div class="ps-gallery-scroll">
        <PhotoGrid />
        <div class="older-sentinel">检查更早日期...</div>
      </div>
    </section>

    <DateRail />
  </div>
</template>

<style scoped>
.ps-gallery-shell { display:flex; width:100%; min-height: 0; gap: 16px; }
.ps-gallery-shell > .ps-side { width: 240px; flex-shrink:0; }
.ps-gallery-shell > .ps-gallery-wrap { flex:1; min-width:0; }
.ps-gallery-shell > .ps-date-rail { width: 160px; flex-shrink:0; }
.time-range-mirror { font-size:12px; color:var(--muted, #9aa0a6); padding:4px 8px; }
@media (max-width: 900px) {
  .ps-gallery-shell { flex-direction:column; }
  .ps-gallery-shell > .ps-side, .ps-gallery-shell > .ps-date-rail { width:100%; }
}
</style>
