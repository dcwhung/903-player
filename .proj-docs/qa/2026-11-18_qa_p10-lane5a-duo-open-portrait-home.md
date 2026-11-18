# QA — P10 lane 5a Duo 打開・直主頁全闊 — 2026-11-18 — S1

- Tier: T1（CSS 裝置區塊 + 欄數 helper + e2e）| Commit: eec1f19（code 86e3c4c + eec1f19；HEAD 6bfdd93 淨加 re-review 文件）| PR #273 → `release/v2.0.0` | Verdict: ✅ pass
- Ledger（`impact --since $(git merge-base HEAD origin/main)` = e3d6952）: SKIP 8 / REVERIFY 6 / UNCOVERED 0 / IGNORED 17
    - 呢個 diff 令 S1 STALE 嘅鏈（`status` S1 行全部都係 lane 5a 檔）：**home**（ShowGrid ×4、DramaShelf.tsx、HomePage.module.css、homeBottomSpace test）、**drama** / **coming-soon**（DramaShelf.tsx + .module.css）、**bookmark**（`e2e/duo.mjs`）、**ui-foundation**（`e2e/duo.mjs`、`tests/cssRule.ts`）→ 同一批證據覆蓋，五條 S1 一齊 freeze
    - show-today-page 同 home / drama / ui-foundation 嘅 S3 行係上次 release 之後嘅舊 STALE（`src/` 搬 monorepo），唔關呢個 diff，留畀 v2.0.0 S3
- Plan：`plans/home.md` 加 AC-11（scope 加 `e2e/duo.mjs`，ledger home S1 175 → 176 行）、`plans/drama.md` 加 AC-15；其餘三條 plan 冇改。Freeze 前後比對 chain + stage + path：冇少行

## Runs

| Command                                                                                                                          | Result                                                                                                 | Time |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---- |
| `npm test -- …/home/ShowGrid/ …/home/DramaShelf/ …/home/homeBottomSpace …/styles/ …/testMediaQuery …/home/HomePage`（QA 自己跑） | 37 檔 461 / 461                                                                                        | 14s  |
| `npm test`（developer @ eec1f19，引用 `scratchpad/unit11.log`）                                                                  | 479 檔 5002 / 5002                                                                                     | —    |
| `npm run e2e`（developer @ eec1f19，引用 `scratchpad/e2e-lane5a2.log`）                                                          | 995 PASS / 0 FAIL                                                                                      | —    |
| `npm run e2e:visual`（developer @ eec1f19，引用 `scratchpad/visual-lane5a2.log`）                                                | 180 / 180 全部一樣                                                                                     | —    |
| CI `ci.yml` run 44315635642（eec1f19）                                                                                           | ✅ success（lint / unit / build、E2E）：https://github.com/dcwhung/903-player/actions/runs/44315635642 | —    |

## AC 對照（plan home AC-11 / drama AC-15；L1 = plan lane 5 + 用戶決定 2026-11-18 + `_mockups_/iphone-duo` 打開・直 主頁）

| AC                                            | 證據                                                                                                                            | 結果 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 612×876 主頁全闊、左右 24px、mini player 對齊 | e2e 'Duo 打開・直 主頁：左右邊框 24px（左 24、右 24）'、'mini player 左右底 24px'、'內容底同 mini player 之間 12px'             | ✅   |
| 分類掣用盡闊度、節目格 3 欄                   | e2e 'Duo 打開・直主頁' `firstRow 3`、`tabsRight 24`；unit `portraitColumns(8, 3) = 3`                                           | ✅   |
| 今日節目填返尾行剩低嘅欄                      | e2e `todaySharesRow true`、`todayFillsRow true`；unit `spanLastColumns` [8,3]→2、[7,3]→3、[9,3]→1                               | ✅   |
| 廣播劇 tab 兩欄 grid、唔疊                    | e2e 'Duo 打開・直廣播劇' `stacked false, sideBySide true, overlap false`；截圖 `scratchpad/l5/op-dramas-2col.png`               | ✅   |
| 現有裝置零改變（手機 2 欄、成行、疊卡書架）   | `e2e:visual` 180 / 180；unit `portraitColumns(count)` 預設 2、`spanLastColumns(n, 2)` 成行；`homeBottomSpace` lock 唔郁底部留位 | ✅   |

## Hard Gates

all pass（Coverage：新 helper `portraitColumns(count, max)` / `spanLastColumns` 有 table test；PWA gate n/a，冇掂 SW / manifest / build；Security / Performance n/a）

## Findings

none（冇 🔴 / 🟡）。Review S-1129 – S-1132 喺 eec1f19 修咗，re-review 已 commit（6bfdd93）

### 🟢 / Observation

- 🟢 `apps/player/tests/cssRule.ts:134-139`：新 `isDeviceRange` 插咗喺 `maxHeightBreakpoints` 嘅 JSDoc 同 function 中間，兩段 `/** */` 疊埋，`maxHeightBreakpoints` 冇咗 doc（hover 會顯示錯 doc）。L1 冇（純註解位置），唔 block；搬 `isDeviceRange` 去 doc 上面即可（ID 由 main agent 分配）

## 建議補測

- `DramaShelf.test.tsx`：`DUO_OPEN_PORTRAIT_QUERY` match 時 `ShelfColumn` 唔疊（冇 `data-stacked`）、撳即 open，照 line 565 landscape case 用 stub — `wide` 分支而家淨係 e2e 鎖（同 re-review Observation）

```handoff-receipt
protocol: 1
status: pass
stage: S1
ledger: "FROZEN S1 home / drama / coming-soon / bookmark / ui-foundation @6bfdd93 (code eec1f19)"
hard_gates:
  tests: pass
  coverage: pass
  pwa_update: n/a
  security: n/a
  performance: n/a
next_action: merge_develop
next_agent: main
branch: "feature/layout/iphone-duo"
context: "P10 lane 5a S1 @eec1f19: Duo open portrait 612x876 home full width (24px edges, mini player aligned), 3 columns, today tile fills rest of last row, drama tab 2-col grid; existing devices unchanged (visual 180/180). Cited unit 5002, e2e 995/0, CI run 44315635642; QA ran related unit 461/461. Froze S1 for home, drama, coming-soon, bookmark, ui-foundation (all STALE only from this diff). One 🟢 (cssRule.ts doc placement) + one suggested unit test (DramaShelf wide branch) to clear in-session. Merge target release/v2.0.0; QA files committed locally, not pushed"
```
