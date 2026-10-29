"""Artifact publish 分批：每次全部送，每批最多 255 個檔 / 64MB（扣埋主頁 index.html），rounds.json 擺最尾。

Artifact 規矩：每個版本最多 511 個檔（連 index.html）/ 256MB；更新時冇傳嘅檔會保留。冇做增量（全部 publish
大約 90 個檔，遠低過上限）：唔使記「上次送咗乜」，亦唔會因為記錯而令頁面靜靜冇咗新 rounds.json。
已經唔再用嘅舊 path（例如刪咗嘅 round）用 `build.py --previous <舊 files.json 或 Artifact 檔案 listing>`
列出，喺最後一批傳 null 刪走（index.html 永遠唔刪）。
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable
from pathlib import Path

MAX_FILES_PER_PUBLISH = 255
MAX_BYTES_PER_PUBLISH = 64 * 1024 * 1024
MAX_FILES_PER_VERSION = 511
ROUNDS = "rounds.json"
PAGE = "index.html"  # publish 嘅主頁（file_path）：唔喺 files 入面，但佔每版一個位、每批嘅 bytes
BATCH_GLOB = "publish-*.json"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ordered(files: dict[str, str]) -> dict[str, str]:
    """rounds.json 擺最尾，等佢引用嘅圖先上咗"""
    picked = dict(files)
    if ROUNDS in picked:
        picked[ROUNDS] = picked.pop(ROUNDS)
    return picked


def read_previous(path: Path) -> list[str]:
    """--previous：舊 files.json（{path: 本機檔}）、JSON 陣列（["index.html", "img/…", …]）
    或者純文字一行一個 path（例如 Artifact `list scope:"files"` 列出嘅 path 抄落檔）"""
    text = path.read_text(encoding="utf-8")
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return [line.strip() for line in text.splitlines() if line.strip()]
    if isinstance(data, dict) and all(isinstance(local, str) for local in data.values()):
        data = list(data)
    if not isinstance(data, list) or not all(isinstance(rel, str) for rel in data):
        raise SystemExit(f"error: {path} 唔係 files.json、JSON path 陣列或者一行一個 path")
    return data


def stale_paths(previous: Iterable[str], files: dict[str, str]) -> list[str]:
    """上次有、今次冇嘅 published path（artifact 仲保留住，要傳 null 先刪）；主頁 index.html 永遠唔刪"""
    return [rel for rel in previous if rel not in files and rel != PAGE]


def over_version_limit(file_count: int) -> bool:
    """files + 主頁 index.html 超過每版上限"""
    return file_count + 1 > MAX_FILES_PER_VERSION


def batches(
    files: dict[str, str | None],
    sizes: dict[str, int],
    max_files: int = MAX_FILES_PER_PUBLISH,
    max_bytes: int = MAX_BYTES_PER_PUBLISH,
) -> list[dict[str, str | None]]:
    """跟次序切，每批 ≤ max_files 個、≤ max_bytes（單一個檔超過就自己一批）"""
    found: list[dict[str, str | None]] = []
    current: dict[str, str | None] = {}
    total = 0
    for rel, local in files.items():
        if current and (len(current) >= max_files or total + sizes[rel] > max_bytes):
            found.append(current)
            current, total = {}, 0
        current[rel] = local
        total += sizes[rel]
    return [*found, current] if current else found


def write_batches(
    out: Path, files: dict[str, str], removed: list[str] | None = None, page_bytes: int = 0
) -> list[Path]:
    """清走舊 publish-N.json，將全部檔（+ 要刪嘅舊 path = null，擺最尾）寫成批次；
    每批嘅 64MB 預留 page_bytes 畀每次都會送嘅主頁 index.html"""
    for old in out.glob(BATCH_GLOB):
        old.unlink()
    todo: dict[str, str | None] = {**ordered(files), **dict.fromkeys(removed or [])}
    sizes = {rel: Path(local).stat().st_size if local else 0 for rel, local in todo.items()}
    written = []
    max_bytes = MAX_BYTES_PER_PUBLISH - page_bytes
    for number, batch in enumerate(batches(todo, sizes, max_bytes=max_bytes), start=1):
        path = out / f"publish-{number}.json"
        path.write_text(json.dumps(batch, ensure_ascii=False, indent=1), encoding="utf-8")
        written.append(path)
    return written
