# QA — selective-publish（選擇發佈）— 2026-11-13 — S1

- Tier: T2 | Commit: `ba2b9af`（code = `31a766d`，之後淨改 review 報告）| Verdict: ✅ pass
- 範圍：`git merge-base HEAD origin/main`（`8e3423d`）..HEAD；SSoT `.proj-docs/plans/2026-11-13_plan_selective-publish.md`、mockup `_mockups_/admin-selective-publish/index.html`
- Ledger: SKIP 10（bookmark / card-zoom / catalog-data / drama / home / mini-player / player-core / pwa-shell / show-today-page / ui-foundation，frozen untouched）/ REVERIFY 4（admin、api、coming-soon、repo-tooling）/ UNCOVERED 26（api 8、admin 18）/ IGNORED 5
- Plan 新 AC：api AC-26、admin AC-22（coming-soon / repo-tooling 淨 `package-lock.json` 三個 workspace version 同步返 `package.json`（S-981），沿用 plan）

## Runs

| Command                                                      | Result                                                                                                                                                                                                                     | Time   |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `npm test -- apps/api packages/catalog/src/schedule`（本機） | 24 files / 463 tests pass（含 `selectivePublish.test.ts` 21 個 case）                                                                                                                                                      | 18 s   |
| `npm test -- apps/admin`（本機）                             | 111 files / 585 tests pass（含 `writtenChinese`）                                                                                                                                                                          | 50 s   |
| Changed-file coverage api（v8，12 個改動 src）               | lines 98.5%（445/452），全部 ≥ 93%                                                                                                                                                                                         | 17 s   |
| Changed-file coverage admin（v8，21 個改動 src）             | lines 89.9%（304/338）；< 80%：`App.tsx` / `main.tsx` 0%（入口 wiring）、`AdminData.tsx` 30%（改動 = import 搬位）、`endpoints.ts` 77%（淨刪行）                                                                           | 54 s   |
| CI `ci.yml` @ `31a766d`（run 43510493759，push）             | lint、`tsc -b`、unit（413 files / 4400 tests）、build、build:admin、production smoke、`npm run e2e`（「All E2E checks passed」）、`npm run e2e:admin`（48 PASS，包 3 個「selective publish」check）全綠 → 引用，唔重跑 e2e | 16 min |

## Hard Gates

all pass（coverage 四個 < 80% 檔嘅改動行淨係 provider / import / CSS import / 刪舊函數，由 CI `e2e:admin` 行到；PWA：唔掂 player `sw.js` / manifest / 更新邏輯，lockfile 淨 version；Security：`selection` server 再驗，未知 key 422、壞 body 400、超上限 413，由 unit 證）

## Findings

冇三層收斂嘅 🔴 / 🟡。

### 🟢 / Observation

- 冇

## Freeze

- S1 @`ba2b9af`：api 129 → 137、admin 372 → 390、coming-soon 162 → 162、repo-tooling 26 → 26（ledger 2297 → 2323 行；其他鏈行冇變）
- 同 freeze 前 ledger 比 chain + stage + path：四條鏈冇少行（新增 = 上面 26 個 UNCOVERED）；`apps/admin/CHANGELOG.md` 屬 IGNORED，照舊唔入；freeze 後 `impact` 淨 SKIP / IGNORED

## 建議補測

- none（S1 高風險邏輯 `selection.ts` / `selectDocument.ts` / `selectivePublish.ts` / `selectionModel.ts` 已 100% lines，W-740 已補）

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: ba2b9af
report: .proj-docs/qa/2026-11-13_qa_selective-publish.md
frozen: api S1 137, admin S1 390, coming-soon S1 162, repo-tooling S1 26
evidence: CI run 43510493759 @31a766d
tickets: none
next_action: main_agent_push_then_user_screenshots
context: "S1 pass for feature/selective-publish; CI 43510493759 @31a766d cited for lint / tsc / unit / build / e2e / e2e:admin (3 selective publish checks); local unit api 463 + admin 585 pass; changed-file coverage api 98.5% / admin 89.9%. QA report + plans + ledger committed locally, not pushed."
```

## S1 delta — 未完成 row（74c0451 / 185f41a / 06d8578，freeze @`27b5b0b`）

- Ledger: SKIP 13 / REVERIFY 1（admin：`PublishCell.tsx`、`TodoMatrix.test.tsx`、`selective.css`、`selectiveChecks.mjs`、mockup）/ UNCOVERED 0 / IGNORED 7；plan AC-22 改為「未完成 = 紅色（`--danger-ink`）、冇勾選框、tooltip + sr-only（S-989）」
- Runs：`npm test -- apps/admin` 111 files / 585 tests pass（46 s）；`PublishCell.tsx` coverage 100% lines / branches；CI `ci.yml` @`06d8578`（run 43515854072）lint、unit 4400、build、`e2e`、`e2e:admin` 48 PASS（3 個「selective publish」，包「incomplete row」冇 checkbox）全綠 → 引用，唔重跑 e2e
- Hard Gates all pass；Findings：冇（🟢 / Observation 都冇）；建議補測：none
- Freeze：admin S1 390 → 390（全條 chain + stage 清單）；ledger 2323 → 2323，chain + stage + path 冇少行、冇多行，其他鏈行完全冇變；freeze 後 `impact` 淨 SKIP / IGNORED
