"""向量库后端抽象。

当前实现 NumpyBackend（精确余弦、零依赖、万级够用）。
Faiss / SqliteVec / Lance 为预留桩：规模到百万级或需要持久 ANN 时再实现，
上层 VectorStore 只依赖 VectorBackend 接口，换库不改逻辑。
"""
from __future__ import annotations

import abc

import numpy as np


class VectorBackend(abc.ABC):
    """向量索引后端协议。id 为字符串，vector 为 float32 一维数组。"""

    @abc.abstractmethod
    def add(self, ids: list[str], vectors: np.ndarray) -> None: ...

    @abc.abstractmethod
    def query(self, vector: np.ndarray, top_k: int) -> list[tuple[str, float]]: ...

    @abc.abstractmethod
    def remove(self, ids: list[str]) -> None: ...

    @abc.abstractmethod
    def rebuild(self, ids: list[str], vectors: np.ndarray) -> None: ...

    def score_all(self, vector: np.ndarray) -> dict[str, float]:
        """返回全部 id 与余弦分（供上层做多模板取最大 / 过滤）。"""
        raise NotImplementedError


class NumpyBackend(VectorBackend):
    """精确余弦检索，结果存于内存字典。"""

    def __init__(self):
        self._data: dict[str, np.ndarray] = {}

    def add(self, ids: list[str], vectors: np.ndarray) -> None:
        vectors = np.asarray(vectors, dtype=np.float32)
        for rid, vec in zip(ids, vectors):
            self._data[rid] = np.asarray(vec, dtype=np.float32)

    def rebuild(self, ids: list[str], vectors: np.ndarray) -> None:
        self.add(ids, vectors)

    def remove(self, ids: list[str]) -> None:
        for rid in ids:
            self._data.pop(rid, None)

    def score_all(self, vector: np.ndarray) -> dict[str, float]:
        if not self._data:
            return {}
        ids = list(self._data.keys())
        mat = np.vstack([self._data[i] for i in ids])
        q = np.asarray(vector, dtype=np.float32)
        q = q / (np.linalg.norm(q) + 1e-9)
        sims = (mat @ q).tolist()
        return {rid: float(s) for rid, s in zip(ids, sims)}

    def query(self, vector: np.ndarray, top_k: int) -> list[tuple[str, float]]:
        scores = self.score_all(vector)
        if not scores:
            return []
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        return ranked[: max(1, int(top_k))]


class _StubBackend(VectorBackend):
    """预留后端桩：实现接口但暂未落地，避免误用。

    实现指引：后端应持有持久化索引；query 返回 (id, cosine) 列表；
    多模板「取最大」由 VectorStore 在 score_all 之上合并，故桩也需实现 score_all。
    """

    name = "stub"

    def add(self, ids: list[str], vectors: np.ndarray) -> None:
        raise NotImplementedError(f"{self.name} 后端尚未实现")

    def query(self, vector: np.ndarray, top_k: int) -> list[tuple[str, float]]:
        raise NotImplementedError(f"{self.name} 后端尚未实现")

    def remove(self, ids: list[str]) -> None:
        raise NotImplementedError(f"{self.name} 后端尚未实现")

    def rebuild(self, ids: list[str], vectors: np.ndarray) -> None:
        raise NotImplementedError(f"{self.name} 后端尚未实现")


class FaissBackend(_StubBackend):
    """Faiss 近似最近邻（百万级规模时启用）。"""

    name = "faiss"


class SqliteVecBackend(_StubBackend):
    """sqlite-vec 扩展，向量与照片同库持久化。"""

    name = "sqlite_vec"


class LanceBackend(_StubBackend):
    """LanceDB 列式向量库，适合超大规模与版本管理。"""

    name = "lance"
