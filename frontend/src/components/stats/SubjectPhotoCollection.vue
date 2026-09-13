<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { call } from '../../bridge/index.js';
import { logWarn } from '../../utils/log.js';
import { useLightboxStore } from '../../stores/lightbox.js';

const lightbox = useLightboxStore();

const props = defineProps({ sourceId: String, labelKey: String, label: String });
defineEmits(['close']);
const items = ref([]);
const total = ref(0);
const loading = ref(false);
const error = ref('');
const hasMore = ref(true);
const sentinel = ref(null);
let afterId = 0;
let generation = 0;
let observer;

async function preview(item, token) {
  item.loading = true;
  item.photo = null;
  item.error = '';
  try {
    const result = await call('get_photo_preview', item.photo_id);
    if (!result?.success || !result.photo?.preview_url) throw new Error(result?.message || '预览加载失败');
    if (token === generation) item.photo = result.photo;
  } catch (err) {
    if (token === generation) {
      item.error = String(err?.message || err);
      logWarn('[SubjectPhotoCollection] preview failed', { photoId: item.photo_id, error: item.error });
    }
  } finally {
    if (token === generation) item.loading = false;
  }
}

async function loadMore() {
  if (loading.value || !hasMore.value || !props.sourceId || !props.labelKey) return;
  const token = generation;
  loading.value = true;
  error.value = '';
  try {
    const result = await call('module_api', 'visual_stats', 'photos', props.sourceId, props.labelKey, afterId, 48);
    if (token !== generation) return;
    if (!result?.success) throw new Error(result?.message || '题材照片加载失败');
    total.value = result.total;
    afterId = result.next_after;
    hasMore.value = result.has_more;
    const start = items.value.length;
    items.value.push(...result.items.map(item => ({ ...item, photo: null, loading: false, error: '' })));
    // Bound preview generation so a page cannot saturate the Python bridge.
    let index = start;
    const end = items.value.length;
    await Promise.all(Array.from({ length: Math.min(4, end - start) }, async () => {
      while (token === generation && index < end) {
        const item = items.value[index++];
        await preview(item, token);
      }
    }));
  } catch (err) {
    if (token === generation) {
      error.value = String(err?.message || err);
      logWarn('[SubjectPhotoCollection] page failed', error.value);
    }
  } finally {
    if (token === generation) {
      loading.value = false;
      await nextTick();
      if (observer && sentinel.value) {
        observer.unobserve(sentinel.value);
        if (!error.value && hasMore.value) observer.observe(sentinel.value);
      }
    }
  }
}

function openPhoto(item) {
  if (item.error) { preview(item, generation); return; }
  if (item.photo) {
    lightbox.setNavList(items.value.filter(entry => entry.photo).map(entry => entry.photo));
    lightbox.openLightbox(item.photo);
  }
}

watch(() => [props.sourceId, props.labelKey], async () => {
  generation += 1;
  observer?.disconnect();
  items.value = [];
  total.value = 0;
  afterId = 0;
  hasMore.value = true;
  loading.value = false;
  error.value = '';
  const token = generation;
  await nextTick();
  if (token !== generation) return;
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting) && !error.value) loadMore();
  }, { rootMargin: '240px' });
  await loadMore();
}, { immediate: true });

onBeforeUnmount(() => { generation += 1; observer?.disconnect(); });
</script>

<template>
  <section class="subject-collection">
    <header>
      <h3>{{ label }} <span>{{ total }} 张</span></h3>
      <button class="ghost-btn small" type="button" @click="$emit('close')">收起</button>
    </header>
    <div class="mosaic mosaic--detail" :class="{ single: items.length === 1, 'count-2': items.length === 2 }">
      <button v-for="item in items" :key="item.photo_id" class="mosaic-item subject-photo" type="button"
        :disabled="!item.photo && !item.error" :title="item.error || item.filename" @click="openPhoto(item)">
        <img v-if="item.photo" :src="item.photo.preview_url" :alt="item.filename" loading="lazy"
          @error="item.error = '预览显示失败，点击重试'">
        <span v-else class="subject-placeholder">{{ item.error ? '点击重试' : '加载中…' }}</span>
        <span v-if="item.error && item.photo" class="subject-photo-error">点击重试</span>
      </button>
    </div>
    <div ref="sentinel" class="subject-page-status">
      <span v-if="loading">加载中…</span>
      <button v-else-if="error" class="ghost-btn small" type="button" @click="loadMore">{{ error }} · 重试</button>
      <button v-else-if="hasMore" class="ghost-btn small" type="button" @click="loadMore">继续加载</button>
      <span v-else>{{ total ? `已展示全部 ${items.length} 张` : '该题材暂无照片' }}</span>
    </div>
  </section>
</template>

<style scoped>
.subject-collection { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.06); }
header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
h3 { margin: 0; font-size: 15px; }
h3 span { margin-left: 8px; color: var(--muted); font-size: 12px; font-weight: normal; }
.subject-photo { padding: 0; border: 0; color: var(--text); font: inherit; }
.subject-photo:disabled { cursor: default; }
.subject-placeholder { display: grid; place-items: center; position: absolute; inset: 0; color: var(--muted); font-size: 12px; }
.subject-photo-error { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.65); font-size: 12px; }
.subject-page-status { padding: 18px; text-align: center; color: var(--muted); font-size: 12px; }
</style>
