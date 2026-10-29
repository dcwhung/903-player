"""封面 review 頁：build.py 收集 round → rounds.json / files.json / publish 批次。"""

import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

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
    check_page_ids,
    check_slug,
    doc_id,
    main,
    page_hash,
    round_dirs,
    unique_variants,
    with_new_arcs,
)

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

    def test_check_slug_should_reject_unsafe_or_reserved(self) -> None:
        for slug in ("../x", "a/b", "cover", "drama", "a--b", "Heart", "-a", "a-", ""):
            with self.subTest(slug=slug), self.assertRaises(SystemExit):
                check_slug(slug, "slug")
        self.assertEqual(check_slug("love-2", "slug"), "love-2")

    def test_page_hash_should_match_page(self) -> None:
        self.assertEqual(page_hash("lancy", DRAMA_SLUG), "lancy-cover")
        self.assertEqual(page_hash("lancy", "heart"), "lancy-heart")

    def test_check_page_ids_should_reject_hash_collision(self) -> None:
        dramas = [
            {"id": "sammy-kitty", "arcs": [{"slug": "love"}]},
            {"id": "sammy", "arcs": [{"slug": "kitty-love"}]},
        ]
        with self.assertRaises(SystemExit):
            check_page_ids(dramas)
        check_page_ids(dramas[:1])

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
        self.work = work
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

    def test_build_should_render_current_image_previews(self) -> None:
        art = np.zeros((90, 160, 3), np.uint8)
        art[:, :80] = (250, 40, 40)
        for name in ("heart-disc.webp", "heart-tile.webp"):
            Image.fromarray(art).save(self.repo / "src" / "dramas" / "lancy" / name)
        build(self.paths)
        current = json.loads((self.paths.site / "rounds.json").read_text(encoding="utf-8"))["dramas"][0][
            "arcs"
        ][2]["current"]
        self.assertEqual(sorted(current), ["disc", "discPreview", "tile", "tilePreview"])
        with Image.open(self.paths.site / current["discPreview"]) as disc:
            self.assertLess(disc.width, disc.height)  # 淨係大碟，細碟裁走咗
        with Image.open(self.paths.site / current["tilePreview"]) as tile:
            self.assertGreater(tile.width, tile.height)

    def test_build_should_refresh_same_size_copies(self) -> None:
        build(self.paths)
        copied = self.paths.site / "img/lancy/heart/round-2/source.jpg"
        (self.paths.src / "lancy" / "heart.jpg").write_bytes(b"JPG")
        build(self.paths)
        self.assertEqual(copied.read_bytes(), b"JPG")

    def test_build_should_reject_unsafe_slugs(self) -> None:
        bad = {**LANCY, "arcs": [{"name": "x", "disc": "cover-disc.webp"}]}
        drama_json = self.repo / "src" / "dramas" / "lancy" / "drama.json"
        drama_json.write_text(json.dumps(bad, ensure_ascii=False), encoding="utf-8")
        with self.assertRaises(SystemExit):
            build(self.paths)
        drama_json.write_text(json.dumps(LANCY, ensure_ascii=False), encoding="utf-8")
        (self.paths.gen / "lancy" / "a--b" / "round-1").mkdir(parents=True)
        (self.paths.gen / "lancy" / "a--b" / "round-1" / "manifest.json").write_text("{}")
        with self.assertRaises(SystemExit):
            build(self.paths)

    def test_main_previous_should_delete_vanished_paths_in_last_batch(self) -> None:
        self.paths.out.mkdir(parents=True)
        previous = self.paths.out / "old-files.json"
        previous.write_text(json.dumps({"img/lancy/heart/round-1/gone.png": "/x", "rounds.json": "/r"}))
        argv = ["--work", str(self.work), "--repo", str(self.repo), "--previous", str(previous)]
        with contextlib.redirect_stdout(io.StringIO()) as out:
            self.assertEqual(main(argv), 0)
        self.assertIn("gone.png", out.getvalue())
        batches = sorted(self.paths.out.glob("publish-*.json"))
        last = json.loads(batches[-1].read_text(encoding="utf-8"))
        self.assertEqual(list(last.items())[-1], ("img/lancy/heart/round-1/gone.png", None))
        self.assertFalse((self.paths.out / "published.json").exists())

    def test_main_previous_should_accept_artifact_file_listing(self) -> None:
        self.paths.out.mkdir(parents=True)
        listing = self.paths.out / "listing.txt"
        listing.write_text("index.html\nrounds.json\nimg/lancy/heart/round-1/gone.png\n")
        argv = ["--work", str(self.work), "--repo", str(self.repo), "--previous", str(listing)]
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(main(argv), 0)
        batches = sorted(self.paths.out.glob("publish-*.json"))
        last = json.loads(batches[-1].read_text(encoding="utf-8"))
        self.assertEqual(list(last.items())[-1], ("img/lancy/heart/round-1/gone.png", None))
        self.assertNotIn(
            "index.html", {k for b in batches for k in json.loads(b.read_text(encoding="utf-8"))}
        )

    def test_build_should_reserve_the_page_size_in_each_batch(self) -> None:
        with mock.patch("build.write_batches") as write:
            build(self.paths)
        page = (self.paths.site / "index.html").stat().st_size
        self.assertGreater(page, 0)
        self.assertEqual(write.call_args.kwargs["page_bytes"], page)

    def test_main_page_bytes_should_override_the_page_size(self) -> None:
        argv = ["--work", str(self.work), "--repo", str(self.repo), "--page-bytes", "123"]
        with mock.patch("build.write_batches") as write, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(main(argv), 0)
        self.assertEqual(write.call_args.kwargs["page_bytes"], 123)

    def test_build_should_crop_disc_preview_to_big_disc(self) -> None:
        build(self.paths)
        disc = Image.open(self.paths.site / "img/lancy/heart/round-2/heart-disc-center-crop.png")
        tile = Image.open(self.paths.site / "img/lancy/heart/round-2/heart-tile-center-crop.png")
        self.assertLess(disc.width, PREVIEW_SIZE[0])
        self.assertEqual(tile.size, PREVIEW_SIZE)


if __name__ == "__main__":
    unittest.main()
