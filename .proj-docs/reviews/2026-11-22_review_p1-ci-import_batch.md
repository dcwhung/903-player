# Batch Review — 2026-11-22 — P1 CI / import（AU-015 / 016 / 017 / 019）

- 審閱者：Code Reviewer（獨立，冇寫呢啲 code）
- Tier：T2（Fix 1）/ T3（Fix 2：workflow / deploy）
- Base：`5bc0dba`（`origin/main` 已經去到 `ea89600`，照 branch 現狀審）

## 整體 verdict

- 涵蓋 commit：Fix 1 `62eeb62`（`fix/api/au-017_import-insert-only`）；Fix 2 `51acffd`、`3f16264`、`a92401e`（`fix/ci/au-015-016-019_ci-deploy-gating`）
- Hard gates：兩個 worktree 都 all pass（lint、`tsc -b`、相關 unit test、coverage、冇 Critical、冇新依賴）
- Status：Round 1 ⚠️ warn（Fix 1：`W-858`）→ **Round 2 ✅ pass**（兩個 fix 都 pass，見「Round 2」）

| Fix             | 正確性 | 安全性 | 可維護性 | 測試  | 性能  | 風格  | 總分    | Status  |
| --------------- | ------ | ------ | -------- | ----- | ----- | ----- | ------- | ------- |
| Fix 1（AU-017） | 20/25  | 20/20  | 20/20    | 15/15 | 10/10 | 10/10 | **95**  | ⚠️ warn |
| Fix 2（AU-015） | 25/25  | 20/20  | 20/20    | 15/15 | 10/10 | 10/10 | **100** | ✅ pass |
| Fix 2（AU-016） | 25/25  | 20/20  | 20/20    | n/a   | 10/10 | 10/10 | **100** | ✅ pass |
| Fix 2（AU-019） | 25/25  | 20/20  | 20/20    | n/a   | 10/10 | 10/10 | **100** | ✅ pass |

## Section A — Fix 1：AU-017（`apps/api/scripts/importLibrary.mjs`）

驗過冇問題：

- SQL：預設 `ON CONFLICT (kind, id) DO NOTHING`；`--overwrite` 同舊 upsert 一樣（`WHERE … IS NOT excluded.…`）。`quote()` 單引號 double，兩個 mode 共用同一條 `entrySql`
- `countEntries` 同 SQL 比較嘅係同一樣嘢：兩邊都用 `storedText()`（`JSON.stringify`）；D1 欄係 `TEXT NOT NULL`，`--json` 讀返嚟係同一條字串。「to overwrite」= SQL 真係會改嘅行（miniflare test 鎖住：只有 2 行 `updated_at` 變）
- Dry run：只跑兩句 `--json` SELECT，冇 `r2 object put`、冇 `--file`（test 斷言 `calls.every(--json)`）
- D1 讀取失敗（wrangler exit ≠ 0）→ `WranglerError` → exit 1，未寫任何嘢；stdout 唔係 JSON / 唔係 array → throw，未寫任何嘢（實跑確認）
- 舊 bug 有鎖住：`should leave a row admin changed untouched…`（`definition`、`images`、`updated_at` 三欄都冇變，只有缺嗰行 insert）
- README：`schedules` 講法同 `migrations/0002_schedules.sql` 註解一致（儲存排期時展開寫入 `definition`，規則另存）

### 🟡 W-858 — D1 讀到「合法 JSON 但形狀唔啱」會當成全部 missing，`--overwrite` 照寫

- 位置：`apps/api/scripts/importLibrary.mjs:205-209`（`queryRows`：`result?.results ?? []`）
- L1：AU-017「dry run 列出會覆蓋嘅行數」；brief 嘅驗收條件「bad read 唔可以當全部 missing、唔可以繼續 overwrite」
- L2：stub `exec` 回 status 0 而 stdout 係 `[]` / `[{"success":false}]` / `[{"results":null}]`，`--remote --overwrite` → exit 0、照跑 `d1 execute --file`、Summary 印「0 to overwrite」
- L3：`?.` 同 `?? []` 將「冇結果」同「讀唔到」當成一樣；Summary 話 0 行但 upsert 照蓋。低機率（要 wrangler 改格式 / 出錯但 exit 0），中咗不可還原
- 方案 A（推薦，Round 2 已採用）：`queryRows` 驗形狀，唔啱就 `WranglerError` → exit 1；方案 B：只喺 `--overwrite` 驗（預設 mode 數字仍然錯）

### 🟢 / Observation

- `S-1398` `apps/api/README.md`（Production 步驟 1–2）：冇提 workflow 新嘅 `overwrite` 剔格；Fix 2 之後 `entries:` / `WARNING:` 行已經喺 Summary，唔使叫人睇 Import step log（兩個 fix 都 merge 咗先啱）
- `S-1399` `apps/api/scripts/importLibrary.mjs:233-237`：預設 mode 都會上載「保留嗰啲 entry」嘅 repo 圖同寫 `assets` 行，冇 entry 用到（孤兒圖；舊行為，無害）
- `S-1400` `apps/api/scripts/importLibrary.test.ts:141`：第一個 miniflare test 喺 `--coverage` 下 3 次有 1 次 5 s timeout（冷啟動；冇 coverage 2 次都過）。Observation，可以畀 miniflare test 加長 timeout
- Version：lane 冇 bump（照 project 慣例由 main agent `chore(release)` 統一 bump）；`--overwrite` 係新 CLI flag，api 要 bump + CHANGELOG

## Section B — Fix 2：AU-015（`ci.yml` + `scripts/ci/detect-code-changes.sh`）

- Docs pattern 同舊 `ci.yml` 逐字一樣（diff 過）；`check` / `e2e` 嘅 `needs` / `if` 冇變
- Fallback 全部落 `code=true`（實跑）：冇 `origin/main`、冇 merge-base、SHA 唔存在（`base=none`，exit 0）、diff 係空。`set -euo pipefail` 下 `merge-base` / `diff` 都有 `|| true`，`grep` 喺 `!` 後面；Actions 入面唯一 non-zero 係 `GITHUB_SHA` / `GITHUB_OUTPUT` 冇 set（唔會發生）
- Path 有空格冇事；非 ASCII path 會被 git 加引號 → 當 code（實跑：淨係加 `docs/筆記 a.md` → `code=true`），安全嗰邊
- Test 10 個過，鎖住 AU-015 兩個情境（code 後 docs push、`git mv` 入 docs）

🟢：

- `S-1401` `scripts/ci/detect-code-changes.sh:25`：非 ASCII 檔名嘅 docs 會令淨 docs branch 跑全套（只係多用 CI 分鐘）；想準確可以加 `-c core.quotePath=false`，並加 test 鎖住
- `S-1402` `.claude/CLAUDE.md`（「S3 可引用嘅 CI」行、「Code 同 docs 嘅 push 次序」）：仲寫住「淨改 docs 嘅 push 會跳過」。Merge 後 branch 有 code 時 docs push 會重跑全套（包括 e2e），由 main agent 更新（lane 唔改呢個檔）

## Section C — Fix 2：AU-016（`deploy-api.yml` build job 檢查）

- `npm run lint`、`npx tsc -b`、`npm test` 同 `ci.yml` `check` job 次序、指令一樣，都喺 repo 根跑；checkout 深度同 `check` job 一樣（預設），git test 自己起臨時 repo 同設 `GIT_*`，唔靠 runner 設定
- 範圍符合用戶決定（只做 GitHub workflow，Vercel 冇郁）

## Section D — Fix 2：AU-019（job 隔離）

- `deploy`：`needs: build`，冇 `if` / `always()`，build fail / cancel → deploy 唔跑；build 冇 `if`，唔會被 skip。兩個 job 第一步都有非 main ref 守衛
- Secret 三步（Apply D1 migrations / Deploy Worker / Sync optional deploy secrets）同 base **逐 byte 一樣**（`diff` 冇輸出）；`permissions`、`concurrency` 冇變
- Artifact：上載 `apps/admin/dist`（名 `admin-dist`）→ 下載去 `apps/admin/dist`（相對 workspace 根）= `apps/api/wrangler.toml` `[assets] directory = "../admin/dist"`；`defaults.run.working-directory: apps/api` 下檢查 `../admin/dist/index.html` 啱。`apps/admin/public` 冇 dotfile（upload-artifact 預設唔包 hidden file）
- 四個 workflow 嘅 `run:` 入面冇 `${{ }}`（YAML parse 過）；`actionlint` 1.7.12 四個檔 exit 0
- `npm ci --ignore-scripts`：喺 scratch copy 實跑，lockfile 有 install script 嘅只有 `esbuild` / `fsevents` / `workerd`；之後 `wrangler deploy --dry-run`（bundle + 讀到 assets）、`wrangler d1 migrations apply --local`、`wrangler d1 execute --local --json`、`npm run import -- --local --dry-run` 全部 exit 0
- `import-catalog.yml`：`OVERWRITE` 經 `env:`，用 array 砌參數；Summary 嘅 `grep … || true` 喺 pipefail 下唔會 fail

### Lane 提出嘅兩個 deviation

- (a) `deploy.yml` build job `contents: read` + `pages: read`：**接受**。`actions/configure-pages` 用 `GITHUB_TOKEN` 讀 Pages 設定（GET Pages site 要 Pages read），冇開 `enablement` 就唔使 write；`pages: read` 出唔到嘢，AU-019 嘅目的（write + `id-token` 只喺 deploy job）達到。未能實跑；萬一 fail 係 build job 紅、唔會出半套，補救係將 build job 改返 `pages: write`
- (b) 帶 secret 嘅 job 唔用 `cache: npm`：**接受**。合理嘅深度防禦（唔食行過第三方 code 嘅 job 寫嘅 cache），代價只係 install 慢少少

### Observation（merge 次序）

- `S-1403` `.github/workflows/deploy-api.yml:25`：path filter 包括 workflow 自己，Fix 2 一 merge 就會喺 main 跑新 workflow = 第一次實跑就係 production deploy。要睇住嗰次 run；build job 或者 download 嗰步 fail 都喺 migration 之前，唔會留半套
- Fix 1 要先 merge：Fix 2 嘅 `import-catalog.yml` 註解同 `overwrite` 要靠佢。倒轉嘅話：剔 `overwrite` 舊 script 會 exit 2（安全），但唔剔就係舊 upsert，同註解講嘅相反
- Fix 1 merge（改 `apps/api/**`）會觸發舊 Deploy API，`concurrency: deploy-api` 排隊唔取消，等佢完先 merge Fix 2；兩條 branch 改嘅檔冇重疊，都要先 merge `ea89600`

## ✅ 做得好嘅地方

- Secret 步驟原封不動搬位，註解講清楚邊界同 re-run 行為

## Round 2（re-review：Fix 1 `56e01af`、Fix 2 `7fd5281`）

只驗上一輪 finding 嘅修正同佢哋嘅 diff。Hard gates：兩個 worktree all pass。

| ID     | 結果      | 證據                                                                                                                                                                                                                                            |
| ------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-858  | ✅ closed | 重做 stub：5 種壞 stdout（`[]`、`success:false`、`results:null`、非 JSON、空）× 預設 / `--overwrite` × 全部讀取壞 / 淨係 `entries` 壞 = 20 個組合，全部 exit 1、0 個寫入 call、冇 `entries:` 行。兩個讀取都喺第一個寫入之前（5 個正常情境確認） |
| S-1399 | ✅ closed | 預設 mode 只寫缺嗰啲 entry 同佢哋嘅圖：要加嘅 entry 每張圖都係「上載咗或者 `assets` 已有」，SQL 入面都有 `assets` 行（`DO NOTHING` 冇變），SQL 排最後；冇嘢要加 → 0 個寫入 call、exit 0                                                         |
| S-1398 | ✅ closed | README 步驟 1–2 提 **overwrite** 剔格同 Summary，同 Fix 2 `import-catalog.yml` 嘅 input `overwrite` / `dry_run` 行為一致                                                                                                                        |
| S-1400 | ✅ closed | miniflare describe 用 `MINIFLARE_TEST_TIMEOUT_MS = 30_000`；40 個 test 過                                                                                                                                                                       |
| S-1401 | ✅ closed | `git -c core.quotePath=false diff`：實跑 `docs/筆記 a.md` → `code=false`，加 `src/節目 b.ts` → `code=true`；SHA 唔存在 / 冇 `origin/main` → `code=true`、exit 0；13 個 test 過                                                                  |

- 「圖只得一半」：`assets` 行喺圖上載完先由 SQL 寫，所以「有行」即係 R2 已有；上次上載咗但 SQL 未跑嘅圖冇行，會再上載（冪等）
- 跨 fix：由 Fix 2 `import-catalog.yml` 抽出 Summary step，用 `bash --noprofile --norc -eo pipefail` 對 5 份 log 跑（預設有 insert、預設冇嘢加（0 個 wrangler step）、dry run、overwrite、舊格式冇 `entries:` 行）→ 全部 exit 0，內容啱
- 🟢 `S-1404` `.github/workflows/import-catalog.yml`（Summary）：冇嘢加（0 個 wrangler step）時仍然寫「Next: open the ops page and **Publish**」，其實冇嘢要發佈；純文字

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T3
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "fix/api/au-017_import-insert-only"
context: "Batch round 2: Fix 1 (AU-017 @56e01af) pass, W-858 + S-1398/1399/1400 closed; Fix 2 (AU-015/016/019 @7fd5281, fix/ci/au-015-016-019_ci-deploy-gating) pass, S-1401 closed. Integration branch is main; merge Fix 1 first. Open: S-1402, S-1403 (main agent / user), S-1404 (cosmetic Summary text)."
```
