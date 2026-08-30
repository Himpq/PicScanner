"""人脸修颜模块后端：mediapipe 关键点检测（带磁盘缓存）+ 变形图保存。

外置插件化：主 exe 已排除 mediapipe，缺失时返回 plugin_status 友好提示，不阻断主程序。
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import os
import threading
import urllib.request
from pathlib import Path

_FACE_PLUGIN_HINT = "人脸修颜插件未安装/依赖缺失：请将 face 插件包解压到 plugins/face（含 _libs/onnxruntime 或 mediapipe）或 pip install mediapipe"

# ONNX 轻量分支（保留；已按液化折线问题修复，开启 ONNX 供手动验证）
#  - 不删代码：encoder_onnx.py / model_onnx 完整保留
#  - 折线已修：mesh 扩框对齐 mediapipe 1.8×、掩膜精确扣眼唇、_face_outline 贴边生效
#  - 开关：环境变量 PICSCANNER_FACE_ONNX 控制，手动测试期默认 1（ONNX 优先）
_FACE_PREFER_ONNX = os.environ.get("PICSCANNER_FACE_ONNX", "1").strip() not in ("0", "false", "False")
try:
    from .encoder_onnx import FaceOnnxDetector as _FaceOnnxDetector, onnx_available as _onnx_available
    _ONNX_IMPORTED = True
except Exception:
    _FaceOnnxDetector = None  # type: ignore
    _onnx_available = lambda: False  # type: ignore
    _ONNX_IMPORTED = False

_onnx_detector = None
_onnx_lock = threading.Lock()

FACE_ALGORITHM_VERSION = "face-detector-full-range-landmarker-v15-onnxfix-arc"
LANDMARK_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)
DETECTOR_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-assets/"
    "face_detection_full_range_sparse.tflite"
)
SEGMENTER_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/"
    "selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite"
)

_detector = None
_detector_lock = threading.Lock()
_face_detector = None
_face_detector_lock = threading.Lock()
_segmenter = None
_segmenter_lock = threading.Lock()

OUTLINE_CURVES = {
    "left": [234, 93, 132, 58, 172, 136, 150, 149, 176],
    "right": [454, 323, 361, 288, 397, 365, 379, 378, 400],
    "jaw": [148, 152, 377],
}
FACE_SKIN_CATEGORY = 3
BODY_SKIN_CATEGORY = 2
EDGE_OUTER_RATIO = 0.075
EDGE_OUTER_MIN_PX = 18
EDGE_OUTER_MAX_PX = 70
EDGE_BOUNDARY_BIAS_RATIO = 0.022
EDGE_BOUNDARY_BIAS_MIN_PX = 6
EDGE_BOUNDARY_BIAS_MAX_PX = 18
FACE_AXIS_PAIRS = (
    (33, 263), (133, 362), (160, 387), (158, 385), (153, 380), (144, 373),
    (61, 291), (78, 308),
)

# 精确皮肤掩膜：脸部轮廓减去眼睛、嘴唇（MediaPipe FaceMesh 关键点索引）。
FACE_OVAL = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
    379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
    234, 127, 162, 21, 54, 103, 67, 109,
]
LEFT_EYE = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
RIGHT_EYE = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382]
OUTER_LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]
SKIN_MASK_MAX_SIDE = 1600


def _log(message):
    print(f"[PicScannerFace] {message}", flush=True)


class FaceModule:
    key = "face"

    def setup(self, ctx):
        ctx = ctx or {}
        data_dir = ctx.get("data_dir")
        self.data_dir = Path(data_dir) if data_dir else None
        self.storage = ctx.get("storage")
        self.cache_dir = (self.data_dir / "face_cache") if self.data_dir else None

    def api_methods(self):
        return {"detect": self.detect, "save_warped": self.save_warped}

    # ---------- 模型与检测器 ----------

    def _task_model_path(self, filename: str, url: str):
        # mediapipe 的 C 层在 Windows 上无法打开非 ASCII 路径，
        # 仓库路径含中文时把模型复制/下载到 %LOCALAPPDATA%\PicScannerFace。
        repo_model = Path(__file__).resolve().parent / "models" / filename
        if str(repo_model).isascii():
            target = repo_model
        else:
            ascii_root = os.environ.get("LOCALAPPDATA") or str(Path.home())
            target = Path(ascii_root) / "PicScannerFace" / filename
        if target.exists():
            return target
        if target != repo_model and repo_model.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(repo_model.read_bytes())
            return target
        target.parent.mkdir(parents=True, exist_ok=True)
        _log(f"下载人脸模型：{filename}...")
        urllib.request.urlretrieve(url, target)
        return target

    def _landmark_model_path(self):
        return self._task_model_path("face_landmarker.task", LANDMARK_MODEL_URL)

    def _detector_model_path(self):
        return self._task_model_path("face_detection_full_range_sparse.tflite", DETECTOR_MODEL_URL)

    def _segmenter_model_path(self):
        return self._task_model_path("selfie_multiclass_256x256.tflite", SEGMENTER_MODEL_URL)

    def _get_onnx_detector(self):
        global _onnx_detector
        if _onnx_detector is not None:
            return _onnx_detector
        with _onnx_lock:
            if _onnx_detector is not None:
                return _onnx_detector
            if not _ONNX_IMPORTED or not _onnx_available():
                return None
            try:
                _onnx_detector = _FaceOnnxDetector()
                if getattr(_onnx_detector, "yunet", None) is None:
                    return None
                return _onnx_detector
            except Exception as exc:
                print(f"[face] ONNX 检测器初始化失败，回退 mediapipe: {exc}")
                return None

    def _get_detector(self):
        global _detector
        if _detector is not None:
            return _detector
        with _detector_lock:
            if _detector is not None:
                return _detector
            try:
                import mediapipe as mp
                from mediapipe.tasks import python as mp_python
                from mediapipe.tasks.python import vision
            except ImportError:
                return None
            base = mp_python.BaseOptions(model_asset_path=str(self._landmark_model_path()))
            options = vision.FaceLandmarkerOptions(
                base_options=base,
                num_faces=1,
                min_face_detection_confidence=0.2,
                min_face_presence_confidence=0.2,
                min_tracking_confidence=0.2,
            )
            _detector = vision.FaceLandmarker.create_from_options(options)
            return _detector

    def _get_face_detector(self):
        global _face_detector
        if _face_detector is not None:
            return _face_detector
        with _face_detector_lock:
            if _face_detector is not None:
                return _face_detector
            try:
                from mediapipe.tasks import python as mp_python
                from mediapipe.tasks.python import vision
            except ImportError:
                return None
            base = mp_python.BaseOptions(model_asset_path=str(self._detector_model_path()))
            options = vision.FaceDetectorOptions(
                base_options=base,
                min_detection_confidence=0.3,
                min_suppression_threshold=0.3,
            )
            _face_detector = vision.FaceDetector.create_from_options(options)
            return _face_detector

    def _get_segmenter(self):
        global _segmenter
        if _segmenter is not None:
            return _segmenter
        with _segmenter_lock:
            if _segmenter is not None:
                return _segmenter
            try:
                from mediapipe.tasks import python as mp_python
                from mediapipe.tasks.python import vision
            except ImportError:
                return None
            base = mp_python.BaseOptions(model_asset_path=str(self._segmenter_model_path()))
            options = vision.ImageSegmenterOptions(
                base_options=base,
                output_confidence_masks=False,
                output_category_mask=True,
            )
            _segmenter = vision.ImageSegmenter.create_from_options(options)
            return _segmenter

    def _segment_skin_masks(self, mp, rgb):
        """分割器跑一次，同时返回脸部皮肤掩膜（类别3）和全身皮肤掩膜（身体2|脸部3）。"""
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self._get_segmenter().segment(image)
        mask = result.category_mask.numpy_view()
        if mask.ndim == 3:
            mask = mask[:, :, 0]
        face_skin = mask == FACE_SKIN_CATEGORY
        body_skin = (mask == BODY_SKIN_CATEGORY) | face_skin
        return face_skin, body_skin

    @staticmethod
    def _encode_skin_mask(skin_mask, Image):
        """皮肤掩膜降采样到最长边 256 后编码为灰度 PNG base64，供前端磨皮/美白。

        掩膜是大块连通区域，无需全分辨率；降采样后只有几 KB，不随原图尺寸膨胀。
        """
        import io

        import numpy as np

        arr = np.asarray(skin_mask, dtype=np.uint8) * 255
        height, width = arr.shape[:2]
        img = Image.fromarray(arr, "L")
        if max(height, width) > 256:
            scale = 256.0 / max(height, width)
            img = img.resize(
                (max(1, round(width * scale)), max(1, round(height * scale))),
                Image.BILINEAR,
            )
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("ascii")

    @staticmethod
    def _face_skin_mask_from_landmarks(faces, width, height, Image):
        """用 FaceMesh 关键点渲染精确皮肤掩膜：脸部轮廓减去眼睛、嘴唇。

        在最长边 SKIN_MASK_MAX_SIDE 的画布上光栅化，边界比 256px 分割掩膜精确得多，
        且天然避开眼睛/嘴唇（分割掩膜的"脸部皮肤"类别不区分五官）。眼睛多边形从质心
        放大 1.12 倍以盖住睫毛，嘴唇放大 1.03 倍。返回 uint8 数组（0/255）。
        """
        from PIL import ImageDraw

        scale = min(1.0, SKIN_MASK_MAX_SIDE / max(width, height))
        mw = max(1, round(width * scale))
        mh = max(1, round(height * scale))
        mask = Image.new("L", (mw, mh), 0)
        draw = ImageDraw.Draw(mask)

        def polygon(landmarks, indices, grow=1.0):
            pts = []
            for i in indices:
                if i < len(landmarks):
                    pts.append((landmarks[i][0] * mw, landmarks[i][1] * mh))
            if len(pts) >= 3 and grow != 1.0:
                cx = sum(p[0] for p in pts) / len(pts)
                cy = sum(p[1] for p in pts) / len(pts)
                pts = [(cx + (p[0] - cx) * grow, cy + (p[1] - cy) * grow) for p in pts]
            return pts

        need = max(max(FACE_OVAL), max(OUTER_LIPS), max(LEFT_EYE), max(RIGHT_EYE))
        for landmarks in faces:
            if not landmarks or len(landmarks) <= need:
                continue
            draw.polygon(polygon(landmarks, FACE_OVAL), fill=255)
            draw.polygon(polygon(landmarks, LEFT_EYE, grow=1.12), fill=0)
            draw.polygon(polygon(landmarks, RIGHT_EYE, grow=1.12), fill=0)
            draw.polygon(polygon(landmarks, OUTER_LIPS, grow=1.03), fill=0)

        import numpy as np

        return np.asarray(mask, dtype=np.uint8)

    @staticmethod
    def _face_lip_mask_from_landmarks(faces, width, height, Image):
        """用 OUTER_LIPS 关键点围出唇部多边形并填充，得到唇部掩膜（供唇色调色）。

        渲染分辨率与皮肤掩膜一致（SKIN_MASK_MAX_SIDE）。返回 uint8 数组（0/255）。
        """
        from PIL import ImageDraw

        scale = min(1.0, SKIN_MASK_MAX_SIDE / max(width, height))
        mw = max(1, round(width * scale))
        mh = max(1, round(height * scale))
        mask = Image.new("L", (mw, mh), 0)
        draw = ImageDraw.Draw(mask)
        need = max(OUTER_LIPS)
        for landmarks in faces:
            if not landmarks or len(landmarks) <= need:
                continue
            pts = [
                (landmarks[i][0] * mw, landmarks[i][1] * mh)
                for i in OUTER_LIPS
                if i < len(landmarks)
            ]
            if len(pts) >= 3:
                draw.polygon(pts, fill=255)

        import numpy as np

        return np.asarray(mask, dtype=np.uint8)

    @staticmethod
    def _encode_mask_png(mask_arr, Image):
        """把 uint8 掩膜数组按原渲染分辨率编码为灰度 PNG base64（不降采样）。"""
        import io

        img = Image.fromarray(mask_arr, "L")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("ascii")

    @staticmethod
    def _mask_has_skin(mask, width, height, x, y):
        mask_height, mask_width = mask.shape[:2]
        px = min(mask_width - 1, max(0, round(x * (mask_width - 1) / max(1, width - 1))))
        py = min(mask_height - 1, max(0, round(y * (mask_height - 1) / max(1, height - 1))))
        return bool(mask[py, px])

    def _skin_edge_point(self, point, center, mask, width, height, face_width):
        """仅在关键点附近寻找连续皮肤边缘，避免跨过发丝投射到耳朵。"""
        px, py = point
        vx, vy = px - center[0], py - center[1]
        length = (vx * vx + vy * vy) ** 0.5
        if length < 1:
            return point, False, False
        ux, uy = vx / length, vy / length
        inside = min(12, max(4, face_width * 0.018))
        # 自拍分割会把耳朵也标成 face skin；Face Mesh 脸缘才是主边界，
        # 因此只允许皮肤分割在其外侧做一条很窄的微调带。
        outside = min(EDGE_OUTER_MAX_PX, max(EDGE_OUTER_MIN_PX, face_width * EDGE_OUTER_RATIO))
        last_skin = None
        # 关键点可能刚好落在边缘外，先只向面部内部回退寻找起点。
        for offset in range(0, -round(inside) - 1, -2):
            x, y = px + ux * offset, py + uy * offset
            if self._mask_has_skin(mask, width, height, x, y):
                last_skin = (x, y)
                break
        if last_skin is None:
            return point, False, False
        missing = 0
        stopped_at_edge = False
        for offset in range(2, round(outside) + 1, 2):
            x, y = px + ux * offset, py + uy * offset
            if not (0 <= x < width and 0 <= y < height):
                break
            if self._mask_has_skin(mask, width, height, x, y):
                last_skin = (x, y)
                missing = 0
            elif last_skin is not None and offset >= 0:
                missing += 1
                if missing >= 2:
                    stopped_at_edge = True
                    break
        if stopped_at_edge and last_skin is not None:
            # 256px 分割掩码会把边缘量化并羽化到脸内；仅在已确认离开皮肤区域时向外补偿。
            bias = min(
                EDGE_BOUNDARY_BIAS_MAX_PX,
                max(EDGE_BOUNDARY_BIAS_MIN_PX, face_width * EDGE_BOUNDARY_BIAS_RATIO),
            )
            edge_x = min(width - 1, max(0, last_skin[0] + ux * bias))
            edge_y = min(height - 1, max(0, last_skin[1] + uy * bias))
            return (edge_x, edge_y), True, True
        return last_skin or point, True, False

    @staticmethod
    def _face_axis(landmarks, width, height):
        """用双眼、嘴部及下巴的稳定内侧点拟合脸部中轴，避开被手遮挡的脸缘。"""
        samples = []
        for left_index, right_index in FACE_AXIS_PAIRS:
            left = landmarks[left_index]
            right = landmarks[right_index]
            samples.append(((left[0] + right[0]) * width / 2, (left[1] + right[1]) * height / 2))
        chin = landmarks[152]
        samples.append((chin[0] * width, chin[1] * height))
        mean_y = sum(point[1] for point in samples) / len(samples)
        mean_x = sum(point[0] for point in samples) / len(samples)
        variance = sum((point[1] - mean_y) ** 2 for point in samples)
        slope = 0.0 if variance < 1 else sum(
            (point[1] - mean_y) * (point[0] - mean_x) for point in samples
        ) / variance
        return slope, mean_x - slope * mean_y

    @staticmethod
    def _estimate_profile(landmarks, width, height):
        """用鼻梁到左右脸缘距离的比值估计偏航，比值显著偏离 1 判为侧脸。

        侧脸时远侧关键点塌到近侧轮廓，左右距离严重不对称；正脸该比值稳定在 1 附近。
        """
        nose_bridge = landmarks[168]
        left_edge = landmarks[234]
        right_edge = landmarks[454]

        def dist(a, b):
            return ((a[0] - b[0]) ** 2 * width * width + (a[1] - b[1]) ** 2 * height * height) ** 0.5

        dist_left = dist(nose_bridge, left_edge)
        dist_right = dist(nose_bridge, right_edge)
        if min(dist_left, dist_right) < 1e-6:
            return True
        ratio = dist_left / dist_right
        return ratio > 2.2 or ratio < 0.45

    def _repair_occluded_side(self, outline, support, landmarks, width, height):
        """一侧轮廓缺少皮肤支撑时，整侧按可靠侧绕脸部中轴镜像，避免线条跳到手或发丝上。"""
        left_points = outline.get("left", [])
        right_points = outline.get("right", [])
        if len(left_points) != len(right_points) or not left_points:
            return "无"
        left_count = sum(support.get("left", []))
        right_count = sum(support.get("right", []))
        threshold = len(left_points) / 2
        if left_count >= threshold and right_count < threshold:
            source_key, target_key = "left", "right"
        elif right_count >= threshold and left_count < threshold:
            source_key, target_key = "right", "left"
        else:
            return "无"
        slope, intercept = self._face_axis(landmarks, width, height)
        mirrored = []
        for x, y in outline[source_key]:
            px, py = x * width, y * height
            axis_x = slope * py + intercept
            mirrored.append([max(0.0, min(1.0, (2 * axis_x - px) / width)), y])
        outline[target_key] = mirrored
        return f"{target_key}侧镜像 {len(mirrored)} 点（{source_key}侧支撑 {sum(support[source_key])}/{len(left_points)}，{target_key}侧支撑 {sum(support[target_key])}/{len(right_points)}）"

    def _face_outline(self, landmarks, skin_mask, width, height, is_profile=False):
        if not landmarks or len(landmarks) <= 454:
            return {}
        center = (landmarks[1][0] * width, landmarks[1][1] * height)
        left = landmarks[234]
        right = landmarks[454]
        face_width = max(1.0, ((right[0] - left[0]) ** 2 + (right[1] - left[1]) ** 2) ** 0.5 * width)
        outline = {}
        support = {}
        adjusted_points = 0
        biased_points = 0
        max_shift = 0.0
        for key, indices in OUTLINE_CURVES.items():
            points = []
            point_support = []
            for index in indices:
                landmark = landmarks[index]
                source_x, source_y = landmark[0] * width, landmark[1] * height
                (edge_x, edge_y), has_skin_support, edge_biased = self._skin_edge_point(
                    (source_x, source_y),
                    center,
                    skin_mask,
                    width,
                    height,
                    face_width,
                )
                shift = ((edge_x - source_x) ** 2 + (edge_y - source_y) ** 2) ** 0.5
                if shift > 0.5:
                    adjusted_points += 1
                if edge_biased:
                    biased_points += 1
                max_shift = max(max_shift, shift)
                points.append([edge_x / width, edge_y / height])
                point_support.append(has_skin_support)
            outline[key] = points
            support[key] = point_support
        # 侧脸远侧轮廓本就无皮肤支撑，属正常现象而非遮挡，镜像修复会把正脸轮廓贴到侧脸上。
        if is_profile:
            repaired_side = "跳过（侧脸）"
        else:
            repaired_side = self._repair_occluded_side(outline, support, landmarks, width, height)
        _log(
            "轮廓皮肤边缘："
            f"面宽 {face_width:.1f}px，调整 {adjusted_points} 点（边缘外推 {biased_points} 点），"
            f"最大 {max_shift:.1f}px，外扩上限 "
            f"{min(EDGE_OUTER_MAX_PX, max(EDGE_OUTER_MIN_PX, face_width * EDGE_OUTER_RATIO)):.1f}px，"
            f"遮挡修复 {repaired_side}"
        )
        return outline

    def _landmarks_from_full_image(self, mp, rgb, width, height, bounds):
        """裁剪漏检时的回退：在整图上跑关键点模型，并按位置匹配回候选框。

        侧脸在裁剪框里往往"脸占满画面"，关键点模型内部检测器会漏检；
        整图中脸占比适中，通常能检出。用关键点质心是否落在候选框附近来
        确认是同一张脸，避免多人时张冠李戴。
        """
        full_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self._get_detector().detect(full_image)
        if not result.face_landmarks:
            return None
        points = result.face_landmarks[0]
        center_x = sum(p.x for p in points) / len(points) * width
        center_y = sum(p.y for p in points) / len(points) * height
        box_left, box_top, box_right, box_bottom = bounds
        box_width = box_right - box_left
        box_height = box_bottom - box_top
        if not (
            box_left - box_width <= center_x <= box_right + box_width
            and box_top - box_height <= center_y <= box_bottom + box_height
        ):
            return None
        return [[min(1.0, max(0.0, p.x)), min(1.0, max(0.0, p.y))] for p in points]

    def _detect_faces(self, mp, np, Image, rgb, width, height, skin_mask):
        def score(detection):
            categories = detection.categories or []
            return max((float(category.score or 0) for category in categories), default=0.0)

        full_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self._get_face_detector().detect(full_image)
        candidates = []
        for detection in result.detections or []:
            box = detection.bounding_box
            if not box or box.width <= 0 or box.height <= 0:
                continue
            bounds = (
                max(0, int(box.origin_x)),
                max(0, int(box.origin_y)),
                min(width, int(box.origin_x + box.width)),
                min(height, int(box.origin_y + box.height)),
            )
            if bounds[2] > bounds[0] and bounds[3] > bounds[1]:
                candidates.append({"score": score(detection), "bounds": bounds})
        candidates.sort(key=lambda item: item["score"], reverse=True)
        _log(
            f"全图人脸框检测：{len(candidates)} 个候选，图像 {width}x{height}"
        )

        faces = []
        outlines = []
        profiles = []
        for index, candidate in enumerate(candidates):
            box_left, box_top, box_right, box_bottom = candidate["bounds"]
            box_width = box_right - box_left
            box_height = box_bottom - box_top
            # 扩展框以覆盖额头、下颌和耳侧，再送入 478 点模型。
            side = max(float(box_width), float(box_height)) * 1.8
            center_x = box_left + box_width / 2
            center_y = box_top + box_height * 0.56
            left = max(0, int(round(center_x - side / 2)))
            top = max(0, int(round(center_y - side / 2)))
            right = min(width, int(round(center_x + side / 2)))
            bottom = min(height, int(round(center_y + side / 2)))
            if right - left < 32 or bottom - top < 32:
                continue
            crop_rgb = np.ascontiguousarray(rgb[top:bottom, left:right])
            crop_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=crop_rgb)
            landmarks_result = self._get_detector().detect(crop_image)
            if landmarks_result.face_landmarks:
                landmark_face = landmarks_result.face_landmarks[0]
                crop_width = right - left
                crop_height = bottom - top
                normalized_landmarks = [
                    [
                        min(1.0, max(0.0, (left + point.x * crop_width) / width)),
                        min(1.0, max(0.0, (top + point.y * crop_height) / height)),
                    ]
                    for point in landmark_face
                ]
            else:
                normalized_landmarks = self._landmarks_from_full_image(
                    mp, rgb, width, height, candidate["bounds"]
                )
                if normalized_landmarks is None:
                    _log(
                        f"候选 {index + 1} 未生成关键点（裁剪与全图回退均失败），"
                        f"框=({left},{top})-({right},{bottom})"
                    )
                    continue
                _log(f"候选 {index + 1} 裁剪漏检，全图回退成功")
            is_profile = self._estimate_profile(normalized_landmarks, width, height)
            faces.append(normalized_landmarks)
            outlines.append(self._face_outline(normalized_landmarks, skin_mask, width, height, is_profile))
            profiles.append(is_profile)
            _log(
                f"候选 {index + 1} 关键点成功，置信度 {candidate['score']:.3f}"
                + ("，侧脸" if is_profile else "")
            )
        return faces, outlines, profiles

    def _detect_with_onnx(self, bgr, width, height):
        """ONNX 分支：YuNet 检测 + face_mesh ONNX 关键点（真实 478）+ 与 mediapipe 同套轮廓逻辑。

        关键点由真实 face_mesh 模型给出（468 点补齐到 478）；轮廓/侧脸/遮挡处理
        直接复用 mediapipe 分支的 _face_outline / _estimate_profile / _repair_occluded_side，
        保证两路曲线质量一致。皮肤掩膜用 face_mesh 脸廓几何掩膜顶替 mediapipe 分割器输出。
        """
        onnx_det = self._get_onnx_detector()
        if onnx_det is None:
            return None
        try:
            import numpy as np
            dets = onnx_det.detect_faces(bgr)
            if not dets:
                return None
            faces = []
            outlines = []
            profiles = []
            for d in dets:
                bbox = d["bbox"]
                lmk5 = d["landmarks_5"]
                pts478 = onnx_det.landmarks_478(bgr, bbox, lmk5)
                if not pts478 or len(pts478) < 478:
                    _log("ONNX 关键点不足 478，跳过该脸")
                    continue
                # 转成纯 Python float，避免 numpy float32 无法 JSON 序列化（_face_outline 输出也会受影响）
                pts_py = [[float(p[0]), float(p[1])] for p in pts478]
                faces.append(pts_py)
            if not faces:
                return None
            # 几何皮肤掩膜（脸廓多边形），作为 _face_outline 的边缘贴合依据
            face_skin, body_skin = onnx_det.segment_masks(bgr, faces)
            skin_bool = np.asarray(face_skin, dtype=bool)
            for landmarks in faces:
                is_profile = self._estimate_profile(landmarks, width, height)
                profiles.append(is_profile)
                outlines.append(self._face_outline(landmarks, skin_bool, width, height, is_profile))
            return faces, outlines, profiles, face_skin, body_skin
        except Exception as exc:
            _log(f"ONNX 检测失败回退 mediapipe: {exc}")
            import traceback
            _log(traceback.format_exc())
            return None

    # ---------- 缓存 ----------

    def _cache_key(self, path: Path) -> str:
        stat = path.stat()
        raw = f"{FACE_ALGORITHM_VERSION}|{path.resolve()}|{stat.st_mtime_ns}|{stat.st_size}"
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()

    def _read_cache(self, key: str):
        if not self.cache_dir:
            return None
        cache_path = self.cache_dir / key[:2] / f"{key}.json"
        try:
            return json.loads(cache_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None

    def _detect_with_mediapipe(self, path, key, image=None):
        """MediaPipe 分支（精确 478 点 + 自拍分割掩膜），返回 payload 或 None。

        模型/依赖缺失或异常时返回 None，由 detect() 回退到 ONNX 分支。
        image 为 detect() 已解码的 PIL Image（RAW 已开发），传入则复用。
        """
        try:
            face_detector = self._get_face_detector()
            landmark_detector = self._get_detector()
            segmenter = self._get_segmenter()
        except Exception:
            return None
        if face_detector is None or landmark_detector is None or segmenter is None:
            return None
        try:
            import mediapipe as mp
            import numpy as np
            from PIL import Image, ImageOps

            if image is None:
                with Image.open(path) as opened:
                    image = ImageOps.exif_transpose(opened).convert("RGB")
            rgb = np.ascontiguousarray(image)
            width, height = image.size
            face_skin, body_skin = self._segment_skin_masks(mp, rgb)
            faces, outlines, profiles = self._detect_faces(mp, np, Image, rgb, width, height, face_skin)
            skin_mask_fm = self._face_skin_mask_from_landmarks(faces, width, height, Image)
            skin_mask_b64 = self._encode_mask_png(skin_mask_fm, Image)
            lip_mask_fm = self._face_lip_mask_from_landmarks(faces, width, height, Image)
            lip_mask_b64 = self._encode_mask_png(lip_mask_fm, Image)
            body_skin_arr = np.asarray(body_skin, dtype=np.uint8) * 255
            bscale = min(1.0, 1024 / max(body_skin_arr.shape[1], body_skin_arr.shape[0]))
            if bscale < 1.0:
                body_skin_arr = np.asarray(
                    Image.fromarray(body_skin_arr, "L").resize(
                        (
                            max(1, round(body_skin_arr.shape[1] * bscale)),
                            max(1, round(body_skin_arr.shape[0] * bscale)),
                        ),
                        Image.BILINEAR,
                    ),
                    dtype=np.uint8,
                )
            body_skin_b64 = self._encode_mask_png(body_skin_arr, Image)
            _log(f"轮廓解析完成：{len(outlines)} 张脸")
        except Exception as exc:
            _log(f"MediaPipe 检测失败回退 ONNX: {exc}")
            return None

        payload = {
            "width": int(width),
            "height": int(height),
            "faces": faces,
            "outlines": outlines,
            "profiles": profiles,
            "skin_mask": skin_mask_b64,
            "lip_mask": lip_mask_b64,
            "body_skin_mask": body_skin_b64,
        }
        if faces:
            self._write_cache(key, payload)
        return {"success": True, "cached": False, **payload}

    def _detect_with_onnx_pipeline(self, path, key, image=None):
        """ONNX 分支封装：读图→检测→编码掩膜→返回 payload 或 None。
        image 为 detect() 已解码的 PIL Image（RAW 已开发），传入则复用。"""
        onnx_det = self._get_onnx_detector()
        if onnx_det is None:
            return None
        try:
            import numpy as np
            from PIL import Image, ImageOps
            if image is None:
                with Image.open(path) as opened:
                    image = ImageOps.exif_transpose(opened).convert("RGB")
            rgb = np.ascontiguousarray(image)
            width, height = image.size
            bgr = rgb[:, :, ::-1].copy()
            onnx_res = self._detect_with_onnx(bgr, width, height)
            if not onnx_res:
                return None
            faces, outlines, profiles, face_skin, body_skin = onnx_res
            from PIL import Image as _Img2
            face_skin_arr = (np.asarray(face_skin, dtype=np.uint8) * 255).astype(np.uint8) if face_skin is not None else np.zeros((height, width), dtype=np.uint8)
            body_skin_arr = (np.asarray(body_skin, dtype=np.uint8) * 255).astype(np.uint8) if body_skin is not None else np.zeros((height, width), dtype=np.uint8)
            skin_mask_fm = face_skin_arr
            skin_mask_b64 = self._encode_mask_png(skin_mask_fm, _Img2)
            # 唇部掩膜：用真实嘴部关键点中心画椭圆（face_mesh 有 478 点）
            lip_mask_fm = np.zeros((face_skin_arr.shape[0], face_skin_arr.shape[1]), dtype=np.uint8)
            if faces and len(faces) > 0:
                try:
                    import PIL.ImageDraw as _ID
                    f0 = faces[0]
                    mouth_idx = [0, 13, 14, 17, 61, 291, 78, 308]
                    pts = [f0[i] for i in mouth_idx if i < len(f0)]
                    if pts:
                        cx = int(sum(p[0] for p in pts) / len(pts) * width)
                        cy = int(sum(p[1] for p in pts) / len(pts) * height)
                        lx = f0[61][0] * width if 61 < len(f0) else cx
                        rx = f0[291][0] * width if 291 < len(f0) else cx
                        mw = max(24, abs(rx - lx) * 1.6)
                        _lip = Image.new("L", (skin_mask_fm.shape[1], skin_mask_fm.shape[0]), 0)
                        _draw = _ID.Draw(_lip)
                        _draw.ellipse([cx - mw / 2, cy - 14, cx + mw / 2, cy + 14], fill=255)
                        lip_mask_fm = np.asarray(_lip, dtype=np.uint8)
                except Exception as exc:
                    _log(f"唇部掩膜生成失败: {exc}")
                    lip_mask_fm = np.zeros_like(face_skin_arr)
            lip_mask_b64 = self._encode_mask_png(lip_mask_fm, _Img2)
            bscale = min(1.0, 1024 / max(body_skin_arr.shape[1], body_skin_arr.shape[0])) if body_skin_arr.size else 1.0
            if bscale < 1.0:
                body_skin_arr = np.asarray(
                    _Img2.fromarray(body_skin_arr, "L").resize(
                        (max(1, round(body_skin_arr.shape[1] * bscale)), max(1, round(body_skin_arr.shape[0] * bscale))),
                        _Img2.BILINEAR,
                    ),
                    dtype=np.uint8,
                )
            body_skin_b64 = self._encode_mask_png(body_skin_arr, _Img2)
            payload = {"width": int(width), "height": int(height), "faces": faces, "outlines": outlines, "profiles": profiles, "skin_mask": skin_mask_b64, "lip_mask": lip_mask_b64, "body_skin_mask": body_skin_b64}
            if faces:
                self._write_cache(key, payload)
            _log(f"ONNX 检测完成：{path.name}，{len(faces)} 张脸")
            return {"success": True, "cached": False, **payload}
        except Exception as exc:
            _log(f"ONNX 分支异常: {exc}")
            return None

    def _write_cache(self, key: str, payload: dict):
        if not self.cache_dir:
            return
        cache_path = self.cache_dir / key[:2] / f"{key}.json"
        try:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text(json.dumps(payload), encoding="utf-8")
        except OSError as exc:
            _log(f"关键点缓存写入失败: {exc}")

    # ---------- API 方法 ----------

    def detect(self, photo_id, force=False):
        if self.storage is None:
            return {"success": False, "message": "存储后端不可用"}
        try:
            photo = self.storage.get_photo(int(photo_id))
        except (TypeError, ValueError):
            return {"success": False, "message": "照片 ID 无效"}
        if not photo:
            return {"success": False, "message": "照片不存在"}
        path = Path(str(photo.get("path") or ""))
        if not path.exists() or not path.is_file():
            return {"success": False, "message": f"图片文件不存在: {path}"}

        key = self._cache_key(path)
        if not force:
            cached = self._read_cache(key)
            if cached:
                return {"success": True, "cached": True, **cached}

        # 统一解码：RAW（.arw/.cr2/.nef 等）用 rawpy 开发成 RGB，其余用 PIL 打开。
        # 两个 detect 分支共享同一张已解码图片，避免重复解码且支持 RAW。
        decoded_image = None
        try:
            from PIL import Image
            from app.backend.thumbnailer import is_raw_image

            if is_raw_image(path):
                try:
                    from app.backend.raw_developer import develop_raw_array, _rgb_to_uint8
                    rgb, _clean = develop_raw_array(path, output_bps=8)
                    if rgb is not None:
                        decoded_image = Image.fromarray(_rgb_to_uint8(rgb)).convert("RGB")
                except Exception as exc:
                    _log(f"RAW 显影失败，尝试直接打开: {exc}")
            if decoded_image is None:
                from PIL import ImageOps
                with Image.open(path) as opened:
                    decoded_image = ImageOps.exif_transpose(opened).convert("RGB")
        except Exception as exc:
            return {"success": False, "message": f"图片解码失败: {exc}"}
        if decoded_image is None:
            return {"success": False, "message": "图片解码失败"}

        # 默认切回 MediaPipe（ONNX 代码保留，仅作回退）；置 PICSCANNER_FACE_ONNX=1 可切回 ONNX 优先
        if _FACE_PREFER_ONNX:
            result = self._detect_with_onnx_pipeline(path, key, image=decoded_image)
            if result is not None:
                _log("检测路径：ONNX 优先（环境变量 PICSCANNER_FACE_ONNX=1）")
                return result
            result = self._detect_with_mediapipe(path, key, image=decoded_image)
            if result is not None:
                return result
        else:
            result = self._detect_with_mediapipe(path, key, image=decoded_image)
            if result is not None:
                return result
            result = self._detect_with_onnx_pipeline(path, key, image=decoded_image)
            if result is not None:
                _log("检测路径：MediaPipe 失败，回退到 ONNX（代码保留）")
                return result
        # 两条路都不可用：给出友好提示（模型缺失等）
        return {
            "success": False,
            "message": _FACE_PLUGIN_HINT,
            "hint": _FACE_PLUGIN_HINT,
        }

    def save_warped(self, data_url, source_path):
        text = str(data_url or "")
        marker = ";base64,"
        if not text.startswith("data:") or marker not in text:
            return {"success": False, "message": "保存数据格式无效"}
        try:
            binary = base64.b64decode(text.split(marker, 1)[1], validate=True)
        except (binascii.Error, ValueError) as exc:
            return {"success": False, "message": f"图片数据解码失败: {exc}"}
        if not binary:
            return {"success": False, "message": "图片数据为空"}

        source = Path(str(source_path or ""))
        directory = source.parent if source.parent.exists() else Path.cwd()
        stem = source.stem or "photo"
        target = directory / f"{stem}_face.jpg"
        counter = 1
        while target.exists():
            counter += 1
            target = directory / f"{stem}_face_{counter}.jpg"
        try:
            with target.open("xb") as fh:
                fh.write(binary)
        except Exception as exc:
            return {"success": False, "message": f"保存失败: {exc}"}
        return {
            "success": True,
            "path": str(target),
            "filename": target.name,
            "message": f"已保存到 {target}",
        }

    def plugin_status(self):
        libs = Path(__file__).resolve().parents[3] / "plugins" / "face" / "_libs"
        # 状态上报：默认 mediapipe 优先，ONNX 仅回退（代码保留）
        has_onnx = False
        onnx_mode = "missing"
        try:
            if _ONNX_IMPORTED and _onnx_available():
                has_onnx = True
                # 尝试读取真实 detector 的 mode（yunet+mesh / geom）
                try:
                    _det = self._get_onnx_detector()
                    onnx_mode = getattr(_det, "mode", "onnx-yunet-geom") if _det else "onnx-yunet-geom"
                except Exception:
                    onnx_mode = "onnx-yunet-geom"
        except Exception:
            has_onnx = False
        try:
            import mediapipe  # type: ignore

            has_mp = True
            mp_ver = getattr(mediapipe, "__version__", "?")
        except Exception as exc:
            has_mp = False
            mp_ver = str(exc)
        available = has_onnx or has_mp
        # 默认切回 mediapipe：两者皆可用时 mode=mediapipe；仅当 PICSCANNER_FACE_ONNX=1 且 onnx 可用时才报 onnx
        if _FACE_PREFER_ONNX and has_onnx:
            mode = "onnx"
        elif has_mp:
            mode = "mediapipe"
        elif has_onnx:
            mode = "onnx"
        else:
            mode = "missing"
        return {
            "success": True,
            "available": available,
            "mode": mode,
            "has_onnx": has_onnx,
            "onnx_mode": onnx_mode,
            "has_mediapipe": has_mp,
            "mediapipe_version": mp_ver,
            "libs_exists": libs.is_dir(),
            "prefer_onnx": _FACE_PREFER_ONNX,
            "hint": "" if available else _FACE_PLUGIN_HINT,
        }


MODULE_CLASS = FaceModule
