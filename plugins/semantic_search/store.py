"""兼容薄壳：保持 CLI / 旧代码的 VectorStore API，内部委托给 vector_core。

所有新代码应直接使用 vector_core.VectorStore / VectorIndexRegistry。
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from .vector_core.record import VectorRecord
from .vector_core.store import VectorStore as CoreStore

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "plugins" / "semantic_search" / "index.db"
DEFAULT_INDEX = "semantic-image"


class VectorStore:
    """旧 API 兼容层：upsert(path, mtime, size, model, vector) 等。"""

    def __init__(self, path: Path = DB_PATH):
        self._core = CoreStore(index_name=DEFAULT_INDEX, db_path=Path(path))
        self.path = self._core.path

    def upsert(self, path: str, mtime: float, size: int, model: str, vector: np.ndarray, **kwargs) -> None:
        source_id = str(kwargs.get("source_id") or "")
        item_key = str(kwargs.get("item_key") or "") or str(Path(path).resolve())
        rec = VectorRecord.for_photo(
            path=path,
            vector=vector,
            model=model,
            source_id=source_id,
            item_key=item_key,
            source_signature=f"{float(mtime)}:{int(size)}",
            index_name=DEFAULT_INDEX,
            file_mtime=float(mtime),
            file_size=int(size),
        )
        self._core.upsert(rec)

    def known_signatures(self) -> dict[str, tuple[float, int]]:
        return self._core.known_signatures()

    def prune_missing(self) -> list[str]:
        return self._core.prune_missing()

    def count(self, source_id: str | None = None) -> int:
        return self._core.count(source_id=source_id) if source_id else self._core.count()

    def db_size_bytes(self) -> int:
        return self._core.db_size_bytes()

    def search(self, query_mat: np.ndarray, top_k: int = 8, return_stats: bool = False):
        res = self._core.search(query_mat, top_k=top_k, return_stats=return_stats)
        if return_stats:
            scored, mu, sd = res
            # 转为旧格式 [(path, score), ...]
            simple = [(r.record.path, r.score) for r in scored]
            return simple, mu, sd
        scored = res
        return [(r.record.path, r.score) for r in scored]

    # 透传回溯接口（供新代码直接用）
    @property
    def core(self) -> CoreStore:
        return self._core
