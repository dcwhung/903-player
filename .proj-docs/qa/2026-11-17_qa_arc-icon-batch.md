# QA — arc / icon batch（A / B / C）— 2026-11-17 — S1 batch

- Tier: T2（admin 0.9.0、api 0.13.0、D1 migration `0007`）| Commit: `c3be8ce` | Verdict: ✅ pass
- Branch: `claude/admin-player-fixes-6fzdtw`；base `703b95b`（`git merge-base HEAD origin/main`）；review ✅ pass 100（`.proj-docs/reviews/2026-11-17_review_arc-icon-batch.md`；S-1096 / 1097 / 1098 Observation 結案，S-1099 已喺 `c3be8ce` 修）
- Ledger: SKIP 10（bookmark、card-zoom、catalog-data、drama、home、mini-player、player-core、pwa-shell、show-today-page、ui-foundation）/ REVERIFY 4（admin、api、coming-soon、repo-tooling）/ UNCOVERED 11 → 歸入 admin（7）、api（4）
- Plans：admin AC-32、api AC-31（新增）；coming-soon / repo-tooling 沿用（淨係 `package-lock.json` 兩個 workspace version）

## Runs

| Command                                                                                                             | Result                                    | Time  |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----- |
| `npm test`（root，全部 projects）                                                                                   | 464 files / 4806 tests 綠                 | 149 s |
| `npm run test -w apps/api`（workerd + scripts）                                                                     | 27 files / 447 + 1 file / 12 綠           | 19 s  |
| `apps/admin` `vitest run src/features/{appearance,dramas,update} src/app src/styles src/api` + 改動 src coverage    | lines 96.4% / stmts 93.8%                 | 35 s  |
| `apps/admin` 全部 + `--coverage.include=src/ui/CropDialogParts.tsx`                                                 | 772 tests；lines 100%                     | 60 s  |
| `apps/api` `--project @903-player/api` + 改動 src coverage                                                          | 447 tests；lines 99.6% / branch 94.8%     | 20 s  |
| `npm ls --depth=0`；lockfile vs `apps/{admin,api}/package.json` version                                             | exit 0；0.9.0 / 0.13.0 一致               | 2 s   |
| CI run 43966063612 @ `9f777d7`（lint + unit + build、player e2e「All E2E checks passed」、`admin e2e: all passed`） | success（引用；`c3be8ce` 淨加 unit test） | —     |

## Scenarios（每個 item → 證據）

- A 未發佈短篇排程：`ScheduleTab.test.tsx`「should not lock any episode as listed and show the not-published notice」+「should move episode 1 onwards when rescheduled, without the stale listed batches」；`scheduleModel` / `stripModel` / `timelineModel` unit；CI e2e `liveArcs` 排程 section ✅
- B API：`brandingSource.test.ts`（PNG / JPEG / WebP 原圖 201、重複 200、415 / 422 / 413、`source` 存取 + 清走、未上載 422、DELETE 後唔入 `catalog.json`；migration 0007 經 `applyMigrations.ts`）✅
- B Admin：`IconCard.test.tsx`（iPhone / Android preview 開對應裁切、由已存原圖儲存保留其他裝置框、冇原圖用 512 + 提示、內建 repo 原圖、原圖載入失敗）+ `useIconUpload.test.ts`（S-1099 兩條失敗路）+ `appIcon.node` / `iconPreviews.node`；CI e2e `iconRecropChecks.mjs` ✅
- C 待辦矩陣：`TodoMatrix.test.tsx`「should put 簡介 before 排期 in the header」+「should title the section 新內容 without a selection hint」✅；書面語 `writtenChinese.test.ts` 綠；Versions：admin 0.9.0、api 0.13.0（`package.json` + lockfile）✅

## Hard Gates

all pass（Coverage：改動檔 lines 全部 ≥ 83%（最低 `ArcSchedule.tsx` 83.3%）；Security：新 route 喺 `requireSameOrigin` + `requireSession` 之下，415 / 422 / 413 有 test；PWA gate n/a：冇改 player `sw.js` / manifest；Performance n/a）

## Findings

- 冇 🔴 / 🟡
- Observation：`ArcSchedule.tsx` funcs 57%（lines 83%）— 未覆蓋係原有 handler，唔屬今次改動行；唔影響 gate

## 手動 follow-up（唔 block）

- Production D1 migration `0007` 要由 Deploy API apply 咗，先喺 admin 用重新裁切
- 用戶將「戀愛後二分一」重新排期到 2027-01-01 再發佈

## 建議補測

- none（A 嘅 `scheduleModel` / `stripModel` 高風險邏輯已有直接 unit；S-1099 已補）

## Freeze

- S1：admin、api、coming-soon、repo-tooling（檔案清單 = ledger 現有 chain + S1 行 + 今次 UNCOVERED 歸入嘅檔 + plan）
- 核對：freeze 前後 ledger 比對 chain + stage + path，0 行消失；admin S1 +7、api S1 +4

```handoff-receipt
agent: quality-assurance
stage: S1
scope: batch A / B / C（branch claude/admin-player-fixes-6fzdtw @ c3be8ce）
status: pass
hard_gates: { tests: pass, coverage: pass, no_blocking_finding: pass, pwa_update: n/a, security_data: pass, performance: n/a }
findings: { critical: [], warning: [], suggestion: [] }
tickets: []
next_action: main_agent_push_and_merge
context: 'npm test 4806/4806；api 447 + 12；CI 43966063612 @ 9f777d7 全綠（e2e 引用）；admin / api / coming-soon / repo-tooling S1 freeze；報告 + ledger + 2 份 plan 只 commit 未 push。手動 follow-up：production D1 0007、戀愛後二分一 重排 2027-01-01 再發佈。'
```
