# Code Review — 2026-10-29 — S-551 鎖屏卡住（playback core，高風險）+ CUI-0009

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/keen-pascal-5iifg0`
    - **A) S-551**：merge `2631e3b`（`git diff 55e0b31 2631e3b`）—— `f23702e` characterization、`bad53b9` 出聲 = 位置真係行（`AUDIBLE_ADVANCE_SECONDS` 0.3）、`b67f902` 每次撳播都睇住卡住（`STALL_FIRST_RETRY_MS` 4000，睇緊時 `start()` no-op）、`ae60b10` 亮屏 `retryUnlessRecent`（`STALL_RETRY_DEDUPE_MS` 1000）、`afee9c6` Media Session：出聲先報 `playing` + `useMediaPosition.ts` setPositionState + 鎖屏 Play 卡住時 `controller.resume()` 即刻 reload + `ms:<action>` log、`a9a56e8` log 加 `buf=`、`b85c221` 註解
    - **B) CUI-0009**：`55e0b31`（`e2e/run.mjs` `checkPoppinsLoaded` 字型 404 `.catch(() => [])`），main agent 直接 commit，未 review
- Design Origin：冇改 `*.tsx` UI / `*.css`（只有 `PlayerProvider.tsx` wiring 同 test），Design Fidelity n/a。PWA 版本 / update 機制冇郁，PWA 檢查 n/a。
- Version：冇 bump（仍係 1.20.6）。A 係 app 行為改動，按專案慣例 release commit 統一 bump（PATCH）—— **release 時必須 bump**。B 有寫明 same-session 例外，test-only，OK。
- TDD：`f23702e` characterization 先行（S-551 log 兩個情境寫成測試），之後逐個 fix commit。接受。
- Review Item ID：`grep -rhoE '\b[CWS]-[0-9]{3}\b' .proj-docs .tickets` 最高 C-008、W-497、S-577。今次新 ID：**C-009、C-010、W-498、W-499、S-578–S-580**。
- 總評：診斷好紮實（`buf=` / `ms:` log、`playing` ≠ 出聲、timer 被 iOS 凍結），`audibleFrom` 喺所有跳位置路徑都 reset 得啱，「卡住時 app 進度唔行」有測試鎖住。但將 watchdog 由「鎖屏自動接住播」擴大到「每一次撳播」之後，兩條本來只喺鎖屏 advance 先行嘅路徑而家喺前台日常使用都會行：(1) 亮屏 / 返 app 會即刻 reload 一個仲未到期、正常載緊嘅播放（C-009，probe 證實）；(2) Media Session 喺每次開始播 / 轉集 / 自動接住播 / 中途緩衝都會報 `paused`，現有 e2e「掃卡轉節目即刻播」穩定 FAIL（C-010，2/2 次）。另外慢網開播 4 秒就 reload 冇睇下載有冇進展（W-498）。**❌ fail（2 Critical + e2e gate fail）**。方向啱，修正範圍細：引入「懷疑卡住」（watchdog 首個 deadline 過咗 + 冇下載進展）呢一個訊號，C-009 / C-010 / W-498 / W-499 都用佢解決。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                                                                                                                    |
| ------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint src e2e tests` exit 0；`npx prettier --check src e2e`「All matched files use Prettier code style!」                                                                                                                                                                                                                         |
| Type check    | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                                                                                                                                                                                     |
| Tests         | ❌ fail | `npx vitest run src/player src/hooks src/components src/pages`：91 files / 1020 tests 全綠。**`E2E_PORT=4201 npm run e2e` 兩次都係 589 PASS / 1 FAIL：`掃卡轉節目即刻播：paused`（`e2e/run.mjs:1439`）**——穩定重現，唔係 CUI-0010 arcSheet flake（今次兩次都冇出）。上一份 review（`860d3e1`）同一 check 係 PASS（590/0），即係今次引入 |
| Coverage      | ✅ pass | `vitest --coverage src/player`：AudioController.ts 98.1% lines / 97.8% branches，useMediaSession.ts 100% / 87.5%，playbackLog.ts 96.6%，stallWatchdog.ts、useMediaPosition.ts 100%（v8 text 報告 skip full）                                                                                                                            |
| No Critical   | ❌ fail | 🔴 = 2（C-009、C-010）                                                                                                                                                                                                                                                                                                                  |
| Security scan | n/a     | 冇新依賴                                                                                                                                                                                                                                                                                                                                |

---

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                                              |
| -------- | ------ | ------- | --------------------------------------------------------------------------------- |
| 正確性   | 0      | 25      | C-009、C-010（-30）、W-499（-5），扣到 0                                          |
| 安全性   | 20     | 20      | log 只記 event / 位置 / seekTime，冇敏感資料                                      |
| 可維護性 | 19     | 20      | 函數全部短、常數齊、註解寫明 S-551 原因；S-580                                    |
| 測試覆蓋 | 14     | 15      | 測試多而準，但漏咗「亮屏喺 deadline 前」同「慢網 buffer 有進展」兩個情境（S-579） |
| 性能     | 5      | 10      | W-498：慢網 4/12/20 秒 reload，每次重新下載                                       |
| 代碼風格 | 9      | 10      | S-578                                                                             |
| **總分** | **67** | **100** |                                                                                   |

**結果：❌ fail**

---

## 逐點判斷（main agent 指定）

### 1. 慢網 trade-off — 會令慢網開播變差，但唔會「永遠開唔到」（W-498）

reviewer probe（臨時 test，已刪）：`load(autoplay)` + metadata 到、一直冇 timeupdate → `audio.load()` 喺 **4000、12000、20000 ms** 各一次；28 秒 `retryNow(0)` 只係 cancel，**最後一次 load 唔會被打斷**，所以最壞情況係 20 秒 + 一次完整開播時間之後一定開到。唔會死循環。

但係：

- `audio.load()` 會 abort 緊進行中嘅 request、清走 buffer、`readyState` 返 0、要重新攞 metadata、再 seek 去 `pendingStart`、再 buffer。一個本來 5–6 秒先出聲嘅慢網開播，會喺 4 秒被打斷，變成 4 + 完整重開（≥ 5–6 秒）≈ 10 秒，仲多咗一份流量。網絡穩定地慢（例如 HK 地鐵 3G / 外地漫遊）時，第二次（8 秒窗口）通常夠，但第一次一定嘥咗。
- 以前只有自動接住播先睇住（8 秒），前台撳 Play 從來唔會被 reload；今次係每個用戶都會受影響嘅行為改變。

**更好嘅訊號（推薦）**：timer 到期時唔好淨係睇「出咗聲未」，要分「下載有進展但仲未夠」同「真係死咗」：

```ts
// AudioController：每次 watchdog 到期前問一次（StallWatchdog 加 hook `isProgressing(): boolean`）
private lastProbe = { bufferedEnd: -1, readyState: -1 };

/** 仲載緊而且有進展：慢網，唔好 reload；冇進展（stalled / 數據到晒但位置凍結）先重試 */
private isLoadProgressing(): boolean {
    const bufferedEnd = bufferedEndAround(this.audio); // 同 playbackLog 嘅 bufferedEnd 共用（抽去 utils）
    const grew =
        bufferedEnd > this.lastProbe.bufferedEnd || this.audio.readyState > this.lastProbe.readyState;
    this.lastProbe = { bufferedEnd, readyState: this.audio.readyState };
    const ahead = bufferedEnd - this.audio.currentTime;
    // 前面已經有夠數據但位置唔行 = iOS 情境 2（pipeline 死咗），即使 buffer 仲增長都要重試
    return grew && ahead < STALL_DATA_AHEAD_SECONDS;
}
```

StallWatchdog：到期時 `isProgressing()` 係 true 就 **re-arm 但唔扣次數**，再加一個總上限（例如 `STALL_MAX_WAIT_MS` 30 秒，由 `start()` 計），避免一直「有少少進展」拖住。

- 情境 1（轉網絡後 stalled）：連線死咗，`buffered` 唔增長 → 照樣 4 秒重試 ✔
- 情境 2（AirPods 斷線後 `playing` 但 ct 凍結 82 秒）：數據多數已經喺前面（`ahead` 大）或者唔再增長 → 照樣重試 ✔（`a9a56e8` 加嘅 `buf=` 正好用嚟喺實機確認呢點，建議下一次實機 log 先驗證）
- 前台慢網：`buffered` 每次都增長、`ahead` 細 → 唔 reload ✔

方案 B（更簡單）：第一次重試只喺見過 `stalled` event（或者 `networkState === NETWORK_IDLE` 而 `readyState < HAVE_FUTURE_DATA`）先做；冇就當慢網，用 `STALL_RETRY_MS` 再等。缺點：iOS 情境 2 唔一定發 `stalled`，要靠「數據到晒但位置唔行」補返，即係最後都要用到方案 A 嘅 `ahead` 判斷。**推薦方案 A**。

### 2. Media Session 喺短暫緩衝 / 自動接住播期間報 `paused` — 有實際風險，而且 e2e 已經紅（C-010）

而家 `playbackState = isPlaying && isAudible ? 'playing' : 'paused'`，`isAudible` 喺以下全部時候都係 false：

- 每次撳播到位置行夠 0.3 秒（一般 0.5–1 秒，慢網更長）
- **`advance()` 一開始就 `update({ isAudible: false })`**——即係鎖屏自動接住播嗰下，正正係 `advance()` 註解講「喺 timeupdate 仲播緊時換，iOS 唔會收起 audio session」嗰個時刻
- 中途 `waiting`（任何緩衝）

風險評估：

- iOS 收唔收起 audio session 主要睇 media element 係咪真係 paused，`navigator.mediaSession.playbackState` 只係 hint；reviewer 冇實機，**冇證據**證明 iOS 會因為呢個 hint 拆 session。但係 WebKit 會用佢更新 Now Playing 嘅 rate / 掣，有幾個可以預見嘅副作用：
    1. 鎖屏 / 控制中心每次換集、每次緩衝都閃一下 Play 掣、進度條停一停——對用戶就係「好似停咗」，同 S-551 想解決嘅「顯示同實際唔一致」係反方向嘅同一類問題。
    2. 用戶見到 Play 撳落去 → `resume()` → `isWaitingForSound()` true → **即刻 reload 一個正常載緊嘅集**（W-499）。
    3. AirPods / 線控單掣 toggle：如果系統按 Now Playing 狀態決定送 `play` 定 `pause`（未證實，視乎 iOS 版本），緩衝期間用戶想暫停，會變成送 `play` → reload，暫停唔到。
    4. 自動接住播期間 `paused` + 舊位置 → 新集 `playing` + 新位置，鎖屏短時間內兩次 state 變化，加埋 `setPositionState`——冇實機驗證就改動「鎖屏自動接住播」呢條最脆弱嘅路徑，風險同收益唔對稱。
- e2e：`掃卡轉節目即刻播`（`run.mjs:1439`）兩次都 FAIL，因為掃卡轉節目每次都 `emptied` → 重新開始計 0.3 秒，`TODAY_SETTLE_MS` 600 ms 唔夠。`run.mjs:626`「拖完即刻播」（800 ms）、`:1398`（返主頁）、`:1448`（返回手勢，500 ms）、`miniPlayerRules.mjs:65` 今次 PASS，但都係固定等待 + race，CPU 爭用時會 flake。**呢個 FAIL 唔係 test 寫得唔好**：佢斷言嘅正正係「轉節目之後鎖屏繼續顯示播緊」，係今次改變咗嘅產品行為。

**推薦（方案 A）**：只喺「懷疑卡住」先報 `paused`：

```ts
// PlayerState 加 isStalled（watchdog 首個 deadline 過咗、仲未出聲；出聲 / pause / 換集清走）
const playbackState = isPlaying && !isStalled ? 'playing' : 'paused';
```

- 正常開播、轉集、自動接住播、短暫緩衝：維持 `playing`（同改之前一樣），e2e 唔使改。
- 情境 2：4 秒後 `isStalled` → `paused` + 凍結位置，鎖屏進度條停、顯示 Play；用戶撳 Play → `resume()` 即刻 reload ✔（目標保留）。
- `useMediaPosition` 照用：`playing` 時位置照報，`isStalled` 時報凍結位置 + `paused`。
- `resume()` 改為 `if (this.state.isStalled)` 先 reload（解決 W-499）。

方案 B：保留 `isAudible` 判斷，但 `advance()` 開始到新集首個 deadline 之間強制 `playing`（「auto-advance window」）。只解決第 4 點，第 1–3 點同 e2e 仍然存在，唔推薦。

### 3. `audibleFrom` / 浮點 / ReplayTracker / 進度 — 正確（有一個 visibility bug，C-009）

逐條路徑核對：

| 路徑                           | `audibleFrom`                                                                                                                 | 判斷                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `seek()`                       | `moveTo(target)`                                                                                                              | ✔                                                                                               |
| `switchTo()`                   | `moveTo(resume)`；之後 `emptied` → `onSilent` 設做 0（load 後 ct = 0）；`loadedmetadata` pendingStart > 0 再 `moveTo(resume)` | ✔（中間 0 只係過渡，`hasMetadata()` 擋住 timeupdate）                                           |
| `reload()` / `recoverSource()` | `moveTo(state.currentTime)`，同上                                                                                             | ✔                                                                                               |
| `onLoadedMetadata` 續播跳位    | `moveTo(pendingStart)`                                                                                                        | ✔                                                                                               |
| `play` / `playing` / `waiting` | 設做 `audio.currentTime`                                                                                                      | ✔；iOS 忽略 metadata 時設嘅 currentTime 由 0 開始播，`playing` 會將起點拉返 0，唔會永遠「冇聲」 |
| 位置倒退                       | `advanced` 負數 → 唔當出聲                                                                                                    | ✔                                                                                               |

- 浮點：門檻 0.3 對 timeupdate 0.25 秒一 tick，第二 tick（≈0.5）先確認；`fakeAudio.emitAudible` 行 2 倍門檻避開 `100 + 0.3 - 100 < 0.3`，有註解。✔
- ReplayTracker / 進度：卡住時 `audio.currentTime` 凍結 → `state.currentTime` 唔行、`replay.track` delta 0、`persist()` 存同一個位置；reload 用 `state.currentTime`（最後真正播到嘅位置），`load()` 後 `hasMetadata()` false 唔會存 0。`never advances the saved or shown position while stalled` 鎖住。✔
- **C-009（visibility）**：見問題清單。

### 4. 函數長度 / 常數 / 測試質素

- 所有新函數 ≤ 20 行；`AudioController.ts` 458 行（class 本身，之前 audit 已知），冇新增超標函數。常數全部命名 + 註解（`MS_PER_SECOND`、`MEDIA_SESSION_PLAYBACK_RATE`、`MEDIA_POSITION_DRIFT_SECONDS` 等）。✔
- 舊測試改動：
    - `emitPlaying()` → `emitAudible()`（PlayerGauge / PlayerPanel / useMiniPlayer / AudioController）：係新定義下嘅等價改寫，斷言冇放鬆；useMiniPlayer 仲多咗一句 `isAudible` 斷言。✔
    - `stops watching on a system pause even if playback is resumed later` → `stops watching on a system pause`：舊保證（系統暫停後再撳播唔再睇住）**刻意反轉**，新行為由 `reloads and resumes where it was when a resumed play never advances` 鎖住，同 S-551 情境 2 一致。接受。
    - `stall.watch` → `start`：`keep the running count and timer when started while already watching` 鎖住「retry 入面嘅 play() 唔補次數、唔推遲 timer」。✔
- 漏咗嘅測試見 S-579。

---

## 問題清單

### 🔴 Critical

#### C-009 亮屏 / 返 app 會即刻 reload 一個仲未到期、正常載緊嘅播放

- 位置：`src/player/AudioController.ts:441-448`（`onVisibilityChange`）、`src/player/stallWatchdog.ts:64-69`（`retryUnlessRecent`）
- 描述：`stall.pending` 而家喺**每一次**撳播都係 true（之前只係鎖屏自動接住播）。用戶撳 Play → 1 秒內轉去第二個 app / 鎖屏再開 → `visibilitychange visible` → `retryUnlessRecent()`，`lastRetryAt = -Infinity` → 即刻 `retryNow()` → `audio.load()`。reviewer probe：`load(autoplay)` + metadata、1000 ms 後 dispatch visible → `audio.load` 被叫 1 次。
- 影響：前台日常操作（撳播之後拉通知中心 / 切 app / 鎖屏即開）會打斷正常開播、重新下載、扣一次重試。註解寫明原意係「背景 timer 可能冇行過」——即係 timer **已經到期但冇機會行**先應該補做，未到期唔應該做。
- 方案 A（推薦）：StallWatchdog 記低 `deadline`（`Date.now() + delayMs`），亮屏改用 `retryIfOverdue()`：`Date.now() >= deadline` 先 `retryNow()`。遲咗嘅 timer 啱啱行過會將 deadline 推前 8 秒，所以亦自動解決 65 ms 重複重試——`STALL_RETRY_DEDUPE_MS` / `lastRetryAt` 可以刪走，少一個 magic window。
    - Trade-off：依賴 `Date.now()` 喺 iOS 暫停 JS 期間照行（係 wall clock，會照行）✔
- 方案 B：保留 dedupe，再加「由 `start()` 計起已經過咗 `STALL_FIRST_RETRY_MS`」條件。兩個時間窗口疊埋，較難理解。
- 測試：`retries on wake-up only once the deadline has passed`（1 秒亮屏唔 reload；5 秒亮屏 reload；遲咗嘅 timer + 65 ms 亮屏只 reload 一次）。

#### C-010 Media Session 每次開播 / 轉集 / 自動接住播 / 緩衝都報 `paused`，e2e 穩定 FAIL

- 位置：`src/player/useMediaSession.ts:58`、`src/player/AudioController.ts:416`（`advance()` `isAudible: false`）
- 描述 / 影響：見「逐點判斷 2」。`掃卡轉節目即刻播：paused` 兩次 e2e 都 FAIL（hard gate）；鎖屏自動接住播呢條最脆弱路徑喺冇實機驗證下改咗 state 序列；鎖屏 Play 喺正常載入期間出現，撳落去會 reload（W-499）。
- 方案 A（推薦）：新增 `isStalled`（watchdog 首個 deadline 過咗而未出聲；出聲 / pause / 換集清走），`playbackState = isPlaying && !isStalled ? 'playing' : 'paused'`。
    - Trade-off：卡住頭 4 秒鎖屏進度條仍然會行（同改之前一樣），之後先停；換嚟正常路徑零改動、e2e 唔使改。
- 方案 B：保留 `isAudible`，`advance()` 到新集首個 deadline 之間強制 `playing`，同時改 e2e 用 `waitForFunction` 等 `playing`。只解決 auto-advance，用戶可見嘅閃 Play 仍然存在。
- 測試：`keeps reporting playing while a normal start / auto-advance / short buffer is under way`、`reports paused once the first stall deadline passes`。

### 🟡 Warning

#### W-498 慢網開播 4 秒就 reload，冇睇下載有冇進展

- 位置：`src/player/stallWatchdog.ts:33-37`、`src/player/AudioController.ts:326-330`
- 描述 / 影響 / 方案：見「逐點判斷 1」。方案 A（推薦）：到期時 `isProgressing()`（buffered end / readyState 有增長而且前面數據 < `STALL_DATA_AHEAD_SECONDS`）就 re-arm 唔扣次數，加 `STALL_MAX_WAIT_MS` 總上限。方案 B：第一次重試要見過 `stalled` / `NETWORK_IDLE`。
- 測試：`does not reload a slow start while the buffer keeps growing`、`reloads when data is buffered ahead but the position is frozen`。

#### W-499 鎖屏 / 耳機 Play 喺正常載入期間會 reload

- 位置：`src/player/AudioController.ts:160-166`（`resume`）、`:437-439`（`isWaitingForSound`）
- 描述：`isWaitingForSound()` = 想播 && 未出聲，正常開播頭 0.5 秒至幾秒都成立；而 C-010 令鎖屏喺呢段時間顯示 Play，用戶好自然會撳。結果係打斷正常載入。
- 方案 A（推薦）：改用 C-010 嘅 `isStalled`（首個 deadline 過咗）先 reload，否則照 `play()`。
- 方案 B：`resume()` 加 `!this.stall.pending || overdue` 判斷。同 A 等價但邏輯分散。

### 🟢 Suggestion

- **S-578** `useMediaSession.ts:43`：`to=${details.seekTime}` 冇格式化（例如 `to=123.45678901`），同其他 log 欄位 `toFixed(TIME_DECIMALS)` 唔一致。建議用同一個 formatter。
- **S-579** 測試缺口：(a) 亮屏喺首個 deadline 之前（C-009）；(b) 慢網 buffer 持續增長（W-498）；(c) Media Session 正常開播 / 轉集期間嘅 state（C-010）。e2e `run.mjs:626`、`:1398`、`:1448`、`miniPlayerRules.mjs:65` 用固定 `waitForTimeout` 讀 `playbackState`，C-010 修好之後應該冇問題，但建議改 `waitForFunction(() => navigator.mediaSession.playbackState === 'playing', { timeout })` 減少 CPU 爭用 flake。
- **S-580** 中途卡住（聽到一半鎖屏轉網絡，唔係撳播 / advance 嗰下）仍然冇 watchdog：`waiting` / `stalled` 唔會 `start()`。今次範圍外，等 W-498 嘅進展訊號做好之後可以考慮喺 `stalled` event 都 `start()`。另外 `bufferedEnd` 而家只喺 `playbackLog.ts`，W-498 用到時抽去 `utils/` 共用。

---

## Section B — CUI-0009 `55e0b31`

- `document.fonts.load()` 字型檔 404 會 reject（NetworkError），舊代碼令 `p.evaluate` throw、成個 run crash。`.catch(() => [])` → `faces.some(...)` false → `ok` false → 照出 FAIL，正確；`document.fonts.check` 仲係第二重確認。註解同步更新。
- 冇吞其他錯誤：只包住 `fonts.load` 一個 promise。
- ticket 由 pending 移去 completed，commit message 寫明 same-session 例外。兩次 e2e 「Poppins 400 / 500 / 600 都載入咗」PASS。
- 評分：100（冇問題）。未經 review 直接 commit 係流程問題，今次補 review，冇發現。

---

## ✅ 做得好嘅地方

- 先寫 characterization test 重現實機 log 兩個情境，再逐個 commit 修，commit 粒度清楚。
- 「`playing` event ≠ 出聲」呢個觀察好準，用位置真係行嚟定義出聲係正確嘅抽象，而且 `audibleFrom` 喺 seek / 換集 / reload / 續播跳位全部 reset，冇漏。
- `start()` 睇緊時 no-op，防止 retry 入面嘅 `play()` 補返次數或者推遲 timer，有測試。
- `reload()` 抽出嚟同 `retryStalled` / `resume` 共用，續播位置用 `state.currentTime`（最後真正播到），進度唔會因為卡住而行。
- `buf=` 同 `ms:<action>` log 令下一次實機 log 可以分到「冇數據」定「有數據但唔播」，以及用戶喺鎖屏撳過乜——W-498 嘅方案正正靠佢驗證。
- `useMediaPosition` 只喺狀態 / 長度 / 集數變或者 drift > 2 秒先報，clamp 位置、`Infinity` / 0 長度唔報、舊 Safari 冇 `setPositionState` 都處理咗。

---

## 修正優先順序

| 次序 | ID                    | 內容                                                         | 備註                                          |
| ---- | --------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| 1    | C-009                 | watchdog 記 deadline，亮屏只補做到期咗嘅重試；刪 dedupe 窗口 | 獨立 commit                                   |
| 2    | C-010                 | `isStalled` 決定鎖屏 `paused`；e2e 回綠                      | 依賴 1 嘅 deadline                            |
| 3    | W-499                 | `resume()` 只喺 `isStalled` 先 reload                        | 依賴 2                                        |
| 4    | W-498                 | 到期時睇下載進展，有進展 re-arm 唔扣次數 + 總上限            | 先用實機 `buf=` log 驗證情境 2 嘅 buffer 形態 |
| 5    | S-578 / S-579 / S-580 | log 格式、測試、e2e 等待方式                                 | 可同 batch                                    |

---

## 修訂後代碼（C-009 / C-010 / W-499 核心，示意）

```ts
// src/player/stallWatchdog.ts
export class StallWatchdog {
    private retriesLeft: number | undefined;
    private timer: ReturnType<typeof setTimeout> | undefined;
    /** 而家呢次等待幾時到期（Date.now()）；iOS 暫停 JS 時 timer 唔行，但 wall clock 照行 */
    private deadline = Number.POSITIVE_INFINITY;

    constructor(private readonly hooks: StallWatchdogHooks) {}

    get pending(): boolean {
        return this.retriesLeft !== undefined;
    }

    /** 首個 deadline 過咗而仲未 cancel：鎖屏應該顯示停咗、鎖屏 Play 應該即刻 reload */
    get overdue(): boolean {
        return this.pending && Date.now() >= this.deadline;
    }

    start(retriesLeft: number): void {
        if (!this.pending) {
            this.watch(retriesLeft, STALL_FIRST_RETRY_MS);
        }
    }

    watch(retriesLeft: number, delayMs = STALL_RETRY_MS): void {
        this.cancel();
        this.retriesLeft = retriesLeft;
        this.deadline = Date.now() + delayMs;
        this.timer = setTimeout(this.retryNow, delayMs);
    }

    // cancel() 同 retryNow() 不變（cancel 將 deadline 設返 +Infinity）

    /** 亮屏時用：timer 到期咗但 iOS 冇畀佢行先補做；未到期（例如撳播之後即刻切 app 再返嚟）唔郁 */
    retryIfOverdue = (): void => {
        if (this.overdue) {
            this.retryNow();
        }
    };
}
```

```ts
// src/player/AudioController.ts（節錄）
resume = async (): Promise<void> => {
    // 懷疑卡住（首個 deadline 過咗）先即刻 reload；正常載緊就照 play()，唔好打斷（W-499）
    if (this.stall.overdue) {
        this.stall.cancel();
        this.reload('remote');
    }
    await this.play();
};
```

`isStalled` 要喺 state 入面（React 先 re-render）：watchdog 加 hook `onOverdue()`，喺 `retryNow()` 開頭 `update({ isStalled: true })`；`checkAudible()` / `onStopped()` / `switchTo()` 清走。`useMediaSession`：`isPlaying && !isStalled ? 'playing' : 'paused'`。

---

## Handoff receipt

```handoff-receipt
protocol: 1
status: fail
score: 67/100
hard_gates:
  lint: pass
  type_check: pass
  tests: fail
  coverage: pass
  no_critical: fail
  security_scan: n/a
next_action: invoke_developer
next_agent: developer
branch: "claude/keen-pascal-5iifg0"
blockers: ["C-009", "C-010", "e2e 掃卡轉節目即刻播：paused (run.mjs:1439, 2/2 runs)"]
context: "Review of S-551 merge 2631e3b (diff 55e0b31..2631e3b) + CUI-0009 55e0b31. Gates: vitest src/player src/hooks src/components src/pages 91 files 1020/1020, tsc -b 0, eslint src e2e tests 0, prettier clean, coverage AudioController 98.1% lines, useMediaSession 100%, stallWatchdog/useMediaPosition 100%. Full e2e E2E_PORT=4201 twice: 589 PASS / 1 FAIL both times, '掃卡轉節目即刻播：paused' (run.mjs:1439) - deterministic regression (passed 590/0 at 860d3e1); no CUI-0010 flake seen. C-009: watchdog now armed on every play, and onVisibilityChange -> retryUnlessRecent retries immediately when nothing has retried yet (lastRetryAt=-Inf); probe: load(autoplay)+metadata, visible after 1000ms -> audio.load called once = foreground app-switch/lock-unlock within 4s reloads a normal start. Fix: StallWatchdog keeps deadline, wake-up uses retryIfOverdue (Date.now()>=deadline); this also covers the late-timer+visibility double retry so STALL_RETRY_DEDUPE_MS/lastRetryAt can go. C-010: mediaSession playbackState = isPlaying&&isAudible reports paused on every start/switch/auto-advance (advance() sets isAudible false)/short buffer; breaks e2e, flips lock-screen Play during locked auto-advance (untested on device; iOS session teardown unproven but risk/benefit poor), invites lock-screen Play -> resume -> reload of a normal load (W-499). Fix: add PlayerState.isStalled set when watchdog first deadline passes, cleared on audible/stop/switch; playbackState = isPlaying && !isStalled; resume() reloads only when stall.overdue. W-498: slow network probe shows reloads at 4000/12000/20000 ms with no audible; last load not aborted so it always starts eventually, but each reload aborts the download; recommend isProgressing() check (buffered end/readyState grew and buffered-ahead < threshold -> re-arm without spending a retry, plus total cap STALL_MAX_WAIT_MS); scenario 2 (data ahead but ct frozen) still retries; verify with device buf= log. audibleFrom resets verified on seek/switchTo/reload/recoverSource/loadedmetadata/play/playing/waiting; transient 0 after emptied harmless (hasMetadata guard); float margin ok; no progress/replay advance while stalled (tested). Old test changes are equivalent rewrites; 'system pause then resumed play not watched' intentionally inverted and covered by new test. S-578 seekTime log unformatted; S-579 missing tests (wake before deadline, growing buffer, media session during normal start) + use waitForFunction for playbackState e2e checks (run.mjs:626/1398/1448, miniPlayerRules.mjs:65); S-580 mid-episode stall still unwatched, share bufferedEnd helper. CUI-0009 55e0b31: correct, .catch(() => []) makes a 404 font a logged FAIL instead of crash, Poppins check PASS in both runs; 100. No version bump: release must bump (PATCH). Not pushed."
```

**結果：❌ fail**
