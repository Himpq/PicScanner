<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useGalleryStore } from '../stores/gallery.js';

const store = useGalleryStore();
const dates = computed(() => store.dates);
const activeDate = computed(() => store.activeDate);

function jump(dateKey) {
  const PS = window.PS;
  if (PS && typeof PS.jumpToDate === 'function') {
    PS.jumpToDate(dateKey);
    store.activeDate = dateKey;
    if (PS.state) PS.state.activeDate = dateKey;
  } else {
    store.activeDate = dateKey;
    const el = document.getElementById('date-' + dateKey);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function label(dateKey) {
  const PS = window.PS;
  if (PS && PS.formatDateLabel) return PS.formatDateLabel(dateKey);
  const s = String(dateKey || '');
  return s.length > 5 ? s.slice(5) : s;
}

const failedCoverUrls = new Set();
function hasCover(d) {
  const url = store.dateCovers.get(d.date_key);
  if (!url || failedCoverUrls.has(url)) return false;
  return true;
}
function coverStyle(d) {
  const url = store.dateCovers.get(d.date_key) || '';
  if (!url || failedCoverUrls.has(url)) return {};
  // 异步预检：若封面加载失败则剔除，避免 Sony 视频等不可预览图长期占位
  try {
    const test = new Image();
    test.onerror = () => {
      failedCoverUrls.add(url);
      if (store.dateCovers.get(d.date_key) === url) store.dateCovers.delete(d.date_key);
    };
    test.src = url;
  } catch {}
  return { '--date-cover': `url("${url.replace(/"/g, '\\"')}")` };
}
function isVisible(d) { return store.visibleDates.has(d.date_key); }
function isFocus(d) { const f = store.dateFocus.get(d.date_key); return typeof f === 'number' && f >= 0.72; }
function note(d) { return store.dateNotes.get(d.date_key) || ''; }

let timer = null;
onMounted(() => {
  store.hydrateFromLegacy();
  timer = setInterval(() => store.hydrateFromLegacy(), 400);
});
onBeforeUnmount(() => { if (timer) clearInterval(timer); });
</script>

<template>
  <div class="section-title">日期</div>
  <div class="date-rail-list">
    <button
      v-for="d in dates"
      :key="d.date_key"
      class="date-pill"
      :class="{ active: activeDate === d.date_key, 'has-cover': hasCover(d), visible: isVisible(d), 'focus-center': isFocus(d) }"
      :style="coverStyle(d)"
      :data-date-pill="d.date_key"
      :title="note(d) || undefined"
      @click="jump(d.date_key)"
      @contextmenu.prevent="() => { const PS=window.PS; if(PS&&PS.showDateContextMenu) PS.showDateContextMenu($event.clientX,$event.clientY,d.date_key); }"
    >
      <span class="date-label-stack">
        <span class="date-label-text">{{ label(d.date_key) }}</span>
        <span v-if="note(d)" class="date-note-text">{{ note(d) }}</span>
      </span>
    </button>
    <div v-if="!dates.length" style="font-size:12px;color:var(--muted);padding:8px;">暂无日期</div>
  </div>
</template>

<style scoped>
/* 复用 style.css 原 .date-pill/.has-cover/visible/active/focus-center */
</style>
<style>
/* 修复 margin/padding-bottom 预留黑边 */
#vue-date-rail {
  display: block !important;
  height: 100% !important;
  min-height: 0 !important;
  box-sizing: border-box;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
#vue-date-rail .date-rail-list {
  height: calc(100% - 28px) !important;
  min-height: 0;
  box-sizing: border-box;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
</style>
