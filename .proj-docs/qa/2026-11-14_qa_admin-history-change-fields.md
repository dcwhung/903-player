# QA — admin history change fields（admin 0.5.1）— 2026-11-14 — S1

- Tier: T1（PATCH 單一模組；發佈 / 部署記錄「修改」pill 用確認發佈頁同一套欄位標籤 + 長 pill 換行）| Commit: `fb91de1`（re-review `484cddb`）| Verdict: ✅ pass
- Ledger（base = merge-base origin/main `4dcaafe`）: SKIP 11 / REVERIFY 3（`admin` `coming-soon` `repo-tooling`）/ UNCOVERED 1（`apps/admin/src/styles/historyPill.node.test.ts` → 加入 `admin`）/ IGNORED 2
- `coming-soon` / `repo-tooling`：STALE 只有 `package-lock.json`，diff 淨係 `apps/admin` `0.5.0 → 0.5.1` 一行 version → 沿用 plan 重新 freeze（成條 chain + stage），冇額外驗
- Plan：`plans/admin.md` 加 AC-26（記錄頁修改欄位）+ 對應 command
- e2e：本機唔跑 — CI 同 SHA `fb91de1` run 43534288229 綠（包括 E2E job），引用

## Runs

| Command                                                                                                   | Result                                     | Time |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---- |
| `npm test -- apps/admin`                                                                                  | 598 / 598 pass（113 files）                | 43 s |
| coverage `--project @903-player/admin`（v8，json-summary）                                                | 見 Hard Gates                              | —    |
| CI `ci.yml` run [43534288229](https://github.com/dcwhung/903-player/actions/runs/43534288229) @ `fb91de1` | success（changes / lint+unit+build / E2E） | 18 m |

- 註：run 43533710259 @ `8361683` cancelled（`concurrency`，被 `fb91de1` 取代），唔計

## 驗證要點（L2，對 admin AC-26）

- `historyModel.test.ts`：修改 pill = `editFieldsText`，認唔到嘅 key 寫「其他」（之前原文 `zzz`）— 綠
- `HistoryRow.test.tsx`：`detail.fields: ['theme', 'summary']` → 「配色、簡介」，冇 `theme` — 綠
- `historyPill.node.test.ts`：`.hist-row .changes .pill` 有 `white-space: normal` + `max-width`（S-996）— 綠
- e2e「selective publish」App 外觀 check（CI 綠）：發佈後記錄頁 `.hist-row .changes`「配色、簡介」剛好一次、冇 `theme`

## Hard Gates

all pass。Coverage（lines / branch）：`historyModel.ts` 96 / 82.1、`HistoryRow.tsx` 100 / 88.9、`changeFields.ts` 100 / 100。Security / data：n/a（純顯示，api 不變）

## Findings

- 冇 🔴 / 🟡 / 🟢

## 建議補測

- none（純顯示；標籤邏輯沿用 `changeFields.ts` 已有 unit，pill 有 unit + CSS guard + e2e）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: admin S1 (AC-26, + historyPill.node.test.ts), coming-soon S1, repo-tooling S1 (lockfile version line only) — re-frozen, full chain + stage
tickets: none
ci: 43534288229 @ fb91de1 (success, incl. E2E)
next_action: main agent pushes 484cddb + QA commit together (code CI finished), then merge main → scripts/qa/ledger-merge.mjs
context: T1, 0 findings, no new IDs used (S-999+ free); e2e cited from CI, not re-run
```
