"""封面 generator 測試：唔使網絡，用砌出嚟嘅假封面。

跑法：python -m pytest scripts/arcCover/tests（或者 python -m unittest discover scripts/arcCover/tests）
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from analysis import Box, analyse  # noqa: E402
from compose import best_window, disc_visibility  # noqa: E402
from generate import GeneratorError, Options, run  # noqa: E402

FAKE_SIZE = (800, 450)
DISC_COUNT = 6
TILE_COUNT = 5
VARIANT_KEYS = {"id", "kind", "method", "file", "preview", "width", "height", "sha256", "params"}


def _fake_cover(path: Path) -> None:
    """米色漸變底 + 左邊一個深色「人」+ 右上一嚿紅底白條紋嘅「標題字」。"""
    width, height = FAKE_SIZE
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


class GenerateTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.cover = self.root / "cover photo.png"
        _fake_cover(self.cover)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _options(self, out: str = "out", **overrides: object) -> Options:
        values: dict[str, object] = {
            "input": self.cover,
            "drama": "lancy",
            "arc": "half",
            "out": self.root / out,
        }
        values.update(overrides)
        return Options(**values)  # type: ignore[arg-type]

    def test_should_write_disc_and_tile_variants_with_app_sizes(self) -> None:
        manifest = run(self._options())
        round_dir = self.root / "out" / "lancy" / "half" / "round-1"
        variants = manifest["variants"]
        assert isinstance(variants, list)
        discs = [variant for variant in variants if variant["kind"] == "disc"]
        tiles = [variant for variant in variants if variant["kind"] == "tile"]
        self.assertEqual(len(discs), DISC_COUNT)
        self.assertEqual(len(tiles), TILE_COUNT)
        for variant in variants:
            expected = (600, 600) if variant["kind"] == "disc" else (1216, 684)
            self.assertEqual((variant["width"], variant["height"]), expected)
            with Image.open(round_dir / variant["file"]) as image:
                self.assertEqual(image.size, expected)
                self.assertEqual(image.format, "WEBP")
            self.assertTrue((round_dir / variant["preview"]).is_file())
        self.assertTrue((round_dir / "contact.png").is_file())
        self.assertTrue((round_dir / "analysis.png").is_file())

    def test_should_use_shelf_tile_size_when_no_arc(self) -> None:
        manifest = run(self._options(arc=None))
        self.assertEqual(manifest["level"], "drama")
        self.assertTrue((self.root / "out" / "lancy" / "_drama" / "round-1" / "manifest.json").is_file())
        tiles = [variant for variant in manifest["variants"] if variant["kind"] == "tile"]  # type: ignore[union-attr]
        self.assertTrue(all((tile["width"], tile["height"]) == (1216, 608) for tile in tiles))

    def test_should_write_manifest_with_expected_shape(self) -> None:
        run(self._options())
        path = self.root / "out" / "lancy" / "half" / "round-1" / "manifest.json"
        manifest = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(manifest["schema"], 1)
        self.assertEqual((manifest["drama"], manifest["arc"], manifest["round"]), ("lancy", "half", 1))
        self.assertEqual(manifest["source"]["file"], "cover photo.png")
        self.assertEqual((manifest["source"]["width"], manifest["source"]["height"]), FAKE_SIZE)
        self.assertEqual(set(manifest["analysis"]), {"faces", "textBoxes", "textSource", "focal"})
        for variant in manifest["variants"]:
            self.assertTrue(VARIANT_KEYS <= set(variant))
            self.assertIn(variant["kind"], ("disc", "tile"))
            self.assertIsInstance(variant["params"], dict)
        ids = [variant["id"] for variant in manifest["variants"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_should_produce_identical_output_for_same_input(self) -> None:
        first = run(self._options(out="a"))
        second = run(self._options(out="b"))
        self.assertEqual(first, second)
        manifest_a = (self.root / "a" / "lancy" / "half" / "round-1" / "manifest.json").read_bytes()
        manifest_b = (self.root / "b" / "lancy" / "half" / "round-1" / "manifest.json").read_bytes()
        self.assertEqual(manifest_a, manifest_b)

    def test_should_pick_next_round_and_refuse_overwrite(self) -> None:
        run(self._options())
        second = run(self._options())
        self.assertEqual(second["round"], 2)
        with self.assertRaises(GeneratorError):
            run(self._options(round=1))
        self.assertEqual(run(self._options(round=1, force=True))["round"], 1)

    def test_should_add_title_shrink_disc_when_title_box_given(self) -> None:
        manifest = run(self._options(title_box=Box(520, 40, 181, 81)))
        methods = [variant["method"] for variant in manifest["variants"] if variant["kind"] == "disc"]  # type: ignore[union-attr]
        self.assertIn("title-shrink", methods)
        self.assertEqual(manifest["analysis"]["textSource"], "manual")  # type: ignore[index]

    def test_should_reject_non_slug_arc(self) -> None:
        with self.assertRaises(GeneratorError):
            run(self._options(arc="戀愛二分一"))


class CropTest(unittest.TestCase):
    def test_text_safe_window_should_not_cut_title(self) -> None:
        image = np.full((450, 800, 3), 220, dtype=np.uint8)
        cv2.circle(image, (560, 250), 80, (20, 20, 20), -1)
        title = Box(300, 60, 200, 60)
        analysis = analyse(image, manual_text=title)
        window = best_window(analysis, 1.0, disc=False, avoid_text=True)
        inside = window.x <= title.x and title.right <= window.right
        outside = title.right <= window.x or window.right <= title.x
        self.assertTrue(inside or outside, window)

    def test_disc_visibility_should_hide_spindle_and_corners(self) -> None:
        weight = disc_visibility((101, 101))
        self.assertEqual(weight[50, 50], 0)
        self.assertEqual(weight[0, 0], 0)
        self.assertGreater(weight[50, 25], 0.9)


if __name__ == "__main__":
    unittest.main()
