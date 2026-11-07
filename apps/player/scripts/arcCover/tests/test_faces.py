"""人面路徑：Haar 鏡像座標換算、眼過濾、face-crop 窗口唔放大超過上限、manifest 記 upscale。"""

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import analysis  # noqa: E402
from analysis import Analysis, Box, detect_faces  # noqa: E402
from compose import subject_window  # noqa: E402
from constants import DISC_SIZE, FACE_CROP_MAX_UPSCALE  # noqa: E402
from fakes import fake_cover  # noqa: E402
from generate import Options, run  # noqa: E402

IMAGE_SIZE = (400, 300)
HIT = (10, 20, 60, 60)  # 喺鏡像圖入面搵到嘅 x, y, w, h


class _FakeCascade:
    """淨係喺鏡像圖（左邊白）搵到人面；眼 cascade 睇 has_eyes 決定。"""

    has_eyes = True

    def __init__(self, path: str) -> None:
        self.is_eye = path.endswith("haarcascade_eye.xml")

    def detectMultiScale(self, image: np.ndarray, *args: object, **kwargs: object) -> list[tuple[int, ...]]:  # noqa: N802
        if self.is_eye:
            return [(1, 1, 5, 5)] if _FakeCascade.has_eyes else []
        flipped = image[:, 0].mean() > 128
        return [HIT] if flipped else []


def _half_white() -> np.ndarray:
    """右半白、左半黑：鏡像之後左邊變白，fake cascade 用嚟認邊張係鏡像圖。"""
    width, height = IMAGE_SIZE
    image = np.zeros((height, width, 3), dtype=np.uint8)
    image[:, width // 2 :] = 255
    return image


class DetectFacesTest(unittest.TestCase):
    def tearDown(self) -> None:
        _FakeCascade.has_eyes = True

    def test_should_map_mirrored_hits_back_to_original_coordinates(self) -> None:
        with mock.patch.object(analysis.cv2, "CascadeClassifier", _FakeCascade):
            faces = detect_faces(_half_white())
        x, y, w, h = HIT
        self.assertEqual(faces, (Box(IMAGE_SIZE[0] - x - w, y, w, h),))

    def test_should_drop_faces_without_eyes(self) -> None:
        _FakeCascade.has_eyes = False
        with mock.patch.object(analysis.cv2, "CascadeClassifier", _FakeCascade):
            self.assertEqual(detect_faces(_half_white()), ())


def _analysis_with_face(face: Box, size: tuple[int, int] = (1200, 675)) -> Analysis:
    saliency = np.zeros((size[1], size[0]), dtype=np.float32)
    return Analysis(saliency, (face,), (), "none", (face.x, face.y))


class SubjectWindowTest(unittest.TestCase):
    def test_should_not_upscale_beyond_limit(self) -> None:
        # 細人面：淨係計人面 + 邊會得 ~150 px 窗口（放大 4 倍），要撐大到最多放大 FACE_CROP_MAX_UPSCALE
        box, source = subject_window(_analysis_with_face(Box(500, 200, 60, 60)), 1.0, True, DISC_SIZE[1])
        self.assertEqual(source, "faces")
        self.assertLessEqual(DISC_SIZE[0] / box.w, FACE_CROP_MAX_UPSCALE + 1e-6)
        self.assertEqual(box.w, box.h)

    def test_should_keep_face_inside_window(self) -> None:
        face = Box(500, 200, 60, 60)
        box, _ = subject_window(_analysis_with_face(face), 1.0, True, DISC_SIZE[1])
        self.assertTrue(box.x <= face.x and face.right <= box.right)
        self.assertTrue(box.y <= face.y and face.bottom <= box.bottom)

    def test_should_cap_window_at_image_size(self) -> None:
        # 原圖細過輸出：窗口最多係成張圖，唔會出界
        box, _ = subject_window(_analysis_with_face(Box(100, 80, 40, 40), (300, 200)), 1.0, True, 600)
        self.assertEqual((box.w, box.h), (200, 200))


class FaceCropManifestTest(unittest.TestCase):
    def test_face_crop_should_record_subject_and_upscale(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cover = Path(tmp) / "cover.png"
            fake_cover(cover, (1200, 675))  # 夠大：最細窗口唔使撞原圖邊
            face = Box(180, 160, 70, 80)
            with mock.patch.object(analysis, "detect_faces", return_value=(face,)):
                manifest = run(Options(cover, "lancy", "half", Path(tmp) / "out"))
        variants = {variant["id"]: variant for variant in manifest["variants"]}  # type: ignore[union-attr]
        params = variants["disc-face-crop"]["params"]
        self.assertEqual((params["subject"], params["faces"]), ("faces", 1))
        crop = params["crop"]
        self.assertEqual(params["upscale"], round(DISC_SIZE[0] / crop[2], 3))
        self.assertLessEqual(params["upscale"], FACE_CROP_MAX_UPSCALE)
        for variant in variants.values():
            if "crop" in variant["params"]:
                self.assertIn("upscale", variant["params"], variant["id"])


if __name__ == "__main__":
    unittest.main()
