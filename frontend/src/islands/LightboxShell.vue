<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useLightboxStore } from '../stores/lightbox.js';
import { useLegacySync } from '../composables/useLegacySync.js';
import LightboxStage from '../components/lightbox/LightboxStage.vue';
import LightboxInfoPanel from '../components/lightbox/LightboxInfoPanel.vue';
import LightboxToolbar from '../components/lightbox/LightboxToolbar.vue';
import CompareView from '../components/lightbox/CompareView.vue';
import { log } from '../utils/log.js';

const store = useLightboxStore();
const open = computed(() => store.open);
const photo = computed(() => store.photo);

function close() {
  const PS = window.PS;
  // 对比灯箱退出时同步收起上层 ComparePanel 并清空选中，关闭按钮/Esc 行为一致
  if (store.compareOpen) {
    store.compareOpen = false;
    store.compareSelected = [null, null];
    store.syncToLegacy();
    if (PS && PS.state && PS.state.compare) {
      PS.state.compare.lightbox = false;
      PS.state.compare.open = false;
      PS.state.compare.selected = [null, null];
      try { if (PS.state.compare.panel) PS.state.compare.panel.classList.add('hidden'); } catch {}
      try { if (typeof PS.renderComparePanel === 'function') PS.renderComparePanel(); } catch {}
      try { if (typeof PS.updateCompareCardHighlights === 'function') PS.updateCompareCardHighlights(); } catch {}
    }
    if (PS && typeof PS._origCloseLightbox === 'function') {
      try { PS._origCloseLightbox(); } catch {}
    } else if (PS && PS.els) {
      try {
        if (PS.els.lightbox) PS.els.lightbox.classList.add('hidden');
        if (PS.els.lightboxCompare) PS.els.lightboxCompare.classList.add('hidden');
        if (PS.els.compareToolbar) PS.els.compareToolbar.classList.add('hidden');
        if (PS.els.lightbox) PS.els.lightbox.classList.remove('compare-mode');
      } catch {}
    }
    store.open = false;
    return;
  }
  store.closeLightbox();
}

function onKeydown(e) {
  // 仅当 Vue 灯箱真正打开时才拦截键盘；画廊里的对比面板（c 打开的 compare.open）
  // 完全由 legacy app.js 的 document keydown 处理，Vue 不抢占避免 Esc 失效。
  if (!open.value) return;
  if (e.target && typeof e.target.closest === 'function') {
    const tag = String(e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
  }
  // 灯箱内按 c：若处于对比则退出对比（等同 Esc 关闭灯箱），否则不处理（legacy 在灯箱非对比时 c 无动作）
  if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (store.compareOpen) {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    close();
    return;
  }
  if (!store.compareOpen) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); store.prevPhoto(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); store.nextPhoto(); }
  }
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
    const wasCompare = !!store.compareOpen;
    store.open = false;
    store.compareOpen = false;
    if (wasCompare) store.compareSelected = [null, null];
    store.syncToLegacy();
    if (PS.state && PS.state.compare) {
      PS.state.compare.lightbox = false;
      if (wasCompare) {
        PS.state.compare.open = false;
        PS.state.compare.selected = [null, null];
        try { if (PS.state.compare.panel) PS.state.compare.panel.classList.add('hidden'); } catch {}
        try { if (typeof PS.renderComparePanel === 'function') PS.renderComparePanel(); } catch {}
        try { if (typeof PS.updateCompareCardHighlights === 'function') PS.updateCompareCardHighlights(); } catch {}
      }
    }
    // 若是对比关闭，仍需清理 legacy 的 DOM（compare-mode 等），否则下次打开会有残留
    if (wasCompare && origClose) {
      try { origClose(); } catch {}
      return;
    }
    // 非对比的普通关闭也确保 legacy DOM 隐藏（Vue 已通过 v-if 隐藏，但 legacy 的 #lightbox 可能仍需 hidden）
    try {
      const els = PS.els;
      if (els) {
        if (els.lightbox) els.lightbox.classList.add('hidden');
        if (els.lightboxCompare) els.lightboxCompare.classList.add('hidden');
        if (els.compareToolbar) els.compareToolbar.classList.add('hidden');
        if (els.lightbox) els.lightbox.classList.remove('compare-mode');
      }
    } catch {}
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
  log('[lightbox] hijack ready, vue=' + isVueLightboxEnabled());
}

// P1：灯箱开关走 app_lightbox.js 的 PS.notifyVue()，由 rAF 合并驱动；
// 代理未安装时才回退 800ms 轮询
useLegacySync(() => store.hydrateFromLegacy(), 800);

onMounted(() => {
  if (typeof window !== 'undefined') window.__lightboxStore = store;
  // 延迟劫持，等待 app_lightbox.js 定义 PS（最多 8s）
  let tries = 0;
  const tryHijack = () => {
    if (window.PS && window.PS.openLightbox) hijackLegacy();
    if (!window.PS || !window.PS._vueLightboxHijacked) { if (tries++ < 32) setTimeout(tryHijack, 250); }
  };
  tryHijack();
  // 已劫持时，若 legacy #lightbox 被意外显示，则立即收起（改用 MutationObserver，不再轮询）
  watchLegacyVisibility();
  window.addEventListener('keydown', onKeydown);
});

// legacy #lightbox 显隐对账。用 MutationObserver 取代原先定时器里的每轮 classList 检查
let legacyObserver = null;
function watchLegacyVisibility() {
  const el = document.getElementById('lightbox');
  if (!el || typeof MutationObserver === 'undefined') return;
  legacyObserver = new MutationObserver(() => {
    try {
      if (!el.classList.contains('hidden') && store.open) el.classList.add('hidden');
    } catch {}
  });
  legacyObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
}

onBeforeUnmount(() => {
  if (legacyObserver) { legacyObserver.disconnect(); legacyObserver = null; }
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
