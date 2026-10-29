# Code Review — 2026-10-29 — Catalog 工具（JSON Schema + `dramaFromFolder.mjs`）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/keen-pascal-5iifg0` 對 `3456f31`（v1.20.6）；兩批：
    - **Batch 1：JSON Schema**
        - `f26d501` chore(deps)：加 `ajv` / `ajv-formats` devDependencies
        - `ec8233a` chore(schema)：`schemas/drama.schema.json`、`schemas/show.schema.json`、`.vscode/settings.json`、`src/catalog/jsonSchemas.node.test.ts`、README
    - **Batch 2：`scripts/dramaFromFolder.mjs`**
        - `fcb7ebf` feat(tools)：由本機劇集 folder 生成 drama.json 草稿（`.mjs`、`.d.mts`、`.test.ts`、`tsconfig.node.json` 加 `vite/client`）
        - `6ba2b2d` docs(readme)：點樣下載同行
        - `57e9eb6` merge
- 範圍外：審閱期間 branch head 已經去到 `56f078f`（另一條 lane merge 咗 `scripts/arcCover`，`cb973cd` / `b028f75`），唔喺今次範圍，冇審。
- 背景：r2.dev 冇 listing，用戶要由**上載去 R2 嗰份本機 folder** 生成 `drama.json`。用戶部機有 Node、**冇呢個 repo**，會由 GitHub raw 下載單一 `.mjs` 嚟行；可能係 Windows 或者 macOS。
- Design Origin：冇改 `*.tsx` / `*.css`，Design Fidelity n/a；唔係 PWA 改動，PWA 檢查 n/a。
- Version：冇 bump。純開發工具 / schema / 文件，build 出嚟嘅 app 唔變；跟 `2026-10-28_review_e2e_hardening.md`、`2026-10-27_review_cleanup_batch.md` 先例（跟下一個 release），唔當 Warning。
- Review Item ID：`grep -rhoE` 掃 `.proj-docs/` 證實最高 S-553；W-486 喺 batch C / v1.20.6 只寫過「由 W-486 開始」但未用過。今次由 **W-486**、**S-554** 開始（用到 W-486–W-489、S-554–S-559）。
- 總評：hard gates 全部 pass，冇 🔴 Critical。
    - **Batch 1（Schema）好扎實**：同一批例子兩邊一齊收 / 一齊拒，刻意唔同嘅位列晒喺 `DIVERGENCES` 表，逐個欄位刪走對比 required，token set 對 runtime 嘅 `SERIES_TOKENS` / `DAILY_TOKENS`，兩份 schema 嘅 theme 定義鎖成一樣。現有 6 個 `drama.json` + 全部 `show.json` 都過 schema。冇問題，✅ pass。
    - **Batch 2（CLI）核心正確**：reviewer 由 6 套已 commit 嘅劇反砌 folder 樹再用 `--existing` 生成，**6 / 6 連 key 次序都 byte 一樣**，再過 prettier 同 commit 咗嘅檔逐 byte 一樣；adversarial fixture（第零集、短篇名有「 - 」、集名有「 - 」同「 _ 」、`Ⅱ` vs `II`、`第2集`、`.MP3`、部份有集名）全部砌得啱。問題喺**周邊**：`--existing` 壞檔會 crash（W-486）、輸出檔冇聲覆蓋（W-487）、中文全形標點誤報兼畀錯建議（W-488）、Windows 下報告大機會亂碼（W-489）。
    - 按評分規則 Batch 2 得 74 分（4 W + 6 S），**差 1 分到 warn 線**，所以整體 ❌ fail —— 唔係 gate 問題，係分數。修好 4 個 W 就 ≥ 90。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                                                              |
| ------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint .` exit 0；`npx prettier --check schemas scripts src/catalog README.md .vscode` 「All matched files use Prettier code style!」（`.claude/worktrees/*` 係另一個 agent 嘅 worktree，唔計）                                                                              |
| Type check    | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                                                                                                                               |
| Tests         | ✅ pass | `npx vitest run src/catalog src/dramas scripts`：24 個檔、366 個 test 全綠（冇跑 e2e）                                                                                                                                                                                            |
| Coverage      | ✅ pass | `dramaFromFolder.mjs`：statements 95.48%、branches 84.34%、functions 92.19%、lines 96.73%（`--coverage.include=scripts/dramaFromFolder.mjs`）；schema 係資料，由 drift test 鎖                                                                                                    |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                                                            |
| Security scan | ✅ pass | 新增 `ajv@8.20.0`、`ajv-formats@3.0.1`（MIT，dev only，只喺 test import）。`npm audit`：6 個（5 low、1 moderate），**全部原本已經有**：moderate 係 `fast-uri@3.1.8`，base lockfile 已經經 `workbox-build` 嘅 `ajv@8.20.0` 裝咗，今次只係 hoist 上頂層；`npm audit --omit=dev` = 0 |

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                                              |
| -------- | ------ | ------- | --------------------------------------------------------------------------------- |
| 正確性   | 18     | 25      | W-486（壞 `--existing` crash）、S-554（Node 版本 / en-CA）、S-556（firstNo 起點） |
| 安全性   | 15     | 20      | W-487（輸出檔冇聲覆蓋，可以冚走人手改過嘅 drama.json）                            |
| 可維護性 | 8      | 20      | W-488（全形標點誤報）、W-489（Windows 報告亂碼）、S-555、S-558                    |
| 測試覆蓋 | 14     | 15      | S-559（CLI 輸出未過 JSON Schema）                                                 |
| 性能     | 9      | 10      | S-557（`--verify` 冇 retry / 冇 GET 後備）                                        |
| 代碼風格 | 10     | 10      | ESLint / Prettier 全過                                                            |
| **總分** | **74** | **100** |                                                                                   |

> 說明：上表係 Batch 2 嘅分（全部問題都喺 Batch 2）。Batch 1 冇問題，100 分。

**結果：❌ fail**（hard gates 全 pass、冇 Critical，但 Batch 2 得 74 < 75）

| Batch / Commit                    | 內容                                    | 分數 | Status  |
| --------------------------------- | --------------------------------------- | ---- | ------- |
| 1 · `f26d501`                     | ajv / ajv-formats devDeps               | 100  | ✅ pass |
| 1 · `ec8233a`                     | JSON Schema + VS Code 設定 + drift test | 100  | ✅ pass |
| 2 · `fcb7ebf` / `6ba2b2d` / merge | `dramaFromFolder.mjs` + test + README   | 74   | ❌ fail |

---

## 重點驗證

### Batch 1 — JSON Schema

| 項目                                 | 結論       | 證據                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 現有資料檔會唔會被 schema 拒         | ✅ 唔會    | `jsonSchemas.node.test.ts` 逐個 `src/dramas/*/drama.json`、`src/shows/*/show.json` 用 schema 驗，全部 pass。冇檔有多出嚟嘅 key                                                                                                                                                                            |
| `additionalProperties: false` 嘅取捨 | ✅ 啱      | runtime 唔理多出嚟嘅 key，schema 拒 —— 對 editor 有用（`enabeld` 即刻紅線），而且有 test 保證現有檔全部過，將來有人加新 runtime 欄位而唔改 schema，第一個用到嘅檔就會令「現有資料檔全部合格」test fail，唔會靜靜雞走樣。`$schema` key 刻意准                                                              |
| drift 保護                           | ✅ 夠      | (1) drama 46 個 invalid / 15 個 valid、show 13 個 invalid / 5 個 valid 例子兩邊一齊驗；(2) 逐個 key 刪走比較 required；(3) token set 由 runtime `SERIES_TOKENS` / `DAILY_TOKENS` 直接 import 對；(4) 刻意分歧（schema-only 7 個、runtime-only 7 個）都有 test 鎖住，分歧一消失 test 就 fail，逼人更新文件 |
| template pattern vs runtime regex    | ✅ 一致    | reviewer 手推 `{{no}`、`{foo}`、`a{b`：兩邊結果一樣；`\w` 喺 ajv（`u` flag）同 runtime 都係 ASCII                                                                                                                                                                                                         |
| `color-hex` format                   | ✅         | ajv 唔識呢個 format，test 用 `ajv.addFormat('color-hex', true)` 註冊做 no-op，真規則靠 pattern；VS Code 用嚟出色盤                                                                                                                                                                                        |
| ajv 位置                             | ✅         | 只喺 `devDependencies`，只有 `jsonSchemas.node.test.ts` import；app bundle 冇                                                                                                                                                                                                                             |
| CLI 輸出過唔過 schema                | ✅（手動） | reviewer 用同一組 ajv 設定驗 3 份 CLI 輸出（新劇 fixture、`--existing` merge 結果、golden 新劇），全部 pass；但冇自動 test，見 S-559                                                                                                                                                                      |

### Batch 2 — `dramaFromFolder.mjs`

| 項目                                       | 結論       | 證據                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 單一檔案、零依賴                           | ✅         | import 只有 `node:fs`、`node:path`、`node:url`、`node:util`；test「only node: built-in imports」鎖住。`.d.mts` 只畀 repo 入面 TS 用，用戶唔使下載                                                                                                                                                                                                  |
| 最低 Node 版本                             | ⚠️ S-554   | `parseArgs` 要 18.3+（或 16.17+），`AbortSignal.timeout` 17.3+，`fetch` 18+；README 寫「Node 18」。18.0–18.2 會 SyntaxError（`does not provide an export named 'parseArgs'`），訊息唔友善                                                                                                                                                          |
| 6 套已上架劇 round-trip（reviewer 自己做） | ✅ 6 / 6   | scratchpad 寫咗個 mirror script，用 CLI 自己嘅 `episodeUrls` 由 commit 咗嘅 `drama.json` 砌返 folder 樹（chisee、golden、jim、lancy、sammy-kitty、c18），再 `--existing … --out` 生成：`JSON.stringify` 同原檔**連 key 次序一樣**，過 prettier 後同 repo 檔**逐 byte 一樣**。repo 嘅 test 用 `toEqual`（唔理 key 次序），reviewer 呢個係更嚴嘅驗證 |
| 檔名解析 vs `filename.ts` / `episodes.ts`  | ✅         | `toChineseNumeral` / `renderFileName` / `encodePath` 同 app 逐行一樣；URL 砌法 `<base>/<folder>/<arc>/<file>` 每段 `encodeURIComponent`，同 `episodes.ts` 一樣；titles 優先次序（`titles` 蓋過 `episodes` list）同 `schema.ts` 一樣；`null` 集名處理一樣                                                                                           |
| Fixture：短篇名有「 - 」                   | ✅         | `A - B/01 - A - B - 第一集 - 甲 - 乙.m4a` → arc `A - B`、集名 `甲 - 乙`（lazy match 正確回溯）                                                                                                                                                                                                                                                     |
| Fixture：第零集                            | ✅         | `00 - 零篇 - 第零集 - 前傳.m4a` → `firstNo: 0`、`titles: { "0": "前傳" }`，schema / runtime 都收                                                                                                                                                                                                                                                   |
| Fixture：`Ⅱ` vs `II`                       | ✅         | folder `續集Ⅱ`、檔名 `續集II`：報兩個 `[注意]`（羅馬數字、「睇落一樣，只係 Unicode 寫法唔同」），兩集用 `files` 寫明真檔名，URL 啱                                                                                                                                                                                                                 |
| Fixture：`第2集`、`.MP3`、部份有集名       | ✅         | `files: { "2": "02 - 混合 - 第2集.m4a", "4": "04 - 混合 - 第四集.MP3" }`、`episodes: 4` + `titles: { "3": "有名" }`；`notes.txt` 列入略過                                                                                                                                                                                                          |
| golden `{folder}{arc}` template            | ✅         | 冇 `--existing` 都自動揀中 `{no2} - {folder}{arc} - …`（逐個 template 計幾多集砌得返）                                                                                                                                                                                                                                                             |
| NFC / NFD                                  | ✅         | 讀入一律 `normalize('NFC')`，原名 NFD 會 `[注意]` 兼叫用 `--verify` 確認 R2 key；中文字冇 NFD 分解，實際只影響帶重音拉丁字                                                                                                                                                                                                                         |
| `--existing` merge                         | ✅ / ⚠️    | 人手欄位（name、order、theme、arc `disc` / `tile` / `addedAt`）照留；folder 冇嘅短篇保留兼 `[注意]`；新短篇加尾、`addedAt` = 香港今日（`2026-10-29`）。但壞 `--existing` 會 crash（W-486），`titles` / `files` 有變冇提示（S-555）                                                                                                                 |
| error / warning 政策、exit code            | ✅ / ⚠️    | 跳號、重複、檔名讀唔到、集數對唔上 → `[錯誤]`、exit 1、**冇寫檔**；`[注意]` 唔阻。參數錯 exit 2；`--verify` 有唔得 exit 3（已寫檔）。但 uncaught exception 都係 exit 1，同「有 [錯誤]」撞（W-486）                                                                                                                                                 |
| 覆蓋檔案                                   | ⚠️ W-487   | 冇 `--out` 都會寫 `<id 或劇名>.drama.json` 喺 cwd；已存在就冇聲覆蓋。`--out` 同 `--existing` 同一個檔亦照覆蓋（reviewer 實測 `hand.json`）                                                                                                                                                                                                         |
| `--verify`                                 | ✅ / S-557 | 6 條 worker 共用 index（單線程，冇 race），每條 `AbortSignal.timeout(10s)`，結果跟原本次序；host 唔係 r2 就跳過。只用 HEAD，冇 retry、冇 GET 後備（S-557）。開發者報真 R2 470 / 470 200，reviewer 冇網上 R2 重做                                                                                                                                   |
| Windows 路徑                               | ✅ / ⚠️    | 用 `node:path` 嘅 `join` / `resolve` / `basename`，`resolve` 會食走尾斜線；`isEntryPoint` 兩邊都經 `pathToFileURL(realpath)`，應該一致（reviewer 環境係 Linux，冇 Windows 實測）。README 嘅 `curl -LO`、`                                                                                                                                          | tee` 喺 PowerShell 有問題（W-489） |
| 報告文字                                   | ✅ / ⚠️    | 廣東話清楚：每個短篇集數 / 範圍 / 封面 / 唔常見封面名、略過檔、上架前要補乜。全形標點誤報（W-488）                                                                                                                                                                                                                                                 |
| `tsconfig.node.json` 加 `vite/client`      | ✅ / S-558 | 原因：test import `src/dramas/episodes.ts`（用 `import.meta.env.BASE_URL`）。`tsc -b` 過；副作用係 `scripts/` 入面用純 Node 行嘅檔都會當 `import.meta.env` 存在（S-558）                                                                                                                                                                           |
| TDD                                        | ⚪ 接受    | test 同實作同一個 commit，睇唔到 red 階段；test 質素高（真 validator + 真 `buildEpisodes`、本機 HTTP server 驗 `--verify`、round-trip），接受                                                                                                                                                                                                      |

---

## 問題清單

### 🔴 Critical

冇。

### 🟡 Warning

#### W-486 — 壞嘅 / 唔夾嘅 `--existing` 會 crash 出 stack trace，唔係 `[錯誤]` 報告

- 位置：`scripts/dramaFromFolder.mjs:504–517`（`seriesJson`）、`:488–502`（`checkExisting`）、`:553–563`（`generateDraft`）、`:788–809`（`run`）
- 描述：reviewer 實測：
    - 每日劇嘅 `drama.json`（c18）當 `--existing` 畀短篇劇 folder：`analyseSeries(scan, existing.audio.file)` 用 `{yyyymmdd}.m4a` 做短篇 template，`renderFileName` throw `Error: unknown token {yyyymmdd}`，成個 stack trace 噴出嚟，**報告一行都冇**。原意係 `checkExisting` 報「--existing 係 daily，但 folder 睇落係 series」，但佢喺 template 用咗之後先行。repo test 只測咗相反方向（短篇 drama.json + 每日 folder）
    - `audio.file` 有打錯 token（`{arcc}`）、`arcs` 唔係 array：同樣 crash
    - `--existing` 檔內容係 `null`：`existing` 變 falsy，**靜靜雞當新劇**處理（中性 theme、`enabled: false`），用戶以為 merge 咗
    - crash 嘅 exit code 係 1，同「有 [錯誤]，冇寫檔」一樣，wrapper script 分唔到
- 影響：冇寫檔，所以唔會壞資料；但用戶（唔識 Node）見到 stack trace 唔知點算，`null` 情況會出一份錯嘅草稿
- 方案 A：喺 `generateDraft` 開頭驗 `existing` 形狀（係 object、`kind` 同 folder 夾、`arcs` / `episodes` 係 array、`audio.file` 試 render 一次唔 throw），唔啱就 `[錯誤]` + `json: null`；`run` 再包一層 try/catch，未預期錯誤用新 exit code 4（`internal`）兼印一句「請將成段輸出傳返嚟」。代價：~25 行 + 4 個 test
- 方案 B：淨係喺 `run` 包 try/catch，印 `error.message`（唔印 stack），exit 4。代價：~6 行；但 `null` 情況仍然靜靜雞當新劇，kind 唔夾仍然冇清楚提示
- 推薦：**A**

#### W-487 — 輸出檔已存在都冇聲覆蓋（包括 `--out` 同 `--existing` 同一個檔）

- 位置：`scripts/dramaFromFolder.mjs:805–806`
- 描述：`writeFileSync(out, …)` 直接寫。冇 `--out` 時寫 `<id 或劇名>.drama.json` 喺 cwd。常見流程：第一次 `--id sammy-kitty` 生成 → 人手改 theme / name / order → 之後再行**同一句命令**（README 第 2 步，冇 `--existing`）→ 人手改嘅嘢冇晒，冇任何提示。`--out` 指向 `--existing` 嗰個檔亦會原地覆蓋（reviewer 實測 `hand.json`），merge 有遺漏（例如 S-555 嘅 titles）就冇得返轉頭
- 影響：人手工作冇聲冇氣咁冇咗；用戶冇 git，冇得 undo
- 方案 A：目標檔已存在就唔寫，印「`<檔>` 已經存在；要覆蓋請加 `--force`，或者用 `--out` 揀第二個名」，exit 2；加 `--force` option。代價：~8 行 + 1 個 test，README 選項表加一行
- 方案 B：照寫，但先將舊檔 rename 做 `<檔>.bak`（已有 `.bak` 就加時間戳），報告寫明。代價：~10 行；永遠唔阻，但會積 `.bak`
- 推薦：**A**（明確過 B；用戶多打一個 `--force` 唔辛苦）

#### W-488 — 中文全形標點（？！：（））當「可疑字元」，仲建議改半形

- 位置：`scripts/dramaFromFolder.mjs:148–151`（`CHARACTER_TRAPS` 第二條 `/[\uff01-\uff5e]/u`）
- 描述：`U+FF01–FF5E` 包埋中文標點。reviewer 用已上架劇實測，lancy 報：
    - `檔名「17 - 三十六計 - 第十七集 - 美人計 _ 小姐你係邊位？.m4a」全形字「？」(U+FF1F)，半形係「?」`
    - `檔名「39 - 公子森林 - 第三十九集 - 大結局？.m4a」全形字「？」…`
      中文集名用全形標點係正常寫法，R2 上面個 key 就係「？」。建議改「?」係**錯嘅**：Windows 檔名唔准 `?`；改咗名要重新上載，而且 URL 一變已儲進度就冇（URL 係 localStorage key）。誤報多咗，用戶會學識無視 `[注意]`，真正嘅陷阱（全形英文字母 `Ｘ`，chisee 都有報到）反而會漏眼
- 方案 A：陷阱只包全形英數：`/[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]/u`（０–９、Ａ–Ｚ、ａ–ｚ）。代價：1 行 + 改 `findSuspicious` test 加一個「？」唔報嘅例子
- 方案 B：保留範圍，但標點改報 `[資料]`，訊息改「確認 R2 上面都係全形」，唔講「半形係」。代價：要分兩條 trap，~6 行
- 推薦：**A**（標點本身唔係陷阱；英數全形先係「睇落一樣」）

#### W-489 — Windows 用戶照 README 做，下載同報告都大機會出事

- 位置：`README.md`「由本機 folder 生成 drama.json」一節；`scripts/dramaFromFolder.mjs`（冇寫報告檔嘅 option）
- 描述（推斷，reviewer 環境係 Linux，冇 Windows 實測）：
    - `curl -LO …`：Windows PowerShell 5.1 入面 `curl` 係 `Invoke-WebRequest` 嘅 alias，`-LO` 會報錯；要打 `curl.exe`
    - `node … | tee report.txt`：PowerShell 會用 console code page（香港 Windows 預設 950 / Big5）解碼 Node 嘅 UTF-8 輸出，`report.txt` 入面中文會變亂碼；PowerShell 5.1 嘅 `Tee-Object` 仲會寫成 UTF-16。偏偏報告係要**傳返嚟**嘅主要交付物
    - 路徑用雙引號加尾反斜線（`"D:\劇\黃金少年\"`）會令 Windows argv 將 `\"` 當跳脫，變成「搵唔到 folder」
- 方案 A：加 `--report <檔>`，script 自己用 UTF-8 寫報告（連 `--verify` 結果）；README 加 Windows 小節：`curl.exe -LO …` 或者瀏覽器「另存」、用 `--report report.txt` 代替 `| tee`、路徑尾唔好加 `\`。代價：~15 行 code + 1 個 test + README 幾行
- 方案 B：只改 README：Windows 用 `cmd.exe` 嘅 `>` redirect（byte 照抄，唔會轉碼），`curl.exe`。代價：純文件；但用戶要記得唔好用 PowerShell，容易中伏
- 推薦：**A**

### 🟢 Suggestion

#### S-554 — Node 版本：README 寫 18，實際要 18.3+；`todayInHongKong` 靠 `en-CA` 格式

- 位置：`scripts/dramaFromFolder.mjs:9`、`:23`、`:421–427`；README「Node 18 或以上」
- 描述：`parseArgs` 18.3 先有，18.0–18.2 會出 ESM SyntaxError，用戶睇唔明；Node 18 已經 2025-04 EOL。`en-CA` 「剛好係 YYYY-MM-DD」靠 CLDR locale 資料，small-icu build 會退返 `en` 出 `10/29/2026`，`addedAt` 就唔合格
- 方案 A：README 改「Node 20 或以上」；script 頂用 dynamic import 前先 check `process.versions.node`，太舊就印廣東話提示 exit 2；`todayInHongKong` 改用 `formatToParts` 砌 `YYYY-MM-DD`。代價：~15 行
- 方案 B：淨係改 README 做「Node 18.3 或以上（建議 20+）」+ `formatToParts`。代價：~6 行
- 推薦：**B**（夠用；版本 check 要搬 import 位，複雜咗）

#### S-555 — `--existing` merge 時 `titles` / `files` / `firstNo` 有變冇提示

- 位置：`scripts/dramaFromFolder.mjs:447–452`（`mergeArc`）
- 描述：只有集數變先報 `[資料]`。舊 arc 有 `titles`（例如人手補嘅集名）而 folder 檔名冇集名，merge 後 `titles` 冇咗（reviewer 實測 `續集Ⅱ` 嘅 `titles: { "1": "人手補嘅集名" }` 消失，報告冇提）。以 folder 為準係啱嘅（template 有 `{title}`，人手 titles 反而會砌錯 URL），但應該講一聲
- 方案 A：比較新舊 `episodes` / `titles` / `files` / `firstNo`，唔同就 `[資料] 集名 / 檔名有變（舊 N 個 → 新 M 個）`。代價：~10 行 + 1 test
- 方案 B：只喺舊有、新冇嘅時候報 `[注意]`。代價：~5 行
- 推薦：**A**

#### S-556 — 短篇由第 2 集（或者更後）開始唔會報

- 位置：`scripts/dramaFromFolder.mjs:274–285`（`numberingIssues`）、`:316`
- 描述：跳號只檢 min–max 之間；如果漏咗上載第 1 集，會靜靜雞出 `firstNo: 2`，報告只係「第 2–10 集」。`firstNo` 除咗 0 / 1 之外喺現有資料從來冇出現
- 方案 A：`firstNo` 唔係 0 或 1 就 `[注意] 由第 N 集開始，確認係咪漏咗頭幾集`。代價：3 行 + 1 test
- 方案 B：當 `[錯誤]`。代價：同 A，但將來真有由第 N 集開始嘅劇就行唔到
- 推薦：**A**

#### S-557 — `--verify` 冇 retry、冇 GET 後備

- 位置：`scripts/dramaFromFolder.mjs:629–659`
- 描述：r2.dev 有 rate limit，一次 429 / 5xx / timeout 就當唔得、exit 3；某啲 CDN 對 HEAD 回 403 / 405（README 都講過 r2.dev 對 Python urllib 回 403）。開發者實測 470 / 470 冇事，所以唔急
- 方案 A：429 / 5xx / timeout 等 1 秒 retry 一次；HEAD 回 403 / 405 用 `GET` + `Range: bytes=0-0` 再試。代價：~15 行 + 2 test
- 方案 B：淨係 retry 一次。代價：~6 行
- 推薦：**B**

#### S-558 — `tsconfig.node.json` 全域加 `vite/client`，`scripts/` 純 Node 檔都會當有 `import.meta.env`

- 位置：`tsconfig.node.json:16`
- 描述：只係 `dramaFromFolder.test.ts` 經 `episodes.ts` 用到 `import.meta.env`，但 `types` 係成個 project 生效：將來有人喺 `scripts/*.mjs` / `.ts`（用純 `node` 行）寫 `import.meta.env.X`，type check 會過，runtime 係 `undefined`。亦帶埋 `*.css` / `*.svg` 等 ambient module 宣告入 `vite.config.ts`
- 方案 A：還原 `types`，喺 `scripts/dramaFromFolder.test.ts` 頂加 `/// <reference types="vite/client" />`，只影響需要嘅檔。代價：2 行
- 方案 B：照留，喺 tsconfig 加註解講明原因同風險。代價：1 行（JSON 註解 tsconfig 准）
- 推薦：**A**

#### S-559 — CLI 輸出冇自動過 JSON Schema

- 位置：`scripts/dramaFromFolder.test.ts`（「should produce JSON the app accepts」）
- 描述：而家輸出只餵 runtime `parseDramaDefinition`。schema 嚴過 runtime（多出 key、`titles` key 前置 0 等），將來 CLI 加欄位而 schema 冇跟，用戶喺 VS Code 打開草稿就見紅線。reviewer 手動驗咗 3 份輸出，暫時全部過
- 方案 A：將 `jsonSchemas.node.test.ts` 嘅 `compile` 抽去 `src/catalog/testSchemas.ts`，CLI test 加一句 `expect(dramaSchema(json)).toBe(true)`。代價：~10 行（CLI test 喺 `tsconfig.node.json` 範圍，用得 ajv）
- 方案 B：CLI test 自己 new 一個 Ajv。代價：~8 行，但 ajv 設定重複兩份
- 推薦：**A**

---

## ✅ 做得好嘅地方

- **schema drift test 設計一流**：唔係淨係「現有檔過唔過」，而係同一批例子兩邊比、逐個 key 刪走比 required、刻意分歧都用 test 鎖（分歧消失都會 fail），token set 直接 import runtime 常數。兩份 schema 抄一份 theme（避開跨檔 `$ref` 喺 editor 嘅坑）再用 test 鎖成一樣，取捨講得清楚。
- **CLI 同 app 規則一致**：檔名工具逐行抄 `filename.ts`，test 直接用 app 嘅 `parseDramaDefinition` + `buildEpisodes` 驗每條 URL 都對得返真檔；reviewer 額外做 byte 級 round-trip，6 / 6 一樣。
- **唔靠 template 硬砌**：砌唔返嘅檔自動落 `files`，`Ⅱ` / `II`、`第2集`、`.MP3` 呢類「睇落一樣」嘅坑全部唔會砌錯 URL，仲有清楚 `[注意]`。
- **有錯就唔寫檔**，exit code 分得清（0 / 1 / 2 / 3），README 有寫。
- **`--existing` 保守**：folder 冇嘅短篇唔刪、照原次序、新短篇加尾兼用香港日期，test 用 UTC 仲係前一日嘅時間驗。
- **`run()` 可注入 io**：test 唔使開 process，`--verify` 用本機 HTTP server 驗 concurrency、timeout、404。
- **報告廣東話清楚**，列埋略過咗乜嘢、上架前要補乜，方便用戶成段 copy 返嚟。

## 修正優先順序

| 優先 | ID    | 工作量 | 說明                                              |
| ---- | ----- | ------ | ------------------------------------------------- |
| 1    | W-487 | 細     | 輸出檔已存在要 `--force` 先覆蓋                   |
| 2    | W-488 | 細     | 全形陷阱只包英數，唔好叫用戶將「？」改「?」       |
| 3    | W-486 | 中     | 驗 `--existing` 形狀 + `run` try/catch + exit 4   |
| 4    | W-489 | 中     | `--report <檔>`（UTF-8）+ README Windows 小節     |
| 5    | S-555 | 細     | merge 時 titles / files / firstNo 有變報 `[資料]` |
| 6    | S-556 | 細     | `firstNo` 唔係 0 / 1 報 `[注意]`                  |
| 7    | S-554 | 細     | README「Node 18.3+（建議 20+）」+ `formatToParts` |
| 8    | S-558 | 細     | `vite/client` 改用 triple-slash reference         |
| 9    | S-559 | 細     | CLI test 加 JSON Schema 驗                        |
| 10   | S-557 | 細     | `--verify` retry 一次                             |

## 修訂後代碼（W-486 / W-487 / W-488 示意，未套用）

```js
/* W-488：只有全形英數先係「睇落一樣」嘅陷阱；中文全形標點（？！：（））係正常寫法 */
const FULL_WIDTH_ALPHANUMERIC = /[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]/u;
// CHARACTER_TRAPS 第二條改用 FULL_WIDTH_ALPHANUMERIC

/** 0 成功；1 有錯誤冇寫檔；2 參數錯；3 已寫檔但 --verify 有唔得；4 script 本身出錯 */
export const EXIT = Object.freeze({ ok: 0, blocked: 1, usage: 2, verifyFailed: 3, internal: 4 });

/* W-486：--existing 喺用之前先驗形狀，唔啱就 [錯誤]，唔好 throw */
const existingIssues = (existing, kind, where) => {
    if (existing === null || typeof existing !== 'object' || Array.isArray(existing))
        return [issue('error', where, '--existing 唔係 drama.json（要係一個 { … } object）')];
    if (existing.kind !== kind)
        return [issue('error', where, `--existing 係 ${existing.kind}，但 folder 睇落係 ${kind}`)];
    const listKey = kind === 'series' ? 'arcs' : 'episodes';
    if (!Array.isArray(existing[listKey]))
        return [issue('error', where, `--existing 嘅 ${listKey} 唔係 list`)];
    try {
        renderFileName(
            existing.audio?.file ?? '',
            kind === 'series' ? seriesTokens('', '', 1, '') : dailyTokens('', '2000-01-01'),
        );
    } catch (error) {
        return [issue('error', where, `--existing 嘅 audio.file 有問題：${error.message}`)];
    }
    return [];
};

export const generateDraft = (root, { id, existing, now }) => {
    const scan = scanDramaFolder(root);
    const kind = kindOf(scan);
    const today = todayInHongKong(now);
    const base = { scan, kind, today, issues: dramaIssues(scan, id, kind) };
    if (kind === 'none') return { ...base, json: null, summaries: [] };
    // 新加：existing 唔啱就喺用之前停（之後 checkExisting 只剩 folder 名嘅 [注意]）
    const shape = existing === undefined ? [] : existingIssues(existing, kind, scan.name);
    if (shape.length > 0)
        return { ...base, issues: [...base.issues, ...shape], json: null, summaries: [] };
    // ……其餘不變……
};

/* W-487：唔好冇聲覆蓋 */
const OPTIONS = {
    // ……
    force: { type: 'boolean', default: false },
};

export const run = async (argv, ioOverrides = {}) => {
    // ……讀參數不變……
    let result;
    try {
        result = generateDraft(args.folder, { id: args.id, existing, now: io.now() });
    } catch (error) {
        io.out(`script 出錯：${error.message}\n請將成段輸出傳返嚟。`);
        return EXIT.internal;
    }
    io.out(formatReport(result, { existing }));
    if (result.json === null) {
        io.out('\n有 [錯誤]，冇寫 drama.json；改好 folder 再行一次。');
        return EXIT.blocked;
    }
    const out = resolve(args.out ?? `${args.id ?? result.scan.name}.drama.json`);
    if (existsSync(out) && !args.force) {
        io.out(`\n${out} 已經存在，冇覆蓋；要覆蓋請加 --force，或者用 --out 揀第二個名。`);
        return EXIT.usage;
    }
    writeFileSync(out, `${JSON.stringify(result.json, null, JSON_INDENT)}\n`);
    io.out(`\n已寫入：${out}`);
    return args.verify ? verifyAll(result, args, io) : EXIT.ok;
};
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: fail
score: 74/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: pass
next_action: invoke_developer
next_agent: developer
branch: "claude/keen-pascal-5iifg0"
context: "Catalog tools review (base 3456f31; head now 56f078f, arcCover lane out of scope). Batch 1 JSON Schema (f26d501, ec8233a) PASS 100: drift test pairs 59 invalid/20 valid cases schema vs runtime, per-key deletion, tokens imported from runtime, divergences locked both ways; all committed drama.json/show.json validate; ajv/ajv-formats dev-only, MIT, only imported by test; npm audit 6 (5 low,1 moderate fast-uri 3.1.8) all pre-existing (fast-uri already via workbox-build ajv 8.20), --omit=dev 0. Batch 2 dramaFromFolder (fcb7ebf, 6ba2b2d, 57e9eb6) FAIL 74 (score only; gates pass, 0 Critical): node:-only imports confirmed; reviewer mirrored all 6 committed dramas into folder trees and regenerated with --existing -> 6/6 byte-identical (key order) and prettier-identical; fixtures (第零集, ' - ' in arc and title, Ⅱ vs II -> files, 第2集, .MP3, partial titles, golden {folder}{arc} auto-pick) all correct and schema-valid. Fix: W-486 malformed --existing crashes with stack trace (daily drama.json on series folder -> 'unknown token {yyyymmdd}', bad template, arcs not array; null existing silently treated as new; crash exit 1 collides with blocked) -> validate shape first + try/catch + exit 4. W-487 output silently overwritten (default <id>.drama.json in cwd, or --out == --existing) -> require --force. W-488 full-width trap /[\\uff01-\\uff5e]/ flags Chinese punctuation ？ in real lancy titles and advises half-width '?' (illegal on Windows, would break URLs/progress) -> limit to full-width alphanumerics. W-489 Windows: PowerShell curl alias, '| tee' garbles UTF-8 report under cp950, trailing backslash in quotes -> add --report <file> (UTF-8) + README Windows notes (inferred, not tested on Windows). S-554 README Node 18 -> 18.3+ (parseArgs), use formatToParts not en-CA. S-555 report titles/files/firstNo changes on merge. S-556 warn when firstNo not 0/1. S-557 --verify retry once. S-558 move vite/client to triple-slash in test instead of tsconfig.node types. S-559 validate CLI output against drama.schema.json in test. tsc -b 0, eslint 0, prettier clean, vitest src/catalog src/dramas scripts 366 pass, CLI coverage 95.5% stmts. No version bump (tooling-only, precedent). Not pushed."
```
