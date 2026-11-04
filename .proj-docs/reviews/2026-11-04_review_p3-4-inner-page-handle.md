# Code Review — 2026-11-04 — P3 #4 inner page handle

- 審閱者：Code Reviewer（獨立）
- 目標：`feature/home-card/inner-page-handle`（951c437 mockup、b333b30 feat、da8d258 e2e、402125b bump 1.23.0），base `origin/main` @ f9eeaa4
- Tier：T2 /feature（前端 UI，Design Origin `mockup: _mockups_/inner-page-handle/index.html`，用戶已確認）
- 總評：結構清楚，home / page 把手抽成共用 `PlayerHandle`，view-transition 改名冇撞名。有一個「呢頁自己嘅嘢」邊界 bug：星期日今日節目頁會出錯把手（W-525）

## Hard Gates

全部 pass：`npx tsc -b --noEmit` 0、`npx eslint .` 0、改過嘅檔 `prettier --check` 通過、跟 diff 有關嘅 unit 測試 `npx vitest run src/selectors/pageHandle.test.ts src/components/shared/player/PlayerHandle src/styles/viewTransitionNames.node.test.ts src/pages/show/ShowPage.test.tsx src/pages/today/TodayPage.test.tsx src/pages/drama src/pages/home/HomePageWide.test.tsx` 8 個檔、163 個測試全部通過。E2E 引用 developer 嘅結果（完整 e2e exit 0，包括「闊橫版內頁把手」），按 Hard Rule 7 冇重跑。冇新增依賴。

## 評分結果

| 維度     | 得分   | 滿分    | 備注  |
| -------- | ------ | ------- | ----- |
| 正確性   | 20     | 25      | W-525 |
| 安全性   | 20     | 20      |       |
| 可維護性 | 20     | 20      |       |
| 測試覆蓋 | 15     | 15      |       |
| 性能     | 10     | 10      |       |
| 代碼風格 | 10     | 10      |       |
| **總分** | **95** | **100** |       |

**結果：✅ pass**（W-525 建議 merge 之前修，或者請用戶確認）

## 🟡 W-525 — 今日節目頁用備用日子（星期日）時，播緊呢頁列出嘅節目都出把手

- 位置：`src/selectors/pageHandle.ts` `belongsTo`（`item.date === today`），`src/pages/today/TodayPage.tsx` `TODAY_PAGE`
- L1：違反驗收條件「呢頁自己嘅嘢 → 冇把手」。今日節目頁顯示嘅係 `pickTodayDate()`：今日冇節目播（星期日；全部節目 `airDays` 係 1–5 或者 6）就用最近一日有錄音嘅日子（`src/selectors/recordings.ts:42`）。用戶確認「今日嘅錄音都算自己嘅」，用意係「呢頁列出嗰日」，但寫死咗比較 `hkToday()`
- L2：臨時 probe（跑完已刪）：`today='2026-10-18'`（星期日），`todayView([gongzi 2026-10-17]).date === '2026-10-17'`，個 recording 喺 `playable` 入面，但係 `pageHandle({ page: {kind:'today'}, track: 嗰個 recording, today })` 唔係 `null`，即係今日頁出「播放中：公子會」把手，但呢個節目正正係喺呢頁播緊
- L3：每個星期日都會發生；喺今日頁開始播都唔會淡出
- 方案 A（推薦）：`InnerPage` today 帶埋頁面日子，`{ kind: 'today'; date: string | undefined }`，由 `useTodayPage` 嘅 `todayView().date` 傳入。`belongsTo` 比較 `item.date === page.date`。咁就同頁面同一個日子來源，連帶解決午夜轉日時頁面同把手唔一致嘅問題。代價：`TODAY_PAGE` 唔再係常數，要用 `useMemo` 或者傳 primitive
- 方案 B：`usePageHandle` 入面用 `pickTodayDate(recordings, hkToday())` 計 today。代價：hook 要攞 recordings，日子邏輯重複
- 要補嘅測試：pageHandle 加 Sunday fallback case；TodayPage 加「星期日播備用日子嘅節目 → 冇把手」

## 🟢 Suggestions / Observations（入 backlog）

- S-664 `src/styles/global.css` back 規則：把手淡出緊（`data-leaving`）時撳返回，main 照樣冇咗名，張卡（已經係呢頁自己嘅嘢）會由半透明嘅把手放大出嚟。可以將 `:has([data-page-handle])` 收窄做 `:has([data-page-handle]:not([data-leaving]))`，把手規則都一樣收窄
- S-665 `src/hooks/usePageHandle.ts`：由闊橫版轉做唔闊（轉直）都會回傳 null，觸發 240ms 淡出，期間把手同 reserve 會喺直版出現。可以 `!wide` 時唔淡出，即刻拆走
- S-666 `PlayerHandle.tsx`：淡出淨係靠 `animationend`。如果動畫畀人 cancel（例如上層 `display:none`）就會一直停喺 `leaving`：把手 opacity 0，但仍然撳得到，reserve 又唔收。建議加 `onAnimationCancel={onAnimationEnd}`，或者一個同 token 時長一樣嘅 timeout 做後備。目前未搵到實際觸發路徑；tab 收埋只係延遲，最後都會觸發
- S-667 淡出緊嘅把手仍然 focus 到、撳到，讀屏名仲係舊嗰個（「播放中：{舊名}」）。`leaving` 時可以加 `inert`。如果把手正有 focus 就畀拆走，focus 會跌返去 body
- S-668 `prefersReducedMotion()` 喺 render 入面讀，唔會跟住 media 變；可以改用 `useMediaQuery(REDUCED_MOTION_QUERY)`，同 `usePageHandle` 嘅做法一致
- S-669 DRY：`findShow(id)?.name ?? ''` 喺 `useMiniPlayer.showName` 同 `pageHandle.trackView` 各寫一次。把手同卡嘅名一定要一樣先 morph 得順，建議抽一個 catalog helper 兩邊共用
- S-670 `PlayerHandle` `STATUS_TEXT` 混用 `pageHandle.playingStatus` 同 `homeCard.pausedStatus` 兩個 namespace，可以搬做共用嘅 `playerHandle.{playing,paused}Status`

## Design Fidelity

- Design Origin 存在，mockup 路徑存在，結構同 mockup 一致：status / disc / name / ‹，`aria-hidden` 狀態字，讀屏名「播放中 / 已暫停：{name}，返回主頁」
- 顏色全部用 token：播放中 `--color-status-playing`（= `--theme-accent-text`，對應 mockup `--accent`），已暫停 `--color-text-muted`。冇 hardcoded hex；新 token `--duration-page-handle-fade`；`HANDLE_ICON_SIZE` 係命名常數
- Component 用 folder 結構；冇 inline SVG；命名冇縮寫

## View-transition 撞名檢查（S-633）

back 舊畫面入面得把手一個叫 `player-panel`：main 被 `:has([data-page-handle])` 改成 `none`，specificity 0,3,2 高過 0,2,2；h1 / gauge 都改成 `none`，內頁 `PlayerGauge` 冇 inline `transitionName`，所以 CSS 蓋得到。主頁把手只係 close / open 先有名。今日頁 main 冇 `data-player-page`，冇嘢要拿走。新畫面就得 `HomePlayerCard` 一個。主頁閂咗卡時，把手冇對應嘅元素，只會淡出，可以接受（答 developer 嘅問題）。出現時冇淡入，spec 冇要求，同主頁把手一致，OK

## Developer 偏離項

`PlayerItem` 加入 closed store（store 喺 memory，`item?` fallback 只服務測試 / 未來呼叫者，OK）；`:only-child` 改做 `:not(:has(~ .listColumn))`，四頁 DOM 都核對過，行為等價；`data-status`、AnimationEvent polyfill（喺 setup 排第一，有註解）、e2e 用 chisee：全部接受

## ✅ 做得好嘅地方

- `pageHandle` 係純 selector，測試矩陣齊（自己 / 其他 / 閂卡 / 未知 item / track 優先）
- `PlayerHandle` 抽出嚟之後，home handle 變成薄薄一層 wrapper，CSS 搬走冇重複
- `useFadeOut` 用 render 期間 setState，唔使 effect；用 key 比較，避免每次 render 嘅新 object 被當成「變咗」

## 修訂代碼（W-525，方案 A）

```ts
// src/selectors/pageHandle.ts
export type InnerPage =
    | { kind: 'show'; showId: ShowId }
    | { kind: 'drama'; dramaId: DramaId }
    // 今日頁列緊嘅日子（pickTodayDate：星期日用最近有錄音嗰日），唔係 hkToday()
    | { kind: 'today'; date: string | undefined };

const belongsTo = (item: PlayerItem, page: InnerPage): boolean => {
    if (page.kind === 'today') return item.kind === 'show' && item.date === page.date;
    if (page.kind === 'show') return item.kind === 'show' && item.id === page.showId;
    return item.kind === 'drama' && item.id === page.dramaId;
};
// PageHandleInput 拎走 today；usePageHandle 唔再叫 hkToday()
// TodayPage：<InnerPageHandle page={{ kind: 'today', date: state.date }} />（useTodayPage 暴露 todayView().date）
```

## Handoff receipt

見 reviewer 回傳嘅 HANDOFF_RECEIPT block。
