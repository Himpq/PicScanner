"""VectorStore：元数据 + 后端委托 + SQLite 持久化 + 可追溯检索。"""
from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path

import numpy as np

from .backend import NumpyBackend, VectorBackend
from .record import ScoredRecord, VectorRecord

DEFAULT_DB = Path(__file__).resolve().parents[3] / "data" / "plugins" / "semantic_search" / "index.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS vector_records (
    id               TEXT PRIMARY KEY,
    index_name       TEXT NOT NULL,
    source_id        TEXT NOT NULL,
    item_key         TEXT NOT NULL,
    path             TEXT NOT NULL,
    media_type       TEXT,
    modality         TEXT,
    model            TEXT NOT NULL,
    model_version    TEXT,
    dim              INTEGER NOT NULL,
    source_signature TEXT,
    created_at       TEXT,
    file_mtime       REAL,
    file_size        INTEGER,
    extra            TEXT,
    embedding        BLOB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vec_index  ON vector_records(index_name);
CREATE INDEX IF NOT EXISTS idx_vec_source ON vector_records(source_id, item_key);
CREATE INDEX IF NOT EXISTS idx_vec_model  ON vector_records(model);
CREATE INDEX IF NOT EXISTS idx_vec_path   ON vector_records(path);
"""


class VectorStore:
    """高层存储：SQLite 持久化 + 内存后端索引 + 命名空间隔离。"""

    def __init__(
        self,
        index_name: str,
        db_path: Path = DEFAULT_DB,
        backend: VectorBackend | None = None,
        model: str = "",
        model_version: str = "",
    ):
        self.index_name = index_name
        self.model = model
        self.model_version = model_version
        self.path = Path(db_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.backend: VectorBackend = backend or NumpyBackend()
        self._lock = threading.RLock()
        with self._connect() as conn:
            conn.executescript(SCHEMA)
            self._maybe_migrate_legacy(conn)
        self._load_backend()

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

    def _maybe_migrate_legacy(self, conn) -> None:
        """从旧表 indexed_files 迁移（插件终端版首版）。"""
        try:
            cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='indexed_files'")
            if not cur.fetchone():
                return
            cur = conn.execute("SELECT COUNT(*) AS n FROM vector_records WHERE index_name=?", (self.index_name,))
            if cur.fetchone()["n"] > 0:
                return  # 已迁移过
            rows = conn.execute("SELECT path, mtime, size, dim, model, embedding, indexed_at FROM indexed_files").fetchall()
            for r in rows:
                path = str(r["path"])
                rec = VectorRecord(
                    id=path,
                    index_name=self.index_name,
                    source_id="",
                    item_key=path,
                    path=path,
                    media_type="photo",
                    modality="image",
                    model=str(r["model"]),
                    model_version="",
                    dim=int(r["dim"]),
                    source_signature=f"{r['mtime']}:{r['size']}",
                    created_at=str(r["indexed_at"]),
                    file_mtime=float(r["mtime"]),
                    file_size=int(r["size"]),
                    extra={},
                    embedding=bytes(r["embedding"]),
                )
                conn.execute(
                    """INSERT OR IGNORE INTO vector_records
                       (id,index_name,source_id,item_key,path,media_type,modality,model,model_version,dim,source_signature,created_at,file_mtime,file_size,extra,embedding)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    rec.to_row(),
                )
        except Exception:
            pass  # 迁移失败不阻断启动

    def _load_backend(self) -> None:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, embedding, dim FROM vector_records WHERE index_name=?", (self.index_name,)
            ).fetchall()
        ids: list[str] = []
        vecs: list[np.ndarray] = []
        for r in rows:
            ids.append(r["id"])
            vecs.append(np.frombuffer(r["embedding"], dtype=np.float32))
        if ids:
            mat = np.vstack(vecs) if len(vecs) > 1 else np.asarray(vecs[0]).reshape(1, -1) if vecs else np.zeros((0, 0), np.float32)
            # 归一化后写入后端（检索时余弦）
            norms = np.linalg.norm(mat, axis=1, keepdims=True) + 1e-9
            mat = mat / norms
            self.backend.add(ids, mat)

    # ---------- 写入 ----------

    def upsert(self, record: VectorRecord) -> None:
        record.index_name = self.index_name
        if not record.created_at:
            import time
            record.created_at = time.strftime("%Y-%m-%d %H:%M:%S")
        vec = np.frombuffer(record.embedding, dtype=np.float32) if isinstance(record.embedding, (bytes, bytearray)) else np.asarray(record.embedding, np.float32)
        vec_n = vec / (float(np.linalg.norm(vec)) + 1e-9) if vec.size else vec
        record.embedding = vec_n.astype(np.float32).tobytes()
        record.dim = int(vec_n.size)
        with self._lock, self._connect() as conn:
            conn.execute(
                """INSERT INTO vector_records
                   (id,index_name,source_id,item_key,path,media_type,modality,model,model_version,dim,source_signature,created_at,file_mtime,file_size,extra,embedding)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET
                     index_name=excluded.index_name, source_id=excluded.source_id, item_key=excluded.item_key,
                     path=excluded.path, media_type=excluded.media_type, modality=excluded.modality,
                     model=excluded.model, model_version=excluded.model_version, dim=excluded.dim,
                     source_signature=excluded.source_signature, created_at=excluded.created_at,
                     file_mtime=excluded.file_mtime, file_size=excluded.file_size, extra=excluded.extra, embedding=excluded.embedding""",
                record.to_row(),
            )
        self.backend.add([record.id], vec_n.reshape(1, -1))

    def remove(self, record_id: str) -> None:
        with self._lock, self._connect() as conn:
            conn.execute("DELETE FROM vector_records WHERE id=? AND index_name=?", (record_id, self.index_name))
        self.backend.remove([record_id])

    # ---------- 查询 / 统计 / 回溯 ----------

    def search(
        self, query_mat: np.ndarray, top_k: int = 8, filters: dict | None = None, return_stats: bool = False
    ) -> list[ScoredRecord] | tuple[list[ScoredRecord], float, float]:
        q = np.asarray(query_mat, dtype=np.float32)
        if q.ndim == 1:
            q = q.reshape(1, -1)
        q = q / (np.linalg.norm(q, axis=1, keepdims=True) + 1e-9)
        if top_k <= 0 or q.shape[0] == 0:
            return ([], 0.0, 0.0) if return_stats else []
        # 取全量 id->向量做多模板 max（精确，适合万级）
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                "SELECT id, index_name, source_id, item_key, path, media_type, modality, model, model_version, dim, source_signature, created_at, file_mtime, file_size, extra, embedding FROM vector_records WHERE index_name=?",
                (self.index_name,),
            ).fetchall()
        if not rows:
            return ([], 0.0, 0.0) if return_stats else []
        # 过滤
        allowed: set[str] | None = None
        if filters and filters.get("source_id"):
            sid = str(filters["source_id"])
            allowed = {r["id"] for r in rows if str(r["source_id"]) == sid}
        dim = q.shape[1]
        id_to_score: dict[str, float] = {}
        id_to_row = {r["id"]: r for r in rows}
        for t in range(q.shape[0]):
            scores = self.backend.score_all(q[t])
            for rid, s in scores.items():
                if allowed is not None and rid not in allowed:
                    continue
                # 维度不符跳过（跨模型混用防护）
                r = id_to_row.get(rid)
                if r is None or int(r["dim"]) != dim:
                    continue
                if rid not in id_to_score or s > id_to_score[rid]:
                    id_to_score[rid] = float(s)
        if not id_to_score:
            return ([], 0.0, 0.0) if return_stats else []
        ranked = sorted(id_to_score.items(), key=lambda kv: kv[1], reverse=True)
        mu = float(np.mean(list(id_to_score.values())))
        sd = float(np.std(list(id_to_score.values())))
        k = min(int(top_k), len(ranked))
        top = ranked[:k]
        results: list[ScoredRecord] = []
        for rid, score in top:
            rec = VectorRecord.from_row(id_to_row[rid])
            results.append(ScoredRecord(record=rec, score=score))
        if return_stats:
            return results, mu, sd
        return results

    def count(self, source_id: str | None = None) -> int:
        with self._connect() as conn:
            if source_id:
                r = conn.execute(
                    "SELECT COUNT(*) AS n FROM vector_records WHERE index_name=? AND source_id=?",
                    (self.index_name, str(source_id)),
                ).fetchone()
            else:
                r = conn.execute("SELECT COUNT(*) AS n FROM vector_records WHERE index_name=?", (self.index_name,)).fetchone()
        return int(r["n"]) if r else 0

    def db_size_bytes(self) -> int:
        total = 0
        for p in (self.path, self.path.with_name(self.path.name + "-wal")):
            if p.exists():
                total += p.stat().st_size
        return total

    def known_signatures(self) -> dict[str, tuple[float, int]]:
        with self._connect() as conn:
            rows = conn.execute("SELECT path, file_mtime, file_size FROM vector_records WHERE index_name=?", (self.index_name,)).fetchall()
        return {r["path"]: (float(r["file_mtime"] or 0), int(r["file_size"] or 0)) for r in rows}

    def prune_missing(self) -> list[str]:
        with self._connect() as conn:
            rows = conn.execute("SELECT id, path FROM vector_records WHERE index_name=?", (self.index_name,)).fetchall()
            missing = []
            for r in rows:
                try:
                    exists = Path(r["path"]).exists()
                except Exception:
                    exists = False
                if not exists:
                    missing.append(r["id"])
            for rid in missing:
                conn.execute("DELETE FROM vector_records WHERE id=?", (rid,))
        if missing:
            self.backend.remove(missing)
        return missing

    def by_model(self, model: str) -> list[VectorRecord]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM vector_records WHERE index_name=? AND model=?", (self.index_name, model)).fetchall()
        return [VectorRecord.from_row(r) for r in rows]

    def by_source(self, source_id: str) -> list[VectorRecord]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM vector_records WHERE index_name=? AND source_id=?", (self.index_name, source_id)).fetchall()
        return [VectorRecord.from_row(r) for r in rows]

    def audit(self) -> dict:
        with self._connect() as conn:
            total = conn.execute("SELECT COUNT(*) AS n FROM vector_records WHERE index_name=?", (self.index_name,)).fetchone()["n"]
            models = conn.execute("SELECT model, COUNT(*) AS n FROM vector_records WHERE index_name=? GROUP BY model", (self.index_name,)).fetchall()
        return {"index": self.index_name, "total": int(total), "by_model": {r["model"]: int(r["n"]) for r in models}}
