<template>
  <article
    class="photo-card"
    :class="classes"
    :style="cardStyle"
    :data-photo-id="photo ? String(photo.id ?? photo.photo_id ?? '') : ''"
    :data-filename="photo ? String(photo.filename || '') : ''"
    :data-date-key="dateKey"
    :aria-selected="batchIndex > 0 ? 'true' : 'false'"
  >
    <template v-if="photo">
      <img
        v-if="canPreview"
        :src="previewSrc"
        :alt="photo.filename || ''"
        :class="{ loaded }"
        loading="eager"
        decoding="async"
        :data-photo-id="String(photo.id ?? photo.photo_id ?? '')"
        @load="loaded = true"
        @error="onImgError"
      />
      <div v-else class="raw-placeholder">{{ photo.format || 'RAW' }}</div>

      <div class="photo-meta">
        <span class="badge">{{ photo.format_label || photo.format || '' }}</span>
        <!-- legacy 的第二个角标（镜头/EXIF）已按用户要求移除，保留占位节点维持结构 -->
        <span class="badge" style="display:none"></span>
      </div>

      <div v-if="category" class="photo-category-badge" :title="category">{{ categoryBadge }}</div>
      <div v-if="note" class="note-icon photo-note-icon" :data-note="note" tabindex="0">✎</div>

      <div v-if="batchIndex > 0" class="photo-batch-badge"><span aria-hidden="true">✓</span><b>{{ batchIndex }}</b></div>
      <div v-if="compareIndex >= 0" class="photo-compare-badge">{{ compareIndex + 1 }}</div>
    </template>
    <template v-else>
      <div class="placeholder-fill"></div>
    </template>
  </article>
</template>

<script setup>
// P4 · PhotoCard —— 很薄的渲染组件（文档 P4 约束：只负责渲染，不负责调度）。
//
// 调度（加载/预览队列/缩放/滚动副作用）全部在 PhotoGrid.vue；
// 交互（点击/右键/拖拽/悬停）走 PhotoGrid 的容器级事件委托，
// 用 e.target.closest('.photo-card') 反查 —— 取代 legacy 每张卡 addEventListener 的闭包。
//
// 样式沿用 style.css 的全局 .photo-card 体系（favorite/has-note/has-category/
// preview-loaded/preview-error/batch-selected/compare-selected/search-target），
// 迁移不改外观。唯一新增的是定位方式：windowing 下条目不连续，改绝对定位 +
// translate3d（scoped，不影响 legacy 的 grid 布局）。
import { computed, ref } from 'vue';

const props = defineProps({
  // photo 为 null 时渲染占位卡（photoAt 未加载到该下标）
  photo: { type: Object, default: null },
  // windowing 输出的条目：{ index, x, y, col, row }
  item: { type: Object, required: true },
  itemSize: { type: Number, required: true },
  dateKey: { type: String, default: '' },
  // 批量选择序号（1 起，0 = 未选中）—— 来自 batch store 的快照顺序
  batchIndex: { type: Number, default: 0 },
  // 对比槽位（0/1，-1 = 未选中）
  compareIndex: { type: Number, default: -1 },
  // 搜索命中高亮
  searchTarget: { type: Boolean, default: false },
});

const loaded = ref(false);
const failed = ref(false);

const canPreview = computed(() => {
  const p = props.photo;
  return !!(p && (p.previewable || p.original_url || p.preview_url));
});
const previewSrc = computed(() => (props.photo && props.photo.preview_url) || '');
const note = computed(() => (props.photo ? String(props.photo.note || '') : ''));
const category = computed(() => (props.photo ? String(props.photo.category || '').trim() : ''));

// 与 legacy categoryBadgeText 对齐：22×22 徽标只放首字符（全名进 title）。
// 渲染全名会在定宽徽标里一字一行竖排溢出（2026-09 用户截图的「同学照片」竖条）。
const categoryBadge = computed(() => (category.value ? category.value.slice(0, 1) : ''));

const classes = computed(() => {
  const p = props.photo;
  return {
    'photo-placeholder': !p,
    'openable': !!(p && canPreview.value),
    'preview-loaded': !!(p && loaded.value),
    'preview-error': !!(p && (failed.value || p.preview_failed)),
    'favorite': !!(p && p.favorite),
    'has-note': !!note.value,
    'has-category': !!category.value,
    'batch-selected': props.batchIndex > 0,
    'compare-selected': props.compareIndex >= 0,
    'compare-slot-1': props.compareIndex === 0,
    'compare-slot-2': props.compareIndex === 1,
    'search-target': props.searchTarget,
  };
});

const cardStyle = computed(() => ({
  width: props.itemSize + 'px',
  height: props.itemSize + 'px',
  transform: `translate3d(${props.item.x}px, ${props.item.y}px, 0)`,
}));

function onImgError() {
  failed.value = true;
  loaded.value = false;
}
</script>

<style scoped>
.photo-card {
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
}
</style>
