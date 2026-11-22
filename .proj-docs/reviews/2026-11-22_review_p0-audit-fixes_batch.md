# Batch Review — 2026-11-22 — P0 audit fixes（AU-014 + AU-013）

- 日期：2026-11-22
- 審閱者：Code Reviewer（subagent，獨立；冇寫過呢兩個 fix）
- 來源：`.proj-docs/audits/2026-11-22_00-39_audit_full-codebase.md`（AU-013 🔴、AU-014 🟡）
- Review Item ID：今次用 `S-1391`–`S-1397`（之前最高 `W-857`、`S-1390`；`C-` 冇用）

## 整體 verdict

- 涵蓋 commit：`65a859e`（AU-014，`fix/tooling/au-014_ledger-merge-maxbuffer`）、`c66cd01`（AU-013，`fix/admin/au-013_rename-arc-ids`），base 都係 `origin/main` `e800401`
- Hard gates：all pass（兩個 worktree 各自跑）
    - Lint：`npm run lint` exit 0（兩邊）
    - Type：`npx tsc -b` exit 0（兩邊）
    - Tests（diff 相關，冇跑 full suite / e2e，Hard Rule #7）：Fix 1 `scripts/qa/ledger-merge.test.mjs` 4/4；Fix 2 `apps/admin/src/features/{editor,dramas}` + `packages/catalog/src/scan` + `apps/api/test/adminRoutes.test.ts` 34 files / 294 tests 全綠
    - Coverage：Fix 2 改咗嘅 6 個檔 lines 99.45%、branch 89.23%；Fix 1 個 script 喺 child process 跑（v8 量唔到），4 個 test 行晒新加嘅兩條分支 → n/a
    - Security：冇新依賴；No Critical ✓
- Status：✅ pass（兩個 fix 都 pass；7 條 🟢 + 2 條 Observation，唔 block）；Round 2：S-1391 / S-1392（`ef95f21`）同 S-1393 – S-1397（`8dccd70`）全部已關，冇新 finding
- Main agent 要跟：(1) `apps/admin` version 未 bump（0.9.3），照之前 lane 做法喺 batch release 嗰陣 bump PATCH；Fix 1 冇 versioned package。(2) 🟢 按 `.claude/CLAUDE.md`「Parallel lane backlog」要喺今個 session 清，建議 S-1391 喺 PR 內修

## Section A — AU-014 `ledger-merge.mjs` maxBuffer（Tier T1，tooling）

改動：每個 git call 用 64 MiB `maxBuffer`；cwd 唔係 repo root → exit 2；新 `ledger-merge.test.mjs`；root `vitest.config.ts` 加 inline project `@903-player/repo-scripts`。

| 維度     | 得分    | 滿分    | 備注                               |
| -------- | ------- | ------- | ---------------------------------- |
| 正確性   | 25      | 25      | 見下面驗證                         |
| 安全性   | 20      | 20      | `execFileSync` 冇 shell            |
| 可維護性 | 20      | 20      | 常數有名、函數單一職責             |
| 測試覆蓋 | 15      | 15      | 舊 code 3/4 fail（真係釘住個 bug） |
| 性能     | 10      | 10      | 成個 test 檔 733 ms                |
| 代碼風格 | 10      | 10      |                                    |
| **總分** | **100** | **100** | **✅ pass**                        |

驗證過（L2）：

- 新 test 對 `origin/main` 嘅舊 script：3 fail（`ENOBUFS`；兩個 cwd case 係 exit 1 唔係 2）、1 pass → test 釘得住
- Linked worktree + merge 進行中（`UU` ledger）喺 worktree root 跑：照常合併，衝突行 exit 1 列出 → repo-root 檢查冇阻住正常用法；`.claude/CLAUDE.md` 講嘅 exit 1 合約冇變
- CI：`GIT_CONFIG_GLOBAL` / `GIT_CONFIG_SYSTEM` = `/dev/null`、identity 用 env、`init -b main`，唔靠 runner 嘅 git 設定 / 預設 branch / 簽署；`afterEach` 清 temp dir（跑完 tmpdir 冇 `ledger-merge-*`）；include `scripts/**/*.test.mjs` 只中 1 個檔，冇撞 `apps/api/scripts`；CI Node 22（`Array.prototype.with` OK）

🟢 / Observation：

- **S-1391** `scripts/qa/ledger-merge.test.mjs:25`：`GIT_ENV` 係 `...process.env`，冇清 `GIT_DIR` / `GIT_WORK_TREE` / `GIT_INDEX_FILE`。實測 `GIT_DIR=<另一個 repo>/.git npx vitest run scripts/qa/ledger-merge.test.mjs`：3 fail，而且嗰個 repo 多咗 `base` / `theirs` / `ours` commit、HEAD 轉咗去 `ours`。而家 repo 冇 git hook 所以冇 L1；但 `git rebase --exec` / `git bisect run` / 將來加 hook 跑 `npm test` 就會寫入真 repo。方向：`GIT_ENV` 剔走所有 `GIT_*`（留返自己 set 嗰幾個）
- **S-1392** `scripts/qa/ledger-merge.mjs:4-11`：exit 2 冇寫入檔頭用法同 `.claude/CLAUDE.md`「Ledger merge conflict」；另外（舊有）git 出錯（例如冇 `MERGE_HEAD`）係 uncaught → Node exit 1，同「exit 1 = 有行要重新驗收」撞。方向：檔頭補 exit code 表；`main()` 包 try/catch 用 exit 2
- Observation：一個 commit 入晒 test + 實作，冇紅先綠嘅 commit 記錄（上面已經用舊 code 補驗）

### Round 2（`ef95f21`，只驗 S-1391 / S-1392 嘅修正）— ✅ pass

- **S-1391 已關**：`isolatedGitEnv(process.env)` 剔走所有繼承嘅 `GIT_*`。重做上面嘅重現（`GIT_DIR` + `GIT_WORK_TREE` 指去 scratch repo 跑 `ledger-merge.test.mjs`）：7/7 pass，scratch repo 仲係得 `victim-base` 一個 commit、HEAD 喺 `main`、`status` 乾淨
- **S-1392 已關**：檔頭有 exit 0 / 1 / 2 表。exit 1 只有一個來源（`writeFileSync` 之後 `process.exitCode = 1`）；所有 git call（`merge-base`、3 次 `show`）同 `fileSha` 都喺寫入之前，掟 error 就 exit 2、冇寫過 ledger。實測喺 worktree root 冇 `MERGE_HEAD` 跑：一行 `ledger-merge: git merge-base HEAD MERGE_HEAD failed: fatal: Not a valid object name MERGE_HEAD`、exit 2、`git status` 乾淨。Catch-all exit 2（非 `UsageError` 印 stack）合理：衝突清單只會喺寫入成功之後先印，唔會被吞
- 真 ledger：`node scripts/qa/ledger-merge.mjs HEAD HEAD` → 4304 rows、exit 0，前後 sha256 一樣（`cmp` byte-identical）
- Gates：`npm run lint` exit 0；`ledger-merge.test.mjs` 7/7；跑完 tmpdir 冇 `ledger-merge-*`
- 冇新 finding。冇實測：`writeFileSync` 失敗嗰條路（讀 code 判斷）。`.claude/CLAUDE.md` 未寫 exit 2（要改就由 main agent / 用戶決定）

## Section B — AU-013 改劇集 ID 之後儲存（Tier T2，admin + api + catalog）

改動：改名規則搬去 `packages/catalog/src/scan/arcIdRename.ts`（api import）；`persist` rename 成功後用同一條規則改草稿先 PUT；PUT 失敗 → `RenamedSaveError`，`useSaving` 跟去新 ID + `renamedHandoff` 單格暫存；URL hash、`confirmAll` 短篇 ID 跟住改；unit / api test / admin e2e。

| 維度     | 得分    | 滿分    | 備注                                              |
| -------- | ------- | ------- | ------------------------------------------------- |
| 正確性   | 25      | 25      | AU-013 兩個症狀都解決；邊界見下                   |
| 安全性   | 20      | 20      | 冇新輸入面；SQL 照用 bind                         |
| 可維護性 | 20      | 20      | 規則得一份；`useDramaSave` / `useLatest` 拆得清楚 |
| 測試覆蓋 | 15      | 15      | 四層都有；欠兩個 case 見 S-1397                   |
| 性能     | 10      | 10      |                                                   |
| 代碼風格 | 10      | 10      | 冇新介面文字（書面語規則 n/a）、冇 magic number   |
| **總分** | **100** | **100** | **✅ pass**                                       |

重點逐項（對應 main agent 6 點）：

1. **Module-level handoff**：StrictMode 實測（臨時 probe test，跑完已刪）— `renderHook(..., { wrapper: StrictMode })` 接手到 entry / draft / problem、冇 GET、之後再 mount 攞唔到 ✓。`key={id}` remount 時 `useState` initializer 攞、effect 先 drop，`skipLoad` 令 `useLoadedEntry` 唔 GET ✓。`useEntryEditor('dramas', …)` 只有 `useDramaEditor` 一個 caller；`useShowEditor` 新增模式冇 entry，唔會 rename ✓。失敗後一定 `navigate` 去新 ID（`followFailedSave`），所以正常路徑冇 stale 格；見 Observation
2. **規則等價**：JS `startsWith(from)` + `^-\d{2}$`（冇 `u` flag = ASCII 0-9）≡ SQL `GLOB '<from>-[0-9][0-9]'`（成串 match、分大細楷）。`ID_PATTERN` `^[a-z][a-z0-9-]*$`、`ARC_ID_PATTERN` 都冇 `* ? [ ]` 同 regex 特殊字元，`from` 冇經 regex 組合 ✓。闊度：JS 用 `PLACEHOLDER_ARC_WIDTH`，SQL 寫死 → S-1393
3. **草稿有人手改過嘅短篇 ID / `renameTo` 等於現有 ID**：自訂 ID 原樣（`drama-01-extra`、`special` 有 test）；人手將自動編號改走而嗰個短篇有排程 → 照舊 409，正確（用戶真係改咗）。`renameTo === entry.id` 兩層 guard（`useDramaSave`、`persist`），接手後再儲存係純 PUT（unit + component test 有驗 `rename` 只叫一次）✓
4. **`?from=todos` + 部分失敗**：probe 實測去咗 `/dramas/lancy?from=todos&todo=…`，掣仲係「儲存並返回待辦」，錯誤照出，`refresh` 有叫；之後成功儲存先 `afterSave()` 返待辦 ✓。兩個細位見 S-1395、S-1396
5. **Test 釘唔釘到**：`dramaIdRename.test.tsx` / `persist.test.ts` 斷言 PUT body 係 `lancy-01` + `If-Match "v2"`，舊 `persist` 原封不動 PUT 草稿一定 fail（讀 code 判斷，冇喺舊 code 跑）；api test 釘住 server 合約（舊草稿 409 / 改咗 200 + 排程跟）。e2e mock 重複規則 → S-1394
6. **規範**：diff 冇 `.tsx` 產品檔、冇 i18n 改動；`useDramaEditor.ts` 138 行、`useEntryEditor.ts` 144 行，lint 過

🟢 / Observation：

- **S-1393** `apps/api/src/admin/rename.ts:47`：`[0-9][0-9]` 寫死兩位，同 `PLACEHOLDER_ARC_WIDTH` 冇連住；方向：`'[0-9]'.repeat(PLACEHOLDER_ARC_WIDTH)`（由 catalog export）
- **S-1394** `apps/admin/e2e/mockRename.mjs:46-50`：`renamedArcId` 抄咗一份，catalog 改咗唔會紅；方向：加一個 unit test 用同一張表比對 mock 同 catalog 兩個函數
- **S-1395** `apps/admin/src/features/dramas/useDramaEditor.ts:77-84`：失敗後搬去新 ID 時 `search` 原樣帶住 `todo=<kind>:<舊 ID>:`，`todoKey` 對唔返 → flow bar 唔見（probe：href 係 `…/lancy/theme?from=todos&todo=newDrama:drama-01:`）；方向：`todo` 入面嘅劇 ID / 短篇 ID 跟住改
- **S-1396** `apps/admin/src/features/editor/useEntryEditor.ts:112-116`：淨係改 ID（冇其他改動）而 PUT 失敗：搬去新 ID 後草稿 = 已儲存版本，「儲存」掣 disabled，但錯誤提示留喺度冇得再試（probe：第二次撳冇 PUT）；其實 ID 已經改好。方向：草稿冇改動時唔帶 problem，或者改用提示「ID 已更改」
- **S-1397** 欠 test：StrictMode 下接手（今次 probe 過到，未入 repo）；`?from=todos` 部分失敗
- Observation：暫存冇時限，新 ID 嗰頁如果 mount 唔到（例如 route error），下次入嗰頁會食到舊草稿 + 舊 ETag（之後儲存 412 可以重讀）。冇重現路徑（L3）
- Observation：一個 commit 入晒 test + 實作，冇 TDD 紅燈記錄

### Round 2（`8dccd70`，只驗 S-1393 – S-1397 嘅修正）— ✅ pass

- **S-1396 已關**（`persist.ts:67-68`，rename 後 `changedKeys(moved, next)` 空就唔 PUT）。逐樣對過 API：
    - `changedKeys` 比 definition 每個 key + images 嘅 `JSON.stringify`，同 dirty 提示用同一個函數；兩邊都過咗 `withRenamedArcIds`。判錯只會係「當有改」（多一個冇害嘅 PUT），真係改咗唔會當冇改
    - rename（`rename.ts:73-89`）已經寫晒 PUT 會寫嘅嘢（id、改咗短篇 ID 嘅 definition、`updated_at`、schedules、findings）；images 同 `draft` 兩邊都冇郁，client `moved` 亦照舊
    - `missingEpisodeIds`：`renamable` 對發佈過嘅劇回 409（`rename.ts:114`），`disappearingIds` 只睇 `drama:<新 ID>:` 開頭嘅已發佈 ID，新 ID 又唔可以已經存在（`:116`）→ 一定係空，lane 講法成立
    - 之前 rename-only 都會 PUT，PUT 會重新驗證再計 `draft`（`checkedEntry`）；而家唔計。驗證唔靠劇 ID（`validate.ts` 只用嚟砌 label），所以結果同上次寫入一樣；見 Observation
- **S-1395 已關**：`renamedUrl.ts` 用 `todoKey` 砌返新 key；唔係呢套劇嘅行 / 搵唔到嘅 key 原樣（unit test 有）。待辦未載入 / 過期時搵唔到行 → 同 Round 1 一樣原樣帶住（flow bar 唔見），冇變差
- **S-1393 已關**：`arcIdGlob` 用 `PLACEHOLDER_ARC_WIDTH`；api test 喺 D1 真係跑 `GLOB`，闊度 −1 / 0 / +1 嘅結果同 `renamedArcId` 逐個比對
- **S-1394 已關**：`mockRenameParity.test.ts` 13 個 case 同時斷言 catalog 同 mock 兩份；任何一份改咗規則都會紅
- **S-1397 已關**：StrictMode 接手 test（連 `dirtyKeys`、之後再 mount 會 GET）同 `?from=todos` 部分失敗 + 第二次儲存 test 都入咗 repo
- 規範：`renamedUrl.ts` 47 行、每個函數單一用途；冇新介面文字；冇 magic number
- Gates：`npm run lint` exit 0；`npx tsc -b` exit 0；同 Round 1 同一批路徑 36 files / 317 tests 全綠
- 冇新 finding。Observation（L3）：entry 嘅 `draft` 如果同「而家重新驗證」嘅結果唔一致（例如 assets 喺 entry 以外改過），rename-only 儲存唔會再順手修正；正常流程每次寫入都會重計，重現唔到
- 冇跑：`npm run e2e:admin`（新加嘅 rename-only e2e section 留畀 QA / CI）

## ✅ 做得好嘅地方

- 兩個 fix 都揀咗 audit 方案入面改動最細嗰個，同時補埋「rename 成功、PUT 失敗」呢條 audit 指明要處理嘅路
- 規則搬去 catalog 之後 api / admin 同一份，闊度同 scan 派號共用常數
- Fix 1 嘅 test 真係 spawn 個 script 對臨時 repo 跑，唔係 mock `execFileSync`

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "99%"
next_action: merge_develop
next_agent: quality-assurance
branch: "fix/tooling/au-014_ledger-merge-maxbuffer, fix/admin/au-013_rename-arc-ids"
context: "Batch review round 2: AU-014 at ef95f21 and AU-013 at 8dccd70 both pass 100/100; S-1391..S-1397 all closed, no new findings, next free ID S-1398; integration branch is main; admin e2e not run by reviewer (QA / CI); apps/admin version not bumped (bump at batch release); coverage figure is from round 1; report not committed"
```
