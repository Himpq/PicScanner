"""VectorIndexRegistry：命名索引注册表，多库共存的统一入口。"""
from __future__ import annotations

from .store import VectorStore


class VectorIndexRegistry:
    def __init__(self):
        self._stores: dict[str, VectorStore] = {}

    def register(self, name: str, store: VectorStore) -> None:
        self._stores[name] = store

    def get(self, name: str) -> VectorStore | None:
        return self._stores.get(name)

    def list(self) -> list[str]:
        return list(self._stores.keys())

    def search_across(self, names: list[str], query_mat, top_k: int = 8) -> dict[str, list]:
        out: dict[str, list] = {}
        for n in names:
            store = self._stores.get(n)
            if store is None:
                continue
            out[n] = store.search(query_mat, top_k=top_k)
        return out


_registry = VectorIndexRegistry()


def registry() -> VectorIndexRegistry:
    return _registry
