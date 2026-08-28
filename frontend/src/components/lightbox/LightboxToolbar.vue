<script setup>
import { ref, computed, watch } from 'vue';
import { useLightboxStore } from '../../stores/lightbox.js';

const store = useLightboxStore();
const zoomText = ref(store.formatZoom(store.zoom));
watch(() => store.zoom, (v) => { zoomText.value = store.formatZoom(v); });

const apsc = computed(() => store.apscText);
const focal = computed(() => store.focalText);
const isCompare = computed(() => store.compareOpen);
const compareLocked = computed(() => store.compareLocked);

function onZoomInputBlur() {
  zoomText.value = store.applyZoomInput(zoomText.value);
}
function onZoomKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
}

function toggleInfo() {
  store.setInfoVisible(!store.infoVisible);
}
function toggleCompareLock() {
  store.compareLocked = !store.compareLocked;
  const PS = window.PS;
  if (PS && PS.state && PS.state.compare) PS.state.compare.locked = store.compareLocked;
}
function toggleCompareInfo() {
  const PS = window.PS;
  if (PS && typeof PS.setCompareInfoVisible === 'function') {
    PS.setCompareInfoVisible(!PS.state.compare.infoVisible);
  } else if (PS && PS.state && PS.state.compare) {
    PS.state.compare.infoVisible = !PS.state.compare.infoVisible;
  }
}
const compareInfoVisible = computed(() => {
  const PS = window.PS;
  return PS && PS.state && PS.state.compare ? !!PS.state.compare.infoVisible : false;
});
</script>

<template>
  <!-- 与 legacy 完全同构：toolbar 居中（grid 1fr 居中），controls 居中，nav 按钮 absolute -->
  <div class="lightbox-toolbar">
    <button id="lightbox-prev" class="lightbox-nav-btn" title="上一张" aria-label="上一张" @click="store.prevPhoto()">‹</button>
    <button id="lightbox-next" class="lightbox-nav-btn" title="下一张" aria-label="下一张" @click="store.nextPhoto()">›</button>
    <!-- 普通模式：居中 controls -->
    <div v-if="!isCompare" class="lightbox-controls">
      <button class="icon-btn" title="缩小" @click="store.zoomOut()">−</button>
      <input id="lightbox-zoom" class="lightbox-readout zoom-input" :value="zoomText" title="输入放大倍率" @input="e => zoomText = e.target.value" @blur="onZoomInputBlur" @keydown="onZoomKeydown" />
      <button class="icon-btn" title="放大" @click="store.zoomIn()">+</button>
      <button id="lightbox-info-toggle" class="icon-btn lightbox-info-toggle" :class="{ active: store.infoVisible }" title="隐藏参数" :aria-pressed="store.infoVisible ? 'true' : 'false'" @click="toggleInfo">i</button>
      <div class="toolbar-divider"></div>
      <div id="lightbox-apsc-focal" class="lightbox-readout" :class="{ hidden: !apsc }">{{ apsc || 'APS-C --' }}</div>
      <div id="lightbox-focal" class="lightbox-readout">{{ focal }}</div>
    </div>
    <!-- 对比模式：复用 legacy .compare-toolbar -->
    <div v-else id="compare-toolbar" class="compare-toolbar">
      <div id="compare-zoom-a" class="compare-zoom-readout">左 {{ store.formatZoom(store.compareOpen ? 1 : store.zoom) }}</div>
      <button id="compare-lock" class="compare-lock" :class="{ active: compareLocked }" :aria-pressed="compareLocked ? 'true' : 'false'" :title="compareLocked ? '已锁定同步' : '未锁定同步'" @click="toggleCompareLock">锁</button>
      <button id="compare-info-toggle" class="icon-btn compare-info-toggle" :class="{ active: compareInfoVisible }" type="button" title="显示参数" :aria-pressed="compareInfoVisible ? 'true' : 'false'" @click="toggleCompareInfo">i</button>
      <div id="compare-zoom-b" class="compare-zoom-readout">右 {{ store.formatZoom(store.compareOpen ? 1 : store.zoom) }}</div>
    </div>
  </div>
</template>

<style scoped>
/* 复用 style.css 的 .lightbox-toolbar / .lightbox-controls / .lightbox-readout / .lightbox-nav-btn，无额外覆盖以保证居中 */
</style>
