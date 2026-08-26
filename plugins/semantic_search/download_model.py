"""Chinese-CLIP 模型下载器：把模型仓库下载为普通文件夹（不使用 HF 缓存布局）。

为什么不用 huggingface_hub 缓存：
- HF 缓存依赖符号链接组织文件，Windows 上需要开发者模式/管理员权限，
  且在受限环境下容易触发权限问题；
- 普通文件夹方案零符号链接依赖，模型自包含于插件数据目录，便于备份与删除。

用法：python -m plugins.semantic_search.download_model
"""
from __future__ import annotations

import sys
import time
import urllib.request
from pathlib import Path

if not sys.stdout.isatty() and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

MODEL_ID = "OFA-Sys/chinese-clip-vit-base-patch16"
MIRROR_BASE = "https://hf-mirror.com"

PLUGIN_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "plugins" / "semantic_search"
MODEL_DIR = PLUGIN_DATA_DIR / "model"

# 加载所需文件；权重文件二选一，运行时按仓库实际内容挑选。
CONFIG_FILES = [
    "config.json",
    "preprocessor_config.json",
    "tokenizer_config.json",
    "vocab.txt",
    "special_tokens_map.json",
    "tokenizer.json",
]
WEIGHT_CANDIDATES = ["model.safetensors", "pytorch_model.bin"]


def remote_url(name: str) -> str:
    return f"{MIRROR_BASE}/{MODEL_ID}/resolve/main/{name}"


USER_AGENT = "PicScanner-SemanticSearch/0.1"


def _open(url: str, **kwargs):
    """带自定义 UA 的 urlopen（部分镜像拒绝默认 Python-urllib UA）。"""
    request = kwargs.pop("request", None)
    if request is None:
        request = urllib.request.Request(url)
    request.add_header("User-Agent", USER_AGENT)
    return urllib.request.urlopen(request, **kwargs)


def list_repo_files() -> dict[str, int]:
    """用 HEAD 请求探测所需文件是否存在并获取大小，返回 {name: size}。

    不依赖 /api/ 元数据接口（部分镜像对其限流或禁止访问）。
    """
    result: dict[str, int] = {}
    for name in CONFIG_FILES + WEIGHT_CANDIDATES:
        size = fetch_size(name)
        if size > 0 or name == "config.json":
            result[name] = size
    return result


def fetch_size(remote_name: str) -> int:
    req = urllib.request.Request(remote_url(remote_name), method="HEAD")
    try:
        with _open(None, request=req, timeout=30) as resp:
            return int(resp.headers.get("Content-Length") or 0)
    except Exception:
        return 0


def download_file(remote_name: str, dest: Path, total_size: int) -> None:
    """支持断点续传的单文件下载；.part 为临时文件。"""
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_suffix(dest.suffix + ".part")
    done = part.stat().st_size if part.exists() else 0
    if total_size and done >= total_size:
        part.rename(dest)
        print(f"  {remote_name}: 已完成（{done / 1048576:.1f}MB）")
        return

    headers = {"Range": f"bytes={done}-"} if done > 0 else {}
    request = urllib.request.Request(remote_url(remote_name), headers=headers)
    started = time.time()
    base = done
    with _open(None, request=request, timeout=60) as resp:
        # 服务器不支持 Range 时会返回完整内容（200），此时从头写。
        resumed = getattr(resp, "status", 200) == 206 and done > 0
        mode = "ab" if resumed else "wb"
        if not resumed:
            done = 0
            base = 0
        with open(part, mode) as fh:
            while True:
                chunk = resp.read(1024 * 512)
                if not chunk:
                    break
                fh.write(chunk)
                done += len(chunk)
                elapsed = max(time.time() - started, 0.001)
                speed = (done - base) / elapsed / 1048576
                total_label = f"{total_size / 1048576:.1f}MB" if total_size else "?"
                print(f"\r  {remote_name}: {done / 1048576:.1f}MB / {total_label} ({speed:.1f}MB/s)",
                      end="", flush=True)
    print()
    part.rename(dest)


def main() -> int:
    print(f"[model] 目标目录: {MODEL_DIR}")
    marker = MODEL_DIR / "config.json"
    if marker.exists():
        print("[model] 模型已存在，跳过下载。如需重新下载请先删除该目录。")
        return 0

    print(f"[model] 探测仓库文件: {MODEL_ID}")
    available = list_repo_files()
    weight_file = next((w for w in WEIGHT_CANDIDATES if w in available), None)
    if weight_file is None or not available.get(weight_file):
        print(f"[model] 未找到权重文件或网络不可用，请检查网络后重试: {WEIGHT_CANDIDATES}")
        return 1
    wanted = [name for name in CONFIG_FILES if name in available] + [weight_file]

    print(f"[model] 共 {len(wanted)} 个文件，开始下载...")
    total_bytes = sum(available.get(name, 0) for name in wanted)
    print(f"[model] 总计约 {total_bytes / 1048576:.0f} MB")
    overall_started = time.time()
    for name in wanted:
        download_file(name, MODEL_DIR / name, available.get(name, 0))
    elapsed = time.time() - overall_started
    size_mb = sum(p.stat().st_size for p in MODEL_DIR.rglob("*") if p.is_file()) / 1048576
    print(f"[model] 完成：{size_mb:.0f}MB，用时 {elapsed:.0f} 秒")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
