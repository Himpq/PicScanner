"""返回内容格式化：将工具执行的原始结果转为 LLM 友好的结构化文本。"""

from __future__ import annotations

from typing import Any


def format_tool_result(tool_name: str, raw: Any, session) -> str:
    """将工具返回值格式化为模型可读的文本。

    策略：
    - 简单确认类操作 → 一句话确认 + 当前值
    - 批量参数修改 → 表格化列出变更
    - 查询类 → 结构化数据
    """
    if isinstance(raw, dict):
        return _format_dict(tool_name, raw, session)
    if isinstance(raw, list):
        return _format_list(tool_name, raw)
    return str(raw)


def _format_dict(tool_name: str, data: dict, session) -> str:
    parts = []

    # 操作确认
    if "applied" in data:
        parts.append(f"已应用 {tool_name}：")
        for key, val in data["applied"].items():
            parts.append(f"  {key} = {val}")

    # 提示信息
    if "note" in data:
        parts.append(f"备注：{data['note']}")

    # 当前完整参数快照（可选）
    if data.get("include_snapshot"):
        params = session.get_params()
        parts.append("\n当前完整参数：")
        for k, v in sorted(params.items()):
            if v != _default_value(k):
                parts.append(f"  {k} = {v}")

    # 通用键值
    skip_keys = {"applied", "note", "include_snapshot"}
    for k, v in data.items():
        if k in skip_keys:
            continue
        parts.append(f"{k}: {v}")

    return "\n".join(parts) if parts else "操作完成"


def _format_list(tool_name: str, data: list) -> str:
    if not data:
        return "（空）"
    lines = [f"{tool_name} 结果（{len(data)} 项）："]
    for item in data:
        if isinstance(item, dict):
            lines.append("  " + ", ".join(f"{k}={v}" for k, v in item.items()))
        else:
            lines.append(f"  {item}")
    return "\n".join(lines)


def format_session_summary(session) -> str:
    """生成当前会话的摘要文本，供 prompt 注入。"""
    params = session.get_params()
    active = {k: v for k, v in params.items() if v != _default_value(k)}
    if not active:
        return "当前无任何调整参数。"
    lines = ["当前已调整参数："]
    for k, v in sorted(active.items()):
        lines.append(f"  {k} = {v}")
    return "\n".join(lines)


# ─── 参数默认值表（用于判断是否为非默认值）─────────────────────

_DEFAULTS = {
    "exposure": 0,
    "contrast": 0,
    "highlights": 0,
    "shadows": 0,
    "whites": 0,
    "blacks": 0,
    "temperature": 6500,
    "tint": 0,
    "saturation": 0,
    "vibrance": 0,
    "clarity": 0,
    "dehaze": 0,
    "sharpening": 0,
    "grain": 0,
    "vignette": 0,
    "vignetteFeather": 58,
    "blackWhite": 0,
    "splitToneBalance": 0,
}


def _default_value(key: str):
    return _DEFAULTS.get(key, 0)
