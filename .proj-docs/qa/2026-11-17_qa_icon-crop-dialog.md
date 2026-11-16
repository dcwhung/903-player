# QA — icon-crop-dialog（admin 0.9.1）— 2026-11-17 — S1

- Tier: T1 | Commit: 40f818d | Verdict: ✅ pass
- Base: `caceff5`（`git merge-base HEAD origin/main`）；review `.proj-docs/reviews/2026-11-17_review_icon-crop-dialog.md`（pass 100）
- Ledger: SKIP 11 / REVERIFY 3（`admin`、`coming-soon`、`repo-tooling`）/ UNCOVERED 3（新 test 檔：`IconCanvas.test.tsx`、`IconCropSource.test.tsx`、`iconCrop.node.test.ts` → 歸 `admin`）
- `coming-soon` / `repo-tooling` REVERIFY 淨係因為 `package-lock.json`：diff 只係 `apps/admin` workspace `0.9.0 → 0.9.1` 一行，依賴解析版本冇變（repo-tooling AC-3）→ 照 plan 重新 freeze，唔使跑佢哋嘅 test
- Plan: `.proj-docs/qa/plans/admin.md` 加 AC-33 + 對應 Commands 行（沿用，冇重寫）

## Runs

| Command                                                                                                                                  | Result                                                                             | Time  |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----- |
| `npm test`（full，@40f818d）                                                                                                             | 467 files / 4816 tests 全綠                                                        | 138 s |
| `npx vitest run --project @903-player/admin --coverage.enabled --coverage.provider=v8 --coverage.include=<4 個改動 src> …/appearance`    | lines 100%（`IconCropSource.tsx` `IconCanvas.tsx` `iconModel.ts` `iconRender.ts`） | ~20 s |
| CI run [43977993211](https://github.com/dcwhung/903-player/actions/runs/43977993211) @`e91f0ec`（lint、unit、build、e2e 含 `e2e:admin`） | success（引用，唔重跑）                                                            | —     |

- 引用理由：`e91f0ec..40f818d` 只改 `IconCropSource.test.tsx`（+1 unit test，S-1101）、`_mockups_/admin-appearance/index.html`（S-1100）同 review 報告；產品 code 同 e2e 一樣。`assertDimClipped`（`.dim` 同原圖一樣大、`overflow: hidden`、`.box` 冇陰影、拉柄看得見）喺嗰個 run 已跑
- 40f818d 自己嘅 CI run 43980888239 喺 QA 時仲 `in_progress`；main agent push 前要等佢完

## AC 對照（admin AC-33）

- 暗位裁走原圖外、唔再成個 dialog 變暗、Android 圓框冇大弧 → `iconCrop.node.test.ts` + e2e `assertDimClipped`（CI）
- Locked 冇 `.dim`（S-1101）→ `IconCropSource.test.tsx` 新 case
- Maskable 輸出 + Android 預覽畫滿（option b、冇 82% 縮細）→ `iconRender.test.ts`、`IconCanvas.test.tsx`、`iconPreviews.node.test.ts`
- Mockup full-bleed（S-1100）→ Design Origin 已重新 freeze 入 `admin` 鏈

## Hard Gates

all pass（PWA gate n/a：admin 冇 service worker / manifest；Security / Performance n/a：冇 auth / API 改動）

## Findings

none

## Freeze

- `admin` S1 459 檔（原 456 + 3 個新 test）、`coming-soon` S1 163、`repo-tooling` S1 27 @40f818d；同 freeze 前 ledger 比對 chain + stage + path 冇少行；`impact --since caceff5` 之後全部 SKIP

## 建議補測

- none（S1 低風險繪圖 / CSS，改動檔 line coverage 100%）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: admin, coming-soon, repo-tooling (frozen @40f818d)
report: .proj-docs/qa/2026-11-17_qa_icon-crop-dialog.md
evidence: npm test 4816/4816 @40f818d; CI 43977993211 @e91f0ec (e2e incl.)
tickets: none
backlog: none
next_action: main agent wait for CI 43980888239 on 40f818d, then push QA commit
```
