#!/usr/bin/env python3
"""由短篇 / 廣播劇封面相生成 app 用嘅碟面（disc）同 tile 候選圖。

用法（喺 repo 根目錄）：
    python scripts/arcCover/generate.py --input "cover photo.png" --drama lancy --arc half --out /tmp/arcCover

每次輸出一個 round 資料夾：<out>/<drama>/<arc>/round-N/，入面有候選 webp、預覽 PNG、
analysis.png、contact.png 同 manifest.json。同一張圖、同一組參數，輸出每次一樣。
"""

import argparse
import hashlib
import json
import re
import sys
import zlib
from dataclasses import dataclass, replace
from pathlib import Path

import numpy as np
from PIL import Image

from analysis import Analysis, Box, analyse, load_rgb
from compose import (
    best_window,
    centre_window,
    crop_to,
    fit_blur,
    fit_extend,
    shrink_title,
    subject_window,
)
from constants import (
    ARC_TILE_SIZE,
    BLUR_DIM,
    BLUR_SIGMA_RATIO,
    CENTER_CROP,
    DEFAULT_THEME,
    DETERMINISTIC_SEED,
    DISC,
    DISC_SIZE,
    DRAMA_LEVEL_SLUG,
    DRAMA_TILE_SIZE,
    EXTEND_BAND_RATIO,
    FACE_CROP,
    FIT_BLUR,
    FIT_EXTEND,
    MANIFEST_SCHEMA,
    SALIENCY_CROP,
    TEXT_SAFE_CROP,
    TILE,
    TITLE_SHRINK,
    TITLE_SHRINK_SCALE,
    TOOL_VERSION,
    WEBP_METHOD,
    WEBP_QUALITY,
    Kind,
    Method,
)
from preview import analysis_overlay, contact_sheet, disc_preview, tile_preview

REPO_ROOT = Path(__file__).resolve().parents[2]
ROUND_PATTERN = re.compile(r"^round-(\d+)$")
SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*$")
EXIT_USAGE = 2

DISC_METHODS: tuple[Method, ...] = (
    CENTER_CROP,
    SALIENCY_CROP,
    FACE_CROP,
    TEXT_SAFE_CROP,
    FIT_BLUR,
    FIT_EXTEND,
)
TILE_METHODS: tuple[Method, ...] = (CENTER_CROP, SALIENCY_CROP, TEXT_SAFE_CROP, FIT_BLUR, FIT_EXTEND)


class GeneratorError(Exception):
    """參數 / 輸出位置有問題（例如 round 已經存在）。"""


@dataclass(frozen=True)
class Options:
    input: Path
    drama: str
    arc: str | None
    out: Path
    round: int | None = None
    title_box: Box | None = None
    title_scale: float = TITLE_SHRINK_SCALE
    force: bool = False


@dataclass(frozen=True)
class Rendered:
    kind: Kind
    method: Method
    image: np.ndarray
    params: dict[str, object]


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _seed_for(kind: Kind, method: Method) -> int:
    # crc32 唔似 hash() 會隨 process 變，保證每次一樣
    return DETERMINISTIC_SEED + zlib.crc32(f"{kind}:{method}".encode())


def _crop_params(box: Box) -> dict[str, object]:
    return {"crop": box.to_list()}


def _render_crop(
    rgb: np.ndarray, analysis: Analysis, kind: Kind, method: Method, size: tuple[int, int]
) -> Rendered:
    aspect, disc = size[0] / size[1], kind == DISC
    image_size = (rgb.shape[1], rgb.shape[0])
    params: dict[str, object]
    if method == CENTER_CROP:
        box = centre_window(image_size, aspect)
        params = _crop_params(box)
    elif method == SALIENCY_CROP:
        box = best_window(analysis, aspect, disc=disc, avoid_text=False)
        params = {**_crop_params(box), "discWeighted": disc}
    elif method == FACE_CROP:
        box, subject = subject_window(analysis, aspect, disc=disc)
        params = {**_crop_params(box), "subject": subject, "faces": len(analysis.faces)}
    else:
        box = best_window(analysis, aspect, disc=disc, avoid_text=True)
        params = {**_crop_params(box), "textSource": analysis.text_source, "discWeighted": disc}
    return Rendered(kind, method, crop_to(rgb, box, size), params)


def _render_title_shrink(
    rgb: np.ndarray, analysis: Analysis, options: Options, size: tuple[int, int]
) -> Rendered:
    assert options.title_box is not None
    shrunk, new_box = shrink_title(rgb, options.title_box, options.title_scale)
    shrunk_analysis = replace(analysis, text_boxes=(new_box,), text_source="manual")
    box = best_window(shrunk_analysis, size[0] / size[1], disc=True, avoid_text=True)
    params = {
        **_crop_params(box),
        "titleBox": options.title_box.to_list(),
        "titleScale": options.title_scale,
        "shrunkTitleBox": new_box.to_list(),
    }
    return Rendered(DISC, TITLE_SHRINK, crop_to(shrunk, box, size), params)


def render_variants(rgb: np.ndarray, analysis: Analysis, options: Options) -> list[Rendered]:
    tile_size = ARC_TILE_SIZE if options.arc else DRAMA_TILE_SIZE
    rendered: list[Rendered] = []
    for kind, methods, size in ((DISC, DISC_METHODS, DISC_SIZE), (TILE, TILE_METHODS, tile_size)):
        for method in methods:
            if method == FIT_BLUR:
                params = {"blurSigma": round(min(size) * BLUR_SIGMA_RATIO, 2), "dim": BLUR_DIM}
                rendered.append(Rendered(kind, method, fit_blur(rgb, size), params))
            elif method == FIT_EXTEND:
                seed = _seed_for(kind, method)
                params = {"seed": seed, "bandRatio": EXTEND_BAND_RATIO}
                rendered.append(Rendered(kind, method, fit_extend(rgb, size, seed), params))
            else:
                rendered.append(_render_crop(rgb, analysis, kind, method, size))
        if kind == DISC and options.title_box is not None:
            rendered.append(_render_title_shrink(rgb, analysis, options, size))
    return rendered


def _round_dir(options: Options) -> tuple[int, Path]:
    arc_dir = options.out / options.drama / (options.arc or DRAMA_LEVEL_SLUG)
    if options.round is not None:
        number = options.round
    else:
        existing = [
            int(match.group(1))
            for child in arc_dir.glob("round-*")
            if (match := ROUND_PATTERN.match(child.name))
        ]
        number = max(existing, default=0) + 1
    target = arc_dir / f"round-{number}"
    if (target / "manifest.json").exists() and not options.force:
        raise GeneratorError(f"{target} 已經有 manifest.json；換 --round 或者加 --force 覆蓋")
    return number, target


def _theme_for(drama: str) -> dict[str, str]:
    """預覽顏色跟 src/dramas/<drama>/drama.json 嘅 theme；搵唔到就用預設。"""
    drama_json = REPO_ROOT / "src" / "dramas" / drama / "drama.json"
    if not drama_json.is_file():
        return dict(DEFAULT_THEME)
    theme = json.loads(drama_json.read_text(encoding="utf-8")).get("theme", {})
    return {key: str(theme.get(key, fallback)) for key, fallback in DEFAULT_THEME.items()}


def _save_webp(image: np.ndarray, path: Path) -> bytes:
    Image.fromarray(image).save(path, "WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
    return path.read_bytes()


def _write_variants(
    rendered: list[Rendered], target: Path, prefix: str, theme: dict[str, str]
) -> list[dict[str, object]]:
    (target / "previews").mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []
    seen: dict[str, str] = {}
    sheet_items = []
    for item in rendered:
        variant_id = f"{item.kind}-{item.method}"
        file_name = f"{prefix}-{variant_id}.webp"
        digest = _sha256(_save_webp(item.image, target / file_name))
        preview_name = f"previews/{prefix}-{variant_id}.png"
        decoded = np.asarray(Image.open(target / file_name).convert("RGB"))
        preview = disc_preview(decoded, theme) if item.kind == DISC else tile_preview(decoded, theme)
        preview.save(target / preview_name, "PNG")
        sheet_items.append((variant_id, preview))
        entry: dict[str, object] = {
            "id": variant_id,
            "kind": item.kind,
            "method": item.method,
            "file": file_name,
            "preview": preview_name,
            "width": int(item.image.shape[1]),
            "height": int(item.image.shape[0]),
            "sha256": digest,
            "params": item.params,
        }
        # 同一個 kind 兩個方法出到一模一樣（例如原圖已經係 16:9）就標返，review 時唔使睇兩次
        if digest in seen:
            entry["duplicateOf"] = seen[digest]
        seen.setdefault(digest, variant_id)
        entries.append(entry)
    contact_sheet(sheet_items).save(target / "contact.png", "PNG")
    return entries


def run(options: Options) -> dict[str, object]:
    """生成一個 round，寫 manifest.json，回傳 manifest 內容。"""
    for slug in filter(None, (options.drama, options.arc)):
        if not SLUG_PATTERN.match(slug):
            raise GeneratorError(f"slug 只可以用細楷英文、數字同 -：{slug!r}")
    rgb = load_rgb(str(options.input))
    analysis = analyse(rgb, options.title_box)
    number, target = _round_dir(options)
    target.mkdir(parents=True, exist_ok=True)
    analysis_overlay(rgb, analysis).save(target / "analysis.png", "PNG")
    rendered = render_variants(rgb, analysis, options)
    prefix = options.arc or "drama"
    manifest: dict[str, object] = {
        "schema": MANIFEST_SCHEMA,
        "tool": "scripts/arcCover/generate.py",
        "toolVersion": TOOL_VERSION,
        "drama": options.drama,
        "arc": options.arc,
        "level": "arc" if options.arc else "drama",
        "round": number,
        "source": {
            "file": options.input.name,
            "sha256": _sha256(options.input.read_bytes()),
            "width": int(rgb.shape[1]),
            "height": int(rgb.shape[0]),
        },
        "analysis": analysis.summary(),
        "analysisImage": "analysis.png",
        "contactSheet": "contact.png",
        "variants": _write_variants(rendered, target, prefix, _theme_for(options.drama)),
    }
    (target / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def _parse_box(value: str) -> Box:
    parts = [int(part) for part in value.split(",")]
    if len(parts) != 4 or parts[2] <= 0 or parts[3] <= 0:
        raise argparse.ArgumentTypeError("要 x,y,w,h（原圖 px，w / h > 0）")
    return Box(*parts)


def _parse_args(argv: list[str]) -> Options:
    parser = argparse.ArgumentParser(description="短篇 / 廣播劇封面 → disc + tile 候選圖")
    parser.add_argument("--input", required=True, type=Path, help="封面相（jpg / png / webp）")
    parser.add_argument("--drama", required=True, help="廣播劇 id（src/dramas/<id>）")
    parser.add_argument("--arc", help="短篇 slug（例如 half）；唔填 = 廣播劇本身封面（tile 2:1）")
    parser.add_argument("--out", required=True, type=Path, help="輸出根目錄（建議放 repo 外面）")
    parser.add_argument("--round", type=int, help="round 號；唔填 = 下一個")
    parser.add_argument(
        "--title-box", type=_parse_box, help="標題字框 x,y,w,h：蓋過自動偵測，並加 title-shrink 碟面"
    )
    parser.add_argument(
        "--title-scale", type=float, default=TITLE_SHRINK_SCALE, help="title-shrink 縮到幾多倍"
    )
    parser.add_argument("--force", action="store_true", help="覆蓋已有 round")
    args = parser.parse_args(argv)
    return Options(
        args.input, args.drama, args.arc, args.out, args.round, args.title_box, args.title_scale, args.force
    )


def main(argv: list[str]) -> int:
    options = _parse_args(argv)
    try:
        manifest = run(options)
    except GeneratorError as error:
        print(f"error: {error}", file=sys.stderr)
        return EXIT_USAGE
    variants = manifest["variants"]
    assert isinstance(variants, list)
    print(f"round {manifest['round']}: {len(variants)} variants")
    for variant in variants:
        print(f"  {variant['file']}  {variant['width']}x{variant['height']}  {variant['method']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
