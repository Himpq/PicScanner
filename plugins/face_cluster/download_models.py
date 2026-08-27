"""下载 YuNet + SFace 到 data/plugins/face_cluster/model/"""
from __future__ import annotations

import urllib.request
from pathlib import Path

from encoder import YUNET_PATH, SFACE_PATH, YUNET_URL, SFACE_URL, MODEL_DIR

def dl(url: str, dst: Path):
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    print(f"下载 {dst.name} <- {url}")
    # 带 UA 避免 403
    req = urllib.request.Request(url, headers={"User-Agent": "PicScanner/1.0"})
    with urllib.request.urlopen(req) as r, open(dst, "wb") as f:
        while True:
            chunk = r.read(8192 * 16)
            if not chunk:
                break
            f.write(chunk)
    print(f"完成 {dst} {dst.stat().st_size} bytes")

if __name__ == "__main__":
    if not YUNET_PATH.exists():
        dl(YUNET_URL, YUNET_PATH)
    else:
        print(f"已存在 {YUNET_PATH}")
    if not SFACE_PATH.exists():
        dl(SFACE_URL, SFACE_PATH)
    else:
        print(f"已存在 {SFACE_PATH}")
    print("done")
