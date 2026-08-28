// 统一 pywebview 桥接，带 mock 兜底，供 Vue 与老 IIFE 共用
// Phase 0: 仅封装 call + 提供 useBridge composable；mock 仅用于脱离 pywebview 的本地预览/测试

// Vue 岛在 DOMContentLoaded 即挂载，早于 pywebview 异步注入 window.pywebview，
// 因此 call 命中 API 前需要短暂等待桥接就绪（pywebviewready 事件 + 轮询兜底）
const BRIDGE_WAIT_MS = 5000;
const BRIDGE_POLL_MS = 100;

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

// 等待 pywebview 注入完成；超时返回 false（无 pywebview 的浏览器预览环境）
let bridgeWaitFailed = false;

function waitBridgeReady() {
  if (getApi()) return Promise.resolve(true);
  if (bridgeWaitFailed) return Promise.resolve(false);
  return new Promise((resolve) => {
    let elapsed = 0;

    function settle(ok) {
      window.removeEventListener('pywebviewready', onReady);
      clearInterval(pollTimer);
      if (!ok) bridgeWaitFailed = true;
      resolve(ok);
    }

    function onReady() {
      if (getApi()) settle(true);
    }

    const pollTimer = setInterval(() => {
      elapsed += BRIDGE_POLL_MS;
      if (getApi()) settle(true);
      else if (elapsed >= BRIDGE_WAIT_MS) settle(false);
    }, BRIDGE_POLL_MS);

    window.addEventListener('pywebviewready', onReady);
  });
}

export async function call(name, ...args) {
  const api = getApi();
  if (api && typeof api[name] === 'function') {
    return api[name](...args);
  }

  const ready = await waitBridgeReady();
  const waitedApi = getApi();
  if (ready && waitedApi && typeof waitedApi[name] === 'function') {
    return waitedApi[name](...args);
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
