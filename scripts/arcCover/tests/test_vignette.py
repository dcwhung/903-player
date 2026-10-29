"""暗角（vignette）要同 app 嘅 CSS 一樣：預覽同揀位共用同一條公式。

Disc.module.css：radial-gradient(circle, transparent 55%, var(--color-disc-vignette) 100%)。
circle 冇寫大小 = farthest-corner，所以 100% 喺正方形嘅角，即係碟半徑 × √2。
"""

import math
import re
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from compose import disc_visibility  # noqa: E402
from constants import VIGNETTE_ALPHA, VIGNETTE_START  # noqa: E402
from geometry import vignette_alpha  # noqa: E402
from preview import _vignette  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
DISC_CSS = REPO_ROOT / "src" / "components" / "Disc" / "Disc.module.css"
TOKENS_CSS = REPO_ROOT / "src" / "styles" / "tokens.css"
SIZE = 1001
CENTRE = SIZE // 2


def _css_vignette() -> tuple[str, float, float]:
    """由 CSS 讀返 gradient 形狀、開始位（0–1）同碟邊顏色 alpha（0–1）。"""
    match = re.search(
        r"radial-gradient\((\w+), transparent (\d+)%, var\(--color-disc-vignette\) 100%\)",
        DISC_CSS.read_text(encoding="utf-8"),
    )
    assert match is not None, "Disc.module.css .vignette 格式變咗，要跟住改 generator"
    token = re.search(r"--color-disc-vignette: rgb\(0 0 0 / (\d+)%\)", TOKENS_CSS.read_text(encoding="utf-8"))
    assert token is not None, "tokens.css --color-disc-vignette 格式變咗"
    return match.group(1), int(match.group(2)) / 100, int(token.group(1)) / 100


def _css_alpha_at(radius: float) -> float:
    """CSS 喺「離中心 radius 個碟半徑」嘅暗角 alpha（farthest-corner：100% = √2 個半徑）。"""
    _, start, alpha = _css_vignette()
    position = radius / math.sqrt(2)
    return float(np.clip((position - start) / (1 - start), 0, 1) * alpha)


class VignetteTest(unittest.TestCase):
    def test_constants_should_match_css(self) -> None:
        shape, start, alpha = _css_vignette()
        self.assertEqual(shape, "circle")
        self.assertAlmostEqual(VIGNETTE_START, start)
        self.assertAlmostEqual(VIGNETTE_ALPHA, alpha)

    def test_should_be_clear_until_css_start_radius(self) -> None:
        alpha = vignette_alpha((SIZE, SIZE))
        # 0.55 × √2 ≈ 0.778 個半徑先開始變暗；0.7 個半徑仲係完全透明
        self.assertEqual(alpha[CENTRE, CENTRE + round(0.7 * CENTRE)], 0)
        self.assertEqual(alpha[CENTRE, CENTRE + round(0.77 * CENTRE)], 0)
        self.assertGreater(alpha[CENTRE, CENTRE + round(0.80 * CENTRE)], 0)

    def test_should_match_css_alpha_at_disc_edge(self) -> None:
        alpha = vignette_alpha((SIZE, SIZE))
        edge = float(alpha[CENTRE, SIZE - 1])
        # (1/√2 − 0.55) / 0.45 × 45% ≈ 15.7%，唔係 45%
        self.assertAlmostEqual(edge, _css_alpha_at(1.0), places=2)
        self.assertAlmostEqual(edge, 0.157, places=2)

    def test_should_match_css_alpha_across_radius(self) -> None:
        alpha = vignette_alpha((SIZE, SIZE))
        for radius in (0.5, 0.8, 0.9, 0.95):
            pixel = CENTRE + round(radius * CENTRE)
            measured = float(np.hypot(pixel + 0.5 - SIZE / 2, 0.5) / (SIZE / 2))
            self.assertAlmostEqual(float(alpha[CENTRE, pixel]), _css_alpha_at(measured), places=3)

    def test_preview_and_crop_weight_should_share_the_formula(self) -> None:
        alpha = vignette_alpha((SIZE, SIZE))
        preview_alpha = np.asarray(_vignette(SIZE), dtype=np.float32)[..., 3] / 255
        inside = (CENTRE, CENTRE + round(0.9 * CENTRE))
        self.assertAlmostEqual(float(preview_alpha[inside]), float(alpha[inside]), places=2)
        weight = disc_visibility((SIZE, SIZE))
        self.assertAlmostEqual(float(weight[inside]), 1 - float(alpha[inside]), places=5)


if __name__ == "__main__":
    unittest.main()
