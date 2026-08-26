<script setup>
import { call } from '../bridge.js';

const APP_BUILD = (window.PS && window.PS.APP_BUILD) || '';
const PROJECT_URL = (window.PS && window.PS.PROJECT_URL) || '';

function openProject() {
  call('open_external_url', PROJECT_URL).catch(() => {});
}
</script>

<template>
  <div class="settings-stack">
    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>关于</h3>
        </div>
      </div>
      <div class="settings-panel-body">
        <div class="settings-row-item">
          <div>
            <strong>PicScanner <span class="about-version">v1.0.1</span></strong>
            <small>Himpq developed with Codex</small>
          </div>
          <span>构建 {{ APP_BUILD || '--' }}</span>
        </div>
        <div class="settings-row-item">
          <div>
            <strong>项目主页</strong>
            <small>{{ PROJECT_URL }}</small>
          </div>
          <div class="settings-row-controls">
            <button type="button" class="ghost-btn" @click="openProject">打开</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
