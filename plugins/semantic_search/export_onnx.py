"""Chinese-CLIP torch -> ONNX 导出器

把本地 torch 权重 (data/plugins/semantic_search/model/pytorch_model.bin)
导出为 onnxruntime 可用的双塔模型：
  data/plugins/semantic_search/model_onnx/vision_model.onnx
  data/plugins/semantic_search/model_onnx/text_model.onnx

用法：
  python -m plugins.semantic_search.export_onnx
  python -m plugins.semantic_search.export_onnx --force        # 覆盖已存在
  python -m plugins.semantic_search.export_onnx --verify       # 导出后做 torch vs onnx 余弦对比验证

依赖：torch, transformers, onnx (pip install onnx)
导出耗时约 30-60s，产出约 350MB*2（含权重），FP32 精度。
如需更小体积可用 --fp16（需 GPU，精度略降，暂不推荐检索场景）。

导出后，encoder_onnx.py 会自动优先加载 onnx；若缺失则回退到 torch。
"""
from __future__ import annotations

import argparse
import json
import shutil
import time
from pathlib import Path


PLUGIN_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "plugins" / "semantic_search"
MODEL_DIR = PLUGIN_DATA_DIR / "model"
ONNX_DIR = PLUGIN_DATA_DIR / "model_onnx"
CONFIG_PATH = MODEL_DIR / "config.json"


def _log(msg: str):
    print(f"[export_onnx] {msg}", flush=True)


def _ensure_dirs():
    ONNX_DIR.mkdir(parents=True, exist_ok=True)


def _copy_tokenizer():
    """把 tokenizer 相关文件复制到 onnx 目录，供 processor 加载。"""
    for name in ["vocab.txt", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "preprocessor_config.json", "config.json"]:
        src = MODEL_DIR / name
        if src.exists():
            shutil.copy2(src, ONNX_DIR / name)


def export():
    import torch
    from transformers import ChineseCLIPModel

    _log(f"加载 torch 模型 {MODEL_DIR} ...")
    model = ChineseCLIPModel.from_pretrained(str(MODEL_DIR))
    model.eval()

    # ---------- Vision Wrapper ----------
    class VisionWrapper(torch.nn.Module):
        def __init__(self, m):
            super().__init__()
            self.vision_model = m.vision_model
            self.visual_projection = m.visual_projection

        def forward(self, pixel_values):
            out = self.vision_model(pixel_values=pixel_values, return_dict=True)
            pooled = out.pooler_output  # (B,768)
            return self.visual_projection(pooled)  # (B,512)

    # ---------- Text Wrapper ----------
    class TextWrapper(torch.nn.Module):
        def __init__(self, m):
            super().__init__()
            self.text_model = m.text_model
            self.text_projection = m.text_projection

        def forward(self, input_ids, attention_mask, token_type_ids):
            out = self.text_model(input_ids=input_ids, attention_mask=attention_mask, token_type_ids=token_type_ids, return_dict=True)
            pooled = out.last_hidden_state[:, 0, :]  # (B,768)
            return self.text_projection(pooled)  # (B,512)

    vw = VisionWrapper(model)
    tw = TextWrapper(model)

    # 动态轴：batch 和 seq_len
    _log("导出 vision_model.onnx ...")
    dummy_pixel = torch.randn(1, 3, 224, 224, dtype=torch.float32)
    torch.onnx.export(
        vw,
        (dummy_pixel,),
        str(ONNX_DIR / "vision_model.onnx"),
        input_names=["pixel_values"],
        output_names=["image_embeds"],
        dynamic_axes={"pixel_values": {0: "batch"}, "image_embeds": {0: "batch"}},
        opset_version=17,
        do_constant_folding=True,
    )
    _log(f"vision done -> {ONNX_DIR / 'vision_model.onnx'}")

    _log("导出 text_model.onnx ...")
    dummy_ids = torch.randint(0, 21128, (1, 8), dtype=torch.long)
    dummy_mask = torch.ones(1, 8, dtype=torch.long)
    dummy_token = torch.zeros(1, 8, dtype=torch.long)
    torch.onnx.export(
        tw,
        (dummy_ids, dummy_mask, dummy_token),
        str(ONNX_DIR / "text_model.onnx"),
        input_names=["input_ids", "attention_mask", "token_type_ids"],
        output_names=["text_embeds"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "seq"},
            "attention_mask": {0: "batch", 1: "seq"},
            "token_type_ids": {0: "batch", 1: "seq"},
            "text_embeds": {0: "batch"},
        },
        opset_version=17,
        do_constant_folding=True,
    )
    _log(f"text done -> {ONNX_DIR / 'text_model.onnx'}")

    _copy_tokenizer()

    # 写个标记文件，方便排查
    meta = {"source": str(MODEL_DIR), "exported_at": time.strftime("%Y-%m-%d %H:%M:%S"), "opset": 17, "vision": "vision_model.onnx", "text": "text_model.onnx"}
    (ONNX_DIR / "export_meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    _log(f"导出完成，目录 {ONNX_DIR}")
    for p in ONNX_DIR.iterdir():
        if p.is_file():
            _log(f"  {p.name} {p.stat().st_size/1048576:.1f} MB")


def verify():
    """对比 torch 与 onnx 的余弦相似度，误差应 < 1e-4。"""
    import numpy as np
    import torch
    from PIL import Image
    from transformers import ChineseCLIPProcessor, ChineseCLIPModel

    from plugins.semantic_search.encoder import ClipEncoder as TorchEncoder
    from plugins.semantic_search.encoder_onnx import ClipEncoder as OnnxEncoder

    _log("验证 torch vs onnx 一致性 ...")
    torch_enc = TorchEncoder()
    onnx_enc = OnnxEncoder()

    # 图像对比
    img = Image.new("RGB", (224, 224), color=(123, 100, 50))
    # 加点噪声
    arr = np.array(img)
    arr[::20, ::20] = 255
    img2 = Image.fromarray(arr)

    t_vec = torch_enc.encode_images([img, img2])
    o_vec = onnx_enc.encode_images([img, img2])
    for i in range(2):
        cos = float(np.dot(t_vec[i], o_vec[i]))
        diff = float(np.linalg.norm(t_vec[i] - o_vec[i]))
        _log(f"  image[{i}] cos={cos:.6f} l2_diff={diff:.6f} {'PASS' if cos > 0.999 else 'FAIL'}")

    texts = ["一只猫", "一张猫的照片", "蓝天白云"]
    t_txt = torch_enc.encode_texts(texts)
    o_txt = onnx_enc.encode_texts(texts)
    for i, s in enumerate(texts):
        cos = float(np.dot(t_txt[i], o_txt[i]))
        diff = float(np.linalg.norm(t_txt[i] - o_txt[i]))
        _log(f"  text[{i}] '{s}' cos={cos:.6f} l2_diff={diff:.6f} {'PASS' if cos > 0.999 else 'FAIL'}")

    # 跨模态：torch 的图搜文 vs onnx 的图搜文
    q_t = torch_enc.encode_query("猫")
    q_o = onnx_enc.encode_query("猫")
    # 均归一化后取最大余弦
    sim_t = float(np.max(t_vec[0] @ q_t.T))
    sim_o = float(np.max(o_vec[0] @ q_o.T))
    _log(f"  cross-modal sim torch={sim_t:.6f} onnx={sim_o:.6f} diff={abs(sim_t-sim_o):.6f}")


def main():
    ap = argparse.ArgumentParser(description="Chinese-CLIP torch -> ONNX 导出")
    ap.add_argument("--force", action="store_true", help="覆盖已存在的 onnx 文件")
    ap.add_argument("--verify", action="store_true", help="导出后验证一致性")
    args = ap.parse_args()

    if not (MODEL_DIR / "config.json").exists():
        _log(f"未找到 torch 模型，请先运行 python -m plugins.semantic_search.download_model")
        return 1
    if not (MODEL_DIR / "pytorch_model.bin").exists() and not (MODEL_DIR / "model.safetensors").exists():
        _log(f"未找到权重文件 {MODEL_DIR}/pytorch_model.bin")
        return 1

    if ONNX_DIR.exists() and any(ONNX_DIR.iterdir()) and not args.force:
        # 已存在且非空，要求 --force
        if (ONNX_DIR / "vision_model.onnx").exists() and (ONNX_DIR / "text_model.onnx").exists():
            _log(f"ONNX 已存在于 {ONNX_DIR}，如需重导请加 --force")
            if args.verify:
                verify()
            return 0

    _ensure_dirs()
    try:
        export()
    except Exception as e:
        _log(f"导出失败: {e}")
        import traceback

        traceback.print_exc()
        return 1

    if args.verify:
        try:
            verify()
        except Exception as e:
            _log(f"验证失败: {e}")
            import traceback

            traceback.print_exc()
            return 1
    _log("全部完成。可重启 PicScanner，backend 将自动走 ONNX。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
