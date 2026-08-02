"""曲线工具：RGB 色调曲线调整。"""

from __future__ import annotations

from ..context.session import EditSession
from ..context.history import OperationHistory


def _validate_points(points) -> list[dict]:
    """校验并规范化曲线控制点。

    格式：[{x: 0-100, y: 0-100}, ...]，至少 2 点，首尾锚定 x=0 和 x=100。
    """
    if not isinstance(points, list) or len(points) < 2:
        raise ValueError("curvePoints 须为至少 2 个点的数组")

    clean = []
    for pt in points:
        if not isinstance(pt, dict):
            raise ValueError("每个控制点须为 {x, y} 对象")
        x = float(pt.get("x", -1))
        y = float(pt.get("y", -1))
        if not (0 <= x <= 100 and 0 <= y <= 100):
            raise ValueError(f"控制点 ({x}, {y}) 超出 [0,100] 范围")
        clean.append({"x": x, "y": y})

    clean.sort(key=lambda p: p["x"])

    # 确保首尾锚定
    if clean[0]["x"] > 0.5:
        clean.insert(0, {"x": 0, "y": 0})
    if clean[-1]["x"] < 99.5:
        clean.append({"x": 100, "y": 100})

    return clean


# ─── Handler ─────────────────────────────────────────────────────

def handle_set_curve(arguments: dict, session: EditSession, history: OperationHistory):
    """设置色调曲线控制点。"""
    if "points" not in arguments:
        raise ValueError("缺少 points 参数")

    points = _validate_points(arguments["points"])
    session.set_param("curvePoints", points)
    history.push("set_curve", {"points_count": len(points)})
    return {
        "applied": {"curvePoints": f"{len(points)} 个控制点"},
        "note": "曲线已更新，x 轴为输入亮度，y 轴为输出亮度，对角线为无调整。",
    }


def handle_reset_curve(arguments: dict, session: EditSession, history: OperationHistory):
    """重置曲线为线性（无调整）。"""
    default_points = [{"x": 0, "y": 0}, {"x": 100, "y": 100}]
    session.set_param("curvePoints", default_points)
    history.push("reset_curve", {})
    return {"applied": {"curvePoints": "线性（已重置）"}}


# ─── 工具定义 ────────────────────────────────────────────────────

POINTS_SCHEMA = {
    "type": "array",
    "description": "曲线控制点数组，x/y 均在 [0,100]。x=输入亮度 y=输出亮度。",
    "items": {
        "type": "object",
        "properties": {
            "x": {"type": "number", "minimum": 0, "maximum": 100},
            "y": {"type": "number", "minimum": 0, "maximum": 100},
        },
        "required": ["x", "y"],
    },
    "minItems": 2,
}

TOOLS = [
    {
        "name": "set_curve",
        "description": (
            "设置 RGB 色调曲线。控制点格式 [{x, y}]，x/y 范围 0-100。"
            "对角线(0,0)-(100,100)为无调整；S 形曲线增加对比度；"
            "提亮中间调可在 x=50 处设 y>50 的控制点。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "points": POINTS_SCHEMA,
            },
            "required": ["points"],
            "additionalProperties": False,
        },
        "handler": handle_set_curve,
    },
    {
        "name": "reset_curve",
        "description": "将色调曲线重置为线性（无任何调整）。",
        "parameters": {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
        "handler": handle_reset_curve,
    },
]
