"""
app.py - WebViewApp 主类

封装 WebViewUI 主窗口装配流程：
  - custom 模式（自绘标题栏 + 原生边框，保留 Windows 原生 Aero snap 动画）
  - bootstrap 启动页（防白闪之二）
  - 三层防白闪：dark background + bootstrap shell + native navigation cover
  - 标题栏 JS 注入 + keepalive 自愈
  - 首帧稳定 nudge

用户只需：
    app = WebViewApp(entry_url=..., js_api=MyApi())
    app.run()
"""

import threading
import time
from pathlib import Path

import webview

from . import wintitle
from .config import config, get_app_root
from .titlebar import build_titlebar_js, build_bootstrap_html, build_page_patch_js
from .window_api import WindowApi


class WebViewApp:
    """WebViewUI 应用主入口。"""

    def __init__(
        self,
        entry_url,
        js_api=None,
        *,
        title="WebViewUI App",
        width=None,
        height=None,
        min_size=None,
        brand="WebViewUI",
        titlebar_height=36,
        use_bootstrap=None,
        use_native_nav_cover=None,
        devtools=None,
        storage_path=None,
        http_server=False,
    ):
        """
        entry_url: str          主窗口入口 URL（http 或本地文件路径）
        js_api: WindowApi        自定义 API 实例（默认 WindowApi()；子类可覆写业务方法）
        title: str               窗口标题
        width, height: int       初始尺寸（默认取 config）
        min_size: (w, h)         最小尺寸
        brand: str               标题栏品牌名
        titlebar_height: int     标题栏高度
        use_bootstrap: bool      是否用 bootstrap 启动页（默认 config）
        use_native_nav_cover: bool  是否启用原生导航 cover（默认 config）
        devtools: bool           是否启用 devtools（默认 config）
        storage_path: str        WebView2 持久化存储路径（默认 <root>/data/webview_storage）
        http_server: bool        entry_url 为本地路径时，是否启 HTTP 服务（默认 False，直接 file://）
        """
        self.entry_url = str(entry_url)
        self.title = title
        self.brand = brand
        self.titlebar_height = int(titlebar_height)
        self.width = int(width if width is not None else config.get("window_width", 960))
        self.height = int(height if height is not None else config.get("window_height", 700))
        self.min_size = min_size or (
            config.get("window_min_width", 900),
            config.get("window_min_height", 560),
        )
        self.use_bootstrap = bool(
            use_bootstrap if use_bootstrap is not None else config.get("use_bootstrap_shell", True)
        )
        self.use_native_nav_cover = bool(
            use_native_nav_cover if use_native_nav_cover is not None
            else config.get("native_navigation_cover", True)
        )
        self.devtools = bool(
            devtools if devtools is not None else config.get("devtools_enabled", False)
        )
        self.http_server = bool(http_server)

        if storage_path is None:
            storage_path = str(Path(get_app_root()) / "data" / "webview_storage")
        self.storage_path = str(storage_path)

        # js_api：默认 WindowApi，主窗口用空前缀
        if js_api is None:
            js_api = WindowApi()
        self.js_api = js_api

        self._win = None
        self._nav_started = threading.Event()
        self._first_layout_nudged = threading.Event()
        self._titlebar_js = build_titlebar_js({
            "titlebar_height": self.titlebar_height,
            "api_prefix": "",
            "brand": brand,
        })
        self._page_patch_js = build_page_patch_js({"titlebar_height": self.titlebar_height})
        self._bootstrap_msg = str(
            (config.get("message") or {}).get("bootstrap", "加载中") or "加载中"
        )

    def _resolve_entry(self):
        """返回 (url_or_html, is_url)。

        本地文件路径在 http_server=False 时转为 file:// URL；
        http_server=True 时由调用方自行启服务（本库不内置）。
        """
        entry = self.entry_url
        if entry.startswith(("http://", "https://", "file://", "data:")):
            return entry, True
        p = Path(entry)
        if p.exists() and p.is_file():
            # 本地 HTML 文件
            return p.resolve().as_uri(), True
        # 当作 URL 处理
        return entry, True

    def run(self):
        """创建主窗口并启动 webview 事件循环（阻塞）。"""
        devtools_enabled = self.devtools
        if devtools_enabled:
            try:
                devtools_port = int(config.get("devtools_port", 9222) or 9222)
            except Exception:
                devtools_port = 9222
            args = [f"--remote-debugging-port={devtools_port}"]
            if str(config.get("devtools_auto_open", False)).strip().lower() in {"1", "true", "on", "yes"}:
                args.append("--auto-open-devtools-for-tabs")
            for a in args:
                self._append_webview2_arg(a)
            print(f"[WebViewUI] devtools enabled, inspect: http://127.0.0.1:{devtools_port}")

        entry_url, is_url = self._resolve_entry()

        window_kwargs = {
            "title": self.title,
            "width": self.width,
            "height": self.height,
            "min_size": self.min_size,
            "resizable": True,
            "text_select": True,
            "js_api": self.js_api,
            "easy_drag": False,
            "background_color": "#050505",
        }

        if self.use_bootstrap and entry_url:
            bs_html = build_bootstrap_html({
                "brand": self.brand,
                "bootstrap_msg": self._bootstrap_msg,
                "entry_url": entry_url,
                "titlebar_height": self.titlebar_height,
                "api_prefix": "",
            })
            window_kwargs["html"] = bs_html
        elif entry_url:
            window_kwargs["url"] = entry_url
        else:
            window_kwargs["url"] = "about:blank"

        win = webview.create_window(**window_kwargs)

        self._win = win
        self.js_api.bind(win, api_prefix="")

        win.events.shown += self._on_shown
        win.events.loaded += self._on_loaded

        try:
            webview.start(
                debug=devtools_enabled,
                private_mode=False,
                storage_path=self.storage_path,
            )
        except TypeError:
            # 老版本 pywebview 不支持 storage_path
            webview.start(debug=devtools_enabled, private_mode=False)

    @staticmethod
    def _append_webview2_arg(arg):
        val = str(arg or "").strip()
        if not val:
            return
        import os
        raw = str(os.environ.get("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "") or "").strip()
        parts = [p for p in raw.split(" ") if p]
        if val in parts:
            return
        parts.append(val)
        os.environ["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = " ".join(parts)

    def _on_shown(self):
        win = self._win
        if win is None:
            return
        print("[WebViewUI] on_shown")
        try:
            wintitle.install(win, emulate_snap=False)
        except Exception as e:
            print(f"[WebViewUI] wintitle.install failed: {e}")
        threading.Thread(
            target=lambda: (time.sleep(0.06), wintitle.set_webview_dark_background(win, 5, 5, 5)),
            daemon=True,
        ).start()
        if self.use_native_nav_cover:
            threading.Thread(
                target=lambda: wintitle.install_navigation_cover(
                    win, top_offset=self.titlebar_height, r=5, g=5, b=5, hide_delay_ms=260
                ),
                daemon=True,
            ).start()
            print("[WebViewUI] native navigation cover enabled")

        # 持续重试 enable_custom_chrome，直到 web 标题栏就位
        def _apply_custom_chrome_retry():
            tb_h = self.titlebar_height
            for idx in range(140):
                web_bar_ready = False
                try:
                    ready_js = (
                        "(function(){"
                        "return !!(document.getElementById('wvu-boot-bar') || document.getElementById('wvu-titlebar'));"
                        "})();"
                    )
                    web_bar_ready = bool(win.evaluate_js(ready_js))
                except Exception:
                    web_bar_ready = False
                if not web_bar_ready and idx < 110:
                    time.sleep(0.03)
                    continue
                try:
                    if wintitle.enable_custom_chrome(win):
                        wintitle.force_frame_refresh(win)
                        if idx < 6:
                            time.sleep(0.04)
                            wintitle.force_frame_refresh(win)
                        return
                except Exception:
                    pass
                time.sleep(0.03)

        threading.Thread(target=_apply_custom_chrome_retry, daemon=True).start()

        # 注入标题栏 + page patch 作为 startup script
        try:
            wintitle.add_startup_script(win, self._titlebar_js)
        except Exception:
            pass
        try:
            wintitle.add_startup_script(win, self._page_patch_js)
        except Exception:
            pass

        # keepalive 自愈
        threading.Thread(
            target=self.js_api._titlebar_keepalive_loop,
            args=(win, self._titlebar_js, 1.2),
            daemon=True,
        ).start()

        # bootstrap 模式：延迟 load_url 真实页
        if self.use_bootstrap and not self._nav_started.is_set():
            entry_url, _ = self._resolve_entry()

            def _navigate_to_real():
                time.sleep(0.22)
                if self._nav_started.is_set():
                    return
                self._nav_started.set()
                try:
                    wintitle.force_frame_refresh(win)
                except Exception:
                    pass
                try:
                    wintitle.ensure_resizable_frame(win)
                except Exception:
                    pass
                try:
                    wintitle.nudge_window_size(win)
                except Exception:
                    pass
                try:
                    wintitle.force_frame_refresh(win)
                except Exception:
                    pass
                try:
                    win.load_url(entry_url)
                except Exception as e:
                    print(f"[WebViewUI] load_url failed: {e}")

            threading.Thread(target=_navigate_to_real, daemon=True).start()

    def _on_loaded(self):
        win = self._win
        if win is None:
            return
        try:
            href = str(win.evaluate_js("location.href") or "")
        except Exception:
            href = ""
        print(f"[WebViewUI] on_loaded href={href}")

        if self.use_native_nav_cover:
            try:
                if href and href != "about:blank":
                    wintitle.release_navigation_cover(win, hide=True)
                else:
                    wintitle.release_navigation_cover(win, hide=False)
            except Exception:
                pass

        # 注入标题栏 + page patch（真实页面）
        threading.Thread(
            target=self.js_api._inject_titlebar_with_retry,
            args=(win, self._titlebar_js, 15, 0.2),
            daemon=True,
        ).start()
        threading.Thread(
            target=self.js_api._inject_titlebar_with_retry,
            args=(win, self._page_patch_js, 8, 0.2, "wvu-page-shell-style"),
            daemon=True,
        ).start()
        threading.Thread(
            target=lambda: (time.sleep(0.18), wintitle.force_frame_refresh(win)),
            daemon=True,
        ).start()
        threading.Thread(
            target=lambda: (time.sleep(0.24), wintitle.ensure_resizable_frame(win), wintitle.force_frame_refresh(win)),
            daemon=True,
        ).start()
        threading.Thread(
            target=lambda: (time.sleep(0.22), wintitle.enable_custom_chrome(win), wintitle.force_frame_refresh(win)),
            daemon=True,
        ).start()

        # 首帧稳定 nudge
        if not self._first_layout_nudged.is_set():
            self._first_layout_nudged.set()

            def _stabilize():
                time.sleep(0.20)
                try:
                    wintitle.force_frame_refresh(win)
                except Exception:
                    pass
                time.sleep(0.10)
                try:
                    wintitle.nudge_window_size(win)
                    wintitle.force_frame_refresh(win)
                except Exception:
                    pass
                time.sleep(0.12)
                try:
                    wintitle.nudge_window_size(win)
                    wintitle.force_frame_refresh(win)
                    wintitle.sync_max_state(win)
                except Exception:
                    pass

            threading.Thread(target=_stabilize, daemon=True).start()

    def create_child(self, opts):
        """便捷方法：委托 js_api.create_child_window 创建子窗口。"""
        return self.js_api.create_child_window(opts)
