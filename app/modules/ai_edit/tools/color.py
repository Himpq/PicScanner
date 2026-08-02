"""色彩工具：色温、色调、饱和度、自然度、HSL 分色调整。"""

from __future__ import annotations

from ..context.session import EditSession
from ..context.history import OperationHistory

# ─── HSL 色带 ────────────────────────────────────────────────────

HSL_COLORS = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"]

# ─── 参数范围 ────────────────────────────────────────────────────

RANGES = {
    "temperature": (2000, 10000),   # 开尔文
    "tint": (-100, 100),
    "saturation": (-100, 100),
    "vibrance": (-100, 100),
}

HSL_RANGES = {
    "hue": (-60, 60),
    "saturation": (-100, 100),
    "luminance": (-100, 100),
}


def _clamp(key: str, value):
    lo, hi = RANGES[key]
    return max(lo, min(hi, float(value)))


def _clamp_hsl(channel: str, value):
    lo, hi = HSL_RANGES[channel]
    return max(lo, min(hi, float(value)))


def _normalize_temperature(value):
    """色温对齐到 50K 步长。"""
    clamped = max(2000, min(10000, float(value)))
    return round(clamped / 50) * 50


# ─── Handler ─────────────────────────────────────────────────────

def handle_adjust_color(arguments: dict, session: EditSession, history: OperationHistory):
    """调整全局色彩参数（色温/色调/饱和度/自然度）。"""
    applied = {}
    for key in ("temperature", "tint", "saturation", "vibrance"):
        if key in arguments:
            if key == "temperature":
                val = _normalize_temperature(arguments[key])
            else:
                val = _clamp(key, arguments[key])
            session.set_param(key, val)
            applied[key] = val

    if not applied:
        raise ValueError(f"至少提供一个参数：temperature, tint, saturation, vibrance")

    history.push("adjust_color", applied)
    return {"applied": applied}


def handle_adjust_hsl(arguments: dict, session: EditSession, history: OperationHistory):
    """调整 HSL 分色通道（色相偏移/饱和度/明度）。"""
    color_name = arguments.get("color", "").lower()
    if color_name not in HSL_COLORS:
        raise ValueError(f"color 须为：{', '.join(HSL_COLORS)}")

    applied = {}
    for channel in ("hue", "saturation", "luminance"):
        if channel in arguments:
            val = _clamp_hsl(channel, arguments[channel])
            param_key = f"hsl_{color_name}_{channel}"
            session.set_param(param_key, val)
            applied[param_key] = val

    if not applied:
        raise ValueError("至少提供 hue / saturation / luminance 之一")

    history.push("adjust_hsl", applied)
    return {"applied": applied}


# ─── 工具定义 ────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "adjust_color",
        "description": (
            "调整照片全局色彩。temperature 为色温(开尔文，低值偏蓝高值偏暖)；"
            "tint 为绿-品红偏移；saturation 全局饱和度；vibrance 自然饱和度(优先提升低饱和区域)。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "temperature": {"type": "number", "description": "色温(K)", "minimum": 2000, "maximum": 10000},
                "tint": {"type": "number", "description": "色调偏移(负=绿 正=品红)", "minimum": -100, "maximum": 100},
                "saturation": {"type": "number", "description": "全局饱和度", "minimum": -100, "maximum": 100},
                "vibrance": {"type": "number", "description": "自然饱和度", "minimum": -100, "maximum": 100},
            },
            "additionalProperties": False,
        },
        "handler": handle_adjust_color,
    },
    {
        "name": "adjust_hsl",
        "description": (
            "调整指定色相范围的 HSL 参数。"
            "color 可选：red/orange/yellow/green/aqua/blue/purple/magenta。"
            "hue 为色相偏移，saturation 为该色带饱和度，luminance 为明度。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "color": {
                    "type": "string",
                    "enum": HSL_COLORS,
                    "description": "目标色带",
                },
                "hue": {"type": "number", "description": "色相偏移", "minimum": -60, "maximum": 60},
                "saturation": {"type": "number", "description": "饱和度调整", "minimum": -100, "maximum": 100},
                "luminance": {"type": "number", "description": "明度调整", "minimum": -100, "maximum": 100},
            },
            "required": ["color"],
            "additionalProperties": False,
        },
        "handler": handle_adjust_hsl,
    },
]
