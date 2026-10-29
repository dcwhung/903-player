"""publish.py：Artifact 上限分批（W-502）、同上次 publish 比 hash 淨係送改咗嘅檔。"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "review"))

from publish import (  # noqa: E402
    MAX_FILES_PER_PUBLISH,
    ROUNDS,
    batches,
    changed,
    mark_published,
    write_batches,
)

MANY = 600
BIG = 40


def _files(root: Path, count: int) -> dict[str, str]:
    files = {}
    for i in range(count):
        path = root / f"img/{i}.png"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(f"{i}".encode())
        files[f"img/{i}.png"] = str(path)
    (root / ROUNDS).write_text("{}")
    files[ROUNDS] = str(root / ROUNDS)
    return files


def _batch_files(out: Path) -> list[Path]:
    return sorted(out.glob("publish-*.json"), key=lambda p: int(p.stem.split("-")[1]))


class BatchesTest(unittest.TestCase):
    def test_should_split_by_file_count(self) -> None:
        files = {f"f{i}": f"/x/f{i}" for i in range(MANY)}
        sizes = dict.fromkeys(files, 1)
        found = batches(files, sizes)
        self.assertEqual([len(b) for b in found], [MAX_FILES_PER_PUBLISH, MAX_FILES_PER_PUBLISH, 90])
        self.assertEqual([k for b in found for k in b], list(files))

    def test_should_split_by_bytes(self) -> None:
        files = {"a": "/a", "b": "/b", "c": "/c"}
        sizes = {"a": BIG, "b": BIG, "c": 1}
        self.assertEqual(batches(files, sizes, max_bytes=BIG + 1), [{"a": "/a"}, {"b": "/b", "c": "/c"}])

    def test_changed_should_keep_only_new_hashes_and_put_rounds_last(self) -> None:
        files = {ROUNDS: "/r", "a": "/a", "b": "/b"}
        now = {ROUNDS: "r2", "a": "a1", "b": "b2"}
        published = {ROUNDS: "r1", "a": "a1", "b": "b1"}
        self.assertEqual(list(changed(files, now, published)), ["b", ROUNDS])


class WriteBatchesTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.out = Path(self._tmp.name)
        self.site = self.out / "site"
        self.files = _files(self.site, MANY)
        (self.out / "files.json").write_text(json.dumps(self.files))

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def test_first_publish_should_send_everything_in_batches_with_rounds_last(self) -> None:
        write_batches(self.out, self.files)
        found = [json.loads(p.read_text()) for p in _batch_files(self.out)]
        self.assertTrue(all(len(b) <= MAX_FILES_PER_PUBLISH for b in found))
        self.assertEqual(sum(len(b) for b in found), MANY + 1)
        self.assertEqual(list(found[-1])[-1], ROUNDS)

    def test_after_mark_should_send_only_changed_files(self) -> None:
        write_batches(self.out, self.files)
        mark_published(self.out)
        self.assertEqual(write_batches(self.out, self.files), [])
        self.assertEqual(_batch_files(self.out), [])
        Path(self.files["img/3.png"]).write_bytes(b"new")
        [only] = write_batches(self.out, self.files)
        self.assertEqual(json.loads(only.read_text()), {"img/3.png": self.files["img/3.png"]})


if __name__ == "__main__":
    unittest.main()
