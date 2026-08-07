"""工具注册表：收集 tools/ 下所有工具定义，提供统一调用入口和 Schema 导出。"""

from __future__ import annotations

from typing import Any, Callable

from .tools import collect_tools


class ToolRegistry:
    """管理所有 AI 修图工具的注册、查询和调用。"""

    def __init__(self, session, history):
        self._session = session
        self._history = history
        self._tools: dict[str, dict] = {}
        self._handlers: dict[str, Callable] = {}
        self._load()

    def _load(self):
        """从 tools/ 包收集所有工具定义并注册。"""
        for tool_def in collect_tools():
            name = tool_def["name"]
            self._tools[name] = {
                "name": name,
                "description": tool_def["description"],
                "parameters": tool_def["parameters"],
            }
            self._handlers[name] = tool_def["handler"]

    def get_schemas(self) -> list[dict]:
        """返回所有工具的 JSON Schema（OpenAI function-calling 格式）。"""
        return [
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["parameters"],
                },
            }
            for t in self._tools.values()
        ]

    def list_names(self) -> list[str]:
        return list(self._tools.keys())

    def call(self, name: str, arguments: dict[str, Any]) -> Any:
        """调用指定工具。抛出 KeyError（工具不存在）或 ValueError（参数非法）。"""
        handler = self._handlers.get(name)
        if handler is None:
            raise KeyError(name)
        snapshot = {"params": self._session.params_snapshot()}
        history_depth = self._history.depth
        result = handler(arguments, self._session, self._history)
        self._history.attach_snapshot(snapshot, history_depth)
        return result

    def get_tool(self, name: str) -> dict | None:
        return self._tools.get(name)
