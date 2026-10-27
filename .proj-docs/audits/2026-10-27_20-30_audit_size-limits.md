# 架構審計報告：尺寸上限（檔案 / component / 函數）

**日期**：2026-10-27 20:30
**項目**：903-player（v1.18.3，`main` @ `1424092`）
**審計員**：Architect Agent
**範圍**：聚焦「超上限嘅檔案 / component / 函數」；唔改 src、唔開 branch。圖表（flow / data-flow / ERD）唔喺今次範圍。

---

## 項目概覽

- **類型**：PWA Web App（純前端，冇 backend / DB）— 收聽 903 節目重溫錄音同廣播劇
- **狀態**：Active（每日多個 PR，v1.10 → v1.18 喺兩日內）

### 規則來源（今次審計嘅判準）

| 規則                                         | 上限                             | 適用                                                       | 來源               |
| -------------------------------------------- | -------------------------------- | ---------------------------------------------------------- | ------------------ |
| 函數長度                                     | ≤ 30 行（總行數，連註解 / 空行） | 所有非 component 函數、hook、effect callback、class method | global-rules       |
| React component                              | ≤ 50 行                          | 回傳 JSX 嘅 component 函數                                 | global-rules       |
| component 檔案                               | ≤ 150 行                         | 只限 `.tsx` component 檔（唔計 test）                      | sw-coding-style-ts |
| `.ts` 檔（hook / service / util / selector） | 冇檔案上限                       | 只受函數上限約束                                           | sw-coding-style-ts |

**豁免（用戶已決定）**：資料檔唔受檔案行數約束。

| 檔案                     | 行數 | 豁免理由                                                           | 邏輯函數有冇超 30 行                                                     |
| ------------------------ | ---- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `src/i18n/zh-HK.ts`      | 187  | 純字串表（i18n dictionary），行數隨文案增長，拆開只會令查 key 更難 | 冇函數                                                                   |
| `src/dramas/schema.ts`   | 257  | 劇集 JSON 定義嘅型別 + token 表 + parser；主體係 schema 宣告       | 冇（AST 量度：所有 parser 函數 ≤ 30，`parseDramaDefinition` 亦喺上限內） |
| `src/dramas/registry.ts` | 154  | 劇集 registry 型別 + 組裝                                          | 冇（`buildRegistry` 等全部 ≤ 30）                                        |

---

## Tech Stack

| 層級          | 技術                                                     | 版本            | 備注                                                                            |
| ------------- | -------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------- |
| Frontend      | React                                                    | ^19.3.1         | 有開 `eslint-plugin-react-hooks` 7（含 React Compiler 規則 `react-hooks/refs`） |
| Routing       | react-router-dom                                         | ^7.18.4         | `/show/:id`、`/drama/:dramaId`、today、home                                     |
| 語言          | TypeScript                                               | ^6.0.3          | `tsc -b`（app + node 兩個 project reference）                                   |
| Build         | Vite + vite-plugin-pwa                                   | ^8.3.4 / ^2.0.0 | Service worker 更新由 `src/pwa/updateManager.ts` 控制                           |
| 測試          | Vitest + Testing Library + jsdom                         | ^5.0.5          | `e2e/` 用 Playwright（`npm run e2e`）                                           |
| Lint / Format | ESLint 10 flat config + typescript-eslint 8 + Prettier 3 | —               | **未有**任何尺寸規則（`max-lines*`）                                            |
| Backend / DB  | 無                                                       | —               | 狀態全部喺 `localStorage`                                                       |
| Infra         | 靜態 hosting（PWA）；音檔來自外部 origin                 | —               | 見下面 API 結構                                                                 |

---

## 目錄結構

| 目錄                                                                  | 用途                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/`                                                          | 路由頁（`HomePage`、`ShowPage`、`TodayPage`、`DramaPage`）+ 頁級 view-model hook（`useShowPage`、`useTodayPage`、`useDramaPage`）+ 清單行 mapper（`episodeItems`、`dramaItems`、`todayItems`）+ 共用 `Page.module.css` |
| `src/components/<Name>/`                                              | 每個 component 一個 folder：`Name.tsx` + `Name.module.css` + `Name.test.tsx` + 本地 hook（`useXxx.ts`）+ 純函數（camelCase `.ts`）                                                                                     |
| `src/player/`                                                         | `AudioController`（唯一 `HTMLAudioElement` 嘅 facade）、`PlayerProvider`、`usePlayer`、Media Session、自動接集 `nextTrack`、`playbackLog`                                                                              |
| `src/hooks/`                                                          | 跨頁共用 hook（`useMiniPlayer`、`useStartDrama`、`useMediaQuery`、`useBox`、`useSwipe`…）                                                                                                                              |
| `src/selectors/`                                                      | 純函數 selector（recordings、dramas、arcProgress、dramaShelf、miniPlayer）                                                                                                                                             |
| `src/services/`                                                       | `audioProbe`（探測 903 音檔）、`progressStore`、`probeStore`（localStorage 存取）                                                                                                                                      |
| `src/dramas/`、`src/shows/`、`src/catalog/`                           | 劇集 / 節目資料（folder 掃描 + JSON schema + 圖片）                                                                                                                                                                    |
| `src/pwa/`                                                            | 更新檢查 / 套用                                                                                                                                                                                                        |
| `src/config/`、`src/i18n/`、`src/utils/`、`src/types/`、`src/styles/` | 常數、文案、工具、型別、design token                                                                                                                                                                                   |

---

## 架構分析

- **分層**：Page（組版面）→ 頁級 hook（view-model）→ selector（純函數）/ player（命令）/ services（localStorage + 網絡）。分層方向正確，`madge` 確認 **0 個循環 import**（338 個檔）。
- **手勢層**：每個手勢 component 都有自己嘅 `useXxxDrag` / `useXxxGesture` hook，而且已經用「module-level 純函數 + 薄 hook」寫法（例如 `useCardDrag.ts` 嘅 `begin / track / release / abandon`）。拆檔時要沿用。
- **`react-hooks/refs` 約束**：render 期間唔准將 ref 傳入 factory。現有解法：`src/hooks/useBox.ts`（`useState(() => ({ current }))[0]`，穩定可變盒，lint 唔當佢係 ref）+ callback ref（例如 `ArcSheet` 嘅 `useSheetBehaviour.setSheet`、`MiniPlayer` 嘅 `bindContainer`）。**所有拆 hook 嘅方案都要保留呢個模式**：handler factory 收 `Box` / getter，唔收 `RefObject`；`useRef` 只可以喺 event / effect 時讀。
- **尺寸問題嘅成因**：違規集中喺「頁 component 同時負責 portrait / landscape 兩套 DOM 擺位」（`SeriesDramaPage`、`TodayPage`）同「component 檔塞埋 row 子 component + label 純函數 + scroll / focus hook」（`ArcSheet.tsx`、`EpisodeList.tsx`、`MiniPlayer.tsx`）。邏輯本身已經細粒度，問題係**檔案邊界**而唔係邏輯糾纏。

---

## API 結構

**N/A — 純前端，只有外部 903 audio / metadata 來源。** 冇自家 API endpoint；`src/` 內冇 `fetch(`（劇集 / 節目資料係 build 時 bundle 入嚟，`src/dramas/bundledSource.ts`、`src/catalog/`）。

| 外部來源                                                                                 | 定義位置                                                                                                            | 用途                                      | 存取方式                                                                                                                                  |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `https://audio.hkfm903.live/<節目名>/<YYYYMMDD>_<HHMM>_<節目名>.aac`                     | `ALLOWED_AUDIO_ORIGIN`（`src/config/constants.ts:36`）；URL 砌法 `buildAudioUrl`（`src/services/audioProbe.ts:70`） | 節目重溫錄音                              | `probeAudio` 用 `Audio` element 載 metadata 探測（found / missing / timeout，15 秒 timeout）；播放由 `AudioController` 直接設 `audio.src` |
| `https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev/<劇集 folder>/<短篇 folder>/<檔名>` | `DRAMA_AUDIO_BASE`（`src/config/constants.ts:42`）；`src/dramas/episodes.ts` 砌 URL                                 | 廣播劇錄音（Cloudflare R2 public bucket） | 直接播放；URL 係進度 key，**砌法唔可以改**                                                                                                |

---

## 數據結構（取代 DB）

### localStorage keys

| Key                         | 定義                                            | 內容                                                                                                    | 讀寫者                                                                          |
| --------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `903player:progress:v1`     | `PROGRESS_STORAGE_KEY`                          | `Record<url, { position, duration, watched, updatedAt }>`                                               | `services/progressStore.ts`（`AudioController.persist`、各頁 `getProgressMap`） |
| `903player:probed:v1`       | `PROBE_STORAGE_KEY`（`services/probeStore.ts`） | `ProbeState { found: Recording[], misses: Record<key, missedAt> }`，每節目最多留 50 集、miss 只留 14 日 | `services/audioProbe.ts`                                                        |
| `903player:home-tab:v1`     | `HOME_TAB_STORAGE_KEY`                          | 主頁揀咗嘅 tab                                                                                          | `hooks/useHomeTab.ts`                                                           |
| `903player:playback-log:v1` | `PLAYBACK_LOG_STORAGE_KEY`                      | audio event 診斷 log（版本號連撳 5 下複製）                                                             | `player/playbackLog.ts`                                                         |

（`hooks/miniPlayerDismissed.ts` 刻意只存 module memory，唔落 localStorage。）

### 劇集 schema（`src/dramas/schema.ts` → `registry.ts` → `types/drama.ts`）

- `DramaDefinition = SeriesDefinition | DailyDefinition`（JSON 定義，`parseDramaDefinition` 驗證；`SERIES_TOKENS` / `DAILY_TOKENS` 係檔名模板 token）
- `SeriesDefinition`：劇集 → 多個 `ArcDefinition`（短篇，有自己碟面 / 上架日）→ 集數
- `DailyDefinition`：`DailyEpisodeDefinition[]`（按日期）
- Runtime 型別：`Drama`（= `DramaConfig`）、`DramaEpisode = SeriesEpisode | DailyEpisode`（`kind: 'series' | 'daily'`），`url` 同時係進度 key

---

## 量度方法同 baseline

| 檢查                  | 指令                                                                                                                                         | 結果                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 函數 / component 長度 | `node node_modules/.audit-tmp/measure.cjs .`（TypeScript AST，包括 arrow / function / method / constructor / accessor）                      | 量咗 **1,172** 個函數，**13** 個超上限（下表）                                                                                |
| 交叉驗證              | `npx eslint --rule '{"max-lines-per-function":["error",{"max":30,"skipBlankLines":false,"skipComments":false}]}' 'src/**/*.ts'`（排除 test） | **9** 個，同 AST 量度嘅 9 個 hook 完全一致                                                                                    |
|                       | 同上 `max: 50`，`'src/**/*.tsx'`                                                                                                             | **4** 個，同 AST 量度嘅 4 個 component 完全一致                                                                               |
|                       | `max-lines: 150`，`'src/**/*.tsx'`（排除 test）                                                                                              | **4** 個檔，同量度結果 A 一致                                                                                                 |
| ESLint baseline       | `npx eslint .`                                                                                                                               | **0 error / 0 warning**（exit 0）                                                                                             |
| TypeScript baseline   | `npx tsc -b --noEmit`                                                                                                                        | **0 error**（exit 0）                                                                                                         |
| 循環 import           | `npx madge --circular --extensions ts,tsx --ts-config tsconfig.app.json src`                                                                 | **No circular dependency found**（338 檔；skip 咗 `../../index.html?raw` 同 `virtual:pwa-register` 兩個 Vite 虛擬模組，正常） |
| Test suite            | 冇跑（按指示）                                                                                                                               | —                                                                                                                             |

### 違規總表

**A. component 檔 > 150 行**

| 檔案                                         | 行數 | 對應 test                                        | test 數 |
| -------------------------------------------- | ---- | ------------------------------------------------ | ------- |
| `src/components/ArcSheet/ArcSheet.tsx`       | 278  | `ArcSheet.test.tsx`                              | 35      |
| `src/components/EpisodeList/EpisodeList.tsx` | 220  | `EpisodeList.test.tsx`                           | 21      |
| `src/pages/DramaPage.tsx`                    | 211  | `DramaPage.test.tsx` + `DailyDramaPage.test.tsx` | 31 +    |
| `src/components/MiniPlayer/MiniPlayer.tsx`   | 165  | `MiniPlayer.test.tsx`                            | 43      |

**B. 函數 / component 超上限**

| 檔案:行                                           | 名稱                       | 類型      | 總  | own | 上限 | 對應 test                                         |
| ------------------------------------------------- | -------------------------- | --------- | --- | --- | ---- | ------------------------------------------------- |
| `src/pages/DramaPage.tsx:115`                     | `SeriesDramaPage`          | component | 76  | 76  | 50   | `DramaPage.test.tsx`                              |
| `src/pages/TodayPage.tsx:60`                      | `TodayPage`                | component | 72  | 72  | 50   | `TodayPage.test.tsx`（18）                        |
| `src/components/ShowGrid/ShowGrid.tsx:33`         | `PagedShowGrid`            | component | 56  | 35  | 50   | `ShowGrid.test.tsx`（5）+ `showGridPages.test.ts` |
| `src/components/PlayerPanel/PlayerGauge.tsx:57`   | `PlayerGauge`              | component | 53  | 51  | 50   | `PlayerGauge.test.tsx`（21）                      |
| `src/pages/useShowPage.ts:54`                     | `useShowPage`              | hook      | 50  | 37  | 30   | 無直接；`ShowPage.test.tsx` 間接                  |
| `src/pages/useDramaPage.ts:191`                   | `useSeriesDramaPage`       | hook      | 41  | 41  | 30   | 無直接；`DramaPage.test.tsx` 間接                 |
| `src/components/DateStrip/useDateStrip.ts:66`     | `useDateStrip`             | hook      | 37  | 23  | 30   | 無直接；`DateStrip.test.tsx` 間接                 |
| `src/components/PageHeader/useFitText.ts:11`      | `useFitText`               | hook      | 36  | 4   | 30   | 無直接；`PageHeader.test.tsx` + `fitText.test.ts` |
| `src/components/PlayerPanel/useDiscTurn.ts:17`    | `useDiscTurn`              | hook      | 33  | 8   | 30   | `useDiscTurn.test.ts`（4）                        |
| `src/components/PageHeader/useFitText.ts:13`      | `useLayoutEffect` callback | effect    | 32  | 10  | 30   | 同上                                              |
| `src/hooks/useMiniPlayer.ts:161`                  | `useMiniPlayerContent`     | hook      | 32  | 30  | 30   | `useMiniPlayer.test.ts`（24）                     |
| `src/pages/useDramaPage.ts:52`                    | `usePlaybackRows`          | hook      | 32  | 26  | 30   | 無直接；Drama 頁 test 間接                        |
| `src/components/ShowCardStack/useCardDrag.ts:134` | `useCardDrag`              | hook      | 31  | 16  | 30   | 無直接；`ShowCardStack.test.tsx` 間接             |

**近上限觀察名單（未違規，但下次加嘢就會爆）**：`MiniPlayer` component 50/50、`ArcSheet` component 48、`ShowPage` 47、`HomePage` 45（`HomePage.tsx` 檔 149/150）、`ArcPicker` 39。

---

## 發現問題

### 🔴 Critical（架構級問題）

無。所有違規都係「邊界放錯位」，冇架構級耦合、冇循環依賴、lint / tsc 全綠。

### 🟡 Warning（設計問題 / 規則違規）

#### AU-001 `src/pages/DramaPage.tsx`（211 行）+ `SeriesDramaPage`（76 行）— 一個檔載住兩款劇集頁 + 三個 label 純函數

**現況**：檔入面有 `DramaHeader`（共用）、`arcPickerLabel` / `arcCover` / `seriesNowPlaying`（Series 專用純函數）、`DailyDramaPage`（34 行）、`SeriesDramaPage`（76 行：解構 13 行 + `arcSheet` element 13 行 + 兩欄 JSX 約 45 行）、`DramaPage` router。`SeriesDramaPage` 自己要處理「docked ArcSheet 喺左欄 `listBody` 入面 vs 直版喺 `<main>` 尾」同 `inert` 邏輯。

**方案 A（推薦，承接 reviewer 建議）— 按頁 + 按欄拆檔**

| 新檔                             | 內容                                                                                                                                                                                                        | 預計行數 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `src/pages/DramaHeader.tsx`      | `DramaHeader`（Daily / Series / not-found 共用）                                                                                                                                                            | ~15      |
| `src/pages/DailyDramaPage.tsx`   | `DailyDramaPage`（已有同名 test 檔，命名對得返）                                                                                                                                                            | ~55      |
| `src/pages/SeriesDramaPage.tsx`  | `SeriesDramaPage` + `arcPickerLabel` + `seriesNowPlaying` + 新 `SeriesPlayerColumn`（PlayerGauge / StatusMessage / NowPlaying）                                                                             | ~120     |
| `src/pages/SeriesListColumn.tsx` | `SeriesListColumn`：頁頭（橫版）+ `listBody` + `listContent inert` + `ArcPicker` + `EpisodeList`（`SERIES_LIST`）+ docked `ArcSheet` slot；同檔放 `SeriesArcSheet`（包 `ArcSheet` props 砌法 + `arcCover`） | ~95      |
| `src/pages/DramaPage.tsx`        | 只留 router（not-found + `key={drama.id}` 分派）                                                                                                                                                            | ~35      |

`SeriesDramaPage` 改用 `const view = useSeriesDramaPage(drama)` 唔再逐個解構（-12 行），再交 `view` 子集畀兩欄 → 預計 ~30 行。

- **行為改變點**：DOM 結構必須逐層保留（`page.playerColumn` + `detailedNowPlaying` class、`listColumn > listBody > listContent[inert]`、直版 `arcSheet` 係 `<main>` 最後一個 child）。`SeriesArcSheet` 要喺兩個位置用同一套 props（`current={recording === current ? current : undefined}`）。
- **CSS module**：所有新檔繼續 import `./Page.module.css`；ArcPicker / EpisodeList / ArcSheet 自己嘅 module 唔郁。
- **測試**：`DramaPage.test.tsx`（31）、`DailyDramaPage.test.tsx` 都係經 `DramaPage` route render，唔使改；refactor 前後全綠就係安全網。唔建議為新 sub-component 補 snapshot。
- **風險**：低-中。主要係 landscape / portrait 兩套擺位，要喺 test 入面確認 `matchMedia` mock 兩邊都行到（現有 test 有 landscape case）。

**方案 B — 只喺同一檔內抽 sub-component**

將 `SeriesPlayerColumn` / `SeriesListColumn` 抽做同檔 component，`SeriesDramaPage` 降到 ~30 行。

- 優：改動最細，冇新 import 路徑。
- 劣：檔案仍然 ~220 行，**AU-001 檔案上限未解決**；只能做緊急 hotfix 用。

**方案 C — 將 view 砌法搬入 hook**

`useSeriesDramaPage` 直接回傳 `{ playerColumn, listColumn, sheet }` 已砌好嘅 props object，component 純 spread。

- 優：component 最薄。
- 劣：hook 本身已超 30 行（AU-002），再加 view-shape 責任會更肥；而且 hook 會知道 component props 形狀，耦合加深。**唔推薦**。

#### AU-002 `src/pages/useDramaPage.ts` — `useSeriesDramaPage`（41）、`usePlaybackRows`（32）超 30；同 `useShowPage`（50）重複「揀集 / 撳集」邏輯

**現況**：`usePlaybackRows.selectEpisode / pressEpisode` 同 `useShowPage.selectEpisode / pressEpisode`（`useShowPage.ts` 73–86）係同一個「撳播緊嗰集就暫停，否則 `load(..., { autoplay: true })`」規則，兩度各寫一次。

**方案 A（推薦）— 抽共用 hook + 子 hook**

| 動作                                                                                                                                                                                                                              | 新檔 / 位置                           | 效果                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| 抽 `useEpisodePress(episodes, currentUrl, isPlayingCurrent)` → `{ selectEpisode, pressEpisode }`                                                                                                                                  | `src/hooks/useEpisodePress.ts`（~25） | `usePlaybackRows` 32 → ~22；`useShowPage` 50 → ~38 |
| `useShowPage` 再抽 `useShowStrip(show, episodes, currentUrl)`（`episodeDaysOnly` + `useMemo(stripDays)`）                                                                                                                         | `useShowPage.ts` 同檔                 | ~38 → ~28                                          |
| `useSeriesDramaPage` 抽 `useArcCounter(episodes, current)` → `{ arcTotal, arcPosition }` 同 `useSeriesSheet(firstVisit, loaded, pickArc)` → `{ open, setOpen, ...actions }`（合併 `useState(firstVisit)` + `useArcSheetActions`） | `useDramaPage.ts` 同檔                | 41 → ~28                                           |

- **行為改變點**：`pressEpisode` 兩邊判斷條件要一致：Drama 頁用 `isLoaded && player.isPlaying`，Show 頁用 `playing !== null && player.isPlaying` — 由 caller 傳 `isPlayingCurrent` 入去就唔會改語意。`useSeriesSheet` 嘅 `sheetOpen` 仲要畀 `useRefreshedOn` 做依賴（打開全集表要重讀進度），次序要喺 `progressMap` 之前。
- **測試**：冇直接 hook test；靠 `DramaPage.test.tsx`、`DailyDramaPage.test.tsx`、`ShowPage.test.tsx`（有 pause / toggle case）。建議為 `useEpisodePress` 補 3 個 `renderHook` test（揀集、撳播緊嗰集暫停、未載入時撳同一集 = 播）。
- **風險**：低。

**方案 B — 按款式拆檔**

`useDramaPage.ts` → `dramaPlayback.ts`（`useLoadedEpisode`、`useAutoplayDrama`、`usePlaybackRows`）+ `useDailyDramaPage.ts` + `useSeriesDramaPage.ts`（6 個 series 專用子 hook）。

- 優：內聚度更好，同 AU-001 方案 A 嘅頁面檔一一對應。
- 劣：單靠拆檔**唔會**令任何函數變短，一定要同方案 A 一齊做；import 路徑改動（`DramaPage.tsx` 兩個 import）令 L1 lane 更大。可以作為方案 A 嘅第二步（同一 PR 或者跟住嗰個 PR）。

#### AU-003 `src/components/ArcSheet/ArcSheet.tsx`（278 行）— row、label 文案、focus / drag 組合 hook 全部擠埋一個 component 檔

**方案 A（推薦）— 按責任拆四份，CSS module 唔拆**

| 新檔                                           | 內容                                                                                                  | 預計行數 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| `src/components/ArcSheet/arcLabels.ts`         | `arcStatus`、`joinStatus`、`visibleStatus`、`rowLabel`、`playLabel`、`GROUP_TITLES`                   | ~55      |
| `src/components/ArcSheet/ArcRow.tsx`           | `ArcRow`、`ArcCover`、`PlayButtonIcon`、`RowProps`、icon size 常數                                    | ~95      |
| `src/components/ArcSheet/useSheetBehaviour.ts` | `useSheetFocus` + `useSheetBehaviour`（保留 callback ref `setSheet` 同時填 focus ref 同 `bindSheet`） | ~45      |
| `src/components/ArcSheet/ArcSheet.tsx`         | `ArcSheetProps`、`ArcGroupBlock`、`sheetProgress`、`ArcSheet`                                         | ~110     |

- **CSS module**：`ArcRow.tsx` 同 `ArcSheet.tsx` 共用 `ArcSheet.module.css`（同 folder，可接受）。**唔好**同時拆 `ArcRow.module.css`：class hash 會變，雖然 test 冇用 class name（已核對，test 用 `data-role` / role / label），但 CSS 入面 `.current .ring` 之類跨 row / sheet 嘅 selector 會斷。
- **`ArcSheetProps` 循環**：`ArcRow.tsx` 要用 `Pick<ArcSheetProps, ...>`，而 `ArcSheet.tsx` import `ArcRow` → 形成 type-only 循環。做法：`ArcRow.tsx` 自己定義 `ArcRowProps`，`ArcSheet` 嘅 props 由 `ArcRowProps` 組合（`ArcSheetProps extends Omit<ArcRowProps, 'summary'>`），依賴單向。
- **測試**：`ArcSheet.test.tsx`（35，含 20 處 pointer / touch）唔使改；`arcLabels.ts` 拆出嚟之後建議補純函數 test（4 種狀態 × current / not current），成本低。
- **風險**：低。

**方案 B — 只抽 `ArcRow.tsx`（連 label 函數一齊）**

- 優：一刀過，PR 細。
- 劣：`ArcRow.tsx` ~140 行，貼住 150 上限，下次加狀態就爆；label 純函數同 JSX 混埋，難單獨測。

**附帶（S-516，同 lane、可選）**：`useSheetDrag.ts`（362 行）見 AU-011。

#### AU-004 `src/components/EpisodeList/EpisodeList.tsx`（220 行）— row 渲染同 scroll-to-current 行為擠埋

**方案 A（推薦）**

| 新檔                                               | 內容                                                                                                                   | 預計行數 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| `src/components/EpisodeList/episodeListTypes.ts`   | `EpisodeItem`、`EpisodeLabels`、`EpisodeScrollAlign` 型別                                                              | ~35      |
| `src/components/EpisodeList/EpisodeRow.tsx`        | `RowIcon`、`RowDate`、`UnavailableRow`、`EpisodeRow`                                                                   | ~95      |
| `src/components/EpisodeList/useScrollToCurrent.ts` | `ORIENTATION_QUERY`、`scrollToTop`、`useScrollMemo`、`useScrollToCurrent`                                              | ~70      |
| `src/components/EpisodeList/EpisodeList.tsx`       | props、`countText`、`EpisodeList`；**`export type { EpisodeItem, ... } from './episodeListTypes'` 保留舊 import 路徑** | ~60      |

- **點解要獨立型別檔**：`src/pages/episodeItems.ts`、`src/pages/dramaItems.ts` 由 `EpisodeList/EpisodeList` import `EpisodeItem`；`EpisodeRow.tsx` 都要用。型別留喺 `EpisodeList.tsx` 會出 `EpisodeList ↔ EpisodeRow` 循環（madge 預設會計 type import）。re-export 令 L1 lane（`pages/`）唔使改任何 import。
- **行為改變點**：`useScrollToCurrent` 依賴 `useMediaQuery` + `requestAnimationFrame`，搬檔唔改邏輯；`listRef` 繼續由 component `useRef` 傳入（effect 內讀，唔違反 `react-hooks/refs`）。
- **測試**：`EpisodeList.test.tsx`（21，35 處 scroll 斷言）唔使改。
- **風險**：低。

**方案 B — 只抽 `useScrollToCurrent.ts`**

- 優：最少改動，檔降到 ~150。
- 劣：剛好壓線（~150），冇 buffer；row 子 component 仍然同 list 混埋。

#### AU-005 `src/components/MiniPlayer/MiniPlayer.tsx`（165 行）+ `MiniPlayer` component 50/50 壓線

**方案 A（推薦）**

| 新檔                                           | 內容                                                                                 | 預計行數 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ | -------- |
| `src/components/MiniPlayer/dismissView.ts`     | `dismissData`、`offsetStyle`（DismissView → DOM data / CSS 變數，純函數）            | ~25      |
| `src/components/MiniPlayer/MiniPlayerDots.tsx` | `DOT_VARIANTS`、`dotVariant`、`DotsProps`、`MiniPlayerDots`                          | ~30      |
| `src/components/MiniPlayer/DismissButton.tsx`  | `DismissButton`（`aria-hidden` + `tabIndex=-1` + `data-testid="mini-player-close"`） | ~30      |
| `src/components/MiniPlayer/MiniPlayer.tsx`     | props、`stepShow`、`MiniPlayer`                                                      | ~105     |

- **順手修**：`MiniPlayer` 嘅 JSDoc（「主頁底部播放器…用 portal 掛喺 body」）而家錯放喺 `DOT_VARIANTS` 上面（第 52–56 行連住兩段 doc），搬檔時歸位。
- **component 50 行**：抽完子 component 冇直接減 `MiniPlayer` 行數。再將 `<section>` 入面四個 child 抽做 `MiniPlayerCard`（`MiniPlayerRow` + dots + progress + sr-only 關閉掣）可以降到 ~35 行，留 buffer。
- **CSS module**：新檔共用 `MiniPlayer.module.css`；`data-*` 屬性名唔可以改（CSS selector 靠佢）。
- **測試**：`MiniPlayer.test.tsx`（43）唔使改；`dismissView.ts` 可補 6 行嘅純函數 test（`data-lifted` 組合條件最易錯）。
- **風險**：低。`createPortal(document.body)` 只留喺 `MiniPlayer.tsx`。

**方案 B — 將 `useDismissGesture` 嘅 view → DOM 映射搬入 hook，hook 直接回傳 `containerProps` / `sectionProps`**

- 優：`MiniPlayer.tsx` 最薄（~90）。
- 劣：hook 回傳 DOM 屬性，同 CSS 命名耦合；`useDismissGesture.ts` 已 294 行，再加責任方向錯。**唔推薦**。

#### AU-006 `src/pages/TodayPage.tsx` — `TodayPage` component 72 行

**方案 A（推薦）— 抽「播放器欄」去自己檔**

| 新檔                              | 內容                                                                                                                     | 預計行數                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| `src/pages/TodayPlayerColumn.tsx` | `TodayStack`、`TodayNowPlaying`、新 `TodayPlayerColumn`（`LoadState` + 卡疊 / `TodayEmpty` 分支 + landscape NowPlaying） | ~85                     |
| `src/pages/TodayPage.tsx`         | `TodayPage`（header 砌法 + 兩欄外殼）+ 新 `TodayHeader`（`PageHeader` + `trailing={dots}`）                              | ~70；`TodayPage` ~35 行 |

- **行為改變點**：`dots` element 要喺兩個位置用（頁頭 `trailing` vs 卡疊下面），所以 `dots` 仍喺 `TodayPage` 砌，當 prop 傳落 `TodayPlayerColumn` / `TodayHeader`；`headerInList` 邏輯唔郁。
- **測試**：`TodayPage.test.tsx`（18）唔使改。
- **風險**：低。

**方案 B — 同檔抽 sub-component**：檔會由 131 升到 ~150 壓線，唔推薦。

#### AU-007 `src/components/ShowGrid/ShowGrid.tsx` — `PagedShowGrid` 56 行

- **方案 A（推薦）**：抽 `useGridPager(pageCount)` → `{ scrollerRef, index, onScroll, goTo }` 去 `src/components/ShowGrid/useGridPager.ts`（~30）。`PagedShowGrid` → ~40。`scrollerRef` 係 hook 內 `useRef`，handler 只喺 event 時讀，符合 `react-hooks/refs`。順手將 `Math.min(index, lastPage)` 收入 hook。
- **方案 B**：抽 `ShowGridPages` 純展示 component（`pages.map` 嗰段，~15 行）。
    - 優：完全唔郁狀態；劣：只減 ~12 行（→ 44），buffer 少。
- **測試**：`ShowGrid.test.tsx`（5）+ `showGridPages.test.ts`；建議 A 時補 `useGridPager` 嘅 `onScroll` 計 index test（`clientWidth === 0` guard）。風險：低。

#### AU-008 `src/components/PlayerPanel/PlayerGauge.tsx` — `PlayerGauge` 53 行

- **方案 A（推薦）**：抽 `GaugeActions`（restart + play/pause 兩粒掣，~25 行）同檔或者 `PlayerGaugeActions.tsx`；`PlayerGauge` → ~33。
- **方案 B**：抽 `GaugeTimes`（elapsed / total 兩個 `<span>`，~10 行）→ ~45。劣：buffer 細。
- 兩個都唔改 DOM；`PlayerPanel.module.css` 共用。`PlayerGauge.test.tsx`（21）唔使改。風險：極低。檔案 109 行，同檔抽都唔會超 150。

#### AU-009 細 hook 超 30 行（各自獨立、低風險）

| 位置                             | 推薦方案（A）                                                                                                                                | 備選（B）                                                                                                                                                                           | 預計                 | test                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------- |
| `useDateStrip`（37）             | 抽 `useStripInput(options, go)` → `{ onKeyDown, onTrackClick }` 同檔                                                                         | 抽純函數 `keyDirectionTarget(days, current, key)`，只減 ~5 行                                                                                                                       | ~22                  | `DateStrip.test.tsx`（5 處 key / click）間接；建議補 1 個 keyDown test |
| `useFitText`（36）+ effect（32） | 將 `fit` 主體搬去 `fitText.ts` 做 `applyFit(el, content, minPx)`（純 DOM 函數，喺 effect 時傳 element，唔係 ref）                            | 只抽 ResizeObserver 掛載做 `observeResize(el, fn)`                                                                                                                                  | hook ~18、effect ~14 | `fitText.test.ts` 已存在，可以直接加 `applyFit` test                   |
| `useDiscTurn`（33，own 8）       | 將 4 個 method 嘅 JSDoc 搬去 `interface DiscTurn` 宣告（文件唔減、行數 -4），**零行為風險**                                                  | 用 `useBox({ base, extra })` + module-level `createDiscTurn(box, getFace)`；但 `faceRef` 係公開 API（`Disc` 用 `ref={faceRef}`、`useGaugeGestures`），要改做 callback ref，churn 大 | ~29                  | `useDiscTurn.test.ts`（4）                                             |
| `useMiniPlayerContent`（32）     | 好似 `dramaMiniPlayer` 咁抽純函數 `showMiniPlayer(current, list, tags, index, ...)`（`src/hooks/useMiniPlayer.ts` 同檔）                     | 只抽 `onToggle` / `onOpen` 兩個 callback                                                                                                                                            | ~18                  | `useMiniPlayer.test.ts`（24）                                          |
| `useCardDrag`（31）              | 抽 module-level `clickCapture(event, motion, clicks)`；handler 保持 `(e) => clickCapture(e, motion, clicks)`（render 時唔傳 ref 入 factory） | `onLostPointerCapture` 同樣抽 `lostCapture(event, gesture, motion)` — `gesture` 係 `useRef`，只可以喺 event 時傳                                                                    | ~24                  | `ShowCardStack.test.tsx`（19 處 pointer）                              |

**`useDiscTurn` 推薦 A 嘅理由**：own 只有 8 行，超出純粹因為 JSDoc；用 B 改公開 ref API 換 4 行，唔抵。

### 🟢 Observation（可改善點，唔強制）

#### AU-010 ESLint 冇尺寸守衛 — 違規要靠人手 / 臨時 script 先發現

已用 CLI dry-run 驗證：ESLint `max-lines-per-function`（`skipBlankLines: false, skipComments: false`）嘅計法同今次 AST 量度**完全一致**（9 + 4 = 13），`max-lines` 同 4 個超 150 component 檔一致。建議設定：

```js
// eslint.config.js（加喺現有 config 之後）
const SIZE_LINES = { skipBlankLines: false, skipComments: false };
// ...
{
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.node.test.ts'],
    rules: { 'max-lines-per-function': ['error', { max: 30, ...SIZE_LINES }] },
},
{
    files: ['src/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: {
        // .tsx 入面主要係 component（≤ 50）；ESLint 分唔到 component / helper，見下
        'max-lines-per-function': ['error', { max: 50, ...SIZE_LINES }],
        'max-lines': ['error', { max: 150, ...SIZE_LINES }],
    },
},
{
    // 資料檔豁免（用戶決定）：只豁免檔案行數，函數上限照用
    files: ['src/i18n/zh-HK.ts', 'src/dramas/schema.ts', 'src/dramas/registry.ts'],
    rules: { 'max-lines': 'off' },
},
{
    // test：describe / it callback 天生長，唔受限
    files: ['**/*.test.{ts,tsx}', 'e2e/**', 'scripts/**'],
    rules: { 'max-lines-per-function': 'off', 'max-lines': 'off' },
},
```

- **Hook 主體**：hook 喺 `.ts` 檔，自然用 30 行上限，**唔需要** override。如果有 hook 寫喺 `.tsx`（例如 `ArcSheet.tsx` 嘅 `useSheetFocus`），會被當 component 用 50 行計 → 盲點。對策：規定 hook 一律放 `.ts`（AU-003 方案 A 已經將 `useSheetFocus` 搬出 `.tsx`）。
- **`.tsx` 入面嘅 helper 函數盲點**：已 dry-run `.tsx` 用 30 行，23 個命中**全部係 component**（今日冇 helper 喺 31–50 灰區），所以 50 行設定暫時冇漏報；長遠可以將 `node_modules/.audit-tmp/measure.cjs` 正式化為 `scripts/check-fn-size.mjs` 加入 `npm run lint`，用 AST 分 component / 非 component。
- **上線次序**：所有 AU-001–009 合併之前，規則先以 `'warn'` 落地會令 `npm run lint` 輸出 13+4 條 warning（唔 fail）；全部修完先轉 `'error'`。或者直接等全部 lane merge 後先加（見 lane plan L7）。
- **`max-lines` 唔加落 `.ts`**：同 sw-coding-style-ts 一致（hook / service 冇檔案上限）。

#### AU-011 非 component 大檔內聚度評估（只作 observation，唔違規）

| 檔案                              | 行數 | 單一職責？                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 評估                                                                                                                                                                            | 值唔值得拆                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `player/AudioController.ts`       | 430  | **半** — facade 同時管 7 樣嘢：(1) store（subscribe / snapshot / update / notify）(2) transport（load / play / pause / seek / skip / stop / restart，含 play generation / intent）(3) 進度持久化 + watched (4) 重播計時（`armReplay` / `trackReplay` / `resetReplay`）(5) 自動接集（`nextTrack` / `isAboutToEnd` / `advance`）(6) stall watchdog（iOS 鎖屏重試）(7) source 恢復（online / visibility）。13 個可變 private field，所有 method ≤ 30 行，36 個 test | 係「唯一 audio element」嘅合理 facade，但 (4)(6) 係自成一體嘅狀態機，佔 ~70 行同 3 個 field                                                                                     | **P2，值得但唔急**。抽 `StallWatchdog`（`retriesLeft` + timer，暴露 `watch(n)` / `cancel()` / `pending`）同 `ReplayTracker`（`replayedSeconds` + `lastTickPosition`）兩個細 class 去 `player/stallWatchdog.ts`、`player/replayTracker.ts`，Controller 降到 ~330、field 少 4 個。**風險高**：event 次序（`emptied` / `play` / `timeupdate`）同 iOS 行為測唔晒，一定要先跑 `AudioController.test.ts` + `e2e`，同埋唔好同其他 refactor 同 PR |
| `ArcSheet/useSheetDrag.ts`        | 362  | 否 — 三段：手勢核心（paint / settle / close timer / controls，~170）、清單 touch（~80）、pointer（~90）                                                                                                                                                                                                                                                                                                                                                          | 三段之間只靠 `SheetDragControls` 介面連繫，邊界清楚                                                                                                                             | **值得（S-516）**：`sheetDragCore.ts`（核心 + `SheetDragControls`）、`useListTouchDrag.ts`、`useSheetPointerDrag.ts`，`useSheetDrag.ts` 只組合（~30）。保留 `useBox` + `bindElements` getter 模式。冇直接 test，靠 `ArcSheet.test.tsx` 20 處 touch / pointer 斷言                                                                                                                                                                         |
| `MiniPlayer/useDismissGesture.ts` | 294  | 大致係 — 長按 → 左滑 → 關閉嘅一個狀態機                                                                                                                                                                                                                                                                                                                                                                                                                          | 純 transition 函數（`sync` / `settleBack` / `armIdle` / `lift` / `dismiss` / `releaseArmed` / `track` …，~140 行）同 hook 膠水（handlers / outside settle / container API）混埋 | **值得（S-516）**：`dismissSession.ts`（Session 型別 + transition 純函數）+ `useDismissGesture.ts`（hook + handlers）。純函數拆出後可以直接 unit test（而家冇直接 test）                                                                                                                                                                                                                                                                  |
| `DramaShelf/useShelfFocus.ts`     | 283  | 否 — layout 量度（`measure` / `resetScroll` / `useShelfLayout` / `useSnapOnScrollStart`）、tile style、scrub 手勢（`useShelfScrub` ~80）                                                                                                                                                                                                                                                                                                                         | 三組嘢只係共用 `ShelfLayout`                                                                                                                                                    | P2：`shelfLayout.ts`（量度 + style）+ `useShelfScrub.ts`。`DramaShelf.test.tsx` 54 處 pointer / scroll 斷言做安全網                                                                                                                                                                                                                                                                                                                       |
| `services/audioProbe.ts`          | 249  | 大致係 — 「探測 903 音檔」                                                                                                                                                                                                                                                                                                                                                                                                                                       | 包咗 URL 砌法 + `probeAudio`（DOM）、已存結果讀取（`readStoredRecordings` / `readUnavailableEpisodes`）、排程策略（`pendingSlots` / retry interval）、orchestrator              | P2：排程策略純函數可抽 `probeSchedule.ts`；49 個 test 已好完整，現狀可接受                                                                                                                                                                                                                                                                                                                                                                |
| `pages/useDramaPage.ts`           | 231  | 否 — 共用 playback 子 hook + daily + series 6 個子 hook                                                                                                                                                                                                                                                                                                                                                                                                          | 見 AU-002 方案 B                                                                                                                                                                | 隨 AU-002 一齊處理                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `pwa/updateManager.ts`            | 218  | **係** — 一個 class 管更新套用時機 + `startUpdateChecks` 接 env                                                                                                                                                                                                                                                                                                                                                                                                  | 內聚                                                                                                                                                                            | 唔使拆                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `DateStrip/dateStrip.ts`          | 202  | 半 — 日子資料（`stripDays` / `steppedDay`）+ 手勢幾何（`stripRelease` / `stripOffset` / `trackTransform`）+ 碟面旋轉（`rotationOf` / `uprightSpin` / `behindTurn`）                                                                                                                                                                                                                                                                                              | 全部純函數、23 個 test                                                                                                                                                          | P2：旋轉數學可抽 `discRotation.ts`；唔急                                                                                                                                                                                                                                                                                                                                                                                                  |
| `hooks/useMiniPlayer.ts`          | 200  | 係 — mini player view-model                                                                                                                                                                                                                                                                                                                                                                                                                                      | 劇集分支 `dramaMiniPlayer` + label helpers 可以搬 `selectors/miniPlayer.ts` 附近                                                                                                | 隨 AU-009 修 `useMiniPlayerContent` 時順手評估，唔強制                                                                                                                                                                                                                                                                                                                                                                                    |
| `ShowCardStack/useCardDrag.ts`    | 164  | 係                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 已係「純函數 + 薄 hook」                                                                                                                                                        | 唔使拆                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `selectors/recordings.ts`         | 158  | 係 — 錄音 selector                                                                                                                                                                                                                                                                                                                                                                                                                                               | 全部純函數                                                                                                                                                                      | 唔使拆                                                                                                                                                                                                                                                                                                                                                                                                                                    |

#### AU-012 測試安全網缺口

要拆嘅 hook 大部分冇直接 test（`useDramaPage`、`useShowPage`、`useDateStrip`、`useFitText`、`useCardDrag`、`useSheetDrag`、`useDismissGesture`、`useShelfFocus`），只靠 component / page 級 test 間接覆蓋。間接覆蓋對「純搬檔」足夠；但凡係**改簽名 / 合併邏輯**（AU-002 `useEpisodePress`、AU-005 `dismissView`、AU-011 `dismissSession`）就要先補直接 test 再 refactor（先綠後拆）。

---

## 技術債評估

| 類別       | 程度 | 描述                                                                                                  |
| ---------- | ---- | ----------------------------------------------------------------------------------------------------- |
| 代碼質量   | 低   | 1,172 個函數得 13 個超上限（1.1%），全部係邊界問題；lint / tsc 全綠；0 循環依賴                       |
| 測試覆蓋   | 中   | component / page 級 test 豐富（每個違規 component 檔都有 test），但手勢 / view-model hook 冇直接 test |
| 文件完整性 | 低   | 每個函數都有廣東話 JSDoc 解釋「點解」；少量 doc 錯位（AU-005）                                        |
| 安全性     | 低   | 音檔 origin 有 allowlist（`ALLOWED_AUDIO_ORIGIN`）；localStorage 讀取有 validation                    |
| 性能       | 低   | 無觀察到問題（今次範圍外）                                                                            |
| 規則執行   | 中   | 尺寸規則冇自動化，違規係累積落嚟（AU-010）                                                            |

---

## 建議方向

- **修復現有系統**：適用 — 所有問題都係局部、可逐 lane 處理，冇需要重建嘅跡象。預計 P0 + P1 合共 ~12–15 工時（7 個 PR）。
- **重建**：唔適用。
- **推薦**：按下面 lane plan 修復；先 P0（4 個超 150 component 檔 + 4 個超 50 component），再 P1（9 個 hook + ESLint 守衛），P2 內聚度拆分等相關功能下次改動時順手做。

### Refactor lane plan

**共用檔 / 依賴分析**

- `DramaPage.tsx` import `EpisodeList`、`ArcSheet`、`PlayerGauge`、`useDramaPage`；只要 L2 / L3 / L5 **保持公開 export 同 import 路徑不變**（`EpisodeList/EpisodeList` 繼續 re-export `EpisodeItem`；`ArcSheet/ArcSheet` 繼續 export `ArcSheet`），L1 同佢哋冇共用檔，可以並行。
- `useDramaPage.ts` 同 `useShowPage.ts` 會共用新 `useEpisodePress` → 放同一個 lane（L1）。
- `useMiniPlayer.ts` import `MiniPlayerProps`（`MiniPlayer.tsx`）→ 同 MiniPlayer 放同一 lane（L4）。
- `eslint.config.js` 只有 L7 改。
- **`package.json` version / session log**：每個 PR 都 bump version 會撞 → 由 main agent 喺 merge 時順序 bump（serial 點）。

| Lane                                       | 優先 | 範圍（AU）                                                                            | 改動檔案                                                                                                                                                                                                 | 可並行？                                                                            | 工作量                               |
| ------------------------------------------ | ---- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------ |
| **L1** `refactor/drama-page-split`         | P0   | AU-001（方案 A）+ AU-002（方案 A，選做方案 B）                                        | `pages/DramaPage.tsx` → `DramaHeader.tsx` / `DailyDramaPage.tsx` / `SeriesDramaPage.tsx` / `SeriesListColumn.tsx`；`pages/useDramaPage.ts`；`pages/useShowPage.ts`；新 `hooks/useEpisodePress.ts`(+test) | 同 L2–L6 並行                                                                       | M（3–4h）                            |
| **L2** `refactor/arc-sheet-split`          | P0   | AU-003（方案 A）+ 可選 S-516 `useSheetDrag` 分檔（AU-011）                            | `components/ArcSheet/*`（`arcLabels.ts`(+test)、`ArcRow.tsx`、`useSheetBehaviour.ts`、可選 `sheetDragCore.ts` / `useListTouchDrag.ts` / `useSheetPointerDrag.ts`）                                       | 並行                                                                                | M（2–3h；連 S-516 +1.5h）            |
| **L3** `refactor/episode-list-split`       | P0   | AU-004（方案 A）                                                                      | `components/EpisodeList/*`（`episodeListTypes.ts`、`EpisodeRow.tsx`、`useScrollToCurrent.ts`）                                                                                                           | 並行                                                                                | S（1.5–2h）                          |
| **L4** `refactor/mini-player-split`        | P0   | AU-005（方案 A）+ AU-009 `useMiniPlayerContent` + 可選 S-516 `useDismissGesture` 分檔 | `components/MiniPlayer/*`、`hooks/useMiniPlayer.ts`                                                                                                                                                      | 並行                                                                                | S-M（2h；連 S-516 +1.5h）            |
| **L5** `refactor/component-trims`          | P0   | AU-006、AU-007、AU-008                                                                | `pages/TodayPage.tsx` + 新 `TodayPlayerColumn.tsx`；`components/ShowGrid/ShowGrid.tsx` + `useGridPager.ts`；`components/PlayerPanel/PlayerGauge.tsx`                                                     | 並行                                                                                | S（1.5–2h）                          |
| **L6** `refactor/hook-trims`               | P1   | AU-009（`useDateStrip`、`useFitText`、`useDiscTurn`、`useCardDrag`）                  | `DateStrip/useDateStrip.ts`、`PageHeader/useFitText.ts` + `fitText.ts`、`PlayerPanel/useDiscTurn.ts`、`ShowCardStack/useCardDrag.ts`                                                                     | 並行                                                                                | S（1–1.5h）                          |
| **L7** `chore/eslint-size-guard`           | P1   | AU-010                                                                                | `eslint.config.js`                                                                                                                                                                                       | **Serial：L1–L6 全部 merge 之後**（或者先 `warn` 版本並行，最後一個 PR 轉 `error`） | S（0.5–1h）                          |
| **L8** `refactor/player-engine-extract` 等 | P2   | AU-011（AudioController、useShelfFocus、audioProbe、dateStrip）                       | 各自 folder；AudioController 必須獨立 PR                                                                                                                                                                 | 唔排期；功能改動時順手                                                              | L（AudioController 單項 3–4h + e2e） |

**每個 lane 嘅完成定義**：`npx eslint .`、`npx tsc -b --noEmit` 綠；對應 test 檔全綠；`node node_modules/.audit-tmp/measure.cjs .` 該 lane 嘅項目消失；`madge --circular` 仍然 0；DOM 結構 / `data-*` / CSS module class 冇改（除非 AU 明確講）。

---

## 下一步

1. Main agent 用 `sw-parallel-dispatch` 開 L1–L6 六條並行 lane（各自 worktree / branch），每條跑 `/refactor`。
2. AU-002 / AU-005 有改簽名嘅部分：Developer 先補直接 test（`useEpisodePress`、`dismissView`、`arcLabels`）再拆。
3. L1–L6 merge 完（version 順序 bump），開 L7 加 ESLint 守衛轉 `error`，之後 `npm run lint` 就會擋住新違規。
4. 將 `node_modules/.audit-tmp/measure.cjs` 搬去 `scripts/`（L7 同 PR，可選），因為 `node_modules` 會俾 `npm ci` 洗走。
5. L8（P2）記入 backlog；AudioController 拆分前要先確認 e2e（`npm run e2e`）喺 CI 跑得。

---

## SK 候選（shared knowledge）

- **SK-1 ESLint 尺寸規則同「總行數」規則對齊**：`max-lines-per-function` 預設計埋註解 / 空行（`skipComments` / `skipBlankLines` 預設 false），同 global-rules「總行數」一致；已實測同 TypeScript AST 量度 1:1 吻合。用 `files` glob 分 `.ts`（30）同 `.tsx`（50 + `max-lines` 150），test 檔 override 關閉。盲點：`.tsx` 入面嘅非 component helper 會用 50 計 → hook 一律放 `.ts`。
- **SK-2 拆 component 檔時，型別抽去獨立 `xxxTypes.ts` 再由原檔 re-export**：避免「父 component import 子 component、子 component import 父檔型別」嘅 type-only 循環（madge 預設會計），同時唔使改外部 import 路徑，令並行 lane 冇共用檔。
- **SK-3 `react-hooks/refs` 下拆 hook 嘅規矩**：module-level handler factory 只可以收 `useBox` 盒或者 getter，唔收 `RefObject`；`useRef` 只喺 event / effect 時以參數傳入 helper（`(e) => helper(e, ref)`），唔可以喺 render 時 `factory(ref)`。callback ref 用嚟同時填多個消費者（`ArcSheet.useSheetBehaviour` 係範例）。
- **SK-4 「own 行數」判斷法**：超上限函數先睇扣除內層多行函數後嘅行數。own 細（例如 `useFitText` own 4、`useDiscTurn` own 8）→ 抽內層 callback / 搬 doc 就得，唔使重新設計；own 大（`SeriesDramaPage` 76/76、`TodayPage` 72/72）→ 真係責任太多，要按版面區塊抽 component。
