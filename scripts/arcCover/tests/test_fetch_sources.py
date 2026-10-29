"""fetch_sources.py：URL encode、slug 驗證、curl 失敗分類、fallback 次序、.part 清理、main exit code。"""

import contextlib
import io
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "review"))

import fetch_sources  # noqa: E402
from build import REPO_ROOT  # noqa: E402
from fetch_sources import (  # noqa: E402
    EXIT_FETCH_ERROR,
    EXIT_MISSING,
    R2_BASE,
    FetchError,
    cover_url,
    download,
    fetch_one,
    parse_slugs,
    targets,
)

CURL_HTTP_ERROR = 22
CURL_CONNECT_ERROR = 7
LANCY = {
    "name": "蘭茜夫人劇場",
    "audio": {"host": "r2", "folder": "蘭茜夫人劇場"},
    "arcs": [
        {"name": "戀愛二分一", "disc": "half-disc.webp"},
        {"name": "未有碟面"},
        {"name": "我心不死", "disc": "heart-disc.webp"},
    ],
}


class FakeCurl:
    """扮 subprocess.run：記低 URL；`codes` 逐次回 exit code，寫半個 .part 模擬中途斷"""

    def __init__(self, *codes: int, stderr: bytes = b"") -> None:
        self.codes = list(codes)
        self.stderr = stderr
        self.urls: list[str] = []

    def __call__(self, cmd: list[str], **_: object) -> subprocess.CompletedProcess:
        self.urls.append(cmd[-1])
        Path(cmd[cmd.index("-o") + 1]).write_bytes(b"img")
        code = self.codes.pop(0) if self.codes else 0
        return subprocess.CompletedProcess(cmd, code, b"", self.stderr if code else b"")


class UrlAndSlugTest(unittest.TestCase):
    def test_cover_url_should_encode_nfc_segments(self) -> None:
        decomposed = unicodedata.normalize("NFD", "芝See菇Bi Family")
        url = cover_url([decomposed, "cover photo.png"])
        self.assertTrue(url.endswith("/%E8%8A%9DSee%E8%8F%87Bi%20Family/cover%20photo.png"), url)

    def test_r2_base_should_match_app_constant(self) -> None:
        constants = (REPO_ROOT / "src" / "config" / "constants.ts").read_text(encoding="utf-8")
        match = re.search(r"DRAMA_AUDIO_BASE = '([^']+)'", constants)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1), R2_BASE)

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

    def test_parse_slugs_should_reject_unsafe_or_reserved_slug(self) -> None:
        for pair in ("我心不死", "x=../../evil", "x=a/b", "x=cover", "x=drama", "x=a--b", "x=Heart", "x=-a"):
            with self.subTest(pair=pair), self.assertRaises(SystemExit):
                parse_slugs([pair])


class DownloadTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self._tmp.name)
        self.dest = self.dir / "heart.png"

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def test_success_should_rename_part(self) -> None:
        self.assertTrue(download("https://x/a.png", self.dest, run=FakeCurl(0)))
        self.assertEqual([p.name for p in self.dir.iterdir()], ["heart.png"])

    def test_http_error_should_return_false_and_drop_part(self) -> None:
        self.assertFalse(download("https://x/a.png", self.dest, run=FakeCurl(CURL_HTTP_ERROR)))
        self.assertEqual(list(self.dir.iterdir()), [])

    def test_other_curl_error_should_raise_with_stderr(self) -> None:
        curl = FakeCurl(CURL_CONNECT_ERROR, stderr=b"curl: (7) Failed to connect")
        with self.assertRaisesRegex(FetchError, "Failed to connect"):
            download("https://x/a.png", self.dest, run=curl)
        self.assertEqual(list(self.dir.iterdir()), [])


class FetchOneTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self._tmp.name)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def test_should_try_names_in_order(self) -> None:
        curl = FakeCurl(CURL_HTTP_ERROR, CURL_HTTP_ERROR, 0)
        got = fetch_one("heart", ["劇", "我心不死"], self.dir, force=False, run=curl)
        self.assertEqual(got, self.dir / "heart.jpg")
        names = [url.rsplit("/", 1)[1] for url in curl.urls]
        self.assertEqual(names, ["cover%20photo.png", "cover%20photo.jpg", "cover-photo.jpg"])
        self.assertEqual([p.name for p in self.dir.iterdir()], ["heart.jpg"])

    def test_should_return_none_when_all_missing(self) -> None:
        curl = FakeCurl(CURL_HTTP_ERROR, CURL_HTTP_ERROR, CURL_HTTP_ERROR)
        self.assertIsNone(fetch_one("heart", ["劇"], self.dir, force=False, run=curl))
        self.assertEqual(list(self.dir.iterdir()), [])

    def test_should_skip_existing_unless_forced(self) -> None:
        (self.dir / "heart.png").write_bytes(b"old")
        curl = FakeCurl(0)
        self.assertEqual(fetch_one("heart", ["劇"], self.dir, force=False, run=curl), self.dir / "heart.png")
        self.assertEqual(curl.urls, [])
        fetch_one("heart", ["劇"], self.dir, force=True, run=curl)
        self.assertEqual(len(curl.urls), 1)

    def test_network_error_should_stop_fallback(self) -> None:
        curl = FakeCurl(CURL_CONNECT_ERROR)
        with self.assertRaises(FetchError):
            fetch_one("heart", ["劇"], self.dir, force=False, run=curl)
        self.assertEqual(len(curl.urls), 1)


class MainTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        root = Path(self._tmp.name)
        self.repo = root / "repo"
        self.work = root / "work"
        for drama, data in (("lancy", LANCY), ("c18", {**LANCY, "audio": {"host": "app", "folder": "c18"}})):
            (self.repo / "src" / "dramas" / drama).mkdir(parents=True)
            text = json.dumps(data, ensure_ascii=False)
            (self.repo / "src" / "dramas" / drama / "drama.json").write_text(text, encoding="utf-8")

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _main(self, *argv: str, run: FakeCurl) -> tuple[int, str, str]:
        out, err = io.StringIO(), io.StringIO()
        args = [*argv, "--work", str(self.work), "--repo", str(self.repo)]
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = fetch_sources.main(args, run=run)
        return code, out.getvalue(), err.getvalue()

    def test_should_fetch_all_targets(self) -> None:
        code, out, _ = self._main("lancy", run=FakeCurl())
        self.assertEqual(code, 0, out)
        found = sorted(p.name for p in (self.work / "arcCover-src" / "lancy").iterdir())
        self.assertEqual(found, ["drama.png", "half.png", "heart.png"])

    def test_missing_cover_should_exit_missing(self) -> None:
        code, out, _ = self._main("lancy", run=FakeCurl(*[CURL_HTTP_ERROR] * 3))
        self.assertEqual(code, EXIT_MISSING)
        self.assertIn("搵唔到", out)

    def test_network_error_should_exit_with_curl_stderr(self) -> None:
        code, _, err = self._main(
            "lancy", run=FakeCurl(CURL_CONNECT_ERROR, stderr=b"curl: (7) proxy refused")
        )
        self.assertEqual(code, EXIT_FETCH_ERROR)
        self.assertIn("proxy refused", err)

    def test_non_r2_drama_should_fail(self) -> None:
        code, _, err = self._main("c18", run=FakeCurl())
        self.assertEqual(code, EXIT_MISSING)
        self.assertIn("R2", err)

    def test_unsafe_drama_id_should_be_rejected(self) -> None:
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            self._main("../lancy", run=FakeCurl())


if __name__ == "__main__":
    unittest.main()
