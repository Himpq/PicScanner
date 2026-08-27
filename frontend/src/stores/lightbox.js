import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { LIGHTBOX_MIN_ZOOM, LIGHTBOX_MAX_ZOOM, LIGHTBOX_ZOOM_STEP } from '../constants.js';
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

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
    const PS = window.PS;
    if (PS && typeof PS.openLightbox === 'function') PS.openLightbox(p);
  }

  function closeLightbox() {
    open.value = false;
    syncToLegacy();
    const PS = window.PS;
    if (PS && typeof PS.closeLightbox === 'function') PS.closeLightbox();
  }

  function nextPhoto() {
    const PS = window.PS;
    if (PS && typeof PS.lightboxNext === 'function') PS.lightboxNext();
  }
  function prevPhoto() {
    const PS = window.PS;
    if (PS && typeof PS.lightboxPrev === 'function') PS.lightboxPrev();
  }

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
