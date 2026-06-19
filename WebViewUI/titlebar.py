"""
titlebar.py - 标题栏注入 JS / 启动页 HTML / 页面补丁 JS 构建器

提供三个构建器：
  build_titlebar_js(opts)      -> str  由 Python 注入的自绘标题栏脚本
  build_bootstrap_html(opts)   -> str  bootstrap 启动页 HTML
  build_page_patch_js(opts)    -> str  真实页面的内容区 top 偏移补丁

设计原则：只保留通用窗口 UI。业务页面、登录流程、业务过渡效果、资源加载
状态等都交给使用者自己实现。
"""

import json


def build_titlebar_js(opts=None):
    """构建标题栏注入 JS。

    opts:
      titlebar_height: int     标题栏高度（默认 36）
      api_prefix: str          当前窗口的 API 前缀，主窗口为空串
      brand: str               左上角品牌文字（可空，留空则不显示）
      marker_id: str           标题栏 DOM id（默认 "wvu-titlebar"）
      style_id: str            style 元素 id（默认 "wvu-titlebar-style"）
    """
    o = opts or {}
    tb_h = int(o.get("titlebar_height", 36))
    api_prefix = str(o.get("api_prefix", "") or "")
    brand = str(o.get("brand", "") or "")
    marker_id = str(o.get("marker_id", "wvu-titlebar") or "wvu-titlebar")
    style_id = str(o.get("style_id", "wvu-titlebar-style") or "wvu-titlebar-style")
    brand_json = json.dumps(brand, ensure_ascii=False)
    prefix_json = json.dumps(api_prefix, ensure_ascii=False)
    marker_json = json.dumps(marker_id)
    style_json = json.dumps(style_id)

    return r'''(function() {
    if (window.__webviewUITitlebarScriptActive && document.getElementById(%MARKER%)) {
        return;
    }
    window.__webviewUITitlebarScriptActive = true;
    if (window.top !== window.self) {
        return;
    }

    const TB_H = %TB_H%;
    const API_PREFIX = %PREFIX%;
    const BRAND = %BRAND%;
    const MARKER_ID = %MARKER%;
    const STYLE_ID = %STYLE%;
    const EDGE_CURSOR = {
        'top': 'ns-resize', 'bottom': 'ns-resize',
        'left': 'ew-resize', 'right': 'ew-resize',
        'top-left': 'nwse-resize', 'top-right': 'nesw-resize',
        'bottom-left': 'nesw-resize', 'bottom-right': 'nwse-resize'
    };
    const ICON_MIN = '<svg width="10" height="10" viewBox="0 0 10 1"><rect width="10" height="1" y="0" fill="currentColor"/></svg>';
    const ICON_MAX = '<svg width="10" height="10" viewBox="0 0 10 10"><rect x=".5" y=".5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
    const ICON_RESTORE = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 1.5h5.5v5.5H3zM1.5 3h5.5v5.5H1.5z" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
    const ICON_CLOSE = '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.2"/></svg>';

    const api = () => (window.pywebview && window.pywebview.api) ? window.pywebview.api : null;
    window.__webviewUIApiPrefix = API_PREFIX;

    function callWindowAction(action, payload) {
        const a = api();
        if (!a || !a.webview_window_action) return null;
        return a.webview_window_action(action, API_PREFIX, payload || {});
    }

    function ensureHead() {
        if (document.head) return true;
        if (!document.documentElement) return false;
        const h = document.createElement('head');
        document.documentElement.insertBefore(h, document.documentElement.firstChild);
        return true;
    }

    function ensureStyle() {
        if (!ensureHead()) return false;
        let s = document.getElementById(STYLE_ID);
        if (!s) {
            s = document.createElement('style');
            s.id = STYLE_ID;
            document.head.appendChild(s);
        }
        s.textContent = `
            html, body { margin: 0 !important; height: 100% !important; }
            :root { --wvu-titlebar-h: ${TB_H}px; }
            #wvu-titlebar {
                position: fixed; top: 0; left: 0; width: 100%;
                height: var(--wvu-titlebar-h);
                background: #050505;
                z-index: 2147483647;
                box-sizing: border-box; overflow: hidden;
                display: flex; align-items: center; justify-content: space-between;
                user-select: none; -webkit-user-select: none;
            }
            #wvu-titlebar .wvu-brand {
                color: #fff; font-size: 13px; font-weight: 600;
                padding-left: 14px; letter-spacing: 0;
                flex: 1; height: 100%; display: flex; align-items: center;
                cursor: default;
            }
            .wvu-tb-btns {
                display: flex; align-items: center; gap: 0;
                height: 100%; box-sizing: border-box;
            }
            .wvu-tb-btn {
                width: 46px; height: 100%; border: none;
                background: transparent; color: rgba(255,255,255,0.55);
                cursor: default; display: flex; align-items: center;
                justify-content: center; transition: background .12s, color .12s;
                padding: 0; margin: 0; box-sizing: border-box; line-height: 1;
            }
            .wvu-tb-btn:hover { background: rgba(255,255,255,0.10); color: #fff; }
            .wvu-tb-btn.wvu-close:hover { background: #e81123; color: #fff; }
            .wvu-tb-btn svg { pointer-events: none; display: block; }
            .wvu-rsz {
                position: fixed; z-index: 2147483647;
                pointer-events: auto; background: transparent;
            }
            .wvu-rsz.edge-top { top: 0; left: 10px; right: 10px; height: 8px; }
            .wvu-rsz.edge-bottom { bottom: 0; left: 10px; right: 10px; height: 8px; }
            .wvu-rsz.edge-left { left: 0; top: 10px; bottom: 10px; width: 8px; }
            .wvu-rsz.edge-right { right: 0; top: 10px; bottom: 10px; width: 8px; }
            .wvu-rsz.corner-tl { top: 0; left: 0; width: 12px; height: 12px; }
            .wvu-rsz.corner-tr { top: 0; right: 0; width: 12px; height: 12px; }
            .wvu-rsz.corner-bl { bottom: 0; left: 0; width: 12px; height: 12px; }
            .wvu-rsz.corner-br { bottom: 0; right: 0; width: 12px; height: 12px; }
            html.wvu-win-maximized .wvu-rsz { pointer-events: none !important; }
            body { padding-top: var(--wvu-titlebar-h) !important; }
        `;
        return true;
    }

    function setMaxIcon(isMax) {
        const btn = document.getElementById('wvu-max-btn');
        if (!btn) return;
        btn.innerHTML = isMax ? ICON_RESTORE : ICON_MAX;
        btn.title = isMax ? '还原' : '最大化';
        if (document.documentElement) {
            document.documentElement.classList.toggle('wvu-win-maximized', !!isMax);
        }
        window.__webviewUIWinMaximized = !!isMax;
        applyResizeGripState();
    }
    window._webviewUITitlebarSetMaximized = setMaxIcon;

    function applyResizeGripState() {
        const wrap = document.getElementById('wvu-resize-grips');
        if (!wrap) return;
        const isMax = !!window.__webviewUIWinMaximized;
        wrap.querySelectorAll('[data-edge]').forEach(function(el) {
            const edge = String(el.dataset.edge || '').trim();
            if (isMax) {
                el.style.pointerEvents = 'none';
                el.style.cursor = 'default';
            } else {
                el.style.pointerEvents = 'auto';
                el.style.cursor = EDGE_CURSOR[edge] || 'default';
            }
        });
    }

    function bindBar(bar) {
        if (!bar || bar.dataset.wvuBound === '1') return;
        bar.dataset.wvuBound = '1';
        let downState = null;
        let lastDownTs = 0, lastDownX = 0, lastDownY = 0, skipNativeDbl = false;
        const clearDownState = () => { downState = null; };

        const minBtn = bar.querySelector('.wvu-min');
        const maxBtn = bar.querySelector('.wvu-max');
        const closeBtn = bar.querySelector('.wvu-close');
        if (minBtn) minBtn.onclick = e => { e.stopPropagation(); callWindowAction('minimize_window'); };
        if (maxBtn) maxBtn.onclick = e => { e.stopPropagation(); callWindowAction('maximize_window'); };
        if (closeBtn) closeBtn.onclick = e => { e.stopPropagation(); callWindowAction('close_window'); };

        bar.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            if (e.target && e.target.closest && e.target.closest('.wvu-tb-btns')) return;
            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            const near = Math.abs((e.clientX || 0) - lastDownX) + Math.abs((e.clientY || 0) - lastDownY) <= 8;
            const isDouble = (now - lastDownTs) <= 300 && near;
            lastDownTs = now; lastDownX = (e.clientX || 0); lastDownY = (e.clientY || 0);
            if (isDouble) {
                skipNativeDbl = true; clearDownState(); e.preventDefault();
                callWindowAction('maximize_window');
                return;
            }
            downState = { x: e.clientX, y: e.clientY, started: false };
            const onMove = function(ev) {
                if (!downState || downState.started) return;
                const dx = Math.abs((ev.clientX || 0) - downState.x);
                const dy = Math.abs((ev.clientY || 0) - downState.y);
                if (dx + dy < 4) return;
                downState.started = true;
                ev.preventDefault();
                callWindowAction('start_window_drag');
            };
            const onUp = function() {
                window.removeEventListener('mousemove', onMove, true);
                window.removeEventListener('mouseup', onUp, true);
                clearDownState();
            };
            window.addEventListener('mousemove', onMove, true);
            window.addEventListener('mouseup', onUp, true);
        });

        bar.addEventListener('mouseup', clearDownState);
        bar.addEventListener('mouseleave', clearDownState);
        bar.addEventListener('dblclick', function(e) {
            if (e.target && e.target.closest && e.target.closest('.wvu-tb-btns')) return;
            if (skipNativeDbl) { skipNativeDbl = false; e.preventDefault(); return; }
            clearDownState(); e.preventDefault();
            callWindowAction('maximize_window');
        });
    }

    function ensureBar() {
        if (!document.body) return false;
        let bar = document.getElementById(MARKER_ID);
        if (!bar) {
            bar = document.createElement('div');
            bar.id = MARKER_ID;
            if (BRAND) {
                const brand = document.createElement('div');
                brand.className = 'wvu-brand';
                brand.textContent = BRAND;
                bar.appendChild(brand);
            } else {
                const spacer = document.createElement('div');
                spacer.className = 'wvu-brand';
                bar.appendChild(spacer);
            }
            const btns = document.createElement('div');
            btns.className = 'wvu-tb-btns';
            btns.innerHTML = `
                <button class="wvu-tb-btn wvu-min" title="最小化">${ICON_MIN}</button>
                <button class="wvu-tb-btn wvu-max" title="最大化" id="wvu-max-btn">${ICON_MAX}</button>
                <button class="wvu-tb-btn wvu-close" title="关闭">${ICON_CLOSE}</button>
            `;
            bar.appendChild(btns);
            document.body.prepend(bar);
        }
        if (document.documentElement) {
            document.documentElement.classList.add('wvu-titlebar-ready');
        }
        bindBar(bar);
        return true;
    }

    function ensureResizeGrips() {
        if (!document.body) return false;
        let wrap = document.getElementById('wvu-resize-grips');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'wvu-resize-grips';
            wrap.innerHTML = `
                <div class="wvu-rsz edge-top" data-edge="top"></div>
                <div class="wvu-rsz edge-bottom" data-edge="bottom"></div>
                <div class="wvu-rsz edge-left" data-edge="left"></div>
                <div class="wvu-rsz edge-right" data-edge="right"></div>
                <div class="wvu-rsz corner-tl" data-edge="top-left"></div>
                <div class="wvu-rsz corner-tr" data-edge="top-right"></div>
                <div class="wvu-rsz corner-bl" data-edge="bottom-left"></div>
                <div class="wvu-rsz corner-br" data-edge="bottom-right"></div>
            `;
            document.body.appendChild(wrap);
        }
        if (wrap.dataset.wvuBound !== '1') {
            wrap.dataset.wvuBound = '1';
            wrap.querySelectorAll('[data-edge]').forEach(function(el) {
                el.addEventListener('mousedown', function(e) {
                    if (e.button !== 0) return;
                    e.preventDefault(); e.stopPropagation();
                    const edge = String(el.dataset.edge || '').trim();
                    if (window.__webviewUIWinMaximized) return;
                    callWindowAction('start_window_resize', { edge: edge });
                });
            });
        }
        applyResizeGripState();
        return true;
    }

    function ensureAll() {
        const styleOk = ensureStyle();
        const barOk = ensureBar();
        const gripsOk = ensureResizeGrips();
        if (styleOk && barOk && gripsOk) {
            try { window.dispatchEvent(new Event('resize')); } catch (_) {}
        }
        return styleOk && barOk && gripsOk;
    }

    if (!ensureAll()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() { ensureAll(); }, { once: true });
        } else {
            setTimeout(function() { ensureAll(); }, 80);
        }
    }

    (function fastBootstrap() {
        let n = 0;
        const t = setInterval(function() {
            n += 1;
            try { ensureAll(); } catch (_) {}
            if (document.getElementById(MARKER_ID) || n >= 90) {
                clearInterval(t);
            }
        }, 16);
    })();

    setInterval(function() {
        if (!document.getElementById(MARKER_ID)) {
            ensureAll();
        }
    }, 1000);
})();
'''.replace("%TB_H%", str(tb_h)).replace("%PREFIX%", prefix_json) \
   .replace("%BRAND%", brand_json).replace("%MARKER%", marker_json) \
   .replace("%STYLE%", style_json)


def build_page_patch_js(opts=None):
    """真实页面的内容区 top 偏移补丁。"""
    o = opts or {}
    tb_h = int(o.get("titlebar_height", 36))
    return r'''(function() {
    function ensureHead() {
        if (document.head) return true;
        if (!document.documentElement) return false;
        const h = document.createElement('head');
        document.documentElement.insertBefore(h, document.documentElement.firstChild);
        return true;
    }
    function ensureStyle() {
        if (!ensureHead()) return false;
        let s = document.getElementById('wvu-page-shell-style');
        if (!s) {
            s = document.createElement('style');
            s.id = 'wvu-page-shell-style';
            document.head.appendChild(s);
        }
        s.textContent = `
            :root { --wvu-titlebar-h: %TB_H%px; }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.18); border-radius: 3px; }
            ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.32); }
            body { padding-top: var(--wvu-titlebar-h) !important; }
        `;
        return true;
    }
    ensureStyle();
    setTimeout(ensureStyle, 0);
    setTimeout(ensureStyle, 80);
})();
'''.replace("%TB_H%", str(tb_h))


def build_bootstrap_html(opts=None):
    """构建 bootstrap 启动页 HTML。

    只负责在真实页面加载前提供通用暗色壳和窗口按钮，不实现业务流程。
    """
    o = opts or {}
    brand = str(o.get("brand", "WebViewUI") or "WebViewUI")
    msg = str(o.get("bootstrap_msg", "加载中") or "加载中")
    entry_url = str(o.get("entry_url", "") or "")
    tb_h = int(o.get("titlebar_height", 36))
    api_prefix = str(o.get("api_prefix", "") or "")
    entry_json = json.dumps(entry_url, ensure_ascii=False)
    brand_esc = brand.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    msg_esc = msg.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    return r'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>__BRAND__</title>
<style>
    html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#050505;color:#aaa;font-family:'Segoe UI','Microsoft YaHei',sans-serif;}
    #wvu-boot-bar{position:fixed;top:0;left:0;right:0;height:%TB_H%px;background:#050505;display:flex;align-items:center;justify-content:space-between;z-index:99;user-select:none;}
    #wvu-boot-bar .wvu-brand{color:#fff;font-size:13px;font-weight:600;padding-left:14px;letter-spacing:0;flex:1;height:100%;display:flex;align-items:center;}
    .wvu-btb-btns{display:flex;align-items:center;gap:0;height:100%;}
    .wvu-btb-btn{width:46px;height:100%;border:none;background:transparent;color:rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;padding:0;margin:0;box-sizing:border-box;line-height:1;cursor:default;}
    .wvu-btb-btn:hover{background:rgba(255,255,255,.10);color:#fff;}
    .wvu-btb-btn.close:hover{background:#e81123;color:#fff;}
    .wvu-btb-btn svg{pointer-events:none;display:block;}
    #wvu-boot-stage{position:fixed;left:0;right:0;top:%TB_H%px;bottom:0;overflow:hidden;display:flex;align-items:center;justify-content:center;z-index:50;background:#050505;}
    #wvu-boot-center{display:flex;flex-direction:column;align-items:center;gap:12px;max-width:min(520px,88vw);text-align:center;}
    #wvu-boot-brand{font-size:22px;font-weight:600;color:#ffffff;letter-spacing:0;line-height:1.25;}
    #wvu-boot-sub{color:rgba(255,255,255,0.68);font-size:13px;letter-spacing:0;}
</style>
</head>
<body>
<div id="wvu-boot-bar">
    <div class="wvu-brand">__BRAND__</div>
    <div class="wvu-btb-btns">
        <button class="wvu-btb-btn" data-act="min" title="最小化"><svg width="10" height="10" viewBox="0 0 10 1"><rect width="10" height="1" y="0" fill="currentColor"/></svg></button>
        <button class="wvu-btb-btn" data-act="max" title="最大化" id="wvu-boot-max-btn"><svg width="10" height="10" viewBox="0 0 10 10"><rect x=".5" y=".5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/></svg></button>
        <button class="wvu-btb-btn close" data-act="close" title="关闭"><svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.2"/></svg></button>
    </div>
</div>
<div id="wvu-boot-stage">
    <div id="wvu-boot-center">
      <div id="wvu-boot-brand">__BRAND__</div>
      <div id="wvu-boot-sub">__MSG__</div>
    </div>
</div>
<script>
(function() {
    const ENTRY_URL = __ENTRY_URL__;
    const API_PREFIX = __PREFIX__;
    let bootMaximized = false;
    function api() {
        return (window.pywebview && window.pywebview.api) ? window.pywebview.api : null;
    }
    function callWindowAction(action, payload) {
        const a = api();
        if (!a || !a.webview_window_action) return null;
        return a.webview_window_action(action, API_PREFIX, payload || {});
    }
    function hideBootStage() {
        const stage = document.getElementById('wvu-boot-stage');
        if (stage) stage.style.display = 'none';
    }

    const bar = document.getElementById('wvu-boot-bar');
    if (bar) {
        let down = null, lastDownTs = 0, lastDownX = 0, lastDownY = 0, skipNativeDbl = false;
        bar.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            if (e.target && e.target.closest && e.target.closest('button')) return;
            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            const near = Math.abs((e.clientX || 0) - lastDownX) + Math.abs((e.clientY || 0) - lastDownY) <= 8;
            const isDouble = (now - lastDownTs) <= 300 && near;
            lastDownTs = now; lastDownX = (e.clientX || 0); lastDownY = (e.clientY || 0);
            if (isDouble) {
                skipNativeDbl = true; down = null; e.preventDefault();
                callWindowAction('maximize_window');
                return;
            }
            down = { x: e.clientX, y: e.clientY, started: false };
            const onMove = function(ev) {
                if (!down || down.started) return;
                if (Math.abs((ev.clientX || 0) - down.x) + Math.abs((ev.clientY || 0) - down.y) < 4) return;
                down.started = true;
                ev.preventDefault();
                callWindowAction('start_window_drag');
            };
            const onUp = function() {
                window.removeEventListener('mousemove', onMove, true);
                window.removeEventListener('mouseup', onUp, true);
                down = null;
            };
            window.addEventListener('mousemove', onMove, true);
            window.addEventListener('mouseup', onUp, true);
        });
        bar.addEventListener('dblclick', function(e) {
            if (e.target && e.target.closest && e.target.closest('button')) return;
            if (skipNativeDbl) { skipNativeDbl = false; e.preventDefault(); return; }
            callWindowAction('maximize_window');
        });
    }

    document.querySelectorAll('#wvu-boot-bar button[data-act]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const act = String(btn.getAttribute('data-act') || '');
            if (act === 'min') callWindowAction('minimize_window');
            else if (act === 'max') {
                callWindowAction('maximize_window');
                bootMaximized = !bootMaximized;
            }
            else if (act === 'close') callWindowAction('close_window');
        });
    });

    window.addEventListener('pywebviewready', function() {
        const a = api();
        if (a && a.webview_window_action) {
            a.webview_window_action('is_window_maximized', API_PREFIX, {}).then(function(d) {
                bootMaximized = !!(d && d.maximized);
            }).catch(function() {});
        }
    });

    let bridgeChecks = 0;
    const t = setInterval(function() {
        bridgeChecks += 1;
        if (window.pywebview && window.pywebview.api) {
            clearInterval(t);
            setTimeout(hideBootStage, 220);
            return;
        }
        if (bridgeChecks >= 80) clearInterval(t);
    }, 50);
})();
</script>
</body>
</html>
'''.replace("__BRAND__", brand_esc) \
   .replace("__MSG__", msg_esc) \
   .replace("__ENTRY_URL__", entry_json) \
   .replace("__PREFIX__", json.dumps(api_prefix, ensure_ascii=False)) \
   .replace("%TB_H%", str(tb_h))
