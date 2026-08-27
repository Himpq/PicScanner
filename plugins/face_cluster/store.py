"""兼容薄壳：人脸向量存到独立索引 face-identity。"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from plugins.semantic_search.vector_core.record import VectorRecord
from plugins.semantic_search.vector_core.store import VectorStore as CoreStore

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "plugins" / "face_cluster" / "index.db"
DEFAULT_INDEX = "face-identity"


class FaceVectorStore:
    def __init__(self, path: Path = DB_PATH):
        self._core = CoreStore(index_name=DEFAULT_INDEX, db_path=Path(path))
        self.path = self._core.path

    def upsert_face(self, photo_path: str, face_index: int, mtime: float, size: int, model: str, vector: np.ndarray, source_id: str = "", item_key: str = "", bbox=None, score: float = 0.0) -> None:
        fid = f"{photo_path}#face{face_index}"
        rec = VectorRecord.for_photo(
            path=fid,
            vector=vector,
            model=model,
            source_id=source_id,
            item_key=item_key or fid,
            source_signature=f"{float(mtime)}:{int(size)}:{face_index}:{bbox}",
            index_name=DEFAULT_INDEX,
            file_mtime=float(mtime),
            file_size=int(size),
            extra={"bbox": bbox, "face_index": face_index, "score": score, "photo_path": photo_path},
            media_type="face",
        )
        self._core.upsert(rec)

    @property
    def core(self) -> CoreStore:
        return self._core

    def count(self, source_id: str | None = None) -> int:
        return self._core.count(source_id=source_id) if source_id else self._core.count()

    def known_signatures(self):
        return self._core.known_signatures()

    def prune_missing(self):
        return self._core.prune_missing()
