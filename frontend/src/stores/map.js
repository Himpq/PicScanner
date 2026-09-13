import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { call } from '../bridge/index.js';

// 地图服务配置（后端模块 map_service，存 data/module_configs/map_service.json）
//
// 天地图浏览器端 / 服务端是两种 key，权限不互通：
// - tk（浏览器端）：JSAPI + 瓦片，地图显示用；
// - serverTk（服务端）：地理编码等接口探测用，可选。
//
// 现在只接天地图，保留 provider 字段与配置形状，后续加高德/百度时
// 只需扩展 normalize() 与后端模块的探测分支。

export const MAP_MODULE_KEY = 'map_service';
const DEFAULT_API_VERSION = '4.0';

function normalize(raw) {
  const config = raw && typeof raw === 'object' ? raw : {};
  const tianditu = config.tianditu && typeof config.tianditu === 'object' ? config.tianditu : {};
  return {
    provider: String(config.provider || 'tianditu').trim().toLowerCase() || 'tianditu',
    tk: String(tianditu.browser_tk || tianditu.tk || '').trim(),
    serverTk: String(tianditu.server_tk || '').trim(),
    apiVersion: String(tianditu.api_version || DEFAULT_API_VERSION).trim() || DEFAULT_API_VERSION,
    showInInfoPanel: config.show_in_info_panel !== false,
  };
}

export const useMapStore = defineStore('mapService', () => {
  const loaded = ref(false);
  const loading = ref(false);
  const provider = ref('tianditu');
  const tk = ref('');
  const serverTk = ref('');
  const apiVersion = ref(DEFAULT_API_VERSION);
  const showInInfoPanel = ref(true);

  const ready = computed(() => !!tk.value);

  let loadingPromise = null;

  async function load(force = false) {
    if (loadingPromise) return loadingPromise;
    if (loaded.value && !force) return;
    loadingPromise = (async () => {
      loading.value = true;
      try {
        const res = await call('get_module_config', MAP_MODULE_KEY);
        if (res && res.success) apply(res.config);
      } catch {
        // 配置读取失败不阻断地图：保持未配置状态，设置页可重新保存
      } finally {
        loaded.value = true;
        loading.value = false;
        loadingPromise = null;
      }
    })();
    return loadingPromise;
  }

  function apply(raw) {
    const next = normalize(raw);
    provider.value = next.provider;
    tk.value = next.tk;
    serverTk.value = next.serverTk;
    apiVersion.value = next.apiVersion;
    showInInfoPanel.value = next.showInInfoPanel;
  }

  async function persist() {
    const browser = String(tk.value || '').trim();
    const tianditu = {
      tk: browser,
      browser_tk: browser,
      server_tk: String(serverTk.value || '').trim(),
      api_version: String(apiVersion.value || DEFAULT_API_VERSION).trim() || DEFAULT_API_VERSION,
      timeout: 12,
    };
    await call('set_module_config', MAP_MODULE_KEY, 'tianditu', tianditu);
    await call('set_module_config', MAP_MODULE_KEY, 'provider', provider.value);
    await call('set_module_config', MAP_MODULE_KEY, 'show_in_info_panel', showInInfoPanel.value);
    loaded.value = true;
    return true;
  }

  async function setShowInInfoPanel(value) {
    showInInfoPanel.value = !!value;
    try {
      await call('set_module_config', MAP_MODULE_KEY, 'show_in_info_panel', showInInfoPanel.value);
    } catch {}
  }

  // 服务端 key 探测（地理编码接口）。浏览器端 key 会 403，属正常现象。
  async function testGeocode(candidateServerTk) {
    const probe = String(candidateServerTk || '').trim() || serverTk.value;
    return call('module_api', MAP_MODULE_KEY, 'test_geocode', provider.value, probe);
  }

  // GPS 补扫：游标分批，前端循环直到 done
  async function backfill(afterId, batch) {
    return call('module_api', MAP_MODULE_KEY, 'backfill_gps', Number(afterId || 0), Number(batch || 500));
  }

  return {
    loaded, loading, provider, tk, serverTk, apiVersion, showInInfoPanel, ready,
    load, apply, persist, setShowInInfoPanel, testGeocode, backfill,
  };
});
