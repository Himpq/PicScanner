"""视觉题材统计的可版本化标签表。"""
from __future__ import annotations

TAXONOMY_VERSION = "subject-v1"

# 这些是“拍摄题材”，不是审美风格。首版先保证口径稳定，黑白、纪实、极简等
# 风格标签留到有人工校准集之后再加入，避免把不同概念混在一张比例图里。
PRIMARY_LABELS = (
    {"key": "architecture", "label": "建筑", "prompts": ("建筑", "建筑摄影")},
    {"key": "portrait", "label": "人像", "prompts": ("人像", "人物肖像")},
    {"key": "landscape", "label": "风光", "prompts": ("风光", "自然风景")},
    {"key": "street", "label": "街头", "prompts": ("街头摄影", "街拍")},
    {"key": "nature", "label": "自然", "prompts": ("自然", "自然环境")},
    {"key": "animal", "label": "动物", "prompts": ("动物", "野生动物")},
    {"key": "plant", "label": "植物", "prompts": ("植物", "花草植物")},
    {"key": "food", "label": "美食", "prompts": ("美食", "食物摄影")},
    {"key": "still_life", "label": "静物", "prompts": ("静物", "静物摄影")},
    {"key": "travel", "label": "旅行", "prompts": ("旅行", "旅行摄影")},
    {"key": "event", "label": "活动", "prompts": ("活动现场", "体育或活动摄影")},
    {"key": "night", "label": "夜景星空", "prompts": ("夜景", "星空摄影")},
    {"key": "macro", "label": "微距细节", "prompts": ("微距", "细节特写")},
    {"key": "abstract", "label": "抽象", "prompts": ("抽象摄影", "抽象画面")},
)

UNCERTAIN_KEY = "uncertain"
UNCERTAIN_LABEL = "待确认"

