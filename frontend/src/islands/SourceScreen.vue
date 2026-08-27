<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSourceStore } from '../stores/source.js';

const store = useSourceStore();
const loading = computed(() => store.loading);
const error = computed(() => store.error);
const sources = computed(() => store.sources);
const conflicts = computed(() => store.sourceConflicts);
const discoveryErrors = computed(() => store.discoveryErrors);
const count = computed(() => store.count);

const hasConflicts = computed(() => conflicts.value.length > 0 || discoveryErrors.value.length > 0);

onMounted(() => {
  store.fetchSources().catch(() => {});
});

function refresh() {
  store.fetchSources().catch(() => {});
}

async function addFolder() {
  try {
    const created = await store.chooseFolder();
    if (created) store.selectSource(created);
  } catch (err) {
    // 错误已通过 store.error 展示，额外 toast 兜底
    const PS = window.PS;
    if (PS && PS.showToast) PS.showToast(String(err?.message || err), 'error');
  }
}

function enter(item) {
  store.selectSource(item);
}

function openSettings() {
  const PS = window.PS;
  if (PS && PS.openSettingsPage) PS.openSettingsPage('interface');
  else if (PS && PS.showToast) PS.showToast('设置未就绪', 'error');
}

function kicker(item) {
  return item.kind === 'source' ? '来源' : '目录';
}

function title(item) {
  return item.title || item.path || '未命名来源';
}
</script>

<template>
  <div class="ps-source-screen">
    <div class="source-layout">
      <div class="source-panel">
        <div class="source-head">
          <div>
            <h1>来源首页</h1>
            <p>按 PicScanner 来源标记识别当前可用路径。</p>
          </div>
          <div class="source-head-actions">
            <button class="icon-btn" title="设置" @click="openSettings">⚙</button>
            <button class="icon-btn" title="刷新磁盘" :disabled="loading" @click="refresh">↻</button>
          </div>
        </div>

        <div class="source-pages">
          <section class="source-page" data-source-page="connected">
            <div class="source-page-head">
              <div class="section-title">可用来源 <span>{{ count }}</span></div>
              <p>仅显示来源 ID 唯一且标记可访问的当前路径。</p>
            </div>

            <div v-if="error" class="source-empty">加载失败：{{ error }} <button class="ghost-btn" @click="refresh">重试</button></div>

            <div v-else-if="loading && !sources.length" class="source-empty">扫描来源中...</div>

            <div v-else class="source-grid">
              <button
                v-for="item in sources"
                :key="item.source_id || item.path"
                class="source-item"
                :class="{ 'has-cover': !!(item.summary && item.summary.cover_url), unavailable: !!item.unavailable }"
                :disabled="!!item.unavailable"
                :title="item.unavailable ? (item.unavailable_message || '来源未插入或已更换') : ''"
                @click="enter(item)"
              >
                <div class="source-cover" :style="item.summary && item.summary.cover_url ? 'background-image:url(\'' + item.summary.cover_url + '\')' : ''"></div>
                <div class="source-content">
                  <div class="source-kicker">{{ kicker(item) }}</div>
                  <div class="source-title">{{ title(item) }}</div>
                  <div class="source-sub">{{ store.sourceSummaryText(item) }}</div>
                </div>
              </button>

              <button class="source-item add" @click="addFolder">
                <div>
                  <div class="plus">+</div>
                  <div class="source-title">添加文件夹</div>
                  <div class="source-sub">选择后会记忆到本机</div>
                </div>
              </button>
            </div>

            <div v-if="hasConflicts" class="source-conflicts-hint">
              <p v-if="conflicts.length">发现 {{ conflicts.length }} 个重复来源 ID，已在弹窗中提示。</p>
              <p v-if="discoveryErrors.length">有 {{ discoveryErrors.length }} 个路径标记读取失败。</p>
            </div>
          </section>
        </div>
      </div>

      <aside class="shortcut-panel" aria-label="快捷键">
        <div class="shortcut-title">快捷键</div>
        <div class="shortcut-list">
          <div class="shortcut-row"><kbd>Ctrl</kbd><kbd>F</kbd><span>搜索照片</span></div>
          <div class="shortcut-row"><kbd>Ctrl</kbd><kbd>滚轮</kbd><span>调整照片墙缩略图</span></div>
          <div class="shortcut-row"><kbd>Alt</kbd><span>立即显示悬停照片参数</span></div>
          <div class="shortcut-row"><kbd>滚轮</kbd><span>灯箱缩放图片</span></div>
          <div class="shortcut-row"><kbd>Q</kbd><span>选择照片快速调整</span></div>
          <div class="shortcut-row"><kbd>灯箱</kbd><kbd>Q</kbd><span>调整当前照片</span></div>
          <div class="shortcut-row"><kbd>C</kbd><span>对比图片</span></div>
          <div class="shortcut-row"><kbd>F</kbd><span>收藏悬停照片</span></div>
          <div class="shortcut-row"><kbd>E</kbd><span>编辑悬停照片笔记</span></div>
          <div class="shortcut-row"><kbd>R</kbd><span>编辑当前日期笔记</span></div>
          <div class="shortcut-row"><kbd>S</kbd><span>设置悬停照片分类</span></div>
          <div class="shortcut-row"><kbd>Shift</kbd><kbd>Enter</kbd><span>笔记换行</span></div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* 复用全局 style.css 的类名，scoped 仅做隔离与小幅密度修正 */
.ps-source-screen { width: 100%; }
.source-conflicts-hint { margin-top: 12px; font-size: 12px; color: var(--muted, #9aa0a6); line-height: 1.6; }
.source-conflicts-hint p { margin: 0; }
</style>
