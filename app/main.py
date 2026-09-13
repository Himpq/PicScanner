"""
PicScanner application entry point.

Run from the project root:
    python main.py
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
APP_ROOT = PROJECT_ROOT / "app"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# 冻结 exe：把 exe 所在目录加入 sys.path，使外置 plugins/ 可被 import plugins.xxx 发现
if getattr(sys, "frozen", False):
    _exe_dir = Path(sys.executable).parent.resolve()
    if str(_exe_dir) not in sys.path:
        sys.path.insert(0, str(_exe_dir))
    # 兼容部分环境 exe 在 _internal 子目录的 onedir 形态
    _exe_parent = _exe_dir.parent.resolve()
    if str(_exe_parent) not in sys.path:
        sys.path.insert(0, str(_exe_parent))
    # 预加载所有外置插件的 _libs（共享 onnxruntime/cv2），避免内置模块按字母序先加载时找不到依赖
    for _plug in (_exe_dir / "plugins").glob("*/_libs"):
        if _plug.is_dir() and str(_plug) not in sys.path:
            sys.path.insert(0, str(_plug))
    # 开发期也预加载项目根 plugins/_libs
    for _plug2 in (PROJECT_ROOT / "plugins").glob("*/_libs"):
        if _plug2.is_dir() and str(_plug2) not in sys.path:
            sys.path.insert(0, str(_plug2))

# numpy 2 兼容垫片：cv2/onnxruntime 仍 import numpy.core.multiarray（已迁至 numpy._core）
try:
    import numpy as _np_shim
    import sys as _sys_shim
    # 确保旧路径可用
    if "numpy.core" not in _sys_shim.modules:
        import numpy._core as _core_shim
        _sys_shim.modules["numpy.core"] = _core_shim
    if "numpy.core.multiarray" not in _sys_shim.modules:
        try:
            import numpy._core.multiarray as _ma
            _sys_shim.modules["numpy.core.multiarray"] = _ma
        except Exception:
            pass
    if "numpy.core._multiarray_umath" not in _sys_shim.modules:
        try:
            import numpy._core._multiarray_umath as _mau
            _sys_shim.modules["numpy.core._multiarray_umath"] = _mau
        except Exception:
            pass
except Exception:
    pass

from WebViewUI import WebViewApp
from app.backend.api import PicScannerApi
from app.backend.thumbnailer import is_previewable_image


def launch_photo_path(arguments=None) -> Path | None:
    """返回通过 EXE/快捷方式拖入的首个有效图片路径。"""
    values = sys.argv[1:] if arguments is None else arguments
    for value in values:
        text = str(value or "").strip().strip('"')
        if not text or text.startswith("-"):
            continue
        candidate = Path(text).expanduser().resolve(strict=False)
        if candidate.is_file() and is_previewable_image(candidate):
            return candidate
    return None


def main():
    entry = APP_ROOT / "ui" / "index.html"
    launch_photo = launch_photo_path()
    if launch_photo:
        print(f"[PicScanner] launch photo: {launch_photo}", flush=True)
    app = WebViewApp(
        entry_url=str(entry),
        js_api=PicScannerApi(launch_photo=launch_photo),
        title="PicScanner",
        width=1280,
        height=820,
        min_size=(1040, 680),
        brand="PicScanner",
        titlebar_height=36,
        use_bootstrap=False,
        use_native_nav_cover=False,
    )
    print("[PicScanner] launching...")
    app.run()
