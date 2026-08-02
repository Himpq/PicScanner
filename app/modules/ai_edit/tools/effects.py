"""效果工具：暗角、分离色调、黑白。"""

from __future__ import annotations

from ..context.session import EditSession
from ..context.history import OperationHistory

RANGES = {
    "vignette": (-100, 100),
    "vignetteFeather": (0, 100),
    "blackWhite": (0, 100),
    "splitToneShadowsHue": (0, 360),
    "splitToneShadowsStrength": (0, 100),
    "splitToneMidtonesHue": (0, 360),
    "splitToneMidtonesStrength": (0, 100),
    "splitToneHighlightsHue": (0, 360),
    "splitToneHighlightsStrength": (0, 100),
    "splitToneBalance": (-100, 100),
}


def _clamp(key: str, value):
    lo, hi = RANGES[key]
    return max(lo, min(hi, float(value)))


# ─── Handler ─────────────────────────────────────────────────────

def handle_adjust_vignette(arguments: dict, session: EditSession, history: OperationHistory):
    """调整暗角。"""
    applied = {}
    for key in ("vignette", "vignetteFeather"):
        if key in arguments:
            val = _clamp(key, arguments[key])
            session.set_param(key, val)
            applied[key] = val

    if not applied:
        raise ValueError("至少提供 vignette 或 vignetteFeather")

    history.push("adjust_vignette", applied)
    return {"applied": applied}


def handle_adjust_split_tone(arguments: dict, session: EditSession, history: OperationHistory):
    """调整分离色调（阴影/中间调/高光分别着色）。"""
    applied = {}
    split_keys = [k for k in RANGES if k.startswith("splitTone")]
    for key in split_keys:
        if key in arguments:
            val = _clamp(key, arguments[key])
            session.set_param(key, val)
            applied[key] = val

    if not applied:
        raise ValueError("至少提供一个分离色调参数")

    history.push("adjust_split_tone", applied)
    return {"applied": applied}


def handle_set_black_white(arguments: dict, session: EditSession, history: OperationHistory):
    """设置黑白混合程度。"""
    if "value" not in arguments:
        raise ValueError("缺少 value 参数")
    val = _clamp("blackWhite", arguments["value"])
    session.set_param("blackWhite", val)
    history.push("set_black_white", {"blackWhite": val})
    return {"applied": {"blackWhite": val}}


# ─── 工具定义 ────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "adjust_vignette",
        "description": (
            "调整暗角效果。vignette 负值压暗边角(经典暗角)、正值提亮边角；"
            "vignetteFeather 控制过渡柔和度(0=硬边 100=极柔和)。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "vignette": {"type": "number", "description": "暗角强度", "minimum": -100, "maximum": 100},
                "vignetteFeather": {"type": "number", "description": "羽化程度", "minimum": 0, "maximum": 100},
            },
            "additionalProperties": False,
        },
        "handler": handle_adjust_vignette,
    },
    {
        "name": "adjust_split_tone",
        "description": (
            "调整分离色调：为阴影/中间调/高光分别赋予不同色相。"
            "Hue 为色相角度(0-360)，Strength 为着色强度。"
            "Balance 控制阴影/高光着色的权重偏向(负=偏阴影 正=偏高光)。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "splitToneShadowsHue": {"type": "number", "minimum": 0, "maximum": 360},
                "splitToneShadowsStrength": {"type": "number", "minimum": 0, "maximum": 100},
                "splitToneMidtonesHue": {"type": "number", "minimum": 0, "maximum": 360},
                "splitToneMidtonesStrength": {"type": "number", "minimum": 0, "maximum": 100},
                "splitToneHighlightsHue": {"type": "number", "minimum": 0, "maximum": 360},
                "splitToneHighlightsStrength": {"type": "number", "minimum": 0, "maximum": 100},
                "splitToneBalance": {"type": "number", "minimum": -100, "maximum": 100},
            },
            "additionalProperties": False,
        },
        "handler": handle_adjust_split_tone,
    },
    {
        "name": "set_black_white",
        "description": "设置黑白转换程度。0=完全彩色，100=完全黑白。",
        "parameters": {
            "type": "object",
            "properties": {
                "value": {"type": "number", "description": "黑白程度", "minimum": 0, "maximum": 100},
            },
            "required": ["value"],
            "additionalProperties": False,
        },
        "handler": handle_set_black_white,
    },
]
