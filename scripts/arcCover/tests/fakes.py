"""測試共用：砌假封面（唔使網絡）。"""

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

FAKE_SIZE = (800, 450)


def fake_cover(path: Path, size: tuple[int, int] = FAKE_SIZE) -> None:
    """米色漸變底 + 左邊一個深色「人」+ 右上一嚿紅底白條紋嘅「標題字」。"""
    width, height = size
    gradient = np.linspace(200, 240, width, dtype=np.float32)
    image = np.dstack(
        [np.tile(gradient, (height, 1)), np.tile(gradient - 10, (height, 1)), np.full((height, width), 190.0)]
    )
    image = image.astype(np.uint8)
    cv2.ellipse(image, (220, 260), (90, 120), 0, 0, 360, (40, 35, 30), -1)
    cv2.rectangle(image, (520, 40), (700, 120), (200, 20, 30), -1)
    for x in range(530, 700, 14):
        cv2.rectangle(image, (x, 55), (x + 5, 105), (250, 250, 250), -1)
    Image.fromarray(image).save(path)
