from __future__ import annotations

import ctypes
import os
from pathlib import Path

from .source_identity import marker_path, read_marker


def connected_roots() -> list[Path]:
    if os.name != "nt":
        return [Path("/")]

    bitmask = ctypes.windll.kernel32.GetLogicalDrives()
    roots = []
    for index in range(26):
        if not (bitmask & (1 << index)):
            continue
        root = Path(f"{chr(ord('A') + index)}:\\")
        drive_type = int(ctypes.windll.kernel32.GetDriveTypeW(ctypes.c_wchar_p(str(root))))
        if drive_type not in {0, 1}:
            roots.append(root)
    return roots


def _path_key(path: str | Path) -> str:
    return os.path.normcase(os.path.normpath(str(path or "")))


def candidate_paths_for_hint(hint_path: str | Path, roots: list[str | Path]) -> list[Path]:
    hint = Path(str(hint_path or ""))
    if not str(hint):
        return []

    anchor = hint.anchor
    if not anchor:
        return [hint]
    try:
        relative = hint.relative_to(anchor)
    except ValueError:
        return [hint]

    candidates = []
    seen = set()
    for root_path in roots:
        candidate = Path(root_path) / relative
        key = _path_key(candidate)
        if key in seen:
            continue
        seen.add(key)
        candidates.append(candidate)
    return candidates


def discover_marked_sources(
    hint_paths: list[str | Path],
    *,
    roots: list[str | Path] | None = None,
) -> dict:
    active_roots = [Path(root) for root in (roots if roots is not None else connected_roots())]
    candidate_paths = []
    seen_candidates = set()
    for hint_path in hint_paths:
        for candidate in candidate_paths_for_hint(hint_path, active_roots):
            key = _path_key(candidate)
            if key in seen_candidates:
                continue
            seen_candidates.add(key)
            candidate_paths.append(candidate)

    grouped: dict[str, dict[str, dict]] = {}
    errors = []
    for candidate in candidate_paths:
        marker = marker_path(candidate)
        if not marker.exists() or not marker.is_file():
            continue
        try:
            marker_data = read_marker(candidate)
        except Exception as exc:
            message = str(exc)
            errors.append({"path": str(marker), "message": message})
            print(f"[PicScannerSourceDiscovery] marker read failed path={marker} error={message}")
            continue
        source_id = str((marker_data or {}).get("source_id") or "").strip()
        if not source_id:
            message = "来源标记缺少 source_id"
            errors.append({"path": str(marker), "message": message})
            print(f"[PicScannerSourceDiscovery] marker invalid path={marker} error={message}")
            continue
        resolved = candidate.resolve()
        grouped.setdefault(source_id, {})[_path_key(resolved)] = {
            "source_id": source_id,
            "path": str(resolved),
            "marker_path": str(marker_path(resolved)),
        }

    sources = []
    conflicts = []
    for source_id, path_map in grouped.items():
        matches = sorted(path_map.values(), key=lambda item: item["path"].lower())
        if len(matches) == 1:
            sources.append(matches[0])
            continue
        conflicts.append(
            {
                "source_id": source_id,
                "paths": [item["path"] for item in matches],
                "marker_paths": [item["marker_path"] for item in matches],
            }
        )
        print(
            "[PicScannerSourceDiscovery] duplicate source_id hidden "
            f"source_id={source_id} paths={[item['path'] for item in matches]}"
        )

    sources.sort(key=lambda item: item["path"].lower())
    conflicts.sort(key=lambda item: item["source_id"])
    return {
        "sources": sources,
        "conflicts": conflicts,
        "errors": errors,
        "checked_paths": len(candidate_paths),
    }
