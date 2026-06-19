"""
window_api.py - 暴露给页面 JS 的窗口控制 API 基类

设计：
  - 所有窗口（主窗口 + 子窗口）共享同一个 js_api 实例。
  - 每个窗口有一个 api_prefix（主窗口为空串，子窗口如 "second_"）。
  - JS 端通过 webview_window_action(action, api_prefix, payload) 调用窗口控制。
    这是显式导出方法，避免 pywebview 无法导出 __getattr__ 动态方法导致按钮失效。

子类可覆写业务方法（如 test 项目里的 greet / open_second_window）。
"""

import threading
import time
import traceback

import webview

from . import wintitle


class WindowApi:
    """窗口控制 API 基类。一个实例可服务多个窗口。"""

    def __init__(self):
        self._windows = {}            # api_prefix -> webview.Window
        self._window_lock = threading.Lock()
        self._window_opts = {}        # api_prefix -> opts dict（titlebar_height 等）
        self._child_counter = 0
        self._child_counter_lock = threading.Lock()
        self._stop = threading.Event()

    # ── 窗口注册 ──────────────────────────────────────────────
    def bind(self, window, api_prefix=""):
        """绑定一个窗口到指定前缀（主窗口传空串）。"""
        with self._window_lock:
            self._windows[api_prefix] = window
            if api_prefix not in self._window_opts:
                self._window_opts[api_prefix] = {}

    def _get_window(self, api_prefix=""):
        with self._window_lock:
            win = self._windows.get(api_prefix)
        if win and win in webview.windows:
            return win
        return None

    def _set_window_opts(self, api_prefix, opts):
        with self._window_lock:
            self._window_opts[api_prefix] = dict(opts or {})

    def _next_prefix(self):
        with self._child_counter_lock:
            self._child_counter += 1
            return f"win{self._child_counter}_"

    def request_stop(self):
        self._stop.set()

    # ── JS 桥显式窗口控制 ─────────────────────────────────────
    def webview_window_action(self, action, api_prefix="", payload=None):
        """页面标题栏统一调用的窗口控制入口。"""
        suffix = str(action or "").strip()
        prefix = str(api_prefix or "")
        if suffix not in WindowApi._DISPATCH_SUFFIXES:
            return {"success": False, "message": f"unsupported window action: {suffix}"}

        data = payload if isinstance(payload, dict) else {}
        if suffix == "start_window_resize":
            edge = data.get("edge", "right")
            return self._dispatch(prefix, suffix, edge)
        return self._dispatch(prefix, suffix)

    def minimize_window(self):
        return self._dispatch("", "minimize_window")

    def maximize_window(self):
        return self._dispatch("", "maximize_window")

    def close_window(self):
        return self._dispatch("", "close_window")

    def start_window_drag(self):
        return self._dispatch("", "start_window_drag")

    def start_window_resize(self, edge="right"):
        return self._dispatch("", "start_window_resize", edge)

    def is_window_maximized(self):
        return self._dispatch("", "is_window_maximized")

    def sync_window_state(self):
        return self._dispatch("", "sync_window_state")

    def titlebar_double_click(self):
        return self._dispatch("", "titlebar_double_click")

    # ── 动态方法分发 ──────────────────────────────────────────
    # 识别 <prefix>{minimize,maximize,close,start_window_drag,
    # start_window_resize,is_window_maximized,sync_window_state}_window
    # 以及 titlebar_double_click。
    _DISPATCH_SUFFIXES = (
        "minimize_window",
        "maximize_window",
        "close_window",
        "start_window_drag",
        "start_window_resize",
        "is_window_maximized",
        "sync_window_state",
        "titlebar_double_click",
    )

    def __getattr__(self, name):
        # 仅在常规属性查找失败时触发。注意：不要拦截双下划线与内部状态。
        # 先匹配无前缀（主窗口）：name == suffix
        for suffix in WindowApi._DISPATCH_SUFFIXES:
            if name == suffix:
                def _fn_main(*a, _s=suffix, **kw):
                    return self._dispatch("", _s, *a, **kw)
                return _fn_main
        # 再遍历已注册前缀精确匹配：name == prefix + suffix
        with self._window_lock:
            prefixes = list(self._windows.keys())
        for prefix in prefixes:
            if not prefix:
                continue
            for suffix in WindowApi._DISPATCH_SUFFIXES:
                if name == prefix + suffix:
                    def _fn(*a, _p=prefix, _s=suffix, **kw):
                        return self._dispatch(_p, _s, *a, **kw)
                    return _fn
        raise AttributeError(name)

    def _dispatch(self, prefix, suffix, *args, **kwargs):
        win = self._get_window(prefix)
        if win is None:
            return {"success": False, "message": f"window not found for prefix={prefix!r}"}
        try:
            if suffix == "minimize_window":
                return self._do_minimize(win)
            if suffix == "maximize_window":
                return self._do_maximize(win)
            if suffix == "close_window":
                return self._do_close(win, prefix)
            if suffix == "start_window_drag":
                return self._do_drag(win)
            if suffix == "start_window_resize":
                edge = args[0] if args else kwargs.get("edge", "right")
                return self._do_resize(win, str(edge))
            if suffix == "is_window_maximized":
                return self._do_is_maximized(win)
            if suffix == "sync_window_state":
                return self._do_sync_state(win)
            if suffix == "titlebar_double_click":
                return self._do_titlebar_dbl(win)
        except Exception as e:
            return {"success": False, "message": str(e)}
        return {"success": False, "message": "unknown dispatch"}

    # ── 单窗口操作实现 ────────────────────────────────────────
    def _do_minimize(self, win):
        try:
            if not wintitle.minimize_window(win):
                win.minimize()
        except Exception:
            try:
                win.minimize()
            except Exception:
                pass
        return {"success": True}

    def _do_maximize(self, win):
        try:
            if not wintitle.toggle_max_restore(win):
                try:
                    st = str(win.state).lower()
                except Exception:
                    st = ""
                if st == "maximized":
                    win.restore()
                else:
                    win.maximize()
        except Exception:
            try:
                st = str(win.state).lower()
            except Exception:
                st = ""
            try:
                if st == "maximized":
                    win.restore()
                else:
                    win.maximize()
            except Exception:
                pass
        return {"success": True}

    def _do_close(self, win, prefix):
        try:
            with self._window_lock:
                self._windows.pop(prefix, None)
                self._window_opts.pop(prefix, None)
            win.destroy()
        except Exception:
            pass
        return {"success": True}

    def _do_drag(self, win):
        try:
            wintitle.start_window_drag(win)
        except Exception:
            pass
        return {"success": True}

    def _do_resize(self, win, edge):
        try:
            ok = bool(wintitle.start_window_resize(win, edge=edge))
            return {"success": ok}
        except Exception:
            return {"success": False}

    def _do_is_maximized(self, win):
        try:
            return {"success": True, "maximized": bool(wintitle.is_window_maximized(win))}
        except Exception:
            return {"success": True, "maximized": False}

    def _do_sync_state(self, win):
        try:
            wintitle.sync_max_state(win)
        except Exception:
            pass
        return {"success": True}

    def _do_titlebar_dbl(self, win):
        try:
            if wintitle.titlebar_double_click(win):
                return {"success": True}
        except Exception:
            pass
        return self._do_maximize(win)

    # ── 多窗口工厂 ────────────────────────────────────────────
    def create_child_window(self, opts):
        """创建一个带自绘标题栏的子窗口。

        opts:
          url or html: str      入口（二选一）
          title: str            窗口标题
          width, height: int    初始尺寸
          min_size: (w,h)       最小尺寸（默认 (360,300)）
          brand: str            标题栏品牌名（默认 title）
          titlebar_height: int  标题栏高度（默认 36）
          use_bootstrap: bool   是否用 bootstrap 启动页（默认 True）
          bootstrap_msg: str    bootstrap 文案（默认 "加载中"）
          use_native_nav_cover: bool  是否启用原生导航 cover（默认 True）
          api_prefix: str       指定前缀（默认自动生成）

        返回 {"success": True, "api_prefix": ..., "reused": False}。
        """
        from .titlebar import build_titlebar_js, build_bootstrap_html, build_page_patch_js

        try:
            url = str(opts.get("url", "") or "")
            html = str(opts.get("html", "") or "")
            if not url and not html:
                return {"success": False, "message": "url or html required"}
            title = str(opts.get("title", "Child Window") or "Child Window")
            width = int(opts.get("width", 480) or 480)
            height = int(opts.get("height", 360) or 360)
            min_size = opts.get("min_size", (360, 300))
            brand = str(opts.get("brand", title) or title)
            tb_h = int(opts.get("titlebar_height", 36))
            use_bootstrap = bool(opts.get("use_bootstrap", True))
            bootstrap_msg = str(opts.get("bootstrap_msg", "加载中") or "加载中")
            use_native_nav_cover = bool(opts.get("use_native_nav_cover", True))
            prefix = str(opts.get("api_prefix", "") or "") or self._next_prefix()

            with self._window_lock:
                existing = self._windows.get(prefix)
            if existing and existing in webview.windows:
                try:
                    if hasattr(existing, "restore"):
                        existing.restore()
                except Exception:
                    pass
                try:
                    existing.show()
                except Exception:
                    pass
                try:
                    existing.bring_to_front()
                except Exception:
                    pass
                return {"success": True, "api_prefix": prefix, "reused": True}

            window_kwargs = {
                "title": title,
                "width": max(320, width),
                "height": max(240, height),
                "min_size": min_size,
                "resizable": True,
                "text_select": True,
                "js_api": self,
                "easy_drag": False,
                "background_color": "#050505",
            }

            entry_url = url
            if use_bootstrap and entry_url:
                bs_html = build_bootstrap_html({
                    "brand": brand,
                    "bootstrap_msg": bootstrap_msg,
                    "entry_url": entry_url,
                    "titlebar_height": tb_h,
                    "api_prefix": prefix,
                })
                window_kwargs["html"] = bs_html
                window_kwargs.pop("url", None)
            elif entry_url:
                window_kwargs["url"] = entry_url
            else:
                window_kwargs["html"] = html

            child = webview.create_window(**window_kwargs)

            self.bind(child, prefix)
            self._set_window_opts(prefix, {
                "titlebar_height": tb_h,
                "brand": brand,
                "api_prefix": prefix,
                "entry_url": entry_url,
                "use_bootstrap": use_bootstrap,
            })

            titlebar_js = build_titlebar_js({
                "titlebar_height": tb_h,
                "api_prefix": prefix,
                "brand": brand,
            })
            page_patch_js = build_page_patch_js({"titlebar_height": tb_h})

            shown_fired = [False]
            nav_started = [False]

            def _on_shown():
                if shown_fired[0]:
                    return
                shown_fired[0] = True
                try:
                    wintitle.install(child, emulate_snap=False)
                except Exception:
                    pass
                threading.Thread(
                    target=lambda: (time.sleep(0.06), wintitle.set_webview_dark_background(child, 5, 5, 5)),
                    daemon=True,
                ).start()
                if use_native_nav_cover:
                    threading.Thread(
                        target=lambda: wintitle.install_navigation_cover(child, top_offset=tb_h, r=5, g=5, b=5, hide_delay_ms=260),
                        daemon=True,
                    ).start()
                try:
                    wintitle.add_startup_script(child, titlebar_js)
                except Exception:
                    pass
                try:
                    wintitle.add_startup_script(child, page_patch_js)
                except Exception:
                    pass
                threading.Thread(
                    target=self._titlebar_keepalive_loop,
                    args=(child, titlebar_js, 2.0),
                    daemon=True,
                ).start()
                # bootstrap 模式：延迟 load_url 真实页
                if use_bootstrap and entry_url and not nav_started[0]:
                    nav_started[0] = True

                    def _navigate():
                        time.sleep(0.22)
                        try:
                            wintitle.force_frame_refresh(child)
                        except Exception:
                            pass
                        try:
                            wintitle.ensure_resizable_frame(child)
                        except Exception:
                            pass
                        try:
                            child.load_url(entry_url)
                        except Exception:
                            pass

                    threading.Thread(target=_navigate, daemon=True).start()

            def _on_loaded():
                try:
                    href = str(child.evaluate_js("location.href") or "")
                except Exception:
                    href = ""
                if use_native_nav_cover:
                    try:
                        if href and href != "about:blank":
                            wintitle.release_navigation_cover(child, hide=True)
                    except Exception:
                        pass
                # 注入标题栏 + page patch（真实页面）
                threading.Thread(
                    target=self._inject_titlebar_with_retry,
                    args=(child, titlebar_js, 12, 0.2),
                    daemon=True,
                ).start()
                threading.Thread(
                    target=self._inject_titlebar_with_retry,
                    args=(child, page_patch_js, 8, 0.2, "wvu-page-shell-style"),
                    daemon=True,
                ).start()
                threading.Thread(
                    target=lambda: (time.sleep(0.18), wintitle.force_frame_refresh(child)),
                    daemon=True,
                ).start()
                threading.Thread(
                    target=lambda: (time.sleep(0.24), wintitle.ensure_resizable_frame(child), wintitle.force_frame_refresh(child)),
                    daemon=True,
                ).start()
                threading.Thread(
                    target=lambda: (time.sleep(0.22), wintitle.enable_custom_chrome(child), wintitle.force_frame_refresh(child)),
                    daemon=True,
                ).start()
                # 首帧稳定 nudge
                def _stabilize():
                    time.sleep(0.20)
                    try:
                        wintitle.force_frame_refresh(child)
                    except Exception:
                        pass
                    time.sleep(0.10)
                    try:
                        wintitle.nudge_window_size(child)
                        wintitle.force_frame_refresh(child)
                    except Exception:
                        pass
                    try:
                        wintitle.sync_max_state(child)
                    except Exception:
                        pass

                threading.Thread(target=_stabilize, daemon=True).start()

            def _on_closed():
                with self._window_lock:
                    if self._windows.get(prefix) is child:
                        self._windows.pop(prefix, None)
                        self._window_opts.pop(prefix, None)

            child.events.shown += _on_shown
            child.events.loaded += _on_loaded
            child.events.closed += _on_closed
            # PyWebView 动态创建的窗口可能已 "shown"，手动触发一次。
            threading.Thread(target=_on_shown, daemon=True).start()
            return {"success": True, "api_prefix": prefix, "reused": False}
        except Exception as e:
            traceback.print_exc()
            return {"success": False, "message": str(e)}

    # ── keepalive / 注入重试 ─────────────────────────────────
    def _inject_titlebar_with_retry(self, win, js, max_attempts=40, delay_s=0.25, marker_id="wvu-titlebar"):
        import json as _json
        for _ in range(max_attempts):
            try:
                marker = _json.dumps(str(marker_id))
                ok = win.evaluate_js(
                    f"(function(){{try{{{js};return !!document.getElementById({marker});}}catch(e){{return false;}}}})();"
                )
                if str(ok).lower() in ("true", "1"):
                    return
            except Exception:
                pass
            time.sleep(delay_s)

    def _titlebar_keepalive_loop(self, win, titlebar_js, interval_s=2.0):
        """周期性自愈：防止慢网或页面切换后标题栏丢失。"""
        while not self._stop.is_set():
            self._inject_titlebar_with_retry(win, titlebar_js, max_attempts=1, delay_s=0)
            try:
                wintitle.sync_max_state(win)
            except Exception:
                pass
            time.sleep(interval_s)
