"""publish.py：Artifact 上限分批（每次全部送）、rounds.json 擺最尾、舊 path 傳 null 刪走。"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "review"))

from publish import (  # noqa: E402
    MAX_BYTES_PER_PUBLISH,
    MAX_FILES_PER_PUBLISH,
    MAX_FILES_PER_VERSION,
    PAGE,
    ROUNDS,
    batches,
    ordered,
    over_version_limit,
    peak_file_count,
    read_previous,
    shares_no_path,
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

    def test_stale_paths_should_never_delete_the_page(self) -> None:
        self.assertEqual(stale_paths([PAGE, "old", ROUNDS], {ROUNDS: "/r"}), ["old"])

    def test_version_limit_should_reserve_room_for_the_page(self) -> None:
        self.assertFalse(over_version_limit(MAX_FILES_PER_VERSION - 1))  # + index.html = 511
        self.assertTrue(over_version_limit(MAX_FILES_PER_VERSION))  # + index.html = 512

    def test_peak_file_count_should_count_old_and_new_paths_before_the_null_batch(self) -> None:
        # S-610：null 擺最後一批，之前嘅版本舊 path + 新 path 並存；index.html 由 over_version_limit 另計
        previous = [PAGE, "old", ROUNDS]
        self.assertEqual(peak_file_count(previous, {ROUNDS: "/r", "new": "/n"}), 3)  # old + rounds + new

    def test_peak_file_count_should_trip_version_limit_when_union_is_too_big(self) -> None:
        half = MAX_FILES_PER_VERSION // 2 + 1
        previous = [f"old/{i}" for i in range(half)]
        files = {f"new/{i}": "/n" for i in range(half)}
        self.assertFalse(over_version_limit(len(files)))
        self.assertTrue(over_version_limit(peak_file_count(previous, files)))

    def test_shares_no_path_should_flag_listing_that_matches_nothing(self) -> None:
        files = {ROUNDS: "/r", "img/a.png": "/a"}
        self.assertTrue(shares_no_path([PAGE, "img/old.png"], files))  # index.html 唔喺 files，唔計重疊
        self.assertFalse(shares_no_path([PAGE, ROUNDS], files))
        self.assertFalse(shares_no_path([], files))  # 冇 --previous 唔使警告
        self.assertFalse(shares_no_path([PAGE], files))  # 淨係主頁：冇舊檔要刪，唔使警告（S-619）


class ReadPreviousTest(unittest.TestCase):
    """--previous：舊 files.json、Artifact list scope:"files" 嘅 JSON 陣列、或者一行一個 path"""

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.path = Path(self._tmp.name) / "previous"

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def test_should_read_files_json_keys(self) -> None:
        self.path.write_text(json.dumps({"img/a.png": "/a", ROUNDS: "/r"}))
        self.assertEqual(read_previous(self.path), ["img/a.png", ROUNDS])

    def test_should_read_json_array_of_paths(self) -> None:
        self.path.write_text(json.dumps([PAGE, "img/a.png", ROUNDS]))
        self.assertEqual(read_previous(self.path), [PAGE, "img/a.png", ROUNDS])

    def test_should_read_one_path_per_line(self) -> None:
        self.path.write_text(f"{PAGE}\n  img/a.png  \n\n{ROUNDS}\n")
        self.assertEqual(read_previous(self.path), [PAGE, "img/a.png", ROUNDS])

    def test_should_take_first_column_of_pasted_listing_rows(self) -> None:
        # S-611：成行抄 listing（path + type + size）都只攞 path；呢個工具出嘅 path 冇空格
        self.path.write_text(f"{PAGE}  text/html  40 KB\nimg/a.png\timage/png\t3 KB\n\n{ROUNDS}\n")
        self.assertEqual(read_previous(self.path), [PAGE, "img/a.png", ROUNDS])

    def test_should_reject_other_json(self) -> None:
        for bad in ([1, 2], "x", {"a": 1}):
            with self.subTest(bad=bad), self.assertRaises(SystemExit):
                self.path.write_text(json.dumps(bad))
                read_previous(self.path)


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

    def test_page_bytes_should_come_out_of_each_batch_budget(self) -> None:
        small = {"img/0.png": self.files["img/0.png"], "img/1.png": self.files["img/1.png"]}
        write_batches(self.out, small)
        self.assertEqual(len(_read_batches(self.out)), 1)
        write_batches(self.out, small, page_bytes=MAX_BYTES_PER_PUBLISH - 1)
        self.assertEqual(
            _read_batches(self.out), [{"img/0.png": small["img/0.png"]}, {"img/1.png": small["img/1.png"]}]
        )


if __name__ == "__main__":
    unittest.main()
