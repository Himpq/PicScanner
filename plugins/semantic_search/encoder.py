"""Chinese-CLIP 编码器：把图片和文本映射到同一个 512 维向量空间。

模型：OFA-Sys/chinese-clip-vit-base-patch16（约 188M 参数）
- 中文查询原生支持（文本编码器为 RoBERTa-wwm-ext-base）
- 输出向量已做 L2 归一化，点积即余弦相似度
"""
from __future__ import annotations

import math
import os
from pathlib import Path

# 国内网络默认走 hf-mirror 镜像；必须在 import transformers 之前设置。
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
# 镜像对 xet 传输协议支持不稳定，退回普通 HTTP 下载。
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
# 模型权重缓存放在插件自己的数据目录（自包含，便于迁移与卸载）。
_PLUGIN_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "plugins" / "semantic_search"
os.environ.setdefault("HF_HOME", str(_PLUGIN_DATA_DIR / "model_cache"))

import numpy as np
import torch
from PIL import Image
from transformers import ChineseCLIPModel, ChineseCLIPProcessor

MODEL_ID = "OFA-Sys/chinese-clip-vit-base-patch16"
EMBED_DIM = 512

# 文本查询模板：CLIP 对自然语句远比对孤立名词敏感，多模板取最大可拉开区分度。
QUERY_TEMPLATES = [
    "{q}",
    "一张{q}的照片",
    "{q}的照片",
    "这是{q}",
]

# 本地模型目录（由 download_model.py 生成，普通文件夹、零符号链接依赖）。
LOCAL_MODEL_DIR = _PLUGIN_DATA_DIR / "model"


def resolve_model_source() -> str:
    """优先使用本地模型目录；不存在时回退到 HF hub 在线加载。"""
    if (LOCAL_MODEL_DIR / "config.json").exists():
        return str(LOCAL_MODEL_DIR)
    return MODEL_ID


def _features_as_tensor(feats) -> torch.Tensor:
    """兼容不同 transformers 版本的特征返回值。

    - transformers 4.x: get_*_features 直接返回张量；
    - transformers 5.x: 返回 ModelOutput，投影后的特征在 pooler_output。
    """
    if torch.is_tensor(feats):
        return feats
    pooled = getattr(feats, "pooler_output", None)
    if pooled is not None:
        return pooled
    if isinstance(feats, (tuple, list)) and len(feats) > 0:
        return feats[0]
    raise TypeError(f"无法从模型输出中提取特征张量: {type(feats)}")


class ClipEncoder:
    """惰性加载的 Chinese-CLIP 编码器（自动选择 CUDA / CPU）。"""

    def __init__(self, model_id: str | None = None, device: str | None = None):
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = device
        self.model_id = model_id or resolve_model_source()
        # print(f"[encoder] 加载模型 {self.model_id} -> {device}")
        self.processor = ChineseCLIPProcessor.from_pretrained(self.model_id)
        self.model = ChineseCLIPModel.from_pretrained(self.model_id)
        self.model.to(device)
        self.model.eval()

    @property
    def temperature(self) -> float:
        """CLIP 对比学习的温度倒数 = exp(logit_scale)，取自检查点。

        用于把余弦相似度转成有区分度的置信度（参考值约 100）。
        读不到时回退到 log(100)。
        """
        try:
            raw = float(self.model.logit_scale.data)
        except Exception:
            raw = math.log(100)
        return float(math.exp(raw))

    @torch.no_grad()
    def encode_images(self, images: list[Image.Image]) -> np.ndarray:
        """(N,) 张 RGB PIL 图片 -> (N, 512) float32 归一化向量。"""
        inputs = self.processor(images=images, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        feats = _features_as_tensor(self.model.get_image_features(**inputs))
        feats = feats / feats.norm(dim=-1, keepdim=True)
        return feats.float().cpu().numpy()

    @torch.no_grad()
    def encode_texts(self, texts: list[str]) -> np.ndarray:
        """多条文本 -> (T, 512) float32 归一化矩阵。"""
        if not texts:
            return np.zeros((0, EMBED_DIM), dtype=np.float32)
        inputs = self.processor(text=texts, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        feats = _features_as_tensor(self.model.get_text_features(**inputs))
        feats = feats / feats.norm(dim=-1, keepdim=True)
        return feats.float().cpu().numpy()

    def encode_query(self, query: str) -> np.ndarray:
        """文本查询 -> (T, 512) 多模板矩阵，供 store.search 取列最大。"""
        texts = [t.format(q=query) for t in QUERY_TEMPLATES]
        return self.encode_texts(texts)

    @torch.no_grad()
    def encode_text(self, text: str) -> np.ndarray:
        """单条文本 -> (512,) float32 归一化向量（兼容旧调用）。"""
        return self.encode_texts([text]).reshape(-1)


def load_image(path: str | os.PathLike) -> Image.Image:
    """读取图片并做 EXIF 方向纠正，统一转 RGB。"""
    from PIL import ImageOps

    img = Image.open(path)
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img
