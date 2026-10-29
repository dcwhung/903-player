# QA 測試報告 — 2026-10-29 — Catalog 工具（JSON Schema、`dramaFromFolder.mjs`、`scripts/arcCover/`）

- 測試員：Quality Assurance（獨立角色）
- 範圍：`claude/keen-pascal-5iifg0` @ `f97d905`（review re-review pass：dramaFromFolder 98、arcCover 99，`2026-10-29_review_catalog-tools-rereview.md`）
    1. `schemas/drama.schema.json`、`schemas/show.schema.json` + drift test `src/catalog/jsonSchemas.node.test.ts`
    2. `scripts/dramaFromFolder.mjs`（用戶喺 macOS、Node ≥ 18.3，curl 落單一檔案喺 repo 外面行）
    3. `scripts/arcCover/`（Python 工具）
    4. 相關 vitest、`tsc -b`、lint、app build
- 冇改 app code：冇 `package.json` bump，PWA / e2e 唔喺範圍（只確認 `npm run build` 照過）
- 環境：
    - Linux sandbox、Node 22.22.0（另用 `/opt/node20` Node 20.20.0 跑一次 round-trip）
    - arcCover venv：`scratchpad/venv-arcCover`（Python 3.13.17、Pillow 13.0.0、libwebp 1.6.0、OpenCV 4.14.0、numpy 2.5.4、coverage 7.17.0）
    - dramaFromFolder：`dramaFromFolder.mjs` **單獨**抄去 `scratchpad/qa-dff/run/`（冇 `node_modules`、冇 `package.json`），全部用 plain `node` 行；folder 樹由 QA script 砌（`scratchpad/qa-dff/trees/`、`scratchpad/qa-dff/rt/`）
    - arcCover 新輸出：`scratchpad/qa-arcCover-out/`（冇掂 `scratchpad/arcCover/`，前後 md5 一樣）
    - 冇改 repo 任何 source；`git status` 全程乾淨（pytest / ruff / coverage cache 寫去 scratchpad 或者已 gitignore）
- 總結：✅ **pass**
    - 全部 hard gate 過；🔴 = 0
    - 6 / 6 套已上架劇經 CLI round-trip：`--existing` 5 套 byte 一樣，chisee 只係陣列換行唔同（過 prettier 後 byte 一樣）；由零生成 6 / 6 網址一樣
    - `--verify` 有網絡：lancy 104 條、jim 41 條網址全部 OK，exit 0；未上載嘅合成劇 exit 3
    - arcCover 新 round 尺寸、webp、manifest schema、sha256、決定性、壞輸入 exit 2、`--force` 原子性全部啱
    - 1 張新 ticket **CUI-0008**（🟢 Low）：`--out` 指去唔存在嘅 folder / 一個 folder → exit 4「程式出錯」連 stack trace（應該 exit 2）。唔阻 merge

---

## Hard Gates

| Gate           | 結果    | 證據                                                                                                                                                                                                                    |
| -------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests          | ✅ pass | `npx vitest run scripts src/catalog`：11 files / **265 tests** 全綠（當中 `dramaFromFolder.test.ts` + `jsonSchemas.node.test.ts` 234）；`venv-arcCover/bin/python -m pytest scripts/arcCover/tests`：**43 passed**      |
| Type check     | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                                                                     |
| Lint           | ✅ pass | `npm run lint` exit 0（「All matched files use Prettier code style!」）；`ruff check scripts/arcCover`「All checks passed!」；`ruff format --check`「14 files already formatted」                                       |
| Build          | ✅ pass | `npm run build` exit 0（PWA generateSW、precache 80 entries）；app code 冇改                                                                                                                                            |
| Coverage       | ✅ pass | `dramaFromFolder.mjs`：statements 96.14%、branches 84.96%、functions 93.25%、lines 97.17%；arcCover（coverage.py）：analysis 96%、compose 100%、constants 100%、generate 97%、geometry 100%、preview 100%，**總數 98%** |
| Security       | ✅ pass | 冇新 dependency。arcCover slug 擋 path traversal（`--drama ../evil`、`--arc ../../x` → exit 2）；dramaFromFolder 唔會冇聲覆蓋（exit 2，`--out == --existing` 亦擋）                                                     |
| Data integrity | ✅ pass | 6 套劇 round-trip 網址 100% 一樣（用戶已儲進度嘅 key 唔變）；`--existing` 保留人手欄位（下面 §2.3）；全部輸出過 JSON Schema + app runtime validator                                                                     |
| Performance    | ✅ pass | `--verify` 104 條網址約 3 秒（6 條同時）；arcCover 一個 round 約 10–20 秒                                                                                                                                               |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                                                                                                  |
| PWA Update     | n/a     | 冇改 app code / 版本號                                                                                                                                                                                                  |

## 測試覆蓋概覽

| 類型                                    | 數量                                                                           | 結果                                 |
| --------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| Unit / integration（repo）              | vitest 265、pytest 43                                                          | 全綠                                 |
| JSON Schema + runtime：已 commit 資料   | 6 個 `drama.json`、7 個 `show.json`                                            | 全部 valid                           |
| CLI round-trip（已上架劇，單檔 script） | 6 套 × `--existing` + 6 套 × 由零生成                                          | 6/6（chisee 只係格式）+ 6/6 網址一樣 |
| CLI 合成 folder（macOS 情境）           | series、daily、gap/dup 3 棵樹，NFD、`？`、`Ｘ`、`Ⅱ`/`II`、空格、隱藏檔、空短篇 | 全部符合 README                      |
| CLI exit code / option                  | 22 個情境                                                                      | 21 符合；1 個 → CUI-0008             |
| `--verify`（真 R2）                     | lancy、jim、合成劇                                                             | 0 / 0 / 3，符合                      |
| arcCover 新 round                       | heart（arc）、half（arc）、drama（劇本身）+ 決定性 + `--force` / kill          | 尺寸 / webp / manifest / sha 全啱    |
| arcCover 壞輸入                         | 16 個情境                                                                      | 全部 exit 2，冇 traceback            |

---

## 1. JSON Schema（`schemas/*.schema.json`）

| 檢查                                                                     | 結果                                                                   |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| drift test `src/catalog/jsonSchemas.node.test.ts`                        | ✅ 包喺 vitest 265 入面，綠                                            |
| 6 個 `src/dramas/*/drama.json` 過 `drama.schema.json`（repo 同一套 ajv） | ✅ c18、chisee、golden、jim、lancy、sammy-kitty 全部 `errors: []`      |
| 同 6 個過 app `parseDramaDefinition` + `buildEpisodes`                   | ✅ 9 / 97 / 126 / 38 / 100 / 109 集                                    |
| 7 個 `src/shows/*/show.json` 過 `show.schema.json`                       | ✅ badgirl、gongzi、lalala、sunnyday、wanni、waves、westair 全部 valid |

## 2. `scripts/dramaFromFolder.mjs`

### 2.1 已上架劇 round-trip（單檔 script，plain `node`）

QA helper（`tsx`，用 app 嘅 `buildEpisodes`）由每套 commit 咗嘅 `drama.json` 砌返成棵 folder 樹（每集一個空檔 + 劇集 / 短篇封面），再喺 `qa-dff/run/` 行 CLI。

| 劇          | `--existing … --out` exit | 同 commit 檔比較                                                 | 由零生成 exit | 由零生成網址 vs commit | 由零生成過 schema + runtime |
| ----------- | ------------------------- | ---------------------------------------------------------------- | ------------- | ---------------------- | --------------------------- |
| c18（每日） | 0                         | byte 一樣                                                        | 0             | 9 條一樣               | ✅                          |
| chisee      | 0                         | 語意一樣；4 個 `episodes` 陣列換行唔同，過 prettier 後 byte 一樣 | 0             | 97 條一樣              | ✅                          |
| golden      | 0                         | byte 一樣                                                        | 0             | 126 條一樣             | ✅                          |
| jim         | 0                         | byte 一樣                                                        | 0             | 38 條一樣              | ✅                          |
| lancy       | 0                         | byte 一樣（Node 20.20.0 再跑一次都一樣）                         | 0             | 100 條一樣             | ✅                          |
| sammy-kitty | 0                         | byte 一樣                                                        | 0             | 109 條一樣             | ✅                          |

- 6 份由零生成嘅草稿全部 `"enabled": false`
- chisee 報兩條 `[注意]`（`Ｘ時mas時小提議` 全形 `Ｘ`），係真資料，啱
- **c18（每日劇）嘅 round-trip 唔喺 repo test 入面**（`SERIES_IDS` 只有 5 套短篇劇）；QA 今次手動補驗。建議加入 test（見「測試建議」）

### 2.2 合成 folder（macOS 情境）

`qa-dff/trees/series/QA 測試 劇場/`（路徑有空格）：

| 短篇 folder                 | 內容                                                           | 報告 / 輸出                                                                                                   |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `がんばれ 物語`（NFD）      | folder 名同檔名用 NFD（macOS 會咁寫）                          | `[注意]` NFD → drama.json 用 NFC，叫上載後 `--verify`；`name` 係 NFC                                          |
| `小姐你係邊位？`            | 全形 `？`                                                      | **冇報**（W-488 修好）                                                                                        |
| `Ｘ檔案`                    | 全形 `Ｘ`                                                      | `[注意]` 全形英數，「確認 R2 上面都係全形」，冇叫改半形                                                       |
| `森之愛情II`                | 檔名用 `森之愛情Ⅱ`                                             | `[注意]` 羅馬數字 + 短篇名同 folder 唔一樣；輸出用 `files` 逐集寫明真檔名，`buildEpisodes` 砌出嘅網址指返真檔 |
| `有 空格 嘅 短篇`           | 名入面有空格                                                   | 正常                                                                                                          |
| 全部                        | `.DS_Store`、`._01 - x.m4a`（AppleDouble）、根目錄 `.DS_Store` | 「已略過嘅檔案」列晒，唔當錄音                                                                                |
| `空短篇`、`淨係有 DS_Store` | 空 / 淨係隱藏檔                                                | `[錯誤] 冇錄音檔` → exit 1，冇寫 drama.json，`--report` 照寫                                                  |

- 刪咗兩個空短篇再行：exit 0，`enabled: false`、`addedAt` = 今日（香港），短篇次序 UTF-8 字典序；輸出過 JSON Schema + runtime（11 集）
- `--report "…/series report.txt"`（檔名有空格）：`file` 報 `UTF-8 text`，頭 3 byte `E5 8A 87`（冇 `EF BB BF` BOM）
- 每日劇 `每日 劇/`（`20260101`、`20260102`、`20260105` + `.DS_Store` + `Thumbs.db`）：exit 0，兩個系統檔略過
- Linux ext4 上面 NFC 網址對唔到本機 NFD 檔名（預期；macOS APFS 唔理 normalisation，R2 key 視乎上載工具，所以 script 叫用戶 `--verify`）

### 2.3 `--existing`（人手欄位、冇咗嘅短篇）

將生成嘅草稿人手改：`name`、`enabled: true`、`order`、`theme.accent`、一個短篇加 `disc` / `tile` / `addedAt` 同人手集名（第 2 集）、加一個 folder 冇嘅短篇「已下架短篇」；folder 加「新短篇」同 `Ｘ檔案` 第 3 集。

| 檢查                             | 結果                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| 頂層人手欄位                     | ✅ 全部照留（逐 key 比較冇差）                                                     |
| 短篇 `disc` / `tile` / `addedAt` | ✅ 照留                                                                            |
| 人手集名                         | ✅ 照留，`[注意]`「係人手加嘅；已保留（用 files 寫明真檔名，網址唔變）」           |
| folder 冇嘅短篇                  | ✅ 照留 + `[注意]`「本機 folder 冇呢個短篇；已保留原設定，如果真係落咗架請手動刪」 |
| 新短篇                           | ✅ `[資料]`，`addedAt` = 2026-10-29                                                |
| 集數變                           | ✅ `[資料] Ｘ檔案：集數由 2 變 3`                                                  |
| 輸出                             | ✅ exit 0，過 JSON Schema + runtime（15 集）                                       |

### 2.4 Exit code / option

| 情境                                                            | exit  | 結果                                                                    |
| --------------------------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| 同一句 `--id` 再行（輸出已存在）                                | 2     | ✅ 原檔 md5 冇變                                                        |
| 加 `--force`                                                    | 0     | ✅                                                                      |
| `--out` 同 `--existing` 同一個檔（`./merged.json` vs 絕對路徑） | 2     | ✅                                                                      |
| `--out` 去已存在、有空格嘅 folder                               | 0     | ✅                                                                      |
| **`--out` 上層 folder 唔存在**                                  | **4** | ❌ CUI-0008：應該 2；成份報告印完先「程式出錯」+ stack trace；冇寫檔    |
| **`--out` 係一個 folder（`--force`）**                          | **4** | ❌ CUI-0008：`EISDIR`，同上                                             |
| 劇集 folder 唔存在 / 係一個檔                                   | 2     | ✅「搵唔到 folder」+ 用法                                               |
| `--id Bad_ID`                                                   | 0     | ✅ 只係 `[注意]`（id 唔入 drama.json，只影響預設輸出檔名），符合 README |
| 未知 option / 冇參數 / 兩個 folder                              | 2     | ✅                                                                      |
| 路徑尾有 `/`                                                    | 0     | ✅ 自動食走                                                             |
| 路徑有 `"`（Windows `"…\"` 情況）                               | 2     | ✅ 教點改                                                               |
| 每日劇                                                          | 0     | ✅                                                                      |
| 跳號（1、2、4）+ 重複（第 1 集兩個檔）                          | 1     | ✅ 冇寫 drama.json，`--report` 照寫                                     |
| `--existing` 形狀壞（`arcs: "x"`）/ daily 用落 series folder    | 1     | ✅ `[錯誤]`，冇 stack                                                   |
| `--existing` 唔係 JSON / 唔存在 / 係 folder                     | 2     | ✅ 讀唔到 + 用法                                                        |
| `--report` 去唔存在嘅 folder                                    | 2     | 已知 S-568：drama.json 已寫咗先 exit 2（唔係新問題）                    |
| `--verify` 有網址唔得                                           | 3     | ✅ 有寫檔                                                               |
| 程式出錯（`run` catch-all）                                     | 4     | ✅ 路徑有行到（就係 CUI-0008 嗰兩個情境）                               |

### 2.5 `--verify`（真 R2，網絡通）

- 第一次 lancy / jim 報 404：QA 砌 folder 時短篇封面一律用 `cover photo.jpg`，但 R2 上面 lancy 兩個短篇係 `.png`、jim 八王子係 `cover-photo.jpg`（`curl -I` 逐個確認）。屬 QA fixture 問題，唔係 script 問題；script 正確搵出唔得嘅網址，exit 3
- 改返同 R2 一樣再行：**lancy HEAD 104 條全部 OK、jim 41 條全部 OK，exit 0**，輸出同 commit 檔 byte 一樣
- 合成劇（未上載）：19 條唔得，exit 3，drama.json 已寫

### 2.6 Node 版本

- Node 22.22.0、Node 20.20.0 實際行過
- **Node 18.3 未執行**（下載 Node 18 binary 被 sandbox 權限拒絕）。靜態掃：用到嘅 API（`parseArgs` 只用 `allowPositionals` / `options`，冇 18.11 先有嘅 `default`；`replaceAll`、`.at()`、`AbortSignal.timeout`、global `fetch`）Node 18.3 全部有

## 3. `scripts/arcCover/`

### 3.1 新 round（`scratchpad/qa-arcCover-out/`）

| 輸入（`arcCover-src/lancy/`） | 指令                        | 輸出                    | 結果                                                                              |
| ----------------------------- | --------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| `heart.jpg` 1200×675          | `--drama lancy --arc heart` | `lancy/heart/round-1/`  | 11 variants：disc 6 × **600×600**、tile 5 × **1216×684**，全部 `WEBP`             |
| `drama.png` 1200×675          | `--drama lancy`（劇本身）   | `lancy/_drama/round-1/` | 11 variants：disc 6 × 600×600、tile 5 × **1216×608**，全部 `WEBP`；`level: drama` |
| `half.png`                    | `--drama lancy --arc half`  | `lancy/half/round-1/`   | 同上，全啱                                                                        |

- 每個 manifest 用 `jsonschema` + `FormatChecker` 過 `scripts/arcCover/manifest.schema.json`（schema 2）；每個 variant 嘅 `width` / `height` 同真檔一樣、`sha256` 同真檔一樣、`preview` 存在；`source.sha256` 同輸入檔一樣；`env` 有晒五個版本
- heart 原圖本身 16:9，所以 tile 5 個方法 bytes 一樣，`duplicateOf` 正確指去 `tile-center-crop`；heart `disc-face-crop` `upscale: 1.25`（上限）
- 決定性：同一輸入再出 round-2，11 個 variant sha256 同 round-1 完全一樣
- `contact.png`、`analysis.png`、`previews/*.png` 有齊

### 3.2 壞輸入（全部 exit 2、`error: …` 一行、冇 traceback）

搵唔到檔、唔係圖（文字檔改 `.png`）、0 byte 檔、`--title-box` 超出原圖 / 唔夠 4 個數 / w = 0 / 負數、`--round 0` / `-1`、`--title-scale 0` / `1.5` / `nan`、冇 `--drama`、`--drama ../evil`、`--arc ../../x`、round 已存在冇 `--force`。

- 小觀察：`--title-box -5,0,10,10` 俾 argparse 當咗做 option（「expected one argument」），要寫 `--title-box=-5,0,10,10` 先去到自訂嘅錯誤訊息；兩個都係 exit 2，唔影響

### 3.3 `--force` 原子性

| 情境                                                           | 結果                                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| round-1 加 `stale-marker.txt`，`--force --title-scale 2`（壞） | ✅ exit 2，round-1 全部檔 md5 冇變                                                                            |
| `--force` 用另一張圖，行到一半 `kill -9`                       | ✅ round-1 md5 冇變；留低 `round-1.partial/`（SIGKILL 清唔到，預期）                                          |
| 再 `--force` 一次                                              | ✅ exit 0；`round-1.partial/` 冇咗；`stale-marker.txt` 冇咗（成個 round 換晒）；manifest `source.file` = 新圖 |
| 手放一個 `round-3.partial/junk.txt`，唔加 `--round` 再行       | ✅ 自動揀 round-3，殘留 partial 被清走，`junk.txt` 冇入 round-3                                               |
| `arcCover-src/lancy/` 原圖                                     | ✅ md5 冇變                                                                                                   |
| `scratchpad/arcCover/`（之前嘅輸出）                           | ✅ 全部檔 md5 冇變                                                                                            |

## 4. 主動補測（QA 自己寫，喺 scratchpad，冇入 repo）

repo test 冇覆蓋、QA 今次補嘅 edge case：

1. c18 每日劇 CLI round-trip（`--existing` byte 一樣 + 由零生成網址一樣）
2. NFD folder 名 / 檔名、AppleDouble `._*` 檔、淨係得 `.DS_Store` 嘅短篇 folder
3. `--out` 上層 folder 唔存在 / `--out` 係 folder（→ CUI-0008）
4. `--existing` 係 folder、唔係 JSON
5. arcCover：`kill -9` 中途 `--force` 唔損舊 round、殘留 `.partial` 下次自動清
6. arcCover：16:9 原圖 tile 去重、同一輸入跨 round sha256 一樣

---

## 失敗 / 問題詳情

### CUI-0008 — `--out` 路徑錯報做「程式出錯」（🟢 Low）

- 位置：`scripts/dramaFromFolder.mjs` `generateAndWrite`（`writeFileSync`，約第 1007 行）→ `run` catch-all（`EXIT.internal`）
- 預期：`--out` 上層 folder 唔存在、或者 `--out` 係 folder → 掃 folder 之前就 exit 2，講點改
- 實際：exit 4，印「程式出錯…呢個唔係 folder 嘅問題；請將成段輸出傳返嚟」+ stack trace（`ENOENT` / `EISDIR`）；冇寫檔
- 根源：只驗咗 `--out` 存唔存在（覆蓋保護），冇驗上層 folder / 係唔係 folder；寫檔錯冇分類做用戶錯
- 建議：同 S-568 一齊做 —— `--out` 同 `--report` 嘅 folder 一開始驗，`UsageError` → exit 2；加兩個 CLI test

## 問題修正優先順序

| 優先 | Ticket / ID   | 嚴重度 | 描述                                                            | Blocker |
| ---- | ------------- | ------ | --------------------------------------------------------------- | ------- |
| 1    | CUI-0008      | 🟢     | `--out` folder 唔存在 / 係 folder → exit 4 + stack，應該 exit 2 | 否      |
| 2    | S-568（已知） | 🟢     | `--report` folder 錯，drama.json 已寫先 exit 2                  | 否      |
| 3    | S-567（已知） | 🟢     | `vite/client` triple-slash 係成個 program 生效                  | 否      |
| 4    | S-569（已知） | 🟢     | README face-crop「最多 1.25 倍」冇講原圖太細嘅例外              | 否      |

## 其他觀察（唔開 ticket）

1. **CLI 輸出唔係 prettier 格式**：chisee `--existing` 輸出用 `JSON.stringify` 縮排，短陣列會拆行；抄入 `src/dramas/` 之後要 `npx prettier --write`，否則 `npm run lint` 會紅。前次 review 已知（「過 prettier 後 byte 一樣」）。可以喺 README「要傳返嚟」嗰段加一句提醒維護者
2. 空短篇 folder（或者淨係得 `.DS_Store`）係 `[錯誤]` exit 1，唔係 `[注意]`：合理（app 唔收 0 集短篇），但 README exit 1 嗰行冇列「冇錄音檔」；可以順手補
3. `--title-box` 負數要用 `=` 寫法（argparse 行為），exit code 照啱

## 未執行 / 限制

- **真 macOS 未測**：sandbox 係 Linux ext4；NFD 用合成檔名模擬，APFS 唔理 normalisation 嘅行為（NFC 網址都開到本機 NFD 檔）冇得重現。script 嘅 NFD 提示同 NFC 輸出已驗
- **Node 18.3 未執行**：見 §2.6，只做靜態 API 掃描
- Windows 實機未測（同 review 一樣）
- arcCover 預覽圖冇人眼逐張睇（只驗尺寸 / 格式 / manifest）

## 測試建議

- `scripts/dramaFromFolder.test.ts` 嘅 round-trip 加埋 c18（每日劇），而家 `SERIES_IDS` 淨係 5 套短篇劇
- 修 CUI-0008 時加：`--out` 上層 folder 唔存在 → exit 2、冇 `技術資料`、冇寫檔；`--out` 係 folder → exit 2
- 加一個 CLI test：短篇 folder 淨係得 `.DS_Store` / `._*` → 列入略過 + `[錯誤] 冇錄音檔`
- （可選）CLI 輸出用同 prettier 一樣嘅陣列排法，或者 README 提醒抄入 repo 後跑 prettier

## 附錄：scripts / 輸出

全部喺 `/tmp/claude-0/-home-user-903-player/a76b8fcc-b220-5855-8ff4-b41d3aaf29fe/scratchpad/`：

- `qa-dff-helpers/tool.ts`（`mirror` / `validate` / `urls`，用 repo 嘅 `compileSchema`、`parseDramaDefinition`、`buildEpisodes`）、`qa-dff-helpers/build.py`（合成 folder 樹）
- `qa-dff/run/`（單獨嘅 `dramaFromFolder.mjs` + 輸出）、`qa-dff/trees/`、`qa-dff/rt/<id>/`（round-trip 樹、`out.json`、`fresh.json`、`verify.json`、`report.txt`、`verify.txt`）
- `qa-arc-helpers/check.py`（尺寸 / webp / manifest schema / sha256）、`qa-arcCover-out/`（新 round）

## Handoff receipt

```handoff-receipt
protocol: 2
status: pass
score: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  build: pass
  coverage: "pass (dramaFromFolder.mjs 96.14% stmts / 84.96% branches; arcCover 98%)"
  e2e: "n/a (no app code change)"
  security: pass
  data_integrity: pass
  performance: pass
  no_critical: pass
  pwa_update: "n/a (no app code / version change)"
next_action: merge_main
next_agent: main
branch: "claude/keen-pascal-5iifg0"
tickets: ["CUI-0008"]
context: "QA catalog tools PASS @f97d905. Gates: vitest scripts+src/catalog 11 files/265, pytest arcCover 43, tsc -b 0, npm run lint 0, ruff check/format clean, npm run build 0; coverage CLI 96.14% stmts, arcCover 98%. Schemas: 6 drama.json + 7 show.json valid; drift test green. dramaFromFolder run standalone (single .mjs copied to scratch, plain node 22 + node 20): 6/6 committed dramas round-trip via --existing (5 byte-identical, chisee prettier-identical) and from scratch (URLs identical, enabled:false, schema+runtime valid); c18 daily round-trip is not in repo tests (QA covered manually, recommend adding). Synthetic macOS trees: NFD warned + NFC output, full-width ？ not flagged, Ｘ flagged without half-width advice, Ⅱ vs II -> files, spaces OK, .DS_Store/._*/Thumbs.db skipped, empty arc -> [錯誤] exit 1 with report. --existing keeps hand-edited top-level/arc fields and hand titles, keeps missing arc with warning, new arc addedAt today. Exit codes 0/1/2/3 as README; --force/--out OK; --report UTF-8 no BOM. --verify against real R2: lancy 104 + jim 41 URLs OK exit 0; unuploaded synthetic exit 3. CUI-0008 (Low, non-blocking): --out with missing parent dir or a directory -> exit 4 'program error' + stack instead of exit 2; fix with S-568 (validate --out/--report dirs up front). arcCover fresh rounds (heart arc, half arc, drama level) in new scratch dir: disc 600x600, arc tile 1216x684, drama tile 1216x608, all WEBP, manifests valid vs manifest.schema.json, sha256/size match, deterministic across rounds; 16 bad-input cases exit 2 no traceback; --force atomic (bad args and kill -9 mid-run leave old round intact, rerun clears stale .partial and replaces whole round). Not executed: Node 18.3 runtime (binary download denied; static API scan OK), real macOS APFS, Windows. Known S-567..S-569 unchanged, non-blocking."
```
