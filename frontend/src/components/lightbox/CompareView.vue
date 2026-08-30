<script setup>
import { computed } from 'vue';
import { useLightboxStore } from '../../stores/lightbox.js';

const store = useLightboxStore();
const compareOpen = computed(() => store.compareOpen);
const selected = computed(() => store.compareSelected);

// 复用 legacy 的 compare 样式：.lightbox-compare / .compare-pane / .compare-img / .compare-info
function closeCompare() {
  const PS = window.PS;
  // 先清 Vue 状态再同步，避免与 legacy 的 lightbox 标志竞态
  store.compareOpen = false;
  store.syncToLegacy();
  if (PS && PS.state && PS.state.compare) PS.state.compare.lightbox = false;
  if (PS) {
    // 灯箱内对比：优先走原始关闭以清理 DOM；画廊面板则走 closeComparePanel
    const lightboxActive = !!(PS.state && PS.state.compare && PS.state.compare.lightbox) || !!document.querySelector('#vue-lightbox .ps-lightbox-shell');
    if (lightboxActive && typeof PS._origCloseLightbox === 'function') {
      try { PS._origCloseLightbox(); } catch {}
    } else if (lightboxActive && typeof PS.closeLightbox === 'function') {
      try { PS.closeLightbox(); } catch {}
    } else if (typeof PS.closeComparePanel === 'function') {
      try { PS.closeComparePanel(); } catch {}
    }
  }
  // 若是灯箱内对比，关闭后也需确保 Vue 灯箱关闭
  if (PS && PS.state && PS.state.compare && !PS.state.compare.lightbox) {
    store.open = false;
  }
}

function thumbFor(p) {
  if (!p) return '';
  return p.lightbox_url || p.preview_url || p.thumbnail_url || '';
}
</script>

<template>
  <div v-if="compareOpen" id="lightbox-compare" class="lightbox-compare">
    <div v-for="(photo, idx) in selected" :key="idx" class="compare-pane" :data-compare-pane="idx">
      <img
        v-if="photo"
        :id="idx===0 ? 'compare-img-a' : 'compare-img-b'"
        class="compare-img"
        :src="thumbFor(photo)"
        :alt="photo.filename || ''"
        draggable="false"
      />
      <div v-else class="compare-empty">未选择 {{ idx === 0 ? '左图' : '右图' }}</div>
    </div>
  </div>
</template>

<style scoped>
/* 完全复用 style.css 的 .lightbox-compare / .compare-pane / .compare-img，不再自定义布局 */
.compare-empty { position:absolute; inset:0; display:grid; place-items:center; color:var(--muted,#9aa0a6); font-size:13px; }
</style>
