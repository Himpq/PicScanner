from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from .config_store import DATA_DIR
from .exif_reader import aperture_bucket, focal_bucket, format_name, is_renderable_image, iso_bucket
from .source_identity import path_source_id


DB_PATH = DATA_DIR / "picscanner.db"
RAW_EXTENSIONS = {
    ".arw", ".raw", ".dng", ".cr2", ".cr3", ".nef", ".nrw",
    ".raf", ".rw2", ".orf", ".srw", ".pef",
}
JPG_EXTENSIONS = {".jpg", ".jpeg"}
ACTIVE_SESSION_STATUSES = {"created", "discovering", "scanning", "stopping"}
PHOTO_COLUMNS = [
    "id",
    "session_id",
    "source_id",
    "root_path",
    "path",
    "relative_path",
    "filename",
    "folder_key",
    "stem_key",
    "suffix",
    "is_raw",
    "is_jpg",
    "format",
    "size",
    "mtime",
    "lightbox_cache_path",
    "lightbox_cache_version",
    "lightbox_cache_size",
    "lightbox_cache_mtime",
    "file_date_key",
    "date_key",
    "datetime_original",
    "make",
    "model",
    "lens_model",
    "f_number",
    "exposure_time",
    "exposure_seconds",
    "iso",
    "focal_length",
    "focal_length_35mm",
    "aperture_bucket",
    "focal_bucket",
    "iso_bucket",
    "width",
    "height",
    "orientation",
    "software",
    "exposure_program",
    "metering_mode",
    "flash",
    "white_balance",
    "exposure_bias",
    "renderable",
    "exif_status",
    "exif_error",
    "scanned_at",
    "updated_at",
]


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
                    source_id TEXT NOT NULL DEFAULT '',
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
                    source_id TEXT NOT NULL DEFAULT '',
                    root_path TEXT NOT NULL,
                    path TEXT NOT NULL,
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
                    lightbox_cache_path TEXT NOT NULL DEFAULT '',
                    lightbox_cache_version TEXT NOT NULL DEFAULT '',
                    lightbox_cache_size INTEGER NOT NULL DEFAULT 0,
                    lightbox_cache_mtime REAL NOT NULL DEFAULT 0,
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
                    updated_at TEXT NOT NULL,
                    UNIQUE(source_id, relative_path)
                );

                CREATE TABLE IF NOT EXISTS source_state (
                    source_id TEXT PRIMARY KEY,
                    root_path TEXT NOT NULL DEFAULT '',
                    marker_path TEXT NOT NULL DEFAULT '',
                    cover_photo_path TEXT NOT NULL DEFAULT '',
                    cover_thumb_path TEXT NOT NULL DEFAULT '',
                    last_viewed_date TEXT NOT NULL DEFAULT '',
                    last_viewed_offset INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS source_marks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_id TEXT NOT NULL,
                    item_type TEXT NOT NULL,
                    item_key TEXT NOT NULL,
                    favorite INTEGER NOT NULL DEFAULT 0,
                    note TEXT NOT NULL DEFAULT '',
                    category TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(source_id, item_type, item_key)
                );

                CREATE TABLE IF NOT EXISTS source_categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(source_id, name)
                );

                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS source_category_state (
                    source_id TEXT NOT NULL,
                    category_name TEXT NOT NULL,
                    last_viewed_date TEXT NOT NULL DEFAULT '',
                    last_viewed_offset INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY(source_id, category_name)
                );

                CREATE INDEX IF NOT EXISTS idx_photos_date_id ON photos(date_key DESC, id DESC);
                CREATE INDEX IF NOT EXISTS idx_photos_session ON photos(session_id);
                CREATE INDEX IF NOT EXISTS idx_photos_exif_status ON photos(exif_status);
                CREATE INDEX IF NOT EXISTS idx_photos_lens ON photos(lens_model);
                CREATE INDEX IF NOT EXISTS idx_photos_model ON photos(model);
                """
            )
            self._migrate_source_columns(conn)
            self._ensure_photos_identity_schema(conn)
            self._migrate_pair_columns(conn)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_source ON scan_sessions(source_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_photos_source_date_id ON photos(source_id, date_key DESC, id DESC)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_photos_date_id ON photos(date_key DESC, id DESC)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_photos_source_path ON photos(source_id, path)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_photos_session ON photos(session_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_photos_exif_status ON photos(exif_status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_photos_lens ON photos(lens_model)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_photos_model ON photos(model)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_source_marks_source_type ON source_marks(source_id, item_type)")
            if "category" not in self._table_columns(conn, "source_marks"):
                conn.execute("ALTER TABLE source_marks ADD COLUMN category TEXT NOT NULL DEFAULT ''")
            if "cover_photo_path" not in self._table_columns(conn, "source_state"):
                conn.execute("ALTER TABLE source_state ADD COLUMN cover_photo_path TEXT NOT NULL DEFAULT ''")
            if "cover_thumb_path" not in self._table_columns(conn, "source_state"):
                conn.execute("ALTER TABLE source_state ADD COLUMN cover_thumb_path TEXT NOT NULL DEFAULT ''")
            if "last_viewed_offset" not in self._table_columns(conn, "source_state"):
                conn.execute("ALTER TABLE source_state ADD COLUMN last_viewed_offset INTEGER NOT NULL DEFAULT 0")
            if "last_viewed_offset" not in self._table_columns(conn, "source_category_state"):
                conn.execute("ALTER TABLE source_category_state ADD COLUMN last_viewed_offset INTEGER NOT NULL DEFAULT 0")
            photo_columns = self._table_columns(conn, "photos")
            if "lightbox_cache_path" not in photo_columns:
                conn.execute("ALTER TABLE photos ADD COLUMN lightbox_cache_path TEXT NOT NULL DEFAULT ''")
            if "lightbox_cache_version" not in photo_columns:
                conn.execute("ALTER TABLE photos ADD COLUMN lightbox_cache_version TEXT NOT NULL DEFAULT ''")
            if "lightbox_cache_size" not in photo_columns:
                conn.execute("ALTER TABLE photos ADD COLUMN lightbox_cache_size INTEGER NOT NULL DEFAULT 0")
            if "lightbox_cache_mtime" not in photo_columns:
                conn.execute("ALTER TABLE photos ADD COLUMN lightbox_cache_mtime REAL NOT NULL DEFAULT 0")
            self._migrate_global_categories(conn)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_source_marks_category ON source_marks(source_id, item_type, category)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_source_categories_source ON source_categories(source_id)")

    def _table_columns(self, conn: sqlite3.Connection, table: str) -> set[str]:
        return {str(row["name"]) for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}

    def _migrate_global_categories(self, conn: sqlite3.Connection) -> None:
        now = now_text()
        conn.execute(
            """
            INSERT OR IGNORE INTO categories(name, created_at, updated_at)
            SELECT name, ?, ?
            FROM (
                SELECT DISTINCT TRIM(name) AS name
                FROM source_categories
                WHERE name IS NOT NULL AND TRIM(name) <> ''
            )
            """,
            (now, now),
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO categories(name, created_at, updated_at)
            SELECT name, ?, ?
            FROM (
                SELECT DISTINCT TRIM(category) AS name
                FROM source_marks
                WHERE category IS NOT NULL AND TRIM(category) <> ''
            )
            """,
            (now, now),
        )

    def _migrate_source_columns(self, conn: sqlite3.Connection) -> None:
        if "source_id" not in self._table_columns(conn, "scan_sessions"):
            conn.execute("ALTER TABLE scan_sessions ADD COLUMN source_id TEXT NOT NULL DEFAULT ''")
        if "source_id" not in self._table_columns(conn, "photos"):
            conn.execute("ALTER TABLE photos ADD COLUMN source_id TEXT NOT NULL DEFAULT ''")

        session_rows = conn.execute(
            "SELECT id, root_path FROM scan_sessions WHERE source_id IS NULL OR source_id=''"
        ).fetchall()
        for row in session_rows:
            source_id = path_source_id(str(row["root_path"] or ""))
            conn.execute("UPDATE scan_sessions SET source_id=? WHERE id=?", (source_id, int(row["id"])))

        photo_rows = conn.execute(
            "SELECT id, root_path FROM photos WHERE source_id IS NULL OR source_id=''"
        ).fetchall()
        for row in photo_rows:
            source_id = path_source_id(str(row["root_path"] or ""))
            conn.execute("UPDATE photos SET source_id=? WHERE id=?", (source_id, int(row["id"])))

        rows = conn.execute(
            """
            SELECT source_id, root_path FROM photos WHERE source_id <> ''
            UNION
            SELECT source_id, root_path FROM scan_sessions WHERE source_id <> ''
            """
        ).fetchall()
        for row in rows:
            self.upsert_source(str(row["source_id"]), str(row["root_path"] or ""), conn=conn)

    def _photos_needs_identity_rebuild(self, conn: sqlite3.Connection) -> bool:
        columns = self._table_columns(conn, "photos")
        if "source_id" not in columns:
            return True
        has_source_relative_unique = False
        for idx in conn.execute("PRAGMA index_list(photos)").fetchall():
            if not int(idx["unique"] or 0):
                continue
            idx_name = str(idx["name"])
            idx_cols = [str(row["name"]) for row in conn.execute(f"PRAGMA index_info({idx_name})").fetchall()]
            if idx_cols == ["path"]:
                return True
            if idx_cols == ["source_id", "relative_path"]:
                has_source_relative_unique = True
        return not has_source_relative_unique

    def _create_photos_table(self, conn: sqlite3.Connection, table: str) -> None:
        conn.execute(
            f"""
            CREATE TABLE {table} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                source_id TEXT NOT NULL DEFAULT '',
                root_path TEXT NOT NULL,
                path TEXT NOT NULL,
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
                lightbox_cache_path TEXT NOT NULL DEFAULT '',
                lightbox_cache_version TEXT NOT NULL DEFAULT '',
                lightbox_cache_size INTEGER NOT NULL DEFAULT 0,
                lightbox_cache_mtime REAL NOT NULL DEFAULT 0,
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
                updated_at TEXT NOT NULL,
                UNIQUE(source_id, relative_path)
            )
            """
        )

    def _ensure_photos_identity_schema(self, conn: sqlite3.Connection) -> None:
        if not self._photos_needs_identity_rebuild(conn):
            return
        old_table = "photos_before_source_id_migration"
        conn.execute(f"DROP TABLE IF EXISTS {old_table}")
        conn.execute(f"ALTER TABLE photos RENAME TO {old_table}")
        self._create_photos_table(conn, "photos")
        old_columns = self._table_columns(conn, old_table)
        rows = conn.execute(f"SELECT * FROM {old_table} ORDER BY id").fetchall()
        insert_columns = ",".join(PHOTO_COLUMNS)
        placeholders = ",".join("?" for _ in PHOTO_COLUMNS)
        for row in rows:
            data = {col: row[col] for col in old_columns}
            root_path = str(data.get("root_path") or "")
            path = Path(str(data.get("path") or data.get("filename") or ""))
            relative = str(data.get("relative_path") or path.name)
            folder_key, stem_key, is_raw, is_jpg = _file_keys(path, relative)
            source_id = str(data.get("source_id") or "").strip() or path_source_id(root_path)
            data.update(
                {
                    "source_id": source_id,
                    "relative_path": relative,
                    "filename": str(data.get("filename") or path.name),
                    "folder_key": str(data.get("folder_key") or folder_key),
                    "stem_key": str(data.get("stem_key") or stem_key),
                    "is_raw": int(data.get("is_raw") or is_raw),
                    "is_jpg": int(data.get("is_jpg") or is_jpg),
                    "lightbox_cache_path": str(data.get("lightbox_cache_path") or ""),
                    "lightbox_cache_version": str(data.get("lightbox_cache_version") or ""),
                    "lightbox_cache_size": int(data.get("lightbox_cache_size") or 0),
                    "lightbox_cache_mtime": float(data.get("lightbox_cache_mtime") or 0),
                    "updated_at": str(data.get("updated_at") or now_text()),
                }
            )
            values = [data.get(col) for col in PHOTO_COLUMNS]
            conn.execute(
                f"INSERT OR IGNORE INTO photos({insert_columns}) VALUES ({placeholders})",
                values,
            )
        conn.execute(f"DROP TABLE {old_table}")

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
            "CREATE INDEX IF NOT EXISTS idx_photos_pair ON photos(source_id, folder_key, stem_key, is_jpg, is_raw)"
        )

    def upsert_source(
        self,
        source_id: str,
        root_path: str,
        *,
        marker_path: str = "",
        conn: sqlite3.Connection | None = None,
    ) -> None:
        source_id = str(source_id or "").strip()
        if not source_id:
            return
        now = now_text()
        args = (source_id, str(root_path or ""), str(marker_path or ""), now, now)
        sql = """
            INSERT INTO source_state(source_id, root_path, marker_path, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(source_id) DO UPDATE SET
                root_path=excluded.root_path,
                marker_path=CASE WHEN excluded.marker_path <> '' THEN excluded.marker_path ELSE source_state.marker_path END,
                updated_at=excluded.updated_at
        """
        if conn is not None:
            conn.execute(sql, args)
            return
        with self._lock, self._connect() as conn2:
            conn2.execute(sql, args)

    def set_source_cover(self, source_id: str, cover_photo_path: str, cover_thumb_path: str) -> None:
        source_id = str(source_id or "").strip()
        cover_photo_path = str(cover_photo_path or "")
        cover_thumb_path = str(cover_thumb_path or "")
        if not source_id or not cover_thumb_path:
            return
        now = now_text()
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                UPDATE source_state
                SET cover_photo_path=?, cover_thumb_path=?, updated_at=?
                WHERE source_id=?
                  AND (cover_photo_path<>? OR cover_thumb_path<>?)
                """,
                (cover_photo_path, cover_thumb_path, now, source_id, cover_photo_path, cover_thumb_path),
            )

    def source_state(self, source_id: str) -> dict:
        if not source_id:
            return {}
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM source_state WHERE source_id=?",
                (str(source_id),),
            ).fetchone()
            state = dict(row) if row else {}
            state["category_last_viewed_dates"] = self._category_viewed_dates(conn, str(source_id))
            return state

    def _category_viewed_dates(self, conn: sqlite3.Connection, source_id: str) -> dict[str, str]:
        rows = conn.execute(
            """
            SELECT category_name, last_viewed_date, last_viewed_offset
            FROM source_category_state
            WHERE source_id=?
            """,
            (str(source_id or ""),),
        ).fetchall()
        return {
            str(row["category_name"] or ""): {
                "date": str(row["last_viewed_date"] or ""),
                "offset": int(row["last_viewed_offset"] or 0),
            }
            for row in rows
            if str(row["last_viewed_date"] or "")
        }

    def list_storage_sources(self) -> list[dict]:
        display_filter = self._display_filter("p")
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT s.source_id,
                       s.root_path,
                       s.marker_path,
                       s.cover_photo_path,
                       s.cover_thumb_path,
                       s.last_viewed_date,
                       s.created_at,
                       s.updated_at,
                       COALESCE(reg.registered_count, 0) AS registered_count,
                       COALESCE(vis.visible_count, 0) AS visible_count,
                       COALESCE(sess.total_files, 0) AS session_total_files,
                       COALESCE(sess.processed_files, 0) AS session_processed_files,
                       COALESCE(sess.status, '') AS session_status,
                       (
                           SELECT p.path
                           FROM photos AS p
                            WHERE p.source_id=s.source_id
                              AND (p.renderable=1 OR p.is_raw=1)
                             AND {display_filter}
                           ORDER BY COALESCE(p.datetime_original, '') DESC, p.mtime DESC, p.id DESC
                           LIMIT 1
                       ) AS cover_path
                FROM source_state AS s
                LEFT JOIN (
                    SELECT source_id, COUNT(*) AS registered_count
                    FROM photos
                    GROUP BY source_id
                ) AS reg ON reg.source_id=s.source_id
                LEFT JOIN (
                    SELECT p.source_id, COUNT(*) AS visible_count
                    FROM photos AS p
                    WHERE {display_filter}
                    GROUP BY p.source_id
                ) AS vis ON vis.source_id=s.source_id
                LEFT JOIN scan_sessions AS sess
                  ON sess.id=(
                      SELECT id
                      FROM scan_sessions
                      WHERE source_id=s.source_id
                      ORDER BY id DESC
                      LIMIT 1
                  )
                WHERE s.source_id <> ''
                  AND (reg.registered_count IS NOT NULL OR sess.id IS NOT NULL)
                ORDER BY s.updated_at DESC, s.created_at DESC
                """
            ).fetchall()
            return [dict(row) for row in rows]

    def find_source_id_for_root(self, root_path: str) -> str:
        root = str(root_path or "")
        if not root:
            return ""
        with self._lock, self._connect() as conn:
            row = conn.execute(
                """
                SELECT source_id
                FROM source_state
                WHERE root_path=?
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (root,),
            ).fetchone()
            return str(row["source_id"]) if row else ""

    def set_last_viewed_date(self, source_id: str, date_key: str, offset: int | float = 0) -> None:
        source_id = str(source_id or "").strip()
        date_key = str(date_key or "").strip()
        if not source_id or not date_key:
            return
        clean_offset = max(0, int(float(offset or 0)))
        now = now_text()
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO source_state(source_id, last_viewed_date, last_viewed_offset, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(source_id) DO UPDATE SET
                    last_viewed_date=excluded.last_viewed_date,
                    last_viewed_offset=excluded.last_viewed_offset,
                    updated_at=excluded.updated_at
                """,
                (source_id, date_key, clean_offset, now, now),
            )

    def set_category_last_viewed_date(self, source_id: str, category_name: str, date_key: str, offset: int | float = 0) -> None:
        source_id = str(source_id or "").strip()
        category_name = str(category_name or "").strip()
        date_key = str(date_key or "").strip()
        if not source_id or not date_key:
            return
        clean_offset = max(0, int(float(offset or 0)))
        now = now_text()
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO source_category_state(source_id, category_name, last_viewed_date, last_viewed_offset, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_id, category_name) DO UPDATE SET
                    last_viewed_date=excluded.last_viewed_date,
                    last_viewed_offset=excluded.last_viewed_offset,
                    updated_at=excluded.updated_at
                """,
                (source_id, category_name, date_key, clean_offset, now, now),
            )

    def create_session(self, root_path: str, source_id: str) -> int:
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO scan_sessions(source_id, root_path, started_at, status, message)
                VALUES (?, ?, ?, 'discovering', '正在发现图片文件')
                """,
                (str(source_id or ""), str(root_path), now_text()),
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

    def upsert_pending(self, session_id: int, source_id: str, root_path: str, path: str) -> int:
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
            "source_id": str(source_id or ""),
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
        update_parts = [f"{col}=excluded.{col}" for col in columns if col not in {"source_id", "relative_path"}]
        update_parts.extend(
            [
                "lightbox_cache_path=CASE WHEN photos.size=excluded.size AND photos.mtime=excluded.mtime THEN photos.lightbox_cache_path ELSE '' END",
                "lightbox_cache_version=CASE WHEN photos.size=excluded.size AND photos.mtime=excluded.mtime THEN photos.lightbox_cache_version ELSE '' END",
                "lightbox_cache_size=CASE WHEN photos.size=excluded.size AND photos.mtime=excluded.mtime THEN photos.lightbox_cache_size ELSE 0 END",
                "lightbox_cache_mtime=CASE WHEN photos.size=excluded.size AND photos.mtime=excluded.mtime THEN photos.lightbox_cache_mtime ELSE 0 END",
            ]
        )
        update = ",".join(update_parts)
        with self._lock, self._connect() as conn:
            conn.execute(
                f"""
                INSERT INTO photos({','.join(columns)})
                VALUES ({placeholders})
                ON CONFLICT(source_id, relative_path) DO UPDATE SET {update}
                """,
                [payload[c] for c in columns],
            )
            row = conn.execute(
                "SELECT id FROM photos WHERE source_id=? AND relative_path=?",
                (str(source_id or ""), relative),
            ).fetchone()
            return int(row["id"])

    def set_lightbox_cache(self, photo_id: int, cache_path: str, cache_version: str, source_size: int | float, source_mtime: int | float) -> None:
        clean_path = str(cache_path or "")
        clean_version = str(cache_version or "")
        if not int(photo_id or 0) or not clean_path or not clean_version:
            return
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                UPDATE photos
                SET lightbox_cache_path=?,
                    lightbox_cache_version=?,
                    lightbox_cache_size=?,
                    lightbox_cache_mtime=?,
                    updated_at=?
                WHERE id=?
                """,
                (
                    clean_path,
                    clean_version,
                    int(source_size or 0),
                    float(source_mtime or 0),
                    now_text(),
                    int(photo_id),
                ),
            )

    def update_photo_metadata(
        self,
        path: str,
        meta: dict,
        *,
        photo_id: int | None = None,
        source_id: str | None = None,
        relative_path: str | None = None,
    ) -> None:
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
        args = list(clean.values())
        if photo_id is not None:
            where = "id=?"
            args.append(int(photo_id))
        elif source_id and relative_path:
            where = "source_id=? AND relative_path=?"
            args.extend([str(source_id), str(relative_path)])
        else:
            where = "path=?"
            args.append(str(path))
        with self._lock, self._connect() as conn:
            conn.execute(f"UPDATE photos SET {assignments} WHERE {where}", args)

    def get_photo(self, photo_id: int) -> dict | None:
        with self._lock, self._connect() as conn:
            row = conn.execute(
                f"""
                SELECT p.*, {self._raw_pair_sql("p")}
                FROM photos AS p
                WHERE p.id=?
                """,
                (int(photo_id),),
            ).fetchone()
            return dict(row) if row else None

    def photo_exists(self, source_id: str, root_path: str, path: str | Path) -> bool:
        p = Path(path)
        root = Path(root_path)
        try:
            relative = str(p.resolve().relative_to(root.resolve()))
        except Exception:
            relative = p.name
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM photos WHERE source_id=? AND relative_path=? LIMIT 1",
                (str(source_id or ""), relative),
            ).fetchone()
            return row is not None

    @staticmethod
    def _display_filter(alias: str = "p") -> str:
        a = str(alias or "p")
        return (
            f"NOT ({a}.is_raw=1 AND EXISTS ("
            "SELECT 1 FROM photos AS jpg "
            f"WHERE jpg.source_id={a}.source_id "
            f"AND jpg.folder_key={a}.folder_key "
            f"AND jpg.stem_key={a}.stem_key "
            "AND jpg.is_jpg=1"
            "))"
        )

    @staticmethod
    def _raw_pair_sql(alias: str = "p") -> str:
        a = str(alias or "p")
        return (
            f"({a}.is_jpg=1 AND EXISTS ("
            "SELECT 1 FROM photos AS raw_pair "
            f"WHERE raw_pair.source_id={a}.source_id "
            f"AND raw_pair.folder_key={a}.folder_key "
            f"AND raw_pair.stem_key={a}.stem_key "
            "AND raw_pair.is_raw=1"
            ")) AS has_raw_pair"
        )

    @staticmethod
    def _source_where(source_id: str | None = None, root_path: str | None = None, alias: str = "p") -> tuple[str, list]:
        a = f"{alias}." if alias else ""
        if source_id:
            return f" AND {a}source_id=?", [str(source_id)]
        if root_path:
            return f" AND {a}root_path=?", [str(root_path)]
        return "", []

    @staticmethod
    def _photo_order_sql(sort_key: str) -> str:
        orders = {
            "datetime_desc": "COALESCE(p.datetime_original, '') DESC, p.mtime DESC, p.id DESC",
            "datetime_asc": "COALESCE(p.datetime_original, '') ASC, p.mtime ASC, p.id ASC",
            "filename_asc": "LOWER(COALESCE(p.filename, '')) ASC, p.id ASC",
            "filename_desc": "LOWER(COALESCE(p.filename, '')) DESC, p.id DESC",
            "size_desc": "p.size DESC, p.id DESC",
            "size_asc": "p.size ASC, p.id ASC",
        }
        key = str(sort_key or "datetime_desc")
        if key not in orders:
            raise ValueError(f"未知排序方式: {key}")
        return orders[key]

    @staticmethod
    def _photo_filter_sql(filters: dict | None, alias: str = "p") -> tuple[str, list]:
        if not isinstance(filters, dict):
            return "", []
        a = f"{alias}." if alias else ""
        sql = ""
        args: list = []
        if filters.get("favorite"):
            sql += (
                " AND EXISTS ("
                "SELECT 1 FROM source_marks AS fm "
                f"WHERE fm.source_id={a}source_id "
                "AND fm.item_type='photo' "
                f"AND fm.item_key={a}filename "
                "AND fm.favorite=1)"
            )
        if "category" in filters:
            category = str(filters.get("category") or "").strip()
            if category:
                sql += (
                    " AND EXISTS ("
                    "SELECT 1 FROM source_marks AS cm "
                    f"WHERE cm.source_id={a}source_id "
                    "AND cm.item_type='photo' "
                    f"AND cm.item_key={a}filename "
                    "AND cm.category=?)"
                )
                args.append(category)
            else:
                sql += (
                    " AND NOT EXISTS ("
                    "SELECT 1 FROM source_marks AS cm "
                    f"WHERE cm.source_id={a}source_id "
                    "AND cm.item_type='photo' "
                    f"AND cm.item_key={a}filename "
                    "AND cm.category <> '')"
                )
        lens = str(filters.get("lens") or "").strip()
        if lens:
            sql += f" AND COALESCE(NULLIF({a}lens_model, ''), '?')=?"
            args.append(lens)
        focal = str(filters.get("focal_bucket") or "").strip()
        if focal:
            sql += f" AND COALESCE(NULLIF({a}focal_bucket, ''), '?')=?"
            args.append(focal)
        start_date = str(filters.get("start_date") or "").strip()
        if start_date:
            sql += f" AND {a}date_key >= ?"
            args.append(start_date)
        end_date = str(filters.get("end_date") or "").strip()
        if end_date:
            sql += f" AND {a}date_key <= ?"
            args.append(end_date)
        return sql, args

    @staticmethod
    def _like_pattern(text: str) -> str:
        value = str(text or "").strip()
        value = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        return f"%{value}%"

    @staticmethod
    def _search_fields(scope: str) -> list[tuple[str, str]]:
        filename = [
            ("文件名", "p.filename"),
            ("路径", "p.relative_path"),
            ("格式", "p.format"),
            ("格式", "p.suffix"),
        ]
        metadata = [
            ("日期", "p.date_key"),
            ("拍摄时间", "p.datetime_original"),
            ("机身", "p.make"),
            ("机身", "p.model"),
            ("镜头", "p.lens_model"),
            ("焦段", "p.focal_bucket"),
            ("光圈", "p.aperture_bucket"),
            ("ISO", "p.iso_bucket"),
            ("快门", "p.exposure_time"),
            ("软件", "p.software"),
            ("程序", "p.exposure_program"),
            ("测光", "p.metering_mode"),
            ("闪光灯", "p.flash"),
            ("白平衡", "p.white_balance"),
            ("光圈", "CAST(p.f_number AS TEXT)"),
            ("ISO", "CAST(p.iso AS TEXT)"),
            ("焦距", "CAST(p.focal_length AS TEXT)"),
            ("等效焦距", "CAST(p.focal_length_35mm AS TEXT)"),
        ]
        note = [
            ("备注", "m.note"),
            ("分类", "m.category"),
        ]
        clean = str(scope or "all").strip().lower()
        if clean == "filename":
            return filename
        if clean == "metadata":
            return metadata
        if clean == "note":
            return note
        return filename + metadata + note

    @classmethod
    def _search_match_info(cls, row: dict, terms: list[str], scope: str) -> dict:
        fields = [
            ("filename", "文件名", row.get("filename")),
            ("relative_path", "路径", row.get("relative_path")),
            ("format", "格式", row.get("format")),
            ("suffix", "格式", row.get("suffix")),
            ("date_key", "日期", row.get("date_key")),
            ("datetime_original", "拍摄时间", row.get("datetime_original")),
            ("make", "机身", row.get("make")),
            ("model", "机身", row.get("model")),
            ("lens_model", "镜头", row.get("lens_model")),
            ("focal_bucket", "焦段", row.get("focal_bucket")),
            ("aperture_bucket", "光圈", row.get("aperture_bucket")),
            ("iso_bucket", "ISO", row.get("iso_bucket")),
            ("exposure_time", "快门", row.get("exposure_time")),
            ("software", "软件", row.get("software")),
            ("exposure_program", "程序", row.get("exposure_program")),
            ("metering_mode", "测光", row.get("metering_mode")),
            ("flash", "闪光灯", row.get("flash")),
            ("white_balance", "白平衡", row.get("white_balance")),
            ("f_number", "光圈", row.get("f_number")),
            ("iso", "ISO", row.get("iso")),
            ("focal_length", "焦距", row.get("focal_length")),
            ("focal_length_35mm", "等效焦距", row.get("focal_length_35mm")),
            ("note", "备注", row.get("note")),
            ("category", "分类", row.get("category")),
        ]
        allowed = {
            "filename": {"filename", "relative_path", "format", "suffix"},
            "metadata": {
                "date_key", "datetime_original", "make", "model", "lens_model",
                "focal_bucket", "aperture_bucket", "iso_bucket", "exposure_time",
                "software", "exposure_program", "metering_mode", "flash", "white_balance",
                "f_number", "iso", "focal_length", "focal_length_35mm",
            },
            "note": {"note", "category"},
        }.get(str(scope or "all").strip().lower(), {key for key, _label, _value in fields})
        lowered_terms = [term.lower() for term in terms if term]
        for key, label, value in fields:
            if key not in allowed:
                continue
            text = str(value or "")
            if not text:
                continue
            lower = text.lower()
            if any(term in lower for term in lowered_terms):
                return {
                    "search_match": f"{label}: {text}",
                    "search_match_label": label,
                    "search_match_value": text,
                    "search_match_field": key,
                }
        return {
            "search_match": "",
            "search_match_label": "",
            "search_match_value": "",
            "search_match_field": "",
        }

    @classmethod
    def _search_match_label(cls, row: dict, terms: list[str], scope: str) -> str:
        return str(cls._search_match_info(row, terms, scope).get("search_match") or "")

    def search_photos(
        self,
        query: str,
        *,
        root_path: str | None = None,
        source_id: str | None = None,
        scope: str = "all",
        sort_key: str = "datetime_desc",
        limit: int = 30,
        filters: dict | None = None,
    ) -> list[dict]:
        terms = [part for part in str(query or "").strip().split() if part][:5]
        if not terms:
            return []
        display_filter = self._display_filter("p")
        scope_filter, scope_args = self._source_where(source_id, root_path, "p")
        filter_sql, filter_args = self._photo_filter_sql(filters, "p")
        fields = self._search_fields(scope)
        order_sql = self._photo_order_sql(sort_key)
        args: list = []
        where = f"WHERE {display_filter}{scope_filter}{filter_sql}"
        args.extend(scope_args)
        args.extend(filter_args)
        for term in terms:
            pattern = self._like_pattern(term)
            where += " AND (" + " OR ".join(
                f"COALESCE({expr}, '') LIKE ? ESCAPE '\\'" for _label, expr in fields
            ) + ")"
            args.extend([pattern] * len(fields))
        args.append(max(1, min(80, int(limit or 30))))
        exact_term = terms[0]
        prefix_pattern = self._like_pattern(terms[0])[1:]
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT p.*, {self._raw_pair_sql("p")},
                       COALESCE(m.favorite, 0) AS favorite,
                       COALESCE(m.note, '') AS note,
                       COALESCE(m.category, '') AS category
                FROM photos AS p
                LEFT JOIN source_marks AS m
                  ON m.source_id=p.source_id
                 AND m.item_type='photo'
                 AND m.item_key=p.filename
                {where}
                ORDER BY
                  CASE
                    WHEN LOWER(COALESCE(p.filename, '')) = LOWER(?) THEN 0
                    WHEN LOWER(COALESCE(p.filename, '')) LIKE LOWER(?) ESCAPE '\\' THEN 1
                    ELSE 2
                  END,
                  {order_sql}
                LIMIT ?
                """,
                args[:-1] + [exact_term, prefix_pattern, args[-1]],
            ).fetchall()
        results = []
        for row in rows:
            item = dict(row)
            item.update(self._search_match_info(item, terms, scope))
            results.append(item)
        return results

    def search_dates(
        self,
        query: str,
        *,
        root_path: str | None = None,
        source_id: str | None = None,
        scope: str = "all",
        filters: dict | None = None,
        limit: int = 12,
    ) -> list[dict]:
        clean_scope = str(scope or "all").strip().lower()
        if clean_scope not in {"all", "metadata"}:
            return []
        terms = [part for part in str(query or "").strip().split() if part][:5]
        if not terms:
            return []
        display_filter = self._display_filter("p")
        scope_filter, scope_args = self._source_where(source_id, root_path, "p")
        filter_sql, filter_args = self._photo_filter_sql(filters, "p")
        where = f"WHERE p.date_key IS NOT NULL AND p.date_key <> '' AND {display_filter}{scope_filter}{filter_sql}"
        args: list = []
        args.extend(scope_args)
        args.extend(filter_args)
        for term in terms:
            pattern = self._like_pattern(term)
            where += (
                " AND (COALESCE(p.date_key, '') LIKE ? ESCAPE '\\'"
                " OR COALESCE(p.datetime_original, '') LIKE ? ESCAPE '\\')"
            )
            args.extend([pattern, pattern])

        cover_display_filter = self._display_filter("cp")
        cover_scope_sql, cover_scope_args = self._source_where(source_id, root_path, "cp")
        cover_filter_sql, cover_filter_args = self._photo_filter_sql(filters, "cp")
        exact_term = terms[0]
        prefix_pattern = self._like_pattern(terms[0])[1:]
        query_args = (
            cover_scope_args
            + cover_filter_args
            + args
            + [exact_term, prefix_pattern, max(1, min(40, int(limit or 12)))]
        )
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT p.source_id,
                       p.date_key,
                       COUNT(*) AS count,
                       SUM(CASE WHEN p.exif_status='complete' THEN 1 ELSE 0 END) AS exif_count,
                       (
                           SELECT cp.path
                           FROM photos AS cp
                           WHERE cp.source_id=p.source_id
                             AND cp.date_key=p.date_key
                             AND (cp.renderable=1 OR cp.is_raw=1)
                             AND {cover_display_filter}{cover_scope_sql}{cover_filter_sql}
                           ORDER BY COALESCE(cp.datetime_original, '') DESC, cp.mtime DESC, cp.id DESC
                           LIMIT 1
                       ) AS cover_path
                FROM photos AS p
                {where}
                GROUP BY p.source_id, p.date_key
                ORDER BY
                  CASE
                    WHEN LOWER(COALESCE(p.date_key, '')) = LOWER(?) THEN 0
                    WHEN LOWER(COALESCE(p.date_key, '')) LIKE LOWER(?) ESCAPE '\\' THEN 1
                    ELSE 2
                  END,
                  p.date_key DESC
                LIMIT ?
                """,
                query_args,
            ).fetchall()
            return [dict(row) for row in rows]

    def search_date_marks(
        self,
        query: str,
        *,
        root_path: str | None = None,
        source_id: str | None = None,
        scope: str = "all",
        filters: dict | None = None,
        limit: int = 12,
    ) -> list[dict]:
        clean_scope = str(scope or "all").strip().lower()
        if clean_scope not in {"all", "note"}:
            return []
        terms = [part for part in str(query or "").strip().split() if part][:5]
        if not terms:
            return []
        display_filter = self._display_filter("p")
        scope_filter, scope_args = self._source_where(source_id, root_path, "p")
        filter_sql, filter_args = self._photo_filter_sql(filters, "p")
        where = f"WHERE dm.item_type='date' AND dm.note <> '' AND {display_filter}{scope_filter}{filter_sql}"
        args: list = []
        args.extend(scope_args)
        args.extend(filter_args)
        for term in terms:
            where += " AND COALESCE(dm.note, '') LIKE ? ESCAPE '\\'"
            args.append(self._like_pattern(term))

        cover_display_filter = self._display_filter("cp")
        cover_scope_sql, cover_scope_args = self._source_where(source_id, root_path, "cp")
        cover_filter_sql, cover_filter_args = self._photo_filter_sql(filters, "cp")
        query_args = cover_scope_args + cover_filter_args + args + [max(1, min(40, int(limit or 12)))]
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT dm.source_id,
                       dm.item_key AS date_key,
                       dm.note,
                       COUNT(p.id) AS count,
                       SUM(CASE WHEN p.exif_status='complete' THEN 1 ELSE 0 END) AS exif_count,
                       (
                           SELECT cp.path
                           FROM photos AS cp
                           WHERE cp.source_id=dm.source_id
                             AND cp.date_key=dm.item_key
                             AND (cp.renderable=1 OR cp.is_raw=1)
                             AND {cover_display_filter}{cover_scope_sql}{cover_filter_sql}
                           ORDER BY COALESCE(cp.datetime_original, '') DESC, cp.mtime DESC, cp.id DESC
                           LIMIT 1
                       ) AS cover_path
                FROM source_marks AS dm
                JOIN photos AS p
                  ON p.source_id=dm.source_id
                 AND p.date_key=dm.item_key
                {where}
                GROUP BY dm.source_id, dm.item_key, dm.note
                ORDER BY dm.item_key DESC
                LIMIT ?
                """,
                query_args,
            ).fetchall()
            return [dict(row) for row in rows]

    def photo_offset_in_date(
        self,
        photo_id: int,
        date_key: str,
        *,
        root_path: str | None = None,
        source_id: str | None = None,
        sort_key: str = "datetime_desc",
        filters: dict | None = None,
    ) -> int | None:
        display_filter = self._display_filter("p")
        order_sql = self._photo_order_sql(sort_key)
        scope_filter, scope_args = self._source_where(source_id, root_path, "p")
        filter_sql, filter_args = self._photo_filter_sql(filters, "p")
        args: list = [str(date_key)]
        args.extend(scope_args)
        args.extend(filter_args)
        args.append(int(photo_id))
        with self._lock, self._connect() as conn:
            row = conn.execute(
                f"""
                SELECT ranked.offset_index
                FROM (
                    SELECT p.id,
                           ROW_NUMBER() OVER (ORDER BY {order_sql}) - 1 AS offset_index
                    FROM photos AS p
                    WHERE p.date_key=?{scope_filter} AND {display_filter}{filter_sql}
                ) AS ranked
                WHERE ranked.id=?
                """,
                args,
            ).fetchone()
            return int(row["offset_index"]) if row else None

    def list_dates(
        self,
        *,
        before: str | None = None,
        limit: int = 10,
        root_path: str | None = None,
        source_id: str | None = None,
        sort_key: str = "datetime_desc",
        filters: dict | None = None,
    ) -> list[dict]:
        self._photo_order_sql(sort_key)
        ascending_dates = str(sort_key or "datetime_desc") == "datetime_asc"
        args: list = []
        display_filter = self._display_filter("p")
        where = f"WHERE p.date_key IS NOT NULL AND p.date_key <> '' AND {display_filter}"
        scope_sql, scope_args = self._source_where(source_id, root_path, "p")
        where += scope_sql
        args.extend(scope_args)
        filter_sql, filter_args = self._photo_filter_sql(filters, "p")
        where += filter_sql
        args.extend(filter_args)
        if before:
            where += " AND p.date_key > ?" if ascending_dates else " AND p.date_key < ?"
            args.append(str(before))
        cover_display_filter = self._display_filter("cp")
        cover_scope_sql, cover_scope_args = self._source_where(source_id, root_path, "cp")
        cover_filter_sql, cover_filter_args = self._photo_filter_sql(filters, "cp")
        query_args = cover_scope_args + cover_filter_args + args + [int(limit)]
        date_order = "p.date_key ASC" if ascending_dates else "p.date_key DESC"
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT p.date_key, COUNT(*) AS count,
                       SUM(CASE WHEN p.exif_status='complete' THEN 1 ELSE 0 END) AS exif_count,
                       (
                           SELECT cp.path
                           FROM photos AS cp
                           WHERE cp.date_key=p.date_key
                             AND (cp.renderable=1 OR cp.is_raw=1)
                             AND {cover_display_filter}{cover_scope_sql}{cover_filter_sql}
                           ORDER BY COALESCE(cp.datetime_original, '') DESC, cp.mtime DESC, cp.id DESC
                           LIMIT 1
                       ) AS cover_path
                FROM photos AS p
                {where}
                GROUP BY p.date_key
                ORDER BY {date_order}
                LIMIT ?
                """,
                query_args,
            ).fetchall()
            return [dict(r) for r in rows]

    def list_photos_for_date(
        self,
        date_key: str,
        *,
        offset: int = 0,
        limit: int = 60,
        root_path: str | None = None,
        source_id: str | None = None,
        sort_key: str = "datetime_desc",
        filters: dict | None = None,
    ) -> list[dict]:
        display_filter = self._display_filter("p")
        order_sql = self._photo_order_sql(sort_key)
        args: list = [str(date_key)]
        scope_filter, scope_args = self._source_where(source_id, root_path, "p")
        args.extend(scope_args)
        filter_sql, filter_args = self._photo_filter_sql(filters, "p")
        args.extend(filter_args)
        args.extend([int(limit), int(offset)])
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT p.*, {self._raw_pair_sql("p")}
                FROM photos AS p
                WHERE p.date_key=?{scope_filter} AND {display_filter}{filter_sql}
                ORDER BY {order_sql}
                LIMIT ? OFFSET ?
                """,
                args,
            ).fetchall()
            return [dict(r) for r in rows]

    def filter_options(self, root_path: str | None = None, source_id: str | None = None) -> dict:
        display_filter = self._display_filter("p")
        scope_filter, scope_args = self._source_where(source_id, root_path, "p")
        where = f"WHERE {display_filter}{scope_filter}"
        with self._lock, self._connect() as conn:
            lenses = conn.execute(
                f"""
                SELECT COALESCE(NULLIF(p.lens_model, ''), '?') AS name, COUNT(*) AS count
                FROM photos AS p
                {where}
                GROUP BY COALESCE(NULLIF(p.lens_model, ''), '?')
                ORDER BY count DESC, name ASC
                """,
                scope_args,
            ).fetchall()
            focals = conn.execute(
                f"""
                SELECT COALESCE(NULLIF(p.focal_bucket, ''), '?') AS name, COUNT(*) AS count
                FROM photos AS p
                {where}
                GROUP BY COALESCE(NULLIF(p.focal_bucket, ''), '?')
                ORDER BY count DESC, name ASC
                """,
                scope_args,
            ).fetchall()
            date_row = conn.execute(
                f"""
                SELECT MIN(p.date_key) AS earliest, MAX(p.date_key) AS latest
                FROM photos AS p
                {where} AND p.date_key IS NOT NULL AND p.date_key <> ''
                """,
                scope_args,
            ).fetchone()
            return {
                "lenses": [dict(row) for row in lenses],
                "focal_buckets": [dict(row) for row in focals],
                "date_range": {
                    "earliest": date_row["earliest"] if date_row else "",
                    "latest": date_row["latest"] if date_row else "",
                },
            }

    def count_export_photos(self, source_id: str, export_type: str, category: str | None = None) -> int:
        source_id = str(source_id or "").strip()
        if not source_id:
            return 0
        filters = self._export_filters(export_type, category)
        display_filter = self._display_filter("p")
        filter_sql, filter_args = self._photo_filter_sql(filters, "p")
        args = [source_id] + filter_args
        with self._lock, self._connect() as conn:
            row = conn.execute(
                f"""
                SELECT COUNT(*) AS c
                FROM photos AS p
                WHERE p.source_id=? AND {display_filter}{filter_sql}
                """,
                args,
            ).fetchone()
            return int(row["c"] or 0)

    def export_photos(self, source_id: str, export_type: str, category: str | None = None) -> list[dict]:
        source_id = str(source_id or "").strip()
        if not source_id:
            return []
        filters = self._export_filters(export_type, category)
        display_filter = self._display_filter("p")
        filter_sql, filter_args = self._photo_filter_sql(filters, "p")
        args = [source_id] + filter_args
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT p.*
                FROM photos AS p
                WHERE p.source_id=? AND {display_filter}{filter_sql}
                ORDER BY p.folder_key ASC, LOWER(p.filename) ASC, p.id ASC
                """,
                args,
            ).fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    def _export_filters(export_type: str, category: str | None = None) -> dict:
        kind = str(export_type or "").strip()
        if kind == "favorite":
            return {"favorite": True}
        if kind == "category":
            return {"category": str(category or "").strip()}
        raise ValueError("不允许导出全部照片")

    def latest_session(self, root_path: str | None = None, source_id: str | None = None) -> dict | None:
        args: list = []
        where = ""
        if source_id:
            where = "WHERE source_id=?"
            args.append(str(source_id))
        elif root_path:
            where = "WHERE root_path=?"
            args.append(str(root_path))
        with self._lock, self._connect() as conn:
            row = conn.execute(
                f"SELECT * FROM scan_sessions {where} ORDER BY id DESC LIMIT 1",
                args,
            ).fetchone()
            return dict(row) if row else None

    def count_photos(self, root_path: str | None = None, source_id: str | None = None) -> int:
        display_filter = self._display_filter("p")
        root_filter, args = self._source_where(source_id, root_path, "p")
        with self._lock, self._connect() as conn:
            row = conn.execute(
                f"SELECT COUNT(*) AS c FROM photos AS p WHERE {display_filter}{root_filter}",
                args,
            ).fetchone()
            return int(row["c"] or 0)

    def count_indexed_photos(self, root_path: str | None = None, source_id: str | None = None) -> int:
        args: list = []
        where = ""
        if source_id:
            where = "WHERE source_id=?"
            args.append(str(source_id))
        elif root_path:
            where = "WHERE root_path=?"
            args.append(str(root_path))
        with self._lock, self._connect() as conn:
            row = conn.execute(f"SELECT COUNT(*) AS c FROM photos {where}", args).fetchone()
            return int(row["c"] or 0)

    def count_exif_pending(self, root_path: str | None = None, source_id: str | None = None) -> int:
        args: list = []
        where = "WHERE exif_status='pending'"
        if source_id:
            where += " AND source_id=?"
            args.append(str(source_id))
        elif root_path:
            where += " AND root_path=?"
            args.append(str(root_path))
        with self._lock, self._connect() as conn:
            row = conn.execute(f"SELECT COUNT(*) AS c FROM photos {where}", args).fetchone()
            return int(row["c"] or 0)

    def pending_exif_photos(
        self,
        root_path: str | None = None,
        *,
        source_id: str | None = None,
        limit: int = 25,
    ) -> list[dict]:
        args: list = []
        where = "WHERE exif_status='pending'"
        if source_id:
            where += " AND source_id=?"
            args.append(str(source_id))
        elif root_path:
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

    def cover_photo(self, root_path: str | None = None, source_id: str | None = None) -> dict | None:
        display_filter = self._display_filter("p")
        scope_filter, args = self._source_where(source_id, root_path, "p")
        with self._lock, self._connect() as conn:
            row = conn.execute(
                f"""
                SELECT p.*
                FROM photos AS p
                WHERE (p.renderable=1 OR p.is_raw=1){scope_filter} AND {display_filter}
                ORDER BY COALESCE(p.datetime_original, '') DESC, p.mtime DESC, p.id DESC
                LIMIT 1
                """,
                args,
            ).fetchone()
            return dict(row) if row else None

    def statistics(self, root_path: str | None = None, source_id: str | None = None) -> dict:
        args: list = []
        where = ""
        if source_id:
            where = "WHERE source_id=?"
            args.append(str(source_id))
        elif root_path:
            where = "WHERE root_path=?"
            args.append(str(root_path))
        with self._lock, self._connect() as conn:
            total = int(conn.execute(f"SELECT COUNT(*) AS c FROM photos {where}", args).fetchone()["c"] or 0)
            complete = int(
                conn.execute(
                    "SELECT COUNT(*) AS c FROM photos WHERE exif_status='complete'"
                    + (" AND source_id=?" if source_id else (" AND root_path=?" if root_path else "")),
                    args,
                ).fetchone()["c"]
                or 0
            )
            failed = int(
                conn.execute(
                    "SELECT COUNT(*) AS c FROM photos WHERE exif_status='failed'"
                    + (" AND source_id=?" if source_id else (" AND root_path=?" if root_path else "")),
                    args,
                ).fetchone()["c"]
                or 0
            )
            pending = max(0, total - complete - failed)

            def group(field: str, limit: int = 18) -> list[dict]:
                group_where = "WHERE source_id=?" if source_id else ("WHERE root_path=?" if root_path else "")
                rows = conn.execute(
                    f"""
                    SELECT COALESCE(NULLIF({field}, ''), '?') AS name, COUNT(*) AS count
                    FROM photos
                    {group_where}
                    GROUP BY COALESCE(NULLIF({field}, ''), '?')
                    ORDER BY count DESC, name ASC
                    LIMIT ?
                    """,
                    ([str(source_id)] if source_id else ([str(root_path)] if root_path else [])) + [int(limit)],
                ).fetchall()
                return [dict(r) for r in rows]

            time_where = "AND source_id=?" if source_id else ("AND root_path=?" if root_path else "")
            time_row = conn.execute(
                f"""
                SELECT MIN(datetime_original) AS earliest, MAX(datetime_original) AS latest
                FROM photos
                WHERE datetime_original IS NOT NULL AND datetime_original <> '' {time_where}
                """,
                [str(source_id)] if source_id else ([str(root_path)] if root_path else []),
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

    def statistics_detail(self, root_path: str | None = None, source_id: str | None = None) -> dict:
        display_filter = self._display_filter("p")
        scope_filter, scope_args = self._source_where(source_id, root_path, "p")
        where = f"WHERE {display_filter}{scope_filter}"

        def group_query(expr: str, *, extra: str = "", limit: int = 18) -> tuple[str, list]:
            args = list(scope_args)
            args.append(int(limit))
            return (
                f"""
                SELECT {expr} AS name, COUNT(*) AS count
                FROM photos AS p
                {where} {extra}
                GROUP BY {expr}
                ORDER BY count DESC, name ASC
                LIMIT ?
                """,
                args,
            )

        with self._lock, self._connect() as conn:
            total = int(conn.execute(f"SELECT COUNT(*) AS c FROM photos AS p WHERE {display_filter}{scope_filter}", scope_args).fetchone()["c"] or 0)
            complete = int(conn.execute(f"SELECT COUNT(*) AS c FROM photos AS p WHERE {display_filter}{scope_filter} AND p.exif_status='complete'", scope_args).fetchone()["c"] or 0)
            failed = int(conn.execute(f"SELECT COUNT(*) AS c FROM photos AS p WHERE {display_filter}{scope_filter} AND p.exif_status='failed'", scope_args).fetchone()["c"] or 0)
            pending = max(0, total - complete - failed)
            time_row = conn.execute(
                f"""
                SELECT MIN(p.datetime_original) AS earliest, MAX(p.datetime_original) AS latest
                FROM photos AS p
                {where} AND p.datetime_original IS NOT NULL AND p.datetime_original <> ''
                """,
                scope_args,
            ).fetchone()
            by_hour_sql, by_hour_args = group_query(
                "substr(p.datetime_original, 12, 2) || ':00'",
                extra="AND p.exif_status='complete' AND p.datetime_original IS NOT NULL AND p.datetime_original <> ''",
                limit=24,
            )
            by_month_sql = f"""
                SELECT substr(p.datetime_original, 1, 7) AS name, COUNT(*) AS count
                FROM photos AS p
                {where} AND p.exif_status='complete' AND p.datetime_original IS NOT NULL AND p.datetime_original <> ''
                GROUP BY substr(p.datetime_original, 1, 7)
                ORDER BY name ASC
                LIMIT 36
            """
            by_month_args = list(scope_args)
            by_lens_sql, by_lens_args = group_query(
                "COALESCE(NULLIF(p.lens_model, ''), '?')",
                extra="AND p.exif_status='complete'",
                limit=12,
            )
            by_focal_sql, by_focal_args = group_query(
                "COALESCE(NULLIF(p.focal_bucket, ''), '?')",
                extra="AND p.exif_status='complete'",
                limit=12,
            )
            by_model_sql, by_model_args = group_query(
                "COALESCE(NULLIF(TRIM(COALESCE(p.make, '') || ' ' || COALESCE(p.model, '')), ''), '?')",
                extra="AND p.exif_status='complete'",
                limit=12,
            )
            by_aperture_sql, by_aperture_args = group_query(
                "COALESCE(NULLIF(p.aperture_bucket, ''), '?')",
                extra="AND p.exif_status='complete'",
                limit=12,
            )
            by_iso_sql, by_iso_args = group_query(
                "COALESCE(NULLIF(p.iso_bucket, ''), '?')",
                extra="AND p.exif_status='complete'",
                limit=12,
            )
            shutter_expr = (
                "CASE "
                "WHEN p.exposure_seconds IS NULL OR p.exposure_seconds <= 0 THEN '?' "
                "WHEN p.exposure_seconds >= 1 THEN '1s+' "
                "WHEN p.exposure_seconds >= 0.25 THEN '1/4-1s' "
                "WHEN p.exposure_seconds >= 0.0666667 THEN '1/15-1/4s' "
                "WHEN p.exposure_seconds >= 0.0166667 THEN '1/60-1/15s' "
                "WHEN p.exposure_seconds >= 0.004 THEN '1/250-1/60s' "
                "WHEN p.exposure_seconds >= 0.001 THEN '1/1000-1/250s' "
                "ELSE '<1/1000s' END"
            )
            by_shutter_sql, by_shutter_args = group_query(
                shutter_expr,
                extra="AND p.exif_status='complete'",
                limit=12,
            )
            by_format_sql, by_format_args = group_query(
                "COALESCE(NULLIF(p.format, ''), '?')",
                limit=10,
            )
            by_exif_status_sql, by_exif_status_args = group_query(
                "COALESCE(NULLIF(p.exif_status, ''), '?')",
                limit=8,
            )
            return {
                "total_files": total,
                "exif_complete": complete,
                "exif_failed": failed,
                "exif_pending": pending,
                "time_range": {
                    "earliest": time_row["earliest"] if time_row else None,
                    "latest": time_row["latest"] if time_row else None,
                },
                "by_hour": [dict(row) for row in conn.execute(by_hour_sql, by_hour_args).fetchall()],
                "by_month": [dict(row) for row in conn.execute(by_month_sql, by_month_args).fetchall()],
                "by_lens": [dict(row) for row in conn.execute(by_lens_sql, by_lens_args).fetchall()],
                "by_focal_bucket": [dict(row) for row in conn.execute(by_focal_sql, by_focal_args).fetchall()],
                "by_model": [dict(row) for row in conn.execute(by_model_sql, by_model_args).fetchall()],
                "by_aperture": [dict(row) for row in conn.execute(by_aperture_sql, by_aperture_args).fetchall()],
                "by_iso_bucket": [dict(row) for row in conn.execute(by_iso_sql, by_iso_args).fetchall()],
                "by_shutter": [dict(row) for row in conn.execute(by_shutter_sql, by_shutter_args).fetchall()],
                "by_format": [dict(row) for row in conn.execute(by_format_sql, by_format_args).fetchall()],
                "by_exif_status": [dict(row) for row in conn.execute(by_exif_status_sql, by_exif_status_args).fetchall()],
            }

    def list_categories(self, source_id: str = "") -> list[dict]:
        source_id = str(source_id or "").strip()
        display_filter = self._display_filter("p")
        with self._lock, self._connect() as conn:
            if source_id:
                uncategorized = conn.execute(
                    f"""
                    SELECT COUNT(*) AS c
                    FROM photos AS p
                    WHERE p.source_id=?
                      AND {display_filter}
                      AND NOT EXISTS (
                          SELECT 1
                          FROM source_marks AS m
                          WHERE m.source_id=p.source_id
                            AND m.item_type='photo'
                            AND m.item_key=p.filename
                            AND m.category <> ''
                      )
                    """,
                    (source_id,),
                ).fetchone()
                uncategorized_count = int(uncategorized["c"] or 0)
            else:
                uncategorized_count = 0
            rows = conn.execute(
                f"""
                SELECT c.name,
                       COUNT(p.id) AS count
                FROM categories AS c
                LEFT JOIN source_marks AS m
                  ON m.source_id=?
                 AND m.item_type='photo'
                 AND m.category=c.name
                LEFT JOIN photos AS p
                  ON p.source_id=?
                 AND p.filename=m.item_key
                 AND {display_filter}
                GROUP BY c.name
                ORDER BY LOWER(c.name) ASC
                """,
                (source_id, source_id),
            ).fetchall()
        categories = [{"name": "", "label": "未分类", "count": uncategorized_count, "builtin": True}]
        categories.extend(
            {
                "name": str(row["name"] or ""),
                "label": str(row["name"] or ""),
                "count": int(row["count"] or 0),
                "builtin": False,
            }
            for row in rows
        )
        return categories

    def add_category(self, source_id: str, name: str) -> dict:
        clean = str(name or "").strip()
        if not clean:
            raise ValueError("分类名称不能为空")
        if clean in {"未分类", "全部照片"}:
            raise ValueError("分类名称不能使用内置名称")
        if len(clean) > 24:
            raise ValueError("分类名称不能超过 24 个字符")
        now = now_text()
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO categories(name, created_at, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET updated_at=excluded.updated_at
                """,
                (clean, now, now),
            )
        return {"name": clean, "label": clean, "count": 0, "builtin": False}

    def set_mark(
        self,
        source_id: str,
        item_type: str,
        item_key: str,
        *,
        favorite: bool | None = None,
        note: str | None = None,
        category: str | None = None,
    ) -> dict:
        source_id = str(source_id or "").strip()
        item_type = str(item_type or "").strip()
        item_key = str(item_key or "").strip()
        if not source_id or not item_type or not item_key:
            raise ValueError("标记缺少 source_id、类型或键")
        existing = self.marks_for_items(source_id, item_type, [item_key]).get(item_key, {})
        next_favorite = int(bool(existing.get("favorite"))) if favorite is None else int(bool(favorite))
        next_note = str(existing.get("note") or "") if note is None else str(note or "")
        next_category = str(existing.get("category") or "") if category is None else str(category or "").strip()
        now = now_text()
        with self._lock, self._connect() as conn:
            if item_type == "photo" and next_category:
                conn.execute(
                    """
                    INSERT INTO categories(name, created_at, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(name) DO UPDATE SET updated_at=excluded.updated_at
                    """,
                    (next_category, now, now),
                )
            conn.execute(
                """
                INSERT INTO source_marks(source_id, item_type, item_key, favorite, note, category, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_id, item_type, item_key) DO UPDATE SET
                    favorite=excluded.favorite,
                    note=excluded.note,
                    category=excluded.category,
                    updated_at=excluded.updated_at
                """,
                (source_id, item_type, item_key, next_favorite, next_note, next_category, now, now),
            )
            row = conn.execute(
                """
                SELECT source_id, item_type, item_key, favorite, note, category
                FROM source_marks
                WHERE source_id=? AND item_type=? AND item_key=?
                """,
                (source_id, item_type, item_key),
            ).fetchone()
            return dict(row) if row else {}

    def marks_for_items(self, source_id: str, item_type: str, item_keys: list[str]) -> dict[str, dict]:
        source_id = str(source_id or "").strip()
        item_type = str(item_type or "").strip()
        keys = [str(x or "").strip() for x in item_keys if str(x or "").strip()]
        if not source_id or not item_type or not keys:
            return {}
        placeholders = ",".join("?" for _ in keys)
        args = [source_id, item_type] + keys
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT item_key, favorite, note, category
                FROM source_marks
                WHERE source_id=? AND item_type=? AND item_key IN ({placeholders})
                """,
                args,
            ).fetchall()
            return {
                str(row["item_key"]): {
                    "favorite": bool(row["favorite"]),
                    "note": str(row["note"] or ""),
                    "category": str(row["category"] or ""),
                }
                for row in rows
            }


storage = Storage()
