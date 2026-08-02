"""插件配置存储：每个模块独立一个 JSON 文件，互不干扰。

存储位置：data/module_configs/{module_key}.json
用途：API 密钥、模型选择、功能开关等轻量配置。
不存放：对话记录、缓存、模型文件等数据（走模块自身 data_dir）。
"""

from __future__ import annotations

import json
from pathlib import Path


class PluginConfig:
    """单个插件的配置读写。"""

    def __init__(self, path: Path, defaults: dict | None = None):
        self._path = path
        self._defaults = defaults or {}
        self._data: dict = self._load()

    def _load(self) -> dict:
        if self._path.exists():
            try:
                data = json.loads(self._path.read_text(encoding="utf-8-sig"))
                if isinstance(data, dict):
                    merged = dict(self._defaults)
                    merged.update(data)
                    return merged
            except Exception:
                pass
        return dict(self._defaults)

    def _save(self):
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            json.dumps(self._data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def get(self, key: str, default=None):
        return self._data.get(key, self._defaults.get(key, default))

    def set(self, key: str, value):
        self._data[key] = value
        self._save()

    def delete(self, key: str):
        self._data.pop(key, None)
        self._save()

    def snapshot(self) -> dict:
        return dict(self._data)

    def update(self, mapping: dict):
        self._data.update(mapping)
        self._save()


class PluginConfigStore:
    """管理所有插件配置的工厂。"""

    def __init__(self, base_dir: Path):
        self._dir = base_dir / "module_configs"
        self._cache: dict[str, PluginConfig] = {}

    def get_config(self, module_key: str, defaults: dict | None = None) -> PluginConfig:
        """获取（或创建）指定插件的配置实例。"""
        if module_key not in self._cache:
            path = self._dir / f"{module_key}.json"
            self._cache[module_key] = PluginConfig(path, defaults)
        return self._cache[module_key]
