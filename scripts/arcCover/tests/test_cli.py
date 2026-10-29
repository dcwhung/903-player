"""輸入驗證、round 資料夾（.partial → rename、--force）同 CLI 出錯訊息。"""

import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import generate  # noqa: E402
from analysis import Box  # noqa: E402
from fakes import FAKE_SIZE, fake_cover  # noqa: E402
from generate import GeneratorError, Options, main, run  # noqa: E402

EXIT_USAGE = 2
TITLE_BOX = Box(520, 40, 181, 81)


class ValidationTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.cover = self.root / "cover photo.png"
        fake_cover(self.cover)
        self.arc_dir = self.root / "out" / "lancy" / "half"

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _options(self, **overrides: object) -> Options:
        values: dict[str, object] = {
            "input": self.cover,
            "drama": "lancy",
            "arc": "half",
            "out": self.root / "out",
        }
        values.update(overrides)
        return Options(**values)  # type: ignore[arg-type]

    def _assert_rejected(self, options: Options, message: str) -> None:
        with mock.patch.object(generate, "analyse", side_effect=AssertionError("唔應該行到分析")):
            with self.assertRaisesRegex(GeneratorError, message):
                run(options)
        self.assertFalse((self.root / "out").exists(), "驗證失敗唔應該開任何資料夾")

    def test_should_reject_missing_input_before_analysis(self) -> None:
        self._assert_rejected(self._options(input=self.root / "nope.png"), "搵唔到封面相")

    def test_should_reject_non_image_input(self) -> None:
        fake = self.root / "fake.png"
        fake.write_text("not an image", encoding="utf-8")
        self._assert_rejected(self._options(input=fake), "讀唔到圖")

    def test_should_reject_title_box_outside_image(self) -> None:
        self._assert_rejected(self._options(title_box=Box(5000, 5000, 10, 10)), "--title-box")
        width, height = FAKE_SIZE
        self._assert_rejected(self._options(title_box=Box(width - 10, 0, 11, 10)), "--title-box")

    def test_should_reject_round_below_one(self) -> None:
        for number in (0, -1):
            self._assert_rejected(self._options(round=number), "--round")

    def test_should_reject_title_scale_out_of_range(self) -> None:
        for scale in (0.0, -0.5, 1.5):
            self._assert_rejected(self._options(title_box=TITLE_BOX, title_scale=scale), "--title-scale")

    def test_should_report_existing_round_before_analysis(self) -> None:
        run(self._options())
        with mock.patch.object(generate, "analyse", side_effect=AssertionError("唔應該行到分析")):
            with self.assertRaisesRegex(GeneratorError, "已經存在"):
                run(self._options(round=1))

    def test_should_not_leave_partial_round_when_rendering_crashes(self) -> None:
        with mock.patch.object(generate, "render_variants", side_effect=RuntimeError("boom")):
            with self.assertRaises(RuntimeError):
                run(self._options())
        self.assertEqual(sorted(path.name for path in self.arc_dir.iterdir()), [])
        # 冇留低半個 round，下一次自動號仍然係 1
        self.assertEqual(run(self._options())["round"], 1)

    def test_force_should_keep_old_round_when_rendering_crashes(self) -> None:
        run(self._options())
        manifest = self.arc_dir / "round-1" / "manifest.json"
        before = manifest.read_bytes()
        with mock.patch.object(generate, "render_variants", side_effect=RuntimeError("boom")):
            with self.assertRaises(RuntimeError):
                run(self._options(round=1, force=True))
        self.assertEqual(manifest.read_bytes(), before)
        self.assertEqual(sorted(path.name for path in self.arc_dir.iterdir()), ["round-1"])

    def test_force_should_remove_stale_files(self) -> None:
        run(self._options(title_box=TITLE_BOX))
        stale = self.arc_dir / "round-1" / "half-disc-title-shrink.webp"
        self.assertTrue(stale.is_file())
        run(self._options(round=1, force=True))
        self.assertFalse(stale.exists())
        self.assertFalse((self.arc_dir / "round-1" / "previews" / "half-disc-title-shrink.png").exists())


class MainTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.cover = self.root / "cover.png"
        fake_cover(self.cover)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _main(self, *extra: str) -> tuple[int, str, str]:
        argv = [
            "--input",
            str(self.cover),
            "--drama",
            "lancy",
            "--arc",
            "half",
            "--out",
            str(self.root / "o"),
        ]
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            try:
                code = main(argv + list(extra))
            except SystemExit as exit_:
                code = int(exit_.code or 0)
        return code, stdout.getvalue(), stderr.getvalue()

    def test_should_print_variants_on_success(self) -> None:
        code, out, _ = self._main()
        self.assertEqual(code, 0)
        self.assertIn("round 1: 11 variants", out)
        self.assertIn("half-disc-center-crop.webp  600x600  center-crop", out)

    def test_should_print_clear_error_without_traceback(self) -> None:
        self.cover.unlink()
        code, _, err = self._main()
        self.assertEqual(code, EXIT_USAGE)
        self.assertTrue(err.startswith("error: "), err)
        self.assertNotIn("Traceback", err)

    def test_should_reject_bad_numbers_at_parse_time(self) -> None:
        for extra in (("--round", "0"), ("--round", "-1"), ("--title-box", "1,2,3"), ("--title-scale", "x")):
            code, _, err = self._main(*extra)
            self.assertEqual(code, EXIT_USAGE, extra)
            self.assertNotIn("Traceback", err)
        self.assertFalse((self.root / "o").exists())

    def test_should_reject_title_box_outside_image(self) -> None:
        code, _, err = self._main("--title-box", "5000,5000,10,10")
        self.assertEqual(code, EXIT_USAGE)
        self.assertIn("--title-box", err)
        self.assertFalse((self.root / "o").exists())


if __name__ == "__main__":
    unittest.main()
