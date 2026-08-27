import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useBatchStore = defineStore('batch', () => {
  const selected = ref([]);
  const running = ref(false);
  const progress = ref({ current: 0, total: 0 });

  function hydrateFromLegacy() {
    const PS = window.PS;
    if (!PS) return;
    if (PS.batchSelectionController && typeof PS.batchSelectionController.snapshot === 'function') {
      try { selected.value = PS.batchSelectionController.snapshot(); } catch {}
    } else if (PS.state && Array.isArray(PS.state.selectedPhotos)) {
      selected.value = [...PS.state.selectedPhotos];
    }
    if (PS.batchProcessingController && typeof PS.batchProcessingController.isRunning === 'function') {
      try { running.value = !!PS.batchProcessingController.isRunning(); } catch {}
    }
  }

  const count = computed(() => selected.value.length);
  const hasSelection = computed(() => selected.value.length > 0);

  function clear() {
    const PS = window.PS;
    if (PS && PS.batchSelectionController && typeof PS.batchSelectionController.clear === 'function') {
      PS.batchSelectionController.clear();
      hydrateFromLegacy();
      return true;
    }
    selected.value = [];
    return true;
  }

  function run() {
    const PS = window.PS;
    if (PS && PS.batchSelectionController && selected.value.length) {
      // 委托给 legacy 的批量修图启动
      const ctrl = PS.batchProcessingController;
      if (ctrl && typeof ctrl.open === 'function') {
        try { ctrl.open(selected.value); hydrateFromLegacy(); return true; } catch {}
      }
    }
    // 兜底：若 legacy 未就绪，仅标记
    running.value = true;
    return true;
  }

  return { selected, running, progress, count, hasSelection, hydrateFromLegacy, clear, run };
});
