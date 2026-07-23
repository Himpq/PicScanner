<script setup>
import { call } from '../bridge.js';

const APP_BUILD = (window.PS && window.PS.APP_BUILD) || '';
const PROJECT_URL = (window.PS && window.PS.PROJECT_URL) || '';

function openProject() {
  call('open_external_url', PROJECT_URL).catch(() => {});
}
</script>

<template>
  <div class="about-panel settings-about-panel">
    <div class="about-title"><span>PicScanner</span><span class="about-version">v1.0.1</span></div>
    <div class="about-author">Himpq developed with Codex</div>
    <div class="about-meta"><span>构建</span><b>{{ APP_BUILD }}</b></div>
    <button class="about-link" type="button" @click="openProject">{{ PROJECT_URL }}</button>
  </div>
</template>
