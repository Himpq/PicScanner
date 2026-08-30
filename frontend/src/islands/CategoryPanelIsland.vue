<script setup>
import { computed, onMounted } from 'vue';
import { useGalleryStore } from '../stores/gallery.js';
import { useLegacySync } from '../composables/useLegacySync.js';

const store = useGalleryStore();
const categories = computed(() => store.categories);
const favoriteCount = computed(() => store.favoriteCount);
const hiddenCount = computed(() => store.hiddenCount);
const activeCategory = computed(() => store.activeCategory);

function setCategory(name) {
  store.setActiveCategory(name);
}

function addCategory() {
  const PS = window.PS;
  if (PS && typeof PS.addCategoryFromSidebar === 'function') PS.addCategoryFromSidebar();
  else if (PS && PS.openTextInput) {
    PS.openTextInput({ title: '新增分类', message: '添加一个全局分类名称。', placeholder: '分类名称' }).then((name) => {
      if (name == null) return;
      const clean = String(name).trim();
      if (!clean) return;
      import('../bridge/index.js').then(({ call }) => {
        call('add_category', store.currentSourceId, clean).then(() => store.fetchCategories()).catch(() => {});
      });
    });
  }
}

function label(cat) { return String(cat?.label || cat?.name || '未分类'); }

onMounted(() => {
  if (!store.categories.length) store.fetchCategories().catch(()=>{});
});
// P1：真源代理生效后由 rAF 合并同步驱动；代理未安装时才回退 400ms 轮询
useLegacySync(() => store.hydrateFromLegacy(), 400);
</script>

<template>
  <div class="category-head">
    <div class="section-title">分类</div>
    <button class="icon-btn category-add" title="新增分类" aria-label="新增分类" @click="addCategory">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.75v8.5M1.75 6h8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" /></svg>
    </button>
  </div>
  <div class="category-list">
    <button type="button" class="category-item" :class="{ active: activeCategory === null }" @click="setCategory(null)">
      <span>全部照片</span><b></b>
    </button>
    <button type="button" class="category-item category-favorite" :class="{ active: activeCategory === '__picscanner_favorite_filter__' }" @click="setCategory('__picscanner_favorite_filter__')">
      <span>收藏</span><b>{{ favoriteCount }}</b>
    </button>
    <button type="button" class="category-item category-hidden" :class="{ active: activeCategory === '__picscanner_hidden_filter__' }" @click="setCategory('__picscanner_hidden_filter__')">
      <span>隐藏</span><b>{{ hiddenCount }}</b>
    </button>
    <button
      v-for="cat in categories"
      :key="cat.name"
      type="button"
      class="category-item"
      :class="{ active: activeCategory === cat.name }"
      @click="setCategory(cat.name)"
    >
      <span>{{ label(cat) }}</span><b>{{ Number(cat.count || 0) }}</b>
    </button>
  </div>
</template>

<style scoped>
/* 复用 style.css 原 .category-panel/.category-item/active */
</style>
