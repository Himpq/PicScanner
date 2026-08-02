"""操作历史管理：记录每步操作，支持撤销。"""

from __future__ import annotations

import time
from typing import Any


class OperationHistory:
    """操作历史栈，支持 undo 和摘要生成。

    每条记录包含：
    - action: 工具名称
    - params: 本次操作修改的参数
    - timestamp: 时间戳
    - snapshot_before: 操作前的参数快照（供 undo 恢复）
    """

    MAX_ENTRIES = 100  # 防止无限增长

    def __init__(self):
        self._stack: list[dict[str, Any]] = []

    def push(self, action: str, params: dict, snapshot_before: dict | None = None):
        """记录一步操作。snapshot_before 由调用方在修改前获取。"""
        entry = {
            "action": action,
            "params": params,
            "timestamp": time.time(),
        }
        if snapshot_before is not None:
            entry["snapshot_before"] = snapshot_before
        self._stack.append(entry)

        # 裁剪
        if len(self._stack) > self.MAX_ENTRIES:
            self._stack = self._stack[-self.MAX_ENTRIES:]

    def pop(self) -> dict | None:
        """弹出最近一步操作（用于 undo）。"""
        if not self._stack:
            return None
        return self._stack.pop()

    def peek(self) -> dict | None:
        """查看最近一步但不弹出。"""
        return self._stack[-1] if self._stack else None

    def clear(self):
        self._stack.clear()

    @property
    def depth(self) -> int:
        return len(self._stack)

    def summary(self) -> dict[str, Any]:
        """生成历史摘要（供 API 返回）。"""
        return {
            "depth": self.depth,
            "recent": [
                {"action": e["action"], "params": e["params"]}
                for e in self._stack[-5:]
            ],
        }

    def to_context_text(self) -> str:
        """生成供 prompt 注入的操作历史文本。"""
        if not self._stack:
            return "暂无操作历史。"
        lines = [f"操作历史（最近 {min(len(self._stack), 10)} 步）："]
        for entry in self._stack[-10:]:
            params_str = ", ".join(f"{k}={v}" for k, v in entry["params"].items())
            lines.append(f"  [{entry['action']}] {params_str}")
        return "\n".join(lines)
