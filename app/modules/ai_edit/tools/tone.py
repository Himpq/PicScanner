"""影调工具：曝光、对比度、高光、阴影、白色、黑色。"""

from __future__ import annotations

from ..context.session import EditSession
from ..context.history import OperationHistory

# ─── 参数范围 ────────────────────────────────────────────────────

RANGES = {
    "exposure": (-5.0, 5.0),       # EV
    "contrast": (-100, 100),
    "highlights": (-100, 100),
    "shadows": (-100, 100),
    "whites": (-100, 100),
    "blacks": (-100, 100),
}


def _clamp(key: str, value):
    lo, hi = RANGES[key]
    return max(lo, min(hi, float(value)))


# ─── Handler ─────────────────────────────────────────────────────

def handle_adjust_tone(arguments: dict, session: EditSession, history: OperationHistory):
    """调整影调参数（曝光/对比度/高光/阴影/白色/黑色）。"""
    applied = {}
    for key in RANGES:
        if key in arguments:
            val = _clamp(key, arguments[key])
            session.set_param(key, val)
            applied[key] = val

    if not applied:
        raise ValueError(f"至少提供一个参数：{', '.join(RANGES.keys())}")

    history.push("adjust_tone", applied)
    return {"applied": applied, "include_snapshot": False}


def handle_set_exposure(arguments: dict, session: EditSession, history: OperationHistory):
    """单独设置曝光补偿（EV）。"""
    if "value" not in arguments:
        raise ValueError("缺少 value 参数")
    val = _clamp("exposure", arguments["value"])
    session.set_param("exposure", val)
    history.push("set_exposure", {"exposure": val})
    return {"applied": {"exposure": val}}


# ─── 工具定义 ────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "adjust_tone",
        "description": (
            "调整照片影调参数。可一次性设置多个参数。"
            "exposure 为曝光补偿(EV)，正值提亮负值压暗；"
            "contrast 控制整体反差；highlights/shadows 分别恢复高光/阴影细节；"
            "whites/blacks 设定白场/黑场裁切点。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "exposure": {"type": "number", "description": "曝光补偿 EV", "minimum": -5, "maximum": 5},
                "contrast": {"type": "number", "description": "对比度", "minimum": -100, "maximum": 100},
                "highlights": {"type": "number", "description": "高光压制/恢复", "minimum": -100, "maximum": 100},
                "shadows": {"type": "number", "description": "阴影提亮/压暗", "minimum": -100, "maximum": 100},
                "whites": {"type": "number", "description": "白场调整", "minimum": -100, "maximum": 100},
                "blacks": {"type": "number", "description": "黑场调整", "minimum": -100, "maximum": 100},
            },
            "additionalProperties": False,
        },
        "handler": handle_adjust_tone,
    },
    {
        "name": "set_exposure",
        "description": "单独设置曝光补偿值（EV），范围 -5 到 +5。",
        "parameters": {
            "type": "object",
            "properties": {
                "value": {"type": "number", "description": "曝光补偿 EV", "minimum": -5, "maximum": 5},
            },
            "required": ["value"],
            "additionalProperties": False,
        },
        "handler": handle_set_exposure,
    },
]
