"""Vision LLM 标题 Provider：可选，需配置 api_key。

设计：簇内选3张代表图 -> 缩略图 base64 -> 调 OpenAI 兼容接口 /chat/completions
无 key 时自动回退 semantic_template。
"""
from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import List, Dict

def _thumb_paths_for_photos(photos: List[dict], limit: int = 3) -> List[Path]:
    out = []
    for p in photos[:limit]:
        path = str(p.get("path") or "")
        if not path:
            continue
        # 优先缩略图
        try:
            from app.backend.thumbnailer import existing_thumbnail
            th = existing_thumbnail(path)
            if th and Path(th).exists():
                out.append(Path(th))
                continue
        except Exception:
            pass
        if Path(path).exists():
            out.append(Path(path))
    return out

def _b64_image(path: Path, max_side: int = 512) -> str:
    """读图 -> 缩到 max_side -> jpeg base64"""
    try:
        from PIL import Image
        import io
        with Image.open(path) as im:
            im = im.convert("RGB")
            w, h = im.size
            scale = min(1.0, max_side / max(w, h))
            if scale < 1.0:
                im = im.resize((int(w*scale), int(h*scale)))
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=82)
            return base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        try:
            return base64.b64encode(Path(path).read_bytes()).decode("ascii")
        except Exception:
            return ""

VISION_PROMPT = """你是相册集锦标题助手。给你一组照片（3张代表图），请用2-8个汉字概括它们的共同主题，只输出标题本身，不要解释、不要标点。例如：海边日落、雨后街拍、喵星人午后、雪山徒步。"""

def generate_vision_title(photos: List[dict], config: dict | None = None) -> str | None:
    cfg = config or {}
    api_key = str(cfg.get("vision_api_key") or cfg.get("api_key") or "").strip()
    api_base = str(cfg.get("vision_api_base") or cfg.get("api_base") or "https://api.openai.com/v1").strip().rstrip("/")
    model = str(cfg.get("vision_model") or "gpt-4o-mini").strip()
    if not api_key:
        return None
    thumbs = _thumb_paths_for_photos(photos, limit=3)
    if not thumbs:
        return None
    # 构造 OpenAI vision 消息
    content = [{"type": "text", "text": VISION_PROMPT}]
    for th in thumbs[:3]:
        b64 = _b64_image(th)
        if not b64:
            continue
        content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})
    if len(content) <= 1:
        return None
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": 20,
        "temperature": 0.7,
    }
    try:
        import requests
        url = f"{api_base}/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=20)
        resp.raise_for_status()
        data = resp.json()
        text = str(data["choices"][0]["message"]["content"] or "").strip()
        # 清理：只取第一行，去掉引号
        text = text.splitlines()[0].strip().strip('"“”\'')
        # 限制长度
        if len(text) > 12:
            text = text[:12]
        return text or None
    except Exception as exc:
        print(f"[collections][vision] 调用失败: {exc}", flush=True)
        return None
