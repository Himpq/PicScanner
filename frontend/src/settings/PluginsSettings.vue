<script setup>
import { ref, onMounted } from 'vue';

const loading = ref(true);
const error = ref('');
const modules = ref([]);

// PS bridge helper
function call(name, ...args) {
  const PS = window.PS;
  if (PS && PS.call) return PS.call(name, ...args);
  if (window.pywebview && window.pywebview.api && window.pywebview.api[name]) return window.pywebview.api[name](...args);
  return Promise.reject(new Error('bridge not ready'));
}

async function fetch() {
  loading.value = true;
  error.value = '';
  try {
    const res = await call('get_modules');
    if (!res || !res.success) throw new Error(res && res.message || '获取失败');
    const list = res.modules || [];
    const enriched = await Promise.all(list.map(async (m) => {
      let status = '已加载';
      let detail = '';
      try {
        const probe = await call('module_api', m.key, 'status', '').catch(()=>null)
          || await call('module_api', m.key, 'index_status', '').catch(()=>null);
        if (probe && probe.success) {
          if (typeof probe.collections === 'number') detail = `${probe.collections} 集锦 · ${probe.vector_count||0} 向量`;
          else if (typeof probe.total === 'number') detail = `${probe.total} 向量` + (probe.running ? ' · 索引中' : '');
          else if (probe.audit) detail = `${probe.audit.total||0} 向量`;
          if (probe.running) status = '运行中';
        }
      } catch {}
      return { ...m, _status: status, _detail: detail };
    }));
    modules.value = enriched;
  } catch (e) {
    error.value = String(e.message || e);
  } finally {
    loading.value = false;
  }
}

onMounted(fetch);
</script>

<template>
  <div class="settings-stack">
    <section class="settings-panel plugin-panel">
      <div class="settings-panel-head plugin-head">
        <div>
          <h3>已装载插件</h3>
          <p>来自 <code>app/modules/*/module.json</code>，由 loader 隔离加载 · 共 {{ modules.length }} 个</p>
        </div>
        <button class="ghost-btn plugin-refresh" @click="fetch">刷新</button>
      </div>
      <div class="settings-panel-body">
        <div v-if="loading" class="settings-empty">读取中…</div>
        <div v-else-if="error" class="settings-empty" style="color:var(--danger)">{{ error }}</div>
        <div v-else-if="!modules.length" class="settings-empty">暂无插件</div>
        <template v-else>
          <div v-for="m in modules" :key="m.key" class="plugin-card">
            <div class="plugin-icon">{{ (m.name||m.key||'?').slice(0,1).toUpperCase() }}</div>
            <div class="plugin-main">
              <div class="plugin-title">
                <span class="plugin-name">{{ m.name }}</span>
                <span class="plugin-meta">{{ m.key }} · v{{ m.version }} · {{ m._status }}</span>
              </div>
              <div class="plugin-desc" :title="m.description">{{ m.description || '—' }}</div>
              <div v-if="m._detail" class="plugin-detail">{{ m._detail }}</div>
              <div class="plugin-foot">{{ m.frontend_url ? '有前端' : '纯后端' }}<span v-if="m.frontend_url"> · {{ m.frontend_url }}</span></div>
            </div>
          </div>
        </template>
      </div>
    </section>

    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>说明</h3>
        </div>
      </div>
      <div class="settings-panel-body">
        <div class="settings-row-item" style="display:block;white-space:normal;line-height:1.7;">
          <small style="white-space:normal;">
            插件目录 <code>app/modules/*/module.json</code> + <code>backend.py</code>（暴露 <code>api_methods()</code>）。<br/>
            任何插件加载失败仅打日志跳过，不阻断主程序；状态通过 <code>get_modules</code> / <code>module_api(key, 'status')</code> 查询。
          </small>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.plugin-panel .plugin-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.plugin-panel .plugin-head p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}
.plugin-panel .plugin-head code {
  background: rgba(255,255,255,.06);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11px;
}
.plugin-refresh {
  height: 30px;
  padding: 0 14px;
  font-size: 12px;
  flex: none;
  border-radius: 8px;
}
.plugin-card {
  display: grid;
  grid-template-columns: 44px minmax(0,1fr);
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--st-hairline, rgba(255,255,255,.055));
  transition: background .15s ease;
}
.plugin-card:last-child { border-bottom: 0; }
.plugin-card:hover { background: rgba(255,255,255,.03); }
.plugin-icon {
  width: 44px; height: 44px;
  border-radius: 10px;
  display: grid; place-items: center;
  background: rgba(255,255,255,.06);
  border: 1px solid var(--line);
  color: var(--text);
  font-size: 16px; font-weight: 800;
}
.plugin-main { min-width: 0; display: grid; gap: 3px; }
.plugin-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}
.plugin-name { font-size: 14px; font-weight: 700; color: var(--text); }
.plugin-meta {
  font-size: 12px;
  color: var(--muted);
}
.plugin-desc {
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.45;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.plugin-detail {
  font-size: 12px;
  color: var(--muted);
  opacity: .9;
}
.plugin-foot {
  font-size: 11.5px;
  color: var(--muted);
  opacity: .7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
