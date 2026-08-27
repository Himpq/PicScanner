<script setup>
import { computed } from 'vue';
import { useQuickEditStore } from '../../stores/quickEdit.js';

const store = useQuickEditStore();
const photo = computed(() => store.photo);
const title = computed(() => photo.value ? (photo.value.filename || photo.value.path || '快速调整') : '快速调整');
</script>

<template>
  <div class="qe-header">
    <div class="qe-title">{{ title }}</div>
    <button class="ghost-btn" @click="store.closeQuickEdit()">关闭</button>
  </div>
</template>

<style scoped>
.qe-header { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid var(--border,#2a2a2a); }
.qe-title { font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
</style>
