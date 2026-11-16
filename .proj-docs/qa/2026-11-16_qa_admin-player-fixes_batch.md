# QA — admin / player fixes（T1–T8）— 2026-11-16 — S1 batch

- Tier: T2（8 個 fix，3 條 lane）| Commit: `10ca892` | Verdict: ✅ pass
- Branch: `claude/admin-player-fixes-6fzdtw`；base `7ff599b`（`git merge-base HEAD origin/main`）；review re-review ✅ pass（`.proj-docs/reviews/2026-11-16_review_admin-player-fixes_batch.md`）
- Ledger: SKIP 7（api、bookmark、card-zoom、catalog-data、mini-player、player-core、pwa-shell 已凍結冇改）/ REVERIFY 7（admin、drama、show-today-page、home、coming-soon、ui-foundation、repo-tooling）/ UNCOVERED 20 → 歸入 admin（11）、drama + show-today-page（Sheet 5 個 + sheet CSS test 2 個）、show-today-page（ⓘ / 清單底 CSS test 2 個）
- Plans：admin AC-31、drama AC-13、show-today-page AC-6（新增）；home / coming-soon / ui-foundation / repo-tooling 沿用（只係 1-hop / token / version 改動）

## Runs

| Command                                                                                                             | Result                            | Time  |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----- |
| `npm test`（root，包晒 7 條鏈 plan 列嘅 unit）                                                                      | 461 files / 4750 tests 綠         | 174 s |
| `apps/admin` `vitest run src/features/{update,history,editor} …` `--coverage.include=<改動 src>`                    | 41 files / 260 tests；lines 98.7% | 21 s  |
| `apps/player` `vitest run Sheet/ ItemInfo/ ArcSheet/ PlayerPanel/` `--coverage.include=Sheet/*`                     | 13 files / 164 tests；lines 100%  | 10 s  |
| CI run 43919921455 @ `10ca892`（lint + unit + build、player e2e「All E2E checks passed」、admin e2e「all passed」） | success（引用，冇本地重跑 e2e）   | —     |

## Scenarios（每個 fix → 證據）

- T1 nav pill：`Nav.test.tsx` + `pendingModel.test.ts`（todo + 其他改動 + App 外觀合計）✅
- T4 其他改動 / EmptyNote：`UpdatePage.test.tsx`（載入中… / 有其他改動唔出 / 沒有待發佈的項目。）+ `writtenChinese.test.ts` ✅
- T2 刪除：`DeleteEntry.test.tsx`（成功 → `mutate` 移除 + `navigate(replace)`；失敗留頁）+ `useResource.test.ts` ✅
- T3 Stepper：`Stepper.test.tsx` + `usePublishPlan.test.tsx` + `SelectionFooter.test.tsx`（同一個 `path`；未載入 / 失敗 / 冇揀 → 唔係 link）✅
- T5 deploy pill：`DeployCell.test.tsx` + `deployModel.test.ts`（部署中 / 失敗 / 不明 = link + `noopener`，已部署 = pill，無需部署 = null）✅
- T6 sheet：`useSheetPresence.test.tsx`（滑落後先 unmount、reduced motion 即閂、600 ms 後備）+ `ItemInfoSheet` / `ArcSheet` 撳外面閂 + W-777 再開 case + `sheetMotion.node.test.ts`；CI e2e `arcSheet.mjs` / `itemInfo.mjs` ✅
- T7 ⓘ 位置：`gaugeInfoPosition.node.test.ts`（`--gauge-info-room`）✅；窄橫向唱片略細 = 用戶接受
- T8 safe area：`listBottomInset` / `sheetBottomInset` / `miniPlayerShadow` node test（`--safe-area-bottom-visible`）✅
- Versions：admin 0.8.3、player 1.37.1（`package.json` + lockfile）✅

## Hard Gates

all pass（Coverage：admin 改動檔 lines ≥ 89%（`useResource.ts` 89.5%），player Sheet 100%；PWA gate n/a：冇改 `sw.js` / manifest / 更新邏輯）

## Findings

- 冇 🔴 / 🟡
- Observation：admin coverage 要喺 `apps/admin` 入面跑先量到數（root projects 下報 0%，review 已提）；唔影響 gate

## 手動 follow-up（唔 block）

- T2 真 backend（Worker + D1）刪除 → 返列表 → 背景 `refresh()` 唔會令已刪項目閃返出嚟
- T8 iOS standalone（加到主畫面）真機：清單 / sheet 底同 home indicator 唔重疊、mini player 位置
- T6 真機觸控：拉走 sheet 之後即刻再開（W-777）手感

## 建議補測

- none（每個 fix 已有直接 unit / node test；高風險邏輯 `pendingModel` / `usePublishPlan` / `deployModel` 已 100%）

## Freeze

- S1：admin、drama、show-today-page、home、coming-soon、ui-foundation、repo-tooling（檔案清單 = ledger 現有 chain + S1 行 + 今次 UNCOVERED 歸入嘅檔）
- 未郁：drama / show-today-page / home / ui-foundation 嘅 S3 行（早已 STALE：舊 monorepo 前 path，留待 release S3）；所以 freeze 後 `impact` 仍列 drama / show-today-page / ui-foundation REVERIFY，係 S3 行，唔係 S1
- 核對：freeze 前後 ledger 比對 chain + stage + path，0 行消失，admin S1 +12（11 個 UNCOVERED + `CHANGELOG.md`）

```handoff-receipt
agent: quality-assurance
stage: S1
scope: batch T1–T8（branch claude/admin-player-fixes-6fzdtw @ 10ca892）
status: pass
hard_gates: { tests: pass, coverage: pass, no_blocking_finding: pass, pwa_update: n/a, security_data: pass, performance: n/a }
findings: { critical: [], warning: [], suggestion: [] }
tickets: []
next_action: main_agent_push_and_merge
context: 'npm test 4750/4750；CI 43919921455 @ 10ca892 全綠（e2e 引用）；7 條鏈 S1 freeze；報告 + ledger + 3 份 plan 只 commit 未 push。手動 follow-up：T2 真 backend 刪除、T8 iOS standalone safe area、T6 真機拉走再開。'
```
