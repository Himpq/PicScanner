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

  // PR4 优化：hydrate 时做脏检查，避免 Vue 已真源化的 photoCache 被 stale 的 PS 覆盖
  // 仅在 PS 的 dates 长度大于本地时才覆盖，防止 3000→0 的空参回退
  // 优化：每次 400ms 轮询会调一次，盲目赋新数组/Map 会触发大量响应式重建（卡顿主因）
  // 先做浅比较，仅在内容变化时才赋新引用
  function shallowMapEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.size !== b.size) return false;
    for (const k of a.keys()) if (!b.has(k) || a.get(k) !== b.get(k)) return false;
    return true;
  }
  function shallowSetEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  function arraysEqualShallow(a, b) {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function hydrateFromLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state) return;
    if (Array.isArray(PS.state.dates)) {
      if (PS.state.dates.length === 0 && dates.value.length > 0) {
        const isReset = !PS.state.loadingDates && PS.state.dates.length === 0 && !PS.state.currentSourceId;
        if (!isReset) { /* 保留 Vue 侧 dates */ } else if (dates.value.length) dates.value = [];
      } else if (!arraysEqualShallow(dates.value, PS.state.dates)) {
        dates.value = [...PS.state.dates];
      }
    }
    if (PS.state.dateCounts instanceof Map && !shallowMapEqual(dateCounts.value, PS.state.dateCounts)) dateCounts.value = new Map(PS.state.dateCounts);
    if (PS.state.dateCovers instanceof Map && !shallowMapEqual(dateCovers.value, PS.state.dateCovers)) dateCovers.value = new Map(PS.state.dateCovers);
    if (PS.state.dateNotes instanceof Map && !shallowMapEqual(dateNotes.value, PS.state.dateNotes)) dateNotes.value = new Map(PS.state.dateNotes);
    if (PS.state.visibleDates instanceof Set && !shallowSetEqual(visibleDates.value, PS.state.visibleDates)) visibleDates.value = new Set(PS.state.visibleDates);
    if (PS.state.dateFocus instanceof Map && !shallowMapEqual(dateFocus.value, PS.state.dateFocus)) dateFocus.value = new Map(PS.state.dateFocus);
    if (PS.state.activeDate !== undefined && activeDate.value !== PS.state.activeDate) activeDate.value = PS.state.activeDate;
    if (PS.state.sortKey && sortKey.value !== PS.state.sortKey) sortKey.value = PS.state.sortKey;
    if (PS.state.searchScope && searchScope.value !== PS.state.searchScope) searchScope.value = PS.state.searchScope;
    if (PS.state.galleryItemSize && galleryItemSize.value !== PS.state.galleryItemSize) galleryItemSize.value = PS.state.galleryItemSize;
    if (PS.state.galleryItemSizeRaw && galleryItemSizeRaw.value !== PS.state.galleryItemSizeRaw) galleryItemSizeRaw.value = PS.state.galleryItemSizeRaw;
    if (Array.isArray(PS.state.categories) && !arraysEqualShallow(categories.value, PS.state.categories)) categories.value = [...PS.state.categories];
    if (typeof PS.state.favoriteCount === 'number' && favoriteCount.value !== PS.state.favoriteCount) favoriteCount.value = PS.state.favoriteCount;
    if (typeof PS.state.hiddenCount === 'number' && hiddenCount.value !== PS.state.hiddenCount) hiddenCount.value = PS.state.hiddenCount;
    if (PS.state.activeCategory !== undefined && activeCategory.value !== PS.state.activeCategory) activeCategory.value = PS.state.activeCategory;
    if (PS.state.activeFilter && typeof PS.state.activeFilter === 'object') {
      const cur = activeFilter.value || {};
      const next = PS.state.activeFilter;
      let diff = Object.keys(cur).length !== Object.keys(next).length;
      if (!diff) for (const k of Object.keys(next)) if (cur[k] !== next[k]) { diff = true; break; }
      if (diff) activeFilter.value = { ...next };
    }
    if (PS.state.currentRootPath && currentRootPath.value !== PS.state.currentRootPath) currentRootPath.value = PS.state.currentRootPath;
    if (PS.state.currentSourceId && currentSourceId.value !== PS.state.currentSourceId) currentSourceId.value = PS.state.currentSourceId;
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

  // ---- API 代理（PR4 后 Vue 真源，彻底绕开 legacy 的 DOM 联动）----
  async function fetchDates({ reset = false } = {}) {
    if (loadingDates.value) return false;
    // noMoreDates 仅在非 reset 时生效，reset 时强制拉取
    if (!reset && noMoreDates.value) return false;
    loadingDates.value = true;
    try {
      const cursor = reset ? null : dateCursor.value;
      const limit = cursor ? 8 : 5000;
      // 空参校验：sortKey 必须在 SORT_OPTIONS 范围，filterPayload 已保证 null/对象
      const safeSort = SORT_OPTIONS.some((o) => o.key === sortKey.value) ? sortKey.value : 'datetime_desc';
      const payload = filterPayload();
      const res = await call('list_dates', cursor, limit, currentRootPath.value || null, currentSourceId.value || null, safeSort, payload);
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
        noMoreDates.value = false;
      } else {
        // 去重 + 增量合并，避免 O(n²) 的 some 扫描，改用 Set
        const existingKeys = new Set(dates.value.map((x) => x.date_key));
        const appended = [];
        newDates.forEach((d) => {
          if (!existingKeys.has(d.date_key)) {
            dates.value.push(d);
            appended.push(d);
          }
          dateCounts.value.set(d.date_key, Number(d.count || 0));
        });
        // 仅当有新增时再排序，减少无谓 sort
        if (appended.length) {
          dates.value.sort((a, b) => {
            const left = String(a.date_key || ''), right = String(b.date_key || '');
            return safeSort === 'datetime_asc' ? left.localeCompare(right) : right.localeCompare(left);
          });
        }
        dateCursor.value = dates.value.length ? dates.value[dates.value.length - 1].date_key : null;
        // Map 重新赋值触发响应式（仅一次）
        dateCounts.value = new Map(dateCounts.value);
      }
      if (!activeDate.value && newDates[0]) activeDate.value = newDates[0].date_key;
      return true;
    } catch (err) {
      console.warn('[gallery] list_dates failed', err);
      return false;
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
    // PR5 真源：排序改变重置分页，直接走 Pinia
    dates.value = [];
    noMoreDates.value = false;
    dateCursor.value = null;
    photoCache.value = new Map();
    photoOffsets.value = new Map();
    fetchDates({ reset: true });
  }

  // PR5: 拉取筛选选项（镜头/焦段/日期范围），供 Toolbar 筛选弹层使用
  async function fetchFilterOptions({ force = false } = {}) {
    if (filterOptions.value && !force) return filterOptions.value;
    const res = await call('get_filter_options', currentRootPath.value || null, currentSourceId.value || null);
    if (!res || !res.success) throw new Error(res && res.message ? res.message : '读取筛选项失败');
    filterOptions.value = res.options || {};
    return filterOptions.value;
  }

  // PR5 真源化：不再委托 PS.applyFilter，直接重置分页走 Pinia
  function applyFilter(filter) {
    const clean = normalizeFilter(filter);
    // 去重：相同 filter 不重复拉取
    const prev = JSON.stringify(normalizeFilter(activeFilter.value));
    const next = JSON.stringify(clean);
    activeFilter.value = clean;
    filterOpen.value = false;
    if (prev === next) return;
    dates.value = [];
    noMoreDates.value = false;
    dateCursor.value = null;
    photoCache.value = new Map();
    photoOffsets.value = new Map();
    fetchDates({ reset: true });
  }

  function clearFilter() {
    const had = Object.keys(normalizeFilter(activeFilter.value)).length > 0;
    activeFilter.value = {};
    filterOpen.value = false;
    if (!had) return;
    dates.value = [];
    noMoreDates.value = false;
    dateCursor.value = null;
    photoCache.value = new Map();
    photoOffsets.value = new Map();
    fetchDates({ reset: true });
  }

  let searchTimer = null;
  let searchSeq = 0;
  async function doSearch(query, scope) {
    const q = String(query || '').trim();
    const s = String(scope || searchScope.value || 'all');
    searchQuery.value = q;
    searchScope.value = s;
    try { window.__gallerySearchQuery = q; } catch {}
    if (!q) {
      searchResults.value = [];
      searchStatus.value = '输入关键词搜索当前来源';
      return;
    }
    // 完全 Vue 化：先确保来源上下文已从 PS 同步到 Pinia（首次进入工作区时 store 仍空）
    // 这一步让 Vue 成为真源，后续 search 仅用 store 值，不再每次回退 PS
    hydrateFromLegacy();
    // 若仍空，显式同步一次（处理 PhotoGrid 轮询未覆盖到的竞态）
    if (!currentRootPath.value || !currentSourceId.value) {
      const PS0 = (typeof window !== 'undefined' && window.PS && window.PS.state) ? window.PS.state : null;
      if (PS0) {
        if (!currentRootPath.value && PS0.currentRootPath) currentRootPath.value = String(PS0.currentRootPath);
        if (!currentSourceId.value && PS0.currentSourceId) currentSourceId.value = String(PS0.currentSourceId);
      }
    }
    const seq = ++searchSeq;
    try { window.__galleryDoSearchSeq = seq; } catch {}
    searchStatus.value = '搜索中...';
    try {
      const fp = filterPayload();
      const effRoot = currentRootPath.value || null;
      const effSid = currentSourceId.value || null;
      console.log('[search][vue] req', {q, root: effRoot, sid: effSid, scope:s, filters: fp, sort: sortKey.value});
      // 完全 Vue 签名：search_photos(query, root_path, source_id, scope, limit, filters, sort_key)
      let res = await call('search_photos', q, effRoot, effSid, s, 40, fp, sortKey.value);
      console.log('[search][vue] res', res);
      if (seq !== searchSeq) return;
      if (!res || !res.success) throw new Error(res?.message || '搜索失败');
      let items = res.items || res.results || res.photos || [];
      searchResults.value = items;
      searchStatus.value = items.length ? '找到 ' + items.length + ' 个结果' : '没有找到 "' + q + '"';
      // ---- 语义追加（完全 Vue）：单字中文“鸟/鹿/牛”需放行，仅拦截单字母/数字碎片如 'z','a','1' ----
      function isSingleAsciiNoise(t){ return t.length===1 && /^[a-zA-Z0-9]$/.test(t); }
      const shouldSemantic = !isSingleAsciiNoise(q);
      if (shouldSemantic) {
        const semSeq = seq;
        const semQ = q;
        // 已真源化，直接用 store 的 sid/filter
        const semSid = currentSourceId.value || '';
        const semFilter = filterPayload();
        setTimeout(async () => {
          if (semSeq !== searchSeq) return;
          if (searchQuery.value !== semQ) return;
          try {
            let r = null;
            try {
              r = await call('module_api', 'semantic_search', 'search', semQ, 8, semSid, semFilter);
            } catch (e) { return; }
            if ((!r || !r.success || !Array.isArray(r.results) || !r.results.length) && semSid) {
              if (semSeq !== searchSeq || searchQuery.value !== semQ) return;
              try { r = await call('module_api', 'semantic_search', 'search', semQ, 8, '', semFilter); } catch (e) { return; }
            }
            if (semSeq !== searchSeq) return;
            if (searchQuery.value !== semQ) return;
            if (!r || !r.success || !Array.isArray(r.results) || !r.results.length) return;
            const base = searchResults.value || [];
            const seen = new Set(base.map((x) => String(x.id || x.item_key || x.path)));
            let added = 0;
            const merged = [...base];
            for (const x of r.results) {
              const key = String(x.id || x.item_key || x.path);
              if (seen.has(key)) continue;
              seen.add(key);
              merged.push(Object.assign({
                type: 'photo',
                search_label: '语义',
                search_title: semQ,
                search_match: '语义 ' + (Number(x.score).toFixed(2)),
                preview_url: x.preview_url || x.path || '',
                path: x.path || '',
                filename: (x.path || '').split(/[\\/]/).pop() || '',
              }, x));
              if (++added >= 5) break;
            }
            if (added) {
              searchResults.value = merged;
              searchStatus.value = '找到 ' + merged.length + ' 个结果 (含' + added + '条语义)';
              console.log('[semantic] Vue 追加语义', r.results.length, '→', added);
            }
          } catch (e) { console.warn('[semantic] Vue 语义追加失败', e); }
        }, 220);
      }
    } catch (err) {
      if (seq !== searchSeq) return;
      searchStatus.value = String(err?.message || err);
      searchResults.value = [];
    }
  }
  // 暴露给旧 hijack 复用，避免双写；同时暴露 store 供事件合并
  if (typeof window !== 'undefined') {
    window.__galleryDoSearchSeq = () => searchSeq;
    window.__gallerySearchQuery = () => searchQuery.value;
    // 延迟绑定 store 实例（useGalleryStore 调用后才有）
    try { if (!window.__galleryStore) window.__galleryStore = { get searchResults(){return searchResults.value;}, set searchResults(v){searchResults.value=v;}, get searchQuery(){return searchQuery.value;}, get searchStatus(){return searchStatus.value;}, set searchStatus(v){searchStatus.value=v;} }; } catch(e){}
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

  // PR4 真源化：photoCache 完全由 Vue 驱动，legacy 仅镜像
  // 优化点：按 id 去重、稀疏数组改 push 连续、Map 只做一次重赋值
  async function fetchPhotosForDate(dateKey, { limit } = {}) {
    if (!dateKey) return false;
    if (photoLoading.value.has(dateKey)) return false;
    const total = dateCounts.value.get(dateKey) || 0;
    const offset = photoOffsets.value.get(dateKey) || 0;
    if (total > 0 && offset >= total) return false;
    // 加锁：Set 重新赋值以触发响应式
    photoLoading.value.add(dateKey);
    photoLoading.value = new Set(photoLoading.value);
    const PS = window.PS;
    const reqLimit = Math.max(1, Number(limit) || (offset === 0 ? INITIAL_PHOTO_LIMIT : PHOTO_LOAD_BATCH));
    // 空参校验：filterPayload 显式 null，sortKey 兜底
    const safeSort = SORT_OPTIONS.some((o) => o.key === sortKey.value) ? sortKey.value : 'datetime_desc';
    const payload = filterPayload();
    try {
      const res = await call('list_photos', dateKey, offset, reqLimit, currentRootPath.value || null, currentSourceId.value || null, safeSort, payload);
      const photos = res.photos || [];
      if (!photos.length) return false;
      const existing = photoCache.value.get(dateKey) || [];
      // 去重：按 id 过滤已存在的照片，避免重复插入导致 offset 漂移
      const existingIds = new Set(existing.map((p) => String(p.id || p.photo_id || '')));
      const deduped = photos.filter((p) => !existingIds.has(String(p.id || p.photo_id || '')));
      if (!deduped.length && photos.length) {
        // 全部重复，说明后端分页与前端 offset 已错位，直接推进 offset
        photoOffsets.value.set(dateKey, offset + photos.length);
        photoOffsets.value = new Map(photoOffsets.value);
        return false;
      }
      const next = deduped.length === photos.length ? [...existing, ...deduped] : [...existing, ...deduped];
      // 同步到 legacy 的 photoCache 以便灯箱/批量/对比复用
      if (PS && PS.state && PS.state.photoCache) {
        deduped.forEach((p) => { try { if (p && p.id) PS.state.photoCache.set(Number(p.id), p); } catch {} });
      }
      photoCache.value.set(dateKey, next);
      photoCache.value = new Map(photoCache.value);
      photoOffsets.value.set(dateKey, offset + photos.length);
      photoOffsets.value = new Map(photoOffsets.value);
      return deduped.length > 0;
    } catch (err) {
      console.warn('[gallery] list_photos failed', dateKey, err);
      return false;
    } finally {
      photoLoading.value.delete(dateKey);
      photoLoading.value = new Set(photoLoading.value);
    }
  }

  function photosForDate(dateKey) {
    return photoCache.value.get(dateKey) || [];
  }

  function isPhotoLoading(dateKey) {
    return photoLoading.value.has(dateKey);
  }

  // 预览回填：等价于 legacy 的 state.photoCache.set + drain 后的 img.src 更新
  // 用于 usePreviewQueue 在 get_photo_preview 成功后原地合并 preview_url 等字段
  function patchPhoto(photoId, patch) {
    const pid = Number(photoId);
    if (!pid || !patch || typeof patch !== 'object') return false;
    let found = false;
    const nextCache = new Map(photoCache.value);
    for (const [dateKey, arr] of nextCache.entries()) {
      let changed = false;
      const nextArr = arr.map((p) => {
        const curId = Number(p.id ?? p.photo_id);
        if (curId === pid) {
          found = true;
          changed = true;
          return Object.assign({}, p, patch);
        }
        return p;
      });
      if (changed) {
        nextCache.set(dateKey, nextArr);
      }
    }
    if (found) {
      photoCache.value = nextCache;
      // 同步到 legacy 侧，保持灯箱/批量复用一致
      try {
        const PS = window.PS;
        if (PS && PS.state && PS.state.photoCache) {
          const prev = PS.state.photoCache.get(pid) || {};
          PS.state.photoCache.set(pid, Object.assign({}, prev, patch));
        }
      } catch {}
    }
    return found;
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
    patchPhoto,
    setActiveCategory,
    applySort,
    applyFilter,
    clearFilter,
    doSearch,
    setSearchOpen,
    fetchFilterOptions,
    applyGallerySize,
    syncSourceContext,
  };
});
