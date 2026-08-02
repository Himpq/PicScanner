"""细节工具：锐化、清晰度、去雾、颗粒。"""

from __future__ import annotations

from ..context.session import EditSession
from ..context.history import OperationHistory

RANGES = {
    "sharpening": (0, 100),
    "clarity": (-100, 100),
    "dehaze": (-100, 100),
    "grain": (0, 100),
}


def _clamp(key: str, value):
    lo, hi = RANGES[key]
    return max(lo, min(hi, float(value)))


# ─── Handler ─────────────────────────────────────────────────────

def handle_adjust_detail(arguments: dict, session: EditSession, history: OperationHistory):
    """调整细节增强参数。"""
    applied = {}
    for key in RANGES:
        if key in arguments:
            val = _clamp(key, arguments[key])
            session.set_param(key, val)
            applied[key] = val

    if not applied:
        raise ValueError(f"至少提供一个参数：{', '.join(RANGES.keys())}")

    history.push("adjust_detail", applied)
    return {"applied": applied}


# ─── 工具定义 ────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "adjust_detail",
        "description": (
            "调整照片细节与质感。sharpening 锐化强度(0=无)；"
            "clarity 清晰度/局部对比(负值柔化)；dehaze 去雾/通透感；"
            "grain 胶片颗粒(0=无)。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "sharpening": {"type": "number", "description": "锐化强度", "minimum": 0, "maximum": 100},
                "clarity": {"type": "number", "description": "清晰度(负=柔化)", "minimum": -100, "maximum": 100},
                "dehaze": {"type": "number", "description": "去雾", "minimum": -100, "maximum": 100},
                "grain": {"type": "number", "description": "胶片颗粒", "minimum": 0, "maximum": 100},
            },
            "additionalProperties": False,
        },
        "handler": handle_adjust_detail,
    },
]
