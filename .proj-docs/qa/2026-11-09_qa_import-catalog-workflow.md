# QA — Import catalog workflow（`api` 鏈）— 2026-11-09 — S1

- Tier: T1（新手動 workflow + `apps/api` 0.1.0 → 0.1.1 PATCH；player 冇改）| Code commits: `80ca26f` + `76fd072`（C-012 fix）；`8372545` / `fdf40f8` 淨 review docs | Verdict: ✅ pass
- L1：用戶要求（冇 local clone 都可以 import）；`apps/api/README.md`「Import」；review `.proj-docs/reviews/2026-11-09_review_phase2a-backend.md`（80ca26f fail 85 → re-review 76fd072 pass 100）；plan `.proj-docs/qa/plans/api.md` 新增 AC-9 + scope 加 `import-catalog.yml`
- Ledger（`impact --since be8575f` = `git merge-base HEAD origin/main`）：SKIP 10 / REVERIFY 3（api、repo-tooling、coming-soon）/ UNCOVERED 1（`.github/workflows/import-catalog.yml` → 歸 `api`，同 `deploy-api.yml` 一齊）/ IGNORED 6
- repo-tooling / coming-soon 只係因為 ledger 有 `package-lock.json`：lockfile diff 淨係 `apps/api` `"version": "0.1.0"` → `"0.1.1"` 一行，0 個依賴改動 → 沿用 ledger S1 path 重新 freeze，冇跑佢哋嘅 test

## Runs

| Command                                                                          | Result                                                                                                                                                                        | Time |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| CI run 42707120638 @ `76fd072`（引用，冇重跑）                                   | 全 success：Lint, unit & build（unit 257 files / 3027）、E2E 779 PASS / 0 FAIL（PWA 換版綠）                                                                                  | —    |
| `python3 yaml.safe_load` workflow                                                | `on` 只得 `workflow_dispatch`（`dry_run` boolean default true）；`permissions: contents: read`；`concurrency` `import-catalog` / cancel false；job `defaults.run.shell: bash` | 1 s  |
| 同上：逐 step `env`                                                              | `CLOUDFLARE_*` 只喺 `Import`；`Require main` 只有 `REF`；`Summary` 只有 `DRY_RUN`；`Summary` 冇 `if:`（= `success()`）                                                        | —    |
| 抽 3 個 `run:` → `bash --noprofile --norc -eo pipefail`（`env -i` + stub `npm`） | 6 個 case 全對（見下）                                                                                                                                                        | 2 s  |
| `CI=true npm run import -w apps/api -- --local --dry-run </dev/null`             | exit 0、冇 prompt；stdout `13 entries, 58 images (0 to upload)` + 1 行 `wrangler d1 execute …`；`apps/api/.wrangler/` 前後 `diff -rq` 一樣                                    | 2 s  |
| 上面真 log → Summary step                                                        | `13 entries, 58 images (0 to upload)`、`wrangler steps …: 1` → grep pattern 同 script 真輸出夾                                                                                | <1 s |
| `npm test -- apps/api`                                                           | 6 files / 63 pass                                                                                                                                                             | 5 s  |

- Guard：`REF=refs/heads/claude/x` → `::error::Import catalog only runs on main …`，exit 1
- dry_run `true` → stub 收到 `run import -w apps/api -- --remote --dry-run`；`false` → `-- --remote`（冇 `--dry-run`）；summary 標題 / 尾句跟 dry / real 分開
- Import 失敗（stub exit 3）→ step exit 3（pipefail，`import.log` 照寫）；同一 script 用舊預設 `bash -e` → exit 0 = C-012 原本症狀，證 `76fd072` 修正有效；Summary 無 `if:` → 前一步 fail 就跳過
- 空 log → `counts not found` + `wrangler steps …: 0`，exit 0
- 臨時檔全部喺 scratchpad；`apps/api/.dev.vars` 本身冇，冇建立；`git status` 乾淨（只有本報告 / plan / ledger / index）

## Hard Gates

all pass（Tests：CI unit + e2e 綠 + 本地 api 63 + workflow harness；Coverage：n/a，改動係 YAML / docs / version；Security：secrets 只入 Import step、`contents: read`、main-only；PWA / Performance：n/a）

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- Observation：真 workflow（GitHub runner + production secrets）merge 前跑唔到 → 列為 S2 / UAT：merge 後先等 Deploy API 綠 → Run（dry run）睇 Summary → 剔走 dry run 再 Run → ops 頁 Publish
- review S-781 已喺 backlog，唔再提

## 建議補測

- none（workflow 冇 unit harness；本次 L2 用 stub 執行 `run:` block，唔值得為一個手動 workflow 加長期 test）

```handoff-receipt
status: pass
stage: S1
chain: api (+ import-catalog.yml, plan AC-9), repo-tooling, coming-soon (lockfile version line only)
commit: 76fd072
next_action: main_agent_push_then_merge
context: "S1 pass @76fd072; workflow L2 via extracted run blocks under bash -eo pipefail (guard exit 1, dry/real args, fail→exit 3 vs old bash -e exit 0, empty-log summary); local dry-run exit 0 no prompt; api 63/63; CI 42707120638 all green (unit 3027, e2e 779/0); 3 chains S1 re-frozen; S2/UAT = real dry run → real import → Publish after merge"
```
