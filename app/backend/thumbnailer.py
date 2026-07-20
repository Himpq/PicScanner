from __future__ import annotations

import hashlib
import io
import queue
import threading
import time
from pathlib import Path

from PIL import Image, ImageFile, ImageOps

from .config_store import DATA_DIR
from .exif_reader import is_renderable_image


THUMB_DIR = DATA_DIR / "thumbnails"
LIGHTBOX_PREVIEW_DIR = DATA_DIR / "lightbox_previews"
THUMB_SIZE = 420
JPEG_QUALITY = 78
LIGHTBOX_PREVIEW_SIZE = 0
LIGHTBOX_JPEG_QUALITY = 90
THUMB_ALGORITHM_VERSION = "pixel-orientation-v4"
LIGHTBOX_PREVIEW_ALGORITHM_VERSION = "raw-developed-lightbox-original-v2"
RAW_EXTENSIONS = {
    ".arw",
    ".raw",
    ".dng",
    ".cr2",
    ".cr3",
    ".nef",
    ".nrw",
    ".raf",
    ".rw2",
    ".orf",
    ".srw",
    ".pef",
}
ImageFile.LOAD_TRUNCATED_IMAGES = True
_LOCKS: dict[str, threading.Lock] = {}
_LOCKS_GUARD = threading.Lock()
_GENERATION_CONCURRENCY = 4
_GENERATION_SEMAPHORE = threading.Semaphore(_GENERATION_CONCURRENCY)
_PREFETCH_PENDING: set[str] = set()
_PREFETCH_GUARD = threading.Lock()
_PREFETCH_QUEUE_LIMIT = 160
_PREFETCH_QUEUE: queue.Queue[tuple[Path, str, int]] = queue.Queue(maxsize=_PREFETCH_QUEUE_LIMIT)
_PREFETCH_WORKERS_STARTED = False


class ThumbnailError(RuntimeError):
    pass


def _thumb_key_from_stat(path: Path, *, mtime_ns: int, size: int) -> str:
    raw = f"{THUMB_ALGORITHM_VERSION}|{path.resolve()}|{int(mtime_ns)}|{int(size)}".encode("utf-8", errors="strict")
    return hashlib.sha1(raw).hexdigest()


def _thumb_key(path: Path) -> str:
    stat = path.stat()
    return _thumb_key_from_stat(path, mtime_ns=stat.st_mtime_ns, size=stat.st_size)


def _thumb_path(path: Path) -> Path:
    key = _thumb_key(path)
    return THUMB_DIR / key[:2] / f"{key}.jpg"


def _thumb_path_from_stat(path: Path, *, mtime_ns: int, size: int) -> Path:
    key = _thumb_key_from_stat(path, mtime_ns=mtime_ns, size=size)
    return THUMB_DIR / key[:2] / f"{key}.jpg"


def _lightbox_preview_key(path: Path, max_side: int) -> str:
    stat = path.stat()
    size_label = "original" if int(max_side or 0) <= 0 else str(int(max_side))
    raw = (
        f"{LIGHTBOX_PREVIEW_ALGORITHM_VERSION}|{size_label}|{LIGHTBOX_JPEG_QUALITY}|"
        f"{path.resolve()}|{int(stat.st_mtime_ns)}|{int(stat.st_size)}"
    ).encode("utf-8", errors="strict")
    return hashlib.sha1(raw).hexdigest()


def _lightbox_preview_path(path: Path, max_side: int = LIGHTBOX_PREVIEW_SIZE) -> Path:
    key = _lightbox_preview_key(path, max_side)
    return LIGHTBOX_PREVIEW_DIR / key[:2] / f"{key}.jpg"


def is_raw_image(path: str | Path) -> bool:
    return Path(path).suffix.lower() in RAW_EXTENSIONS


def is_previewable_image(path: str | Path) -> bool:
    p = Path(path)
    return is_renderable_image(p) or is_raw_image(p)


def existing_thumbnail(path: str | Path) -> Path | None:
    source = Path(path)
    if not source.exists() or not source.is_file() or not is_previewable_image(source):
        return None
    target = _thumb_path(source)
    if target.exists() and target.stat().st_size > 0:
        return target
    return None


def migrate_thumbnail_cache(
    previous_path: str | Path,
    current_path: str | Path,
    *,
    expected_size: int | float,
    expected_mtime: int | float,
) -> str:
    source = Path(current_path)
    if not source.exists() or not source.is_file():
        return "source_missing"
    if not is_previewable_image(source):
        return "not_previewable"

    stat = source.stat()
    if int(expected_size or 0) != int(stat.st_size):
        return "source_changed"
    if abs(float(expected_mtime or 0) - float(stat.st_mtime)) > 0.000001:
        return "source_changed"

    previous_target = _thumb_path_from_stat(
        Path(previous_path),
        mtime_ns=stat.st_mtime_ns,
        size=stat.st_size,
    )
    current_target = _thumb_path_from_stat(
        source,
        mtime_ns=stat.st_mtime_ns,
        size=stat.st_size,
    )
    if current_target == previous_target:
        return "unchanged"
    if current_target.exists() and current_target.stat().st_size > 0:
        return "already_current"
    if not previous_target.exists() or previous_target.stat().st_size <= 0:
        return "cache_missing"

    lock = _lock_for(current_target)
    with lock:
        if current_target.exists() and current_target.stat().st_size > 0:
            return "already_current"
        current_target.parent.mkdir(parents=True, exist_ok=True)
        previous_target.replace(current_target)
    return "migrated"


def existing_lightbox_preview(path: str | Path, *, max_side: int = LIGHTBOX_PREVIEW_SIZE) -> Path | None:
    source = Path(path)
    if not source.exists() or not source.is_file() or not is_previewable_image(source):
        return None
    target = _lightbox_preview_path(source, max_side=max_side)
    if target.exists() and target.stat().st_size > 0:
        return target
    return None


def warm_thumbnails(paths: list[str | Path], *, max_side: int = THUMB_SIZE) -> int:
    _ensure_prefetch_workers()
    scheduled = 0
    for raw_path in paths:
        source = Path(raw_path)
        if not source.exists() or not source.is_file() or not is_previewable_image(source):
            continue
        target = _thumb_path(source)
        if target.exists() and target.stat().st_size > 0:
            continue
        key = str(target)
        with _PREFETCH_GUARD:
            if key in _PREFETCH_PENDING:
                continue
            if len(_PREFETCH_PENDING) >= _PREFETCH_QUEUE_LIMIT:
                print(
                    "[PicScannerThumb] prefetch queue is full "
                    f"pending={len(_PREFETCH_PENDING)} limit={_PREFETCH_QUEUE_LIMIT}"
                )
                break
            _PREFETCH_PENDING.add(key)
        try:
            _PREFETCH_QUEUE.put_nowait((source, key, max_side))
        except queue.Full:
            with _PREFETCH_GUARD:
                _PREFETCH_PENDING.discard(key)
            print(
                "[PicScannerThumb] prefetch queue is full "
                f"pending={len(_PREFETCH_PENDING)} limit={_PREFETCH_QUEUE_LIMIT}"
            )
            break
        scheduled += 1
    if scheduled:
        print(f"[PicScannerThumb] prefetch queued {scheduled} thumbnails")
    return scheduled


def _ensure_prefetch_workers() -> None:
    global _PREFETCH_WORKERS_STARTED
    with _PREFETCH_GUARD:
        if _PREFETCH_WORKERS_STARTED:
            return
        _PREFETCH_WORKERS_STARTED = True
        for index in range(_GENERATION_CONCURRENCY):
            thread = threading.Thread(
                target=_prefetch_loop,
                name=f"PicScannerThumb-{index + 1}",
                daemon=True,
            )
            thread.start()


def _prefetch_loop() -> None:
    while True:
        source, key, max_side = _PREFETCH_QUEUE.get()
        try:
            _warm_thumbnail_worker(source, key, max_side)
        finally:
            _PREFETCH_QUEUE.task_done()


def _warm_thumbnail_worker(source: Path, key: str, max_side: int) -> None:
    try:
        ensure_thumbnail(source, max_side=max_side)
    except Exception as exc:
        print(f"[PicScannerThumb] prefetch failed: {source} ({exc})")
    finally:
        with _PREFETCH_GUARD:
            _PREFETCH_PENDING.discard(key)


def _thumbnail_frame_index(img: Image.Image, max_side: int) -> int:
    frame_count = int(getattr(img, "n_frames", 1) or 1)
    if frame_count <= 1:
        return 0

    primary_size = img.size
    primary_area = max(1, primary_size[0] * primary_size[1])
    selected_index = 0
    selected_area = primary_area
    original_index = int(img.tell()) if hasattr(img, "tell") else 0
    try:
        for index in range(1, frame_count):
            img.seek(index)
            width, height = img.size
            area = width * height
            if width < max_side or height < max_side:
                continue
            if area >= primary_area:
                continue
            if area < selected_area:
                selected_index = index
                selected_area = area
    finally:
        img.seek(original_index)
    return selected_index


def _lock_for(path: Path) -> threading.Lock:
    key = str(path)
    with _LOCKS_GUARD:
        lock = _LOCKS.get(key)
        if lock is None:
            lock = threading.Lock()
            _LOCKS[key] = lock
        return lock


def _read_orientation(img: Image.Image) -> int:
    try:
        value = img.getexif().get(274)
    except Exception:
        return 1
    try:
        orientation = int(value or 1)
    except (TypeError, ValueError):
        return 1
    return orientation if 1 <= orientation <= 8 else 1


def _apply_orientation(img: Image.Image, orientation: int) -> Image.Image:
    operations = {
        2: Image.Transpose.FLIP_LEFT_RIGHT,
        3: Image.Transpose.ROTATE_180,
        4: Image.Transpose.FLIP_TOP_BOTTOM,
        5: Image.Transpose.TRANSPOSE,
        6: Image.Transpose.ROTATE_270,
        7: Image.Transpose.TRANSVERSE,
        8: Image.Transpose.ROTATE_90,
    }
    operation = operations.get(orientation)
    return img.transpose(operation) if operation else img


def _load_raw_embedded_preview(source: Path) -> tuple[Image.Image, str, str]:
    try:
        import rawpy
    except Exception as exc:
        raise ThumbnailError(f"缺少 rawpy 依赖，无法预览 RAW: {exc}") from exc

    try:
        with rawpy.imread(str(source)) as raw:
            thumb = raw.extract_thumb()
    except Exception as exc:
        raise ThumbnailError(f"RAW 内嵌预览读取失败: {source} ({exc})") from exc

    try:
        if thumb.format == rawpy.ThumbFormat.JPEG:
            with Image.open(io.BytesIO(thumb.data)) as img:
                img.load()
                orientation = str(_read_orientation(img) or "")
                return ImageOps.exif_transpose(img).copy(), orientation, "raw-jpeg"
        if thumb.format == rawpy.ThumbFormat.BITMAP:
            return Image.fromarray(thumb.data).copy(), "", "raw-bitmap"
    except Exception as exc:
        raise ThumbnailError(f"RAW 内嵌预览解码失败: {source} ({exc})") from exc
    raise ThumbnailError(f"RAW 内嵌预览格式不支持: {source} ({thumb.format})")


def _load_raw_developed_preview(source: Path) -> tuple[Image.Image, str, str]:
    try:
        import rawpy
    except Exception as exc:
        raise ThumbnailError(f"缺少 rawpy 依赖，无法渲染 RAW 高清图: {exc}") from exc

    try:
        with rawpy.imread(str(source)) as raw:
            rgb = raw.postprocess(use_camera_wb=True, output_bps=8)
    except Exception as exc:
        raise ThumbnailError(f"RAW 高清图渲染失败: {source} ({exc})") from exc

    try:
        return Image.fromarray(rgb).copy(), "", "raw-developed"
    except Exception as exc:
        raise ThumbnailError(f"RAW 高清图转换失败: {source} ({exc})") from exc


def ensure_thumbnail(path: str | Path, *, max_side: int = THUMB_SIZE) -> Path:
    source = Path(path)
    if not source.exists() or not source.is_file():
        raise ThumbnailError(f"图片文件不存在: {source}")
    if not is_previewable_image(source):
        raise ThumbnailError(f"不支持直接预览的格式: {source.suffix}")

    target = _thumb_path(source)
    return _ensure_jpeg_preview(
        source,
        target,
        max_side=max_side,
        quality=JPEG_QUALITY,
        raw_mode="embedded",
        label="thumbnail",
    )


def ensure_lightbox_preview(path: str | Path, *, max_side: int = LIGHTBOX_PREVIEW_SIZE) -> Path:
    source = Path(path)
    if not source.exists() or not source.is_file():
        raise ThumbnailError(f"图片文件不存在: {source}")
    if not is_previewable_image(source):
        raise ThumbnailError(f"不支持直接预览的格式: {source.suffix}")

    target = _lightbox_preview_path(source, max_side=max_side)
    return _ensure_jpeg_preview(
        source,
        target,
        max_side=max_side,
        quality=LIGHTBOX_JPEG_QUALITY,
        raw_mode="developed",
        label="lightbox",
    )


def _ensure_jpeg_preview(
    source: Path,
    target: Path,
    *,
    max_side: int,
    quality: int,
    raw_mode: str,
    label: str,
) -> Path:
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
            opened_ms = 0.0
            draft_ms = 0.0
            resize_ms = 0.0
            convert_ms = 0.0
            save_ms = 0.0
            frame_index = 0
            frame_size = ""
            orientation = ""
            source_kind = "image"
            should_resize = int(max_side or 0) > 0
            try:
                step = time.perf_counter()
                if is_raw_image(source):
                    if raw_mode == "developed":
                        img, orientation, source_kind = _load_raw_developed_preview(source)
                    else:
                        img, orientation, source_kind = _load_raw_embedded_preview(source)
                    opened_ms = (time.perf_counter() - step) * 1000
                    step = time.perf_counter()
                    frame_size = f"{img.size[0]}x{img.size[1]}"
                    draft_ms = (time.perf_counter() - step) * 1000
                    if should_resize:
                        step = time.perf_counter()
                        img.thumbnail((max_side, max_side), Image.Resampling.BILINEAR)
                        resize_ms = (time.perf_counter() - step) * 1000
                    step = time.perf_counter()
                    if img.mode != "RGB":
                        img = img.convert("RGB")
                    convert_ms = (time.perf_counter() - step) * 1000
                    step = time.perf_counter()
                    img.save(tmp, "JPEG", quality=quality)
                    save_ms = (time.perf_counter() - step) * 1000
                else:
                    with Image.open(source) as img:
                        source_orientation = _read_orientation(img)
                        opened_ms = (time.perf_counter() - step) * 1000
                        step = time.perf_counter()
                        if should_resize:
                            frame_index = _thumbnail_frame_index(img, max_side)
                            if frame_index:
                                img.seek(frame_index)
                            else:
                                try:
                                    img.draft("RGB", (max_side, max_side))
                                except Exception:
                                    pass
                        orientation = str(source_orientation or "")
                        img = _apply_orientation(img, source_orientation)
                        frame_size = f"{img.size[0]}x{img.size[1]}"
                        draft_ms = (time.perf_counter() - step) * 1000
                        if should_resize:
                            step = time.perf_counter()
                            img.thumbnail((max_side, max_side), Image.Resampling.BILINEAR)
                            resize_ms = (time.perf_counter() - step) * 1000
                        step = time.perf_counter()
                        if img.mode in {"RGBA", "LA"}:
                            background = Image.new("RGB", img.size, (0, 0, 0))
                            alpha = img.getchannel("A") if "A" in img.getbands() else None
                            background.paste(img.convert("RGBA"), mask=alpha)
                            img = background
                        elif img.mode != "RGB":
                            img = img.convert("RGB")
                        convert_ms = (time.perf_counter() - step) * 1000
                        step = time.perf_counter()
                        img.save(tmp, "JPEG", quality=quality)
                        save_ms = (time.perf_counter() - step) * 1000
                tmp.replace(target)
            except Exception as exc:
                try:
                    if tmp.exists():
                        tmp.unlink()
                except Exception:
                    pass
                label_text = "高清预览" if label == "lightbox" else "缩略图"
                raise ThumbnailError(f"{label_text}生成失败: {source} ({exc})") from exc

            if orientation and orientation != "1":
                print(
                    f"[PicScannerThumb] orientation applied={orientation} "
                    f"frame={frame_index} output={frame_size} target={target.name} source={source}"
                )
            elapsed_ms = (time.perf_counter() - started) * 1000
            if elapsed_ms >= 600:
                print(
                    f"[PicScannerThumb] generated {label} {target.name} in {elapsed_ms:.0f}ms "
                    f"kind={source_kind} frame={frame_index} orientation={orientation or '-'} frame_size={frame_size} "
                    f"open={opened_ms:.0f}ms draft={draft_ms:.0f}ms "
                    f"resize={resize_ms:.0f}ms "
                    f"convert={convert_ms:.0f}ms save={save_ms:.0f}ms source={source}"
                )
            return target
