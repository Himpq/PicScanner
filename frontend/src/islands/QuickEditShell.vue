<script setup>
import { computed, ref } from 'vue';
import { useQuickEditStore } from '../stores/quickEdit.js';
import { useLegacySync } from '../composables/useLegacySync.js';
import QuickEditSliders from '../quickedit/QuickEditSliders.vue';
import QuickEditHeader from '../components/quickedit/QuickEditHeader.vue';
import QuickEditHistogram from '../components/quickedit/QuickEditHistogram.vue';
import QuickEditHSL from '../components/quickedit/QuickEditHSL.vue';
import QuickEditFrameLUT from '../components/quickedit/QuickEditFrameLUT.vue';

const store = useQuickEditStore();
const open = computed(() => store.open);
const hasPhoto = computed(() => store.hasPhoto);
const activeTab = ref('adjust');

function setTab(key) { activeTab.value = key; }

// P1：快速调整开关走 app.js 的 PS.notifyVue()，由 rAF 合并驱动；
// 代理未安装时才回退 900ms 轮询
useLegacySync(() => store.hydrateFromLegacy(), 900);

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

    <div class="ps-quick-edit-side">
      <div v-show="activeTab === 'adjust'" class="quick-edit-panel-page" data-quick-edit-panel-page="adjust">
        <div v-if="!hasPhoto" class="ps-settings-empty">未选择照片</div>
        <template v-else>
          <QuickEditHistogram />
          <QuickEditSliders ref="slidersRef" />
          <QuickEditHSL />
        </template>
      </div>
      <div v-show="activeTab === 'frame'" class="quick-edit-panel-page" data-quick-edit-panel-page="frame">
        <QuickEditFrameLUT />
      </div>
      <div v-show="activeTab === 'hsl'" class="quick-edit-panel-page" data-quick-edit-panel-page="hsl">
        <QuickEditHSL />
      </div>
    </div>

    <div class="qe-preview-host">
      <div class="ps-settings-empty">预览画布仍由 legacy `quick_edit_worker` + `quick_edit_geometry` 驱动，Vue 侧通过 `useQuickEditStore.setParam` 驱动重绘。</div>
    </div>
  </div>
</template>

<style scoped>
.ps-quickedit-shell { display:flex; flex-direction:column; height:100%; background: var(--bg, #151515); border:1px solid var(--border, #2a2a2a); border-radius:8px; overflow:hidden; }
.quick-edit-panel-tabs { display:flex; gap:6px; padding:8px; border-bottom:1px solid var(--border,#2a2a2a); }
.quick-edit-panel-tab { padding:6px 10px; border:1px solid transparent; border-radius:6px; background:transparent; cursor:pointer; }
.quick-edit-panel-tab.active { background: rgba(224,164,90,0.14); border-color: rgba(224,164,90,0.35); color: #e0a45a; }
.ps-quick-edit-side { flex:1; overflow:auto; padding:10px; }
.qe-preview-host { padding:10px; border-top:1px solid var(--border,#2a2a2a); font-size:12px; }
</style>
