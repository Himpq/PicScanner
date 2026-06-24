from __future__ import annotations

import threading
import time
import traceback
from pathlib import Path

from .exif_reader import read_metadata
from .storage import storage


IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
    ".dng",
    ".arw",
    ".raw",
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


class ScannerManager:
    def __init__(self):
        self._lock = threading.RLock()
        self._scan_thread: threading.Thread | None = None
        self._exif_thread: threading.Thread | None = None
        self._scan_stop = threading.Event()
        self._exif_stop = threading.Event()
        self._state = self._initial_state()

    def _initial_state(self) -> dict:
        return {
            "running": False,
            "status": "idle",
            "message": "等待选择来源",
            "session_id": None,
            "source_id": "",
            "root_path": "",
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

    def get_state(self) -> dict:
        with self._lock:
            state = dict(self._state)
            state["running"] = bool(state.get("scan_running") or state.get("exif_running"))
            if state.get("scan_running"):
                state["status"] = state.get("scan_status") or "discovering"
                state["message"] = state.get("scan_message") or ""
            elif state.get("exif_running"):
                state["status"] = state.get("exif_status") or "reading_exif"
                state["message"] = state.get("exif_message") or ""
            return state

    def _set_state(self, **kwargs) -> None:
        with self._lock:
            self._state.update(kwargs)
            self._state["running"] = bool(
                self._state.get("scan_running") or self._state.get("exif_running")
            )

    def _root_is_scanning(self, root_path: str, source_id: str | None = None) -> bool:
        with self._lock:
            current_source_id = str(self._state.get("source_id") or "")
            return bool(
                self._state.get("scan_running")
                and (
                    (source_id and current_source_id == str(source_id))
                    or str(self._state.get("root_path") or "").lower() == str(root_path).lower()
                )
            )

    def start_scan(self, root_path: str, source_id: str, limit: int | None = 10) -> dict:
        root = Path(root_path)
        if not root.exists() or not root.is_dir():
            return {"success": False, "message": f"目录不存在: {root_path}"}
        root_text = str(root.resolve())
        source_text = str(source_id or "")
        with self._lock:
            if self._state.get("scan_running"):
                return {
                    "success": False,
                    "message": "扫描任务正在执行",
                    "state": self.get_state(),
                }
            self._scan_stop.clear()
            session_id = storage.create_session(root_text, source_text)
            indexed = storage.count_indexed_photos(root_text, source_id=source_text)
            target = max(0, int(limit or 0))
            self._state.update(
                {
                    "root_path": root_text,
                    "source_id": source_text,
                    "session_id": session_id,
                    "scan_running": True,
                    "scan_status": "discovering",
                    "scan_message": "正在扫描图片文件",
                    "scan_session_id": session_id,
                    "scan_target_files": target,
                    "scan_processed_files": 0,
                    "scan_discovered_files": indexed,
                    "scan_complete": False,
                    "total_files": indexed,
                    "processed_files": indexed,
                    "discovered_files": indexed,
                }
            )
            self._scan_thread = threading.Thread(
                target=self._run_scan,
                args=(session_id, root, source_text, limit),
                daemon=True,
            )
            self._scan_thread.start()
            return {"success": True, "session_id": session_id, "state": self.get_state()}

    def scan_all(self, root_path: str, source_id: str) -> dict:
        return self.start_scan(root_path, source_id, limit=None)

    def stop_scan(self) -> dict:
        self._scan_stop.set()
        self._set_state(scan_status="stopping", scan_message="正在停止扫描")
        return {"success": True}

    def start_exif(self, root_path: str, source_id: str) -> dict:
        root = Path(root_path)
        if not root.exists() or not root.is_dir():
            return {"success": False, "message": f"目录不存在: {root_path}"}
        root_text = str(root.resolve())
        source_text = str(source_id or "")
        with self._lock:
            if self._state.get("exif_running"):
                return {
                    "success": False,
                    "message": "EXIF 读取任务正在执行",
                    "state": self.get_state(),
                }
            pending = storage.count_exif_pending(root_text, source_id=source_text)
            self._exif_stop.clear()
            self._state.update(
                {
                    "root_path": root_text,
                    "source_id": source_text,
                    "exif_running": True,
                    "exif_status": "reading_exif",
                    "exif_message": f"正在读取 EXIF：0/{pending}",
                    "exif_total_files": pending,
                    "exif_processed_files": 0,
                }
            )
            self._exif_thread = threading.Thread(
                target=self._run_exif,
                args=(root_text, source_text),
                daemon=True,
            )
            self._exif_thread.start()
            return {"success": True, "state": self.get_state()}

    def stop_exif(self) -> dict:
        self._exif_stop.set()
        self._set_state(exif_status="stopping", exif_message="正在停止 EXIF 读取")
        return {"success": True}

    def _iter_images(self, root: Path):
        for path in root.rglob("*"):
            if self._scan_stop.is_set():
                break
            try:
                if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
                    yield path
            except OSError:
                continue

    def _run_scan(self, session_id: int, root: Path, source_id: str, limit: int | None) -> None:
        root_text = str(root.resolve())
        target = int(limit or 0)
        added = 0
        indexed_at_start = storage.count_indexed_photos(root_text, source_id=source_id)
        exhausted = True
        try:
            self._set_state(scan_message="正在查找图片")
            for path in self._iter_images(root):
                if self._scan_stop.is_set():
                    exhausted = False
                    break
                if storage.photo_exists(source_id, root_text, path):
                    continue
                try:
                    storage.upsert_pending(session_id, source_id, root_text, str(path))
                except Exception:
                    traceback.print_exc()
                    continue
                added += 1
                discovered = indexed_at_start + added
                if added % 5 == 0 or added == 1:
                    self._set_state(
                        scan_processed_files=added,
                        scan_discovered_files=discovered,
                        total_files=discovered,
                        processed_files=discovered,
                        discovered_files=discovered,
                        scan_message=f"已扫描 {added} 张新图片",
                    )
                    storage.update_session(
                        session_id,
                        total_files=discovered,
                        processed_files=added,
                        status="discovering",
                        message=f"已扫描 {added} 张新图片",
                    )
                if target and added >= target:
                    exhausted = False
                    break

            discovered = indexed_at_start + added
            if self._scan_stop.is_set():
                self._set_state(
                    scan_running=False,
                    scan_status="stopped",
                    scan_message=f"扫描已停止：本次新增 {added} 张",
                    scan_processed_files=added,
                    scan_discovered_files=discovered,
                    total_files=discovered,
                    processed_files=discovered,
                    discovered_files=discovered,
                )
                storage.update_session(
                    session_id,
                    total_files=discovered,
                    processed_files=added,
                    status="stopped",
                    message=f"扫描已停止：本次新增 {added} 张",
                    finished=True,
                )
                return

            status = "done" if exhausted else "paused"
            message = "扫描完成" if exhausted else f"本次已扫描 {added} 张，继续滚动可接着扫描"
            self._set_state(
                scan_running=False,
                scan_status=status,
                scan_message=message,
                scan_processed_files=added,
                scan_discovered_files=discovered,
                scan_complete=exhausted,
                total_files=discovered,
                processed_files=discovered,
                discovered_files=discovered,
                status=status,
                message=message,
            )
            storage.update_session(
                session_id,
                total_files=discovered,
                processed_files=added,
                status=status,
                message=message,
                finished=True,
            )
        except Exception as exc:
            traceback.print_exc()
            self._set_state(
                scan_running=False,
                scan_status="failed",
                scan_message=str(exc),
                status="failed",
                message=str(exc),
            )
            storage.update_session(session_id, status="failed", message=str(exc), finished=True)

    def _run_exif(self, root_path: str, source_id: str) -> None:
        processed = 0
        try:
            while not self._exif_stop.is_set():
                rows = storage.pending_exif_photos(root_path, source_id=source_id, limit=20)
                if not rows:
                    if self._root_is_scanning(root_path, source_id):
                        self._set_state(
                            exif_processed_files=processed,
                            exif_total_files=processed,
                            exif_message=f"等待扫描发现新图片：{processed}/{processed}",
                        )
                        time.sleep(0.2)
                        continue
                    break
                for photo in rows:
                    if self._exif_stop.is_set():
                        break
                    meta = read_metadata(photo["path"])
                    storage.update_photo_metadata(
                        photo["path"],
                        meta,
                        photo_id=int(photo["id"]),
                        source_id=str(photo.get("source_id") or source_id),
                        relative_path=str(photo.get("relative_path") or ""),
                    )
                    processed += 1
                    pending = storage.count_exif_pending(root_path, source_id=source_id)
                    total = processed + pending
                    if processed % 3 == 0 or pending == 0:
                        self._set_state(
                            exif_processed_files=processed,
                            exif_total_files=total,
                            exif_message=f"正在读取 EXIF：{processed}/{total}",
                        )

            pending = storage.count_exif_pending(root_path, source_id=source_id)
            if self._exif_stop.is_set():
                self._set_state(
                    exif_running=False,
                    exif_status="stopped",
                    exif_processed_files=processed,
                    exif_total_files=processed + pending,
                    exif_message=f"EXIF 读取已停止：{processed}/{processed + pending}",
                )
                return
            self._set_state(
                exif_running=False,
                exif_status="done",
                exif_processed_files=processed,
                exif_total_files=processed,
                exif_message=f"EXIF 读取完成：{processed}/{processed}",
            )
        except Exception as exc:
            traceback.print_exc()
            self._set_state(
                exif_running=False,
                exif_status="failed",
                exif_message=str(exc),
            )

    def read_photo_exif_now(self, photo_id: int) -> dict | None:
        photo = storage.get_photo(photo_id)
        if not photo:
            return None
        if photo.get("exif_status") == "complete":
            return photo
        meta = read_metadata(photo["path"])
        storage.update_photo_metadata(photo["path"], meta, photo_id=int(photo["id"]))
        return storage.get_photo(photo_id)


scanner = ScannerManager()
