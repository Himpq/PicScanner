"""人脸聚类模块：EXIF下方手动扫描，人脸按人物聚类。

- 检测+识别：优先 YuNet+SFace（~3MB CPU），缺模型/依赖回退 dummy，保证演示不断
- 存储：plugins.face_cluster vector_core face-identity 索引，media_type=face
- 增量：mtime:size，不做 Path.stat 风暴，todo==0 不导库
"""
from __future__ import annotations

import threading
import time
from pathlib import Path


def _log(msg: str) -> None:
    import datetime as _dt

    ts = _dt.datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{ts}][face_cluster] {msg}", flush=True)


_cached_encoder = None
_cached_encoder_id = None


def _get_encoder():
    global _cached_encoder, _cached_encoder_id
    from plugins.face_cluster.encoder import MODEL_ID, MODEL_VERSION  # noqa

    key = f"{MODEL_ID}:{MODEL_VERSION}"
    if _cached_encoder is not None and _cached_encoder_id == key:
        return _cached_encoder
    from plugins.face_cluster.encoder import FaceEncoder

    enc = FaceEncoder()
    _cached_encoder = enc
    _cached_encoder_id = key
    return enc


class FaceClusterModule:
    def setup(self, ctx: dict) -> None:
        self._ctx = ctx
        self._storage = ctx.get("storage")
        self._scanner = ctx.get("scanner")
        self._push = ctx.get("push")
        self._data_dir = ctx.get("data_dir")
        self._config = ctx.get("config")
        try:
            if self._config is not None:
                from pathlib import Path as _P
                _r50_exists = (_P(__file__).resolve().parents[2] / "data" / "plugins" / "face_cluster" / "model" / "w600k_r50.onnx").exists()
                _mbf_exists = (_P(__file__).resolve().parents[2] / "data" / "plugins" / "face_cluster" / "model" / "w600k_mbf.onnx").exists()
                if _r50_exists:
                    _default_thresh = 0.40
                elif _mbf_exists:
                    _default_thresh = 0.32
                else:
                    _default_thresh = 0.45
                if self._config.get("cluster_thresh") is None:
                    self._config.set("cluster_thresh", _default_thresh)
                else:
                    try:
                        cur = float(self._config.get("cluster_thresh"))
                        if _r50_exists and abs(cur - 0.32) < 1e-6:
                            self._config.set("cluster_thresh", 0.40)
                        elif _r50_exists and abs(cur - 0.45) < 1e-6:
                            self._config.set("cluster_thresh", 0.40)
                        elif _mbf_exists and abs(cur - 0.45) < 1e-6:
                            self._config.set("cluster_thresh", 0.32)
                    except Exception:
                        pass
                if self._config.get("face_thresh") is None:
                    self._config.set("face_thresh", 0.6)
        except Exception:
            pass
        self._index_thread: threading.Thread | None = None
        self._index_stop = threading.Event()
        self._lock = threading.RLock()
        scanner = self._scanner
        if scanner is not None and hasattr(scanner, "on_scan_finished"):
            try:
                scanner.on_scan_finished(self._on_scan_finished)
                _log("已注册扫描完成钩子（默认不自动）")
            except Exception as exc:
                _log(f"注册钩子失败: {exc}")

    def _log_frontend(self, msg: str = ""):
        _log(f"[frontend] {msg}")
        return {"success": True}

    def api_methods(self) -> dict:
        return {
            "log": self._log_frontend,
            "build_index": self.build_index,
            "index_status": self.index_status,
            "cancel_index": self.cancel_index,
            "clear_index": self.clear_index,
            "clusters": self.clusters,
            "search_by_face": self.search_by_face,
            "search": self.search_by_face,  # 别名，便于复用
        }

    def _on_scan_finished(self, root_path: str, source_id: str, status: str) -> None:
        if status not in ("done", "paused", "stopped"):
            return
        auto = False
        try:
            if self._config is not None:
                auto = bool(self._config.get("auto_index", False))
        except Exception:
            pass
        if not auto:
            return
        self._spawn_index_thread(source_id=source_id, root_path=root_path)

    def _spawn_index_thread(self, source_id: str = "", root_path: str = "") -> None:
        with self._lock:
            if self._index_thread and self._index_thread.is_alive():
                _log("索引任务进行中，跳过")
                return
            self._index_stop.clear()
            t = threading.Thread(target=self._run_index, args=(source_id, root_path), daemon=True)
            self._index_thread = t
            t.start()

    def _push_event(self, event: str, data: dict) -> None:
        push = self._push
        if push is None:
            return
        try:
            push(event, data)
        except Exception:
            pass

    def _run_index(self, source_id: str, root_path: str) -> None:
        _log(f"收到扫描请求 source={source_id or '*'} root={root_path or '*'}")
        storage = self._storage
        if storage is None:
            _log("无 storage")
            return
        import time as _t

        _t0 = _t.time()
        try:
            photos = storage.iter_indexable_photos(source_id=source_id or None, root_path=root_path or None)
        except Exception as exc:
            _log(f"读取清单失败: {exc}")
            return
        _log(f"iter_indexable_photos {len(photos)} 张 用时 {_t.time()-_t0:.3f}s")

        _ta = _t.time()
        try:
            from plugins.semantic_search.vector_core.store import VectorStore
            from plugins.semantic_search.vector_core.record import VectorRecord

            _log(f"import vector_core 用时 {_t.time()-_ta:.3f}s")
        except Exception as exc:
            _log(f"向量依赖缺失: {exc}")
            return
        try:
            from app.backend.thumbnailer import existing_thumbnail

            _log("thumbnailer ok")
        except Exception:
            existing_thumbnail = None  # type: ignore

        if not photos:
            self._push_event("face_index_progress", {"phase": "done", "done": 0, "total": 0, "source_id": source_id})
            self._push_event("face_index_done", {"source_id": source_id, "total": 0})
            return

        global _store_cache
        try:
            _store_cache
        except NameError:
            _store_cache = {}
        cache_key = "face-identity"
        store = _store_cache.get(cache_key)
        if store is None:
            _t2 = _t.time()
            store = VectorStore(index_name="face-identity")
            _store_cache[cache_key] = store
            _log(f"VectorStore 首次加载 用时 {_t.time()-_t2:.3f}s count={store.count()}")
        else:
            _log(f"VectorStore 缓存命中 count={store.count()}")

        _t3 = _t.time()
        known = store.known_signatures()
        _log(f"known_signatures {len(known)} 条 用时 {_t.time()-_t3:.3f}s")

        known_photo = {}
        for k, v in known.items():
            base = k.split("#face")[0]
            if base not in known_photo:
                known_photo[base] = v
        pending = []
        for p in photos:
            path = str(p.get("path") or "")
            try:
                sig = (float(p.get("mtime") or 0), int(p.get("size") or 0))
            except Exception:
                sig = (0.0, 0)
            old = known_photo.get(path)
            if old is None or old != sig:
                pending.append(p)
        _log(f"pending todo={len(pending)}")

        total = len(photos)
        todo = len(pending)
        already = total - todo
        _log(f"人脸索引：共 {total} 张待检增量 {todo} 张 已完成 {already}")
        # 累累计数：前端进度条按 total 走，停止后重扫不会归零
        self._push_event("face_index_progress", {"phase": "scanning_db", "done": already, "total": total, "source_id": source_id, "already": already})
        if todo == 0:
            self._push_event("face_index_progress", {"phase": "done", "done": total, "total": total, "source_id": source_id})
            self._push_event("face_index_done", {"source_id": source_id, "total": total, "new": 0})
            return

        # 仅真有增量才导编码器（省 0.5-1s）
        self._push_event("face_index_progress", {"phase": "loading_model", "done": already, "total": total, "source_id": source_id})
        try:
            from plugins.face_cluster.encoder import MODEL_ID, MBF_MODEL_ID, load_image_rgb  # type: ignore
            from plugins.semantic_search.vector_core.record import VectorRecord as VR

            encoder = _get_encoder()
            mode = getattr(encoder, "mode", "unknown")
            active_model = getattr(encoder, "_active_model_id", getattr(encoder, "ort_model_id", MODEL_ID) if hasattr(encoder, "ort_model_id") else MODEL_ID)
            # 兼容 MBF 512 维阈值提示
            _log(f"编码器就绪 mode={mode} model={active_model} 待编码 {todo} 张")
        except Exception as exc:
            import traceback

            traceback.print_exc()
            _log(f"编码器加载失败: {exc}")
            self._push_event("face_index_progress", {"phase": "failed", "error": str(exc)})
            return

        self._push_event("face_index_progress", {"phase": "indexing", "done": already, "total": total, "source_id": source_id})
        done = 0
        face_total = 0
        started = time.time()
        for chunk_start in range(0, len(pending), 8):
            if self._index_stop.is_set():
                cur_done = already + done
                _log(f"人脸索引已停止 已处理 {done}/{todo} 累计 {cur_done}/{total}")
                self._push_event("face_index_progress", {"phase": "stopped", "done": cur_done, "total": total, "source_id": source_id, "faces": face_total})
                return
            chunk = pending[chunk_start : chunk_start + 8]
            for p in chunk:
                path = str(p["path"])
                src_path = path
                thumb = None
                if existing_thumbnail is not None:
                    try:
                        thumb = existing_thumbnail(path)
                    except Exception:
                        thumb = None
                if thumb is not None and Path(thumb).exists():
                    src_path = str(thumb)
                try:
                    pil = load_image_rgb(src_path)
                except Exception as exc:
                    _log(f"跳过无法读取 {path}: {exc}")
                    continue
                try:
                    faces = encoder.encode_faces(pil, path_hint=path)
                except Exception as exc:
                    _log(f"检测失败 {path}: {exc}")
                    continue
                if not faces:
                    # 无脸也算已处理，避免同图反复重扫
                    try:
                        mtime = float(p.get("mtime") or Path(path).stat().st_mtime)
                        size = int(p.get("size") or Path(path).stat().st_size)
                    except Exception:
                        mtime = float(p.get("mtime") or 0)
                        size = int(p.get("size") or 0)
                    # 写入一条占位记录标记已检（避免下次又当 pending），embedding 用零向量占位不参与聚类
                    try:
                        import numpy as _np

                        _d = 512 if getattr(encoder, "_mbf_mode", False) else 128
                        dummy = _np.zeros(_d, dtype=_np.float32)
                        rec = VR.for_photo(
                            path=f"{path}#face-1",
                            vector=dummy,
                            model=(getattr(encoder, "_active_model_id", MODEL_ID) if hasattr(encoder, "_active_model_id") else MODEL_ID) + "-no-face",
                            source_id=str(p.get("source_id") or source_id or ""),
                            item_key=str(p.get("relative_path") or p.get("path") or path) + "#face-1",
                            source_signature=f"{mtime}:{size}:no-face",
                            index_name="face-identity",
                            file_mtime=mtime,
                            file_size=size,
                            extra={"photo_path": path, "no_face": True},
                            media_type="face",
                        )
                        store.upsert(rec)
                    except Exception:
                        pass
                    continue
                for f in faces:
                    vec = f.get("embedding")
                    if vec is None:
                        continue
                    try:
                        mtime = float(p.get("mtime") or Path(path).stat().st_mtime)
                    except Exception:
                        mtime = float(p.get("mtime") or 0)
                    try:
                        size = int(p.get("size") or Path(path).stat().st_size)
                    except Exception:
                        size = int(p.get("size") or 0)
                    bbox = f.get("bbox")
                    rec = VR.for_photo(
                        path=f"{path}#face{int(f.get('face_index',0))}",
                        vector=vec,
                        model=active_model,
                        source_id=str(p.get("source_id") or source_id or ""),
                        item_key=str(p.get("relative_path") or p.get("path") or path) + f"#face{int(f.get('face_index',0))}",
                        source_signature=f"{mtime}:{size}:{int(f.get('face_index',0))}",
                        index_name="face-identity",
                        file_mtime=mtime,
                        file_size=size,
                        extra={"bbox": bbox, "face_index": int(f.get("face_index", 0)), "score": float(f.get("score", 0)), "photo_path": path},
                        media_type="face",
                    )
                    store.upsert(rec)
                    face_total += 1
            done += len(chunk)
            cur_done = already + done
            self._push_event("face_index_progress", {"phase": "indexing", "done": cur_done, "total": total, "source_id": source_id, "faces": face_total})

        elapsed = time.time() - started
        _log(f"人脸索引完成：{done}/{todo} 张图，{face_total} 张脸，用时 {elapsed:.1f}s mode={getattr(encoder,'mode','?')} 已有{already}张")
        self._push_event("face_index_progress", {"phase": "done", "done": total, "total": total, "source_id": source_id, "faces": face_total, "elapsed": elapsed})
        self._push_event("face_index_done", {"source_id": source_id, "new": face_total, "elapsed": elapsed})

    # ---------- 公开 API ----------
    def build_index(self, source_id: str = "", root_path: str = "", rebuild: bool = False):
        _log(f"build_index source={source_id or '*'} rebuild={rebuild}")
        if rebuild:
            try:
                from plugins.semantic_search.vector_core.store import VectorStore

                s = VectorStore(index_name="face-identity")
                with s._connect() as conn:
                    conn.execute("DELETE FROM vector_records WHERE index_name=?", (s.index_name,))
                s.backend = s.backend.__class__()
                global _store_cache
                _store_cache.pop("face-identity", None)
            except Exception as exc:
                return {"success": False, "message": str(exc)}
        self._spawn_index_thread(source_id=str(source_id or ""), root_path=str(root_path or ""))
        return {"success": True}

    def cancel_index(self):
        self._index_stop.set()
        return {"success": True}

    def clear_index(self, source_id: str = ""):
        try:
            from plugins.semantic_search.vector_core.store import VectorStore

            s = VectorStore(index_name="face-identity")
            if source_id:
                with s._connect() as conn:
                    conn.execute("DELETE FROM vector_records WHERE index_name=? AND source_id=?", (s.index_name, str(source_id)))
            else:
                with s._connect() as conn:
                    conn.execute("DELETE FROM vector_records WHERE index_name=?", (s.index_name,))
            s.backend = s.backend.__class__()
            global _store_cache
            try:
                _store_cache.pop("face-identity", None)
            except Exception:
                pass
            return {"success": True}
        except Exception as exc:
            return {"success": False, "message": str(exc)}

    def index_status(self, source_id: str = ""):
        try:
            from plugins.semantic_search.vector_core.store import VectorStore

            s = VectorStore(index_name="face-identity")
            sid = str(source_id).strip()
            # 过滤 no-face 占位
            try:
                with s._connect() as conn:
                    if sid:
                        total = conn.execute("SELECT COUNT(*) FROM vector_records WHERE index_name=? AND source_id=? AND model NOT LIKE '%no-face%'", (s.index_name, sid)).fetchone()[0]
                    else:
                        total = conn.execute("SELECT COUNT(*) FROM vector_records WHERE index_name=? AND model NOT LIKE '%no-face%'", (s.index_name,)).fetchone()[0]
            except Exception:
                total = s.count(source_id=sid) if sid else s.count()
            audit = s.audit()
            if sid:
                audit = {k: v for k, v in audit.items() if k in ("index", "total")}
                audit["total"] = total
                audit["source_id"] = sid
            # 顺便看编码器模式
            mode = "unknown"
            try:
                enc = _get_encoder()
                mode = getattr(enc, "mode", "unknown")
            except Exception:
                mode = "not_loaded"
            return {"success": True, "total": total, "audit": audit, "mode": mode, "running": bool(self._index_thread and self._index_thread.is_alive())}
        except Exception as exc:
            return {"success": False, "message": str(exc)}

    def _enrich_photo(self, rec, storage, filters=None):
        # 复用语义的富化：photo_row + preview_url
        photo_row = None
        if storage is not None:
            try:
                with storage._lock, storage._connect() as conn:
                    row = conn.execute(
                        "SELECT p.*, m.hidden as hidden, m.favorite as favorite FROM photos p LEFT JOIN source_marks m ON m.source_id=p.source_id AND m.item_type='photo' AND m.item_key=p.relative_path WHERE p.source_id=? AND p.relative_path=?",
                        (rec.source_id, rec.item_key.split("#face")[0]),
                    ).fetchone()
                    if row is None and rec.path:
                        pp = rec.extra.get("photo_path") if isinstance(rec.extra, dict) else rec.path.split("#face")[0]
                        row = conn.execute("SELECT p.*, m.hidden as hidden FROM photos p LEFT JOIN source_marks m ON m.source_id=p.source_id AND m.item_type='photo' AND m.item_key=p.relative_path WHERE p.path=?", (pp,)).fetchone()
                    if row is not None:
                        if row["hidden"]:
                            return None
                        if isinstance(filters, dict) and filters.get("favorite") and not row["favorite"]:
                            return None
                        photo_row = dict(row)
            except Exception:
                photo_row = None
        preview_url = ""
        try:
            from app.backend.thumbnailer import existing_thumbnail, existing_lightbox_preview
            from app.backend.api import _versioned_file_uri
            from app.backend.exif_reader import is_renderable_image

            ppath = str(photo_row.get("path") if photo_row else rec.extra.get("photo_path") if isinstance(rec.extra, dict) else rec.path.split("#face")[0])
            p = Path(ppath)
            if existing_thumbnail is not None:
                th = existing_thumbnail(ppath)
                if th is not None and _versioned_file_uri is not None:
                    preview_url = _versioned_file_uri(th)
            if not preview_url and existing_lightbox_preview is not None:
                try:
                    lb = existing_lightbox_preview(ppath)
                    if lb is not None and _versioned_file_uri is not None:
                        preview_url = _versioned_file_uri(lb)
                except Exception:
                    pass
            if not preview_url and p.exists() and _versioned_file_uri is not None:
                # 最后兜底：即使 RAW 不可直显也给 file://，前端 <img> 会尝试，缩略图/预览缺失时至少有原图可试
                try:
                    preview_url = _versioned_file_uri(p)
                except Exception:
                    preview_url = ""
            # 若仍为空且原图存在，直接拼 file://（兼容 lightbox 未生成）
            if not preview_url and p.exists():
                try:
                    preview_url = p.resolve().as_uri()
                except Exception:
                    preview_url = ""
        except Exception:
            preview_url = ""
        return photo_row, preview_url

    def clusters(self, source_id: str = "", thresh: float | None = None, top_k: int = 50):
        """按人物聚类：DBSCAN 简化版贪心，返回 [{cluster_id, size, faces:[{path, preview_url, score, bbox}]}]"""
        try:
            if thresh is None and self._config is not None:
                thresh = float(self._config.get("cluster_thresh") or 0.45)
        except Exception:
            thresh = 0.45
        thresh = float(thresh or 0.45)
        try:
            from plugins.semantic_search.vector_core.store import VectorStore
            import numpy as _np

            global _store_cache
            try:
                _store_cache
            except NameError:
                _store_cache = {}
            s = _store_cache.get("face-identity")
            if s is None:
                s = VectorStore(index_name="face-identity")
                _store_cache["face-identity"] = s
            # 拿全量（小库 brute force 即可，万级也还行；过大可用采样）
            flt = {"source_id": str(source_id)} if source_id else None
            # 借 search 接口拿全量：构造零向量取 top 大数
            all_recs = []
            with s._connect() as conn:
                q = "SELECT * FROM vector_records WHERE index_name=?"
                params: list = [s.index_name]
                if source_id:
                    q += " AND source_id=?"
                    params.append(str(source_id))
                for row in conn.execute(q, params).fetchall():
                    from plugins.semantic_search.vector_core.record import VectorRecord as VR

                    rec = VR.from_row(dict(row))
                    # 过滤无脸占位
                    try:
                        if isinstance(rec.extra, dict) and rec.extra.get("no_face"):
                            continue
                        if "no-face" in str(rec.model):
                            continue
                    except Exception:
                        pass
                    all_recs.append(rec)
            if not all_recs:
                return {"success": True, "clusters": [], "mode": getattr(_get_encoder(), "mode", "?")}
            vecs = []
            for r in all_recs:
                v = _np.frombuffer(r.embedding, dtype=_np.float32).astype(_np.float32)
                n = float(_np.linalg.norm(v))
                if n > 1e-9:
                    v = v / n
                vecs.append(v)
            vecs = _np.stack(vecs, axis=0)  # (N,128)
            # 贪心聚类
            N = len(all_recs)
            assigned = [-1] * N
            clusters: list[list[int]] = []
            cid = 0
            for i in range(N):
                if assigned[i] != -1:
                    continue
                clusters.append([i])
                assigned[i] = cid
                for j in range(i + 1, N):
                    if assigned[j] != -1:
                        continue
                    cos = float(vecs[i] @ vecs[j])
                    if cos >= thresh:
                        clusters[-1].append(j)
                        assigned[j] = cid
                cid += 1
            # 按大小排序
            clusters.sort(key=lambda c: len(c), reverse=True)
            clusters = clusters[: int(top_k or 50)]
            storage = self._storage
            out = []
            for idx, cl in enumerate(clusters):
                faces = []
                for fi in cl[:9]:  # 每簇预览 9 张
                    rec = all_recs[fi]
                    pr, preview_url = self._enrich_photo(rec, storage) or (None, "")
                    # 回退 preview
                    if not preview_url:
                        try:
                            pp = rec.extra.get("photo_path") if isinstance(rec.extra, dict) else rec.path.split("#face")[0]
                            preview_url = pp
                        except Exception:
                            preview_url = rec.path
                    faces.append(
                        {
                            "path": rec.path,
                            "photo_path": rec.extra.get("photo_path") if isinstance(rec.extra, dict) else rec.path,
                            "preview_url": preview_url,
                            "score": float(rec.extra.get("score", 0)) if isinstance(rec.extra, dict) else 0,
                            "bbox": rec.extra.get("bbox") if isinstance(rec.extra, dict) else None,
                            "item_key": rec.item_key,
                            "source_id": rec.source_id,
                            "cos_to_center": float(vecs[fi] @ vecs[cl[0]]),
                        }
                    )
                out.append({"cluster_id": idx, "size": len(cl), "faces": faces})
            _log(f"clusters thresh={thresh:.2f} N={N} -> {len(out)} 簇")
            # Python Terminal 日志：输出首簇首图 preview_url 便于排查右侧不加载
            if out and out[0].get("faces"):
                _log(f"clusters 首图 preview_url={out[0]['faces'][0].get('preview_url','')[:120]} photo={out[0]['faces'][0].get('photo_path','')[:80]}")
            return {"success": True, "clusters": out, "total_faces": N, "thresh": thresh}
        except Exception as exc:
            import traceback

            traceback.print_exc()
            return {"success": False, "message": str(exc)}

    def search_by_face(self, photo_path: str = "", photo_id: str = "", face_index: int = 0, top_k: int = 8, source_id: str = ""):
        # 支持按 photo_id/face_index 或上传路径查；演示期先支持 photo_path
        qpath = str(photo_path or "").strip()
        qid = str(photo_id or "").strip()
        if qid and not qpath and self._storage is not None:
            try:
                row = self._storage.get_photo(int(qid))
                if row:
                    qpath = str(row.get("path") or "")
            except Exception:
                pass
        if not qpath:
            return {"success": False, "message": "需提供 photo_path 或 photo_id"}
        try:
            from plugins.face_cluster.encoder import load_image_rgb

            enc = _get_encoder()
            pil = load_image_rgb(qpath)
            # 若图中有多脸，取 face_index 对应
            faces = enc.encode_faces(pil, path_hint=qpath)
            if not faces:
                return {"success": False, "message": "图中未检出人脸（dummy 模式会整图当一脸，若仍失败请检查文件）"}
            # 选 face_index
            faces.sort(key=lambda d: d.get("score", 0), reverse=True)
            qvec = None
            if 0 <= int(face_index or 0) < len(faces):
                qvec = faces[int(face_index)]["embedding"]
            else:
                qvec = faces[0]["embedding"]
            # 向量搜
            from plugins.semantic_search.vector_core.store import VectorStore
            import numpy as _np

            global _store_cache
            try:
                _store_cache
            except NameError:
                _store_cache = {}
            s = _store_cache.get("face-identity")
            if s is None:
                s = VectorStore(index_name="face-identity")
                _store_cache["face-identity"] = s
            flt = {"source_id": str(source_id)} if source_id else None
            # store.search 接受 (T,dim) 取列最大，这里单向量扩成 (1,dim)
            qmat = _np.asarray(qvec, dtype=_np.float32).reshape(1, -1)
            scored = s.search(qmat, top_k=int(top_k or 8) * 2, filters=flt)
            # 去掉自己
            storage = self._storage
            results = []
            for sc in scored:
                rec = sc.record
                # 跳过查询图本身的第一条（path 完全相同）
                if rec.path == f"{qpath}#face{face_index}":
                    continue
                pr, preview_url = self._enrich_photo(rec, storage) or (None, "")
                if pr is None and rec.path.endswith(f"#face{face_index}") and qpath in rec.path:
                    continue
                results.append(
                    {
                        "path": rec.path,
                        "photo_path": rec.extra.get("photo_path") if isinstance(rec.extra, dict) else rec.path.split("#face")[0],
                        "preview_url": preview_url or rec.path,
                        "score": float(sc.score),
                        "item_key": rec.item_key,
                        "source_id": rec.source_id,
                        "bbox": rec.extra.get("bbox") if isinstance(rec.extra, dict) else None,
                    }
                )
                if len(results) >= int(top_k or 8):
                    break
            return {"success": True, "results": results, "query_faces": len(faces), "mode": getattr(enc, "mode", "?")}
        except Exception as exc:
            import traceback

            traceback.print_exc()
            return {"success": False, "message": str(exc)}


MODULE_CLASS = FaceClusterModule
