"""分析封面：saliency map、人面、印咗上去嘅標題字。

全部用 OpenCV 內置嘢（Haar cascade 跟 opencv 一齊裝），唔使下載 model；
冇隨機成分，同一張圖每次結果一樣。
"""

from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image, ImageOps

from constants import (
    COLOUR_CONTRAST_SIGMA_DIVISOR,
    EYE_MIN_PX,
    EYE_MIN_RATIO,
    EYE_REGION_RATIO,
    FACE_HEAT_HEIGHT_RATIO,
    FACE_HEAT_SIGMA_DIVISOR,
    FACE_MERGE_IOU,
    FACE_MIN_NEIGHBOURS,
    FACE_MIN_PX,
    FACE_MIN_RATIO,
    FACE_SCALE_STEP,
    FACE_WEIGHT,
    FOCAL_PERCENTILE,
    FULL_TURN_DEG,
    NORMALISE_EPS,
    SALIENCY_BLUR_SIGMA,
    SALIENCY_MIN_HEIGHT,
    SALIENCY_SPECTRAL_WEIGHT,
    SALIENCY_WIDTH,
    SPECTRAL_AVERAGE_PX,
    SPECTRUM_EPS,
    STROKE_KERNEL_PX,
    TEXT_CLOSE_DIVISOR,
    TEXT_CLOSE_MIN_PX,
    TEXT_COLOUR_BLUR_SIGMA,
    TEXT_MAX_AREA_RATIO,
    TEXT_MAX_FILL,
    TEXT_MIN_AREA_RATIO,
    TEXT_MIN_FILL,
    TEXT_MIN_SATURATION,
    TEXT_SATURATION_PERCENTILE,
)

HSV_SATURATION = 1  # HSV 第二個 channel
FACE_CASCADES: tuple[str, ...] = (
    "haarcascade_frontalface_default.xml",
    "haarcascade_frontalface_alt2.xml",
    "haarcascade_profileface.xml",
)


@dataclass(frozen=True)
class Box:
    x: int
    y: int
    w: int
    h: int

    @property
    def right(self) -> int:
        return self.x + self.w

    @property
    def bottom(self) -> int:
        return self.y + self.h

    def to_list(self) -> list[int]:
        return [self.x, self.y, self.w, self.h]

    def scaled(self, factor: float) -> "Box":
        return Box(
            round(self.x * factor), round(self.y * factor), round(self.w * factor), round(self.h * factor)
        )


@dataclass(frozen=True)
class Analysis:
    saliency: np.ndarray  # float32，同原圖一樣大，0–1（已加人面權重）
    faces: tuple[Box, ...]
    text_boxes: tuple[Box, ...]
    text_source: str  # "detected" / "manual" / "none"
    focal: tuple[int, int]

    def summary(self) -> dict[str, object]:
        return {
            "faces": [face.to_list() for face in self.faces],
            "textBoxes": [box.to_list() for box in self.text_boxes],
            "textSource": self.text_source,
            "focal": list(self.focal),
        }


def load_rgb(path: str) -> np.ndarray:
    """讀圖做 RGB uint8；跟 EXIF 方向轉正，透明底當白底。"""
    with Image.open(path) as image:
        upright = ImageOps.exif_transpose(image)
        if upright.mode in ("RGBA", "LA", "P"):
            rgba = upright.convert("RGBA")
            white = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
            upright = Image.alpha_composite(white, rgba)
        return np.asarray(upright.convert("RGB"), dtype=np.uint8).copy()


def _normalise(values: np.ndarray) -> np.ndarray:
    low, high = float(values.min()), float(values.max())
    if high - low < NORMALISE_EPS:
        return np.zeros_like(values, dtype=np.float32)
    return ((values - low) / (high - low)).astype(np.float32)


def _spectral_residual(rgb: np.ndarray) -> np.ndarray:
    """Hou & Zhang spectral residual：用 numpy 寫，唔使 opencv-contrib 嘅 saliency module。"""
    height, width = rgb.shape[:2]
    work_h = max(SALIENCY_MIN_HEIGHT, round(SALIENCY_WIDTH * height / width))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    small = cv2.resize(gray, (SALIENCY_WIDTH, work_h), interpolation=cv2.INTER_AREA).astype(np.float64)
    spectrum = np.fft.fft2(small)
    log_amplitude = np.log(np.abs(spectrum) + SPECTRUM_EPS)
    residual = log_amplitude - cv2.blur(log_amplitude, (SPECTRAL_AVERAGE_PX, SPECTRAL_AVERAGE_PX))
    restored = np.abs(np.fft.ifft2(np.exp(residual + 1j * np.angle(spectrum)))) ** 2
    restored = cv2.GaussianBlur(restored, (0, 0), SALIENCY_BLUR_SIGMA)
    return _normalise(cv2.resize(restored.astype(np.float32), (width, height)))


def _colour_contrast(rgb: np.ndarray) -> np.ndarray:
    """同全圖平均色差幾遠（Lab）：補 spectral residual 對大塊主體唔敏感嘅問題。"""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    distance = np.linalg.norm(lab - lab.reshape(-1, lab.shape[2]).mean(axis=0), axis=2)
    sigma = max(rgb.shape[:2]) / COLOUR_CONTRAST_SIGMA_DIVISOR
    return _normalise(cv2.GaussianBlur(distance, (0, 0), sigma))


def _iou(first: Box, second: Box) -> float:
    inter_w = max(0, min(first.right, second.right) - max(first.x, second.x))
    inter_h = max(0, min(first.bottom, second.bottom) - max(first.y, second.y))
    inter = inter_w * inter_h
    union = first.w * first.h + second.w * second.h - inter
    return inter / union if union else 0.0


def _merge_boxes(boxes: list[Box]) -> tuple[Box, ...]:
    """大框行先，同已收框重疊就丟（簡單 NMS），再按位置排好令輸出穩定。"""
    kept: list[Box] = []
    for box in sorted(boxes, key=lambda item: (-item.w * item.h, item.x, item.y)):
        if all(_iou(box, other) < FACE_MERGE_IOU for other in kept):
            kept.append(box)
    return tuple(sorted(kept, key=lambda item: (item.x, item.y)))


def _has_eye(gray: np.ndarray, face: Box, eye_cascade: "cv2.CascadeClassifier") -> bool:
    upper = gray[face.y : face.y + round(face.h * EYE_REGION_RATIO), face.x : face.right]
    min_eye = max(EYE_MIN_PX, round(face.w * EYE_MIN_RATIO))
    eyes = eye_cascade.detectMultiScale(
        upper, FACE_SCALE_STEP, FACE_MIN_NEIGHBOURS, minSize=(min_eye, min_eye)
    )
    return len(eyes) > 0


def detect_faces(rgb: np.ndarray) -> tuple[Box, ...]:
    """正面（兩個 cascade）+ 兩邊側面；封面多數係黑白 / 側面相，所以全部都試，再用眼過濾誤報。"""
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    width = gray.shape[1]
    min_side = max(FACE_MIN_PX, round(min(gray.shape) * FACE_MIN_RATIO))
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
    found: list[Box] = []
    for name in FACE_CASCADES:
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + name)
        for flipped in (False, True):
            source = cv2.flip(gray, 1) if flipped else gray
            hits = cascade.detectMultiScale(
                source, FACE_SCALE_STEP, FACE_MIN_NEIGHBOURS, minSize=(min_side, min_side)
            )
            for x, y, w, h in hits:
                left = width - x - w if flipped else x
                face = Box(int(left), int(y), int(w), int(h))
                if _has_eye(gray, face, eye_cascade):
                    found.append(face)
    return _merge_boxes(found)


def _is_title_like(strokes: np.ndarray, saturation: np.ndarray, box: Box, image_area: int) -> bool:
    if not TEXT_MIN_AREA_RATIO * image_area <= box.w * box.h <= TEXT_MAX_AREA_RATIO * image_area:
        return False
    stroke_mask = strokes[box.y : box.bottom, box.x : box.right] > 0
    stroke_fill = float(stroke_mask.mean())
    if not TEXT_MIN_FILL <= stroke_fill <= TEXT_MAX_FILL:
        return False
    stroke_saturation = saturation[box.y : box.bottom, box.x : box.right][stroke_mask]
    return float(np.percentile(stroke_saturation, TEXT_SATURATION_PERCENTILE)) >= TEXT_MIN_SATURATION


def detect_text_boxes(rgb: np.ndarray) -> tuple[Box, ...]:
    """搵印上去嘅標題字：密集筆劃（梯度）+ 筆劃有顏色。只係 heuristic，唔準就用 --title-box。"""
    height, width = rgb.shape[:2]
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gradient = cv2.morphologyEx(
        gray,
        cv2.MORPH_GRADIENT,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (STROKE_KERNEL_PX, STROKE_KERNEL_PX)),
    )
    _, strokes = cv2.threshold(gradient, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    # 先模糊少少：筆劃邊緣嘅像素先食到字本身嘅顏色
    saturation = cv2.cvtColor(cv2.GaussianBlur(rgb, (0, 0), TEXT_COLOUR_BLUR_SIGMA), cv2.COLOR_RGB2HSV)[
        ..., HSV_SATURATION
    ]
    close_px = max(TEXT_CLOSE_MIN_PX, round(min(height, width) / TEXT_CLOSE_DIVISOR))
    blobs = cv2.morphologyEx(strokes, cv2.MORPH_CLOSE, np.ones((close_px, close_px), np.uint8))
    contours, _ = cv2.findContours(blobs, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = [Box(*(int(value) for value in cv2.boundingRect(contour))) for contour in contours]
    return _merge_boxes([box for box in boxes if _is_title_like(strokes, saturation, box, height * width)])


def _face_heat(shape: tuple[int, int], faces: tuple[Box, ...]) -> np.ndarray:
    heat = np.zeros(shape, dtype=np.float32)
    for face in faces:
        centre = (face.x + face.w // 2, face.y + face.h // 2)
        cv2.ellipse(
            heat,
            centre,
            (face.w // 2, round(face.h * FACE_HEAT_HEIGHT_RATIO)),
            0,
            0,
            FULL_TURN_DEG,
            1.0,
            cv2.FILLED,
        )
    sigma = max(shape) / FACE_HEAT_SIGMA_DIVISOR
    return _normalise(cv2.GaussianBlur(heat, (0, 0), sigma)) if faces else heat


def _weighted_centroid(weights: np.ndarray) -> tuple[int, int]:
    total = float(weights.sum())
    if total <= 0:
        return weights.shape[1] // 2, weights.shape[0] // 2
    ys, xs = np.indices(weights.shape)
    return round(float((xs * weights).sum()) / total), round(float((ys * weights).sum()) / total)


def analyse(rgb: np.ndarray, manual_text: Box | None = None) -> Analysis:
    faces = detect_faces(rgb)
    if manual_text is not None:
        text_boxes, text_source = (manual_text,), "manual"
    else:
        text_boxes = detect_text_boxes(rgb)
        text_source = "detected" if text_boxes else "none"
    spectral = SALIENCY_SPECTRAL_WEIGHT
    base = spectral * _spectral_residual(rgb) + (1 - spectral) * _colour_contrast(rgb)
    saliency = _normalise(base + FACE_WEIGHT * _face_heat(rgb.shape[:2], faces))
    # 焦點只計最突出嗰部分，唔畀成片背景拉返去中間
    focus_weights = np.where(saliency > np.percentile(saliency, FOCAL_PERCENTILE), saliency, 0)
    return Analysis(saliency, faces, text_boxes, text_source, _weighted_centroid(focus_weights))
