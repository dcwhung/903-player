# QA — P10 lane 7b HomeView 廣播劇頁 — 2026-11-19 — S1

- Tier: T2 | Branch: `feature/layout/home-view-square`（PR #278 → `release/v2.0.0`）| Commit: 42e2215（code a98f864 + 42e2215；review f417399）| Verdict: ✅ pass
- Ledger（`impact --since $(git merge-base HEAD origin/main)` = e3d6952）: SKIP 6 / REVERIFY 8 / UNCOVERED 12（全部係 lane 7b 新檔）
- REVERIFY 8 條鏈嘅 S1 STALE 行全部喺今次 diff（c1f0b85..42e2215）：`drama` 8、`show-today-page` 13、`coming-soon` 8、`player-core` 4、`catalog-data` 2、`ui-foundation` 2、`bookmark` 1、`home` 1；其餘 STALE 只係 S3 行（release 分支早前改動，今次唔處理）
- 新檔分配：12 個全部 → `drama`（AC-18）；`ListSheetHeader.tsx` → `show-today-page`（ListSheet glob），另 `squareDrama.mjs`（`square.mjs` import）、`SeriesSquare` / `SeriesSquarePlayer` / `DailySquare` / `useSquareSheets` / `ArcEpisodesSheet.tsx`（import ListSheet / GaugePanel）入 `show-today-page`；`SeriesSquarePlayer.tsx`（import `utils/playbackState`）入 `player-core`
- Plans：`plans/drama.md` 加 AC-18 + 指令 + glob（3 行 e2e 併做 1 行，39 行）；`plans/show-today-page.md` / `plans/player-core.md` 加 lane 7b 檔。其他 STALE 鏈 plan 不變

## Runs

| Command                                                       | Result                                                  | Time   |
| ------------------------------------------------------------- | ------------------------------------------------------- | ------ |
| `npm run lint`（引用 `lint-lane7b2.log`）                     | 0 error、prettier 全過                                  | —      |
| `npm test`（全部，引用 `test-lane7b2.log`）                   | 490 files / 5113 pass                                   | 155 s  |
| `npm run e2e`（全部，引用 `e2e-lane7b2.log`）                 | 1097 PASS / 0 FAIL（HomeView 廣播劇 / 每日劇 21 個）    | —      |
| `npm run e2e:visual`（vs e3d6952，引用 `visual-lane7b2.log`） | 180 張 18 張唔同，全部 `drama-series@*`、0 元素位置唔同 | ~5 min |
| AC-18 unit（`plans/drama.md` AC-18 指令，本次 @42e2215）      | 20 files / 208 pass                                     | 27 s   |
| PR #278 CI @42e2215（run 44426575766）                        | 見下                                                    | —      |

- Log 喺 `/tmp/claude-0/-home-user-903-player/63eae08b-389e-5f65-bc2e-058343366bd1/scratchpad/*-lane7b2.log`（第一輪 `*-lane7b.log` @a98f864）；截圖 `scratchpad/l7b/`、`scratchpad/l7b2/`
- Log 對應 42e2215：42e2215 改嘅檔最遲 mtime 23:43:38，unit 23:44:26 開始、e2e / visual 之後完成（visual 寫「working tree（f417399）」= 42e2215 未 commit 前嘅同一份 code）
- Visual 18 張 = lane 6c 鍵盤閂後「全集」2px focus ring（用戶 2026-11-18 已接受），唔屬今次 diff；其餘 162 張 0 diff
- CI：a98f864 run 44420738343 success；42e2215 run 44426575766 寫報告時 in_progress（changes success、lint / unit / build 跑緊）→ main agent merge 前確認

## AC-18 對照（e2e `squareDrama.mjs`、unit `SeriesDramaPageSquare` / `DailyDramaPageSquare` / `SeriesSquarePlayer.test.tsx`）

- 未揀短篇：「全集揀一個短篇開始收聽」、空白碟、badge 12 = 短篇數、冇 chips / 清單、清單掣開全集表：✅
- 揀咗短篇：短篇名 + 集名、badge 36 = 該短篇集數；開短篇表 banner「三十六計」110px + 36 集 +「全集」掣，撳「全集」換去全集表：✅
- 播緊 A 揀 B：即開 B 短篇表（3 集、焦點入表），頁面仍係 A；冇播閂 → 清單掣 / badge 返 A；喺 B 表播一集 → 頁面變 B：✅
- 每日劇：頁頭清單掣 badge 9 + ⓘ、頁面冇清單、開集數 sheet 9 行（lane 6 模式，判斷，mockup 冇講）：✅
- 第一次入自動開全集表；Escape 閂焦點返清單掣；滑鼠撳遮罩閂唔搬焦點、冇 `:focus-visible`：✅
- 快將下架字：播放 / 暫停 / 連線中保留狀態行、下架字喺短篇名下；未聽先由下架字取代狀態行（S-1147 unit 4 個）：✅
- 冇出界：未揀 / 播緊 / 每日劇「全部喺畫面入面（捲動 544×544，出界掣 0）」；唱片 256px 置中、離頁頭 16px：✅
- 現有裝置零改變：'現有手機短篇劇集頁照舊' pass + visual 只有已接受嘅 drama-series：✅

## Hard Gates

all pass（PWA gate n/a：冇改 `sw.js` / build / manifest；Security / Performance n/a）

## Findings

- none（冇 🔴 / 🟡；冇 Observation）

## 建議補測

- none（揀短篇 / 還原屬 state 邏輯，已有 unit 13 個 + e2e 21 個覆蓋；no edge case gap）

- Freeze：8 條鏈 S1 @e7ee898（= 42e2215 + re-review 文件，code 同 42e2215 一樣）；ledger chain + stage + path 對比 freeze 前：0 行少、19 行新增（drama 11、show-today-page 7、player-core 1）
- Freeze 後 `impact` 仍列 REVERIFY 嘅 `drama` / `home` / `player-core` / `show-today-page` / `ui-foundation` 全部只係 S3 行，S1 全 FROZEN

```handoff-receipt
from: quality-assurance
to: main-agent
stage: S1
status: pass
next_action: merge_ready
artifacts: .proj-docs/qa/2026-11-19_qa_p10-lane7b-homeview-drama.md, .proj-docs/qa/plans/drama.md, .proj-docs/qa/plans/show-today-page.md, .proj-docs/qa/plans/player-core.md, .proj-docs/qa/verification-ledger.tsv
context: P10 lane 7b PR #278 @42e2215; lint 0, unit 5113, e2e 1097/0, visual 18/180 = lane 6c drama-series ring (user-accepted); AC-18 unit 208 pass @42e2215; CI 44426575766 in_progress at report time (a98f864 run 44420738343 success) - confirm green before merge; 8 chains S1 frozen @e7ee898, 0 rows lost, 19 added; 0 findings; QA commit local only, not pushed
```
