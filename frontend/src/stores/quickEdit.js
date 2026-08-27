import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useQuickEditStore = defineStore('quickEdit', () => {
  const photo = ref(null);
  const params = ref(null);
  const open = ref(false);
  const viewZoom = ref(1);
  const collapsed = ref({});

  function hydrateFromLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state || !PS.state.quickEdit) return;
    const qe = PS.state.quickEdit;
    photo.value = qe.photo || null;
    if (qe.params && typeof qe.params === 'object') params.value = { ...qe.params };
    open.value = !!qe.open;
    viewZoom.value = Number(qe.viewZoom || 1);
    try {
      if (PS.quickEditCollapsedSections) collapsed.value = { ...PS.quickEditCollapsedSections() };
    } catch {}
  }

  function syncToLegacy() {
    const PS = window.PS;
    if (!PS || !PS.state || !PS.state.quickEdit) return;
    if (photo.value) PS.state.quickEdit.photo = photo.value;
    if (params.value) PS.state.quickEdit.params = { ...params.value };
    PS.state.quickEdit.viewZoom = viewZoom.value;
  }

  function normalizeParams(next) {
    const PS = window.PS;
    if (PS && PS.normalizeQuickEditParams) return PS.normalizeQuickEditParams(next);
    return { ...(next || {}) };
  }

  function setParam(key, value) {
    if (!params.value) hydrateFromLegacy();
    const PS = window.PS;
    const next = normalizeParams({ ...(params.value || {}), [key]: Number(value) });
    params.value = next;
    if (PS && PS.state && PS.state.quickEdit) {
      PS.state.quickEdit.params = { ...next };
      if (PS.invalidateQuickEditRenderedPreview) PS.invalidateQuickEditRenderedPreview({ clearTimers: true });
      if (PS.syncQuickEditControls) PS.syncQuickEditControls();
      const raw = PS.quickEditUsesRawDevelopPipeline && PS.quickEditUsesRawDevelopPipeline() && PS.quickEditIsRawDevelopParamKey && PS.quickEditIsRawDevelopParamKey(key);
      if (raw) {
        if (PS.applyQuickEditPreview) PS.applyQuickEditPreview({ skipColorRender: true });
        if (PS.scheduleQuickEditRawDevelopPreview) PS.scheduleQuickEditRawDevelopPreview({ interactive: true });
      } else {
        if (PS.applyQuickEditPreview) PS.applyQuickEditPreview({ interactive: true });
        if (PS.scheduleQuickEditHistogramRender) PS.scheduleQuickEditHistogramRender(key === 'temperature' ? 320 : 180);
      }
    }
  }

  function setTemperature(value) {
    const PS = window.PS;
    const temp = PS && PS.normalizeQuickEditTemperature ? PS.normalizeQuickEditTemperature(value) : Number(value);
    setParam('temperature', temp);
  }

  function openQuickEdit(p) {
    photo.value = p || null;
    open.value = true;
    const PS = window.PS;
    if (PS && PS.openQuickEdit) PS.openQuickEdit(p);
    hydrateFromLegacy();
  }

  function closeQuickEdit() {
    open.value = false;
    const PS = window.PS;
    if (PS && PS.closeQuickEdit) PS.closeQuickEdit();
  }

  function toggleSection(key) {
    const PS = window.PS;
    if (!PS || !PS.quickEditCollapsedSections || !PS.setQuickEditCollapsedSections) return;
    const sections = PS.quickEditCollapsedSections();
    sections[key] = !sections[key];
    PS.setQuickEditCollapsedSections(sections);
    collapsed.value = { ...PS.quickEditCollapsedSections() };
  }

  const hasPhoto = computed(() => !!photo.value);

  return {
    photo, params, open, viewZoom, collapsed, hasPhoto,
    hydrateFromLegacy, syncToLegacy,
    setParam, setTemperature, openQuickEdit, closeQuickEdit, toggleSection,
  };
});
