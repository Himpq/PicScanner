import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
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

  const navHoverSide = ref('');

  function hydrateFromLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state) return;
    const lb = PS.state.lightbox;
    if (!lb) return;
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
      PS.state.compare.open = compareOpen.value;
      PS.state.compare.selected = [...compareSelected.value];
      PS.state.compare.locked = compareLocked.value;
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
    open.value = false;
    syncToLegacy();
    if (isVueLightboxEnabled()) {
      const PS = window.PS;
      if (PS && PS.state && PS.state.lightbox) PS.state.lightbox.photo = null;
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

  function stepPhoto(dir) {
    if (isVueLightboxEnabled()) {
      const list = orderedPhotos();
      if (!list.length || !photo.value) return;
      const curId = String(photo.value.id || photo.value.photo_id || '');
      let idx = list.findIndex(p=> String(p.id||p.photo_id)===curId);
      if (idx < 0) idx = 0;
      const next = list[idx + dir];
      if (next) {
        photo.value = next;
        zoom.value = 1; panX.value = 0; panY.value = 0;
        syncToLegacy();
        if (window.PS && window.PS.state && window.PS.state.lightbox) { window.PS.state.lightbox.photo = next; }
      }
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
    focalText, apscText,
    hydrateFromLegacy, syncToLegacy,
    formatZoom, parseZoomInput, setZoom, zoomIn, zoomOut, applyZoomInput,
    setInfoVisible, setDetailsCollapsed,
    openLightbox, closeLightbox, nextPhoto, prevPhoto,
  };
});
