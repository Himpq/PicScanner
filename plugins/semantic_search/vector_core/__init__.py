"""vector_core：多向量库 + 可追溯向量的核心层。

设计目标（见 ARCHITECTURE.md）：
- 不同向量库可共存：VectorBackend 抽象 + 命名索引注册表；
- 每个向量带完整溯源：VectorRecord 全字段 + 显式列表列；
- 方便回溯与查找：ScoredRecord 带 model/source/created_at，注册表统一入口。

本包不在主程序体内，由语义插件复用；主程序的 Storage 只负责照片清单，
向量相关全部在此层。
"""
from .record import VectorRecord, ScoredRecord
from .backend import VectorBackend, NumpyBackend, FaissBackend, SqliteVecBackend, LanceBackend
from .store import VectorStore
from .registry import VectorIndexRegistry, registry

__all__ = [
    "VectorRecord",
    "ScoredRecord",
    "VectorBackend",
    "NumpyBackend",
    "FaissBackend",
    "SqliteVecBackend",
    "LanceBackend",
    "VectorStore",
    "VectorIndexRegistry",
    "registry",
]
