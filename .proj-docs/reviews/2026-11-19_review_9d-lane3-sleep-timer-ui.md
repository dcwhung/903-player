# Code Review — 9d Lane 3：睡眠 timer UI + 每晚自動排程

- 日期：2026-11-19
- 審閱者：Code Reviewer（subagent）
- 目標：PR #287 `feature/player/sleep-timer-ui` → `release/v2.1.0`（HEAD `9bd020ee`，44 檔 +2786 / −28）
- Tier：T2（新 UI 入口 × 4 個位置 + 新排程邏輯 + `useSleepTimer` 共用時鐘）
- SSoT：`.proj-docs/plans/2026-11-19_plan_9d-sleep-timer.md`「用戶決定」/「Lane 3 截圖覆核」/「第 3–5 輪」/「每晚自動」；`.claude/CLAUDE.md`（Motion、Tab 掣款式、e2e:visual）；用戶補充確認 (1)(2)
- Design Origin：`mockup: _mockups_/sleep-timer/index.html` + 用戶逐輪確認實作截圖（PR description 第一行有寫）
- 總評：UI、a11y、token、減少動態、Lane 2 邏輯都對齊；排程有一個邊界（排程時間落喺 05:00 或日間）會令日間自動開 timer（W-820）

## Hard Gates

all pass（改動檔 eslint / prettier 0；`tsc -b --noEmit` 0；`vitest related` 34 個改動檔 → 149 files / 1953 tests 綠；新邏輯 coverage lines 99.6%、branches 96.9%；冇新依賴；PR CI `9bd020ee` run 44592206944 success）。冇跑 full suite / e2e / e2e:visual（Hard Rule #7，交 QA / CI）。

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                       |
| -------- | ------ | ------- | ------------------------------------------ |
| 正確性   | 20     | 25      | W-820                                      |
| 安全性   | 20     | 20      | storage 讀入逐欄驗證（`toSchedule`）       |
| 可維護性 | 20     | 20      | 純函數 / scheduler / hook / view 分層清楚  |
| 測試覆蓋 | 15     | 15      | 四捨五入、跨午夜、每晚一次、直播、重載都有 |
| 性能     | 10     | 10      | 共用時鐘；冇 timer 唔 tick                 |
| 代碼風格 | 10     | 10      | 全部用 token，冇寫死色                     |
| **總分** | **95** | **100** |                                            |

**結果：✅ pass**（有一個收斂 🟡，按 CLAUDE.md「Parallel lane backlog」要喺今次 PR 修完 re-review 先 merge）

## 需求核對（L1）

| 需求                                                           | 實作 / 驗證                                                                                                              | 結果 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---- |
| 日間零改變（05:00–21:00 冇 timer 唔 render）                   | `sleepTimerView`：`visible = night \|\| active`，`Entry` 唔 visible 返 `null`；CSS 新規則全部靠 `:has([data-placement])` | ✅   |
| 四捨五入 5 分鐘（23:11/12 → 23:10；23:13–15 → 23:15）          | L2：臨時 test 23:10–23:15 六格全對；23:58 → 翌日 00:00 有 test                                                           | ✅   |
| 3 個鐘 / 05:00 早到者為準、跨午夜、每晚一次                    | `occurrenceAt` + `firedFor`；有 test。邊界見 W-820                                                                       | ⚠️   |
| 已開緊唔覆蓋、當今晚用咗                                       | `check()` 見 `timer !== null` 即 `markFired`                                                                             | ✅   |
| 用戶確認 (1) 播完呢集撞直播 → 未算用、時段內轉集會開           | `timer.start('episode')` 返 false 唔 `markFired`，player 通知轉集再 check；有 test                                       | ✅   |
| 用戶確認 (2) 手動揀之後「停用」→ 今晚當已用                    | `pick` 寫 `firedFor = 今晚排程時刻`，`cancel` 唔郁排程                                                                   | ✅   |
| 停用：開緊只停今晚；未開 = 取消排程；撳完閂                    | `useMenuState.stop`                                                                                                      | ✅   |
| toast「休眠 30 分鐘後啟動」/「休眠播完呢集後啟動」             | `useSleepTimerAutoToast` 掛 `PlaybackObservers`（child effect 先過 provider attach，唔會漏第一次）                       | ✅   |
| a11y：月亮「休眠」/「休眠，剩餘 23 分 14 秒」                  | `aria-label` + 分秒 `aria-hidden`；`aria-haspopup` / `aria-expanded`                                                     | ✅   |
| a11y：選單掣 `aria-pressed`、直播 `aria-disabled`、「15 分鐘」 | `OptionButton` / `MinuteButton`；唔用 `disabled` 保留 focus                                                              | ✅   |
| 顏色：月亮 / 分秒 `--color-accent-text`；條 `--color-accent`   | `SleepTimer.module.css`；新 `var()` 全部有定義（逐個 grep 過）                                                           | ✅   |
| 80% 不透明 + 模糊、唔支援就實色                                | `@supports (backdrop-filter) and (color-mix)`                                                                            | ✅   |
| 減少動態                                                       | 條冇 transition；sheet / backdrop `prefers-reduced-motion: reduce` → `transition: none`；冇等 `animationend`             | ✅   |
| 共用時鐘（#3）                                                 | `createSharedClock`：第一個訂閱開 interval、最後一個走就清；換 timer 喺 layout effect `refresh`（paint 前）              | ✅   |
| 冇改壞 Lane 2                                                  | `SleepTimerController` / `sleepTimer.ts` 零改動；`useSleepTimer` 只換顯示時鐘                                            | ✅   |
| e2e 時區（S-1149）                                             | `newE2EContext` 預設 `Asia/Hong_Kong`、可蓋過；`e2eTimezone.test.ts` 鎖住同 `VISUAL_TIMEZONE` 一致                       | ✅   |
| Lane 2 留言：重載閃 `0:00`                                     | `sleepTimerView` 剩 0 當未開                                                                                             | ✅   |

計時器清理：`SleepTimerScheduler.attach` cleanup 解 player 訂閱 + `syncInterval` 清 interval（StrictMode 雙 effect `??=` 唔會開兩個）；`clear()` 冇排程即停 interval。Re-render：只有 `Entry` / 選單每秒 render，`PageHeader` / `PlayerProvider` 唔跟。

## 🟡 Warning

### W-820 排程時間落喺 05:00 或日間會每朝日間自動開 timer

- 位置：`apps/player/src/player/sleepTimerSchedule.ts` `nextNightEnd` / `occurrenceAt`；`SleepTimerScheduler.pick`
- L1：plan「每晚自動」生效 =「排程時間後 3 個鐘內**同 05:00 之前**（早到者為準）」；plan Context 硬性限制「現有顯示唔可以有用戶冇接受嘅改變」（日間零改變）
- L2：臨時 test（冇 commit）兩個都重現：
    - 04:58 手動揀 30 分鐘 → 四捨五入成 05:00（`minuteOfDay = 300`）→ 第二朝 05:30 播 → `autoStarts = [30]`，timer 05:30 開
    - 05:32 由夜晚帶落嚟嘅 timer 仲開緊、打開選單揀 15 → 排程 05:30 → 第二朝 06:00 播 → `autoStarts = [15]`
    - `occurrenceAt(300, 06:00)` 唔係 `null`：`nextNightEnd` 將「啱啱 05:00」當第二日，日間排程攞足 3 個鐘
- L3：自動開咗之後 `sleepTimerView.active` → 日間出實色月亮 + 頁頂條 + toast，每朝重複；`sleepTimerSchedule.test.ts`「should give a daytime schedule the full 3 hours」係將呢個行為鎖咗做預期，但 plan 冇呢條決定
- 方案 A（推薦）：`occurrenceAt` 只承認夜間開始嘅排程：`start` 唔喺 `isNightWindow` 入面（05:00 ≤ t < 21:00）就返 `null`；改返嗰條 daytime test 做「日間排程唔生效」。改一個純函數，`pick` 照記（之後再喺夜間揀就取代）
- 方案 B：`pick` 時排程時刻唔喺夜間就唔記（或 clamp 去 04:55）。避免寫入怪資料，但舊 / 手改 storage 仍然可以有日間值，要 A 兜底
- Trade-off：A 改動最少、亦擋住壞資料；B 令選單「22:30 開始」唔會顯示一個永遠唔生效嘅時間。可以 A + B 一齊做

## 🟢 / Observation

- S-1200 `SleepTimerScheduler.ts`：冇聽 `storage` event，兩個分頁時舊分頁記住舊排程，`markFired` 會將舊排程寫返 `localStorage` 蓋走另一分頁啱啱揀嘅新排程
- S-1201 `SleepTimerController` / `useSleepTimer` 嘅 `lastOption`（`saveLastOption`）：第 3–5 輪「上次時長由每晚排程取代」之後 UI 冇再用，仍然每次寫 `localStorage`；可以刪或者註明留畀 9c
- S-1202 `SleepTimerOptions.tsx`：每晚排程嗰粒只有虛線框（`data-scheduled`），讀屏讀唔到「每晚排程」；可以加 `aria-description` 或者 label 後綴

## ✅ 做得好嘅地方

- 排程純函數（`roundScheduleInstant` / `occurrenceAt` / `toSchedule`）同 scheduler 接線分開，跨午夜、23:58 進位、storage 壞資料都有 test
- 日間完全唔 render + CSS 全部掛 `:has([data-placement])`，現有版面零改變靠結構保證而唔係靠 diff 撞彩
- 共用時鐘解決咗 S-1182 嘅「key 換 clock」寫法之餘，令多個入口同一刻跳秒

## 修訂代碼（W-820 方案 A）

```ts
// sleepTimerSchedule.ts
import { isNightWindow } from './sleepTimer'; // Lane 2 已有

export const occurrenceAt = (minutes: number, now: number) => {
    const today = onDay(now, minutes, 0);
    const start = today <= now ? today : onDay(now, minutes, -1);
    // W-820：排程時刻要喺夜間（21:00–05:00），05:00 / 日間排程唔生效（plan「05:00 之前」）
    if (!isNightWindow(new Date(start))) return null;
    const end = Math.min(start + SCHEDULE_WINDOW_MS, nextNightEnd(start));
    return now < end ? { start, end } : null;
};
```

## Handoff receipt

見 subagent 回報（`HANDOFF_RECEIPT`）。
