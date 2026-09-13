"""全量视觉题材统计：复用 semantic-image 向量，不走搜索 Top-K 或集锦聚类。"""
from __future__ import annotations

import json
import sqlite3
import threading
import time
from contextlib import contextmanager
from pathlib import Path

import numpy as np

from .classifier import classify_score_matrix, select_diverse_samples, weighted_primary_contributions
from .taxonomy import (
    PRIMARY_LABELS,
    TAXONOMY_VERSION,
    UNCERTAIN_KEY,
    UNCERTAIN_LABEL,
)

SAMPLE_LIMIT = 6
SAMPLE_SIMILARITY_THRESHOLD = 0.94


def _log(message: str) -> None:
    stamp = time.strftime("%H:%M:%S")
    print(f"[{stamp}][visual_stats] {message}", flush=True)


class VisualStatsModule:
    def setup(self, ctx: dict) -> None:
        self._storage = ctx.get("storage")
        self._push = ctx.get("push")
        self._config = ctx.get("config")
        try:
            if self._config is not None and self._config.get("sample_dedup_thresh") is None:
                self._config.set("sample_dedup_thresh", SAMPLE_SIMILARITY_THRESHOLD)
        except Exception as exc:
            _log(f"保存样本去重阈值失败: {exc}")
        data_dir = Path(ctx.get("data_dir") or (Path(__file__).resolve().parents[3] / "data"))
        self._db_path = data_dir / "plugins" / "visual_stats" / "results.db"
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._thread: threading.Thread | None = None
        self._last_error = ""
        self._text_matrix = None
        self._text_model = ""
        self._ensure_schema()
        _log(f"已加载 taxonomy={TAXONOMY_VERSION} db={self._db_path}")

    def api_methods(self) -> dict:
        return {
            "status": self.status,
            "analyze": self.analyze,
            "stats": self.stats,
            "photos": self.photos,
            "clear": self.clear,
        }

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(str(self._db_path), timeout=30)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS photo_labels (
                    source_id TEXT NOT NULL,
                    item_key TEXT NOT NULL,
                    photo_id INTEGER NOT NULL,
                    path TEXT NOT NULL,
                    vector_signature TEXT NOT NULL,
                    taxonomy_version TEXT NOT NULL,
                    model TEXT NOT NULL,
                    primary_key TEXT NOT NULL,
                    primary_label TEXT NOT NULL,
                    primary_score REAL NOT NULL,
                    margin REAL NOT NULL,
                    uncertain INTEGER NOT NULL DEFAULT 0,
                    secondary_json TEXT NOT NULL,
                    scores_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY(source_id, item_key, taxonomy_version)
                );
                CREATE INDEX IF NOT EXISTS idx_visual_labels_source
                    ON photo_labels(source_id, taxonomy_version);
                """
            )

    def _push_event(self, event: str, data: dict) -> None:
        try:
            if self._push:
                self._push(event, data)
        except Exception as exc:
            _log(f"事件推送失败 event={event}: {exc}")

    def _source_id(self, source_id: str) -> str:
        return str(source_id or "").strip()

    def _eligible_photos(self, source_id: str) -> list[dict]:
        if self._storage is None:
            return []
        return list(self._storage.iter_indexable_photos(source_id=source_id))

    def _root_path(self, source_id: str) -> str:
        try:
            return str(self._storage.source_state(source_id).get("root_path") or "")
        except Exception:
            return ""

    def _vector_rows(self, source_id: str, root_path: str, include_embeddings: bool = True) -> list[sqlite3.Row]:
        from plugins.semantic_search.vector_core.store import VectorStore

        embedding_column = ", embedding" if include_embeddings else ""
        store = VectorStore(index_name="semantic-image")
        with store._connect() as conn:
            rows = conn.execute(
                f"SELECT id, source_id, item_key, path, model, source_signature, dim{embedding_column} "
                "FROM vector_records WHERE index_name=? AND source_id=?",
                (store.index_name, source_id),
            ).fetchall()
            if not rows and root_path:
                all_rows = conn.execute(
                    f"SELECT id, source_id, item_key, path, model, source_signature, dim{embedding_column} "
                    "FROM vector_records WHERE index_name=?",
                    (store.index_name,),
                ).fetchall()
                prefix = root_path.casefold()
                rows = [r for r in all_rows if str(r["path"] or "").casefold().startswith(prefix)]
        return rows

    @staticmethod
    def _row_key(row: dict) -> tuple[str, str]:
        return str(row.get("path") or ""), str(row.get("relative_path") or "")

    def _match_vectors(self, photos: list[dict], rows: list[sqlite3.Row], include_embeddings: bool = True) -> list[dict]:
        by_key: dict[str, dict] = {}
        for photo in photos:
            path, rel = self._row_key(photo)
            if path:
                by_key[path] = photo
            if rel:
                by_key[rel] = photo
        matched = []
        for row in rows:
            path = str(row["path"] or "")
            item_key = str(row["item_key"] or "")
            photo = by_key.get(path) or by_key.get(item_key)
            if photo is None and path:
                # 兼容旧向量记录的绝对路径与当前 source 的相对路径不一致。
                for candidate in photos:
                    if path.casefold().endswith(str(candidate.get("relative_path") or "").casefold()):
                        photo = candidate
                        break
            if photo is None:
                continue
            if not include_embeddings:
                if int(row["dim"] or 0) > 0:
                    matched.append({"row": row, "photo": photo})
                continue
            try:
                vector = np.frombuffer(row["embedding"], dtype=np.float32)
            except Exception:
                continue
            if int(row["dim"] or 0) != vector.size or vector.size == 0:
                continue
            matched.append({"row": row, "photo": photo, "vector": vector})
        return matched

    def _text_prototypes(self) -> tuple[np.ndarray, str]:
        if self._text_matrix is not None:
            return self._text_matrix, self._text_model
        from app.modules.semantic_search.backend import _get_encoder

        encoder = _get_encoder()
        templates = ("{q}", "一张{q}的照片", "{q}的照片", "这是{q}")
        texts = []
        for item in PRIMARY_LABELS:
            for prompt in item["prompts"]:
                for template in templates:
                    texts.append(template.format(q=prompt))
        raw = np.asarray(encoder.encode_texts(texts), dtype=np.float32)
        per_label = len(item["prompts"]) * len(templates)
        prototypes = []
        for index in range(len(PRIMARY_LABELS)):
            vector = raw[index * per_label : (index + 1) * per_label].mean(axis=0)
            vector = vector / max(float(np.linalg.norm(vector)), 1e-9)
            prototypes.append(vector)
        self._text_matrix = np.vstack(prototypes).astype(np.float32)
        self._text_model = str(getattr(encoder, "model_id", "chinese-clip"))
        _log(f"文本标签原型已缓存 labels={len(PRIMARY_LABELS)} model={self._text_model}")
        return self._text_matrix, self._text_model

    def _thresholds(self) -> tuple[float, float]:
        min_margin = 0.012
        secondary_gap = 0.025
        try:
            if self._config is not None:
                if self._config.get("min_margin") is not None:
                    min_margin = float(self._config.get("min_margin"))
                if self._config.get("secondary_gap") is not None:
                    secondary_gap = float(self._config.get("secondary_gap"))
        except Exception as exc:
            _log(f"读取阈值配置失败，使用默认值: {exc}")
        return max(0.0, min_margin), max(0.0, secondary_gap)

    def _sample_similarity_threshold(self) -> float:
        threshold = SAMPLE_SIMILARITY_THRESHOLD
        try:
            if self._config is not None and self._config.get("sample_dedup_thresh") is not None:
                threshold = float(self._config.get("sample_dedup_thresh"))
        except Exception as exc:
            _log(f"读取样本去重阈值失败: {exc}")
        return max(0.0, min(1.0, threshold))

    def status(self, source_id: str = "") -> dict:
        sid = self._source_id(source_id)
        if not sid:
            return {"success": False, "message": "需提供 source_id"}
        try:
            photos = self._eligible_photos(sid)
            root_path = self._root_path(sid)
            rows = self._vector_rows(sid, root_path)
            matched = self._match_vectors(photos, rows)
            with self._connect() as conn:
                label_rows = conn.execute(
                    "SELECT item_key, vector_signature FROM photo_labels WHERE source_id=? AND taxonomy_version=?",
                    (sid, TAXONOMY_VERSION),
                ).fetchall()
            classified_keys = {(str(row["item_key"]), str(row["vector_signature"] or "")) for row in label_rows}
            classified = 0
            for item in matched:
                photo = item["photo"]
                vector_row = item["row"]
                item_key = str(photo.get("relative_path") or vector_row["item_key"] or vector_row["path"])
                signature = str(vector_row["source_signature"] or "")
                if (item_key, signature) in classified_keys:
                    classified += 1
            running = bool(self._thread and self._thread.is_alive())
            return {
                "success": True,
                "source_id": sid,
                "taxonomy_version": TAXONOMY_VERSION,
                "total_eligible": len(photos),
                "vector_count": len(matched),
                "classified_count": int(classified),
                "index_missing_count": max(0, len(photos) - len(matched)),
                "stale_count": max(0, len(matched) - classified),
                "running": running,
                "error": self._last_error,
            }
        except Exception as exc:
            _log(f"status 失败 source={sid}: {exc}")
            return {"success": False, "message": str(exc), "running": False}

    def analyze(self, source_id: str = "", force: bool = False) -> dict:
        sid = self._source_id(source_id)
        if not sid:
            return {"success": False, "message": "需提供 source_id"}
        with self._lock:
            if self._thread and self._thread.is_alive():
                return {"success": True, "running": True, "message": "分析已在进行中"}
            self._last_error = ""
            worker = threading.Thread(target=self._run_analyze, args=(sid, bool(force)), name="visual-stats", daemon=True)
            self._thread = worker
            worker.start()
        _log(f"已开始全量题材分析 source={sid} force={bool(force)}")
        return {"success": True, "running": True, "source_id": sid}

    def _run_analyze(self, source_id: str, force: bool) -> None:
        started = time.time()
        try:
            photos = self._eligible_photos(source_id)
            root_path = self._root_path(source_id)
            rows = self._vector_rows(source_id, root_path)
            matched = self._match_vectors(photos, rows)
            self._push_event("visual_stats_progress", {"source_id": source_id, "phase": "matching", "done": len(matched), "total": len(photos)})
            if not matched:
                raise RuntimeError("当前来源没有可用语义向量，请先完成语义索引")
            prototypes, model = self._text_prototypes()
            matrix = np.vstack([item["vector"] for item in matched]).astype(np.float32)
            matrix = matrix / np.maximum(np.linalg.norm(matrix, axis=1, keepdims=True), 1e-9)
            scores = matrix @ prototypes.T
            min_margin, secondary_gap = self._thresholds()
            results = classify_score_matrix(scores, PRIMARY_LABELS, min_margin=min_margin, secondary_gap=secondary_gap)
            now = time.strftime("%Y-%m-%d %H:%M:%S")
            with self._connect() as conn:
                seen_keys = []
                for item, result in zip(matched, results):
                    row = item["row"]
                    photo = item["photo"]
                    item_key = str(photo.get("relative_path") or row["item_key"] or row["path"])
                    seen_keys.append(item_key)
                    conn.execute(
                        """INSERT INTO photo_labels
                        (source_id,item_key,photo_id,path,vector_signature,taxonomy_version,model,
                         primary_key,primary_label,primary_score,margin,uncertain,secondary_json,scores_json,updated_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        ON CONFLICT(source_id,item_key,taxonomy_version) DO UPDATE SET
                         photo_id=excluded.photo_id,path=excluded.path,vector_signature=excluded.vector_signature,
                         model=excluded.model,primary_key=excluded.primary_key,primary_label=excluded.primary_label,
                         primary_score=excluded.primary_score,margin=excluded.margin,uncertain=excluded.uncertain,
                         secondary_json=excluded.secondary_json,scores_json=excluded.scores_json,updated_at=excluded.updated_at""",
                        (
                            source_id,
                            item_key,
                            int(photo.get("id") or 0),
                            str(photo.get("path") or row["path"] or ""),
                            str(row["source_signature"] or ""),
                            TAXONOMY_VERSION,
                            model,
                            result["primary_key"],
                            result["primary_label"],
                            float(result["primary_score"]),
                            float(result["margin"]),
                            int(bool(result["uncertain"])),
                            json.dumps(result["secondary"], ensure_ascii=False),
                            json.dumps(result["scores"], ensure_ascii=False),
                            now,
                        ),
                    )
                if seen_keys:
                    placeholders = ",".join("?" for _ in seen_keys)
                    conn.execute(
                        f"DELETE FROM photo_labels WHERE source_id=? AND taxonomy_version=? AND item_key NOT IN ({placeholders})",
                        [source_id, TAXONOMY_VERSION, *seen_keys],
                    )
            elapsed = time.time() - started
            self._last_error = ""
            _log(f"题材分析完成 source={source_id} photos={len(photos)} vectors={len(matched)} elapsed={elapsed:.1f}s")
            self._push_event("visual_stats_done", {"source_id": source_id, "classified": len(results), "elapsed": elapsed})
        except Exception as exc:
            self._last_error = str(exc)
            _log(f"题材分析失败 source={source_id}: {exc}")
            self._push_event("visual_stats_done", {"source_id": source_id, "error": str(exc)})

    def stats(self, source_id: str = "") -> dict:
        sid = self._source_id(source_id)
        if not sid:
            return {"success": False, "message": "需提供 source_id"}
        state = self.status(sid)
        if not state.get("success"):
            return state
        photos = self._eligible_photos(sid)
        vector_rows = self._vector_rows(sid, self._root_path(sid))
        matched = self._match_vectors(photos, vector_rows)
        sample_vectors = {}
        for item in matched:
            photo_id = int(item["photo"].get("id") or 0)
            if photo_id:
                sample_vectors[photo_id] = np.asarray(item["vector"], dtype=np.float32)
        valid_keys = set()
        for item in matched:
            photo = item["photo"]
            vector_row = item["row"]
            item_key = str(photo.get("relative_path") or vector_row["item_key"] or vector_row["path"])
            signature = str(vector_row["source_signature"] or "")
            valid_keys.add((item_key, signature))
        # 按当前向量已核对的 (item_key, signature) 聚合，避免旧结果污染比例。
        with self._connect() as conn:
            raw_rows = conn.execute(
                "SELECT item_key, vector_signature, primary_key, scores_json, photo_id "
                "FROM photo_labels WHERE source_id=? AND taxonomy_version=?",
                (sid, TAXONOMY_VERSION),
            ).fetchall()
        label_lookup = {str(item["key"]): str(item["label"]) for item in PRIMARY_LABELS}
        counts: dict[str, float] = {}
        score_totals: dict[str, float] = {}
        sample_rows: dict[str, dict[int, dict]] = {}
        uncertain = 0
        classified_total = 0
        min_margin, _ = self._thresholds()
        for row in raw_rows:
            if (str(row["item_key"]), str(row["vector_signature"] or "")) not in valid_keys:
                continue
            classified_total += 1
            primary_key = str(row["primary_key"])
            if primary_key == UNCERTAIN_KEY:
                uncertain += 1
            try:
                scores = json.loads(str(row["scores_json"] or "{}"))
                contributions = weighted_primary_contributions(scores, PRIMARY_LABELS, min_margin=min_margin)
            except (TypeError, ValueError, json.JSONDecodeError) as exc:
                _log(f"题材贡献计算失败 item={row['item_key']}: {exc}")
                raise RuntimeError(f"题材结果损坏，无法计算统计: {row['item_key']}") from exc
            for contribution in contributions:
                key = str(contribution["key"])
                weight = float(contribution["weight"])
                counts[key] = counts.get(key, 0.0) + weight
                score_totals[key] = score_totals.get(key, 0.0) + weight * float(scores[key])
                photo_id = int(row["photo_id"] or 0)
                if photo_id:
                    by_photo = sample_rows.setdefault(key, {})
                    candidate = {
                        "photo_id": photo_id,
                        "weight": round(weight, 4),
                        "score": round(float(scores[key]), 6),
                    }
                    previous = by_photo.get(photo_id)
                    if previous is None or candidate["weight"] > previous["weight"]:
                        by_photo[photo_id] = candidate
        total = sum(counts.values())
        labels = [
            {
                "key": key,
                "label": label_lookup[key],
                "count": round(value, 4),
                "percent": (value / total * 100.0) if total else 0.0,
                "mean_score": (score_totals[key] / value) if value else 0.0,
            }
            for key, value in counts.items()
        ]
        labels.sort(key=lambda row: (-row["count"], row["label"]))
        for item in labels:
            candidates = list(sample_rows.get(item["key"], {}).values())
            item["samples"] = select_diverse_samples(
                candidates,
                sample_vectors,
                limit=SAMPLE_LIMIT,
                similarity_threshold=self._sample_similarity_threshold(),
            )
        return {
            "success": True,
            "source_id": sid,
            "taxonomy_version": TAXONOMY_VERSION,
            "labels": labels,
            "total_classified": classified_total,
            "weighted_total": total,
            "uncertain_count": int(uncertain),
            "uncertain_label": UNCERTAIN_LABEL,
            "aggregation_mode": "weighted_exclusive",
            "coverage": state,
        }

    def photos(self, source_id: str = "", label_key: str = "", after_id: int = 0, limit: int = 48) -> dict:
        """Return all contributing photos, without representative-sample deduplication."""
        sid = self._source_id(source_id)
        if not sid or label_key not in {str(item["key"]) for item in PRIMARY_LABELS}:
            return {"success": False, "message": "来源或题材无效"}
        try:
            after_id = max(0, int(after_id))
            limit = max(1, min(96, int(limit)))
            eligible = self._eligible_photos(sid)
            vectors = self._vector_rows(sid, self._root_path(sid), include_embeddings=False)
            matched = self._match_vectors(eligible, vectors, include_embeddings=False)
            valid = {}
            for item in matched:
                photo, vector = item["photo"], item["row"]
                key = str(photo.get("relative_path") or vector["item_key"] or vector["path"])
                valid[(key, str(vector["source_signature"] or ""))] = photo
            with self._connect() as conn:
                rows = conn.execute(
                    "SELECT item_key, vector_signature, scores_json FROM photo_labels "
                    "WHERE source_id=? AND taxonomy_version=?",
                    (sid, TAXONOMY_VERSION),
                ).fetchall()
            margin, _ = self._thresholds()
            candidates = {}
            for row in rows:
                photo = valid.get((str(row["item_key"]), str(row["vector_signature"] or "")))
                if photo is None:
                    continue
                contributions = weighted_primary_contributions(
                    json.loads(row["scores_json"]), PRIMARY_LABELS, min_margin=margin,
                )
                if any(item["key"] == label_key and item["weight"] > 0 for item in contributions):
                    photo_id = int(photo["id"])
                    candidates[photo_id] = {"photo_id": photo_id, "filename": Path(photo["path"]).name}
            ordered = sorted(candidates)
            remaining = [key for key in ordered if key > after_id]
            page = remaining[:limit]
            _log(f"题材筛选 source={sid} label={label_key} after={after_id} returned={len(page)} total={len(ordered)}")
            return {"success": True, "items": [candidates[key] for key in page],
                    "total": len(ordered), "next_after": page[-1] if page else after_id,
                    "has_more": len(remaining) > len(page)}
        except Exception as exc:
            _log(f"题材筛选失败 source={sid} label={label_key}: {exc}")
            return {"success": False, "message": str(exc)}

    def clear(self, source_id: str = "") -> dict:
        sid = self._source_id(source_id)
        if not sid:
            return {"success": False, "message": "需提供 source_id"}
        with self._connect() as conn:
            cur = conn.execute(
                "DELETE FROM photo_labels WHERE source_id=? AND taxonomy_version=?",
                (sid, TAXONOMY_VERSION),
            )
        return {"success": True, "deleted": int(cur.rowcount or 0), "source_id": sid}


MODULE_CLASS = VisualStatsModule
