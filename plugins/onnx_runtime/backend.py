"""ONNX Runtime 共享插件：仅提供 _libs，无前端，启动时最先加载以注入 sys.path"""
from __future__ import annotations

from pathlib import Path

class OnnxRuntimeModule:
    def setup(self, ctx: dict) -> None:
        # _libs 已在 app/main.py 预加载，此处仅日志
        try:
            import onnxruntime as ort
            import cv2
            print(f"[onnx_runtime] ready onnxruntime={ort.__version__} cv2={cv2.__version__} libs={[p.name for p in (Path(__file__).parent/'_libs').iterdir()][:5]}")
        except Exception as exc:
            print(f"[onnx_runtime] 依赖缺失: {exc}")

    def api_methods(self) -> dict:
        return {
            "status": self.status,
        }

    def status(self):
        try:
            import onnxruntime as ort, cv2
            return {"success": True, "onnxruntime": ort.__version__, "cv2": cv2.__version__}
        except Exception as exc:
            return {"success": False, "message": str(exc)}

MODULE_CLASS = OnnxRuntimeModule
