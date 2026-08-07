"""AI 修图 Agent 运行状态机。

后端持有运行状态与停止条件；前端只负责把参数渲染成真实画面并回传观察图。
"""

from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass, field
from typing import Callable

from .context.history import OperationHistory
from .context.session import EditSession
from .engine import EngineError, LLMEngine
from .registry import ToolRegistry


class AgentRunError(Exception):
    """运行不存在、状态非法或观察数据错误。"""


class AgentRunCancelled(Exception):
    """用户主动终止运行。"""


def _params_signature(params: dict) -> str:
    return json.dumps(params, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _review_prompt(goal: str, iteration: int, final_only: bool) -> str:
    if final_only:
        return f"""这是目标“{goal}”应用最后一轮调整后的真实渲染结果。
请只观察画面并给出最终总结，不要调用任何工具。说明效果是否达到目标以及主要调整。"""
    return f"""这是目标“{goal}”第 {iteration} 轮调整后的真实渲染结果。
请重新观察整张照片，而不是只复述参数。如果仍有明显问题，调用工具做一轮必要的微调；
如果已经达到目标，不要调用工具，直接给出简洁的最终总结。"""


@dataclass
class AgentRun:
    run_id: str
    photo_id: str
    goal: str
    config: object
    initial_params: dict
    conversation: list[dict]
    max_iterations: int
    created_at: float = field(default_factory=time.time)
    status: str = "created"
    iteration: int = 0
    stop_reason: str = ""

    def __post_init__(self):
        self.cancel_event = threading.Event()
        self.lock = threading.RLock()
        self.session = EditSession()
        self.session.replace_params(self.initial_params)
        self.session.bind_photo(self.photo_id)
        self.history = OperationHistory()
        self.registry = ToolRegistry(self.session, self.history)
        self.engine = LLMEngine(self.config, self.registry, self.session, self.history)
        self.public_conversation = [
            {"role": message.get("role"), "content": str(message.get("content") or "")}
            for message in self.conversation
            if (
                isinstance(message, dict)
                and message.get("role") in {"user", "assistant"}
                and isinstance(message.get("content"), str)
                and str(message.get("content") or "").strip()
            )
        ]
        self.conversation = [
            dict(message)
            for message in self.conversation
            if isinstance(message, dict) and message.get("role") != "system"
        ]

    def cancel(self):
        self.cancel_event.set()

    def _ensure_active(self):
        if self.cancel_event.is_set():
            self.status = "cancelled"
            self.stop_reason = "user_cancelled"
            raise AgentRunCancelled("任务已取消")

    def _emit_phase(self, emit: Callable[[dict], None], phase: str, label: str):
        self.status = phase
        emit({
            "type": "phase",
            "phase": phase,
            "label": label,
            "iteration": self.iteration,
            "max_iterations": self.max_iterations,
        })

    def execute_initial(self, image_path: str, image_data_url: str, emit: Callable[[dict], None]) -> dict:
        with self.lock:
            if self.status != "created":
                raise AgentRunError(f"运行状态错误: {self.status}")
            self._ensure_active()
            self._emit_phase(emit, "analyzing", "分析当前画面并制定调整方案")
            return self._execute_model_step(
                self.goal,
                image_path=image_path,
                image_data_url=image_data_url,
                emit=emit,
                allow_tools=True,
            )

    def continue_with_observation(self, image_data_url: str, emit: Callable[[dict], None]) -> dict:
        with self.lock:
            if self.status != "awaiting_observation":
                raise AgentRunError(f"当前运行不等待观察图: {self.status}")
            if not str(image_data_url or "").startswith("data:image/"):
                raise AgentRunError("前端未回传有效的渲染观察图")
            self._ensure_active()
            final_only = self.iteration >= self.max_iterations
            label = "检查最终效果" if final_only else f"检查第 {self.iteration} 轮真实效果"
            self._emit_phase(emit, "reviewing", label)
            return self._execute_model_step(
                _review_prompt(self.goal, self.iteration, final_only),
                image_path="",
                image_data_url=image_data_url,
                emit=emit,
                allow_tools=not final_only,
            )

    def _execute_model_step(
        self,
        message: str,
        *,
        image_path: str,
        image_data_url: str,
        emit: Callable[[dict], None],
        allow_tools: bool,
    ) -> dict:
        self._ensure_active()
        before_signature = _params_signature(self.session.get_params())

        def on_engine_event(event: dict):
            self._ensure_active()
            emit(event)

        try:
            result = self.engine.chat(
                message,
                self.conversation,
                image_path=image_path,
                image_data_url=image_data_url,
                on_event=on_engine_event,
                should_cancel=self.cancel_event.is_set,
                allow_tools=allow_tools,
            )
        except EngineError as exc:
            if self.cancel_event.is_set():
                self.status = "cancelled"
                self.stop_reason = "user_cancelled"
                raise AgentRunCancelled("任务已取消") from exc
            self.status = "failed"
            self.stop_reason = "engine_error"
            raise

        self._ensure_active()
        self.conversation = [
            message
            for message in result.get("messages", [])
            if isinstance(message, dict) and message.get("role") != "system"
        ]
        changed = _params_signature(self.session.get_params()) != before_signature

        if changed:
            self.iteration += 1
            self.status = "awaiting_observation"
            emit({
                "type": "phase",
                "phase": "rendering",
                "label": f"渲染第 {self.iteration} 轮调整",
                "iteration": self.iteration,
                "max_iterations": self.max_iterations,
            })
        else:
            self.status = "completed"
            self.stop_reason = "goal_satisfied" if allow_tools else "iteration_limit"
            emit({
                "type": "completed",
                "stop_reason": self.stop_reason,
                "iteration": self.iteration,
            })

        return self.payload(result, changed)

    def payload(self, result: dict, changed: bool) -> dict:
        public_messages = list(self.public_conversation)
        if self.status == "completed":
            public_messages.extend([
                {"role": "user", "content": self.goal},
                {"role": "assistant", "content": str(result.get("reply") or "自动优化完成")},
            ])
        return {
            "success": True,
            "run_id": self.run_id,
            "photo_id": self.photo_id,
            "status": self.status,
            "iteration": self.iteration,
            "max_iterations": self.max_iterations,
            "stop_reason": self.stop_reason,
            "changed": changed,
            "reply": str(result.get("reply") or ""),
            "tool_calls": list(result.get("tool_calls") or []),
            "messages": public_messages,
            "params_snapshot": self.session.get_params(),
            "active_params": self.session.get_active_params(),
        }


class AgentRunManager:
    """创建、推进和取消 Agent 运行，并限制已完成运行的保留数量。"""

    MAX_RETAINED_RUNS = 24

    def __init__(self, config):
        self._config = config
        self._runs: dict[str, AgentRun] = {}
        self._lock = threading.RLock()

    def start(
        self,
        run_id: str,
        photo_id: str,
        goal: str,
        initial_params: dict,
        conversation: list[dict],
    ) -> AgentRun:
        clean_run_id = str(run_id or "").strip()
        clean_photo_id = str(photo_id or "").strip()
        clean_goal = str(goal or "").strip()
        if not clean_run_id:
            raise AgentRunError("缺少 run_id")
        if not clean_photo_id:
            raise AgentRunError("缺少 photo_id")
        if not clean_goal:
            raise AgentRunError("修图目标不能为空")
        if not bool(self._config.get("is_vision")):
            raise AgentRunError("自动循环优化必须启用视觉模型")
        max_iterations = max(1, min(8, int(self._config.get("max_agent_iterations") or 4)))
        with self._lock:
            existing = self._runs.get(clean_run_id)
            if existing and existing.status not in {"completed", "cancelled", "failed"}:
                raise AgentRunError(f"运行 ID 已存在: {clean_run_id}")
            run = AgentRun(
                run_id=clean_run_id,
                photo_id=clean_photo_id,
                goal=clean_goal,
                config=self._config,
                initial_params=initial_params if isinstance(initial_params, dict) else {},
                conversation=conversation if isinstance(conversation, list) else [],
                max_iterations=max_iterations,
            )
            self._runs[clean_run_id] = run
            self._prune_locked()
            return run

    def get(self, run_id: str) -> AgentRun:
        with self._lock:
            run = self._runs.get(str(run_id or "").strip())
        if run is None:
            raise AgentRunError("Agent 运行不存在或已过期")
        return run

    def cancel(self, run_id: str) -> AgentRun:
        run = self.get(run_id)
        run.cancel()
        return run

    def _prune_locked(self):
        if len(self._runs) <= self.MAX_RETAINED_RUNS:
            return
        terminal = sorted(
            (
                run for run in self._runs.values()
                if run.status in {"completed", "cancelled", "failed"}
            ),
            key=lambda run: run.created_at,
        )
        for run in terminal[:max(0, len(self._runs) - self.MAX_RETAINED_RUNS)]:
            self._runs.pop(run.run_id, None)
