# 9d 開發 plan：睡眠 timer + mini player 播放掣外圈（v2.1.0）

## 進度（2026-11-19）

| Lane | 狀態                                 |
| ---- | ------------------------------------ |
| 0    | 待開始：e2e:visual 日間情境          |
| 1    | 待開始：mini player 播放掣外圈       |
| 2    | 待開始：`sleepTimer` 邏輯模組        |
| 3    | 待開始：月亮掣、選單、timer 進度條   |
| S3   | 待開始：QA S3 + player 2.0.0 → 2.1.0 |

- Preview：https://claude.ai/artifact/FaHdDr1oizwKnBkAykkxCM（`_mockups_/sleep-timer/` 第 8 版，branch `docs/mockup/sleep-timer`）
- 需求來源：`.proj-docs/plans/2026-11-04_plan_requirements-priority.md` 9d

## Context

9d 原本屬 P10（v2.0.0），2.0.0 已經只包 9a + Duo 發佈。用戶 2026-11-19 決定 9b / 9c / 9d 逐項出 MINOR：**9d = 2.1.0**、9b = 2.2.0、9c = 2.3.0。

**硬性限制**：現有普通手機直／橫、平板直／橫、電腦橫版、Duo、HomeView 嘅顯示唔可以有用戶冇接受嘅改變；每個 PR 跑 `npm run e2e:visual`。

## 用戶決定（2026-11-19，preview + grill）

| 項目                 | 決定                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| 版本                 | 9d = 2.1.0，用 `release/v2.1.0` 整合，全部 lane merge 晒先 bump                                              |
| 入口                 | 內頁頁頭右上（節目 / 今日 / 劇集頁）；HomeView 放清單掣左邊；闊版主頁播放卡放指示點嗰行右邊                  |
| 顯示時段             | 裝置本地時間 21:00–05:00 先出月亮掣（每分鐘檢查）；timer 開緊時一直出                                        |
| 未開 / 開咗          | 未開 = 線條月亮；開咗 = 實色月亮 + 剩餘分秒（`23:14`，冇底色）                                               |
| 頁面 timer 進度      | 頁頂全闊細條，剩餘部分隨時間扣減；顏色 = 當頁主題強調色（同播放掣）                                          |
| 選單                 | 底部 sheet，四粒大掣 2×2：15 / 30 / 60 分鐘、播完呢集（顯示「剩餘時間：9:59」；直播變灰）；冇說明字          |
| 上次時長             | 記喺 `localStorage`；未開時嗰粒用框線 highlight，撳一下即開始；唔另加掣                                      |
| 開緊                 | 嗰粒實色；標題右邊「剩餘 23:14｜關閉」tab 掣（「節目｜廣播劇」款，見 `.claude/CLAUDE.md`）                   |
| 平板橫               | sheet 置右（蓋播放卡位置）                                                                                   |
| 時間到               | 直接暫停（**唔做淡出**：iOS `volume` 唯讀，Web Audio 有 CORS 風險）；唔自動重開                              |
| 暫停 / 轉節目        | 照計；一揀即計（暫停中都計）；時間到時已暫停就淨係清 timer                                                   |
| 播完呢集             | 揀嗰刻起 background timer = 呢集剩餘時間；留喺同一集以播完為準（唔切尾）；轉集 / 轉直播 = 普通倒數用剩餘時間 |
| 準確度               | 存絕對截止時間；`timeupdate` + 1 秒 interval 檢查；`sessionStorage`，重新載入照計，過咗期就清走、唔自動播    |
| Mini player          | 21:00–05:00 播放掣左邊出月亮入口；開緊 = 實色月亮 + 分秒，卡頂邊全闊細條（跟卡圓角）做 timer 進度            |
| Mini player 播放進度 | **所有裝置**嘅 mini player：底部細條改做播放掣外圈（日間都改）；分開 PR 先做；大播放卡 / 內頁唔郁            |
| e2e:visual           | Lane 0 先加 14:00 日間情境；接受 diff 範圍見各 lane                                                          |

## Lanes

每條 lane 跟 `/feature`：TDD → Code Reviewer → QA S1 → CI 綠先 merge 入 `release/v2.1.0`。Lane 1 同 2 冇共用檔案，可以平行；lane 3 要等 1 + 2。

### Lane 0：e2e:visual 日間情境（`test/visual/day-scenes`）

- `apps/player/e2e/visualScenes.mjs` 加 `home-paused-day`、`show-day`、`today-day`（`now` = `2026-11-30T14:00:00+08:00`）
- `visualDiff.mjs` context 固定 `timezoneId: 'Asia/Hong_Kong'`（月亮掣用裝置本地時間，唔固定會跟跑嘅機）
- 唔改 app；驗收：`VISUAL_BASE=HEAD` 自己比自己 0 diff
- QA 鏈：`repo-tooling`

### Lane 1：mini player 播放掣外圈（`feature/mini-player/progress-ring`）

- `MiniPlayerProgress.tsx`：由底部細條改做包住播放掣嘅 SVG 圓環（`role="progressbar"`、`aria-valuenow`、`aria-valuetext` 照留）；由 12 點順時針
- `MiniPlayer.module.css`：刪 `.progress` / `.fill` 底部條；播放掣縮細少少，令外圈唔貼卡邊；顏色 `--color-accent`，軌道 `--color-track`
- 所有 mini player 出現嘅裝置（手機直／橫、平板、Duo）
- **接受 diff**：pixel diff 只准喺 mini player 卡範圍；元素位置 diff 只准 mini player 播放掣。其他元素 0
- QA 鏈：`mini-player`

### Lane 2：`sleepTimer` 邏輯模組（`feature/player/sleep-timer-core`）

- 新檔 `apps/player/src/player/sleepTimer.ts`（純函數 + 狀態）、`useSleepTimer.ts`（hook）、`sleepTimerStorage.ts`
- `SleepTimerState`：`{ kind: 'minutes' | 'episode', startedAt, deadline, episodeId? }`；`remainingMs(now)`、`fraction(now)`（畀 9c 計「過咗三分一」）
- `isNightWindow(date)`：本地 21:00 ≤ t 或 t < 05:00（常數 `NIGHT_START_HOUR = 21`、`NIGHT_END_HOUR = 5`）
- `AudioController`：加 `stopAfterCurrent` 旗；`advance()` 見到就唔接下一集 → `onStopped()`；轉集時由 hook 清旗並改做分鐘倒數
- 存放：截止時間 `sessionStorage`（`903player:sleep-timer:v1`）；上次時長 `localStorage`（`903player:sleep-timer-last:v1`）；讀寫全部 try/catch
- 冇 UI；unit test 覆蓋：時段邊界（20:59 / 21:00 / 04:59 / 05:00）、暫停照計、播完呢集同集 / 轉集 / 轉直播、重新載入、過咗期、storage 拋錯
- QA 鏈：`player-core`

### Lane 3：月亮掣 + 選單 + 進度條（`feature/player/sleep-timer-ui`）

- `SleepTimerButton`（線條 / 實色月亮 + `mm:ss`）：放入 `PageHeaderActions`（節目 / 今日 / 劇集頁；HomeView 清單掣左邊）、`HomePlayerCard` 指示點嗰行右邊、mini player 播放掣左邊
- `SleepTimerSheet`：用現有 `Sheet`（focus trap 照用）；2×2 掣；開緊時標題右邊 tab 掣（跟 `HomeTabs` 款）；平板橫置右
- `SleepTimerBar`：頁頂全闊（內頁 / 主頁）；mini player 卡頂邊全闊（跟卡圓角）
- i18n：`zh-HK.ts` 加 `sleepTimer.*`（aria-label 例如「睡眠 timer，剩餘 23 分 14 秒」）
- mini player 標題 / 日期縮窄讓位
- 減少動態：進度條每秒更新唔做過場動畫
- e2e：新 section `apps/player/e2e/sleepTimer.mjs`（時段出 / 唔出、開 / 改 / 關、時間到暫停、播完呢集、mini player 入口）
- **接受 diff**：14:00 日間情境 0 diff；22:30 情境只准月亮掣、頁頂 / 卡頂進度條嘅 pixel diff，同埋 mini player 標題 / 日期嘅位置 diff
- QA 鏈：`player-core`、`mini-player`、`show-today-page`、`drama`、`home`

### S3：發佈前（`chore/release/player-2.1.0`）

- QA S3 全套（lint、unit、e2e、admin e2e、coverage、e2e:visual），ledger S3 freeze
- player `2.0.0 → 2.1.0`（admin 唔郁）；開 PR `release/v2.1.0 → main`，merge 由用戶決定

## 風險

| 風險                                                      | 處理                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| iOS 背景 `setTimeout` 延遲                                | 用絕對截止時間，`timeupdate` 每次檢查                             |
| 播完呢集同自動播下一集（`advance('early')` 提早換集）打架 | `stopAfterCurrent` 喺 `advance()` 入口擋，`early` 同 `ended` 都擋 |
| mini player 外圈改動影響所有裝置                          | Lane 1 獨立 PR，e2e:visual diff 逐張列出，只准 mini player 範圍   |
| 主題強調色喺淺色主題對比唔夠                              | Lane 3 review 逐個節目主題睇進度條 / 月亮                         |
