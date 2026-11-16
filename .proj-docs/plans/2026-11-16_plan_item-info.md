# Plan：P9.5 #12 Player 顯示節目資料（item info）

**日期**：2026-11-16
**Branch**：`feature/catalog/item-info`
**版本**：player 1.33.0 → 1.34.0（MINOR）
**Preview**：`_mockups_/catalog-item-info/index.html`（用戶確認版 = 頁頂兩節「今日節目頁」+「已揀：A 修訂版」）
**QA chain**：`catalog-data`（registry 欄位）、`drama`、`show-today-page`

## 目標

admin（Phase 3）已可編輯 `summary`、`hosts`、`cast`、`airTime`，player 未顯示。今次喺節目頁、短篇劇頁、每日劇頁、今日節目頁顯示。

## 資料（catalog → player）

| 來源（schema）                     | 欄位                                              | 而家 registry     |
| ---------------------------------- | ------------------------------------------------- | ----------------- |
| `show.json`（`shows/schema.ts`）   | `summary`、`hosts`、`airTime`（+ 現有 `airDays`） | `ShowConfig` 冇帶 |
| `drama.json`（`dramas/schema.ts`） | 劇集 `summary`                                    | `Drama` 冇帶      |
| `drama.json` arc                   | `summary`、`cast`                                 | 冇帶              |

- `packages/catalog/src/shows/registry.ts`：`ShowConfig` 加 optional `summary` / `hosts` / `airTime`（冇就唔出 key）
- `packages/catalog/src/dramas/registry.ts`：`Drama` 加 `summary`；新增攞 arc 資料嘅方法（例如 `arcInfoFor(dramaId, arc)` 或者喺 `ArcAvailability` 加 `summary` / `cast`），只帶 enabled 嘅 arc
- 播放時間文字用 `formatAirTime(airDays, airTime)`（`packages/catalog/src/admin/airTime.ts`，admin 預覽同一套字）；要由 catalog index export 畀 player 用
- 「有資料」= `summary` / `hosts` / `cast` / `airTime` 任何一項有（`airDays` 本身唔計）

## UI 規格（用戶 2026-11-15 / 16 確認）

### 1. ⓘ 掣（節目頁、短篇劇頁、每日劇頁）

- 位置：唱片圈（`PlayerGauge` / `PlayerPanel` 嘅 gauge）頂嗰行、貼近右邊，同頁頭掣一樣距離（右 12px）；冇底色、冇圓形 background；icon 用主題 accent 色；直版橫版同一位置
- 冇資料就唔出 ⓘ
- 今日節目頁卡片**唔加** ⓘ

### 2. 獨立資料 sheet（節目頁、每日劇頁、短篇劇已揀短篇）

- 直版：由畫面底彈出（遮罩、✕、Escape、向下拉閂，沿用 `ArcSheet` 嘅 `useSheetBehaviour`）
- 橫版：sheet 喺**右欄**（唱片嗰欄），唔蓋左欄清單
- 內容：標題（節目 / 劇集名）→「播放時間」→「主持」chip →「簡介」；缺邊項就唔出邊項，唔寫「未有資料」
- 短篇劇已揀短篇：上半劇集（劇集名 + 簡介），下半短篇（標題 = 短篇顯示名，**唔加「短篇：」**）+「聲演」chip + 簡介；劇集冇簡介就淨係出短篇部分
- chip 唔可以撳

### 3. 短篇劇「全集」sheet 合併資料

- 「全集」標題旁邊加箭咀掣（淨 icon，冇文字，aria-label 例如「劇集資料」，`aria-expanded`）
- 撳：箭咀順時針轉 90°，同時資料展開（劇集簡介卡喺清單頂 + 每個短篇行嘅資料）；再撳逆時針轉返、資料收埋
- 每個短篇行展開資料：左邊細直線（`border-left`）入面，第一行「聲演」細字標籤 + chip，第二段簡介（正文色）；進度字（例如「聽到第 13 集 10:00」）保持灰色
- 展開時碟面同播放掣置頂（`align-items: flex-start`），播放掣入面 icon 照舊置中
- 冇資料嘅短篇行唔出資料區；成套劇（劇集 + 全部短篇）都冇資料就唔出箭咀
- 預設：第一次自動彈（現有 `isFirstSeriesVisit` 邏輯）時展開；之後由「全集」掣開預設收合
- 唱片圈 ⓘ：未揀短篇（黑碟 / unloaded）= 開全集 sheet 兼展開資料；已揀短篇 = 開獨立 sheet（第 2 點）

### 4. 今日節目頁

- 「節目表」標題旁邊加箭咀（同第 3 點一樣行為）；橫版而家冇顯示「節目表」標題列，要加返（放箭咀，右邊照出「N 個未上架」）
- 展開：每行（包括未上架）喺狀態字下面加資料區（細直線入面）：播放時間、「主持」chip、簡介
- 展開時碟面、收藏、播放掣置頂；左邊「播緊」highlight 線（`OnAirLamp`）高度改為行高約 80%，上下置中
- 預設：第一次入今日節目頁展開，之後收合（localStorage key，例如 `903player:today-info-seen:v1`，跟 `config/constants.ts` 寫法；讀寫要 try/catch）
- 卡片唔加 ⓘ；冇任何節目有資料就唔出箭咀

### 5. 自動彈出（第一次入）

跟全集現有邏輯（`hooks/useStartDrama.ts` `isFirstSeriesVisit` / `useFirstVisitOnEntry`）：

| 頁       | 條件                                                                   | 彈乜                     |
| -------- | ---------------------------------------------------------------------- | ------------------------ |
| 節目頁   | 呢個節目任何一集都冇進度、冇載入緊、唔係由「我的收藏」入（`focusUrl`） | 獨立資料 sheet           |
| 每日劇頁 | 同上（每日劇）                                                         | 獨立資料 sheet           |
| 短篇劇頁 | 現有全集 firstVisit                                                    | 全集 sheet（展開資料）   |
| 揀短篇   | 用戶揀一個**冇任何進度**嘅短篇（chip / 全集行），而且呢個短篇有資料    | 嗰個短篇嘅獨立資料 sheet |

- 冇資料就唔彈
- admin 之後改內容唔會再彈
- 由收藏入頁唔彈

### 6. 動畫（`.claude/CLAUDE.md` Motion 規則）

- 箭咀 rotate + 展開 / 收合：CSS transition 放 `@media (prefers-reduced-motion: no-preference)`；時間 / easing 用 `tokens.css` `--view-transition-fade` + `--ease-view-transition`
- 展開用 `grid-template-rows: 0fr → 1fr`（唔用 JS 量高度）；減少動態 = 直接切換，唔等 `transitionend`
- sheet 彈出沿用 `ArcSheet` 現有做法

## 文字（`apps/player/src/i18n/zh-HK.ts`）

播放時間、主持、聲演、簡介、節目資料 / 劇集資料（aria-label）、展開 / 收合資料（aria-label）。player 介面照現有慣例。

## 實作次序（TDD，每步 Red → Green → Refactor）

1. catalog registry：`ShowConfig` / `Drama` / arc 帶欄位；export `formatAirTime`
2. 純函數：`hasItemInfo(...)`、sheet 內容組合（劇集 + 短篇，劇集冇簡介就淨短篇）、自動彈出判斷（節目 / 每日劇 / 揀短篇）
3. `ItemInfoSheet` component（直版 / 橫版右欄、缺項唔出）
4. 唱片圈 ⓘ（`PlayerGauge` / `PlayerPanel` 加 optional `onInfo`）
5. `ArcSheet` 箭咀 + 展開資料 + 置頂；短篇劇頁 ⓘ 分流（未揀 → 全集展開；已揀 → 獨立 sheet）；揀未聽短篇自動彈
6. 節目頁 / 每日劇頁接駁 + 自動彈
7. 今日節目頁：節目表箭咀、每行資料、lamp 80%、localStorage 預設
8. e2e：`apps/player/e2e/` 對應 section（`dramaPages.mjs`、`arcSheet.mjs`、今日節目）加資料顯示 / 展開檢查（e2e 測試資料要有 summary 等欄位）
9. version bump 1.34.0（淨改 `apps/player/package.json` 同 `package-lock.json` 對應嗰兩行）

## 唔做

- 主頁、mini player 唔顯示資料
- admin、api 唔改
- 資料唔可以撳（chip 唔做連結）
