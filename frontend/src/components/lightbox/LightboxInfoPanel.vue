<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useLightboxStore } from '../../stores/lightbox.js';
import LightboxInfoContent from '../../lightbox/LightboxInfoContent.vue';
import { reactive } from 'vue';

const store = useLightboxStore();
const photo = computed(() => store.photo);
const visible = computed(() => store.infoVisible);
const collapsed = computed(() => store.infoDetailsCollapsed);

const state = reactive({ photo: photo.value });
import { watch } from 'vue';
watch(photo, (v) => { state.photo = v; });

let dragging = false;
let dragX = 0, dragY = 0;
let resizing = false;
let resizeEdge = '';
let startX = 0, startY = 0, startW = 310, startH = 200, startLeft = 18, startTop = 18;
const panelEl = ref(null);

function onHeadPointerDown(e) {
  if (e.button !== 0) return;
  dragging = true;
  dragX = e.clientX; dragY = e.clientY;
  e.currentTarget.setPointerCapture(e.pointerId);
}

function onResizePointerDown(e) {
  const handle = e.target.closest('[data-lightbox-info-resize]');
  if (!handle) return;
  resizing = true;
  resizeEdge = String(handle.dataset.lightboxInfoResize || '');
  startX = e.clientX; startY = e.clientY;
  const rect = panelEl.value ? panelEl.value.getBoundingClientRect() : { width: 310, height: 200 };
  startW = rect.width; startH = rect.height;
  startLeft = store.infoX; startTop = store.infoY;
  e.currentTarget.setPointerCapture(e.pointerId);
  e.preventDefault(); e.stopPropagation();
}

function onPointerMove(e) {
  if (resizing) {
    const dx = e.clientX - startX, dy = e.clientY - startY;
    let w = startW, h = startH, l = startLeft, t = startTop;
    if (resizeEdge.includes('e')) w += dx;
    if (resizeEdge.includes('s')) h += dy;
    if (resizeEdge.includes('w')) { w -= dx; l += dx; }
    if (resizeEdge.includes('n')) { h -= dy; t += dy; }
    store.infoW = Math.max(260, Math.min(620, w));
    store.infoH = Math.max(120, Math.min(760, h));
    store.infoX = l; store.infoY = t;
    store.syncToLegacy();
    return;
  }
  if (!dragging) return;
  store.infoX += e.clientX - dragX;
  store.infoY += e.clientY - dragY;
  dragX = e.clientX; dragY = e.clientY;
  store.syncToLegacy();
}

function onPointerUp(e) {
  if (dragging || resizing) {
    dragging = false; resizing = false; resizeEdge = '';
    // 持久化到后端（双轨期）
    const PS = window.PS;
    if (PS && PS.call) {
      // 位置/尺寸已通过 store.syncToLegacy 同步到 PS.state，调用保存接口
      try { store.syncToLegacy(); } catch {}
    }
  }
  try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
}

function toggleDetails() {
  store.setDetailsCollapsed(!store.infoDetailsCollapsed);
}

function closePanel() {
  store.setInfoVisible(false);
}

onMounted(() => store.hydrateFromLegacy());
</script>

<template>
  <div
    v-if="visible"
    ref="panelEl"
    class="lightbox-info vue-lightbox-info"
    :class="{ 'details-collapsed': collapsed }"
    :style="{ left: store.infoX + 'px', top: store.infoY + 'px', width: store.infoW ? store.infoW + 'px' : undefined, height: store.infoH ? store.infoH + 'px' : undefined }"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <div class="lightbox-info-head" @pointerdown="onHeadPointerDown">
      <span>照片参数</span>
      <button class="lightbox-info-head-btn" :title="collapsed ? '展开详细参数' : '折叠详细参数'" :aria-expanded="collapsed ? 'false' : 'true'" @click="toggleDetails">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
      </button>
      <button class="lightbox-info-close" title="关闭参数" @click="closePanel">×</button>
    </div>
    <div class="lightbox-info-body">
      <LightboxInfoContent :state="state" />
    </div>
    <div class="lightbox-info-resize lightbox-info-resize-n" data-lightbox-info-resize="n" @pointerdown="onResizePointerDown"></div>
    <div class="lightbox-info-resize lightbox-info-resize-e" data-lightbox-info-resize="e" @pointerdown="onResizePointerDown"></div>
    <div class="lightbox-info-resize lightbox-info-resize-s" data-lightbox-info-resize="s" @pointerdown="onResizePointerDown"></div>
    <div class="lightbox-info-resize lightbox-info-resize-w" data-lightbox-info-resize="w" @pointerdown="onResizePointerDown"></div>
    <div class="lightbox-info-resize lightbox-info-resize-ne" data-lightbox-info-resize="ne" @pointerdown="onResizePointerDown"></div>
    <div class="lightbox-info-resize lightbox-info-resize-se" data-lightbox-info-resize="se" @pointerdown="onResizePointerDown"></div>
    <div class="lightbox-info-resize lightbox-info-resize-sw" data-lightbox-info-resize="sw" @pointerdown="onResizePointerDown"></div>
    <div class="lightbox-info-resize lightbox-info-resize-nw" data-lightbox-info-resize="nw" @pointerdown="onResizePointerDown"></div>
  </div>
</template>

<style scoped>
.vue-lightbox-info { position:absolute; background: var(--panel, #1e1e1e); border:1px solid var(--border, #333); border-radius:8px; overflow:hidden; display:flex; flex-direction:column; }
.lightbox-info-head { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; cursor:move; user-select:none; }
.lightbox-info-body { overflow:auto; padding:10px; }
.lightbox-info-resize { position:absolute; width:8px; height:8px; }
.lightbox-info-resize-n { top:0; left:50%; transform:translateX(-50%); cursor:n-resize; width:100%; height:6px; }
.lightbox-info-resize-s { bottom:0; left:50%; transform:translateX(-50%); cursor:s-resize; width:100%; height:6px; }
.lightbox-info-resize-e { right:0; top:50%; transform:translateY(-50%); cursor:e-resize; height:100%; width:6px; }
.lightbox-info-resize-w { left:0; top:50%; transform:translateY(-50%); cursor:w-resize; height:100%; width:6px; }
.lightbox-info-resize-ne { top:0; right:0; cursor:ne-resize; }
.lightbox-info-resize-se { bottom:0; right:0; cursor:se-resize; }
.lightbox-info-resize-sw { bottom:0; left:0; cursor:sw-resize; }
.lightbox-info-resize-nw { top:0; left:0; cursor:nw-resize; }
</style>
