from __future__ import annotations

import base64
import binascii
import io
import os
import re
from pathlib import Path

from .metadata_copy import MetadataCopyError, copy_complete_metadata
from .storage import storage


BATCH_FORMATS = {
    "jpg": {
        "label": "JPEG",
        "suffix": ".jpg",
        "output_mime": "image/jpeg",
        "transport_mime": "image/jpeg",
    },
    "png": {
        "label": "PNG",
        "suffix": ".png",
        "output_mime": "image/png",
        "transport_mime": "image/png",
    },
    "tiff": {
        "label": "TIFF",
        "suffix": ".tif",
        "output_mime": "image/tiff",
        "transport_mime": "image/png",
    },
}
BATCH_TEMPLATE_FIELDS = {
    "origin_name", "filename", "date", "Y", "M", "D",
    "len_name", "lens_name", "aperture", "iso", "shutter",
    "camera", "model", "format",
}


class BatchProcessingApiMixin:
    def validate_batch_output_settings(self, destination, format_key="jpg", naming_template="{origin_name}_edited"):
        key = str(format_key or "").strip().lower()
        if key not in BATCH_FORMATS:
            return {"success": False, "message": f"批量导出格式不支持: {key or '空'}"}
        target_root = Path(str(destination or "").strip()).resolve(strict=False)
        if not target_root.exists() or not target_root.is_dir():
            return {"success": False, "message": f"批量导出目录不存在: {target_root}"}
        template = str(naming_template or "").strip()
        if not template:
            return {"success": False, "message": "批量命名模板不能为空"}
        if len(template) > 240:
            return {"success": False, "message": "批量命名模板不能超过 240 个字符"}
        tokens = re.findall(r"\{([A-Za-z0-9_]+)\}", template)
        unknown = sorted({token for token in tokens if token not in BATCH_TEMPLATE_FIELDS})
        if unknown:
            return {"success": False, "message": "批量命名模板包含未知字段: " + "、".join(unknown)}
        remainder = re.sub(r"\{[A-Za-z0-9_]+\}", "", template)
        if "{" in remainder or "}" in remainder:
            return {"success": False, "message": "批量命名模板的大括号不完整"}
        return {"success": True, "destination": str(target_root), "format": key, "naming_template": template}

    def get_batch_photo(self, photo_id):
        try:
            clean_id = int(photo_id)
        except (TypeError, ValueError):
            return {"success": False, "message": "图片标识无效"}
        photo = storage.get_photo(clean_id)
        if not photo:
            return {"success": False, "message": "图片记录不存在"}
        payload = self._photo_payload(photo, full=True)
        self._apply_photo_mark(payload)
        source = Path(str(payload.get("path") or "")).resolve(strict=False)
        if not source.exists() or not source.is_file():
            return {"success": False, "message": f"源图片不存在: {source}", "photo": payload}
        if not payload.get("is_raw") and not payload.get("original_url"):
            return {
                "success": False,
                "message": f"当前格式无法进入批量渲染链路: {payload.get('format') or source.suffix}",
                "photo": payload,
            }
        return {"success": True, "photo": payload}

    @staticmethod
    def _batch_decode_data_url(data_url, expected_mime: str) -> tuple[bytes | None, str | None]:
        text = str(data_url or "")
        marker = ";base64,"
        if not text.startswith("data:") or marker not in text:
            return None, "批量图片数据格式无效"
        header, payload = text.split(marker, 1)
        mime = header[5:].split(";", 1)[0].strip().lower()
        if mime != expected_mime:
            return None, f"批量传输格式不匹配：期望 {expected_mime}，实际 {mime or '未知'}"
        try:
            binary = base64.b64decode(payload, validate=True)
        except (binascii.Error, ValueError) as exc:
            return None, f"批量图片数据解码失败: {exc}"
        if not binary:
            return None, "批量图片数据为空"
        return binary, None

    @staticmethod
    def _batch_encode_tiff(binary: bytes) -> tuple[bytes | None, str | None]:
        try:
            from PIL import Image
        except Exception as exc:
            return None, f"缺少 Pillow 依赖，无法编码 TIFF: {exc}"
        try:
            with Image.open(io.BytesIO(binary)) as source:
                source.load()
                if source.mode not in {"L", "LA", "RGB", "RGBA"}:
                    source = source.convert("RGBA" if "A" in source.getbands() else "RGB")
                output = io.BytesIO()
                source.save(output, format="TIFF", compression="tiff_lzw")
                encoded = output.getvalue()
        except Exception as exc:
            return None, f"TIFF 编码失败: {exc}"
        if not encoded:
            return None, "TIFF 编码结果为空"
        return encoded, None

    def _batch_target_path(self, photo: dict, destination, naming_template, fmt: dict) -> tuple[Path | None, str | None]:
        destination_text = str(destination or "").strip()
        if not destination_text:
            return None, "批量导出目录不能为空"
        target_root = Path(destination_text).resolve()
        if not target_root.exists() or not target_root.is_dir():
            return None, f"批量导出目录不存在: {target_root}"

        template = str(naming_template or "").strip() or "{origin_name}_edited"
        relative = self._template_export_relative(photo, template).with_suffix(fmt["suffix"])
        if relative.is_absolute() or any(part in {"", ".", ".."} for part in relative.parts):
            return None, f"批量导出相对路径无效: {relative}"
        target = (target_root / relative).resolve(strict=False)
        try:
            target.relative_to(target_root)
        except ValueError:
            return None, "批量导出文件路径越出目标目录"

        source = Path(str(photo.get("path") or "")).resolve(strict=False)
        if os.path.normcase(str(target)) == os.path.normcase(str(source)):
            return None, "批量处理不能覆盖原图"
        if target.exists():
            return None, f"目标文件已存在: {target}"
        return target, None

    def save_batch_processed_image(
        self,
        data_url,
        destination,
        photo_id,
        format_key="jpg",
        quality=92,
        preserve_exif=False,
        naming_template="{origin_name}_edited",
    ):
        key = str(format_key or "").strip().lower()
        fmt = BATCH_FORMATS.get(key)
        if not fmt:
            return {"success": False, "message": f"批量导出格式不支持: {key or '空'}"}

        try:
            clean_id = int(photo_id)
        except (TypeError, ValueError):
            return {"success": False, "message": "图片标识无效"}
        photo = storage.get_photo(clean_id)
        if not photo:
            return {"success": False, "message": "图片记录不存在"}
        source = Path(str(photo.get("path") or "")).resolve(strict=False)
        if not source.exists() or not source.is_file():
            return {"success": False, "message": f"源图片不存在: {source}"}

        target, target_error = self._batch_target_path(photo, destination, naming_template, fmt)
        if target_error:
            return {"success": False, "message": target_error}

        binary, decode_error = self._batch_decode_data_url(data_url, fmt["transport_mime"])
        if decode_error:
            return {"success": False, "message": decode_error}
        if key == "tiff":
            binary, tiff_error = self._batch_encode_tiff(binary or b"")
            if tiff_error:
                return {"success": False, "message": tiff_error}

        exif_saved = False
        if preserve_exif and key not in {"jpg", "tiff"}:
            return {"success": False, "message": "完整复制原始 EXIF 仅支持 JPEG 和 TIFF"}

        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("xb") as file:
                file.write(binary or b"")
        except FileExistsError:
            return {"success": False, "message": f"目标文件已存在: {target}"}
        except Exception as exc:
            print(
                "[PicScannerBatch] save failed "
                f"photo_id={clean_id} source={source} target={target} format={key} error={exc}"
            )
            return {"success": False, "message": f"批量文件保存失败: {exc}"}

        if preserve_exif:
            try:
                copy_complete_metadata(source, target)
                exif_saved = True
            except MetadataCopyError as exc:
                try:
                    target.unlink(missing_ok=True)
                except Exception as cleanup_exc:
                    print(f"[PicScannerBatch] metadata cleanup failed target={target} error={cleanup_exc}")
                return {"success": False, "message": str(exc)}

        print(
            "[PicScannerBatch] saved "
            f"photo_id={clean_id} source={source} target={target} format={key} "
            f"bytes={len(binary or b'')} exif={exif_saved}"
        )
        return {
            "success": True,
            "path": str(target),
            "filename": target.name,
            "format": fmt["label"],
            "quality": int(float(quality or 0)),
            "bytes": len(binary or b""),
            "exif_saved": exif_saved,
            "message": f"已保存到 {target}" + ("，已完整复制原始元数据" if exif_saved else ""),
        }
