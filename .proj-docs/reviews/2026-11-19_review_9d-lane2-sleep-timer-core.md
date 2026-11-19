# Code Review — 9d Lane 2：睡眠 timer 邏輯模組

- 日期：2026-11-19
- 審閱者：Code Reviewer（subagent）
- 目標：PR #284 `feature/player/sleep-timer-core` → `release/v2.1.0`（commit `bbee407d`）
- Tier：T2（新邏輯模組 + `AudioController` 自動接下一集路徑）
- SSoT：`.proj-docs/plans/2026-11-19_plan_9d-sleep-timer.md`「用戶決定」表 + Lane 2；`.claude/CLAUDE.md`
- 總評：需求逐條對齊，`AudioController` 改動只喺 `stopAfterCurrent` 有設定時先生效，冇 🔴 / 🟡

## Hard Gates

all pass（eslint / prettier / `tsc -p tsconfig.app.json` 0；`vitest related` 8 個改動檔 → 60 files / 926 tests 綠；新檔 coverage lines 100%、branches ≥ 97%；冇新依賴）。冇跑 full suite / e2e（Hard Rule #7，交 QA / CI）。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                               |
| -------- | ------- | ------- | -------------------------------------------------- |
| 正確性   | 25      | 25      | 需求逐條對齊（見下）                               |
| 安全性   | 20      | 20      | storage 讀寫全部 try/catch，讀入資料逐欄驗證       |
| 可維護性 | 20      | 20      | 純函數 / controller / hook 分層清楚                |
| 測試覆蓋 | 15      | 15      | plan 列嘅邊界全部有 test                           |
| 性能     | 10      | 10      | idle 唔 tick；只有用 hook 嘅 component 每秒 render |
| 代碼風格 | 10      | 10      |                                                    |
| **總分** | **100** | **100** |                                                    |

**結果：✅ pass**

## 需求核對（L1 = plan「用戶決定」表 / Lane 2）

| 需求                                      | 實作                                                                                                      | 結果 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---- |
| 一揀即計 / 暫停照計 / 轉集照計            | `createSleepTimer` 用 `Date.now()` 起計；`isExpired` 只睇絕對 deadline                                    | ✅   |
| 時間到播緊先暫停、唔淡出、唔自動重開      | `expire()`：先清 timer，`hasPlayIntent()` 先 `pause()`；冇 volume 操作                                    | ✅   |
| 播完呢集：同集以播完為準（唔切尾）        | 同集 `isExpired` 恆 false；`advance()` 入口擋 `early` + `ended`，`onEnded` 停低後先 callback              | ✅   |
| 轉集 / 直播 → 普通倒數用原截止時間        | `followEpisode` 保留 `deadline`；`syncStopAfterCurrent` 即刻放返自動接下一集                              | ✅   |
| 絕對截止時間 + timeupdate + 1 秒 interval | `player.subscribe(check)` + `setInterval(check, SLEEP_TIMER_CHECK_MS)`                                    | ✅   |
| storage key / try/catch                   | `903player:sleep-timer:v1`（session）、`903player:sleep-timer-last:v1`（local）；`readItem` / `writeItem` | ✅   |
| 重新載入照計，過期清走唔自動播            | `loadSleepTimer` 過期即 `removeItem`；controller 唔會叫 `play`                                            | ✅   |
| 夜間時段本地 21:00–05:00，每分鐘檢查      | `isNightWindow` + `useNightWindow`（對正分鐘邊界 + `visibilitychange`）                                   | ✅   |
| 用戶決定（2026-11-19）(1)(2)(3)           | 同集跟播放位置 / 轉集時已過期淨清 timer / 直播 + 未知長度變灰，三點都同 code 一致                         | ✅   |

`AudioController` 回歸：`stopAfterCurrent` 係 `undefined` 時 `advance()` / `onEnded()` 行為同改動前等價（`onEnded` 只係改寫成 early return）；stall watchdog、auto-resume、`load` 冇郁。`attach` cleanup 會 `setStopAfterCurrent(undefined)`，StrictMode 雙 effect 冇殘留。

React re-render：`SleepTimerContext` value 係 `useState` 固定 instance；controller 只喺 timer 本身變先 notify（有 test）；每秒 tick 只喺 `useSleepTimer` 嘅 `useClock`，idle 時 subscribe 係 no-op（有 test）。`PlayerProvider` 樹唔會因 timer 每秒 render。

## 🔴 / 🟡

冇。

## 🟢 / Observation

- S-1180 `sleepTimerStorage.ts` `loadSleepTimer`：「播完呢集」留喺同一集、暫停到過咗 background deadline（用戶決定 (1) 容許），重新載入會被當過期清走；可以只對 `kind: 'minutes'` 喺 load 時清，episode 交 controller `check`（未載返同一集就照 deadline 清、唔播）。
- S-1181 `sleepTimer.ts:8` `SECONDS_PER_MINUTE` 同 `utils/time.ts` 私有常數重複，可以搬入 `config/constants.ts` 共用。
- S-1182 `useSleepTimer.ts` `useClock` 靠 `eslint-disable react-hooks/exhaustive-deps` 令 `restartKey` 觸發重新 subscribe；可以改由 `restartKey` 入 closure（或者 key 一個新 clock）免 disable。

## ✅ 做得好嘅地方

- 截止時間判斷全部係純函數，controller 只做接線；test 直接覆蓋 plan 列嘅邊界（20:59 / 21:00 / 04:59 / 05:00、storage 拋錯、轉直播）
- `onEnded` 先 `onStopped()` 再 callback，UI 收到清 timer 時 player 已經係停低狀態
- storage 讀入逐欄驗證，壞資料 / 舊版當冇 timer

## Handoff receipt

見 subagent 回報（`HANDOFF_RECEIPT`）。
