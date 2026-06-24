from __future__ import annotations

import ctypes
import hashlib
import json
import os
import secrets
from datetime import datetime
from pathlib import Path


MARKER_NAME = ".picscanner"


def now_text() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def path_source_id(root_path: str | Path) -> str:
    raw = str(Path(root_path).resolve()).replace("\\", "/").strip().lower()
    return "path_" + hashlib.sha1(raw.encode("utf-8", errors="strict")).hexdigest()[:24]


def new_source_id(root_path: str | Path) -> str:
    raw = f"{Path(root_path).resolve()}|{now_text()}|{secrets.token_hex(24)}"
    return "src_" + hashlib.sha256(raw.encode("utf-8", errors="strict")).hexdigest()[:32]


def marker_path(root_path: str | Path) -> Path:
    return Path(root_path).resolve() / MARKER_NAME


def read_marker(root_path: str | Path) -> dict | None:
    path = marker_path(root_path)
    if not path.exists() or not path.is_file():
        return None
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(data, dict):
        raise RuntimeError(f"来源标记格式错误: {path}")
    source_id = str(data.get("source_id") or "").strip()
    if not source_id:
        raise RuntimeError(f"来源标记缺少 source_id: {path}")
    return data


def _hide_windows_file(path: Path) -> None:
    if os.name != "nt":
        return
    try:
        ctypes.windll.kernel32.SetFileAttributesW(str(path), 0x02)
    except Exception:
        pass


def ensure_marker(root_path: str | Path, *, preferred_source_id: str | None = None) -> dict:
    root = Path(root_path).resolve()
    existing = read_marker(root)
    if existing:
        return existing

    source_id = str(preferred_source_id or "").strip() or new_source_id(root)
    payload = {
        "app": "PicScanner",
        "version": 1,
        "source_id": source_id,
        "created_at": now_text(),
    }
    path = marker_path(root)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    _hide_windows_file(path)
    return payload


def windows_drive_type(root_path: str | Path) -> int | None:
    if os.name != "nt":
        return None
    drive = Path(root_path).resolve().anchor
    if not drive:
        return None
    try:
        return int(ctypes.windll.kernel32.GetDriveTypeW(ctypes.c_wchar_p(drive)))
    except Exception:
        return None


def is_removable_source(root_path: str | Path) -> bool:
    return windows_drive_type(root_path) == 2
