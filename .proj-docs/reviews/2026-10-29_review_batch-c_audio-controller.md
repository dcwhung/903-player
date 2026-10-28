# Code Review — 2026-10-29 — Batch C（L8）AudioController 抽出 StallWatchdog、ReplayTracker（高風險純 refactor）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/keen-pascal-5iifg0`，batch C 由 `5f018cc` 開 branch，head `28a7078`，merge 入 `a538d02`；範圍 = `git diff 5f018cc..28a7078`（6 個檔，+596 / −68）
- Commits：
    - `2812132` test：拆之前先寫 characterization test（stall watchdog 細節 9 個、重播計時細節 5 個）
    - `c3ffdd3` refactor：新增 `StallWatchdog`（`src/player/stallWatchdog.ts`）+ 10 個 unit test
    - `a97d6c3` refactor：`AudioController` 改用 `StallWatchdog`
    - `297eaa2` refactor：新增 `ReplayTracker`（`src/player/replayTracker.ts`）+ 11 個 unit test
    - `ffa1057` refactor：`AudioController` 改用 `ReplayTracker`
    - `28a7078` test：鎖住換集時重播計時由新一集起計
- Item 來源：`.proj-docs/audits/2026-10-27_20-30_audit_size-limits.md` AU-011（L8）`player/AudioController.ts` 一行
- Design Origin：`none-required` 有效。diff 只有 `src/player/*.ts`，冇 `.tsx` / `.css`
- Review Item ID：batch B 用到 W-485、S-549（`grep -rhoE` 掃 `.proj-docs/` 證實最高 W-485、S-549），今次由 **W-486**、**S-550** 開始（用到 S-550、S-551；冇 W）
- 總評：hard gates 全部 pass，冇 🔴 Critical，冇 🟡 Warning，2 個 🟢 Suggestion。
    - **行為等價**：逐行對過舊 `AudioController`（`5f018cc`）同新版，重試次序、`cancel()` 位置、timer 清理、`pending` 意思、重播 arm / track / reset 全部一樣（見「重點驗證」）。
    - **開發者嘅關鍵說法屬實**：reviewer 喺 scratchpad 將 `5f018cc` 嘅 `AudioController.ts` 配新 test 跑，`src/player` 7 個檔 120 個 test 全綠（`AudioController.test.ts` 51 / 51），即係新 test 冇偷偷改咗行為規格。
    - **Reviewer 自己 27 個 mutation**：23 個令 test fail；4 個冇 fail 但都解釋到：M13 等價 mutant、M24 近乎等價（兩個 `update()` 對調次序，最終 state 一樣）、M26 / M27 就係開發者講嗰 3 個 `moveTo`。
    - **3 個冇 test 分到嘅 `replay.moveTo(...)`**：同意係防守性。按 spec 行為，`lastTickPosition` 喺嗰三處本身已經等於 `state.currentTime`，所以 set 一次都係同一個值；但 reviewer 寫咗一個模擬 iOS 非 spec 次序（`load()` 之後 metadata 未到已經有 timeupdate）嘅 probe，`onLoadedMetadata` 嗰個 `moveTo` 拎走就會錯清「已收聽」，舊版同新版都 pass。建議將呢個 probe 收做正式 test（S-550）。
    - 唯一要留意嘅係**舊有**行為：iOS 卡住時「時間照跳但冇聲」會算入重播時間同重試續播位置，refactor 冇改，但新 characterization test 將「重試由卡住嗰陣嘅位置續播」鎖死咗（S-551，要實機確認）。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                                                        |
| ------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint .` exit 0（包括 `max-lines-per-function` 30 行規則）。diff 6 個檔 `npx prettier --check` 全部 pass                                                                                                                                                              |
| Type check    | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                                                                                                                         |
| Tests         | ✅ pass | `npx vitest run src/player src/hooks src/pages`（喺 `a538d02`）：33 個檔、383 個 test 全綠。冇跑 full suite；**冇跑 e2e**（port 4173 由 lead 用緊）                                                                                                                         |
| Coverage      | ✅ pass | `stallWatchdog.ts`、`replayTracker.ts` 單靠自己嘅 unit test 已經 100% lines / branches / functions；`AudioController.ts` 97.9% lines / 97.4% branch，未覆蓋嘅 33–35（`createAudioElement`）同 232（`resetReplay` 冇 recording 嘅 early return，舊版一樣冇覆蓋）唔係今次改動 |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                                                      |
| Security scan | ✅ n/a  | 冇新增 / 升級依賴（`package.json` / lockfile 冇改）                                                                                                                                                                                                                         |

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                                         |
| -------- | ------ | ------- | ---------------------------------------------------------------------------- |
| 正確性   | 24     | 25      | S-551（舊有：iOS 冇聲嘅時間跳會算重播時間、重試續播位置；新 test 鎖死咗）    |
| 安全性   | 20     | 20      |                                                                              |
| 可維護性 | 20     | 20      | 兩個 class 邊界清楚，hooks 介面細，`readonly` field                          |
| 測試覆蓋 | 14     | 15      | S-550（`onLoadedMetadata` 嘅 `moveTo` 可以用非 spec 次序 test 鎖住，而家冇） |
| 性能     | 10     | 10      |                                                                              |
| 代碼風格 | 10     | 10      | ESLint / Prettier 全過，註解廣東話，冇 magic number                          |
| **總分** | **98** | **100** |                                                                              |

**結果：✅ pass**（≥ 90、冇 Critical、hard gates 全 pass）

| Commit    | 內容                          | 分數 | Status           |
| --------- | ----------------------------- | ---- | ---------------- |
| `2812132` | characterization test         | 99   | ✅ pass（S-551） |
| `c3ffdd3` | `StallWatchdog` + test        | 100  | ✅ pass          |
| `a97d6c3` | Controller 用 `StallWatchdog` | 100  | ✅ pass          |
| `297eaa2` | `ReplayTracker` + test        | 100  | ✅ pass          |
| `ffa1057` | Controller 用 `ReplayTracker` | 99   | ✅ pass（S-550） |
| `28a7078` | 換集重播計時 test             | 100  | ✅ pass          |

---

## Section A — StallWatchdog（`c3ffdd3`、`a97d6c3`）

- 改動：`retriesLeft` + `timer` 搬入 `StallWatchdog`，暴露 `watch(n)` / `cancel()` / `pending` / `retryNow`；「仲想唔想播」同「點樣重試」經 `StallWatchdogHooks`（`canRetry`、`retry`）由 Controller 提供。Controller 嘅 `watchStall` / `unwatchStall` 刪走，`retryStalled` 由 arrow property 變普通 method，只做 log + reload + play
- 驗證（逐行對舊版 `5f018cc:src/player/AudioController.ts:385–420`）：
    - **重試次序**：舊 `retryStalled`：檢查（`undefined` / `<= 0` / `!hasPlayIntent()`）→ `recordPlayback('retry', …, left=N)` → `pendingStart` / `lastTickPosition` → `audio.load()` → `void play()` → `watchStall(N - 1)`。新 `retryNow`：同一個檢查（`canRetry` = `hasPlayIntent`）→ `hooks.retry(N)`（log → `pendingStart` / `moveTo` → `load()` → `void play()`）→ `watch(N - 1)`。次序一樣；`watch(N - 1)` 一樣係喺 retry 之後，所以 retry 期間就算同步 cancel 咗都會再 arm（同舊版一樣，`stallWatchdog.test.ts` 最後一個 test 鎖住；M1 對調次序 → fail）✅
    - **放棄條件**：`retriesLeft <= 0` 同 `!canRetry()` 都係 `cancel()` 之後 return，即係「失咗播放意圖就永久放棄」，之後再 play / 亮屏都唔會再試（新 test `gives up for good once play intent was lost…`；M3、M14 → fail）✅
    - **`log` 內容**：`recordPlayback('retry', this.audio, `left=${retriesLeft}`)` 一字冇改，`retriesLeft` 係「今次之前剩幾多」（3、2、1），新 test `logs every retry with the retries left, counting down` 鎖住 ✅
    - **`cancel()` 位置**（舊 `unwatchStall()` 全部 5 處一對一換）：detach（`attach` 返回嘅 cleanup）、`switchTo`、`onAudible`（`playing`）、`onStopped`（非 ended 嘅 pause、冇下一集嘅 ended）；加上 `watch()` 入面先 `cancel()`。冇多冇少（`grep` 證實）。M6–M9 逐個拎走 → 各有 test fail ✅
    - **Timer 清理**：`cancel()` 同舊 `unwatchStall()` 一樣 `clearTimeout` + 兩個欄位清做 `undefined`；`watch()` 先 cancel 再 set，唔會疊 timer（M4 → fail）✅
    - **`pending`**：`retriesLeft !== undefined`，同舊 `onVisibilityChange` 嘅 `this.stallRetriesLeft !== undefined` 一樣。`retriesLeft === 0`（最後一次重試之後仲睇住）時 `pending` 係 true，亮屏會叫 `retryNow` → `<= 0` → cancel，同舊版一樣 ✅
    - **`advance`**：`load(next, autoplay)` 同步部分入面 `switchTo` 先 `cancel()`，之後 `stall.watch(STALL_MAX_RETRIES)`，次序冇變（M10 → fail）✅
    - **`this` 綁定 / 初始化次序**：`stall` field initializer 只係建立 closure，冇喺 constructor 期間讀 `this.audio` 或 `hasPlayIntent`，所以 field 同 parameter property 嘅初始化次序冇影響；`retryNow` 係 arrow property，`setTimeout(this.retryNow)` 唔會甩 `this` ✅
- 分數：100

## Section B — ReplayTracker（`297eaa2`、`ffa1057`）

- 改動：`replayedSeconds` + `lastTickPosition` 搬入 `ReplayTracker`，暴露 `arm(watched)` / `moveTo(position)` / `track(position, paused): boolean`；Controller 嘅 `armReplay` / `trackReplay` 刪走，`resetReplay` 留低（要掂 storage / state）
- 驗證：
    - **arm**：舊 `armReplay()` 讀 `this.watched`；新 `arm(this.watched)` 喺同一位置傳同一個值（`load` 停喺尾、`restart`、`switchTo`）✅
    - **track**：舊 `trackReplay` 讀 `this.audio.currentTime` / `this.audio.paused`，新版喺同一位置（`update({ currentTime })` 之後）傳入同一對值。`delta`、`lastTickPosition` 更新、`undefined || paused || delta <= 0` early return 全部原封不動 ✅
    - **舊 `replayedSeconds = undefined`（喺 `resetReplay` 第一行）vs 新 `track()` 返回 true 一次**：舊版 `resetReplay` 只有 `trackReplay` 一個 caller（`5f018cc:243`），所以「夠鐘 → 清 `replayedSeconds` → 清已收聽」係一條直線。新版喺 `track()` 入面先清做 `undefined` 再返 true，Controller 跟住叫 `resetReplay`。清 `undefined` 都係喺 `update()` 通知 listener 之前，listener 入面就算 `arm()` 都唔會被覆蓋，同舊版一樣。冇 recording 嘅 early return 都係清咗先 return，一樣 ✅
    - **門檻**：`<` 早返，即係 `>= REPLAY_RESET_SECONDS` 先報，同舊版 `>=` 一樣（M17 改 `<=` → 6 個 test fail）✅
    - **每次 arm 只報一次**：M16（報完唔清）→ 4 個 test fail ✅
    - **`moveTo` 5 個位置**一對一取代舊 `this.lastTickPosition = …`：`seek`、`switchTo`、`recoverSource`、`onLoadedMetadata`、`retryStalled`。前兩個有 test 鎖住（M19、M23 → fail），後三個見下面「3 個 `moveTo`」 ✅
- 分數：99（S-550）

## Section C — Tests（`2812132`、`28a7078`）

- `2812132` 喺任何 source 改動之前，`28a7078` 喺之後，但 reviewer 證實兩批 test 都對舊 controller 全綠（見「重點驗證」），即係佢哋係純 characterization，冇改規格
- 數字核對：`AudioController.test.ts` 36 → 51（+15）、`stallWatchdog.test.ts` 10、`replayTracker.test.ts` 11，共 +36，同開發者講法一致
- 寫法：用常數（`STALL_RETRY_MS`、`STALL_MAX_RETRIES`、`REPLAY_RESET_SECONDS`）計期望值，唔 hardcode 8000 / 3 / 10；`TICK_SECONDS = 0.25` 喺二進制係精確值，累加唔會有浮點誤差
- `resumes the stalled track where it was after reloading it` 鎖死「重試由卡住嗰陣嘅 `state.currentTime` 續播」，見 S-551
- 分數：`2812132` 99（S-551）、`28a7078` 100

---

## 重點驗證

| 項目                                  | 結論          | 證據                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 舊 controller + 新 test               | ✅ 全綠       | scratchpad：`git archive 28a7078`，再用 `git show 5f018cc:src/player/AudioController.ts` 蓋住（`diff` 證實同舊版一模一樣），`npx vitest run src/player` → 7 個檔 120 / 120；`AudioController.test.ts` 51 / 51                                                                         |
| 重試次序 / 放棄 / log                 | ✅ 一樣       | 見 Section A；M1、M2、M3、M11、M12、M14 全部 fail                                                                                                                                                                                                                                     |
| `cancel()` 位置                       | ✅ 一對一     | detach、`switchTo`、`onAudible`、`onStopped`（system pause / ended 冇下一集）+ `watch()`；M6–M9 各自 fail                                                                                                                                                                             |
| `pending`                             | ✅ 一樣       | `retriesLeft !== undefined`；M5（cancel 唔清 `retriesLeft`）→ 5 個 test fail                                                                                                                                                                                                          |
| replay arm / track / reset            | ✅ 一樣       | 見 Section B；M15–M22、M24、M25 結果見下                                                                                                                                                                                                                                              |
| Mutation（reviewer，scratchpad copy） | ✅ 23 / 27    | 見下表                                                                                                                                                                                                                                                                                |
| 3 個 `moveTo`                         | ⚪ 防守性     | 見下面「3 個 `moveTo`」                                                                                                                                                                                                                                                               |
| 函數長度 / 命名 / 註解 / magic number | ✅            | ESLint `max-lines-per-function` 過；最長係 `play` 26 行、`attach` 25 行（都冇改）。新 class 每個 method ≤ 12 行。冇縮寫，註解全部廣東話，新檔冇 magic number（全部用 `constants.ts`）                                                                                                 |
| Controller 行數 / 可變 field          | ✅ 屬實       | 430 → 393 行；可變 private field 12 → 8（`state`、`pendingStart`、`lastSavedAt`、`watched`、`playIntent`、`playPending`、`playGeneration`、`nextTrack`），新加兩個係 `readonly`。審計估 ~330 行：`retryStalled`、`resetReplay` 要掂 Controller 狀態，加 import / hooks 接駁，393 合理 |
| Version                               | ⚪ 待 release | 冇 bump（仍係 1.20.3），同 batch A / B 一樣 release 時統一 bump（refactor / test → PATCH `1.20.3 → 1.20.4`）。**release commit 必須記得 bump**                                                                                                                                        |
| TDD                                   | ✅            | refactor 嘅正確做法：characterization test（`2812132`）先落，喺舊 code 綠，之後先拆；新 class 嘅 unit test 同 class 同一個 commit                                                                                                                                                     |

### Reviewer mutation（全部喺 `28a7078` 嘅 scratchpad copy，跑 `src/player src/hooks src/pages`，379 個 test）

| #   | Mutation                                     | 結果                                                                                                                                                                                           |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `retryNow`：先 `watch(n-1)` 再 `retry`       | 1 fail（`should re-arm after the retry callback even if it cancelled`）                                                                                                                        |
| M2  | `retriesLeft <= 0` → `< 0`（多試一次）       | 5 fail                                                                                                                                                                                         |
| M3  | `retryNow` 唔睇 `canRetry`                   | 2 fail                                                                                                                                                                                         |
| M4  | `watch` 唔先 cancel（疊 timer）              | 1 fail                                                                                                                                                                                         |
| M5  | `cancel` 唔清 `retriesLeft`                  | 5 fail                                                                                                                                                                                         |
| M6  | `onAudible` 唔 cancel                        | 2 fail                                                                                                                                                                                         |
| M7  | `onStopped` 唔 cancel                        | 1 fail（system pause）                                                                                                                                                                         |
| M8  | `switchTo` 唔 cancel                         | 1 fail（用戶揀第二集）                                                                                                                                                                         |
| M9  | detach 唔 cancel                             | 1 fail                                                                                                                                                                                         |
| M10 | `advance` 用 `STALL_MAX_RETRIES - 1`         | 3 fail                                                                                                                                                                                         |
| M11 | `retryStalled` 唔 `play()`                   | 2 fail                                                                                                                                                                                         |
| M12 | `retryStalled` 嘅 `pendingStart = 0`         | 1 fail（`resumes the stalled track where it was…`）                                                                                                                                            |
| M13 | 亮屏唔睇 `stall.pending` 直接 `retryNow()`   | **0 fail — 等價 mutant**：`retryNow` 自己見到 `undefined` 就 return，舊版亦一樣。guard 只係令意圖清楚，唔使改                                                                                  |
| M14 | `canRetry` 永遠 true                         | 1 fail                                                                                                                                                                                         |
| M15 | `track` 唔睇 `paused`                        | 2 fail                                                                                                                                                                                         |
| M16 | `track` 報完唔清（每個 tick 都報）           | 4 fail                                                                                                                                                                                         |
| M17 | 門檻 `<` → `<=`                              | 6 fail                                                                                                                                                                                         |
| M18 | 唔計時嘅 tick 都唔更新 `lastTickPosition`    | 2 fail                                                                                                                                                                                         |
| M19 | `seek` 唔 `moveTo`                           | 1 fail                                                                                                                                                                                         |
| M20 | 停喺尾再 load 唔 `arm`                       | 1 fail                                                                                                                                                                                         |
| M21 | `restart` 唔 `arm`                           | 1 fail                                                                                                                                                                                         |
| M22 | `switchTo` 永遠 `arm(true)`                  | 1 fail（`does not count replay time on a track that was never watched`）                                                                                                                       |
| M23 | `switchTo` 唔 `moveTo`                       | 1 fail（`starts replay timing from the new track…`，即係 `28a7078`）                                                                                                                           |
| M24 | `onTimeUpdate` 先 `track` 後 `update`        | **0 fail — 近乎等價**：兩個 `update()` 次序對調，最終 state 一樣，只係 listener 中途會見到「revision 已加、`currentTime` 未更新」；React `useSyncExternalStore` 只睇最後 snapshot，唔使加 test |
| M25 | `resetReplay` 唔清 `watched`                 | 1 fail（`marks watched again when the replay reaches 95%`）                                                                                                                                    |
| M26 | 3 個冇 test 嘅 `moveTo` 一齊拎走             | **0 fail — 預期**（開發者已經講）：按 spec 三處都係將 `lastTickPosition` 設做佢本身嘅值，見下面；用非 spec probe 就分得到（S-550）                                                             |
| M27 | 3 個冇 test 嘅 `moveTo` 一齊改做 `moveTo(0)` | **0 fail — 預期**：同 M26                                                                                                                                                                      |

### 3 個 `moveTo`（`recoverSource:209`、`onLoadedMetadata:258`、`retryStalled:371`）

- **按 spec 係 no-op**：`lastTickPosition` 同 `state.currentTime` 實際上一直相等 —— 兩者只喺 `seek`、`switchTo`（都同時設兩樣）同有 metadata 嘅 `timeupdate`（`update` 同 `track` 用同一個 `audio.currentTime`）改；`pendingStart > 0` 嘅來源（`seek` / `switchTo` / `recoverSource` / `retryStalled`）都等於當時嘅 `state.currentTime`。而 `load()` / 換 src 之後到 `loadedmetadata` 之間，spec 規定 duration 同步變 NaN，嗰段時間嘅 `timeupdate` 被 `hasMetadata()` 擋走。所以三處都係將 `lastTickPosition` 設做佢本身嘅值，冇 test 分得到係預期之內（M26、M27）。
- **但唔係冇用**：iOS 已知唔跟 spec（session log `2026-10-27_17-02.md`：背景換集「時間會跳但冇聲」、`rs=1` stall）。Reviewer 喺 scratchpad 寫咗個 probe：聽過嘅集重播到 6 秒 → `error` → `online`（`recoverSource`）→ **模擬非 spec**：metadata 未到、duration 仲係舊值時發一次 `timeupdate`（位置 0）→ `loadedmetadata`（跳返 6 秒）→ 播到 7 秒。
    - 舊版、新版：`isWatched` 仍然 true ✅
    - 拎走 `onLoadedMetadata` 嘅 `moveTo`：6 秒嘅跳躍當收聽時間 → 累計 ≥ 10 → **錯清「已收聽」** ❌
    - 即係 `onLoadedMetadata` 嗰個係真正嘅防線；`recoverSource` / `retryStalled` 嗰兩個喺 pendingStart > 0 時被佢蓋過，pendingStart = 0 時又同 `lastTickPosition` 一樣，屬純防守（保持「改位置就叫 `moveTo`」嘅規矩，`replayTracker.test.ts` 嘅註解都係咁講）
- 結論：**同意保留三個**。建議將 probe 收做正式 test，鎖住 `onLoadedMetadata` 嗰個（S-550）

Mutation、舊 controller 試驗同 probe 全部喺 repo 外 scratchpad 做，冇改 repo source，冇跑 e2e，冇用 port 4173。（scratchpad copy 係 `28a7078`，冇 batch B 嘅改動，所以係 379 個 test；repo `a538d02` 係 383 個。）

---

## 問題清單

### 🔴 Critical

冇。

### 🟡 Warning

冇。

### 🟢 Suggestion

#### S-550 — `onLoadedMetadata` 嘅 `moveTo` 係 iOS 非 spec 次序嘅防線，但冇 test 鎖住

- 位置：`src/player/AudioController.ts:254–261` `onLoadedMetadata`；`src/player/AudioController.test.ts`
- 描述：三個 `moveTo` 按 spec 都係 no-op，所以任何 spec 次序嘅 test 都分唔到（M26 / M27）。但 `onLoadedMetadata` 嗰個喺「`load()` 之後 metadata 未到已經有 `timeupdate`」嘅情況（iOS 有可能）會擋住錯清「已收聽」，reviewer probe 證實拎走就出事。而家將來有人「清走冇用嘅 code」都唔會有 test 紅
- 方案 A（推薦）：將 probe 收做 test，並喺 `onLoadedMetadata` 加一句註解講明點解要 `moveTo`。代價：一個 test、一行註解
- 方案 B：只加註解。代價：靠人睇註解
- 推薦：**A**，一個 commit `test: S-550 | ...`

#### S-551 — iOS 卡住時「時間照跳但冇聲」：會算重播時間，重試亦由跳咗嘅位置續播（舊有，新 test 鎖死咗）

- 位置：`src/player/AudioController.ts:368–374` `retryStalled`（`pendingStart = this.state.currentTime`）；`src/player/replayTracker.ts` `track`；`src/player/AudioController.test.ts` `resumes the stalled track where it was after reloading it`
- 描述：session log 記錄 iOS 背景換集卡住時「鎖屏時間會跳但冇聲」。如果 `timeupdate` 嘅 `currentTime` 真係會行：
    1. 重試時 `pendingStart = state.currentTime`，新一集會由「冇聽過嘅位置」（例如 0:40）續播，頭 40 秒冇聽到
    2. 如果下一集係聽過嘅，`ReplayTracker` 會將冇聲嘅 10 秒當重播時間，清走「已收聽」
- 兩樣都係 `5f018cc` 已經有嘅行為，今次 refactor 冇改（reviewer 證實），所以唔扣今次 merge。但 `2812132` 嘅 characterization test 將第 1 點鎖成規格，將來想改要記得呢個 test 係「鎖現狀」唔係「想要嘅行為」
- 方案 A（推薦）：先實機確認（見下面清單第 6、8 項）。如果時間真係會跳：重試同重播計時都只信「出過聲」之後嘅位置（例如 stall `pending` 期間 `retryStalled` 用 0 / 原本嘅 resume 位置；`track` 喺 `!isAudible` 時唔計）。代價：改行為，要新 spec + iPhone 實測
- 方案 B：唔改，喺 test 名 / 註解寫明係鎖現狀。代價：問題（如果真係有）留低
- 推薦：**A 嘅第一步（實機確認）**，確認有問題先開 fix

---

## ✅ 做得好嘅地方

- **先鎖後拆**：拆之前寫 14 個 characterization test，專門針對舊 test 冇覆蓋嘅細節（亮屏計入次數、system pause 永久停、放棄後唔再試、門檻剛好 10 秒、只清一次），reviewer 證實全部對舊 code 綠。
- **介面細而啱位**：`StallWatchdog` 只管次數同 timer，「仲想唔想播」同「點樣重試」用 hooks 交返 Controller；`ReplayTracker` 只計時、返 boolean，唔掂 storage / state。兩個 class 單獨 test 已經 100% 覆蓋。
- **刻意保留次序**：`retryNow` 先 retry 後 re-arm，仲寫咗個 test 專門鎖住「retry 入面 cancel 咗都會 re-arm」，連舊版嘅邊角行為都冇漏。
- **誠實交代限制**：開發者主動講出 3 個 `moveTo` 冇 test 分到，冇扮晒都有覆蓋；行數冇去到審計估嘅 ~330 都講清原因。
- **一個概念一個 commit**：新 class 同「Controller 改用」分開，每步都可以單獨 revert。

## 修正優先順序

| 優先 | ID    | 工作量     | 說明                                                                 |
| ---- | ----- | ---------- | -------------------------------------------------------------------- |
| 1    | S-551 | 細（確認） | iPhone 鎖屏卡住時睇 playback log 嘅 `currentTime` 有冇跳；有先開 fix |
| 2    | S-550 | 細         | 收 probe 做 test + `onLoadedMetadata` 註解                           |

## iPhone 實機要驗嘅嘢（jsdom / Chromium / e2e 都重現唔到）

用加咗主畫面嘅 PWA、鎖屏，每項之後連撳版本號 5 下複製 playback log 核對：

1. **鎖屏自動接集（正常路徑）**：播一集到尾 → 下一集出聲；log 有 `advance early`（或 `ended`），**冇** `retry`。
2. **卡住重試**：如果卡住，log 每約 8 秒一條 `retry left=3`、`left=2`、`left=1`，最多 3 條，之後唔再有；任何一次出聲之後唔再有 `retry`。
3. **亮屏即試**：卡住時解鎖 / 亮屏 → log 即刻有一條 `retry`（唔使等 8 秒），而且計入 3 次上限。
4. **系統暫停會停重試**：卡住期間拔耳筒 / 來電 / 控制中心暫停 → 之後冇 `retry`；再喺鎖屏撳播都唔會恢復重試。
5. **用戶揀第二集**：卡住期間喺 app 揀另一集 → 舊嗰集冇 `retry`，新一集正常播。
6. **重試續播位置（S-551）**：卡住時鎖屏時間有冇照跳？重試之後新一集由 0:00（或者佢本身嘅續播位置）開始，定係由跳咗嘅位置開始？
7. **重播計時**：開一集聽過（有剔）嘅節目由頭播 → 播滿 10 秒剔先消失；未夠 10 秒暫停 / 拖動唔會清；清完之後播到 95% 會再打剔。
8. **鎖屏接到聽過嘅集（S-551）**：下一集係聽過嘅，鎖屏卡住冇聲 10 秒以上 → 返 app 睇個剔有冇被錯清。
9. **斷網恢復（S-550）**：重播聽過嘅集到 5 秒左右，開飛航模式等出錯，再關 → 由原位續播，播多 1–2 秒個剔仍然喺度。

---

## 修訂後代碼（示意，未套用）

S-550（`src/player/AudioController.ts`）：

```ts
private onLoadedMetadata = (): void => {
    this.update({ duration: this.audio.duration });
    if (this.pendingStart > 0) {
        this.audio.currentTime = this.pendingStart;
        // 按 spec 呢度本身已經係 pendingStart；但 iOS 有可能喺 metadata 到之前發 timeupdate（位置 0），
        // 唔重設嘅話跳返續播位置嗰下會當咗收聽時間，錯清「已收聽」（S-550）
        this.replay.moveTo(this.pendingStart);
        this.pendingStart = 0;
    }
};
```

S-550 test（`src/player/AudioController.test.ts`，`replay timing details` describe 入面；reviewer 喺 scratchpad 用過）：

```ts
it('does not count the resume jump when a timeupdate slips in before metadata', async () => {
    const RESUME_AT = 6;
    const { audio, detach } = await replayWatched();
    playThrough(audio, 0, RESUME_AT);
    audio.fail(2);
    window.dispatchEvent(new Event('online'));
    // iOS 唔跟 spec：metadata 未到、duration 仲係舊值時已經發 timeupdate
    audio.duration = DURATION;
    audio.emitTime(0);
    audio.emitMetadata(DURATION);
    audio.paused = false;

    playThrough(audio, RESUME_AT + TICK_SECONDS, RESUME_AT + 1);

    expect(isWatched(RECORDING.url)).toBe(true);
    detach();
});
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 98/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "claude/keen-pascal-5iifg0"
context: "Batch C (L8, pure refactor) pass 98 (2812132 99, c3ffdd3 100, a97d6c3 100, 297eaa2 100, ffa1057 99, 28a7078 100; merged a538d02). tsc -b / eslint . exit 0; prettier clean on 6 diff files; vitest src/player+hooks+pages 383/383 at a538d02; StallWatchdog/ReplayTracker 100% covered by own tests, AudioController 97.9% lines. Behaviour equivalence verified line by line vs 5f018cc: retry order (canRetry -> log left=N -> pendingStart/moveTo -> load -> play -> watch(n-1)) unchanged; cancel() 1:1 at detach/switchTo/onAudible/onStopped (+watch); pending == old stallRetriesLeft !== undefined; replay arm/track identical, track() clearing to undefined before returning true == old resetReplay first line (its only caller was trackReplay). Developer key claim reproduced: 5f018cc AudioController.ts + new tests in scratchpad -> src/player 120/120 (AudioController.test 51/51). Reviewer 27 mutations: 23 caught; M13 (drop stall.pending guard) equivalent, M24 (track before update) near-equivalent, M26/M27 (3 moveTo) expected survivors. 3 moveTo: no-ops under spec since lastTickPosition == state.currentTime there; a non-spec probe (timeupdate with stale duration between load() and loadedmetadata, plausible on iOS) shows the onLoadedMetadata moveTo prevents wrongly clearing watched, so keep all three; S-550 add that probe as a test (verified: passes on new and old controller, fails without the moveTo) + comment. S-551 (pre-existing, not introduced): iOS stall 'time jumps but silent' would count as replay time and retry resumes from the jumped state.currentTime; characterization test 'resumes the stalled track where it was' pins it, so confirm on iPhone before changing. No version bump: release must bump 1.20.3 -> 1.20.4. Reviewer did not run e2e. iPhone (installed PWA, locked, read playback log): 1 lock-screen auto-advance plays, no retry; 2 if stalled, retry left=3/2/1 ~8 s apart then stop; 3 unlock while stalled retries at once and counts toward the limit; 4 system pause (headphones/call/control centre) stops retries for good; 5 picking another episode stops retries; 6 after retry, does the next episode start at 0:00/resume pos or at the silently-jumped time (S-551); 7 replay watched episode: tick clears after 10 s real play, not on pause/seek, re-ticks at 95%; 8 auto-advance into a watched episode stalled silent >10 s: tick not wrongly cleared (S-551); 9 airplane-mode error mid-replay then recover: resumes in place, tick kept (S-550)."
```
