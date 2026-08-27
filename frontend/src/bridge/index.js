// 统一 pywebview 桥接，带 mock 兜底，供 Vue 与老 IIFE 共用
// Phase 0: 仅封装 call + 提供 useBridge composable；mock 仅用于脱离 pywebview 的本地预览/测试

const MOCK_ENABLED = typeof window !== 'undefined' && !window.pywebview;

function mockCall(name, ...args) {
  console.warn('[PicScanner][mock] pywebview not ready, mock call:', name, args);
  switch (name) {
    case 'get_sources':
      return Promise.resolve({ success: true, sources: [] });
    case 'list_storage_sources':
      return Promise.resolve({ success: true, sources: [] });
    case 'get_export_preset':
      return Promise.resolve({ success: true, preset: { enabled: false, destination: '', template: '{origin_name}' } });
    case 'get_startup_state':
      return Promise.resolve({ success: true, sources: [], scan_state: {} });
    case 'get_scan_state':
      return Promise.resolve({ success: true, state: {} });
    default:
      return Promise.reject(new Error('pywebview bridge not ready: ' + name + ' (mock fallback)'));
  }
}

export function getApi() {
  return (window.pywebview && window.pywebview.api) ? window.pywebview.api : null;
}

export function isBridgeReady() {
  const api = getApi();
  return !!api;
}

export function call(name, ...args) {
  const api = getApi();
  if (api && typeof api[name] === 'function') {
    return api[name](...args);
  }
  if (MOCK_ENABLED) {
    return mockCall(name, ...args);
  }
  return Promise.reject(new Error('pywebview bridge not ready: ' + name));
}

export const STARTUP_API_METHODS = ['get_startup_state', 'get_sources', 'get_scan_state'];
export function missingStartupApiMethods() {
  const api = getApi();
  return STARTUP_API_METHODS.filter((m) => !api || typeof api[m] !== 'function');
}
export function startupApiReady() {
  return missingStartupApiMethods().length === 0;
}

// composable 供 Vue 组件使用
export function useBridge() {
  return { call, getApi, isBridgeReady, missingStartupApiMethods, startupApiReady };
}

// 同步到 legacy PS 供老 IIFE 使用（双轨期）
export function syncBridgeToLegacyPS() {
  const PS = window.PS;
  if (!PS) return;
  // 不覆盖 PS 已有的 call/api，补充缺失的辅助
  if (!PS.bridgeCall) PS.bridgeCall = call;
}
