<script setup>
import { computed } from 'vue';
import { useSettingsStore } from '../stores/settings.js';
import InterfaceSettings from '../settings/InterfaceSettings.vue';
import ExportSettings from '../settings/ExportSettings.vue';
import StorageSettings from '../settings/StorageSettings.vue';
import PluginsSettings from '../settings/PluginsSettings.vue';
import ShortcutsSettings from '../settings/ShortcutsSettings.vue';
import AboutSettings from '../settings/AboutSettings.vue';

const store = useSettingsStore();
const tabs = computed(() => store.tabs());
const activeTab = computed(() => store.tab);

const PANELS = {
  interface: InterfaceSettings,
  export: ExportSettings,
  storage: StorageSettings,
  plugins: PluginsSettings,
  shortcuts: ShortcutsSettings,
  about: AboutSettings,
};
const currentPanel = computed(() => PANELS[activeTab.value] || null);

function setTab(key) {
  store.setTab(key);
}

function close() {
  const PS = window.PS;
  if (PS && PS.closeSettingsPage) PS.closeSettingsPage();
}
</script>

<!-- P3：多根组件，由 main.js 直接挂载到 #settings-screen 本身。
     .settings-screen 是 flex column，两个根节点分别是：
       .settings-topbar  (flex:none, 48px)
       .settings-scroll  (flex:1, min-height:0, overflow:auto)
     中间不能多包一层 div，否则 flex 布局与滚动都会失效。
     同统计屏的教训：先查外层容器的布局模式，再决定挂载层级与根节点数量。 -->
<template>
  <div class="settings-topbar">
    <button class="ghost-btn back-btn" type="button" @click="close">
      <span aria-hidden="true">←</span><span>返回图库</span>
    </button>
    <nav class="settings-nav" aria-label="设置分页">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        class="settings-nav-btn"
        :class="{ active: activeTab === t.key }"
        :data-settings-tab="t.key"
        @click="setTab(t.key)"
      >
        <span class="settings-nav-label">{{ t.label }}</span>
      </button>
    </nav>
  </div>

  <div class="settings-scroll">
    <div class="settings-body">
      <!-- :key 绑定 openSeq：每次打开强制重建，让各设置页重新读取 PS.state 的当前值 -->
      <component :is="currentPanel" v-if="store.open && currentPanel" :key="store.openSeq" />
      <div v-else-if="store.open && !currentPanel" class="ps-settings-empty">暂无设置项</div>
    </div>
  </div>
</template>

<style scoped>
/* style.css 把 .settings-scroll 设成了 scrollbar-width:none，
   内容溢出时完全没有滚动提示。这里恢复一条细滚动条
   （scoped 选择器带 data-v 属性，优先级高于 settings.css 的同类名规则）。 */
.settings-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.22) transparent;
}
.settings-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.settings-scroll::-webkit-scrollbar-track { background: transparent; }
.settings-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.18);
  border-radius: 4px;
}
.settings-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.32); }
</style>
