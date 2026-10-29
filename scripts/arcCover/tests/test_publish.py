"""publish.py：Artifact 上限分批（每次全部送）、rounds.json 擺最尾、舊 path 傳 null 刪走。"""

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
    ordered,
    stale_paths,
    write_batches,
)

MANY = 600
BIG = 40


def _files(root: Path, count: int) -> dict[str, str]:
    files = {}
    (root / ROUNDS).parent.mkdir(parents=True, exist_ok=True)
    (root / ROUNDS).write_text("{}")
    files[ROUNDS] = str(root / ROUNDS)
    for i in range(count):
        path = root / f"img/{i}.png"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(f"{i}".encode())
        files[f"img/{i}.png"] = str(path)
    return files


def _read_batches(out: Path) -> list[dict]:
    paths = sorted(out.glob("publish-*.json"), key=lambda p: int(p.stem.split("-")[1]))
    return [json.loads(p.read_text()) for p in paths]


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

    def test_ordered_should_put_rounds_last(self) -> None:
        self.assertEqual(list(ordered({ROUNDS: "/r", "a": "/a", "b": "/b"})), ["a", "b", ROUNDS])

    def test_stale_paths_should_list_paths_that_disappeared(self) -> None:
        previous = {"a": "/a", "old": "/old", ROUNDS: "/r"}
        self.assertEqual(stale_paths(previous, {"a": "/a", ROUNDS: "/r", "new": "/n"}), ["old"])


class WriteBatchesTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.out = Path(self._tmp.name)
        self.files = _files(self.out / "site", MANY)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def test_should_send_every_file_each_time_with_rounds_last(self) -> None:
        for _ in range(2):  # 冇增量：再 build 一次都係全部送
            write_batches(self.out, self.files)
            found = _read_batches(self.out)
            self.assertTrue(all(len(b) <= MAX_FILES_PER_PUBLISH for b in found))
            self.assertEqual(sum(len(b) for b in found), MANY + 1)
            self.assertEqual(list(found[-1])[-1], ROUNDS)

    def test_should_drop_old_batch_files(self) -> None:
        write_batches(self.out, self.files)
        write_batches(self.out, {ROUNDS: self.files[ROUNDS]})
        self.assertEqual(_read_batches(self.out), [{ROUNDS: self.files[ROUNDS]}])

    def test_removed_paths_should_go_last_as_null(self) -> None:
        small = {ROUNDS: self.files[ROUNDS], "img/0.png": self.files["img/0.png"]}
        write_batches(self.out, small, removed=["img/gone.png"])
        [batch] = _read_batches(self.out)
        self.assertEqual(list(batch.items())[-1], ("img/gone.png", None))
        self.assertEqual(list(batch)[-2], ROUNDS)


if __name__ == "__main__":
    unittest.main()
