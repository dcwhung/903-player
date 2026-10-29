# Code Review — 2026-10-29 — S-551 review fixes 覆審（C-009 / C-010 / W-498 / W-499 / S-578 / S-579）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/keen-pascal-5iifg0` merge `2c73260`（`fix/player/S-551_review-fixes`），`git diff e8d0259 HEAD -- src e2e`
    - `1c3122b` C-009：watchdog 記 wall-clock `deadline`，亮屏 `retryIfOverdue()`；刪 `STALL_RETRY_DEDUPE_MS` / `lastRetryAt`
    - `04326b8` C-010：`PlayerState.isStalled`；Media Session `playing` = `isPlaying && !isStalled`
    - `b87ff63` W-499：`resume()` 只喺 `isStalled || stall.overdue` 先 reload
    - `4bfac8d` W-498：`LoadProbe` / `isLoadProgressing`（`src/player/loadProgress.ts`）、`STALL_PROGRESS_RECHECK_MS` / `STALL_MAX_WAIT_MS` / `STALL_DATA_AHEAD_SECONDS`；`src/utils/bufferedEnd.ts` 共用
    - `47d7ca2` S-578：`formatLogSeconds`；`a1ce01f` S-579：e2e `waitForPlaybackState`
- 上一份：`reviews/2026-10-29_review_s551-lockscreen-stall.md`（67，❌ fail）
- Design Origin：冇 UI / CSS 改動，Design Fidelity n/a；PWA 版本 / update 機制冇郁，n/a
- Version：冇 bump（1.20.6），每個 commit 寫明「fixes bug introduced by 2631e3b (same session, previous command)」，符合例外。**S-551 本身係 app 行為改動，release 時仍要 bump PATCH**（上一份已講）
- TDD：每個 fix commit 測試 + 實現同一個 commit，冇獨立 red commit。逐條核對新測試喺舊代碼會唔會紅：C-009（亮屏喺 deadline 前唔 reload — 舊 `retryUnlessRecent` 會 reload）、C-010（`isStalled` 新欄位 + `useMediaSession` 正常開播報 `playing`）、W-499（deadline 前鎖屏 Play 唔 reload — 舊 `isWaitingForSound` 會 reload）、W-498（buffer 增長唔 reload — 舊代碼 4 s reload）全部喺舊代碼會 FAIL，red-first 講法可信。接受
- Review Item ID：`grep -rhoE '\b[CWS]-[0-9]{3}\b' .proj-docs .tickets` 最高 C-010、W-499、S-580。今次新 ID：**W-500、S-581、S-582**
- 總評：六項全部修好，e2e 回復 590/0，正常開播 / 轉集 / 自動接住播期間鎖屏維持 `playing`，亮屏同鎖屏 Play 唔再打斷正常載入。watchdog 狀態機清楚：`arm()` 一定先 `clearTimeout`，冇雙 timer；`cancel()` 喺 pause / 換集 / detach / resume 全部經 `stopWatchingStall()`；cap 用 wall clock，iOS 凍結 timer 都計得啱。剩低一個要留意嘅位：`readyState` 0→1（淨係 metadata 到）都當「有進展」，會令情境 1 嘅首次重試由 4 s 推到 8 s，正正落入 iOS 凍結 JS 嘅時間（W-500）——呢個係上一份 review 推薦 snippet 本身嘅漏洞，唔係 developer 實現錯。**✅ pass（92）**，W-500 建議喺下一次實機測試 / release 前修。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                                                  |
| ------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint src e2e tests` exit 0；`npx prettier --check src e2e`「All matched files use Prettier code style!」                                                                                                                                                       |
| Type check    | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                                                                                                                   |
| Tests         | ✅ pass | `npx vitest run src/player src/hooks src/components src/pages src/utils`：1120/1120。`E2E_PORT=4205 npm run e2e`：**590 PASS / 0 FAIL**，「掃卡轉節目即刻播：playing」、「拖完即刻播：playing」×2、返主頁 / 返回手勢 `playing` 全 PASS；冇出 CUI-0010 flake，冇 rerun |
| Coverage      | ✅ pass | AudioController.ts 98.2% lines / 97.8% branches；stallWatchdog.ts、loadProgress.ts、utils/bufferedEnd.ts 100% / 100%；useMediaSession.ts 100% / 87.5%；playbackLog.ts 96.4%                                                                                           |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                                                |
| Security scan | n/a     | 冇新依賴                                                                                                                                                                                                                                                              |

---

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                                              |
| -------- | ------ | ------- | --------------------------------------------------------------------------------- |
| 正確性   | 19     | 25      | W-500（-5）、S-581（-1）                                                          |
| 安全性   | 20     | 20      | log 只加格式化，冇敏感資料                                                        |
| 可維護性 | 19     | 20      | S-582（-1）                                                                       |
| 測試覆蓋 | 14     | 15      | 測試準、逐條對應 finding；但 FakeAudio 從來唔模擬 `readyState` 變化，W-500 冇測到 |
| 性能     | 10     | 10      | 慢網唔再 abort 下載                                                               |
| 代碼風格 | 10     | 10      | 新函數全部 ≤ 12 行、常數全部命名 + 註解                                           |
| **總分** | **92** | **100** |                                                                                   |

**結果：✅ pass**

---

## 逐項核對上一份 finding

| ID    | 結果      | 核對                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C-009 | ✅ 已修   | `onVisibilityChange` → `retryIfOverdue()` → `overdue = pending && Date.now() >= deadline`。撳播 1 s 後亮屏：唔 reload（`does not reload a normal start when the screen wakes up before the first deadline`）。兩個次序都只重試一次：timer 先行 → `watch()` 將 deadline 推後 8 s → 亮屏 no-op；亮屏先行 → `arm()` `clearTimeout` 舊 timer。dedupe window 刪得乾淨（`grep STALL_RETRY_DEDUPE_MS` 0 hit） |
| C-010 | ✅ 已修   | `isStalled` 只喺 `retryNow()` 決定重試嗰下（`onStalled`）先設；`checkAudible` / `onStopped` / `switchTo` / `resume` / detach 經 `stopWatchingStall()` 清。`advance()` → `load(next)` → `switchTo` 清，自動接住播全程冇 `isStalled`（`is not stalled while auto-advancing` 用 subscribe 錄低每個 state）。e2e `run.mjs:1439` 回復 PASS                                                                  |
| W-499 | ✅ 已修   | `resume()` 用 `isSuspectedStall()` = `state.isStalled \|\| stall.overdue`。deadline 前鎖屏 Play 只係 `play()`；已標卡住 / 凍結 timer 過咗 deadline 先 reload。用完重試次數之後 `isStalled` 保持 true，鎖屏顯示 Play，撳落去照樣 reload——情境 2 保證保留                                                                                                                                                |
| W-498 | ✅ 已修 ⚠ | 慢網 buffer 增長 + 前面 < 10 s → re-arm 唔扣次數、唔標卡住；前面 ≥ 10 s 而位置凍結 → 照重試；cap 由 `start()` 用 wall clock 計，凍結 JS 之後亮屏亦會即刻過 cap 重試。**但 `readyState` 單獨增長都算進展，見 W-500**                                                                                                                                                                                    |
| S-578 | ✅ 已修   | `formatLogSeconds` 共用；`to=123.5` 有測試                                                                                                                                                                                                                                                                                                                                                             |
| S-579 | ✅ 已修   | (a)(b)(c) 三個缺口都有測試；e2e 5 處改 `waitForPlaybackState`（`waitForFunction`，3 s）                                                                                                                                                                                                                                                                                                                |
| S-580 | ⏸ 範圍外  | 中途卡住仍然冇 watchdog，同意留待之後；`bufferedEnd` 已抽去 `utils/`                                                                                                                                                                                                                                                                                                                                   |

## 指定檢查點

1. **deadline vs wall clock（iOS 凍結 timer）**：`deadline` / `startedAt` / `overdue` / cap 全部用 `Date.now()`，凍結期間照行 ✔。`arm()` 每次先 `clearTimeout`，`cancel()` 清 timer / retriesLeft / deadline / baseline，冇殘留 timer ✔。
2. **cap math**：rechecks 喺 4、8 … 28 s（全部 < 30 s → re-arm），32 s 先重試。reviewer probe（臨時 test，已刪）：持續增長 → 首次重試喺 **32000 ms**。比註解「最多等 30 秒」多一個 recheck（S-582）。之後再 8 s 一次，最壞 56 s 放棄，有界 ✔。
3. **re-arm loop**：`onDeadline` 只喺 `pending && canRetry() && isStillLoading()` 先 re-arm，cap 保證終止；`canRetry` false → `retryNow` → `cancel` ✔。
4. **cancel on pause / 換集 / detach**：全部經 `stopWatchingStall()` ✔（detach 而家會 `update()` 一次 notify，listener 已經 unsubscribe 或者即將 unmount，無害）。
5. **`isStalled` 會唔會卡住 true**：
    - 用完重試次數：保持 true + `isPlaying` true → 鎖屏 Play → reload。係刻意，正確 ✔（probe：120 s 後 `isPlaying true, isStalled true`，load 3 次）。
    - **`onError` / `play()` rejected 之後**：`cancel()` 唔清 `isStalled`，之後同一集再 `play()`（例如網絡返嚟 `recoverSource`），`isStalled` 仍然 true 直到出聲 → 呢段正常開播鎖屏顯示 Play，撳落去會 reload（S-581）。probe 證實：卡住 → `fail(2)` → `play()` → `isPlaying true, isStalled true`。出聲後自動清，唔會永久卡住。
6. **情境 1 / 2 保證**：情境 2（數據到晒、位置凍結）✔。情境 1：**如果新一集 metadata 到咗但數據冇嚟（`rs` 0→1），首次重試由 4 s 變 8 s**（W-500，probe 證實：4 s load 0 次、8 s 1 次）。
7. **卡住時進度唔行**：`isStalled` 冇掂 `currentTime` / `ReplayTracker` / `persist`，`never advances the saved or shown position while stalled` 仍然 PASS ✔。
8. **函數長度 / 常數**：新函數最長 `arm` / `onDeadline` 6 行；三個新常數有單位同原因註解 ✔。`AudioController.ts` 482 行（class 已知超標，audit AU 已記錄，今次 +24）。

---

## 問題清單

### 🟡 Warning

#### W-500 淨係 `readyState` 增長（metadata 到但冇數據）都當「下載有進展」，情境 1 首次重試由 4 s 推到 8 s

- 位置：`src/player/loadProgress.ts:19`（`grew = endAfter > endBefore || after.readyState > before.readyState`）
- 描述：`arm()` 喺 `load()` / `play()` 嗰下取 baseline（`rs=0`，冇 buffered）。情境 1（鎖屏轉網絡後自動接住播 → stalled）如果新一集 response header / metadata 到咗但數據冇嚟，4 s 時 `rs=1`（HAVE_METADATA），`grew` true、`ahead` 0 → re-arm，冇重試、冇標 `isStalled`。下一次判斷喺 8 s。`STALL_FIRST_RETRY_MS` 設 4 s 嘅理由正正係「iOS 鎖屏操作後 JS 只行一陣」，S-551 log 亦顯示第二個 timer 被凍結 34 秒——即係呢種情況會由「鎖屏自己接返」退化成「亮屏先接返」。每次 retry `load()` 之後 `rs` 又由 0 開始，所以每一輪都可能多等 4 s。
- 責任：上一份 review 推薦嘅 snippet 本身就有 `readyState` 呢一項，developer 照做；係 reviewer 建議嘅漏洞。
- 測試缺口：`FakeAudio` 嘅 `load()` / `emitMetadata()` 從來唔改 `readyState`，所以所有 controller 測試都睇唔到呢條路徑。
- 方案 A（推薦）：進展只睇 media 數據——`bufferedEnd` 增長；`readyState` 只計升到 `HAVE_CURRENT_DATA`（2）或以上。HAVE_METADATA 冇任何可播數據，唔應該當進展。
    - Trade-off：慢網開播頭 4 s 只攞到 metadata（極慢）會被 reload 一次；但嗰種網絡本身已經開唔到，代價細。
- 方案 B：第一個 deadline（`STALL_FIRST_RETRY_MS`）唔做進展判斷，只有 retry 之後嘅 deadline 先 re-arm。情境 1 完全保留舊行為，但前台慢網開播 4 s 仍然會 abort 一次（W-498 只解決一半）。
- 測試：`FakeAudio.emitMetadata` 設 `readyState = 1`、`load()` 設 0；加 `retries after the first deadline when only metadata arrived`。另外建議下一次實機 log 用 `rs=` / `buf=` 確認情境 1 嘅實際 readyState。

### 🟢 Suggestion

- **S-581** `isStalled` 喺 `onError` / `play()` rejected 之後唔會清（`src/player/AudioController.ts` `onError`、`play()` catch；`stallWatchdog.ts` `retryNow` 嘅 `canRetry` false 分支只 `cancel()`）。同一集之後再撳播，正常開播期間鎖屏顯示 Play、撳鎖屏 Play 會多一次 reload，出聲先清。建議：`onError` 改用 `stopWatchingStall()`，或者 watchdog 新一輪 `start()`（未 pending）時清 `isStalled`。
- **S-582** (a) cap 實際係 32 s 而唔係註解講嘅「最多等 30 秒」：`isStillLoading()` 可以將 recheck 排到 cap 之後，建議 `arm(Math.min(STALL_PROGRESS_RECHECK_MS, startedAt + STALL_MAX_WAIT_MS - Date.now()))`，或者改註解。(b) `e2e/harness.mjs` `PLAYBACK_STATE_WAIT_MS = 3000` 註解靠 app 嘅 `STALL_FIRST_RETRY_MS`（4 s），係 hard-coded 鏡像；改 app 常數時唔會跟住變。e2e 係 `.mjs` 唔方便 import TS 常數，最少喺 `constants.ts` 嗰邊註解提一句。

---

## ✅ 做得好嘅地方

- C-009 用 deadline 取代 dedupe window，少咗一個 magic window，兩個事件次序都有測試。
- `stopWatchingStall()` 將「停止睇住」同「清 `isStalled`」綁埋，五個出口冇漏。
- `LoadProbe` 抽成純函數 + 獨立測試，`StallWatchdog` 繼續只管 timer / 次數，責任分得清楚。
- 自動接住播測試用 subscribe 錄低每一個 state，證明過程中冇一刻 `isStalled`——比淨係睇最終 state 有力。
- e2e helper 返回最後讀到嘅 state 畀 log，fail 時有證據。
- Commit 粒度：一個 finding 一個 commit，message 寫明原因同版本例外。

---

## 修正優先順序

| 優先 | ID    | 建議時間                                         |
| ---- | ----- | ------------------------------------------------ |
| 1    | W-500 | 下一次實機測試 / release 前（影響 S-551 主目標） |
| 2    | S-581 | 同 W-500 一齊                                    |
| 3    | S-582 | 有空                                             |
| —    | S-580 | 範圍外，之後另開                                 |

## 修訂後代碼（W-500 方案 A）

```ts
// src/player/loadProgress.ts
/** 有可播數據（HAVE_CURRENT_DATA）先算；HAVE_METADATA 冇數據，唔係進展（W-500） */
const HAVE_CURRENT_DATA = 2;

export const isLoadProgressing = (before: LoadProbe, after: LoadProbe): boolean => {
    const endBefore = before.bufferedEnd ?? Number.NEGATIVE_INFINITY;
    const endAfter = after.bufferedEnd ?? Number.NEGATIVE_INFINITY;
    const gotData = after.readyState >= HAVE_CURRENT_DATA && after.readyState > before.readyState;
    const grew = endAfter > endBefore || gotData;
    const ahead = (after.bufferedEnd ?? after.currentTime) - after.currentTime;
    return grew && ahead < STALL_DATA_AHEAD_SECONDS;
};
```

```ts
// tests/fakeAudio.ts（令 controller 測試睇到 readyState）
load = vi.fn(() => {
    this.error = null;
    this.currentTime = 0;
    this.duration = Number.NaN;
    this.readyState = 0; // 同 spec：load algorithm 將 readyState 設返 HAVE_NOTHING
});

emitMetadata(duration: number): void {
    this.duration = duration;
    this.readyState = Math.max(this.readyState, 1); // HAVE_METADATA
    this.dispatchEvent(new Event('loadedmetadata'));
}
```

---

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 92/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "98.2%"
next_action: merge_develop
next_agent: null
branch: "claude/keen-pascal-5iifg0"
context: "Re-review of S-551 fixes (merge 2c73260, diff e8d0259..HEAD): C-009/C-010/W-498/W-499/S-578/S-579 all fixed; vitest 1120/1120, tsc/eslint/prettier clean, e2e 590/0. New W-500 (readyState 0->1 counted as progress delays scenario-1 first retry 4s->8s), S-581 (isStalled not cleared on error/rejected play), S-582 (cap really 32s; e2e mirrors 4s const). Fix W-500 before device test/release; release must bump PATCH."
```

**結果：✅ pass**
