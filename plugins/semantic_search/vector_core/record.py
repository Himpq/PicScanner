"""向量记录数据结构：每个向量的可追溯元数据。"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np


def _now_iso() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


@dataclass
class VectorRecord:
    """单条向量及其溯源信息。

    id 建议稳定且唯一，例如 f"{source_id}:{item_key}"，便于跨库关联与回溯。
    """

    id: str
    index_name: str
    source_id: str = ""
    item_key: str = ""
    path: str = ""
    media_type: str = "photo"        # photo | face | region | text
    modality: str = "image"         # image | text
    model: str = ""
    model_version: str = ""
    dim: int = 0
    source_signature: str = ""      # mtime^size 哈希，增量更新 + 审计
    created_at: str = ""
    file_mtime: float = 0.0
    file_size: int = 0
    extra: dict = field(default_factory=dict)
    embedding: bytes = b""

    def to_row(self) -> tuple:
        return (
            self.id,
            self.index_name,
            self.source_id,
            self.item_key,
            self.path,
            self.media_type,
            self.modality,
            self.model,
            self.model_version,
            int(self.dim),
            self.source_signature,
            self.created_at or _now_iso(),
            float(self.file_mtime),
            int(self.file_size),
            json.dumps(self.extra, ensure_ascii=False),
            self.embedding,
        )

    @classmethod
    def from_row(cls, row) -> "VectorRecord":
        # 兼容旧表：file_mtime/file_size 可能不存在
        try:
            fm = float(row["file_mtime"])
        except Exception:
            fm = 0.0
        try:
            fs = int(row["file_size"])
        except Exception:
            fs = 0
        return cls(
            id=row["id"],
            index_name=row["index_name"],
            source_id=row["source_id"],
            item_key=row["item_key"],
            path=row["path"],
            media_type=row["media_type"],
            modality=row["modality"],
            model=row["model"],
            model_version=row["model_version"],
            dim=int(row["dim"]),
            source_signature=row["source_signature"],
            created_at=row["created_at"],
            file_mtime=fm,
            file_size=fs,
            extra=json.loads(row["extra"] or "{}"),
            embedding=row["embedding"],
        )

    def vector(self) -> np.ndarray:
        return np.frombuffer(self.embedding, dtype=np.float32)

    @classmethod
    def for_photo(cls, *, path, vector, model, source_id="", item_key="",
                  model_version="", source_signature="", media_type="photo",
                  index_name="", extra=None, file_mtime=0.0, file_size=0) -> "VectorRecord":
        """便捷构造：照片类向量。"""
        vec = np.asarray(vector, dtype=np.float32)
        return cls(
            id=item_key or str(path),
            index_name=index_name,
            source_id=source_id,
            item_key=item_key or str(path),
            path=str(path),
            media_type=media_type,
            modality="image",
            model=model,
            model_version=model_version,
            dim=int(vec.size),
            source_signature=source_signature,
            created_at=_now_iso(),
            file_mtime=float(file_mtime),
            file_size=int(file_size),
            extra=extra or {},
            embedding=vec.tobytes(),
        )


@dataclass
class ScoredRecord:
    """检索结果：完整溯源记录 + 相似度分数。"""

    record: VectorRecord
    score: float
