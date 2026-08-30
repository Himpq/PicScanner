<script setup>
import { computed } from 'vue';
import { useCollectionsStore } from '../stores/collections.js';

const store = useCollectionsStore();
const items = computed(() => store.items);
const loading = computed(() => store.loading);
const generating = computed(() => store.generating);
const status = computed(() => store.status);
const count = computed(() => store.count);

function close() {
  const PS = window.PS;
  if (PS && PS.closeCollections) PS.closeCollections();
}

function refresh() {
  store.fetchList();
}

function generate() {
  store.generate();
}

function openDetail(col) {
  // 走 requestDetail：容器显隐动画还在 legacy 的 PS.openCollectionDetail，
  // 它回调回来才由 store 取数渲染。直接用 store.openDetail 的话容器不会显示。
  store.requestDetail(col);
}

function typeLabel(col) {
  return col.type === 'geo' ? '地理' : '语义';
}

function photoCount(col) {
  return col.photo_count || (col.photo_ids || []).length || 0;
}

function timeRange(col) {
  if (!col.time_start) return '';
  return col.time_start + ' ~ ' + (col.time_end || '');
}

function mosaicClass(col) {
  const n = (col.photos || []).length;
  return {
    single: n === 1,
    'count-2': n === 2,
  };
}

function onImgError(ev) {
  if (ev && ev.target) ev.target.style.display = 'none';
}

function placeholderStyle(p) {
  return p.preview_url ? {} : { background: 'linear-gradient(135deg, #1a1a1f, #0a0a0c)' };
}
</script>

<!-- P3：多根组件，由 main.js 直接挂载到 #collections-screen 本身。
     .collections-screen 是 display:flex column，两个根节点必须成为它的直接子项：
       .collections-topbar  (flex:none, height:48px)
       .collections-scroll  (flex:1, min-height:0, overflow:auto)
     中间不能多包一层 div，否则 flex 高度约束与滚动都会失效。

     类名沿用 collections.css 里的 .collections-* / .collection-card / .mosaic*，
     保证迁移前后外观一致 —— 与来源屏同样的判断：迁移不应改变外观，
     且 Vanilla DOM 已删除，不存在样式冲突。

     详情页（#collection-detail-screen）也是 Vue（islands/CollectionDetailScreen.vue），
     灯箱导航也搬进了 stores/lightbox.js 的 navList。
     但两个容器的显隐动画仍在 legacy，所以点击卡片仍走
     PS.openCollectionDetail —— 它做容器动画，再把取数转给这里的 store。 -->
<template>
  <div class="collections-topbar">
    <button class="ghost-btn back-btn" type="button" @click="close">
      <span aria-hidden="true">←</span><span>返回图库</span>
    </button>
    <div class="collections-title">集锦</div>
    <span class="collections-meta">{{ count }} 个集锦</span>
    <span v-if="status" class="collections-meta" style="margin-left:8px;opacity:.7">{{ status }}</span>
    <div class="toolbar-spacer"></div>
    <button class="ghost-btn small" type="button" :disabled="loading" @click="refresh">刷新</button>
    <button
      class="ghost-btn small generate-btn"
      type="button"
      :disabled="generating"
      @click="generate"
    >{{ generating ? '生成中…' : '生成集锦' }}</button>
  </div>

  <div class="collections-scroll">
    <div v-if="!items.length" class="collections-empty">
      {{ status || '暂无集锦，点击“生成集锦”基于语义聚类创建' }}
    </div>

    <div class="collections-grid">
      <div
        v-for="col in items"
        :key="col.id"
        class="collection-card"
        @click="openDetail(col)"
      >
        <div class="collection-head">
          <h3>{{ col.title || '未命名' }}<span class="badge">{{ typeLabel(col) }} · {{ photoCount(col) }}张</span></h3>
          <div class="sub">{{ col.subtitle || '' }}</div>
        </div>

        <div class="mosaic" :class="mosaicClass(col)">
          <template v-if="(col.photos || []).length">
            <div
              v-for="(p, idx) in (col.photos || []).slice(0, 7)"
              :key="p.id || idx"
              class="mosaic-item"
              :data-photo-id="String(p.id)"
              :data-collection-id="String(col.id)"
            >
              <img
                loading="lazy"
                :alt="p.filename || ''"
                :src="p.preview_url || ''"
                :style="placeholderStyle(p)"
                @error="onImgError"
              >
              <div v-if="idx === 6 && photoCount(col) > 7" class="mosaic-more">+{{ photoCount(col) - 7 }}</div>
            </div>
          </template>
          <div v-else class="mosaic-placeholder">暂无预览</div>
        </div>

        <div class="collection-foot">
          <button class="ghost-btn small" type="button" data-action="open">
            查看全部 {{ photoCount(col) }} 张
          </button>
          <span class="collection-foot-time">{{ timeRange(col) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 生成按钮沿用 index.html 里的内联高亮色 */
.generate-btn {
  background: rgba(224,164,90,0.18);
  border-color: rgba(224,164,90,0.4);
}

/* collections.css 把 .collections-scroll 设成了 scrollbar-width:none */
.collections-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.22) transparent;
}
.collections-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.collections-scroll::-webkit-scrollbar-track { background: transparent; }
.collections-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.18);
  border-radius: 4px;
}
.collections-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.32); }

.mosaic-placeholder {
  display: grid;
  place-items: center;
  color: var(--muted, #9aa0a6);
  font-size: 12px;
  min-height: 184px;
}

.collection-foot-time {
  margin-left: auto;
  color: var(--muted, #9aa0a6);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}
</style>
