"""
WebViewUI - 可复用的 PyWebView 窗口 UI 架构

提供：
  - custom 模式窗口（自绘标题栏 + 原生边框，保留 Windows Aero snap 动画）
  - 三层防白闪（dark background / bootstrap shell / native navigation cover）
  - 标题栏 JS 由 Python 注入（按钮/拖拽/双击最大化/边缘 resize）
  - 多窗口组件（WindowApi.create_child_window）
  - 配置持久化

快速开始：
    from WebViewUI import WebViewApp, WindowApi

    class MyApi(WindowApi):
        def greet(self):
            return {"msg": "Hello!"}

    WebViewApp(entry_url="ui/index.html", js_api=MyApi(), brand="MyApp").run()
"""

from .config import config, Config, get_app_root
from .window_api import WindowApi
from .app import WebViewApp
from .titlebar import build_titlebar_js, build_bootstrap_html, build_page_patch_js
from . import wintitle

__all__ = [
    "WebViewApp",
    "WindowApi",
    "Config",
    "config",
    "get_app_root",
    "build_titlebar_js",
    "build_bootstrap_html",
    "build_page_patch_js",
    "wintitle",
]

__version__ = "0.1.0"
