# QA — player-core（9d lane 2 睡眠 timer 邏輯）— 2026-11-19 — S1

- Tier: T2（MINOR 新功能，冇 UI）| Commit: `f3bd2cf2`（code；`f82bab5a` = re-review 報告）| PR #284 → `release/v2.1.0` | Verdict: ✅ pass
- Ledger（`impact --since 6eae3cec`，merge-base `origin/main`）: SKIP 11 / REVERIFY 3（player-core、coming-soon、ui-foundation）/ UNCOVERED 51（11 個 `src/player/*leep*` / `useNightWindow*` → 併入 player-core；40 個 `_mockups_/sleep-timer/*` → lane 3）/ IGNORED 3；SKIP = admin、api、bookmark、card-zoom、catalog-data、drama、home、mini-player、pwa-shell、repo-tooling、show-today-page（frozen，冇改）
- Plan: `.proj-docs/qa/plans/player-core.md`（加 AC-6 睡眠 timer 邏輯；scope glob `src/player/*` 已包新檔）
- coming-soon / ui-foundation 只係因為 `src/config/constants.ts` 新增 export（`SECONDS_PER_MINUTE`、`SLEEP_TIMER_*`、`NIGHT_*`）而 STALE；兩條鏈嘅檔冇 import 新常數，跑返 plan unit 指令 + 引用 CI e2e 後重新 freeze S1

## Runs

| Command                                                                                                                    | Result                                               | Time |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---- |
| `npm test --` player-core plan 指令（`src/player/` 等 9 個 path）                                                          | 24 檔 468/468                                        | 8s   |
| `npx vitest run --project @903-player/player --coverage src/player/`                                                       | 見下 Coverage                                        | 15s  |
| `npm test --` coming-soon plan 指令                                                                                        | 83 檔 890/890                                        | 20s  |
| `npm test --` ui-foundation plan 指令                                                                                      | 53 檔 318/318                                        | 15s  |
| CI run [44523581391](https://github.com/dcwhung/903-player/actions/runs/44523581391)（`f3bd2cf2`：lint、unit、build、e2e） | ✅ success（lint / unit / build 12:31Z、E2E 12:50Z） | 26m  |

Coverage（被改 / 新檔，lines / branches）：`SleepTimerController.ts` 100/100、`sleepTimer.ts` 100/97、`sleepTimerStorage.ts` 100/100、`useSleepTimer.ts` 100/100、`useNightWindow.ts` 100/100、`sleepTimerContext.ts` 100/100、`AudioController.ts` 98.6/98.5、`PlayerProvider.tsx` 100/75 —— 全部 ≥ 80%

## 需求 → unit test 證據（L1 = plan「用戶決定」+ Lane 2 + 用戶 2026-11-19 補充）

| 需求                                                       | 證據（test）                                                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 夜間 21:00–05:00（20:59 / 21:00 / 04:59 / 05:00）          | `sleepTimer.test` isNightWindow `it.each`；`useNightWindow.test` 21:00 開、05:00 關、返前景重查、unmount 停                          |
| 一揀即計、暫停中照計、時間到淨係暫停唔重開                 | `SleepTimerController.test` minutes：pause at deadline / not restart / keep counting while paused / start immediately                |
| 轉節目照計、iOS 背景延遲靠絕對時間 + timeupdate            | keep counting across a track change；check the deadline on timeupdate when the interval is delayed                                   |
| 播完呢集：擋自動接下一集（early + ended）                  | `AudioController.test` stopAfterCurrent ×6；controller「stop when this episode ends instead of playing the next one」                |
| 同集剩餘跟播放位置（用戶補充）                             | `sleepTimer.test` follow the playback position / cap fraction on seek back；controller「follow seeks on the same episode」           |
| 轉集 / 轉直播 = 普通倒數；截止已過淨係清唔暫停（用戶補充） | controller「plain countdown … another episode / live stream」、「just clear the timer when switching after the background deadline」 |
| 直播 / 未知長度唔准「播完呢集」（用戶補充：變灰）          | `sleepTimer.test` episodeRemainingMs undefined（live / 冇 metadata / 停喺尾 / 冇載入）；reject "end of episode" ×3                   |
| `sessionStorage` 重新載入照計、過期清走唔自動播            | storage：keep counting after a reload / drop an expired timer on reload without playing / S-1180 兩條                                |
| 上次時長 `localStorage`；storage 拋錯照行                  | `sleepTimerStorage.test` last option ×3、sessionStorage throws；controller「keep working when storage throws」                       |
| `fraction(now)`（畀進度條 / 9c）                           | remainingMs / fraction ×7；controller「report the remaining fraction」                                                               |

`AudioController` 回歸：`advance()` 只喺 `stopAfterCurrent` 有設定時提早 return；冇 timer 時嘅自動接下一集 / stall watchdog 由原有 `AudioController.test`、`nextTrack.test`、`stallWatchdog.test`、`stallEdgeCases.test` 全綠證明，加 controller「not block auto-advance when there is no timer」、「resume auto-advance after the timer is cancelled」

## Hard Gates

all pass（PWA gate n/a：冇改 `sw.js` / build / manifest；Security / Performance n/a）

## Findings

冇 🔴 / 🟡 / 🟢；冇 Observation

## 建議補測

- none（高風險邏輯 edge case 已由 lane 2 test 覆蓋：時段邊界、deadline 正好等於、過期、拋錯、零長度）

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
next_action: merge_after_ci
artifacts:
  - .proj-docs/qa/2026-11-19_qa_9d-lane2-sleep-timer-core.md
  - .proj-docs/qa/plans/player-core.md
  - .proj-docs/qa/verification-ledger.tsv
context: player-core S1 pass @f3bd2cf2（加 11 個睡眠 timer 檔，115 檔 frozen）；coming-soon / ui-foundation S1 因 constants.ts 新增 export 重跑 unit 後 re-freeze；CI 44523581391 全綠（含 e2e）；冇 finding、冇 ticket；_mockups_/sleep-timer/ 留畀 lane 3
```
