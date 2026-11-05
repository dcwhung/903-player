# Code Review — 2026-11-05 — 主頁第三個 tab「冇收藏有收聽記錄」

- 審閱者：Code Reviewer（獨立）
- 目標：`8cfbd15..e286912`（1 個 commit，`feat(bookmark): show recent listens as the third home tab without bookmarks`）
- Design Origin：`mockup: _mockups_/qr-transfer/index.html`（`origin/feature/transfer/qr-sync`，① ②）；用戶決定未 release 跟進唔 bump
- Tier：T2（UI 狀態 + selector + 過場）
- 總評：三種狀態、★ ↔ 歷史 icon、淡出 / 淡入同 S-666 後備都做得穩陣，test 覆蓋足。一個 🟡：窄橫版兩欄最近收聽，第 7–10 集跌咗出畫面

## Hard Gates

all pass — `npx tsc -b` exit 0；`npm run lint`（eslint + prettier）exit 0；相關 unit（HomeTabs、SavedTab、HomeSaved、HomePage、selectors/bookmarks、useHomeTab、PlayerHandle）10 files / 148 tests 全綠（冇跑 full suite / e2e）；冇新依賴。

CI（同一個 SHA `e286912`）：見文末「CI」一節。

## 評分結果

| 維度     | 得分   | 滿分    | 備注  |
| -------- | ------ | ------- | ----- |
| 正確性   | 20     | 25      | W-535 |
| 安全性   | 20     | 20      |       |
| 可維護性 | 20     | 20      |       |
| 測試覆蓋 | 15     | 15      |       |
| 性能     | 10     | 10      | S-709 |
| 代碼風格 | 10     | 10      |       |
| **總分** | **95** | **100** |       |

**結果：✅ pass**（≥ 90、無 🔴；W-535 建議 merge 去 main 之前修）

## 🟡 Warning

### W-535 窄橫版「最近收聽」兩欄：第 7–10 集跌入睇唔到嘅溢出欄，捲唔到

- 位置：`src/components/pages/home/SavedTab/SavedTab.module.css:356-365`（`.recentList`：`flex: 1 1 0` + `min-height: 0` + `overflow-y: auto`）× `RecentPanel.tsx:56`（`style={{ columnCount: columns }}`）× `selectors/bookmarks.ts:127`（`land: 2`）
- L1：需求「最近收聽最多 10 集、panel 入面自己捲」；mockup ② 註明清單自己捲（`.recent-list overflow-y: auto`）
- L2：`shots7b/land-B.png`（844×390）：只見 6 行，第二欄由第 4 集（西加航空 16/10）開始 → 欄序係直排、每欄 3 行，第 7–10 集排咗去第 3、4 欄，喺 panel 右邊外面，向下捲唔到。e2e `starsAligned` 只數 DOM `li`（`rows === 10`）同每行自己嘅 ☆ 位置，所以照過
- L3：CSS multi-column 喺高度固定（definite height）時，放唔落嘅內容會開新欄向 inline 方向溢出，唔會變成直向捲動。闊橫版夠高（每欄 5 行）先睇唔出；mockup 都係同一寫法，不過示範資料冇咁多行
- 方案 A（推薦）：捲動放外層：`.recentList` 外面包一個 `overflow-y: auto` 嘅 wrapper，`ul` 本身高度 auto（multicol 自動平衡做 N 欄），保留直排次序同 `break-inside: avoid`
- 方案 B：`ul` 改 `display: grid; grid-template-columns: repeat(N, minmax(0, 1fr))` + `overflow-y: auto`：一定直向捲，但次序變橫排（新 → 舊由左至右），要同用戶確認同 mockup 唔同
- 修完應該加 e2e 斷言：最後一行 `scrollIntoView` 之後喺 panel 可見範圍入面（見 S-711）

## 🟢 Suggestion / Observation

- S-709 `src/pages/home/useSavedView.ts:111-128,143-149`：`HomePage` 本身經 `usePlayer` 每個 tick 都 re-render；`useThirdTab` 每次 render 都 `new Set` + `recentListens`（成個 progress map `Object.entries` + sort），揀咗第三個 tab 時 `useSavedView` 再計多次。量唔大，但可以 `useMemo([progressMap, bookmarks, index])`
- S-710 `useSavedView.ts:100-108`：播 / 停先重新讀進度，靠 `AudioController.onStopped` 先 `update({ isPlaying: false })` 後 `persist()`，加上 React 喺 listener 行完先 flush `useSyncExternalStore` render。而家啱（HomePage test 有覆蓋），但係靠次序；長遠可以由 controller 喺 `persist` 之後 bump 一個 revision
- S-711 `e2e/bookmark.mjs:192-232`：`starsAligned` / `rows === RECENT_MAX` 只驗 DOM，冇驗每行喺 panel 可見範圍 / 捲得到，所以漏咗 W-535
- S-712 `SavedTab.tsx:88-97`：淡出緊嗰款用最新 `view` 畫（設計上刻意，避免移除咗嗰集彈返出嚟）；A → B 時淡出緊嘅收藏版係空 box 區，視覺上只係底色淡走，可接受，只記錄

## 重點核對

- useModeSwap：換嗰刻先叫 `prefersReducedMotion()`，唔 cache ✅；減少動態直接換、冇 `data-leaving` ✅；CSS 動畫全部喺 `prefers-reduced-motion: no-preference` 入面 ✅；`animationend` 只認自己（`event.target === event.currentTarget`）✅；`animationcancel` / 冇動畫時由 `useLeaveFallback` 按 `--view-transition-fade` token 後備拆走（S-666）✅；淡出緊嗰款 `inert` + `aria-hidden` + `pointer-events: none` ✅；新款排喺 DOM 前面，`data-zoom-key` zoom 入頁唔會搵到舊嗰款（W-527 / S-681）✅；快速 A → B → A 時同一個 key 嘅 Pane 由 leaving 變 entering，timer 由 effect cleanup 清走 ✅
- thirdTabOf / recentColumns：純函數，saved 優先、兩樣都冇 = null；直版 1、窄橫版 / 闊橫版 2，同 mockup `cols` 一致 ✅
- useHomeTab：`hasThird` 取代 `hasSaved`；移除最後收藏但有記錄就留喺第三格，兩樣都冇先跳返節目 ✅
- useLeaveFallback 加 `durationVar` 參數：預設值 = 原本 `--duration-page-handle-fade`，PlayerHandle 只傳 3 個參數，行為冇變；PlayerHandle 2 個 test 檔全綠 ✅
- tokens：`--home-tab-icon-off-scale`、`--home-tab-icon-turn-angle`、`--saved-recent-star` 有名有註解；時間全部用 `--view-transition-*` ✅
- A 狀態 RecentPanel：`columns` 預設 1；分隔線由「下一行頂」改「每行底（最後一行唔畫）」，一欄時效果一樣；新加 `.recentLabel` 省略號、`.recentOpen` overflow + 內縮 focus ring，同 B 一致 ✅（`shots7b/phone-A.png`）
- HistoryIcon：R2 逆時針箭咀時鐘，stroke 寬度有名常數 ✅；冇同步掣 ✅；i18n `home.tabRecent` ✅；讀屏名跟狀態換（我的收藏 / 最近收聽）✅
- e2e：三個版面 × 兩個情境；斷言 icon、region 名、`data-fill`、冇 box、☆ 對齊（長名）、移除最後收藏留喺第三格 ✅（缺口見 S-711）

## ✅ 做得好嘅地方

- 三種狀態收窄做一個 `thirdTabOf`，HomePage / useSavedView / HomeTabs 共用
- 過場重用 `useLeaveFallback`，冇另寫一套 animationend 後備
- node test 鎖住 CSS 合約（☆ 欄、分隔線、reduced motion）

## 修訂代碼（W-535 方案 A 示意）

```tsx
// RecentPanel.tsx：捲動喺外層，ul 高度 auto，multicol 平衡做 N 欄
<div className={styles.recentScroll}>
    <ul className={styles.recentList} style={{ columnCount: columns }}>
        …
    </ul>
</div>
```

```css
/* SavedTab.module.css */
.recentScroll {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
}
.recentList {
    margin: 0 calc(-1 * var(--saved-disc-ring));
    padding: 0 var(--saved-disc-ring);
    list-style: none;
    column-gap: var(--saved-gap);
}
```

## CI

- `e286912` → run [#87 / 42090758009](https://github.com/dcwhung/903-player/actions/runs/42090758009)：**success**（Detect code changes ✅、Lint, unit & build ✅、E2E (Playwright) ✅）
- E2E 綠唔代表 W-535 冇事：`checkRecentOnly` 只數 DOM 行數，冇驗可見 / 捲得到（S-711）

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/bookmark/episode"
context: "Recent-only third tab e286912 passes at 95 (CI run 87 green). W-535: in narrow landscape the two-column recent list pushes rows 7-10 into horizontal overflow columns that cannot be scrolled to; fix before merging to main. Integration branch is main."
```

## Re-review 4327328（W-535）

- 範圍：`b541785..4327328`（1 個 commit：`fix(bookmark): scroll the recent list wrapper so columned rows stay reachable`）
- Hard gates：all pass：`npx tsc -b` exit 0；`npm run lint` exit 0；相關 unit（SavedTab、HomeSaved、HomePage）4 files / 84 tests 全綠（冇跑 full suite / e2e）
- CI（同一個 SHA `4327328`）：run [#89 / 42097862989](https://github.com/dcwhung/903-player/actions/runs/42097862989)：**success**（Detect code changes ✅、Lint, unit & build ✅、E2E (Playwright) ✅）
- 新分數：**100 / 100**，✅ pass

| ID    | 狀態    | 覆核                                                                                                                                                                                                                                                                                                |
| ----- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-535 | ✅ 已修 | `RecentPanel.tsx:56-63` 加 `div.recentScroll`（`flex: 1 1 0`、`min-height: 0`、`overflow-y: auto`），`ul.recentList` 冇固定高度，分欄自動平衡、保持直排次序（`SavedTab.module.css:355-374`）。CI e2e `rowsReachable` 喺直版 / 窄橫版 / 闊橫版逐行 `scrollIntoView` 都喺可視範圍、冇橫向溢出，全部過 |
| S-711 | ✅ 已補 | e2e `rowsReachable`（`e2e/bookmark.mjs:214-246`）：developer 報修之前紅（直版 682 > 339、窄橫版 1590 > 793），修完 CI 綠                                                                                                                                                                            |

Developer 講「A 狀態第 4 行之後都溢出，即係 v1.27.0 原有 bug 一齊修咗」：**部分唔啱**。

- `8cfbd15`（v1.27.0 嘅收藏 tab）A 狀態 `ul` 冇 `column-count`，係普通直向捲動清單，冇呢個 bug
- 係 `e286912` 加咗 `style={{ columnCount: columns }}`（A 狀態預設 `1`）之後，`column-count: 1` 都令 `ul` 變成 multi-column 容器，喺固定高度入面同樣開溢出欄。即係 A 狀態嘅溢出係 W-535 同一個 commit 帶入嚟，今次一齊修咗，結論冇變，只係來源唔係 v1.27.0
- 修完 A / B 兩個狀態用同一結構 ✅

新增 🟢：

- S-713 `RecentPanel.tsx:58`：A 狀態 `columns = 1` 都照寫 `column-count: 1`，令清單仍然係 multi-column 容器。而家高度跟內容所以冇害；可以 `columns > 1` 先設，少一層 multicol layout

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/bookmark/episode"
context: "Re-review 4327328: W-535 fixed and S-711 e2e added (CI run 89 green). The A-state overflow came from e286912, not v1.27.0. Only new 🟢 is S-713. Integration branch is main."
```
