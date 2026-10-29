"""預覽：細碟外圈（Disc.module.css .small）、碟面尺寸；工具代碼函數長度。"""

import ast
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from constants import DEFAULT_THEME, PHONE_DISC_CSS_PX, RIM_CSS_PX, SMALL_DISC_CSS_PX  # noqa: E402
from preview import _hex_rgb, render_disc  # noqa: E402

TOOL_DIR = Path(__file__).resolve().parents[1]
MAX_FUNCTION_LINES = 30
# .small { box-shadow: 0 0 0 3px var(--color-divider) }；--color-divider = --theme-track
SMALL_RING_CSS_PX = 3
ART_COLOUR = (10, 200, 30)


def _art() -> np.ndarray:
    return np.full((600, 600, 3), ART_COLOUR, dtype=np.uint8)


class RenderDiscTest(unittest.TestCase):
    def test_small_disc_should_have_divider_ring_outside(self) -> None:
        for scale in (1, 2):
            diameter = SMALL_DISC_CSS_PX * scale
            ring = SMALL_RING_CSS_PX * scale
            disc = np.asarray(render_disc(_art(), diameter, DEFAULT_THEME, large=False))
            self.assertEqual(disc.shape[:2], (diameter + 2 * ring, diameter + 2 * ring))
            centre = disc.shape[0] // 2
            # 外圈中間係 divider（theme track）色，實色
            ring_pixel = disc[centre, ring // 2]
            self.assertEqual(tuple(ring_pixel[:3]), _hex_rgb(DEFAULT_THEME["track"]), scale)
            self.assertEqual(ring_pixel[3], 255)
            # 外圈入面係節目圖
            art_pixel = disc[centre, ring + 2 * scale]
            self.assertEqual(tuple(art_pixel[:3]), ART_COLOUR)

    def test_large_disc_should_keep_rim_size(self) -> None:
        diameter = 420
        disc = render_disc(_art(), diameter, DEFAULT_THEME, large=True)
        rim = round(RIM_CSS_PX * diameter / PHONE_DISC_CSS_PX)
        self.assertEqual(disc.size, (diameter + 2 * rim, diameter + 2 * rim))


class FunctionLengthTest(unittest.TestCase):
    def test_functions_should_be_at_most_30_lines(self) -> None:
        too_long = []
        for path in sorted(TOOL_DIR.glob("*.py")):
            for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
                if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
                    length = (node.end_lineno or node.lineno) - node.lineno + 1
                    if length > MAX_FUNCTION_LINES:
                        too_long.append(f"{path.name}:{node.name} {length}")
        self.assertEqual(too_long, [])


if __name__ == "__main__":
    unittest.main()
