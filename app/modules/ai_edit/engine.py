"""LLM tool-calling 引擎：组装消息 → 调 API → 解析 tool_calls → 执行 → 循环。

使用 OpenAI 兼容接口（/chat/completions），stdlib urllib 实现，无第三方依赖。
"""

from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import urllib.error
import urllib.request
from typing import Any

from .context.session import EditSession
from .context.history import OperationHistory
from .registry import ToolRegistry
from .formatter import format_tool_result
from .prompts import build_system_prompt


class EngineError(Exception):
    """引擎级错误（配置缺失、API 不可达等）。"""


class LLMEngine:
    """AI 修图的 LLM 调用引擎。

    职责：
    - 从 PluginConfig 读取连接配置
    - 管理多轮 messages（system + user + assistant + tool）
    - 执行 tool-calling 循环直到模型给出最终文本回复
    - 返回结构化结果供前端展示
    """

    def __init__(self, config, registry: ToolRegistry, session: EditSession, history: OperationHistory):
        self._config = config
        self._registry = registry
        self._session = session
        self._history = history
        self._image_cache: dict[str, tuple[float, str]] = {}  # path -> (mtime, data_url)

    # ─── 公开接口 ────────────────────────────────────────────────

    def chat(self, user_message: str, conversation: list[dict] | None = None,
             image_path: str | None = None, image_data_url: str | None = None,
             on_event=None, should_cancel=None, allow_tools: bool = True) -> dict:
        """处理一轮用户输入，返回完整结果。

        Args:
            user_message: 用户本轮输入
            conversation: 可选的历史 messages（前端维护），不含 system
            image_path: 原始照片路径（视觉模型开启、无编辑渲染图时使用）
            image_data_url: 编辑后的渲染图 data URL（前端截图，优先使用）
            on_event: 可选流式回调，接收以下事件：
                {"type": "delta", "text": str}    最终回复的增量文本
                {"type": "tools", "tools": [...]} 一轮工具调用执行完毕
            should_cancel: 可选取消检查函数
            allow_tools: False 时只允许模型观察并总结，不下发工具定义

        Returns:
            {
                "reply": str,           # 模型最终文本回复
                "tool_calls": [...],    # 本轮执行的所有工具调用记录
                "messages": [...],      # 完整 messages（含本轮，供前端缓存）
                "params_snapshot": {},  # 当前参数快照
            }
        """
        cfg = self._read_config()
        messages = self._build_messages(cfg, user_message, conversation, image_path, image_data_url)
        tools_schema = self._registry.get_schemas() if allow_tools else []

        def _emit(evt: dict) -> None:
            if on_event is not None:
                try:
                    on_event(evt)
                except Exception as exc:
                    print(f"[AiEdit] on_event 回调异常: {exc}", flush=True)

        def _on_delta(text: str) -> None:
            _emit({"type": "delta", "text": text})

        tool_records = []
        rounds = 0
        max_rounds = cfg["max_tool_rounds"] if allow_tools else 1

        while rounds < max_rounds:
            if should_cancel is not None and should_cancel():
                raise EngineError("任务已取消")
            rounds += 1
            response = self._call_api_stream(
                cfg,
                messages,
                tools_schema,
                on_delta=_on_delta,
                should_cancel=should_cancel,
            )

            choice = response["choices"][0]
            msg = choice["message"]
            finish_reason = choice.get("finish_reason", "")

            # 模型返回最终文本
            if finish_reason == "stop" or not msg.get("tool_calls"):
                reply_text = msg.get("content") or ""
                messages.append({"role": "assistant", "content": reply_text})
                return {
                    "reply": reply_text,
                    "tool_calls": tool_records,
                    "messages": self._strip_images(messages),
                    "params_snapshot": self._session.get_params(),
                    "active_params": self._session.get_active_params(),
                }

            # 模型请求工具调用
            messages.append(msg)  # assistant message with tool_calls
            round_records = []
            for tc in msg["tool_calls"]:
                if should_cancel is not None and should_cancel():
                    raise EngineError("任务已取消")
                fn_name = tc["function"]["name"]
                try:
                    fn_args = json.loads(tc["function"]["arguments"])
                except (json.JSONDecodeError, TypeError):
                    fn_args = {}

                # 执行工具
                try:
                    raw = self._registry.call(fn_name, fn_args)
                    result_text = format_tool_result(fn_name, raw, self._session)
                except (KeyError, ValueError, Exception) as exc:
                    result_text = f"错误: {exc}"

                record = {
                    "id": tc.get("id", ""),
                    "name": fn_name,
                    "arguments": fn_args,
                    "result": result_text,
                }
                tool_records.append(record)
                round_records.append(record)

                # 工具结果回填 messages
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.get("id", ""),
                    "content": result_text,
                })

            # 本轮工具执行完毕 → 通知前端（agent 式活动展示）
            _emit({"type": "tools", "tools": round_records})

        # 超过最大轮次
        return {
            "reply": f"已达到最大工具调用轮次（{max_rounds}），操作可能未完成。",
            "tool_calls": tool_records,
            "messages": self._strip_images(messages),
            "params_snapshot": self._session.get_params(),
            "active_params": self._session.get_active_params(),
        }

    def validate_config(self) -> dict:
        """检查配置是否完整，返回 {ready, missing}。"""
        cfg = self._read_config()
        missing = []
        if not cfg["api_base"]:
            missing.append("api_base")
        if not cfg["api_key"]:
            missing.append("api_key")
        if not cfg["model"]:
            missing.append("model")
        return {
            "ready": len(missing) == 0,
            "missing": missing,
            "is_vision": cfg["is_vision"],
        }

    # ─── 内部实现 ────────────────────────────────────────────────

    def _read_config(self) -> dict:
        """从 PluginConfig 读取所有配置项。"""
        if self._config is None:
            raise EngineError("插件配置未初始化")
        return {
            "api_base": (self._config.get("api_base") or "").rstrip("/"),
            "api_key": self._config.get("api_key") or "",
            "model": self._config.get("model") or "",
            "max_tokens": int(self._config.get("max_tokens") or 4096),
            "temperature": float(self._config.get("temperature") or 0.3),
            "top_p": float(self._config.get("top_p") or 1.0),
            "timeout": int(self._config.get("timeout") or 60),
            "max_tool_rounds": int(self._config.get("max_tool_rounds") or 10),
            "proxy": self._config.get("proxy") or "",
            "system_prompt_override": self._config.get("system_prompt_override") or "",
            "is_vision": bool(self._config.get("is_vision")),
            "image_max_side": int(self._config.get("image_max_side") or 1024),
        }

    def _build_messages(self, cfg: dict, user_message: str, conversation: list[dict] | None,
                        image_path: str | None = None, image_data_url: str | None = None) -> list[dict]:
        """组装完整 messages 数组。"""
        # 系统提示词
        if cfg["system_prompt_override"]:
            system_text = cfg["system_prompt_override"]
        else:
            system_text = build_system_prompt(
                tools=self._registry.get_schemas(),
                session=self._session,
            )

        messages = [{"role": "system", "content": system_text}]

        # 历史对话（前端传入）
        if conversation:
            messages.extend(conversation)

        # 本轮用户输入（视觉模型开启时必须附带照片）。
        image_url = None
        if cfg["is_vision"]:
            if image_data_url:
                image_url = self._build_image_from_data_url(image_data_url, cfg["image_max_side"])
            elif image_path:
                image_url = self._build_image_content(image_path, cfg["image_max_side"])
            else:
                raise EngineError("视觉 Agent 缺少当前照片画面")

        if image_url:
            user_content = [
                {"type": "text", "text": user_message},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]
        else:
            user_content = user_message

        messages.append({"role": "user", "content": user_content})
        return messages

    def _build_image_content(self, image_path: str, max_side: int) -> str:
        """读取照片 → 压缩到长边 max_side → base64 data URL（带 mtime 缓存）。

        失败时直接终止本轮，避免模型在没有画面的情况下继续调参。
        """
        try:
            path = str(image_path or "")
            if not path or not os.path.exists(path):
                raise EngineError(f"照片文件不存在: {path}")
            mtime = os.path.getmtime(path)

            cached = self._image_cache.get(path)
            if cached and cached[0] == mtime:
                return cached[1]

            from PIL import Image  # 懒加载，避免无图场景的开销

            with Image.open(path) as im:
                im = im.convert("RGB")
                w, h = im.size
                scale = min(1.0, float(max_side) / max(w, h))
                if scale < 1.0:
                    im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
                buf = io.BytesIO()
                im.save(buf, format="JPEG", quality=85, optimize=True)
                b64 = base64.b64encode(buf.getvalue()).decode("ascii")

            data_url = f"data:image/jpeg;base64,{b64}"
            self._image_cache[path] = (mtime, data_url)
            return data_url
        except EngineError:
            raise
        except Exception as exc:
            raise EngineError(f"照片编码失败: {exc}") from exc

    def _build_image_from_data_url(self, data_url: str, max_side: int) -> str:
        """把前端传来的编辑后渲染图（data URL）压缩到长边 max_side 后返回。

        前端截图可能已是预览分辨率，这里统一再压一道，控制传给模型的体积。
        按内容哈希缓存，相同帧不重复编码。失败时直接终止本轮。
        """
        try:
            raw = str(data_url or "")
            if not raw.startswith("data:"):
                raise EngineError("渲染观察图不是 data URL")
            header, _, b64data = raw.partition(",")
            if not b64data:
                raise EngineError("渲染观察图缺少图像数据")

            # 内容哈希做缓存键（含 max_side，避免不同尺寸串用）
            cache_key = "dataurl:" + hashlib.md5(
                (b64data + f":{max_side}").encode("utf-8")
            ).hexdigest()
            cached = self._image_cache.get(cache_key)
            if cached:
                return cached[1]

            from PIL import Image

            src = base64.b64decode(b64data)
            with Image.open(io.BytesIO(src)) as im:
                im = im.convert("RGB")
                w, h = im.size
                scale = min(1.0, float(max_side) / max(w, h))
                if scale < 1.0:
                    im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
                buf = io.BytesIO()
                im.save(buf, format="JPEG", quality=85, optimize=True)
                out_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

            result = f"data:image/jpeg;base64,{out_b64}"
            self._image_cache[cache_key] = (0.0, result)
            return result
        except EngineError:
            raise
        except Exception as exc:
            raise EngineError(f"渲染观察图编码失败: {exc}") from exc

    @staticmethod
    def _strip_images(messages: list[dict]) -> list[dict]:
        """把多模态用户消息还原为纯文本，避免 base64 图片进入持久化会话。"""
        clean = []
        for m in messages:
            content = m.get("content")
            if isinstance(content, list):
                text_parts = [
                    part.get("text", "")
                    for part in content
                    if isinstance(part, dict) and part.get("type") == "text"
                ]
                m = dict(m)
                m["content"] = "\n".join(t for t in text_parts if t)
            clean.append(m)
        return clean

    def _call_api_stream(self, cfg: dict, messages: list[dict], tools: list[dict],
                         on_delta=None, should_cancel=None) -> dict:
        """调用 OpenAI 兼容 /chat/completions 接口（SSE 流式）。

        逐块解析 data: 行：content 增量实时回调 on_delta；tool_calls 按
        index 累积碎片（id / function.name / arguments）。最终组装成与非
        流式响应同构的 {"choices": [{"message": ..., "finish_reason": ...}]}，
        上层循环逻辑无需感知流式细节。
        """
        if not cfg["api_base"] or not cfg["api_key"] or not cfg["model"]:
            raise EngineError("LLM 配置不完整（需要 api_base, api_key, model）")

        url = f"{cfg['api_base']}/chat/completions"
        payload = {
            "model": cfg["model"],
            "messages": messages,
            "max_tokens": cfg["max_tokens"],
            "temperature": cfg["temperature"],
            "top_p": cfg["top_p"],
            "stream": True,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {cfg['api_key']}",
            },
            method="POST",
        )

        # 代理
        if cfg["proxy"]:
            proxy_handler = urllib.request.ProxyHandler({
                "http": cfg["proxy"],
                "https": cfg["proxy"],
            })
            opener = urllib.request.build_opener(proxy_handler)
        else:
            opener = urllib.request.build_opener()

        content = ""
        tool_acc: dict[int, dict] = {}  # index -> {"id", "name", "arguments"}
        finish_reason = ""

        try:
            with opener.open(req, timeout=cfg["timeout"]) as resp:
                for raw_line in resp:
                    if should_cancel is not None and should_cancel():
                        raise EngineError("任务已取消")
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line.startswith("data:"):
                        continue
                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
                    choices = chunk.get("choices") or []
                    if not choices:
                        continue
                    choice0 = choices[0]
                    delta = choice0.get("delta") or {}
                    fr = choice0.get("finish_reason")
                    if fr:
                        finish_reason = str(fr)

                    piece = delta.get("content")
                    if piece:
                        content += piece
                        if on_delta is not None:
                            try:
                                on_delta(piece)
                            except Exception as exc:
                                print(f"[AiEdit] on_delta 回调异常: {exc}", flush=True)

                    for tc in delta.get("tool_calls") or []:
                        idx = int(tc.get("index") or 0)
                        slot = tool_acc.setdefault(idx, {"id": "", "name": "", "arguments": ""})
                        if tc.get("id"):
                            slot["id"] = str(tc["id"])
                        fn = tc.get("function") or {}
                        if fn.get("name"):
                            slot["name"] += str(fn["name"])
                        if fn.get("arguments"):
                            slot["arguments"] += str(fn["arguments"])
        except urllib.error.HTTPError as exc:
            error_body = ""
            try:
                error_body = exc.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            raise EngineError(f"API 请求失败 [{exc.code}]: {error_body[:500]}") from exc
        except urllib.error.URLError as exc:
            raise EngineError(f"网络错误: {exc.reason}") from exc
        except TimeoutError:
            raise EngineError(f"请求超时（{cfg['timeout']}s）") from None

        msg: dict[str, Any] = {"role": "assistant", "content": content}
        if tool_acc:
            msg["tool_calls"] = [
                {
                    "id": slot["id"] or f"call_{idx}",
                    "type": "function",
                    "function": {"name": slot["name"], "arguments": slot["arguments"]},
                }
                for idx, slot in sorted(tool_acc.items())
            ]

        if not content and not tool_acc:
            raise EngineError("API 流式响应为空（未收到任何有效数据块）")

        return {"choices": [{"message": msg, "finish_reason": finish_reason}]}
