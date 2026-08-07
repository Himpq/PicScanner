"""AI修图模块后端入口。

遵循 PicScanner 模块插件协议（setup + api_methods），对外暴露：
  - list_tools()      获取所有工具的 JSON Schema 定义
  - call_tool(name, arguments)  执行指定工具
  - get_system_prompt()  获取系统提示词
  - get_session_state()  获取兼容会话状态
  - reset_session()   重置兼容会话
  - start_agent_run()   启动视觉 Agent 运行
  - continue_agent_run() 接收观察图并推进运行
  - cancel_agent_run()  取消运行
"""

from __future__ import annotations

import traceback
from pathlib import Path

from .registry import ToolRegistry
from .context.session import EditSession
from .context.history import OperationHistory
from .prompts import build_system_prompt
from .formatter import format_tool_result
from .engine import LLMEngine, EngineError
from .agent_runtime import AgentRunCancelled, AgentRunError, AgentRunManager

# LLM 配置默认值（存入 data/module_configs/ai_edit.json）
_CONFIG_DEFAULTS = {
    "api_base": "",              # LLM API 地址（OpenAI 兼容，如 https://api.openai.com/v1）
    "api_key": "",               # API 密钥
    "model": "",                 # 模型名称（如 gpt-4o, claude-sonnet-4-20250514）
    "max_tokens": 4096,          # 单次回复最大 token
    "temperature": 0.3,          # 生成温度（修图建议偏低，减少随机性）
    "top_p": 1.0,                # 核采样
    "timeout": 60,               # 单次请求超时（秒）
    "max_tool_rounds": 10,       # tool-calling 循环最大轮次（防无限）
    "proxy": "",                 # HTTP 代理（如 http://127.0.0.1:7890）
    "system_prompt_override": "",# 自定义系统提示词（空=使用内置）
    "is_vision": False,          # 是否为视觉模型（开启后随消息传入照片）
    "image_max_side": 1024,      # 传图前长边压缩上限（px）
    "max_agent_iterations": 4,   # 自动渲染-观察-微调的最大调整轮次
}


class AiEditModule:
    key = "ai_edit"

    def setup(self, ctx):
        ctx = ctx or {}
        data_dir = ctx.get("data_dir")
        self.data_dir = Path(data_dir) if data_dir else None
        self.storage = ctx.get("storage")
        self.config = ctx.get("config")  # PluginConfig 实例
        self._push = ctx.get("push")    # 前端事件推送回调（流式输出用）

        # 确保 LLM 配置有默认值
        if self.config:
            for k, v in _CONFIG_DEFAULTS.items():
                if self.config.get(k) is None:
                    self.config.set(k, v)

        self.session = EditSession()
        self.history = OperationHistory()
        self.registry = ToolRegistry(self.session, self.history)
        self.engine = LLMEngine(self.config, self.registry, self.session, self.history)
        self.agent_runs = AgentRunManager(self.config)

    def api_methods(self):
        return {
            "list_tools": self._list_tools,
            "call_tool": self._call_tool,
            "get_system_prompt": self._get_system_prompt,
            "get_session_state": self._get_session_state,
            "reset_session": self._reset_session,
            "chat": self._chat,
            "start_agent_run": self._start_agent_run,
            "continue_agent_run": self._continue_agent_run,
            "cancel_agent_run": self._cancel_agent_run,
            "validate_config": self._validate_config,
        }

    # ─── 内部实现 ───────────────────────────────────────────────

    def _list_tools(self):
        """返回所有工具的 JSON Schema 列表，可直接喂给 LLM tools 参数。"""
        return {"success": True, "tools": self.registry.get_schemas()}

    def _call_tool(self, name, arguments=None):
        """执行工具调用，返回格式化结果。"""
        arguments = arguments or {}
        try:
            raw = self.registry.call(name, arguments)
            formatted = format_tool_result(name, raw, self.session)
            return {"success": True, "result": formatted}
        except KeyError:
            return {"success": False, "error": f"未知工具: {name}"}
        except ValueError as exc:
            return {"success": False, "error": f"参数错误: {exc}"}
        except Exception as exc:
            return {"success": False, "error": f"执行失败: {exc}"}

    def _get_system_prompt(self, context_hint=None):
        """组装系统提示词。context_hint 可选，传入用户场景描述以动态注入。"""
        prompt = build_system_prompt(
            tools=self.registry.get_schemas(),
            session=self.session,
            context_hint=context_hint,
        )
        return {"success": True, "prompt": prompt}

    def _get_session_state(self):
        """获取当前编辑会话的完整状态快照。"""
        return {
            "success": True,
            "session": self.session.snapshot(),
            "history": self.history.summary(),
        }

    def _reset_session(self):
        """重置会话（清空参数、历史）。"""
        self.session.reset()
        self.history.clear()
        return {"success": True, "message": "会话已重置"}

    def _chat(self, message, conversation=None, image_path=None, image_data_url=None, stream_id=None):
        """LLM 对话入口：用户输入 → tool-calling 循环 → 最终回复（流式）。

        Args:
            message: 用户本轮文本
            conversation: 可选历史 messages（前端缓存传入）
            image_path: 原始照片路径（视觉模型、无渲染图时使用）
            image_data_url: 编辑后的渲染图 data URL（前端截图，优先）
            stream_id: 可选流通道 ID。提供时经 push 回调向前端推送
                {"type": "delta"/"tools", ..., "stream_id": ...} 事件，
                最终结果仍经返回值交付（前端以此为准收尾）。
        """
        sid = str(stream_id or "").strip()

        def on_event(evt):
            if self._push and sid:
                self._push("ai_edit_stream", {"stream_id": sid, **evt})

        try:
            result = self.engine.chat(
                str(message or ""), conversation,
                image_path=image_path, image_data_url=image_data_url,
                on_event=on_event,
            )
            return {"success": True, **result}
        except EngineError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            return {"success": False, "error": f"引擎异常: {exc}"}

    def _agent_emit(self, run_id, event):
        if not self._push:
            return
        self._push("ai_edit_agent", {"run_id": str(run_id or ""), **event})

    def _start_agent_run(
        self,
        run_id,
        message,
        conversation=None,
        photo_id=None,
        current_params=None,
        image_path=None,
        image_data_url=None,
    ):
        """创建独立运行并执行首次分析与工具调用。"""
        try:
            run = self.agent_runs.start(
                run_id,
                photo_id,
                message,
                current_params or {},
                conversation or [],
            )
            return run.execute_initial(
                str(image_path or ""),
                str(image_data_url or ""),
                lambda event: self._agent_emit(run.run_id, event),
            )
        except AgentRunCancelled:
            return {
                "success": True,
                "run_id": str(run_id or ""),
                "status": "cancelled",
                "stop_reason": "user_cancelled",
            }
        except (AgentRunError, EngineError) as exc:
            print(f"[AiEditAgent] 启动失败 run_id={run_id}: {exc}", flush=True)
            return {"success": False, "run_id": str(run_id or ""), "error": str(exc)}
        except Exception as exc:
            print(f"[AiEditAgent] 启动异常 run_id={run_id}: {exc}", flush=True)
            traceback.print_exc()
            return {
                "success": False,
                "run_id": str(run_id or ""),
                "error": f"Agent 启动异常: {exc}",
            }

    def _continue_agent_run(self, run_id, image_data_url=None):
        """接收前端真实渲染画面，推进观察与反思阶段。"""
        try:
            run = self.agent_runs.get(run_id)
            return run.continue_with_observation(
                str(image_data_url or ""),
                lambda event: self._agent_emit(run.run_id, event),
            )
        except AgentRunCancelled:
            return {
                "success": True,
                "run_id": str(run_id or ""),
                "status": "cancelled",
                "stop_reason": "user_cancelled",
            }
        except (AgentRunError, EngineError) as exc:
            print(f"[AiEditAgent] 推进失败 run_id={run_id}: {exc}", flush=True)
            return {"success": False, "run_id": str(run_id or ""), "error": str(exc)}
        except Exception as exc:
            print(f"[AiEditAgent] 推进异常 run_id={run_id}: {exc}", flush=True)
            traceback.print_exc()
            return {
                "success": False,
                "run_id": str(run_id or ""),
                "error": f"Agent 推进异常: {exc}",
            }

    def _cancel_agent_run(self, run_id):
        """请求取消正在流式响应或等待观察的运行。"""
        try:
            run = self.agent_runs.cancel(run_id)
            self._agent_emit(run.run_id, {
                "type": "cancelled",
                "label": "已停止自动优化",
                "iteration": run.iteration,
            })
            return {"success": True, "run_id": run.run_id, "status": "cancelling"}
        except AgentRunError as exc:
            return {"success": False, "run_id": str(run_id or ""), "error": str(exc)}

    def _validate_config(self):
        """检查 LLM 配置是否就绪。"""
        try:
            return {"success": True, **self.engine.validate_config()}
        except EngineError as exc:
            return {"success": False, "error": str(exc)}


MODULE_CLASS = AiEditModule
