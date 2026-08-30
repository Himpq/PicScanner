"""语义搜索模块：在 EXIF 区块下方提供手动「向量扫描」入口。

- UI 块由前端以插件形式注入到 #exif-block 之后（等待状态，不自动触发）；
  扫描钩子仅作通用预留，默认不自动建索引，需用户点击触发。
- 向量层走 plugins/semantic_search/vector_core（多库 + 可追溯）。
- 模型惰性加载，缺依赖时仅日志跳过，不阻断主程序。
"""
from __future__ import annotations

import threading
import time
from pathlib import Path


def _log(msg: str) -> None:
    import datetime as _dt
    ts = _dt.datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{ts}][semantic_search] {msg}", flush=True)

_cached_encoder = None
_cached_encoder_id = None
_encoder_lock = threading.Lock()
_encoder_loading_logged = False

_PLUGIN_MISSING_HINT = "语义插件未安装/依赖缺失：请将 semantic_search 插件包解压到 plugins/semantic_search（含 _libs/onnxruntime、tokenizers）且确保 data/plugins/semantic_search/model_onnx 存在"

def _raise_plugin_missing(cause: Exception | str = "") -> None:
    msg = _PLUGIN_MISSING_HINT
    if cause:
        msg += f"（{cause}）"
    raise RuntimeError(msg)

def _get_encoder():
    global _cached_encoder, _cached_encoder_id, _encoder_loading_logged
    # 代理模式：优先 ONNX（主 exe 已排除 onnxruntime/tokenizers，由插件 _libs 提供）
    # 插件缺失时抛可识别的 RuntimeError，上层转友好提示，绝不阻断主程序启动
    try:
        from plugins.semantic_search.encoder_onnx import ClipEncoder as OnnxClipEncoder, resolve_model_source as onnx_resolve, onnx_available

        if onnx_available():
            ClipEncoder = OnnxClipEncoder
            resolve_model_source = onnx_resolve
            _backend_kind = "onnx"
        else:
            raise ImportError("onnx not exported yet")
    except Exception as _e:
        # 尝试 torch 后端（同样由插件提供，主包已排除）
        try:
            from plugins.semantic_search.encoder import ClipEncoder, resolve_model_source  # type: ignore

            _backend_kind = "torch"
        except Exception as _e2:
            _raise_plugin_missing(f"{_e2 or _e}")
    src = resolve_model_source()
    cache_key = f"{_backend_kind}:{src}"
    # 快路径：已缓存直接返回
    if _cached_encoder is not None and _cached_encoder_id == cache_key:
        return _cached_encoder
    # 慢路径：加锁 + 双重检查，避免并发搜索同时触发多次加载
    with _encoder_lock:
        if _cached_encoder is not None and _cached_encoder_id == cache_key:
            return _cached_encoder
        # 只有一个线程会走到这里，其余线程在锁外等待后直接命中缓存
        if not _encoder_loading_logged or _cached_encoder is None:
            print(f"[semantic_search] 正在加载模型 ({_backend_kind}) {src} ...", flush=True)
            _encoder_loading_logged = True
        else:
            _log(f"等待模型加载完成 ({_backend_kind}) {src} ...")
        import time

        t0 = time.time()
        enc = ClipEncoder()
        print(f"[semantic_search] 模型加载完成 ({_backend_kind}) device={enc.device} 用时{time.time()-t0:.1f}s", flush=True)
        _cached_encoder = enc
        _cached_encoder_id = cache_key
        return enc


class SemanticSearchModule:
    def setup(self, ctx: dict) -> None:
        self._ctx = ctx
        self._storage = ctx.get("storage")
        self._scanner = ctx.get("scanner")
        self._push = ctx.get("push")
        self._data_dir = ctx.get("data_dir")
        self._config = ctx.get("config")
        # 配置开关：去重（后续 UI 直接读写此两项即可）
        try:
            if self._config is not None:
                if self._config.get("dedup") is None:
                    self._config.set("dedup", True)
                if self._config.get("dedup_thresh") is None:
                    self._config.set("dedup_thresh", 0.92)
        except Exception:
            pass
        self._index_thread: threading.Thread | None = None
        self._index_stop = threading.Event()
        self._lock = threading.RLock()
        self._warmup_thread: threading.Thread | None = None

        # 自动懒加载模型：app 启动后于后台线程预热，绝不阻塞主线程/UI。
        # 默认开启，可在模块配置里设 auto_load_model=false 关闭。
        try:
            auto_load = True
            if self._config is not None:
                v = self._config.get("auto_load_model")
                if v is not None:
                    auto_load = bool(v)
            if auto_load:
                self.warmup_model(delay=0.3)
        except Exception as exc:
            _log(f"安排模型预热失败（已忽略）: {exc}")

        scanner = self._scanner
        if scanner is not None and hasattr(scanner, "on_scan_finished"):
            try:
                scanner.on_scan_finished(self._on_scan_finished)
                _log("已注册扫描完成钩子")
            except Exception as exc:
                _log(f"注册扫描钩子失败: {exc}")
        else:
            _log("scanner 钩子不可用，自动建索引将不可用；可手动调用 build_index")

    def api_methods(self) -> dict:
        return {
            "search": self.search,
            "build_index": self.build_index,
            "index_status": self.index_status,
            "cancel_index": self.cancel_index,
            "clear_index": self.clear_index,
            "warmup_model": self.warmup_model,
            "plugin_status": self.plugin_status,
        }

    def plugin_status(self):
        """供前端/诊断调用：判断插件是否可用，不触发模型加载。"""
        try:
            from plugins.semantic_search.encoder_onnx import onnx_available  # type: ignore

            has_onnx = onnx_available()
        except Exception:
            has_onnx = False
        try:
            from plugins.semantic_search.vector_core.store import VectorStore  # type: ignore

            has_core = True
        except Exception as exc:
            has_core = False
            has_core_err = str(exc)
        else:
            has_core_err = ""
        # 尝试判断 _libs 是否存在
        from pathlib import Path as _P

        libs_exists = (_P(__file__).resolve().parents[3] / "plugins" / "semantic_search" / "_libs").is_dir()
        onnx_libs = (_P(__file__).resolve().parents[3] / "plugins" / "semantic_search" / "_libs" / "onnxruntime").is_dir()
        tok_libs = (_P(__file__).resolve().parents[3] / "plugins" / "semantic_search" / "_libs" / "tokenizers").is_dir()
        available = has_core and (has_onnx or libs_exists)
        return {
            "success": True,
            "available": available,
            "has_core": has_core,
            "has_core_error": has_core_err,
            "has_onnx": has_onnx,
            "libs_exists": libs_exists,
            "libs_onnx": onnx_libs,
            "libs_tokenizers": tok_libs,
            "hint": "" if available else _PLUGIN_MISSING_HINT,
        }

    # ---------- 后台懒加载模型（启动预热，不阻塞） ----------

    def warmup_model(self, delay: float = 0.0) -> bool:
        """在后台线程预热 Chinese-CLIP 模型，立即返回不阻塞调用方。

        - 复用 _get_encoder()（已加锁、线程安全、结果缓存），所以预热完成后
          首次 search/build_index 直接命中缓存，无需再等 14s。
        - 依赖缺失或本地无模型时仅日志跳过，绝不影响主程序。
        - delay>0 时先等一会儿再加载，避开启动初期与 UI/缩略图抢 CPU。
        返回 True 表示已安排（含已在进行的去重判断）。
        """
        with self._lock:
            if self._warmup_thread and self._warmup_thread.is_alive():
                _log("模型预热已在进行，跳过重复安排")
                return False

        def _run() -> None:
            if delay and delay > 0:
                time.sleep(delay)
            # 再检查一次，避免 delay 期间重复进入
            with self._lock:
                if self._warmup_thread and self._warmup_thread.is_alive() and self._warmup_thread is not threading.current_thread():
                    return
            try:
                _log("开始后台预热向量模型（不阻塞主程序）...")
                enc = _get_encoder()
                _log(f"向量模型预热完成 device={enc.device}")
                self._push_event("semantic_model_warmup", {"status": "ready", "device": enc.device})
            except Exception as exc:
                import traceback
                traceback.print_exc()
                _log(f"向量模型预热失败（已忽略，首次使用时再惰性加载）: {exc}")
                self._push_event("semantic_model_warmup", {"status": "failed", "error": str(exc)})

        t = threading.Thread(target=_run, name="semantic-model-warmup", daemon=True)
        with self._lock:
            self._warmup_thread = t
        t.start()
        _log("已安排在后台线程预热向量模型")
        return True

    # ---------- 扫描完成钩子 ----------

    def _on_scan_finished(self, root_path: str, source_id: str, status: str) -> None:
        # 预留钩子：等待 EXIF 下方的手动向量扫描，不在暗处自动触发。
        # 如需恢复自动行为，将下方 auto 默认改为 True 或在设置里开启。
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

    # ---------- 后台索引 ----------

    def _spawn_index_thread(self, source_id: str = "", root_path: str = "") -> None:
        with self._lock:
            if self._index_thread and self._index_thread.is_alive():
                _log("索引任务已在进行，跳过重复触发")
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
            _log("无 storage，无法建索引")
            return
        # 先走纯 DB 的增量判断，不碰 torch；只有真有增量才付 14s 的导库钱
        import time as _t
        _t0=_t.time()
        try:
            photos = storage.iter_indexable_photos(source_id=source_id or None, root_path=root_path or None)
        except Exception as exc:
            _log(f"读取照片清单失败: {exc}")
            return
        _log(f"iter_indexable_photos {len(photos)} 张 用时 {_t.time()-_t0:.3f}s")

        import time as _ti2
        _ta=_ti2.time()
        try:
            from plugins.semantic_search.vector_core.store import VectorStore
            from plugins.semantic_search.vector_core.record import VectorRecord
            _log(f"import vector_core 用时 {_ti2.time()-_ta:.3f}s")
        except Exception as exc:
            _log(f"向量依赖缺失，索引中止: {exc}")
            return
        _tb=_ti2.time()
        try:
            from app.backend.thumbnailer import ensure_thumbnail, existing_thumbnail
            _log(f"import thumbnailer 用时 {_ti2.time()-_tb:.3f}s")
        except Exception:
            ensure_thumbnail = existing_thumbnail = None  # type: ignore
            _log(f"import thumbnailer 失败 用时 {_ti2.time()-_tb:.3f}s")
        _t1=_t.time()
        if not photos:
            self._push_event("semantic_index_progress", {"phase": "done", "done": 0, "total": 0, "source_id": source_id})
            self._push_event("semantic_index_done", {"source_id": source_id, "total": 0})
            return

        # 复用单例 store，避免每次重建全量 embedding 矩阵（116 张 0.2MB 也别反复做）
        global _store_cache
        try:
            _store_cache
        except NameError:
            _store_cache = {}
        cache_key = "semantic-image"
        store = _store_cache.get(cache_key)
        if store is None:
            _t2=_t.time()
            store = VectorStore(index_name="semantic-image")
            _store_cache[cache_key] = store
            _log(f"VectorStore 首次加载 用时 {_t.time()-_t2:.3f}s count={store.count()}")
        else:
            _log(f"VectorStore 缓存命中 count={store.count()}")
        _t3=_t.time()
        known = store.known_signatures()
        _log(f"known_signatures {len(known)} 条 用时 {_t.time()-_t3:.3f}s")
        # 增量判断：只用 DB 里的 mtime/size，不做 Path.resolve/stat（其他组件如 thumbnail 也只 hash 路径+stat，不读图）
        _t4=_t.time()
        pending = []
        for p in photos:
            path = str(p.get("path") or "")
            try:
                sig = (float(p.get("mtime") or 0), int(p.get("size") or 0))
            except Exception:
                sig = (0.0, 0)
            old = known.get(path)
            if old is None or old != sig:
                pending.append(p)
        _log(f"pending 比对 用时 {_t.time()-_t4:.3f}s todo={len(pending)}")

        total = len(photos)
        todo = len(pending)
        _log(f"语义索引：共 {total} 张待索引增量 {todo} 张 source={source_id or '*'}")
        self._push_event("semantic_index_progress", {"phase": "scanning_db", "done": 0, "total": todo, "source_id": source_id})
        _log(f"已推送 scanning_db 事件 todo={todo}")
        if todo == 0:
            _log("增量0，直接完成")
            self._push_event("semantic_index_progress", {"phase": "done", "done": total, "total": total, "source_id": source_id})
            self._push_event("semantic_index_done", {"source_id": source_id, "total": total, "new": 0, "removed": 0})
            _log("已推送 done 事件")
            return

        # 惰性加载模型（仅真有增量时才付 14s 导库钱）
        self._push_event("semantic_index_progress", {"phase": "loading_model", "done": 0, "total": todo, "source_id": source_id})
        _log(f"准备加载模型，共 {todo} 张待编码 source={source_id or '*'}")
        try:
            try:
                from plugins.semantic_search.encoder_onnx import MODEL_ID, load_image  # type: ignore
                from plugins.semantic_search.encoder_onnx import onnx_available as _oa

                if not _oa():
                    raise ImportError("onnx not ready")
            except Exception:
                from plugins.semantic_search.encoder import MODEL_ID, load_image  # type: ignore

            encoder = _get_encoder()
        except Exception as exc:
            import traceback
            traceback.print_exc()
            hint = _PLUGIN_MISSING_HINT if "语义插件" in str(exc) else str(exc)
            _log(f"模型加载失败: {hint}")
            self._push_event("semantic_index_progress", {"phase": "failed", "error": hint})
            return
        self._push_event("semantic_index_progress", {"phase": "indexing", "done": 0, "total": todo, "source_id": source_id})
        _log(f"开始编码 {todo} 张")

        # 批量编码
        batch_size = 32 if getattr(encoder, "device", "") == "cuda" else 8
        done = 0
        started = time.time()
        try:
            from PIL import Image  # noqa: F401  # 确保 Pillow 可用
        except Exception:
            pass

        for i in range(0, len(pending), batch_size):
            if self._index_stop.is_set():
                self._push_event("semantic_index_progress", {"phase": "stopped", "done": done, "total": todo})
                return
            chunk = pending[i : i + batch_size]
            images = []
            valid = []
            for p in chunk:
                path = str(p["path"])
                # 优先缩略图，降低 I/O 与 RAW 解码成本
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
                    img = load_image(src_path)  # 对缩略图同样做 EXIF 纠正 + RGB
                    images.append(img)
                    valid.append(p)
                except Exception as exc:
                    _log(f"跳过无法读取 {path}: {exc}")
            if valid:
                try:
                    vecs = encoder.encode_images(images)
                except Exception as exc:
                    _log(f"编码失败: {exc}")
                    continue
                for p, vec in zip(valid, vecs):
                    path = str(p["path"])
                    try:
                        mtime = float(p.get("mtime") or Path(path).stat().st_mtime)
                    except Exception:
                        mtime = float(p.get("mtime") or 0)
                    try:
                        size = int(p.get("size") or Path(path).stat().st_size)
                    except Exception:
                        size = int(p.get("size") or 0)
                    rec = VectorRecord.for_photo(
                        path=path,
                        vector=vec,
                        model=MODEL_ID,
                        source_id=str(p.get("source_id") or source_id or ""),
                        item_key=str(p.get("relative_path") or p.get("path") or path),
                        source_signature=f"{mtime}:{size}",
                        index_name="semantic-image",
                        file_mtime=mtime,
                        file_size=size,
                    )
                    store.upsert(rec)
            done += len(chunk)
            self._push_event(
                "semantic_index_progress",
                {"phase": "indexing", "done": done, "total": todo, "source_id": source_id},
            )

        removed = store.prune_missing()
        elapsed = time.time() - started
        _log(f"语义索引完成：增量 {done}/{todo}，用时 {elapsed:.1f}s，清理 {len(removed) if removed else 0} 条")
        self._push_event(
            "semantic_index_progress",
            {"phase": "done", "done": done, "total": todo, "source_id": source_id, "elapsed": elapsed},
        )
        self._push_event("semantic_index_done", {"source_id": source_id, "new": done, "removed": len(removed) if removed else 0, "elapsed": elapsed})

    # ---------- 公开 API ----------

    def build_index(self, source_id: str = "", root_path: str = "", rebuild: bool = False):
        _log(f"build_index 调用 source={source_id or '*'} root={root_path or '*'} rebuild={rebuild}")
        if rebuild:
            try:
                from plugins.semantic_search.vector_core.store import VectorStore

                s = VectorStore(index_name="semantic-image")
                # 粗暴重建：清空该索引
                with s._connect() as conn:
                    conn.execute("DELETE FROM vector_records WHERE index_name=?", (s.index_name,))
                s.backend = s.backend.__class__()  # 重置内存索引
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

            s = VectorStore(index_name="semantic-image")
            if source_id:
                with s._connect() as conn:
                    conn.execute("DELETE FROM vector_records WHERE index_name=? AND source_id=?", (s.index_name, str(source_id)))
            else:
                with s._connect() as conn:
                    conn.execute("DELETE FROM vector_records WHERE index_name=?", (s.index_name,))
            s.backend = s.backend.__class__()
            return {"success": True}
        except Exception as exc:
            return {"success": False, "message": str(exc)}

    def index_status(self, source_id: str = ""):
        try:
            from plugins.semantic_search.vector_core.store import VectorStore

            s = VectorStore(index_name="semantic-image")
            sid = str(source_id).strip()
            total = s.count(source_id=sid) if sid else s.count()
            audit = s.audit()
            if sid:
                audit = {k: v for k, v in audit.items() if k in ("index", "total")}
                audit["total"] = total
                audit["source_id"] = sid
            return {"success": True, "total": total, "audit": audit, "running": bool(self._index_thread and self._index_thread.is_alive())}
        except Exception as exc:
            if "vector_core" in str(exc) or "No module" in str(exc):
                return {"success": False, "message": _PLUGIN_MISSING_HINT, "hint": _PLUGIN_MISSING_HINT}
            return {"success": False, "message": str(exc)}

    def search(self, query: str, top_k: int = 8, source_id: str = "", filters: dict | None = None, dedup: bool | None = None, dedup_thresh: float | None = None):
        q = str(query or "").strip()
        if not q:
            return {"success": True, "results": []}
        # 短查询拦截：仅拦截单字母/数字碎片如 'z','a','1'，放行单字中文“鸟/鹿/牛”等语义
        if len(q) == 1 and q.isascii() and q.isalnum():
            _log(f"语义搜索跳过单字母碎片 query='{q}'")
            return {"success": True, "results": []}
        if len(q) < 1:
            return {"success": True, "results": []}
        # 开关走模块配置，方便后续 UI 接入
        try:
            cfg_dedup = None
            cfg_thresh = None
            if self._config is not None:
                cfg_dedup = self._config.get("dedup")
                cfg_thresh = self._config.get("dedup_thresh")
            if dedup is None:
                dedup = bool(cfg_dedup) if cfg_dedup is not None else True
            if dedup_thresh is None:
                dedup_thresh = float(cfg_thresh) if cfg_thresh is not None else 0.92
        except Exception:
            if dedup is None: dedup = True
            if dedup_thresh is None: dedup_thresh = 0.92
        _log(f"语义搜索 query='{q}' source={source_id or '*'} top_k={top_k} dedup={dedup}@{dedup_thresh:.2f} filters={filters}")
        try:
            enc = _get_encoder()
            qmat = enc.encode_query(q)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            hint = _PLUGIN_MISSING_HINT if "语义插件" in str(exc) else str(exc)
            _log(f"搜索模型加载失败: {hint}")
            return {"success": False, "message": f"模型加载失败: {hint}", "hint": _PLUGIN_MISSING_HINT}
        try:
            from plugins.semantic_search.vector_core.store import VectorStore

            # 复用缓存，避免每次重建 embedding 矩阵
            global _store_cache
            try:
                _store_cache
            except NameError:
                _store_cache = {}
            s = _store_cache.get("semantic-image")
            if s is None:
                s = VectorStore(index_name="semantic-image")
                _store_cache["semantic-image"] = s
            flt = {"source_id": str(source_id)} if source_id else None
            # 去重需多取候选，再按图-图余弦过滤
            fetch_k = int(top_k or 8) * 4 if dedup else int(top_k or 8)
            scored = s.search(qmat, top_k=fetch_k, filters=flt)
            if dedup and len(scored) > 1:
                import numpy as _np
                keep = []
                kept_vecs = []
                for sc in scored:
                    try:
                        v = _np.frombuffer(sc.record.embedding, dtype=_np.float32)
                        n = float(_np.linalg.norm(v))
                        if n > 1e-9: v = v / n
                    except Exception:
                        v = None
                    is_dup = False
                    if v is not None and kept_vecs:
                        for kv in kept_vecs:
                            try:
                                if float(v @ kv) >= float(dedup_thresh):
                                    is_dup = True
                                    break
                            except Exception:
                                pass
                    if not is_dup:
                        keep.append(sc)
                        if v is not None:
                            kept_vecs.append(v)
                    if len(keep) >= int(top_k or 8):
                        break
                scored = keep
            # 富化：让 Ctrl+F 可跳转、RAW 有缩略图、且尊重筛选（display_filter + hidden）
            storage = self._storage
            from pathlib import Path as _Path
            try:
                from app.backend.thumbnailer import existing_thumbnail, existing_lightbox_preview, _thumb_path_from_stat, _lightbox_preview_path
                from app.backend.api import _versioned_file_uri
                from app.backend.exif_reader import is_renderable_image
            except Exception:
                existing_thumbnail = existing_lightbox_preview = _versioned_file_uri = _thumb_path_from_stat = _lightbox_preview_path = None  # type: ignore
                is_renderable_image = lambda p: True  # type: ignore

            def _cached_thumb_url(photo_row, fallback_path=""):
                """即使原文件离线（不存在），也尝试用 mtime/size 找回已缓存的缩略图。"""
                ppath = str((photo_row or {}).get("path") or fallback_path or "")
                if not ppath:
                    return ""
                # 1) 正常路径：文件存在时走现有逻辑
                try:
                    if existing_thumbnail is not None:
                        thumb = existing_thumbnail(ppath)
                        if thumb is not None and _versioned_file_uri is not None:
                            return _versioned_file_uri(thumb)
                except Exception:
                    pass
                # 2) 离线回退：用 DB 里的 mtime/size 直接算 thumb key，不依赖文件存在
                try:
                    if _thumb_path_from_stat is not None and _versioned_file_uri is not None and photo_row is not None:
                        # photos 表里 mtime/size 字段名可能是 mtime/size 或 file_mtime/file_size
                        mtime = float(photo_row.get("mtime") or photo_row.get("file_mtime") or 0)
                        size = int(photo_row.get("size") or photo_row.get("file_size") or 0)
                        if mtime and size:
                            tpath = _thumb_path_from_stat(_Path(ppath), mtime_ns=int(mtime * 1e9), size=size)
                            if tpath.exists() and tpath.stat().st_size > 0:
                                return _versioned_file_uri(tpath)
                        # lightbox 预览也尝试
                        if existing_lightbox_preview is None and _lightbox_preview_path is not None:
                            lb_path = _lightbox_preview_path(_Path(ppath))
                            if lb_path.exists() and lb_path.stat().st_size > 0:
                                return _versioned_file_uri(lb_path)
                except Exception:
                    pass
                # 3) 最后兜底：用文件 file:// 直显（仅当文件实际存在且可渲染）
                try:
                    pp = _Path(ppath)
                    if pp.exists() and is_renderable_image(pp) and _versioned_file_uri is not None:
                        return _versioned_file_uri(pp)
                except Exception:
                    pass
                return ""

            results = []
            for r in scored:
                rec = r.record
                # 查 photos 行，拼本体同款 preview_url / date_key / offset（其他组件就是靠 photos 表，不读图）
                photo_row = None
                if storage is not None:
                    try:
                        with storage._lock, storage._connect() as conn:
                            # 优先按 source_id+relative_path（唯一键），回退 path
                            row = conn.execute(
                                "SELECT p.*, m.hidden as hidden, m.favorite as favorite FROM photos p LEFT JOIN source_marks m ON m.source_id=p.source_id AND m.item_type='photo' AND m.item_key=p.relative_path WHERE p.source_id=? AND p.relative_path=?",
                                (rec.source_id, rec.item_key),
                            ).fetchone()
                            if row is None and rec.path:
                                row = conn.execute("SELECT p.*, m.hidden as hidden FROM photos p LEFT JOIN source_marks m ON m.source_id=p.source_id AND m.item_type='photo' AND m.item_key=p.relative_path WHERE p.path=?", (rec.path,)).fetchone()
                            if row is not None:
                                # 尊重本体筛选：hidden 的不返回（display_filter），额外 filters（如 favorite）由前端传入时再筛
                                if row["hidden"]:
                                    continue
                                if isinstance(filters, dict):
                                    if filters.get("favorite") and not row["favorite"]:
                                        continue
                                    if filters.get("category") and str(row["category"] or "") != str(filters["category"]):
                                        continue
                                photo_row = dict(row)
                    except Exception:
                        photo_row = None
                if photo_row is not None:
                    # 复用本体缩略图判断：优先走缓存，即使原文件离线也能出图
                    ppath = str(photo_row.get("path") or rec.path)
                    preview_url = _cached_thumb_url(photo_row, ppath)
                    # 取本体已算好的 date_key/offset
                    try:
                        offset = storage.photo_offset_in_date(int(photo_row["id"]), str(photo_row.get("date_key") or ""), source_id=photo_row.get("source_id")) if storage else 0
                    except Exception:
                        offset = 0
                    results.append({
                        "id": photo_row["id"],
                        "type": "photo",
                        "source_id": str(photo_row.get("source_id") or rec.source_id),
                        "path": ppath,
                        "relative_path": str(photo_row.get("relative_path") or rec.item_key),
                        "filename": str(photo_row.get("filename") or ""),
                        "date_key": str(photo_row.get("date_key") or ""),
                        "search_offset": offset,
                        "preview_url": preview_url,
                        "item_key": rec.item_key,
                        "model": rec.model,
                        "score": r.score,
                        "search_label": "语义",
                        "search_title": q,
                        "search_match": f"语义 {r.score:.2f}",
                    })
                else:
                    # 回退：无 photos 行时仍可显示（但不可跳转），也尽量给缩略图
                    fallback_preview = ""
                    try:
                        # 尝试用 vector 记录里的 file_mtime/size 算 thumb key
                        if _thumb_path_from_stat is not None and _versioned_file_uri is not None and rec.path:
                            try:
                                mtime = float(getattr(rec, "file_mtime", 0) or 0)
                                size = int(getattr(rec, "file_size", 0) or 0)
                                if mtime and size:
                                    tpath = _thumb_path_from_stat(_Path(rec.path), mtime_ns=int(mtime * 1e9), size=size)
                                    if tpath.exists() and tpath.stat().st_size > 0:
                                        fallback_preview = _versioned_file_uri(tpath)
                            except Exception:
                                pass
                        if not fallback_preview and rec.path:
                            pp = _Path(rec.path)
                            if pp.exists() and is_renderable_image(pp) and _versioned_file_uri is not None:
                                fallback_preview = _versioned_file_uri(pp)
                    except Exception:
                        fallback_preview = ""
                    results.append({
                        "id": rec.id,
                        "type": "photo",
                        "path": rec.path,
                        "source_id": rec.source_id,
                        "item_key": rec.item_key,
                        "model": rec.model,
                        "score": r.score,
                        "preview_url": fallback_preview,
                        "search_label": "语义",
                        "search_title": q,
                        "search_match": f"语义 {r.score:.2f}",
                    })
            # 排序：有缩略图的优先，避免首条就空白
            results.sort(key=lambda x: (1 if x.get("preview_url") else 0, float(x.get("score") or 0)), reverse=True)
            _log(f"语义搜索完成 query='{q}' 命中{len(results)}条 " + (f"top={results[0]['score']:.3f} preview={bool(results[0].get('preview_url'))}" if results else ""))
            return {"success": True, "results": results}
        except Exception as exc:
            import traceback
            traceback.print_exc()
            _log(f"语义搜索异常: {exc}")
            return {"success": False, "message": str(exc)}


MODULE_CLASS = SemanticSearchModule
