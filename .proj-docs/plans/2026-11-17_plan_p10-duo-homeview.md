# P10 開發 plan：iPhone Duo + HomeView square（v2.0.0）

## 進度（2026-11-18）

| Lane | 狀態                                                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| 0    | ✅ merge 入 `release/v2.0.0`（PR #268）：`npm run e2e:visual`                                                                |
| 1    | ✅ merge 入 `release/v2.0.0`（PR #269）：裝置常數、PostCSS plugin、24px 邊框、闔上・橫；review W-782–W-786、QA CUI-0025 已修 |
| 2    | ✅ merge 入 `release/v2.0.0`（PR #270）：Duo 闔上・直「最近收聽」改矮                                                        |
| 3    | PR 開緊：新主頁（Duo 打開・橫 + HomeView）                                                                                   |
| 4–7  | 未開始                                                                                                                       |

用戶決定（2026-11-18，lane 1 review）：

- **Mini player / 短提示**：Duo 四種姿勢左右底一律 24px，同主頁格邊對齊（揀 B）
- **打開・直主頁**：橫額、分類掣、節目格都要用盡闊度（lane 5 嘅全闊 3 欄一齊做），做完先同 mini player 對齊
- **打橫嘅全集表 / 資料表**：伸出邊框貼畫面邊（同 preview、同直向姿勢一致）
- **S-1121**：打開・直範圍可能撞到 7–8 吋 Android 平板直放（約 600×890），接受，唔收窄範圍

- Preview：iPhone Duo https://claude.ai/artifact/RXUj9gRYWfXREpJdMfGBiU 、HomeView https://claude.ai/artifact/9Y2LPEHhPeJuSqo3rkjxFB
- 量度方法：headless Chromium 開 `progressier.com/iphone-duo-simulator`（three.js 由 npm `three@0.128.0` 經 Playwright route 本地餵），讀 iframe 嘅 `innerWidth` / `innerHeight`

## Context

兩份 preview 已全部確認（`_mockups_/iphone-duo` 第 7 版、`_mockups_/home-view` 第 8 版），Preview Gate 過咗，可以開發。目標：903 Player 喺 iPhone Duo 五種姿勢同 HomeView 方形螢幕有專用版面。

**硬性限制**：現有普通手機直／橫、平板直／橫、電腦橫版嘅顯示一定唔可以變。

你已決定：用 `release/v2.0.0` + 逐個 PR；新主頁冇播放卡時疊卡變兩欄鋪滿，閂咗卡就出返現有把手。

## 隔離做法

所有新行為只寫喺**新增**嘅 media query 入面，現有 CSS 規則同三個現有斷點常數（640 / 561 / 562）唔改。

`apps/player/src/config/layout.ts` 新增（範圍同時包 simulator 實測值同 Progressier FAQ 值）：

| 常數                        | 條件                       | 對應                       |
| --------------------------- | -------------------------- | -------------------------- |
| `DUO_COVER_PORTRAIT_QUERY`  | 直、闊 420–470、高 590–690 | 闔上・直 426×612           |
| `DUO_COVER_LANDSCAPE_QUERY` | 橫、闊 600–639、高 ≤ 450   | 闔上・橫／Standing／Seated |
| `DUO_OPEN_LANDSCAPE_QUERY`  | 橫、闊 860–900、高 600–640 | 打開・橫 876×612           |
| `DUO_OPEN_PORTRAIT_QUERY`   | 直、闊 600–640、高 860–900 | 打開・直 612×876           |
| `SQUARE_QUERY`              | 闊 520–568、高 520–568     | HomeView 544×544           |

現有 e2e 用嘅 27 個 viewport 冇一個入到呢啲範圍（最接近：568×320、667×375、960×640、430×932）。

**闔上・橫點樣重用手機打橫版面而唔改現有 CSS**：手機打橫版面散落喺 12 個 CSS 檔約 20 個 `@media` 區塊。加一個細 PostCSS plugin（`apps/player/scripts/postcssDuoLandscape.ts`，經 Vite `css.postcss`），build 時將每個「橫版」同「手機打橫」區塊複製一份、條件換成 `DUO_COVER_LANDSCAPE_QUERY`。Source 唔郁；兩個條件嘅闊度範圍唔重疊，複製品永遠唔會喺現有裝置生效。

## Lanes（順序做，每條一個 PR 入 `release/v2.0.0`）

每條 lane 跟 `/feature`：TDD → Code Reviewer → QA S1 → CI 綠先 merge，再開下一條。

| #   | 範圍                                                                                                                    | QA chain                           |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 0   | 「現有裝置零改變」比對工具（見 Verification）                                                                           | `repo-tooling`                     |
| 1   | 五個常數 + CSS 鎖定測試；PostCSS plugin；Duo 四邊 24px；闔上・橫／Seated／Standing 入手機打橫版面、左欄 46%             | `ui-foundation`                    |
| 2   | 闔上・直「最近收聽」改矮（只限 Duo）                                                                                    | `home`、`bookmark`                 |
| 3   | 新主頁（Duo 打開・橫 + HomeView 共用）：左固定闊版橫額 + 分類掣 + 疊卡 scroller，右播放卡                               | `home`、`card-zoom`、`mini-player` |
| 4   | Duo 打開・橫內頁兩欄對齊摺位                                                                                            | `show-today-page`、`drama`         |
| 5   | Duo 打開・直：主頁 3 欄；今日節目卡近正方形；節目頁／廣播劇頁日子條、短篇選擇搬去右邊直排；全集表／資料表最高到摺位     | `home`、`show-today-page`、`drama` |
| 6   | HomeView 節目頁：播放器為主、頁頭清單 icon + badge、清單 sheet                                                          | `show-today-page`、`player-core`   |
| 7   | HomeView 今日節目（普通播放器 + 節目 selector + ⓘ）同廣播劇頁（未揀短篇 → 全集表；播緊短篇 → 短篇表連橫額同「全集」掣） | `show-today-page`、`drama`         |

Branch：lane 0–5 喺 `feature/layout/iphone-duo` 逐段出 PR；lane 6–7 喺 `feature/layout/home-view-square`。

## 主要改動同重用

- **24px 邊框**（lane 1）：`src/styles/tokens.css` 尾加 Duo 區塊，蓋 `--home-gutter`、`--mini-player-offset-bottom` 同頁面 padding token；`MiniPlayer.module.css` 加 Duo 區塊。鏡頭靠現有 `env(safe-area-inset-*)`。
- **闔上・橫**（lane 1）：plugin 複製 CSS；JS 嗰邊 7 個 `useMediaQuery(LANDSCAPE_QUERY)` 同 3 個 `SHORT_LANDSCAPE_QUERY` call site 改用新嘅合併常數（原 query 或 Duo query，現有裝置結果一樣）；`Page.module.css` 加 Duo 區塊設左欄 46%。
- **最近收聽**（lane 2）：`SavedTab.module.css` 喺 `.recent` 後加 Duo 闔上・直區塊。
- **新主頁**（lane 3）：`pages/home/homeLayoutMode.ts` 加 `shelfSplit` mode（`shelf` 為 false 時行為不變）；新 `pages/home/HomeShelfSplit.tsx`，左邊重用 `HomeBanner`（`assets/banner-wide.webp`）、`HomeTabs`、`DramaShelf`，右邊重用 `HomeWideCard`。`DramaShelf` 加可選 `stacked`／`label` prop，`DramaShelfItem` 加可選 `zoomKey`；新 `useShowShelfItems` 將節目轉成 `DramaShelfItem`。冇播放卡時沿用 `fill` 語意（兩欄鋪滿），閂咗卡用現有 `HomePlayerHandle`。
- **打開・橫內頁**（lane 4）：`Page.module.css` Duo 區塊用 `calc(50vw − 左 padding)` 定欄闊（右邊有把手預留位，唔可以淨係用 50%）。
- **打開・直**（lane 5）：`showGridPages.ts` 嘅 `portraitColumns` 加可選上限（預設仍然 2）；`ShowCardStack.module.css`、`PlayerPanel.module.css`、`DateStrip`、`ArcPicker` 加 Duo 區塊；`DateStrip` 加直排 prop（而家只識橫向拖）；`--arc-sheet-max-height: 50%`。
- **HomeView 內頁**（lane 6–7）：四個頁面 component 用 `useMediaQuery(SQUARE_QUERY)` 分支；新 `ListButton`（連 badge）、`ListSheet`（照 `ArcSheet.tsx` 用 `useSheetPresence`、`useSheetBehaviour`、`SheetOverlay`、`SheetMotion.module.css` 砌，入面放現有 `EpisodeList`）、`ShowSelector`、`ArcEpisodesSheet`。動畫跟現有 reduced-motion 做法。
- **鎖定測試**：擴充 `styles/landscapeBreakpoint.node.test.ts`、`shortHeightBreakpoint.node.test.ts`；新 `styles/deviceQueries.node.test.ts`（CSS 入面嘅 Duo／square 條件必須同常數一字不差；五個常數對一份凍結嘅現有 viewport 清單全部唔 match）。

## 已知風險

- **打開・直範圍可能撞到 7–8 吋 Android 平板直放**（約 600×890，冇實機驗證）：用戶 2026-11-18 接受，呢類平板用 3 欄主頁都合理

- **範圍比對唔係絕對**：電腦視窗啱啱拉到呢啲尺寸、或者 Android 手機開鍵盤時高度縮到範圍內，會入到新版面。App 冇文字輸入位，實際機會好低。
- **Duo 版面只對安裝咗嘅 PWA 生效**：尺寸係全屏量嘅；喺 Safari 分頁開，工具列會令高度跌出範圍，退返現有版面。
- **612px 闊比現有測過嘅手機打橫（最窄 667px）仲窄**：主頁橫額格、今日節目頁頭指示點要逐樣核對。
- **冇真機**：尺寸、圓角、摺位全部跟 simulator；HomeView 544×544 係假設。
- 新主頁嘅卡片放大過場（card zoom）來源由節目格變咗疊卡，要補對應。

## Verification

- 每條 lane：`npm test`、`npm run lint`、`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`；新增 `e2e/duo.mjs`、`e2e/square.mjs`，用實測 viewport 斷言版面（例如打開・橫欄邊喺 x = 438 ± 1、四邊 ≥ 24px）
- **現有裝置零改變**（lane 0 建立，之後每個 PR 都跑）：`npm run e2e:visual` 將 merge-base 同當前各 build 一次，用同一個 Chromium、固定時鐘，對凍結清單入面每個現有 viewport × 每頁（主頁三個分類、節目頁、今日節目、兩種廣播劇頁；有／冇 mini player）截圖，逐張 byte 比對要完全一樣；另外比對一批元素嘅位置數值。版本號同播放時間會遮住
- 每條 lane 完成後用 headless Progressier simulator 影一次，同 preview 對照
- 全部 lane merge 後：QA S3 全面驗收；跑 full suite 之前先知會你（版本 1.37.x → 2.0.0、指令、預計時間）；全綠先 bump 版本、`release/v2.0.0` 開 PR 入 `main`
