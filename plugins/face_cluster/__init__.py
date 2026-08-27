"""人脸聚类插件（试跑版）。

YuNet(检测) + SFace(128维) ~3MB，CPU即可，复用 semantic_search 的 vector_core。
打包分发：`pip install --target=plugins/face_cluster/_libs -r plugins/face_cluster/requirements.txt`
后 `_libs/` 随插件 zip 分发，无 Python 机器由 exe 内嵌解释器自动优先加载。
"""
import sys as _sys
from pathlib import Path as _Path

_libs = _Path(__file__).parent / "_libs"
if _libs.is_dir():
    _p = str(_libs)
    if _p not in _sys.path:
        _sys.path.insert(0, _p)
