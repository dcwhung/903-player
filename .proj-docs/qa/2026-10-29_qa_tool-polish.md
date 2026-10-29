# QA 測試報告 — 2026-10-29 — Tool polish（S-567 / S-570 / S-571 / S-572 / O-1 / O-2 / W-496，`dramaFromFolder.mjs`）

- 測試員：Quality Assurance（獨立角色）
- 範圍：`claude/keen-pascal-5iifg0`，`git diff 5a61176..93362ea`（review pass 92：`reviews/2026-10-29_review_tool-polish.md`）
    - `30883c5` S-567：`vite/client` 型別搬去新 `tsconfig.scripts-test.json`（只包 `scripts/*.test.ts`），`tsconfig.node.json` exclude 返
    - `66a2ab0` S-570：committed round-trip 驗 host + base prefix（`decodedPath` 唔係由 base 開頭就 throw）
    - `745ac10` S-571：`--out` / `--report` 預檢寫入權限（`accessSync W_OK`）；新 exit `5` = drama.json 已寫、只係報告檔寫唔到
    - `09d2df3` S-572 / O-1 / O-2：folder 做目的地、預設輸出撞 folder、上層係檔案嘅提示
    - `93362ea` W-496：`nearestExisting` 去到 root 都唔存在就停（Windows 冇呢個磁碟 / UNC）
- 冇改 app code：冇 `package.json` bump，PWA / e2e 唔喺範圍（只確認 `npm run build` 照過）
- 環境：
    - Linux sandbox、Node 22.22.0
    - `dramaFromFolder.mjs` **單獨**抄去 `scratchpad/qa-polish/tool/`（冇 `node_modules`、冇 `package.json`），全部用 plain `node` 行（模擬 macOS 用戶下載單一檔案）；cwd = `scratchpad/qa-polish/run/`
    - 測試劇集 folder：`work/森美 劇集/`（短篇 `甲` 2 集 + `cover photo.jpg`，有空格 + 中文）
    - 「冇寫檔」= `work/` + `run/` 樹（`find -printf '%p %s %y'`）前後 md5 一樣；`stack` = `技術資料` / `程式出錯` / `   at` 行數；`掃 folder` = 有冇印「劇集 folder：」
    - 權限 case：sandbox 係 root（`accessSync` 對 root 永遠過），所以用 `setpriv --reuid=nobody` 行；scratchpad 上層係 `0700`，nobody 入唔到，呢組 case 改喺 `/tmp/qa-polish-perm.*` 做完即刪
    - 冇改 repo 任何 source；`git status` 全程乾淨（commit 只多咗本報告 + index）
    - 另一個 agent 喺 `.claude/worktrees/` 做 `e2e/`：佢嘅 prettier warning 唔計（見 Lint gate）
- 總結：✅ **pass**
    - 新提示全部準：folder 做 `--out` / `--report`（例子係 `<folder>/<id>.drama.json` / `<folder>/report.txt`，引號包住，照抄可以行，實跑 exit 0）、預設輸出撞 folder（叫加 `--out` 或搬走 folder）、上層係檔案（指出邊個係檔案）、空格 + 中文 + NFD 劇名
    - 唯讀目的地（`/proc/sys/…`、`0555` folder、`0444` 檔 + `--force`）→ exit 2、冇 stack、冇掃 folder、乜都冇寫
    - exit 5 實跑到（`--report /dev/full`），訊息講明 drama.json 已寫；blocked（1）/ verify 失敗（3）唔會被蓋成 5
    - `/nonexistent/a/b/out.json` 等深層唔存在路徑 ≈ 45 ms 結束；W-496 模擬 Windows `Z:\` / UNC root 即刻回 `undefined`
    - Happy path exit 0；6 / 6 劇 round-trip（vitest + standalone CLI 兩邊都綠）
    - 冇新 ticket；🔴 = 0、🟡 = 0。2 個 🟢 觀察（O-3、O-4），唔開 ticket；已知 S-573–S-575 實跑確認仍然係 review 講嗰樣，唔重複開

---

## Hard Gates

| Gate           | 結果    | 證據                                                                                                                                                                                                                                           |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests          | ✅ pass | `npx vitest run scripts src/catalog`：11 files / **282 tests** 全綠（前次 QA 271，+11）                                                                                                                                                        |
| Coverage       | ✅ pass | `dramaFromFolder.mjs`：statements 96.66%、branches 86.68%、functions 93.71%、lines 97.62%（≥ 80%；前次 96.26 / 85.71 / 93.44 / 97.25，全部升）                                                                                                 |
| Type check     | ✅ pass | `npx tsc -b` exit 0（三個 reference：app、node、scripts-test）                                                                                                                                                                                 |
| Lint           | ✅ pass | `npm run lint` exit 1，**只因** 11 個 `.claude/worktrees/agent-…/design/previews/*.html`（另一個 agent 嘅 worktree，指示話忽略）。`npx eslint .` exit 0；`npx prettier --check . '!.claude/**'` 「All matched files use Prettier code style!」 |
| Build          | ✅ pass | `npm run build` exit 0（PWA generateSW，precache 80 entries）                                                                                                                                                                                  |
| Security       | ✅ pass | 冇新依賴；預檢只做 `existsSync` / `statSync` / `accessSync`，唔寫唔刪；所有錯誤路徑 case 零寫入                                                                                                                                                |
| Data integrity | ✅ pass | 6 / 6 committed drama round-trip（vitest 13 / 13 + standalone CLI 6 / 6 deep-equal）；錯誤路徑冇半寫 / 冇殘留檔                                                                                                                                |
| Performance    | ✅ pass | 深層唔存在路徑 43–66 ms 結束（W-496 冇 hang）；CLI 工具，冇 API 基準                                                                                                                                                                           |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                         |
| PWA Update     | n/a     | 冇 app code / version 改動                                                                                                                                                                                                                     |

## 測試覆蓋概覽

| 範疇                                                    | Case | Pass | Fail |
| ------------------------------------------------------- | ---- | ---- | ---- |
| S-572 / O-1 / O-2 提示（standalone）                    | 18   | 18   | 0    |
| S-571 唯讀 / 冇權限（standalone，`/proc/sys` + nobody） | 8    | 8    | 0    |
| 深層唔存在路徑 + W-496                                  | 3+5  | 8    | 0    |
| exit 5 / 報告檔最尾寫唔到                               | 3    | 3    | 0    |
| Happy path（含照抄提示例子）                            | 7    | 7    | 0    |
| Standalone CLI round-trip（6 套劇）                     | 6    | 6    | 0    |
| README exit code 表                                     | 6 行 | 6    | 0    |
| 全套 vitest（scripts + src/catalog）                    | 282  | 282  | 0    |

---

## 1. 新提示（S-572 / O-1 / O-2），standalone plain `node`

全部 exit 2、冇寫檔、stack 0、冇掃 folder、stderr 0 byte；每個都係 `[錯誤]` + 點改 + `用法：…`。`<S>` = `scratchpad/qa-polish`。

### Folder 做 `--out` / `--report`

| #   | Case                                         | 提示（節錄）                                                                     |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| P1  | `--out "<S>/work/a dir"`                     | `要畀檔案路徑，例如 --out "<S>/work/a dir/森美 劇集.drama.json"`                 |
| P2  | 同 P1 + `--force`                            | 同上（`--force` 唔放行 folder）                                                  |
| P3  | `--out "…/有空格 的 輸出" --id x`            | 例子用 `x.drama.json`（跟 `--id`）                                               |
| P4  | `--out` = 劇集 folder 入面嘅短篇 folder `甲` | 例子 `…/甲/森美 劇集.drama.json`                                                 |
| P5  | `--out` 同 `--report` 都係 folder            | 只報 `--out`（第一個），同前次 C17 一致                                          |
| P6  | `--report "<S>/work/a dir"`                  | `要畀檔案路徑，例如 --report "<S>/work/a dir/report.txt"`（唔再叫寫 drama.json） |
| P7  | `--report "…/有空格 的 輸出"`                | `…/有空格 的 輸出/report.txt`                                                    |
| P8  | `--report "…/有空格 的 輸出/"`（尾有 `/`）   | 同 P7（resolve 咗）                                                              |

### 預設輸出撞 folder（O-1）

| #   | Case                                                                              | 提示（節錄）                                                                                                                           |
| --- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | cwd 有 folder `qa.drama.json`，`--id qa`                                          | `預設輸出檔（冇畀 --out） 係一個 folder` + `請加 --out …，例如 --out "<另一個 folder>/qa.drama.json"；或者將嗰個 folder 改名 / 搬走。` |
| D2  | 同 D1 + `--force`                                                                 | 同上                                                                                                                                   |
| D3  | 冇 `--id`，cwd 有 folder `森美 劇集.drama.json`                                   | 例子用中文 + 空格劇名                                                                                                                  |
| U1  | 劇集 folder 名係 **NFD**（`森美 劇集 é`，macOS 檔名常見），cwd 有 NFC 同名 folder | 照樣認到撞名，例子用 NFC 名（同 `outputPath` 一致）                                                                                    |

### 上層係檔案 / 唔存在（O-2）

| #   | Case                                                            | 提示（節錄）                                                |
| --- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| F1  | `--out "…/cover photo.jpg/x.json"`                              | `路徑入面嘅「…/cover photo.jpg」係一個檔案，唔係 folder：…` |
| F2  | `--out "…/cover photo.jpg/深 層/再深/x.json"`（檔案下面再兩層） | 同上，一路行上去搵到真正嗰個檔案                            |
| F3  | `--report "…/cover photo.jpg/報告.txt"`                         | 同上，label `--report`；drama.json 冇寫                     |
| F4  | `--out "…/唔存在 folder/劇 x.json"`                             | `嘅 folder 唔存在：…/唔存在 folder`（唔會誤報做檔案）       |
| F5  | `--out "…/唔存在/a/b/c/x.json"`                                 | `folder 唔存在：…/唔存在/a/b/c`                             |
| F6  | 相對路徑 `--out cover/x.json`                                   | 以 cwd resolve 顯示                                         |
| F7  | 相對路徑 `--out plainfile/x.json`（`plainfile` 係檔案）         | 「`<S>/run/plainfile` 係一個檔案」                          |

## 2. 唯讀 / 冇權限（S-571）

| #    | Case                                                               | 行嘅身份 | exit | 寫檔 | 訊息（節錄）                                                        |
| ---- | ------------------------------------------------------------------ | -------- | ---- | ---- | ------------------------------------------------------------------- |
| R1   | `--out /proc/sys/qa.drama.json`                                    | root     | 2    | 冇   | `[錯誤] 輸出檔（--out） 冇權限寫入：/proc/sys` + 請揀另一個 folder… |
| R2   | `--report /proc/sys/報告.txt`（`--out` 啱）                        | root     | 2    | 冇   | `--report 冇權限寫入：/proc/sys`；drama.json 冇寫                   |
| R3   | 同 R1 + `--force`                                                  | root     | 2    | 冇   | 同 R1                                                               |
| R4   | `--out /proc/sys/kernel`（係 folder）                              | root     | 2    | 冇   | 係一個 folder（folder 檢查先過權限）                                |
| R5   | `--out "<P>/唯讀 folder/x.drama.json"`（`0555`）                   | nobody   | 2    | 冇   | 冇權限寫入：`<P>/唯讀 folder`                                       |
| R6   | `--report "<P>/唯讀 folder/r.txt"`                                 | nobody   | 2    | 冇   | `--report 冇權限寫入`；drama.json 冇寫                              |
| R7   | `--out <P>/ok/locked.drama.json --force`（檔 `0444`，folder 可寫） | nobody   | 2    | 冇   | 冇權限寫入：`…/locked.drama.json`（睇個檔本身）；內容仍係 `old`     |
| R8   | 同 R7 冇 `--force`                                                 | nobody   | 2    | 冇   | 同 R7（見 O-3）                                                     |
| 對照 | `--out <P>/ok/new.drama.json --report <P>/ok/r.txt`                | nobody   | 0    | 有   | 兩個檔都寫（權限檢查冇誤擋）                                        |

`ls /proc/sys/qa* /proc/sys/報告*`：冇。`/tmp/qa-polish-perm.*` 測完已刪。

## 3. 深層唔存在路徑 + W-496

| #   | Case                                                             | 結果                                             |
| --- | ---------------------------------------------------------------- | ------------------------------------------------ |
| N1  | `--out /nonexistent/a/b/out.json`                                | exit 2，45 ms，`folder 唔存在：/nonexistent/a/b` |
| N2  | `--out /nonexistent/a/…/j/out.json --report /nonexistent2/r.txt` | exit 2，47 ms                                    |
| N3  | `--report /nonexistent/a/b/r.txt`（`--out` 啱）                  | exit 2，66 ms；drama.json 冇寫                   |

POSIX 嘅 `/` 一定存在，所以 Windows 情況用 standalone 檔 export 嘅 `nearestExisting` 注入 `exists` / `win32.dirname` 驗（1 ms 全部完）：

| Input                                       | 結果        |
| ------------------------------------------- | ----------- |
| `Z:\劇`（`Z:` 唔存在）                      | `undefined` |
| `\\server\share\a\b`（UNC 連唔到）          | `undefined` |
| `/nonexistent/a/b`（`exists` 永遠 false）   | `undefined` |
| 相對 `a/b`（`exists` 永遠 false，去到 `.`） | `undefined` |
| `C:\x\y`（只有 `C:\` 存在）                 | `C:\`       |

`undefined` 時 `parentProblem` 行「folder 唔存在」分支，即係 W-496 前（`5a61176`）嘅 exit 2 訊息；冇 loop。

## 4. exit 5 / 報告檔最尾寫唔到

用 `/dev/full` 做 `--report`：上層 `/dev` 係 folder、`accessSync W_OK` 過，但寫入一定 `ENOSPC`，即係「預檢過咗之後先出事（例如磁碟滿）」。

| #   | Case                                           | exit  | 結果                                                                                                                                                       |
| --- | ---------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E5  | 正常劇 + `--report /dev/full`                  | **5** | `已寫入：…/E5 劇.drama.json` + `drama.json 已經寫好（…），只係報告檔寫唔到：/dev/full（ENOSPC…）` + `上面畫面就係成份報告…唔使重行`；drama.json 705 B 喺度 |
| E1  | 空劇集 folder（blocked）+ `--report /dev/full` | 1     | 只講 `寫唔到報告檔 /dev/full（…）`，**冇**話 drama.json 已寫（的確冇寫）                                                                                   |
| E3  | `--verify`（URL 404）+ `--report /dev/full`    | 3     | 保留 3（唔會變 5）；訊息講明 drama.json 已寫                                                                                                               |

## 5. Happy path

| #   | Case                                                                | exit | 結果                                                                                                             |
| --- | ------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------- |
| H1  | 照抄 P1 提示：`--out "<S>/work/a dir/森美 劇集.drama.json"`         | 0    | 寫入                                                                                                             |
| H2  | 照抄 P6 提示：`--report "<S>/work/a dir/report.txt"`                | 0    | 兩個檔都寫                                                                                                       |
| H3  | `--out "…/有空格 的 輸出/劇 集.drama.json" --report "…/報告 1.txt"` | 0    | drama.json `name: 森美 劇集`、`audio.host: r2`、`enabled: false`；報告開頭 `345 212 207`（UTF-8 「劇」，冇 BOM） |
| H4  | 預設 `--id qa`                                                      | 0    | 寫 `<cwd>/qa.drama.json`                                                                                         |
| H5  | 預設冇 `--id`                                                       | 0    | 寫 `<cwd>/森美 劇集.drama.json`                                                                                  |
| H6  | H4 再行 + `--force`                                                 | 0    | 覆蓋                                                                                                             |
| H7  | H4 再行冇 `--force`（加 `--report`）                                | 2    | `已經存在，冇覆蓋（冇寫任何檔）`；報告檔有寫 → 同 README「冇寫 `drama.json`」字眼一致                            |

## 6. Round-trip（6 套劇）

- vitest：`should regenerate <id> unchanged with --existing` × 6 + `should rebuild the same audio paths for <id> from scratch` × 6 + lancy arcs exact，13 / 13 ✅。S-570 之後 `decodedPath` 唔係由 base 開頭就 throw，即係 host 揀錯會 fail 而唔係靜靜雞比錯路徑
- Standalone CLI（QA 自己寫嘅 `scratchpad/qa-polish/rt.mjs`）：用 standalone 檔嘅 `episodeUrls` 喺 scratch 建返上載 folder 樹（連 cover），再用 plain `node dramaFromFolder.mjs <folder> --id <id> --existing <committed> --out "<id> 輸出.drama.json"`：

| 劇          | 集數 | host | exit | deep-equal committed | byte-equal |
| ----------- | ---- | ---- | ---- | -------------------- | ---------- |
| lancy       | 100  | r2   | 0    | ✅                   | ✅         |
| chisee      | 97   | r2   | 0    | ✅                   | ❌（O-4）  |
| golden      | 126  | r2   | 0    | ✅                   | ✅         |
| jim         | 38   | r2   | 0    | ✅                   | ✅         |
| sammy-kitty | 109  | r2   | 0    | ✅                   | ✅         |
| c18         | 9    | app  | 0    | ✅                   | ✅         |

## 7. README exit code 表

| code | README                                                                                                                                     | 實際行為                                                                      | 一致       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------- |
| 0    | 成功                                                                                                                                       | H1–H6                                                                         | ✅         |
| 1    | 有 `[錯誤]`，冇寫檔                                                                                                                        | E1（空 folder）                                                               | ✅         |
| 2    | 參數錯，包括 folder 唔存在、上層其實係檔案、本身係 folder、冇權限寫入：掃 folder 之前就停；或者輸出檔已存在冇 `--force`；冇寫 `drama.json` | P / D / F / R / N 全部掃之前停、零寫入；H7 已存在 → 冇寫 drama.json、報告有寫 | ✅         |
| 3    | 已寫檔，但 `--verify` 有網址唔得                                                                                                           | E3                                                                            | ✅         |
| 4    | 程式出錯                                                                                                                                   | 只喺已知 S-573（`--out /dev/full --force` → exit 4 + stack，實跑確認）        | ✅（已知） |
| 5    | drama.json 已經寫好，只係最尾寫唔到 `--report`；畫面有成份報告，唔使重行                                                                   | E5                                                                            | ✅         |

另外 `EXIT` 常數同 JSDoc 註解同 README 一致（`reportFailed: 5`）。

## 8. Regression

- `npx vitest run scripts src/catalog`：11 files / 282 tests 全綠，包括新加：`should stop at a missing Windows drive instead of looping forever (W-496)`、`should reject --out / --report in a folder without write permission`、`should say drama.json was written when only the report write fails at the end`、`should not claim drama.json was written when the report fails on a blocked run`、`should suggest <dir>/report.txt (not drama.json) when --report is a folder`
- `npx tsc -b` 0、`npm run lint`（排除另一個 agent 嘅 worktree 之後）0、`npm run build` 0

---

## 主動測試（edge case 補測）

Repo test 冇覆蓋、QA 喺 standalone 實跑（全部 pass）：

1. **F2** 上層檔案下面再有幾層唔存在 folder（`nearestExisting` 要一路行上去越過 ENOTDIR）
2. **U1** NFD 劇集 folder 名 + 預設輸出撞 NFC 同名 folder（macOS Finder 檔名常見）
3. **E3** `--verify` 失敗 + 報告檔寫唔到 → 保留 exit 3、唔變 5
4. **E5 / E1** 用 `/dev/full` 真係觸發「預檢過咗先寫唔到」（repo test 係用 mock 喺寫入前 `mkdir`）
5. **R7** 已存在嘅 `0444` 檔 + `--force`（權限睇個檔本身，唔係上層）
6. **H1 / H2** 照抄提示例子行得通（引號 + 空格 + 中文）
7. **W-496** UNC root、相對路徑去到 `.` 都會停

### 建議補測（QA 唔 commit，由 developer 跟進，非阻塞）

- E3（verify 失敗 + 報告失敗 → exit 3）同 UNC root（`\\server\share`）加做 unit / CLI test，鎖住「唔會蓋成 5」同 W-496 嘅 UNC 分支

## 觀察（🟢，唔開 ticket）

- **O-3**：已存在嘅輸出檔係唯讀（R7 / R8）時，訊息係「冇權限寫入」+「請揀另一個 folder」。冇 `--force` 時亦一樣（權限檢查喺「已存在」之前），其實合理（加 `--force` 都寫唔到）；不過問題係個**檔**唔係 folder，提示可以加「或者改個檔嘅權限」。非常少見，可以接受
- **O-4**：chisee standalone round-trip deep-equal 但唔係 byte-equal：工具輸出 `JSON.stringify(…, 4)` 將短 `episodes` array 拆開多行，committed 檔係 prettier 排成一行。內容一樣、app 讀落一樣；只係用戶用工具更新 chisee 之後 diff 會多咗格式改動。舊有行為，唔係今次 diff 引入

## 已知（review 已記，唔開 ticket）

- **S-573**：`--out /dev/full --force` 實跑 exit 4 + 9 行 stack，同 review 描述一致（預檢過咗之後 `writeFileSync` 失敗）
- **S-574 / S-575**：test 層面，冇行為影響

## 問題修正優先順序

| 優先 | 問題                                                   | Ticket |
| ---- | ------------------------------------------------------ | ------ |
| —    | 冇新問題；S-573–S-575（review 🟢）+ O-3 / O-4 留待之後 | 冇     |

## 下一步建議

- 可以 merge；W-496 已修，script 可以再派畀用戶
- S-573 可以同 O-3 一齊做（`--out` 最尾寫唔到都行 exit 2 / 5 式中文訊息）
- O-4 如果想用戶更新現有劇時 diff 乾淨，可以考慮輸出時跟 prettier 嘅短 array 排法，或者 README 提一句「寫完行 prettier」

---

## Handoff receipt

```handoff-receipt
protocol: 2
status: pass
score: n/a
hard_gates:
  lint: "pass (eslint 0; prettier clean excluding .claude/worktrees of another agent)"
  type_check: pass
  tests: pass
  build: pass
  coverage: "pass (dramaFromFolder.mjs 96.66% stmts / 86.68% branches / 93.71% funcs / 97.62% lines)"
  e2e: "n/a (no app code change)"
  security: pass
  data_integrity: pass
  performance: "pass (deep missing paths terminate in ~45-66 ms; W-496 no hang)"
  no_critical: pass
  pwa_update: "n/a (no app code / version change)"
next_action: merge_main
next_agent: main
branch: "claude/keen-pascal-5iifg0"
tickets: []
context: "QA tool polish PASS @93362ea (diff 5a61176..93362ea, review 92). Standalone single .mjs + plain node 22. Hints: folder as --out/--report (example <dir>/<id>.drama.json / <dir>/report.txt, quoted, copy-paste runs exit 0), default output colliding with a folder incl. NFD name (suggests --out or move folder), parent-is-file incl. nested missing dirs below the file, spaces/CJK — 18 cases exit 2, zero writes, no stack, no scan. Read-only: /proc/sys (root) and 0555 dir / 0444 file with --force (nobody) -> exit 2 nothing written. Exit 5 reproduced via --report /dev/full (drama.json written, message says so); blocked stays 1, verify-failed stays 3. /nonexistent/a/b/out.json etc exit 2 in ~45 ms; W-496 nearestExisting returns undefined for missing Z:\\ and UNC roots. README exit table 0-5 matches behaviour. Round-trip 6/6 dramas green in vitest (13/13) and standalone CLI --existing deep-equal (chisee differs only in array line formatting, O-4, pre-existing). Regression: vitest scripts+src/catalog 11 files/282 green; tsc -b 0; eslint 0 + prettier clean outside .claude/worktrees (npm run lint exit 1 only from other agent's worktree previews); build 0. No tickets. Non-blocking: known S-573 (confirmed: --out /dev/full -> exit 4 + stack), S-574, S-575; new 🟢 O-3 (read-only existing file hint says pick another folder), O-4 (chisee byte formatting). Suggested tests for developer: verify-fail + report-fail keeps exit 3; UNC root W-496."
```
