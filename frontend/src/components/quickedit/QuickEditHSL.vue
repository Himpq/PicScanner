<script setup>
import { ref } from 'vue';
import { useQuickEditStore } from '../../stores/quickEdit.js';

const store = useQuickEditStore();
const colors = [
  { key: 'red', label: 'R', name: '红' },
  { key: 'orange', label: 'O', name: '橙' },
  { key: 'yellow', label: 'Y', name: '黄' },
  { key: 'green', label: 'G', name: '绿' },
  { key: 'aqua', label: 'A', name: '青' },
  { key: 'blue', label: 'B', name: '蓝' },
  { key: 'purple', label: 'P', name: '紫' },
  { key: 'magenta', label: 'M', name: '品红' },
];
const active = ref('red');

function setHslParam(type, value) {
  const key = `hsl_${active.value}_${type}`;
  store.setParam(key, Number(value));
}
function colorValue(type) {
  const key = `hsl_${active.value}_${type}`;
  const PS = window.PS;
  if (PS && PS.state && PS.state.quickEdit && PS.state.quickEdit.params) {
    return Number(PS.state.quickEdit.params[key] || 0);
  }
  return 0;
}
</script>

<template>
  <div class="qe-hsl">
    <div class="qe-hsl-tabs">
      <button v-for="c in colors" :key="c.key" :class="{ active: active === c.key }" @click="active = c.key">{{ c.label }}</button>
    </div>
    <div class="qe-hsl-sliders">
      <label>色相 <input type="range" min="-100" max="100" :value="colorValue('hue')" @input="e => setHslParam('hue', e.target.value)" /></label>
      <label>饱和度 <input type="range" min="-100" max="100" :value="colorValue('saturation')" @input="e => setHslParam('saturation', e.target.value)" /></label>
      <label>明度 <input type="range" min="-100" max="100" :value="colorValue('luminance')" @input="e => setHslParam('luminance', e.target.value)" /></label>
    </div>
    <small class="qe-hsl-hint">HSL 由 legacy 的 quick_edit_worker 驱动，Vue 仅做参数代理。</small>
  </div>
</template>

<style scoped>
.qe-hsl { border:1px solid var(--border,#2a2a2a); border-radius:8px; background:#0d0d10; padding:8px; }
.qe-hsl-tabs { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:8px; }
.qe-hsl-tabs button { width:26px; height:26px; border-radius:50%; border:1px solid rgba(255,255,255,0.12); background: #1a1a1e; color:#fff; font-size:11px; cursor:pointer; }
.qe-hsl-tabs button.active { border-color:#e0a45a; background: rgba(224,164,90,0.2); }
.qe-hsl-sliders { display:grid; gap:6px; }
.qe-hsl-sliders label { display:grid; grid-template-columns:50px 1fr; align-items:center; font-size:11px; gap:6px; }
.qe-hsl-hint { display:block; margin-top:6px; font-size:10px; color: var(--muted,#9aa0a6); }
</style>
