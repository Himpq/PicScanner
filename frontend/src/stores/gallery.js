import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { call } from '../bridge/index.js';
import { SORT_OPTIONS } from '../constants.js';

export const useGalleryStore = defineStore('gallery', () => {
  const dates = ref([]);
  const dateCounts = ref(new Map());
  const activeDate = ref(null);
  const noMoreDates = ref(false);
  const loadingDates = ref(false);
  const dateCursor = ref(null);

  const sortKey = ref('datetime_desc');
  const sortOpen = ref(false);
  const filterOpen = ref(false);
  const activeFilter = ref({});
  const filterOptions = ref(null);

  const searchOpen = ref(false);
  const searchScope = ref('all');
  const searchQuery = ref('');
  const searchResults = ref([]);
  const searchStatus = ref('输入关键词搜索当前来源');

  const categories = ref([]);
  const favoriteCount = ref(0);
  const hiddenCount = ref(0);
  const activeCategory = ref(null);

  const galleryItemSize = ref(168);
  const galleryItemSizeRaw = ref(168);

  const currentRootPath = ref('');
  const currentSourceId = ref('');

  const photoOffsets = ref(new Map());
  const photoCache = ref(new Map());
  const photoLoading = ref(new Set());
  const INITIAL_PHOTO_LIMIT = 40;
  const PHOTO_LOAD_BATCH = 20;
  const RENDER_AHEAD_PHOTOS = 20;

  const dateCovers = ref(new Map());
  const dateNotes = ref(new Map());
  const visibleDates = ref(new Set());
  const dateFocus = ref(new Map());

  const scanStatus = ref('idle');
  const scanCountText = ref('0 / 0');
  const exifStatus = ref('idle');
  const exifCountText = ref('0 / 0');

  function hydrateFromLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state) return;
    if (Array.isArray(PS.state.dates)) dates.value = [...PS.state.dates];
    if (PS.state.dateCounts instanceof Map) dateCounts.value = new Map(PS.state.dateCounts);
    if (PS.state.dateCovers instanceof Map) dateCovers.value = new Map(PS.state.dateCovers);
    if (PS.state.dateNotes instanceof Map) dateNotes.value = new Map(PS.state.dateNotes);
    if (PS.state.visibleDates instanceof Set) visibleDates.value = new Set(PS.state.visibleDates);
    if (PS.state.dateFocus instanceof Map) dateFocus.value = new Map(PS.state.dateFocus);
    if (PS.state.activeDate !== undefined) activeDate.value = PS.state.activeDate;
    if (PS.state.sortKey) sortKey.value = PS.state.sortKey;
    if (PS.state.searchScope) searchScope.value = PS.state.searchScope;
    if (PS.state.galleryItemSize) galleryItemSize.value = PS.state.galleryItemSize;
    if (PS.state.galleryItemSizeRaw) galleryItemSizeRaw.value = PS.state.galleryItemSizeRaw;
    if (Array.isArray(PS.state.categories)) categories.value = [...PS.state.categories];
    if (typeof PS.state.favoriteCount === 'number') favoriteCount.value = PS.state.favoriteCount;
    if (typeof PS.state.hiddenCount === 'number') hiddenCount.value = PS.state.hiddenCount;
    if (PS.state.activeCategory !== undefined) activeCategory.value = PS.state.activeCategory;
    if (PS.state.activeFilter && typeof PS.state.activeFilter === 'object') activeFilter.value = { ...PS.state.activeFilter };
    if (PS.state.currentRootPath) currentRootPath.value = PS.state.currentRootPath;
    if (PS.state.currentSourceId) currentSourceId.value = PS.state.currentSourceId;
  }

  function syncSortToLegacy() {
    const PS = window.PS;
    if (PS && PS.state) PS.state.sortKey = sortKey.value;
  }

  function syncGallerySizeToLegacy() {
    const PS = window.PS;
    if (!PS) return;
    if (typeof PS.applyGalleryItemSize === 'function') PS.applyGalleryItemSize(galleryItemSizeRaw.value);
    else if (PS.state) {
      PS.state.galleryItemSize = galleryItemSize.value;
      PS.state.galleryItemSizeRaw = galleryItemSizeRaw.value;
    }
  }

  // ---- 工具 ----
  function normalizeFilter(filter) {
    const raw = filter || {};
    const clean = {};
    if (raw.favorite) clean.favorite = true;
    if (raw.hidden) clean.hidden = true;
    const lens = String(raw.lens || '').trim();
    if (lens) clean.lens = lens;
    const focal = String(raw.focal_bucket || '').trim();
    if (focal) clean.focal_bucket = focal;
    const start = String(raw.start_date || '').trim();
    if (start) clean.start_date = start;
    const end = String(raw.end_date || '').trim();
    if (end) clean.end_date = end;
    return clean;
  }

  function filterPayload() {
    const filter = normalizeFilter(activeFilter.value);
    if (activeCategory.value === '__picscanner_hidden_filter__') filter.hidden = true;
    else if (activeCategory.value === '__picscanner_favorite_filter__') filter.favorite = true;
    else if (activeCategory.value !== null) filter.category = String(activeCategory.value || '');
    return Object.keys(filter).length ? filter : null;
  }

  function currentSortLabel() {
    const opt = SORT_OPTIONS.find((o) => o.key === sortKey.value);
    return opt ? opt.label : sortKey.value;
  }

  // ---- API 代理（双轨期：优先走 legacy 的 DOM 联动，Vue 侧镜像状态）----
  async function fetchDates({ reset = false } = {}) {
    if (loadingDates.value || noMoreDates.value) return false;
    loadingDates.value = true;
    try {
      const PS = window.PS;
      // 若 legacy 的 loadOlderDates 存在，直接复用以保留虚拟滚动/占位逻辑
      if (PS && typeof PS.loadOlderDates === 'function' && !reset) {
        const ok = await PS.loadOlderDates();
        hydrateFromLegacy();
        return ok;
      }
      const cursor = reset ? null : dateCursor.value;
      const limit = cursor ? 8 : 5000;
      const res = await call('list_dates', cursor, limit, currentRootPath.value || null, currentSourceId.value || null, sortKey.value, filterPayload());
      const newDates = res.dates || [];
      if (!newDates.length) {
        noMoreDates.value = true;
        return false;
      }
      if (reset) {
        dates.value = [...newDates];
        dateCounts.value = new Map();
        newDates.forEach((d) => dateCounts.value.set(d.date_key, Number(d.count || 0)));
        dateCursor.value = newDates[newDates.length - 1]?.date_key || null;
      } else {
        newDates.forEach((d) => {
          if (!dates.value.some((x) => x.date_key === d.date_key)) dates.value.push(d);
          dateCounts.value.set(d.date_key, Number(d.count || 0));
        });
        dates.value.sort((a, b) => {
          const left = String(a.date_key || ''), right = String(b.date_key || '');
          return sortKey.value === 'datetime_asc' ? left.localeCompare(right) : right.localeCompare(left);
        });
        dateCursor.value = dates.value.length ? dates.value[dates.value.length - 1].date_key : null;
      }
      if (!activeDate.value && newDates[0]) activeDate.value = newDates[0].date_key;
      return true;
    } finally {
      loadingDates.value = false;
    }
  }

  async function fetchCategories() {
    if (!currentSourceId.value) {
      categories.value = [];
      favoriteCount.value = 0;
      hiddenCount.value = 0;
      return [];
    }
    const res = await call('list_categories', currentSourceId.value);
    if (!res || !res.success) throw new Error(res?.message || '读取分类失败');
    categories.value = res.categories || [];
    favoriteCount.value = Number(res.favorite_count || 0);
    hiddenCount.value = Number(res.hidden_count || 0);
    const PS = window.PS;
    if (PS && PS.state) {
      PS.state.categories = [...categories.value];
      PS.state.favoriteCount = favoriteCount.value;
      PS.state.hiddenCount = hiddenCount.value;
    }
    return categories.value;
  }

  function setActiveCategory(name) {
    const next = name === null ? null : String(name || '');
    if (activeCategory.value === next) return;
    activeCategory.value = next;
    const PS = window.PS;
    if (PS && typeof PS.setActiveCategory === 'function') {
      PS.setActiveCategory(next);
      hydrateFromLegacy();
    } else if (PS && PS.state) {
      PS.state.activeCategory = next;
    }
  }

  function applySort(key) {
    if (!SORT_OPTIONS.some((o) => o.key === key)) throw new Error('未知排序方式: ' + key);
    sortOpen.value = false;
    if (key === sortKey.value) return;
    sortKey.value = key;
    syncSortToLegacy();
    const PS = window.PS;
    if (PS && typeof PS.applySort === 'function') {
      PS.applySort(key);
      hydrateFromLegacy();
    } else {
      dates.value = [];
      noMoreDates.value = false;
      dateCursor.value = null;
      fetchDates({ reset: true });
    }
  }

  function applyFilter(filter) {
    activeFilter.value = normalizeFilter(filter);
    const PS = window.PS;
    if (PS && typeof PS.applyFilter === 'function') {
      PS.applyFilter(activeFilter.value);
      hydrateFromLegacy();
      return;
    }
    dates.value = [];
    noMoreDates.value = false;
    dateCursor.value = null;
    fetchDates({ reset: true });
  }

  function clearFilter() {
    activeFilter.value = {};
    const PS = window.PS;
    if (PS && typeof PS.clearActiveFilter === 'function') {
      PS.clearActiveFilter();
      hydrateFromLegacy();
      return;
    }
    dates.value = [];
    noMoreDates.value = false;
    dateCursor.value = null;
    fetchDates({ reset: true });
  }

  let searchTimer = null;
  async function doSearch(query, scope) {
    const q = String(query || '').trim();
    const s = String(scope || searchScope.value || 'all');
    searchQuery.value = q;
    searchScope.value = s;
    if (!q) {
      searchResults.value = [];
      searchStatus.value = '输入关键词搜索当前来源';
      return;
    }
    searchStatus.value = '搜索中...';
    try {
      const res = await call('search_photos', q, s, currentSourceId.value || null, currentRootPath.value || null);
      if (!res || !res.success) throw new Error(res?.message || '搜索失败');
      searchResults.value = res.results || res.photos || [];
      searchStatus.value = searchResults.value.length ? '找到 ' + searchResults.value.length + ' 张' : '未找到匹配结果';
    } catch (err) {
      searchStatus.value = String(err?.message || err);
      searchResults.value = [];
    }
  }

  function setSearchOpen(open) {
    searchOpen.value = !!open;
    const PS = window.PS;
    if (PS && PS.state) PS.state.searchOpen = searchOpen.value;
  }

  function applyGallerySize(size) {
    const v = Math.max(112, Math.min(280, Math.round(Number(size) || 168)));
    galleryItemSizeRaw.value = v;
    galleryItemSize.value = v;
    syncGallerySizeToLegacy();
    // 持久化
    call('set_gallery_item_size', v).catch(() => {});
  }

  async function fetchPhotosForDate(dateKey, { limit } = {}) {
    if (!dateKey) return false;
    if (photoLoading.value.has(dateKey)) return false;
    const total = dateCounts.value.get(dateKey) || 0;
    const offset = photoOffsets.value.get(dateKey) || 0;
    if (total > 0 && offset >= total) return false;
    photoLoading.value.add(dateKey);
    // 委托 legacy 若存在且未切到 Vue 真实渲染（双轨期优先 legacy 的 replaceChild 逻辑）
    // 但当 PhotoGrid 已 Vue 化时，直接走 Vue 分页
    const PS = window.PS;
    const useLegacy = false; // 设为 true 可回落到 legacy 的 DOM 替换
    if (useLegacy && PS && typeof PS.loadPhotosForDate === 'function') {
      try {
        const ok = await PS.loadPhotosForDate(dateKey, { limit });
        hydrateFromLegacy();
        return ok;
      } finally {
        photoLoading.value.delete(dateKey);
      }
    }
    const reqLimit = Math.max(1, Number(limit) || (offset === 0 ? INITIAL_PHOTO_LIMIT : PHOTO_LOAD_BATCH));
    try {
      const res = await call('list_photos', dateKey, offset, reqLimit, currentRootPath.value || null, currentSourceId.value || null, sortKey.value, filterPayload());
      const photos = res.photos || [];
      const existing = photoCache.value.get(dateKey) || [];
      const next = [...existing];
      photos.forEach((p, idx) => {
        const targetIdx = offset + idx;
        next[targetIdx] = p;
        // 同步到 legacy 的 photoCache 以便灯箱/批量复用
        if (PS && PS.state && PS.state.photoCache && p && p.id) {
          try { PS.state.photoCache.set(Number(p.id), p); } catch {}
        }
      });
      // 去除稀疏空位，保持连续
      const compact = next.filter(Boolean);
      photoCache.value.set(dateKey, photos.length ? [...compact] : existing);
      // 触发响应式（Map 需重新赋值）
      photoCache.value = new Map(photoCache.value);
      photoOffsets.value.set(dateKey, offset + photos.length);
      photoOffsets.value = new Map(photoOffsets.value);
      // 更新 dateCounts 若后端返回更精确
      if (photos.length < reqLimit && total > 0) {
        // 已到末尾，无需额外处理
      }
      return photos.length > 0;
    } catch (err) {
      console.warn('[gallery] list_photos failed', dateKey, err);
      return false;
    } finally {
      photoLoading.value.delete(dateKey);
    }
  }

  function photosForDate(dateKey) {
    return photoCache.value.get(dateKey) || [];
  }

  function isPhotoLoading(dateKey) {
    return photoLoading.value.has(dateKey);
  }

  // 从 legacy 拉取 source 上下文（进入工作区时调用）
  function syncSourceContext(rootPath, sourceId) {
    currentRootPath.value = String(rootPath || '');
    currentSourceId.value = String(sourceId || '');
    const PS = window.PS;
    if (PS && PS.state) {
      PS.state.currentRootPath = currentRootPath.value;
      PS.state.currentSourceId = currentSourceId.value;
    }
    // 切换来源时清空照片缓存
    photoCache.value = new Map();
    photoOffsets.value = new Map();
    photoLoading.value = new Set();
  }

  const dateCount = computed(() => dates.value.length);
  const hasActiveFilter = computed(() => Object.keys(normalizeFilter(activeFilter.value)).length > 0);

  return {
    dates,
    dateCounts,
    activeDate,
    noMoreDates,
    loadingDates,
    dateCursor,
    sortKey,
    sortOpen,
    filterOpen,
    activeFilter,
    filterOptions,
    searchOpen,
    searchScope,
    searchQuery,
    searchResults,
    searchStatus,
    categories,
    favoriteCount,
    hiddenCount,
    activeCategory,
    dateCovers,
    dateNotes,
    visibleDates,
    dateFocus,
    galleryItemSize,
    galleryItemSizeRaw,
    currentRootPath,
    currentSourceId,
    photoOffsets,
    photoCache,
    photoLoading,
    scanStatus,
    scanCountText,
    exifStatus,
    exifCountText,
    dateCount,
    hasActiveFilter,
    hydrateFromLegacy,
    filterPayload,
    currentSortLabel,
    fetchDates,
    fetchCategories,
    fetchPhotosForDate,
    photosForDate,
    isPhotoLoading,
    setActiveCategory,
    applySort,
    applyFilter,
    clearFilter,
    doSearch,
    setSearchOpen,
    applyGallerySize,
    syncSourceContext,
  };
});
