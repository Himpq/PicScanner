"""会话操作工具：重置、查询当前状态、撤销。"""

from __future__ import annotations

from ..context.session import EditSession
from ..context.history import OperationHistory


# ─── Handler ─────────────────────────────────────────────────────

def handle_get_params(arguments: dict, session: EditSession, history: OperationHistory):
    """查询当前所有参数值。"""
    params = session.get_params()
    # 只返回非默认值，减少 token 消耗
    from ..formatter import _default_value
    active = {k: v for k, v in params.items() if v != _default_value(k)}
    return {
        "active_params": active,
        "total_params_count": len(params),
        "note": "仅列出非默认值参数" if active else "所有参数均为默认值",
    }


def handle_reset_all(arguments: dict, session: EditSession, history: OperationHistory):
    """重置所有调整参数为默认值。"""
    session.reset()
    history.push("reset_all", {})
    return {"applied": {"all": "已重置为默认值"}}


def handle_undo(arguments: dict, session: EditSession, history: OperationHistory):
    """撤销上一步操作。"""
    entry = history.pop()
    if entry is None:
        return {"note": "没有可撤销的操作"}

    # 恢复操作前的参数快照
    if "snapshot_before" in entry:
        session.restore_snapshot(entry["snapshot_before"])

    return {
        "undone": entry.get("action", "unknown"),
        "note": f"已撤销: {entry.get('action')}",
    }


# ─── 工具定义 ────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "get_current_params",
        "description": "查询当前编辑会话中所有已调整的参数值（仅返回非默认值）。",
        "parameters": {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
        "handler": handle_get_params,
    },
    {
        "name": "reset_all_params",
        "description": "将所有调整参数重置为默认值（相当于原图）。",
        "parameters": {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
        "handler": handle_reset_all,
    },
    {
        "name": "undo_last",
        "description": "撤销上一步参数调整操作，恢复到操作前的状态。",
        "parameters": {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
        "handler": handle_undo,
    },
]
