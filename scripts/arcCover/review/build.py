"""砌封面 review 頁：收集 generator 每個 round → <out>/site（rounds.json + 圖）同 <out>/files.json。

work 資料夾結構（全部喺 repo 外面，唔入 git）：
    <work>/arcCover/<drama>/<slug|_drama>/round-N/manifest.json  generate.py 輸出（--out <work>/arcCover）
    <work>/arcCover-src/<drama>/<slug|drama>.(png|jpg)            原圖（fetch_sources.py 下載）
    <work>/review/site/        review 頁（index.html + rounds.json + img/）
    <work>/review/files.json   全部要 publish 嘅檔 {published path: 本機檔}
    <work>/review/publish-N.json  publish 批次：全部檔，每批 ≤ 255 個 / 64MB，rounds.json 擺最尾
                                  每批 64MB 預留主頁 index.html 嘅大小（--page-bytes 改）
                                  （加 --previous <舊 files.json 或 Artifact 檔案 listing>：
                                  冇咗嘅舊 path 喺最後一批傳 null 刪走；index.html 唔刪；
                                  listing = JSON path 陣列，或者一行一個 path）

work 預設 $ARC_COVER_WORK，冇就 $TMPDIR/903-player-covers。每出一個新 round 就重新跑一次。
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import tempfile
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image

REVIEW_DIR = Path(__file__).resolve().parent
TOOL_DIR = REVIEW_DIR.parent
REPO_ROOT = TOOL_DIR.parents[1]
TEMPLATE = REVIEW_DIR / "index.html"
DEFAULT_WORK = Path(os.environ.get("ARC_COVER_WORK") or Path(tempfile.gettempdir()) / "903-player-covers")
if str(TOOL_DIR) not in sys.path:
    sys.path.insert(0, str(TOOL_DIR))

from generate import theme_for  # noqa: E402
from preview import disc_preview, tile_preview  # noqa: E402
from publish import (  # noqa: E402
    MAX_FILES_PER_VERSION,
    PAGE,
    over_version_limit,
    read_previous,
    sha256_file,
    stale_paths,
    write_batches,
)

DRAMA_SLUG = "_drama"
# 細楷英文 / 數字，用單一個 `-` 連接：冇 `/`、`..`，亦唔會整出 docId 嘅 `--` 分隔
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
# cover：頁面 hash 用 `<drama>-cover` 代表整套劇；drama：fetch_sources 整套劇原圖檔名
RESERVED_SLUGS = frozenset({"cover", "drama"})
DISC_SUFFIX = "-disc.webp"
KINDS = ("disc", "tile")
MISSING_ORDER = 999
# 碟面預覽：大碟右邊嗰幾個細碟裁走；背景色喺左下角（距左 2px、距底 3px）攞
DISC_MARGIN = 16
BG_TOLERANCE = 30
BG_PROBE_X = 2
BG_PROBE_FROM_BOTTOM = 3
SCAN_STEP = 4

METHOD_LABEL = {
    "center-crop": "置中裁",
    "saliency-crop": "重點區域裁",
    "face-crop": "人臉置中裁",
    "text-safe-crop": "避開標題裁",
    "fit-blur": "完整圖・模糊底",
    "fit-extend": "完整圖・延伸底",
    "title-shrink": "縮細標題",
}


@dataclass(frozen=True)
class Paths:
    gen: Path
    src: Path
    out: Path
    repo: Path

    @property
    def site(self) -> Path:
        return self.out / "site"


@dataclass
class Site:
    """review 頁資料夾；記低每個要 publish 嘅檔（published path → 本機檔）"""

    root: Path
    files: dict[str, str] = field(default_factory=dict)

    def target(self, rel: str) -> Path:
        dest = self.root / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        return dest

    def add(self, rel: str) -> str:
        self.files[rel] = str(self.root / rel)
        return rel

    def copy(self, src: Path, rel: str) -> str:
        dest = self.target(rel)
        if not dest.exists() or sha256_file(dest) != sha256_file(src):
            shutil.copyfile(src, dest)
        return self.add(rel)

    def save(self, image: Image.Image, rel: str) -> str:
        image.save(self.target(rel), optimize=True)
        return self.add(rel)

    def disc_only(self, src: Path, rel: str) -> str:
        with Image.open(src) as image:
            return self.save(crop_big_disc(image.convert("RGB")), rel)


# ---- 純函數（有 test） ----


def doc_id(drama: str, slug: str, round_no: int) -> str:
    """同 index.html docId() 一樣：artifact db `reviews` collection 嘅 doc id"""
    return f"{drama}--{slug}--r{round_no}"


def check_slug(slug: str, what: str, reserved: frozenset[str] = RESERVED_SLUGS) -> str:
    """唔安全（路徑 / 撞 id）就停：slug 會變檔名、URL hash 同 db doc id"""
    if not SLUG_PATTERN.match(slug) or slug in reserved:
        raise SystemExit(
            f"error: {what} {slug!r} 唔啱：只可以細楷英文、數字同單一個 -，亦唔可以係 {sorted(reserved)}"
        )
    return slug


def page_hash(drama: str, slug: str) -> str:
    """同 index.html hashOf() 一樣"""
    return f"{drama}-{'cover' if slug == DRAMA_SLUG else slug}"


def check_page_ids(dramas: list[dict]) -> None:
    """唔同劇集 / 短篇砌出同一個頁面 hash（例如 sammy-kitty + love 同 sammy + kitty-love）就停"""
    seen: dict[str, str] = {}
    for drama in dramas:
        for arc in drama["arcs"]:
            key = page_hash(drama["id"], arc["slug"])
            where = f"{drama['id']}/{arc['slug']}"
            if key in seen:
                raise SystemExit(f"error: {where} 同 {seen[key]} 嘅頁面 hash 都係 #{key}")
            seen[key] = where


def app_image_name(slug: str, kind: str) -> str:
    """app 入面嘅檔名：整套劇 `disc.webp`，短篇 `<slug>-disc.webp`"""
    return f"{kind}.webp" if slug == DRAMA_SLUG else f"{slug}-{kind}.webp"


def arc_list(data: dict) -> list[tuple[str, str]]:
    """(slug, 名)：整套劇行先，再跟 drama.json 次序列有自己碟面嘅短篇"""
    arcs = [(DRAMA_SLUG, data["name"])]
    for arc in data.get("arcs", []):
        disc = arc.get("disc") or ""
        if disc.endswith(DISC_SUFFIX):
            arcs.append((check_slug(disc[: -len(DISC_SUFFIX)], f"{arc['name']} 嘅 disc slug"), arc["name"]))
    return arcs


def round_number(round_dir: Path) -> int | None:
    """`round-3` → 3；`round-3.partial` 之類 → None"""
    _, _, number = round_dir.name.partition("-")
    return int(number) if number.isdigit() else None


def round_dirs(arc_dir: Path) -> list[Path]:
    if not arc_dir.is_dir():
        return []
    found = [
        r for r in arc_dir.glob("round-*") if round_number(r) is not None and (r / "manifest.json").is_file()
    ]
    return sorted(found, key=round_number)


def with_new_arcs(arcs: list[tuple[str, str]], gen_drama_dir: Path) -> list[tuple[str, str]]:
    """drama.json 未有碟面（新短篇）但已經出咗 round 嘅 slug 都加埋，名暫時用 slug"""
    known = {slug for slug, _ in arcs}
    found = (
        sorted(p.name for p in gen_drama_dir.glob("*") if p.is_dir() and round_dirs(p))
        if gen_drama_dir.is_dir()
        else []
    )
    return arcs + [(check_slug(slug, "generator 資料夾"), slug) for slug in found if slug not in known]


def unique_variants(variants: list[dict]) -> list[dict]:
    """bytes 同前面一樣（duplicateOf）嘅候選唔使再畀人揀"""
    return [v for v in variants if not v.get("duplicateOf")]


def big_disc_box(rgb: np.ndarray) -> tuple[int, int, int, int]:
    """碟面預覽由左邊數第一舊唔係背景色嘅範圍（即係大碟），左右加少少位"""
    height, width = rgb.shape[:2]
    bg = rgb[height - BG_PROBE_FROM_BOTTOM, BG_PROBE_X].astype(int)
    rows = rgb[::SCAN_STEP].astype(int)
    busy = (np.abs(rows - bg).sum(axis=2) > BG_TOLERANCE).any(axis=0).tolist()
    left = busy.index(True) if True in busy else width
    right = busy.index(False, left) if False in busy[left:] else width
    return (max(0, left - DISC_MARGIN), 0, min(width, right + DISC_MARGIN), height)


def crop_big_disc(image: Image.Image) -> Image.Image:
    return image.crop(big_disc_box(np.asarray(image.convert("RGB"))))


# ---- 收集 ----


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def render_current_preview(src: Path, drama: str, kind: str) -> Image.Image:
    """現用圖都用 generator 同一個預覽（碟：碟心、坑紋、暗角；tile：圓角），同候選公平比較"""
    with Image.open(src) as opened:
        art = np.array(opened.convert("RGB"))
    render = disc_preview if kind == "disc" else tile_preview
    image = render(art, theme_for(drama))
    return crop_big_disc(image) if kind == "disc" else image


def current_images(site: Site, paths: Paths, drama: str, slug: str) -> dict[str, str]:
    base = paths.repo / "src" / "dramas" / drama
    out: dict[str, str] = {}
    for kind in KINDS:
        src = base / app_image_name(slug, kind)
        if src.is_file():
            out[kind] = site.copy(src, f"img/{drama}/{slug}/current-{kind}.webp")
            preview = render_current_preview(src, drama, kind)
            out[f"{kind}Preview"] = site.save(preview, f"img/{drama}/{slug}/current-{kind}-preview.png")
    return out


def variant_entry(site: Site, round_dir: Path, rel: str, variant: dict) -> dict:
    put = site.disc_only if variant["kind"] == "disc" else site.copy
    preview = put(round_dir / variant["preview"], f"{rel}/{Path(variant['preview']).name}")
    keys = ("id", "kind", "method", "width", "height")
    label = METHOD_LABEL.get(variant["method"], variant["method"])
    return {**{k: variant[k] for k in keys}, "label": label, "preview": preview}


def round_entry(site: Site, paths: Paths, drama: str, slug: str, round_dir: Path) -> dict:
    manifest = read_json(round_dir / "manifest.json")
    number = manifest["round"]
    rel = f"img/{drama}/{slug}/round-{number}"
    source = paths.src / drama / manifest["source"]["file"]
    return {
        "round": number,
        "docId": doc_id(drama, slug, number),
        "source": site.copy(source, f"{rel}/source{source.suffix}") if source.is_file() else None,
        "sourceSize": [manifest["source"]["width"], manifest["source"]["height"]],
        "variants": [variant_entry(site, round_dir, rel, v) for v in unique_variants(manifest["variants"])],
    }


def arc_entry(site: Site, paths: Paths, drama: str, slug: str, name: str) -> dict:
    rounds = [round_entry(site, paths, drama, slug, r) for r in round_dirs(paths.gen / drama / slug)]
    return {
        "slug": slug,
        "name": name,
        "level": "drama" if slug == DRAMA_SLUG else "arc",
        "current": current_images(site, paths, drama, slug),
        "rounds": rounds,
    }


def drama_entry(site: Site, paths: Paths, drama_dir: Path) -> dict:
    data = read_json(drama_dir / "drama.json")
    drama = check_slug(drama_dir.name, "劇集 id", reserved=frozenset())
    arc_names = with_new_arcs(arc_list(data), paths.gen / drama)
    arcs = [arc_entry(site, paths, drama, slug, name) for slug, name in arc_names]
    return {"id": drama, "name": data["name"], "order": data.get("order", MISSING_ORDER), "arcs": arcs}


def collect(site: Site, paths: Paths) -> dict:
    """全部劇集（跟 app 排序），每套劇：整套劇 + 有自己碟面嘅短篇，各有現用圖同每個 round 嘅候選"""
    dramas_dir = paths.repo / "src" / "dramas"
    drama_dirs = sorted(p for p in dramas_dir.iterdir() if (p / "drama.json").is_file())
    dramas = [drama_entry(site, paths, d) for d in drama_dirs]
    dramas.sort(key=lambda d: (d["order"], d["id"]))
    check_page_ids(dramas)
    return {"dramas": dramas}


def build(paths: Paths, previous: Iterable[str] = (), page_bytes: int | None = None) -> dict[str, str]:
    """寫 site/index.html、site/rounds.json、files.json、publish-N.json（previous 有、今次冇嘅 path = null）；
    回傳 files（唔包 index.html：佢係 publish 嘅主頁，每次 publish 都會送）。
    page_bytes 預設 = site/index.html 大小，每批 64MB 預留畀佢"""
    site = Site(paths.site)
    rounds = collect(site, paths)
    page = site.target(PAGE)
    shutil.copyfile(TEMPLATE, page)
    site.target("rounds.json").write_text(json.dumps(rounds, ensure_ascii=False, indent=1), encoding="utf-8")
    site.add("rounds.json")
    files_json = json.dumps(site.files, ensure_ascii=False, indent=1)
    (paths.out / "files.json").write_text(files_json, encoding="utf-8")
    removed = stale_paths(previous, site.files)
    page_size = page.stat().st_size if page_bytes is None else page_bytes
    write_batches(paths.out, site.files, removed=removed, page_bytes=page_size)
    return site.files


def parse_args(argv: list[str]) -> tuple[Paths, Path | None, int | None]:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--work", type=Path, default=DEFAULT_WORK, help=f"work 資料夾（預設 {DEFAULT_WORK}）")
    parser.add_argument("--out", type=Path, help="review 輸出資料夾（預設 <work>/review）")
    parser.add_argument(
        "--previous",
        type=Path,
        help="上次 publish 用嘅 files.json，或者 Artifact list scope:files 嘅 path（JSON 陣列 / 一行一個）："
        "冇咗嘅 path 會喺最後一批傳 null 刪走（index.html 唔刪）",
    )
    parser.add_argument(
        "--page-bytes",
        type=int,
        help="每批 64MB 預留畀主頁嘅 bytes（預設 = build 出嚟嘅 site/index.html 大小）",
    )
    parser.add_argument("--repo", type=Path, default=REPO_ROOT, help=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    work = args.work.resolve()
    out = (args.out or work / "review").resolve()
    paths = Paths(gen=work / "arcCover", src=work / "arcCover-src", out=out, repo=args.repo.resolve())
    return paths, args.previous, args.page_bytes


def report(paths: Paths, files: dict[str, str], removed: list[str]) -> None:
    batch_paths = sorted(paths.out.glob("publish-*.json"), key=lambda p: int(p.stem.split("-")[1]))
    print(f"{len(files)} files → {paths.site}")
    print(f"publish：file_path={paths.site / 'index.html'}，url 用返同一條 artifact，逐份送：")
    for batch in batch_paths:
        print(f"  files = {batch}（{len(read_json(batch))} 個）")
    for rel in removed:
        print(f"  刪走（null）：{rel}")
    if over_version_limit(len(files)):
        print(
            f"warning: {len(files)} 個檔 + {PAGE} > 每版上限 {MAX_FILES_PER_VERSION}，"
            "要喺 files 傳 null 刪走舊 round",
            file=sys.stderr,
        )


def main(argv: list[str]) -> int:
    paths, previous_path, page_bytes = parse_args(argv)
    # 喺 build 之前讀：--previous 可能就係今次會覆蓋嘅 <out>/files.json
    previous = read_previous(previous_path) if previous_path else []
    files = build(paths, previous, page_bytes)
    report(paths, files, stale_paths(previous, files))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
