<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useMapStore } from '../../stores/map.js';
import { loadTianditu } from '../../map/tianditu.js';

// 参数小窗底部的小地图：仅当照片带 GPS（EXIF WGS-84）时出现。
// 天地图使用 CGCS2000（与 WGS-84 基本重合），无需坐标纠偏。
//
// 交互约束（灯箱里的客人，不能抢主人的键鼠）：
// - 键盘操作必须关（天地图默认启用）：否则地图聚焦时方向键被地图吞掉，
//   灯箱的左右翻页收不到；关掉后方向键正常冒泡到 window，翻页优先。
// - 拖拽显式打开，并只在容器可见（非零尺寸）时建图：详情折叠时
//   初始化会导致拖拽/瓦片状态异常，展开后再建。

const props = defineProps({
  photo: { type: Object, default: null },
});

const store = useMapStore();
const containerEl = ref(null);
const phase = ref('idle'); // idle | pending | loading | ready | unconfigured | error
const errorText = ref('');

let mapInstance = null;
let disposed = false;
let resizeObserver = null;
let createRequested = false;
let mapSeq = 0;
const containerId = 'lightbox-mini-map-' + (++mapSeq);

const lat = computed(() => {
  const value = props.photo && props.photo.gps_lat;
  return value === null || value === undefined || value === '' ? NaN : Number(value);
});
const lon = computed(() => {
  const value = props.photo && props.photo.gps_lon;
  return value === null || value === undefined || value === '' ? NaN : Number(value);
});
const hasGps = computed(() => Number.isFinite(lat.value) && Number.isFinite(lon.value));
const coordText = computed(() => (hasGps.value ? lat.value.toFixed(6) + ', ' + lon.value.toFixed(6) : ''));

function destroyMap() {
  if (mapInstance) {
    try { mapInstance.clearOverLays && mapInstance.clearOverLays(); } catch {}
    try { mapInstance.destroy && mapInstance.destroy(); } catch {}
    mapInstance = null;
  }
  if (containerEl.value) {
    try { containerEl.value.replaceChildren(); } catch {}
  }
}

function scheduleResize() {
  if (!mapInstance) return;
  requestAnimationFrame(() => {
    try { mapInstance.checkResize && mapInstance.checkResize(); } catch {}
  });
}

function isContainerVisible() {
  const el = containerEl.value;
  if (!el) return false;
  try {
    const rect = el.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2;
  } catch {
    return false;
  }
}

async function createMap() {
  if (!containerEl.value) return;
  phase.value = 'loading';
  errorText.value = '';
  await nextTick();
  if (disposed || !containerEl.value) return;
  try {
    const T = await loadTianditu({ tk: store.tk, version: store.apiVersion });
    if (disposed || !containerEl.value) return;
    const map = new T.Map(containerId);
    map.centerAndZoom(new T.LngLat(lon.value, lat.value), 15);
    map.addControl(new T.Control.Zoom());
    try { map.disableKeyboard && map.disableKeyboard(); } catch {}
    try { map.enableDrag && map.enableDrag(); } catch {}
    try { map.enableScrollWheelZoom && map.enableScrollWheelZoom(); } catch {}
    map.addOverLay(new T.Marker(new T.LngLat(lon.value, lat.value)));
    mapInstance = map;
    phase.value = 'ready';
    scheduleResize();
  } catch (err) {
    phase.value = 'error';
    errorText.value = String((err && err.message) || err);
  }
}

async function refresh() {
  if (disposed) return;
  destroyMap();
  createRequested = false;
  if (!props.photo || !hasGps.value) {
    phase.value = 'idle';
    return;
  }
  await store.load();
  if (disposed) return;
  if (!store.ready) {
    phase.value = 'unconfigured';
    return;
  }
  if (!isContainerVisible()) {
    // 参数详情折叠中（容器零尺寸）：先记下，等展开再建
    phase.value = 'pending';
    createRequested = true;
    return;
  }
  await createMap();
}

// 去抖：store.load() 回填同值不触发重建，只有实质变化才走 refresh
let lastWatchKey = '';
watch(
  () => [props.photo && props.photo.id, lat.value, lon.value, store.tk, store.apiVersion].join('|'),
  (key) => {
    if (key === lastWatchKey) return;
    lastWatchKey = key;
    refresh();
  },
  { immediate: true },
);

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      scheduleResize();
      if (createRequested && !disposed && isContainerVisible()) {
        createRequested = false;
        createMap();
      }
    });
    if (containerEl.value) resizeObserver.observe(containerEl.value);
  }
});

onBeforeUnmount(() => {
  disposed = true;
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  destroyMap();
});
</script>

<template>
  <div v-if="photo && hasGps" class="lightbox-mini-map">
    <div class="mini-map-head">
      <span>拍摄位置</span>
      <span class="mini-map-coord" :title="coordText">{{ coordText }}</span>
    </div>
    <div class="mini-map-frame">
      <div :id="containerId" ref="containerEl" class="mini-map-canvas" :class="{ 'is-hidden': phase !== 'loading' && phase !== 'ready' }"></div>
      <div v-if="phase === 'loading'" class="mini-map-overlay">地图加载中…</div>
      <div v-else-if="phase === 'unconfigured'" class="mini-map-overlay">未配置天地图密钥，请到「设置 → 地图」填写</div>
      <div v-else-if="phase === 'error'" class="mini-map-overlay is-error">{{ errorText }}</div>
      <div v-if="phase === 'ready'" class="mini-map-attribution">© 天地图</div>
    </div>
  </div>
</template>

<style scoped>
.lightbox-mini-map {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.mini-map-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.86);
  font-weight: 600;
}
.mini-map-coord {
  color: rgba(255, 255, 255, 0.42);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mini-map-frame {
  position: relative;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #101014;
}
.mini-map-canvas {
  width: 100%;
  height: 100%;
}
.mini-map-canvas.is-hidden { visibility: hidden; }
.mini-map-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 0 14px;
  text-align: center;
  font-size: 11.5px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.55);
  background: rgba(14, 14, 16, 0.94);
}
.mini-map-overlay.is-error { color: #ff9a9a; }
.mini-map-attribution {
  position: absolute;
  right: 4px;
  bottom: 2px;
  padding: 0 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
  background: rgba(0, 0, 0, 0.35);
  border-radius: 3px;
  pointer-events: none;
}
</style>
