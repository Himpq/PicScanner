from __future__ import annotations

import base64
import binascii
import ctypes
import hashlib
import json
import math
import os
import re
import secrets
import shutil
import webbrowser
from datetime import datetime
from pathlib import Path

import webview

from WebViewUI import WindowApi
from .config_store import DATA_DIR, config_store
from .exif_reader import is_renderable_image
from .scanner import scanner
from .source_identity import ensure_marker, is_removable_source, marker_path, path_source_id, read_marker
from .storage import storage
from .raw_developer import (
    RawDevelopError,
    ensure_raw_developed_preview,
    save_raw_developed_tiff,
)
from .thumbnailer import (
    LIGHTBOX_PREVIEW_ALGORITHM_VERSION,
    ThumbnailError,
    ensure_lightbox_preview,
    ensure_thumbnail,
    existing_lightbox_preview,
    existing_thumbnail,
    is_previewable_image,
    is_raw_image,
    warm_thumbnails,
)


ACTIVE_SCAN_STATUSES = {"discovering", "stopping"}
MISSING_SOURCE_ID = "__picscanner_missing_source__"
DEFAULT_EXPORT_PRESET = {
    "enabled": False,
    "destination": "",
    "template": "{origin_name}",
}
QUICK_EDIT_SAVE_FORMATS = {
    "jpg": {"suffix": ".jpg", "mime": "image/jpeg", "label": "JPEG"},
    "jpeg": {"suffix": ".jpg", "mime": "image/jpeg", "label": "JPEG"},
    "png": {"suffix": ".png", "mime": "image/png", "label": "PNG"},
    "webp": {"suffix": ".webp", "mime": "image/webp", "label": "WebP"},
    "tif16": {"suffix": ".tif", "mime": "image/tiff", "label": "TIFF 16-bit"},
    "tiff16": {"suffix": ".tif", "mime": "image/tiff", "label": "TIFF 16-bit"},
}
QUICK_EDIT_LUT_LIBRARY_DIR = DATA_DIR / "luts"
QUICK_EDIT_PRESETS_PATH = DATA_DIR / "quick_edit_presets.json"
QUICK_EDIT_LUT_MAX_BYTES = 32 * 1024 * 1024
QUICK_EDIT_PRESET_MAX_COUNT = 120
IMAGE_EXPORT_SUFFIXES = {
    ".arw", ".raw", ".dng", ".cr2", ".cr3", ".nef", ".nrw",
    ".raf", ".rw2", ".orf", ".srw", ".pef", ".jpg", ".jpeg",
    ".png", ".tif", ".tiff", ".heic", ".heif", ".webp", ".bmp",
}
EXPORT_TEMPLATE_FIELDS = {
    "origin_name",
    "filename",
    "date",
    "Y",
    "M",
    "D",
    "len_name",
    "lens_name",
    "aperture",
    "iso",
    "shutter",
    "camera",
    "model",
    "format",
}


def _format_bytes(value: int | float | None) -> str:
    n = float(value or 0)
    units = ["B", "KB", "MB", "GB", "TB"]
    idx = 0
    while n >= 1024 and idx < len(units) - 1:
        n /= 1024
        idx += 1
    if idx == 0:
        return f"{int(n)} {units[idx]}"
    return f"{n:.1f} {units[idx]}"


def _versioned_file_uri(path: str | Path) -> str:
    p = Path(path)
    stat = p.stat()
    return f"{p.resolve().as_uri()}?v={int(stat.st_mtime_ns)}-{int(stat.st_size)}"


def _drive_type_name(code: int) -> str:
    return {
        2: "可移动磁盘",
        3: "本地磁盘",
        4: "网络磁盘",
        5: "光驱",
        6: "内存磁盘",
    }.get(int(code), "磁盘")


def _windows_drives() -> list[dict]:
    if os.name != "nt":
        return [{"kind": "drive", "path": "/", "title": "/", "subtitle": "根目录"}]
    kernel32 = ctypes.windll.kernel32
    bitmask = kernel32.GetLogicalDrives()
    drives = []
    for idx in range(26):
        if not (bitmask & (1 << idx)):
            continue
        letter = chr(ord("A") + idx)
        root = f"{letter}:\\"
        dtype = int(kernel32.GetDriveTypeW(ctypes.c_wchar_p(root)))
        if dtype == 1:
            continue
        label_buf = ctypes.create_unicode_buffer(261)
        fs_buf = ctypes.create_unicode_buffer(261)
        serial = ctypes.c_ulong()
        max_comp = ctypes.c_ulong()
        flags = ctypes.c_ulong()
        label = ""
        try:
            ok = kernel32.GetVolumeInformationW(
                ctypes.c_wchar_p(root),
                label_buf,
                ctypes.sizeof(label_buf),
                ctypes.byref(serial),
                ctypes.byref(max_comp),
                ctypes.byref(flags),
                fs_buf,
                ctypes.sizeof(fs_buf),
            )
            if ok:
                label = label_buf.value.strip()
        except Exception:
            label = ""
        free = ctypes.c_ulonglong()
        total = ctypes.c_ulonglong()
        try:
            kernel32.GetDiskFreeSpaceExW(
                ctypes.c_wchar_p(root),
                ctypes.byref(free),
                ctypes.byref(total),
                None,
            )
            space = f"{_format_bytes(free.value)} 可用 / {_format_bytes(total.value)}"
        except Exception:
            space = ""
        title = f"{label} ({letter}:)" if label else f"{letter}:"
        subtitle = " · ".join(x for x in [_drive_type_name(dtype), space] if x)
        drives.append(
            {
                "id": f"drive:{root}",
                "kind": "drive",
                "path": root,
                "title": title,
                "subtitle": subtitle,
                "drive_type": dtype,
            }
        )
    return drives


class PicScannerApi(WindowApi):
    def __init__(self):
        super().__init__()

    @staticmethod
    def _format_perf_value(value):
        if isinstance(value, float):
            return f"{value:.2f}"
        if isinstance(value, (int, str, bool)) or value is None:
            return str(value)
        if isinstance(value, dict):
            return "{" + ", ".join(
                f"{key}={PicScannerApi._format_perf_value(val)}"
                for key, val in value.items()
            ) + "}"
        if isinstance(value, list):
            return "[" + ", ".join(PicScannerApi._format_perf_value(item) for item in value) + "]"
        return str(value)

    def log_quick_edit_perf(self, label, payload=None):
        label_text = str(label or "").strip() or "event"
        data = payload if isinstance(payload, dict) else {}
        parts = [
            f"{key}={self._format_perf_value(value)}"
            for key, value in data.items()
        ]
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[PicScannerQuickEditPerf] {timestamp} {label_text} " + " ".join(parts), flush=True)
        return {"success": True}

    def _resolve_source_path(self, root_path) -> str:
        return str(Path(str(root_path or "")).resolve())

    def _source_query_scope(self, root_path=None, source_id=None) -> tuple[str | None, str, dict]:
        root = self._resolve_source_path(root_path) if root_path else None
        requested_source_id = str(source_id or "").strip()
        if root:
            context = self._source_context(root, source_id=requested_source_id)
            if not context.get("exists") or context.get("source_mismatch"):
                return None, MISSING_SOURCE_ID, context
            resolved_source_id = str(context.get("source_id") or "")
            if resolved_source_id:
                return root, resolved_source_id, context
            if is_removable_source(root):
                return None, MISSING_SOURCE_ID, context
            return root, "", context
        if requested_source_id:
            return None, requested_source_id, {}
        return None, MISSING_SOURCE_ID, {}

    def _source_context(self, root_path: str, *, create_marker: bool = False, source_id: str | None = None) -> dict:
        root = Path(str(root_path or "")).resolve()
        requested_source_id = str(source_id or "").strip()
        if not root.exists() or not root.is_dir():
            return {
                "root_path": str(root),
                "source_id": "",
                "requested_source_id": requested_source_id,
                "marker_exists": False,
                "marker_path": "",
                "exists": False,
                "source_mismatch": bool(requested_source_id),
            }
        removable = is_removable_source(root)
        marker = read_marker(root)
        marker_exists = bool(marker)
        should_persist = False
        if marker:
            resolved_source_id = str(marker.get("source_id") or "")
            if removable and requested_source_id and requested_source_id != resolved_source_id:
                return {
                    "root_path": str(root),
                    "source_id": "",
                    "actual_source_id": resolved_source_id,
                    "requested_source_id": requested_source_id,
                    "marker_exists": True,
                    "marker_path": str(marker_path(root)),
                    "exists": True,
                    "source_mismatch": True,
                }
            should_persist = True
        elif create_marker:
            preferred = ""
            if not removable:
                preferred = requested_source_id or storage.find_source_id_for_root(str(root)) or path_source_id(root)
            marker = ensure_marker(root, preferred_source_id=preferred or None)
            marker_exists = True
            resolved_source_id = str(marker.get("source_id") or "")
            should_persist = True
        elif removable:
            resolved_source_id = ""
            if requested_source_id:
                return {
                    "root_path": str(root),
                    "source_id": "",
                    "requested_source_id": requested_source_id,
                    "marker_exists": False,
                    "marker_path": "",
                    "exists": True,
                    "source_mismatch": True,
                }
        elif requested_source_id:
            resolved_source_id = requested_source_id
            should_persist = True
        else:
            resolved_source_id = storage.find_source_id_for_root(str(root))
            should_persist = bool(resolved_source_id)

        marker_text = str(marker_path(root)) if marker_exists else ""
        if resolved_source_id and should_persist:
            storage.upsert_source(resolved_source_id, str(root), marker_path=marker_text)
        return {
            "root_path": str(root),
            "source_id": resolved_source_id,
            "requested_source_id": requested_source_id,
            "marker_exists": marker_exists,
            "marker_path": marker_text,
            "exists": True,
            "source_mismatch": False,
        }

    def _state_from_session(self, session: dict | None) -> dict | None:
        if not session:
            return None
        status = str(session.get("status") or "idle")
        total = int(session.get("total_files") or 0)
        processed = int(session.get("processed_files") or 0)
        return {
            "running": status in ACTIVE_SCAN_STATUSES and not session.get("finished_at"),
            "status": status,
            "message": str(session.get("message") or ""),
            "session_id": session.get("id"),
            "source_id": str(session.get("source_id") or ""),
            "root_path": str(session.get("root_path") or ""),
            "total_files": total,
            "processed_files": processed,
            "discovered_files": total,
            "scan_running": False,
            "scan_status": status,
            "scan_message": str(session.get("message") or ""),
            "scan_session_id": session.get("id"),
            "scan_target_files": 0,
            "scan_processed_files": processed,
            "scan_discovered_files": total,
            "scan_complete": status == "done",
            "exif_running": False,
            "exif_status": "idle",
            "exif_message": "等待读取 EXIF",
            "exif_total_files": 0,
            "exif_processed_files": 0,
        }

    def _idle_state(self, root_path: str = "", source_id: str = "") -> dict:
        return {
            "running": False,
            "status": "idle",
            "message": "等待扫描",
            "session_id": None,
            "source_id": str(source_id or ""),
            "root_path": root_path,
            "total_files": 0,
            "processed_files": 0,
            "discovered_files": 0,
            "scan_running": False,
            "scan_status": "idle",
            "scan_message": "等待扫描",
            "scan_session_id": None,
            "scan_target_files": 0,
            "scan_processed_files": 0,
            "scan_discovered_files": 0,
            "scan_complete": False,
            "exif_running": False,
            "exif_status": "idle",
            "exif_message": "等待读取 EXIF",
            "exif_total_files": 0,
            "exif_processed_files": 0,
        }

    def _stored_thumbnail_url(self, thumb_path: str | Path | None) -> str:
        if not thumb_path:
            return ""
        thumb = Path(str(thumb_path))
        if thumb.exists() and thumb.is_file() and thumb.stat().st_size > 0:
            return _versioned_file_uri(thumb)
        return ""

    def _stored_lightbox_cache_url(self, row: dict) -> str:
        cache_path = str(row.get("lightbox_cache_path") or "")
        if not cache_path:
            return ""
        cache_version = str(row.get("lightbox_cache_version") or "")
        if cache_version != LIGHTBOX_PREVIEW_ALGORITHM_VERSION:
            return ""
        try:
            source_size = int(row.get("size") or 0)
            cache_size = int(row.get("lightbox_cache_size") or 0)
            source_mtime = float(row.get("mtime") or 0)
            cache_mtime = float(row.get("lightbox_cache_mtime") or 0)
        except (TypeError, ValueError):
            return ""
        if source_size <= 0 or cache_size != source_size:
            return ""
        if abs(cache_mtime - source_mtime) > 0.000001:
            return ""
        cache = Path(cache_path)
        if cache.exists() and cache.is_file() and cache.stat().st_size > 0:
            return _versioned_file_uri(cache)
        return ""

    def _remember_lightbox_cache(self, photo_id, payload: dict, lightbox_path: str | Path) -> None:
        storage.set_lightbox_cache(
            int(photo_id),
            str(lightbox_path),
            LIGHTBOX_PREVIEW_ALGORITHM_VERSION,
            int(payload.get("size") or 0),
            float(payload.get("mtime") or 0),
        )

    def _source_cover_url(self, source_id: str, cover_path: str, stored_thumb_path: str = "") -> str:
        sid = str(source_id or "").strip()
        source = Path(str(cover_path or ""))
        if sid and source.exists() and source.is_file():
            try:
                thumb = existing_thumbnail(source) or ensure_thumbnail(source)
                if thumb:
                    storage.set_source_cover(sid, str(source), str(thumb))
                    return _versioned_file_uri(thumb)
            except ThumbnailError as exc:
                print(f"[PicScannerCover] 来源封面缩略图生成失败: {exc}")
        return self._stored_thumbnail_url(stored_thumb_path)

    def _date_cover_url(self, cover_path: str | Path | None) -> str:
        if not cover_path:
            return ""
        thumb = existing_thumbnail(cover_path)
        return _versioned_file_uri(thumb) if thumb else ""

    def _source_summary(self, root_path: str) -> dict:
        context = self._source_context(root_path)
        source_id = context.get("source_id") or ""
        session = storage.latest_session(root_path, source_id=source_id) if source_id else None
        visible_count = storage.count_photos(root_path, source_id=source_id) if source_id else 0
        cover = storage.cover_photo(root_path, source_id=source_id) if visible_count else None
        source_state = storage.source_state(source_id) if source_id else {}
        cover_url = self._source_cover_url(
            source_id,
            str((cover or {}).get("path") or ""),
            str(source_state.get("cover_thumb_path") or ""),
        )
        return {
            "source_id": source_id,
            "marker_exists": bool(context.get("marker_exists")),
            "has_cache": visible_count > 0,
            "visible_files": visible_count,
            "total_files": int(session.get("total_files") or visible_count) if session else visible_count,
            "session_status": session.get("status") if session else "",
            "session_message": session.get("message") if session else "",
            "finished_at": session.get("finished_at") if session else "",
            "last_viewed_date": source_state.get("last_viewed_date") or "",
            "cover_url": cover_url,
        }

    def _source_payload(self, item: dict) -> dict:
        payload = dict(item)
        path = payload.get("path")
        if path:
            payload["summary"] = self._source_summary(str(path))
            payload["source_id"] = payload["summary"].get("source_id", "")
        else:
            payload["summary"] = {}
            payload["source_id"] = ""
        return payload

    def _history_source_payload(self, row: dict) -> dict:
        source_id = str(row.get("source_id") or "")
        root_path = str(row.get("root_path") or "")
        context = self._source_context(root_path, source_id=source_id) if root_path else {}
        available = bool(context.get("exists") and not context.get("source_mismatch"))
        visible_count = int(row.get("visible_count") or 0)
        registered_count = int(row.get("registered_count") or 0)
        scanned_count = max(int(row.get("session_total_files") or 0), registered_count, visible_count)
        summary = {
            "source_id": source_id if available else "",
            "marker_exists": bool(context.get("marker_exists")),
            "has_cache": scanned_count > 0,
            "visible_files": visible_count,
            "total_files": scanned_count,
            "session_status": str(row.get("session_status") or ""),
            "session_message": "",
            "finished_at": "",
            "last_viewed_date": str(row.get("last_viewed_date") or ""),
            "cover_url": str(row.get("cover_url") or ""),
        }
        return {
            "id": f"history:{source_id}",
            "kind": "history",
            "path": root_path,
            "title": Path(root_path).name or root_path or source_id,
            "subtitle": root_path,
            "exists": available,
            "unavailable": not available,
            "unavailable_message": "来源未插入或已更换",
            "source_id": source_id if available else "",
            "requested_source_id": source_id,
            "summary": summary,
        }

    def get_sources(self):
        remembered = []
        seen_history_keys = set()
        for folder in config_store.get("remembered_folders", []):
            p = Path(folder)
            payload = self._source_payload(
                {
                    "id": f"folder:{folder}",
                    "kind": "folder",
                    "path": str(p),
                    "title": p.name or str(p),
                    "subtitle": str(p),
                    "exists": p.exists() and p.is_dir(),
                }
            )
            key = (payload.get("source_id") or str(p).lower())
            seen_history_keys.add(key)
            remembered.append(payload)
        for row in self._storage_sources_payload():
            key = str(row.get("source_id") or row.get("root_path") or "")
            if not key or key in seen_history_keys:
                continue
            payload = self._history_source_payload(row)
            seen_history_keys.add(key)
            remembered.append(payload)
        return {
            "success": True,
            "drives": [self._source_payload(item) for item in _windows_drives()],
            "remembered_folders": remembered,
            "last_source": config_store.get("last_source", ""),
            "config": config_store.snapshot(),
        }

    def choose_folder(self):
        win = self._get_window("")
        if win is None:
            return {"success": False, "message": "窗口尚未就绪"}
        try:
            result = win.create_file_dialog(webview.FOLDER_DIALOG, allow_multiple=False)
        except TypeError:
            result = win.create_file_dialog(webview.FOLDER_DIALOG)
        if not result:
            return {"success": False, "cancelled": True}
        folder = result[0] if isinstance(result, (list, tuple)) else result
        folder = str(Path(folder).resolve())
        config_store.remember_folder(folder)
        return {
            "success": True,
            "path": folder,
            "title": Path(folder).name or folder,
            "summary": self._source_summary(folder),
            "message": "文件夹已记忆",
        }

    def remember_folder(self, folder):
        p = Path(str(folder or "")).resolve()
        if not p.exists() or not p.is_dir():
            return {"success": False, "message": f"目录不存在: {p}"}
        folders = config_store.remember_folder(str(p))
        return {"success": True, "folders": folders}

    def start_scan(self, root_path, limit=10):
        p = Path(str(root_path or "")).resolve()
        if not p.exists() or not p.is_dir():
            return {"success": False, "message": f"目录不存在: {p}"}
        context = self._source_context(str(p), create_marker=True)
        source_id = context["source_id"]
        config_store.set("last_source", str(p))
        result = scanner.start_scan(str(p), source_id, limit=int(limit or 10))
        result["source_id"] = source_id
        return result

    def scan_all(self, root_path):
        p = Path(str(root_path or "")).resolve()
        if not p.exists() or not p.is_dir():
            return {"success": False, "message": f"目录不存在: {p}"}
        context = self._source_context(str(p), create_marker=True)
        source_id = context["source_id"]
        config_store.set("last_source", str(p))
        result = scanner.scan_all(str(p), source_id)
        result["source_id"] = source_id
        return result

    def stop_scan(self):
        return scanner.stop_scan()

    def start_exif(self, root_path, source_id=None):
        p = Path(str(root_path or "")).resolve()
        if not p.exists() or not p.is_dir():
            return {"success": False, "message": f"目录不存在: {p}"}
        context = self._source_context(str(p), create_marker=True, source_id=source_id)
        if not context.get("source_id"):
            return {"success": False, "message": "来源标记不匹配，请重新选择磁盘或重新扫描"}
        return scanner.start_exif(str(p), context["source_id"])

    def stop_exif(self):
        return scanner.stop_exif()

    def get_scan_state(self, root_path=None, source_id=None):
        requested_root = self._resolve_source_path(root_path) if root_path else ""
        scope_root, scope_source_id, source_context = self._source_query_scope(root_path, source_id)
        resolved_source_id = "" if scope_source_id == MISSING_SOURCE_ID else scope_source_id
        runtime_state = scanner.get_state()
        if not runtime_state.get("running"):
            storage.repair_unfinished_sessions()
        session = storage.latest_session(scope_root or None, source_id=scope_source_id or None)
        runtime_root = str(runtime_state.get("root_path") or "")
        runtime_source_id = str(runtime_state.get("source_id") or "")
        runtime_matches = (
            (resolved_source_id and runtime_source_id == resolved_source_id)
            or (not resolved_source_id and scope_root and runtime_root.lower() == scope_root.lower())
        )
        if runtime_matches and runtime_state.get("running"):
            state = runtime_state
        else:
            state = self._state_from_session(session) or self._idle_state(requested_root, resolved_source_id)
            pending = storage.count_exif_pending(scope_root or None, source_id=scope_source_id or None)
            state["exif_total_files"] = pending
        state_source_id = str(state.get("source_id") or (session or {}).get("source_id") or resolved_source_id or "")
        query_source_id = state_source_id or scope_source_id
        source_state = storage.source_state(state_source_id) if state_source_id else {}
        return {
            "success": True,
            "state": state,
            "runtime_state": runtime_state,
            "session": session,
            "source_context": source_context,
            "source_state": source_state,
            "statistics": storage.statistics(scope_root or None, source_id=query_source_id or None),
            "cached_visible_files": storage.count_photos(scope_root or None, source_id=query_source_id or None),
        }

    def get_startup_state(self):
        last_source = str(config_store.get("last_source", "") or "")
        return {
            "success": True,
            "sources": self.get_sources(),
            "scan": self.get_scan_state(last_source or None),
        }

    def _storage_sources_payload(self) -> list[dict]:
        sources = []
        for index, row in enumerate(storage.list_storage_sources(), 1):
            cover_path = str(row.get("cover_path") or "")
            cover_url = self._source_cover_url(
                str(row.get("source_id") or ""),
                cover_path,
                str(row.get("cover_thumb_path") or ""),
            )
            registered_count = int(row.get("registered_count") or 0)
            session_total = int(row.get("session_total_files") or 0)
            sources.append(
                {
                    "id": index,
                    "source_id": str(row.get("source_id") or ""),
                    "root_path": str(row.get("root_path") or ""),
                    "marker_path": str(row.get("marker_path") or ""),
                    "cover_photo_path": str(row.get("cover_photo_path") or ""),
                    "cover_thumb_path": str(row.get("cover_thumb_path") or ""),
                    "last_viewed_date": str(row.get("last_viewed_date") or ""),
                    "cover_url": cover_url,
                    "session_total_files": session_total,
                    "scanned_count": max(session_total, registered_count),
                    "registered_count": registered_count,
                    "visible_count": int(row.get("visible_count") or 0),
                    "session_status": str(row.get("session_status") or ""),
                    "updated_at": str(row.get("updated_at") or ""),
                }
            )
        return sources

    def list_storage_sources(self):
        return {"success": True, "sources": self._storage_sources_payload()}

    def get_statistics_detail(self, root_path=None, source_id=None):
        root, resolved_source_id, _context = self._source_query_scope(root_path, source_id)
        return {
            "success": True,
            "sources": self._storage_sources_payload(),
            "statistics": storage.statistics_detail(
                root_path=root,
                source_id=resolved_source_id or None,
            ),
        }

    def open_external_url(self, url):
        target = str(url or "").strip()
        if target != "https://github.com/Himpq/PicScanner":
            return {"success": False, "message": f"不允许打开链接: {target}"}
        webbrowser.open(target, new=2)
        return {"success": True}

    def list_dates(self, before=None, limit=10, root_path=None, source_id=None, sort_key="datetime_desc", filters=None):
        root, resolved_source_id, _context = self._source_query_scope(root_path, source_id)
        dates = storage.list_dates(
            before=before or None,
            limit=int(limit or 10),
            root_path=root,
            source_id=resolved_source_id or None,
            sort_key=str(sort_key or "datetime_desc"),
            filters=filters if isinstance(filters, dict) else None,
        )
        marks = storage.marks_for_items(resolved_source_id, "date", [d.get("date_key") for d in dates])
        for date in dates:
            mark = marks.get(str(date.get("date_key") or ""), {})
            date["note"] = mark.get("note", "")
            date["cover_url"] = self._date_cover_url(date.get("cover_path"))
        return {"success": True, "dates": dates}

    def list_photos(self, date_key, offset=0, limit=60, root_path=None, source_id=None, sort_key="datetime_desc", filters=None):
        root, resolved_source_id, _context = self._source_query_scope(root_path, source_id)
        rows = storage.list_photos_for_date(
            str(date_key),
            offset=int(offset or 0),
            limit=int(limit or 60),
            root_path=root,
            source_id=resolved_source_id or None,
            sort_key=str(sort_key or "datetime_desc"),
            filters=filters if isinstance(filters, dict) else None,
        )
        marks = storage.marks_for_items(resolved_source_id, "photo", [row.get("filename") for row in rows])
        photos = []
        warm_paths = []
        for row in rows:
            payload = self._photo_payload(row)
            mark = marks.get(str(row.get("filename") or ""), {})
            payload["favorite"] = bool(mark.get("favorite"))
            payload["note"] = mark.get("note", "")
            payload["category"] = mark.get("category", "")
            if payload["previewable"] and not payload["preview_url"]:
                warm_paths.append(payload["path"])
            photos.append(payload)
        warm_thumbnails(warm_paths)
        return {"success": True, "photos": photos}

    def search_photos(self, query, root_path=None, source_id=None, scope="all", limit=30, filters=None, sort_key="datetime_desc"):
        root, resolved_source_id, _context = self._source_query_scope(root_path, source_id)
        clean_query = str(query or "").strip()
        if not clean_query:
            return {"success": True, "items": [], "photos": [], "count": 0}
        clean_scope = str(scope or "all")
        clean_sort = str(sort_key or "datetime_desc")
        active_filters = filters if isinstance(filters, dict) else None
        date_match_rows = storage.search_dates(
            clean_query,
            root_path=root,
            source_id=resolved_source_id or None,
            scope=clean_scope,
            filters=active_filters,
            limit=max(1, min(12, int(limit or 30))),
        )
        date_rows = storage.search_date_marks(
            clean_query,
            root_path=root,
            source_id=resolved_source_id or None,
            scope=clean_scope,
            filters=active_filters,
            limit=max(1, min(12, int(limit or 30))),
        )
        rows = storage.search_photos(
            clean_query,
            root_path=root,
            source_id=resolved_source_id or None,
            scope=clean_scope,
            sort_key=clean_sort,
            limit=int(limit or 30),
            filters=active_filters,
        )
        items = []
        date_item_keys = set()

        def add_date_item(item: dict) -> None:
            key = (str(item.get("source_id") or ""), str(item.get("date_key") or ""))
            if not key[1] or key in date_item_keys:
                return
            date_item_keys.add(key)
            items.append(item)

        for row in date_match_rows:
            date_key = str(row.get("date_key") or "")
            add_date_item(
                {
                    "type": "date",
                    "source_id": str(row.get("source_id") or resolved_source_id or ""),
                    "date_key": date_key,
                    "note": "",
                    "count": int(row.get("count") or 0),
                    "exif_count": int(row.get("exif_count") or 0),
                    "cover_url": self._date_cover_url(row.get("cover_path")),
                    "search_match": "日期: " + date_key,
                    "search_label": "日期",
                    "search_title": date_key,
                    "search_field": "date_key",
                }
            )
        for row in date_rows:
            date_key = str(row.get("date_key") or "")
            note = str(row.get("note") or "")
            add_date_item(
                {
                    "type": "date",
                    "source_id": str(row.get("source_id") or resolved_source_id or ""),
                    "date_key": date_key,
                    "note": note,
                    "count": int(row.get("count") or 0),
                    "exif_count": int(row.get("exif_count") or 0),
                    "cover_url": self._date_cover_url(row.get("cover_path")),
                    "search_match": "日期标记: " + note,
                    "search_label": "日期标记",
                    "search_title": note,
                    "search_field": "date_note",
                }
            )
        photos = []
        warm_paths = []
        for row in rows:
            search_field = str(row.get("search_match_field") or "")
            date_key = str(row.get("date_key") or "")
            row_source_id = str(row.get("source_id") or resolved_source_id or "")
            if search_field in {"date_key", "datetime_original"} and (row_source_id, date_key) in date_item_keys:
                continue
            payload = self._photo_payload(row)
            payload["type"] = "photo"
            payload["search_match"] = str(row.get("search_match") or "")
            payload["search_label"] = str(row.get("search_match_label") or "")
            payload["search_title"] = str(row.get("search_match_value") or "")
            payload["search_field"] = search_field
            payload["search_offset"] = storage.photo_offset_in_date(
                int(row.get("id") or 0),
                date_key,
                root_path=root,
                source_id=resolved_source_id or None,
                sort_key=clean_sort,
                filters=active_filters,
            )
            if payload["previewable"] and not payload["preview_url"]:
                warm_paths.append(payload["path"])
            photos.append(payload)
            items.append(payload)
        warm_thumbnails(warm_paths)
        return {"success": True, "items": items, "photos": photos, "count": len(items)}

    def get_filter_options(self, root_path=None, source_id=None):
        root, resolved_source_id, _context = self._source_query_scope(root_path, source_id)
        return {
            "success": True,
            "options": storage.filter_options(
                root_path=root,
                source_id=resolved_source_id or None,
            ),
        }

    def set_gallery_item_size(self, size):
        value = max(112, min(280, int(size or 168)))
        config_store.set("gallery_item_size", value)
        return {"success": True, "gallery_item_size": value}

    def set_last_source(self, root_path):
        p = Path(str(root_path or "")).resolve()
        if not p.exists() or not p.is_dir():
            return {"success": False, "message": f"目录不存在: {p}"}
        config_store.set("last_source", str(p))
        return {"success": True, "last_source": str(p)}

    def set_lightbox_info_visible(self, visible):
        value = bool(visible)
        config_store.set("lightbox_info_visible", value)
        return {"success": True, "lightbox_info_visible": value}

    def set_lightbox_info_position(self, position):
        if not isinstance(position, dict):
            return {"success": False, "message": "参数面板位置格式错误"}
        try:
            x = float(position.get("x"))
            y = float(position.get("y"))
        except (TypeError, ValueError):
            return {"success": False, "message": "参数面板位置坐标必须是数字"}
        if not math.isfinite(x) or not math.isfinite(y) or x < 0 or y < 0:
            return {"success": False, "message": "参数面板位置坐标超出范围"}
        value = {"x": int(round(x)), "y": int(round(y))}
        config_store.set("lightbox_info_position", value)
        return {"success": True, "lightbox_info_position": value}

    def set_lightbox_info_size(self, size):
        if not isinstance(size, dict):
            return {"success": False, "message": "参数面板尺寸格式错误"}
        try:
            width = float(size.get("width"))
            height = float(size.get("height"))
        except (TypeError, ValueError):
            return {"success": False, "message": "参数面板尺寸必须是数字"}
        if not math.isfinite(width) or not math.isfinite(height):
            return {"success": False, "message": "参数面板尺寸超出范围"}
        value = {
            "width": int(round(max(260, min(620, width)))),
            "height": int(round(max(120, min(760, height)))),
        }
        config_store.set("lightbox_info_size", value)
        return {"success": True, "lightbox_info_size": value}

    def set_lightbox_info_details_collapsed(self, collapsed):
        value = bool(collapsed)
        config_store.set("lightbox_info_details_collapsed", value)
        return {"success": True, "lightbox_info_details_collapsed": value}

    def set_quick_edit_collapsed_sections(self, sections):
        raw = sections if isinstance(sections, dict) else {}
        value = {
            "tone": bool(raw.get("tone")),
            "color": bool(raw.get("color")),
            "detail": bool(raw.get("detail")),
            "splitTone": bool(raw.get("splitTone")),
            "hsl": bool(raw.get("hsl")),
            "lut": bool(raw.get("lut")),
        }
        config_store.set("quick_edit_collapsed_sections", value)
        return {"success": True, "quick_edit_collapsed_sections": value}

    @staticmethod
    def _quick_edit_preset_path() -> Path:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        return QUICK_EDIT_PRESETS_PATH

    @staticmethod
    def _quick_edit_preset_clean_id(value=None) -> str:
        raw = str(value or "").strip()
        if re.fullmatch(r"[0-9a-f]{16,48}", raw, flags=re.IGNORECASE):
            return raw.lower()
        return secrets.token_hex(12)

    @staticmethod
    def _quick_edit_clean_preset_params(params) -> dict:
        raw = params if isinstance(params, dict) else {}
        clean = {}
        numeric_ranges = {
            "exposure": (-5, 5),
            "contrast": (-100, 100),
            "highlights": (-100, 100),
            "shadows": (-100, 100),
            "whites": (-100, 100),
            "blacks": (-100, 100),
            "dehaze": (-100, 100),
            "saturation": (-100, 100),
            "vibrance": (-100, 100),
            "sharpening": (0, 100),
            "clarity": (-100, 100),
            "grain": (0, 100),
            "temperature": (2000, 10000),
            "tint": (-100, 100),
            "rawHighlightRecovery": (0, 100),
            "rawNoiseReduction": (0, 100),
            "splitToneShadowsHue": (0, 360),
            "splitToneShadowsStrength": (0, 100),
            "splitToneMidtonesHue": (0, 360),
            "splitToneMidtonesStrength": (0, 100),
            "splitToneHighlightsHue": (0, 360),
            "splitToneHighlightsStrength": (0, 100),
            "splitToneBalance": (-100, 100),
        }
        for key, (low, high) in numeric_ranges.items():
            try:
                value = float(raw.get(key, 6500 if key == "temperature" else 0))
            except (TypeError, ValueError):
                value = 6500 if key == "temperature" else 0
            if not math.isfinite(value):
                value = 6500 if key == "temperature" else 0
            value = max(low, min(high, value))
            clean[key] = int(round(value)) if key != "exposure" else round(value, 3)

        curve_points = raw.get("curvePoints")
        points = []
        if isinstance(curve_points, list):
            for point in curve_points[:16]:
                if not isinstance(point, dict):
                    continue
                try:
                    x = float(point.get("x"))
                    y = float(point.get("y"))
                except (TypeError, ValueError):
                    continue
                if math.isfinite(x) and math.isfinite(y):
                    points.append({
                        "x": round(max(0, min(100, x)), 3),
                        "y": round(max(0, min(100, y)), 3),
                    })
        clean["curvePoints"] = points if len(points) >= 2 else [{"x": 0, "y": 0}, {"x": 100, "y": 100}]

        for prefix in ("red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"):
            for field in ("hue", "saturation", "luminance"):
                key = f"hsl_{prefix}_{field}"
                low, high = (-60, 60) if field == "hue" else (-100, 100)
                try:
                    value = float(raw.get(key, 0))
                except (TypeError, ValueError):
                    value = 0
                if not math.isfinite(value):
                    value = 0
                clean[key] = int(round(max(low, min(high, value))))
        return clean

    @staticmethod
    def _quick_edit_clean_preset_luts(luts) -> list[dict]:
        clean = []
        seen = set()
        for lut in luts if isinstance(luts, list) else []:
            if not isinstance(lut, dict):
                continue
            lut_id = str(lut.get("libraryId") or lut.get("id") or "").strip()
            if not lut_id or Path(lut_id).name != lut_id or lut_id in seen:
                continue
            seen.add(lut_id)
            title = str(lut.get("title") or lut.get("name") or lut_id).strip()[:120] or lut_id
            try:
                strength = int(round(float(lut.get("strength", 100))))
            except (TypeError, ValueError):
                strength = 100
            clean.append({
                "id": lut_id,
                "libraryId": lut_id,
                "title": title,
                "name": str(lut.get("name") or title).strip()[:120] or title,
                "strength": max(0, min(100, strength)),
            })
        return clean[:16]

    def _quick_edit_clean_preset(self, preset) -> dict | None:
        raw = preset if isinstance(preset, dict) else {}
        name = str(raw.get("name") or "").strip()
        if not name:
            return None
        now = int(datetime.now().timestamp())
        try:
            created = int(raw.get("created_at") or now)
        except (TypeError, ValueError):
            created = now
        try:
            updated = int(raw.get("updated_at") or now)
        except (TypeError, ValueError):
            updated = now
        try:
            order = float(raw.get("order", updated))
        except (TypeError, ValueError):
            order = float(updated)
        if not math.isfinite(order):
            order = float(updated)
        return {
            "id": self._quick_edit_preset_clean_id(raw.get("id")),
            "name": name[:80],
            "params": self._quick_edit_clean_preset_params(raw.get("params")),
            "luts": self._quick_edit_clean_preset_luts(raw.get("luts")),
            "favorite": bool(raw.get("favorite")),
            "order": order,
            "created_at": created,
            "updated_at": updated,
        }

    @staticmethod
    def _sort_quick_edit_presets(presets) -> list[dict]:
        return sorted(
            presets if isinstance(presets, list) else [],
            key=lambda item: (
                1 if item.get("favorite") else 0,
                float(item.get("order") or 0),
                int(item.get("updated_at") or 0),
                str(item.get("name") or ""),
            ),
            reverse=True,
        )

    def _read_quick_edit_presets(self) -> list[dict]:
        path = self._quick_edit_preset_path()
        if not path.exists():
            return []
        try:
            data = json.loads(path.read_text(encoding="utf-8-sig"))
        except Exception as exc:
            raise RuntimeError(f"预设读取失败: {exc}") from exc
        source = data.get("presets") if isinstance(data, dict) else data
        presets = []
        seen = set()
        for item in source if isinstance(source, list) else []:
            preset = self._quick_edit_clean_preset(item)
            if not preset or preset["id"] in seen:
                continue
            seen.add(preset["id"])
            presets.append(preset)
        return self._sort_quick_edit_presets(presets)[:QUICK_EDIT_PRESET_MAX_COUNT]

    def _write_quick_edit_presets(self, presets) -> None:
        path = self._quick_edit_preset_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        clean = []
        seen = set()
        for item in presets if isinstance(presets, list) else []:
            preset = self._quick_edit_clean_preset(item)
            if not preset or preset["id"] in seen:
                continue
            seen.add(preset["id"])
            clean.append(preset)
        clean = clean[:QUICK_EDIT_PRESET_MAX_COUNT]
        path.write_text(
            json.dumps({"presets": clean}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def list_quick_edit_presets(self):
        try:
            return {"success": True, "items": self._read_quick_edit_presets()}
        except RuntimeError as exc:
            return {"success": False, "message": str(exc), "items": []}

    def save_quick_edit_preset(self, name, params, luts=None):
        clean_name = str(name or "").strip()
        if not clean_name:
            return {"success": False, "message": "预设名称不能为空"}
        try:
            presets = self._read_quick_edit_presets()
        except RuntimeError as exc:
            return {"success": False, "message": str(exc)}
        now = int(datetime.now().timestamp())
        preset = {
            "id": self._quick_edit_preset_clean_id(),
            "name": clean_name,
            "params": self._quick_edit_clean_preset_params(params),
            "luts": self._quick_edit_clean_preset_luts(luts),
            "favorite": False,
            "order": float(now),
            "created_at": now,
            "updated_at": now,
        }
        presets = [preset] + [item for item in presets if str(item.get("name") or "").casefold() != clean_name.casefold()]
        self._write_quick_edit_presets(presets)
        return {"success": True, "preset": preset, "items": self._read_quick_edit_presets(), "message": f"已保存预设：{preset['name']}"}

    def delete_quick_edit_preset(self, preset_id):
        clean_id = str(preset_id or "").strip()
        if not clean_id:
            return {"success": False, "message": "预设标识为空"}
        try:
            presets = self._read_quick_edit_presets()
        except RuntimeError as exc:
            return {"success": False, "message": str(exc)}
        next_presets = [item for item in presets if str(item.get("id") or "") != clean_id]
        if len(next_presets) == len(presets):
            return {"success": False, "message": "预设不存在，请刷新列表"}
        self._write_quick_edit_presets(next_presets)
        return {"success": True, "items": self._read_quick_edit_presets(), "message": "已删除预设"}

    def rename_quick_edit_preset(self, preset_id, name):
        clean_id = str(preset_id or "").strip()
        clean_name = str(name or "").strip()
        if not clean_id:
            return {"success": False, "message": "预设标识为空"}
        if not clean_name:
            return {"success": False, "message": "预设名称不能为空"}
        try:
            presets = self._read_quick_edit_presets()
        except RuntimeError as exc:
            return {"success": False, "message": str(exc)}
        found = False
        now = int(datetime.now().timestamp())
        for preset in presets:
            if str(preset.get("id") or "") != clean_id:
                continue
            preset["name"] = clean_name[:80]
            preset["updated_at"] = now
            found = True
            break
        if not found:
            return {"success": False, "message": "预设不存在，请刷新列表"}
        self._write_quick_edit_presets(presets)
        return {"success": True, "items": self._read_quick_edit_presets(), "message": "已重命名预设"}

    def set_quick_edit_preset_favorite(self, preset_id, favorite):
        clean_id = str(preset_id or "").strip()
        if not clean_id:
            return {"success": False, "message": "预设标识为空"}
        try:
            presets = self._read_quick_edit_presets()
        except RuntimeError as exc:
            return {"success": False, "message": str(exc)}
        found = False
        now = int(datetime.now().timestamp())
        for preset in presets:
            if str(preset.get("id") or "") != clean_id:
                continue
            preset["favorite"] = bool(favorite)
            preset["updated_at"] = now
            if preset["favorite"]:
                preset["order"] = max([float(item.get("order") or 0) for item in presets] + [0]) + 1
            found = True
            break
        if not found:
            return {"success": False, "message": "预设不存在，请刷新列表"}
        self._write_quick_edit_presets(presets)
        return {"success": True, "items": self._read_quick_edit_presets(), "message": "已更新预设收藏"}

    def move_quick_edit_preset(self, preset_id, direction):
        clean_id = str(preset_id or "").strip()
        step = -1 if str(direction or "").lower() in {"down", "next", "1"} else 1
        if not clean_id:
            return {"success": False, "message": "预设标识为空"}
        try:
            presets = self._read_quick_edit_presets()
        except RuntimeError as exc:
            return {"success": False, "message": str(exc)}
        ordered = self._sort_quick_edit_presets(presets)
        index = next((i for i, item in enumerate(ordered) if str(item.get("id") or "") == clean_id), -1)
        if index < 0:
            return {"success": False, "message": "预设不存在，请刷新列表"}
        favorite_group = bool(ordered[index].get("favorite"))
        target_index = -1
        cursor = index - step
        while 0 <= cursor < len(ordered):
            if bool(ordered[cursor].get("favorite")) == favorite_group:
                target_index = cursor
                break
            cursor -= step
        if target_index < 0:
            return {"success": True, "items": ordered, "message": "预设顺序未变化"}
        ordered[index], ordered[target_index] = ordered[target_index], ordered[index]
        base = float(int(datetime.now().timestamp()) + len(ordered) + 1)
        for position, preset in enumerate(ordered):
            preset["order"] = base - position
        self._write_quick_edit_presets(ordered)
        return {"success": True, "items": self._read_quick_edit_presets(), "message": "已调整预设顺序"}

    def export_quick_edit_presets(self):
        try:
            presets = self._read_quick_edit_presets()
        except RuntimeError as exc:
            return {"success": False, "message": str(exc)}
        if not presets:
            return {"success": False, "message": "没有可导出的预设"}
        win = self._get_window("")
        if win is None:
            return {"success": False, "message": "窗口尚未就绪"}
        try:
            result = win.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename="picscanner_quick_edit_presets.json",
                file_types=("PicScanner Presets (*.json)",),
            )
        except TypeError:
            result = win.create_file_dialog(webview.SAVE_DIALOG)
        if not result:
            return {"success": False, "cancelled": True}
        target = Path(result[0] if isinstance(result, (list, tuple)) else result).resolve()
        if target.suffix.lower() != ".json":
            target = target.with_suffix(".json")
        payload = {
            "app": "PicScanner",
            "kind": "quick_edit_presets",
            "version": 1,
            "exported_at": int(datetime.now().timestamp()),
            "presets": presets,
        }
        try:
            target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError as exc:
            return {"success": False, "message": f"预设导出失败: {exc}"}
        return {"success": True, "path": str(target), "message": f"已导出预设：{target}"}

    def import_quick_edit_presets(self):
        win = self._get_window("")
        if win is None:
            return {"success": False, "message": "窗口尚未就绪"}
        result = win.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=False,
            file_types=("PicScanner Presets (*.json)",),
        )
        if not result:
            return {"success": False, "cancelled": True}
        source = Path(str(result[0] if isinstance(result, (list, tuple)) else result)).resolve()
        if source.suffix.lower() != ".json":
            return {"success": False, "message": "请选择 .json 预设文件"}
        if not source.exists() or not source.is_file():
            return {"success": False, "message": f"预设文件不存在: {source}"}
        if int(source.stat().st_size) > 8 * 1024 * 1024:
            return {"success": False, "message": "预设文件过大"}
        try:
            data = json.loads(source.read_text(encoding="utf-8-sig"))
        except Exception as exc:
            return {"success": False, "message": f"预设文件读取失败: {exc}"}
        raw_items = data.get("presets") if isinstance(data, dict) else data
        incoming = []
        for item in raw_items if isinstance(raw_items, list) else []:
            preset = self._quick_edit_clean_preset(item)
            if preset:
                preset["id"] = self._quick_edit_preset_clean_id()
                incoming.append(preset)
        if not incoming:
            return {"success": False, "message": "预设文件中没有有效预设"}
        try:
            existing = self._read_quick_edit_presets()
        except RuntimeError as exc:
            return {"success": False, "message": str(exc)}
        existing_names = {str(item.get("name") or "").casefold() for item in existing}
        merged = list(existing)
        now = int(datetime.now().timestamp())
        for preset in incoming:
            base_name = str(preset.get("name") or "导入预设").strip() or "导入预设"
            name = base_name
            suffix = 2
            while name.casefold() in existing_names:
                name = f"{base_name} {suffix}"
                suffix += 1
            existing_names.add(name.casefold())
            preset["name"] = name[:80]
            preset["created_at"] = now
            preset["updated_at"] = now
            preset["order"] = max([float(item.get("order") or 0) for item in merged] + [float(now)]) + 1
            merged.append(preset)
        self._write_quick_edit_presets(self._sort_quick_edit_presets(merged))
        return {"success": True, "items": self._read_quick_edit_presets(), "message": f"已导入 {len(incoming)} 个预设"}

    def _normalize_export_preset(self, preset=None) -> dict:
        raw = preset if isinstance(preset, dict) else config_store.get("export_preset", {})
        raw = raw if isinstance(raw, dict) else {}
        template = str(raw.get("template") or DEFAULT_EXPORT_PRESET["template"]).strip()
        if not template:
            template = DEFAULT_EXPORT_PRESET["template"]
        if len(template) > 240:
            template = template[:240]
        destination = str(raw.get("destination") or "").strip()
        if destination:
            destination = str(Path(destination).expanduser().resolve())
        return {
            "enabled": bool(raw.get("enabled")),
            "destination": destination,
            "template": template,
        }

    def get_export_preset(self):
        return {"success": True, "preset": self._normalize_export_preset()}

    def set_export_preset(self, preset):
        value = self._normalize_export_preset(preset if isinstance(preset, dict) else {})
        config_store.set("export_preset", value)
        return {"success": True, "preset": value}

    def set_last_viewed_date(self, source_id, date_key, category=None, offset=0):
        if category is None:
            storage.set_last_viewed_date(str(source_id or ""), str(date_key or ""), offset)
        else:
            storage.set_category_last_viewed_date(
                str(source_id or ""),
                str(category or "").strip(),
                str(date_key or ""),
                offset,
            )
        return {"success": True}

    def list_categories(self, source_id):
        sid = str(source_id or "")
        return {
            "success": True,
            "categories": storage.list_categories(sid),
            "favorite_count": storage.count_export_photos(sid, "favorite") if sid else 0,
        }

    def add_category(self, source_id, name):
        try:
            category = storage.add_category(str(source_id or ""), str(name or ""))
        except ValueError as exc:
            return {"success": False, "message": str(exc)}
        sid = str(source_id or "")
        return {
            "success": True,
            "category": category,
            "categories": storage.list_categories(sid),
            "favorite_count": storage.count_export_photos(sid, "favorite") if sid else 0,
        }

    def choose_export_folder(self):
        win = self._get_window("")
        if win is None:
            return {"success": False, "message": "窗口尚未就绪"}
        try:
            result = win.create_file_dialog(webview.FOLDER_DIALOG, allow_multiple=False)
        except TypeError:
            result = win.create_file_dialog(webview.FOLDER_DIALOG)
        if not result:
            return {"success": False, "cancelled": True}
        folder = result[0] if isinstance(result, (list, tuple)) else result
        folder = str(Path(folder).resolve())
        return {
            "success": True,
            "path": folder,
            "title": Path(folder).name or folder,
        }

    def _quick_edit_lut_library_dir(self) -> Path:
        QUICK_EDIT_LUT_LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
        return QUICK_EDIT_LUT_LIBRARY_DIR.resolve()

    @staticmethod
    def _quick_edit_lut_title_from_path(path: Path) -> str:
        stem = str(path.stem or "LUT").strip()
        title = re.sub(r"--[0-9a-f]{12}$", "", stem, flags=re.IGNORECASE).strip()
        return title or stem or "LUT"

    def _quick_edit_lut_item(self, path: Path) -> dict:
        p = Path(path)
        stat = p.stat()
        title = self._quick_edit_lut_title_from_path(p)
        return {
            "id": p.stem,
            "name": p.name,
            "title": title,
            "bytes": int(stat.st_size),
            "modified_at": int(stat.st_mtime),
        }

    def _quick_edit_lut_path(self, lut_id) -> Path | None:
        raw_id = str(lut_id or "").strip()
        if not raw_id or Path(raw_id).name != raw_id:
            return None
        if self._clean_export_path_part(raw_id) != raw_id:
            return None
        library = self._quick_edit_lut_library_dir()
        path = (library / f"{raw_id}.cube").resolve(strict=False)
        if path.parent != library:
            return None
        return path

    @staticmethod
    def _quick_edit_lut_digest(path: Path) -> str:
        digest = hashlib.sha256()
        with Path(path).open("rb") as fh:
            while True:
                chunk = fh.read(1024 * 1024)
                if not chunk:
                    break
                digest.update(chunk)
        return digest.hexdigest()

    @staticmethod
    def _validate_quick_edit_lut_text(text: str) -> None:
        size = 0
        data_rows = 0
        for raw_line in str(text or "").splitlines():
            line = str(raw_line or "").strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            key = str(parts[0] or "").upper()
            if key == "LUT_3D_SIZE":
                try:
                    size = max(0, int(float(parts[1] if len(parts) > 1 else 0)))
                except (TypeError, ValueError):
                    size = 0
                continue
            if key in {"TITLE", "DOMAIN_MIN", "DOMAIN_MAX"} or re.fullmatch(r"[A-Z_]+", key, flags=re.IGNORECASE):
                continue
            try:
                rgb = [float(part) for part in parts[:3]]
            except (TypeError, ValueError):
                continue
            if len(rgb) == 3 and all(math.isfinite(value) for value in rgb):
                data_rows += 1

        if size < 2:
            raise ValueError("LUT 缺少有效的 LUT_3D_SIZE")
        expected_rows = size * size * size
        if data_rows != expected_rows:
            raise ValueError(f"LUT 数据数量不匹配，期望 {expected_rows} 行，实际 {data_rows} 行")

    def list_quick_edit_luts(self):
        library = self._quick_edit_lut_library_dir()
        items = []
        for path in library.glob("*.cube"):
            if not path.is_file():
                continue
            try:
                items.append(self._quick_edit_lut_item(path))
            except OSError:
                continue
        items.sort(key=lambda item: (item.get("modified_at") or 0, item.get("title") or ""), reverse=True)
        return {"success": True, "items": items}

    def import_quick_edit_lut(self):
        win = self._get_window("")
        if win is None:
            return {"success": False, "message": "窗口尚未就绪"}

        result = win.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=False,
            file_types=("Cube LUT (*.cube)",),
        )
        if not result:
            return {"success": False, "cancelled": True}

        selected = result[0] if isinstance(result, (list, tuple)) else result
        source = Path(str(selected or "")).resolve()
        if source.suffix.lower() != ".cube":
            return {"success": False, "message": "请选择 .cube LUT 文件"}
        if not source.exists() or not source.is_file():
            return {"success": False, "message": f"LUT 文件不存在: {source}"}

        size = int(source.stat().st_size)
        if size <= 0:
            return {"success": False, "message": "LUT 文件为空"}
        if size > QUICK_EDIT_LUT_MAX_BYTES:
            return {
                "success": False,
                "message": f"LUT 文件过大，当前限制 {_format_bytes(QUICK_EDIT_LUT_MAX_BYTES)}",
            }

        library = self._quick_edit_lut_library_dir()
        digest = self._quick_edit_lut_digest(source)
        short_hash = digest[:12]
        existing = next(library.glob(f"*--{short_hash}.cube"), None)
        duplicate = existing is not None

        if existing is not None:
            target = existing
        else:
            stem = self._clean_export_path_part(source.stem) or "LUT"
            target = (library / f"{stem}--{short_hash}.cube").resolve(strict=False)
            if target.parent != library:
                return {"success": False, "message": "LUT 文件名解析异常"}
            shutil.copy2(source, target)

        item = self._quick_edit_lut_item(target)
        return {
            "success": True,
            "item": item,
            "duplicate": duplicate,
            "message": ("LUT 已在库中：" if duplicate else "已导入 LUT：") + str(item.get("title") or item.get("name") or ""),
        }

    def save_quick_edit_lut(self, filename, text):
        source_name = str(filename or "").strip() or "LUT.cube"
        if Path(source_name).name != source_name:
            return {"success": False, "message": "LUT 文件名无效"}
        if Path(source_name).suffix.lower() != ".cube":
            return {"success": False, "message": "请选择 .cube LUT 文件"}

        content = str(text or "")
        if not content.strip():
            return {"success": False, "message": "LUT 文件为空"}
        try:
            self._validate_quick_edit_lut_text(content)
        except ValueError as exc:
            return {"success": False, "message": str(exc)}
        data = content.encode("utf-8")
        size = len(data)
        if size > QUICK_EDIT_LUT_MAX_BYTES:
            return {
                "success": False,
                "message": f"LUT 文件过大，当前限制 {_format_bytes(QUICK_EDIT_LUT_MAX_BYTES)}",
            }

        library = self._quick_edit_lut_library_dir()
        digest = hashlib.sha256(data).hexdigest()
        short_hash = digest[:12]
        existing = next(library.glob(f"*--{short_hash}.cube"), None)
        duplicate = existing is not None

        if existing is not None:
            target = existing
        else:
            stem = self._clean_export_path_part(Path(source_name).stem) or "LUT"
            target = (library / f"{stem}--{short_hash}.cube").resolve(strict=False)
            if target.parent != library:
                return {"success": False, "message": "LUT 文件名解析异常"}
            target.write_bytes(data)

        item = self._quick_edit_lut_item(target)
        return {
            "success": True,
            "item": item,
            "duplicate": duplicate,
            "message": ("LUT 已在库中：" if duplicate else "已导入 LUT：") + str(item.get("title") or item.get("name") or ""),
        }

    def read_quick_edit_lut(self, lut_id):
        path = self._quick_edit_lut_path(lut_id)
        if path is None:
            return {"success": False, "message": "LUT 标识无效"}
        if not path.exists() or not path.is_file():
            return {"success": False, "message": "LUT 不存在，请刷新 LUT 库"}
        size = int(path.stat().st_size)
        if size <= 0:
            return {"success": False, "message": "LUT 文件为空"}
        if size > QUICK_EDIT_LUT_MAX_BYTES:
            return {
                "success": False,
                "message": f"LUT 文件过大，当前限制 {_format_bytes(QUICK_EDIT_LUT_MAX_BYTES)}",
            }
        try:
            text = path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError as exc:
            return {"success": False, "message": f"LUT 文本编码不是 UTF-8/ASCII: {exc}"}
        except OSError as exc:
            return {"success": False, "message": f"LUT 读取失败: {exc}"}
        return {"success": True, "item": self._quick_edit_lut_item(path), "text": text}

    def _quick_edit_save_format(self, format_key) -> dict:
        key = str(format_key or "jpg").strip().lower()
        return QUICK_EDIT_SAVE_FORMATS.get(key) or QUICK_EDIT_SAVE_FORMATS["jpg"]

    def _quick_edit_save_target(self, destination, source_path, format_key) -> tuple[Path | None, str | None]:
        destination_text = str(destination or "").strip()
        if not destination_text:
            return None, "保存路径不能为空"
        target_root = Path(destination_text).resolve()
        if not target_root.exists() or not target_root.is_dir():
            return None, f"保存目录不存在: {target_root}"

        fmt = self._quick_edit_save_format(format_key)
        source = Path(str(source_path or "")).resolve()
        source_name = source.name if str(source_path or "").strip() else "photo"
        stem = self._clean_export_path_part(Path(source_name).stem or "photo") or "photo"
        target = (target_root / f"{stem}_edited{fmt['suffix']}").resolve(strict=False)
        if target.parent != target_root:
            return None, "保存文件名解析异常"

        source_key = os.path.normcase(str(source.resolve(strict=False))) if str(source_path or "").strip() else ""
        target_key = os.path.normcase(str(target))
        if source_key and source_key == target_key:
            return None, "不能覆盖原始文件"
        if target.exists():
            return None, f"目标文件已存在，为避免覆盖请更换目录或先重命名: {target}"
        return target, None

    def check_quick_edit_save_destination(self, destination, source_path, format_key="jpg"):
        target, error = self._quick_edit_save_target(destination, source_path, format_key)
        if error:
            return {"success": False, "message": error}
        return {"success": True, "path": str(target), "filename": target.name}

    def save_quick_edit_image(self, data_url, destination, source_path, format_key="jpg", quality=92):
        target, error = self._quick_edit_save_target(destination, source_path, format_key)
        if error:
            return {"success": False, "message": error}

        fmt = self._quick_edit_save_format(format_key)
        text = str(data_url or "")
        marker = ";base64,"
        if not text.startswith("data:") or marker not in text:
            return {"success": False, "message": "保存数据格式无效"}
        header, payload = text.split(marker, 1)
        mime = header[5:].split(";", 1)[0].strip().lower()
        if mime != fmt["mime"]:
            return {
                "success": False,
                "message": f"编码格式不匹配：期望 {fmt['label']}，实际 {mime or '未知'}",
            }
        try:
            binary = base64.b64decode(payload, validate=True)
        except (binascii.Error, ValueError) as exc:
            return {"success": False, "message": f"图片数据解码失败: {exc}"}
        if not binary:
            return {"success": False, "message": "图片数据为空"}

        try:
            with target.open("xb") as fh:
                fh.write(binary)
        except FileExistsError:
            return {"success": False, "message": f"目标文件已存在，为避免覆盖请更换目录或先重命名: {target}"}
        except Exception as exc:
            return {"success": False, "message": f"保存失败: {exc}"}

        return {
            "success": True,
            "path": str(target),
            "filename": target.name,
            "format": fmt["label"],
            "quality": int(float(quality or 0)),
            "bytes": len(binary),
            "message": f"已保存到 {target}",
        }

    def develop_quick_edit_raw_preview(self, photo_id, raw_params=None, max_side=2400, preview_profile=True):
        photo = storage.get_photo(int(photo_id))
        if not photo:
            return {"success": False, "message": "图片不存在"}
        payload = self._photo_payload(photo, include_thumbnail=True)
        source = Path(str(payload.get("path") or ""))
        if not source.exists() or not source.is_file():
            return {"success": False, "message": f"RAW 文件不存在: {source}", "photo": payload}
        if not is_raw_image(source):
            return {"success": False, "message": "当前图片不是 RAW 文件", "photo": payload}

        try:
            side = max(0, int(float(max_side or 0)))
        except (TypeError, ValueError):
            side = 2400
        if side > 0:
            side = max(720, min(4096, side))

        try:
            preview = ensure_raw_developed_preview(
                source,
                raw_params or {},
                max_side=side,
                preview_profile=preview_profile is not False,
            )
        except RawDevelopError as exc:
            print(f"[PicScannerRawDevelop] 预览生成失败 photo_id={photo_id} path={source} error={exc}", flush=True)
            return {"success": False, "message": str(exc), "photo": payload}
        except Exception as exc:
            print(f"[PicScannerRawDevelop] 预览生成异常 photo_id={photo_id} path={source} error={exc}", flush=True)
            return {"success": False, "message": f"RAW 显影预览失败: {exc}", "photo": payload}

        return {
            "success": True,
            "url": _versioned_file_uri(preview["path"]),
            "path": str(preview["path"]),
            "width": int(preview["width"]),
            "height": int(preview["height"]),
            "params": preview["params"],
            "photo": payload,
        }

    def save_quick_edit_raw_tiff(self, photo_id, raw_params, destination, source_path=None, format_key="tif16"):
        photo = storage.get_photo(int(photo_id))
        if not photo:
            return {"success": False, "message": "图片不存在"}
        payload = self._photo_payload(photo)
        source = Path(str(payload.get("path") or ""))
        if not source.exists() or not source.is_file():
            return {"success": False, "message": f"RAW 文件不存在: {source}"}
        if not is_raw_image(source):
            return {"success": False, "message": "当前图片不是 RAW 文件，不能导出 16bit RAW TIFF"}

        key = str(format_key or "tif16").strip().lower()
        if key not in {"tif16", "tiff16"}:
            return {"success": False, "message": "RAW 16bit 导出格式必须是 TIFF 16-bit"}
        target, error = self._quick_edit_save_target(destination, source_path or str(source), "tif16")
        if error:
            return {"success": False, "message": error}

        try:
            result = save_raw_developed_tiff(source, target, raw_params or {})
        except RawDevelopError as exc:
            print(f"[PicScannerRawDevelop] 16bit TIFF 保存失败 photo_id={photo_id} path={source} error={exc}", flush=True)
            return {"success": False, "message": str(exc)}
        except Exception as exc:
            print(f"[PicScannerRawDevelop] 16bit TIFF 保存异常 photo_id={photo_id} path={source} error={exc}", flush=True)
            return {"success": False, "message": f"16bit TIFF 保存失败: {exc}"}

        return {
            "success": True,
            "path": str(result["path"]),
            "filename": Path(result["path"]).name,
            "format": "TIFF 16-bit",
            "width": int(result["width"]),
            "height": int(result["height"]),
            "message": f"已保存到 {result['path']}",
        }

    def get_export_summary(self, source_id, export_type, category=None):
        sid = str(source_id or "").strip()
        if not sid:
            return {"success": False, "message": "当前来源尚未建立 .picscanner，请先扫描一次"}
        try:
            count = storage.count_export_photos(sid, str(export_type or ""), category)
        except ValueError as exc:
            return {"success": False, "message": str(exc)}
        label = self._export_label(str(export_type or ""), category)
        return {"success": True, "count": count, "label": label}

    def export_photos(self, source_id, export_type, destination, category=None, naming_template=None):
        sid = str(source_id or "").strip()
        if not sid:
            return {"success": False, "message": "当前来源尚未建立 .picscanner，请先扫描一次"}
        destination_text = str(destination or "").strip()
        if not destination_text:
            return {"success": False, "message": "导出目录不能为空"}
        target_root = Path(destination_text).resolve()
        if not target_root.exists() or not target_root.is_dir():
            return {"success": False, "message": f"导出目录不存在: {target_root}"}
        try:
            rows = storage.export_photos(sid, str(export_type or ""), category)
        except ValueError as exc:
            return {"success": False, "message": str(exc)}
        label = self._export_label(str(export_type or ""), category)
        total = len(rows)
        if total <= 0:
            return {"success": False, "message": f"{label}没有可导出的图片", "total": 0}

        copied = 0
        missing: list[str] = []
        failed: list[dict] = []
        skipped_same_file = 0
        used_destinations: set[str] = set()
        for row in rows:
            source = Path(str(row.get("path") or "")).resolve()
            if not source.exists() or not source.is_file():
                missing.append(str(source))
                continue
            relative = self._safe_export_relative(row, naming_template)
            destination_path = self._dedupe_export_destination(target_root / relative, used_destinations)
            try:
                if destination_path.exists() and source.samefile(destination_path):
                    skipped_same_file += 1
                    continue
                destination_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(str(source), str(destination_path))
                copied += 1
            except Exception as exc:
                failed.append({"path": str(source), "message": str(exc)})

        parts = [f"已导出 {copied}/{total} 张到 {target_root}"]
        if missing:
            parts.append(f"缺失 {len(missing)} 张")
        if failed:
            parts.append(f"失败 {len(failed)} 张")
        if skipped_same_file:
            parts.append(f"跳过同源文件 {skipped_same_file} 张")
        template_text = str(naming_template or "").strip()
        if template_text:
            parts.append(f"命名模板 {template_text}")
        return {
            "success": not missing and not failed,
            "message": "，".join(parts),
            "label": label,
            "destination": str(target_root),
            "total": total,
            "copied": copied,
            "missing_count": len(missing),
            "failed_count": len(failed),
            "skipped_same_file": skipped_same_file,
            "missing_samples": missing[:5],
            "failed_samples": failed[:5],
        }

    def _export_label(self, export_type: str, category=None) -> str:
        if str(export_type or "").strip() == "favorite":
            return "收藏"
        if str(export_type or "").strip() == "category":
            name = str(category or "").strip()
            return name or "未分类"
        return "全部照片"

    def _safe_export_relative(self, row: dict, naming_template=None) -> Path:
        template = str(naming_template or "").strip()
        if template:
            return self._template_export_relative(row, template)
        source_name = Path(str(row.get("path") or row.get("filename") or "photo")).name
        relative = str(row.get("relative_path") or source_name).replace("\\", "/").strip().strip("/")
        candidate = Path(relative)
        if candidate.is_absolute() or not relative or any(part in {"", ".", ".."} for part in candidate.parts):
            return Path(source_name)
        return candidate

    def _template_export_relative(self, row: dict, template: str) -> Path:
        source_name = Path(str(row.get("path") or row.get("filename") or "photo")).name
        source_stem = Path(source_name).stem or "photo"
        source_suffix = Path(source_name).suffix or str(row.get("suffix") or "")
        values = self._export_template_values(row, source_stem)

        def replace_field(match: re.Match) -> str:
            key = str(match.group(1) or "")
            if key not in EXPORT_TEMPLATE_FIELDS:
                return ""
            return self._clean_export_path_part(values.get(key, ""))

        rendered = re.sub(r"\{([A-Za-z0-9_]+)\}", replace_field, template)
        raw_parts = [part for part in re.split(r"[\\/]+", rendered) if str(part or "").strip()]
        parts = [self._clean_export_path_part(part) for part in raw_parts]
        parts = [part for part in parts if part]
        if not parts:
            parts = [self._clean_export_path_part(source_stem)]

        final_stem = self._strip_export_suffix(parts[-1], source_suffix)
        if not final_stem:
            final_stem = self._clean_export_path_part(source_stem)
        parts[-1] = final_stem + source_suffix
        return Path(*parts)

    def _export_template_values(self, row: dict, source_stem: str) -> dict[str, str]:
        date_key = str(row.get("date_key") or "").strip()
        date_parts = date_key.split("-") if date_key else []
        year = date_parts[0] if len(date_parts) >= 1 else ""
        month = date_parts[1] if len(date_parts) >= 2 else ""
        day = date_parts[2] if len(date_parts) >= 3 else ""
        lens_name = str(row.get("lens_model") or row.get("focal_bucket") or "").strip()
        model = str(row.get("model") or "").strip()
        make = str(row.get("make") or "").strip()
        aperture = self._format_export_aperture(row.get("f_number") or row.get("aperture_bucket"))
        return {
            "origin_name": source_stem,
            "filename": source_stem,
            "date": date_key,
            "Y": year,
            "M": month,
            "D": day,
            "len_name": lens_name,
            "lens_name": lens_name,
            "aperture": aperture,
            "iso": str(row.get("iso") or row.get("iso_bucket") or "").strip(),
            "shutter": str(row.get("exposure_time") or "").strip(),
            "camera": " ".join(part for part in [make, model] if part),
            "model": model,
            "format": str(row.get("format") or "").strip(),
        }

    @staticmethod
    def _format_export_aperture(value) -> str:
        if value is None:
            return ""
        try:
            number = float(value)
        except (TypeError, ValueError):
            text = str(value or "").strip()
            return text if text != "?" else ""
        if not math.isfinite(number) or number <= 0:
            return ""
        return "F" + f"{number:g}"

    @staticmethod
    def _clean_export_path_part(value) -> str:
        text = str(value or "").strip()
        for char in '<>:"\\|?*':
            text = text.replace(char, "_")
        text = "".join("_" if ord(char) < 32 else char for char in text)
        text = re.sub(r"\s+", " ", text).strip(" .")
        if text in {"", ".", ".."}:
            return ""
        return text

    @staticmethod
    def _strip_export_suffix(stem: str, source_suffix: str) -> str:
        text = str(stem or "").strip()
        suffix = str(source_suffix or "").lower()
        lower = text.lower()
        candidates = sorted(IMAGE_EXPORT_SUFFIXES | ({suffix} if suffix else set()), key=len, reverse=True)
        for candidate in candidates:
            if candidate and lower.endswith(candidate):
                return text[: -len(candidate)].rstrip(" .")
        return text.rstrip(" .")

    @staticmethod
    def _dedupe_export_destination(path: Path, used: set[str]) -> Path:
        candidate = Path(path)
        key = os.path.normcase(str(candidate.resolve(strict=False)))
        if key not in used:
            used.add(key)
            return candidate
        parent = candidate.parent
        stem = candidate.stem
        suffix = candidate.suffix
        index = 2
        while True:
            next_candidate = parent / f"{stem}_{index}{suffix}"
            next_key = os.path.normcase(str(next_candidate.resolve(strict=False)))
            if next_key not in used:
                used.add(next_key)
                return next_candidate
            index += 1

    def set_item_mark(self, source_id, item_type, item_key, favorite=None, note=None, category=None):
        mark = storage.set_mark(
            str(source_id or ""),
            str(item_type or ""),
            str(item_key or ""),
            favorite=None if favorite is None else bool(favorite),
            note=None if note is None else str(note or ""),
            category=None if category is None else str(category or "").strip(),
        )
        return {"success": True, "mark": mark}

    def set_photo_category(self, source_id, item_key, category):
        try:
            mark = storage.set_mark(
                str(source_id or ""),
                "photo",
                str(item_key or ""),
                category=str(category or "").strip(),
            )
        except ValueError as exc:
            return {"success": False, "message": str(exc)}
        return {"success": True, "mark": mark}

    def get_photo_preview(self, photo_id):
        photo = storage.get_photo(int(photo_id))
        if not photo:
            return {"success": False, "message": "图片不存在"}
        payload = self._photo_payload(photo, include_thumbnail=True)
        self._apply_photo_mark(payload)
        if not payload.get("preview_url"):
            return {
                "success": False,
                "message": payload.get("preview_error") or "无法生成预览",
                "photo": payload,
            }
        return {"success": True, "photo": payload}

    def get_quick_edit_pair_options(self, photo_id):
        photo = storage.get_photo(int(photo_id))
        if not photo:
            return {"success": False, "message": "图片不存在"}
        payload = self._photo_payload(photo)
        self._apply_photo_mark(payload)
        if not payload.get("is_jpg") or not payload.get("has_raw_pair"):
            return {"success": False, "message": "当前照片没有 RAW+JPG 配对"}

        raw_rows = storage.raw_pairs_for_photo(int(photo_id))
        raw_options = []
        for row in raw_rows:
            item = self._photo_payload(row)
            self._apply_photo_mark(item)
            raw_options.append(item)
        if not raw_options:
            return {"success": False, "message": "数据库标记存在 RAW 配对，但没有找到对应 RAW 文件，请重新扫描"}
        return {
            "success": True,
            "jpg_photo": payload,
            "raw_options": raw_options,
        }

    def get_photo_lightbox_preview(self, photo_id):
        photo = storage.get_photo(int(photo_id))
        if not photo:
            return {"success": False, "message": "图片不存在"}
        payload = self._photo_payload(photo)
        if payload.get("lightbox_url"):
            if not str(photo.get("lightbox_cache_path") or "") and payload.get("path"):
                remembered = existing_lightbox_preview(payload["path"])
                if remembered:
                    self._remember_lightbox_cache(photo_id, payload, remembered)
            self._apply_photo_mark(payload)
            return {"success": True, "photo": payload}
        source = Path(str(payload.get("path") or ""))
        if not source.exists() or not source.is_file():
            return {"success": False, "message": f"图片文件不存在: {source}", "photo": payload}
        if not payload.get("previewable"):
            return {"success": False, "message": "格式不支持高清预览", "photo": payload}

        try:
            lightbox = existing_lightbox_preview(payload["path"])
            if lightbox:
                payload["lightbox_status"] = "cached"
            else:
                lightbox = ensure_lightbox_preview(payload["path"])
                payload["lightbox_status"] = "generated"
            payload["lightbox_url"] = _versioned_file_uri(lightbox)
            self._remember_lightbox_cache(photo_id, payload, lightbox)
        except ThumbnailError as exc:
            payload["lightbox_status"] = "failed"
            payload["lightbox_error"] = str(exc)
            print(f"[PicScannerLightbox] 本地缓存生成失败 photo_id={photo_id} path={source} error={exc}")
            return {"success": False, "message": str(exc), "photo": payload}

        self._apply_photo_mark(payload)
        return {"success": True, "photo": payload}

    def start_photo_drag(self, photo_id):
        photo = storage.get_photo(int(photo_id))
        if not photo:
            return {"success": False, "message": "图片不存在"}
        source = Path(str(photo.get("path") or "")).resolve()
        if not source.exists() or not source.is_file():
            return {"success": False, "message": f"图片文件不存在: {source}"}
        if os.name != "nt":
            return {"success": False, "message": "原生文件拖拽目前仅支持 Windows"}

        win = self._get_window("")
        if win is None:
            return {"success": False, "message": "窗口尚未就绪"}

        try:
            import webview.platforms.winforms as _wf
            from System import Action, Array, String
            from System.Windows.Forms import (
                Application,
                Cursor,
                Cursors,
                DataFormats,
                DataObject,
                DragDropEffects,
            )

            form = _wf.BrowserView.instances.get(win.uid)
            if not form:
                return {"success": False, "message": "WinForms 窗口尚未就绪"}

            file_path = str(source)

            def _disable_webview_file_drop():
                try:
                    Application.UseWaitCursor = False
                    form.UseWaitCursor = False
                    form.Cursor = Cursors.Default
                    browser = getattr(form, "browser", None)
                    wv = getattr(browser, "webview", None) if browser is not None else None
                    if wv is not None:
                        try:
                            wv.AllowExternalDrop = False
                        except Exception:
                            pass
                        try:
                            ctl = getattr(wv, "CoreWebView2Controller", None)
                            if ctl is not None:
                                ctl.AllowExternalDrop = False
                        except Exception:
                            pass
                except Exception as exc:
                    print(f"[PicScannerDrag] 禁用 WebView 文件 drop 失败: {exc}")

            if bool(getattr(form, "InvokeRequired", False)):
                form.Invoke(Action(_disable_webview_file_drop))
            else:
                _disable_webview_file_drop()

            def _do_drag():
                try:
                    try:
                        ctypes.windll.user32.ReleaseCapture()
                    except Exception:
                        pass
                    Application.UseWaitCursor = False
                    Cursor.Current = Cursors.Default
                    data = DataObject()
                    data.SetData(DataFormats.FileDrop, Array[String]([file_path]))
                    form.DoDragDrop(data, DragDropEffects.Copy)
                    Cursor.Current = Cursors.Default
                except Exception as exc:
                    print(f"[PicScannerDrag] 原生文件拖拽失败: {exc}")
                finally:
                    try:
                        Application.UseWaitCursor = False
                        form.UseWaitCursor = False
                        form.Cursor = Cursors.Default
                        Cursor.Current = Cursors.Default
                    except Exception:
                        pass

            if hasattr(form, "BeginInvoke"):
                form.BeginInvoke(Action(_do_drag))
            elif bool(getattr(form, "InvokeRequired", False)):
                form.Invoke(Action(_do_drag))
            else:
                _do_drag()
        except Exception as exc:
            return {"success": False, "message": f"原生文件拖拽初始化失败: {exc}"}
        return {"success": True, "started": True, "path": file_path}

    def reset_drag_cursor(self):
        if os.name != "nt":
            return {"success": True}
        win = self._get_window("")
        try:
            import webview.platforms.winforms as _wf
            from System import Action
            from System.Windows.Forms import Application, Cursor, Cursors

            form = _wf.BrowserView.instances.get(win.uid) if win is not None else None

            def _reset():
                try:
                    Application.UseWaitCursor = False
                    Cursor.Current = Cursors.Default
                    if form is not None:
                        form.UseWaitCursor = False
                        form.Cursor = Cursors.Default
                    try:
                        arrow = ctypes.windll.user32.LoadCursorW(None, 32512)
                        ctypes.windll.user32.SetCursor(arrow)
                    except Exception:
                        pass
                except Exception as exc:
                    print(f"[PicScannerDrag] 重置光标失败: {exc}")

            if form is not None and bool(getattr(form, "InvokeRequired", False)):
                form.BeginInvoke(Action(_reset))
            else:
                _reset()
        except Exception as exc:
            return {"success": False, "message": f"重置光标失败: {exc}"}
        return {"success": True}

    def get_photo_exif(self, photo_id):
        photo = scanner.read_photo_exif_now(int(photo_id))
        if not photo:
            return {"success": False, "message": "图片不存在"}
        payload = self._photo_payload(photo, full=True)
        self._apply_photo_mark(payload)
        return {"success": True, "photo": payload}

    def _apply_photo_mark(self, payload: dict) -> None:
        source_id = str(payload.get("source_id") or "")
        filename = str(payload.get("filename") or "")
        mark = storage.marks_for_items(source_id, "photo", [filename]).get(filename, {})
        payload["favorite"] = bool(mark.get("favorite"))
        payload["note"] = str(mark.get("note") or "")
        payload["category"] = str(mark.get("category") or "")

    def _photo_payload(self, row: dict, full: bool = False, include_thumbnail: bool = False) -> dict:
        path = str(row.get("path") or "")
        source = Path(path) if path else None
        source_exists = bool(source and source.exists() and source.is_file())
        browser_renderable = bool(row.get("renderable")) and source_exists and is_renderable_image(source)
        previewable = source_exists and is_previewable_image(source)
        is_raw_file = bool(row.get("is_raw")) or (source_exists and is_raw_image(source))
        is_jpg_file = bool(row.get("is_jpg"))
        has_raw_pair = bool(row.get("has_raw_pair"))
        format_label = "RAW+JPG" if is_jpg_file and has_raw_pair else str(row.get("format") or "")
        payload = {
            "id": row.get("id"),
            "source_id": row.get("source_id"),
            "path": path,
            "filename": row.get("filename"),
            "relative_path": row.get("relative_path"),
            "format": row.get("format"),
            "format_label": format_label,
            "is_raw": is_raw_file,
            "is_jpg": is_jpg_file,
            "has_raw_pair": has_raw_pair,
            "date_key": row.get("date_key"),
            "datetime_original": row.get("datetime_original"),
            "make": row.get("make"),
            "model": row.get("model"),
            "lens_model": row.get("lens_model"),
            "f_number": row.get("f_number"),
            "exposure_time": row.get("exposure_time"),
            "exposure_seconds": row.get("exposure_seconds"),
            "iso": row.get("iso"),
            "focal_length": row.get("focal_length"),
            "focal_length_35mm": row.get("focal_length_35mm"),
            "aperture_bucket": row.get("aperture_bucket"),
            "focal_bucket": row.get("focal_bucket"),
            "iso_bucket": row.get("iso_bucket"),
            "width": row.get("width"),
            "height": row.get("height"),
            "orientation": row.get("orientation"),
            "renderable": browser_renderable,
            "previewable": previewable,
            "exif_status": row.get("exif_status"),
            "exif_error": row.get("exif_error"),
            "size": row.get("size"),
            "mtime": row.get("mtime"),
            "size_text": _format_bytes(row.get("size")),
            "original_url": "",
            "preview_url": "",
            "preview_status": "none",
            "preview_error": "",
            "lightbox_url": "",
            "lightbox_status": "none",
            "lightbox_error": "",
            "favorite": bool(row.get("favorite")) if "favorite" in row else False,
            "note": str(row.get("note") or "") if "note" in row else "",
            "category": str(row.get("category") or "") if "category" in row else "",
        }
        stored_lightbox_url = self._stored_lightbox_cache_url(row)
        if stored_lightbox_url:
            payload["lightbox_url"] = stored_lightbox_url
            payload["lightbox_status"] = "cached"
        elif previewable and source is not None:
            lightbox = existing_lightbox_preview(path)
            if lightbox:
                payload["lightbox_url"] = _versioned_file_uri(lightbox)
                payload["lightbox_status"] = "cached"
        if browser_renderable and source is not None:
            payload["original_url"] = source.resolve().as_uri()
        if previewable and not include_thumbnail:
            thumb = existing_thumbnail(path)
            if thumb:
                payload["preview_url"] = _versioned_file_uri(thumb)
                payload["preview_status"] = "thumbnail"
        if include_thumbnail and previewable:
            try:
                payload["preview_url"] = _versioned_file_uri(ensure_thumbnail(path))
                payload["preview_status"] = "thumbnail"
            except ThumbnailError as exc:
                payload["preview_status"] = "failed"
                payload["preview_error"] = str(exc)
                print(f"[PicScannerThumb] {exc}")
        if full:
            payload.update(
                {
                    "software": row.get("software"),
                    "exposure_program": row.get("exposure_program"),
                    "metering_mode": row.get("metering_mode"),
                    "flash": row.get("flash"),
                    "white_balance": row.get("white_balance"),
                    "exposure_bias": row.get("exposure_bias"),
                }
            )
        return payload
