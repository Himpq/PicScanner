from __future__ import annotations

import hashlib
import json
import math
import threading
import time
from pathlib import Path

from PIL import Image

from .config_store import DATA_DIR
from .thumbnailer import is_raw_image


RAW_DEVELOP_PREVIEW_DIR = DATA_DIR / "raw_develop_previews"
RAW_DEVELOP_ALGORITHM_VERSION = "raw-develop-v5-fast-preview-cache"
RAW_DEVELOP_PREVIEW_QUALITY = 92
RAW_DEVELOP_FULL_PROXY_QUALITY = 96
RAW_DEVELOP_CACHE_GRACE_SECONDS = 90
RAW_DEVELOP_TMP_GRACE_SECONDS = 3600
RAW_DEVELOP_RAW_CACHE_TTL_SECONDS = 45
RAW_DEVELOP_RAW_CACHE_MAX_ITEMS = 2
RAW_TEMPERATURE_MIN_K = 2000
RAW_TEMPERATURE_NEUTRAL_K = 6500
RAW_TEMPERATURE_MAX_K = 10000
RAW_TEMPERATURE_STEP_K = 50
RAW_EXPOSURE_MIN_EV = -5
RAW_EXPOSURE_MAX_EV = 5
_LOCKS: dict[str, threading.Lock] = {}
_LOCKS_GUARD = threading.Lock()
_CACHE_CLEANUP_LOCK = threading.Lock()
_RAWPY_CACHE: dict[str, dict] = {}
_RAWPY_CACHE_LOCK = threading.Lock()


class RawDevelopError(RuntimeError):
    pass


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _finite_number(value, default: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if math.isfinite(number) else default


def _round_temperature(value) -> int:
    raw = _finite_number(value, RAW_TEMPERATURE_NEUTRAL_K)
    clamped = _clamp(raw, RAW_TEMPERATURE_MIN_K, RAW_TEMPERATURE_MAX_K)
    return int(round(clamped / RAW_TEMPERATURE_STEP_K) * RAW_TEMPERATURE_STEP_K)


def _normalize_curve_points(points, raw=None) -> list[dict[str, float]]:
    source = points if isinstance(points, list) and len(points) >= 2 else None
    if source is None:
        raw = raw if isinstance(raw, dict) else {}
        source = [
            {"x": 0, "y": _clamp(_finite_number(raw.get("curveBlack"), 0), 0, 100)},
            {"x": 50, "y": _clamp(_finite_number(raw.get("curveMid"), 50), 0, 100)},
            {"x": 100, "y": _clamp(_finite_number(raw.get("curveWhite"), 100), 0, 100)},
        ]

    clean: list[dict[str, float]] = []
    for point in source:
        if not isinstance(point, dict):
            continue
        x = _finite_number(point.get("x"), math.nan)
        y = _finite_number(point.get("y"), math.nan)
        if not math.isfinite(x) or not math.isfinite(y):
            continue
        clean.append({"x": _clamp(x, 0, 100), "y": _clamp(y, 0, 100)})
    clean.sort(key=lambda item: item["x"])

    merged: list[dict[str, float]] = []
    for point in clean:
        if merged and abs(merged[-1]["x"] - point["x"]) < 0.5:
            merged[-1] = dict(point)
        else:
            merged.append(dict(point))

    first = merged[0] if merged else {"x": 0, "y": 0}
    last = merged[-1] if merged else {"x": 100, "y": 100}
    interior = [
        {"x": _clamp(point["x"], 1, 99), "y": _clamp(point["y"], 0, 100)}
        for point in merged
        if 0.5 < point["x"] < 99.5
    ]
    return [
        {"x": 0, "y": _clamp(first["y"] if first["x"] <= 0.5 else 0, 0, 100)},
        *interior,
        {"x": 100, "y": _clamp(last["y"] if last["x"] >= 99.5 else 100, 0, 100)},
    ]


def _curve_is_neutral(points: list[dict[str, float]]) -> bool:
    return (
        len(points) == 2
        and points[0]["x"] == 0
        and points[0]["y"] == 0
        and points[1]["x"] == 100
        and points[1]["y"] == 100
    )


def normalize_raw_develop_params(params) -> dict:
    raw = params if isinstance(params, dict) else {}
    return {
        "temperature": _round_temperature(raw.get("temperature")),
        "tint": int(round(_clamp(_finite_number(raw.get("tint"), 0), -100, 100))),
        "exposure": round(_clamp(_finite_number(raw.get("exposure"), 0), RAW_EXPOSURE_MIN_EV, RAW_EXPOSURE_MAX_EV), 3),
        "highlight_recovery": int(round(_clamp(
            _finite_number(raw.get("rawHighlightRecovery", raw.get("highlight_recovery")), 0),
            0,
            100,
        ))),
        "noise_reduction": int(round(_clamp(
            _finite_number(raw.get("rawNoiseReduction", raw.get("noise_reduction")), 0),
            0,
            100,
        ))),
        "curve_points": _normalize_curve_points(raw.get("curvePoints", raw.get("curve_points")), raw),
    }


def raw_develop_signature(params) -> str:
    return json.dumps(
        normalize_raw_develop_params(params),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def _temperature_strength(kelvin: int) -> float:
    if kelvin >= RAW_TEMPERATURE_NEUTRAL_K:
        return _clamp(
            (kelvin - RAW_TEMPERATURE_NEUTRAL_K)
            / (RAW_TEMPERATURE_MAX_K - RAW_TEMPERATURE_NEUTRAL_K),
            0,
            1,
        )
    return _clamp(
        (kelvin - RAW_TEMPERATURE_NEUTRAL_K)
        / (RAW_TEMPERATURE_NEUTRAL_K - RAW_TEMPERATURE_MIN_K),
        -1,
        0,
    )


def _valid_camera_wb(values) -> list[float]:
    if not values or len(values) < 4:
        raise RawDevelopError("RAW 文件缺少有效相机白平衡数据，无法进行自定义白平衡显影")
    wb = []
    for value in list(values)[:4]:
        number = _finite_number(value, 0)
        if number <= 0:
            raise RawDevelopError("RAW 文件相机白平衡数据无效，无法进行自定义白平衡显影")
        wb.append(number)
    return wb


def _user_white_balance(raw, params: dict) -> list[float] | None:
    temperature = int(params["temperature"])
    tint = int(params["tint"])
    base = _valid_camera_wb(getattr(raw, "camera_whitebalance", None))
    if temperature == RAW_TEMPERATURE_NEUTRAL_K and tint == 0:
        return None

    temperature_mix = _temperature_strength(temperature)
    tint_mix = tint / 100
    red_gain = 1 + temperature_mix * 0.35 + max(0, tint_mix) * 0.08
    green_gain = 1 - abs(temperature_mix) * 0.035 - tint_mix * 0.16
    blue_gain = 1 - temperature_mix * 0.35 + max(0, tint_mix) * 0.08
    green_gain = max(0.05, green_gain)
    return [
        base[0] * max(0.05, red_gain),
        base[1] * green_gain,
        base[2] * max(0.05, blue_gain),
        base[3] * green_gain,
    ]


def _rawpy_params(
    raw,
    params: dict,
    output_bps: int,
    *,
    medium_preview: bool = False,
    preview_profile: bool = False,
):
    try:
        import rawpy
    except Exception as exc:
        raise RawDevelopError(f"缺少 rawpy 依赖，无法 RAW 显影: {exc}") from exc

    user_wb = _user_white_balance(raw, params)
    recovery = int(params["highlight_recovery"])
    noise = int(params["noise_reduction"])
    if medium_preview and recovery > 0:
        highlight_mode = rawpy.HighlightMode.Blend
    elif recovery >= 72:
        highlight_mode = rawpy.HighlightMode.ReconstructDefault
    elif recovery > 0:
        highlight_mode = rawpy.HighlightMode.Blend
    else:
        highlight_mode = rawpy.HighlightMode.Clip

    if medium_preview and noise >= 24:
        fbdd = rawpy.FBDDNoiseReductionMode.Light
    elif noise >= 68:
        fbdd = rawpy.FBDDNoiseReductionMode.Full
    elif noise >= 24:
        fbdd = rawpy.FBDDNoiseReductionMode.Light
    else:
        fbdd = rawpy.FBDDNoiseReductionMode.Off

    median_passes = 0
    if medium_preview or preview_profile:
        median_passes = 0
    elif noise >= 70:
        median_passes = 2
    elif noise >= 38:
        median_passes = 1

    options = {
        "fbdd_noise_reduction": fbdd,
        "median_filter_passes": median_passes,
        "use_camera_wb": user_wb is None,
        "user_wb": user_wb,
        "output_color": rawpy.ColorSpace.sRGB,
        "output_bps": int(output_bps),
        "no_auto_bright": True,
        "bright": 1.0,
        "highlight_mode": highlight_mode,
        "exp_shift": _clamp(math.pow(2, float(params["exposure"])), math.pow(2, RAW_EXPOSURE_MIN_EV), math.pow(2, RAW_EXPOSURE_MAX_EV)),
        "exp_preserve_highlights": recovery / 100,
    }
    if medium_preview:
        options["half_size"] = True
    if medium_preview or preview_profile:
        options["demosaic_algorithm"] = rawpy.DemosaicAlgorithm.LINEAR
    return rawpy.Params(**options)


def _curve_output(points: list[dict[str, float]], value: float) -> float:
    x = _clamp(value, 0, 1) * 100
    index = 0
    while index < len(points) - 2 and x > points[index + 1]["x"]:
        index += 1
    p0 = points[max(0, index - 1)]
    p1 = points[index]
    p2 = points[min(len(points) - 1, index + 1)]
    p3 = points[min(len(points) - 1, index + 2)]
    span = max(0.0001, p2["x"] - p1["x"])
    t = _clamp((x - p1["x"]) / span, 0, 1)
    t2 = t * t
    t3 = t2 * t
    slope1 = (p2["y"] - p0["y"]) / max(0.0001, p2["x"] - p0["x"]) * span
    slope2 = (p3["y"] - p1["y"]) / max(0.0001, p3["x"] - p1["x"]) * span
    y = (
        (2 * t3 - 3 * t2 + 1) * p1["y"]
        + (t3 - 2 * t2 + t) * slope1
        + (-2 * t3 + 3 * t2) * p2["y"]
        + (t3 - t2) * slope2
    )
    return _clamp(y / 100, 0, 1)


def _apply_curve(rgb, points: list[dict[str, float]]):
    if _curve_is_neutral(points):
        return rgb
    try:
        import numpy as np
    except Exception as exc:
        raise RawDevelopError(f"缺少 numpy 依赖，无法应用 RAW 曲线: {exc}") from exc

    info = np.iinfo(rgb.dtype)
    max_value = int(info.max)
    lut = np.array(
        [round(_curve_output(points, i / max_value) * max_value) for i in range(max_value + 1)],
        dtype=rgb.dtype,
    )
    return lut[rgb]


def _rgb_to_uint8(rgb):
    try:
        import numpy as np
    except Exception as exc:
        raise RawDevelopError(f"缺少 numpy 依赖，无法写入 RAW 预览: {exc}") from exc

    if rgb.dtype == np.uint8:
        return rgb
    if rgb.dtype == np.uint16:
        return ((rgb.astype(np.uint32) + 128) // 257).astype(np.uint8)
    info = np.iinfo(rgb.dtype)
    return np.clip(np.rint(rgb.astype(np.float32) / float(info.max) * 255), 0, 255).astype(np.uint8)


def develop_raw_array(
    source: str | Path,
    params=None,
    *,
    output_bps: int = 8,
    medium_preview: bool = False,
    preview_profile: bool = False,
):
    path = Path(source)
    if not path.exists() or not path.is_file():
        raise RawDevelopError(f"RAW 文件不存在: {path}")
    if not is_raw_image(path):
        raise RawDevelopError(f"不是支持的 RAW 文件: {path.suffix}")
    if int(output_bps) not in {8, 16}:
        raise RawDevelopError(f"RAW 显影位深不支持: {output_bps}")

    clean = normalize_raw_develop_params(params)
    try:
        import rawpy
    except Exception as exc:
        raise RawDevelopError(f"缺少 rawpy 依赖，无法 RAW 显影: {exc}") from exc

    started = time.perf_counter()
    try:
        cache_key, cache_entry = _rawpy_cache_entry(path, rawpy)
        drop_cache = False
        try:
            cache_entry["last_used"] = time.time()
            raw = cache_entry["raw"]
            rgb = raw.postprocess(_rawpy_params(
                raw,
                clean,
                int(output_bps),
                medium_preview=medium_preview,
                preview_profile=preview_profile,
            ))
        except RawDevelopError:
            raise
        except Exception:
            drop_cache = True
            raise
        finally:
            cache_entry["last_used"] = time.time()
            cache_entry["lock"].release()
            if drop_cache:
                _drop_rawpy_cache_entry(cache_key, cache_entry)
        rgb = _apply_curve(rgb, clean["curve_points"])
    except RawDevelopError:
        raise
    except Exception as exc:
        raise RawDevelopError(f"RAW 显影失败: {path} ({exc})") from exc

    elapsed_ms = (time.perf_counter() - started) * 1000
    if elapsed_ms >= 900:
        profile = "medium-preview" if medium_preview else ("original-preview" if preview_profile else "full")
        print(
            f"[PicScannerRawDevelop] developed {path.name} in {elapsed_ms:.0f}ms "
            f"profile={profile} bps={int(output_bps)} params={raw_develop_signature(clean)}",
            flush=True,
        )
    return rgb, clean


def _preview_profile_label(max_side: int, preview_profile: bool) -> str:
    if int(max_side or 0) > 0:
        return "medium-preview"
    return "original-preview" if preview_profile else "full-export"


def _preview_cache_key(source: Path, params: dict, max_side: int, preview_profile: bool) -> str:
    stat = source.stat()
    size_label = "full" if int(max_side or 0) <= 0 else str(int(max_side))
    profile_label = _preview_profile_label(int(max_side or 0), bool(preview_profile))
    raw = (
        f"{RAW_DEVELOP_ALGORITHM_VERSION}|jpg|{profile_label}|{size_label}|"
        f"{raw_develop_signature(params)}|{source.resolve()}|"
        f"{int(stat.st_mtime_ns)}|{int(stat.st_size)}"
    ).encode("utf-8", errors="strict")
    return hashlib.sha1(raw).hexdigest()


def _preview_cache_path(source: Path, params: dict, max_side: int, preview_profile: bool) -> Path:
    key = _preview_cache_key(source, params, max_side, preview_profile)
    return RAW_DEVELOP_PREVIEW_DIR / key[:2] / f"{key}.jpg"


def _lock_for(path: Path) -> threading.Lock:
    key = str(path)
    with _LOCKS_GUARD:
        lock = _LOCKS.get(key)
        if lock is None:
            lock = threading.Lock()
            _LOCKS[key] = lock
        return lock


def _rawpy_cache_key(path: Path) -> str:
    stat = path.stat()
    return f"{path.resolve()}|{int(stat.st_mtime_ns)}|{int(stat.st_size)}"


def _close_rawpy(raw) -> None:
    close = getattr(raw, "close", None)
    if callable(close):
        try:
            close()
        except Exception:
            pass


def _evict_rawpy_cache_entry_locked(key: str, entry: dict) -> bool:
    lock = entry.get("lock")
    if not lock or not lock.acquire(blocking=False):
        return False
    try:
        if _RAWPY_CACHE.get(key) is not entry:
            return False
        _RAWPY_CACHE.pop(key, None)
        _close_rawpy(entry.get("raw"))
        return True
    finally:
        lock.release()


def _trim_rawpy_cache_locked(now: float) -> None:
    for key, entry in list(_RAWPY_CACHE.items()):
        if now - float(entry.get("last_used") or 0) >= RAW_DEVELOP_RAW_CACHE_TTL_SECONDS:
            _evict_rawpy_cache_entry_locked(key, entry)

    if len(_RAWPY_CACHE) <= RAW_DEVELOP_RAW_CACHE_MAX_ITEMS:
        return
    for key, entry in sorted(
        list(_RAWPY_CACHE.items()),
        key=lambda item: float(item[1].get("last_used") or 0),
    ):
        if len(_RAWPY_CACHE) <= RAW_DEVELOP_RAW_CACHE_MAX_ITEMS:
            break
        _evict_rawpy_cache_entry_locked(key, entry)


def _rawpy_cache_entry(path: Path, rawpy_module):
    key = _rawpy_cache_key(path)
    now = time.time()
    with _RAWPY_CACHE_LOCK:
        _trim_rawpy_cache_locked(now)
        entry = _RAWPY_CACHE.get(key)
        if entry is not None:
            entry["last_used"] = now
            entry["lock"].acquire()
            return key, entry

    raw = rawpy_module.imread(str(path))
    entry = {
        "raw": raw,
        "lock": threading.Lock(),
        "last_used": now,
    }
    with _RAWPY_CACHE_LOCK:
        existing = _RAWPY_CACHE.get(key)
        if existing is not None:
            existing["last_used"] = now
            existing["lock"].acquire()
            _close_rawpy(raw)
            return key, existing
        _RAWPY_CACHE[key] = entry
        entry["lock"].acquire()
        _trim_rawpy_cache_locked(now)
    return key, entry


def _drop_rawpy_cache_entry(key: str, entry: dict | None) -> None:
    if not key or not entry:
        return
    with _RAWPY_CACHE_LOCK:
        if _RAWPY_CACHE.get(key) is entry:
            _RAWPY_CACHE.pop(key, None)
    lock = entry.get("lock")
    if lock:
        with lock:
            _close_rawpy(entry.get("raw"))
    else:
        _close_rawpy(entry.get("raw"))


def _jpeg_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as img:
        return int(img.width), int(img.height)


def _cleanup_empty_dirs(root: Path) -> None:
    for folder in sorted(
        (item for item in root.rglob("*") if item.is_dir()),
        key=lambda item: len(item.parts),
        reverse=True,
    ):
        try:
            folder.rmdir()
        except OSError:
            pass


def cleanup_raw_develop_preview_cache(*, keep_paths: set[Path] | None = None) -> None:
    root = RAW_DEVELOP_PREVIEW_DIR
    if not root.exists() or not root.is_dir():
        return
    keep = {path.resolve() for path in (keep_paths or set()) if path}
    now = time.time()
    with _CACHE_CLEANUP_LOCK:
        for item in root.rglob("*"):
            if not item.is_file():
                continue
            try:
                resolved = item.resolve()
                age = now - item.stat().st_mtime
            except OSError:
                continue
            if resolved in keep:
                continue
            suffix = item.suffix.lower()
            if suffix == ".jpg" and age < RAW_DEVELOP_CACHE_GRACE_SECONDS:
                continue
            if suffix == ".tmp" and age < RAW_DEVELOP_TMP_GRACE_SECONDS:
                continue
            if suffix not in {".jpg", ".tmp"}:
                continue
            try:
                item.unlink()
            except OSError:
                pass
        _cleanup_empty_dirs(root)


def ensure_raw_developed_preview(
    source: str | Path,
    params=None,
    *,
    max_side: int = 2400,
    preview_profile: bool = True,
) -> dict:
    path = Path(source)
    clean = normalize_raw_develop_params(params)
    side = max(0, int(max_side or 0))
    target = _preview_cache_path(path, clean, side, bool(preview_profile))
    if target.exists() and target.stat().st_size > 0:
        width, height = _jpeg_size(target)
        cleanup_raw_develop_preview_cache(keep_paths={target})
        return {"path": target, "width": width, "height": height, "params": clean}

    lock = _lock_for(target)
    with lock:
        if target.exists() and target.stat().st_size > 0:
            width, height = _jpeg_size(target)
            cleanup_raw_develop_preview_cache(keep_paths={target})
            return {"path": target, "width": width, "height": height, "params": clean}
        tmp = target.with_name(f"{target.stem}.{threading.get_ident()}.{time.time_ns()}.tmp")
        try:
            medium_preview = side > 0
            original_preview = side <= 0 and bool(preview_profile)
            preview_bps = 8 if medium_preview or original_preview or _curve_is_neutral(clean["curve_points"]) else 16
            rgb, clean = develop_raw_array(
                path,
                clean,
                output_bps=preview_bps,
                medium_preview=medium_preview,
                preview_profile=original_preview,
            )
            rgb = _rgb_to_uint8(rgb)
            img = Image.fromarray(rgb)
            if side > 0:
                img.thumbnail((side, side), Image.Resampling.BILINEAR)
            if img.mode != "RGB":
                img = img.convert("RGB")
            quality = RAW_DEVELOP_FULL_PROXY_QUALITY if side <= 0 else RAW_DEVELOP_PREVIEW_QUALITY
            with _CACHE_CLEANUP_LOCK:
                target.parent.mkdir(parents=True, exist_ok=True)
                img.save(tmp, "JPEG", quality=quality)
                tmp.replace(target)
        except Exception:
            try:
                if tmp.exists():
                    tmp.unlink()
            except Exception:
                pass
            raise
    width, height = _jpeg_size(target)
    cleanup_raw_develop_preview_cache(keep_paths={target})
    return {"path": target, "width": width, "height": height, "params": clean}


def save_raw_developed_tiff(source: str | Path, target: str | Path, params=None) -> dict:
    path = Path(source)
    output = Path(target)
    try:
        import tifffile
    except Exception as exc:
        raise RawDevelopError(f"缺少 tifffile 依赖，无法写入 16bit TIFF: {exc}") from exc

    rgb, clean = develop_raw_array(path, params, output_bps=16)
    dtype_name = getattr(getattr(rgb, "dtype", None), "name", "")
    if dtype_name != "uint16":
        raise RawDevelopError(f"RAW 显影没有返回 16bit 数据: {dtype_name or 'unknown'}")

    output.parent.mkdir(parents=True, exist_ok=True)
    tmp = output.with_name(f"{output.stem}.{threading.get_ident()}.{time.time_ns()}.tmp")
    try:
        tifffile.imwrite(
            str(tmp),
            rgb,
            photometric="rgb",
            metadata={
                "Software": "PicScanner",
                "RawDevelopVersion": RAW_DEVELOP_ALGORITHM_VERSION,
                "RawDevelopParams": raw_develop_signature(clean),
            },
        )
        tmp.replace(output)
    except Exception as exc:
        try:
            if tmp.exists():
                tmp.unlink()
        except Exception:
            pass
        raise RawDevelopError(f"16bit TIFF 写入失败: {output} ({exc})") from exc

    return {
        "path": output,
        "width": int(rgb.shape[1]),
        "height": int(rgb.shape[0]),
        "params": clean,
    }
