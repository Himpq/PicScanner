"""人脸修颜模块后端：mediapipe 关键点检测（带磁盘缓存）+ 变形图保存。

mediapipe 为懒加载：未安装时模块照常加载，调用 detect 才返回友好错误。
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

FACE_ALGORITHM_VERSION = "face-detector-full-range-landmarker-v4"
LANDMARK_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)
DETECTOR_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-assets/"
    "face_detection_full_range_sparse.tflite"
)

_detector = None
_detector_lock = threading.Lock()
_face_detector = None
_face_detector_lock = threading.Lock()


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

    def _detect_faces(self, mp, np, Image, rgb, width, height):
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
            if not landmarks_result.face_landmarks:
                _log(f"候选 {index + 1} 未生成关键点，框=({left},{top})-({right},{bottom})")
                continue
            landmark_face = landmarks_result.face_landmarks[0]
            crop_width = right - left
            crop_height = bottom - top
            faces.append([
                [
                    min(1.0, max(0.0, (left + point.x * crop_width) / width)),
                    min(1.0, max(0.0, (top + point.y * crop_height) / height)),
                ]
                for point in landmark_face
            ])
            _log(f"候选 {index + 1} 关键点成功，置信度 {candidate['score']:.3f}")
        return faces

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

        try:
            face_detector = self._get_face_detector()
            landmark_detector = self._get_detector()
        except Exception as exc:
            return {"success": False, "message": f"人脸模型初始化失败: {exc}"}
        if face_detector is None or landmark_detector is None:
            return {
                "success": False,
                "message": "未安装 mediapipe，无法检测人脸（pip install mediapipe）",
            }

        try:
            import mediapipe as mp
            import numpy as np
            from PIL import Image, ImageOps

            with Image.open(path) as opened:
                # 与浏览器解码方向保持一致，landmarks 坐标在"已定向"像素空间
                image = ImageOps.exif_transpose(opened).convert("RGB")
                rgb = np.ascontiguousarray(image)
                width, height = image.size
            faces = self._detect_faces(mp, np, Image, rgb, width, height)
        except Exception as exc:
            return {"success": False, "message": f"人脸检测失败: {exc}"}

        payload = {"width": int(width), "height": int(height), "faces": faces}
        # 空结果不缓存，避免一次误检把该照片永久锁定为“无人脸”。
        if faces:
            self._write_cache(key, payload)
        _log(f"检测完成：{path.name}，{len(faces)} 张脸")
        return {"success": True, "cached": False, **payload}

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


MODULE_CLASS = FaceModule
