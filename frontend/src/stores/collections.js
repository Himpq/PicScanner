import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { call } from '../bridge/index.js';
import { useLightboxStore } from './lightbox.js';

// P3：集锦列表屏与详情屏的数据源。
// 灯箱导航也已迁过来 —— 打开集锦内的照片时把完整有序列表交给 lightbox store 的
// navList，翻页就走集锦内循环，取代 legacy 的 patchLightboxNav（DOM 捕获 + 包装 store 方法）。
export const useCollectionsStore = defineStore('collections', () => {
  const items = ref([]);
  const loading = ref(false);
  const generating = ref(false);
  const status = ref('');
  const open = ref(false);

  // 详情屏
  const detail = ref(null);
  const detailOpen = ref(false);
  const detailStatus = ref('');
  const detailLoading = ref(false);

  const count = computed(() => items.value.length);
  const isEmpty = computed(() => !loading.value && items.value.length === 0);

  // 网格顺序必须和灯箱导航顺序同源，否则点第 N 格会打开另一张。
  // 后端（storage.py）是按 photo_ids 组装 photo_details 的，两者本应一致；
  // 但 legacy 的网格用 photos、灯箱用 photo_ids —— 两套顺序靠巧合对齐。
  // 这里统一以 photo_ids 为准，把它变成显式约束而不是巧合。
  const detailPhotos = computed(() => {
    const d = detail.value;
    if (!d) return [];
    const photos = d.photos || [];
    const ids = d.photo_ids || [];
    if (!ids.length) return photos;
    const byId = new Map(photos.map((p) => [String(p.id), p]));
    const ordered = [];
    const seen = new Set();
    for (const id of ids) {
      const p = byId.get(String(id));
      if (p && !seen.has(p)) { ordered.push(p); seen.add(p); }
    }
    // photo_ids 里没覆盖到的（理论上不会）补在末尾，宁可多显示也不能丢图
    for (const p of photos) if (!seen.has(p)) ordered.push(p);
    return ordered;
  });
  const detailCount = computed(() => {
    const d = detail.value;
    if (!d) return 0;
    return Number(d.photo_count || (d.photo_ids || []).length || d.photos.length || 0);
  });

  function currentSourceId() {
    const PS = window.PS;
    return String((PS && PS.state && PS.state.currentSourceId) || '');
  }

  function toast(message) {
    const PS = window.PS;
    if (PS && PS.showToast) PS.showToast(String(message));
  }

  // 副标题去重：剥离“12张”之类计数，避免与右上角计数重复
  function cleanSubtitle(sub) {
    let s = String(sub || '').trim();
    if (!s) return '';
    s = s
      .replace(/^\s*\d+\s*张\s*[·・\-—]?\s*/, '')
      .replace(/\s*[·・]\s*\d+\s*张\s*$/, '')
      .replace(/\s*\d+\s*张\s*/, '')
      .trim();
    return s;
  }

  // 副标题被剥空后回退显示时间，再回退显示类型（与 legacy renderCollectionDetail 一致）
  const detailSubtitle = computed(() => {
    const d = detail.value;
    if (!d) return '';
    const clean = cleanSubtitle(d.subtitle);
    if (clean) return clean;
    if (d.time_start) {
      return d.time_start + (d.time_end && d.time_end !== d.time_start ? ' ~ ' + d.time_end : '');
    }
    if (d.type) return d.type === 'geo' ? '地理聚类' : '语义聚类';
    return '';
  });

  async function fetchList() {
    const sid = currentSourceId();
    if (!sid) {
      status.value = '请先选择来源';
      items.value = [];
      return [];
    }
    loading.value = true;
    status.value = '加载中…';
    try {
      const res = await call('module_api', 'collections', 'list', sid, 24);
      if (!res || !res.success) {
        status.value = (res && res.message) || '加载失败';
        items.value = [];
        return [];
      }
      items.value = res.collections || [];
      status.value = items.value.length ? '' : '暂无集锦，点击“生成集锦”试试';
      return items.value;
    } catch (err) {
      status.value = '加载异常: ' + String((err && err.message) || err);
      items.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  }

  // generate 的消息分支沿用 legacy：inserted / skipped 组合出不同提示
  async function generate() {
    const sid = currentSourceId();
    if (!sid) {
      toast('请先选择来源');
      return null;
    }
    generating.value = true;
    status.value = '正在聚类（可能需数秒，含标题生成）…';
    try {
      // append + 去重：replace=false
      const res = await call('module_api', 'collections', 'generate', sid, 'auto', true, '', 12, false);
      if (!res || !res.success) {
        toast((res && res.message) || '生成失败');
        status.value = (res && res.message) || '生成失败';
        return null;
      }
      const inserted = (res.inserted != null ? res.inserted : res.count) || 0;
      const skipped = res.skipped || 0;
      const total = res.total || (inserted + skipped);
      if (inserted > 0 && skipped > 0) {
        toast('已追加 ' + inserted + ' 个集锦（去重跳过 ' + skipped + ' 个）');
        status.value = '已追加 ' + inserted + ' 个，去重跳过 ' + skipped + ' 个';
      } else if (inserted > 0) {
        toast('已追加 ' + inserted + ' 个集锦');
        status.value = inserted === total ? '' : '已追加 ' + inserted + ' 个';
      } else if (skipped > 0) {
        toast('无新增，去重跳过 ' + skipped + ' 个重复集锦');
        status.value = '无新增（全部 ' + skipped + ' 个已存在，Jaccard≥0.85判重）';
      } else {
        toast('已生成 ' + (res.count || 0) + ' 个集锦');
        status.value = '';
      }
      await fetchList();
      return res;
    } catch (err) {
      toast('生成异常');
      status.value = String((err && err.message) || err);
      return null;
    } finally {
      generating.value = false;
    }
  }

  function openPage() {
    open.value = true;
    return fetchList();
  }

  function closePage() {
    open.value = false;
    // 列表关掉时详情也一起收（legacy 的 closeScreen 会先调 closeCollectionDetail）
    detailOpen.value = false;
  }

  // ---------------- 详情屏 ----------------

  // legacy 的 openCollectionDetail 只保留容器显隐与动画，内容取数在这里。
  // 先用列表里的简略对象占位，拿到详情后再替换 —— 打开瞬间就能看到标题。
  async function openDetail(col) {
    const colId = col && col.id ? String(col.id) : String(col || '');
    if (!colId) {
      toast('集锦不存在');
      return null;
    }
    const stub = (typeof col === 'object' && col) ? col : null;
    detail.value = stub
      ? Object.assign({}, stub)
      : { id: colId, title: '加载中…', subtitle: '', photo_ids: [], photos: [] };
    detailOpen.value = true;
    detailStatus.value = '加载中…';
    return fetchDetail(colId, stub);
  }

  async function fetchDetail(colId, stub) {
    detailLoading.value = true;
    try {
      const res = await call('module_api', 'collections', 'get', colId);
      if (!res || !res.success || !res.collection) {
        const msg = (res && res.message) || '加载失败';
        detailStatus.value = msg;
        toast(msg);
        return null;
      }
      detail.value = assemble(res.collection, colId, stub);
      detailStatus.value = '';
      return detail.value;
    } catch (err) {
      detailStatus.value = '加载异常: ' + String((err && err.message) || err);
      toast('详情加载失败');
      return null;
    } finally {
      detailLoading.value = false;
    }
  }

  // 把后端返回的 collection 组装成详情页与灯箱都认的完整对象：
  // photo_ids 决定顺序，photo_details 提供字段，两者取并集。
  function assemble(data, colId, stub) {
    const details = data.photo_details || [];
    const ids = data.photo_ids || details.map((p) => p.id);
    return {
      id: String(data.id || colId),
      title: data.title || (stub && stub.title) || '未命名',
      subtitle: data.subtitle || (stub && stub.subtitle) || '',
      type: data.type || (stub && stub.type) || 'semantic',
      photo_ids: ids.map((v) => Number(v)),
      photos: details.map((p) => toFullPhoto(p)),
      photo_count: (data.photo_ids || []).length || details.length,
      time_start: data.time_start || (stub && stub.time_start) || '',
      time_end: data.time_end || (stub && stub.time_end) || '',
    };
  }

  // 灯箱与详情共用：把后端的一行照片补全成灯箱需要的完整字段
  function toFullPhoto(p) {
    return {
      id: Number(p.id),
      preview_url: p.preview_url || p.thumbnail_url || '',
      thumbnail_url: p.thumbnail_url || p.preview_url || '',
      lightbox_url: p.lightbox_url || p.original_url || '',
      original_url: p.original_url || p.lightbox_url || '',
      path: p.path || '',
      filename: p.filename || '',
      width: p.width, height: p.height, orientation: p.orientation,
      date_key: p.date_key || '', datetime_original: p.datetime_original || '',
      make: p.make || '', model: p.model || '', lens_model: p.lens_model || '',
      f_number: p.f_number, exposure_time: p.exposure_time || '', exposure_seconds: p.exposure_seconds,
      iso: p.iso, focal_length: p.focal_length, focal_length_35mm: p.focal_length_35mm,
      aperture_bucket: p.aperture_bucket || '', focal_bucket: p.focal_bucket || '', iso_bucket: p.iso_bucket || '',
      gps_lat: p.gps_lat, gps_lon: p.gps_lon, gps_place: p.gps_place || '',
      previewable: true,
    };
  }

  // 组件点击卡片时调这个 —— 不能直接用上面的 openDetail。
  // #collection-detail-screen 的显隐动画还在 legacy 的 openCollectionDetail 里，
  // 它做完动画会回调 bridge.openDetail -> openDetail（只负责取数）。
  // 两条路必须分开：只调 openDetail 则容器不显示，只调 legacy 则拿不到数据。
  function requestDetail(col) {
    const PS = window.PS;
    if (PS && typeof PS.openCollectionDetail === 'function') {
      PS.openCollectionDetail(col);
      return Promise.resolve(null);
    }
    return openDetail(col);
  }

  function closeDetail() {
    detailOpen.value = false;
    // 不清理灯箱的 navList：灯箱还开着时集锦上下文要留着（legacy 同款语义），
    // navList 由 lightbox store 在 open 变 false 时自行清空。
  }

  function refreshDetail() {
    if (!detailOpen.value || !detail.value) return Promise.resolve(null);
    return fetchDetail(String(detail.value.id), detail.value);
  }

  // ---------------- 灯箱 ----------------

  // 打开集锦内某张照片：把整个集锦的有序列表交给灯箱 store，翻页就在这个列表里循环。
  async function openPhoto(photoId) {
    const col = detail.value;
    if (!col) return;
    const photos = col.photos || [];
    const ids = col.photo_ids || [];
    // 以 photo_ids 的顺序为准；缺详细信息的补一个最小对象，保证翻页不跳号
    const ordered = (ids.length ? ids : photos.map((p) => p.id)).map((id) => {
      const found = photos.find((x) => String(x.id) === String(id));
      return found ? toFullPhoto(found) : toFullPhoto({ id });
    });
    let idx = ordered.findIndex((p) => String(p.id) === String(photoId));
    if (idx < 0) idx = 0;

    const lightbox = useLightboxStore();
    lightbox.setNavList(ordered);
    const target = ordered[idx] || null;
    if (!target) {
      lightbox.clearNavList();
      return;
    }
    // 走 store 而不是 PS.openLightbox：Vue 模式下 PS.openLightbox 已被 LightboxShell 劫持，
    // 但 legacy 模式下没有，统一走 store 两种模式行为一致。
    lightbox.openLightbox(target);
  }

  function setStatus(msg) {
    status.value = msg || '';
  }
  function setDetailStatus(msg) {
    detailStatus.value = msg || '';
  }

  return {
    items, loading, generating, status, open,
    count, isEmpty,
    detail, detailOpen, detailStatus, detailLoading,
    detailPhotos, detailCount, detailSubtitle,
    fetchList, generate, openPage, closePage,
    openDetail, requestDetail, closeDetail, refreshDetail, fetchDetail,
    openPhoto,
    setStatus, setDetailStatus,
    cleanSubtitle,
  };
});
