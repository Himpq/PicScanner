<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { useGalleryStore } from '../../stores/gallery.js';
import { useBatchStore } from '../../stores/batch.js';

const store = useGalleryStore();
const batch = useBatchStore();
const dates = computed(() => store.dates);

const galleryEl = ref(null);
let io = null;
const sectionEls = new Map();

function photosFor(d) { return store.photosForDate(d.date_key); }
function isLoading(d) { return store.isPhotoLoading(d.date_key); }
function totalFor(d) { return Number(store.dateCounts.get(d.date_key) || d.count || 0); }
function loadedFor(d) { return photosFor(d).length; }
function hasMore(d) { return loadedFor(d) < totalFor(d); }

function thumbUrl(photo) {
  return photo.thumbnail_url || photo.preview_url || photo.lightbox_url || '';
}

function openLightbox(photo) {
  const PS = window.PS;
  if (PS && typeof PS.openLightbox === 'function') {
    PS.openLightbox(photo);
    return;
  }
  // 兜底：直接更新 lightbox store
  import('../../stores/lightbox.js').then(({ useLightboxStore }) => {
    useLightboxStore().openLightbox(photo);
  });
}

function toggleBatch(photo, ev) {
  // Ctrl/Meta 多选
  if (ev && (ev.ctrlKey || ev.metaKey)) {
    const PS = window.PS;
    if (PS && PS.batchSelectionController && typeof PS.batchSelectionController.toggle === 'function') {
      PS.batchSelectionController.toggle(photo);
      batch.hydrateFromLegacy();
      return;
    }
  }
  openLightbox(photo);
}

function onContextMenu(photo, ev) {
  ev.preventDefault();
  const PS = window.PS;
  if (PS && typeof PS.showPhotoContextMenu === 'function') {
    PS.showPhotoContextMenu(ev.clientX, ev.clientY, photo);
  }
}

function observeSection(el, dateKey) {
  if (!io || !el) return;
  sectionEls.set(dateKey, el);
  io.observe(el);
}

function setupObserver() {
  if (io) io.disconnect();
  io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const key = entry.target.dataset.date;
      if (!key) return;
      // 首屏与滚动按需加载
      if (hasMore({ date_key: key, count: totalFor({ date_key: key }) })) {
        store.fetchPhotosForDate(key).catch(()=>{});
      }
    });
  }, { root: document.getElementById('gallery-scroll') || null, rootMargin: '600px 0px' });
  // 已有 section 重新观察
  sectionEls.forEach((el) => io.observe(el));
}

function loadMore(dateKey) {
  if (hasMore({ date_key: dateKey })) store.fetchPhotosForDate(dateKey).catch(()=>{});
}

onMounted(() => {
  store.hydrateFromLegacy();
  batch.hydrateFromLegacy();
  if (!dates.value.length) store.fetchDates().catch(()=>{});
  nextTick(() => setupObserver());
  // 滚动兜底： legacy 的占位填充仍触发一次
  const PS = window.PS;
  if (PS && typeof PS.schedulePlaceholderPhotoFill === 'function') PS.schedulePlaceholderPhotoFill();
});

onBeforeUnmount(() => {
  if (io) { io.disconnect(); io = null; }
  sectionEls.clear();
});

watch(dates, () => {
  nextTick(() => {
    setupObserver();
    // 新日期出现时立即尝试加载首屏
    dates.value.forEach((d) => {
      if (loadedFor(d) === 0 && totalFor(d) > 0) store.fetchPhotosForDate(d.date_key).catch(()=>{});
    });
  });
}, { deep: false });
</script>

<template>
  <div ref="galleryEl" class="ps-photo-grid-host">
    <div v-if="!dates.length" class="gallery-empty">
      <p>暂无照片</p>
      <small>扫描完成后照片会按日期分组显示于此。Vue 已接管真实渲染，缩略图按需加载。</small>
    </div>
    <div v-else class="gallery-vue-real">
      <section
        v-for="d in dates"
        :key="d.date_key"
        class="date-section vue-date-section"
        :id="'date-' + d.date_key"
        :data-date="d.date_key"
        :ref="(el) => observeSection(el, d.date_key)"
      >
        <div class="date-header"><strong>{{ d.date_key }}</strong><span>{{ totalFor(d) }} 张 · 已加载 {{ loadedFor(d) }}</span></div>
        <div class="photo-grid" :style="{ '--photo-min-size': store.galleryItemSizeRaw + 'px' }">
          <article
            v-for="photo in photosFor(d)"
            :key="photo.id || photo.photo_id || photo.path"
            class="photo-card"
            :class="{ 'batch-selected': batch.selected.some(p => (p.id || p.photo_id) === (photo.id || photo.photo_id)) }"
            :data-photo-id="photo.id || photo.photo_id"
            @click="toggleBatch(photo, $event)"
            @contextmenu="onContextMenu(photo, $event)"
          >
            <img v-if="thumbUrl(photo)" :src="thumbUrl(photo)" loading="lazy" alt="" draggable="false" />
            <div v-else class="placeholder-fill"></div>
            <div v-if="photo.favorite" class="photo-fav-badge">★</div>
          </article>
          <!-- 未加载的占位 -->
          <div v-for="i in Math.max(0, Math.min(8, totalFor(d) - loadedFor(d)))" :key="'ph-'+i" class="photo-card photo-placeholder">
            <div class="placeholder-fill"></div>
          </div>
        </div>
        <div class="date-more" @click="loadMore(d.date_key)">
          <span v-if="isLoading(d)">加载中...</span>
          <span v-else-if="hasMore(d)">点击或滚动加载更多（{{ loadedFor(d) }}/{{ totalFor(d) }}）</span>
          <span v-else>已加载全部</span>
        </div>
      </section>
      <div class="older-sentinel" @click="store.fetchDates().catch(()=>{})">
        <span v-if="store.loadingDates">加载日期中...</span>
        <span v-else-if="store.noMoreDates">没有更早日期</span>
        <span v-else>点击加载更早日期</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-empty { padding: 24px; color: var(--muted, #9aa0a6); text-align:center; }
.gallery-empty small { display:block; margin-top:8px; font-size:12px; line-height:1.6; max-width:520px; margin-left:auto; margin-right:auto; }
.vue-date-section { margin-bottom: 18px; }
.photo-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(var(--photo-min-size,168px), 1fr)); gap:10px; }
.photo-card { position:relative; aspect-ratio: 1; overflow:hidden; border-radius:8px; background: #0d0d10; cursor:pointer; }
.photo-card img { width:100%; height:100%; object-fit:cover; display:block; }
/* 选中描边统一由 batch_processing.css 的 .photo-card.batch-selected::after 承载（z-index 高于图片），此处不再重复定义 */
.photo-fav-badge { position:absolute; top:6px; right:6px; width:20px; height:20px; border-radius:50%; background: #ffb817; color:#000; display:grid; place-items:center; font-size:11px; }
.date-header { display:flex; align-items:baseline; gap:10px; padding:8px 2px; }
.date-header strong { font-size:14px; font-weight:700; }
.date-header span { font-size:12px; color: var(--muted, #9aa0a6); }
.date-more, .older-sentinel { padding:10px; text-align:center; font-size:12px; color: var(--muted, #9aa0a6); cursor:pointer; border:1px dashed transparent; border-radius:8px; }
.date-more:hover, .older-sentinel:hover { border-color: rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); }
</style>
