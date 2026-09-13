"""Thin launcher for PicScanner."""

import multiprocessing

# 冻结 exe 时 multiprocessing spawn 子进程入口必须尽早接管；开发环境为 no-op
multiprocessing.freeze_support()

from app.main import main


if __name__ == "__main__":
    main()
