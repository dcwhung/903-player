# Code Review — 2026-10-29 — Catalog 工具 re-review（`dramaFromFolder.mjs` + `scripts/arcCover/`）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼，亦冇寫過修正）
- 目標：`claude/keen-pascal-5iifg0` @ `1ed8a47`，覆核兩份 fail 咗嘅 review 嘅修正：
    - **工具 1：`scripts/dramaFromFolder.mjs`**（前次 `2026-10-29_review_catalog-tools.md`，74 分 fail）
        - `4fd5437` W-486、`e67d9c9` W-487、`a137675` W-488、`5735707` W-489、`bd1d84f` S-554、`d776474` S-555、`863395b` S-556、`34edb53` S-557、`2818480` S-558、`86ef454` S-559；merge `f834c66`
        - 改動檔：`scripts/dramaFromFolder.mjs`、`.d.mts`、`.test.ts`、`tests/jsonSchemas.ts`（新）、`src/catalog/jsonSchemas.node.test.ts`、`tsconfig.node.json`、`tsconfig.app.json`、README
    - **工具 2：`scripts/arcCover/`**（前次 `2026-10-29_review_arc-cover-generator.md`，63 分 fail）
        - `3b7c238` W-492、`929200c` W-490、`6d47aa9` W-491 S-562 S-566、`d78b5a0` W-493 S-560 S-565、`336dd75` W-494 S-564、`3d395ad` S-563、`95eeda4` W-495、`1d14d51` S-561 S-565（README）；merge `1ed8a47`
        - 改動檔：`generate.py`、`analysis.py`、`compose.py`、`preview.py`、`constants.py`、`geometry.py`（新）、`manifest.schema.json`（新）、`requirements*.txt` / `.lock`、`ruff.toml`、6 個 test 檔、root `.gitignore`、README
- Design Origin：冇改 `*.tsx` / `*.css`，Design Fidelity n/a；唔係 PWA 改動，PWA 檢查 n/a。
- Version：`package.json` 冇 bump。兩個都係純開發工具，app build 唔變，跟前兩份 review 先例，唔當 Warning。arcCover 內部版本判斷見下面「版本號判斷」。
- TDD：每個 fix commit 都係 test 同實作一齊入，睇唔到紅燈紀錄；test 針對性強（逐個 finding 有對應 test），接受。
- Review Item ID：`grep -rhoE` 掃 `.proj-docs/` 證實最高 C-008、W-495、S-566。今次由 **S-567** 開始（用到 S-567–S-569，冇新 W / C）。
- 總評：兩個工具**全部前次 finding 都修好**（S-558 除外：改咗但冇達到目的，見 S-567）。冇 regression 會影響輸出正確性：dramaFromFolder 嘅 6 套已上架劇 round-trip test 照過；arcCover 同一輸入兩次輸出 manifest `cmp` 一樣。新問題只有 3 個 🟢。
    - dramaFromFolder：**98 分 ✅ pass**
    - arcCover：**99 分 ✅ pass**

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                                                                                                                               |
| ------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint scripts tests` exit 0；`npx prettier --check .`「All matched files use Prettier code style!」—— **喺 pytest / ruff 跑完、repo 根有 `.pytest_cache/` `.ruff_cache/` 之後再跑一次都係乾淨**（W-492 實證修好）；`ruff check scripts/arcCover`「All checks passed!」；`ruff format --check scripts/arcCover`「14 files already formatted」 |
| Type check    | ✅ pass | `npx tsc -b` exit 0（Python 冇 type checker 設定，同前次一樣 n/a）                                                                                                                                                                                                                                                                                 |
| Tests         | ✅ pass | `npx vitest run scripts/dramaFromFolder.test.ts src/catalog/jsonSchemas.node.test.ts`：2 檔 234 test 全綠；`venv-arcCover/bin/python -m pytest scripts/arcCover/tests -q`：43 passed（前次 9 個）                                                                                                                                                  |
| Coverage      | ✅ pass | `dramaFromFolder.mjs`：statements 96.14%、branches 84.96%、functions 93.25%、lines 97.17%；arcCover（coverage 裝喺 scratch venv，cache 寫去 scratchpad）：`analysis.py` 96%、`compose.py` 100%、`generate.py` 97%、`geometry.py` 100%、`preview.py` 100%，總數 98%（前次 93%）                                                                     |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                                                                                                                             |
| Security scan | ✅ pass | 新依賴只有 dev 嘅 `jsonschema>=4.21`（MIT，lock 4.26.0）。`requirements.txt` 下限已提到 `pillow>=10.3`、`opencv-python-headless>=4.8.1.78`，避開 CVE-2023-4863 / CVE-2023-50447，有 test 鎖住；JS 方面冇新依賴                                                                                                                                     |

## 評分結果

### 工具 1 — `dramaFromFolder.mjs`

| 維度     | 得分   | 滿分    | 備注                                                                     |
| -------- | ------ | ------- | ------------------------------------------------------------------------ |
| 正確性   | 24     | 25      | S-568（`--report` 寫唔到時 exit 2，但 drama.json 已經寫咗）              |
| 安全性   | 20     | 20      | W-487 修好：唔會冇聲覆蓋                                                 |
| 可維護性 | 19     | 20      | S-567（`/// <reference types="vite/client" />` 其實係成個 program 生效） |
| 測試覆蓋 | 15     | 15      | S-559 修好：CLI 輸出過 JSON Schema                                       |
| 性能     | 10     | 10      | S-557 修好：retry 一次                                                   |
| 代碼風格 | 10     | 10      |                                                                          |
| **總分** | **98** | **100** |                                                                          |

**結果：✅ pass**

### 工具 2 — `scripts/arcCover/`

| 維度     | 得分   | 滿分    | 備注                                                               |
| -------- | ------ | ------- | ------------------------------------------------------------------ |
| 正確性   | 25     | 25      | W-490 / W-491 / S-562 / S-564 修好                                 |
| 安全性   | 20     | 20      | W-493 修好                                                         |
| 可維護性 | 19     | 20      | S-569（README 講「最多放大 1.25 倍」，冇講原圖太細嘅例外）         |
| 測試覆蓋 | 15     | 15      | S-563 修好；人面 / CLI / schema / 規則都有 test                    |
| 性能     | 10     | 10      |                                                                    |
| 代碼風格 | 10     | 10      | S-565 修好；仲加咗「函數 ≤ 30 行」同「冇 inline magic number」test |
| **總分** | **99** | **100** |                                                                    |

**結果：✅ pass**

| 工具 / 範圍                                  | 前次    | 今次 | Status  |
| -------------------------------------------- | ------- | ---- | ------- |
| `dramaFromFolder.mjs`（`4fd5437`…`f834c66`） | 74 fail | 98   | ✅ pass |
| `scripts/arcCover/`（`3b7c238`…`1ed8a47`）   | 63 fail | 99   | ✅ pass |

---

## 逐項覆核 — 工具 1：`dramaFromFolder.mjs`

| ID    | 結論        | 證據（reviewer 喺 scratchpad 自己砌 folder 實測，唔只睇 test）                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-486 | ✅ 修好     | `generateDraft` 用 `existingProblem` 先驗形狀（object、`kind`、`arcs` / `episodes` list 每項有 `name` / `date`、`audio.file` 試 render）。實測：c18 嘅每日 `drama.json` 當短篇 `--existing` →「`[錯誤] --existing 係 daily，但 folder 睇落係 series`」exit 1；檔案係 `null` →「唔係 drama.json」exit 1（唔再靜靜雞當新劇）；`{arcc}` →「audio.file「{arcc}.m4a」有問題：unknown token {arcc}」exit 1。全部冇 stack trace。未預期錯誤由 `run` 包住，exit **4** + 叫用戶傳返成段輸出 |
| W-487 | ✅ 修好     | 實測：第二次行同一句 `--id jia` → 「已經存在，冇覆蓋（冇寫任何檔）」exit 2；`--out` = `--existing`（`./jia.drama.json` vs `jia.drama.json`，經 `resolve` 比較）→「就係 --existing 嗰個檔」exit 2；`--force` 先寫。README 選項表 / exit code 表有寫                                                                                                                                                                                                                                 |
| W-488 | ✅ 修好     | 陷阱 regex 改做 `[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]`。實測「小姐你係邊位？」唔報；「Ｘ檔案」報「全形英數「Ｘ」…確認 R2 上面都係全形」，**唔再建議改半形**。README 加咗「唔好改半形」嘅原因                                                                                                                                                                                                                                                                                  |
| W-489 | ✅ 修好     | `--report <檔>`：實測寫出 `UTF-8 text`、冇 BOM；`[錯誤]` 冇寫 drama.json 都照寫報告（有 test）。路徑有 `"` 會講點改（實測 exit 2 + 例子）；尾 `\` / `/` 自動食走，`/`、`C:\` 根目錄唔郁（lookbehind 正確）。README 加 Windows 小節（`curl.exe`、唔好 `                                                                                                                                                                                                                             | tee`/`>`、尾唔好加 `\`）。仍然冇 Windows 實機驗證（reviewer 環境 Linux） |
| S-554 | ✅ 修好     | README / 檔頭改「Node 18.3 或以上，建議 20+」；`todayInHongKong` 改 `formatToParts` 砌 `YYYY-MM-DD`，有 test 證明唔靠 `en-CA`                                                                                                                                                                                                                                                                                                                                                      |
| S-555 | ✅ 修好 +   | `arcChangeIssues` 報集數 / 起始集 / 集名 / files 變動（`[資料]`）。**超出要求**：人手補嘅集名（檔名冇）而家會保留，並用 `files` 寫明真檔名令網址唔變 —— 前次 review 話「以 folder 為準係啱」，呢個做法更好（唔丟人手工作、網址照啱），有 test 經 app `buildEpisodes` 驗網址同 folder 一樣；6 套劇 round-trip 照 byte 一樣，冇 regression                                                                                                                                           |
| S-556 | ✅ 修好     | 實測短篇由 `03` 開始 →「`[注意]` 乙：由第 3 集開始；確認係咪漏咗上載…」，唔阻生成                                                                                                                                                                                                                                                                                                                                                                                                  |
| S-557 | ✅ 修好     | 429 / 5xx / 逾時等 1 秒（常數）再試一次，404 唔試；`retryDelayMs` 可注入，test 唔使真等。揀咗方案 B（冇 GET 後備），同推薦一致                                                                                                                                                                                                                                                                                                                                                     |
| S-558 | ⚠️ 未達目的 | `vite/client` 由 `tsconfig.node.json` 搬去 test 檔頭 `/// <reference types>`。但 **triple-slash `types` reference 係成個 compilation 生效**，唔係只限嗰個檔。reviewer 實測：喺 `scripts/` 加一個 `export const x: string = import.meta.env.BASE_URL;`，`npx tsc -p tsconfig.node.json` **照過（exit 0）**。新加嘅 test 只係驗 config 字串，鎖唔到行為。前次 review 推薦嘅方案 A 本身有錯，責任喺 reviewer。見 S-567                                                                |
| S-559 | ✅ 修好     | ajv 設定抽去 `tests/jsonSchemas.ts`（`compileSchema`），drift test 同 CLI test 共用；`tsconfig.app.json` 排除咗，唔會漏 `node:fs` / ajv 入 app                                                                                                                                                                                                                                                                                                                                     |

其他 regression 檢查：

- `generateDraft` / `formatReport` 嘅 `.d.mts` 型別由 `DramaJson` 放寬做 `unknown` —— 啱，因為而家真係會收壞輸入再驗。
- `ctx.audio.folder` 用 `scan.name` 砌人手集名嘅 `files`：同 `episodeFields` 一樣嘅來源，`audio.folder` 唔夾時 `checkExisting` 已經有 `[注意]`，一致。
- 用法錯（`readArgs` throw）時 `--report` 唔會寫檔（實測 `u.txt` 冇出）—— 只係印上畫面；用法錯唔係用戶要傳返嚟嘅報告，接受。

## 逐項覆核 — 工具 2：`scripts/arcCover/`

| ID    | 結論    | 證據                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-490 | ✅ 修好 | 新 `geometry.py`：`vignette_alpha` 先除 `VIGNETTE_EXTENT = √2`（farthest-corner），`preview._vignette` 同 `compose.disc_visibility` 共用同一條公式。手推：碟邊 position = 1/√2 = 0.707，alpha = (0.707 − 0.55) / 0.45 × 0.45 ≈ **0.157**，同前次推算一樣；`test_vignette.py` 驗 0.78 半徑前 = 0、碟邊 ≈ 0.157、全半徑同 CSS 公式一致、兩邊共用                                                                                                                                                |
| W-491 | ✅ 修好 | `_validate`（未讀圖）→ `_round_dir` → `_load_source`（讀圖 + title-box 喺 EXIF 轉正後嘅範圍內）→ 寫去 `round-N.partial/` → `_publish` rename。實測：`fake.png`「讀唔到圖…」exit 2；`--title-box 790,0,20,20`「超出原圖 800×450」exit 2；`--title-scale nan` 擋到；`--round 0` argparse 擋；`--title-box 0,0,1,1` 照行冇 crash。全部冇 traceback。`ROUND_PATTERN` 唔認 `.partial` / `.old`，自動號唔會跳。中途出錯用 `except BaseException` 只刪暫存，`--force` 時舊 round 原封不動（有 test） |
| W-492 | ✅ 修好 | root `.gitignore` 加 `__pycache__/`、`.pytest_cache/`、`.ruff_cache/`；reviewer 跑完 pytest + ruff（repo 根有兩個 cache）之後 `prettier --check .` 照乾淨，`git status` 乾淨                                                                                                                                                                                                                                                                                                                  |
| W-493 | ✅ 修好 | 下限提到 Pillow 10.3、OpenCV 4.8.1.78、numpy `<3`；`requirements-dev.txt` 分開 pytest / jsonschema / ruff；`requirements.lock`（Python 3.13.17 linux x86_64 freeze）；manifest `env` 記 python / pillow / libwebp / opencv / numpy。test 驗 lock 包晒所有 requirement、下限避開有漏洞嘅 libwebp                                                                                                                                                                                               |
| W-494 | ✅ 修好 | `_write_one`、`_validate`、`_load_source`、`_build_manifest`、`_write_round`、`_publish`、`_draw_grooves`、`_draw_spindle` 抽出；reviewer 用 `ast` 掃 6 個模組，冇函數 > 30 行；`test_preview.py` 有 test 鎖住                                                                                                                                                                                                                                                                                |
| W-495 | ✅ 修好 | 分析 / 合成參數全部入 `constants.py`（有單位 / 出處註解），預覽排版集中喺 `preview.py` 頂；`test_code_rules.py` 用 `ast` 掃函數入面嘅數字（只准 0 / 1 / 2 / 0.5 / 255）。純搬位：reviewer 用同一輸入兩次輸出 `cmp` 一樣                                                                                                                                                                                                                                                                       |
| S-560 | ✅ 修好 | `duplicateOf` 永遠寫（冇 = `null`）；`manifest.schema.json`（draft-07，`additionalProperties: false`，`schema: const 2`）；reviewer 用 jsonschema 驗 3 份新輸出（有 / 冇 title-box、細圖）全部過                                                                                                                                                                                                                                                                                              |
| S-561 | ✅ 修好 | README 列齊頂層同 `variants[]` 欄位，指去 schema；determinism 改講「同一個 venv（`manifest.env` 一樣）」                                                                                                                                                                                                                                                                                                                                                                                      |
| S-562 | ✅ 修好 | `--force` 成個 round 換走（`round-N.old` → 刪）；實測先出冇 title-box 嘅 round，再 `--force --title-box` 覆蓋，資料夾同 manifest 一致；有 test 驗舊檔清走                                                                                                                                                                                                                                                                                                                                     |
| S-563 | ✅ 修好 | `test_faces.py` mock cascade 驗 flip 座標換算、冇眼就丟、窗口上限；`subject_window` 最細窗口 = 輸出高 ÷ `FACE_CROP_MAX_UPSCALE`（1.25）；crop 類 `params.upscale` 有記（實測 80×60 細圖 = 10.0）；CLI test 覆蓋 `main` / `_parse_args`                                                                                                                                                                                                                                                        |
| S-564 | ✅ 修好 | 細碟畫 3px 外圈，顏色用 theme `track`：reviewer 核對 `tokens.css:425` `[data-theme-scope] { --color-divider: var(--theme-track) }`，`Disc.module.css:32` `.small { box-shadow: 0 0 0 3px var(--color-divider) }`，啱                                                                                                                                                                                                                                                                          |
| S-565 | ✅ 修好 | `ruff` 入 `requirements-dev.txt`；README 加 `ruff check` / `ruff format --check`                                                                                                                                                                                                                                                                                                                                                                                                              |
| S-566 | ✅ 修好 | `assert` 改 `if … raise`；`with Image.open(...)`；「round 已存在」喺讀圖 / 分析之前報（實測即時 exit 2）                                                                                                                                                                                                                                                                                                                                                                                      |

### 版本號判斷（MANIFEST_SCHEMA 1 → 2、TOOL_VERSION 1.0.0 → 1.1.0）

- **`schema` 1 → 2：啱**。manifest 形狀真係變咗（頂層 `env` 必有、`duplicateOf` 由「有時冇」變「永遠有 / null」、crop `params` 多 `upscale`），而 `manifest.schema.json` 用 `const: 2`，review 頁可以按 `schema` 分支。注意：scratchpad 入面第一輪（蘭茜 47 個候選）係 schema 1，review 頁要嘛兼容 1、要嘛重出第一輪 —— 唔係 code 問題，交返 main agent / 用戶決定。
- **`toolVersion` 1.0.0 → 1.1.0：合理**。CLI 介面向後兼容（新嘢係選項更嚴格驗證、`--force` 行為更乾淨），所以 minor 而唔係 major；但留意**同一張圖輸出 bytes 會同 1.0.0 唔同**（暗角幾何改咗 → saliency / text-safe 碟面 crop 位變；face-crop 有最細窗口），manifest 有 `toolVersion` + `env`，跨版本比較睇得出原因，夠。
- **`package.json` 唔 bump：啱**。工具唔入 app build，同前兩份 review 先例一致。

其他 regression 檢查：

- `_publish` 喺 `--force` 時先將舊 round 改名 `.old` 再 rename 暫存；兩步之間如果 rename 失敗，舊 round 會留喺 `round-N.old`（唔會冇咗，只係要手動改返名）。同一個資料夾內 rename 幾乎唔會失敗，接受，唔開 item。
- 細圖（80×60）照出晒 13 個候選，`upscale` 如實記錄 10.0，冇 crash。

---

## 問題清單

### 🔴 Critical

冇。

### 🟡 Warning

冇。

### 🟢 Suggestion

#### S-567 — `/// <reference types="vite/client" />` 係成個 program 生效，S-558 冇達到「只限一個檔」

- 位置：`scripts/dramaFromFolder.test.ts:2–3`（註解 + reference）、`:812–820`（「should not give every Node-run file vite/client types」test）
- 描述：TypeScript 嘅 `/// <reference types="…" />` 會將 type package 加入**成個 compilation**，同放喺 `compilerOptions.types` 效果一樣。reviewer 實測：喺 `scripts/zzProbe.ts` 寫 `export const x: string = import.meta.env.BASE_URL;`，`npx tsc -p tsconfig.node.json --noEmit` exit 0（已刪 probe）。所以 S-558 講嘅風險（`scripts/` 純 Node 檔用 `import.meta.env` 照過 type check）仲喺度；檔頭註解「只喺呢個檔開」同 test 名都講錯，test 只驗 config 字串，鎖唔到行為。前次 review 推薦嘅方案 A 本身就係錯，唔係 developer 嘅問題。
- 影響：低 —— 而家 `scripts/` 冇檔用 `import.meta.env`；但註解誤導，將來有人信咗就會中伏。
- 方案 A：開一個細 project `tsconfig.scripts-test.json`（`include: ["scripts/*.test.ts"]`、`types: ["node", "vite/client", "vitest/globals"]`），`tsconfig.node.json` `exclude` 走 `scripts/*.test.ts`，root `tsconfig.json` `references` 加佢；刪走 triple-slash。test 改做真正驗行為：用 `ts.createProgram` 對 `tsconfig.node.json` 編譯一個寫 `import.meta.env` 嘅 fixture，expect 有 error。代價：~15 行 + 1 個 tsconfig
- 方案 B：照留做法，但改註解同 test 名做實話（「vite/client 對成個 tsconfig.node.json program 生效；`scripts/` 純 Node 檔唔好用 `import.meta.env`」），再加 eslint `no-restricted-syntax` 禁 `scripts/*.mjs` 用 `import.meta.env`。代價：~6 行
- 推薦：**A**（真正隔離；B 係退而求其次）

#### S-568 — `--report` 寫唔到時 exit 2，但 `drama.json` 其實已經寫咗

- 位置：`scripts/dramaFromFolder.mjs`（`withReportFile` 嘅 `flush`）、README exit code 表
- 描述：reviewer 實測 `--out z.json --report /nonexist/dir/r.txt`：`z.json` 已寫入，然後「寫唔到報告檔」，exit **2**。README 表寫 `2` =「參數錯，或者輸出檔已經存在（…冇寫檔）」，同實際唔夾；而且 `--report` 路徑錯係一開始就知得到嘅事，冇必要等生成完先發現。
- 影響：低 —— 畫面有講；但 wrapper / 用戶照 README 會以為冇寫檔。
- 方案 A：`readArgs` 之後即刻驗 `--report` 嘅資料夾存在（`existsSync(dirname(resolve(report)))`），唔得就當參數錯 exit 2、乜都未做。代價：~4 行 + 1 個 test
- 方案 B：照而家流程，但 README exit code `2` 嗰行補「或者 `--report` 寫唔到（drama.json 可能已寫）」。代價：README 1 行
- 推薦：**A**

#### S-569 — README 講 face-crop「最多放大 1.25 倍」，冇講原圖太細嘅例外

- 位置：`README.md` arcCover「方法」一段；對應 `compose.py` `subject_window` docstring（有寫「原圖本身太細除外」）
- 描述：窗口上限係原圖尺寸，原圖細過輸出 ÷ 1.25 時照樣會放大更多（reviewer 用 80×60 細圖實測 `upscale: 10.0`）。code 同 manifest 都啱，只係 README 少咗半句，用戶睇 README 會以為一定 ≤ 1.25。
- 方案 A：README 改「最多放大 1.25 倍（原圖本身太細除外；實際倍數記喺 `params.upscale`）」。代價：README 半行
- 方案 B：原圖細過要求就喺 CLI 印 `warning:`。代價：~5 行；有用但超出呢個 item
- 推薦：**A**

---

## ✅ 做得好嘅地方

- **逐個 finding 有針對性 test**，唔係泛泛加 coverage：dramaFromFolder 加咗 22 個 test（壞 `--existing` 四種形狀、覆蓋保護三種情況、`--report` UTF-8 冇 BOM、retry 分 429 / 5xx / timeout / 404…）；arcCover 由 9 個 test 去到 43 個，覆蓋率 93% → 98%。
- **用 test 鎖代碼規則**：arcCover 嘅「函數 ≤ 30 行」同「函數入面冇 magic number」用 `ast` 掃，將來唔使靠 reviewer 記住。
- **S-555 做得比要求更好**：人手補嘅集名唔丟，仲識用 `files` 保住網址，再經 app 真 `buildEpisodes` 驗。
- **`.partial` + rename** 正確實現「要嘛成個 round、要嘛冇」，`--force` 中途出錯唔會整壞舊 round。
- **W-490 抽 `geometry.py`**，預覽同揀位權重唔會再各自一份公式；常數註解寫明 CSS `farthest-corner` 嘅出處。
- **manifest schema + env**：review 頁有正式合約，跨 env 結果唔同都睇得出原因。
- 每個 commit 一個（或明確列出幾個）review item，commit message 跟 `fix(tools): W-xxx | …` 格式。

## 修正優先順序

| 優先 | ID    | 工作量 | 說明                                                                |
| ---- | ----- | ------ | ------------------------------------------------------------------- |
| 1    | S-567 | 細     | `scripts/*.test.ts` 開獨立 tsconfig project，真正隔離 `vite/client` |
| 2    | S-568 | 細     | `--report` 資料夾一開始驗，唔好寫完 drama.json 先 exit 2            |
| 3    | S-569 | 極細   | README 補「原圖太細除外，實際倍數睇 `params.upscale`」              |

三個都係 🟢，唔阻 merge；可以跟下一次掂呢兩個工具時一齊做。

## 修訂後代碼（S-567 / S-568 示意，未套用）

```jsonc
// tsconfig.scripts-test.json（新）—— S-567：vite/client 只畀需要嘅 test project
{
    "extends": "./tsconfig.node.json",
    "compilerOptions": {
        // 經 src/dramas/episodes.ts 用到 import.meta.env；只限呢個 project，唔會漏去 scripts/*.mjs
        "types": ["node", "vite/client", "vitest/globals"],
    },
    "include": ["scripts/*.test.ts", "tests/jsonSchemas.ts"],
}
// tsconfig.node.json：加 "exclude": ["scripts/*.test.ts"]；tsconfig.json references 加 tsconfig.scripts-test.json
```

```js
// scripts/dramaFromFolder.mjs —— S-568：--report 嘅資料夾喺生成之前驗（node:path import 要加 dirname）
const readArgs = (argv) => {
    const { values, positionals } = parseArgs({
        args: argv,
        options: OPTIONS,
        allowPositionals: true,
    });
    if (positionals.length !== 1) throw new Error('要畀一個劇集 folder');
    const folder = folderArg(positionals[0]);
    if (!existsSync(folder) || !statSync(folder).isDirectory())
        throw new Error(`搵唔到 folder：${folder}`);
    // 報告寫唔到係參數問題：一開始講，唔好等 drama.json 寫完先發現
    if (values.report !== undefined && !existsSync(dirname(resolve(values.report))))
        throw new Error(`--report 嘅資料夾唔存在：${dirname(resolve(values.report))}`);
    return { folder, ...values };
};
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 98/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: pass
next_action: merge_develop
next_agent: quality-assurance
branch: "claude/keen-pascal-5iifg0"
context: "Score = lower of two tools (dramaFromFolder 98, arcCover 99); both pass individually. Re-review of catalog-tools (74 fail) and arc-cover-generator (63 fail) fixes at 1ed8a47. dramaFromFolder 98 PASS: W-486..W-489, S-554..S-557, S-559 verified fixed by reading code + scratchpad CLI runs (daily drama.json on series folder / null / bad token -> [錯誤] exit 1, no stack; overwrite refused exit 2 incl. --out == --existing; ？ not flagged, Ｘ flagged without half-width advice; --report UTF-8 no BOM; quote/trailing-separator handling; firstNo 3 warns; retry once). S-555 exceeded: hand-written titles kept via files, URLs verified through app buildEpisodes; 6-drama round-trip unchanged. S-558 NOT effective -> S-567: triple-slash reference types is program-wide (probe file using import.meta.env in scripts/ passes tsc -p tsconfig.node.json); fix with separate tsconfig project for scripts/*.test.ts. S-568: --report write failure exits 2 after drama.json already written (README says exit 2 = nothing written); validate report dir up front. arcCover 99 PASS: W-490..W-495, S-560..S-566 verified (vignette farthest-corner edge alpha 0.157 shared via geometry.py; validation before analysis, round-N.partial + rename, --force replaces whole round; root .gitignore keeps prettier clean after pytest/ruff; dep floors + lock + manifest env; no function >30 lines and no inline magic numbers, both locked by ast tests; schema 2 validated with jsonschema on 3 fresh outputs; same input twice -> manifest cmp identical). S-569: README says face-crop max 1.25x upscale but tiny source gives upscale 10.0 (code/manifest correct, doc needs the exception). Version: MANIFEST_SCHEMA 1->2 appropriate (shape change, schema const 2); TOOL_VERSION 1.1.0 minor appropriate (CLI back-compatible, output bytes differ from 1.0.0, recorded in manifest); package.json no bump correct (tooling only). Note: first-round scratchpad manifests are schema 1. Gates: vitest 234 pass, pytest 43 pass, tsc -b 0, eslint scripts tests 0, prettier --check . clean, ruff check/format clean; coverage CLI 96.1% stmts, arcCover 98%. 3 Suggestions only, non-blocking. QA (optional, tooling only): run dramaFromFolder on a real Windows PowerShell with --report and a quoted path; regenerate one arcCover round from the lock venv and open previews. Not pushed."
```
