<script setup>
import { computed } from 'vue';
import { useLightboxStore } from '../../stores/lightbox.js';

const store = useLightboxStore();
const compareOpen = computed(() => store.compareOpen);
const selected = computed(() => store.compareSelected);

// 复用 legacy 的 compare 样式：.lightbox-compare / .compare-pane / .compare-img / .compare-info
function closeCompare() {
  const PS = window.PS;
  if (PS && typeof PS.closeCompare === 'function') PS.closeCompare();
  store.compareOpen = false;
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
