# QA — api 0.7.2 lane B backlog — 2026-11-12 — S1

- Tier: T1（api only，PATCH）| Commit: `ceb93d0` | Verdict: ✅ pass
- Handled: S-849、S-825、S-794、S-778（review `.proj-docs/reviews/2026-11-12_review_api-lane-b-backlog.md`，pass 100）
- Ledger（base `450e5d4` = merge-base origin/main）: SKIP 12 / REVERIFY 3（`api` `coming-soon` `repo-tooling`）/ UNCOVERED 0 / IGNORED 2（review 報告、`apps/api/README.md`）
- `coming-soon` / `repo-tooling`：淨係 `package-lock.json` 嘅 `apps/api` version `0.7.1 → 0.7.2` 一行，冇行為改動 → 沿用 plan 重新 freeze，冇額外驗
- E2E：冇（`api` 鏈冇 player e2e；admin 鏈 SKIP）
- Plan：`plans/api.md` 加 AC-20

## Runs

| Command                                                                                                          | Result                                                                                             | Time |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---- |
| `npm run lint`、`npm test`、`npm run test -w apps/api`、`tsc -b`（main agent 已跑，引用）                        | lint ok / 353 files 3789 tests pass / api 13 files 217 + 12 / ok                                   | —    |
| `apps/api`: `npx vitest run --coverage.enabled --coverage.provider=v8`（include `next.ts` `webp.ts` `store.ts`） | 全綠；coverage 見 Hard Gates                                                                       | 14 s |
| `node -e` WHATWG `new URL(p, origin).pathname`（S-825 前提）                                                     | 見下                                                                                               | <1 s |
| CI `ceb93d0` run [43230669865](https://github.com/dcwhung/903-player/actions/runs/43230669865)                   | 寫報告時 `in_progress`：lint、tsc、unit、build ✅；build:admin / e2e 未完 → main agent push 前確認 | —    |

## 驗證要點（L2）

- S-825：瀏覽器 normalise 確實會行返 `/auth`：`/x/../auth/me → /auth/me`、`/x/%2e%2e/auth/me → /auth/me`、`/x/.%2E/auth → /auth`；`/shows?q=../auth → /shows`、`/dramas/a..b` 唔變 —— 同 `apps/api/test/auth.test.ts`「should fall back to / for paths with dot-segments…」/「should keep dots that are not whole path segments…」兩邊 case 一致，全綠
- S-849：`apps/api/test/entries.test.ts`「published facts edge cases (S-849)」3 個 test（failed publish、舊 ok 壞 JSON 仍 200、每日播冇 `publishedArcs`）全綠；main agent mutation（拎走 `status = 'ok'` / `json_valid`）各令對應 test 變紅 → test 有咬到
- S-794：`webp.ts` 常數值同舊 literal 相等（RIFF header 12、chunk header 8、RIFF excluded 8、VP8 高 = 6 + 2、VP8L size offset 1）；現有 `PUT /api/assets` WebP test 全綠
- S-778：淨 README 一段（docs，IGNORED），冇 runtime 影響

## Hard Gates

all pass，Coverage 講明：改動檔 lines `next.ts` 100 / `webp.ts` 98.76 / `store.ts`（`publishedFacts`）100

## Findings

- 冇 🔴 / 🟡
- S-852（review 已開，🟢）：`webp.ts:43` literal `2`（backlog，唔重複分析）

## 建議補測

- none（S-849 已補齊上次 QA 嘅 3 個建議）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: api S1 (re-frozen, plan +AC-20); coming-soon S1, repo-tooling S1 (lockfile version line only, re-frozen)
tickets: none
ci: run 43230669865 @ ceb93d0 — in_progress at report time (lint, tsc, unit, build success; build:admin / e2e pending); main agent confirm success before push
next_action: main agent wait for CI 43230669865 to complete, then push code + review + QA commits together
context: T1, 0 blocking findings; S-849 / S-825 / S-794 / S-778 verified; S-852 backlog (from review)
```
