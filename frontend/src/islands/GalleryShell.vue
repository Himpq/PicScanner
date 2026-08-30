<script setup>
import { onMounted, ref, computed } from 'vue';
import { useGalleryStore } from '../stores/gallery.js';
import { useLegacySync } from '../composables/useLegacySync.js';
import GalleryToolbar from '../components/gallery/GalleryToolbar.vue';
import CategoryPanel from '../components/gallery/CategoryPanel.vue';
import DateRail from '../components/gallery/DateRail.vue';

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
  // 同步来源上下文
  const PS = window.PS;
  if (PS?.state) {
    store.syncSourceContext(PS.state.currentRootPath, PS.state.currentSourceId);
    // 拉取分类与日期（若 legacy 未拉取，Vue 侧兜底）
    if (!store.categories.length) store.fetchCategories().catch(() => {});
    if (!store.dates.length) store.fetchDates().catch(() => {});
  }
});
// P1：真源代理生效后由 rAF 合并同步驱动；代理未安装时才回退 1000ms 轮询
useLegacySync(() => {
  store.hydrateFromLegacy();
  syncTimeRange();
}, 1000);

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
        <div class="legacy-gallery-placeholder" style="padding:24px;text-align:center;color:var(--muted,#9aa0a6)">照片墙由 legacy #gallery 渲染（Vue PhotoGrid 已回退）</div>
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
