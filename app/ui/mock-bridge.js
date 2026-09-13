// 浏览器测试用假 pywebview 桥（仅 /index.dev.html 加载，生产 index.html 不引用）。
// 数据来自 /test-data.json（Rubbish/dev-server.py 从真实库生成），
// 使 PhotoGrid/工具栏/批量选择/灯箱等前端能力可在 ZCode 内置浏览器里独立测试。

// 隐藏标签页里 requestAnimationFrame 不触发（后台节流），P1 的 rAF 合并同步会停摆。
// 测试环境垫片：rAF 挂起 250ms 未执行就降级 setTimeout 执行（可见时仍走原生 rAF）。
(function () {
  const nativeRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) {
    let fired = false;
    const wrapped = (t) => { if (!fired) { fired = true; cb(t); } };
    const id = nativeRaf(wrapped);
    setTimeout(() => { if (!fired) { fired = true; cb(performance.now()); } }, 250);
    return id;
  };
})();

(async function () {
  let data;
  try {
    data = await fetch('/test-data.json').then((r) => r.json());
  } catch (e) {
    console.error('[mock-bridge] test-data 加载失败', e);
    return;
  }

  const marks = data.marks || {};
  const state = { itemSize: 168, sourceId: data.sources[0] ? data.sources[0].id : '' };

  // 地图测试用的 tk（仅 index.dev.html 环境）：把天地图密钥写进
  // localStorage.mock_tianditu_tk，即可在浏览器里验证 LightboxMiniMap。
  function readMockTk() {
    try { return localStorage.getItem('mock_tianditu_tk') || ''; } catch { return ''; }
  }

  function applyMarks(p) {
    const m = marks[p.filename];
    if (m) {
      p.favorite = !!m.favorite;
      p.hidden = !!m.hidden;
      p.note = m.note || '';
      p.category = m.category || '';
    } else {
      p.favorite = false; p.hidden = false; p.note = ''; p.category = '';
    }
    return p;
  }
  function photosFor(dateKey) {
    return (data.byDate[dateKey] || []).map((p) => applyMarks(Object.assign({}, p)));
  }
  function sortedDates(sortKey) {
    const arr = [...data.dates];
    arr.sort((a, b) => {
      const l = String(a.date_key || ''), r = String(b.date_key || '');
      return sortKey === 'datetime_asc' ? l.localeCompare(r) : r.localeCompare(l);
    });
    return arr;
  }
  function photoById(photoId) {
    const p = data.photoById[String(photoId)];
    return p ? applyMarks(Object.assign({}, p)) : null;
  }

  const impl = {
    get_startup_state: () => ({ sources: { config: {} }, scan: {} }),
    get_sources: () => ({ success: true, sources: data.sources }),
    get_scan_state: () => ({
      success: true,
      state: { source_id: state.sourceId, state: 'done' },
      source_state: {},
      cached_visible_files: data.total,
      dates: sortedDates('datetime_desc'),
    }),
    list_dates: (cursor, limit, root, sid, sort) => ({
      success: true,
      dates: (() => {
        const all = sortedDates(sort || 'datetime_desc');
        const start = cursor ? all.findIndex((d) => d.date_key === cursor) + 1 : 0;
        return all.slice(Math.max(0, start), Math.max(0, start) + (limit || 40));
      })(),
    }),
    list_photos: (dateKey, offset, limit) => ({
      success: true,
      photos: photosFor(dateKey).slice(offset || 0, (offset || 0) + (limit || 40)),
    }),
    get_photo_preview: (photoId) => ({ success: true, photo: photoById(photoId) }),
    get_photo_exif: (photoId) => ({ success: true, photo: photoById(photoId) }),
    list_categories: () => ({ success: true, categories: data.categories, favorite_count: 0, hidden_count: 0 }),
    get_filter_options: () => ({ success: true, options: {} }),
    set_item_mark: () => ({ success: true, mark: {} }),
    set_last_source: () => ({ success: true }),
    get_gallery_item_size: () => ({ success: true, size: state.itemSize }),
    set_gallery_item_size: (v) => { state.itemSize = Number(v) || 168; return { success: true }; },
    get_export_preset: () => ({ success: true, preset: { enabled: false, destination: '', template: '{origin_name}_edited' } }),
    get_module_config: (key) => ({
      success: true,
      config: key === 'map_service'
        ? {
            provider: 'tianditu',
            show_in_info_panel: true,
            tianditu: { tk: readMockTk(), api_version: '4.0', timeout: 12 },
          }
        : {},
    }),
    set_module_config: (key, field, value) => {
      if (key === 'map_service' && field === 'tianditu' && value && typeof value === 'object') {
        try { localStorage.setItem('mock_tianditu_tk', String(value.tk || '')); } catch {}
      }
      return { success: true };
    },
    module_api: (key, method) => {
      if (key === 'map_service' && method === 'test_connection') {
        return { success: false, message: 'mock 桥不做真实探测，请在应用内测试' };
      }
      return { success: true };
    },
    open_external_url: () => ({ success: true }),
    start_scan: () => { setTimeout(() => window.dispatchEvent(new Event('pywebviewready')), 0); return { success: true }; },
    stop_scan: () => ({ success: true }),
    log: () => {},
  };

  window.pywebview = {
    api: new Proxy(impl, {
      get: (target, prop) => {
        if (typeof target[prop] === 'function') {
          return (...args) => {
            try {
              const r = target[prop](...args);
              return r && typeof r.then === 'function' ? r : Promise.resolve(r);
            } catch (e) {
              return Promise.reject(e);
            }
          };
        }
        return (...args) => Promise.resolve({ success: true });
      },
    }),
  };

  // app.js 的 startApp 监听 pywebviewready；本脚本先于应用脚本加载，
  // 用宏任务延时确保监听器已注册后再派发。
  setTimeout(() => window.dispatchEvent(new Event('pywebviewready')), 80);
})();
