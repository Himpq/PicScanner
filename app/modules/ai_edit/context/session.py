"""编辑会话状态管理：维护当前照片的参数快照。"""

from __future__ import annotations

import copy
import time
from typing import Any


# 所有参数的默认值（与 quick_edit_worker.js 对齐）
DEFAULT_PARAMS: dict[str, Any] = {
    # 影调
    "exposure": 0,
    "contrast": 0,
    "highlights": 0,
    "shadows": 0,
    "whites": 0,
    "blacks": 0,
    # 色彩
    "temperature": 6500,
    "tint": 0,
    "saturation": 0,
    "vibrance": 0,
    # 细节
    "clarity": 0,
    "dehaze": 0,
    "sharpening": 0,
    "grain": 0,
    # 效果
    "vignette": 0,
    "vignetteFeather": 58,
    "blackWhite": 0,
    # 分离色调
    "splitToneShadowsHue": 220,
    "splitToneShadowsStrength": 0,
    "splitToneMidtonesHue": 35,
    "splitToneMidtonesStrength": 0,
    "splitToneHighlightsHue": 45,
    "splitToneHighlightsStrength": 0,
    "splitToneBalance": 0,
    # 曲线（特殊：列表类型）
    "curvePoints": [{"x": 0, "y": 0}, {"x": 100, "y": 100}],
}

# HSL 默认值（8 色带 × 3 通道）
HSL_COLORS = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"]
for _c in HSL_COLORS:
    DEFAULT_PARAMS[f"hsl_{_c}_hue"] = 0
    DEFAULT_PARAMS[f"hsl_{_c}_saturation"] = 0
    DEFAULT_PARAMS[f"hsl_{_c}_luminance"] = 0


class EditSession:
    """单次 AI 修图会话的状态容器。

    职责：
    - 维护当前参数集（与前端 quick_edit_worker 参数格式完全对齐）
    - 记录会话元信息（创建时间、关联照片、应用记录）
    - 提供快照/恢复能力（供 undo 使用）
    """

    def __init__(self):
        self._params: dict[str, Any] = copy.deepcopy(DEFAULT_PARAMS)
        self._created_at: float = time.time()
        self._photo_id: str | None = None
        self._applied_photos: list[str] = []
        self._metadata: dict[str, Any] = {}

    # ─── 参数操作 ────────────────────────────────────────────────

    def get_param(self, key: str) -> Any:
        return self._params.get(key, DEFAULT_PARAMS.get(key))

    def set_param(self, key: str, value: Any):
        self._params[key] = value

    def get_params(self) -> dict[str, Any]:
        """返回当前完整参数集的浅拷贝。"""
        return dict(self._params)

    def get_active_params(self) -> dict[str, Any]:
        """仅返回与默认值不同的参数（即实际被调整过的项）。"""
        return {k: v for k, v in self._params.items() if v != DEFAULT_PARAMS.get(k)}

    def set_params_batch(self, updates: dict[str, Any]):
        """批量设置参数。"""
        self._params.update(updates)

    # ─── 快照 / 恢复 ────────────────────────────────────────────

    def snapshot(self) -> dict[str, Any]:
        """生成完整会话快照（可序列化）。"""
        return {
            "params": copy.deepcopy(self._params),
            "photo_id": self._photo_id,
            "applied_photos": list(self._applied_photos),
            "created_at": self._created_at,
            "metadata": dict(self._metadata),
        }

    def restore_snapshot(self, snap: dict[str, Any]):
        """从快照恢复参数状态。"""
        if "params" in snap:
            self._params = copy.deepcopy(snap["params"])

    def params_snapshot(self) -> dict[str, Any]:
        """仅参数快照（轻量，供 history 记录）。"""
        return copy.deepcopy(self._params)

    # ─── 会话元信息 ──────────────────────────────────────────────

    def bind_photo(self, photo_id: str):
        self._photo_id = photo_id

    def mark_applied(self, photo_id: str):
        if photo_id not in self._applied_photos:
            self._applied_photos.append(photo_id)

    def set_metadata(self, key: str, value: Any):
        self._metadata[key] = value

    # ─── 重置 ───────────────────────────────────────────────────

    def reset(self):
        """重置所有参数为默认值，保留会话元信息。"""
        self._params = copy.deepcopy(DEFAULT_PARAMS)

    def full_reset(self):
        """完全重置（含元信息）。"""
        self.__init__()
