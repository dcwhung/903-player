# QA — api 0.7.1 未上架 status + arc memory — 2026-11-12 — S1

- Tier: T2（api + admin）| Commit: `e212680` | Verdict: ✅ pass
- Ledger（base `0c03889` = merge-base origin/main）: SKIP 10 / REVERIFY 4（`admin` `api` `coming-soon` `repo-tooling`）/ UNCOVERED 3（`useArcMemory.ts` + test → admin；`content/published.ts` → api）
- `coming-soon` / `repo-tooling`：淨係 `package-lock.json` 嘅 `apps/api` version `0.7.0 → 0.7.1` 一行，冇行為改動 → 沿用 plan 重新 freeze，冇額外驗
- Plans：`plans/api.md` 加 AC-19、`plans/admin.md` 加 AC-18（review `.proj-docs/reviews/2026-11-12_review_unlisted-status-0.7.1.md`）

## Runs

| Command                                                                                           | Result                                                      | Time  |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----- |
| `npm test`                                                                                        | 353 files / 3784 tests pass                                 | 146 s |
| `npm run test -w apps/api`                                                                        | 13 files / 212 + scripts 1 / 12 pass                        | 14 s  |
| `npm run build:admin`                                                                             | ok                                                          | 7 s   |
| `E2E_PORT=4185 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node apps/admin/e2e/run.mjs`            | 39 PASS / 0 FAIL                                            | 48 s  |
| admin coverage（`--project @903-player/admin --coverage`）/ api coverage（`apps/api` workerd v8） | 見 Hard Gates                                               | —     |
| CI `e212680` run [43211104605](https://github.com/dcwhung/903-player/actions/runs/43211104605)    | completed success（lint、tsc、unit、build、e2e、e2e:admin） | —     |

- 第一次用 port 4190 失敗：Node `fetch` 當 4190 係 bad port（`Error: bad port`，唔係 runner bug），改 4185 即過；每次跑完 `pkill` 走 runner 留低嘅 `vite preview`（S-842）

## 驗證要點（L2）

- 未上架 / 已下架：e2e「arcs tab: never-listed disabled arc is grey 未上架, listed-before one red 已下架」「drama list: arc lines 未上架 / 已下架…」「schedule tab: disabled arc without a schedule is 未上架」pass；截圖 `apps/admin/e2e/screenshots/{drama-list-status,arc-status-unlisted}{,-dark}.png` 目視：灰 / 紅 pill 正確
- API：`publishedFacts`（`apps/api/src/catalog/store.ts`）一條 query 掃晒 `status = 'ok'`、`json_valid` 跳過壞 JSON；`apps/api/test/entries.test.ts` 新 test：上過架後被新 publish 拎走嘅短篇仍 `published`（S-845）、節目建立時 disabled 從未上架 = `false` / 上過架再下架 = `true`（W-716）、最新 document 讀唔到 DELETE 拒絕（S-844）全綠
- S-847：`DramaList.test.tsx`「should label the draft group 待處理…」pass（`待處理（1）· 處理待辦後才可排序`）
- W-717：`arcMemory.test.tsx`「should scroll again to the arc after 短篇 → 排程 → 短篇 with the same hash」+ e2e「排程 → 短篇: the arc picked in 排程 is expanded…」pass；`arc-memory*.png` 目視：大衛營 chip 選中、短篇 tab 展開森美幻想劇
- S-846：e2e「picked chip / expanded arc go into the URL (replace) and survive a reload」— reload 保留 chip / 展開、展開時 0 次 `scrollIntoView`、兩次 Back 直接返 `/dramas`

## Hard Gates

all pass，Coverage 講明：api 改動檔 lines `store.ts` 100 / `entries.ts` 100 / `published.ts` 100；admin 改動檔 ≥ 80% 除 `AdminData.tsx` 30（`loadAllEntries` 併 `published` 由 e2e 列表狀態 check 行過，L2）同 `ArcEditor.tsx` 76（改動係刪 code，之前已低於 80，跟 3c 做法接受）

## Findings

- 冇 🔴 / 🟡
- Observation O-1：Node `fetch` 封 port 4190 等（WHATWG bad ports）；`E2E_PORT` 揀 port 要避開，可考慮 runner 啟動前報錯（backlog，同 S-842 一齊處理）

## 建議補測

- `publishedFacts` 唔計 `status = 'failed'` 嘅 publish（現時冇直接 test）— 高風險 SQL 條件
- 壞 JSON 嘅 ok publish 喺最新以外時，`GET /api/entries` 仍 200（`json_valid` 分支）
- 每日播劇（`drama:<劇>:<日子>`）`published: true` 但冇 `publishedArcs` 欄

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: admin S1, api S1 (re-frozen); coming-soon S1, repo-tooling S1 (lockfile version line only, re-frozen)
tickets: none
ci: run 43211104605 @ e212680 — completed success (lint, tsc, unit, build, e2e, e2e:admin)
next_action: main agent push after CI completes; invoke developer for 建議補測 (optional, backlog)
context: T2, 0 blocking findings; W-716 / W-717 / S-844 / S-845 / S-846 / S-847 verified
```
