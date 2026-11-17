# Code Review — 2026-11-17 — P10 lane 0「現有裝置零改變」比對工具（`npm run e2e:visual`）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`feature/layout/iphone-duo` HEAD `e0797c9`（PR #268 → `release/v2.0.0`），`git diff origin/release/v2.0.0...HEAD`（10 檔，+1052 / −49）
- Tier：T1（test tooling + `run.mjs` 抽 `previewServer.mjs`；冇 app code、冇新依賴）；Design Origin：none-required（diff 冇 `*.tsx` / `*.css`）
- Review Item ID：**W-781**、**S-1106 – S-1114**（冇 C）
- 總評：**✅ pass（95 / 100）**。1 條三層收斂 🟡：`drama-daily` 情境實際影緊「找不到此廣播劇」，每日劇集頁冇保障。按專案 backlog 規則，W-781 同 🟢 應喺呢個 PR 內清

## Hard Gates

all pass

- Lint：改咗嘅 7 個 `.mjs` / `.ts` 跑 `npx eslint` exit 0（`visualModel.d.mts` 冇對應 config，只係 warning）；10 個改咗嘅檔 `npx prettier --check` 通過
- Type：`apps/player` 跑 `npx tsc -b` exit 0
- Unit：`npm test -- apps/player/src/e2eVisualModel.node.test.ts` → 1 file / 25 tests 全綠
- Coverage：`e2e/visualModel.mjs` stmt / line / func 100%，branch 97.8%
- Security：冇新依賴（`package-lock.json` 冇改）；`git` / `vite` 全部用 `execFileSync` / `spawnSync` 參數陣列，冇經 shell
- E2E / 全套 visual：冇重跑，引用 developer 報告（e2e 925 PASS、visual 180 / 180、+1px 負面測試）；CI 仲跑緊，merge 前由 main agent 確認綠
- 版本：冇 bump，符合 plan 第 77 行（全部 lane 綠咗先 bump 2.0.0）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                   |
| -------- | ------ | ------- | ------------------------------------------------------ |
| 正確性   | 20     | 25      | W-781                                                  |
| 安全性   | 20     | 20      | 冇 shell、冇外網（沿用 harness 嘅 route）              |
| 可維護性 | 20     | 20      | 純邏輯同瀏覽器部分分開；`run.mjs` 抽出嚟之後行為一樣   |
| 測試覆蓋 | 15     | 15      | model 100%；瀏覽器部分靠 `VISUAL_BASE=HEAD` 同負面測試 |
| 性能     | 10     | 10      | 4 條 worker、byte 一樣就唔 decode                      |
| 代碼風格 | 10     | 10      | `apps/player/e2e/**` 喺 ESLint 豁免函數行數            |
| **總分** | **95** | **100** |                                                        |

**結果：✅ pass**

## 🟡 Warning

### W-781 `drama-daily` 情境影緊「搵唔到」頁，每日劇集頁冇任何比對

- 位置：`apps/player/e2e/visualScenes.mjs:13`（`DAILY_ROUTE = '#/drama/c18'`）、`:127`
- **L1**：plan `.proj-docs/plans/2026-11-17_plan_p10-duo-homeview.md:75`：每頁包括「**兩種廣播劇頁**」；情境 id 亦寫明係 `drama-daily`
- **L2**：developer 17:41 嗰次全套 run 嘅 `e2e/screenshots/visual/head/drama-daily@390x844.png` 成頁只有返回掣同「找不到此廣播劇」（1000×561 嗰張得 6 KB）。重現：`npm run e2e:visual -- --scene drama-daily --viewport 390x844` 之後睇 head 嗰張。`apps/player/src/catalog/dramas/library/c18/drama.json` 係 `"enabled": false`，而且係 library 入面唯一 `kind: daily`
- **L3**：`DramaPage.tsx:30-39` `findEnabledDrama('c18')` 冇結果 → 行 not-found 分支。兩個 build 都出同一個靜態錯誤頁，所以永遠 0 差異：180 張入面 18 張（10%）係空嘅保障。Lane 4 / 5 / 7 會改廣播劇頁（日子條直排、兩欄對齊），每日劇集頁喺現有裝置變咗都會照 PASS
- 方案 A（推薦）：情境用 harness 嘅 e2e catalog route（`E2E_CATALOG_GLOB`，同 `comingSoon.mjs` / `remoteCatalog.mjs` 做法一樣）餵一個開咗嘅每日劇集，再暫停 + 跳去 60 秒。Trade-off：多一份假 catalog 同音檔 mock，但係先真正影到每日劇集頁
- 方案 B：改名做 `drama-not-found`，喺 plan / CLAUDE.md 寫明每日劇集頁而家未開放、冇比對。Trade-off：最快，但 plan 嘅「兩種廣播劇頁」少咗一種，c18 一開放就要補
- 兩個方案都建議加埋 S-1106（每個情境有一個「去到啱嘅畫面」斷言），以後同類情況會 ERROR 而唔係靜靜雞 PASS

## 🟢 Suggestion / Observation

- **S-1106**（🟢）`visualScenes.mjs:67-70`、`:127`：情境冇「到位」斷言。`openTab` 撳完唔等 tab 揀中、`drama-daily` 淨係 `goto`，全靠 `SETTLE_MS` 600。今次睇過 `home-shows` / `home-idle` / `home-dramas` / `home-saved` / `home-paused` / `today` / `drama-series` 嘅 390×844 截圖，狀態啱；建議每個情境加一個 `ready` locator，等唔到就 throw
- **S-1107**（🟢）`visualDiff.mjs:291-298`：第一次唔同、重影先一樣嘅張數冇任何輸出。固定嘅差異重影都仲喺度，唔會被遮；但係間歇出現嘅差異（例如 head 引入嘅 race）會無聲無息 PASS。建議印一行 `RETRY <名>`
- **S-1108**（🟢，已重現）`visualDiff.mjs:331-383`：build 階段收到 SIGINT，`finally` 唔行，`git worktree list` 留低 `/tmp/903-visual-*/base`（我試完已清走）。Chromium 起咗之後 SIGTERM 就清得乾淨（Playwright 自己接 signal，worktree 同兩個 preview 都冇留低）。建議開工時清走舊嘅 `903-visual-*` worktree，或者加 signal handler
- **S-1109**（🟢）`previewServer.mjs:20`：撞 port 嘅訊息寫死「用 E2E_PORT」，visual 用嘅係 `VISUAL_PORT`；`visualDiff.mjs` 嘅 `VISUAL_PORT` 亦冇好似 `run.mjs` `parsePort` 咁驗
- **S-1110**（Observation）`visualDiff.mjs:155-166`：位置比對只收有自己文字或者 `CONTENT_TAGS` 嘅元素。捲出畫面、淨係得背景 / 邊框嘅容器，同埋捲出畫面嘅純顏色改動，截圖同位置都影唔到。符合 plan「一批元素」，記錄限制
- **S-1111**（Observation）`visualDiff.mjs:343-345`：`package-lock.json` 唔同只係 WARN，base 用 head 嘅 `node_modules`。依賴升級帶嚟嘅畫面改動兩邊一樣，比唔出；改 lockfile 嘅 lane 要另外核對
- **S-1112**（🟢）`visualModel.mjs:14`：註解話 `src/styles/deviceQueries.node.test.ts` 會鎖住，呢個檔 lane 1 先有；寫明「lane 1 加」
- **S-1113**（🟢）`visualDiff.mjs:91`、`previewServer.mjs:35`：搵 `vite/bin/vite.js` 嘅寫法有兩份（一份 `fileURLToPath`、一份 `.pathname`），可以由 `previewServer.mjs` export 一個
- **S-1114**（Observation）`.claude/CLAUDE.md` 新行寫「v2.0.0 每個 PR 都要跑」，但 `ci.yml` 冇呢一步，靠人手記得。單一 commit 亦睇唔到 test 先紅後綠嘅記錄（model test 內容同實作對得上）

## 對 developer 幾個決定嘅睇法

- `reducedMotion: 'reduce'`、三個 raster 參數、暫停 + 跳去 60 秒、版本字換固定字、symlink `node_modules`：讀過 code，同意，冇搵到會令工具錯誤 PASS 嘅位。App 冇 `hover` / `pointer` media query，plan 嘅新 query 亦只用闊高同方向，`hasTouch` 而冇 `isMobile` 唔影響結果
- `run.mjs` refactor：`startPreview` 原封搬去 `previewServer.mjs`（加 `port` / `cwd` 參數）；撞 port 由 `process.exit(1)` 變 reject，再由 `startPreviewOrExit` 印訊息 + exit 1，對外行為一樣；vite 早退而家印訊息、冇 stack，exit code 一樣

## ✅ 做得好嘅地方

- 揀咗唔存在嘅情境 / viewport、零張、情境 throw 全部當 FAIL，冇「跑零張當 pass」嘅路
- workspace package 指返 worktree 自己嘅 source，base 唔會食咗 head 嘅 catalog；截圖連續兩張一樣先收貨
- Viewport 清單包晒三個斷點邊界，仲有 unit test 對住 `src/config/layout.ts`

## 審閱期間做過嘅嘢（要知會）

- 為咗驗 S-1108，我用 `--scene home-idle --viewport 390x844` 跑咗兩次 `node e2e/visualDiff.mjs` 並中途打斷（一次 SIGINT、一次 SIGTERM）。工具開工會清 `e2e/screenshots/visual/`，所以 developer 之前嗰 180 張截圖（gitignore 咗）已經冇咗；`apps/player/dist` 亦重新 build 過（同一個 HEAD、`--mode e2e`）。留低嘅 worktree 已經清走，`git worktree list` 得返主 repo

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "100%"
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/layout/iphone-duo"
context: "P10 lane 0 visual diff tool pass 95; merge target release/v2.0.0 (no develop); fix W-781 (drama-daily scene captures not-found page) + S-1106..S-1109, S-1112, S-1113 in this PR before merge; QA S1 chain repo-tooling; CI e2e for e0797c9 still running"
```

## Re-review — 2026-11-17 — `b47d102`

- 範圍：只驗 `git show b47d102`（6 檔，+118 / −36，全部喺 `apps/player/e2e/`）對 W-781、S-1106 – S-1109、S-1112、S-1113 嘅修正；冇重新 review 成個 branch，冇新 Review Item ID
- 結果：**✅ pass（100 / 100）**，7 條全部解決，冇新嘅 🔴 / 🟡
- Hard gates：冇重跑，引用 developer 修正後嘅結果（lint、tsc、unit、`npm run e2e` 925 PASS、`npm run e2e:visual` 對 origin/main 180 / 180 一樣）；CI e2e 仲跑緊，merge 前由 main agent 確認綠

| ID     | 狀態      | 驗證                                                                                                                                                                                                                                                                                                                             |
| ------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-781  | ✅ 已解決 | 方案 A：`seedDailyCatalog` 用 `E2E_CATALOG_GLOB` + `catalogRoute` 餵一份淨係開返 `c18` 嘅 catalog，`**/c18/*.m4a` 用 `serveWav`（600 秒靜音，夠跳去 60 秒）。睇過 `head/drama-daily@390x844.png`、`@1000x561.png`：真係 18 樓 C 座頁，暫停喺 1:00 / 10:00，有日子條同集數表；18 個 viewport 都有檔（1000×561 由 6 KB 變 155 KB） |
| S-1106 | ✅ 已解決 | `openTab` 等 `aria-pressed` 嘅掣；`drama-daily` 等標題，而且 `openPaused` 入面 `ensurePlaying` 喺 not-found 頁會 throw → ERROR。其餘情境本身已經有到位條件（`nav[aria-busy="false"]`、`ensurePlaying`、全集表）                                                                                                                  |
| S-1107 | ✅ 已解決 | `compareShot` 第一次唔同就印 `RETRY <名>`，重影一樣都有痕跡                                                                                                                                                                                                                                                                      |
| S-1108 | ✅ 已解決 | `pendingCleanup` 喺 `git worktree add` 之前已經設定，SIGINT / SIGTERM handler 停 preview、清 worktree 同暫存 folder，exit 130 / 143；`removeWorktree` 會清返 `pendingCleanup`，唔會清兩次。而家 `git worktree list` 得主 repo、`/tmp` 冇 `903-visual-*`                                                                          |
| S-1109 | ✅ 已解決 | 撞 port 訊息用 `portEnv`（visual 傳 `VISUAL_PORT`，`run.mjs` 預設 `E2E_PORT`）；`VISUAL_PORT` 經 `parsePort` 驗，唔啱就 throw → `main().catch` 印訊息、exit 1                                                                                                                                                                    |
| S-1112 | ✅ 已解決 | `visualModel.mjs` 註解唔再指去未有嘅 `deviceQueries.node.test.ts`                                                                                                                                                                                                                                                                |
| S-1113 | ✅ 已解決 | `previewServer.mjs` export `viteBin()`（`fileURLToPath`），preview 同 build 共用；`parsePort` 都搬咗去共用                                                                                                                                                                                                                       |

### 修正有冇帶嚟新問題

- `visualScenes.mjs`：route 後註冊先試，新嘅 catalog / 音檔 route 蓋過 harness 嘅 404，只影響 `drama-daily` 自己嘅 context。Catalog 同圖兩個 build 都由 head 嘅 source 生成，呢個情境比嘅係版面，資料改動唔會喺呢度反映（其他情境照用各自 build 嘅內建資料）
- `run.mjs`：`portOrExit` 對外行為同以前一樣（同一句訊息、exit 1）；`parsePort` 邏輯原封搬走，只係由 `process.exit` 變 throw
- `visualDiff.mjs` signal 處理，兩點只係記錄（冇重現、唔扣分、唔使跟進）：
    - build 用 `spawnSync`，handler 要等同步 build 完先行。淨係 `kill` node 嗰個 pid 嘅話，會遲啲先停，但清理同 exit code 啱；Ctrl-C 成個 process group 收到，vite 即停，由 `buildBase` 嘅 `catch` 清
    - `--keep-worktree` 被 signal 打斷時 worktree 都會清走（打斷咗嘅 run 冇嘢好留，合理）

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "100%"
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/layout/iphone-duo"
context: "Re-review of b47d102: W-781, S-1106..S-1109, S-1112, S-1113 all resolved, no new findings; hard gates cited from developer run (not re-run); merge target release/v2.0.0 (no develop); QA S1 chain repo-tooling; report committed locally, NOT pushed (CI e2e for b47d102 in progress, main agent pushes after green)"
```
