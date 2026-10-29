"""Artifact publish 分批：每次最多 255 個檔 / 64MB；淨係送同上次 publish 唔同（sha256）嘅檔。

Artifact 規矩：每個版本最多 511 個檔 / 256MB；更新時冇傳嘅檔會保留，所以之後淨係要送新 / 改咗嘅檔。
build.py 寫 <out>/publish-1.json、publish-2.json…；逐份 publish 去同一條 URL，全部成功之後跑
`build.py --work <work> --mark-published` 記低 hash（<out>/published.json）。
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

MAX_FILES_PER_PUBLISH = 255
MAX_BYTES_PER_PUBLISH = 64 * 1024 * 1024
MAX_FILES_PER_VERSION = 511
ROUNDS = "rounds.json"
FILES_JSON = "files.json"
PUBLISHED_JSON = "published.json"
BATCH_GLOB = "publish-*.json"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def hashes(files: dict[str, str]) -> dict[str, str]:
    return {rel: sha256_file(Path(local)) for rel, local in files.items()}


def changed(files: dict[str, str], now: dict[str, str], published: dict[str, str]) -> dict[str, str]:
    """hash 唔同（或者未 publish 過）嘅檔；rounds.json 擺最尾，等佢引用嘅圖先上咗"""
    picked = {rel: local for rel, local in files.items() if published.get(rel) != now[rel]}
    if ROUNDS in picked:
        picked[ROUNDS] = picked.pop(ROUNDS)
    return picked


def batches(
    files: dict[str, str],
    sizes: dict[str, int],
    max_files: int = MAX_FILES_PER_PUBLISH,
    max_bytes: int = MAX_BYTES_PER_PUBLISH,
) -> list[dict[str, str]]:
    """跟次序切，每批 ≤ max_files 個、≤ max_bytes（單一個檔超過就自己一批）"""
    found: list[dict[str, str]] = []
    current: dict[str, str] = {}
    total = 0
    for rel, local in files.items():
        if current and (len(current) >= max_files or total + sizes[rel] > max_bytes):
            found.append(current)
            current, total = {}, 0
        current[rel] = local
        total += sizes[rel]
    return [*found, current] if current else found


def read_published(out: Path) -> dict[str, str]:
    path = out / PUBLISHED_JSON
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}


def write_batches(out: Path, files: dict[str, str]) -> list[Path]:
    """清走舊 publish-N.json，寫今次要送嘅批次；冇改動就一份都唔寫"""
    for old in out.glob(BATCH_GLOB):
        old.unlink()
    todo = changed(files, hashes(files), read_published(out))
    sizes = {rel: Path(local).stat().st_size for rel, local in todo.items()}
    written = []
    for number, batch in enumerate(batches(todo, sizes), start=1):
        path = out / f"publish-{number}.json"
        path.write_text(json.dumps(batch, ensure_ascii=False, indent=1), encoding="utf-8")
        written.append(path)
    return written


def mark_published(out: Path) -> int:
    """全部批次 publish 成功之後：記低 files.json 每個檔而家嘅 hash"""
    files = json.loads((out / FILES_JSON).read_text(encoding="utf-8"))
    (out / PUBLISHED_JSON).write_text(json.dumps(hashes(files), indent=1), encoding="utf-8")
    for old in out.glob(BATCH_GLOB):
        old.unlink()
    return len(files)
