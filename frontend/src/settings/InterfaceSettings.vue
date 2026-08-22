<script setup>
import { ref, computed } from 'vue';
import { call } from '../bridge.js';
import SettingsSwitch from './SettingsSwitch.vue';

const PS = window.PS;

const QUICK_SECTIONS = [
  { key: 'tone', title: '影调' },
  { key: 'color', title: '饱和度与色温' },
  { key: 'effects', title: '效果' },
  { key: 'blackWhite', title: '黑白混色' },
  { key: 'splitTone', title: '色调分离' },
  { key: 'hsl', title: 'HSL' },
  { key: 'lut', title: 'LUT' },
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
  return size ? size.width + ' × ' + size.height : '';
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
          <h3>图库</h3>
        </div>
      </div>
      <div class="settings-panel-body">
        <div class="settings-range-row">
          <span>缩略图大小</span>
          <input type="range" min="112" max="280" step="1" v-model.number="gallerySize" @input="onGalleryInput" />
          <output>{{ gallerySize }} px</output>
          <button type="button" class="ghost-btn" @click="resetGallerySize">重置</button>
        </div>
      </div>
    </section>

    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>灯箱</h3>
        </div>
      </div>
      <div class="settings-panel-body">
        <SettingsSwitch
          title="打开时显示照片参数"
          :modelValue="lightboxVisible"
          @update:modelValue="onLightboxVisible"
        />
        <SettingsSwitch
          title="详细参数默认折叠"
          :modelValue="lightboxCollapsed"
          @update:modelValue="onLightboxCollapsed"
        />
        <div class="settings-inline-tools">
          <span>参数面板位置<template v-if="lightboxSizeText">　{{ lightboxSizeText }}</template></span>
          <button type="button" class="ghost-btn" @click="resetLightboxPosition">恢复默认</button>
        </div>
      </div>
    </section>

    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>快速调整 · 默认折叠</h3>
        </div>
      </div>
      <div class="settings-panel-body">
        <SettingsSwitch
          v-for="section in QUICK_SECTIONS"
          :key="section.key"
          :title="section.title"
          :modelValue="sections[section.key]"
          @update:modelValue="(value) => setSection(section.key, value)"
        />
      </div>
    </section>
  </div>
</template>
