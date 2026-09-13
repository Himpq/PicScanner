<script setup>
import { computed } from 'vue';
import LightboxMiniMap from '../components/lightbox/LightboxMiniMap.vue';
import { useMapStore } from '../stores/map.js';

const props = defineProps({
  state: { type: Object, required: true },
});

const photo = computed(() => props.state.photo);
const mapStore = useMapStore();

function joinClean(items, sep) {
  return items.filter((x) => x !== null && x !== undefined && x !== '').join(sep);
}
function displayText(value) {
  return value === null || value === undefined || value === '' ? '未知' : String(value);
}
function formatMmValue(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
function formatPixelDimensions(p) {
  const width = Number(p && p.width);
  const height = Number(p && p.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return '';
  const pixels = width * height;
  const unitText =
    pixels >= 100000000
      ? Math.round(pixels / 100000000) + '亿像素'
      : Math.round(pixels / 10000) + '万像素';
  return Math.round(width) + ' × ' + Math.round(height) + ' (' + unitText + ')';
}
function formatStandardDateTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return raw;
  return match[1] + '-' + match[2] + '-' + match[3] + ' ' + match[4] + ':' + match[5] + ':' + (match[6] || '00');
}

const summary = computed(() => {
  const p = photo.value;
  if (!p) return { primary: [], secondary: [], date: '' };
  const exposure = String(p.exposure_time || '').trim();
  const shutter = exposure && /(?:s|秒)$/i.test(exposure) ? exposure : exposure ? exposure + 's' : '';
  const aperture = p.f_number ? 'F' + p.f_number : '';
  const iso = p.iso ? 'ISO' + p.iso : '';
  const focal = p.focal_length ? formatMmValue(p.focal_length) + 'mm' : '';
  return {
    primary: [shutter, aperture].filter(Boolean),
    secondary: [iso, focal].filter(Boolean),
    date: formatStandardDateTime(p.datetime_original),
  };
});

const primaryItems = computed(() => (summary.value.primary.length ? summary.value.primary : ['未知']));

function formatGps(p) {
  const latRaw = p && p.gps_lat;
  const lonRaw = p && p.gps_lon;
  if (latRaw === null || latRaw === undefined || latRaw === '' || lonRaw === null || lonRaw === undefined || lonRaw === '') return '';
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
  return lat.toFixed(6) + ', ' + lon.toFixed(6);
}

const infoRows = computed(() => {
  const p = photo.value;
  if (!p) return [];
  return [
    ['文件', p.filename],
    ['机身', joinClean([p.make, p.model], ' ')],
    ['镜头', p.lens_model],
    ['尺寸', formatPixelDimensions(p)],
    ['格式', joinClean([p.format, p.size_text], ' · ')],
    ['定位', p.gps_place || formatGps(p)],
  ];
});
</script>

<template>
  <div class="lightbox-shot-summary">
    <div class="shot-primary">
      <span v-for="item in primaryItems" :key="item">{{ item }}</span>
    </div>
    <div v-if="summary.secondary.length || summary.date" class="shot-secondary">
      <div class="shot-secondary-left">
        <span v-for="item in summary.secondary" :key="item">{{ item }}</span>
      </div>
      <time>{{ summary.date }}</time>
    </div>
  </div>
  <div class="lightbox-info-details">
    <div class="exif-grid">
      <template v-for="row in infoRows" :key="row[0]">
        <span>{{ row[0] }}</span>
        <span>{{ displayText(row[1]) }}</span>
      </template>
    </div>
    <LightboxMiniMap v-if="mapStore.showInInfoPanel" :photo="photo" />
  </div>
</template>
