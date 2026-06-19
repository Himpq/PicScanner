from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from .config_store import DATA_DIR
from .exif_reader import aperture_bucket, focal_bucket, format_name, is_renderable_image, iso_bucket


DB_PATH = DATA_DIR / "picscanner.db"
RAW_EXTENSIONS = {
    ".arw", ".raw", ".dng", ".cr2", ".cr3", ".nef", ".nrw",
    ".raf", ".rw2", ".orf", ".srw", ".pef",
}
JPG_EXTENSIONS = {".jpg", ".jpeg"}
ACTIVE_SESSION_STATUSES = {"created", "discovering", "scanning", "stopping"}


def _norm_key(value: str) -> str:
    return str(value or "").replace("\\", "/").strip().lower()


def _file_keys(path: Path, relative: str) -> tuple[str, str, int, int]:
    suffix = path.suffix.lower()
    rel_parent = Path(relative).parent
    folder_key = "" if str(rel_parent) == "." else _norm_key(str(rel_parent))
    stem_key = path.stem.strip().lower()
    return folder_key, stem_key, int(suffix in RAW_EXTENSIONS), int(suffix in JPG_EXTENSIONS)


def now_text() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _date_from_timestamp(ts: float) -> str:
    return datetime.fromtimestamp(ts).strftime("%Y-%m-%d")


class Storage:
    def __init__(self, path: Path = DB_PATH):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self.init_schema()

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(str(self.path), timeout=30)
        try:
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_schema(self) -> None:
        with self._lock, self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS scan_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    root_path TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    finished_at TEXT,
                    total_files INTEGER NOT NULL DEFAULT 0,
                    processed_files INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'created',
                    message TEXT NOT NULL DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS photos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    root_path TEXT NOT NULL,
                    path TEXT NOT NULL UNIQUE,
                    relative_path TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    folder_key TEXT NOT NULL DEFAULT '',
                    stem_key TEXT NOT NULL DEFAULT '',
                    suffix TEXT NOT NULL,
                    is_raw INTEGER NOT NULL DEFAULT 0,
                    is_jpg INTEGER NOT NULL DEFAULT 0,
                    format TEXT NOT NULL,
                    size INTEGER NOT NULL DEFAULT 0,
                    mtime REAL NOT NULL DEFAULT 0,
                    file_date_key TEXT NOT NULL,
                    date_key TEXT NOT NULL,
                    datetime_original TEXT,
                    make TEXT,
                    model TEXT,
                    lens_model TEXT,
                    f_number REAL,
                    exposure_time TEXT,
                    exposure_seconds REAL,
                    iso INTEGER,
                    focal_length REAL,
                    focal_length_35mm REAL,
                    aperture_bucket TEXT NOT NULL DEFAULT '?',
                    focal_bucket TEXT NOT NULL DEFAULT '?',
                    iso_bucket TEXT NOT NULL DEFAULT '?',
                    width INTEGER,
                    height INTEGER,
                    orientation TEXT,
                    software TEXT,
                    exposure_program TEXT,
                    metering_mode TEXT,
                    flash TEXT,
                    white_balance TEXT,
                    exposure_bias TEXT,
                    renderable INTEGER NOT NULL DEFAULT 0,
                    exif_status TEXT NOT NULL DEFAULT 'pending',
                    exif_error TEXT NOT NULL DEFAULT '',
                    scanned_at TEXT,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_photos_date_id ON photos(date_key DESC, id DESC);
                CREATE INDEX IF NOT EXISTS idx_photos_session ON photos(session_id);
                CREATE INDEX IF NOT EXISTS idx_photos_exif_status ON photos(exif_status);
                CREATE INDEX IF NOT EXISTS idx_photos_lens ON photos(lens_model);
                CREATE INDEX IF NOT EXISTS idx_photos_model ON photos(model);
                """
            )
            self._migrate_pair_columns(conn)

    def _migrate_pair_columns(self, conn: sqlite3.Connection) -> None:
        rows = conn.execute("PRAGMA table_info(photos)").fetchall()
        columns = {str(row["name"]) for row in rows}
        migrations = {
            "folder_key": "ALTER TABLE photos ADD COLUMN folder_key TEXT NOT NULL DEFAULT ''",
            "stem_key": "ALTER TABLE photos ADD COLUMN stem_key TEXT NOT NULL DEFAULT ''",
            "is_raw": "ALTER TABLE photos ADD COLUMN is_raw INTEGER NOT NULL DEFAULT 0",
            "is_jpg": "ALTER TABLE photos ADD COLUMN is_jpg INTEGER NOT NULL DEFAULT 0",
        }
        for name, sql in migrations.items():
            if name not in columns:
                conn.execute(sql)

        rows = conn.execute(
            """
            SELECT id, path, relative_path, suffix
            FROM photos
            WHERE folder_key=''
               OR stem_key=''
               OR (LOWER(suffix) IN ('.arw','.raw','.dng','.cr2','.cr3','.nef','.nrw','.raf','.rw2','.orf','.srw','.pef') AND is_raw=0)
               OR (LOWER(suffix) IN ('.jpg','.jpeg') AND is_jpg=0)
            """
        ).fetchall()
        for row in rows:
            path = Path(str(row["path"] or ""))
            relative = str(row["relative_path"] or path.name)
            folder_key, stem_key, is_raw, is_jpg = _file_keys(path, relative)
            conn.execute(
                """
                UPDATE photos
                SET folder_key=?, stem_key=?, is_raw=?, is_jpg=?
                WHERE id=?
                """,
                (folder_key, stem_key, is_raw, is_jpg, int(row["id"])),
            )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_photos_pair ON photos(root_path, folder_key, stem_key, is_jpg, is_raw)"
        )

    def create_session(self, root_path: str) -> int:
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO scan_sessions(root_path, started_at, status, message)
                VALUES (?, ?, 'discovering', '正在发现图片文件')
                """,
                (str(root_path), now_text()),
            )
            return int(cur.lastrowid)

    def update_session(
        self,
        session_id: int,
        *,
        total_files: int | None = None,
        processed_files: int | None = None,
        status: str | None = None,
        message: str | None = None,
        finished: bool = False,
    ) -> None:
        fields = []
        args = []
        if total_files is not None:
            fields.append("total_files=?")
            args.append(int(total_files))
        if processed_files is not None:
            fields.append("processed_files=?")
            args.append(int(processed_files))
        if status is not None:
            fields.append("status=?")
            args.append(str(status))
        if message is not None:
            fields.append("message=?")
            args.append(str(message))
        if finished:
            fields.append("finished_at=?")
            args.append(now_text())
        if not fields:
            return
        args.append(int(session_id))
        with self._lock, self._connect() as conn:
            conn.execute(f"UPDATE scan_sessions SET {', '.join(fields)} WHERE id=?", args)

    def repair_unfinished_sessions(self) -> None:
        placeholders = ",".join("?" for _ in ACTIVE_SESSION_STATUSES)
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT id, total_files, processed_files, status
                FROM scan_sessions
                WHERE finished_at IS NULL
                  AND status IN ({placeholders})
                """,
                tuple(ACTIVE_SESSION_STATUSES),
            ).fetchall()
            for row in rows:
                total = int(row["total_files"] or 0)
                processed = int(row["processed_files"] or 0)
                if total > 0 and processed >= total:
                    status = "done"
                    message = f"扫描完成：{processed}/{total}"
                else:
                    status = "stopped"
                    message = f"扫描被中断：{processed}/{total}" if total else "扫描被中断"
                conn.execute(
                    """
                    UPDATE scan_sessions
                    SET status=?, message=?, finished_at=?
                    WHERE id=?
                    """,
                    (status, message, now_text(), int(row["id"])),
                )

    def upsert_pending(self, session_id: int, root_path: str, path: str) -> int:
        p = Path(path)
        root = Path(root_path)
        try:
            relative = str(p.resolve().relative_to(root.resolve()))
        except Exception:
            relative = p.name
        stat = p.stat()
        file_date = _date_from_timestamp(stat.st_mtime)
        folder_key, stem_key, is_raw, is_jpg = _file_keys(p, relative)
        payload = {
            "session_id": int(session_id),
            "root_path": str(root_path),
            "path": str(p),
            "relative_path": relative,
            "filename": p.name,
            "folder_key": folder_key,
            "stem_key": stem_key,
            "suffix": p.suffix.lower(),
            "is_raw": is_raw,
            "is_jpg": is_jpg,
            "format": format_name(p),
            "size": int(stat.st_size),
            "mtime": float(stat.st_mtime),
            "file_date_key": file_date,
            "date_key": file_date,
            "renderable": 1 if is_renderable_image(p) else 0,
            "updated_at": now_text(),
        }
        columns = list(payload.keys())
        placeholders = ",".join("?" for _ in columns)
        update = ",".join(f"{col}=excluded.{col}" for col in columns if col != "path")
        with self._lock, self._connect() as conn:
            conn.execute(
                f"""
                INSERT INTO photos({','.join(columns)})
                VALUES ({placeholders})
                ON CONFLICT(path) DO UPDATE SET {update}
                """,
                [payload[c] for c in columns],
            )
            row = conn.execute("SELECT id FROM photos WHERE path=?", (str(p),)).fetchone()
            return int(row["id"])

    def update_photo_metadata(self, path: str, meta: dict) -> None:
        date_key = meta.get("date_key")
        fields = {
            "format": meta.get("format"),
            "date_key": date_key,
            "datetime_original": meta.get("datetime_original"),
            "make": meta.get("make"),
            "model": meta.get("model"),
            "lens_model": meta.get("lens_model"),
            "f_number": meta.get("f_number"),
            "exposure_time": meta.get("exposure_time"),
            "exposure_seconds": meta.get("exposure_seconds"),
            "iso": meta.get("iso"),
            "focal_length": meta.get("focal_length"),
            "focal_length_35mm": meta.get("focal_length_35mm"),
            "aperture_bucket": meta.get("aperture_bucket") or aperture_bucket(meta.get("f_number")),
            "focal_bucket": meta.get("focal_bucket") or focal_bucket(meta.get("focal_length_35mm")),
            "iso_bucket": meta.get("iso_bucket") or iso_bucket(meta.get("iso")),
            "width": meta.get("width"),
            "height": meta.get("height"),
            "orientation": meta.get("orientation"),
            "software": meta.get("software"),
            "exposure_program": meta.get("exposure_program"),
            "metering_mode": meta.get("metering_mode"),
            "flash": meta.get("flash"),
            "white_balance": meta.get("white_balance"),
            "exposure_bias": meta.get("exposure_bias"),
            "renderable": int(meta.get("renderable") or 0),
            "exif_status": meta.get("exif_status") or "complete",
            "exif_error": meta.get("exif_error") or "",
            "scanned_at": now_text(),
            "updated_at": now_text(),
        }
        clean = {k: v for k, v in fields.items() if v is not None}
        if not clean:
            return
        assignments = ", ".join(f"{k}=?" for k in clean)
        args = list(clean.values()) + [str(path)]
        with self._lock, self._connect() as conn:
            conn.execute(f"UPDATE photos SET {assignments} WHERE path=?", args)

    def get_photo(self, photo_id: int) -> dict | None:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM photos WHERE id=?", (int(photo_id),)).fetchone()
            return dict(row) if row else None

    def photo_exists(self, path: str | Path) -> bool:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT 1 FROM photos WHERE path=? LIMIT 1", (str(Path(path)),)).fetchone()
            return row is not None

    @staticmethod
    def _display_filter(alias: str = "p") -> str:
        a = str(alias or "p")
        return (
            f"NOT ({a}.is_raw=1 AND EXISTS ("
            "SELECT 1 FROM photos AS jpg "
            f"WHERE jpg.root_path={a}.root_path "
            f"AND jpg.folder_key={a}.folder_key "
            f"AND jpg.stem_key={a}.stem_key "
            "AND jpg.is_jpg=1"
            "))"
        )

    def list_dates(self, *, before: str | None = None, limit: int = 10, root_path: str | None = None) -> list[dict]:
        args: list = []
        display_filter = self._display_filter("p")
        where = f"WHERE p.date_key IS NOT NULL AND p.date_key <> '' AND {display_filter}"
        if root_path:
            where += " AND p.root_path=?"
            args.append(str(root_path))
        if before:
            where += " AND p.date_key < ?"
            args.append(str(before))
        args.append(int(limit))
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT p.date_key, COUNT(*) AS count,
                       SUM(CASE WHEN p.exif_status='complete' THEN 1 ELSE 0 END) AS exif_count
                FROM photos AS p
                {where}
                GROUP BY p.date_key
                ORDER BY p.date_key DESC
                LIMIT ?
                """,
                args,
            ).fetchall()
            return [dict(r) for r in rows]

    def list_photos_for_date(
        self,
        date_key: str,
        *,
        offset: int = 0,
        limit: int = 60,
        root_path: str | None = None,
    ) -> list[dict]:
        display_filter = self._display_filter("p")
        args: list = [str(date_key)]
        root_filter = ""
        if root_path:
            root_filter = " AND p.root_path=?"
            args.append(str(root_path))
        args.extend([int(limit), int(offset)])
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT p.*
                FROM photos AS p
                WHERE p.date_key=?{root_filter} AND {display_filter}
                ORDER BY COALESCE(p.datetime_original, '') DESC, p.mtime DESC, p.id DESC
                LIMIT ? OFFSET ?
                """,
                args,
            ).fetchall()
            return [dict(r) for r in rows]

    def latest_session(self, root_path: str | None = None) -> dict | None:
        args: list = []
        where = ""
        if root_path:
            where = "WHERE root_path=?"
            args.append(str(root_path))
        with self._lock, self._connect() as conn:
            row = conn.execute(
                f"SELECT * FROM scan_sessions {where} ORDER BY id DESC LIMIT 1",
                args,
            ).fetchone()
            return dict(row) if row else None

    def count_photos(self, root_path: str | None = None) -> int:
        display_filter = self._display_filter("p")
        args: list = []
        root_filter = ""
        if root_path:
            root_filter = " AND p.root_path=?"
            args.append(str(root_path))
        with self._lock, self._connect() as conn:
            row = conn.execute(
                f"SELECT COUNT(*) AS c FROM photos AS p WHERE {display_filter}{root_filter}",
                args,
            ).fetchone()
            return int(row["c"] or 0)

    def count_indexed_photos(self, root_path: str | None = None) -> int:
        args: list = []
        where = ""
        if root_path:
            where = "WHERE root_path=?"
            args.append(str(root_path))
        with self._lock, self._connect() as conn:
            row = conn.execute(f"SELECT COUNT(*) AS c FROM photos {where}", args).fetchone()
            return int(row["c"] or 0)

    def count_exif_pending(self, root_path: str | None = None) -> int:
        args: list = []
        where = "WHERE exif_status='pending'"
        if root_path:
            where += " AND root_path=?"
            args.append(str(root_path))
        with self._lock, self._connect() as conn:
            row = conn.execute(f"SELECT COUNT(*) AS c FROM photos {where}", args).fetchone()
            return int(row["c"] or 0)

    def pending_exif_photos(self, root_path: str | None = None, *, limit: int = 25) -> list[dict]:
        args: list = []
        where = "WHERE exif_status='pending'"
        if root_path:
            where += " AND root_path=?"
            args.append(str(root_path))
        args.append(int(limit))
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT *
                FROM photos
                {where}
                ORDER BY mtime DESC, id DESC
                LIMIT ?
                """,
                args,
            ).fetchall()
            return [dict(r) for r in rows]

    def cover_photo(self, root_path: str) -> dict | None:
        display_filter = self._display_filter("p")
        with self._lock, self._connect() as conn:
            row = conn.execute(
                f"""
                SELECT p.*
                FROM photos AS p
                WHERE p.root_path=? AND p.renderable=1 AND {display_filter}
                ORDER BY COALESCE(p.datetime_original, '') DESC, p.mtime DESC, p.id DESC
                LIMIT 1
                """,
                (str(root_path),),
            ).fetchone()
            return dict(row) if row else None

    def statistics(self, root_path: str | None = None) -> dict:
        args: list = []
        where = ""
        if root_path:
            where = "WHERE root_path=?"
            args.append(str(root_path))
        with self._lock, self._connect() as conn:
            total = int(conn.execute(f"SELECT COUNT(*) AS c FROM photos {where}", args).fetchone()["c"] or 0)
            complete = int(
                conn.execute(
                    "SELECT COUNT(*) AS c FROM photos WHERE exif_status='complete'"
                    + (" AND root_path=?" if root_path else ""),
                    args,
                ).fetchone()["c"]
                or 0
            )
            failed = int(
                conn.execute(
                    "SELECT COUNT(*) AS c FROM photos WHERE exif_status='failed'"
                    + (" AND root_path=?" if root_path else ""),
                    args,
                ).fetchone()["c"]
                or 0
            )
            pending = max(0, total - complete - failed)

            def group(field: str, limit: int = 18) -> list[dict]:
                group_where = "WHERE root_path=?" if root_path else ""
                rows = conn.execute(
                    f"""
                    SELECT COALESCE(NULLIF({field}, ''), '?') AS name, COUNT(*) AS count
                    FROM photos
                    {group_where}
                    GROUP BY COALESCE(NULLIF({field}, ''), '?')
                    ORDER BY count DESC, name ASC
                    LIMIT ?
                    """,
                    ([str(root_path)] if root_path else []) + [int(limit)],
                ).fetchall()
                return [dict(r) for r in rows]

            time_where = "AND root_path=?" if root_path else ""
            time_row = conn.execute(
                f"""
                SELECT MIN(datetime_original) AS earliest, MAX(datetime_original) AS latest
                FROM photos
                WHERE datetime_original IS NOT NULL AND datetime_original <> '' {time_where}
                """,
                [str(root_path)] if root_path else [],
            ).fetchone()
            return {
                "total_files": total,
                "exif_complete": complete,
                "exif_failed": failed,
                "exif_pending": pending,
                "by_format": group("format"),
                "by_model": group("model"),
                "by_lens": group("lens_model"),
                "by_aperture": group("aperture_bucket"),
                "by_focal_bucket": group("focal_bucket"),
                "by_iso_bucket": group("iso_bucket"),
                "time_range": {
                    "earliest": time_row["earliest"],
                    "latest": time_row["latest"],
                },
            }


storage = Storage()
