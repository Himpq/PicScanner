<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useGalleryStore } from '../../stores/gallery.js';
import { SORT_OPTIONS } from '../../constants.js';

const store = useGalleryStore();
const sortLabel = computed(() => store.currentSortLabel());
const searchOpen = computed(() => store.searchOpen);
const hasFilter = computed(() => store.hasActiveFilter);
const searchQuery = ref('');
const searchScope = ref('all');
let debounceTimer = null;

const sortOpen = computed(() => store.sortOpen);

function toggleSort() {
  store.sortOpen = !store.sortOpen;
}

function pickSort(key) {
  store.applySort(key);
}

function toggleFilter() {
  const PS = window.PS;
  if (PS && PS.openFilterPop) PS.openFilterPop();
  else store.filterOpen = !store.filterOpen;
}

function toggleSearch() {
  store.setSearchOpen(!store.searchOpen);
}

function onSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    store.doSearch(searchQuery.value, searchScope.value);
  }, 180);
}

function onScope(scope) {
  searchScope.value = scope;
  store.doSearch(searchQuery.value, scope);
}

function closeSearch() {
  store.setSearchOpen(false);
}

function openStats() {
  const PS = window.PS;
  if (PS && PS.openStatsPage) PS.openStatsPage();
}

function changeSource() {
  const PS = window.PS;
  if (PS && PS.showSourceChooser) PS.showSourceChooser();
}

onMounted(() => {
  searchQuery.value = store.searchQuery || '';
  searchScope.value = store.searchScope || 'all';
  const handler = (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (!t.closest('#sort-dropdown') && !t.closest('.sort-trigger')) store.sortOpen = false;
  };
  document.addEventListener('click', handler);
  // 保存以便卸载
  window.__galleryToolbarClickHandler = handler;
});

onBeforeUnmount(() => {
  if (window.__galleryToolbarClickHandler) {
    document.removeEventListener('click', window.__galleryToolbarClickHandler);
    delete window.__galleryToolbarClickHandler;
  }
  clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="toolbar">
    <button class="ghost-btn back-btn" title="返回选择来源" @click="changeSource"><span aria-hidden="true">←</span><span>返回上一级</span></button>
    <button class="icon-btn" title="设置" @click="() => { const PS=window.PS; if(PS&&PS.openSettingsPage) PS.openSettingsPage('interface'); }">⚙</button>
    <button class="ghost-btn" @click="openStats">统计信息</button>
    <button class="ghost-btn filter-trigger" type="button" :class="{ active: hasFilter }" @click="toggleFilter">筛选</button>

    <div class="sort-dropdown" id="sort-dropdown">
      <button class="sort-trigger" type="button" aria-haspopup="listbox" :aria-expanded="sortOpen ? 'true' : 'false'" @click="toggleSort">
        <span>{{ sortLabel }}</span>
        <svg class="sort-caret" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <div class="sort-menu" :class="{ hidden: !sortOpen }" role="listbox">
        <button
          v-for="opt in SORT_OPTIONS"
          :key="opt.key"
          type="button"
          class="sort-option"
          :aria-selected="opt.key === store.sortKey ? 'true' : 'false'"
          @click="pickSort(opt.key)"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div class="toolbar-spacer"></div>
    <button class="ghost-btn" type="button" @click="toggleSearch">{{ searchOpen ? '关闭搜索' : '搜索' }}</button>
  </div>

  <section v-if="searchOpen" class="search-panel" aria-label="搜索">
    <div class="search-box">
      <div class="search-input-row">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input class="search-input" type="search" placeholder="搜索文件名、镜头、日期或备注" autocomplete="off" v-model="searchQuery" @input="onSearchInput" />
        <button class="icon-btn search-close" title="关闭搜索" type="button" @click="closeSearch">×</button>
      </div>
      <div class="search-scope-row">
        <button class="search-scope" :class="{ active: searchScope === 'all' }" type="button" @click="onScope('all')">全部</button>
        <button class="search-scope" :class="{ active: searchScope === 'filename' }" type="button" @click="onScope('filename')">文件名</button>
        <button class="search-scope" :class="{ active: searchScope === 'metadata' }" type="button" @click="onScope('metadata')">参数</button>
        <button class="search-scope" :class="{ active: searchScope === 'note' }" type="button" @click="onScope('note')">备注</button>
      </div>
      <div class="search-status">{{ store.searchStatus }}</div>
      <div class="search-results">
        <button v-for="item in store.searchResults" :key="item.photo_id || item.id || item.path" type="button" class="search-result-item" @click="() => { const PS=window.PS; if(PS&&PS.openLightbox) PS.openLightbox(item); }">
          <span>{{ item.filename || item.path || '未命名' }}</span>
          <small>{{ item.datetime_original || item.date || '' }}</small>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.search-result-item { display:flex; flex-direction:column; align-items:flex-start; width:100%; padding:6px 8px; border:none; background:transparent; cursor:pointer; text-align:left; }
.search-result-item:hover { background: var(--hover, rgba(255,255,255,0.06)); }
</style>
