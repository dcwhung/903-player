# QA — P10 lane 7a HomeView 今日節目頁 — 2026-11-18 — S1

- Tier: T2 | Branch: `feature/layout/home-view-square`（PR #277 → `release/v2.0.0`）| Commit: 4a2e84f（code 070f7ad + 4a2e84f；review 0918861）| Verdict: ✅ pass
- Ledger（`impact --since $(git merge-base HEAD origin/main)` = e3d6952）: SKIP 6 / REVERIFY 8 / UNCOVERED 10（全部係 lane 7a 新檔）
- REVERIFY 由今次 diff 引起（S1 STALE 行）：`show-today-page`（square.mjs、TodayShowList、Page.module.css、TodayPage）；`home`（TodayPage）；`bookmark` / `mini-player`（TodayShowList）；`drama`（Page.module.css）；`coming-soon` / `ui-foundation`（zh-HK.ts、tokens.css）
- `player-core`：S1 FROZEN、未受 diff 影響；REVERIFY 只因 S3 行（release 分支早前改動，屬 S3，今次唔處理）。今次加 1-hop importer `TodaySquarePlayer.tsx`（import `usePlayer`）
- 新檔分配：`ShowSelector/*`、`TodaySquare.tsx`、`TodaySquarePlayer.tsx`、`TodayHeader.tsx`、`useTodayShowInfo.ts`、`TodayPageSquare.test.tsx`、`PlayerPanel/GaugePanel.tsx` → `show-today-page`（AC-11）；`TodaySquarePlayer.tsx` 另入 `player-core`
- Plans：`plans/show-today-page.md` 加 AC-11 + 指令 + ShowSelector glob；`plans/player-core.md` 加 1-hop importer。其他 STALE 鏈 plan 不變

## Runs

| Command                                                            | Result                                           | Time   |
| ------------------------------------------------------------------ | ------------------------------------------------ | ------ |
| `npm run lint`（引用 scratchpad `lint-lane7a2.log`）               | 0 error、prettier 全過                           | —      |
| `npm test`（全部，引用 `unit-lane7a2.log`）                        | 487 files / 5090 pass                            | 155 s  |
| `npm run e2e`（全部，引用 `e2e-lane7a2.log`）                      | 1075 PASS / 0 FAIL（'HomeView 今日節目…' 21 個） | —      |
| `npm run e2e:visual`（vs e3d6952，引用 `visual-lane7a2.log`）      | 180 張 18 張唔同，全部 `drama-series@*`          | ~5 min |
| AC-11 unit（`plans/show-today-page.md` AC-11 指令，本次 @4a2e84f） | 17 files / 192 pass                              | ~20 s  |
| PR #277 CI @4a2e84f（run 44410503302）                             | success（lint / unit / build / e2e）             | —      |

- Log 喺 `/tmp/claude-0/-home-user-903-player/63eae08b-389e-5f65-bc2e-058343366bd1/scratchpad/*-lane7a2.log`；截圖 `scratchpad/l7a/`、`scratchpad/l7a2/`
- Visual 18 張 = lane 6c drama-series ring（用戶已接受），唔屬今次 diff；今日節目 / 現有手機今日節目頁 0 diff

## AC-11 對照（e2e `square.mjs` 同 `TodayPageSquare.test.tsx` / `ShowSelector.test.tsx`）

- 普通播放器、冇卡疊 / 指示點、唱片離頁頭 16px、全部喺畫面入面：✅
- Selector：揀中外框、未上架停用 + 讀「未上架」、> 4 格捲（102px）、轉節目揀中格捲返入畫面、頭 / 中 / 尾淡出正確、頭尾冇淡出：✅
- 清單掣 badge 5 = 今日節目數；節目表 5 行、播出時間 + 收聽狀態、「2 個未上架」：✅
- 頁頭 ⓘ = 而家個節目、轉節目跟住換、唔自動彈：✅
- 第一次入自動開節目表 + 展開資料、記低 seen；再入唔開：✅
- 鍵盤（Escape）閂焦點返清單掣；滑鼠撳遮罩閂唔搬焦點、冇 `:focus-visible`：✅
- 減少動態：清單 sheet 用共用 `ListSheet`（AC-9 e2e 減少動態 pass）；selector 捲動喺動作嗰刻叫 `scrollBehavior()`：✅（見 Observation）
- 現有裝置零改變：'現有手機今日節目頁照舊' pass + visual 只有已接受嘅 drama-series：✅
- 接受偏差（selector 底 8px、sheet 表頭冇箭咀、全部未上架 → TodayEmpty）：唔計 finding

## Hard Gates

all pass（PWA gate n/a：冇改 `sw.js` / build / manifest；Security / Performance n/a）

## Findings

- Observation：selector 減少動態捲動（`behavior: 'auto'`）冇專屬 test；行為跟 app 共用 `utils/motion` `scrollBehavior()`，冇 L2 失敗

## 建議補測

- none（selector 淡出 / 捲動屬中風險 UI 邏輯，已有 unit 10 個 + e2e 21 個覆蓋；no edge case gap）

- Freeze：8 條鏈 S1 @f12d5a9（= 4a2e84f + review 文件）；ledger chain + stage + path 對比 freeze 前：0 行少、11 行新增（show-today-page 10、player-core 1）
- Freeze 後 `impact` 仍列 REVERIFY 嘅 `drama` / `home` / `player-core` / `show-today-page` / `ui-foundation` 全部只係 S3 行（release 分支早前改動），S1 全 FROZEN

```handoff-receipt
from: quality-assurance
to: main-agent
stage: S1
status: pass
next_action: merge_ready
artifacts: .proj-docs/qa/2026-11-18_qa_p10-lane7a-homeview-today.md, .proj-docs/qa/plans/show-today-page.md, .proj-docs/qa/plans/player-core.md, .proj-docs/qa/verification-ledger.tsv
context: P10 lane 7a PR #277 @4a2e84f; CI run 44410503302 success; full unit 5090 / e2e 1075 pass; visual 18/180 = lane 6c drama-series (user-accepted); 0 blocking findings, 1 Observation; QA commit local only, not pushed
```
