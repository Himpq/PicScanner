"""集锦模块：语义聚类 + EXIF 序列生成集锦，不依赖前端。"""
from __future__ import annotations

import threading
import time
import uuid
from pathlib import Path
from typing import List, Dict

def _log(msg: str):
    import datetime as _dt
    ts = _dt.datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{ts}][collections] {msg}", flush=True)

class CollectionsModule:
    def setup(self, ctx: dict) -> None:
        self._ctx = ctx
        self._storage = ctx.get("storage")
        self._scanner = ctx.get("scanner")
        self._push = ctx.get("push")
        self._data_dir = ctx.get("data_dir")
        self._config = ctx.get("config")
        # 默认配置
        try:
            if self._config is not None:
                if self._config.get("cluster_thresh") is None:
                    self._config.set("cluster_thresh", 0.72)
                if self._config.get("min_size") is None:
                    self._config.set("min_size", 3)
                if self._config.get("dedup_high_thresh") is None:
                    self._config.set("dedup_high_thresh", 0.94)
                if self._config.get("title_provider") is None:
                    self._config.set("title_provider", "auto")  # auto/semantic/vision
                # 词表已扩至 50+，清旧文本编码缓存避免“街拍”误判留存
                try:
                    from .providers.semantic_template import _TXT_CACHE
                    if _TXT_CACHE and any(len(k)==24 for k in _TXT_CACHE.keys()):
                        _TXT_CACHE.clear()
                except Exception:
                    pass
        except Exception:
            pass
        _log("已加载")

    def api_methods(self) -> dict:
        return {
            "generate": self.generate,
            "list": self.list_collections,
            "get": self.get_collection,
            "clear": self.clear,
            "status": self.status,
            "reindex_gps": self.reindex_gps,
        }

    def _push_event(self, event: str, data: dict):
        try:
            if self._push:
                self._push(event, data)
        except Exception:
            pass

    # ---------- 核心：生成 ----------
    def generate(self, source_id: str = "", method: str = "auto", with_geo: bool = True, title_provider: str = "", limit: int = 20, replace: bool = False):
        """生成集锦并落库（默认 append + 去重）。
        source_id 必传（隔离）；method auto/kmeans/greedy；with_geo 是否追加地理集锦。
        replace=True 时清空该来源旧集锦后全量覆盖（旧行为）；默认 False 为追加并按 photo_ids 集合去重（Jaccard>=0.85判重）。
        返回 {success, collections, count, inserted, skipped}
        """
        sid = str(source_id or "").strip()
        if not sid:
            return {"success": False, "message": "需提供 source_id"}
        storage = self._storage
        if storage is None:
            return {"success": False, "message": "storage 不可用"}
        # 1. 读向量
        try:
            from plugins.semantic_search.vector_core.store import VectorStore
            import numpy as _np
        except Exception as exc:
            return {"success": False, "message": f"向量依赖缺失: {exc}"}
        store = VectorStore(index_name="semantic-image")
        total = store.count(source_id=sid)
        # 兼容旧索引：source_id 可能已变更（如 path_xxx vs src_xxx），total=0 时按路径回退
        _root_path = ""
        try:
            _root_path = str(storage.source_state(sid).get("root_path") or "")
        except Exception:
            _root_path = ""
        if total == 0 and _root_path:
            # 按路径前缀统计
            try:
                with store._connect() as conn:
                    all_rows = conn.execute("SELECT path FROM vector_records WHERE index_name=?", (store.index_name,)).fetchall()
                    total = sum(1 for r in all_rows if str(r["path"]).lower().startswith(_root_path.lower()))
            except Exception:
                total = 0
        if total == 0:
            return {"success": False, "message": "该来源暂无语义索引，请先在语义搜索完成建索引（或向量与来源路径不一致）"}
        _log(f"generate source={sid} vector_count={total} method={method} root={_root_path}")

        # 2. 取回全量向量 + 关联 photo_id
        # store 的 DB 里存 path/item_key/source_id，我们需映射到 photos.id
        rows = []
        try:
            with store._connect() as conn:
                # 优先按 source_id
                rows = conn.execute("SELECT id, embedding, source_id, item_key, path, file_mtime, file_size FROM vector_records WHERE index_name=? AND source_id=?", (store.index_name, sid)).fetchall()
                if not rows and _root_path:
                    # 回退：按路径前缀
                    rows = conn.execute("SELECT id, embedding, source_id, item_key, path, file_mtime, file_size FROM vector_records WHERE index_name=?", (store.index_name,)).fetchall()
                    # 大小写不敏感前缀匹配
                    _low = _root_path.lower()
                    rows = [r for r in rows if str(r["path"]).lower().startswith(_low)]
        except Exception as exc:
            _log(f"读取向量失败: {exc}")
            return {"success": False, "message": f"读取向量失败: {exc}"}

        if not rows:
            return {"success": False, "message": "向量记录为空"}

        # 映射到 photo_id: 通过 source_id+relative_path 或 path
        photo_map: Dict[str, dict] = {}  # path -> photo_row
        try:
            with storage._lock, storage._connect() as conn:
                # 批量查 photos
                # 用路径集合查
                paths = [str(r["path"]) for r in rows]
                # 同时查 item_key (relative_path)
                item_keys = [str(r["item_key"]) for r in rows]
                # 为了兼容，直接查 source_id 下所有 photos 的 path/relative_path 索引
                photos = conn.execute("SELECT id, path, relative_path, source_id, date_key, datetime_original, gps_lat, gps_lon, gps_place, lens_model FROM photos WHERE source_id=?", (sid,)).fetchall()
                by_path = {str(p["path"]): dict(p) for p in photos}
                by_rel = {str(p["relative_path"]): dict(p) for p in photos}
                # 也按 filename 兜底
                for r in rows:
                    key_path = str(r["path"])
                    key_rel = str(r["item_key"])
                    photo = by_path.get(key_path) or by_rel.get(key_rel)
                    if not photo:
                        # 尝试 path 的相对部分匹配
                        for p in photos:
                            if key_path.endswith(str(p["relative_path"])):
                                photo = dict(p)
                                break
                    if photo:
                        photo_map[str(r["id"])] = photo
        except Exception as exc:
            _log(f"photo 映射失败: {exc}")
            return {"success": False, "message": f"photo 映射失败: {exc}"}

        # 组装 embeddings 与 ids（过滤无 photo 映射的）
        valid_rows = [r for r in rows if str(r["id"]) in photo_map]
        if not valid_rows:
            return {"success": False, "message": "向量与照片无法关联（可能来源路径已变更）"}
        # 为了稳定排序，按 photo id 排序
        valid_rows.sort(key=lambda r: int(photo_map[str(r["id"])]["id"]))
        embeddings_list = []
        photo_ids: List[int] = []
        vid_to_pid: Dict[str, int] = {}
        for r in valid_rows:
            vid = str(r["id"])
            pid = int(photo_map[vid]["id"])
            try:
                vec = _np.frombuffer(r["embedding"], dtype=_np.float32)
            except Exception:
                vec = _np.asarray(r["embedding"], dtype=_np.float32)
            # 维度校验：512
            if vec.size != 512:
                continue
            embeddings_list.append(vec)
            photo_ids.append(pid)
            vid_to_pid[vid] = pid
        if not embeddings_list:
            return {"success": False, "message": "无有效向量"}
        import numpy as _np2
        mat = _np2.vstack(embeddings_list)  # (N,512)

        # 3. 聚类（含风景 burst 去重）
        from .engine import cluster_photos
        thresh = float(self._config.get("cluster_thresh") or 0.72) if self._config else 0.72
        try:
            thresh = float(thresh)
        except Exception:
            thresh = 0.72
        min_size = int(self._config.get("min_size") or 3) if self._config else 3
        # 去重阈值可配，默认 0.94（同机位连拍 0.96+，人像姿态差异 0.85 故保留）
        dedup_thresh = float(self._config.get("dedup_high_thresh") or 0.94) if self._config else 0.94
        try:
            dedup_thresh = float(dedup_thresh)
        except Exception:
            dedup_thresh = 0.94
        # 构造 metas 供时间窗口判断
        metas = []
        try:
            with storage._lock, storage._connect() as conn:
                placeholders = ",".join("?" for _ in photo_ids)
                rows = conn.execute(f"SELECT id, datetime_original, date_key FROM photos WHERE id IN ({placeholders})", photo_ids).fetchall()
                pmap2 = {int(r["id"]): dict(r) for r in rows}
                metas = [pmap2.get(pid, {}) for pid in photo_ids]
        except Exception:
            metas = [{} for _ in photo_ids]
        orig_n = len(photo_ids)
        clusters = cluster_photos(mat, photo_ids, method=method or "auto", thresh=thresh, min_size=min_size, dedup=True, dedup_high_thresh=dedup_thresh, metas=metas)
        # 截断 limit
        clusters = clusters[: max(1, min(50, int(limit or 20)))]
        _log(f"聚类完成 N={orig_n} -> 去重后 {len(metas) and '已去重' or ''} -> {len(clusters)}簇 method={method} thresh={thresh} dedup@{dedup_thresh:.2f}")

        # 4. 标题生成
        from .providers.semantic_template import make_title, make_geo_title
        from .providers.vision_llm import generate_vision_title
        # 决定 provider
        provider = str(title_provider or (self._config.get("title_provider") if self._config else "auto") or "auto").lower()
        collections: List[dict] = []
        for idx, cl in enumerate(clusters):
            pids = cl["photo_ids"]
            centroid = cl["centroid"]
            scores = cl["scores"]
            # 取 photo 详情用于标题
            with storage._lock, storage._connect() as conn:
                placeholders = ",".join("?" for _ in pids)
                prow = conn.execute(f"SELECT * FROM photos WHERE id IN ({placeholders})", pids).fetchall()
                pmap = {int(r["id"]): dict(r) for r in prow}
            photos_detail = [pmap[pid] for pid in pids if pid in pmap]
            # 按分数排序
            photos_detail.sort(key=lambda p: float(scores.get(int(p["id"]), 0)), reverse=True)

            title = subtitle = ""
            # vision 优先尝试
            if provider in ("vision", "auto"):
                try:
                    vtitle = generate_vision_title(photos_detail, self._config.snapshot() if self._config else {})
                    if vtitle:
                        title = vtitle
                except Exception as exc:
                    _log(f"vision 标题失败: {exc}")
            if not title:
                try:
                    title, subtitle = make_title(photos_detail, centroid=centroid)
                except Exception:
                    title, subtitle = f"集锦 {idx+1}", f"{len(pids)}张"
            else:
                # 有 vision title 时仍需 subtitle
                try:
                    _, subtitle = make_title(photos_detail, centroid=None)
                except Exception:
                    subtitle = f"{len(pids)}张"

            # 时间范围
            dates = sorted([str(p.get("datetime_original") or p.get("date_key") or "") for p in photos_detail if p.get("datetime_original") or p.get("date_key")])
            time_start = dates[0] if dates else ""
            time_end = dates[-1] if dates else ""
            # gps 中心
            lats = [float(p["gps_lat"]) for p in photos_detail if p.get("gps_lat") is not None]
            lons = [float(p["gps_lon"]) for p in photos_detail if p.get("gps_lon") is not None]
            gps_lat = sum(lats)/len(lats) if lats else None
            gps_lon = sum(lons)/len(lons) if lons else None

            collections.append({
                "id": uuid.uuid4().hex[:12],
                "type": "semantic",
                "title": title,
                "subtitle": subtitle,
                "cover_photo_id": int(photos_detail[0]["id"]) if photos_detail else int(pids[0]),
                "photo_ids": pids,
                "scores": {str(k): float(v) for k,v in scores.items()},
                "centroid_model": "chinese-clip-vit-base-patch16",
                "time_start": time_start,
                "time_end": time_end,
                "gps_lat": gps_lat,
                "gps_lon": gps_lon,
                "meta": {"cluster_index": idx, "method": method, "thresh": thresh, "size": len(pids)},
            })

        # 5. 地理集锦（可选）
        if with_geo:
            try:
                from .engine import cluster_by_geo
                with storage._lock, storage._connect() as conn:
                    grows = conn.execute("SELECT * FROM photos WHERE source_id=? AND gps_lat IS NOT NULL AND gps_lon IS NOT NULL", (sid,)).fetchall()
                    gphotos = [dict(r) for r in grows]
                geo_clusters = cluster_by_geo(gphotos, grid=0.5, min_size=min_size)
                for gc in geo_clusters[:5]:  # 地理最多5个
                    pids = gc["photo_ids"]
                    # 避免与语义重复：若已有语义集锦完全包含可跳过？简化：直接追加
                    with storage._lock, storage._connect() as conn:
                        placeholders = ",".join("?" for _ in pids)
                        prow = conn.execute(f"SELECT * FROM photos WHERE id IN ({placeholders})", pids).fetchall()
                        pmap = {int(r["id"]): dict(r) for r in prow}
                    photos_detail = [pmap[pid] for pid in pids if pid in pmap]
                    title, subtitle = make_geo_title(photos_detail, grid=gc["grid"])
                    collections.append({
                        "id": uuid.uuid4().hex[:12],
                        "type": "geo",
                        "title": title,
                        "subtitle": subtitle,
                        "cover_photo_id": int(pids[0]),
                        "photo_ids": pids,
                        "scores": {},
                        "centroid_model": "",
                        "time_start": "",
                        "time_end": "",
                        "gps_lat": float(gc["gps_lat"]),
                        "gps_lon": float(gc["gps_lon"]),
                        "meta": {"grid": gc["grid"], "count": gc["count"]},
                    })
                _log(f"地理集锦 {len(geo_clusters)} 个")
            except Exception as exc:
                _log(f"地理聚类失败: {exc}")

        # 6. 落库（append + 去重）
        try:
            # 兼容旧版 save_collections 返回 int 的情况
            save_res = storage.save_collections(sid, collections, replace=bool(replace), dedup=True, jaccard_thresh=0.85)
            if isinstance(save_res, int):
                inserted, skipped = int(save_res), 0
            elif isinstance(save_res, dict):
                inserted = int(save_res.get("inserted", 0))
                skipped = int(save_res.get("skipped", 0))
            else:
                inserted, skipped = len(collections), 0
        except Exception as exc:
            return {"success": False, "message": f"保存失败: {exc}"}
        # 仅推送实际新增数，前端据此刷新
        total_after = 0
        try:
            total_after = len(storage.list_collections(sid, limit=500))
        except Exception:
            total_after = inserted
        self._push_event("collections_updated", {"source_id": sid, "count": total_after, "inserted": inserted, "skipped": skipped})
        # 为了让前端 toast 能显示去重信息，返回 inserted/skipped
        # collections 仍返回本次尝试生成的全量（便于调试），count 为实际新增
        return {"success": True, "collections": collections, "count": inserted, "inserted": inserted, "skipped": skipped, "total": len(collections)}

    def _photo_preview_url(self, path: str) -> str:
        try:
            from app.backend.thumbnailer import existing_thumbnail
            from app.backend.api import _versioned_file_uri
            from pathlib import Path as _P
            th = existing_thumbnail(path)
            if th:
                return _versioned_file_uri(th)
            p = _P(path)
            if p.exists():
                return _versioned_file_uri(p)
        except Exception:
            pass
        return ""

    def _photo_lightbox_url(self, path: str) -> str:
        """灯箱用高清：仅返回已生成的 lightbox 预览，不存在则返回空让前端走 get_photo_lightbox_preview 生成（保留缩略图→高清的渐进机制）"""
        try:
            from app.backend.thumbnailer import existing_lightbox_preview
            from app.backend.api import _versioned_file_uri
            lb = existing_lightbox_preview(path)
            if lb:
                return _versioned_file_uri(lb)
        except Exception:
            pass
        return ""

    def list_collections(self, source_id: str = "", limit: int = 20):
        sid = str(source_id or "").strip()
        if not sid:
            return {"success": False, "message": "需提供 source_id"}
        try:
            rows = self._storage.list_collections(sid, limit=int(limit or 20))
            for r in rows:
                # 封面预览
                if r.get("cover_photo_id"):
                    try:
                        photo = self._storage.get_photo(int(r["cover_photo_id"]))
                        r["cover_url"] = self._photo_preview_url(str(photo.get("path") or "")) if photo else ""
                    except Exception:
                        r["cover_url"] = ""
                else:
                    r["cover_url"] = ""
                # 拼图预览：取前 7 张
                try:
                    pids = list(r.get("photo_ids") or [])[:7]
                    if pids:
                        photos = self._storage.photos_by_ids(pids)
                        # 按原序
                        pmap = {int(p["id"]): p for p in photos}
                        ordered = [pmap[pid] for pid in pids if pid in pmap]
                        r["photos"] = []
                        for p in ordered:
                            d = dict(p)
                            d["preview_url"] = self._photo_preview_url(str(p.get("path") or ""))
                            d["lightbox_url"] = self._photo_lightbox_url(str(p.get("path") or ""))
                            d["original_url"] = d["lightbox_url"]
                            d["thumbnail_url"] = d["preview_url"]
                            d["previewable"] = True
                            # 确保前端需要的关键字段类型一致
                            d["id"] = int(d.get("id") or 0)
                            r["photos"].append(d)
                    else:
                        r["photos"] = []
                except Exception:
                    r["photos"] = []
            return {"success": True, "collections": rows}
        except Exception as exc:
            return {"success": False, "message": str(exc)}

    def get_collection(self, collection_id: str = ""):
        cid = str(collection_id or "").strip()
        if not cid:
            return {"success": False, "message": "需提供 collection_id"}
        try:
            data = self._storage.get_collection(cid)
            if not data:
                return {"success": False, "message": "集锦不存在"}
            # 补 preview_url / lightbox_url
            try:
                for p in (data.get("photo_details") or []):
                    p["preview_url"] = self._photo_preview_url(str(p.get("path") or ""))
                    p["lightbox_url"] = self._photo_lightbox_url(str(p.get("path") or ""))
                    p["original_url"] = p["lightbox_url"]
                    p["previewable"] = True
                if data.get("photos"):
                    for item in data["photos"]:
                        pid = int(item.get("photo_id") or 0)
                        det = next((d for d in (data.get("photo_details") or []) if int(d.get("id") or -1)==pid), None)
                        if det:
                            item["preview_url"] = det.get("preview_url", "")
                            item["lightbox_url"] = det.get("lightbox_url", "")
                            item["original_url"] = det.get("lightbox_url", "")
                            item["path"] = det.get("path", "")
                            item["previewable"] = True
                            item["filename"] = det.get("filename", "")
                            item["width"] = det.get("width")
                            item["height"] = det.get("height")
            except Exception:
                pass
            return {"success": True, "collection": data}
        except Exception as exc:
            return {"success": False, "message": str(exc)}

    def clear(self, source_id: str = ""):
        sid = str(source_id or "").strip()
        try:
            n = self._storage.clear_collections(sid)
            return {"success": True, "cleared": n}
        except Exception as exc:
            return {"success": False, "message": str(exc)}

    def status(self, source_id: str = ""):
        sid = str(source_id or "").strip()
        try:
            from plugins.semantic_search.vector_core.store import VectorStore
            vs = VectorStore(index_name="semantic-image")
            vcount = vs.count(source_id=sid) if sid else vs.count()
        except Exception:
            vcount = 0
        try:
            cols = self._storage.list_collections(sid, limit=100) if sid else []
        except Exception:
            cols = []
        return {"success": True, "vector_count": vcount, "collections": len(cols), "source_id": sid}

    def reindex_gps(self, source_id: str = "", limit: int = 100):
        """补 GPS：对该 source 下 gps_lat IS NULL 的照片重读 EXIF。"""
        sid = str(source_id or "").strip()
        if not sid:
            return {"success": False, "message": "需提供 source_id"}
        try:
            from app.backend.exif_reader import read_metadata
        except Exception as exc:
            return {"success": False, "message": f"exif_reader 缺失: {exc}"}
        with self._storage._lock, self._storage._connect() as conn:
            rows = conn.execute("SELECT id, path FROM photos WHERE source_id=? AND (gps_lat IS NULL OR gps_lon IS NULL) LIMIT ?", (sid, int(limit or 100))).fetchall()
        updated = 0
        for r in rows:
            try:
                meta = read_metadata(str(r["path"]))
                if meta.get("gps_lat") is not None and meta.get("gps_lon") is not None:
                    self._storage.update_photo_metadata(str(r["path"]), meta, photo_id=int(r["id"]))
                    updated += 1
            except Exception:
                continue
        return {"success": True, "scanned": len(rows), "updated": updated}

MODULE_CLASS = CollectionsModule
