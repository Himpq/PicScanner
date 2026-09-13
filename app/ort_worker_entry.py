"""冻结子进程入口垫片：ORT 编码器 worker 的 spawn target。

必须保持零重依赖（app 包随主 exe 打包，本模块在子进程中可被 unpickle 导入），
仅负责把外置插件目录补进 sys.path 后转交 plugins.semantic_search.encoder_worker。
开发环境下 sys.path 已含项目根，直接透传。
"""
import sys
from pathlib import Path


def ort_worker_entry(conn):
    if getattr(sys, "frozen", False):
        # 子进程不会执行 app/main.py 的 sys.path 布置，这里补上外置插件路径
        exe_dir = Path(sys.executable).parent.resolve()
        for cand in (exe_dir / "plugins", exe_dir.parent / "plugins"):
            if cand.is_dir() and str(cand) not in sys.path:
                sys.path.insert(0, str(cand))
    from plugins.semantic_search.encoder_worker import _child_main

    _child_main(conn)
