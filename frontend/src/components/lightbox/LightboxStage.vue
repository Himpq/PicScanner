<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useLightboxStore } from '../../stores/lightbox.js';

const store = useLightboxStore();
const photo = computed(() => store.photo);
const zoom = computed(() => store.zoom);

const imgEl = ref(null);
let dragging = false;
let startX = 0, startY = 0;
let startPanX = 0, startPanY = 0;

function onWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 1 / store.zoom : store.zoom * 0;
  // 简化：滚轮缩放以 LIGHTBOX_ZOOM_STEP
  if (e.deltaY < 0) store.zoomIn();
  else store.zoomOut();
  // 双轨期同步到 legacy 的中心缩放
  const PS = window.PS;
  if (PS && PS.setLightboxZoom) PS.setLightboxZoom(store.zoom);
}

function onPointerDown(e) {
  if (e.button !== 0) return;
  dragging = true;
  store.dragging = true;
  startX = e.clientX; startY = e.clientY;
  startPanX = store.panX; startPanY = store.panY;
  e.currentTarget.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!dragging) return;
  store.panX = startPanX + (e.clientX - startX);
  store.panY = startPanY + (e.clientY - startY);
  store.syncToLegacy();
}

function onPointerUp(e) {
  dragging = false;
  store.dragging = false;
  try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
}

const previewUrl = computed(() => {
  const p = photo.value;
  if (!p) return '';
  return p.lightbox_url || p.preview_url || p.thumbnail_url || p.path || '';
});

onMounted(() => store.hydrateFromLegacy());
</script>

<template>
  <div class="lightbox-stage vue-lightbox-stage"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <img
      v-if="previewUrl"
      ref="imgEl"
      class="lightbox-img"
      :src="previewUrl"
      alt=""
      :style="{ transform: 'translate(' + store.panX + 'px,' + store.panY + 'px) scale(' + zoom + ')' }"
      draggable="false"
    />
    <div v-else class="lightbox-empty">未选择照片</div>
  </div>
</template>

<style scoped>
.vue-lightbox-stage { width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; touch-action:none; position:relative; }
.lightbox-img { max-width:100%; max-height:100%; object-fit:contain; transform-origin:center center; user-select:none; }
.lightbox-empty { color:var(--muted,#9aa0a6); font-size:14px; }
</style>
