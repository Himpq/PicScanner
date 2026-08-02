"""tools 包：自动收集所有工具定义。

每个工具模块导出 TOOLS 列表，每项格式：
{
    "name": str,
    "description": str,
    "parameters": {JSON Schema},
    "handler": callable(arguments: dict, session, history) -> Any,
}
"""

from __future__ import annotations

from . import tone, color, curves, detail, effects, session_ops

_MODULES = [tone, color, curves, detail, effects, session_ops]


def collect_tools() -> list[dict]:
    """收集所有工具模块的 TOOLS 定义，返回扁平列表。"""
    tools = []
    for mod in _MODULES:
        tools.extend(getattr(mod, "TOOLS", []))
    return tools
