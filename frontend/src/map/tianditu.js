// 天地图 JSAPI 加载器（无 npm 依赖，脚本标签按需加载）
//
// tk 变化时清掉旧脚本与 window.T 重新加载：JSAPI 的 tk 绑定在脚本 URL 上，
// 不重建的话新密钥不会生效。同一 tk 只加载一次。

const SCRIPT_SELECTOR = 'script[data-picscanner-tianditu]';

let loadPromise = null;
let loadedKey = '';

function teardown() {
  try {
    document.querySelectorAll(SCRIPT_SELECTOR).forEach((el) => el.remove());
  } catch {}
  try {
    delete window.T;
  } catch {
    try { window.T = undefined; } catch {}
  }
  loadPromise = null;
}

export function loadTianditu({ tk, version = '4.0' } = {}) {
  const cleanTk = String(tk || '').trim();
  if (!cleanTk) return Promise.reject(new Error('未配置天地图密钥（tk）'));

  const key = cleanTk + '@' + String(version || '4.0');
  if (window.T && window.T.Map && loadedKey === key) return Promise.resolve(window.T);
  if (loadPromise && loadedKey === key) return loadPromise;

  teardown();
  loadedKey = key;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://api.tianditu.gov.cn/api?v=' + encodeURIComponent(version || '4.0') + '&tk=' + encodeURIComponent(cleanTk);
    script.async = true;
    script.dataset.picscannerTianditu = '1';
    script.onload = () => {
      if (window.T && window.T.Map) {
        resolve(window.T);
        return;
      }
      loadPromise = null;
      reject(new Error('天地图 JSAPI 已加载，但 window.T 不存在'));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('天地图 JSAPI 脚本加载失败（检查网络）'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

// 配置变更后调用：下次 loadTianditu 会用新 tk 重新加载
export function resetTianditu() {
  loadedKey = '';
  teardown();
}

export function tiandituLoaded() {
  return !!(window.T && window.T.Map);
}

// ------------------------------------------------------------------
// 瓦片探测（浏览器端 key 的真实校验）
//
// 服务端 urllib 会被天地图 CloudWAF 拦（418），所以这一步必须在前端做：
// 用 <img> 加载一块真实瓦片（无需 CORS，onload/onerror 即是结论），
// 跑在用户真实网络 + 真实 Referer 下，结论与小地图实际表现一致。
// ------------------------------------------------------------------

export function tileProbeUrl(tk) {
  const params = new URLSearchParams({
    SERVICE: 'WMTS',
    REQUEST: 'GetTile',
    VERSION: '1.0.0',
    LAYER: 'vec',
    STYLE: 'default',
    TILEMATRIXSET: 'w',
    FORMAT: 'tiles',
    TILEMATRIX: '1',
    TILECOL: '1',
    TILEROW: '0',
    tk: String(tk || '').trim(),
  });
  return 'https://t0.tianditu.gov.cn/vec_w/wmts?' + params.toString();
}

export function probeTile({ tk, timeout = 15000 } = {}) {
  return new Promise((resolve) => {
    const clean = String(tk || '').trim();
    if (!clean) {
      resolve({ success: false, message: '未配置浏览器端密钥' });
      return;
    }
    const img = new Image();
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const timer = setTimeout(() => {
      try { img.src = ''; } catch {}
      done({ success: false, message: '瓦片加载超时（检查网络）' });
    }, timeout);
    img.onload = () => {
      clearTimeout(timer);
      done(img.naturalWidth > 0
        ? { success: true, message: '浏览器端密钥可用（瓦片加载正常）' }
        : { success: false, message: '瓦片内容异常' });
    };
    img.onerror = () => {
      clearTimeout(timer);
      done({ success: false, message: '瓦片加载失败（密钥无权限、类型错误或被拦截）' });
    };
    img.src = tileProbeUrl(clean) + '&_t=' + Date.now();
  });
}
