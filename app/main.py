"""
PicScanner application entry point.

Run from the project root:
    python main.py
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
APP_ROOT = PROJECT_ROOT / "app"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from WebViewUI import WebViewApp
from app.backend.api import PicScannerApi


def main():
    entry = APP_ROOT / "ui" / "index.html"
    app = WebViewApp(
        entry_url=str(entry),
        js_api=PicScannerApi(),
        title="PicScanner",
        width=1280,
        height=820,
        min_size=(1040, 680),
        brand="PicScanner",
        titlebar_height=36,
        use_bootstrap=False,
        use_native_nav_cover=False,
    )
    print("[PicScanner] launching...")
    app.run()
