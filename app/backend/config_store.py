import json
import secrets
import sys
from pathlib import Path


def get_app_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parents[2]


DATA_DIR = get_app_root() / "data"
CONFIG_PATH = DATA_DIR / "picscanner_config.json"

DEFAULT_CONFIG = {
    "app_id": "",
    "remembered_folders": [],
    "last_source": "",
    "copy_mode": "current",
    "favorite_folders": [],
}


class ConfigStore:
    def __init__(self, path: Path = CONFIG_PATH):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._data = self._load()

    def _load(self) -> dict:
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text(encoding="utf-8-sig"))
            except Exception as exc:
                raise RuntimeError(f"配置文件读取失败: {self.path} ({exc})") from exc
            if not isinstance(data, dict):
                raise RuntimeError(f"配置文件格式错误: {self.path}")
        else:
            data = dict(DEFAULT_CONFIG)

        merged = dict(DEFAULT_CONFIG)
        merged.update(data)
        if not merged.get("app_id"):
            merged["app_id"] = secrets.token_hex(24)
        self._data = merged
        self.save()
        return merged

    def save(self) -> None:
        self.path.write_text(
            json.dumps(self._data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def snapshot(self) -> dict:
        return json.loads(json.dumps(self._data, ensure_ascii=False))

    def get(self, key: str, default=None):
        return self._data.get(key, DEFAULT_CONFIG.get(key, default))

    def set(self, key: str, value) -> None:
        self._data[key] = value
        self.save()

    def remember_folder(self, folder: str) -> list[str]:
        p = str(Path(folder).resolve())
        folders = [str(Path(x).resolve()) for x in self._data.get("remembered_folders", []) if x]
        folders = [x for x in folders if x.lower() != p.lower()]
        folders.insert(0, p)
        self._data["remembered_folders"] = folders[:24]
        self._data["last_source"] = p
        self.save()
        return self._data["remembered_folders"]


config_store = ConfigStore()
