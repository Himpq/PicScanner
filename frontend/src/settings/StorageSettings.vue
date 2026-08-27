<script setup>
import { ref, onMounted } from 'vue';
import { call } from '../bridge.js';

const loading = ref(true);
const error = ref('');
const sources = ref([]);

const displayId = (v) => (v === null || v === undefined || v === '' ? '--' : String(v));

onMounted(async () => {
  try {
    const res = await call('list_storage_sources');
    if (!res || !res.success) {
      throw new Error(res && res.message ? res.message : '读取存储列表失败');
    }
    sources.value = res.sources || [];
  } catch (err) {
    error.value = String(err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div v-if="loading" class="storage-list">读取中...</div>

  <div v-else-if="error" class="ps-settings-empty">{{ error }}</div>

  <div v-else-if="!sources.length" class="ps-settings-empty">暂无已扫描来源</div>

  <div v-else class="storage-list">
    <article v-for="source in sources" :key="source.source_id || source.id" class="storage-row">
      <div class="storage-cover">
        <div class="storage-id">ID {{ displayId(source.id) }}</div>
        <img v-if="source.cover_url" :src="source.cover_url" alt="" />
      </div>
      <div class="storage-info">
        <div class="storage-source-id">{{ source.source_id || '' }}</div>
        <div class="storage-path">{{ source.root_path || '' }}</div>
        <div class="storage-counts">已扫描 {{ Number(source.scanned_count || 0) }} · 登记 {{ Number(source.registered_count || 0) }}</div>
      </div>
    </article>
  </div>
</template>
