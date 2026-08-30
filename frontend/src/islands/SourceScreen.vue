<script setup>
import { computed, onMounted } from 'vue';
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
  store.refresh();
});

function refresh() {
  store.refresh();
}

async function addFolder() {
  try {
    const created = await store.chooseFolder();
    if (created) store.selectSource(created);
  } catch (err) {
    const PS = window.PS;
    if (PS && PS.showToast) PS.showToast(String((err && err.message) || err), 'error');
  }
}

function enter(item) {
  store.selectSource(item);
}

function openSettings() {
  const PS = window.PS;
  // 与 legacy 的 #source-open-settings 一致：从来源页进入，返回时回到来源页
  if (PS && PS.openSettingsPage) PS.openSettingsPage({ fromSource: true });
  else if (PS && PS.showToast) PS.showToast('设置未就绪', 'error');
}

function kicker(item) {
  return item.kind === 'source' ? '来源' : '目录';
}

function title(item) {
  return item.title || item.path || '未命名来源';
}

function coverStyle(item) {
  const url = (item.summary && item.summary.cover_url) || '';
  return url ? { backgroundImage: 'url("' + url + '")' } : {};
}
</script>

<!-- P3：单根组件，由 main.js 直接挂载到 #source-screen 本身。
     #source-screen 是 display:grid + place-items:center，只有一个子项位；
     真正的两列布局在 .source-layout 上（grid: minmax(0,4fr) / minmax(190px,1fr)）。
     所以这里不能用多根 —— 与统计屏 / 设置屏情况相反，迁移整屏前务必先查外层布局。

     类名全部沿用 style.css 里的 .source-* / .shortcut-*，不使用此前那套 ps-source-* ：
     ps-* 是本组件的自制副本，数值有出入（flex vs grid、侧栏 220 vs 190、
     间距 24 vs 18、且缺 max-height 与 overflow）。迁移不应改变外观，
     且 vanilla DOM 已删除，不存在"Vue 改样式 ↔ Vanilla 重写 DOM"的冲突。 -->
<template>
  <div class="source-layout">
    <div class="source-panel">
      <div class="source-head">
        <div>
          <h1>来源首页</h1>
          <p>按 PicScanner 来源标记识别当前可用路径。</p>
        </div>
        <div class="source-head-actions">
          <button class="icon-btn" type="button" title="设置" @click="openSettings">⚙</button>
          <button class="icon-btn" type="button" title="刷新磁盘" :disabled="loading" @click="refresh">↻</button>
        </div>
      </div>

      <div class="source-pages">
        <section class="source-page" data-source-page="connected" role="tabpanel">
          <div class="source-page-head">
            <div class="section-title">可用来源 <span>{{ count }}</span></div>
            <p>仅显示来源 ID 唯一且标记可访问的当前路径。</p>
          </div>

          <div class="source-grid">
            <div v-if="error" class="source-item unavailable">{{ error }}</div>

            <div v-else-if="loading && !sources.length" class="source-item unavailable">扫描来源中...</div>

            <template v-else>
              <button
                v-for="item in sources"
                :key="item.source_id || item.path"
                type="button"
                class="source-item"
                :class="{ 'has-cover': !!(item.summary && item.summary.cover_url), unavailable: !!item.unavailable }"
                :disabled="!!item.unavailable"
                :title="item.unavailable ? (item.unavailable_message || '来源未插入或已更换') : ''"
                @click="enter(item)"
              >
                <div class="source-cover" :style="coverStyle(item)"></div>
                <div class="source-content">
                  <div class="source-kicker">{{ kicker(item) }}</div>
                  <div class="source-title">{{ title(item) }}</div>
                  <div class="source-sub">{{ store.sourceSummaryText(item) }}</div>
                </div>
              </button>

              <button type="button" class="source-item add" @click="addFolder">
                <div>
                  <div class="plus">+</div>
                  <div class="source-title">添加文件夹</div>
                  <div class="source-sub">选择后会记忆到本机</div>
                </div>
              </button>
            </template>
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
</template>

<style scoped>
/* style.css 把 .source-layout 设成了 scrollbar-width:none，
   来源多时溢出却没有任何滚动提示。这里恢复一条细滚动条
   （scoped 选择器带 data-v 属性，优先级高于 style.css 的同类名规则）。 */
.source-layout {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.22) transparent;
}
.source-layout::-webkit-scrollbar { width: 8px; height: 8px; }
.source-layout::-webkit-scrollbar-track { background: transparent; }
.source-layout::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.18);
  border-radius: 4px;
}
.source-layout::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.32); }

.source-conflicts-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--muted, #9aa0a6);
  line-height: 1.6;
}
.source-conflicts-hint p { margin: 0; }
</style>
