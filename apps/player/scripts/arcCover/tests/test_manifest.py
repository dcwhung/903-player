"""manifest.json：JSON schema、duplicateOf 永遠有、env 記低 library 版本；依賴檔一致。"""

import json
import platform
import re
import sys
import tempfile
import unittest
from pathlib import Path

import cv2
import jsonschema
import numpy as np
import PIL
from PIL import features

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fakes import fake_cover  # noqa: E402
from generate import Options, run  # noqa: E402

TOOL_DIR = Path(__file__).resolve().parents[1]
SCHEMA_PATH = TOOL_DIR / "manifest.schema.json"
# 假封面 800×450 啱啱 16:9：短篇 tile 嘅 crop / fit 全部同 center-crop 一模一樣
SAME_AS_CENTRE = ("tile-saliency-crop", "tile-text-safe-crop", "tile-fit-blur", "tile-fit-extend")
REQUIREMENT_NAME = re.compile(r"^([A-Za-z0-9_.-]+)")


def _names(path: Path) -> set[str]:
    names = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if line and not line.startswith("-"):
            match = REQUIREMENT_NAME.match(line)
            if match:
                names.add(match.group(1).lower())
    return names


class ManifestTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._tmp = tempfile.TemporaryDirectory()
        root = Path(cls._tmp.name)
        cover = root / "cover.png"
        fake_cover(cover)
        cls.arc = run(Options(cover, "lancy", "half", root / "out"))
        cls.drama = run(Options(cover, "lancy", None, root / "out"))
        cls.written = json.loads(
            (root / "out" / "lancy" / "half" / "round-1" / "manifest.json").read_text(encoding="utf-8")
        )

    @classmethod
    def tearDownClass(cls) -> None:
        cls._tmp.cleanup()

    def test_should_match_json_schema(self) -> None:
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        jsonschema.Draft7Validator.check_schema(schema)
        for manifest in (self.written, self.arc, self.drama):
            jsonschema.validate(manifest, schema, cls=jsonschema.Draft7Validator)

    def test_schema_should_reject_missing_duplicate_of(self) -> None:
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        broken = json.loads(json.dumps(self.written))
        del broken["variants"][0]["duplicateOf"]
        with self.assertRaises(jsonschema.ValidationError):
            jsonschema.validate(broken, schema, cls=jsonschema.Draft7Validator)

    def test_should_always_write_duplicate_of(self) -> None:
        variants = {variant["id"]: variant for variant in self.written["variants"]}
        for variant in variants.values():
            self.assertIn("duplicateOf", variant)
        self.assertIsNone(variants["tile-center-crop"]["duplicateOf"])
        self.assertIsNone(variants["disc-center-crop"]["duplicateOf"])
        for variant_id in SAME_AS_CENTRE:
            self.assertEqual(variants[variant_id]["duplicateOf"], "tile-center-crop", variant_id)

    def test_should_record_library_versions(self) -> None:
        self.assertEqual(
            self.written["env"],
            {
                "python": platform.python_version(),
                "pillow": PIL.__version__,
                "libwebp": str(features.version("webp")),
                "opencv": cv2.__version__,
                "numpy": np.__version__,
            },
        )


class RequirementsTest(unittest.TestCase):
    def test_lock_should_pin_every_requirement(self) -> None:
        lock = (TOOL_DIR / "requirements.lock").read_text(encoding="utf-8")
        pinned = {line.split("==")[0].lower() for line in lock.splitlines() if "==" in line}
        wanted = _names(TOOL_DIR / "requirements.txt") | _names(TOOL_DIR / "requirements-dev.txt")
        self.assertTrue(wanted, "requirements 讀唔到")
        self.assertEqual(wanted - pinned, set())

    def test_floors_should_exclude_vulnerable_libwebp(self) -> None:
        text = (TOOL_DIR / "requirements.txt").read_text(encoding="utf-8")
        # CVE-2023-4863（libwebp）：Pillow 10.0.1 / OpenCV 4.8.1.78 先修；CVE-2023-50447：Pillow 10.2.0
        self.assertRegex(text, r"(?m)^pillow>=10\.3")
        self.assertRegex(text, r"(?m)^opencv-python-headless>=4\.8\.1\.78,<5")
        self.assertRegex(text, r"(?m)^numpy>=")


if __name__ == "__main__":
    unittest.main()
