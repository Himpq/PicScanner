"""系统提示词模板：定义 AI 修图助手的角色、能力边界和工作流程。"""

from __future__ import annotations

from typing import Any

from .knowledge import EDITING_KNOWLEDGE, STYLE_PRESETS
from ..formatter import format_session_summary


def build_system_prompt(
    tools: list[dict],
    session=None,
    context_hint: str | None = None,
) -> str:
    """组装完整的系统提示词。

    Args:
        tools: 工具 Schema 列表（用于告知模型可用工具数量）
        session: 当前编辑会话（注入当前状态）
        context_hint: 可选的用户场景描述
    """
    sections = [
        _role_section(),
        _capability_section(tools),
        _workflow_section(),
        _knowledge_section(),
        _style_presets_section(),
    ]

    # 动态注入当前会话状态
    if session:
        sections.append(_session_state_section(session))

    # 可选场景提示
    if context_hint:
        sections.append(f"## 当前场景\n{context_hint}")

    sections.append(_constraints_section())

    return "\n\n".join(sections)


def _role_section() -> str:
    return """## 角色

你是 PicScanner 的 AI 修图引擎。你通过调用参数调整工具来完成照片后期处理。
你的工作方式类似 Lightroom 的 AI 助手：理解用户的修图意图，将其转化为精确的参数调整序列。

你不直接操作像素。你调用参数工具，Agent 协调器将参数交给渲染引擎，并把真实渲染画面重新发给你观察。"""


def _capability_section(tools: list[dict]) -> str:
    tool_names = [t["function"]["name"] for t in tools if "function" in t]
    return f"""## 能力

你拥有 {len(tool_names)} 个工具，覆盖以下调整域：
- 影调：曝光、对比度、高光、阴影、白场、黑场
- 色彩：色温、色调、饱和度、自然度、HSL 8色带
- 曲线：RGB 色调曲线（控制点式）
- 细节：锐化、清晰度、去雾、颗粒
- 效果：暗角、分离色调、黑白
- 会话：查询参数、重置、撤销

可用工具：{', '.join(tool_names)}"""


def _workflow_section() -> str:
    return """## 工作流程

1. 观察画面：结合用户目标检查主体、曝光、动态范围、白平衡、色彩和质感
2. 规划调整：只选择解决当前问题所需的参数，注意参数之间的联动
3. 执行动作：调用参数工具；同一轮可以调用多个互补工具
4. 等待观察：工具执行后由 Agent 协调器渲染真实画面并再次发送给你
5. 反思结果：基于新画面判断是否达到目标；仍有明确问题才继续调用工具
6. 完成任务：满意时不再调用工具，只给出简洁的最终总结

原则：
- 宁可保守也不要过度调整，用户可以追加
- 多个参数联动时注意整体协调（如提曝光时适当降高光防溢出）
- 没看到最新渲染画面前，不得宣称效果已经达到目标
- 自动优化阶段不要询问用户是否继续，由你根据画面决定继续或完成
- 最终总结只说明实际完成的效果和关键调整，不暴露内部推理过程"""


def _knowledge_section() -> str:
    return f"""## 修图知识

{EDITING_KNOWLEDGE}"""


def _style_presets_section() -> str:
    return f"""## 风格预设参考

{STYLE_PRESETS}"""


def _session_state_section(session) -> str:
    state_text = format_session_summary(session)
    return f"""## 当前状态

{state_text}"""


def _constraints_section() -> str:
    return """## 约束

- 所有参数值必须在工具定义的范围内，超出范围的值会被自动钳制
- 不要编造不存在的工具或参数
- 如果用户的需求超出参数调整能力（如局部调整、AI 生成），诚实告知当前不支持
- 色温单位为开尔文(K)，步长 50K，范围 2000-10000
- 曲线控制点 x/y 均在 [0,100]，首尾点锚定 x=0 和 x=100"""
