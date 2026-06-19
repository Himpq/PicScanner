from __future__ import annotations

import hashlib
import threading
import time
from pathlib import Path

from PIL import Image, ImageFile, ImageOps

from .config_store import DATA_DIR
from .exif_reader import is_renderable_image


THUMB_DIR = DATA_DIR / "thumbnails"
THUMB_SIZE = 420
JPEG_QUALITY = 78
ImageFile.LOAD_TRUNCATED_IMAGES = True
_LOCKS: dict[str, threading.Lock] = {}
_LOCKS_GUARD = threading.Lock()
_GENERATION_SEMAPHORE = threading.Semaphore(2)


class ThumbnailError(RuntimeError):
    pass


def _thumb_key(path: Path) -> str:
    stat = path.stat()
    raw = f"{path.resolve()}|{int(stat.st_mtime_ns)}|{int(stat.st_size)}".encode("utf-8", errors="strict")
    return hashlib.sha1(raw).hexdigest()


def _thumb_path(path: Path) -> Path:
    key = _thumb_key(path)
    return THUMB_DIR / key[:2] / f"{key}.jpg"


def existing_thumbnail(path: str | Path) -> Path | None:
    source = Path(path)
    if not source.exists() or not source.is_file() or not is_renderable_image(source):
        return None
    target = _thumb_path(source)
    if target.exists() and target.stat().st_size > 0:
        return target
    return None


def _lock_for(path: Path) -> threading.Lock:
    key = str(path)
    with _LOCKS_GUARD:
        lock = _LOCKS.get(key)
        if lock is None:
            lock = threading.Lock()
            _LOCKS[key] = lock
        return lock


def ensure_thumbnail(path: str | Path, *, max_side: int = THUMB_SIZE) -> Path:
    source = Path(path)
    if not source.exists() or not source.is_file():
        raise ThumbnailError(f"图片文件不存在: {source}")
    if not is_renderable_image(source):
        raise ThumbnailError(f"不支持直接预览的格式: {source.suffix}")

    target = _thumb_path(source)
    if target.exists() and target.stat().st_size > 0:
        return target

    lock = _lock_for(target)
    with lock:
        if target.exists() and target.stat().st_size > 0:
            return target

        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_name(
            f"{target.stem}.{threading.get_ident()}.{time.time_ns()}.tmp"
        )
        with _GENERATION_SEMAPHORE:
            if target.exists() and target.stat().st_size > 0:
                return target
            started = time.perf_counter()
            try:
                with Image.open(source) as img:
                    try:
                        img.draft("RGB", (max_side, max_side))
                    except Exception:
                        pass
                    img.thumbnail((max_side, max_side), Image.Resampling.BILINEAR)
                    img = ImageOps.exif_transpose(img)
                    if img.mode in {"RGBA", "LA"}:
                        background = Image.new("RGB", img.size, (0, 0, 0))
                        alpha = img.getchannel("A") if "A" in img.getbands() else None
                        background.paste(img.convert("RGBA"), mask=alpha)
                        img = background
                    elif img.mode != "RGB":
                        img = img.convert("RGB")
                    img.save(tmp, "JPEG", quality=JPEG_QUALITY)
                tmp.replace(target)
            except Exception as exc:
                try:
                    if tmp.exists():
                        tmp.unlink()
                except Exception:
                    pass
                raise ThumbnailError(f"缩略图生成失败: {source} ({exc})") from exc

            elapsed_ms = (time.perf_counter() - started) * 1000
            if elapsed_ms >= 600:
                print(f"[PicScannerThumb] generated {target.name} in {elapsed_ms:.0f}ms source={source}")
            return target
