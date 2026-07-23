"""模块加载器：扫描 app/modules/*/module.json，隔离式导入后端模块。

每个模块目录包含：
  module.json  清单 {key, name, version, description, frontend}
  backend.py   暴露一个带 api_methods() 的类（或 MODULE_CLASS 属性）

任何模块加载失败只打日志跳过，绝不阻断主程序启动。
"""

from __future__ import annotations

import importlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

MODULES_DIR = Path(__file__).resolve().parent
_KEY_RE = re.compile(r"^[a-z0-9_-]+$")


@dataclass
class ModuleHandle:
    key: str
    name: str
    version: str
    description: str
    frontend_url: str
    methods: dict = field(default_factory=dict)


def _find_module_class(backend):
    cls = getattr(backend, "MODULE_CLASS", None)
    if cls is not None:
        return cls
    for value in vars(backend).values():
        if isinstance(value, type) and hasattr(value, "api_methods"):
            return value
    return None


def discover_modules(data_dir=None, storage_ref=None) -> dict[str, ModuleHandle]:
    """扫描并加载所有模块，返回 {key: ModuleHandle}。"""
    modules: dict[str, ModuleHandle] = {}
    if not MODULES_DIR.is_dir():
        return modules
    for manifest_path in sorted(MODULES_DIR.glob("*/module.json")):
        dir_name = manifest_path.parent.name
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            key = str(manifest.get("key") or "").strip()
            if not key or not _KEY_RE.match(key):
                print(f"[PicScannerModules] 跳过 {dir_name}：module.json 的 key 非法（须为小写字母/数字/_-）")
                continue
            if key != dir_name:
                print(f"[PicScannerModules] 跳过 {dir_name}：module.json 的 key 与目录名不一致（{key}）")
                continue
            if key in modules:
                print(f"[PicScannerModules] 跳过 {dir_name}：key {key} 已存在")
                continue

            backend = importlib.import_module(f"app.modules.{key}.backend")
            cls = _find_module_class(backend)
            if cls is None:
                raise RuntimeError("backend.py 未提供带 api_methods() 的模块类")
            instance = cls()
            if hasattr(instance, "setup"):
                instance.setup({"data_dir": data_dir, "storage": storage_ref})
            raw_methods = instance.api_methods() or {}
            methods = {str(name): fn for name, fn in raw_methods.items() if callable(fn)}

            frontend_rel = str(manifest.get("frontend") or "").strip()
            frontend_url = ""
            if frontend_rel:
                frontend_path = (manifest_path.parent / frontend_rel).resolve()
                if frontend_path.exists():
                    frontend_url = frontend_path.as_uri()
                else:
                    print(f"[PicScannerModules] 模块 {key} 的前端文件不存在：{frontend_path}")

            modules[key] = ModuleHandle(
                key=key,
                name=str(manifest.get("name") or key),
                version=str(manifest.get("version") or "0.0.0"),
                description=str(manifest.get("description") or ""),
                frontend_url=frontend_url,
                methods=methods,
            )
            print(f"[PicScannerModules] 已加载模块：{key}（{len(methods)} 个方法）")
        except Exception as exc:
            print(f"[PicScannerModules] 模块 {dir_name} 加载失败：{exc}")
    return modules
