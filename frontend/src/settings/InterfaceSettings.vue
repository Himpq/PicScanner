<script setup>
import { ref, computed } from 'vue';
import { call } from '../bridge.js';
import SettingsSwitch from './SettingsSwitch.vue';

const PS = window.PS;

const QUICK_SECTIONS = [
  { key: 'tone', title: '影调区默认折叠', detail: '适合主要处理色彩或细节时减少面板高度。' },
  { key: 'color', title: '饱和度&色温区默认折叠', detail: '适合只处理明暗层次时减少干扰。' },
  { key: 'effects', title: '效果区默认折叠', detail: '适合暂时不使用暗角等氛围效果时减少面板高度。' },
  { key: 'blackWhite', title: '黑白混色区默认折叠', detail: '适合只做彩色照片时减少面板高度。' },
  { key: 'splitTone', title: '色调分离区默认折叠', detail: '适合只做基础色彩或 HSL 微调时减少面板高度。' },
  { key: 'hsl', title: 'HSL 区默认折叠', detail: '适合只做基础曝光、色温、曲线时减少干扰。' },
  { key: 'lut', title: 'LUT 区默认折叠', detail: 'LUT 库很大时可以让快速调整界面更清爽。' },
];

// 照片墙密度
const gallerySize = ref(PS.state.galleryItemSize);
function onGalleryInput() {
  PS.applyGalleryItemSize(gallerySize.value);
  gallerySize.value = PS.state.galleryItemSize;
}
function resetGallerySize() {
  PS.applyGalleryItemSize(168);
  gallerySize.value = PS.state.galleryItemSize;
}

// 照片参数面板
const lightboxVisible = ref(PS.state.lightboxInfoPreferredVisible);
const lightboxCollapsed = ref(PS.state.lightboxInfoDetailsCollapsed);
const lightboxSizeText = computed(() => {
  const size = PS.state.lightboxInfoPreferredSize;
  return size ? size.width + ' × ' + size.height : '自动尺寸';
});
function onLightboxVisible(value) {
  PS.setLightboxInfoVisible(value);
}
function onLightboxCollapsed(value) {
  PS.setLightboxInfoDetailsCollapsed(value);
}
function resetLightboxPosition() {
  const position = PS.defaultLightboxInfoPosition();
  PS.state.lightboxInfoPreferredPosition = position;
  PS.state.lightbox.infoX = position.x;
  PS.state.lightbox.infoY = position.y;
  PS.clampLightboxInfoPosition();
  call('set_lightbox_info_position', position)
    .then((res) => {
      if (!res || !res.success) throw new Error(res && res.message ? res.message : '参数面板位置保存失败');
      PS.showToast('参数面板位置已重置');
    })
    .catch((err) => PS.showToast(String(err && err.message ? err.message : err), 'error'));
}

// 快速调整面板折叠区
const sections = ref({ ...PS.quickEditCollapsedSections() });
function setSection(key, value) {
  sections.value[key] = value;
  PS.setQuickEditCollapsedSections({ ...PS.quickEditCollapsedSections(), [key]: value });
}
</script>

<template>
  <div class="settings-stack">
    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>照片墙密度</h3>
          <p>调整缩略图基础尺寸，适合在大量照片和精挑细看之间切换。</p>
        </div>
      </div>
      <div class="settings-panel-body">
        <div class="settings-range-row">
          <input type="range" min="112" max="280" step="1" v-model.number="gallerySize" @input="onGalleryInput" />
          <output>{{ gallerySize }} px</output>
          <button type="button" class="ghost-btn" @click="resetGallerySize">重置</button>
        </div>
      </div>
    </section>

    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>照片参数面板</h3>
          <p>控制灯箱里参数面板的默认显示方式；位置和尺寸仍可在灯箱中拖拽记忆。</p>
        </div>
      </div>
      <div class="settings-panel-body">
        <SettingsSwitch
          title="打开灯箱时显示参数"
          detail="关闭后仍可用灯箱右上角 i 按钮临时打开。"
          :modelValue="lightboxVisible"
          @update:modelValue="onLightboxVisible"
        />
        <SettingsSwitch
          title="详细参数默认折叠"
          detail="只保留快门、光圈、ISO 等摘要，展开后看完整 EXIF。"
          :modelValue="lightboxCollapsed"
          @update:modelValue="onLightboxCollapsed"
        />
        <div class="settings-inline-tools">
          <span>面板尺寸：{{ lightboxSizeText }}</span>
          <button type="button" class="ghost-btn" @click="resetLightboxPosition">恢复默认位置</button>
        </div>
      </div>
    </section>

    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>快速调整面板</h3>
          <p>记住复杂工具区的折叠状态，让打开 Q 调整时更贴近你的工作流。</p>
        </div>
      </div>
      <div class="settings-panel-body">
        <SettingsSwitch
          v-for="section in QUICK_SECTIONS"
          :key="section.key"
          :title="section.title"
          :detail="section.detail"
          :modelValue="sections[section.key]"
          @update:modelValue="(value) => setSection(section.key, value)"
        />
      </div>
    </section>
  </div>
</template>
