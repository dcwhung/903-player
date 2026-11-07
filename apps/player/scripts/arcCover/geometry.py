"""碟面幾何：預覽（preview.py）同揀位權重（compose.py）共用，唔好兩份公式。"""

import numpy as np

from constants import VIGNETTE_ALPHA, VIGNETTE_EXTENT, VIGNETTE_START

Size = tuple[int, int]  # (闊, 高)


def disc_radius(size: Size) -> np.ndarray:
    """每個像素中心離圓心幾遠，單位係碟半徑（1 = 碟邊）。"""
    width, height = size
    ys, xs = np.indices((height, width), dtype=np.float32)
    return np.hypot((xs + 0.5) / width - 0.5, (ys + 0.5) / height - 0.5) * 2


def vignette_alpha(size: Size) -> np.ndarray:
    """Disc.module.css .vignette 喺每個像素嘅黑色 alpha（0–VIGNETTE_ALPHA）。

    radial-gradient(circle, …) 冇寫大小 = farthest-corner：gradient 100% 喺正方形嘅角，
    即係碟半徑 × √2，所以要先除 VIGNETTE_EXTENT 先代入 55% → 100%。
    """
    position = disc_radius(size) / VIGNETTE_EXTENT
    fade = np.clip((position - VIGNETTE_START) / (1 - VIGNETTE_START), 0, 1)
    return (fade * VIGNETTE_ALPHA).astype(np.float32)
