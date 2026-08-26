<script setup>
import { ref, computed, onMounted } from 'vue';
import { call } from '../bridge.js';
import SettingsSwitch from './SettingsSwitch.vue';

const DEFAULT_TEMPLATE = '{origin_name}';
const TOKENS = ['{origin_name}', '{date}', '{Y}', '{M}', '{D}', '{len_name}', '{aperture}', '{iso}', '{shutter}'];

const enabled = ref(false);
const destination = ref('');
const template = ref(DEFAULT_TEMPLATE);
const status = ref('');

const statusHint = computed(() => {
  if (enabled.value) {
    return destination.value
      ? '点击导出时会直接使用该目录和模板，不再询问目录'
      : '启用后未设置目录时仍会询问导出目录';
  }
  return '导出时会询问目录，并保留原目录层级';
});

function normalize(preset) {
  const raw = preset && typeof preset === 'object' ? preset : {};
  return {
    enabled: raw.enabled === true,
    destination: String(raw.destination || '').trim(),
    template: String(raw.template || '').trim() || DEFAULT_TEMPLATE,
  };
}

async function load() {
  try {
    const res = await call('get_export_preset');
    const preset = normalize(res && res.preset);
    enabled.value = preset.enabled;
    destination.value = preset.destination;
    template.value = preset.template;
  } catch (err) {
    status.value = String(err);
  }
}

async function save(overrides) {
  const preset = normalize({
    enabled: enabled.value,
    destination: destination.value,
    template: template.value,
    ...(overrides || {}),
  });
  status.value = '保存中...';
  try {
    const res = await call('set_export_preset', preset);
    if (!res || !res.success) throw new Error(res && res.message ? res.message : '导出预设保存失败');
    const next = normalize(res.preset);
    enabled.value = next.enabled;
    destination.value = next.destination;
    template.value = next.template;
    status.value = '已保存';
  } catch (err) {
    status.value = String(err && err.message ? err.message : err);
  }
}

async function chooseFolder() {
  status.value = '选择目录...';
  try {
    const folder = await call('choose_export_folder');
    if (!folder || !folder.success) {
      status.value = folder && folder.cancelled ? '已取消' : (folder && folder.message ? folder.message : '选择目录失败');
      return;
    }
    await save({ destination: folder.path, enabled: true });
  } catch (err) {
    status.value = String(err && err.message ? err.message : err);
  }
}

function clearFolder() {
  save({ destination: '' });
}

function onEnabledChange(value) {
  save({ enabled: value === true });
}

function onTemplateBlur() {
  save({ template: template.value || DEFAULT_TEMPLATE });
}

function onTemplateKeydown(ev) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    ev.target.blur();
  }
}

onMounted(load);
</script>

<template>
  <div class="settings-stack">
    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>导出预设</h3>
        </div>
      </div>
      <div class="settings-panel-body">
        <SettingsSwitch
          title="启用导出预设"
          :modelValue="enabled"
          @update:modelValue="onEnabledChange"
        />
        <div class="settings-row-item">
          <div>
            <strong>自动导出目录</strong>
            <small>{{ status || statusHint }}</small>
          </div>
          <div class="settings-row-controls">
            <span class="settings-path-chip" :class="{ empty: !destination }">{{ destination || '未设置' }}</span>
            <button type="button" class="ghost-btn" @click="chooseFolder">选择目录</button>
            <button type="button" class="ghost-btn" @click="clearFolder">清空</button>
          </div>
        </div>
        <div class="settings-row-item settings-row-stacked">
          <div><strong>命名模板</strong></div>
          <input
            class="settings-text-input"
            type="text"
            spellcheck="false"
            v-model="template"
            @blur="onTemplateBlur"
            @keydown="onTemplateKeydown"
          />
        </div>
        <div class="settings-token-row">
          <code v-for="token in TOKENS" :key="token">{{ token }}</code>
        </div>
      </div>
    </section>
  </div>
</template>
