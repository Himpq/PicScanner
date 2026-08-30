"""集锦聚类引擎：纯函数，无IO，便于单测。"""
from __future__ import annotations

import math
from typing import List, Dict, Tuple

import numpy as np


def _l2norm(mat: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(mat, axis=1, keepdims=True) + 1e-9
    return mat / n

def greedy_cosine_clustering(
    embeddings: np.ndarray,
    thresh: float = 0.72,
    min_size: int = 3,
    max_size: int = 80,
) -> List[List[int]]:
    """阈值贪心聚类：与 face_cluster 同款，适合无 sklearn 场景。
    返回簇的索引列表。
    """
    if embeddings.size == 0:
        return []
    mat = _l2norm(embeddings.astype(np.float32))
    n = mat.shape[0]
    assigned = [-1]*n
    clusters: List[List[int]] = []
    cid = 0
    for i in range(n):
        if assigned[i] != -1:
            continue
        cur = [i]
        assigned[i] = cid
        # 扩张：与种子 cos >= thresh 的归入同簇
        for j in range(i+1, n):
            if assigned[j] != -1:
                continue
            if float(mat[i] @ mat[j]) >= thresh:
                cur.append(j)
                assigned[j] = cid
        if len(cur) >= min_size:
            # 截断过大簇：按与中心相似度排序取前 max_size
            if len(cur) > max_size:
                centroid = mat[cur].mean(axis=0)
                centroid = centroid / (np.linalg.norm(centroid)+1e-9)
                scores = [(idx, float(mat[idx] @ centroid)) for idx in cur]
                scores.sort(key=lambda x: x[1], reverse=True)
                cur = [idx for idx,_ in scores[:max_size]]
                # 被踢出的重新标记为未分配？简化：直接丢弃多余
            clusters.append(cur)
            cid += 1
        else:
            # 回退：这些小簇标记为未分配，不再参与后续（避免抖动）
            for idx in cur:
                assigned[idx] = -1
    return clusters

def kmeans_clustering(
    embeddings: np.ndarray,
    k: int = 8,
    min_size: int = 3,
    seed: int = 42,
) -> List[List[int]]:
    try:
        from sklearn.cluster import KMeans
    except Exception:
        return greedy_cosine_clustering(embeddings, min_size=min_size)
    if embeddings.size == 0:
        return []
    n = embeddings.shape[0]
    k = max(1, min(k, n))
    # 自适应k：若 n/k < min_size 则减小k
    while k > 1 and n // k < min_size:
        k -= 1
    mat = _l2norm(embeddings.astype(np.float32))
    try:
        km = KMeans(n_clusters=k, n_init=10, random_state=seed)
        labels = km.fit_predict(mat)
    except Exception:
        return greedy_cosine_clustering(embeddings, min_size=min_size)
    clusters: Dict[int, List[int]] = {}
    for idx, lab in enumerate(labels):
        clusters.setdefault(int(lab), []).append(idx)
    # 过滤小簇
    out = [v for v in clusters.values() if len(v) >= min_size]
    # 合并过大簇截断
    for i, c in enumerate(out):
        if len(c) > 80:
            centroid = mat[c].mean(axis=0)
            centroid = centroid / (np.linalg.norm(centroid)+1e-9)
            scored = sorted(c, key=lambda idx: float(mat[idx] @ centroid), reverse=True)
            out[i] = scored[:80]
    return out

def deduplicate_burst(embeddings: np.ndarray, ids: List[int], metas: List[dict] | None = None, high_thresh: float = 0.94, time_window_sec: int = 600) -> tuple[np.ndarray, List[int], Dict[int, List[int]]]:
    """连拍去重：同5-10min内且 cos>high_thresh 的仅保留1代表（风景/街拍 burst 去重，人像 pose 差异>阈值故保留）。
    返回 (dedup_embeddings, dedup_ids, burst_map: 代表id -> 被折叠的同组ids)
    阈值 0.94 经验：同机位连拍 0.96+，同人不同姿态约0.82-0.90。
    """
    if embeddings.size == 0:
        return embeddings, ids, {}
    n = embeddings.shape[0]
    # 按时间排序以便窗口判断
    if metas and len(metas)==n:
        # 解析时间戳
        import datetime as _dt
        def _ts(m):
            s = str(m.get("datetime_original") or m.get("date_key") or "")
            try:
                if " " in s:
                    return _dt.datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S").timestamp()
                if len(s)>=10:
                    return _dt.datetime.strptime(s[:10], "%Y-%m-%d").timestamp()
            except Exception:
                pass
            return 0
        order = sorted(range(n), key=lambda i: _ts(metas[i]))
    else:
        order = list(range(n))
    mat = _l2norm(embeddings.astype(np.float32))
    keep_mask = [True]*n
    burst_map: Dict[int, List[int]] = {}
    # 代表 -> 成员
    rep_of = {}
    for idx_pos, i in enumerate(order):
        if not keep_mask[i]:
            continue
        # 与后续同窗口内的比对
        for j in order[idx_pos+1:]:
            if not keep_mask[j]:
                continue
            # 时间窗口：若 metas 提供则判断
            if metas and time_window_sec:
                try:
                    import datetime as _dt2
                    def _ts2(m):
                        s = str(m.get("datetime_original") or m.get("date_key") or "")
                        try:
                            if " " in s:
                                return _dt2.datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S").timestamp()
                            if len(s)>=10:
                                return _dt2.datetime.strptime(s[:10], "%Y-%m-%d").timestamp()
                        except Exception:
                            pass
                        return 0
                    ti = _ts2(metas[i]); tj = _ts2(metas[j])
                    if ti and tj and abs(tj-ti) > time_window_sec:
                        # 已超出窗口（因按时间排序，后续只会更远）
                        if tj > ti:
                            break
                except Exception:
                    pass
            if float(mat[i] @ mat[j]) >= high_thresh:
                keep_mask[j] = False
                rep_of[j] = i
                burst_map.setdefault(ids[i], []).append(ids[j])
    keep_idx = [i for i,m in enumerate(keep_mask) if m]
    return mat[keep_idx] if keep_idx else np.zeros((0, embeddings.shape[1]), np.float32), [ids[i] for i in keep_idx], burst_map

def cluster_photos(
    embeddings: np.ndarray,
    ids: List[int],
    method: str = "auto",
    thresh: float = 0.72,
    min_size: int = 3,
    dedup: bool = True,
    dedup_high_thresh: float = 0.94,
    metas: List[dict] | None = None,
) -> List[Dict]:
    """统一入口：返回 [{indices, centroid, scores}] indices 为在 ids/embeddings 中的下标
    dedup: 风景/街拍连拍去重（人像 pose 差异大故自然保留）
    """
    n = embeddings.shape[0] if embeddings.size else 0
    if n == 0:
        return []
    # 可选去重：先折叠 burst，再聚类
    burst_map: Dict[int, List[int]] = {}
    if dedup:
        embeddings, ids, burst_map = deduplicate_burst(embeddings, ids, metas, high_thresh=dedup_high_thresh)
        n = embeddings.shape[0] if embeddings.size else 0
        if n == 0:
            return []
    if method == "kmeans":
        clusters_idx = kmeans_clustering(embeddings, k=max(3, n//8), min_size=min_size)
    elif method == "greedy":
        clusters_idx = greedy_cosine_clustering(embeddings, thresh=thresh, min_size=min_size)
    else: # auto
        # 先试kmeans，效果差则回退贪心
        try:
            clusters_idx = kmeans_clustering(embeddings, k=max(3, n//8), min_size=min_size)
            # 若聚类过于平均（所有簇大小相近）但相似度低，可能不准 -> 用贪心校验
            if not clusters_idx:
                clusters_idx = greedy_cosine_clustering(embeddings, thresh=thresh, min_size=min_size)
        except Exception:
            clusters_idx = greedy_cosine_clustering(embeddings, thresh=thresh, min_size=min_size)

    mat = _l2norm(embeddings.astype(np.float32))
    result = []
    for c in clusters_idx:
        centroid = mat[c].mean(axis=0)
        centroid = centroid / (np.linalg.norm(centroid)+1e-9)
        scores = {ids[idx]: float(mat[idx] @ centroid) for idx in c}
        # 按分数排序索引
        c_sorted = sorted(c, key=lambda idx: scores[ids[idx]], reverse=True)
        result.append({
            "indices": c_sorted,
            "photo_ids": [ids[i] for i in c_sorted],
            "centroid": centroid,
            "scores": scores,
        })
    # 按簇大小降序
    result.sort(key=lambda x: len(x["photo_ids"]), reverse=True)
    return result

# ---------- 地理辅助 ----------
def geohash_grid(lat: float, lon: float, precision: float = 0.5) -> str:
    """粗网格：0.5deg ~ 55km，用于离线地理集锦"""
    return f"{math.floor(lat/precision)*precision:.1f},{math.floor(lon/precision)*precision:.1f}"

def cluster_by_geo(photos: List[dict], grid: float = 0.5, min_size: int = 3) -> List[Dict]:
    """按 GPS 网格分组，photos 需含 gps_lat/gps_lon/id"""
    buckets: Dict[str, List[dict]] = {}
    for p in photos:
        lat = p.get("gps_lat")
        lon = p.get("gps_lon")
        if lat is None or lon is None:
            continue
        try:
            key = geohash_grid(float(lat), float(lon), precision=grid)
        except Exception:
            continue
        buckets.setdefault(key, []).append(p)
    out = []
    for key, members in buckets.items():
        if len(members) < min_size:
            continue
        # 按时间排序
        members_sorted = sorted(members, key=lambda x: str(x.get("datetime_original") or x.get("date_key") or ""))
        lat_c = sum(float(m["gps_lat"]) for m in members)/len(members)
        lon_c = sum(float(m["gps_lon"]) for m in members)/len(members)
        out.append({
            "grid": key,
            "photo_ids": [int(m["id"]) for m in members_sorted],
            "gps_lat": lat_c,
            "gps_lon": lon_c,
            "count": len(members_sorted),
        })
    out.sort(key=lambda x: x["count"], reverse=True)
    return out
