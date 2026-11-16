# QA — publish-change-accuracy（api / admin + 版本 bump）— 2026-11-14 — S1

- Tier: T2（api 0.12.0、admin 0.8.0 MINOR）| Commit: 8923806（branch `fix/publish-change-accuracy`）| Verdict: ✅ pass
- Ledger（`impact --since 2551277`）: SKIP 10 / REVERIFY 4（`admin` `api` `coming-soon` `repo-tooling`）/ UNCOVERED 11（全部歸入 `admin` / `api`）/ IGNORED 5
- `coming-soon` / `repo-tooling`：淨係 `package-lock.json` 嘅 `apps/admin` / `apps/api` version 欄（0.7.0→0.8.0、0.11.0→0.12.0），同 `package.json` 一致 → 照原清單重新 freeze，冇跑 test
- Plan：`.proj-docs/qa/plans/api.md` AC-30、`.proj-docs/qa/plans/admin.md` AC-29（今次新增）；來源 `.proj-docs/plans/2026-11-14_plan_publish-change-accuracy.md`（含實作差異）

## Runs

| Command                                                                                        | Result            | Time |
| ---------------------------------------------------------------------------------------------- | ----------------- | ---- |
| `packages/catalog`: `npx vitest run --coverage.enabled …include=src/admin/{changes,…}.ts`      | 881/881（38 檔）  | 3s   |
| `apps/api`: `npx vitest run --coverage.enabled …include=src/catalog/…,src/admin/…,revert`      | 423/423（25 檔）  | —    |
| `npm test -- --project @903-player/api-scripts`                                                | 12/12             | 2s   |
| `apps/admin`: `npx vitest run --coverage.enabled …include=<改動 src>`                          | 677/677（124 檔） | —    |
| `tsc -b` + `npm run lint` @8923806（main agent，同 SHA 引用）                                  | pass              | —    |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e -w apps/admin` @8923806（同 SHA 引用） | 55 checks, exit 0 | —    |

Changed-file coverage（lines）：catalog `changes` 100 / `editChanges` 100 / `rawDefinition` 95.3 / `reorderChanges` 100；api `selectDocument` 100 / `selectImages` 100 / `order` 100 / `orderRevert` 100 / `revert` 98.4；admin 最低 `HistoryPage.tsx` 93.1、`FieldRevert.tsx` 92，其餘 ≥ 95（`ReorderCard.tsx` 100）

## 用戶個案 → 證據

| 個案                                                   | 證據（全綠）                                                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 冇揀 / 未完成新短篇：冇假「圖片」改動、圖唔入 document | `apps/api/test/selectImages.test.ts`「drop an unselected never-published arc…」「drop an incomplete arc…」「keep a file a remaining slot…」                  |
| 換返上次版本嘅短篇用上次嘅圖                           | 同檔「use the last published images for the unselected arc」（`arcs/golden-02/tile.webp` = 舊圖）                                                            |
| 冇 slot 指去嘅檔唔報                                   | `packages/catalog/src/admin/editChanges.test.ts`「#4」「#3」                                                                                                 |
| 配色 key 次序唔同唔算已修改                            | `apps/admin/src/features/revert/revertScope.test.ts`「same values in another key order (#5)」                                                                |
| 拖曳 → 一張卡；還原 → 次序同上次發佈一樣               | `reorderChanges.test.ts`（一個 `reorder` item、冇逐個 edit）；`orderRevert.test.ts`（D1 `order` 換返 / 刪 key、409、entry revert 400）；e2e reorder 3 checks |
| 預覽同發佈一致                                         | `selectImages.test.ts`：`GET /api/changes` 預覽 items = 發佈後 `/api/publishes` 記錄 items                                                                   |
| 介面：卡、確認框、記錄行、淺紅還原掣、`Admin v0.8.0`   | 截圖（gitignored）`apps/admin/e2e/screenshots/{publish-reorder,reorder-revert-dialog,history-reorder}{,-dark}.png` 已逐張睇過                                |

## Hard Gates

all pass（PWA gate n/a：冇改 player `sw.js` / manifest / build；Security：新 endpoint 照 `/api/*` session + CSRF guard，`orderRevert.test.ts`「guard like PUT /api/order」）

## Findings

none（冇三層收斂嘅 🔴 / 🟡；冇 🟢 / Observation）

## 建議補測

- none（三個高風險邏輯 #1 #2 #6 已有 api / catalog test 覆蓋，no edge case gap）

## Freeze

`admin` S1、`api` S1、`coming-soon` S1、`repo-tooling` S1 @8923806（清單 = ledger 原有 chain + stage 行 + 新檔）
