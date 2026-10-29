"""由 R2 下載一套劇嘅封面原圖 → <work>/arcCover-src/<drama>/<slug|drama>.(png|jpg)。

    python fetch_sources.py chisee                        # 整套劇 + 有自己碟面嘅短篇
    python fetch_sources.py lancy --arc "我心不死=heart"   # 未有碟面嘅新短篇：自己畀 slug

R2 路徑：<DRAMA_AUDIO_BASE>/<audio.folder>/[<短篇名>/]cover photo.(png|jpg) 或 cover-photo.jpg；
名先轉 NFC 再逐段 URL-encode（空格、中文、全形字）。r2.dev 對 Python urllib 回 403，所以用 curl。
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import unicodedata
from pathlib import Path
from urllib.parse import quote

from build import DEFAULT_WORK, DISC_SUFFIX, REPO_ROOT

R2_BASE = "https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev"
COVER_NAMES = ("cover photo.png", "cover photo.jpg", "cover-photo.jpg")
DRAMA_FILE_STEM = "drama"
CURL_TIMEOUT_S = "60"


def cover_url(segments: list[str]) -> str:
    """每段 NFC + percent-encode（`/` 唔會出現喺段入面，所以全部 encode）"""
    parts = [quote(unicodedata.normalize("NFC", s), safe="") for s in segments]
    return f"{R2_BASE}/{'/'.join(parts)}"


def parse_slugs(pairs: list[str]) -> dict[str, str]:
    """`短篇名=slug` → {NFC 短篇名: slug}"""
    slugs = {}
    for pair in pairs:
        name, sep, slug = pair.rpartition("=")
        if not sep or not name or not slug:
            raise SystemExit(f"error: --arc 要寫成 「短篇名=slug」：{pair}")
        slugs[unicodedata.normalize("NFC", name)] = slug
    return slugs


def targets(data: dict, slugs: dict[str, str]) -> list[tuple[str, list[str]]]:
    """[(本機檔名 stem, R2 folder 段)]：整套劇 + 有碟面 / --arc 指定嘅短篇"""
    folder = data["audio"]["folder"]
    found = [(DRAMA_FILE_STEM, [folder])]
    for arc in data.get("arcs", []):
        name = unicodedata.normalize("NFC", arc["name"])
        disc = arc.get("disc") or ""
        slug = slugs.get(name) or (disc[: -len(DISC_SUFFIX)] if disc.endswith(DISC_SUFFIX) else None)
        if slug:
            found.append((slug, [folder, arc["name"]]))
    return found


def download(url: str, dest: Path) -> bool:
    """curl 落 .part，成功先 rename；404 / 403 回 False，唔留低半個檔"""
    part = dest.with_name(f"{dest.name}.part")
    cmd = ["curl", "-sSfL", "--max-time", CURL_TIMEOUT_S, "-o", str(part), url]
    ok = subprocess.run(cmd, capture_output=True, check=False).returncode == 0
    if ok:
        part.replace(dest)
    else:
        part.unlink(missing_ok=True)
    return ok


def fetch_one(stem: str, segments: list[str], dest_dir: Path, force: bool) -> Path | None:
    existing = [p for p in dest_dir.glob(f"{stem}.*") if p.suffix in (".png", ".jpg")]
    if existing and not force:
        return existing[0]
    for name in COVER_NAMES:
        dest = dest_dir / f"{stem}{Path(name).suffix}"
        if download(cover_url([*segments, name]), dest):
            return dest
    return None


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("drama", help="src/dramas/<id>")
    parser.add_argument("--work", type=Path, default=DEFAULT_WORK, help=f"work 資料夾（預設 {DEFAULT_WORK}）")
    parser.add_argument(
        "--arc", action="append", default=[], help="未有碟面嘅短篇：「短篇名=slug」，可以重複"
    )
    parser.add_argument("--force", action="store_true", help="已經有都重新下載")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    data = json.loads((REPO_ROOT / "src" / "dramas" / args.drama / "drama.json").read_text(encoding="utf-8"))
    if data["audio"].get("host") != "r2":
        print(f"error: {args.drama} 唔係放喺 R2（audio.host = {data['audio'].get('host')}）", file=sys.stderr)
        return 1
    dest_dir = args.work / "arcCover-src" / args.drama
    dest_dir.mkdir(parents=True, exist_ok=True)
    missing = 0
    for stem, segments in targets(data, parse_slugs(args.arc)):
        got = fetch_one(stem, segments, dest_dir, args.force)
        missing += got is None
        print(f"{'ok ' if got else '-- '} {'/'.join(segments)} → {got or '搵唔到 cover photo'}")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
