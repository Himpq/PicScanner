from __future__ import annotations

import mimetypes
from datetime import datetime
from pathlib import Path
from typing import Any


RENDERABLE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}


def is_renderable_image(path: str | Path) -> bool:
    return Path(path).suffix.lower() in RENDERABLE_EXTENSIONS


def format_name(path: str | Path) -> str:
    ext = Path(path).suffix.lower().lstrip(".")
    if ext in {"jpg", "jpeg"}:
        return "JPG"
    if ext:
        return ext.upper()
    guessed, _ = mimetypes.guess_type(str(path))
    if guessed and "/" in guessed:
        return guessed.split("/")[-1].upper()
    return "UNKNOWN"


def _tag(tags: dict, *names: str):
    lowered = {str(k).lower(): v for k, v in tags.items()}
    for name in names:
        if name in tags:
            return tags[name]
        low = name.lower()
        if low in lowered:
            return lowered[low]
    wanted = [n.lower() for n in names]
    for key, val in lowered.items():
        tail = key.split()[-1] if " " in key else key
        if tail in wanted:
            return val
    return None


def _display(value: Any) -> str | None:
    if value is None:
        return None
    text = getattr(value, "printable", None)
    if text is None:
        text = str(value)
    text = str(text).strip()
    return text or None


# 视为"未知镜头"的占位值：'----' 常见于 EXIF LensSpecification 无有效数据时
# exifread 的 printable 输出；与统计端 UNKNOWN_LENS_SQL 的口径保持一致。
UNKNOWN_LENS_VALUES = {"?", "----"}


def _normalize_lens(text: str | None) -> str | None:
    if not text:
        return None
    cleaned = str(text).strip()
    if not cleaned or cleaned in UNKNOWN_LENS_VALUES:
        return None
    return cleaned


def _ratio_to_float(value: Any) -> float | None:
    if value is None:
        return None
    values = getattr(value, "values", None)
    if values:
        value = values[0]
    if hasattr(value, "num") and hasattr(value, "den"):
        den = float(value.den)
        return float(value.num) / den if den else None
    text = _display(value)
    if not text:
        return None
    text = text.strip()
    if "/" in text:
        left, right = text.split("/", 1)
        try:
            den = float(right.strip())
            return float(left.strip()) / den if den else None
        except ValueError:
            return None
    try:
        return float(text)
    except ValueError:
        return None


def _int_value(value: Any) -> int | None:
    num = _ratio_to_float(value)
    if num is None:
        text = _display(value)
        if not text:
            return None
        try:
            return int(float(text.split()[0]))
        except ValueError:
            return None
    return int(round(num))


def _parse_exif_datetime(text: str | None) -> tuple[str | None, str | None]:
    if not text:
        return None, None
    raw = str(text).strip()
    for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(raw[:19], fmt)
            return dt.strftime("%Y-%m-%d %H:%M:%S"), dt.strftime("%Y-%m-%d")
        except ValueError:
            pass
    return raw, raw[:10].replace(":", "-") if len(raw) >= 10 else None


def aperture_bucket(f_number: float | None) -> str:
    if f_number is None or f_number <= 0:
        return "?"
    if f_number < 1.4:
        return "F<1.4"
    if f_number < 2.0:
        return "F1.4-2.0"
    if f_number < 2.8:
        return "F2.0-2.8"
    if f_number < 4.0:
        return "F2.8-4.0"
    if f_number < 5.6:
        return "F4.0-5.6"
    if f_number < 8.0:
        return "F5.6-8.0"
    if f_number < 13.0:
        return "F8.0-13.0"
    return "F13+"


def focal_bucket(focal_35mm: float | None) -> str:
    if focal_35mm is None or focal_35mm <= 0:
        return "?"
    if focal_35mm < 24:
        return "<24mm (超广角)"
    if focal_35mm < 35:
        return "24-35mm (广角)"
    if focal_35mm < 70:
        return "35-70mm (标准)"
    if focal_35mm < 135:
        return "70-135mm (中长焦)"
    if focal_35mm < 200:
        return "135-200mm (长焦)"
    return ">200mm (超长焦)"


def iso_bucket(iso: int | None) -> str:
    if iso is None or iso <= 0:
        return "?"
    for limit in (100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600):
        if iso <= limit:
            return f"ISO ≤{limit}"
    return "ISO ≥25600"


def _read_dimensions(path: Path, tags: dict) -> tuple[int | None, int | None]:
    width = _int_value(_tag(tags, "EXIF ExifImageWidth", "Image ImageWidth"))
    height = _int_value(_tag(tags, "EXIF ExifImageLength", "Image ImageLength"))
    if width and height:
        return width, height
    if is_renderable_image(path):
        try:
            from PIL import Image

            with Image.open(path) as img:
                return int(img.width), int(img.height)
        except Exception:
            return width, height
    return width, height


def _gps_to_deg(value: Any) -> float | None:
    """EXIF GPS 坐标通常为 [度,分,秒] 的 Ratio 列表，返回十进制度。"""
    if value is None:
        return None
    # exifread 的 GPS 值：IfdTag.values 为 Ratio 列表
    vals = getattr(value, "values", None)
    if vals is not None:
        value = vals
    if isinstance(value, (list, tuple)):
        try:
            nums = []
            for v in value:
                if hasattr(v, "num") and hasattr(v, "den"):
                    den = float(v.den)
                    nums.append(float(v.num) / den if den else 0)
                else:
                    nums.append(float(str(v).strip().split("/")[0]) / float(str(v).strip().split("/")[1]) if "/" in str(v) else float(v))
            if len(nums) >= 3:
                return float(nums[0] + nums[1] / 60.0 + nums[2] / 3600.0)
            if len(nums) == 2:
                return float(nums[0] + nums[1] / 60.0)
            if len(nums) == 1:
                return float(nums[0])
        except Exception:
            return None
    # 回退：尝试解析 "51 deg 28' 40.12''" 之类 printable
    try:
        text = _display(value)
        if text:
            import re
            parts = re.findall(r"[\d.]+", text)
            if len(parts) >= 3:
                return float(parts[0]) + float(parts[1]) / 60 + float(parts[2]) / 3600
            if len(parts) == 1:
                return float(parts[0])
    except Exception:
        pass
    return None


def _parse_gps(tags: dict) -> tuple[float | None, float | None]:
    lat_val = _tag(tags, "GPS GPSLatitude")
    lat_ref = _display(_tag(tags, "GPS GPSLatitudeRef"))
    lon_val = _tag(tags, "GPS GPSLongitude")
    lon_ref = _display(_tag(tags, "GPS GPSLongitudeRef"))
    if lat_val is None or lon_val is None:
        return None, None
    lat = _gps_to_deg(lat_val)
    lon = _gps_to_deg(lon_val)
    if lat is None or lon is None:
        return None, None
    if lat_ref and lat_ref.strip().upper().startswith("S"):
        lat = -abs(lat)
    if lon_ref and lon_ref.strip().upper().startswith("W"):
        lon = -abs(lon)
    # 合法性校验
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None, None
    # 过滤 0,0 这种无效占位
    if abs(lat) < 1e-6 and abs(lon) < 1e-6:
        return None, None
    return round(lat, 6), round(lon, 6)


def read_metadata(path: str | Path) -> dict:
    p = Path(path)
    meta = {
        "format": format_name(p),
        "renderable": 1 if is_renderable_image(p) else 0,
        "exif_status": "complete",
        "exif_error": "",
    }

    try:
        import exifread
    except Exception as exc:
        meta["exif_status"] = "failed"
        meta["exif_error"] = f"缺少 exifread 依赖: {exc}"
        return _finalize(meta)

    try:
        with p.open("rb") as fh:
            tags = exifread.process_file(fh, details=False, strict=False)
    except Exception as exc:
        meta["exif_status"] = "failed"
        meta["exif_error"] = f"EXIF 读取失败: {exc}"
        return _finalize(meta)

    make = _display(_tag(tags, "Image Make"))
    model = _display(_tag(tags, "Image Model"))
    lens = _normalize_lens(
        _display(
            _tag(
                tags,
                "EXIF LensModel",
                "Image LensModel",
                "MakerNote LensModel",
                "EXIF LensSpecification",
            )
        )
    )
    f_number = _ratio_to_float(_tag(tags, "EXIF FNumber", "EXIF ApertureValue"))
    exposure = _tag(tags, "EXIF ExposureTime", "Image ExposureTime")
    exposure_text = _display(exposure)
    exposure_seconds = _ratio_to_float(exposure)
    iso = _int_value(
        _tag(
            tags,
            "EXIF ISOSpeedRatings",
            "EXIF PhotographicSensitivity",
            "EXIF ISO",
        )
    )
    focal = _ratio_to_float(_tag(tags, "EXIF FocalLength"))
    focal_35 = _ratio_to_float(_tag(tags, "EXIF FocalLengthIn35mmFilm"))
    dt_raw = _display(_tag(tags, "EXIF DateTimeOriginal", "Image DateTime"))
    datetime_original, date_key = _parse_exif_datetime(dt_raw)
    width, height = _read_dimensions(p, tags)
    gps_lat, gps_lon = _parse_gps(tags)

    meta.update(
        {
            "make": make,
            "model": model,
            "lens_model": lens,
            "f_number": f_number,
            "exposure_time": exposure_text,
            "exposure_seconds": exposure_seconds,
            "iso": iso,
            "focal_length": focal,
            "focal_length_35mm": focal_35,
            "datetime_original": datetime_original,
            "date_key": date_key,
            "width": width,
            "height": height,
            "orientation": _display(_tag(tags, "Image Orientation")),
            "software": _display(_tag(tags, "Image Software")),
            "exposure_program": _display(_tag(tags, "EXIF ExposureProgram")),
            "metering_mode": _display(_tag(tags, "EXIF MeteringMode")),
            "flash": _display(_tag(tags, "EXIF Flash")),
            "white_balance": _display(_tag(tags, "EXIF WhiteBalance")),
            "exposure_bias": _display(_tag(tags, "EXIF ExposureBiasValue")),
            "gps_lat": gps_lat,
            "gps_lon": gps_lon,
            "gps_place": None,
        }
    )
    return _finalize(meta)


def _finalize(meta: dict) -> dict:
    f_number = meta.get("f_number")
    focal_35 = meta.get("focal_length_35mm")
    iso = meta.get("iso")
    meta["aperture_bucket"] = aperture_bucket(f_number)
    meta["focal_bucket"] = focal_bucket(focal_35)
    meta["iso_bucket"] = iso_bucket(iso)
    return meta
