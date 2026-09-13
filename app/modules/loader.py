"""模块加载器：扫描 app/modules/*/module.json，隔离式导入后端模块。

每个模块目录包含：
  module.json  清单 {key, name, version, description, frontend}
  backend.py   暴露一个带 api_methods() 的类（或 MODULE_CLASS 属性）

任何模块加载失败只打日志跳过，绝不阻断主程序启动。
"""

from __future__ import annotations

import importlib
import importlib.util
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from app.backend.plugin_config import PluginConfigStore

MODULES_DIR = Path(__file__).resolve().parent
_KEY_RE = re.compile(r"^[a-z0-9_-]+$")


def _external_plugins_dir() -> Path | None:
    """exe 旁的外置插件目录（单文件 exe 时为 exe 所在目录/plugins）"""
    try:
        from app.backend.config_store import get_app_root

        ext = Path(get_app_root()) / "plugins"
        if ext.is_dir():
            return ext
    except Exception:
        pass
    # 开发期回退：项目根 plugins
    try:
        proj_plugins = Path(__file__).resolve().parents[2] / "plugins"
        if proj_plugins.is_dir():
            return proj_plugins
    except Exception:
        pass
    return None


@dataclass
class ModuleHandle:
    key: str
    name: str
    version: str
    description: str
    frontend_url: str
    methods: dict = field(default_factory=dict)
    # 后端实例（用于主窗口就绪等生命周期通知，如 on_ui_ready()；仅内部使用）
    instance: object = None


def _find_module_class(backend):
    cls = getattr(backend, "MODULE_CLASS", None)
    if cls is not None:
        return cls
    for value in vars(backend).values():
        if isinstance(value, type) and hasattr(value, "api_methods"):
            return value
    return None


def discover_modules(data_dir=None, storage_ref=None, plugin_configs=None, push=None, scanner_ref=None) -> dict[str, ModuleHandle]:
    """扫描并加载所有模块，返回 {key: ModuleHandle}。

    push: 可选回调 push(event: str, data: dict)，模块可用它向前端推送事件
    （如 LLM 流式输出）。由主 API 提供，内部经 webview evaluate_js 下发。
    """
    modules: dict[str, ModuleHandle] = {}
    if not MODULES_DIR.is_dir():
        return modules

    # 插件配置存储（data/module_configs/{key}.json）
    if plugin_configs is None and data_dir:
        plugin_configs = PluginConfigStore(Path(data_dir))

    # 收集内置 + 外置的 manifest（外置可覆盖/新增）
    manifest_paths: list[Path] = sorted(MODULES_DIR.glob("*/module.json"))
    ext_dir = _external_plugins_dir()
    print(f"[PicScannerModules] built-in {len(manifest_paths)} at {MODULES_DIR}, ext_dir={ext_dir} exists={ext_dir.is_dir() if ext_dir else False}")
    # 外置仅收集含 module.json 的独立插件（主题/新插件），避免把语义/人脸的纯库目录误扫
    if ext_dir and ext_dir.resolve() != MODULES_DIR.resolve():
        ext_manifests = sorted(ext_dir.glob("*/module.json"))
        print(f"[PicScannerModules] external {len(ext_manifests)} at {ext_dir}: {[p.parent.name for p in ext_manifests]}")
        for p in ext_manifests:
            # 若 key 已在内置中则跳过（外置不覆盖内置代理）
            try:
                k = json.loads(p.read_text(encoding="utf-8")).get("key")
                if k in modules or any(mp.parent.name == k for mp in manifest_paths):
                    continue
            except Exception:
                pass
            manifest_paths.append(p)

    for manifest_path in manifest_paths:
        dir_name = manifest_path.parent.name
        is_external = ext_dir is not None and manifest_path.is_relative_to(ext_dir) if hasattr(manifest_path, "is_relative_to") else str(manifest_path).startswith(str(ext_dir))
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

            if is_external:
                # 外置插件：用文件路径动态加载，避免依赖 app.modules 包名
                # 注意：不要在函数内 `import importlib` 会遮蔽全局 importlib，导致 UnboundLocalError
                backend_path = manifest_path.parent / "backend.py"
                if not backend_path.exists():
                    print(f"[PicScannerModules] 外置插件 {key} 缺少 backend.py，跳过")
                    continue
                spec = importlib.util.spec_from_file_location(f"plugins.{key}.backend", str(backend_path))
                if spec is None or spec.loader is None:
                    raise RuntimeError("无法创建外置插件 spec")
                backend = importlib.util.module_from_spec(spec)
                # 确保外置插件的 _libs 可被导入
                import sys as _sys

                _libs = manifest_path.parent / "_libs"
                if _libs.is_dir() and str(_libs) not in _sys.path:
                    _sys.path.insert(0, str(_libs))
                # 插件包根也加入，防止 from plugins.xxx import
                _pkg_root = str(ext_dir) if ext_dir else ""
                if _pkg_root and _pkg_root not in _sys.path:
                    _sys.path.insert(0, _pkg_root)
                spec.loader.exec_module(backend)  # type: ignore
            else:
                backend = importlib.import_module(f"app.modules.{key}.backend")
            cls = _find_module_class(backend)
            if cls is None:
                raise RuntimeError("backend.py 未提供带 api_methods() 的模块类")
            instance = cls()
            if hasattr(instance, "setup"):
                ctx = {"data_dir": data_dir, "storage": storage_ref}
                if plugin_configs:
                    ctx["config"] = plugin_configs.get_config(key)
                if push is not None:
                    ctx["push"] = push
                if scanner_ref is not None:
                    ctx["scanner"] = scanner_ref
                instance.setup(ctx)
            raw_methods = instance.api_methods() or {}
            methods = {str(name): fn for name, fn in raw_methods.items() if callable(fn)}

            frontend_rel = str(manifest.get("frontend") or "").strip()
            frontend_url = ""
            if frontend_rel:
                frontend_path = (manifest_path.parent / frontend_rel).resolve()
                if frontend_path.exists():
                    # 用文件 mtime 做缓存破坏：WebView2 会缓存 file:// 脚本，URL 不带
                    # 版本号时改了前端代码、重启 app 也可能加载到缓存的旧脚本。
                    # Chromium 解析 file:// 会忽略 query，追加 ?v=<mtime> 安全且文件
                    # 一改动 URL 即变化，保证每次启动都加载最新代码。
                    frontend_url = f"{frontend_path.as_uri()}?v={int(frontend_path.stat().st_mtime)}"
                else:
                    print(f"[PicScannerModules] 模块 {key} 的前端文件不存在：{frontend_path}")

            modules[key] = ModuleHandle(
                key=key,
                name=str(manifest.get("name") or key),
                version=str(manifest.get("version") or "0.0.0"),
                description=str(manifest.get("description") or ""),
                frontend_url=frontend_url,
                methods=methods,
                instance=instance,
            )
            print(f"[PicScannerModules] 已加载模块：{key}（{len(methods)} 个方法）")
        except Exception as exc:
            print(f"[PicScannerModules] 模块 {dir_name} 加载失败：{exc}")
    return modules
