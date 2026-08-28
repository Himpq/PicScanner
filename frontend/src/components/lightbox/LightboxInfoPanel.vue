<script setup>
import { computed, ref, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useLightboxStore } from '../../stores/lightbox.js';
import LightboxInfoContent from '../../lightbox/LightboxInfoContent.vue';
import { LIGHTBOX_INFO_MIN_WIDTH, LIGHTBOX_INFO_MAX_WIDTH, LIGHTBOX_INFO_MIN_HEIGHT, LIGHTBOX_INFO_MAX_HEIGHT } from '../../constants.js';

const store = useLightboxStore();
const photo = computed(() => store.photo);
const visible = computed(() => store.infoVisible);
const collapsed = computed(() => store.infoDetailsCollapsed);

const state = reactive({ photo: photo.value });
watch(photo, (v) => { state.photo = v; });

let dragging = false;
let dragX = 0, dragY = 0;
let resizing = false;
let resizeEdge = '';
let startX = 0, startY = 0, startW = 310, startH = 200, startLeft = 18, startTop = 18;
let activePointerId = null;
const panelEl = ref(null);

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function clampPosition() {
  if (!panelEl.value) return;
  const rect = panelEl.value.getBoundingClientRect();
  const pad = 12;
  const titlebar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--titlebar-h')) || 36;
  const minX = pad;
  const minY = titlebar + pad;
  const maxX = Math.max(minX, window.innerWidth - rect.width - pad);
  const maxY = Math.max(minY, window.innerHeight - rect.height - 68);
  store.infoX = clamp(store.infoX, minX, maxX);
  store.infoY = clamp(store.infoY, minY, maxY);
  store.syncToLegacy();
}

function scheduleLayout() {
  if (!visible.value) return;
  // 注意：Vue 模式下，store 会给【旧的】#lightbox 元素加 hidden 以隐藏 legacy 灯箱，
  // 因此绝不能用 PS.els.lightbox.hidden 作为判据（会误杀 Vue 面板的布局）。
  // 面板自身可见性已由 v-if="visible" 与下方 !panelEl.value 守卫，无需此检查。
  requestAnimationFrame(() => {
    if (!visible.value || !panelEl.value) return;
    const head = panelEl.value.querySelector('#lightbox-info-head');
    const body = panelEl.value.querySelector('#lightbox-info-body');
    const headH = head ? Math.ceil(head.getBoundingClientRect().height) : 34;
    const maxH = Math.min(LIGHTBOX_INFO_MAX_HEIGHT, window.innerHeight - 90);

    if (collapsed.value) {
      // 折叠：仅显示摘要。测量摘要高度（details 已 display:none，测量可靠），设死高度。
      const curH = panelEl.value.getBoundingClientRect().height;
      const prevBodyMax = body ? body.style.maxHeight : '';
      const prevBodyOverflow = body ? body.style.overflow : '';
      let bodyH = 0;
      try {
        if (body) { body.style.maxHeight = 'none'; body.style.overflow = 'visible'; }
        bodyH = body ? Math.ceil(body.getBoundingClientRect().height) : 0;
      } finally {
        if (body) { body.style.maxHeight = prevBodyMax; body.style.overflow = prevBodyOverflow; }
      }
      const targetH = Math.round(clamp(headH + bodyH + 2, LIGHTBOX_INFO_MIN_HEIGHT, maxH));
      if (Math.abs(targetH - curH) > 1) {
        store.infoH = targetH;
        store.syncToLegacy();
      }
      if (window.PS && window.PS.call) window.PS.call('log', { fn: 'scheduleLayout', mode: 'collapse', curH, bodyH, targetH, infoH: store.infoH }).catch(() => {});
    } else {
      // 展开：直接清除内联高度，交给 CSS 自动撑满内容（避免 overflow/max-height 测量失真）。
      // 这是“展开=按内容贴合”的最稳做法：面板无固定高度时，block 元素自然贴合内容。
      const hadFixed = !!store.infoH;
      store.infoH = 0;
      store.syncToLegacy();
      const newH = Math.round(panelEl.value.getBoundingClientRect().height);
      if (window.PS && window.PS.call) window.PS.call('log', { fn: 'scheduleLayout', mode: 'expand', hadFixed, newH, infoH: store.infoH }).catch(() => {});
    }
    clampPosition();
  });
}

function onHeadPointerDown(e) {
  if (e.button !== 0) return;
  // 关键修复：点击折叠/关闭按钮时不要启动拖拽，否则 setPointerCapture 会吞掉
  // 按钮的 click 事件，导致 toggle / close 失效。让按钮自身的 @click 正常触发。
  if (e.target && e.target.closest && e.target.closest('#lightbox-info-details-toggle, #lightbox-info-close')) {
    return;
  }
  dragging = true;
  dragX = e.clientX; dragY = e.clientY;
  activePointerId = e.pointerId;
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  try { panelEl.value?.classList.add('dragging'); } catch {}
  window.addEventListener('pointermove', onWindowPointerMove);
  window.addEventListener('pointerup', onWindowPointerUp);
  window.addEventListener('pointercancel', onWindowPointerUp);
  e.preventDefault();
  e.stopPropagation();
}

function onResizePointerDown(e) {
  const handle = e.target.closest('[data-lightbox-info-resize]');
  if (!handle) return;
  resizing = true;
  resizeEdge = String(handle.dataset.lightboxInfoResize || '');
  startX = e.clientX; startY = e.clientY;
  const rect = panelEl.value ? panelEl.value.getBoundingClientRect() : { width: LIGHTBOX_INFO_MIN_WIDTH, height: LIGHTBOX_INFO_MIN_HEIGHT };
  startW = rect.width; startH = rect.height;
  startLeft = store.infoX; startTop = store.infoY;
  activePointerId = e.pointerId;
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  try { panelEl.value?.classList.add('resizing'); } catch {}
  window.addEventListener('pointermove', onWindowPointerMove);
  window.addEventListener('pointerup', onWindowPointerUp);
  window.addEventListener('pointercancel', onWindowPointerUp);
  e.preventDefault(); e.stopPropagation();
}

function onWindowPointerMove(e) {
  if (resizing) {
    const dx = e.clientX - startX, dy = e.clientY - startY;
    let w = startW, h = startH, l = startLeft, t = startTop;
    if (resizeEdge.includes('e')) w += dx;
    if (resizeEdge.includes('s')) h += dy;
    if (resizeEdge.includes('w')) { w -= dx; l += dx; }
    if (resizeEdge.includes('n')) { h -= dy; t += dy; }
    const cleanW = clamp(w, LIGHTBOX_INFO_MIN_WIDTH, Math.min(LIGHTBOX_INFO_MAX_WIDTH, window.innerWidth - 24));
    const cleanH = clamp(h, LIGHTBOX_INFO_MIN_HEIGHT, Math.min(LIGHTBOX_INFO_MAX_HEIGHT, window.innerHeight - 90));
    if (resizeEdge.includes('w')) l += w - cleanW;
    if (resizeEdge.includes('n')) t += h - cleanH;
    store.infoW = Math.round(cleanW);
    store.infoH = Math.round(cleanH);
    store.infoX = l; store.infoY = t;
    clampPosition();
    e.preventDefault(); e.stopPropagation();
    return;
  }
  if (!dragging) return;
  store.infoX += e.clientX - dragX;
  store.infoY += e.clientY - dragY;
  dragX = e.clientX; dragY = e.clientY;
  clampPosition();
  e.preventDefault(); e.stopPropagation();
}

function onWindowPointerUp(e) {
  if (activePointerId !== null && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
  if (dragging || resizing) {
    const wasResizing = resizing;
    dragging = false; resizing = false; resizeEdge = '';
    activePointerId = null;
    try { panelEl.value?.classList.remove('dragging'); } catch {}
    try { panelEl.value?.classList.remove('resizing'); } catch {}
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('pointercancel', onWindowPointerUp);
    clampPosition();
    // 严格复刻原版 suppressCloseUntil，避免拖拽结束后的 click 误关闭灯箱
    try {
      const PS2 = window.PS;
      if (PS2 && PS2.state && PS2.state.lightbox) PS2.state.lightbox.suppressCloseUntil = Date.now() + 260;
    } catch {}
    // 持久化到后端 — 与原版 saveLightboxInfoPosition/saveLightboxInfoSize 一致
    const PS = window.PS;
    if (PS && PS.call) {
      try {
        const pos = { x: Math.round(store.infoX), y: Math.round(store.infoY) };
        const size = { width: Math.round(store.infoW || LIGHTBOX_INFO_MIN_WIDTH), height: Math.round(store.infoH || panelEl.value?.getBoundingClientRect().height || LIGHTBOX_INFO_MIN_HEIGHT) };
        if (wasResizing) PS.call('set_lightbox_info_size', size).catch(()=>{});
        PS.call('set_lightbox_info_position', pos).catch(()=>{});
      } catch {}
    }
    try { e.target.releasePointerCapture?.(e.pointerId); } catch {}
    e.stopPropagation();
  }
}

// 兼容模板上残留的 @pointermove/@pointerup（不再依赖）
function onPointerMove() {}
function onPointerUp() {}

function toggleDetails() {
  const next = !store.infoDetailsCollapsed;
  if (window.PS && window.PS.call) {
    window.PS.call('log', { fn: 'toggleDetails', nextCollapsed: next }).catch(() => {});
  }
  store.setDetailsCollapsed(next);
  // 折叠/展开后重新计算高度与位置，避免空白或溢出
  setTimeout(scheduleLayout, 20);
}

function closePanel() {
  store.setInfoVisible(false);
}

onMounted(() => {
  // 初始钳制，避免首次出现即在可视区外
  setTimeout(() => { clampPosition(); scheduleLayout(); }, 50);
  window.addEventListener('resize', clampPosition);
});
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onWindowPointerMove);
  window.removeEventListener('pointerup', onWindowPointerUp);
  window.removeEventListener('pointercancel', onWindowPointerUp);
  window.removeEventListener('resize', clampPosition);
});
watch(visible, (v) => { if (v) setTimeout(scheduleLayout, 30); });
watch(collapsed, () => setTimeout(scheduleLayout, 30));
watch(photo, () => setTimeout(scheduleLayout, 30));
</script>

<template>
  <div
    v-if="visible"
    ref="panelEl"
    id="lightbox-info"
    class="lightbox-info"
    :class="{ 'details-collapsed': collapsed }"
    :style="{ left: store.infoX + 'px', top: store.infoY + 'px', width: store.infoW ? store.infoW + 'px' : undefined, height: store.infoH ? store.infoH + 'px' : undefined }"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <div id="lightbox-info-head" class="lightbox-info-head" @pointerdown="onHeadPointerDown">
      <span>照片参数</span>
      <button id="lightbox-info-details-toggle" class="lightbox-info-head-btn" :title="collapsed ? '展开详细参数' : '折叠详细参数'" :aria-expanded="collapsed ? 'false' : 'true'" @click="toggleDetails">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
      </button>
      <button id="lightbox-info-close" class="lightbox-info-close" title="关闭参数" @click="closePanel">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
      </button>
    </div>
    <div id="lightbox-info-body" class="lightbox-info-body">
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
/* 复用 style.css 的 .lightbox-info / .lightbox-info-head / .lightbox-info-resize-*，不再自定义 position/background/border，确保 fixed 定位与 310px 宽度一致 */
</style>
