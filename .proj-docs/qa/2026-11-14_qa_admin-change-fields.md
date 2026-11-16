# QA — admin change fields（admin 0.5.0）— 2026-11-14 — S1

- Tier: T1（MINOR 單一模組；確認發佈「本次發佈」卡 + 時間線「修改」寫埋改咗嘅欄位，api 不變）| Commit: `3d36e02`（review `2936532`）| Verdict: ✅ pass
- Ledger（base = merge-base origin/main `b5d6f9b`）: SKIP 11 / REVERIFY 3（`admin` `coming-soon` `repo-tooling`）/ UNCOVERED 2（`changeFields.ts` `changeFields.test.ts` → 加入 `admin`）/ IGNORED 2
- `coming-soon` / `repo-tooling`：STALE 只有 `package-lock.json`，diff 淨係 `apps/admin` `0.4.0 → 0.5.0` 一行 version → 沿用 plan 重新 freeze（成條 chain + stage），冇額外驗
- Plan：`plans/admin.md` 加 AC-25（修改欄位）+ 對應 command
- e2e：本機唔跑 — CI 同 SHA `3d36e02` run 43530160986 綠（包括 E2E job 嘅 `e2e` + `e2e:admin`），引用

## Runs

| Command                                                                                                   | Result                                     | Time |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---- |
| `npm test -- apps/admin`                                                                                  | 596 / 596 pass                             | 45 s |
| coverage `--project @903-player/admin`（v8，json-summary）                                                | 見 Hard Gates                              | —    |
| CI `ci.yml` run [43530160986](https://github.com/dcwhung/903-player/actions/runs/43530160986) @ `3d36e02` | success（changes / lint+unit+build / E2E） | 20 m |

- 註：run 43529621350 @ `b35a80f` cancelled（`concurrency`，被 `3d36e02` 取代），唔計

## 驗證要點（L2，對 admin AC-25）

- `changeFields.test.ts`：頂層欄位標籤（`fields.*` / `changeFields.*`）、`arcs.<短篇>.<key>` 按短篇名分組 + `；`、短篇 `episodes` = 「各集標題」（W-742）、認唔到 = 「其他」、重複合併、非修改 = 空字串 — 綠
- `PublishPage.test.tsx`：「本次發佈」卡出「修改 · 劇名（…）」— 綠；`Timeline.test.tsx`：修改行灰字欄位、冇欄位唔出 — 綠
- `writtenChinese.test.ts`：新 `changeFields.*` / `publish.editedFields` 書面語 — 綠
- e2e「selective publish」App 外觀 check（CI 綠）：卡 `修改 · 蘭茜夫人劇場（配色、簡介）` + `.timeline` `配色、簡介` 都 `waitFor` 到

## Hard Gates

all pass。Coverage（lines / branch）：`changeFields.ts` 100 / 100、`SelectionCard.tsx` 100 / 82.1、`Timeline.tsx` 90.9 / 85（未行到 line 62 = 原有「顯示全部」掣，唔係今次改動）。Security / data：n/a（純顯示，api 不變）

## Findings

- 冇 🔴 / 🟡 / 🟢

## 建議補測

- none（純 formatter；分組 / alias / fallback 已有 unit，卡 + 時間線各有 unit + e2e）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: admin S1 (AC-25, + changeFields.ts / changeFields.test.ts), coming-soon S1, repo-tooling S1 (lockfile version line only) — re-frozen, full chain + stage
tickets: none
ci: 43530160986 @ 3d36e02 (success, incl. E2E)
next_action: main agent pushes 2936532 + QA commit together (code CI finished), then merge main → scripts/qa/ledger-merge.mjs
context: T1, 0 findings, no new IDs used (S-996+ free); e2e cited from CI, not re-run
```
