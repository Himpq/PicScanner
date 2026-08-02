"""会话操作工具：应用参数到照片、重置、查询当前状态、撤销。"""

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


def handle_apply_to_photo(arguments: dict, session: EditSession, history: OperationHistory):
    """将当前参数应用到指定照片（生成渲染指令）。

    实际像素处理由前端 Worker 执行，此处仅生成指令包。
    """
    photo_id = arguments.get("photo_id")
    if not photo_id:
        raise ValueError("缺少 photo_id")

    params = session.get_params()
    # 生成渲染指令（前端接收后交给 Worker 处理）
    render_command = {
        "type": "ai_edit_render",
        "photo_id": photo_id,
        "params": params,
    }
    session.mark_applied(photo_id)
    history.push("apply_to_photo", {"photo_id": photo_id})
    return {
        "render_command": render_command,
        "note": f"已生成照片 {photo_id} 的渲染指令，参数共 {len(params)} 项",
    }


def handle_batch_apply(arguments: dict, session: EditSession, history: OperationHistory):
    """将当前参数批量应用到多张照片。"""
    photo_ids = arguments.get("photo_ids")
    if not photo_ids or not isinstance(photo_ids, list):
        raise ValueError("缺少 photo_ids 数组")

    params = session.get_params()
    commands = []
    for pid in photo_ids:
        commands.append({
            "type": "ai_edit_render",
            "photo_id": pid,
            "params": params,
        })
        session.mark_applied(pid)

    history.push("batch_apply", {"count": len(photo_ids)})
    return {
        "render_commands": commands,
        "note": f"已为 {len(photo_ids)} 张照片生成渲染指令",
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
    {
        "name": "apply_to_photo",
        "description": "将当前所有调整参数应用到指定照片，生成渲染指令。",
        "parameters": {
            "type": "object",
            "properties": {
                "photo_id": {"type": "string", "description": "目标照片 ID"},
            },
            "required": ["photo_id"],
            "additionalProperties": False,
        },
        "handler": handle_apply_to_photo,
    },
    {
        "name": "batch_apply",
        "description": "将当前参数批量应用到多张照片。",
        "parameters": {
            "type": "object",
            "properties": {
                "photo_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "目标照片 ID 列表",
                },
            },
            "required": ["photo_ids"],
            "additionalProperties": False,
        },
        "handler": handle_batch_apply,
    },
]
