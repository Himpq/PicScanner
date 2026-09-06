"""语义搜索终端程序（测试版）。

用法（在项目根目录运行）：
    python -m plugins.semantic_search.cli scan            # 增量扫描 test/ 并建索引
    python -m plugins.semantic_search.cli scan D:/photos  # 扫描指定文件夹
    python -m plugins.semantic_search.cli search "沙滩"    # 单次查询
    python -m plugins.semantic_search.cli                 # 进入交互模式
    python -m plugins.semantic_search.cli stat            # 查看索引状态

交互模式下：直接输入中文即可搜图；:top 10 改条数；:rescan 重新扫描；
输入结果序号用系统默认看图器打开；:quit 退出。
"""
from __future__ import annotations

import argparse
import math
import os
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[2]

try:
    from plugins.semantic_search.encoder_onnx import MODEL_ID, ClipEncoder, load_image, onnx_available

    if not onnx_available():
        raise ImportError("onnx not exported")
except Exception:
    from plugins.semantic_search.encoder import MODEL_ID, ClipEncoder, load_image

from plugins.semantic_search.store import VectorStore

DEFAULT_TEST_DIR = PROJECT_ROOT / "test"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"}
GPU_BATCH_SIZE = 32
CPU_BATCH_SIZE = 8

# 被重定向/捕获时强制 UTF-8 输出，避免中文乱码；真实交互终端保持原样。
if not sys.stdout.isatty() and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if not sys.stderr.isatty() and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def iter_images(folder: Path) -> list[Path]:
    if not folder.exists():
        return []
    return sorted(
        p for p in folder.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS and not p.name.startswith(".")
    )


def fmt_size(n: int) -> str:
    value = float(n)
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return f"{value:.1f}{unit}" if unit != "B" else f"{int(value)}{unit}"
        value /= 1024
    return f"{value:.1f}GB"


def cmd_scan(store: VectorStore, encoder: ClipEncoder, folder: Path, rebuild: bool) -> None:
    files = iter_images(folder)
    if not files:
        print(f"[scan] 文件夹没有可索引的图片: {folder}")
        print(f"[scan] 请把照片放进 {DEFAULT_TEST_DIR} 后重试")
        return

    known = {} if rebuild else store.known_signatures()
    pending = [
        p for p in files
        if (sig := known.get(str(p.resolve()))) is None
        or sig != (p.stat().st_mtime, p.stat().st_size)
    ]
    removed = store.prune_missing()
    print(f"[scan] 共 {len(files)} 张图片，已索引 {len(files) - len(pending)} 张，待处理 {len(pending)} 张"
          + (f"，清理失效 {len(removed)} 条" if removed else ""))

    batch_size = GPU_BATCH_SIZE if encoder.device == "cuda" else CPU_BATCH_SIZE
    started = time.time()
    done = 0
    for start in range(0, len(pending), batch_size):
        chunk = pending[start:start + batch_size]
        images: list = []
        valid: list[Path] = []
        for path in chunk:
            try:
                images.append(load_image(path))
                valid.append(path)
            except Exception as exc:  # 损坏图片跳过，不中断整个扫描
                print(f"\n[scan] 跳过无法读取的文件 {path.name}: {exc}")
        if valid:
            vectors = encoder.encode_images(images)
            for path, vec in zip(valid, vectors):
                store.upsert(
                    path=str(path.resolve()),
                    mtime=path.stat().st_mtime,
                    size=path.stat().st_size,
                    model=MODEL_ID,
                    vector=vec,
                )
        done += len(chunk)
        elapsed = time.time() - started
        speed = done / elapsed if elapsed > 0 else 0.0
        print(f"\r[scan] 进度 {done}/{len(pending)}  ({speed:.1f} 张/秒)", end="", flush=True)
    print(f"\n[scan] 完成，用时 {time.time() - started:.1f} 秒。索引库: {store.path}")
    print(f"[scan] 当前共 {store.count()} 条向量，占用 {fmt_size(store.db_size_bytes())}")


def print_results(results: list[tuple[str, float]], conf: list[float] | None = None) -> None:
    if not results:
        print("  （没有结果）")
        return
    width = max(2, len(str(len(results))))
    for idx, (path, score) in enumerate(results):
        try:
            rel = Path(path).resolve().relative_to(PROJECT_ROOT)
        except ValueError:
            rel = Path(path)
        pct = f"  显著≈{conf[idx] * 100:.0f}%" if conf is not None else ""
        print(f"  {idx + 1:>{width}}. [{score:.4f}]{pct} {str(rel)}")
        bar_len = int(max(score, 0.0) * 30)
        print(f"      {'#' * bar_len:<30} |")


def open_result(path: str) -> None:
    # 参数以列表形式传给系统打开器，不经 shell 拼接（修复命令注入面）
    try:
        if sys.platform == "win32":
            os.startfile(path)  # noqa: S606
        elif sys.platform == "darwin":
            subprocess.run(["open", path], check=False)
        else:
            subprocess.run(["xdg-open", path], check=False)
    except Exception as exc:
        print(f"  无法打开: {exc}")


def run_query(store: VectorStore, encoder: ClipEncoder, query: str, top_k: int) -> list[tuple[str, float]]:
    started = time.time()
    qmat = encoder.encode_query(query)
    raw = store.search(qmat, top_k=top_k, return_stats=True)
    results, mu, sd = raw if isinstance(raw, tuple) else (raw, None, None)
    cost_ms = (time.time() - started) * 1000
    # 相对显著度：以本次查询对全库得分的均值/标准差做 z-score，
    # 再过 logistic 映射到 0~100%（仅供展示，非绝对概率）。
    conf = None
    if results and mu is not None:
        sc = np.array([s for _, s in results], dtype=np.float64)
        z = (sc - mu) / (sd + 1e-9)
        conf = [float(1.0 / (1.0 + math.exp(-zi))) for zi in z]
    print(f"「{query}」 的 Top-{top_k} （耗时 {cost_ms:.0f} ms，{qmat.shape[0]} 个查询模板）:")
    print_results(results, conf=conf)
    return results


def interactive_loop(store: VectorStore, encoder: ClipEncoder) -> None:
    top_k = 5
    last_results: list[tuple[str, float]] = []
    print("=" * 62)
    print("PicScanner 语义搜索测试台（Chinese-CLIP 本地版）")
    print("直接输入文字搜图，例如：沙滩 / 海边日落 / 一只猫 / 城市夜景")
    print("指令: :top N 改条数 | :rescan 重扫 | :stat 状态 | :quit 退出")
    print("=" * 62)
    while True:
        try:
            line = input("\n搜图> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not line:
            continue
        if line.startswith(":"):
            cmd = line.split()[0].lower()
            if cmd in (":q", ":quit", ":exit"):
                break
            if cmd == ":top":
                parts = line.split()
                if len(parts) > 1 and parts[1].isdigit():
                    top_k = max(1, min(50, int(parts[1])))
                    print(f"  返回条数改为 {top_k}")
                else:
                    print(f"  用法: :top 10   （当前 {top_k}）")
                continue
            if cmd == ":stat":
                print(f"  已索引 {store.count()} 条向量，占用 {fmt_size(store.db_size_bytes())}")
                print(f"  向量库: {store.path}")
                print(f"  设备: {encoder.device}  模型: {MODEL_ID}")
                continue
            if cmd == ":rescan":
                cmd_scan(store, encoder, DEFAULT_TEST_DIR, rebuild=False)
                continue
            print("  未知指令。可用: :top N / :rescan / :stat / :quit")
            continue
        if len(line) <= 2 and line.isdigit():
            idx = int(line)
            if 1 <= idx <= len(last_results):
                open_result(last_results[idx - 1][0])
                print(f"  已调用系统看图器打开: {last_results[idx - 1][0]}")
            else:
                print(f"  序号超出范围（1-{len(last_results)}）")
            continue
        last_results = run_query(store, encoder, line, top_k)


def main() -> None:
    parser = argparse.ArgumentParser(description="PicScanner 语义搜索终端测试工具")
    sub = parser.add_subparsers(dest="command")

    p_scan = sub.add_parser("scan", help="扫描文件夹并建立/更新向量索引")
    p_scan.add_argument("folder", nargs="?", default=str(DEFAULT_TEST_DIR))
    p_scan.add_argument("--rebuild", action="store_true", help="忽略缓存，强制重建全部向量")

    p_search = sub.add_parser("search", help="单次查询")
    p_search.add_argument("query")
    p_search.add_argument("-n", "--top", type=int, default=5)

    sub.add_parser("stat", help="查看索引状态")

    args = parser.parse_args()

    store = VectorStore()

    if args.command == "stat":
        print(f"已索引 {store.count()} 条向量，占用 {fmt_size(store.db_size_bytes())}")
        print(f"向量库: {store.path}")
        return

    needs_encoder = args.command in ("scan", "search") or args.command is None
    encoder = None
    if needs_encoder:
        # 优先检查 onnx，再回退 torch
        try:
            from plugins.semantic_search.encoder_onnx import LOCAL_ONNX_DIR, onnx_available

            has_onnx = onnx_available()
        except Exception:
            has_onnx = False
        from plugins.semantic_search.encoder import LOCAL_MODEL_DIR

        if not has_onnx and not (LOCAL_MODEL_DIR / "config.json").exists():
            print(f"[init] 未找到本地模型目录: {LOCAL_MODEL_DIR}")
            print("[init] 请先执行一次模型下载（约 700MB，支持断点续传）:")
            print("       python -m plugins.semantic_search.download_model")
            return
        if has_onnx:
            print(f"[init] 检测到 ONNX 模型 {LOCAL_ONNX_DIR}，优先使用 onnxruntime")
        print("[init] 正在加载 Chinese-CLIP 模型...")
        t0 = time.time()
        encoder = ClipEncoder()
        backend = "onnx" if has_onnx else "torch"
        print(f"[init] 模型就绪（后端: {backend} 设备: {encoder.device}，用时 {time.time() - t0:.1f} 秒）")

    if args.command == "scan":
        cmd_scan(store, encoder, Path(args.folder), rebuild=args.rebuild)
    elif args.command == "search":
        if store.count() == 0:
            print("索引为空，请先执行: python -m plugins.semantic_search.cli scan")
            return
        run_query(store, encoder, args.query, top_k=max(1, args.top))
    else:
        interactive_loop(store, encoder)


if __name__ == "__main__":
    main()
