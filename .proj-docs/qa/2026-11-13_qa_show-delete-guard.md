# QA — show delete guard（api 0.10.1 / admin 0.3.1 + C-015）— 2026-11-13 — S1

- Tier: T1（PATCH；`apps/api` DELETE 守衛 + `apps/admin` 節目編輯「刪除」）| Commit: `44bd62f`（review `8ca8f40`）| Verdict: ✅ pass
- Ledger（base `04d4911` = merge-base origin/main）: SKIP 11 / REVERIFY 4（`api` `admin` `coming-soon` `repo-tooling`）/ UNCOVERED 0 / IGNORED 5
- `coming-soon` / `repo-tooling`：STALE 只有 `package-lock.json`，diff 淨係 `apps/admin` `0.3.0 → 0.3.1`、`apps/api` `0.10.0 → 0.10.1` 兩行 version → 沿用 plan 重新 freeze（成條 chain + stage），冇額外驗
- C-015：`.gitignore` `node_modules/` → `node_modules`（symlink 都 ignore）；`.gitignore` 屬 IGNORED；`git ls-files | grep node_modules` = 0 行
- Plan：`plans/api.md` 加 AC-27、`plans/admin.md` 加 AC-23（節目刪除規則）
- e2e：本機唔跑 — CI 同 SHA `44bd62f` run 43520215466 綠（包括 E2E job），引用

## Runs

| Command                                                                                    | Result                                          | Time |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------- | ---- |
| `npm test -- apps/api apps/admin`                                                          | 133 files / 972 pass                            | 62 s |
| coverage `apps/api`（v8，`content/entries.ts` `content/published.ts`）                     | 373 pass；見 Hard Gates                         | —    |
| coverage `apps/admin`（v8，`src/features/shows`，`useShowEditor.ts` `ShowEditorCard.tsx`） | 17 pass；見 Hard Gates                          | —    |
| CI `ci.yml` run 43520215466 @ `44bd62f`                                                    | success（lint / tsc / unit / build ✅，E2E ✅） | 18 m |

- 註：run 43519389012 @ `0a4ca1f`（`tsc -b` fail）已被 `44bd62f` 取代，唔計

## 驗證要點（L2，對 api AC-27 / admin AC-23）

- api `entries.test.ts`「should delete a show that only ever went out as 下架」：最新 document 有 `"abc"`（`enabled: false`）→ DELETE 204 → 再 publish 200（唔撞 ID 守衛）— 綠
- api「should still refuse a show that was listed once and is now 下架」→ 409；原有壞 document（S-844 fail closed）409、劇 DELETE test 照綠
- admin `ShowEditor.test.tsx`：`published = false` → 有「刪除」；`published = true` → 「已發佈的項目不可刪除。」— 綠
- 規則一致：api `blocksDelete` 用 `publishedFacts` + `isInIndex`（同 AC-19 列表 `published`）；admin `deletable = isNew || never || published === false`

## Hard Gates

all pass。Coverage（lines）：`entries.ts` 100、`published.ts` 100、`useShowEditor.ts` 100、`ShowEditorCard.tsx` 100。Security / data：DELETE 守衛只放寬「從未以上架狀態發佈」嘅節目；document 讀唔到照拒絕（L2 test）

## Findings

- 冇 🔴 / 🟡 / 🟢

## 建議補測

- none（兩邊規則各有正反 test；fail closed 原有 test 覆蓋）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: api S1 (AC-27), admin S1 (AC-23), coming-soon S1, repo-tooling S1 (lockfile version lines only) — re-frozen, full chain + stage
tickets: none
ci: 43520215466 @ 44bd62f (success, incl. E2E)
next_action: main agent pushes 8ca8f40 + QA commit together (code CI finished), then merge main → scripts/qa/ledger-merge.mjs
context: T1, 0 findings, no new IDs used (S-993+ free); e2e cited from CI, not re-run
```
