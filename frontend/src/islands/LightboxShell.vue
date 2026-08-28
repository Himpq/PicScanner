<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useLightboxStore } from '../stores/lightbox.js';
import LightboxStage from '../components/lightbox/LightboxStage.vue';
import LightboxInfoPanel from '../components/lightbox/LightboxInfoPanel.vue';
import LightboxToolbar from '../components/lightbox/LightboxToolbar.vue';
import CompareView from '../components/lightbox/CompareView.vue';

const store = useLightboxStore();
const open = computed(() => store.open);
const photo = computed(() => store.photo);

function close() {
  store.closeLightbox();
}

function onKeydown(e) {
  if (!open.value) return;
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowLeft') store.prevPhoto();
  if (e.key === 'ArrowRight') store.nextPhoto();
}

function isVueLightboxEnabled() {
  try {
    const p = new URLSearchParams(location.search);
    if (p.has('vue_lightbox')) return p.get('vue_lightbox') !== '0';
    const v = localStorage.getItem('vue_lightbox');
    if (v === '0') return false;
    if (v === '1') return true;
    return true;
  } catch { return true; }
}

let hijackTimer = null;
function hijackLegacy() {
  const PS = window.PS;
  if (!PS) return;
  if (PS._vueLightboxHijacked) return;
  // 标记已劫持，避免重复
  PS._vueLightboxHijacked = true;
  const origOpen = PS.openLightbox ? PS.openLightbox.bind(PS) : null;
  const origClose = PS.closeLightbox ? PS.closeLightbox.bind(PS) : null;
  PS._origOpenLightbox = origOpen;
  PS._origCloseLightbox = origClose;
  PS.openLightbox = (p) => {
    if (!isVueLightboxEnabled()) {
      try { const vl = document.getElementById('vue-lightbox'); if (vl) vl.style.display = 'none'; } catch {}
      return origOpen ? origOpen(p) : null;
    }
    store.photo = p || null;
    store.zoom = 1; store.panX = 0; store.panY = 0;
    store.open = true;
    store.syncToLegacy();
    try { const el = document.getElementById('lightbox'); if (el) el.classList.add('hidden'); } catch {}
    try { const vl = document.getElementById('vue-lightbox'); if (vl) vl.style.display = ''; } catch {}
  };
  PS.closeLightbox = () => {
    if (!isVueLightboxEnabled()) return origClose ? origClose() : null;
    store.open = false;
    store.syncToLegacy();
  };
  // 劫持翻页
  if (PS.lightboxNext) {
    PS._origLightboxNext = PS.lightboxNext.bind(PS);
    PS.lightboxNext = () => store.nextPhoto();
  }
  if (PS.lightboxPrev) {
    PS._origLightboxPrev = PS.lightboxPrev.bind(PS);
    PS.lightboxPrev = () => store.prevPhoto();
  }
  console.log('[lightbox] hijack ready, vue=' + isVueLightboxEnabled());
}

onMounted(() => {
  store.hydrateFromLegacy();
  if (typeof window !== 'undefined') window.__lightboxStore = store;
  // 延迟劫持，等待 app_lightbox.js 定义 PS（最多 8s）
  let tries = 0;
  const tryHijack = () => {
    if (window.PS && window.PS.openLightbox) hijackLegacy();
    if (!window.PS || !window.PS._vueLightboxHijacked) { if (tries++ < 32) setTimeout(tryHijack, 250); }
  };
  tryHijack();
  // 兜底：若未劫持成功，仍轮询同步 legacy 状态
  const timer = setInterval(() => {
    if (window.PS && window.PS._vueLightboxHijacked) {
      // 已劫持时，若 legacy 被意外打开则同步关闭
      try {
        const el = document.getElementById('lightbox');
        if (el && !el.classList.contains('hidden') && store.open) el.classList.add('hidden');
      } catch {}
      return;
    }
    store.hydrateFromLegacy();
  }, 800);
  window.__lightboxShellSyncTimer = timer;
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  if (window.__lightboxShellSyncTimer) { clearInterval(window.__lightboxShellSyncTimer); delete window.__lightboxShellSyncTimer; }
  window.removeEventListener('keydown', onKeydown);
});

watch(photo, () => {
  const PS = window.PS;
  if (PS && PS.updateLightboxInfo) PS.updateLightboxInfo(photo.value);
});
</script>

<template>
  <!-- 与 legacy #lightbox 完全同构：复用 style.css 的 .lightbox / .lightbox-stage / .lightbox-toolbar 等样式，做到像素一致 -->
  <!-- loading/previewing 类严格复刻原版 app_lightbox.js 的 els.lightbox.classList 逻辑，驱动 .lightbox-stage::after spinner -->
  <div v-if="open" class="lightbox ps-lightbox-shell" :class="{ 'compare-mode': store.compareOpen, loading: store.loading, previewing: store.previewing }" @click.self="close">
    <button class="lightbox-close" title="关闭" @click="close">×</button>
    <LightboxStage v-if="!store.compareOpen" />
    <CompareView v-else />
    <LightboxInfoPanel v-if="!store.compareOpen && store.infoVisible" />
    <LightboxToolbar />
  </div>
</template>

<style scoped>
/* 复用全局 style.css 的 .lightbox 样式，仅补充 Vue 挂载点需要的层级 */
.ps-lightbox-shell { z-index: 80; }
/* 保持与 legacy 一致：close 为 36x36 圆角8px，非 32px 圆形 */
</style>
<style>
/* 信息面板在 Vue 侧仍通过固定定位复用原版 .lightbox-info 样式，无需额外覆盖 */
#vue-lightbox .lightbox-info { z-index: 83; }
</style>
