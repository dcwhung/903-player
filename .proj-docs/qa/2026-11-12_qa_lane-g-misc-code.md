# QA — lane-g-misc-code（api + ui-foundation）— 2026-11-12 — S1

- Tier: T1（純 refactor / format；`jsonSchemas.ts` 屬 T0 comment-only）| Commit: 1da1d29（HEAD 8443876 = + review 報告）| Verdict: ✅ pass
- Branch: `refactor/misc/S-856_lane-g-misc-code`；backlog Lane G：S-856、S-862、S-864、S-865
- Ledger（`impact --since $(git merge-base HEAD origin/main)` = 713cb85）: SKIP 12 / REVERIFY 2（`api`、`ui-foundation`）/ UNCOVERED 0 / IGNORED 6（review 報告 + `apps/player/scripts/arcCover/*`，見 `ledger-ignore`）
- SKIP（frozen、冇改）: admin bookmark card-zoom catalog-data coming-soon drama home mini-player player-core pwa-shell repo-tooling show-today-page
- Plans 沿用：`.proj-docs/qa/plans/api.md`、`.proj-docs/qa/plans/ui-foundation.md`（冇改）

## Runs

| Command                                                                                                                                                  | Result                                                            | Time |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---- |
| `npm test -- apps/api packages/catalog/src/schedule`（api plan）                                                                                         | 16 files / 309 tests 綠                                           | 10s  |
| `apps/api`: `npx vitest run --coverage.enabled --coverage.provider=v8 --coverage.include=src/assets/webp.ts`                                             | 217 綠；`webp.ts` lines 98.78% / branch 86.48%                    | ~15s |
| ui-foundation plan unit（30 個 test 檔 path filter）                                                                                                     | 43 files / 219 tests 綠                                           | ~15s |
| `npm test -- packages/catalog/src/document/catalogSchema.node.test.ts packages/catalog/src/core/jsonSchemas.node.test.ts`（`jsonSchemas.ts` 1-hop 用者） | 2 files / 278 tests 綠                                            | ~5s  |
| `typescript.transpileModule(removeComments)` 比較 `jsonSchemas.ts` base vs HEAD                                                                          | 輸出一樣（只改 comment，S-864）                                   | <1s  |
| arcCover（ignored，S-862 抽查）: `pytest tests/test_review.py tests/test_fetch_sources.py`（scratchpad venv）                                            | 42 passed + 25 subtests（`--app-root` / `--repo` 兩個 flag 都測） | <1s  |

- 引用（唔重跑，main agent 同 SHA 已跑）：root `npm run lint`、全 repo `npm test`、`npm run test -w apps/api`、arcCover pytest 103 + `ruff check` + `ruff format --check`（S-865）
- 唔跑：api plan 嘅本機 wrangler smoke（AC-13 等針對行為；今次 `webp.ts` 只係常數抽名，同 AC-21 S-794 做法一樣以現有 WebP unit 證）；ui-foundation e2e sections（唯一改動係 test helper 註解，AST 無變、唔入 bundle）

## Hard Gates

all pass（PWA gate n/a：冇掂 `sw.js` / manifest / build；Security / Performance n/a：冇行為改動）

## Findings

- 冇 🔴 / 🟡
- Observation：W-718（api 冇 bump version）— 用戶事前決定純 refactor 唔 bump（方案 B），PR description 寫明，唔計 finding

## 建議補測

- none（no edge case gap：純 refactor，現有 WebP / argparse alias test 已覆蓋）

## Freeze

- `freeze api S1`（成條 chain 100 行）、`freeze ui-foundation S1`（成條 chain 88 行）；ui-foundation S3 行留待 release（S3）
- Freeze 後 `impact`：api SKIP；ui-foundation 仍 REVERIFY，原因只係 S3 行（`jsonSchemas.ts` 舊 hash，同 main 已有嘅 S3 STALE 一樣）→ 下次 release S3 處理，唔屬 S1

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 12 / REVERIFY 2 / UNCOVERED 0"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "webp.ts 98.78%"
next_action: merge_main
next_agent: null
branch: "refactor/misc/S-856_lane-g-misc-code"
context: "T1 pure refactor/format; api S1 + ui-foundation S1 re-frozen @8443876; 0 blocking findings; W-718 no-bump per user (plan B); QA commit local only, not pushed"
```
