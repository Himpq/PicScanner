"""地图服务模块：通用 provider 配置 + 连通性探测 + 位置信息补扫。

配置文件：data/module_configs/map_service.json（PluginConfigStore 统一管理）：

    {
      "provider": "tianditu",
      "show_in_info_panel": true,
      "tianditu": {
        "tk": "",            # 兼容旧版：等价于浏览器端 tk
        "browser_tk": "",    # 浏览器端 tk：JSAPI / 瓦片（地图显示用）
        "server_tk": "",     # 服务端 tk：地理编码等 Web 服务（可选）
        "api_version": "4.0",
        "timeout": 12
      }
    }

天地图的浏览器端 / 服务端是两种 key，权限不互通：
- 地图显示（JSAPI + 瓦片）只认浏览器端 key；
- 地理编码等接口只认服务端 key（拿浏览器端 key 去调会 403）。

前端通过全局 get_module_config / set_module_config 读写配置（密钥只存用户本机），
本模块提供 status / test_geocode / backfill_gps 这类主动能力。
"""

from __future__ import annotations

import json
import ssl
import time
from typing import Any
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

PROVIDER_TIANDITU = "tianditu"
SUPPORTED_PROVIDERS = (PROVIDER_TIANDITU,)

DEFAULT_TIANDITU = {
    "tk": "",
    "browser_tk": "",
    "server_tk": "",
    "api_version": "4.0",
    "timeout": 12,
    "coord_type": "cgcs2000",
}

DEFAULT_CONFIG = {
    "provider": PROVIDER_TIANDITU,
    "show_in_info_panel": True,
    "tianditu": dict(DEFAULT_TIANDITU),
}

# 单次补扫上限：bridge 调用是同步的，分批 + 游标推进，避免一次扫全库卡死界面
BACKFILL_BATCH_MAX = 2000


class MapServiceModule:
    """通用地图服务：配置归一化 + 探测 + GPS 补扫。"""

    def setup(self, ctx: dict) -> None:
        self._config = ctx.get("config")
        self._data_dir = ctx.get("data_dir")
        self._storage = ctx.get("storage")

    def api_methods(self) -> dict:
        return {
            "status": self.status,
            "test_connection": self.test_connection,
            "test_geocode": self.test_geocode,
            "backfill_gps": self.backfill_gps,
        }

    # ------------------------------------------------------------------
    # 配置读取与归一化
    # ------------------------------------------------------------------

    def _stored(self) -> dict:
        try:
            raw = self._config.snapshot() if self._config else {}
        except Exception:
            raw = {}
        return raw if isinstance(raw, dict) else {}

    def _provider(self) -> str:
        provider = str(self._stored().get("provider") or PROVIDER_TIANDITU).strip().lower()
        return provider if provider in SUPPORTED_PROVIDERS else PROVIDER_TIANDITU

    def _tianditu_config(self) -> dict:
        stored = self._stored().get("tianditu")
        merged = dict(DEFAULT_TIANDITU)
        if isinstance(stored, dict):
            merged.update(stored)
        return merged

    def _browser_tk(self, override: str | None = None) -> str:
        if override is not None:
            return str(override or "").strip()
        config = self._tianditu_config()
        return str(config.get("browser_tk") or config.get("tk") or "").strip()

    def _server_tk(self, override: str | None = None) -> str:
        if override is not None:
            return str(override or "").strip()
        config = self._tianditu_config()
        return str(config.get("server_tk") or config.get("tk") or "").strip()

    def _show_in_info_panel(self) -> bool:
        raw = self._stored().get("show_in_info_panel", True)
        if isinstance(raw, str):
            return raw.strip().lower() not in {"0", "false", "no", "off", ""}
        return bool(raw)

    # ------------------------------------------------------------------
    # API：状态与探测
    # ------------------------------------------------------------------

    def status(self) -> dict:
        tianditu = self._tianditu_config()
        browser_configured = bool(self._browser_tk())
        server_configured = bool(self._server_tk())
        return {
            "success": True,
            "provider": self._provider(),
            # ready 指“小地图可渲染”，只需要浏览器端 key
            "ready": browser_configured,
            "show_in_info_panel": self._show_in_info_panel(),
            "tianditu": {
                "browser_configured": browser_configured,
                "server_configured": server_configured,
                "api_version": str(tianditu.get("api_version") or "4.0"),
                "coord_type": str(tianditu.get("coord_type") or "cgcs2000"),
            },
        }

    def test_connection(self, provider: str | None = None, tk: str | None = None) -> dict:
        """兼容旧前端：按服务端 key 做地理编码探测。"""
        clean_provider = str(provider or self._provider()).strip().lower()
        if clean_provider == PROVIDER_TIANDITU:
            return self._test_tianditu_geocode(tk)
        return {"success": False, "message": f"暂不支持地图 provider：{clean_provider}"}

    def test_geocode(self, provider: str | None = None, server_tk: str | None = None) -> dict:
        """用服务端 key 探测地理编码接口（浏览器端 key 会 403，属正常现象）。"""
        clean_provider = str(provider or self._provider()).strip().lower()
        if clean_provider == PROVIDER_TIANDITU:
            return self._test_tianditu_geocode(server_tk)
        return {"success": False, "message": f"暂不支持地图 provider：{clean_provider}"}

    def _test_tianditu_geocode(self, server_tk: str | None = None) -> dict:
        config = self._tianditu_config()
        key = self._server_tk(server_tk if server_tk is not None else None)
        if not key:
            return {"success": False, "message": "未配置服务端密钥（server_tk）"}

        timeout = self._clamp_timeout(config.get("timeout"))
        ds = json.dumps({"keyWord": "北京"}, ensure_ascii=False, separators=(",", ":"))
        url = "https://api.tianditu.gov.cn/geocoder?" + urllib_parse.urlencode({"ds": ds, "tk": key})
        started = time.time()
        try:
            http_status, text = self._fetch_text(url, timeout)
        except Exception as exc:
            return {"success": False, "message": f"天地图连接失败：{exc}"}

        latency_ms = int((time.time() - started) * 1000)
        try:
            payload = json.loads(text)
        except Exception:
            payload = None
        if not isinstance(payload, dict):
            snippet = str(text or "").strip()[:120]
            return {
                "success": False,
                "message": f"天地图返回异常（HTTP {http_status}）" + (f"：{snippet}" if snippet else ""),
            }

        status = str(payload.get("status") or "")
        if status == "0":
            return {"success": True, "message": "服务端密钥可用（地理编码正常）", "latency_ms": latency_ms}

        message = str(payload.get("msg") or payload.get("message") or "").strip()
        detail = f"天地图返回状态 {status}" if status else f"天地图请求失败（HTTP {http_status}）"
        if message:
            detail += f"：{message}"
        if http_status == 403 or status == "403":
            detail += "（浏览器端 key 调服务端接口会 403，请确认 key 类型为服务端）"
        return {"success": False, "message": detail}

    # ------------------------------------------------------------------
    # API：GPS 补扫
    # ------------------------------------------------------------------

    def backfill_gps(self, after_id: int = 0, batch: int = 500) -> dict:
        """补扫位置信息：给 gps 为空的老照片重新读取 EXIF GPS 并写回。

        游标式分批（按 id 递增），前端循环调用直到 done：
            backfill_gps(after_id=0) -> {done, next_after_id, scanned, updated, ...}
        读不到文件 / 无 GPS 的行会被游标越过，不会死循环。
        """
        storage = getattr(self, "_storage", None)
        if storage is None:
            return {"success": False, "message": "storage 不可用"}

        try:
            start = max(0, int(after_id or 0))
        except (TypeError, ValueError):
            start = 0
        try:
            size = int(batch or 500)
        except (TypeError, ValueError):
            size = 500
        size = max(1, min(size, BACKFILL_BATCH_MAX))

        try:
            with storage._lock, storage._connect() as conn:
                rows = conn.execute(
                    "SELECT id, path FROM photos "
                    "WHERE id > ? AND (gps_lat IS NULL OR gps_lon IS NULL) "
                    "ORDER BY id LIMIT ?",
                    (start, size),
                ).fetchall()
                rows = [dict(r) for r in rows]
        except Exception as exc:
            return {"success": False, "message": f"查询待补扫照片失败：{exc}"}

        from app.backend.exif_reader import read_metadata

        scanned = 0
        failed = 0
        last_id = start
        updates: list[tuple[float, float, int]] = []
        for row in rows:
            try:
                pid = int(row.get("id") or 0)
            except (TypeError, ValueError):
                continue
            last_id = max(last_id, pid)
            path = str(row.get("path") or "")
            if not path:
                continue
            try:
                meta = read_metadata(path)
            except Exception:
                failed += 1
                scanned += 1
                continue
            scanned += 1
            lat, lon = meta.get("gps_lat"), meta.get("gps_lon")
            if lat is None or lon is None:
                continue
            try:
                updates.append((float(lat), float(lon), pid))
            except (TypeError, ValueError):
                continue

        updated = 0
        if updates:
            try:
                with storage._lock, storage._connect() as conn:
                    conn.executemany("UPDATE photos SET gps_lat=?, gps_lon=? WHERE id=?", updates)
                    updated = len(updates)
            except Exception as exc:
                return {"success": False, "message": f"写回位置信息失败：{exc}"}

        try:
            with storage._lock, storage._connect() as conn:
                left = conn.execute(
                    "SELECT COUNT(*) AS c FROM photos "
                    "WHERE id > ? AND (gps_lat IS NULL OR gps_lon IS NULL)",
                    (last_id,),
                ).fetchone()
                remaining = int((left["c"] if left else 0) or 0)
        except Exception:
            remaining = -1

        return {
            "success": True,
            "done": remaining == 0,
            "next_after_id": last_id,
            "scanned": scanned,
            "updated": updated,
            "failed": failed,
            "remaining": remaining,
        }

    # ------------------------------------------------------------------
    # HTTP 工具（stdlib，避免给主程序增加依赖）
    # ------------------------------------------------------------------

    @staticmethod
    def _ssl_context() -> ssl.SSLContext:
        try:
            import certifi

            return ssl.create_default_context(cafile=certifi.where())
        except Exception:
            return ssl.create_default_context()

    def _fetch_text(self, url: str, timeout: float) -> tuple[int, str]:
        request = urllib_request.Request(url, headers={"User-Agent": "PicScannerMap/0.1"})
        context = self._ssl_context()
        try:
            with urllib_request.urlopen(request, timeout=timeout, context=context) as response:
                return int(getattr(response, "status", 200) or 200), response.read().decode("utf-8-sig")
        except urllib_error.HTTPError as exc:
            return int(exc.code or 0), exc.read().decode("utf-8-sig")

    @staticmethod
    def _clamp_timeout(value: Any, default: float = 12.0) -> float:
        try:
            number = float(value)
        except (TypeError, ValueError):
            number = default
        return max(1.0, min(number, 60.0))
