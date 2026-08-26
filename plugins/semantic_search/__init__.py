"""语义搜索插件（终端测试版）。

当前为独立立项阶段：扫描指定文件夹的图片 -> Chinese-CLIP 向量化 ->
存入独立 SQLite 向量库 -> 终端输入自然语言查询。

后续 PicScanner 提供 API 后，可将 encoder/store 迁入正式插件体系。

打包分发：`pip install --target=plugins/semantic_search/_libs -r plugins/semantic_search/requirements.txt`
后 `_libs/` 随插件 zip 分发，无 Python 机器上 exe 内嵌解释器会自动优先从此加载。
"""
import sys as _sys
from pathlib import Path as _Path

_libs = _Path(__file__).parent / "_libs"
if _libs.is_dir():
    _p = str(_libs)
    if _p not in _sys.path:
        _sys.path.insert(0, _p)
