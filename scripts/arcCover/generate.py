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
import platform
import re
import shutil
import sys
import zlib
from dataclasses import dataclass, replace
from pathlib import Path

import cv2
import numpy as np
import PIL
from PIL import Image, features

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
# 寫緊嘅 round 先放 round-N.partial，成功先 rename；--force 時舊 round 暫時改名 round-N.old
PARTIAL_SUFFIX = ".partial"
RETIRED_SUFFIX = ".old"
UPSCALE_DECIMALS = 3
BOX_FIELDS = 4  # x,y,w,h

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


def _crop_params(box: Box, size: tuple[int, int]) -> dict[str, object]:
    # upscale > 1 = 窗口細過輸出要放大，review 頁可以提示「可能朦」
    return {"crop": box.to_list(), "upscale": round(size[0] / box.w, UPSCALE_DECIMALS)}


def _render_crop(
    rgb: np.ndarray, analysis: Analysis, kind: Kind, method: Method, size: tuple[int, int]
) -> Rendered:
    aspect, disc = size[0] / size[1], kind == DISC
    image_size = (rgb.shape[1], rgb.shape[0])
    params: dict[str, object]
    if method == CENTER_CROP:
        box = centre_window(image_size, aspect)
        params = _crop_params(box, size)
    elif method == SALIENCY_CROP:
        box = best_window(analysis, aspect, disc=disc, avoid_text=False)
        params = {**_crop_params(box, size), "discWeighted": disc}
    elif method == FACE_CROP:
        box, subject = subject_window(analysis, aspect, disc, size[1])
        params = {**_crop_params(box, size), "subject": subject, "faces": len(analysis.faces)}
    else:
        box = best_window(analysis, aspect, disc=disc, avoid_text=True)
        params = {**_crop_params(box, size), "textSource": analysis.text_source, "discWeighted": disc}
    return Rendered(kind, method, crop_to(rgb, box, size), params)


def _render_title_shrink(
    rgb: np.ndarray, analysis: Analysis, options: Options, size: tuple[int, int]
) -> Rendered:
    # 唔用 assert：python -O 會拎走
    if options.title_box is None:
        raise ValueError("title-shrink 要有 --title-box")
    shrunk, new_box = shrink_title(rgb, options.title_box, options.title_scale)
    shrunk_analysis = replace(analysis, text_boxes=(new_box,), text_source="manual")
    box = best_window(shrunk_analysis, size[0] / size[1], disc=True, avoid_text=True)
    params = {
        **_crop_params(box, size),
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


def _validate(options: Options) -> None:
    """唔使讀圖嘅檢查：喺分析、開資料夾之前做晒，錯就 GeneratorError（CLI 唔會出 traceback）。"""
    for slug in filter(None, (options.drama, options.arc)):
        if not SLUG_PATTERN.match(slug):
            raise GeneratorError(f"slug 只可以用細楷英文、數字同 -：{slug!r}")
    if not options.input.is_file():
        raise GeneratorError(f"搵唔到封面相：{options.input}")
    if options.round is not None and options.round < 1:
        raise GeneratorError(f"--round 要 ≥ 1：{options.round}")
    if not 0 < options.title_scale <= 1:
        raise GeneratorError(f"--title-scale 要大過 0、最多 1：{options.title_scale}")
    box = options.title_box
    if box is not None and (box.w <= 0 or box.h <= 0 or box.x < 0 or box.y < 0):
        raise GeneratorError(f"--title-box 要 x,y ≥ 0、w,h > 0：{box.to_list()}")


def _load_source(options: Options) -> np.ndarray:
    """讀圖（跟 EXIF 轉正）；--title-box 要完全喺轉正後嘅原圖入面。"""
    try:
        rgb = load_rgb(str(options.input))
    except (OSError, ValueError, Image.DecompressionBombError) as error:
        raise GeneratorError(f"讀唔到圖：{options.input}（{error}）") from error
    height, width = rgb.shape[:2]
    box = options.title_box
    if box is not None and (box.right > width or box.bottom > height):
        raise GeneratorError(f"--title-box {box.to_list()} 超出原圖 {width}×{height}")
    return rgb


def _round_dir(options: Options) -> tuple[int, Path]:
    arc_dir = options.out / options.drama / (options.arc or DRAMA_LEVEL_SLUG)
    if options.round is not None:
        number = options.round
    else:
        # ROUND_PATTERN 唔認 round-N.partial，crash 留低嘅暫存唔會令自動號跳
        existing = [
            int(match.group(1))
            for child in arc_dir.glob("round-*")
            if (match := ROUND_PATTERN.match(child.name))
        ]
        number = max(existing, default=0) + 1
    target = arc_dir / f"round-{number}"
    if target.exists() and not options.force:
        raise GeneratorError(f"{target} 已經存在；換 --round 或者加 --force 覆蓋")
    return number, target


def theme_for(drama: str) -> dict[str, str]:
    """預覽顏色跟 src/dramas/<drama>/drama.json 嘅 theme；搵唔到就用預設。"""
    drama_json = REPO_ROOT / "src" / "dramas" / drama / "drama.json"
    if not drama_json.is_file():
        return dict(DEFAULT_THEME)
    theme = json.loads(drama_json.read_text(encoding="utf-8")).get("theme", {})
    return {key: str(theme.get(key, fallback)) for key, fallback in DEFAULT_THEME.items()}


def _save_webp(image: np.ndarray, path: Path) -> bytes:
    Image.fromarray(image).save(path, "WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
    return path.read_bytes()


def _write_one(
    item: Rendered, target: Path, prefix: str, theme: dict[str, str]
) -> tuple[dict[str, object], Image.Image]:
    """寫一個候選 webp + 預覽 PNG；預覽由解碼返嘅 webp 砌，睇到真正嘅壓縮效果。"""
    variant_id = f"{item.kind}-{item.method}"
    file_name = f"{prefix}-{variant_id}.webp"
    preview_name = f"previews/{prefix}-{variant_id}.png"
    digest = _sha256(_save_webp(item.image, target / file_name))
    with Image.open(target / file_name) as image:
        decoded = np.asarray(image.convert("RGB"))
    preview = disc_preview(decoded, theme) if item.kind == DISC else tile_preview(decoded, theme)
    preview.save(target / preview_name, "PNG")
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
    return entry, preview


def _write_variants(
    rendered: list[Rendered], target: Path, prefix: str, theme: dict[str, str]
) -> list[dict[str, object]]:
    (target / "previews").mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []
    seen: dict[str, str] = {}
    sheet_items = []
    for item in rendered:
        entry, preview = _write_one(item, target, prefix, theme)
        variant_id, digest = str(entry["id"]), str(entry["sha256"])
        # 同一個 kind 兩個方法出到一模一樣（例如原圖已經係 16:9）就標返，review 時唔使睇兩次；
        # 冇重複都寫 null，review 頁唔使分「冇 key」同「null」
        entry["duplicateOf"] = seen.get(digest)
        seen.setdefault(digest, variant_id)
        entries.append(entry)
        sheet_items.append((variant_id, preview))
    contact_sheet(sheet_items).save(target / "contact.png", "PNG")
    return entries


def _environment() -> dict[str, str]:
    """會影響輸出 bytes 嘅版本：唔同 env 出嘅 round，sha256 / duplicateOf 唔一定可以比。"""
    return {
        "python": platform.python_version(),
        "pillow": PIL.__version__,
        "libwebp": str(features.version("webp")),
        "opencv": cv2.__version__,
        "numpy": np.__version__,
    }


def _build_manifest(
    options: Options, number: int, rgb: np.ndarray, analysis: Analysis, variants: list[dict[str, object]]
) -> dict[str, object]:
    return {
        "schema": MANIFEST_SCHEMA,
        "tool": "scripts/arcCover/generate.py",
        "toolVersion": TOOL_VERSION,
        "env": _environment(),
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
        "variants": variants,
    }


def _write_round(options: Options, number: int, rgb: np.ndarray, staging: Path) -> dict[str, object]:
    """分析 + 合成 + 寫晒所有檔去 staging（round-N.partial）。"""
    analysis = analyse(rgb, options.title_box)
    staging.mkdir(parents=True)
    analysis_overlay(rgb, analysis).save(staging / "analysis.png", "PNG")
    rendered = render_variants(rgb, analysis, options)
    variants = _write_variants(rendered, staging, options.arc or "drama", theme_for(options.drama))
    manifest = _build_manifest(options, number, rgb, analysis, variants)
    (staging / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def _publish(staging: Path, target: Path) -> None:
    """成個 round 寫好先 rename 做 round-N；--force 時舊 round 成個換走（唔會留低舊檔）。"""
    if not target.exists():
        staging.rename(target)
        return
    retired = target.with_name(target.name + RETIRED_SUFFIX)
    shutil.rmtree(retired, ignore_errors=True)
    target.rename(retired)
    staging.rename(target)
    shutil.rmtree(retired)


def run(options: Options) -> dict[str, object]:
    """生成一個 round，寫 manifest.json，回傳 manifest 內容。"""
    _validate(options)
    number, target = _round_dir(options)
    rgb = _load_source(options)
    staging = target.with_name(target.name + PARTIAL_SUFFIX)
    shutil.rmtree(staging, ignore_errors=True)  # 上次 crash 留低嘅暫存
    try:
        manifest = _write_round(options, number, rgb, staging)
    except BaseException:
        # 中途出錯：只刪今次嘅暫存，舊 round（--force 時）原封不動
        shutil.rmtree(staging, ignore_errors=True)
        raise
    _publish(staging, target)
    return manifest


def _parse_box(value: str) -> Box:
    parts = [int(part) for part in value.split(",")]
    if len(parts) != BOX_FIELDS:
        raise argparse.ArgumentTypeError("要 x,y,w,h 四個數")
    x, y, w, h = parts
    if x < 0 or y < 0 or w <= 0 or h <= 0:
        raise argparse.ArgumentTypeError("要 x,y,w,h（原圖 px，x / y ≥ 0，w / h > 0）")
    return Box(*parts)


def _positive_int(value: str) -> int:
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("round 要 ≥ 1")
    return number


def _parse_args(argv: list[str]) -> Options:
    parser = argparse.ArgumentParser(description="短篇 / 廣播劇封面 → disc + tile 候選圖")
    parser.add_argument("--input", required=True, type=Path, help="封面相（jpg / png / webp）")
    parser.add_argument("--drama", required=True, help="廣播劇 id（src/dramas/<id>）")
    parser.add_argument("--arc", help="短篇 slug（例如 half）；唔填 = 廣播劇本身封面（tile 2:1）")
    parser.add_argument("--out", required=True, type=Path, help="輸出根目錄（建議放 repo 外面）")
    parser.add_argument("--round", type=_positive_int, help="round 號（≥ 1）；唔填 = 下一個")
    parser.add_argument(
        "--title-box", type=_parse_box, help="標題字框 x,y,w,h：蓋過自動偵測，並加 title-shrink 碟面"
    )
    parser.add_argument(
        "--title-scale", type=float, default=TITLE_SHRINK_SCALE, help="title-shrink 縮到幾多倍（0–1]"
    )
    parser.add_argument("--force", action="store_true", help="成個 round 重新生成（舊檔會清走）")
    args = parser.parse_args(argv)
    return Options(
        args.input, args.drama, args.arc, args.out, args.round, args.title_box, args.title_scale, args.force
    )


def main(argv: list[str]) -> int:
    options = _parse_args(argv)
    try:
        manifest = run(options)
    except (GeneratorError, OSError) as error:
        print(f"error: {error}", file=sys.stderr)
        return EXIT_USAGE
    variants = manifest["variants"]
    if not isinstance(variants, list):
        raise TypeError("manifest variants 應該係 list")
    print(f"round {manifest['round']}: {len(variants)} variants")
    for variant in variants:
        print(f"  {variant['file']}  {variant['width']}x{variant['height']}  {variant['method']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
