"""ORT 编码器独立进程隔离：把 ONNX session 放进子进程，主进程零 GIL 卡顿。

背景：ORT 的 InferenceSession 创建（尤其 DirectML 的 D3D12 初始化 + 着色器编译，
冷启动 2-4s）在 C++ 层持有 GIL，子线程加载模型会把主线程/UI 一起卡住；而推理
（Run）本身会释放 GIL，不受影响。因此：

- 子进程持有 ClipEncoder（加载 + 推理都在子进程）；
- 主进程只做毫秒级图像预处理，经管道发送 pixel_values / 文本，收回特征向量；
- 父端 RemoteClipEncoder 与 ClipEncoder 同接口（encode_images/encode_texts/
  encode_query/encode_text/device/providers/temperature），上层可无缝替换；
- worker 启动失败或意外退出时自动重建一次，仍失败则抛错，由上层回退进程内
  ClipEncoder（此时退回"加载期间 UI 短暂卡顿"的旧行为，但功能不受影响）。

子进程经管道死锁自愈：父进程退出（含 os._exit）时管道断裂，子进程 recv 抛
EOFError 自动退出，不会残留。
"""
from __future__ import annotations

import multiprocessing as mp
import threading
import traceback
from pathlib import Path

import numpy as np

READY_TIMEOUT_S = 180.0   # 冷盘 + DML 冷启动的宽裕上限
CALL_TIMEOUT_S = 300.0


def _log(msg: str) -> None:
    print(f"[encoder_worker] {msg}", flush=True)


def _child_main(conn) -> None:
    """子进程入口：加载模型后循环处理请求，直到管道关闭。"""
    try:
        from plugins.semantic_search.encoder_onnx import ClipEncoder

        enc = ClipEncoder()
        conn.send(
            (
                "ok",
                {
                    "device": enc.device,
                    "providers": list(enc.providers),
                    "temperature": float(enc.temperature),
                },
            )
        )
    except Exception:
        try:
            conn.send(("err", traceback.format_exc()))
        except Exception:
            pass
        return

    while True:
        try:
            msg = conn.recv()
        except (EOFError, OSError, KeyboardInterrupt):
            return
        if msg is None or msg[0] == "close":
            return
        try:
            op, payload = msg
            if op == "vision":
                feats = enc.encode_pixel_values(payload)
            elif op == "texts":
                feats = enc.encode_texts(payload)
            elif op == "query":
                feats = enc.encode_query(payload)
            elif op == "ping":
                conn.send(("ok", {"device": enc.device}))
                continue
            else:
                raise ValueError(f"未知指令: {op}")
            conn.send(("ok", feats))
        except Exception:
            try:
                conn.send(("err", traceback.format_exc()))
            except Exception:
                return


class RemoteClipEncoder:
    """进程隔离版 Chinese-CLIP 编码器，与 encoder_onnx.ClipEncoder 同接口。"""

    def __init__(self, model_id: str | None = None, device: str | None = None):
        # model_id/device 仅保留签名兼容：worker 内部按默认解析（本地 onnx 目录优先）
        self.model_id = model_id
        self._req_lock = threading.Lock()
        self._spawn()
        try:
            status, payload = self._recv(READY_TIMEOUT_S)
        except Exception:
            self._terminate()
            raise
        if status != "ok":
            self._terminate()
            raise RuntimeError(f"编码器 worker 加载失败:\n{payload}")
        self.device = payload["device"]
        self.providers = payload["providers"]
        self._temperature = payload["temperature"]
        _log(f"worker 就绪 device={self.device} providers={self.providers}")

    # ---------- 进程管理 ----------

    def _spawn(self) -> None:
        ctx = mp.get_context("spawn")
        self._conn, child_conn = ctx.Pipe(duplex=True)
        # target 用冻结主包内的垫片（app 包随 exe 打包）：冻结子进程不会执行
        # app/main.py 的 sys.path 布置，垫片负责补上外置插件路径后再转交本模块
        from app.ort_worker_entry import ort_worker_entry

        self._proc = ctx.Process(
            target=ort_worker_entry, args=(child_conn,), daemon=True, name="ort-encoder-worker"
        )
        self._proc.start()
        child_conn.close()

    def _terminate(self) -> None:
        proc = getattr(self, "_proc", None)
        if proc is not None and proc.is_alive():
            proc.terminate()
        conn = getattr(self, "_conn", None)
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass

    def _restart(self) -> None:
        _log("worker 失联，重建中...")
        self._terminate()
        self._spawn()
        status, payload = self._recv(READY_TIMEOUT_S)
        if status != "ok":
            raise RuntimeError(f"编码器 worker 重建失败:\n{payload}")
        self.device = payload["device"]
        self.providers = payload["providers"]
        self._temperature = payload["temperature"]

    def _recv(self, timeout: float):
        if not self._conn.poll(timeout):
            raise TimeoutError(f"编码器 worker 超时（>{timeout:.0f}s）")
        return self._conn.recv()

    def _call(self, msg, timeout: float = CALL_TIMEOUT_S):
        """发送请求并等待结果；worker 意外退出时重建一次重试。"""
        with self._req_lock:
            try:
                self._conn.send(msg)
                status, payload = self._recv(timeout)
            except (EOFError, OSError, BrokenPipeError):
                self._restart()
                self._conn.send(msg)
                status, payload = self._recv(timeout)
        if status != "ok":
            raise RuntimeError(f"worker 执行失败:\n{payload}")
        return payload

    def close(self) -> None:
        try:
            self._conn.send(None)
        except Exception:
            pass
        self._terminate()

    # ---------- 与 ClipEncoder 同接口 ----------

    @property
    def temperature(self) -> float:
        return float(self._temperature)

    def encode_images(self, images: list) -> np.ndarray:
        """(N,) 张 RGB PIL 图片 -> (N, 512) float32 归一化向量。

        预处理留在主进程（毫秒级），session 推理在子进程。
        """
        from plugins.semantic_search.encoder_onnx import EMBED_DIM, lite_images_to_pixel_values

        if not images:
            return np.zeros((0, EMBED_DIM), dtype=np.float32)
        pixel_values = lite_images_to_pixel_values(images)
        feats = self._call(("vision", pixel_values))
        return np.asarray(feats, dtype=np.float32)

    def encode_texts(self, texts: list[str]) -> np.ndarray:
        """多条文本 -> (T, 512) float32 归一化矩阵（tokenization 在子进程）。"""
        if not texts:
            from plugins.semantic_search.encoder_onnx import EMBED_DIM

            return np.zeros((0, EMBED_DIM), dtype=np.float32)
        feats = self._call(("texts", list(texts)))
        return np.asarray(feats, dtype=np.float32)

    def encode_query(self, query: str) -> np.ndarray:
        """文本查询 -> (T, 512) 多模板矩阵，供 store.search 取列最大。"""
        feats = self._call(("query", query))
        return np.asarray(feats, dtype=np.float32)

    def encode_text(self, text: str) -> np.ndarray:
        """单条文本 -> (512,) float32 归一化向量（兼容旧调用）。"""
        return self.encode_texts([text]).reshape(-1)
