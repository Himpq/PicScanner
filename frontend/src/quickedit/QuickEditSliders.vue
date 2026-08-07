<script setup>
import { reactive } from 'vue';

const PS = window.PS;

const EXPOSURE_MIN = PS.QUICK_EDIT_EXPOSURE_MIN_EV;
const EXPOSURE_MAX = PS.QUICK_EDIT_EXPOSURE_MAX_EV;
const TEMP_MIN = PS.QUICK_EDIT_TEMPERATURE_MIN_K;
const TEMP_MAX = PS.QUICK_EDIT_TEMPERATURE_MAX_K;
const TEMP_STEP = PS.QUICK_EDIT_TEMPERATURE_STEP_K;

const SLIDERS = {
  exposure: { label: '曝光', min: EXPOSURE_MIN, max: EXPOSURE_MAX, step: 0.05 },
  highlights: { label: '高光', min: -100, max: 100, step: 1 },
  shadows: { label: '阴影', min: -100, max: 100, step: 1 },
  whites: { label: '白色色阶', min: -100, max: 100, step: 1 },
  blacks: { label: '黑色色阶', min: -100, max: 100, step: 1 },
  dehaze: { label: '去雾', min: -100, max: 100, step: 1 },
  contrast: { label: '对比度', min: -100, max: 100, step: 1 },
  saturation: { label: '饱和度', min: -100, max: 100, step: 1 },
  vibrance: { label: '自然饱和度', min: -100, max: 100, step: 1 },
  tint: { label: '色调', min: -100, max: 100, step: 1 },
  clarity: { label: '清晰度', min: -100, max: 100, step: 1 },
  sharpening: { label: '锐化', min: 0, max: 100, step: 1 },
  grain: { label: '颗粒', min: 0, max: 100, step: 1 },
  vignette: { label: '暗角', min: -100, max: 100, step: 1 },
  vignetteFeather: { label: '羽化', min: 0, max: 100, step: 1 },
  blackWhite: { label: '黑白强度', min: 0, max: 100, step: 1 },
  splitToneShadowsHue: { label: '阴影色相', min: 0, max: 360, step: 1, hue: true },
  splitToneShadowsStrength: { label: '阴影强度', min: 0, max: 100, step: 1 },
  splitToneMidtonesHue: { label: '中间调色相', min: 0, max: 360, step: 1, hue: true },
  splitToneMidtonesStrength: { label: '中间调强度', min: 0, max: 100, step: 1 },
  splitToneHighlightsHue: { label: '高光色相', min: 0, max: 360, step: 1, hue: true },
  splitToneHighlightsStrength: { label: '高光强度', min: 0, max: 100, step: 1 },
  splitToneBalance: { label: 'Balance', min: -100, max: 100, step: 1 },
};

const SECTIONS = [
  {
    key: 'tone',
    title: '影调',
    subtitle: '曝光与明暗层次',
    rows: [['exposure'], ['highlights', 'shadows'], ['whites', 'blacks'], ['dehaze']],
  },
  {
    key: 'color',
    title: '饱和度&色温',
    subtitle: '色彩强度与白平衡',
    rows: [['contrast'], ['saturation', 'vibrance'], ['temperature', 'tint']],
  },
  {
    key: 'detail',
    title: '细节',
    subtitle: '清晰度、锐化与颗粒',
    rows: [['clarity'], ['sharpening', 'grain']],
  },
  {
    key: 'effects',
    title: '效果',
    subtitle: '暗角与边缘氛围',
    rows: [['vignette', 'vignetteFeather']],
  },
  {
    key: 'blackWhite',
    title: '黑白混色',
    subtitle: '控制各色在黑白中的明暗',
    rows: [['blackWhite']],
    grid: [
      { key: 'bwRed', label: '红', min: -100, max: 100, step: 1 },
      { key: 'bwYellow', label: '黄', min: -100, max: 100, step: 1 },
      { key: 'bwGreen', label: '绿', min: -100, max: 100, step: 1 },
      { key: 'bwAqua', label: '青', min: -100, max: 100, step: 1 },
      { key: 'bwBlue', label: '蓝', min: -100, max: 100, step: 1 },
      { key: 'bwMagenta', label: '品红', min: -100, max: 100, step: 1 },
    ],
  },
  {
    key: 'splitTone',
    title: '色调分离',
    subtitle: '阴影、中间调与高光染色',
    presets: true,
    rows: [
      ['splitToneShadowsHue', 'splitToneShadowsStrength'],
      ['splitToneMidtonesHue', 'splitToneMidtonesStrength'],
      ['splitToneHighlightsHue', 'splitToneHighlightsStrength'],
      ['splitToneBalance'],
    ],
  },
];

const SPLIT_TONE_PRESETS = PS.QUICK_EDIT_SPLIT_TONE_PRESETS;

const params = reactive({ ...PS.state.quickEdit.params });
const collapsed = reactive({ ...PS.quickEditCollapsedSections() });

function def(key) {
  return SLIDERS[key];
}

function valueText(key) {
  return PS.quickEditValueText(key, params[key]);
}

function refresh() {
  const srcParams = PS.state.quickEdit.params;
  if (srcParams && typeof srcParams === 'object') {
    for (const key of Object.keys(srcParams)) {
      if (params[key] !== srcParams[key]) params[key] = srcParams[key];
    }
  }
  const srcCollapsed = PS.quickEditCollapsedSections();
  for (const key of Object.keys(srcCollapsed)) {
    if (collapsed[key] !== srcCollapsed[key]) collapsed[key] = srcCollapsed[key];
  }
}

function onSliderInput(key, value) {
  const next = PS.normalizeQuickEditParams(PS.state.quickEdit.params);
  next[key] = Number(value);
  PS.state.quickEdit.params = PS.normalizeQuickEditParams(next);
  const rawDevelop = PS.quickEditUsesRawDevelopPipeline() && PS.quickEditIsRawDevelopParamKey(key);
  PS.invalidateQuickEditRenderedPreview({ clearTimers: true });
  PS.syncQuickEditControls();
  if (rawDevelop) {
    PS.applyQuickEditPreview({ skipColorRender: true });
    PS.scheduleQuickEditRawDevelopPreview({ interactive: true });
  } else {
    PS.applyQuickEditPreview({ interactive: true });
    PS.scheduleQuickEditHistogramRender(key === 'temperature' ? 320 : 180);
  }
}

function onTemperatureNumberInput(value) {
  const next = PS.normalizeQuickEditParams(PS.state.quickEdit.params);
  next.temperature = PS.normalizeQuickEditTemperature(value);
  PS.state.quickEdit.params = PS.normalizeQuickEditParams(next);
  PS.invalidateQuickEditRenderedPreview({ clearTimers: true });
  PS.syncQuickEditControls();
  if (PS.quickEditUsesRawDevelopPipeline()) {
    PS.applyQuickEditPreview({ skipColorRender: true });
    PS.scheduleQuickEditRawDevelopPreview({ interactive: true });
  } else {
    PS.applyQuickEditPreview({ interactive: true });
    PS.scheduleQuickEditHistogramRender(320);
  }
}

function onTemperatureNumberChange(value) {
  const next = PS.normalizeQuickEditParams(PS.state.quickEdit.params);
  next.temperature = PS.normalizeQuickEditTemperature(value);
  PS.state.quickEdit.params = PS.normalizeQuickEditParams(next);
  PS.invalidateQuickEditRenderedPreview({ clearTimers: true });
  PS.syncQuickEditControls();
  if (PS.quickEditUsesRawDevelopPipeline()) {
    PS.applyQuickEditPreview({ skipColorRender: true });
    PS.scheduleQuickEditRawDevelopPreview({ delayMs: 0, force: true });
  } else {
    PS.applyQuickEditPreview();
    PS.scheduleQuickEditHistogramRender(0);
  }
}

function toggleSection(key) {
  const sections = PS.quickEditCollapsedSections();
  sections[key] = !sections[key];
  PS.setQuickEditCollapsedSections(sections);
  const fresh = PS.quickEditCollapsedSections();
  for (const k of Object.keys(fresh)) {
    if (collapsed[k] !== fresh[k]) collapsed[k] = fresh[k];
  }
}

function applySplitTonePreset(presetKey) {
  PS.applyQuickEditSplitTonePreset(presetKey);
}

defineExpose({ refresh });
</script>

<template>
  <template v-for="section in SECTIONS" :key="section.key">
    <div
      class="quick-edit-group quick-edit-collapsible"
      :class="{ collapsed: collapsed[section.key] }"
      :data-quick-edit-section="section.key"
    >
      <button
        type="button"
        class="quick-edit-section-toggle"
        :aria-expanded="collapsed[section.key] ? 'false' : 'true'"
        @click="toggleSection(section.key)"
      >
        <span><b>{{ section.title }}</b><em>{{ section.subtitle }}</em></span>
        <i aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </i>
      </button>
      <div v-show="!collapsed[section.key]" class="quick-edit-section-body">
        <div v-if="section.presets" class="quick-edit-split-tone-presets">
          <button
            v-for="preset in SPLIT_TONE_PRESETS"
            :key="preset.key"
            type="button"
            @click="applySplitTonePreset(preset.key)"
          >{{ preset.label }}</button>
        </div>

        <template v-for="row in section.rows" :key="row.join('+')">
          <div v-if="row.length > 1" class="quick-edit-pair-grid">
            <template v-for="sliderKey in row" :key="sliderKey">
              <label v-if="sliderKey === 'temperature'" class="quick-edit-control quick-edit-control-kelvin">
                <span>色温</span>
                <b>{{ valueText('temperature') }}</b>
                <input
                  type="range"
                  data-quick-edit-range="temperature"
                  :min="TEMP_MIN"
                  :max="TEMP_MAX"
                  :step="TEMP_STEP"
                  :value="params.temperature"
                  @input="onSliderInput('temperature', $event.target.value)"
                />
                <input
                  class="quick-edit-kelvin-input"
                  type="number"
                  :min="TEMP_MIN"
                  :max="TEMP_MAX"
                  :step="TEMP_STEP"
                  :value="params.temperature"
                  aria-label="色温 K 值"
                  @input="onTemperatureNumberInput($event.target.value)"
                  @change="onTemperatureNumberChange($event.target.value)"
                />
              </label>
              <label
                v-else
                class="quick-edit-control"
                :class="{ 'quick-edit-split-tone-control': def(sliderKey).hue }"
              >
                <span>{{ def(sliderKey).label }}</span>
                <b>{{ valueText(sliderKey) }}</b>
                <input
                  type="range"
                  :data-quick-edit-range="sliderKey"
                  :min="def(sliderKey).min"
                  :max="def(sliderKey).max"
                  :step="def(sliderKey).step"
                  :value="params[sliderKey]"
                  @input="onSliderInput(sliderKey, $event.target.value)"
                />
              </label>
            </template>
          </div>
          <label
            v-else
            class="quick-edit-control"
            :class="{ 'quick-edit-split-tone-control': def(row[0]).hue }"
          >
            <span>{{ def(row[0]).label }}</span>
            <b>{{ valueText(row[0]) }}</b>
            <input
              type="range"
              :data-quick-edit-range="row[0]"
              :min="def(row[0]).min"
              :max="def(row[0]).max"
              :step="def(row[0]).step"
              :value="params[row[0]]"
              @input="onSliderInput(row[0], $event.target.value)"
            />
          </label>
        </template>

        <div v-if="section.grid" class="quick-edit-bw-grid">
          <label v-for="slider in section.grid" :key="slider.key" class="quick-edit-control">
            <span>{{ slider.label }}</span>
            <b>{{ valueText(slider.key) }}</b>
            <input
              type="range"
              :data-quick-edit-range="slider.key"
              :min="slider.min"
              :max="slider.max"
              :step="slider.step"
              :value="params[slider.key]"
              @input="onSliderInput(slider.key, $event.target.value)"
            />
          </label>
        </div>
      </div>
    </div>
  </template>
</template>
