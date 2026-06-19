"""
wintitle.py - Windows frameless/custom-chrome window native behaviour

WebViewUI 的 Windows 自绘标题栏原生行为层，仅保留 custom 模式路径：
  install(win)              - subclass WndProc for resize edges + WM_SIZE notify
  enable_custom_chrome(win) - hide native caption via WM_NCCALCSIZE, keep WS_THICKFRAME
  toggle_max_restore(win)   - native ShowWindow maximize / restore toggle
  start_window_drag(win)    - ReleaseCapture + SendMessage(NCLBUTTONDOWN) on UI thread
  start_window_resize(win)  - native SC_SIZE syscommand for edge resize
  minimize_window(win)
  snap_window(win, mode)
  sync_max_state(win)       - push current max-state to injected titlebar JS
  is_window_maximized(win)
  set_window_topmost(win)
  add_startup_script(win, script)
  set_webview_dark_background(win)         - 防白闪之一：WebView2 底色
  install_navigation_cover(win)            - 防白闪之二：WinForms overlay
  release_navigation_cover(win)
  force_frame_refresh(win)
  ensure_resizable_frame(win)
  nudge_window_size(win)

非 Windows 平台全部 no-op。
"""

import sys
import threading
import time
import os

__all__ = [
    "install",
    "enable_custom_chrome",
    "force_frame_refresh",
    "minimize_window",
    "toggle_max_restore",
    "start_window_drag",
    "sync_max_state",
    "is_window_maximized",
    "add_startup_script",
    "snap_window",
    "set_window_topmost",
    "ensure_resizable_frame",
    "start_window_resize",
    "titlebar_double_click",
    "nudge_window_size",
    "set_webview_dark_background",
    "install_navigation_cover",
    "release_navigation_cover",
]


if sys.platform != "win32":
    # 非 Windows 平台：全部 no-op，custom 模式的标题栏仍由 JS 注入渲染，
    # 但原生拖拽/贴边/最大化不可用。
    def install(win, emulate_snap=False):
        pass

    def enable_custom_chrome(win):
        return False

    def force_frame_refresh(win):
        return False

    def minimize_window(win):
        return False

    def toggle_max_restore(win):
        return False

    def start_window_drag(win):
        return False

    def sync_max_state(win):
        return False

    def is_window_maximized(win):
        return False

    def add_startup_script(win, script):
        return False

    def snap_window(win, mode="max", screen_x=None, screen_y=None):
        return False

    def set_window_topmost(win, enabled=True):
        return False

    def ensure_resizable_frame(win):
        return False

    def start_window_resize(win, edge="right"):
        return False

    def titlebar_double_click(win):
        return False

    def nudge_window_size(win):
        return False

    def set_webview_dark_background(win, r=5, g=5, b=5):
        return False

    def install_navigation_cover(win, top_offset=36, r=5, g=5, b=5, hide_delay_ms=220):
        return False

    def release_navigation_cover(win, hide=True):
        return False
else:
    # ===== Windows 实现 =====
    import ctypes
    import ctypes.wintypes as wt
    from ctypes import WINFUNCTYPE, windll

    # Win32 constants
    WM_SIZE = 0x0005
    WM_NCCALCSIZE = 0x0083
    WM_NCHITTEST = 0x0084
    WM_GETMINMAXINFO = 0x0024
    WM_SYSCOMMAND = 0x0112
    WM_NCLBUTTONDOWN = 0x00A1
    WM_NCLBUTTONDBLCLK = 0x00A3
    WM_EXITSIZEMOVE = 0x0232

    HTCLIENT = 1
    HTCAPTION = 2
    HTLEFT, HTRIGHT = 10, 11
    HTTOP, HTTOPLEFT, HTTOPRIGHT = 12, 13, 14
    HTBOTTOM, HTBOTTOMLEFT, HTBOTTOMRIGHT = 15, 16, 17
    _RESIZE_HITS = {
        HTLEFT, HTRIGHT, HTTOP, HTTOPLEFT, HTTOPRIGHT,
        HTBOTTOM, HTBOTTOMLEFT, HTBOTTOMRIGHT,
    }

    GWLP_WNDPROC = -4
    GWL_STYLE = -16

    SW_SHOWMAXIMIZED = 3
    SC_MINIMIZE = 0xF020
    SC_MAXIMIZE = 0xF030
    SC_RESTORE = 0xF120
    SC_SIZE = 0xF000

    MONITOR_DEFAULTTONEAREST = 2
    SWP_NOSIZE = 0x0001
    SWP_NOMOVE = 0x0002
    SWP_NOZORDER = 0x0004
    SWP_NOACTIVATE = 0x0010
    SWP_FRAMECHANGED = 0x0020
    HWND_TOPMOST = wt.HWND(-1)
    HWND_NOTOPMOST = wt.HWND(-2)

    WS_CAPTION = 0x00C00000
    WS_THICKFRAME = 0x00040000
    WS_BORDER = 0x00800000
    WS_MINIMIZEBOX = 0x00020000
    WS_MAXIMIZEBOX = 0x00010000
    WS_SYSMENU = 0x00080000
    WS_SIZEBOX = 0x00040000

    SM_CXFRAME = 32
    SM_CYFRAME = 33
    SM_CXPADDEDBORDER = 92

    TITLEBAR_H = 36
    BTN_AREA_W = 140  # 3 buttons * 46px
    SNAP_EDGE_THRESHOLD = 14
    HITTEST_EDGE_BAND = 10
    HITTEST_CORNER_BAND = 14

    _WndProcType = WINFUNCTYPE(ctypes.c_ssize_t, wt.HWND, wt.UINT, wt.WPARAM, wt.LPARAM)

    _STATE = {}        # hwnd -> {"proc": wndproc_closure, "old": old_wndproc, "emulate_snap": bool}
    _WIN_HWND = {}     # id(win) -> hwnd
    _CUSTOM_CHROME = set()
    _CHILD_STATE = {}  # child_hwnd -> {"proc": ..., "old": ..., "parent": top_hwnd}
    _NAV_COVER_STATE = {}  # id(win) -> strong refs for native navigation cover

    class MONITORINFO(ctypes.Structure):
        _fields_ = [
            ("cbSize", wt.DWORD),
            ("rcMonitor", wt.RECT),
            ("rcWork", wt.RECT),
            ("dwFlags", wt.DWORD),
        ]

    class NCCALCSIZE_PARAMS(ctypes.Structure):
        _fields_ = [
            ("rgrc", wt.RECT * 3),
            ("lppos", ctypes.c_void_p),
        ]

    class MINMAXINFO(ctypes.Structure):
        _fields_ = [
            ("ptReserved", wt.POINT),
            ("ptMaxSize", wt.POINT),
            ("ptMaxPosition", wt.POINT),
            ("ptMinTrackSize", wt.POINT),
            ("ptMaxTrackSize", wt.POINT),
        ]

    class WINDOWPLACEMENT(ctypes.Structure):
        _fields_ = [
            ("length", wt.UINT),
            ("flags", wt.UINT),
            ("showCmd", wt.UINT),
            ("ptMinPosition", wt.POINT),
            ("ptMaxPosition", wt.POINT),
            ("rcNormalPosition", wt.RECT),
        ]

    # Win32 API declarations
    _GetWindowLongPtrW = windll.user32.GetWindowLongPtrW
    _GetWindowLongPtrW.restype = ctypes.c_ssize_t
    _GetWindowLongPtrW.argtypes = [wt.HWND, ctypes.c_int]

    _SetWindowLongPtrW = windll.user32.SetWindowLongPtrW
    _SetWindowLongPtrW.restype = ctypes.c_ssize_t
    _SetWindowLongPtrW.argtypes = [wt.HWND, ctypes.c_int, ctypes.c_ssize_t]

    _CallWindowProcW = windll.user32.CallWindowProcW
    _CallWindowProcW.restype = ctypes.c_ssize_t
    _CallWindowProcW.argtypes = [ctypes.c_ssize_t, wt.HWND, wt.UINT, wt.WPARAM, wt.LPARAM]

    _IsWindow = windll.user32.IsWindow
    _IsWindow.restype = wt.BOOL
    _IsWindow.argtypes = [wt.HWND]

    _ReleaseCapture = windll.user32.ReleaseCapture
    _ReleaseCapture.restype = wt.BOOL
    _ReleaseCapture.argtypes = []

    _SendMessageW = windll.user32.SendMessageW
    _SendMessageW.restype = ctypes.c_ssize_t
    _SendMessageW.argtypes = [wt.HWND, wt.UINT, wt.WPARAM, wt.LPARAM]

    _PostMessageW = windll.user32.PostMessageW
    _PostMessageW.restype = wt.BOOL
    _PostMessageW.argtypes = [wt.HWND, wt.UINT, wt.WPARAM, wt.LPARAM]

    _IsZoomed = windll.user32.IsZoomed
    _IsZoomed.restype = wt.BOOL
    _IsZoomed.argtypes = [wt.HWND]

    _GetWindowRect = windll.user32.GetWindowRect
    _GetWindowRect.restype = wt.BOOL
    _GetWindowRect.argtypes = [wt.HWND, ctypes.POINTER(wt.RECT)]

    _GetWindowPlacement = windll.user32.GetWindowPlacement
    _GetWindowPlacement.restype = wt.BOOL
    _GetWindowPlacement.argtypes = [wt.HWND, ctypes.POINTER(WINDOWPLACEMENT)]

    _MonitorFromWindow = windll.user32.MonitorFromWindow
    _MonitorFromWindow.restype = wt.HMONITOR
    _MonitorFromWindow.argtypes = [wt.HWND, wt.DWORD]

    _GetMonitorInfoW = windll.user32.GetMonitorInfoW
    _GetMonitorInfoW.restype = wt.BOOL
    _GetMonitorInfoW.argtypes = [wt.HMONITOR, ctypes.POINTER(MONITORINFO)]

    _SetWindowPos = windll.user32.SetWindowPos
    _SetWindowPos.restype = wt.BOOL
    _SetWindowPos.argtypes = [wt.HWND, wt.HWND, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, wt.UINT]

    _SetForegroundWindow = windll.user32.SetForegroundWindow
    _SetForegroundWindow.restype = wt.BOOL
    _SetForegroundWindow.argtypes = [wt.HWND]

    _GetCursorPos = windll.user32.GetCursorPos
    _GetCursorPos.restype = wt.BOOL
    _GetCursorPos.argtypes = [ctypes.POINTER(wt.POINT)]

    _GetAncestor = windll.user32.GetAncestor
    _GetAncestor.restype = wt.HWND
    _GetAncestor.argtypes = [wt.HWND, wt.UINT]

    _GetClassNameW = windll.user32.GetClassNameW
    _GetClassNameW.restype = ctypes.c_int
    _GetClassNameW.argtypes = [wt.HWND, wt.LPWSTR, ctypes.c_int]

    _EnumChildWindows = windll.user32.EnumChildWindows
    _EnumChildWindows.restype = wt.BOOL
    _EnumChildWindows.argtypes = [wt.HWND, ctypes.c_void_p, wt.LPARAM]

    GA_ROOT = 2

    _GetSystemMetrics = windll.user32.GetSystemMetrics
    _GetSystemMetrics.restype = ctypes.c_int
    _GetSystemMetrics.argtypes = [ctypes.c_int]

    try:
        _DwmSetWindowAttribute = windll.dwmapi.DwmSetWindowAttribute
        _DwmSetWindowAttribute.restype = wt.HRESULT
        _DwmSetWindowAttribute.argtypes = [wt.HWND, wt.DWORD, wt.LPCVOID, wt.DWORD]
    except Exception:
        _DwmSetWindowAttribute = None

    DWMWA_BORDER_COLOR = 34
    DWMWA_CAPTION_COLOR = 35
    DWMWA_USE_IMMERSIVE_DARK_MODE = 20
    DWM_COLOR_NONE = 0xFFFFFFFE

    def _signed_lo(v):
        v = v & 0xFFFF
        return v - 0x10000 if v >= 0x8000 else v

    def _signed_hi(v):
        v = (v >> 16) & 0xFFFF
        return v - 0x10000 if v >= 0x8000 else v

    def _rect_tuple(rc):
        try:
            return (int(rc.left), int(rc.top), int(rc.right), int(rc.bottom),
                    int(rc.right - rc.left), int(rc.bottom - rc.top))
        except Exception:
            return None

    def _get_rect(hwnd):
        r = wt.RECT()
        _GetWindowRect(hwnd, ctypes.byref(r))
        return r

    def _get_root_hwnd(hwnd):
        try:
            if not hwnd:
                return hwnd
            root = _GetAncestor(wt.HWND(hwnd), GA_ROOT)
            return int(root) if root else int(hwnd)
        except Exception:
            return int(hwnd) if hwnd else hwnd

    def _hwnd_class(hwnd):
        try:
            if not hwnd:
                return ""
            buf = ctypes.create_unicode_buffer(256)
            n = int(_GetClassNameW(wt.HWND(hwnd), buf, 255) or 0)
            return str(buf.value[:n] if n > 0 else buf.value)
        except Exception:
            return ""

    def _enum_child_hwnds(parent_hwnd):
        result = []

        @WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
        def _cb(h, _lp):
            try:
                result.append(int(h))
            except Exception:
                pass
            return True

        try:
            _EnumChildWindows(wt.HWND(parent_hwnd), _cb, 0)
        except Exception:
            pass
        return result

    def _looks_like_webview_child(hwnd):
        cls = (_hwnd_class(hwnd) or "").lower()
        return bool(cls)

    def _get_int_handle(obj):
        try:
            h = getattr(obj, "Handle", None)
            if not h:
                return None
            return int(h.ToInt64())
        except Exception:
            return None

    def _dump_form_handles(win):
        try:
            import webview.platforms.winforms as _wf
            form = _wf.BrowserView.instances.get(win.uid)
            if not form:
                return []
            out = []
            fh = _get_int_handle(form)
            if fh:
                out.append(int(fh))
            browser = getattr(form, "browser", None)
            if browser is not None:
                bh = _get_int_handle(browser)
                if bh:
                    out.append(int(bh))
            try:
                wv = getattr(browser, "webview", None) if browser is not None else None
                if wv is not None:
                    wh = _get_int_handle(wv)
                    if wh:
                        out.append(int(wh))
            except Exception:
                pass
            return out
        except Exception:
            return []

    def _hit_test_for_top_window(hwnd, lp, allow_caption=True):
        mx, my = _signed_lo(lp), _signed_hi(lp)
        rc = _get_rect(hwnd)
        x, y = mx - rc.left, my - rc.top
        w, hh = rc.right - rc.left, rc.bottom - rc.top

        fx, fy = _frame_insets()
        top_band = max(int(HITTEST_EDGE_BAND), int(fy) + 2)
        side_band = max(int(HITTEST_EDGE_BAND), int(fx) + 1)
        bottom_band = max(int(HITTEST_EDGE_BAND), int(fy) + 1)
        corner_band = max(int(HITTEST_CORNER_BAND), top_band, side_band, bottom_band)

        max_for_hit = bool(_is_maximized(hwnd))

        hit = None
        if not max_for_hit:
            if x <= corner_band and y <= corner_band:
                hit = HTTOPLEFT
            elif x >= w - corner_band and y <= corner_band:
                hit = HTTOPRIGHT
            elif x <= corner_band and y >= hh - corner_band:
                hit = HTBOTTOMLEFT
            elif x >= w - corner_band and y >= hh - corner_band:
                hit = HTBOTTOMRIGHT
            elif x <= side_band:
                hit = HTLEFT
            elif x >= w - side_band:
                hit = HTRIGHT
            elif y <= top_band:
                hit = HTTOP
            elif y >= hh - bottom_band:
                hit = HTBOTTOM

        if hit is None and allow_caption and y >= top_band and y < TITLEBAR_H and x < (w - BTN_AREA_W):
            hit = HTCAPTION

        return hit

    def _make_child_wndproc(child_hwnd, parent_hwnd, old_ptr, _win):
        def _proc(h, msg, wp, lp):
            if msg == WM_NCHITTEST:
                hit = _hit_test_for_top_window(parent_hwnd, lp, allow_caption=True)
                if hit is not None:
                    return hit
                return _CallWindowProcW(old_ptr, h, msg, wp, lp)
            return _CallWindowProcW(old_ptr, h, msg, wp, lp)

        return _WndProcType(_proc)

    def _install_child_hit_test(win, parent_hwnd):
        try:
            children = _enum_child_hwnds(parent_hwnd)
            for h in _dump_form_handles(win):
                if h and h != int(parent_hwnd):
                    children.append(int(h))
            uniq = []
            seen = set()
            for ch in children:
                k = int(ch)
                if k in seen:
                    continue
                seen.add(k)
                uniq.append(k)
            children = uniq
            for ch in children:
                if ch in _CHILD_STATE:
                    continue
                if not _IsWindow(ch):
                    continue
                if not _looks_like_webview_child(ch):
                    continue
                old = _GetWindowLongPtrW(ch, GWLP_WNDPROC)
                if not old:
                    continue
                proc = _make_child_wndproc(ch, parent_hwnd, old, win)
                ptr = ctypes.cast(proc, ctypes.c_void_p).value
                _SetWindowLongPtrW(ch, GWLP_WNDPROC, ptr)
                _CHILD_STATE[ch] = {"proc": proc, "old": old, "parent": parent_hwnd}
        except Exception:
            pass

    def _retry_install_child_hit_test(win, parent_hwnd):
        def _worker():
            for _ in range(20):
                try:
                    _install_child_hit_test(win, parent_hwnd)
                except Exception:
                    pass
                time.sleep(0.2)
        threading.Thread(target=_worker, daemon=True).start()

    def _is_maximized(hwnd):
        try:
            if bool(_IsZoomed(hwnd)):
                return True
        except Exception:
            pass
        try:
            wp = WINDOWPLACEMENT()
            wp.length = ctypes.sizeof(WINDOWPLACEMENT)
            if bool(_GetWindowPlacement(hwnd, ctypes.byref(wp))) and int(wp.showCmd) == int(SW_SHOWMAXIMIZED):
                return True
        except Exception:
            pass
        return False

    def _notify_js(win, hwnd):
        m = _is_maximized(hwnd)
        try:
            win.evaluate_js(
                f"window._webviewUITitlebarSetMaximized&&window._webviewUITitlebarSetMaximized({'true' if m else 'false'});"
            )
        except Exception:
            pass

    def _get_monitor_info(hwnd):
        hmon = _MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST)
        if not hmon:
            return None
        mi = MONITORINFO()
        mi.cbSize = ctypes.sizeof(MONITORINFO)
        if not _GetMonitorInfoW(hmon, ctypes.byref(mi)):
            return None
        return mi

    def _get_monitor_work_area(hwnd):
        mi = _get_monitor_info(hwnd)
        if not mi:
            return None
        return mi.rcWork

    def _set_window_rect(hwnd, left, top, width, height):
        return bool(_SetWindowPos(
            hwnd, None, int(left), int(top), int(width), int(height),
            SWP_NOZORDER | SWP_NOACTIVATE,
        ))

    def _snap_left(hwnd):
        wa = _get_monitor_work_area(hwnd)
        if not wa:
            return False
        w = max(320, int((wa.right - wa.left) / 2))
        h = max(240, int(wa.bottom - wa.top))
        return _set_window_rect(hwnd, wa.left, wa.top, w, h)

    def _snap_right(hwnd):
        wa = _get_monitor_work_area(hwnd)
        if not wa:
            return False
        half = max(320, int((wa.right - wa.left) / 2))
        h = max(240, int(wa.bottom - wa.top))
        left = int(wa.right - half)
        return _set_window_rect(hwnd, left, wa.top, half, h)

    def _apply_snap_from_rect(win, hwnd):
        if bool(_IsZoomed(hwnd)):
            return False
        wa = _get_monitor_work_area(hwnd)
        if not wa:
            return False
        rc = _get_rect(hwnd)
        if rc.top <= wa.top + SNAP_EDGE_THRESHOLD:
            _syscommand_on_ui_thread(win, SC_MAXIMIZE)
            _notify_js(win, hwnd)
            return True
        if rc.left <= wa.left + SNAP_EDGE_THRESHOLD:
            ok = _snap_left(hwnd)
            _notify_js(win, hwnd)
            return ok
        if rc.right >= wa.right - SNAP_EDGE_THRESHOLD:
            ok = _snap_right(hwnd)
            _notify_js(win, hwnd)
            return ok
        return False

    def _find_hwnd(win):
        try:
            import webview.platforms.winforms as _wf
            form = _wf.BrowserView.instances.get(win.uid)
            if form and form.Handle:
                h = int(form.Handle.ToInt64())
                return _get_root_hwnd(h)
        except Exception:
            pass
        fw = windll.user32.FindWindowW
        fw.restype = wt.HWND
        h = fw(None, win.title)
        if h:
            return _get_root_hwnd(h)
        result = []

        @WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
        def _cb(h_, _):
            buf = ctypes.create_unicode_buffer(512)
            windll.user32.GetWindowTextW(h_, buf, 512)
            if buf.value == win.title:
                result.append(h_)
            return True

        windll.user32.EnumWindows(_cb, 0)
        return _get_root_hwnd(result[0]) if result else None

    def _resolve(win):
        c = _WIN_HWND.get(id(win))
        if c and _IsWindow(c):
            return c
        h = _find_hwnd(win)
        if h:
            _WIN_HWND[id(win)] = h
        return h

    def _emulate_snap_enabled(hwnd):
        st = _STATE.get(hwnd)
        if isinstance(st, dict):
            return bool(st.get("emulate_snap", True))
        return True

    def _custom_chrome_enabled(hwnd):
        return hwnd in _CUSTOM_CHROME

    def _frame_insets():
        fx = int(_GetSystemMetrics(SM_CXFRAME) or 0)
        fy = int(_GetSystemMetrics(SM_CYFRAME) or 0)
        pad = int(_GetSystemMetrics(SM_CXPADDEDBORDER) or 0)
        return max(0, fx + pad), max(0, fy + pad)

    def _syscommand_on_ui_thread(win, command):
        hwnd = _resolve(win)
        if not hwnd:
            return False
        cmd = int(command)
        t0 = time.perf_counter()

        def _cursor_lparam():
            try:
                pt = wt.POINT()
                if not _GetCursorPos(ctypes.byref(pt)):
                    return 0
                x = int(pt.x) & 0xFFFF
                y = int(pt.y) & 0xFFFF
                return (y << 16) | x
            except Exception:
                return 0

        lp = _cursor_lparam()
        try:
            import webview.platforms.winforms as _wf
            from System import Action

            form = _wf.BrowserView.instances.get(win.uid)
            if form:
                def _do():
                    try:
                        _SetForegroundWindow(hwnd)
                    except Exception:
                        pass
                    _SendMessageW(hwnd, WM_SYSCOMMAND, cmd, lp)
                if bool(getattr(form, "InvokeRequired", False)):
                    form.Invoke(Action(_do))
                else:
                    _do()
                return True
        except Exception:
            pass
        try:
            try:
                _SetForegroundWindow(hwnd)
            except Exception:
                pass
            _SendMessageW(hwnd, WM_SYSCOMMAND, cmd, lp)
            return True
        except Exception:
            try:
                return bool(_PostMessageW(hwnd, WM_SYSCOMMAND, cmd, lp))
            except Exception:
                return False

    def _tune_custom_chrome_visuals(hwnd):
        if _DwmSetWindowAttribute is None:
            return
        try:
            dark = wt.BOOL(1)
            _DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, ctypes.byref(dark), ctypes.sizeof(dark))
        except Exception:
            pass
        try:
            none_color = wt.DWORD(DWM_COLOR_NONE)
            _DwmSetWindowAttribute(hwnd, DWMWA_BORDER_COLOR, ctypes.byref(none_color), ctypes.sizeof(none_color))
        except Exception:
            pass
        try:
            caption_color = wt.DWORD(0x00050505)
            _DwmSetWindowAttribute(hwnd, DWMWA_CAPTION_COLOR, ctypes.byref(caption_color), ctypes.sizeof(caption_color))
        except Exception:
            pass

    def enable_custom_chrome(win):
        """
        保留原生 overlapped 窗口语义（含 WS_CAPTION）以获得系统过渡动画，
        通过 WM_NCCALCSIZE 在子类化 WndProc 中隐藏视觉 caption。
        """
        hwnd = _resolve(win)
        if not hwnd:
            return False
        try:
            style = _GetWindowLongPtrW(hwnd, GWL_STYLE)
            style = int(style) | WS_CAPTION | WS_BORDER | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU
            _SetWindowLongPtrW(hwnd, GWL_STYLE, style)
            _SetWindowPos(
                hwnd, None, 0, 0, 0, 0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
            )
            _tune_custom_chrome_visuals(hwnd)
            _CUSTOM_CHROME.add(hwnd)
            return True
        except Exception:
            return False

    def ensure_resizable_frame(win):
        """重新声明可缩放 overlapped frame 位，不改变视觉模式。"""
        hwnd = _resolve(win)
        if not hwnd:
            return False
        try:
            style = _GetWindowLongPtrW(hwnd, GWL_STYLE)
            style = int(style) | WS_THICKFRAME | WS_SIZEBOX | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU
            _SetWindowLongPtrW(hwnd, GWL_STYLE, style)
            _SetWindowPos(
                hwnd, None, 0, 0, 0, 0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
            )
            return True
        except Exception:
            return False

    def force_frame_refresh(win):
        hwnd = _resolve(win)
        if not hwnd:
            return False
        try:
            _SetWindowPos(
                hwnd, None, 0, 0, 0, 0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
            )
            return True
        except Exception:
            return False

    def _make_wndproc(hwnd, old_ptr, win, emulate_snap=False):
        def _call_old_safe(h, msg, wp, lp):
            try:
                return _CallWindowProcW(old_ptr, h, msg, wp, lp)
            except OSError:
                return 0

        def _proc(h, msg, wp, lp):
            is_custom = _custom_chrome_enabled(hwnd)

            if is_custom and msg == WM_NCCALCSIZE:
                # 仅在 "calc valid rects" 阶段处理；非 calc 阶段返回 0 会首帧抖动。
                if not wp:
                    return _call_old_safe(h, msg, wp, lp)
                # 最大化时按完整 frame metrics 内缩，避免裁剪。
                if _is_maximized(hwnd):
                    try:
                        p = ctypes.cast(lp, ctypes.POINTER(NCCALCSIZE_PARAMS)).contents
                        fx, fy = _frame_insets()
                        p.rgrc[0].left += int(max(0, fx))
                        p.rgrc[0].right -= int(max(0, fx))
                        p.rgrc[0].bottom -= int(max(0, fy))
                        p.rgrc[0].top += int(max(0, fy))
                    except Exception:
                        pass
                # 非最大化时不内缩（full client），resize 由 child hit-test 处理。
                return 0

            if is_custom and msg == WM_GETMINMAXINFO and lp:
                try:
                    mi = _get_monitor_info(hwnd)
                    if mi:
                        mmi = ctypes.cast(lp, ctypes.POINTER(MINMAXINFO)).contents
                        mmi.ptMaxPosition.x = int(mi.rcWork.left - mi.rcMonitor.left)
                        mmi.ptMaxPosition.y = int(mi.rcWork.top - mi.rcMonitor.top)
                        mmi.ptMaxSize.x = int(mi.rcWork.right - mi.rcWork.left)
                        mmi.ptMaxSize.y = int(mi.rcWork.bottom - mi.rcWork.top)
                    return 0
                except Exception:
                    pass

            if msg == WM_NCHITTEST:
                hit = _hit_test_for_top_window(hwnd, lp, allow_caption=True)
                if hit is not None:
                    return hit
                return _call_old_safe(h, msg, wp, lp)

            if msg == WM_NCLBUTTONDBLCLK and int(wp) == HTCAPTION:
                # 自绘标题栏下，非客户区双击也走最大化/还原。
                try:
                    if bool(_IsZoomed(hwnd)):
                        _syscommand_on_ui_thread(win, SC_RESTORE)
                    else:
                        _syscommand_on_ui_thread(win, SC_MAXIMIZE)
                except Exception:
                    try:
                        toggle_max_restore(win)
                    except Exception:
                        pass
                _notify_js(win, hwnd)
                return 0

            if msg == WM_SIZE:
                threading.Thread(target=_notify_js, args=(win, hwnd), daemon=True).start()

            if msg == WM_EXITSIZEMOVE:
                try:
                    style = _GetWindowLongPtrW(hwnd, GWL_STYLE)
                    # custom 模式：保持 WS_THICKFRAME，确保可缩放。
                    style = int(style) | WS_THICKFRAME | WS_SIZEBOX | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU
                    _SetWindowLongPtrW(hwnd, GWL_STYLE, style)
                    _SetWindowPos(
                        hwnd, None, 0, 0, 0, 0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
                    )
                except Exception:
                    pass
                if emulate_snap:
                    threading.Thread(target=_apply_snap_from_rect, args=(win, hwnd), daemon=True).start()

            return _call_old_safe(h, msg, wp, lp)

        return _WndProcType(_proc)

    def install(win, emulate_snap=False, borderless_mode=False):
        """子类化顶层 Form HWND（在 on_shown 中调用）。"""

        def _attach():
            try:
                hwnd = None
                for _ in range(180):
                    hwnd = _find_hwnd(win)
                    if hwnd:
                        break
                    time.sleep(0.03)
                if not hwnd:
                    print("[wintitle] HWND not found")
                    return
                if hwnd in _STATE:
                    return
                old = _GetWindowLongPtrW(hwnd, GWLP_WNDPROC)
                if not old:
                    print(f"[wintitle] invalid old WndProc HWND={hwnd:#x}")
                    return
                proc = _make_wndproc(hwnd, old, win, emulate_snap=bool(emulate_snap))
                ptr = ctypes.cast(proc, ctypes.c_void_p).value
                _SetWindowLongPtrW(hwnd, GWLP_WNDPROC, ptr)
                _STATE[hwnd] = {
                    "proc": proc,
                    "old": old,
                    "emulate_snap": bool(emulate_snap),
                    "borderless_mode": False,
                }
                _WIN_HWND[id(win)] = hwnd
                _install_child_hit_test(win, hwnd)
                _retry_install_child_hit_test(win, hwnd)
                _SetWindowPos(
                    hwnd, None, 0, 0, 0, 0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
                )
                print(f"[wintitle] WndProc installed HWND={hwnd:#x}")
            except Exception as e:
                print(f"[wintitle] install failed: {e}")

        threading.Thread(target=_attach, daemon=True).start()

    def toggle_max_restore(win):
        hwnd = _resolve(win)
        if not hwnd:
            return False
        before = bool(_is_maximized(hwnd))
        if before:
            _syscommand_on_ui_thread(win, SC_RESTORE)
        else:
            _syscommand_on_ui_thread(win, SC_MAXIMIZE)
        try:
            time.sleep(0.02)
        except Exception:
            pass
        threading.Thread(target=_notify_js, args=(win, hwnd), daemon=True).start()
        return True

    def minimize_window(win):
        hwnd = _resolve(win)
        if not hwnd:
            return False
        try:
            _syscommand_on_ui_thread(win, SC_MINIMIZE)
            _notify_js(win, hwnd)
            return True
        except Exception:
            return False

    def start_window_resize(win, edge="right"):
        hwnd = _resolve(win)
        if not hwnd:
            return False
        try:
            if _is_maximized(hwnd):
                return False
        except Exception:
            pass
        mapping = {
            "left": 1, "right": 2, "top": 3,
            "top-left": 4, "top-right": 5,
            "bottom": 6, "bottom-left": 7, "bottom-right": 8,
        }
        key = str(edge or "").strip().lower()
        code = int(mapping.get(key, 2))

        def _cursor_lparam():
            try:
                pt = wt.POINT()
                if not _GetCursorPos(ctypes.byref(pt)):
                    return 0
                x = int(pt.x) & 0xFFFF
                y = int(pt.y) & 0xFFFF
                return (y << 16) | x
            except Exception:
                return 0

        wp = int(SC_SIZE | code)
        lp = _cursor_lparam()

        def _do_resize():
            try:
                _SetForegroundWindow(hwnd)
            except Exception:
                pass
            try:
                _ReleaseCapture()
            except Exception:
                pass
            _SendMessageW(hwnd, WM_SYSCOMMAND, wp, lp)

        try:
            import webview.platforms.winforms as _wf
            from System import Action

            form = _wf.BrowserView.instances.get(win.uid)
            if form:
                if bool(getattr(form, "InvokeRequired", False)):
                    form.Invoke(Action(_do_resize))
                else:
                    _do_resize()
                return True
        except Exception:
            pass

        try:
            _do_resize()
            return True
        except Exception:
            return False

    def titlebar_double_click(win):
        hwnd = _resolve(win)
        if not hwnd:
            return False

        def _do_dbl():
            try:
                _SetForegroundWindow(hwnd)
            except Exception:
                pass
            try:
                _ReleaseCapture()
            except Exception:
                pass
            _SendMessageW(hwnd, WM_NCLBUTTONDBLCLK, HTCAPTION, 0)

        try:
            import webview.platforms.winforms as _wf
            from System import Action

            form = _wf.BrowserView.instances.get(win.uid)
            if form:
                if bool(getattr(form, "InvokeRequired", False)):
                    form.Invoke(Action(_do_dbl))
                else:
                    _do_dbl()
                return True
        except Exception:
            pass

        try:
            _do_dbl()
            return True
        except Exception:
            return False

    def nudge_window_size(win):
        hwnd = _resolve(win)
        if not hwnd:
            return False
        try:
            if _is_maximized(hwnd):
                return False
        except Exception:
            pass
        try:
            rc = _get_rect(hwnd)
            w = max(320, int(rc.right - rc.left))
            h = max(240, int(rc.bottom - rc.top))
            l = int(rc.left)
            t = int(rc.top)
            _SetWindowPos(hwnd, None, l, t, w + 1, h, SWP_NOZORDER | SWP_NOACTIVATE)
            _SetWindowPos(hwnd, None, l, t, w, h, SWP_NOZORDER | SWP_NOACTIVATE)
            return True
        except Exception:
            return False

    def start_window_drag(win):
        """启动原生标题栏拖拽。必须在 UI 线程执行。"""
        hwnd = _resolve(win)
        if not hwnd:
            return False
        try:
            import webview.platforms.winforms as _wf
            from System import Func, Type as _T

            form = _wf.BrowserView.instances.get(win.uid)
            if form:
                def _do():
                    _ReleaseCapture()
                    _SendMessageW(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0)
                form.BeginInvoke(Func[_T](_do))
                return True
        except Exception:
            pass

        _ReleaseCapture()
        _SendMessageW(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0)
        return True

    def sync_max_state(win):
        hwnd = _resolve(win)
        if not hwnd:
            return False
        _notify_js(win, hwnd)
        return True

    def is_window_maximized(win):
        hwnd = _resolve(win)
        if not hwnd:
            return False
        return bool(_is_maximized(hwnd))

    def snap_window(win, mode="max", screen_x=None, screen_y=None):
        """手动贴边：mode=max|restore|left|right。"""
        hwnd = _resolve(win)
        if not hwnd:
            return False
        m = str(mode or "").strip().lower()
        if m == "restore":
            _syscommand_on_ui_thread(win, SC_RESTORE)
            _notify_js(win, hwnd)
            return True
        if m == "left":
            ok = _snap_left(hwnd)
            _notify_js(win, hwnd)
            return ok
        if m == "right":
            ok = _snap_right(hwnd)
            _notify_js(win, hwnd)
            return ok
        _syscommand_on_ui_thread(win, SC_MAXIMIZE)
        _notify_js(win, hwnd)
        return True

    def set_window_topmost(win, enabled=True):
        hwnd = _resolve(win)
        if not hwnd:
            return False
        try:
            insert_after = HWND_TOPMOST if bool(enabled) else HWND_NOTOPMOST
            return bool(_SetWindowPos(
                hwnd, insert_after, 0, 0, 0, 0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
            ))
        except Exception:
            return False

    def add_startup_script(win, script):
        """在每个文档创建前执行脚本，消除标题栏"加载时缺失"间隙。"""
        src = str(script or "")
        if not src.strip():
            return False
        for _ in range(60):
            try:
                import webview.platforms.winforms as _wf
                from System import Func, Type as _T

                form = _wf.BrowserView.instances.get(win.uid)
                if not form or not form.browser:
                    time.sleep(0.08)
                    continue
                ok = [False]

                def _set():
                    try:
                        core = form.browser.webview.CoreWebView2
                        if core:
                            core.AddScriptToExecuteOnDocumentCreated(src)
                            ok[0] = True
                    except Exception:
                        pass

                form.Invoke(Func[_T](_set))
                if ok[0]:
                    return True
            except Exception:
                pass
            time.sleep(0.08)
        return False

    def set_webview_dark_background(win, r=5, g=5, b=5):
        """防白闪之一：强制 WebView2 宿主/底色为暗色，避免文档间导航白闪。"""
        rr = max(0, min(255, int(r)))
        gg = max(0, min(255, int(g)))
        bb = max(0, min(255, int(b)))
        for _ in range(80):
            try:
                import webview.platforms.winforms as _wf
                from System import Action
                from System.Drawing import Color

                form = _wf.BrowserView.instances.get(win.uid)
                if not form or not getattr(form, "browser", None):
                    time.sleep(0.08)
                    continue
                ok = [False]

                def _apply():
                    try:
                        c = Color.FromArgb(255, rr, gg, bb)
                        try:
                            form.BackColor = c
                        except Exception:
                            pass
                        browser = getattr(form, "browser", None)
                        if browser is not None:
                            try:
                                browser.BackColor = c
                            except Exception:
                                pass
                            wv = getattr(browser, "webview", None)
                            if wv is not None:
                                try:
                                    wv.DefaultBackgroundColor = c
                                except Exception:
                                    pass
                                try:
                                    ctl = getattr(wv, "CoreWebView2Controller", None)
                                    if ctl is not None:
                                        ctl.DefaultBackgroundColor = c
                                except Exception:
                                    pass
                        ok[0] = True
                    except Exception:
                        pass

                if bool(getattr(form, "InvokeRequired", False)):
                    form.Invoke(Action(_apply))
                else:
                    _apply()
                if ok[0]:
                    return True
            except Exception:
                pass
            time.sleep(0.08)
        return False

    def install_navigation_cover(win, top_offset=36, r=5, g=5, b=5, hide_delay_ms=220):
        """
        防白闪之二：安装原生 overlay 窗体（由主窗体拥有），导航过渡期覆盖 WebView。
        即便 WebView 子 HWND 绘制在窗体内控件之上也能避免白闪。
        """
        rr = max(0, min(255, int(r)))
        gg = max(0, min(255, int(g)))
        bb = max(0, min(255, int(b)))
        top = max(0, int(top_offset or 0))
        delay_ms = max(0, int(hide_delay_ms or 0))

        for _ in range(80):
            try:
                import webview.platforms.winforms as _wf
                from System import Action
                from System.Drawing import Color, Font, Point, Size
                from System.Windows.Forms import (ContentAlignment, Form, FormBorderStyle,
                                                  Label, FormStartPosition)

                form = _wf.BrowserView.instances.get(win.uid)
                if not form or not getattr(form, "browser", None):
                    time.sleep(0.08)
                    continue
                ok = [False]

                def _install():
                    try:
                        key = id(win)
                        if key in _NAV_COVER_STATE:
                            ok[0] = True
                            return

                        cover = Form()
                        cover.Name = "webviewUiNativeNavCover"
                        cover.FormBorderStyle = getattr(FormBorderStyle, "None")
                        cover.StartPosition = FormStartPosition.Manual
                        cover.ShowInTaskbar = False
                        cover.TopMost = True
                        cover.BackColor = Color.FromArgb(255, rr, gg, bb)
                        cover.MinimizeBox = False
                        cover.MaximizeBox = False
                        cover.ControlBox = False
                        cover.Text = ""
                        cover.Visible = False

                        label = Label()
                        label.Text = "Loading..."
                        label.ForeColor = Color.FromArgb(220, 220, 220)
                        label.BackColor = Color.Transparent
                        try:
                            label.Font = Font("Segoe UI", 9.0)
                        except Exception:
                            pass
                        label.TextAlign = ContentAlignment.MiddleCenter
                        label.Dock = 5  # Fill
                        label.TabStop = False
                        cover.Controls.Add(label)

                        def _layout(_s=None, _e=None):
                            try:
                                cw = int(form.ClientSize.Width or 0)
                                ch = int(form.ClientSize.Height or 0)
                                h = max(0, ch - top)
                                pt = form.PointToScreen(Point(0, top))
                                cover.Location = pt
                                cover.Size = Size(max(0, cw), h)
                                try:
                                    cover.BringToFront()
                                except Exception:
                                    pass
                            except Exception:
                                pass

                        def _invoke_form(action):
                            try:
                                if bool(getattr(form, "InvokeRequired", False)):
                                    form.Invoke(Action(action))
                                else:
                                    action()
                            except Exception:
                                pass

                        state = {"hold_until_loaded": False}

                        def _show_cover(_s=None, _e=None):
                            def _do_show():
                                try:
                                    _layout()
                                    if not bool(getattr(cover, "Visible", False)):
                                        try:
                                            cover.Show(form)
                                        except Exception:
                                            cover.Show()
                                    cover.Visible = True
                                    cover.BringToFront()
                                except Exception:
                                    pass
                            _invoke_form(_do_show)

                        def _hide_cover(_s=None, _e=None):
                            def _do_hide():
                                try:
                                    cover.Visible = False
                                except Exception:
                                    pass
                            try:
                                if delay_ms <= 0:
                                    _do_hide()
                                    return

                                def _timer_hide():
                                    _invoke_form(_do_hide)
                                threading.Timer(delay_ms / 1000.0, _timer_hide).start()
                            except Exception:
                                _do_hide()

                        try:
                            form.AddOwnedForm(cover)
                        except Exception:
                            pass
                        _layout()
                        try:
                            form.Move += _layout
                        except Exception:
                            pass
                        try:
                            form.Resize += _layout
                        except Exception:
                            pass
                        try:
                            form.VisibleChanged += _layout
                        except Exception:
                            pass

                        def _bind_core():
                            for _ in range(120):
                                try:
                                    core = form.browser.webview.CoreWebView2
                                except Exception:
                                    core = None
                                if core is not None:
                                    def _on_nav_start(sender, args):
                                        try:
                                            uri = str(getattr(args, "Uri", "") or "")
                                        except Exception:
                                            uri = ""
                                        state["hold_until_loaded"] = True
                                        _show_cover(sender, args)

                                    def _on_nav_done(sender, args):
                                        try:
                                            ok_flag = bool(getattr(args, "IsSuccess", False))
                                        except Exception:
                                            ok_flag = False
                                        if state.get("hold_until_loaded"):
                                            return
                                        _hide_cover(sender, args)

                                    try:
                                        core.NavigationStarting += _on_nav_start
                                    except Exception:
                                        pass
                                    try:
                                        core.NavigationCompleted += _on_nav_done
                                    except Exception:
                                        pass
                                    return
                                time.sleep(0.1)

                        threading.Thread(target=_bind_core, daemon=True).start()

                        _NAV_COVER_STATE[key] = {
                            "cover": cover,
                            "label": label,
                            "invoke_form": _invoke_form,
                            "form_move": _layout,
                            "form_resize": _layout,
                            "form_visible": _layout,
                            "nav_start": _show_cover,
                            "nav_done": _hide_cover,
                            "state": state,
                        }
                        ok[0] = True
                    except Exception:
                        pass

                if bool(getattr(form, "InvokeRequired", False)):
                    form.Invoke(Action(_install))
                else:
                    _install()
                if ok[0]:
                    return True
            except Exception:
                pass
            time.sleep(0.08)
        return False

    def release_navigation_cover(win, hide=True):
        key = id(win)
        data = _NAV_COVER_STATE.get(key)
        if not data:
            return False
        try:
            st = data.get("state")
            if isinstance(st, dict):
                st["hold_until_loaded"] = False
            if bool(hide):
                fn = data.get("nav_done")
                if callable(fn):
                    fn()
            return True
        except Exception:
            return False
