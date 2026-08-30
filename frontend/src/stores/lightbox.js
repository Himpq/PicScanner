import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { LIGHTBOX_MIN_ZOOM, LIGHTBOX_MAX_ZOOM, LIGHTBOX_ZOOM_STEP } from '../constants.js';
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function isVueLightboxEnabled() {
  try {
    const p = new URLSearchParams(location.search);
    if (p.has('vue_lightbox')) return p.get('vue_lightbox') !== '0';
    const v = localStorage.getItem('vue_lightbox');
    if (v === '0') return false;
    if (v === '1') return true;
    return true;
  } catch { return true; }
}

export const useLightboxStore = defineStore('lightbox', () => {
  const photo = ref(null);
  const zoom = ref(1);
  const panX = ref(0);
  const panY = ref(0);
  const dragging = ref(false);

  const infoVisible = ref(true);
  const infoX = ref(18);
  const infoY = ref(18);
  const infoW = ref(310);
  const infoH = ref(0);
  const infoDetailsCollapsed = ref(false);

  const open = ref(false);
  const compareOpen = ref(false);
  const compareSelected = ref([null, null]);
  const compareLocked = ref(true);

  const loading = ref(false);
  const previewing = ref(false);

  const navHoverSide = ref('');

  // P3 · 翻页列表（集锦上下文）
  //
  // 为空时按图库顺序翻页（orderedPhotos），不循环；
  // 非空时（进入集锦灯箱）按这个列表翻页并首尾循环。
  //
  // 这段取代了 legacy collections.js 里的 patchLightboxNav()：
  // 那一版用 document 捕获监听 + 包装 __lightboxStore.prev/next + 轮询重试，
  // 靠 DOM 事件顺序去「抢」翻页控制权，既脆又难排查。
  // 现在翻页列表是 store 的一等状态，stepPhoto 直接读。
  const navList = ref(null);

  function setNavList(list) {
    navList.value = Array.isArray(list) && list.length ? list : null;
  }
  function clearNavList() {
    navList.value = null;
  }
  // 灯箱一关就丢掉集锦上下文（等价于 legacy 在灯箱关闭后清 __collectionsContext）
  watch(open, (isOpen) => { if (!isOpen) navList.value = null; });

  function hydrateFromLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state) return;
    const lb = PS.state.lightbox;
    if (!lb) return;
    // 严格复刻原版持久化：优先从 preferredSize/Position 恢复尺寸/位置
    try {
      const ps = PS.state.lightboxInfoPreferredSize;
      if (ps && typeof ps.width === 'number') infoW.value = Number(ps.width || 310);
      if (ps && typeof ps.height === 'number') infoH.value = Number(ps.height || 0);
      const pp = PS.state.lightboxInfoPreferredPosition;
      if (pp && typeof pp.x === 'number') { infoX.value = Number(pp.x); infoY.value = Number(pp.y); }
    } catch {}
    if (isVueLightboxEnabled()) {
      // Vue 真源模式：open/photo/zoom/pan 由 Vue store 权威驱动。
      // 若在此覆盖 open，legacy #lightbox 处于 hidden（Vue 打开时被隐藏），
      // hydrate 会把 open 打回 false，导致灯箱一打开就关闭（LightboxStage onMounted 曾触发）。
      // 仅镜像 legacy 侧的 compare 与 info 面板偏好。
      infoVisible.value = lb.infoVisible !== false;
      // 若无 preferredPosition 则回退 lb.infoX/Y，避免覆盖已恢复的持久化位置
      try {
        const pp2 = PS.state.lightboxInfoPreferredPosition;
        if (!pp2 || typeof pp2.x !== 'number') { infoX.value = Number(lb.infoX || 18); infoY.value = Number(lb.infoY || 18); }
      } catch { infoX.value = Number(lb.infoX || 18); infoY.value = Number(lb.infoY || 18); }
      infoDetailsCollapsed.value = !!PS.state.lightboxInfoDetailsCollapsed;
      if (PS.state.compare) {
        // Vue 的 compareOpen 仅对应灯箱内的对比（legacy 的 compare.lightbox），
        // 画廊里的对比面板（compare.open && !lightbox）由 legacy DOM 自行管理，
        // Vue 不应将其镜像为 compareOpen，否则会抢占 Esc 导致面板无法关闭。
        const lightboxCompare = !!PS.state.compare.lightbox;
        const hasVueLightbox = !!(open.value || (PS.els && PS.els.lightbox && !PS.els.lightbox.classList.contains('hidden')) || document.getElementById('vue-lightbox')?.childElementCount);
        // 仅当 Vue 灯箱已打开或 legacy 处于 lightbox 对比时，才以 lightbox 标志为准
        if (open.value || lightboxCompare) {
          compareOpen.value = lightboxCompare;
        } else {
          // 画廊对比面板打开时，保持 Vue 的 compareOpen 为 false，避免拦截 Esc
          if (!PS.state.compare.open) compareOpen.value = false;
        }
        compareSelected.value = [...(PS.state.compare.selected || [null, null])];
        compareLocked.value = !!PS.state.compare.locked;
      }
      return;
    }
    photo.value = lb.photo || null;
    zoom.value = Number(lb.zoom || 1);
    panX.value = Number(lb.panX || 0);
    panY.value = Number(lb.panY || 0);
    infoVisible.value = lb.infoVisible !== false;
    infoX.value = Number(lb.infoX || 18);
    infoY.value = Number(lb.infoY || 18);
    infoDetailsCollapsed.value = !!PS.state.lightboxInfoDetailsCollapsed;
    open.value = !!(PS.els && PS.els.lightbox && !PS.els.lightbox.classList.contains('hidden'));
    // compare
    if (PS.state.compare) {
      compareOpen.value = !!PS.state.compare.open;
      compareSelected.value = [...(PS.state.compare.selected || [null, null])];
      compareLocked.value = !!PS.state.compare.locked;
    }
  }

  function syncToLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state || !PS.state.lightbox) return;
    PS.state.lightbox.photo = photo.value;
    PS.state.lightbox.zoom = zoom.value;
    PS.state.lightbox.panX = panX.value;
    PS.state.lightbox.panY = panY.value;
    PS.state.lightbox.infoVisible = infoVisible.value;
    PS.state.lightbox.infoX = infoX.value;
    PS.state.lightbox.infoY = infoY.value;
    PS.state.lightboxInfoDetailsCollapsed = infoDetailsCollapsed.value;
    if (PS.state.compare) {
      PS.state.compare.selected = [...compareSelected.value];
      PS.state.compare.locked = compareLocked.value;
      // Vue 的 compareOpen 语义为“灯箱内对比”（legacy lightbox），
      // 仅当 Vue 灯箱相关状态变化时才同步到 legacy，避免覆盖画廊对比面板（compare.open && !lightbox）。
      // 画廊对比面板完全由 legacy 自管，Vue 在 lightbox 关闭且自身 compareOpen 为 false 时不得覆写 open。
      if (open.value || compareOpen.value || PS.state.compare.lightbox) {
        PS.state.compare.open = compareOpen.value;
        PS.state.compare.lightbox = compareOpen.value;
      }
      // else：画廊对比面板打开期间（lightbox=false, Vue compareOpen=false），保留 legacy 的 open=true，不触碰
    }
  }

  function formatZoom(v) { return Number(v || 1).toFixed(2) + '×'; }
  function parseZoomInput(value) {
    const raw = String(value || '').trim().toLowerCase().replace('×','x');
    if (!raw) return null;
    const isPercent = raw.endsWith('%');
    const cleaned = raw.replace(/[x%]/g,'').trim();
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return isPercent ? parsed/100 : parsed;
  }

  function setZoom(next) {
    const v = clamp(Number(next || 1), LIGHTBOX_MIN_ZOOM, LIGHTBOX_MAX_ZOOM);
    zoom.value = v;
    syncToLegacy();
    const PS = window.PS;
    if (PS && typeof PS.setLightboxZoom === 'function') PS.setLightboxZoom(v);
  }

  function zoomIn() { setZoom(zoom.value * LIGHTBOX_ZOOM_STEP); }
  function zoomOut() { setZoom(zoom.value / LIGHTBOX_ZOOM_STEP); }
  function applyZoomInput(input) {
    const parsed = parseZoomInput(input);
    if (parsed === null) return formatZoom(zoom.value);
    setZoom(parsed);
    return formatZoom(zoom.value);
  }

  function setInfoVisible(visible) {
    infoVisible.value = !!visible;
    syncToLegacy();
    const PS = window.PS;
    if (PS && typeof PS.setLightboxInfoVisible === 'function') PS.setLightboxInfoVisible(infoVisible.value);
  }

  function setDetailsCollapsed(collapsed) {
    infoDetailsCollapsed.value = !!collapsed;
    syncToLegacy();
    const PS = window.PS;
    if (PS && typeof PS.setLightboxInfoDetailsCollapsed === 'function') PS.setLightboxInfoDetailsCollapsed(infoDetailsCollapsed.value);
  }

  function openLightbox(p) {
    photo.value = p || null;
    zoom.value = 1;
    panX.value = 0;
    panY.value = 0;
    open.value = true;
    syncToLegacy();
    if (isVueLightboxEnabled()) {
      // Vue 真源：隐藏 legacy 灯箱，避免双层
      try { const el = document.getElementById('lightbox'); if (el) el.classList.add('hidden'); } catch {}
      const PS = window.PS;
      if (PS && PS.state && PS.state.lightbox) { PS.state.lightbox.photo = p; PS.state.lightbox.zoom = 1; PS.state.lightbox.panX = 0; PS.state.lightbox.panY = 0; }
      return;
    }
    const PS = window.PS;
    if (PS && typeof PS.openLightbox === 'function') PS.openLightbox(p);
  }

  function closeLightbox() {
    const wasCompare = !!compareOpen.value;
    open.value = false;
    if (wasCompare) {
      compareOpen.value = false;
      compareSelected.value = [null, null];
    }
    syncToLegacy();
    if (isVueLightboxEnabled()) {
      const PS = window.PS;
      if (PS && PS.state && PS.state.lightbox) PS.state.lightbox.photo = null;
      if (wasCompare && PS && PS.state && PS.state.compare) {
        PS.state.compare.open = false;
        PS.state.compare.lightbox = false;
        PS.state.compare.selected = [null, null];
        if (PS.state.compare.panel) try { PS.state.compare.panel.classList.add('hidden'); } catch {}
        if (typeof PS.renderComparePanel === 'function') try { PS.renderComparePanel(); } catch {}
        if (typeof PS.updateCompareCardHighlights === 'function') try { PS.updateCompareCardHighlights(); } catch {}
      }
      return;
    }
    const PS = window.PS;
    if (PS && typeof PS.closeLightbox === 'function') PS.closeLightbox();
  }

  function orderedPhotos() {
    // 优先用 Pinia gallery 的有序列表（与 PhotoGrid 虚拟顺序一致）
    try {
      const g = window.PicScannerVue && window.PicScannerVue.pinia ? null : null;
    } catch {}
    // 直接读 gallery store（避免循环导入，用 window 兜底 + 同步 import）
    // 同步尝试：从 PS.state 取有序（Legacy 已按 sort 排好）
    const PS = window.PS;
    if (PS && PS.state && Array.isArray(PS.state.dates) && PS.state.dates.length) {
      const out = [];
      const sortKey = PS.state.sortKey || 'datetime_desc';
      const dates = [...PS.state.dates].sort((a,b)=>{
        const l=String(a.date_key||''), r=String(b.date_key||'');
        return sortKey==='datetime_asc' ? l.localeCompare(r) : r.localeCompare(l);
      });
      for (const d of dates) {
        const key = d.date_key;
        // 从 legacy cache 或 gallery pinia 尝试
        let arr = [];
        try {
          // gallery pinia 的 photoCache
          const mod = window.__galleryStore;
          if (mod && mod.photoCache && mod.photoCache.get) {
            const v = mod.photoCache.get(key);
            if (Array.isArray(v) && v.length) arr = v;
          }
        } catch {}
        if (!arr.length && PS.state.photoOffsets) {
          // 用 photoCache Map<id,photo> 过滤出该日期的
          // fallback：遍历 photoCache 按 filename/date
          const bucket = [];
          PS.state.photoCache && PS.state.photoCache.forEach((ph)=>{
            if (String(ph.date_key||'')===String(key)) bucket.push(ph);
          });
          arr = bucket;
        }
        if (arr.length) out.push(...arr);
      }
      if (out.length) return out;
    }
    // 最后兜底：仅 photoCache 全部
    const PS2 = window.PS;
    if (PS2 && PS2.state && PS2.state.photoCache) return Array.from(PS2.state.photoCache.values());
    return [];
  }

  // legacy 模式下 LightboxShell 会把 PS.lightboxNext/Prev 劫持成 store.nextPhoto/prevPhoto，
  // 而这一支又反过来调 PS.lightboxNext —— 没有守卫就是无限递归。
  let stepping = false;

  function stepPhoto(dir) {
    if (stepping) return;
    stepping = true;
    try {
      stepPhotoInner(dir);
    } finally {
      stepping = false;
    }
  }

  function stepPhotoInner(dir) {
    const nav = navList.value;
    const inCollection = Array.isArray(nav) && nav.length > 0;
    const list = inCollection ? nav : orderedPhotos();
    if (!list.length || !photo.value) return;

    const curId = String(photo.value.id || photo.value.photo_id || '');
    let idx = list.findIndex((p) => String(p.id || p.photo_id) === curId);
    if (idx < 0) idx = 0;

    // 集锦内首尾循环（复刻 patchLightboxNav 的取模行为）；图库顺序则不循环，走到头就停
    const nextIdx = inCollection ? (idx + dir + list.length) % list.length : idx + dir;
    const next = list[nextIdx];
    if (!next) return;

    if (isVueLightboxEnabled()) {
      photo.value = next;
      zoom.value = 1; panX.value = 0; panY.value = 0;
      syncToLegacy();
      if (window.PS && window.PS.state && window.PS.state.lightbox) { window.PS.state.lightbox.photo = next; }
      return;
    }

    // legacy 灯箱模式：有集锦列表时仍要按集锦翻页（PS.openLightbox 此时未被劫持，指向原生实现）
    if (inCollection) {
      photo.value = next;
      zoom.value = 1; panX.value = 0; panY.value = 0;
      syncToLegacy();
      const PS = window.PS;
      if (PS && typeof PS.openLightbox === 'function') PS.openLightbox(next);
      return;
    }

    const PS = window.PS;
    if (dir > 0 && PS && typeof PS.lightboxNext === 'function') PS.lightboxNext();
    if (dir < 0 && PS && typeof PS.lightboxPrev === 'function') PS.lightboxPrev();
  }
  function nextPhoto() { stepPhoto(1); }
  function prevPhoto() { stepPhoto(-1); }

  const focalText = computed(() => {
    const p = photo.value;
    const base = Number(p && p.focal_length_35mm);
    if (!Number.isFinite(base) || base <= 0) return '等效 --';
    const rounded = Math.round(base * zoom.value * 10) / 10;
    const txt = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return '等效 ' + txt + 'mm';
  });

  const apscText = computed(() => {
    const p = photo.value;
    const focal = Number(p && p.focal_length);
    const equiv = Number(p && p.focal_length_35mm);
    if (!Number.isFinite(focal) || !Number.isFinite(equiv) || focal <= 0 || equiv <= 0) return '';
    const crop = equiv / focal;
    if (crop < 1.35 || crop > 1.75) return '';
    const rounded = Math.round(focal * zoom.value * 10) / 10;
    const txt = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return 'APS-C ' + txt + 'mm';
  });

  return {
    photo, zoom, panX, panY, dragging,
    infoVisible, infoX, infoY, infoW, infoH, infoDetailsCollapsed,
    open, compareOpen, compareSelected, compareLocked, navHoverSide,
    loading, previewing,
    navList, setNavList, clearNavList,
    focalText, apscText,
    hydrateFromLegacy, syncToLegacy,
    formatZoom, parseZoomInput, setZoom, zoomIn, zoomOut, applyZoomInput,
    setInfoVisible, setDetailsCollapsed,
    openLightbox, closeLightbox, nextPhoto, prevPhoto,
  };
});
