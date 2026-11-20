# Code Review — 9b Lane 1：HomeView 閒置畫面邏輯

- 日期：2026-11-20
- 審閱者：Code Reviewer（subagent，獨立）
- 目標：PR #292 `feature/layout/home-view-ambient-logic` → `release/v2.2.0`，HEAD `3316e5d2`（`git diff origin/release/v2.2.0...HEAD`，15 檔，+841 / −1）
- Tier：T1（純邏輯 / hook，冇 UI、冇 `.tsx` / `.css`；Design Fidelity、PWA、UX Flow 檢查 n/a）
- 總評：plan 嘅 Lane 1 範圍（`useIdle`、`ambientView`、時鐘 / 日期格式、`trackView` 共用、常數、i18n）齊；加埋 `useScreenWakeLock`、`useMinuteClock`、`hasOpenModalDialog` 畀 Lane 2 用。冇 🔴 / 🟡；一條 🟢 建議喺本 PR 內清

## Hard Gates

all pass。

- Lint：15 個改咗嘅 `.ts` `eslint` 0、`prettier --check` 過
- Type：`apps/player` `tsc --noEmit -p tsconfig.app.json` exit 0
- Tests（diff 相關）：`vitest run --project @903-player/player` 6 個新 test 檔 + `selectors/pageHandle` + `player/useNightWindow` → 8 檔 / 75 tests 全綠（冇跑 full suite / e2e，Hard Rule #7）
- Coverage：6 個新檔 lines 100%、branch 97.6%（`clock.ts:20` `?? ''` 防禦分支未覆蓋，唔影響）
- Security：冇新依賴（`package*.json` 冇改）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                    |
| -------- | ------- | ------- | ------------------------------------------------------- |
| 正確性   | 25      | 25      | 直播 / 未知長度、idle reset、wake lock 停後先批出逐條核 |
| 安全性   | 20      | 20      | 冇外部輸入                                              |
| 可維護性 | 20      | 20      | 重複 `msToNextMinute`（S-1290，唔扣分）                 |
| 測試覆蓋 | 15      | 15      | 每個 hook 都有 timer / visibility / unmount 測試        |
| 性能     | 10      | 10      | 時鐘只喺分鐘邊界 re-render                              |
| 代碼風格 | 10      | 10      |                                                         |
| **總分** | **100** | **100** |                                                         |

**結果：✅ pass**

## 核對紀錄（L2）

1. **直播判斷（main agent 決定）**：`AudioController.ts:394` 直接 `update({ duration: this.audio.duration })`，串流會係 `Infinity`；`isLive` 只認 `Infinity`，`0` / `NaN` → `live: false`、`progress: null`、副題照出日子 / 集數。`hasKnownDuration(Infinity)` 係 true，所以 `progressOf` 先睇 `isLive`，次序啱；unit 兩個 track × 兩個未知值都有
2. **`useIdle`**：listener 喺 `window` capture + passive，底下掣 `stopPropagation` 都聽到（有 unit）；`enabled` false 時唔註冊、`idle` 一定 false；cleanup `setIdle(false)`，重新啟用由非閒置開始計。Lane 2 覆蓋層食第一下 `pointerdown` 時 window capture 先行 → reset，同「叫醒後再 30 秒先轉」一致
3. **`useScreenWakeLock`**：停咗先批出嘅 lock 即刻放（有 unit）；`pending` 防重複 request；hidden 唔 request；唔支援 / reject / 同步 throw 都靜靜忽略，符合補充決定 #1
4. **`useMinuteClock` / `msToNextMinute`**：對正分鐘邊界，啱啱喺邊界等成分鐘；`visibilitychange` 即刻對一次再重排 timer
5. **`hasOpenModalDialog(ignore)`**：只計 `aria-modal="true"`，橫版 docked（`"false"`）唔計；`ignore` 畀 Lane 2 排除自己個覆蓋層
6. **已知刻意偏離**（main agent 已批）：`ambientView` 冇 `now`、`status` 跟 `isPlaying`，唔當 finding

## 🟢 Suggestion / Observation

- **S-1290**（🟢，建議本 PR 內清）`apps/player/src/player/useNightWindow.ts:5-7` 同 `apps/player/src/utils/clock.ts:24` 各有一個 `msToNextMinute`（`NIGHT_WINDOW_CHECK_MS` 同新 `MS_PER_MINUTE` 都係 60 000）。改 `useNightWindow` import `../utils/clock` 嘅版本、刪本地版；已喺 scratch 試過，`useNightWindow` 5 tests 綠、eslint 0。`NIGHT_WINDOW_CHECK_MS` 之後淨係 test 用，可一併換成 `MS_PER_MINUTE` 再刪常數。按 CLAUDE.md「Parallel lane backlog」唔帶去下個 session
- **S-1291**（Observation，唔使改）`apps/player/src/hooks/useScreenWakeLock.ts:20-31`：request 未返嚟期間切走再切返，返嚟嗰下 `pending` 擋住；如果之後 reject，要等下次 `visibilitychange` 先再 request。實際 request 幾 ms 就返，機會極低；冇 L2 真機重現，唔入 backlog
- TDD：`9e44c1a9` 一個 commit 同時加 test 同實現，睇唔到紅燈記錄；唔 block

## ✅ 做得好嘅地方

- `trackView` 抽出共用，unit 直接鎖住閒置畫面同內頁把手名 / 色調 / 狀態一致
- Wake lock「停咗先批出」呢種 async race 有諗到兼有測試
- 註解清楚講明點解直播要喺 `hasKnownDuration` 之前判斷

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "100%"
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/layout/home-view-ambient-logic"
context: "9b Lane 1 pass, no C/W. S-1290 (dedupe msToNextMinute in useNightWindow) should be fixed in this PR per lane-backlog rule; then QA S1, CI green, merge into release/v2.2.0"
```
