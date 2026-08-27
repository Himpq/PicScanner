<script setup>
import { computed } from 'vue';
import { useBatchStore } from '../../stores/batch.js';

const store = useBatchStore();
const selected = computed(() => store.selected);
const count = computed(() => store.count);
const running = computed(() => store.running);
</script>

<template>
  <div class="batch-queue">
    <div class="batch-queue-head">
      <span>批量队列 · {{ count }} 张</span>
      <span v-if="running" class="running">处理中...</span>
      <span v-else class="idle">待处理</span>
    </div>
    <div v-if="!selected.length" class="empty">未选择照片，按住 Ctrl 点选照片</div>
    <div v-else class="queue-grid">
      <div v-for="photo in selected.slice(0, 12)" :key="photo.id || photo.photo_id || photo.path" class="queue-item">
        <img v-if="photo.thumbnail_url || photo.preview_url" :src="photo.thumbnail_url || photo.preview_url" alt="" />
        <span>{{ photo.filename || '未命名' }}</span>
      </div>
      <div v-if="selected.length > 12" class="more">+{{ selected.length - 12 }} 张</div>
    </div>
    <div class="queue-actions">
      <button class="ghost-btn" :disabled="!count" @click="store.run()">开始批量修图</button>
      <button class="ghost-btn" :disabled="!count" @click="store.clear()">清空</button>
    </div>
  </div>
</template>

<style scoped>
.batch-queue { border:1px solid var(--border,#2a2a2a); border-radius:8px; background:#0d0d10; padding:8px; }
.batch-queue-head { display:flex; justify-content:space-between; font-size:11px; color: var(--muted,#9aa0a6); margin-bottom:6px; }
.running { color:#ffb817; }
.queue-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; }
.queue-item { aspect-ratio: 1; border-radius:6px; overflow:hidden; background:#1a1a1e; position:relative; }
.queue-item img { width:100%; height:100%; object-fit:cover; }
.queue-item span { position:absolute; bottom:0; left:0; right:0; padding:2px 4px; background: rgba(0,0,0,0.6); font-size:9px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.more { grid-column: 1 / -1; text-align:center; font-size:11px; color: var(--muted,#9aa0a6); padding:4px; }
.queue-actions { display:flex; gap:6px; margin-top:8px; }
.empty { font-size:11px; color: var(--muted,#9aa0a6); padding:12px; text-align:center; border:1px dashed rgba(255,255,255,0.08); border-radius:6px; }
</style>
