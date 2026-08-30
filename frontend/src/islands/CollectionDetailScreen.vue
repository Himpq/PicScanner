<!-- P3：集锦详情屏，由 main.js 直接挂载到 #collection-detail-screen 本身（不是它的子节点）。
     .collection-detail-screen 是 display:flex column，且 .entering 动画直接作用在
     .collection-detail-topbar 与 .collection-detail-scroll 上 ——
     所以这两个根节点必须是容器的直接子项，中间不能包一层 div。
     注释放在 template 外，避免被渲染成 DOM 节点。 -->
<template>
  <div class="collection-detail-topbar">
    <button class="ghost-btn back-btn" type="button" @click="goBack">
      <span aria-hidden="true">←</span><span>返回集锦</span>
    </button>
    <div class="collection-detail-title">{{ title }}</div>
    <div class="toolbar-spacer"></div>
    <span v-if="subtitle" class="collections-meta detail-date">{{ subtitle }}</span>
    <span v-if="countText" class="collections-meta detail-count">{{ countText }}</span>
    <span v-if="store.detailStatus" class="collections-meta" style="opacity:.7">{{ store.detailStatus }}</span>
  </div>
  <div class="collection-detail-scroll">
    <div v-if="!photos.length" class="collections-empty">该集锦暂无照片</div>
    <div
      v-else
      class="mosaic mosaic--detail"
      :class="{ single: photos.length === 1, 'count-2': photos.length === 2 }"
    >
      <div
        v-for="p in photos"
        :key="p.id"
        class="mosaic-item"
        :data-photo-id="String(p.id)"
        @click="store.openPhoto(p.id)"
      >
        <img
          loading="lazy"
          :alt="p.filename || ''"
          :src="srcOf(p)"
          :style="styleOf(p)"
          @error="onImgError"
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCollectionsStore } from '../stores/collections.js';

const store = useCollectionsStore();

const photos = computed(() => store.detailPhotos);
const title = computed(() => (store.detail && store.detail.title) || '—');
const subtitle = computed(() => store.detailSubtitle);
const countText = computed(() => (store.detailCount ? store.detailCount + ' 张' : ''));

function srcOf(p) {
  return p.preview_url || p.thumbnail_url || '';
}

// 无预览图时套占位渐变（legacy 是 img.style.background + minHeight）
function styleOf(p) {
  if (srcOf(p)) return null;
  return { background: 'linear-gradient(135deg, #1a1a1f, #0a0a0c)', minHeight: '100%' };
}

function onImgError(e) {
  try { e.target.style.display = 'none'; } catch {}
}

function goBack() {
  const PS = window.PS;
  // 走 legacy，容器 leaving 动画与 state.collectionDetailOpen 都在那里
  if (PS && typeof PS.closeCollectionDetail === 'function') PS.closeCollectionDetail();
  else store.closeDetail();
}
</script>

<style scoped>
/* 布局（flex column / topbar 高度 / scroll margin 与响应式）由 collections.css 负责，
   这里只补 style.css 主动隐藏、但内容溢出时应该有提示的滚动条。 */
.collection-detail-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}
.collection-detail-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.collection-detail-scroll::-webkit-scrollbar-track { background: transparent; }
.collection-detail-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 4px;
}
.collection-detail-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
</style>
