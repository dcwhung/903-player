# Code Review — 2026-11-05 — 成集收藏（feature/bookmark/episode）

- 審閱者：Code Reviewer（獨立）
- 目標：`git diff origin/main...HEAD` code 部分 — `636eb3d`、`d91d3b6`、`3342a38`（v1.26.1 → v1.27.0 MINOR）
- Design Origin：`mockup: _mockups_/bookmark/index.html`（之前 14 個 mockup commit 只作對照）
- Tier：T3（新 feature、跨主頁 / 內頁 / player）
- 總評：結構清晰、store / selector / view 分層好，hard gates 全過。兩個 🟡 都係「由收藏入頁唔播」用 cue（`useCueFocused`）帶出嚟嘅副作用

## Hard Gates

all pass — `npx tsc -b` exit 0；`npm run lint`（eslint + prettier）exit 0；相關 unit 75 files / 885 tests 全綠（`npx vitest run` 指定路徑，冇跑 full suite / e2e）；新核心邏輯 coverage lines 95.6%（bookmarkStore 98.5、selectors/bookmarks 97.5、savedItems 93.3、useSavedView 100、useRowSwipe 95.9；useEpisodeFocus 單檔 68%，其餘路徑由 ShowPage / DramaPage test 覆蓋）。Security：冇新依賴。

## 評分結果

| 維度     | 得分   | 滿分    | 備注         |
| -------- | ------ | ------- | ------------ |
| 正確性   | 15     | 25      | W-529、W-530 |
| 安全性   | 20     | 20      |              |
| 可維護性 | 20     | 20      |              |
| 測試覆蓋 | 15     | 15      |              |
| 性能     | 10     | 10      |              |
| 代碼風格 | 10     | 10      |              |
| **總分** | **90** | **100** |              |

**結果：✅ pass**（≥ 90、無 🔴；兩個 🟡 建議喺 merge 前修，W-530 要用戶拍板）

## 🟡 Warning

### W-529 節目頁 cue 咗未播嘅集寫「播放中 · 0:00 / 10:00」

- 位置：`src/pages/show/useShowPage.ts:136`（`toEpisodeItems` 冇 `liveState` 參數）+ `src/pages/shared/episodeItems.ts:66-78`→ `src/components/shared/player/EpisodeList/episodeStatus.ts:30`（預設 `'playing'`）；觸發點 `src/hooks/useEpisodeFocus.ts:42-51`
- L1：用戶需求「撳其他位置 = 入頁、唔播」；劇集頁（`useDramaPage.ts:91` 傳 `liveState: playState`）同節目頁同一個 `PLAYBACK_STATUS_KEY` 規則唔一致
- L2：截圖 `shots7/focus-show-phone.png`：03/10 行寫「播放中 · 0:00 / 10:00」、掣係 ▶、日子條寫「現正播放」，但冇播
- L3：暫停中嘅節目頁本身都有同一問題（舊問題），cue 令佢一入頁就出現
- 方案 A（推薦）：`toEpisodeItems` 加 `liveState` 參數，`useShowEpisodeItems` 傳 `playbackStateOf({ isPlaying, position })`，同劇集頁一樣（順手修埋暫停）；方案 B：解決 W-530 用方案 A 唔 load，cue 嘅情況自然消失，但暫停中嘅舊問題留低

### W-530 Cue 令 player 被「佔住」：主頁出 mini player、之後撳格仔唔再自動播

- 位置：`src/hooks/useEpisodeFocus.ts:42-51`（`load(track)`）× `src/hooks/useAudioBusy.ts:10-11`（`recording !== null` 就 busy）
- L1：`useAudioBusy` 嘅規則係「唔好蓋過用戶**播緊或者暫停緊**」嘅嘢；cue 嗰集用戶從未撳過播，但之後主頁 `HomePage.tsx:39`、`useHomeDramaItems.ts:49`、`useTodayPage.ts:21`、`useShowPage.ts:82` 全部當 busy，現有「撳格仔入頁自動播」由此失效（用戶指定要查呢點）
- L2：截圖 `shots7/back-home-phone.png`：只係由收藏行入頁再返主頁，底部已經出 公子會 03/10 0:00 / 10:00 mini player；收藏行同時寫「聽到 0:00 / 10:00」
- L3：Developer 自報偏離（cue 做法）本身合理（唱片 / 時間 / ★ 跟嗰集），但副作用超出「唔播」
- 方案 A（推薦）：唔 load player，用頁面自己嘅「揀中 / standby」狀態（`useStandbyStart` / `current` 覆寫做 focus 嗰集），撳 ▶ 先 `load(..., { autoplay: true })`；player 保持空，autoplay 規則唔受影響
- 方案 B：保留 cue，但 player 記低「cued、未播過」，`isAudioBusy` / mini player 喺第一次播之前唔計佢；改動面大過 A，要動 player 核心
- 需要用戶決定：接唔接受「由收藏入頁之後 player 就有嗰集、mini player 會出」呢個行為

## 🟢 Suggestion / Observation

- S-686 `src/services/bookmarkStore.ts:116-127,138-145`：`setItem` 失敗都照 notify、`toggleBookmark` 照回 `true`，toast 講「已加入收藏」但其實冇存（★ 仲係 ☆）
- S-687 `src/components/shared/common/Toast/Toast.tsx:21-31`：連續兩次同一句（收藏 A 再收藏 B）live region 文字冇變，讀屏可能唔再讀；可以按 `id` 做 `key` 重 mount 個文字節點
- S-688 `src/components/pages/home/SavedTab/useRowSwipe.ts:122-126`：Delete / Backspace 移除後行 unmount，focus 跌返 `body`；可以移去下一行 / ★ tab；`aria-keyshortcuts` 只寫 Delete
- S-689 `src/components/shared/player/EpisodeList/useFocusRow.ts:31-42`：effect 喺 1.6 s 內重行（`listed` 轉 false 再 true）時 cleanup 清咗 timer 但 `done` 已設，`data-focused` 會留低
- S-690 `src/pages/home/savedItems.ts:91-97`：載入咗但 position 0 寫「聽到 0:00 / 10:00」，未聽過應該係「未收聽」（W-530 方案 A 會自然消失）
- S-691 `src/services/bookmarkStore.ts:66-76`：`date` / `time` 只驗非空字串，唔驗 `YYYY-MM-DD` / `HHMM`，壞資料會 render 出 `NaN`
- S-692 TDD：selectors、savedItems、HomeSaved、PlayerGauge ★ 部分 test 冇先紅（Developer 自報），只記錄
- S-693 `src/components/shared/common/Toast/Toast.module.css:25-27`：靠 `:has()`；唔支援嘅瀏覽器 toast 會疊喺 mini player 上面，可接受

## Developer 自報偏離（逐條判斷）

1. 由收藏入頁用 `useCueFocused`：方向可以，但副作用見 W-529 / W-530
2. 狀態字用 mockup 寫法（未收聽 / 聽到 x / y）：接受，Design Origin 係 mockup
3. 闊橫版字跟 `--ui-scale` 變兩行：接受（`shots7/saved-wide-many.png` 睇過，冇 overflow）
4. 15px 字：接受，跟 mockup
5. 左滑加 Delete / Backspace：接受（左滑要有鍵盤代替），細節見 S-688
6. 收藏掣讀屏名固定 + `aria-pressed`：接受，符合 WAI-ARIA toggle button 做法
7. 收藏行入頁用 card zoom、右卡同節目就 expand：接受。W-527：`useEpisodeFocus` replace 時保留 `zoomFrom`（`useEpisodeFocus.ts:27-35`）✅；S-681：`zoomInto` 量框冇改，`useZoomNavigate` 只係 merge `extra` state ✅
8. 收藏 tab 碟用每段第一集：接受（節目段同一隻碟；短篇段跟短篇碟）
9. 部分 test 冇先紅：見 S-692

## 重點項目核對

- bookmarkStore：版本 key + `version` 雙重、每條逐欄驗證、`JSON.parse` / `getItem` / `setItem` 全部 try/catch ✅；snapshot 按 raw 字串 cache，`useSyncExternalStore` snapshot 穩定，`storage` event 跨分頁同步 ✅
- HomeTabs 第三 tab：冇收藏時 `inert` + `aria-hidden` + 闊度 0，React 19.3 `inert` boolean 正確 ✅
- useHomeTab fallback：render 期間 derived state，寫返「節目」，之後再收藏唔會跳 ✅
- 左滑 vs click：▷ `pointerdown` stopPropagation、橫拖後 `useClickSuppression` 食 click、直拖交返瀏覽器 ✅
- 減少動態：新 transition 全部喺 `prefers-reduced-motion: no-preference`；移除用 `setTimeout` 唔等 `transitionend`；JS 喺開始嗰刻先叫 `prefersReducedMotion()` ✅
- i18n：新字全入 `zh-HK.ts` `bookmark.*` ✅；magic number 全部有名常數 / token ✅；函數長度由 eslint `max-lines-per-function` 把關 ✅
- Toast a11y：`role="status"` + `aria-live="polite"` 一直掛住，`pointer-events: none` ✅（S-687）

## ✅ 做得好嘅地方

- 收藏 / 最近收聽 / 分欄全部係純函數 selector（`groupBookmarks`、`recentListens`、`savedGrid`），test 易寫
- 星掣冇放入行掣入面（避免 button 套 button），用留位 + 疊位，a11y 正確
- ▷ 開播喺 click 同步做（iOS autoplay），zoom history state 規則（W-527）保持

## 修訂代碼（W-529 方案 A 示意）

```ts
// src/pages/shared/episodeItems.ts — toEpisodeItems 加 liveState（W-529）
export const toEpisodeItems = (
    episodes,
    currentUrl,
    live,
    progressMap,
    isPlaying,
    liveState?: PlaybackState,
) => /* ... */ toPlayableItem(r, labels, { currentUrl, live, progressMap, isPlaying, liveState });
// src/pages/show/useShowPage.ts:136 — 同劇集頁一樣用 playbackStateOf
const liveState = playbackStateOf({
    isPlaying: isPlayingCurrent,
    position: live?.currentTime ?? 0,
});
```

## Re-review a8378ea

- 範圍：`git diff 0c8f148..a8378ea`（只驗 W-529 / W-530 嘅修正同佢嘅 diff）
- Hard gates：all pass — `npx tsc -b` exit 0；改動檔 `eslint` exit 0；相關 unit（`src/pages/show`、`src/pages/drama`、`src/pages/shared`、`src/pages/home`、`useEpisodeFocus.test.tsx`）19 files / 262 tests 全綠
- 新分數：**100 / 100**（正確性 25 / 25），✅ pass

| ID    | 狀態    | 覆核                                                                                                                                                                                                                                                                                                   |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W-529 | ✅ 已修 | `episodeItems.ts:72,79` 加 `liveState`；`useShowPage.ts:141-153` 傳 `playbackStateOf(...)`，同劇集頁一致，暫停 / 未開始唔再講「播放中」。新 test `should not say 播放中 on the current row while paused`、`should label a paused current episode by its real playback state`                           |
| W-530 | ✅ 已修 | `useCueFocused` 刪走（`grep` 冇殘留）；focus 只係頁面揀中（`useShowPage.ts:45-52`、`useDramaPage.ts:95-115,313-316`），`onStart` 先 `load(..., { autoplay: true })`。player 唔郁，`useAudioBusy` 唔受影響；`shots7/back-home-phone.png` 底部只係原有「今日節目」mini player（未載入），冇 cue 出嚟嘅集 |

重點核對：

- 主頁格仔自動播：新 test `should leave home without an extra mini player and still autoplay a tile after 我的收藏` 覆蓋 ✅
- 普通入頁（冇 `focusUrl`）：`focused` 恆為 `undefined`，`current` / `start` 同改之前一樣；`useAutoplayShow` / `useAutoplayDaily` 規則冇變 ✅。唯一普通入頁都會見到嘅改變係 W-529 嘅字眼（暫停 → 「已暫停 · x / y」），屬預期修正
- 已載入呢個節目 / 呢套劇時 `focused` 讓位畀 player（`playing ? undefined`、`loaded ? undefined`），唔會蓋過播緊嘅嘢 ✅
- 短篇劇：睇緊 focus 嗰集嘅短篇時 `pickedResume` 退回 focus 集，轉其他短篇照用續聽集（`useDramaPage.ts:299-301`）✅
- S-690 隨 W-530 一齊消失（冇 cue 就冇「聽到 0:00 / 10:00」）

新增 🟢：

- S-694 `src/pages/drama/useDramaPage.ts:248` × `SeriesDramaPage.tsx:30`：未聽過呢套短篇劇、由收藏入頁時，「現正播放」嗰行仍然寫「揀一個短篇開始收聽」，碟面係黑碟，但短篇已經揀好、撳 ▶ 會播收藏嗰集。字眼同實際做法有少少出入，但唔會令用戶做錯（撳 ▶ 結果正確），亦冇違反 AC → 🟢。建議：有 `focused` 時 idle 狀態用 `resume` / `ready`（「下一集：短篇 · 第 N 集」）同顯示碟面

## Re-review 49a3d2c

- 範圍：`git diff 1e32e13..49a3d2c`（跳過 docs）— `9b543ca` test(e2e) CUI-0020、`49a3d2c` fix(bookmark) 碟欄對齊
- Hard gates：本機 `npm run lint` exit 0、`npx tsc -b` exit 0；相關 unit `npx vitest run src/components/pages/home/SavedTab src/pages/home/HomeSaved.test.tsx` 2 files / 16 tests 全綠（冇跑 full suite / e2e）
- CI（同一個 SHA，`.github/workflows/ci.yml`）：
    - `49a3d2c` → run [#72 / 42046494846](https://github.com/dcwhung/903-player/actions/runs/42046494846)：**未完**（覆核嗰陣 `Detect code changes` success，`Lint, unit & build` 行緊 lint；unit / build / e2e 未有結果）
    - `9b543ca` → run [#69 / 42038930736](https://github.com/dcwhung/903-player/actions/runs/42038930736)：success（CUI-0020 嘅 e2e 修正喺 CI 過咗）
    - 對照：`a8378ea` run #65 failure，即 CUI-0020 本身
- 新分數：**100 / 100**，✅ pass（冇 🔴 / 🟡）

覆核：

- `9b543ca` e2e：`ROW_PLAY_BUTTONS` 用讀屏名前綴「播放 」/「暫停 」揀行掣，同 `zh-HK.ts` `episodes.play` / `episodes.pause` / `today.playShowWithStatus` / `today.pauseShowWithStatus` 吻合，☆（「收藏 …」）唔會數埋 ✅；`HOME_HASHES` 收 `''` 同 `#/`：HashRouter 直接開 base 時 hash 係空，兩個都係主頁，斷言冇放鬆到誤判 ✅
- `49a3d2c` 對齊：最近收聽改用 `--saved-disc` 同收藏段一樣嘅 `--space-3` gap，panel `padding-left` 扣返 `--saved-recent-border`，碟同文字起點同上面收藏段對齊；`align-phone.png` / `align-wide.png` 睇過，碟欄同文字 x 一致 ✅。舊 `--saved-recent-disc` 已刪，冇殘留引用；`10px` / `6px` 改用 `--space-*` token、`3px` 外圈抽做 `--saved-disc-ring` ✅
- 窄橫版最近收聽喺右邊，唔同收藏段上下排，對齊唔適用；碟由 34 → `--saved-disc`（窄橫版 44）令 250px 闊 panel 文字位少咗，屬用戶要求嘅取捨

🟢：

- S-697 `SavedTab.module.css:298-307`：`.recentList` 左右只留 `--saved-disc-ring`（3px），但碟仲有 `--saved-disc-shadow`（`0 2px 6px`），捲動區會剪走少少落影邊；純外觀，可以改用 ring + 陰影半徑做留位
- S-698 `discColumn.node.test.ts:22-30`：逐字比對 CSS 字串（例如 `padding` `toContain(') var(--space-3) calc(')`），格式一改就紅；可接受（repo 已有同類 node test），只記錄
