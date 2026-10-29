"""封面 review 頁：build.py 收集 round → rounds.json / files.json、fetch_sources.py 嘅 URL / slug 處理。"""

import json
import sys
import tempfile
import unicodedata
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "review"))

from build import (  # noqa: E402
    DISC_MARGIN,
    DRAMA_SLUG,
    Paths,
    app_image_name,
    arc_list,
    big_disc_box,
    build,
    doc_id,
    round_dirs,
    unique_variants,
    with_new_arcs,
)
from fetch_sources import cover_url, parse_slugs, targets  # noqa: E402

PREVIEW_SIZE = (40, 20)
BG = (200, 200, 200)
DISC_SPAN = (5, 15)
LANCY = {
    "name": "蘭茜夫人劇場",
    "order": 3,
    "audio": {"host": "r2", "folder": "蘭茜夫人劇場"},
    "arcs": [
        {"name": "戀愛二分一", "disc": "half-disc.webp", "tile": "half-tile.webp"},
        {"name": "未有碟面"},
        {"name": "我心不死", "disc": "heart-disc.webp"},
    ],
}


def _variant(vid: str, kind: str, duplicate: str | None = None) -> dict:
    method = vid.split("-", 1)[1]
    return {
        "id": vid,
        "kind": kind,
        "method": method,
        "file": f"heart-{vid}.webp",
        "preview": f"previews/heart-{vid}.png",
        "width": 600,
        "height": 600,
        "duplicateOf": duplicate,
    }


def _preview_png(path: Path) -> None:
    """背景色 + 左邊一舊（大碟）+ 右邊一舊（細碟）"""
    rgb = np.full((PREVIEW_SIZE[1], PREVIEW_SIZE[0], 3), BG, dtype=np.uint8)
    rgb[:, DISC_SPAN[0] : DISC_SPAN[1]] = (0, 0, 0)
    rgb[:, 30:35] = (0, 0, 0)
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgb).save(path)


class PureTest(unittest.TestCase):
    def test_doc_id_should_match_page(self) -> None:
        self.assertEqual(doc_id("lancy", "heart", 2), "lancy--heart--r2")
        self.assertEqual(doc_id("chisee", DRAMA_SLUG, 1), "chisee--_drama--r1")

    def test_app_image_name_should_prefix_arc_slug(self) -> None:
        self.assertEqual(app_image_name(DRAMA_SLUG, "disc"), "disc.webp")
        self.assertEqual(app_image_name("heart", "tile"), "heart-tile.webp")

    def test_arc_list_should_keep_drama_first_and_skip_arcs_without_disc(self) -> None:
        expected = [(DRAMA_SLUG, "蘭茜夫人劇場"), ("half", "戀愛二分一"), ("heart", "我心不死")]
        self.assertEqual(arc_list(LANCY), expected)

    def test_unique_variants_should_drop_duplicates(self) -> None:
        variants = [
            _variant("disc-center-crop", "disc"),
            _variant("disc-face-crop", "disc", "disc-center-crop"),
        ]
        self.assertEqual([v["id"] for v in unique_variants(variants)], ["disc-center-crop"])

    def test_with_new_arcs_should_append_generated_slugs_not_in_drama_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            for slug in ("heart", "new-arc", "empty"):
                (Path(tmp) / slug / "round-1").mkdir(parents=True)
                if slug != "empty":
                    (Path(tmp) / slug / "round-1" / "manifest.json").write_text("{}")
            found = with_new_arcs(arc_list(LANCY), Path(tmp))
            self.assertEqual(found, [*arc_list(LANCY), ("new-arc", "new-arc")])
            self.assertEqual(with_new_arcs(arc_list(LANCY), Path(tmp) / "missing"), arc_list(LANCY))

    def test_round_dirs_should_sort_numerically_and_skip_partial(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            for name in ("round-10", "round-2", "round-3.partial", "round-4"):
                (Path(tmp) / name).mkdir()
                if name != "round-4":
                    (Path(tmp) / name / "manifest.json").write_text("{}")
            self.assertEqual([p.name for p in round_dirs(Path(tmp))], ["round-2", "round-10"])
            self.assertEqual(round_dirs(Path(tmp) / "missing"), [])

    def test_big_disc_box_should_cover_first_blob_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            _preview_png(Path(tmp) / "p.png")
            rgb = np.asarray(Image.open(Path(tmp) / "p.png").convert("RGB"))
        self.assertEqual(big_disc_box(rgb), (0, 0, DISC_SPAN[1] + DISC_MARGIN, PREVIEW_SIZE[1]))
        wide = np.concatenate([np.full((PREVIEW_SIZE[1], 20, 3), BG, np.uint8), rgb], axis=1)
        left, _, right, _ = big_disc_box(wide)
        self.assertEqual((left, right), (20 + DISC_SPAN[0] - DISC_MARGIN, 20 + DISC_SPAN[1] + DISC_MARGIN))


class BuildTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        root = Path(self._tmp.name)
        self.repo = root / "repo"
        drama_dir = self.repo / "src" / "dramas" / "lancy"
        drama_dir.mkdir(parents=True)
        (drama_dir / "drama.json").write_text(json.dumps(LANCY, ensure_ascii=False), encoding="utf-8")
        work = root / "work"
        self.paths = Paths(
            gen=work / "arcCover", src=work / "arcCover-src", out=work / "review", repo=self.repo
        )
        self._round(2)
        (self.paths.src / "lancy").mkdir(parents=True)
        (self.paths.src / "lancy" / "heart.jpg").write_bytes(b"jpg")

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _round(self, number: int) -> None:
        rdir = self.paths.gen / "lancy" / "heart" / f"round-{number}"
        variants = [
            _variant("disc-center-crop", "disc"),
            _variant("disc-face-crop", "disc", "disc-center-crop"),
            _variant("tile-center-crop", "tile"),
        ]
        for v in variants:
            _preview_png(rdir / v["preview"])
        source = {"file": "heart.jpg", "width": 1200, "height": 675}
        manifest = {"round": number, "source": source, "variants": variants}
        (rdir / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    def test_build_should_write_rounds_and_files(self) -> None:
        files = build(self.paths)
        site = self.paths.site
        rounds = json.loads((site / "rounds.json").read_text(encoding="utf-8"))
        [drama] = rounds["dramas"]
        self.assertEqual([a["slug"] for a in drama["arcs"]], [DRAMA_SLUG, "half", "heart"])
        heart = drama["arcs"][2]
        self.assertEqual(heart["current"], {})
        [entry] = heart["rounds"]
        self.assertEqual(entry["docId"], "lancy--heart--r2")
        self.assertEqual(entry["source"], "img/lancy/heart/round-2/source.jpg")
        self.assertEqual([v["id"] for v in entry["variants"]], ["disc-center-crop", "tile-center-crop"])
        self.assertEqual(entry["variants"][0]["label"], "置中裁")
        self.assertTrue((site / "index.html").is_file())
        self.assertNotIn("index.html", files)
        self.assertEqual(json.loads((self.paths.out / "files.json").read_text(encoding="utf-8")), files)
        for rel, local in files.items():
            self.assertEqual(Path(local), site / rel)
            self.assertTrue(Path(local).is_file(), rel)

    def test_build_should_crop_disc_preview_to_big_disc(self) -> None:
        build(self.paths)
        disc = Image.open(self.paths.site / "img/lancy/heart/round-2/heart-disc-center-crop.png")
        tile = Image.open(self.paths.site / "img/lancy/heart/round-2/heart-tile-center-crop.png")
        self.assertLess(disc.width, PREVIEW_SIZE[0])
        self.assertEqual(tile.size, PREVIEW_SIZE)


class FetchSourcesTest(unittest.TestCase):
    def test_cover_url_should_encode_nfc_segments(self) -> None:
        decomposed = unicodedata.normalize("NFD", "芝See菇Bi Family")
        url = cover_url([decomposed, "cover photo.png"])
        self.assertTrue(url.endswith("/%E8%8A%9DSee%E8%8F%87Bi%20Family/cover%20photo.png"), url)

    def test_targets_should_use_disc_slug_or_given_slug(self) -> None:
        found = targets(LANCY, parse_slugs(["未有碟面=new-arc"]))
        self.assertEqual(
            found,
            [
                ("drama", ["蘭茜夫人劇場"]),
                ("half", ["蘭茜夫人劇場", "戀愛二分一"]),
                ("new-arc", ["蘭茜夫人劇場", "未有碟面"]),
                ("heart", ["蘭茜夫人劇場", "我心不死"]),
            ],
        )

    def test_parse_slugs_should_reject_missing_slug(self) -> None:
        with self.assertRaises(SystemExit):
            parse_slugs(["我心不死"])


if __name__ == "__main__":
    unittest.main()
