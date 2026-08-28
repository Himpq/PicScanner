<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const luts = ref([]);
const frames = ref([]);

onMounted(() => {
  const PS = window.PS;
  if (!PS) return;
  // 尝试从 legacy 读取 LUT/相框
  try {
    if (PS.state && PS.state.quickEdit && PS.state.quickEdit.luts) luts.value = PS.state.quickEdit.luts.slice(0,6);
    if (PS.state && PS.state.quickEdit && PS.state.quickEdit.framePresets) frames.value = PS.state.quickEdit.framePresets.slice(0,6);
  } catch {}
  // 轮询
  const t = setInterval(() => {
    try {
      if (PS.state.quickEdit.luts) luts.value = PS.state.quickEdit.luts.slice(0,6);
      if (PS.state.quickEdit.framePresets) frames.value = PS.state.quickEdit.framePresets.slice(0,6);
    } catch {}
  }, 1000);
  window.__qeFrameLutTimer = t;
});
onBeforeUnmount(() => {
  if (window.__qeFrameLutTimer) { clearInterval(window.__qeFrameLutTimer); delete window.__qeFrameLutTimer; }
});

function applyLut(lut) {
  const PS = window.PS;
  if (PS && PS.applyQuickEditLut) PS.applyQuickEditLut(lut.id || lut.name);
}
function applyFrame(preset) {
  const PS = window.PS;
  if (PS && PS.applyQuickEditFramePreset) PS.applyQuickEditFramePreset(preset.id || preset.name);
}
</script>

<template>
  <div class="qe-frame-lut">
    <section>
      <h4>LUT 预设</h4>
      <div v-if="!luts.length" class="empty">暂无 LUT（由 legacy 管理）</div>
      <div v-else class="chip-grid">
        <button v-for="lut in luts" :key="lut.id || lut.name" @click="applyLut(lut)">{{ lut.name || lut.id }}</button>
      </div>
    </section>
    <section>
      <h4>相框</h4>
      <div v-if="!frames.length" class="empty">暂无相框（由 legacy 管理）</div>
      <div v-else class="chip-grid">
        <button v-for="f in frames" :key="f.id || f.name" @click="applyFrame(f)">{{ f.name || f.id }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.qe-frame-lut { display:grid; gap:12px; }
.qe-frame-lut section { border:1px solid var(--border,#2a2a2a); border-radius:8px; background:#0d0d10; padding:8px; }
.qe-frame-lut h4 { margin:0 0 6px; font-size:11px; color: var(--muted,#9aa0a6); }
.empty { font-size:11px; color: var(--muted,#9aa0a6); padding:6px; }
.chip-grid { display:flex; flex-wrap:wrap; gap:6px; }
.chip-grid button { padding:4px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.12); background:#1a1a1e; color:#fff; font-size:11px; cursor:pointer; }
.chip-grid button:hover { border-color:#e0a45a; }
</style>
