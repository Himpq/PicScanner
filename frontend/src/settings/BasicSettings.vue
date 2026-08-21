<script setup>
import { ref, computed } from 'vue';

const PS = window.PS;

function readSnapshot() {
  const st = PS.state;
  return {
    currentRootPath: st.currentRootPath,
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
    lightboxVisible: st.lightboxInfoPreferredVisible,
    quickSections: PS.quickEditCollapsedSections(),
  };
}

const snap = ref(readSnapshot());

const prefGroups = ['tone', 'color', 'effects', 'blackWhite', 'splitTone', 'hsl', 'lut'];
const foldedGroups = computed(() => prefGroups.filter((key) => snap.value.quickSections[key]).length);

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
</script>

<template>
  <div class="settings-stack">
    <section class="settings-hero">
      <div class="settings-hero-copy">
        <p>{{ snap.currentRootPath || '还没有打开图库，用「更换来源」选择文件夹。' }}</p>
        <small v-if="snap.currentRootPath">{{ snap.scopeLabel }}</small>
      </div>
      <div class="settings-hero-actions">
        <button type="button" class="settings-action primary" :disabled="!snap.currentRootPath" @click="onScanToggle">
          <span>{{ snap.scanRunning ? '停止扫描' : snap.scanComplete ? '检查新增图片' : '扫描图库' }}</span>
        </button>
        <button type="button" class="settings-action" :disabled="!snap.currentRootPath" @click="onExifToggle">
          <span>{{ snap.exifRunning ? '停止 EXIF' : '读取 EXIF' }}</span>
        </button>
        <button type="button" class="settings-action" :disabled="!snap.currentRootPath" @click="onOpenStats">
          <span>统计视图</span>
        </button>
        <button type="button" class="settings-action" @click="onChangeSource">
          <span>更换来源</span>
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
      </div>
    </section>

    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>当前偏好</h3>
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
            </div>
            <span>{{ snap.lightboxVisible ? '默认显示' : '默认隐藏' }}</span>
          </div>
          <div class="settings-row-item">
            <div>
              <strong>快速调整面板</strong>
              <small>{{ foldedGroups ? foldedGroups + ' / ' + prefGroups.length + ' 组折叠' : '全部展开' }}</small>
            </div>
            <span>已记忆</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
