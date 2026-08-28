<script setup>
/**
 * PhotoGrid — 已回退到 legacy 实现
 *
 * 本文件保留仅为兼容历史 import，不再渲染任何内容。
 * 真正的照片墙由 legacy 的 app_gallery.js / app.js 接管：
 *   - #gallery 容器由 Vanilla JS 负责创建 .date-section / .photo-card
 *   - 加载时机由 PS.dateSectionObserver / PS.moreObserver 控制
 *   - 交互（悬停 EXIF、右键、缩放、对比、批量）全部由 legacy 事件委托实现
 *
 * 如需重新启用 Vue 版，按 git 历史恢复本文件并在 main.js 中重新挂载即可
 *（历史版本见 66d2f2c 之前的虚拟滚动版，或 efa1f93 的 #gallery 共享版）。
 * 当前特性开关 vue_photo 默认关闭，mountPhotoGridIsland 不再自动挂载。
 */
import { onMounted, onBeforeUnmount } from 'vue';
onMounted(() => {
  window.__vuePhotoGridActive = false;
  try { delete window.__vuePhotoGridLoad; } catch {}
  try { delete window.__vuePhotoGridRegister; } catch {}
  try { delete window.__vuePhotoGridReset; } catch {}
});
onBeforeUnmount(() => {
  window.__vuePhotoGridActive = false;
});
</script>

<template>
  <div style="display:none" aria-hidden="true" data-photogrid="legacy-fallback"></div>
</template>

<style scoped>
/* 空样式，legacy 使用 assets/style.css */
</style>
