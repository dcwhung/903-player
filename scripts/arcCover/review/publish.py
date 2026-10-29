"""Artifact publish 分批：每次全部送，每批最多 255 個檔 / 64MB，rounds.json 擺最尾。

Artifact 規矩：每個版本最多 511 個檔 / 256MB；更新時冇傳嘅檔會保留。冇做增量（全部 publish 大約 90 個檔，
遠低過上限）：唔使記「上次送咗乜」，亦唔會因為記錯而令頁面靜靜冇咗新 rounds.json。
已經唔再用嘅舊 path（例如刪咗嘅 round）用 `build.py --previous <舊 files.json>` 列出，喺最後一批傳 null 刪走。
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

MAX_FILES_PER_PUBLISH = 255
MAX_BYTES_PER_PUBLISH = 64 * 1024 * 1024
MAX_FILES_PER_VERSION = 511
ROUNDS = "rounds.json"
BATCH_GLOB = "publish-*.json"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ordered(files: dict[str, str]) -> dict[str, str]:
    """rounds.json 擺最尾，等佢引用嘅圖先上咗"""
    picked = dict(files)
    if ROUNDS in picked:
        picked[ROUNDS] = picked.pop(ROUNDS)
    return picked


def stale_paths(previous: dict[str, str], files: dict[str, str]) -> list[str]:
    """上次有、今次冇嘅 published path（artifact 仲保留住，要傳 null 先刪）"""
    return [rel for rel in previous if rel not in files]


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


def write_batches(out: Path, files: dict[str, str], removed: list[str] | None = None) -> list[Path]:
    """清走舊 publish-N.json，將全部檔（+ 要刪嘅舊 path = null，擺最尾）寫成批次"""
    for old in out.glob(BATCH_GLOB):
        old.unlink()
    todo: dict[str, str | None] = {**ordered(files), **dict.fromkeys(removed or [])}
    sizes = {rel: Path(local).stat().st_size if local else 0 for rel, local in todo.items()}
    written = []
    for number, batch in enumerate(batches(todo, sizes), start=1):
        path = out / f"publish-{number}.json"
        path.write_text(json.dumps(batch, ensure_ascii=False, indent=1), encoding="utf-8")
        written.append(path)
    return written
