"""揀 crop 位同合成：cover crop、焦點 / 人面 / 避字 crop、模糊延伸、生成補底、縮細標題。

全部 deterministic：補底嘅顆粒用固定 seed 嘅 numpy Generator。
"""

import cv2
import numpy as np

from analysis import Analysis, Box
from constants import (
    ANALYSIS_SHORT_SIDE,
    BLUR_DIM,
    BLUR_SIGMA_RATIO,
    EXTEND_BAND_RATIO,
    EXTEND_SEAM_PX,
    EXTEND_SMOOTH_SIGMA,
    FACE_CROP_MARGIN,
    SPINDLE_RATIO,
    TEXT_CUT_PENALTY,
    TITLE_DIFF_THRESHOLD,
    VIGNETTE_ALPHA,
    VIGNETTE_START,
)

Size = tuple[int, int]  # (闊, 高)

# 碟面中間有碟心擋住：人面中心放喺窗口高度呢個比例，唔好畀碟心蓋住塊面
DISC_FACE_CENTRE_Y = 0.40
TILE_FACE_CENTRE_Y = 0.45
# 「成個字喺入面 / 完全喺出面」嘅容差
TEXT_INSIDE = 0.98
TEXT_OUTSIDE = 0.02
CENTRE_TIE_BREAK = 1e-6
CIRCLE_CLIP_CUT = 0.3
# 揀咗位之後，字框差幾多就推埋（縮圖 1 px ≈ 原圖幾 px）
SNAP_MIN_PX = 4
SNAP_RATIO = 0.05
TITLE_HOLE_MIN_PX = 6
TITLE_HOLE_RATIO = 0.08
# 補底顆粒最多幾多個 MAD：只要細紋理，唔要邊緣嘅物件輪廓
GRAIN_CLIP_MAD = 3.0


def resize_to(rgb: np.ndarray, size: Size) -> np.ndarray:
    shrinking = size[0] <= rgb.shape[1] and size[1] <= rgb.shape[0]
    interpolation = cv2.INTER_AREA if shrinking else cv2.INTER_LANCZOS4
    return cv2.resize(rgb, size, interpolation=interpolation)


def crop_to(rgb: np.ndarray, box: Box, size: Size) -> np.ndarray:
    return resize_to(rgb[box.y : box.bottom, box.x : box.right], size)


def window_size(image_size: Size, aspect: float) -> Size:
    """原圖入面最大、比例係 aspect（闊 / 高）嘅窗口。"""
    width, height = image_size
    if width / height > aspect:
        return round(height * aspect), height
    return width, round(width / aspect)


def _clamp_window(centre: tuple[float, float], window: Size, image_size: Size) -> Box:
    left = int(np.clip(round(centre[0] - window[0] / 2), 0, image_size[0] - window[0]))
    top = int(np.clip(round(centre[1] - window[1] / 2), 0, image_size[1] - window[1]))
    return Box(left, top, window[0], window[1])


def centre_window(image_size: Size, aspect: float) -> Box:
    window = window_size(image_size, aspect)
    return _clamp_window((image_size[0] / 2, image_size[1] / 2), window, image_size)


def disc_visibility(size: Size) -> np.ndarray:
    """碟面可見程度：圓形以外 0、碟心 0、碟邊跟暗角（Disc.module.css .vignette）遞減。"""
    width, height = size
    ys, xs = np.indices((height, width), dtype=np.float32)
    radius = np.hypot((xs + 0.5) / width - 0.5, (ys + 0.5) / height - 0.5) * 2
    fade = np.clip((radius - VIGNETTE_START) / (1 - VIGNETTE_START), 0, 1)
    weight = 1 - VIGNETTE_ALPHA * fade
    weight[(radius > 1) | (radius < SPINDLE_RATIO)] = 0
    return weight.astype(np.float32)


def _text_cut(
    boxes: tuple[Box, ...], lefts: np.ndarray, tops: np.ndarray, window: Size, disc: bool
) -> np.ndarray:
    """每個窗口位置切開幾多字：0 = 冇切；字一半喺入一半喺出最嚴重。"""
    cut = np.zeros(lefts.shape, dtype=np.float32)
    for box in boxes:
        inter_w = np.clip(np.minimum(lefts + window[0], box.right) - np.maximum(lefts, box.x), 0, None)
        inter_h = np.clip(np.minimum(tops + window[1], box.bottom) - np.maximum(tops, box.y), 0, None)
        fraction = inter_w * inter_h / max(1, box.w * box.h)
        partial = (fraction > TEXT_OUTSIDE) & (fraction < TEXT_INSIDE)
        if disc:
            # 碟係圓嘅：方窗口入面但係角落出咗圓都算切到
            half_w, half_h = window[0] / 2, window[1] / 2
            far_x = np.maximum(np.abs(box.x - lefts - half_w), np.abs(box.right - lefts - half_w))
            far_y = np.maximum(np.abs(box.y - tops - half_h), np.abs(box.bottom - tops - half_h))
            outside_circle = (fraction >= TEXT_INSIDE) & (np.hypot(far_x / half_w, far_y / half_h) > 1)
            cut += np.where(outside_circle, CIRCLE_CLIP_CUT, 0)
        # 方窗口切開字永遠差過「字喺方窗口入面、淨係角落出咗圓」：避唔到時至少成行字喺圖入面
        cut += np.where(partial, 1 + np.minimum(fraction, 1 - fraction), 0)
    return cut


def best_window(analysis: Analysis, aspect: float, disc: bool, avoid_text: bool) -> Box:
    """喺縮圖上面 slide 最大窗口，揀可見 saliency（碟面計埋圓形 / 碟心 / 暗角）最多嘅位置。"""
    height, width = analysis.saliency.shape
    scale = ANALYSIS_SHORT_SIDE / min(width, height)
    small = cv2.resize(
        analysis.saliency, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA
    )
    full_window = window_size((width, height), aspect)
    small_window = (
        min(small.shape[1], round(full_window[0] * scale)),
        min(small.shape[0], round(full_window[1] * scale)),
    )
    kernel = disc_visibility(small_window) if disc else np.ones(small_window[::-1], dtype=np.float32)
    scores = cv2.matchTemplate(small, kernel, cv2.TM_CCORR)
    tops, lefts = np.indices(scores.shape)
    if avoid_text and analysis.text_boxes:
        boxes = tuple(box.scaled(scale) for box in analysis.text_boxes)
        cut = _text_cut(boxes, lefts, tops, small_window, disc)
        scores = scores - TEXT_CUT_PENALTY * float(scores.max()) * cut
    # 打和就揀最近中間，結果唔會跟浮點雜訊跳
    distance = np.hypot(lefts - (scores.shape[1] - 1) / 2, tops - (scores.shape[0] - 1) / 2)
    best = np.unravel_index(
        int(np.argmax(scores - CENTRE_TIE_BREAK * float(scores.max()) * distance)), scores.shape
    )
    centre = ((best[1] + small_window[0] / 2) / scale, (best[0] + small_window[1] / 2) / scale)
    window = _clamp_window(centre, full_window, (width, height))
    return _snap_to_text(window, analysis.text_boxes, (width, height)) if avoid_text else window


def _snap_axis(start: int, length: int, box_start: int, box_end: int, limit: int) -> int:
    """縮圖上揀位有幾 px 誤差：字差少少就成個入 / 成個出，就推到啱啱好。"""
    slack = max(SNAP_MIN_PX, round((box_end - box_start) * SNAP_RATIO))
    candidates = (box_start, box_end - length, box_end, box_start - length)
    for target in candidates:
        if abs(start - target) <= slack and 0 <= target <= limit - length:
            covered = min(start + length, box_end) - max(start, box_start)
            if 0 < covered < box_end - box_start:
                return target
    return start


def _snap_to_text(window: Box, boxes: tuple[Box, ...], image_size: Size) -> Box:
    left, top = window.x, window.y
    for box in boxes:
        left = _snap_axis(left, window.w, box.x, box.right, image_size[0])
        top = _snap_axis(top, window.h, box.y, box.bottom, image_size[1])
    return Box(left, top, window.w, window.h)


def _union(boxes: tuple[Box, ...]) -> Box:
    left = min(box.x for box in boxes)
    top = min(box.y for box in boxes)
    return Box(left, top, max(box.right for box in boxes) - left, max(box.bottom for box in boxes) - top)


def _salient_box(analysis: Analysis) -> Box:
    mask = (analysis.saliency >= np.percentile(analysis.saliency, 90)).astype(np.uint8)
    return Box(*(int(value) for value in cv2.boundingRect(mask)))


def subject_window(analysis: Analysis, aspect: float, disc: bool) -> tuple[Box, str]:
    """包住所有人面（加邊）嘅最細窗口；冇人面就用最突出嗰 10% 嘅範圍。回傳窗口同用咗咩做主體。"""
    subject, source = (
        (_union(analysis.faces), "faces") if analysis.faces else (_salient_box(analysis), "saliency")
    )
    margin = FACE_CROP_MARGIN * max(subject.w, subject.h) if source == "faces" else 0
    need_w, need_h = subject.w + 2 * margin, subject.h + 2 * margin
    height, width = analysis.saliency.shape
    max_w, max_h = window_size((width, height), aspect)
    window_h = min(max_h, max(need_h, need_w / aspect))
    window = (min(max_w, round(window_h * aspect)), round(window_h))
    centre_y_ratio = DISC_FACE_CENTRE_Y if disc else TILE_FACE_CENTRE_Y
    centre = (subject.x + subject.w / 2, subject.y + subject.h / 2 + (0.5 - centre_y_ratio) * window[1])
    return _clamp_window(centre, window, (width, height)), source


def _contain_size(image_size: Size, frame: Size) -> Size:
    factor = min(frame[0] / image_size[0], frame[1] / image_size[1])
    return max(1, round(image_size[0] * factor)), max(1, round(image_size[1] * factor))


def fit_blur(rgb: np.ndarray, size: Size) -> np.ndarray:
    """成張圖 contain 入框，空位用同一張圖放大 + 模糊 + 調暗填。"""
    image_size = (rgb.shape[1], rgb.shape[0])
    background = crop_to(rgb, centre_window(image_size, size[0] / size[1]), size).astype(np.float32)
    background = cv2.GaussianBlur(background, (0, 0), min(size) * BLUR_SIGMA_RATIO) * BLUR_DIM
    canvas = np.clip(background, 0, 255).astype(np.uint8)
    inner = _contain_size(image_size, size)
    left, top = (size[0] - inner[0]) // 2, (size[1] - inner[1]) // 2
    canvas[top : top + inner[1], left : left + inner[0]] = resize_to(rgb, inner)
    return canvas


def _smooth_columns(rows: np.ndarray, sigma: float) -> np.ndarray:
    return cv2.GaussianBlur(rows, (0, 0), sigmaX=sigma, sigmaY=0.1)


def _grow_up(image: np.ndarray, rows: int, rng: np.random.Generator) -> np.ndarray:
    """向上生成 rows 行：底色由邊緣嗰行漸變到平滑平均色，顆粒由邊緣帶逐行抽返（唔用 inpaint + 模糊）。"""
    band_rows = max(4, round(image.shape[0] * EXTEND_BAND_RATIO))
    band = image[:band_rows].astype(np.float32)
    texture = band - cv2.GaussianBlur(band, (0, 0), 3)
    spread = float(np.median(np.abs(texture))) * GRAIN_CLIP_MAD + 1
    texture = np.clip(texture, -spread, spread)
    near = _smooth_columns(image[:1].astype(np.float32), 3)[0]
    far = _smooth_columns(band.mean(axis=0, keepdims=True), EXTEND_SMOOTH_SIGMA * 4)[0]
    width = image.shape[1]
    out = np.empty((rows, width, 3), dtype=np.float32)
    for index in range(rows):
        distance = (rows - index) / rows  # 0 = 貼住原圖，1 = 最外
        blend = min(1.0, distance * 3)
        grain = np.roll(texture[int(rng.integers(band_rows))], int(rng.integers(width)), axis=0)
        out[index] = near * (1 - blend) + far * blend + grain
    return np.clip(out, 0, 255).astype(np.uint8)


def _feather_seam(stacked: np.ndarray, seam_row: int) -> None:
    """接駁位上下幾行做少少垂直模糊，避免一條硬線。"""
    top, bottom = max(0, seam_row - EXTEND_SEAM_PX), min(stacked.shape[0], seam_row + EXTEND_SEAM_PX)
    if bottom - top > 2:
        stacked[top:bottom] = cv2.GaussianBlur(stacked[top:bottom], (1, 5), 0)


def _extend_vertical(image: np.ndarray, top: int, bottom: int, rng: np.random.Generator) -> np.ndarray:
    parts = [image]
    if top > 0:
        parts.insert(0, _grow_up(image, top, rng))
    if bottom > 0:
        parts.append(_grow_up(image[::-1], bottom, rng)[::-1])
    stacked = np.ascontiguousarray(np.concatenate(parts, axis=0))
    if top > 0:
        _feather_seam(stacked, top)
    if bottom > 0:
        _feather_seam(stacked, top + image.shape[0])
    return stacked


def fit_extend(rgb: np.ndarray, size: Size, seed: int) -> np.ndarray:
    """成張圖 contain 入框，空位由邊緣生成延伸（漸變底色 + 抽返嘅顆粒）。"""
    rng = np.random.default_rng(seed)
    inner = _contain_size((rgb.shape[1], rgb.shape[0]), size)
    fitted = resize_to(rgb, inner)
    gap_x, gap_y = size[0] - inner[0], size[1] - inner[1]
    if gap_y > 0:
        return _extend_vertical(fitted, gap_y // 2, gap_y - gap_y // 2, rng)
    if gap_x > 0:
        turned = np.ascontiguousarray(fitted.transpose(1, 0, 2))
        return np.ascontiguousarray(
            _extend_vertical(turned, gap_x // 2, gap_x - gap_x // 2, rng).transpose(1, 0, 2)
        )
    return fitted


def shrink_title(rgb: np.ndarray, box: Box, scale: float) -> tuple[np.ndarray, Box]:
    """將標題字摳出嚟縮細貼返原位（中心不變），底用 inpaint 補。回傳新圖同縮細後嘅字框。"""
    pad = round(max(box.w, box.h) * 0.15)
    left, top = max(0, box.x - pad), max(0, box.y - pad)
    right, bottom = min(rgb.shape[1], box.right + pad), min(rgb.shape[0], box.bottom + pad)
    region = rgb[top:bottom, left:right]
    # 手動字框通常貼住字：挖洞時再擴少少，字嘅外框 / 陰影一齊摳走，唔會留低殘影
    margin = max(TITLE_HOLE_MIN_PX, round(min(box.w, box.h) * TITLE_HOLE_RATIO))
    hole = np.zeros(region.shape[:2], dtype=np.uint8)
    hole[
        max(0, box.y - margin - top) : box.bottom + margin - top,
        max(0, box.x - margin - left) : box.right + margin - left,
    ] = 255
    background = cv2.inpaint(region, hole, 5, cv2.INPAINT_TELEA)
    text = (np.abs(region.astype(np.int16) - background).sum(axis=2) > TITLE_DIFF_THRESHOLD) & (hole > 0)
    alpha = cv2.GaussianBlur(cv2.dilate(text.astype(np.float32), np.ones((3, 3), np.uint8)), (0, 0), 1.2)
    centre = ((box.x + box.right) / 2 - left, (box.y + box.bottom) / 2 - top)
    matrix = cv2.getRotationMatrix2D(centre, 0, scale)
    shrunk_text = cv2.warpAffine(region, matrix, region.shape[1::-1], flags=cv2.INTER_AREA)
    shrunk_alpha = cv2.warpAffine(alpha, matrix, region.shape[1::-1], flags=cv2.INTER_LINEAR)[..., None]
    out = rgb.copy()
    out[top:bottom, left:right] = np.clip(
        background * (1 - shrunk_alpha) + shrunk_text * shrunk_alpha, 0, 255
    ).astype(np.uint8)
    new_w, new_h = round(box.w * scale), round(box.h * scale)
    new_box = Box(round(centre[0] + left - new_w / 2), round(centre[1] + top - new_h / 2), new_w, new_h)
    return out, new_box
