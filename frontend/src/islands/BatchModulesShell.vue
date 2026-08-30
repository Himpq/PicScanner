<script setup>
import { onMounted, computed } from 'vue';
import { useBatchStore } from '../stores/batch.js';
import { useModulesStore } from '../stores/modules.js';
import { useLegacySync } from '../composables/useLegacySync.js';
import BatchQueue from '../components/batch/BatchQueue.vue';

const batch = useBatchStore();
const mods = useModulesStore();

const count = computed(() => batch.count);
const hasSelection = computed(() => batch.hasSelection);
const modules = computed(() => mods.modules);
const hasModules = computed(() => mods.hasModules);
const activeKey = computed(() => mods.activeKey);
const menuOpen = computed(() => mods.menuOpen);

function clearBatch() { batch.clear(); }
function runBatch() { batch.run(); }
function toggleMenu() { mods.setMenuOpen(!mods.menuOpen); }
function openMod(key) { mods.openModule(key); mods.setMenuOpen(false); }
function closeMod() { mods.closeModule(); }

onMounted(() => {
  mods.bootstrap().catch(()=>{});
});
// P1：批量选择变更走 batch_selection.js 的 PS.notifyVue()，模块开关走 app_modules.js 的，
// 由 rAF 合并驱动；代理未安装时才回退 900ms 轮询
useLegacySync(() => {
  batch.hydrateFromLegacy();
  mods.hydrateFromLegacy();
}, 900);
</script>

<template>
  <div class="ps-batch-modules-shell">
    <!-- 批量选择条（Vue 版，仍委托 PS.batchSelectionController） -->
    <div class="batch-selection-bar" :class="{ hidden: !hasSelection }" role="status" aria-live="polite">
      <div class="batch-selection-count"><b>{{ count }}</b><span>张已选择</span></div>
      <div class="batch-selection-actions">
        <button class="batch-selection-run" type="button" @click="runBatch"><kbd>H</kbd><span>修图</span></button>
        <button class="batch-selection-clear" type="button" @click="clearBatch"><kbd>Esc</kbd><span>清空</span></button>
      </div>
    </div>

    <!-- 模块下拉（Vue 版，委托 PicScannerModules） -->
    <div class="qe-module-dropdown" :class="{ hidden: !hasModules && !menuOpen }" data-qe-module-dropdown>
      <button class="ghost-btn qe-module-trigger" type="button" data-qe-module-trigger :aria-expanded="menuOpen ? 'true' : 'false'" @click="toggleMenu">模块</button>
      <div class="qe-module-menu" :class="{ hidden: !menuOpen }" data-qe-module-menu role="menu">
        <button v-for="m in modules" :key="m.key" type="button" class="module-option" role="menuitem" :data-module-key="m.key" @click="openMod(m.key)">
          <b>{{ m.name || m.key }}</b><em v-if="m.description">{{ m.description }}</em>
        </button>
        <div v-if="!modules.length" class="ps-settings-empty">暂无模块</div>
      </div>
    </div>

    <div v-if="activeKey" class="qe-module-active">
      <span>当前模块：{{ activeKey }}</span>
      <button class="ghost-btn" @click="closeMod">关闭</button>
    </div>

    <BatchQueue />
  </div>
</template>

<style scoped>
.ps-batch-modules-shell { display:flex; flex-direction:column; gap:8px; }
.batch-selection-bar { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border:1px solid var(--border,#2a2a2a); border-radius:8px; background: rgba(224,164,90,0.08); }
.batch-selection-bar.hidden { display:none; }
.qe-module-dropdown { position:relative; }
.qe-module-menu { position:absolute; top:100%; left:0; min-width:200px; background: var(--panel,#1e1e1e); border:1px solid var(--border,#333); border-radius:8px; padding:6px; z-index:10; }
.qe-module-menu.hidden { display:none; }
.module-option { display:flex; flex-direction:column; align-items:flex-start; width:100%; padding:6px 8px; border:none; background:transparent; cursor:pointer; text-align:left; }
.module-option:hover { background: rgba(255,255,255,0.06); }
.qe-module-active { display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border:1px dashed var(--border,#333); border-radius:8px; font-size:12px; }
</style>
