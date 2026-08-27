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

onMounted(() => {
  store.hydrateFromLegacy();
  // 同步 legacy 的打开/关闭：轮询 PS.els.lightbox hidden 状态（双轨期）
  const timer = setInterval(() => store.hydrateFromLegacy(), 800);
  window.__lightboxShellSyncTimer = timer;
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  if (window.__lightboxShellSyncTimer) { clearInterval(window.__lightboxShellSyncTimer); delete window.__lightboxShellSyncTimer; }
  window.removeEventListener('keydown', onKeydown);
});

watch(photo, () => {
  // 轻量同步到 legacy 的 InfoContent
  const PS = window.PS;
  if (PS && PS.updateLightboxInfo) PS.updateLightboxInfo(photo.value);
});
</script>

<template>
  <div v-if="open" class="ps-lightbox-shell" @click.self="close">
    <button class="ps-lightbox-close" title="关闭" @click="close">×</button>
    <LightboxStage v-if="!store.compareOpen" />
    <CompareView v-else />
    <LightboxInfoPanel v-if="!store.compareOpen" />
    <LightboxToolbar />
  </div>
</template>

<style scoped>
.ps-lightbox-shell { position:fixed; inset:0; background: rgba(0,0,0,0.92); z-index: 50; display:flex; flex-direction:column; }
.ps-lightbox-close { position:absolute; top:12px; right:12px; width:32px; height:32px; border-radius:50%; border:1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color:#fff; cursor:pointer; z-index:60; }
</style>
