<script setup>
import { onMounted, computed, ref } from 'vue';
import { useQuickEditStore } from '../stores/quickEdit.js';
import QuickEditSliders from '../quickedit/QuickEditSliders.vue';
import QuickEditHeader from '../components/quickedit/QuickEditHeader.vue';

const store = useQuickEditStore();
const open = computed(() => store.open);
const hasPhoto = computed(() => store.hasPhoto);
const activeTab = ref('adjust');

function setTab(key) { activeTab.value = key; }

onMounted(() => {
  store.hydrateFromLegacy();
  const timer = setInterval(() => store.hydrateFromLegacy(), 900);
  window.__quickEditShellSyncTimer = timer;
});

import { onBeforeUnmount } from 'vue';
onBeforeUnmount(() => {
  if (window.__quickEditShellSyncTimer) { clearInterval(window.__quickEditShellSyncTimer); delete window.__quickEditShellSyncTimer; }
});

const slidersRef = ref(null);
function syncSliders() {
  if (slidersRef.value && slidersRef.value.refresh) slidersRef.value.refresh();
}
</script>

<template>
  <div v-if="open" class="ps-quickedit-shell">
    <QuickEditHeader />
    <div class="quick-edit-panel-tabs">
      <button type="button" class="quick-edit-panel-tab" :class="{ active: activeTab === 'adjust' }" @click="setTab('adjust')">调参</button>
      <button type="button" class="quick-edit-panel-tab" :class="{ active: activeTab === 'frame' }" @click="setTab('frame')">相框</button>
      <button type="button" class="quick-edit-panel-tab" :class="{ active: activeTab === 'hsl' }" @click="setTab('hsl')">HSL</button>
      <div class="qe-module-spacer" style="flex:1"></div>
      <button type="button" class="ghost-btn" @click="syncSliders">刷新</button>
    </div>

    <div class="quick-edit-side">
      <div v-show="activeTab === 'adjust'" class="quick-edit-panel-page" data-quick-edit-panel-page="adjust">
        <div v-if="!hasPhoto" class="settings-empty">未选择照片</div>
        <QuickEditSliders v-else ref="slidersRef" />
      </div>
      <div v-show="activeTab === 'frame'" class="quick-edit-panel-page" data-quick-edit-panel-page="frame">
        <div class="settings-empty">相框 / LUT / 预设 由 legacy 承载，Pinia 已镜像参数。后续增量将把 `quick_edit_worker` 的相框图层迁入 Vue。</div>
      </div>
      <div v-show="activeTab === 'hsl'" class="quick-edit-panel-page" data-quick-edit-panel-page="hsl">
        <div class="settings-empty">HSL / 曲线 / 分离色调 已在上方滑杆中提供，完整面板待 P4 增量。</div>
      </div>
    </div>

    <div class="qe-preview-host">
      <div class="settings-empty">预览画布仍由 legacy `quick_edit_worker` + `quick_edit_geometry` 驱动，Vue 侧通过 `useQuickEditStore.setParam` 驱动重绘。</div>
    </div>
  </div>
</template>

<style scoped>
.ps-quickedit-shell { display:flex; flex-direction:column; height:100%; background: var(--bg, #151515); border:1px solid var(--border, #2a2a2a); border-radius:8px; overflow:hidden; }
.quick-edit-panel-tabs { display:flex; gap:6px; padding:8px; border-bottom:1px solid var(--border,#2a2a2a); }
.quick-edit-panel-tab { padding:6px 10px; border:1px solid transparent; border-radius:6px; background:transparent; cursor:pointer; }
.quick-edit-panel-tab.active { background: rgba(224,164,90,0.14); border-color: rgba(224,164,90,0.35); color: #e0a45a; }
.quick-edit-side { flex:1; overflow:auto; padding:10px; }
.qe-preview-host { padding:10px; border-top:1px solid var(--border,#2a2a2a); font-size:12px; }
</style>
