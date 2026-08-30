"""Face ONNX 轻量推理层：YuNet 检测 + 关键点/分割（onnxruntime, 复用 semantic_search 的 onnxruntime）

- 检测复用 face_cluster 的 YuNet (face_detection_yunet_2023mar.onnx, 0.23MB)
- 关键点：优先加载真实 face_mesh ONNX（face_landmark_468.onnx，若已放置到 model_onnx/）；
  否则用 YuNet 5 点 + 检测框几何生成"脸形椭圆"478 点兜底（前端轮廓/瘦脸可用，
  精细五官如大眼/鼻翼为近似）。两路输出结构一致，前端无需区分。
- 分割（皮肤掩膜）：用脸部轮廓多边形填充，替代 mediapipe 分割。
- 依赖仅 onnxruntime + opencv-contrib-python（可选），不依赖 mediapipe 300MB。
- 与 backend.py 的 mediapipe 分支同接口，自动切换。
"""
from __future__ import annotations

import math
from pathlib import Path
import numpy as np

def _resolve_data_dir() -> Path:
    try:
        from app.backend.config_store import get_app_root

        return Path(get_app_root()) / "data" / "plugins" / "face"
    except Exception:
        # 开发期回退：根据 __file__ 位置推导
        p = Path(__file__).resolve()
        # plugins/face/encoder_onnx.py -> parents[2] = 项目根；app/modules/face/encoder_onnx.py -> parents[3] = 项目根
        for cand in [p.parents[2] / "data" / "plugins" / "face", p.parents[3] / "data" / "plugins" / "face"]:
            if (cand / "model_onnx").exists() or cand.exists():
                return cand
        return p.parents[2] / "data" / "plugins" / "face"


_PLUGIN_DATA_DIR = _resolve_data_dir()
MODEL_DIR = _PLUGIN_DATA_DIR / "model_onnx"
YUNET_PATH = MODEL_DIR / "face_detection_yunet_2023mar.onnx"
# 真实 face mesh ONNX（可选，放置后自动启用，输出真实 468 点）
FACEMESH_PATH = MODEL_DIR / "face_landmark_468.onnx"
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


# MediaPipe FaceMesh 脸部外轮廓索引（与 backend.py FACE_OVAL 一致）
_FACE_OVAL = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
    379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
    234, 127, 162, 21, 54, 103, 67, 109,
]
# 左/右脸颊与下颌曲线需要的索引（前端 CURVES.indices）
_LEFT_CURVE_IDX = [234, 93, 132, 58, 172, 136, 150, 149, 176]
_RIGHT_CURVE_IDX = [454, 323, 361, 288, 397, 365, 379, 378, 400]
_JAW_CURVE_IDX = [148, 152, 377]

# YuNet 5 点 -> MediaPipe 语义索引（左眼 33 / 右眼 263 / 鼻尖 1 / 左嘴 61 / 右嘴 291）
_MEDIAPIPE_5_IDX = [33, 263, 1, 61, 291]


def _clamp01(v):
    return max(0.0, min(1.0, v))


def _face_geometry_from_5(bbox, landmarks_5, width, height):
    """由 YuNet 5 点或检测框推导脸中心/半轴/朝向，供椭圆轮廓生成使用。

    返回 (cx, cy, rx, ry, angle_deg)，均为归一化坐标（rx/ry 为归一化半轴）。
    """
    x, y, w, h = bbox
    cx = (x + w / 2) / width
    cy = (y + h / 2) / height
    rx = (w * 0.5) / width
    ry = (h * 0.62) / height
    angle = 0.0
    # 有真实 5 点时，用双眼连线估计轻微旋转，让椭圆贴合脸的倾斜。
    if landmarks_5 and len(landmarks_5) >= 2:
        try:
            lx, ly = landmarks_5[0]  # 左眼
            rx2, ry2 = landmarks_5[1]  # 右眼
            dx = (rx2 - lx) * width
            dy = (ry2 - ly) * height
            ang = math.degrees(math.atan2(dy, dx))
            # 仅取小角度倾斜，避免误检导致椭圆翻转
            if -25 <= ang <= 25:
                angle = ang
        except Exception:
            pass
    return cx, cy, rx, ry, angle


def _oval_points(cx, cy, rx, ry, angle_deg, width, height):
    """按脸形椭圆生成 FACE_OVAL 各索引的归一化坐标（与 MediaPipe 拓扑顺序一致）。"""
    a = math.radians(angle_deg)
    ca, sa = math.cos(a), math.sin(a)
    pts = {}
    n = len(_FACE_OVAL)
    for i, idx in enumerate(_FACE_OVAL):
        theta = (i / n) * 2 * math.pi - math.pi / 2  # 从脸顶开始
        # 椭圆略扁：侧脸缘比上下略窄，用 cos 轻微调制 x 半轴
        rxp = rx * (0.92 + 0.08 * math.cos(2 * theta))
        ex = cx + rxp * math.cos(theta)
        ey = cy + ry * math.sin(theta)
        # 旋转（绕中心）
        dx = ex - cx
        dy = ey - cy
        px = cx + dx * ca - dy * sa
        py = cy + dx * sa + dy * ca
        pts[idx] = (_clamp01(px), _clamp01(py))
    return pts


def _expand_5_to_478(bbox, landmarks_5, width, height):
    """用 YuNet 5 点 + 脸形椭圆生成 478 点（归一化）。

    前 5 个语义点写入真实位置；FACE_OVAL 轮廓点写入椭圆位置；
    其余点沿略窄内椭圆均匀填充，保证整体是"脸形"而非单点/8 字。
    """
    if not landmarks_5 or len(landmarks_5) < 5:
        x, y, w, h = bbox
        cx, cy = x + w / 2, y + h / 2
        landmarks_5 = [
            (cx - w * 0.15, cy - h * 0.2), (cx + w * 0.15, cy - h * 0.2),
            (cx, cy), (cx - w * 0.1, cy + h * 0.2), (cx + w * 0.1, cy + h * 0.2),
        ]
        landmarks_5 = [(px / width, py / height) for px, py in landmarks_5]

    cx, cy, rx, ry, angle = _face_geometry_from_5(bbox, landmarks_5, width, height)
    pts = [None] * 478
    # 1) 真实 5 点
    for mp_idx, pt in zip(_MEDIAPIPE_5_IDX, landmarks_5[:5]):
        pts[mp_idx] = (_clamp01(pt[0]), _clamp01(pt[1]))
    # 2) 脸部外轮廓（椭圆，贴合脸形与倾斜）
    oval = _oval_points(cx, cy, rx, ry, angle, width, height)
    for idx, p in oval.items():
        pts[idx] = p
    # 3) 剩余点沿略窄内椭圆均匀填充（单环，无 3*cos 调制，避免 8 字）
    remaining = [i for i in range(478) if pts[i] is None]
    n = len(remaining)
    for j, idx in enumerate(remaining):
        theta = (j / n) * 2 * math.pi
        px = cx + rx * 0.9 * math.cos(theta)
        py = cy + ry * 0.9 * math.sin(theta)
        pts[idx] = (_clamp01(px), _clamp01(py))
    return pts


def _outlines_from_oval(oval, width, height, bbox):
    """由脸形椭圆轮廓点生成前端所需的 9/9/3 轮廓点（与 CURVES.indices 顺序一致）。

    之前 ONNX 分支只给三个 bbox 角点，导致前端画出"三叉戟"三段线；
    这里改为沿真实脸形轮廓采样，消除该伪影。
    """
    def sample(indices):
        out = []
        for idx in indices:
            if idx in oval:
                out.append([oval[idx][0], oval[idx][1]])
            else:
                # 缺失索引回退到脸中心，保证长度正确
                cx = (bbox[0] + bbox[2] / 2) / width
                cy = (bbox[1] + bbox[3] / 2) / height
                out.append([_clamp01(cx), _clamp01(cy)])
        return out

    return {
        "left": sample(_LEFT_CURVE_IDX),
        "right": sample(_RIGHT_CURVE_IDX),
        "jaw": sample(_JAW_CURVE_IDX),
    }


class FaceOnnxDetector:
    """ONNX 版人脸检测+关键点+分割（YuNet 检测 + 真实 face_mesh ONNX 关键点）。

    face_landmark_468.onnx 为标准 MediaPipe FaceMesh：输入 [1,192,192,3] 归一化 RGB，
    输出 [1,1,1,1404] = 468*(x,y,z)，坐标相对裁剪框 [0,1]。
    """

    MESH_INPUT_SIZE = 192
    MESH_NUM_LANDMARKS = 468

    def __init__(self):
        self.yunet = None
        self.facemesh_sess = None
        self.mode = "onnx-yunet-geom"
        # 1) 加载真实 face mesh ONNX（若存在则输出精确 468 点）
        try:
            if FACEMESH_PATH.exists():
                import onnxruntime as ort
                fm_p = _ascii_model_path(FACEMESH_PATH)
                self.facemesh_sess = ort.InferenceSession(
                    str(fm_p), providers=["CPUExecutionProvider"]
                )
                self.mode = "onnx-yunet+mesh"
                _log(f"真实 face_mesh ONNX 已加载 {fm_p.name}，输出精确 468 点")
        except Exception as exc:
            _log(f"face_mesh ONNX 加载失败，回退几何生成: {exc}")
            self.facemesh_sess = None
        # 2) 加载 YuNet
        try:
            import cv2 as cv2_mod
            if YUNET_PATH.exists():
                yunet_p = _ascii_model_path(YUNET_PATH)
                self.yunet = cv2_mod.FaceDetectorYN.create(
                    str(yunet_p), "", (320, 320), 0.3, 0.3, 5000
                )
                _log(f"YuNet 已加载 {yunet_p.name} mode={self.mode}")
            else:
                _log("YuNet 模型缺失，ONNX 检测不可用")
        except Exception as exc:
            _log(f"YuNet 加载失败: {exc}")
            self.yunet = None
        # 3) 加载自拍分割 ONNX（可选，放置后自动启用，消除折线）
        self.segmenter_sess = None
        try:
            if SEGMENTER_PATH.exists():
                import onnxruntime as ort
                seg_p = _ascii_model_path(SEGMENTER_PATH)
                self.segmenter_sess = ort.InferenceSession(
                    str(seg_p), providers=["CPUExecutionProvider"]
                )
                _log(f"自拍分割 ONNX 已加载 {seg_p.name}，掩膜走真实推理")
        except Exception as exc:
            _log(f"分割 ONNX 加载失败，回退几何掩膜: {exc}")
            self.segmenter_sess = None

    def _segment_with_onnx(self, bgr: np.ndarray):
        """256x256 自拍分割推理，返回 uint8 0/1 全分辨率掩膜（失败返回 None）。"""
        sess = getattr(self, "segmenter_sess", None)
        if sess is None:
            return None
        try:
            import cv2 as _cv2
            h, w = bgr.shape[:2]
            inp_bgr = _cv2.resize(bgr, (256, 256), interpolation=_cv2.INTER_LINEAR)
            inp_rgb = _cv2.cvtColor(inp_bgr, _cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
            # 兼容 NCHW / NHWC 两种导出
            inp_name = sess.get_inputs()[0].name
            shape = sess.get_inputs()[0].shape  # e.g. [1,3,256,256] or [1,256,256,3]
            if len(shape) == 4 and shape[1] == 3:
                inp = np.transpose(inp_rgb, (2, 0, 1))[None, ...]
            else:
                inp = inp_rgb[None, ...]
            out = sess.run(None, {inp_name: inp})[0]
            arr = np.array(out).squeeze()
            # 取通道 0 或 argmax，阈值 0.5
            if arr.ndim == 3:
                # [C,H,W] 或 [H,W,C] -> 取人物/皮肤通道
                if arr.shape[0] <= 4:
                    arr = arr[0] if arr.shape[0] == 1 else np.argmax(arr, axis=0)
                else:
                    arr = arr[:, :, 0]
            mask256 = (arr > 0.5).astype(np.uint8) * 255
            mask = _cv2.resize(mask256, (w, h), interpolation=_cv2.INTER_NEAREST)
            return (mask > 127).astype(np.uint8)
        except Exception as exc:
            _log(f"分割推理失败回退几何: {exc}")
            return None

    def detect_faces(self, bgr: np.ndarray):
        """BGR → [{bbox(x,y,w,h), score, landmarks_5[(x,y)*5]}]，坐标为像素"""
        if self.yunet is None:
            return []
        h, w = bgr.shape[:2]
        max_side = 1280
        scale = 1.0
        det_bgr = bgr
        if max(h, w) > max_side:
            scale = max_side / max(h, w)
            nh, nw = int(h * scale), int(w * scale)
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
        inv = 1.0 / scale if scale != 1.0 else 1.0
        for f in faces:
            x, y, ww, hh = float(f[0]) * inv, float(f[1]) * inv, float(f[2]) * inv, float(f[3]) * inv
            score = float(f[14]) if f.shape[0] > 14 else 0.9
            lmk = []
            if f.shape[0] >= 14:
                for k in range(5):
                    lmk.append((float(f[4 + k * 2]) * inv, float(f[4 + k * 2 + 1]) * inv))
            out.append({"bbox": (x, y, ww, hh), "score": score, "landmarks_5": lmk})
        return out

    def _mesh_landmarks(self, bgr, bbox):
        """用真实 face_mesh ONNX 在裁剪人脸内推理，返回 478 点归一化（相对整图）。

        face_landmark_468.onnx 输出 [1,1,1,1404] = 468*(x,y,z)，坐标相对裁剪框 [0,1]。
        前 468 为真实点，补充 10 个点（复制鼻尖附近）凑足 478，前端仅依赖前 468。
        扩框与 backend.py:_detect_faces 的 1.8× 逻辑对齐，避免侧脸真点被裁。
        """
        sess = self.facemesh_sess
        if sess is None:
            return None
        h, w = bgr.shape[:2]
        x, y, ww, hh = bbox
        # 与 mediapipe 分支一致：1.8× 最大边，中心 y 偏移 0.56，保证额头/下颌完整
        side = max(float(ww), float(hh)) * 1.8
        cx = x + ww / 2
        cy = y + hh * 0.56
        left = max(0, int(round(cx - side / 2)))
        top = max(0, int(round(cy - side / 2)))
        right = min(w, int(round(cx + side / 2)))
        bottom = min(h, int(round(cy + side / 2)))
        if right - left < 32 or bottom - top < 32:
            return None
        crop = bgr[top:bottom, left:right]
        ch, cw = crop.shape[:2]
        inp = cv2_resize_norm(crop)
        if inp is None:
            return None
        try:
            outputs = sess.run(None, {sess.get_inputs()[0].name: inp})
            raw = np.array(outputs[0]).reshape(-1, 3)
        except Exception as exc:
            _log(f"face_mesh 推理失败: {exc}")
            return None
        if raw.shape[0] < 468:
            return None
        SZ = self.MESH_INPUT_SIZE  # 192：模型输出为 192x192 输入内的像素坐标
        pts = []
        for p in raw[:468]:
            # 模型输出 p[0],p[1] 为 192x192 输入内的像素坐标 → 先归一化到 [0,1]
            nx_crop = p[0] / SZ
            ny_crop = p[1] / SZ
            # 再映射到实际裁剪框像素，最后到整图归一化
            nx = (left + nx_crop * cw) / w
            ny = (top + ny_crop * ch) / h
            pts.append((_clamp01(nx), _clamp01(ny)))
        # 补到 478：复制鼻尖（索引 1）附近点，前端只依赖前 468 真实点
        if len(pts) == 468:
            pts = pts + [pts[1]] * (478 - 468)
        return pts

    def landmarks_478(self, bgr: np.ndarray, bbox, landmarks_5):
        """返回 478×2 归一化关键点（真实 mesh 优先，否则几何生成兜底）。"""
        h, w = bgr.shape[:2]
        if self.facemesh_sess is not None:
            real = self._mesh_landmarks(bgr, bbox)
            if real and len(real) >= 478:
                return real[:478]
        # 几何兜底（仅当 face_mesh 模型缺失/失败）
        return _expand_5_to_478(bbox, landmarks_5, w, h)

    def segment_masks(self, bgr: np.ndarray, faces_478):
        """生成皮肤掩膜供 _face_outline 贴边用：精确脸廓扣眼唇，替代 mediapipe 分割。

        之前实心 fillPoly 导致 _skin_edge_point 搜不到边界，轮廓在椭圆上拉出折线；
        现按 backend._face_skin_mask_from_landmarks 的 FACE_OVAL - 眼×1.12 - 唇 逻辑
        在全分辨率上生成，外缘已是真脸缘，_face_outline 的 inside/outside/bias 才能生效。
        若已放置 selfie_matting_256.onnx，优先走 ONNX 分割（与 mediapipe 同效）。
        """
        h, w = bgr.shape[:2]
        import cv2 as _cv2
        # 1) 优先尝试真实分割 ONNX（若模型不存在则回退几何精确版）
        if SEGMENTER_PATH.exists() and getattr(self, "segmenter_sess", None) is not None:
            try:
                m = self._segment_with_onnx(bgr)
                if m is not None:
                    # body 复用同一掩膜的膨胀版（与 mediapipe 的 2|3 近似，不再用矩形占位）
                    body = _cv2.dilate(m, _cv2.getStructuringElement(_cv2.MORPH_ELLIPSE, (31, 31)))
                    return m, body
            except Exception:
                pass
        # 2) 精确几何：FACE_OVAL 实心 - 左眼/右眼/唇 镂空（与 mediapipe 前端一致）
        #    索引与 backend.FACE_OVAL/LEFT_EYE/RIGHT_EYE/OUTER_LIPS 保持同步
        _LEFT_EYE = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
        _RIGHT_EYE = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382]
        _OUTER_LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]
        mask = np.zeros((h, w), dtype=np.uint8)
        for pts in faces_478:
            if not pts or len(pts) <= max(max(_FACE_OVAL), max(_OUTER_LIPS)):
                continue
            poly = np.array(
                [(int(pts[i][0] * w), int(pts[i][1] * h)) for i in _FACE_OVAL if 0 <= i < len(pts)],
                dtype=np.int32,
            )
            if len(poly) >= 3:
                _cv2.fillPoly(mask, [poly], 1)
            # 镂空眼唇（与 mediapipe 的 1.12/1.03 放大保持一致，避免磨皮/液化牵连）
            for indices, grow in [(_LEFT_EYE, 1.12), (_RIGHT_EYE, 1.12), (_OUTER_LIPS, 1.03)]:
                eye_pts = []
                for idx in indices:
                    if 0 <= idx < len(pts):
                        eye_pts.append((pts[idx][0] * w, pts[idx][1] * h))
                if len(eye_pts) >= 3:
                    if grow != 1.0:
                        cx = sum(p[0] for p in eye_pts) / len(eye_pts)
                        cy = sum(p[1] for p in eye_pts) / len(eye_pts)
                        eye_pts = [(cx + (x - cx) * grow, cy + (y - cy) * grow) for x, y in eye_pts]
                    eye_poly = np.array([(int(x), int(y)) for x, y in eye_pts], dtype=np.int32)
                    _cv2.fillPoly(mask, [eye_poly], 0)
        # body：脸廓外扩约 35% 作为 body_skin 近似（替代之前的矩形占位，肤色调整更自然）
        try:
            kernel = _cv2.getStructuringElement(_cv2.MORPH_ELLIPSE, (max(21, w // 20), max(21, h // 20)))
            body = _cv2.dilate(mask, kernel)
        except Exception:
            body = mask.copy()
        return mask, body


def cv2_resize_norm(crop):
    """将 BGR 裁剪图转 RGB、resize 到 192x192、归一化到 [0,1] NHWC，供 face_mesh ONNX 使用。

    模型输入 input_1 为 [1,192,192,3]，MediaPipe FaceMesh 期望 RGB 且像素值 [0,1]。
    """
    try:
        import cv2 as _cv2
        rgb = _cv2.cvtColor(crop, _cv2.COLOR_BGR2RGB)
        inp = _cv2.resize(rgb, (192, 192), interpolation=_cv2.INTER_LINEAR)
        inp = inp.astype(np.float32) / 255.0
        return inp[None, ...]
    except Exception:
        return None
