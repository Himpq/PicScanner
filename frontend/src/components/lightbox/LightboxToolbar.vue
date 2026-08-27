<script setup>
import { ref, computed, watch } from 'vue';
import { useLightboxStore } from '../../stores/lightbox.js';

const store = useLightboxStore();
const zoomText = ref(store.formatZoom(store.zoom));
watch(() => store.zoom, (v) => { zoomText.value = store.formatZoom(v); });

const apsc = computed(() => store.apscText);
const focal = computed(() => store.focalText);

function onZoomInputBlur() {
  zoomText.value = store.applyZoomInput(zoomText.value);
}
function onZoomKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
}

function toggleInfo() {
  store.setInfoVisible(!store.infoVisible);
}
</script>

<template>
  <div class="lightbox-toolbar vue-lightbox-toolbar">
    <button class="icon-btn lightbox-nav-btn" title="上一张" aria-label="上一张" @click="store.prevPhoto()">‹</button>
    <div class="lightbox-controls">
      <button class="icon-btn" title="缩小" @click="store.zoomOut()">−</button>
      <input class="lightbox-readout zoom-input" :value="zoomText" title="输入放大倍率" @input="e => zoomText = e.target.value" @blur="onZoomInputBlur" @keydown="onZoomKeydown" />
      <button class="icon-btn" title="放大" @click="store.zoomIn()">+</button>
      <button class="icon-btn lightbox-info-toggle" :class="{ active: store.infoVisible }" title="隐藏参数" :aria-pressed="store.infoVisible ? 'true' : 'false'" @click="toggleInfo">i</button>
      <div class="toolbar-divider"></div>
      <div v-if="apsc" class="lightbox-readout">{{ apsc }}</div>
      <div class="lightbox-readout">{{ focal }}</div>
    </div>
    <button class="icon-btn lightbox-nav-btn" title="下一张" aria-label="下一张" @click="store.nextPhoto()">›</button>
  </div>
</template>

<style scoped>
.vue-lightbox-toolbar { display:flex; align-items:center; gap:12px; width:100%; justify-content:space-between; }
.lightbox-controls { display:flex; align-items:center; gap:8px; }
</style>
