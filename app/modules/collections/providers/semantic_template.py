"""语义模板标题：无 LLM 时的本地标题生成。"""
from __future__ import annotations

import re
from typing import List, Dict

# 预置语义标签词库：可命中 CLIP 文本编码器的中文自然词（60+，覆盖风景/植物误判）
CANDIDATE_LABELS = [
    # 风景/自然
    "海边", "沙滩", "日落", "夜景", "城市", "街拍",
    "雪山", "山景", "森林", "花海", "落叶", "湖泊",
    "星空", "雨后", "云海", "天空", "云", "风景", "自然",
    "树叶", "绿植", "枝叶", "树枝", "花", "草地", "公园", "河", "湖", "山林",
    # 人/动物
    "猫", "狗", "宠物", "人像", "合影", "婚礼", "人物", "自拍", "家庭",
    # 物/场景
    "美食", "建筑", "车", "街景", "街道", "窗", "阳台", "室内", "静物",
    # 补充
    "植物", "光影", "特写",
]

def _format_date_range(photos: List[dict]) -> str:
    dates = sorted({str(p.get("date_key") or "") for p in photos if p.get("date_key")})
    if not dates:
        times = sorted({str(p.get("datetime_original") or "")[:10] for p in photos if p.get("datetime_original")})
        dates = [d for d in times if d]
    if not dates:
        return ""
    if len(dates) == 1:
        return dates[0]
    return f"{dates[0]}~{dates[-1]}"

def _geo_hint(photos: List[dict]) -> str:
    places = [str(p.get("gps_place") or "").strip() for p in photos if p.get("gps_place")]
    places = [p for p in places if p]
    if places:
        # 取最频繁地名
        from collections import Counter
        c = Counter(places)
        return c.most_common(1)[0][0]
    # 无地名时用坐标网格
    lats = [p.get("gps_lat") for p in photos if p.get("gps_lat") is not None]
    lons = [p.get("gps_lon") for p in photos if p.get("gps_lon") is not None]
    if lats and lons:
        # 粗略提示
        return f"{sum(lats)/len(lats):.1f},{sum(lons)/len(lons):.1f}附近"
    return ""

def _lens_hint(photos: List[dict]) -> str:
    from collections import Counter
    lenses = [str(p.get("lens_model") or "").strip() for p in photos if p.get("lens_model")]
    if not lenses:
        return ""
    common = Counter(lenses).most_common(1)[0][0]
    return common[:18]

_ENC_CACHE = None
_ENC_CACHE_KEY = None
_TXT_CACHE = {}  # labels_tuple -> txt_mat

def _get_encoder():
    global _ENC_CACHE, _ENC_CACHE_KEY
    try:
        from plugins.semantic_search.encoder_onnx import onnx_available as _oa
        if _oa():
            from plugins.semantic_search.encoder_onnx import ClipEncoder as Enc, resolve_model_source as _rs
            key = "onnx:" + str(_rs())
            if _ENC_CACHE is not None and _ENC_CACHE_KEY == key:
                return _ENC_CACHE
            enc = Enc()
            _ENC_CACHE = enc
            _ENC_CACHE_KEY = key
            return enc
        raise ImportError("onnx not ready")
    except Exception:
        try:
            from plugins.semantic_search.encoder import ClipEncoder as Enc, resolve_model_source as _rs2
            key = "torch:" + str(_rs2())
            if _ENC_CACHE is not None and _ENC_CACHE_KEY == key:
                return _ENC_CACHE
            enc = Enc()
            _ENC_CACHE = enc
            _ENC_CACHE_KEY = key
            return enc
        except Exception:
            return None

def _encode_labels(enc, labels):
    """用多模板编码标签，提升单字标签的区分度（同 encoder.QUERY_TEMPLATES）。"""
    try:
        templates = ["{q}", "一张{q}的照片", "{q}的照片", "这是{q}"]
        texts = []
        for lab in labels:
            for t in templates:
                texts.append(t.format(q=lab))
        mat = enc.encode_texts(texts)  # (L*4,512)
        import numpy as _np
        # 每4行取均值再归一
        L = len(labels)
        out = []
        for i in range(L):
            v = mat[i*4:(i+1)*4].mean(axis=0)
            n = float(_np.linalg.norm(v)) + 1e-9
            out.append(v / n)
        return _np.vstack(out)
    except Exception:
        return enc.encode_texts(labels)

def semantic_label_for_centroid(centroid, candidate_labels=None) -> str:
    """用 CLIP 文本编码器对候选标签算相似度，取 Top1。无模型时回退固定标签。"""
    labels = candidate_labels or CANDIDATE_LABELS
    # 批量缓存：同一次 generate 的 12 个 centroid 共用一次文本编码
    cache_key = tuple(labels)
    txt_mat = _TXT_CACHE.get(cache_key)
    enc = _get_encoder()
    if enc is None:
        return labels[0] if labels else "精选"
    try:
        import numpy as _np
        if txt_mat is None:
            txt_mat = _encode_labels(enc, labels)  # (L,512) 多模板均值
            _TXT_CACHE[cache_key] = txt_mat
        cent = _np.asarray(centroid, dtype=_np.float32)
        cent = cent / (float(_np.linalg.norm(cent)) + 1e-9)
        sims = (txt_mat @ cent)  # (L,)
        best = int(_np.argmax(sims))
        return labels[best]
    except Exception:
        return labels[0] if labels else "精选"

def make_title(photos: List[dict], centroid=None, candidate_labels=None) -> tuple[str, str]:
    """返回 (title, subtitle)"""
    n = len(photos)
    label = "精选"
    if centroid is not None:
        try:
            label = semantic_label_for_centroid(centroid, candidate_labels)
        except Exception:
            pass
    geo = _geo_hint(photos)
    date_range = _format_date_range(photos)

    # 标题：标签 + 地理
    if geo and len(geo) < 12:
        title = f"{label} · {geo}"
    else:
        title = label

    # 副标题：数量 + 时间 + 镜头 hint
    parts = [f"{n}张"]
    if date_range:
        parts.append(date_range)
    # 镜头不一定展示，避免过长
    subtitle = " · ".join(parts)
    return title[:24], subtitle[:40]

def make_geo_title(photos: List[dict], grid: str = "") -> tuple[str, str]:
    n = len(photos)
    geo = _geo_hint(photos) or grid
    date_range = _format_date_range(photos)
    title = geo if geo else "地理集锦"
    subtitle = f"{n}张"
    if date_range:
        subtitle += f" · {date_range}"
    return title[:24], subtitle[:40]
