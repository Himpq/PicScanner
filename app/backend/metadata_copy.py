from __future__ import annotations

import threading
from pathlib import Path


class MetadataCopyError(RuntimeError):
    pass


_METADATA_COPY_LOCK = threading.RLock()


def copy_complete_metadata(
    source_path: str | Path,
    target_path: str | Path,
    *,
    width: int | None = None,
    height: int | None = None,
) -> dict:
    source = Path(source_path).resolve(strict=False)
    target = Path(target_path).resolve(strict=False)
    if not source.exists() or not source.is_file():
        raise MetadataCopyError(f"元数据源文件不存在: {source}")
    if not target.exists() or not target.is_file():
        raise MetadataCopyError(f"元数据目标文件不存在: {target}")

    try:
        import pyexiv2
    except Exception as exc:
        raise MetadataCopyError(f"缺少 pyexiv2 依赖，无法完整复制 RAW EXIF: {exc}") from exc

    output_width = max(1, int(width or 0)) if width else 0
    output_height = max(1, int(height or 0)) if height else 0
    try:
        with _METADATA_COPY_LOCK:
            with pyexiv2.Image(str(source)) as source_image, pyexiv2.Image(str(target)) as target_image:
                if not output_width:
                    output_width = max(1, int(target_image.get_pixel_width() or 0))
                if not output_height:
                    output_height = max(1, int(target_image.get_pixel_height() or 0))
                present = {
                    "exif": bool(source_image.read_exif()),
                    "iptc": bool(source_image.read_iptc()),
                    "xmp": bool(source_image.read_xmp()),
                    "comment": bool(source_image.read_comment()),
                    "icc": bool(source_image.read_icc()),
                    "thumbnail": bool(source_image.read_thumbnail()),
                }
                if not any(present.values()):
                    raise MetadataCopyError(f"源文件没有可复制的原始元数据: {source}")
                source_image.copy_to_another_image(target_image, **present)
                corrected = {"Exif.Image.Orientation": "1"}
                if output_width and output_height:
                    corrected.update(
                        {
                            "Exif.Image.ImageWidth": str(output_width),
                            "Exif.Image.ImageLength": str(output_height),
                            "Exif.Photo.PixelXDimension": str(output_width),
                            "Exif.Photo.PixelYDimension": str(output_height),
                        }
                    )
                target_image.modify_exif(corrected)
    except MetadataCopyError:
        raise
    except Exception as exc:
        raise MetadataCopyError(f"完整元数据复制失败: {source} -> {target} ({exc})") from exc

    print(
        "[PicScannerMetadata] copied complete metadata "
        f"source={source} target={target} width={output_width or 'unchanged'} height={output_height or 'unchanged'}"
    )
    return {
        "source": str(source),
        "target": str(target),
        "width": output_width,
        "height": output_height,
        "orientation": 1,
        "copied": [name for name, exists in present.items() if exists],
    }
