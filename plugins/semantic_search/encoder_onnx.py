"""Chinese-CLIP ONNX 编码器：把图片和文本映射到同一个 512 维向量空间。

- 推理走 onnxruntime，import 仅 0.2s，打包体积小，CPU/GPU 自动选择
- 预处理不依赖 transformers：图像走 PIL+numpy 手写，文本走 tokenizers（0.04s import）
  彻底规避 transformers 15s 的 import，首次加载从 22s -> 1.2s
- 对外 API 与 encoder.py:ClipEncoder 完全兼容，可无缝切换

模型目录：
  data/plugins/semantic_search/model/          # torch 权重（pytorch_model.bin），保留作 fallback
  data/plugins/semantic_search/model_onnx/     # onnx 权重（vision_model.onnx + text_model.onnx），由 export_onnx.py 生成

用法：
  from plugins.semantic_search.encoder_onnx import ClipEncoder, resolve_model_source

若 onnx 文件不存在，会抛出 FileNotFoundError，上层可回退到 torch 版。
"""
from __future__ import annotations

import math
import os
from pathlib import Path

# 国内网络默认走 hf-mirror，必须在 import transformers 之前设置（lite 模式不依赖 transformers，但保留以防回退）
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

_PLUGIN_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "plugins" / "semantic_search"
os.environ.setdefault("HF_HOME", str(_PLUGIN_DATA_DIR / "model_cache"))

import numpy as np
from PIL import Image

MODEL_ID = "OFA-Sys/chinese-clip-vit-base-patch16"
EMBED_DIM = 512

QUERY_TEMPLATES = [
    "{q}",
    "一张{q}的照片",
    "{q}的照片",
    "这是{q}",
]

# 本地目录
LOCAL_MODEL_DIR = _PLUGIN_DATA_DIR / "model"
LOCAL_ONNX_DIR = _PLUGIN_DATA_DIR / "model_onnx"
ONNX_VISION = LOCAL_ONNX_DIR / "vision_model.onnx"
ONNX_TEXT = LOCAL_ONNX_DIR / "text_model.onnx"

# 图像预处理常量（与 preprocessor_config.json 一致）
_IMAGE_MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
_IMAGE_STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)
_IMAGE_SIZE = 224
# text 配置
_MAX_TEXT_LEN = 512


def resolve_model_source() -> str:
    """优先使用本地 ONNX 目录，其次本地 torch 目录，最后 HF hub。"""
    if ONNX_VISION.exists() and ONNX_TEXT.exists():
        return str(LOCAL_ONNX_DIR)
    if (LOCAL_MODEL_DIR / "config.json").exists():
        return str(LOCAL_MODEL_DIR)
    return MODEL_ID


def onnx_available() -> bool:
    return ONNX_VISION.exists() and ONNX_TEXT.exists()


def _log(msg: str):
    print(f"[encoder_onnx] {msg}", flush=True)


def _get_providers():
    """自动选择 provider，含回退。"""
    try:
        import onnxruntime as ort

        avail = ort.get_available_providers()
        if "CUDAExecutionProvider" in avail:
            return ["CUDAExecutionProvider", "CPUExecutionProvider"], "cuda"
        if "DmlExecutionProvider" in avail:
            return ["DmlExecutionProvider", "CPUExecutionProvider"], "dml"
        return ["CPUExecutionProvider"], "cpu"
    except Exception:
        return ["CPUExecutionProvider"], "cpu"


class ClipEncoder:
    """ONNX 版 Chinese-CLIP 编码器（与 torch 版同接口）。Lite 模式不依赖 transformers。"""

    def __init__(self, model_id: str | None = None, device: str | None = None):
        import time as _t

        t_all = _t.time()
        # model_id 可指向 onnx 目录或 torch 目录；若未传则自动探测
        if model_id is None:
            model_id = resolve_model_source()
        self.model_id = model_id

        onnx_dir = Path(model_id) if Path(model_id).is_dir() else LOCAL_ONNX_DIR
        if not (onnx_dir / "vision_model.onnx").exists():
            onnx_dir = LOCAL_ONNX_DIR

        if not onnx_dir.joinpath("vision_model.onnx").exists() or not onnx_dir.joinpath("text_model.onnx").exists():
            raise FileNotFoundError(
                f"ONNX 模型不存在: {onnx_dir}/vision_model.onnx 或 text_model.onnx；"
                f"请先运行 python -m plugins.semantic_search.export_onnx 生成"
            )

        # ---------- 文本 tokenizer：优先用 tokenizers（0.04s），回退 transformers ----------
        self._use_lite = False
        self._tokenizer = None
        self.processor = None  # 兼容旧代码，lite 模式下为 None
        t_tok = _t.time()
        try:
            # 尝试 lite：tokenizers 库
            from tokenizers import BertWordPieceTokenizer

            vocab_path = LOCAL_MODEL_DIR / "vocab.txt"
            if not vocab_path.exists():
                vocab_path = onnx_dir / "vocab.txt"
            if vocab_path.exists():
                # BertWordPieceTokenizer 会自动处理 [CLS]/[SEP]
                self._tokenizer = BertWordPieceTokenizer(str(vocab_path), lowercase=False)
                self._use_lite = True
                _log(f"tokenizer lite 已加载 {vocab_path} 用时 {_t.time()-t_tok:.2f}s")
            else:
                raise FileNotFoundError(f"vocab.txt not found")
        except Exception as e:
            # 回退 transformers（慢 15s，但保证兼容）
            _log(f"lite tokenizer 不可用，回退 transformers: {e}")
            try:
                from transformers import ChineseCLIPProcessor

                processor_source = str(LOCAL_MODEL_DIR) if (LOCAL_MODEL_DIR / "config.json").exists() else MODEL_ID
                if (onnx_dir / "vocab.txt").exists() or (onnx_dir / "tokenizer.json").exists():
                    processor_source = str(onnx_dir)
                try:
                    self.processor = ChineseCLIPProcessor.from_pretrained(processor_source, use_fast=False)
                except TypeError:
                    self.processor = ChineseCLIPProcessor.from_pretrained(processor_source)
                self._use_lite = False
                _log(f"transformers processor 已加载 用时 {_t.time()-t_tok:.2f}s")
            except Exception as e2:
                raise RuntimeError(f"tokenizer 加载失败 lite={e} transformers={e2}")

        # ---------- onnx sessions ----------
        import onnxruntime as ort

        providers, prov_name = _get_providers()
        if device is not None:
            device = str(device).lower()
            if device == "cuda" and "CUDAExecutionProvider" in providers:
                providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
                prov_name = "cuda"
            elif device == "cpu":
                providers = ["CPUExecutionProvider"]
                prov_name = "cpu"
        self.device = prov_name
        self.providers = providers

        so = ort.SessionOptions()
        # BASIC 与 ALL 速度几乎一致（0.44s vs 0.42s），用 ENABLE_ALL 保持最佳推理速度
        so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        t_sess = _t.time()
        self.vision_sess = ort.InferenceSession(str(onnx_dir / "vision_model.onnx"), sess_options=so, providers=providers)
        self.text_sess = ort.InferenceSession(str(onnx_dir / "text_model.onnx"), sess_options=so, providers=providers)
        _log(f"ONNX sessions 已加载 用时 {_t.time()-t_sess:.2f}s providers={providers}")

        self._vision_input_name = self.vision_sess.get_inputs()[0].name
        self._vision_output_name = self.vision_sess.get_outputs()[0].name
        self._text_input_names = [inp.name for inp in self.text_sess.get_inputs()]
        self._text_output_name = self.text_sess.get_outputs()[0].name

        # temperature
        self._temperature = 100.0
        try:
            import json

            cfg_path = LOCAL_MODEL_DIR / "config.json"
            if cfg_path.exists():
                cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
                raw = float(cfg.get("logit_scale_init_value", math.log(100)))
                self._temperature = float(math.exp(raw))
            elif (onnx_dir / "config.json").exists():
                cfg = json.loads((onnx_dir / "config.json").read_text(encoding="utf-8"))
                raw = float(cfg.get("logit_scale_init_value", math.log(100)))
                self._temperature = float(math.exp(raw))
        except Exception:
            pass

        _log(f"ONNX 已就绪 ({'lite' if self._use_lite else 'transformers'}) 总用时 {_t.time()-t_all:.2f}s device={self.device}")

    @property
    def temperature(self) -> float:
        return float(self._temperature)

    # ---------- 图像预处理：手写，不依赖 transformers ----------
    def _images_to_pixel_values(self, images: list[Image.Image]) -> np.ndarray:
        """PIL list -> (N,3,224,224) float32，已做 rescale+normalize"""
        if self._use_lite:
            # 手写路径：BICUBIC resize + rescale + normalize
            out = np.empty((len(images), 3, _IMAGE_SIZE, _IMAGE_SIZE), dtype=np.float32)
            for i, img in enumerate(images):
                if img.mode != "RGB":
                    img = img.convert("RGB")
                # 与 preprocessor_config 一致：BICUBIC (resample 3)
                resized = img.resize((_IMAGE_SIZE, _IMAGE_SIZE), Image.BICUBIC)
                arr = np.asarray(resized, dtype=np.float32) / 255.0  # HWC 0-1
                arr = (arr - _IMAGE_MEAN) / _IMAGE_STD
                arr = arr.transpose(2, 0, 1)  # HWC -> CHW
                out[i] = arr
            return out
        else:
            # 回退 transformers
            try:
                inputs = self.processor(images=images, return_tensors="np")
                return np.asarray(inputs["pixel_values"], dtype=np.float32)
            except Exception:
                import torch as _torch

                inputs = self.processor(images=images, return_tensors="pt")
                return inputs["pixel_values"].numpy().astype(np.float32)

    # ---------- 文本预处理 ----------
    def _texts_to_inputs(self, texts: list[str]) -> dict:
        """list[str] -> dict {input_ids, attention_mask, token_type_ids}"""
        if self._use_lite:
            # 使用 tokenizers
            batch_ids = []
            for t in texts:
                enc = self._tokenizer.encode(t)
                ids = enc.ids
                # 截断到 _MAX_TEXT_LEN
                if len(ids) > _MAX_TEXT_LEN:
                    ids = ids[:_MAX_TEXT_LEN]
                    # 保证最后是 SEP
                    if ids[-1] != 102:
                        ids[-1] = 102
                batch_ids.append(ids)
            max_len = max(len(ids) for ids in batch_ids) if batch_ids else 0
            # padding
            input_ids = np.zeros((len(texts), max_len), dtype=np.int64)
            attention_mask = np.zeros((len(texts), max_len), dtype=np.int64)
            token_type_ids = np.zeros((len(texts), max_len), dtype=np.int64)
            for i, ids in enumerate(batch_ids):
                input_ids[i, : len(ids)] = ids
                attention_mask[i, : len(ids)] = 1
            return {"input_ids": input_ids, "attention_mask": attention_mask, "token_type_ids": token_type_ids}
        else:
            try:
                inputs = self.processor(text=texts, return_tensors="np", padding=True, truncation=True)
                return {k: np.asarray(v) for k, v in inputs.items()}
            except Exception:
                import torch as _torch

                inputs = self.processor(text=texts, return_tensors="pt", padding=True, truncation=True)
                return {k: v.numpy() if hasattr(v, "numpy") else np.asarray(v) for k, v in inputs.items()}

    def encode_images(self, images: list[Image.Image]) -> np.ndarray:
        """(N,) 张 RGB PIL 图片 -> (N, 512) float32 归一化向量。"""
        if not images:
            return np.zeros((0, EMBED_DIM), dtype=np.float32)
        pixel_values = self._images_to_pixel_values(images)
        feats = self.vision_sess.run([self._vision_output_name], {self._vision_input_name: pixel_values})[0]
        feats = np.asarray(feats, dtype=np.float32)
        norms = np.linalg.norm(feats, axis=1, keepdims=True)
        norms = np.maximum(norms, 1e-9)
        feats = feats / norms
        return feats.astype(np.float32)

    def encode_texts(self, texts: list[str]) -> np.ndarray:
        """多条文本 -> (T, 512) float32 归一化矩阵。"""
        if not texts:
            return np.zeros((0, EMBED_DIM), dtype=np.float32)
        inputs = self._texts_to_inputs(texts)
        ort_inputs = {}
        for name in self._text_input_names:
            if name in inputs:
                arr = inputs[name]
                if arr.dtype != np.int64:
                    arr = arr.astype(np.int64)
                ort_inputs[name] = arr
            elif name == "token_type_ids" and "token_type_ids" not in inputs:
                batch, seq = inputs["input_ids"].shape
                ort_inputs[name] = np.zeros((batch, seq), dtype=np.int64)
            elif name == "position_ids":
                batch, seq = inputs["input_ids"].shape
                ort_inputs[name] = np.tile(np.arange(seq, dtype=np.int64), (batch, 1))
        feats = self.text_sess.run([self._text_output_name], ort_inputs)[0]
        feats = np.asarray(feats, dtype=np.float32)
        norms = np.linalg.norm(feats, axis=1, keepdims=True)
        norms = np.maximum(norms, 1e-9)
        feats = feats / norms
        return feats.astype(np.float32)

    def encode_query(self, query: str) -> np.ndarray:
        """文本查询 -> (T, 512) 多模板矩阵，供 store.search 取列最大。"""
        texts = [t.format(q=query) for t in QUERY_TEMPLATES]
        return self.encode_texts(texts)

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
