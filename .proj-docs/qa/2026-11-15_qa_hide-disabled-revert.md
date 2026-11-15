# QA — admin（hide disabled revert, admin 0.8.1）— 2026-11-15 — S1

- Tier: T1 | Commit: 28652b2 | Verdict: ✅ pass
- Ledger（`impact --since 6dda2c1`）: SKIP 11 / REVERIFY 3（admin、coming-soon、repo-tooling）/ UNCOVERED 1（`AppearanceParts.test.tsx` → 併入 admin）/ IGNORED 3
- Plan: `.proj-docs/qa/plans/admin.md`（加 AC-30 + 對應 Commands 一行）
- coming-soon / repo-tooling 只因 `package-lock.json` 改咗：diff 淨係 `apps/admin` version 0.8.0 → 0.8.1，CI `npm ci` + lint / unit / build 綠 → 照原清單 re-freeze

## Runs

| Command                                                                                                        | Result                                      | Time |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---- |
| `npx vitest run --project @903-player/admin --coverage.enabled --coverage.provider=v8`                         | 125 files / 687 tests pass                  | 64s  |
| 同上 `--coverage.include='src/features/{revert,appearance}/**'` `--coverage.reporter=json-summary`（改動 src） | 見 Hard Gates                               | 40s  |
| CI run 43696742042 @ 28652b2（https://github.com/dcwhung/903-player/actions/runs/43696742042）                 | lint、unit、build、E2E 全 success           | —    |
| 其中 `npm run e2e:admin`（引用，唔重跑）                                                                       | 53 PASS / 0 FAIL，「admin e2e: all passed」 | —    |

相關 e2e check（CI log）：`revert: editor marks changed fields in place and reverts one`（未儲存時掣 detached、改返先再出）、`revert: publish page reverts one arc field via the dialog`、`App 外觀: change icon, rename app (confirm), restore, …`、`首頁 Banner: default, two-step crop, upload both, then restore with confirm`。

## AC-30 對應

| 要求                                              | 證據                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 編輯頁未儲存時還原掣隱藏、「已修改」保留          | `EditorRevert.test.tsx` 新 case + e2e revert（`waitFor({ state: 'detached' })`）                    |
| App 外觀 / Banner 用緊內建預設冇「還原」（C-023） | `IconCard` / `TextCard` / `BannerCard` / `AppearancePage` test + e2e App 外觀 / 首頁 Banner restore |
| 標籤行高度唔變（S-1012）                          | `revertStyles.node.test.ts`「revert button height」3 case；Chromium 量度見 review                   |
| 還原後 focus → 主掣 / h2（S-1013）                | `AppearanceParts.test.tsx` 4 case + `IconCard` / `TextCard` / `BannerCard` S-1013 case              |
| 確認框冇剔「還原 N 項」照舊灰（刻意）             | e2e revert dialog check 不變，pass                                                                  |

## Hard Gates

all pass — 改動 src coverage：`AppearanceParts.tsx` L 100 / B 94.44、`RevertButton.tsx` 100、`useEntryRevert.ts` 100（全部 ≥ 80%）。Security / Performance / PWA：n/a（純 admin UI，冇 auth / 輸入 / API / sw 改動）。

## Findings

None。

## 建議補測

- none（focus、高度、隱藏三條分支已有 unit + e2e；低風險 UI，冇 edge case gap）

## Freeze

- `admin` S1：ledger 原 436 行 + `apps/admin/src/features/appearance/AppearanceParts.test.tsx` = 437 行
- `coming-soon` S1：162 行；`repo-tooling` S1：26 行（清單同 parent 一樣）

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
chain: admin, coming-soon, repo-tooling
commit: 28652b2
report: .proj-docs/qa/2026-11-15_qa_hide-disabled-revert.md
next_action: main_agent_push_and_merge
blocking: none
tickets: none
context: admin 0.8.1 hide disabled revert. Unit 687/687, changed-src coverage >= 94%, CI 43696742042 green at 28652b2 (admin e2e 53 PASS). Ledger re-frozen (admin 437, coming-soon 162, repo-tooling 26 rows). Docs committed locally, not pushed.
```
