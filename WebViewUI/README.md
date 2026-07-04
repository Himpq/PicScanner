# WebViewUI 使用文档

`WebViewUI` 是 PicScanner 当前使用的 PyWebView 窗口 UI 层。它负责创建桌面窗口、注入自绘标题栏、提供窗口控制 API，并把 Python 后端对象暴露给前端 `window.pywebview.api`。

本文档按 PicScanner 的实际接入方式整理，适合后续在本项目内维护，也适合把 `WebViewUI` 复制到其他本地 WebView 应用中复用。

## 目录结构

```text
WebViewUI/
  __init__.py       对外导出 WebViewApp、WindowApi、config 等入口
  app.py            WebViewApp 主窗口装配流程
  window_api.py     暴露给 JS 的窗口控制 API 基类
  titlebar.py       标题栏 JS、启动页 HTML、页面补丁 JS 构建器
  wintitle.py       Windows 原生窗口行为层
  config.py         WebViewUI 框架配置读写
  requirements.txt  WebViewUI 依赖
```

PicScanner 对 `WebViewUI` 的实际使用位置：

```text
main.py                  项目根入口，只调用 app.main.main()
app/main.py              创建 WebViewApp 并启动窗口
app/backend/api.py       PicScannerApi 继承 WindowApi，暴露业务 API
app/ui/index.html        前端入口 HTML
app/ui/assets/app.js     通过 window.pywebview.api 调用 Python API
app/ui/assets/style.css  为自绘标题栏预留布局高度
```

## 最小接入方式

PicScanner 在 `app/main.py` 中这样启动主窗口：

```python
from pathlib import Path

from WebViewUI import WebViewApp
from app.backend.api import PicScannerApi

PROJECT_ROOT = Path(__file__).resolve().parent.parent
APP_ROOT = PROJECT_ROOT / "app"


def main():
    entry = APP_ROOT / "ui" / "index.html"
    app = WebViewApp(
        entry_url=str(entry),
        js_api=PicScannerApi(),
        title="PicScanner",
        width=1280,
        height=820,
        min_size=(1040, 680),
        brand="PicScanner",
        titlebar_height=36,
        use_bootstrap=False,
        use_native_nav_cover=False,
    )
    app.run()
```

关键点：

- `entry_url` 可以是本地 HTML 文件路径，也可以是 `http://`、`https://`、`file://`、`data:` URL。
- `js_api` 传入 `WindowApi` 的子类实例。PicScanner 使用 `PicScannerApi()`。
- `brand` 会显示在 WebViewUI 注入的自绘标题栏左侧。
- `titlebar_height` 控制标题栏高度。PicScanner 当前使用 `36`。
- `app.run()` 会创建窗口并进入 PyWebView 事件循环，是阻塞调用。

项目根入口 `main.py` 只负责转发：

```python
from app.main import main


if __name__ == "__main__":
    main()
```

## 后端 API 写法

业务 API 需要继承 `WindowApi`：

```python
from WebViewUI import WindowApi


class PicScannerApi(WindowApi):
    def __init__(self):
        super().__init__()

    def get_startup_state(self):
        return {"success": True}
```

继承 `WindowApi` 的原因：

- `WindowApi` 已经提供最小化、最大化、关闭、拖动、边缘缩放等窗口控制方法。
- `WebViewApp` 会把同一个 `js_api` 绑定到主窗口。
- 自绘标题栏通过 `webview_window_action(action, api_prefix, payload)` 调用窗口控制。
- 业务方法会和窗口控制方法一起暴露给 `window.pywebview.api`。

PicScanner 的业务方法示例：

```text
get_sources()
choose_folder()
start_scan(root_path, limit=10)
scan_all(root_path)
stop_scan()
start_exif(root_path, source_id=None)
get_scan_state(root_path=None, source_id=None)
get_startup_state()
list_dates(...)
list_photos(...)
get_photo_preview(photo_id)
get_photo_lightbox_preview(photo_id)
set_item_mark(...)
start_photo_drag(photo_id)
```

前端可以直接按方法名调用这些 Python 方法。

## 前端调用方式

PicScanner 在 `app/ui/assets/app.js` 中封装了统一调用函数：

```javascript
function api() {
  return (window.pywebview && window.pywebview.api) ? window.pywebview.api : null;
}

function call(name, ...args) {
  const a = api();
  if (!a || !a[name]) {
    return Promise.reject(new Error('pywebview bridge not ready: ' + name));
  }
  return a[name](...args);
}
```

启动时等待 `pywebviewready`：

```javascript
window.addEventListener('pywebviewready', startApp);
```

调用示例：

```javascript
call('get_startup_state').then((data) => {
  // 使用后端返回数据初始化页面
});

call('start_scan', state.currentRootPath, 10).then((res) => {
  // 根据扫描启动结果更新 UI
});
```

约定：

- Python 方法返回值应优先使用可 JSON 序列化的数据，例如 `dict`、`list`、`str`、`int`、`bool`、`None`。
- 前端调用返回 `Promise`。
- 前端应在 `pywebviewready` 之后调用后端 API。
- 不要在前端手写窗口按钮逻辑；标题栏按钮由 WebViewUI 注入并自动连接到 `WindowApi`。

## 主窗口生命周期

`WebViewApp.run()` 的主流程：

1. 读取调试配置，必要时设置 WebView2 启动参数。
2. 调用 `_resolve_entry()` 把本地 HTML 路径转换为 `file://` URL。
3. 调用 `webview.create_window(...)` 创建 PyWebView 窗口。
4. 调用 `self.js_api.bind(win, api_prefix="")` 绑定主窗口。
5. 注册 `win.events.shown += self._on_shown`。
6. 注册 `win.events.loaded += self._on_loaded`。
7. 调用 `webview.start(...)` 启动事件循环。

`_on_shown()` 负责窗口出现后的原生层初始化：

- 调用 `wintitle.install(win, emulate_snap=False)` 安装 Windows 原生行为。
- 设置 WebView 深色背景，减少首帧白屏。
- 按配置安装原生导航遮罩。
- 注入标题栏脚本和页面布局补丁作为 startup script。
- 启动标题栏 keepalive 线程。
- bootstrap 模式下延迟跳转到真实页面。

`_on_loaded()` 负责页面加载后的补充注入：

- 读取当前 `location.href` 便于日志定位。
- 页面加载完成后释放原生导航遮罩。
- 再次注入标题栏脚本和页面布局补丁。
- 刷新原生边框并同步最大化状态。
- 对首帧做尺寸 nudge，稳定布局。

## 标题栏与页面布局

WebViewUI 的标题栏不是写在业务 HTML 里的，而是由 Python 注入 JS 创建：

```python
build_titlebar_js({
    "titlebar_height": self.titlebar_height,
    "api_prefix": "",
    "brand": brand,
})
```

标题栏包含：

- 品牌文字
- 最小化按钮
- 最大化/还原按钮
- 关闭按钮
- 拖动区域
- 边缘 resize 热区

窗口按钮统一调用：

```javascript
window.pywebview.api.webview_window_action(action, API_PREFIX, payload || {})
```

页面布局补丁由 `build_page_patch_js()` 注入，会给真实页面补充标题栏高度相关样式。PicScanner 自己的 CSS 还使用了：

```css
:root {
  --titlebar-h: var(--nc-titlebar-h, 36px);
}
```

PicScanner 许多固定定位区域依赖 `--titlebar-h`，例如首页、工作区、设置页、统计页等。如果修改 `titlebar_height`，需要同步检查业务 CSS 中与标题栏高度相关的变量和 `calc(...)`。

## bootstrap 启动页

`WebViewApp` 支持 bootstrap 启动页：

```python
WebViewApp(
    entry_url="app/ui/index.html",
    js_api=MyApi(),
    use_bootstrap=True,
)
```

bootstrap 启动页由 `build_bootstrap_html()` 生成，它只做通用窗口壳：

- 深色背景
- 标题栏
- 加载文案
- 最小化/最大化/关闭按钮

PicScanner 当前设置：

```python
use_bootstrap=False
```

原因是 PicScanner 的真实页面本身已经是本地文件，启动体验由业务页面负责。

## 原生导航遮罩

`use_native_nav_cover` 控制是否启用 Windows 原生导航遮罩：

```python
WebViewApp(
    ...,
    use_native_nav_cover=True,
)
```

遮罩由 `wintitle.install_navigation_cover()` 安装，用于减少 WebView 页面跳转过程中的白闪。PicScanner 当前设置：

```python
use_native_nav_cover=False
```

如果应用要加载远程页面、频繁导航或首屏资源较重，可以开启它，并观察 `_on_shown()`、`_on_loaded()` 中的日志。

## 调试开关

`WebViewApp` 支持通过参数或配置启用 DevTools：

```python
WebViewApp(
    entry_url="app/ui/index.html",
    js_api=MyApi(),
    devtools=True,
)
```

启用后会设置 WebView2 参数：

```text
--remote-debugging-port=<devtools_port>
--auto-open-devtools-for-tabs
```

对应配置在 `data/config.json`，默认值来自 `WebViewUI/config.py`：

```json
{
  "devtools_enabled": false,
  "devtools_auto_open": false,
  "devtools_port": 9222
}
```

运行时日志会输出：

```text
[WebViewUI] devtools enabled, inspect: http://127.0.0.1:9222
```

## 配置文件

`WebViewUI/config.py` 会在项目根目录下创建：

```text
data/config.json
```

默认配置包括：

```text
window_width
window_height
window_min_width
window_min_height
native_navigation_cover
use_bootstrap_shell
devtools_enabled
devtools_auto_open
devtools_port
message.bootstrap
app_id
```

使用方式：

```python
from WebViewUI import config

width = config.get("window_width", 960)
config.set("devtools_enabled", True)
snapshot = config.snapshot()
```

注意：

- `Config` 只管理 WebViewUI 框架配置。
- 业务配置、扫描历史、文件权限、照片数据等应放在业务模块中维护。
- `app_id` 首次运行自动生成并持久化。

## 多窗口

`WindowApi.create_child_window(opts)` 可以创建带自绘标题栏的子窗口。所有窗口共享同一个 `js_api` 实例，每个窗口用 `api_prefix` 区分。

示例：

```python
class MyApi(WindowApi):
    def open_help_window(self):
        return self.create_child_window({
            "url": Path("app/ui/help.html").resolve().as_uri(),
            "title": "Help",
            "width": 720,
            "height": 520,
            "min_size": (520, 360),
            "brand": "Help",
            "titlebar_height": 36,
            "api_prefix": "help_",
            "use_bootstrap": True,
            "bootstrap_msg": "加载中",
        })
```

`opts` 支持字段：

```text
url 或 html              子窗口入口，二选一
title                   窗口标题
width, height            初始尺寸
min_size                 最小尺寸
brand                    标题栏品牌
titlebar_height          标题栏高度
use_bootstrap            是否使用启动页
bootstrap_msg            启动页文案
use_native_nav_cover     是否启用原生导航遮罩
api_prefix               子窗口 API 前缀
```

返回值：

```python
{"success": True, "api_prefix": "help_", "reused": False}
```

如果相同 `api_prefix` 的窗口已经存在，会激活已有窗口并返回：

```python
{"success": True, "api_prefix": "help_", "reused": True}
```

## WindowApi 提供的窗口动作

`WindowApi.webview_window_action(action, api_prefix="", payload=None)` 是标题栏统一入口。

支持动作：

```text
minimize_window
maximize_window
close_window
start_window_drag
start_window_resize
is_window_maximized
sync_window_state
titlebar_double_click
```

主窗口也暴露了同名便捷方法：

```python
minimize_window()
maximize_window()
close_window()
start_window_drag()
start_window_resize(edge="right")
is_window_maximized()
sync_window_state()
titlebar_double_click()
```

前端业务代码通常不需要直接调用这些方法，因为标题栏注入脚本已经处理了按钮、拖动、双击和边缘缩放。

## Windows 原生行为层

`wintitle.py` 是 Windows 专用层，非 Windows 平台相关函数为空操作。

它负责：

- 安装 custom chrome 行为。
- 保留 Windows 原生拖动、缩放、最大化动画和 Aero snap。
- 同步最大化状态到标题栏按钮。
- 设置 WebView2 深色背景。
- 安装和释放导航遮罩。
- 刷新窗口边框，稳定首帧布局。

业务代码通常不直接调用 `wintitle.py`。需要扩展窗口行为时，优先在 `WindowApi` 或 `WebViewApp` 层加清晰的公开方法。

## PicScanner 接入流程总结

```text
python main.py
  -> app.main.main()
  -> 创建 PicScannerApi()
  -> 创建 WebViewApp(entry_url=app/ui/index.html, js_api=PicScannerApi())
  -> WebViewApp.run()
  -> webview.create_window(js_api=PicScannerApi)
  -> WindowApi.bind(win, api_prefix="")
  -> webview.start()
  -> 窗口 shown: 安装原生行为、注入标题栏、启动 keepalive
  -> 页面 loaded: 再次注入标题栏和页面补丁、刷新窗口状态
  -> 前端 pywebviewready
  -> app.js 通过 call(name, ...args) 调用 PicScannerApi 方法
```

## 扩展检查清单

新增或修改 WebViewUI 接入时，按下面顺序检查：

1. 后端 API 类是否继承 `WindowApi`，并在 `__init__()` 中调用 `super().__init__()`。
2. `WebViewApp(..., js_api=...)` 是否传入同一个 API 实例。
3. 本地 HTML 路径是否能被 `_resolve_entry()` 解析成有效 URL。
4. 前端是否等待 `pywebviewready` 后再调用 `window.pywebview.api`。
5. Python 返回值是否能被 PyWebView 序列化。
6. 页面固定定位区域是否正确避开标题栏高度。
7. 改动 `titlebar_height` 后，业务 CSS 是否同步检查。
8. 需要调试时是否打开 `devtools=True` 或配置 `devtools_enabled`。
9. 多窗口是否使用稳定且唯一的 `api_prefix`。
10. 需要定位窗口注入问题时，优先查看 `[WebViewUI] on_shown`、`[WebViewUI] on_loaded href=...`、`load_url failed` 等日志。

