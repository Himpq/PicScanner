"""Face ONNX 轻量推理层：YuNet 检测 + 轻量关键点/分割（onnxruntime, 复用 semantic_search 的 onnxruntime）

- 检测复用 face_cluster 的 YuNet (face_detection_yunet_2023mar.onnx, 0.23MB)
- 关键点/分割暂用 YuNet 5点扩展 + 几何生成 478 点（后续可替换为 face_mesh_468.onnx 3.5MB 与 selfie_matting.onnx 2MB，无需改接口）
- 依赖仅 onnxruntime + opencv-contrib-python（可选），不依赖 mediapipe 300MB
- 与 backend.py 的 mediapipe 分支同接口，自动切换
"""
from __future__ import annotations

import hashlib
from pathlib import Path
import numpy as np

_PLUGIN_DATA_DIR = Path(__file__).resolve().parents[3] / "data" / "plugins" / "face"
MODEL_DIR = _PLUGIN_DATA_DIR / "model_onnx"
YUNET_PATH = MODEL_DIR / "face_detection_yunet_2023mar.onnx"
# 预留：后续可放置真实 ONNX
FACEMESH_PATH = MODEL_DIR / "face_mesh_468.onnx"
SEGMENTER_PATH = MODEL_DIR / "selfie_matting_256.onnx"


def onnx_available() -> bool:
    # YuNet 即视为 onnx 可用（关键点/分割用几何生成兜底）
    return YUNET_PATH.exists()


def _ascii_model_path(src: Path) -> Path:
    if str(src).isascii():
        return src
    try:
        import tempfile
        base = tempfile.gettempdir()
        if not str(base).isascii():
            import os
            base = os.environ.get("TEMP") or os.environ.get("TMP") or base
        dst = Path(base) / "PicScannerFaceONNX" / src.name
        if dst.exists() and dst.stat().st_size == src.stat().st_size:
            return dst
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_bytes(src.read_bytes())
        return dst
    except Exception:
        return src


def _log(msg: str):
    print(f"[face_onnx] {msg}", flush=True)


# ---------- 几何生成 478 点（YuNet 5点 → 478） ----------
# mediapipe FaceMesh 索引中关键轮廓点，用于前端 warp
# 简化：用 5 点 + 人脸框几何插值生成 478 点，保证前端 478 长度不断
def _expand_5_to_478(bbox, landmarks_5, width, height):
    """bbox (x,y,w,h), landmarks_5 [(x,y)*5] 归一化 → 478×2 归一化"""
    if not landmarks_5 or len(landmarks_5) < 5:
        # 回退：框中心生成
        x, y, w, h = bbox
        cx, cy = x + w/2, y + h/2
        landmarks_5 = [(cx - w*0.15, cy - h*0.2), (cx + w*0.15, cy - h*0.2), (cx, cy), (cx - w*0.1, cy + h*0.2), (cx + w*0.1, cy + h*0.2)]
        # 转归一化
        landmarks_5 = [(px/width, py/height) for px, py in landmarks_5]
    # 生成 478：前 5 保留，其余按椭圆/脸部几何插值
    pts = []
    pts.extend(landmarks_5[:5])
    # 脸部椭圆参数
    x, y, w, h = bbox
    cx, cy = x + w/2, y + h/2
    cx_n, cy_n = cx/width, cy/height
    rx, ry = w*0.48/width, h*0.62/height
    # 生成剩余 473 点沿椭圆 + 关键区域加密
    import math
    for i in range(473):
        # 椭圆采样 + 随机扰动
        theta = (i / 473) * 2 * math.pi
        # 轻微椭圆变形，模拟真实人脸
        r = rx * (0.9 + 0.1 * math.cos(3*theta))
        x_n = cx_n + r * math.cos(theta)
        y_n = cy_n + ry * 0.85 * math.sin(theta)
        # 前 100 点更贴近真实：用 5 点加权
        if i < 50:
            # 眼周
            lx, ly = landmarks_5[0]
            x_n = lx + (x_n - lx)*0.3
            y_n = ly + (y_n - ly)*0.3
        pts.append((max(0.0, min(1.0, x_n)), max(0.0, min(1.0, y_n))))
    # 确保 478
    return pts[:478]


class FaceOnnxDetector:
    """ONNX 版人脸检测+关键点+分割（YuNet 驱动，关键点/分割几何生成）"""

    def __init__(self):
        self.yunet = None
        self.mode = "onnx-yunet-geom"
        # 尝试加载 YuNet
        try:
            import cv2 as cv2_mod
            if YUNET_PATH.exists():
                yunet_p = _ascii_model_path(YUNET_PATH)
                # YuNet 需要初始尺寸，动态 setInputSize
                self.yunet = cv2_mod.FaceDetectorYN.create(
                    str(yunet_p), "", (320, 320), 0.6, 0.3, 5000
                )
                _log(f"YuNet 已加载 {yunet_p.name} mode={self.mode}")
            else:
                _log("YuNet 模型缺失，ONNX 检测不可用")
        except Exception as exc:
            _log(f"YuNet 加载失败: {exc}")
            self.yunet = None

    def detect_faces(self, bgr: np.ndarray):
        """BGR → [{bbox(x,y,w,h), score, landmarks_5[(x,y)*5]}]，坐标为像素"""
        if self.yunet is None:
            return []
        h, w = bgr.shape[:2]
        # 大图缩放到 960 长边，速度 3-6 倍
        max_side = 960
        scale = 1.0
        det_bgr = bgr
        if max(h, w) > max_side:
            scale = max_side / max(h, w)
            nh, nw = int(h*scale), int(w*scale)
            try:
                import cv2 as _cv2
                det_bgr = _cv2.resize(bgr, (nw, nh), interpolation=_cv2.INTER_LINEAR)
            except Exception:
                det_bgr = bgr
                scale = 1.0
        dh, dw = det_bgr.shape[:2]
        self.yunet.setInputSize((dw, dh))
        _, faces = self.yunet.detect(det_bgr)
        out = []
        if faces is None:
            return out
        inv = 1.0/scale if scale != 1.0 else 1.0
        for f in faces:
            x, y, ww, hh = float(f[0])*inv, float(f[1])*inv, float(f[2])*inv, float(f[3])*inv
            score = float(f[14]) if f.shape[0] > 14 else 0.9
            lmk = []
            if f.shape[0] >= 14:
                for k in range(5):
                    lmk.append((float(f[4+k*2])*inv, float(f[4+k*2+1])*inv))
            out.append({"bbox": (x, y, ww, hh), "score": score, "landmarks_5": lmk})
        return out

    def landmarks_478(self, bgr: np.ndarray, bbox, landmarks_5):
        """基于 YuNet 5点生成 478 点归一化"""
        h, w = bgr.shape[:2]
        # bbox 已为像素，landmarks_5 为像素
        # 转归一化后生成
        lmk_norm = [(x/w, y/h) for x, y in landmarks_5] if landmarks_5 else []
        pts_norm = _expand_5_to_478(bbox, lmk_norm, w, h)
        return pts_norm

    def segment_masks(self, bgr: np.ndarray, faces_478):
        """几何生成皮肤掩膜（椭圆脸廓），替代 mediapipe 分割"""
        h, w = bgr.shape[:2]
        # 简单：全脸椭圆为皮肤
        import cv2 as _cv2
        mask = np.zeros((h, w), dtype=np.uint8)
        for pts in faces_478:
            # 取脸部轮廓近似：前 100 点围成多边形
            poly = np.array([(int(x*w), int(y*h)) for x, y in pts[:120]], dtype=np.int32)
            if len(poly) >= 3:
                _cv2.fillPoly(mask, [poly], 1)
        # body 掩膜：全图 30% 区域
        body = np.zeros((h, w), dtype=np.uint8)
        body[h//4: h*3//4, w//4: w*3//4] = 1
        return mask, body
