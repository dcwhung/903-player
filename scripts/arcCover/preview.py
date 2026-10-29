"""本機預覽 PNG：碟面照 app 咁疊（圓形、暗角、坑紋、碟心、碟邊），tile 加書架 2:1 crop 框。

只係畀 reviewer 判斷用，唔會入 app。呢部機冇中文字型，所以標籤用英文。
"""

import cv2
import numpy as np
from PIL import Image, ImageDraw

from analysis import Analysis
from constants import (
    ARC_RING_CSS_PX,
    ARC_RING_WIDTH_CSS_PX,
    GROOVE_ALPHA,
    GROOVE_INSETS,
    PHONE_DISC_CSS_PX,
    RIM_CSS_PX,
    SHELF_ASPECT,
    SMALL_DISC_CSS_PX,
    SMALL_SPINDLE_RATIO,
    SPINDLE_RATIO,
    SPINDLE_RING_ALPHA,
    SPINDLE_RING_CSS_PX,
    TILE_RADIUS_CSS_PX,
    VIGNETTE_ALPHA,
    VIGNETTE_START,
)

SUPERSAMPLE = 3
LARGE_DISC_PX = 420
PREVIEW_SIZE = (900, 560)
LABEL_COLOUR = (60, 60, 60)
ARC_PROGRESS = 0.3  # 預覽入面短篇進度環填幾多
PHONE_TILE_CSS_PX = 358  # 手機書架 tile 大約闊度
CONTACT_CELL_WIDTH = 450
CONTACT_LABEL_PX = 22
FRAME_COLOUR = (220, 40, 40)


def _hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def _circle_mask(diameter: int) -> Image.Image:
    big = Image.new("L", (diameter * SUPERSAMPLE, diameter * SUPERSAMPLE), 0)
    ImageDraw.Draw(big).ellipse((0, 0, big.width - 1, big.height - 1), fill=255)
    return big.resize((diameter, diameter), Image.LANCZOS)


def _ring(diameter: int, width_px: float, colour: tuple[int, int, int, int]) -> Image.Image:
    """透明底上面一個圓環（外徑 = diameter）。"""
    size = diameter * SUPERSAMPLE
    big = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(big).ellipse(
        (0, 0, size - 1, size - 1), outline=colour, width=max(1, round(width_px * SUPERSAMPLE))
    )
    return big.resize((diameter, diameter), Image.LANCZOS)


def _vignette(diameter: int) -> Image.Image:
    ys, xs = np.indices((diameter, diameter), dtype=np.float32)
    radius = np.hypot((xs + 0.5) / diameter - 0.5, (ys + 0.5) / diameter - 0.5) * 2
    alpha = np.clip((radius - VIGNETTE_START) / (1 - VIGNETTE_START), 0, 1) * VIGNETTE_ALPHA
    # 暗角只喺碟入面（.vignette 有 border-radius: 50%）
    alpha *= np.asarray(_circle_mask(diameter), dtype=np.float32) / 255
    layer = np.zeros((diameter, diameter, 4), dtype=np.uint8)
    layer[..., 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(layer, "RGBA")


def render_disc(art: np.ndarray, diameter: int, theme: dict[str, str], large: bool) -> Image.Image:
    """跟 Disc.module.css：.face 圓形 art → .vignette → .groove ×3 → .spindle（+ ring）；large 有碟邊。"""
    css_scale = diameter / (PHONE_DISC_CSS_PX if large else SMALL_DISC_CSS_PX)
    rim_px = round(RIM_CSS_PX * css_scale) if large else 0
    outer = diameter + 2 * rim_px
    rim = _hex_rgb(theme["surface"])
    canvas = Image.new("RGBA", (outer, outer), (0, 0, 0, 0))
    if rim_px:
        canvas.paste(Image.new("RGBA", (outer, outer), rim + (255,)), (0, 0), _circle_mask(outer))
    face = Image.fromarray(art).convert("RGBA").resize((diameter, diameter), Image.LANCZOS)
    canvas.paste(face, (rim_px, rim_px), _circle_mask(diameter))
    if large:
        canvas.alpha_composite(_vignette(diameter), (rim_px, rim_px))
        for inset in GROOVE_INSETS:
            groove_d = round(diameter * (1 - 2 * inset))
            offset = rim_px + round(diameter * inset)
            canvas.alpha_composite(
                _ring(groove_d, css_scale, (255, 255, 255, round(GROOVE_ALPHA * 255))), (offset, offset)
            )
    spindle_d = round(diameter * (SPINDLE_RATIO if large else SMALL_SPINDLE_RATIO))
    spindle_at = (outer - spindle_d) // 2
    canvas.paste(
        Image.new("RGBA", (spindle_d, spindle_d), rim + (255,)),
        (spindle_at, spindle_at),
        _circle_mask(spindle_d),
    )
    if large:
        ring_px = SPINDLE_RING_CSS_PX * css_scale
        ring_d = spindle_d + round(2 * ring_px)
        ring_at = (outer - ring_d) // 2
        canvas.alpha_composite(
            _ring(ring_d, ring_px, (0, 0, 0, round(SPINDLE_RING_ALPHA * 255))), (ring_at, ring_at)
        )
    return canvas


def render_arc_thumb(art: np.ndarray, scale: float, theme: dict[str, str]) -> Image.Image:
    """ArcSheet 行：52px 進度環（conic 進度）入面一個圓形 cover（冇碟心）。"""
    ring_d = round(ARC_RING_CSS_PX * scale)
    inner_d = ring_d - 2 * round(ARC_RING_WIDTH_CSS_PX * scale)
    big = Image.new("RGBA", (ring_d * SUPERSAMPLE, ring_d * SUPERSAMPLE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(big)
    draw.ellipse((0, 0, big.width - 1, big.height - 1), fill=_hex_rgb(theme["track"]) + (255,))
    draw.pieslice(
        (0, 0, big.width - 1, big.height - 1),
        -90,
        -90 + 360 * ARC_PROGRESS,
        fill=_hex_rgb(theme["accent"]) + (255,),
    )
    canvas = big.resize((ring_d, ring_d), Image.LANCZOS)
    cover = Image.fromarray(art).convert("RGBA").resize((inner_d, inner_d), Image.LANCZOS)
    offset = (ring_d - inner_d) // 2
    canvas.paste(cover, (offset, offset), _circle_mask(inner_d))
    return canvas


def disc_preview(art: np.ndarray, theme: dict[str, str]) -> Image.Image:
    page = Image.new("RGBA", PREVIEW_SIZE, _hex_rgb(theme["bg"]) + (255,))
    draw = ImageDraw.Draw(page)
    large = render_disc(art, LARGE_DISC_PX, theme, large=True)
    page.alpha_composite(large, (40, (PREVIEW_SIZE[1] - large.height) // 2))
    column = 40 + large.width + 60
    items = (
        ("arc row x2", render_arc_thumb(art, 2, theme)),
        ("arc row 52px", render_arc_thumb(art, 1, theme)),
        ("small disc x2", render_disc(art, SMALL_DISC_CSS_PX * 2, theme, large=False)),
        ("small disc 40px", render_disc(art, SMALL_DISC_CSS_PX, theme, large=False)),
    )
    top = 40
    for label, image in items:
        page.alpha_composite(image, (column, top))
        draw.text((column + image.width + 16, top + image.height // 2 - 6), label, fill=LABEL_COLOUR)
        top += image.height + 24
    draw.text((40, 16), "player disc (approx. phone size x1.5)", fill=LABEL_COLOUR)
    return page.convert("RGB")


def tile_preview(art: np.ndarray, theme: dict[str, str]) -> Image.Image:
    """tile 加圓角；唔係 2:1 就畫書架 object-fit: cover 會見到嘅 2:1 框。"""
    width = PREVIEW_SIZE[0] - 80
    height = round(width * art.shape[0] / art.shape[1])
    page = Image.new("RGBA", (PREVIEW_SIZE[0], height + 80), _hex_rgb(theme["bg"]) + (255,))
    tile = Image.fromarray(art).convert("RGBA").resize((width, height), Image.LANCZOS)
    radius = round(TILE_RADIUS_CSS_PX * width / PHONE_TILE_CSS_PX)
    mask = Image.new("L", (width * SUPERSAMPLE, height * SUPERSAMPLE), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, mask.width - 1, mask.height - 1), radius * SUPERSAMPLE, fill=255
    )
    page.paste(tile, (40, 40), mask.resize((width, height), Image.LANCZOS))
    draw = ImageDraw.Draw(page)
    shelf_h = round(width / SHELF_ASPECT)
    if abs(shelf_h - height) > 2:
        top = 40 + (height - shelf_h) // 2
        draw.rectangle((40, top, 40 + width - 1, top + shelf_h - 1), outline=FRAME_COLOUR, width=2)
        draw.text((48, top + 6), "shelf 2:1 crop (object-fit: cover)", fill=FRAME_COLOUR)
    draw.text((40, 16), f"tile {art.shape[1]}x{art.shape[0]}", fill=LABEL_COLOUR)
    return page.convert("RGB")


def analysis_overlay(rgb: np.ndarray, analysis: Analysis) -> Image.Image:
    """原圖 + saliency 熱圖 + 人面（綠）+ 標題字（紅）+ 焦點（藍十字）。"""
    heat = cv2.applyColorMap((analysis.saliency * 255).astype(np.uint8), cv2.COLORMAP_JET)[..., ::-1]
    blended = (rgb.astype(np.float32) * 0.6 + heat.astype(np.float32) * 0.4).astype(np.uint8)
    image = Image.fromarray(blended)
    draw = ImageDraw.Draw(image)
    for face in analysis.faces:
        draw.rectangle((face.x, face.y, face.right, face.bottom), outline=(0, 220, 0), width=3)
    for box in analysis.text_boxes:
        draw.rectangle((box.x, box.y, box.right, box.bottom), outline=(230, 0, 0), width=3)
    focal_x, focal_y = analysis.focal
    draw.line((focal_x - 14, focal_y, focal_x + 14, focal_y), fill=(0, 80, 255), width=3)
    draw.line((focal_x, focal_y - 14, focal_x, focal_y + 14), fill=(0, 80, 255), width=3)
    return image


def contact_sheet(previews: list[tuple[str, Image.Image]]) -> Image.Image:
    """全部預覽縮細排兩欄，一張圖睇晒。"""
    cells = []
    for label, image in previews:
        height = round(image.height * CONTACT_CELL_WIDTH / image.width)
        cells.append((label, image.resize((CONTACT_CELL_WIDTH, height), Image.LANCZOS)))
    row_heights = []
    for start in range(0, len(cells), 2):
        row_heights.append(max(cell.height for _, cell in cells[start : start + 2]) + CONTACT_LABEL_PX)
    sheet = Image.new("RGB", (CONTACT_CELL_WIDTH * 2, sum(row_heights) or 1), (255, 255, 255))
    draw = ImageDraw.Draw(sheet)
    top = 0
    for row, row_height in enumerate(row_heights):
        for column, (label, cell) in enumerate(cells[row * 2 : row * 2 + 2]):
            draw.text((column * CONTACT_CELL_WIDTH + 6, top + 5), label, fill=LABEL_COLOUR)
            sheet.paste(cell, (column * CONTACT_CELL_WIDTH, top + CONTACT_LABEL_PX))
        top += row_height
    return sheet
