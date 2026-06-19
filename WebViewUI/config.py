"""
配置管理：读写 config.json

仅包含 WebViewUI 窗口框架配置。业务服务地址、鉴权、文件权限等由使用者维护。
"""

import copy
import json
import secrets
import sys
from pathlib import Path


def get_app_root() -> Path:
    """返回应用根目录：打包后为 exe 所在目录，开发时为本文件上两级。"""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    else:
        # WebViewUI/config.py -> WebViewUI/ -> 上两级才是宿主项目根
        return Path(__file__).resolve().parent.parent


_DATA_DIR = get_app_root() / "data"
if not _DATA_DIR.exists():
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
_CONFIG_PATH = _DATA_DIR / "config.json"

_DEFAULTS = {
    # 窗口外观
    "window_mode": "custom",          # 仅 custom 模式被支持
    "window_width": 960,
    "window_height": 700,
    "window_min_width": 900,
    "window_min_height": 560,
    # 防白闪
    "native_navigation_cover": True,  # 三层防白闪之一：WinForms overlay
    "use_bootstrap_shell": True,      # 三层防白闪之二：bootstrap 启动页
    # 调试
    "devtools_enabled": False,
    "devtools_auto_open": False,
    "devtools_port": 9222,
    # 启动文案
    "message": {
        "bootstrap": "加载中",
    },
    # 设备标识（每台设备唯一，重启不变；供需要设备区分的场景使用）
    "app_id": "",
}


class Config:
    def __init__(self):
        self._data: dict = {}
        self._load()

    def _load(self):
        if _CONFIG_PATH.exists():
            try:
                with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
            except Exception:
                self._data = dict(_DEFAULTS)
        else:
            self._data = dict(_DEFAULTS)

        # 首次运行时生成持久化 app_id
        if not self._data.get("app_id"):
            self._data["app_id"] = secrets.token_hex(24)
            self._save()

    def _save(self):
        try:
            with open(_CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(self._data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def get(self, key: str, default=None):
        return self._data.get(key, _DEFAULTS.get(key, default))

    def set(self, key: str, value):
        self._data[key] = value
        self._save()

    def snapshot(self) -> dict:
        base = copy.deepcopy(_DEFAULTS)
        for key, value in self._data.items():
            if isinstance(value, dict) and isinstance(base.get(key), dict):
                merged = dict(base.get(key) or {})
                merged.update(copy.deepcopy(value))
                base[key] = merged
            else:
                base[key] = copy.deepcopy(value)
        if not base.get("app_id"):
            base["app_id"] = secrets.token_hex(24)
        return base

    def replace_all(self, data: dict):
        if not isinstance(data, dict):
            raise TypeError("config payload must be an object")
        merged = copy.deepcopy(_DEFAULTS)
        for key, value in data.items():
            if isinstance(value, dict) and isinstance(merged.get(key), dict):
                nested = dict(merged.get(key) or {})
                nested.update(copy.deepcopy(value))
                merged[key] = nested
            else:
                merged[key] = copy.deepcopy(value)
        if not merged.get("app_id"):
            merged["app_id"] = secrets.token_hex(24)
        self._data = merged
        self._save()


config = Config()
