<script setup>
import { ref, computed } from 'vue';

const PS = window.PS;

function readSnapshot() {
  const st = PS.state;
  return {
    currentRootPath: st.currentRootPath,
    currentSourceId: st.currentSourceId,
    scanRunning: st.scanRunning,
    scanComplete: st.scanComplete,
    exifRunning: st.exifRunning,
    scopeLabel: PS.activeScopeLabel(),
    scanStatusText: document.getElementById('scan-status').textContent || '等待扫描',
    scanCountText: document.getElementById('scan-count').textContent || '0 / 0',
    exifStatusText: document.getElementById('exif-status').textContent || '等待 EXIF',
    exifCountText: document.getElementById('exif-count').textContent || '0 / 0',
    daysText: PS.compactNumber(st.dates.length) + ' 天',
    photosText: PS.compactNumber(PS.loadedPhotoTotal()) + ' 张照片',
    galleryItemSize: st.galleryItemSize,
    exportPreset: PS.currentExportPreset(),
    lightboxCollapsed: st.lightboxInfoDetailsCollapsed,
    lightboxVisible: st.lightboxInfoPreferredVisible,
    quickSections: PS.quickEditCollapsedSections(),
  };
}

const snap = ref(readSnapshot());

function refresh() {
  snap.value = readSnapshot();
}
function afterAction() {
  setTimeout(refresh, 320);
}

function onScanToggle() {
  PS.toggleScanAll();
  PS.showToast(PS.state.scanRunning ? '已请求停止扫描' : '已请求开始扫描');
  afterAction();
}
function onExifToggle() {
  PS.toggleExifRead();
  PS.showToast(PS.state.exifRunning ? '已请求停止 EXIF 读取' : '已请求读取 EXIF');
  afterAction();
}
function onOpenStats() {
  PS.openStatsPage();
}
function onChangeSource() {
  PS.showSourceChooser();
}

const quickSectionsDetail = computed(() => {
  const q = snap.value.quickSections;
  const f = (v) => (v ? '折叠' : '展开');
  return (
    '影调 ' + f(q.tone) +
    ' · 饱和度&色温 ' + f(q.color) +
    ' · 效果 ' + f(q.effects) +
    ' · 黑白混色 ' + f(q.blackWhite) +
    ' · 色调分离 ' + f(q.splitTone) +
    ' · HSL ' + f(q.hsl) +
    ' · LUT ' + f(q.lut)
  );
});
</script>

<template>
  <div class="settings-stack">
    <section class="settings-hero">
      <div class="settings-hero-copy">
        <span class="settings-eyebrow">当前图库</span>
        <h3>{{ snap.currentRootPath ? '正在浏览的照片来源' : '还没有打开图库' }}</h3>
        <p>{{ snap.currentRootPath || '从来源页选择一个文件夹后，这里会显示扫描和 EXIF 状态。' }}</p>
        <small>{{
          snap.currentRootPath
            ? snap.scopeLabel + (snap.currentSourceId ? ' · 来源 ' + snap.currentSourceId : '')
            : '等待选择来源'
        }}</small>
      </div>
      <div class="settings-hero-actions">
        <button type="button" class="settings-action primary" :disabled="!snap.currentRootPath" @click="onScanToggle">
          <span>{{ snap.scanRunning ? '停止扫描' : snap.scanComplete ? '检查新增图片' : '扫描图库' }}</span>
          <small>{{ snap.currentRootPath ? '更新当前来源' : '需要先选择图库' }}</small>
        </button>
        <button type="button" class="settings-action" :disabled="!snap.currentRootPath" @click="onExifToggle">
          <span>{{ snap.exifRunning ? '停止 EXIF' : '读取 EXIF' }}</span>
          <small>{{ snap.currentRootPath ? '补全拍摄参数' : '需要先选择图库' }}</small>
        </button>
        <button type="button" class="settings-action" :disabled="!snap.currentRootPath" @click="onOpenStats">
          <span>统计视图</span>
          <small>查看拍摄习惯</small>
        </button>
        <button type="button" class="settings-action" @click="onChangeSource">
          <span>更换来源</span>
          <small>回到来源页</small>
        </button>
      </div>
    </section>

    <section class="settings-metrics">
      <div class="settings-metric">
        <small>扫描状态</small>
        <strong>{{ snap.scanStatusText }}</strong>
        <span>{{ snap.scanCountText }}</span>
      </div>
      <div class="settings-metric">
        <small>EXIF 状态</small>
        <strong>{{ snap.exifStatusText }}</strong>
        <span>{{ snap.exifCountText }}</span>
      </div>
      <div class="settings-metric">
        <small>已载入</small>
        <strong>{{ snap.daysText }}</strong>
        <span>{{ snap.photosText }}</span>
      </div>
      <div class="settings-metric">
        <small>照片墙密度</small>
        <strong>{{ snap.galleryItemSize }} px</strong>
        <span>Ctrl + 滚轮也可调整</span>
      </div>
    </section>

    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>偏好快照</h3>
          <p>常用开关集中看一眼，具体调整在对应栏目里。</p>
        </div>
      </div>
      <div class="settings-panel-body">
        <div class="settings-rows">
          <div class="settings-row-item">
            <div>
              <strong>导出预设</strong>
              <small>{{ snap.exportPreset.destination || '尚未指定固定目录' }}</small>
            </div>
            <span>{{ snap.exportPreset.enabled ? '已启用' : '导出时询问' }}</span>
          </div>
          <div class="settings-row-item">
            <div>
              <strong>灯箱参数面板</strong>
              <small>{{ snap.lightboxCollapsed ? '详细参数默认折叠' : '详细参数默认展开' }}</small>
            </div>
            <span>{{ snap.lightboxVisible ? '默认显示' : '默认隐藏' }}</span>
          </div>
          <div class="settings-row-item">
            <div>
              <strong>快速调整面板</strong>
              <small>{{ quickSectionsDetail }}</small>
            </div>
            <span>已记忆</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
