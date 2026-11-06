# Batch Review — 2026-11-06 — backlog lanes（S-703 / S-709 / S-710 / S-731 / S-732 / S-738）

- 審閱者：Code Reviewer（獨立）
- 目標：`claude/amazing-volta-6qrm4p` @ 050e851 vs `origin/main` @ 9421cf1（v1.28.5 → 1.28.6）
- Tier：Lane A T1（淨係 test）；Lane B T2（player 狀態 + hook）；Lane C T1（token 抽出 + 組件拆分，冇視覺改動）；docs T0
- 總評：三條 lane 都冇三層收斂嘅 🔴 / 🟡；3 條新 🟢（S-739 至 S-741）入 backlog

## 整體 verdict

- 涵蓋 commit：8274fbf 358bd31 2b7ce4d 2830248 10a1fff 73ec714 050e851
- Hard gates：all pass
    - Lint：`npm run lint`（`eslint .` + `prettier --check .`）exit 0
    - Type：`npx tsc -b` exit 0
    - Tests（只跑相關，Hard Rule 7）：diff 入面 17 個 test 檔 257 個 pass；`vitest related` 對 `useSavedView.ts`、`AudioController.ts`、`playerContext.ts`、`SavedRow.tsx` 共 725 個 pass。冇跑 full suite / e2e（交 CI 同 QA）
    - Coverage：新 code 每條路徑都有 test（`persistStopped` 三個停法、`useRecentTracks` memo 三個輸入、`lampState` / `openLabel` 全分支）
    - No Critical：0；Security scan：n/a（冇新增依賴）
- Design Origin `none-required`：**成立**。diff 冇新 className / layout；四個 token 值同之前寫死嘅一樣（node test 鎖住），`--ui-scale` 只喺 `:root` 改，喺 `:root` resolve 嘅 `calc()` 同原本喺組件度 resolve 結果一樣；SavedRow DOM 8 個狀態 innerHTML 一樣（developer 證據）
- Version：1.28.6 patch 啱（`package.json` + lock 都改咗）
- Status：pass

## Section A — S-703 / S-738 page-level tests（2830248）

- 改動：`HomePageShelfAvailability.test.tsx`（W-531：集 / 短篇下架後書架次序唔郁，三個 case）；`DramaPageMidnight.test.tsx`（S-699：香港午夜唔使郁都上架 / 落架）；`HomePageWide.test.tsx` 加兩個 case（S-738：卡入面畫面字 `aria-hidden`、讀屏版喺外面）
- L1 對照：S-703（`reviews/2026-11-05_review_coming-soon`）要嘅係頁面層鎖 W-531 / S-699 —— 兩頁都有；S-738（`reviews/2026-11-06_review_spoken-labels-midnight`）要卡讀屏字斷言 —— 有，日子同短篇兩款都驗
- Mock 只換 `bundledSource`，`buildRegistry` 用真嘅，所以真係行過 registry 嘅上架 / 下架邏輯，唔係假 selector
- 發現：S-740（見下）
- 評分：100/100 — pass

## Section B — S-710 progressRevision / S-709 memo（358bd31、2b7ce4d）

- S-710：`stop()` 同 `onStopped()`（暫停、播完冇下一集）改用 `persistStopped()`：先 `persist()` 再 `update({ progressRevision + 1 })`。`useProgressMap` 由 `isPlaying` 改跟 `progressRevision`。順序依賴由「React flush 時機」變成同一個 method 入面嘅兩行，L1 要求（`2026-11-05_review_bookmark-recent-tab` S-710：「由 controller 喺 persist 之後 bump 一個 revision」）完全做到
- 行為改動檢查：播開始唔再重讀 —— 播開始唔會改 storage；轉集 / 自動下一集都經 `recording.url` 重讀，`advance()` 先 `persist()` 後 `load()`，冇漏。其他讀進度嘅 hook（`useDramaPage`、`useShowPage`、`useHomeCardEpisodes`、`useMiniPlayer`、`useHomeCardGauge`）本身唔靠 `isPlaying` edge，唔使跟
- S-709：`recentListens` 包 `useMemo([bookmarks, progressMap, index])`；三個輸入都係穩定 reference（`useRefreshedOn` cache、`useKnownBookmarks` memo、`playableIndex` memo），所以純 tick 真係 0 次重計；test 用 spy 數次數證明
- 測試：`progressRevision.test.ts` 喺每次 notify 記低 storage 位置，revision 早過 persist 就會讀到舊位 —— 鎖住次序本身；`useSavedView.test.tsx` 驗 tick 唔重計、bookmark / revision 變會重計、冇 `isPlaying` edge 都讀到
- 發現：S-741（見下）
- 評分：100/100 — pass

## Section C — S-731 lamp token / S-732 SavedRow 拆分（10a1fff、73ec714）

- S-731：`--onair-lamp-width/-radius/-inset/-text-shift` 入 `tokens.css`；`.lamp` 同收藏行 `padding-left` 用 token；node test 鎖 token 值 + 四個用條嘅 CSS 唔准再寫死。L1（`2026-11-06_review_home-fill-onair` S-731）達成
- S-732：`SavedRow` 44 行（主要係 JSX，邏輯得 3 行），拆出 `savedRowState.ts`（純函數 + icon 常數）、`SavedRowText`、`SavedPlayButton`、`SavedOpenButton`；內容逐行對過同舊版一樣，`useRemoveHintId` 搬入 `SavedOpenButton` 都係讀 context，冇改語意。新增 `savedRowState.test.ts` 7 個 case
- 發現：S-739（見下）
- 評分：100/100 — pass

## Docs（8274fbf）

- S-712、KI-001 / CUI-0016 用戶決定 close，backlog、known-issues、ticket 搬 `completed/` 三處一致

## 🟢 / Observation（入 backlog，唔扣分）

- S-739 `onAirBadge.node.test.ts` `LAMP_LITERAL`：`width:\s*3px` 都會中 `max-width: 3px` / `min-width: 3px`，`EpisodeList` / `TodayShowList` 以後有其他元素用 3px 闊會誤紅；可以收窄到 `.lamp` 嘅宣告或者加 `(?<![-\w])`
- S-740 `HomePageShelfAvailability.test.tsx`：第三個 case 斷言真 catalog 成個書架 5 套劇嘅次序，第二個 case 假設忠孝公路最後一集係第 17 集；catalog 加劇 / 加集會紅，但行為冇變。可以只比較 before / after，或者由 catalog 計集數
- S-741 `AudioController.stop()`（L3）：播緊時 `stop()` 自己 `persistStopped()` 一次，之後 native `pause` event 經 `onPause` → `onStopped()` 再 bump 一次；即係多一次 `getProgressMap` 重讀。舊版本身已經 persist 兩次，影響細，只記錄

## ✅ 做得好嘅地方

- `progressRevision.test.ts` 喺 notify 嗰刻影 storage，直接驗「revision 郁之前已經存好」，唔係淨係驗最終結果
- 頁面 test 只 mock 資料來源、用真 registry，test 鎖到真正行為
- S-731 node guard 連三個用條嘅清單都掃，防止日後有人再寫死

## Handoff receipt

見 SubagentHandback 回傳嘅 HANDOFF_RECEIPT block（單一 batch receipt）。
