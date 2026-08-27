<script setup>
import { computed } from 'vue';
import { useLightboxStore } from '../../stores/lightbox.js';

const store = useLightboxStore();
const compareOpen = computed(() => store.compareOpen);
const selected = computed(() => store.compareSelected);

function closeCompare() {
  const PS = window.PS;
  if (PS && typeof PS.closeCompare === 'function') PS.closeCompare();
  store.compareOpen = false;
}
function toggleLock() {
  store.compareLocked = !store.compareLocked;
  const PS = window.PS;
  if (PS && PS.state && PS.state.compare) PS.state.compare.locked = store.compareLocked;
}
</script>

<template>
  <div v-if="compareOpen" class="compare-view">
    <div class="compare-head">
      <span>对比模式</span>
      <label><input type="checkbox" :checked="store.compareLocked" @change="toggleLock" /> 锁定同步</label>
      <button class="ghost-btn" @click="closeCompare">退出对比</button>
    </div>
    <div class="compare-grid">
      <div v-for="(photo, idx) in selected" :key="idx" class="compare-pane" :class="{ filled: !!photo }">
        <img v-if="photo && (photo.preview_url || photo.thumbnail_url)" :src="photo.preview_url || photo.thumbnail_url" alt="" />
        <div v-else class="compare-empty">未选择 {{ idx === 0 ? '左图' : '右图' }}</div>
        <div class="compare-label">{{ idx === 0 ? '左' : '右' }} · {{ photo ? (photo.filename || '未命名') : '空' }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compare-view { border:1px solid var(--border,#2a2a2a); border-radius:8px; background:#0d0d10; padding:8px; }
.compare-head { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:11px; margin-bottom:8px; }
.compare-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.compare-pane { position:relative; aspect-ratio: 4/3; border:1px solid rgba(255,255,255,0.08); border-radius:8px; overflow:hidden; background:#08080a; display:grid; place-items:center; }
.compare-pane img { width:100%; height:100%; object-fit:contain; }
.compare-empty { font-size:11px; color: var(--muted,#9aa0a6); }
.compare-label { position:absolute; bottom:0; left:0; right:0; padding:4px 6px; background: rgba(0,0,0,0.6); font-size:10px; color:#fff; }
</style>
