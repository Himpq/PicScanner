"""视觉题材分类的纯函数，和模型加载、存储、前端完全分离。"""
from __future__ import annotations

from typing import Sequence

import numpy as np


def normalise_rows(matrix: np.ndarray) -> np.ndarray:
    """按行归一化，避免异常向量把点积结果污染。"""
    mat = np.asarray(matrix, dtype=np.float32)
    if mat.ndim != 2:
        raise ValueError(f"矩阵必须是二维，实际为 {mat.ndim} 维")
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    return mat / np.maximum(norms, 1e-9)


def classify_score_matrix(
    scores: np.ndarray,
    labels: Sequence[dict],
    *,
    min_margin: float = 0.012,
    secondary_gap: float = 0.025,
    max_secondary: int = 3,
) -> list[dict]:
    """把照片×标签相似度矩阵变成可持久化的分类结果。

    每一行始终产生一个结果；低 margin 的照片进入待确认桶，不会静默丢失。
    scores 预期已经是余弦相似度，形状为 (照片数, 标签数)。
    """
    mat = np.asarray(scores, dtype=np.float32)
    if mat.ndim != 2:
        raise ValueError(f"scores 必须是二维，实际为 {mat.ndim} 维")
    if mat.shape[1] != len(labels):
        raise ValueError(f"scores 列数 {mat.shape[1]} 与标签数 {len(labels)} 不一致")
    if not labels:
        return [{"primary_key": "uncertain", "primary_label": "待确认", "primary_score": 0.0, "margin": 0.0, "uncertain": True, "secondary": [], "scores": {}} for _ in mat]

    out: list[dict] = []
    for row in mat:
        order = np.argsort(-row, kind="stable")
        best_idx = int(order[0])
        second_score = float(row[int(order[1])]) if len(order) > 1 else float(row[best_idx])
        best_score = float(row[best_idx])
        margin = best_score - second_score
        uncertain = margin < float(min_margin)
        secondary = []
        cutoff = best_score - float(secondary_gap)
        for idx in order[1:]:
            idx = int(idx)
            if len(secondary) >= max(0, int(max_secondary)):
                break
            if float(row[idx]) >= cutoff:
                secondary.append({
                    "key": str(labels[idx]["key"]),
                    "label": str(labels[idx]["label"]),
                    "score": float(row[idx]),
                })
        out.append({
            "primary_key": "uncertain" if uncertain else str(labels[best_idx]["key"]),
            "primary_label": "待确认" if uncertain else str(labels[best_idx]["label"]),
            "primary_score": best_score,
            "margin": margin,
            "uncertain": uncertain,
            "secondary": secondary,
            "scores": {str(labels[i]["key"]): float(row[i]) for i in range(len(labels))},
        })
    return out


def weighted_primary_contributions(
    scores: dict[str, float],
    labels: Sequence[dict],
    *,
    min_margin: float = 0.012,
) -> list[dict]:
    """把一张照片分配到饼图的互斥题材贡献中。

    明确领先的题材获得 1.0 贡献；第一、第二名差距不足阈值时，使用
    两者的相对相似度做 softmax 分配。这样一张照片的总贡献始终为 1，
    但不会把边界照片武断地塞进单一题材。
    """
    candidates = []
    for item in labels:
        key = str(item["key"])
        if key in scores:
            candidates.append((key, float(scores[key])))
    candidates.sort(key=lambda pair: (-pair[1], pair[0]))
    if not candidates:
        raise ValueError("scores 中没有可用题材标签")
    if len(candidates) == 1:
        return [{"key": candidates[0][0], "weight": 1.0}]

    best_key, best_score = candidates[0]
    second_key, second_score = candidates[1]
    margin = best_score - second_score
    if margin >= float(min_margin):
        return [{"key": best_key, "weight": 1.0}]

    # 只在近似平局时拆前两名，避免把一个题材稀释到很多切片。
    temperature = max(float(min_margin), 1e-6)
    best_exp = float(np.exp((best_score - best_score) / temperature))
    second_exp = float(np.exp((second_score - best_score) / temperature))
    total = best_exp + second_exp
    return [
        {"key": best_key, "weight": best_exp / total},
        {"key": second_key, "weight": second_exp / total},
    ]


def select_diverse_samples(
    candidates: Sequence[dict],
    vectors: dict[int, np.ndarray],
    *,
    limit: int = 6,
    similarity_threshold: float = 0.94,
) -> list[dict]:
    """从题材候选中选择彼此不极度相似的代表照片。"""
    selected: list[dict] = []
    selected_vectors: list[np.ndarray] = []
    for candidate in sorted(
        candidates,
        key=lambda item: (-float(item.get("weight", 0.0)), -float(item.get("score", 0.0)), int(item["photo_id"])),
    ):
        if len(selected) >= max(0, int(limit)):
            break
        photo_id = int(candidate["photo_id"])
        raw_vector = vectors.get(photo_id)
        if raw_vector is None:
            raise ValueError(f"样本照片缺少语义向量: {photo_id}")
        vector = np.asarray(raw_vector, dtype=np.float32).reshape(-1)
        norm = float(np.linalg.norm(vector))
        if norm <= 1e-9:
            raise ValueError(f"样本照片向量无效: {photo_id}")
        vector = vector / norm
        if any(float(vector @ previous) >= float(similarity_threshold) for previous in selected_vectors):
            continue
        selected.append(candidate)
        selected_vectors.append(vector)
    return selected
