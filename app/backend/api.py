from __future__ import annotations

import ctypes
import os
import shutil
from pathlib import Path

import webview

from WebViewUI import WindowApi
from .config_store import config_store
from .exif_reader import is_renderable_image
from .scanner import scanner
from .storage import storage
from .thumbnailer import ThumbnailError, ensure_thumbnail, existing_thumbnail


ACTIVE_SCAN_STATUSES = {"discovering", "stopping"}


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

    def _resolve_source_path(self, root_path) -> str:
        return str(Path(str(root_path or "")).resolve())

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

    def _idle_state(self, root_path: str = "") -> dict:
        return {
            "running": False,
            "status": "idle",
            "message": "等待扫描",
            "session_id": None,
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

    def _source_summary(self, root_path: str) -> dict:
        session = storage.latest_session(root_path)
        visible_count = storage.count_photos(root_path)
        cover = storage.cover_photo(root_path) if visible_count else None
        cover_url = ""
        if cover:
            thumb = existing_thumbnail(cover["path"])
            if thumb:
                cover_url = thumb.resolve().as_uri()
        return {
            "has_cache": visible_count > 0,
            "visible_files": visible_count,
            "total_files": int(session.get("total_files") or visible_count) if session else visible_count,
            "session_status": session.get("status") if session else "",
            "session_message": session.get("message") if session else "",
            "finished_at": session.get("finished_at") if session else "",
            "cover_url": cover_url,
        }

    def _source_payload(self, item: dict) -> dict:
        payload = dict(item)
        path = payload.get("path")
        if path:
            payload["summary"] = self._source_summary(str(path))
        else:
            payload["summary"] = {}
        return payload

    def get_sources(self):
        remembered = []
        for folder in config_store.get("remembered_folders", []):
            p = Path(folder)
            remembered.append(
                self._source_payload(
                    {
                    "id": f"folder:{folder}",
                    "kind": "folder",
                    "path": str(p),
                    "title": p.name or str(p),
                    "subtitle": str(p),
                    "exists": p.exists() and p.is_dir(),
                    }
                )
            )
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
        config_store.set("last_source", str(p))
        result = scanner.start_scan(str(p), limit=int(limit or 10))
        return result

    def scan_all(self, root_path):
        p = Path(str(root_path or "")).resolve()
        if not p.exists() or not p.is_dir():
            return {"success": False, "message": f"目录不存在: {p}"}
        config_store.set("last_source", str(p))
        return scanner.scan_all(str(p))

    def stop_scan(self):
        return scanner.stop_scan()

    def start_exif(self, root_path):
        p = Path(str(root_path or "")).resolve()
        if not p.exists() or not p.is_dir():
            return {"success": False, "message": f"目录不存在: {p}"}
        return scanner.start_exif(str(p))

    def stop_exif(self):
        return scanner.stop_exif()

    def get_scan_state(self, root_path=None):
        requested_root = self._resolve_source_path(root_path) if root_path else ""
        runtime_state = scanner.get_state()
        if not runtime_state.get("running"):
            storage.repair_unfinished_sessions()
        session = storage.latest_session(requested_root or None)
        runtime_root = str(runtime_state.get("root_path") or "")
        runtime_matches = not requested_root or runtime_root.lower() == requested_root.lower()
        if runtime_matches and runtime_state.get("running"):
            state = runtime_state
        else:
            state = self._state_from_session(session) or self._idle_state(requested_root)
            pending = storage.count_exif_pending(requested_root or None)
            state["exif_total_files"] = pending
        return {
            "success": True,
            "state": state,
            "runtime_state": runtime_state,
            "session": session,
            "statistics": storage.statistics(requested_root or None),
            "cached_visible_files": storage.count_photos(requested_root or None),
        }

    def get_startup_state(self):
        return {
            "success": True,
            "sources": self.get_sources(),
            "scan": self.get_scan_state(),
        }

    def list_dates(self, before=None, limit=10, root_path=None):
        root = self._resolve_source_path(root_path) if root_path else None
        dates = storage.list_dates(before=before or None, limit=int(limit or 10), root_path=root)
        return {"success": True, "dates": dates}

    def list_photos(self, date_key, offset=0, limit=60, root_path=None):
        root = self._resolve_source_path(root_path) if root_path else None
        rows = storage.list_photos_for_date(
            str(date_key),
            offset=int(offset or 0),
            limit=int(limit or 60),
            root_path=root,
        )
        return {"success": True, "photos": [self._photo_payload(x) for x in rows]}

    def get_photo_preview(self, photo_id):
        photo = storage.get_photo(int(photo_id))
        if not photo:
            return {"success": False, "message": "图片不存在"}
        payload = self._photo_payload(photo, include_thumbnail=True)
        if not payload.get("preview_url"):
            return {
                "success": False,
                "message": payload.get("preview_error") or "无法生成预览",
                "photo": payload,
            }
        return {"success": True, "photo": payload}

    def get_photo_exif(self, photo_id):
        photo = scanner.read_photo_exif_now(int(photo_id))
        if not photo:
            return {"success": False, "message": "图片不存在"}
        return {"success": True, "photo": self._photo_payload(photo, full=True)}

    def _photo_payload(self, row: dict, full: bool = False, include_thumbnail: bool = False) -> dict:
        path = str(row.get("path") or "")
        payload = {
            "id": row.get("id"),
            "path": path,
            "filename": row.get("filename"),
            "relative_path": row.get("relative_path"),
            "format": row.get("format"),
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
            "renderable": bool(row.get("renderable")),
            "exif_status": row.get("exif_status"),
            "exif_error": row.get("exif_error"),
            "size": row.get("size"),
            "size_text": _format_bytes(row.get("size")),
            "original_url": "",
            "preview_url": "",
            "preview_status": "none",
            "preview_error": "",
        }
        if payload["renderable"] and path and Path(path).exists() and is_renderable_image(path):
            payload["original_url"] = Path(path).resolve().as_uri()
        if include_thumbnail and payload["original_url"]:
            try:
                payload["preview_url"] = ensure_thumbnail(path).resolve().as_uri()
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
