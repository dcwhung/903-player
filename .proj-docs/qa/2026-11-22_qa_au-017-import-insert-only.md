# QA — AU-017 Import catalog 預設只加未有 — 2026-11-22 — S1

- Tier: T1（PATCH：api 0.13.2，淨改 `scripts/importLibrary.mjs`，Worker 冇改）| Commit: `bc43de3`（branch `fix/api/au-017_import-insert-only`，未 push）| Verdict: ✅ pass
- Ledger（`impact --since ea89600` = merge-base `origin/main`）: SKIP 12（frozen, untouched）/ REVERIFY 3（api、coming-soon、repo-tooling）/ UNCOVERED 0 / IGNORED 2；S1 freeze 後仍列 3 條 REVERIFY 只因 S3 行 STALE，留俾下次 release S3
- Plan：`.proj-docs/qa/plans/api.md` 新增 AC-33（AC-4 加指向）；coming-soon / repo-tooling 沿用：淨係 `package-lock.json` 嘅 api workspace version（0.13.2，同 `apps/api/package.json` 一致），由 lint / `tsc -b` / `npm test` 證；Review: `.proj-docs/reviews/2026-11-22_review_p1-ci-import_batch.md`（兩輪，W-858、S-1398–S-1400 已關；報告隨 CI lane PR 入）

## Runs

| Command                                                                                              | Result                                                              | Time  |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----- |
| `npm run lint`                                                                                       | exit 0                                                              | 76 s  |
| `npx tsc -b`                                                                                         | exit 0                                                              | 36 s  |
| `npm run test -w apps/api`（workerd + scripts）                                                      | 27 files / 449 + 1 file / 40 綠                                     | 38 s  |
| `npm test`（root，全部 projects）                                                                    | 529 files / 5598 tests 綠                                           | 369 s |
| `apps/api` scripts config + `--coverage.include=scripts/importLibrary.mjs`                           | lines 96.96% / stmts 96.02% / branch 81.81%                         | 8 s   |
| 本機 smoke：scratch copy（`git archive HEAD`）`migrate:local` → `import -- --local …`（真 wrangler） | 7 個 migration apply；下面每個情境 exit 0，前後比 D1 全表 + R2 blob | 6 min |
| 壞 D1 回應：PATH 上假 `npx`（淨改 SELECT 嘅 stdout / exit code）跑 `node scripts/importLibrary.mjs`  | 5 個 case 全部 exit 1，wrangler 只叫過 SELECT，D1 / R2 冇變         | 1 min |

- e2e 冇跑：plan「AC-22 / AC-23 / AC-24」同一條規則（冇 player / admin 改動 → 唔跑 e2e）；今次連 Worker `src/` 都冇改，S1 只跑對應改動嘅 test。永遠冇跑 `--remote`，冇 Cloudflare call

## Scenarios（→ 證據；smoke = 上面本機 local D1，全表 = `entries` / `assets` 逐行 hash + R2 blob 數）

- 空 D1 → 全部加入：smoke `13 entries, 58 images (58 to upload)` / `entries: 13 to insert, 0 existing kept`，之後 D1 13 entries、58 assets、R2 58 blobs（59 個 wrangler step = 58 put + 1 SQL）
- Admin 改過嘅行唔郁、只加未有：smoke 改 `dramas/jim`（definition / images / `updated_at` 2026-01-01）、刪 `shows/waves` + 佢兩張圖嘅 assets 行、加 D1 獨有 `shows/admin-only` + 一行 `schedules` → 預設印 `(2 to upload)`、`1 to insert, 12 existing kept (1 differ …)`，`import.sql` 得 1 句 entries（`waves`，`DO NOTHING`）+ 2 句 assets；跑完 `jim` 三欄 byte 一樣、其餘 12 行 hash 一樣、`waves` 加返、`schedules` 冇變；unit「should leave a row admin changed untouched and still insert missing rows by default」「should only upload and record images of the entries it inserts by default」
- `--overwrite` 取代：smoke `0 to insert, 1 to overwrite, 12 unchanged` + `WARNING:` 行 → `jim` 變返 repo 版本（801 字、新 `updated_at`），其餘行（含 `updated_at`）同 `admin-only`、`schedules` 冇變；unit「should replace a row admin changed with overwrite and only touch rows that differ」
- 重跑 = no-op：預設重跑 `(0 to upload)`、`0 to insert`、0 個 wrangler step，全表一樣；`--overwrite` 重跑 `0 to overwrite, 13 unchanged`，SQL 照跑一次但全表一樣；unit「should stay a no-op when the default import is re-run over admin edits」「should write nothing by default when D1 already has every entry」
- Dry run 唔寫：空 D1 同 admin 改過嘅 D1 各跑預設 / `--overwrite` dry run，前後全表 + R2 一樣（只寫本機 `.import/import.sql`）；`CI=true … --dry-run </dev/null` exit 0 冇 prompt
- 印出嘅數 = 實際改動：每個真跑嘅 `to insert` / `to overwrite` / `to upload` 同 D1 行數、R2 put 數對得上（13 / 58；1 / 2；1 overwrite）
- 壞 D1 讀取 → exit 1、乜都唔寫：smoke entries 回 `[]` / `success: false`（`--overwrite`）/ `results` 唔係 array / wrangler exit 1、assets 回非 JSON → `unexpected D1 response to: …` 或 `… failed`、exit 1，冇 `r2 object put`、冇 `--file`；unit「should stop with exit 1 when wrangler fails」+ W-858 嗰組
- 第一行格式不變：`^[0-9]+ entries, ` 喺輸出只中一行（workflow Summary 嘅 grep）；unit「should keep the counts line first for the workflow summary」；參數錯照舊 exit 2 + usage

## Hard Gates

all pass（Coverage 見上；Security / Data：D1 寫入路徑由 smoke + miniflare test 證只 insert / 只 `--overwrite` 先改；PWA gate no；Performance n/a — 冇 API 改動）

## Findings

冇三層收斂嘅 🔴 / 🟡；Observation（唔 block）：

- `apps/api/README.md` Production 步驟寫 Import catalog workflow 有 **overwrite** 剔格，但呢個 branch 嘅 `.github/workflows/import-catalog.yml` 只得 `dry_run`（`grep -c overwrite` = 0）；個 input 屬 CI lane PR。要 main agent 定 merge 次序（CI lane 同批 / 先入），否則 README 會行先過 workflow

## Freeze

S1 @ `bc43de3`：`api` 158 → 158、`coming-soon` 163 → 163、`repo-tooling` 49 → 49；每條都畀晒成條 chain + stage 嘅檔，同 `origin/main` 比對 chain + stage + path 冇少行冇多行（4317 行）；hash 有變嘅行：api 5（plan、`package.json`、`importLibrary.{mjs,d.mts,test.ts}`）、兩條鏈嘅 `package-lock.json`；S3 行冇郁

## 建議補測

none — insert-only / overwrite / 重跑 / 壞回應 / 圖片範圍都有直接 unit（40 個），no edge case gap

```handoff-receipt
protocol: 1
status: pass
stage: S1
chain: api, coming-soon, repo-tooling
commit: bc43de3
ci_run: n/a
next_action: merge_ready
branch: "fix/api/au-017_import-insert-only"
context: "AU-017 S1 pass at bc43de3: lint / tsc / npm test 5598 / api 449 + 40 green; importLibrary.mjs lines 96.96%; real local D1 smoke (scratch copy, wrangler --local) covers empty D1, admin-edited row kept, --overwrite, re-run no-op, dry run, counts, bad D1 read exit 1 with no writes; no e2e (no Worker / app / UI change); 3 chains frozen S1, no rows lost; observation: README mentions workflow overwrite input that lands with CI lane PR; branch not pushed, no CI run yet"
```
