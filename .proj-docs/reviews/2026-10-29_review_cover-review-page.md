# Code Review — 2026-10-29 — cover review page（`scripts/arcCover/review/`）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：branch `chore/tools/cover-review-page`，`git diff 51c0f59 09f5771`
    - `1856b34` chore(tools)：將封面 review 頁搬入 `scripts/arcCover/review/`（`build.py`、`fetch_sources.py`、`index.html`、`serve.py`、`verify.cjs`、README）、`.gitignore`、`ruff.toml`、`test_code_rules.py` / `test_preview.py` 守則擴展到 `review/*.py`、新 `tests/test_review.py`
    - `09f5771` docs(readme)：root README 加「新劇 / 新短篇封面 workflow」
- Design Origin：`index.html` 係 Artifact 頁面模板（開發工具），唔係 app 嘅 `*.tsx` / `*.css`，唔入 app build；Design Fidelity / PWA 檢查 n/a。
- Version：`package.json` 冇 bump。純開發工具，app build 唔變，跟 `review_tool-polish` / `review_catalog-tools` 先例，唔當 Warning。
- TDD：test 同實作同一個 commit（由 scratchpad 搬入 repo，已有實作）。工具搬家可接受；新 test 係真 assertion（見「做得好」）。
- Review Item ID：`grep -rhoE '\b[WSC]-[0-9]{3}\b' .proj-docs` 證實最高 C-010、W-500、S-583。今次用 **W-501–W-503**、**S-587–S-593**（原本編 S-584–S-590，同平行 review `2026-10-29_review_s583.md` 撞號，順序不變整體 +3）。
- 總評：結構清楚、生成物唔入 git、`curl` 用 args list（**冇 shell injection**）、頁面所有 `innerHTML` 插值都有 `esc()`、db 讀返嚟嘅值冇當 HTML 用。但 `fetch_sources.py` 將 curl 所有失敗（網絡 / TLS / proxy 403）都報成「搵唔到 cover photo」而且吞咗 stderr（W-501）；README 冇講 Artifact `files` 每次 publish 255 個 / 每版 511 個嘅上限，照而家 44 張現用圖已經佔 88 個檔，再加幾輪候選好快爆（W-502）；`fetch_sources.py` 嘅 IO 邏輯（`.part` 清理、fallback 次序、已有就跳過）冇 test，檔案覆蓋率 53%（W-503）。**78 分 ⚠️ warn**。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                             |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint          | ✅ pass | `ruff check .`（cwd `scripts/arcCover`，用 `ruff.toml`）All checks passed；`ruff format --check .` 19 files already formatted；`prettier --check .` 全部合規；`eslint scripts/arcCover/review/verify.cjs` exit 0                                 |
| Type check    | n/a     | Python 工具冇 mypy 設定；`verify.cjs` 唔喺任何 tsconfig program                                                                                                                                                                                  |
| Tests         | ✅ pass | `venv-arcCover/bin/python -s -E -m pytest scripts/arcCover/tests -q`：**55 passed**（54 秒）；`test_review.py` 12 個 test（加 `test_code_rules` / `test_preview` 擴展）                                                                          |
| Coverage      | ✅ pass | `coverage run --include='scripts/arcCover/review/*'`：`build.py` 85%；`fetch_sources.py` 53%（純邏輯 `cover_url` / `parse_slugs` / `targets` 100%，未測嘅係 `download` / `fetch_one` / `main` IO glue）。核心邏輯 ≥ 80% 判 pass，IO 部分開 W-503 |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                           |
| Security scan | n/a     | 冇新依賴（`numpy` / `Pillow` 已喺 `requirements.lock`；`playwright` 用主 repo 現有 devDependency）                                                                                                                                               |

大 binary：`git show --stat 1856b34 09f5771` 只有 `.py` / `.html` / `.cjs` / `.md` / `.toml` / `.gitignore`；`git ls-files scripts/arcCover | grep -E '\.(png|jpg|webp)$'` 冇結果。✅

Secrets：`R2_BASE` 係 public r2.dev 網址（同 `src/config/constants.ts` `DRAMA_AUDIO_BASE` 一樣，已經 public）；Artifact URL 唔係 credential。冇 token / key。✅

---

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                                               |
| -------- | ------ | ------- | ---------------------------------------------------------------------------------- |
| 正確性   | 18     | 25      | W-501（curl 錯誤全部當 404）、S-592（hash / docId 撞名）、S-593（size-only cache） |
| 安全性   | 19     | 20      | S-587（`--arc` slug / drama id 冇驗，`../` 寫出 work 資料夾）                      |
| 可維護性 | 11     | 20      | W-502（publish 上限冇處理）、S-588–S-591                                           |
| 測試覆蓋 | 10     | 15      | W-503（`fetch_sources` IO 冇 test；`current_images` 預覽路徑冇 test）              |
| 性能     | 10     | 10      |                                                                                    |
| 代碼風格 | 10     | 10      |                                                                                    |
| **總分** | **78** | **100** |                                                                                    |

**結果：⚠️ warn**（hard gates 全 pass、冇 Critical、75–89 分）

---

## 安全重點判斷

| 問題                   | 判斷                                                                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| curl shell injection？ | ✅ 冇。`subprocess.run(["curl", "-sSfL", "--max-time", ..., "-o", str(part), url], check=False)`，冇 `shell=True`。`url` 永遠由 `R2_BASE` 開頭（唔會以 `-` 開頭被當 option），每段 `quote(..., safe="")` encode 晒 `/ ? # & 空格`。 |
| URL 段 encode          | ✅ NFC 後 `safe=""`，`/` 唔會出現喺段入面；test 驗咗中文 + 空格。                                                                                                                                                                   |
| 本機路徑               | ⚠️ `--arc "x=../../evil"` 實測 `parse_slugs` 接受 → `dest_dir / "../../evil.png"` 寫出 `arcCover-src/<drama>/`；`drama` positional 亦一樣（S-587）。本機 CLI、輸入係用家自己打，所以係 Suggestion 唔係 Critical。                   |
| `serve.py`             | ✅ bind `127.0.0.1`，`SimpleHTTPRequestHandler` 有 directory 限制。                                                                                                                                                                 |
| `index.html` XSS       | ✅ `rounds.json` 嘅字串全部經 `esc()`（attribute 全部用雙引號，`'` 唔 escape 都安全）；db `reviews` doc（其他 viewer 寫）只用嚟比較 / 填 `textarea.value` / `textContent`，冇入 `innerHTML`。                                       |
| 外部資源               | Google Fonts stylesheet（Artifact 允許）；冇外部 script。                                                                                                                                                                           |

---

## 問題清單

### 🟡 W-501 — `fetch_sources.download` 將所有 curl 失敗當「搵唔到」，仲吞咗 stderr

- 位置：`scripts/arcCover/review/fetch_sources.py:58-67`（`download`）、`:105`（印 `搵唔到 cover photo`）
- 描述：`capture_output=True` 之後淨係睇 `returncode == 0`。curl `-f` 遇 HTTP ≥ 400 係 exit 22，但 DNS（6）、連唔到（7）、timeout（28）、TLS / CA（35 / 60）、proxy 403 都會一樣行去下一個 `COVER_NAMES`，最後印「搵唔到 cover photo」。
- 影響：喺 Claude cloud session（要經 agent proxy、CA bundle）或者斷網時，用家 / Claude 會以為 R2 真係冇封面，跟住揀「沿用現有圖」或者叫用家另外畀圖 — 錯誤決定，而且冇任何線索去 debug。
- 方案 A（推薦）：分開 exit 22 同其他 code；其他 code 直接 raise / 印 `stderr` 再 `return 2`。
    - Trade-off：多幾行；要加 test（monkeypatch `subprocess.run`）。
- 方案 B：加 `-w '%{http_code}'` 攞 HTTP status，只有 404 / 403 先當「冇」，其他照印 stderr。
    - Trade-off：要 parse stdout；r2.dev 對缺檔有時回 403 仲要另外處理。
- 推薦：A。

### 🟡 W-502 — Artifact publish 上限冇處理 / 冇寫入 README

- 位置：`scripts/arcCover/review/build.py:247-256`（`build`）、`scripts/arcCover/review/README.md` step 5、root `README.md` step 4
- 描述：`files.json` 一次過列晒所有檔。Artifact tool 每次 publish 最多 **255 個檔 / 64MB**，每個版本最多 **511 個檔 / 256MB**，而且更新時冇傳嘅檔會**保留**（舊 round 嘅圖會累積）。而家 `src/dramas/*/*.webp` 有 44 張，每張出 copy + preview = 88 個檔；再加每個 round（約 8 個候選 + 原圖）幾輪就超過 255。
- 影響：未來 Claude session 照 README 做會喺 publish 嗰步被拒，唔知點分批；或者長期累積舊檔撞 511 上限。
- 方案 A（推薦）：`build.py` 檢查 `len(files)`，超過 255 時將 `files.json` 分成 `files-1.json`、`files-2.json`…（每份 ≤ 255、總大小 ≤ 64MB），印出提示；README 寫明「逐份 publish 去同一條 URL」同埋「已經冇用嘅舊 path 喺 `files` 傳 `null` 刪」。
    - Trade-off：多一個 split helper + test。
- 方案 B：淨係 README 加一段上限說明 + 叫 Claude 手動分批。
    - Trade-off：零代碼，但每次靠人記。
- 推薦：A。

### 🟡 W-503 — `fetch_sources` IO 邏輯同 `current_images` 預覽路徑冇 test

- 位置：`fetch_sources.py:58-78`（`download`、`fetch_one`）、`:93-107`（`main`）；`build.py:173-193`（`render_current_preview`、`current_images` 有現用圖嘅分支）
- 描述：覆蓋率 `fetch_sources.py` 53%、`build.py` 85%。未測嘅包括：失敗時刪 `.part`、成功先 rename、`COVER_NAMES` fallback 次序、已有檔 + 冇 `--force` 就跳過、`audio.host != "r2"` 時 exit 1；`build.py` 嘅「沿用現有圖」預覽（`keep` 選項用嘅圖）完全冇 fixture。
- 影響：呢啲就係最易靜靜壞嘅地方（W-501 就係例子）；`keep` 係預設選項，預覽壞咗用家會揀錯。
- 方案 A（推薦）：`download` 收一個 `run=subprocess.run` 參數（同 repo 其他 tool 嘅 io seam 一樣），test 用 fake 模擬 22 / 0 / 7；`BuildTest` fixture 加一張 `src/dramas/<id>/disc.webp` 驗 `current.discPreview`。
- 方案 B：`unittest.mock.patch("subprocess.run")`。
    - Trade-off：唔使改 signature，但 patch 字串易同 import 方式脫節。
- 推薦：A。

### 🟢 S-587 — `--arc` slug / `drama` positional 冇驗格式

- 位置：`fetch_sources.py:33-41`（`parse_slugs`）、`:96`、`:100`
- 描述：實測 `parse_slugs(['x=../../evil'])` → `{'x': '../../evil'}`，之後 `dest_dir / f"{stem}.png"` 寫出 work 資料夾。
- 方案 A（推薦）：slug / drama 用 `^[a-z0-9][a-z0-9-]*$` 驗（同 app slug 一致），唔啱就 `SystemExit`。
- 方案 B：`dest.resolve().is_relative_to(dest_dir.resolve())` 檢查。

### 🟢 S-588 — `render_current_preview` 每次 call 都 `sys.path.insert`、`Image.open` 冇關、import private `_theme_for`

- 位置：`build.py:173-182`
- 描述：44 張現用圖 → `sys.path` 前面塞 44 次同一條路；`Image.open(src)` 冇 `with`；依賴 `generate._theme_for`（underscore = private）。
- 方案 A：module 頂 import 一次（`TOOL_DIR` 加入 path 一次）+ `with Image.open(...)`；`generate.py` 將 `_theme_for` 改 public `theme_for`。
- 方案 B：保持 lazy import 但 `if str(TOOL_DIR) not in sys.path`。

### 🟢 S-589 — `ARC_COVER_WORK` env var 冇寫入 README

- 位置：`build.py:30`
- 描述：`DEFAULT_WORK` 讀 `ARC_COVER_WORK`，兩份 README 都冇提；README 反而叫人每個 command 傳 `--work $WORK`。
- 方案 A：README 寫 `export ARC_COVER_WORK=...` 代替重複 `--work`。方案 B：刪 env var，淨係用 `--work`。

### 🟢 S-590 — `R2_BASE` 同 `src/config/constants.ts` `DRAMA_AUDIO_BASE` 重複

- 位置：`fetch_sources.py:21`
- 方案 A：test 讀 `constants.ts` 用 regex 驗兩邊一樣（防 bucket 搬家時漏改）。方案 B：runtime 由 `constants.ts` parse。推薦 A（簡單、唔影響 runtime）。

### 🟢 S-591 — `.gitignore` 根目錄 `/review/`、`/arcCover/` 好泛

- 位置：`.gitignore:14-16`
- 描述：為咗「萬一 `--work .`」加嘅規則，但 `/review/` 係好普通嘅名，將來 repo 根真係開 `review/` folder 會靜靜被 ignore。
- 方案 A：改成 `/review/site/`、`/review/files.json`（同 build 輸出精確對應）。方案 B：`build.py` 拒絕 `--work` 喺 repo 入面，刪呢三條規則。

### 🟢 S-592 — 頁面 hash / docId 有撞名可能

- 位置：`index.html:608-609`
- 描述：`hashOf` 將 `_drama` 映射做 `cover`，如果有短篇 slug 叫 `cover` 就撞；`docId` 用 `--` 分隔，slug 含 `--` 亦會撞。現有 slug 冇呢個情況。
- 方案 A：S-587 嘅 slug regex 禁 `cover` 同 `--`。方案 B：hash 用 `_drama` 原文。

### 🟢 S-593 — `Site.copy` 只比較檔案大小

- 位置：`build.py:82-86`
- 描述：`src/dramas/<id>/disc.webp` 換咗張同 size 嘅新圖 → site 入面仍係舊圖（README 有寫，但係隱性陷阱）。
- 方案 A：比 `st_mtime_ns` + size。方案 B：比 sha256（慢少少，圖唔多可接受）。

---

## ✅ 做得好嘅地方

- `subprocess.run` 用 list args、冇 shell；`.part` + rename 唔會留半個檔。
- 生成物預設寫去 repo 外 (`tempfile.gettempdir()`)，`.gitignore` 再加一層保險；實測 `git check-ignore` 擋到 `scripts/arcCover/review/site/x.png`、`rounds.json`、`files.json`、`img/a.webp`，而 `src/dramas/*.webp` 冇被誤擋。
- `REPO_ROOT` 由檔案位置推算，worktree 都啱用；`verify.cjs` 喺冇 `node_modules` 嘅 worktree 會 fallback 去主 repo / `PLAYWRIGHT_PATH`。
- 函數長度 ≤ 30 行 / magic number 守則擴展到 `review/*.py`（`test_preview` 報錯改用 relative path，清楚好多）；常數全部有名（`DISC_MARGIN`、`BG_TOLERANCE`、`CURL_TIMEOUT_S`…）。
- `index.html` 嘅 `docId` 同 `build.doc_id` 有 test 鎖住一致；`duplicateOf` 候選過濾、`round-3.partial` 跳過都有 test。
- 頁面：`window.claude?.use?.('db')` 冇 db 時清楚提示「儲存唔到」，唔會假裝儲存成功；save 失敗會顯示 error code。
- README workflow 一步一步、有 `--arc` 新短篇例子、講清楚要 publish 去**同一條 URL**、讀揀選嘅 doc id 格式同值嘅意思 — 未來 Claude session 跟得到（除咗 W-502 上限）。

---

## 修正優先順序

| 優先 | Item  | 原因                             |
| ---- | ----- | -------------------------------- |
| 1    | W-501 | 錯誤會令用家揀錯封面，而且冇線索 |
| 2    | W-502 | 下一次大 publish 一定撞          |
| 3    | W-503 | 鎖住 W-501 修正 + `keep` 預覽    |
| 4    | S-587 | 同 S-592 一齊用 slug regex 解決  |
| 5    | 其餘  | S-588–S-591、S-593 有空先做      |

---

## 修訂後代碼（W-501 + S-587 + W-503 seam）

```python
# fetch_sources.py
import re
from collections.abc import Callable

CURL_HTTP_ERROR = 22  # curl -f：HTTP >= 400
SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*$")  # 同 app slug 一致；禁 `/`、`..`（S-587）


class FetchError(RuntimeError):
    """網絡 / TLS / proxy 問題：唔可以當「R2 冇封面」（W-501）"""


def download(url: str, dest: Path, run: Callable[..., subprocess.CompletedProcess] = subprocess.run) -> bool:
    """curl 落 .part，成功先 rename；HTTP 4xx/5xx 回 False；其他失敗 raise，唔好靜靜當搵唔到"""
    part = dest.with_name(f"{dest.name}.part")
    cmd = ["curl", "-sSfL", "--max-time", CURL_TIMEOUT_S, "-o", str(part), url]
    result = run(cmd, capture_output=True, check=False)
    if result.returncode == 0:
        part.replace(dest)
        return True
    part.unlink(missing_ok=True)
    if result.returncode != CURL_HTTP_ERROR:
        raise FetchError(f"curl exit {result.returncode}: {result.stderr.decode(errors='replace').strip()}")
    return False


def parse_slugs(pairs: list[str]) -> dict[str, str]:
    slugs = {}
    for pair in pairs:
        name, sep, slug = pair.rpartition("=")
        if not sep or not name or not SLUG_PATTERN.match(slug):
            raise SystemExit(f"error: --arc 要寫成 「短篇名=slug」（slug 只可以細楷英文、數字、-）：{pair}")
        slugs[unicodedata.normalize("NFC", name)] = slug
    return slugs
```

```python
# test_review.py（W-503）
def test_download_should_raise_on_network_error_and_drop_part(self) -> None:
    def fake(cmd, **_):
        Path(cmd[cmd.index("-o") + 1]).write_bytes(b"half")
        return subprocess.CompletedProcess(cmd, 7, b"", b"Failed to connect")
    with tempfile.TemporaryDirectory() as tmp:
        dest = Path(tmp) / "drama.png"
        with self.assertRaises(fetch_sources.FetchError):
            fetch_sources.download("https://x", dest, run=fake)
        self.assertEqual(list(Path(tmp).iterdir()), [])
```

（`main` 要 `except FetchError` 印 stderr 再 `return 2`；README 加 exit code 說明。W-502 嘅 split 見方案 A。）

---

## Handoff receipt

```handoff-receipt
protocol: 1
status: warn
score: 78/100
hard_gates:
  lint: pass
  type_check: n/a
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: invoke_developer
next_agent: developer
branch: "chore/tools/cover-review-page"
blockers: ["W-501", "W-502", "W-503"]
context: "Review of 51c0f59..09f5771 (1856b34 tool move, 09f5771 README). No shell injection: curl via args list, no shell=True, URL always starts with R2_BASE, segments NFC + quote(safe=''). No secrets (R2_BASE is the public r2.dev URL already in src/config/constants.ts). No binaries committed (stat + ls-files). .gitignore verified with git check-ignore (site/, rounds.json, files.json, img/*.webp ignored; src/dramas webp not). index.html: all innerHTML interpolation escaped; db docs never rendered as HTML. Gates: pytest 55 pass; ruff check/format clean (cwd scripts/arcCover); prettier clean; eslint verify.cjs 0. Coverage review/: build.py 85%, fetch_sources.py 53% (pure fns 100%, IO glue untested). W-501 curl network/TLS/proxy failures reported as 'cover not found' with stderr swallowed. W-502 files.json can exceed Artifact 255 files/publish (511/version, omitted files kept) - 44 current webp already = 88 files; README silent. W-503 download/fetch_one/main + current-image preview path untested. S-587 --arc slug / drama allow ../ (verified parse_slugs('x=../../evil')). S-588 sys.path insert per call + unclosed Image + private _theme_for. S-589 ARC_COVER_WORK undocumented. S-590 R2_BASE duplicates DRAMA_AUDIO_BASE. S-591 root /review/ /arcCover/ ignore rules too broad. S-592 hashOf 'cover' / docId '--' collision. S-593 size-only copy cache. No version bump needed (tooling only). Not pushed."
```

---

# Round 2 — 2026-10-29 — 覆核 W-501–W-503、S-587–S-593

- 目標：`git diff 344e28a b837d82`
    - `4145d34` docs(review)：S-584–S-590 改號做 S-587–S-593（同平行 review 撞號）
    - `16ca75d` fix(tools)：build side（W-502 新 `publish.py` 分批 + `published.json` / `--mark-published`；W-503；S-587；S-588；S-592；S-593）
    - `bcd4f64` fix(tools)：`fetch_sources`（W-501 exit 22 同其他 curl 錯誤分開、exit code 0/1/2/3；W-503 test；S-590 R2_BASE 鎖）
    - `b837d82` docs(tools)：W-502 上限、S-589、S-591
- Review Item ID：最高 W-503；S-594 已經畀平行 review 用咗。今次用 **W-504**、**S-595–S-597**。
- 總評：10 項全部修好，test 由 55 個加到 79 個（另加 17 個 subtest），`review/` 覆蓋率 92%。我用真 repo 跑 `build.py`，冇 regression：44 張現用圖 + `rounds.json` 一共 89 個檔，slug 驗證冇誤擋現有劇集。不過 `--mark-published` 記低嘅係**最新一次 build** 嘅 hash，唔係真係送咗出去嘅批次。我重現到「rebuild 咗未 publish 就 mark」之後，下次 build 話「冇改動」，而頁面其實冇收到新檔（W-504）。**92 分 ✅ pass**，建議喺依賴增量 publish 之前修 W-504。

## Round 2 Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                         |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint          | ✅ pass | `ruff check .` All checks passed；`ruff format --check .` 22 files already formatted；`prettier --check .` 全部合規；`eslint scripts/arcCover/review` exit 0 |
| Type check    | n/a     | 同 Round 1                                                                                                                                                   |
| Tests         | ✅ pass | `pytest scripts/arcCover/tests -q`：**79 passed, 17 subtests passed**（60 秒）                                                                               |
| Coverage      | ✅ pass | `build.py` 86%（未測嘅係 argparse / `report` / `main`）、`fetch_sources.py` 99%、`publish.py` 100%；`review/` 合共 92%                                       |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                       |
| Security scan | n/a     | 冇新依賴                                                                                                                                                     |

冇 commit 任何 binary（`git diff 09f5771..HEAD --stat -- '*.png' '*.jpg' '*.webp'` 冇結果）。冇 version bump，因為只係改工具。

## Round 2 逐項覆核

| Item  | 結果    | 說明                                                                                                                                                                                                                                            |
| ----- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-501 | ✅ 修好 | `download` 只有 exit 22 先回 `False`，其他 exit code 會 raise `FetchError` 連 curl stderr；`main` 回 exit 3，而且停 fallback（`test_network_error_should_stop_fallback`）。stderr 用 `decode(errors="replace")`，唔會因為編碼錯誤再拋 exception |
| W-502 | ✅ 修好 | `batches` 每批 ≤ 255 個檔、≤ 64MB，單一大檔自己一批；`rounds.json` 擺最尾一批。超過 511 個檔會警告。兩份 README 都有寫上限。新問題見 W-504 / S-595 / S-597                                                                                      |
| W-503 | ✅ 修好 | 有 `run=` seam，`download` / `fetch_one` / `main` 每條路徑都有 test（rename、`.part` 清理、名稱次序、已有就跳過、`--force`、非 R2、exit 3）；`build` 有現用圖預覽 test                                                                          |
| S-587 | ✅ 修好 | `SLUG_PATTERN` = `^[a-z0-9]+(?:-[a-z0-9]+)*$`，禁 `/`、`..`、`--`。`--arc`、`drama.json` disc slug、generator 資料夾、劇集 id（build 同 fetch 兩邊）全部有驗                                                                                    |
| S-588 | ✅ 修好 | `sys.path` 只喺 import 時加一次（有判斷避免重複），`with Image.open`，`theme_for` 改成 public，`generate.py` 嘅 caller 都改埋                                                                                                                   |
| S-589 | ✅ 修好 | 兩份 README 都有寫 `ARC_COVER_WORK`，review README 改用 `export`                                                                                                                                                                                |
| S-590 | ✅ 修好 | `test_r2_base_should_match_app_constant` 用 regex 讀 `constants.ts` 嚟比較                                                                                                                                                                      |
| S-591 | ✅ 修好 | 根目錄 ignore 規則收窄到確實嘅輸出：`git check-ignore` 擋到 `review/site/`、`review/publish-1.json`、`review/published.json`、`arcCover/<d>/<s>/round-1/`、`arcCover-src/<d>/*.png`，但 `review/notes.md`、`arcCover/readme.md` 冇被擋          |
| S-592 | ✅ 修好 | 保留字 `cover` / `drama`，`--` 被 regex 禁咗；另外 `check_page_ids` 會檢查唔同劇集 + 短篇砌出同一個 hash（例如 `sammy-kitty`+`love` 同 `sammy`+`kitty-love`），呢點比原本建議更完整                                                             |
| S-593 | ✅ 修好 | 改用 sha256 比較，`test_build_should_refresh_same_size_copies` 驗過                                                                                                                                                                             |

## `--mark-published` 係咪 usability trap？

結論：**漏咗跑冇害，但跑錯時機就有害**，分兩方面講：

- **漏咗跑 / 新 session**：冇 `published.json`，所以全部重送。因為 Artifact 更新會覆蓋同名 path，重送冇害，只係慢少少；而家 89 個檔一批就送完。developer 講嘅「session-local，新 session 全部重送」係安全嘅。
- **跑錯時機（W-504）**：`mark_published` 讀嘅係**當刻嘅 `files.json`**，唔理邊幾批真係 publish 咗。我實測：
    1. build，publish，然後 `--mark-published`
    2. 加一個新 round，再 build，`publish-1.json` 有 1 個檔（`rounds.json`）
    3. **未 publish** 就跑 `--mark-published`
    4. 再 build，印出「冇改動嘅檔：淨係 publish index.html 就得（或者唔使 publish）」，但 Artifact 上面嘅 `rounds.json` 仍然係舊嘅

    另一個情況：某一批 publish 被拒（例如超過 64MB），之後照跑 `--mark-published`，結果一樣。頁面會靜靜地少咗新 round，或者有爛圖，而 `verify.cjs` 只檢查本機 `site/`，所以捉唔到。

- **換過 artifact URL（S-597）**：`published.json` 冇記 URL。如果之後要開新 artifact（README 叫人唔好開，但例如冇咗權限時就要），用同一個 work 資料夾 build 會乜都唔送。

## Round 2 問題清單

### 🟡 W-504 — `--mark-published` 記低最新 build 嘅 hash，唔係真係 publish 咗嘅批次

- 位置：`scripts/arcCover/review/publish.py:77-83`（`mark_published`）、`build.py:334-337`
- 影響：見上面嘅重現步驟。新 round 或者新候選圖可能永遠唔會上到 Artifact，而工具仲話「冇改動」。
- 方案 A（推薦）：build 嘅時候將每批嘅 hash 寫入 `publish-N.hashes.json`（`publish-N.json` 本身要原封不動畀 Artifact `files` 用，所以唔可以加欄位）。之後改成 `--mark-published N`，每 publish 成功一批就 merge 嗰批嘅 hash 入 `published.json`，再刪嗰批。`report()` 逐批印出確實嘅 command。冇 `publish-N.hashes.json` 就 exit 2。
    - Trade-off：多一個檔、多一個參數；但「publish 一批、mark 一批」一一對應，跑錯都只會影響嗰一批。
- 方案 B：拎走增量功能，`publish-N.json` 永遠包晒全部檔，只按上限分批。
    - Trade-off：零狀態、冇 trap；但超過 255 個檔之後每次要 publish 幾次。而家 89 個檔，一次就得。
- 推薦：A。如果覺得增量唔值得維護，B 都可以接受。

### 🟢 S-595 — 已經冇用嘅舊 path 冇工具列出，511 上限警告亦只計本機檔

- 位置：`publish.py:77-80`、`build.py:322-326`
- 描述：`mark_published` 每次都用當刻 `files.json` 覆蓋 `published.json`，build 唔再出嘅 path（例如被 `duplicateOf` 過濾咗、舊 round）就會被忘記。Artifact 上面嗰啲檔一直累積，但 `len(files) > 511` 只計本機嘅檔。README 叫人「傳 `null` 刪走」，但冇工具列出要刪邊啲。
- 方案 A：`report` 計 `published.keys() - files.keys()`，寫一份 `stale.json`（`{path: null}`），可以直接當 `files` 傳；警告亦應該計 `len(files) + len(stale)`。方案 B：README 寫明用 Artifact `list` 嘅 `scope: "files"` 對照。

### 🟢 S-596 — 未 build 過就跑 `--mark-published` 會出 traceback

- 位置：`publish.py:79`
- 描述：例如 `--work` 打錯、新 session 未 build，會拋 `FileNotFoundError: .../review/files.json`。
- 方案 A：檢查檔案唔存在就印「未 build 過」，再 exit 2。方案 B：W-504 方案 A 實施咗之後自然解決。

### 🟢 S-597 — `published.json` 冇記 artifact URL

- 位置：`publish.py:77-83`
- 描述：換咗 artifact URL 之後，舊 `published.json` 會令新 artifact 收唔到任何圖。
- 方案 A：`--mark-published` 收 `--url`，記入 `published.json`；build 時如果 URL 唔同，或者冇提供 URL，就當未 publish 過。方案 B：README 寫明換 URL 要先刪 `published.json`。

## Round 2 評分

| 維度     | 得分   | 滿分    | 備注                      |
| -------- | ------ | ------- | ------------------------- |
| 正確性   | 19     | 25      | W-504、S-596              |
| 安全性   | 20     | 20      | S-587 修好                |
| 可維護性 | 18     | 20      | S-595、S-597              |
| 測試覆蓋 | 15     | 15      | 79 個 test，`review/` 92% |
| 性能     | 10     | 10      |                           |
| 代碼風格 | 10     | 10      |                           |
| **總分** | **92** | **100** |                           |

**結果：✅ pass**（hard gates 全 pass、≥ 90、冇 Critical）。W-504 唔 block merge，但下一個用增量 publish 嘅 session 之前應該修好；在此之前，README 可以先加一句「唔肯定嘅話刪 `published.json`，全部重送」。

## Round 2 Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 92/100
hard_gates:
  lint: pass
  type_check: n/a
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "chore/tools/cover-review-page"
blockers: []
context: "Round 2 of 344e28a..b837d82 (4145d34 renumber, 16ca75d build/publish, bcd4f64 fetch_sources, b837d82 docs). W-501..W-503 and S-587..S-593 all fixed and verified. Gates: pytest 79 passed + 17 subtests; ruff check/format clean; prettier clean; eslint review/ 0; coverage review/ 92% (publish.py 100%, fetch_sources 99%, build 86%). Real-repo build.py smoke: 89 files, slug validation passes on all current dramas. New W-504: mark_published hashes the current files.json, not the batches actually sent; repro: rebuild after a new round, mark without publishing, next build reports no changes while the artifact lacks the new rounds.json. Forgetting to mark or starting a fresh session only resends everything, which is harmless. S-595: stale paths never listed for null deletion and the 511 check counts local files only. S-596: --mark-published before any build raises FileNotFoundError. S-597: published.json does not record the artifact URL. Recommend fixing W-504 (per-batch mark with hashes recorded at build time) before relying on incremental publish. Docs-only commit; not pushed."
```

---

# Round 3 — 2026-10-29 — 覆核 W-504（拎走增量 publish）、S-595（`--previous` → null）

- 目標：`git diff 837fdc2 01ae9b3`
    - `01ad4c3` fix(tools)：拎走 `published.json` / `--mark-published` / hash 比較，每次 build 都將全部檔分批寫入 `publish-N.json`（每批 ≤ 255 個 / 64MB，`rounds.json` 擺最尾）；新增 `--previous <舊 files.json>`，上次有、今次冇嘅 path 喺最後以 `null` 列出
    - `01ae9b3` docs(tools)：兩份 README 改寫；`.gitignore` 拎走 `published.json` 規則
- Review Item ID：今次由 **S-598** 開始用（**S-598–S-600**），冇新 Warning。
- 總評：W-504 嘅根源（記住「送咗乜」嘅狀態）成個拎走咗，S-596 / S-597 亦跟住冇咗意義。`null` 嘅位置同 batch 計數都啱。剩低三個 Suggestion，都係關於 Artifact tool 喺**新 session** 嘅行為同上限嘅邊界。**97 分 ✅ pass**。

## Round 3 Hard Gates

| Gate          | 結果    | 證據                                                                                                                |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `ruff check .` All checks passed；`ruff format --check .` 22 files already formatted；`prettier --check .` 全部合規 |
| Type check    | n/a     | 同 Round 1                                                                                                          |
| Tests         | ✅ pass | `pytest scripts/arcCover/tests -q`：**82 passed, 17 subtests passed**（63 秒）                                      |
| Coverage      | ✅ pass | `build.py` 98%、`fetch_sources.py` 99%、`publish.py` 100%；`review/` 合共 99%                                       |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                              |
| Security scan | n/a     | 冇新依賴                                                                                                            |

`verify.cjs`（可選）冇跑：今次只改 Python 嘅分批邏輯同 README，`index.html` 冇改。

## Round 3 逐項覆核

| Item  | 結果      | 說明                                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-504 | ✅ 修好   | `grep -rn 'mark-published\|published.json\|mark_published'`（`.proj-docs` 以外）只剩一行：`test_review.py:238` 嘅 `assertFalse(... "published.json" .exists())`，即係有 test 鎖住「唔會再寫狀態檔」。`test_should_send_every_file_each_time_with_rounds_last` 連續 build 兩次，兩次都係 601 個檔全部送。冇咗狀態，就冇咗「標記錯但其實未送」嘅可能                                                |
| S-596 | ✅ 冇意義 | `--mark-published` 已經拎走                                                                                                                                                                                                                                                                                                                                                                       |
| S-597 | ✅ 冇意義 | `published.json` 已經拎走：無論換唔換 URL，每次都係全部送                                                                                                                                                                                                                                                                                                                                         |
| S-595 | ✅ 修好   | `stale_paths(previous, files)` 列出上次有、今次冇嘅 path，`write_batches` 將佢哋以 `null` 擺喺最尾。`main` 喺 build **之前**讀 `--previous`，所以傳 `<out>/files.json` 本身都得。我實測：喺 `files.json` 插入 `img/old/x.png`，再用 `--previous $W/review/files.json` 重新 build，`publish-1.json` 最尾兩個係 `rounds.json` 同 `img/old/x.png: null`，而新嘅 `files.json` 冇咗 `img/old/x.png` ✅ |

## `null` 擺喺 `rounds.json` 後面，Artifact publish 收唔收？

收。根據 Artifact tool 嘅 `files` 定義：「On an update, files Claude passes are added or replaced, files it leaves out are kept, and `null` removes one」，同埋「`null` removes that path on an update」。一次 publish 係一個版本，map 入面嘅次序唔影響結果，所以 `null` 擺最尾冇問題。

至於 `rounds.json` 擺最尾，係為咗分幾批送嘅情況：最後一批先換新嘅 `rounds.json`，佢引用嘅圖喺之前嗰幾批已經上咗。要刪嘅舊 path 喺新嘅 `rounds.json` 入面唔會再被引用，所以喺同一批或者之後一批刪都安全。

## Batch 計數

- **檔案數**：`len(current) >= max_files` 喺加入之前判斷，所以每批最多 255 個。600 + 1 個檔分成 [255, 255, 91]（test 驗咗 600 個切成 255 / 255 / 90）。
- **大小**：`total + size > max_bytes` 就開新一批；單一個超過上限嘅檔會自己一批（`test_should_split_by_bytes`）。`null` 嘅 size 當 0。
- **邊界**：254 張圖 + `rounds.json` + 3 個 `null`，結果係 [255, 3]，第一批最尾係 `rounds.json`，第二批淨係 3 個 `null`。中間嗰段時間，舊 path 仲喺度，但已經冇被引用，所以冇害。
- **真 repo smoke**：89 個檔一批，最尾係 `rounds.json`。

## Round 3 問題清單

### 🟢 S-598 — 新 session publish 去舊 artifact 要先 `read` 同 `list scope:"files"`，README 冇講

- 位置：`scripts/arcCover/review/README.md` step 5、root `README.md` step 4
- 描述：而家每次都全部重送，即係每次 publish 都會**覆蓋**舊 session publish 過嘅 path（`null` 就係刪）。Artifact tool 規定，publish 去一個今個 session 未 `read` 過嘅 artifact 會被拒；而用 `files` 覆蓋或者刪走一個今個 session 未 read、未 list、亦都唔係自己 publish 過嘅 path，都會被拒，拒絕訊息會列出每個 path。呢個係會大聲報錯嘅失敗，唔會靜靜出錯，但下一個 session 第一次 publish 一定會撞到。
- 方案 A（推薦）：step 5 前面加一句：「新 session 先 `Artifact action:"read" url=…`，再 `action:"list" scope:"files" url=…`，之後先逐份 publish」。
- 方案 B：叫用家授權用 `overwrite_unread`。唔推薦，因為要逐個 path 列，而且呢個參數係畀「用家明確要求唔睇就覆蓋」嘅情況用。

### 🟢 S-599 — 新 session 冇上次嘅 `files.json`，舊 path 永遠唔會被刪

- 位置：`build.py` `--previous`；README「唔記得上次嘅 `files.json` 就算」
- 描述：work 資料夾喺 session scratchpad，新 session 冇咗舊 `files.json`，`--previous` 就用唔到，舊 round 嘅圖會一直累積喺 artifact。每個 round 大約 9 個檔，好多個 session 之後先會接近 511。
- 方案 A：`--previous` 亦接受 Artifact `list scope:"files"` 嘅輸出（一行一個 path，或者 JSON 陣列），跟住撇走 `index.html`。咁 S-598 規定要做嘅 listing 就可以順便用嚟清理。
- 方案 B：README 寫明：快到上限時，用 listing 手動計出要刪嘅 path。

### 🟢 S-600 — 上限冇預留主頁 `index.html` 嘅位置

- 位置：`publish.py` `batches` / `MAX_FILES_PER_VERSION`；`build.py` `report`
- 描述：`len(files) > 511` 冇計 `index.html`（實際總數係 `len(files) + 1`）；每批 64MB 亦冇扣主頁大概 40KB。仲有，`report` 淨係計今次嘅檔，冇計 artifact 上面仲保留住嘅舊 path（S-599）。而家 89 個檔，離上限好遠。
- 方案 A：`max_bytes = MAX_BYTES_PER_PUBLISH - TEMPLATE.stat().st_size`，檔案數用 `>= MAX_FILES_PER_VERSION`。方案 B：README 註明上限要預留主頁。

## Round 3 評分

| 維度     | 得分   | 滿分    | 備注                         |
| -------- | ------ | ------- | ---------------------------- |
| 正確性   | 24     | 25      | S-600                        |
| 安全性   | 20     | 20      |                              |
| 可維護性 | 18     | 20      | S-598、S-599                 |
| 測試覆蓋 | 15     | 15      | 82 個 test，`review/` 99%    |
| 性能     | 10     | 10      | 全部重送大約 90 個檔，可接受 |
| 代碼風格 | 10     | 10      |                              |
| **總分** | **97** | **100** |                              |

**結果：✅ pass**（hard gates 全 pass、≥ 90、冇 Critical、冇 Warning）

## Round 3 Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 97/100
hard_gates:
  lint: pass
  type_check: n/a
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "chore/tools/cover-review-page"
blockers: []
context: "Round 3 of 837fdc2..01ae9b3 (01ad4c3 full publish + --previous null deletions, 01ae9b3 docs). W-504 fixed: published.json, --mark-published and hash diffing are all removed; the only remaining reference is a test asserting published.json is never written; consecutive builds always batch every file. S-596 and S-597 are moot. S-595 fixed: --previous is read before build, so passing <out>/files.json itself works (smoke: the vanished path comes out as null after rounds.json). The null entries are valid because a null in the files map removes that path on an update, and map order within one publish does not matter. Batch math is correct: at most 255 per batch with the check made before insert, a byte split with an oversize file alone, nulls sized 0; 254+rounds+3 nulls gives [255,3] with rounds.json last in batch 1. Gates: pytest 82 passed + 17 subtests; ruff check/format clean; prettier clean; coverage review/ 99%. verify.cjs not run because index.html is unchanged. New suggestions: S-598 (README should tell a fresh session to Artifact read + list scope files before publishing, otherwise overwriting or nulling unread paths is refused), S-599 (a fresh session has no old files.json, so stale paths are never deleted; let --previous accept a files listing), S-600 (limits do not reserve the index.html page: the 511 count is off by one and the 64MB batch budget does not subtract the page). Docs-only commit; not pushed."
```
