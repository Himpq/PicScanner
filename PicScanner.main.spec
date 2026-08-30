# -*- mode: python ; coding: utf-8 -*-
# PicScanner 主程序 Spec - 瘦身版（主+插件分离）
# - 主 exe 不含 onnxruntime/tokenizers/torch/transformers
# - 语义插件由 plugins/semantic_search/_libs 提供，缺失时主程序照常启动
# - data/ 完全外置，不打入 exe（运行时在 exe 旁的 data/）
# 输出到 G:/Temp/ExeItUp/PicScanner_v2.1.0 供 ExeItUp 接管，外置 data 不打包
# 版本 v2.1.0 - onnx_runtime 共享 + face 外置

import sys
from pathlib import Path

# PyInstaller spec 执行时 __file__ 未定义，用内置变量 SPECPATH
try:
    PROJECT_ROOT = Path(SPECPATH).resolve()  # type: ignore[name-defined]
except NameError:
    PROJECT_ROOT = Path.cwd().resolve()
block_cipher = None

# ========== 排除的重型依赖（主包瘦身至 35MB 区间）==========
excludes = [
    # 语义插件栈（由插件 _libs 提供）
    "onnxruntime", "onnxruntime.capi", "onnxruntime.capi._pybind_state",
    "tokenizers", "tokenizers.tokenizers",
    "transformers", "transformers.models", "transformers.models.bert",
    "torch", "torchvision", "torchaudio",
    "accelerate", "safetensors", "huggingface_hub",
    "onnx",
    # 人脸插件栈（由 plugins/face、face_cluster _libs 提供，主包代理已容错）
    "mediapipe", "mediapipe.tasks", "mediapipe.tasks.python",
    "cv2", "cv2.gapi",
    # 误被拖入的重量级可视化/科学栈（rawpy/matplotlib/kivy 钩子链）
    "matplotlib", "matplotlib.pyplot", "matplotlib.backends", "matplotlib.backends.backend_qtagg",
    "kivy", "kivy.deps", "kivy_deps", "kymd", "kivymd",
    "PyQt6", "PyQt6.QtCore", "PyQt6.QtGui", "PyQt6.QtWidgets",
    "PyQt5",
    # collections 拖入的 sklearn 全家桶，300MB+，主包按需外置
    "sklearn", "sklearn.utils", "sklearn.metrics", "sklearn.ensemble", "sklearn.cluster",
    "scipy", "scipy.special", "scipy.sparse", "scipy.spatial",
    "pandas", "pandas.io", "pandas.core",
    "numba", "llvmlite",
]

# 插件 encoder 本体也由外置提供，主包仅留代理
excludes += [
    "plugins.semantic_search.encoder", "plugins.semantic_search.encoder_onnx",
    "plugins.face_cluster.encoder",
]

a = Analysis(
    [str(PROJECT_ROOT / "main.py")],
    pathex=[str(PROJECT_ROOT)],
    binaries=[],
    datas=[
        # 前端与后端静态资源（data/ 除外）
        (str(PROJECT_ROOT / "app" / "ui"), "app/ui"),
        (str(PROJECT_ROOT / "WebViewUI"), "WebViewUI"),
        # 各模块的 module.json + 前端 js（不含 plugins）
        (str(PROJECT_ROOT / "app" / "modules" / "loader.py"), "app/modules"),
    ],
    hiddenimports=[
        "app.backend.api",
        "app.backend.storage",
        "app.backend.scanner",
        "app.backend.thumbnailer",
        "app.backend.config_store",
        "app.backend.plugin_config",
        "app.modules.loader",
        # 内置模块：动态 import 需显式声明（face 已外置，不在此）
        "app.modules.ai_edit.backend",
        "app.modules.collections.backend",
        "app.modules.face_cluster.backend",
        "app.modules.semantic_search.backend",
        # PIL 子模块（face ONNX 几何掩膜需 ImageDraw，动态 import 需显式）
        "PIL.Image",
        "PIL.ImageDraw",
        "PIL.ImageOps",
        "PIL.ImageFont",
        "WebViewUI",
        "WebViewUI.app",
        "WebViewUI.window_api",
        "webview",
        "clr",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# 手工补充 app/modules 各插件的前端资源与 module.json（Analysis 的 datas 不会自动递归）
import os
_extra_datas = []
for mod_dir in (PROJECT_ROOT / "app" / "modules").iterdir():
    if not mod_dir.is_dir():
        continue
    if mod_dir.name.startswith("_"):
        continue
    for f in mod_dir.rglob("*"):
        if f.is_file() and f.suffix in (".json", ".js", ".css") and "__pycache__" not in f.parts:
            rel_parent = f.parent.relative_to(PROJECT_ROOT)
            _extra_datas.append((str(f), str(rel_parent)))
# icons - iterate files, not directory itself
if (PROJECT_ROOT / "icons").exists():
    for f in (PROJECT_ROOT / "icons").rglob("*"):
        if f.is_file() and "__pycache__" not in f.parts:
            rel_parent = f.parent.relative_to(PROJECT_ROOT)
            _extra_datas.append((str(f), str(rel_parent)))
# 去重并转为 TOC 3元组 (dest, src, 'DATA')
seen = set()
for src, dst in _extra_datas:
    key = (src, dst)
    if key not in seen:
        dest_file = str(Path(dst) / Path(src).name).replace("\\", "/")
        a.datas.append((dest_file, src, 'DATA'))
        seen.add(key)

# 排除 data/ 绝不打包（用户数据、外置模型） — 兼容 2元组与 3元组(Toc) 格式
def _filter_datas(items, deny_pred):
    out = []
    for it in items:
        s = " ".join(str(x) for x in it if isinstance(x, str))
        if not deny_pred(s.replace("\\", "/")):
            out.append(it)
    return out

proj_prefix = str(PROJECT_ROOT).replace("\\", "/") + "/data"
a.datas = _filter_datas(a.datas, lambda s: proj_prefix in s or "/data/" in s)
a.datas = _filter_datas(a.datas, lambda s: "plugins/semantic_search" in s or "plugins/face_cluster" in s)
a.datas = _filter_datas(a.datas, lambda s: "plugins/face" in s and s.endswith(".task"))
# binaries 侧同样掐掉重型库
a.binaries = _filter_datas(a.binaries, lambda s: any(k in s.lower() for k in ["onnxruntime", "tokenizers", "mediapipe", "opencv", "cv2"]))
# 误抓的 matplotlib/kivy/PyQt 也从 datas 清掉
a.datas = _filter_datas(a.datas, lambda s: any(k in s.lower() for k in ["matplotlib", "kivy", "pyqt6", "pyqt5"]))

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# 单文件无控制台版：exe 自含 binaries/datas，无需 COLLECT
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name="PicScanner",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(PROJECT_ROOT / "icons" / "appicon.png") if (PROJECT_ROOT / "icons" / "appicon.png").exists() else None,
)
