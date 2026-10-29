# QA 測試報告 — 2026-10-29 — S-551 鎖屏卡住修正 + 芝See菇Bi 書架 tile

- 測試員：Quality Assurance（獨立角色）
- 範圍：`claude/keen-pascal-5iifg0` @ `51c0f59`（version 仍然 `1.20.6`，release 要 bump PATCH）
    - S-551 鎖屏卡住（playback core，高風險）：merge `2631e3b`（S-551 本體）、`2c73260`（C-009 / C-010 / W-498 / W-499 / S-578 / S-579）、`9161297`（W-500 / S-581 / S-582）
    - Reviews：[s551-lockscreen-stall](../reviews/2026-10-29_review_s551-lockscreen-stall.md)（67 fail）→ [s551-rereview](../reviews/2026-10-29_review_s551-rereview.md)（92 pass）→ [s551-round3](../reviews/2026-10-29_review_s551-round3.md)（99 pass，S-583）
    - `acd8ea5`：`src/dramas/chisee/tile.webp` 換新封面
- 用戶下一步會裝落 iPhone 用，所以除咗 repo 測試，另外用真 Chromium 跑卡住情境
- 環境：
    - Linux sandbox（4 核）、Node 22.22.0、playwright 1.63.0（Chromium）
    - 情境測試：repo `dist`（`npm run e2e` build 出嚟）用 `vite preview`（4219），context 用 e2e harness `newE2EContext`（mock 字型、假錄音列表、時鐘由 `E2E_NOW` 起照常行）
    - 音檔三種：harness 正常 mock（即刻回應）；route 永遠唔回應（hang）；本機 HTTPS trickle server（Chromium `--host-resolver-rules` 將 `audio.hkfm903.live` 指去本機，可以控制每秒送幾多 bytes）
    - 播放 log 由 `localStorage['903player:playback-log:v1']` 讀（即係版本號連撳 5 下複製出嚟嗰份）；`mediaSession.playbackState` 用頁內 10 ms 取樣記低轉變時間
    - QA script 全部喺 scratchpad，冇改 repo 任何 source / test
- 總結：✅ **pass**
    - `npm test` **157 files / 1872 tests** 全綠；`npx tsc -b`、`npm run lint` exit 0；`npm run build` exit 0
    - `E2E_PORT=4209 npm run e2e` **590 PASS / 0 FAIL**（一次過，CUI-0010 冇出現，唔使重跑）
    - Chromium 卡住情境 **31 PASS / 0 FAIL**：正常播即刻 `playing`、冇 retry；音檔冇回應 → 3.9 s `retry left=3` 同時鎖屏轉 `paused`、進度冇郁；慢網有進展冇 retry；位置凍結但 buffer 增長 → 啱啱 30 s 先 retry；deadline 前亮屏唔 reload；卡住時鎖屏 Play → `retry … remote`；所有 log 行都有 `buf=`
    - 芝See菇Bi tile：390×844、1280×800 都載入新檔，同舊 tile build 逐 pixel 比，所有唔同 pixel 都喺嗰張 tile 入面，版面冇變
    - PWA v1.20.6（`origin/main`）→ v1.20.7（HEAD 模擬 bump）4/4
    - 補寫 6 個 edge case test 全綠，3 個 mutation 都捉到
    - 新 ticket：**CUI-0011 🟢**（極慢網開播 metadata 未到時 watchdog 睇唔到進度，照 4 / 12 / 20 s reload）。唔阻 release
    - S-583（`playing` + `rs≥3` + buffer < 10 s + 位置凍結 → 首次 retry 喺 8 s）係已知 optional，冇開 ticket，留待實機 log

---

## Hard Gates

| Gate           | 結果    | 證據                                                                                                                                                                                      |
| -------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests          | ✅ pass | `npm test`：157 files / 1872 tests，exit 0；`E2E_PORT=4209 npm run e2e`：590 / 0，exit 0                                                                                                  |
| Type check     | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                                       |
| Lint           | ✅ pass | `npm run lint` exit 0（eslint + 「All matched files use Prettier code style!」）                                                                                                          |
| Build          | ✅ pass | `npm run build`（e2e 第一步）exit 0；3 行 splash `didn't resolve at build time` 係 `public/` 執行時路徑，之前一直有                                                                       |
| Coverage       | ✅ pass | `src/player/**` + `bufferedEnd.ts`：statements 98.63 %、branches 96.2 %、lines 98.56 %；`AudioController.ts` 98.22 % lines；`stallWatchdog.ts`、`loadProgress.ts`、`bufferedEnd.ts` 100 % |
| Security       | ✅ pass | 冇新 dependency；log 只記 event / 位置 / readyState / 檔名；錄音 URL 仍然只准原站 origin（`hasAllowedAudioOrigin`）                                                                       |
| Data integrity | ✅ pass | 卡住 14 s、3 次 reload 之後 `903player:progress:v1` 嗰集 entry 一字不變（position 120）；edge test：卡住期間 hidden / pagehide 都唔會將 0 寫入進度                                        |
| Performance    | ✅ pass | 正常播 9 s 冇 reload；慢網有進展（0.1×、0.5× 實時）冇 reload；最壞情況（冇數據）3 次 reload 之後停，有上限                                                                                |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                                                                    |
| PWA Update     | ✅ pass | vN `v1.20.6`（`origin/main` build）→ vN+1 `v1.20.7`（HEAD + package.json bump，scratch）：tab 受 SW control → 換 dist → `update()` → 自動 reload 顯示 `v1.20.7`，冇 page error（4/4）     |

## 測試覆蓋概覽

| 類型                    | 數量                                                               | 結果                   |
| ----------------------- | ------------------------------------------------------------------ | ---------------------- |
| Unit / component        | 1872 tests / 157 files                                             | 全綠                   |
| E2E（repo 自帶）        | 590 checks × 1 次                                                  | 全綠                   |
| QA 卡住情境（Chromium） | `scen.mjs` 31 個 assertion（a–f，c 分四種網速）                    | 31 / 0                 |
| QA edge case（vitest）  | `qaS551Edge.test.ts` 6 個 test（scratch copy）                     | 6 / 0；mutation 3/3 紅 |
| 芝See菇Bi tile          | `shelf.mjs` 12 個 assertion（兩個尺寸 + 逐 pixel 比舊 tile build） | 12 / 0                 |
| PWA                     | `pwa.mjs` 4 個 assertion                                           | 4 / 0                  |

---

## 1. 靜態檢查同單元測試

| 步驟                        | 結果                                    |
| --------------------------- | --------------------------------------- |
| `npm test`                  | exit 0，157 files / 1872 tests，88 s    |
| `npx tsc -b`                | exit 0                                  |
| `npm run lint`              | exit 0                                  |
| `E2E_PORT=4209 npm run e2e` | build exit 0；590 PASS / 0 FAIL，exit 0 |

e2e 冇出 CUI-0010（arcSheet）flake，所以冇重跑。

## 2. 卡住情境（真 Chromium）

時間全部以 playback log `play` event 嗰行做 0。`play()` 一 call 就開始計 deadline，`play` event 遲幾十 ms 先到，所以 4 s deadline 喺 log 上面係 3.9 s 左右。

| #   | 情境                                                                       | 結果（Chromium 量度）                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a   | 正常播（harness mock，續播位置 120 s）                                     | ✅ `play` event 同 `mediaSession.playbackState = 'playing'` 喺同一個 25 ms poll 出現；之後 9 s 一直 `playing`；log 16 行冇 `retry`；`timeupdate` ct 120 → 125 → 130；進度正常存（129.8）                              |
| b   | 音檔永遠唔回應（route 唔 fulfill）                                         | ✅ `playing` @ 21 ms → `paused` @ 3963 ms；`retry … rs=0 … left=3` @ 3937 ms；`left=2` @ 11946 ms（4 + 8 s）；進度 entry 前後一樣 `{"position":120,"duration":600,…}`；UI 長度未知顯示 `--:-- / --:--`；冇 page error |
| c0  | 極慢（0.1× 實時，17.6 KB/s），由第一個 byte 開始慢                         | ⚠️ 觀察：Chromium 喺 metadata 前 `buffered` 空、`rs=0`，watchdog 睇唔到進展 → 4 / 12 / 20 s reload，每次由頭下載；次數用完先載完，約 37 s 先播 → **CUI-0011 🟢**                                                      |
| c1  | 頭 1 MB 即刻送（metadata 到），續播位置嗰段 0.1× 實時慢慢送                | ✅ 40 s 冇 retry。Element 取樣：buffer 120.19 → 120.59 → 120.99 …，位置一卡一卡咁行（120 → 120.86 → 121.79 → 123.46），行夠 0.3 s 就當出聲、停止睇住                                                                  |
| c2  | 同上，0.5× 實時                                                            | ✅ 20 s 冇 retry；`waiting` / `canplay` / `playing` 交替，位置 120 → 129                                                                                                                                              |
| c3  | 同 c1，但 `playbackRate = 0` 令位置凍結（模擬「pipeline 死咗但下載照行」） | ✅ buffer 每秒長 0.1 s（120.17 → 122.56），`playing` 已發、`rs=3`；**首次 `retry left=3` @ 29941 ms**（30 s 上限，S-582），下一次 `left=2` 隔 8001 ms。30 s 前冇 retry                                                |
| d   | hang；play 後 2.5 s hidden → 2.7 s visible（deadline 前亮屏）              | ✅ 亮屏嗰下冇 reload；原 deadline 照用：`retry left=3` @ 3978 ms，全程得 1 次                                                                                                                                         |
| e   | hang；卡住（`paused`）之後經 Media Session `play` handler 撳 Play          | ✅ `ms:play` → 同一 ms 內 `retry … remote`；鎖屏即刻返 `playing`（13 ms，清咗 `isStalled`）；4002 ms 後再 `retry left=3`（當新一次撳播，次數重新計）→ 再轉 `paused`                                                   |
| f   | playback log 格式                                                          | ✅ (a) 全部 16 行都有 `buf=`；有數據時係數字（`playing ct=120.0 dur=600.0 buf=131.1 rs=4 …`），冇數據時係 `buf=-`（(b) 全部 `buf=-`）                                                                                 |

Media Session handler 係用 init script 包住 `navigator.mediaSession.setActionHandler` 攞到，再直接 call `play` handler，即係鎖屏 / AirPods 撳 Play 會行嘅同一條路。

c3 補充：上限過咗之後，第二輪 reload 嘅下載其實有進展（120.18 → 120.48），但因為 30 s 上限由第一次撳播計，watchdog 照 8 s 重試。呢個係 S-582 設計（之後「直接重試，仍然有界」），唔係 defect；記低畀實機 log 對照。

### 實機先驗到嘅部分

Chromium 唔會凍結 JS timer，亦冇真鎖屏 / AirPods。以下只可以喺 iPhone 驗：

- 鎖屏時 timer 被凍結、亮屏先補做重試（C-009 overdue 路徑）—— 單元測試 `retries straight away when the screen wakes up past a frozen deadline` 有鎖
- iOS 喺 `playing` 嗰陣 `rs` / `buf` 係幾多（S-583、CUI-0011 都要靠呢個決定）
- 鎖屏畫面嘅 Play / Pause 圖示真係跟 `playbackState` 轉

## 3. 主動測試（補寫 edge case）

Scratch copy（`git archive HEAD` + 新 test 檔），冇 commit。6 個全綠：

| Test                                                                                                  | 鎖住咩                                                                                                 | Mutation                                             |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| should stop at exactly STALL_MAX_RETRIES reloads when audio never arrives, and keep reporting stalled | 冇數據：剛好 3 次 reload（left=3/2/1），之後唔再 reload；`isStalled` 保持 true（鎖屏唔會扮播緊）       | 拎走 `retriesLeft <= 0` → 紅                         |
| should still recover via lock-screen play after the retry budget is spent                             | 次數用晒之後，鎖屏 Play 仍然即刻 `retry … remote`，再有新一輪 `left=3`                                 | —                                                    |
| should resume from the lock-screen seek target when a seek happens while stalled                      | 卡住時鎖屏 seek 去 300 s，下一次 reload 由 300 s 播                                                    | —                                                    |
| should never overwrite saved progress with 0 across all stalled retries                               | 每次 reload 之後 hidden + pagehide，存落嘅進度仍然係 120（metadata 未到唔存）                          | 拎走 `!this.hasMetadata()` → 紅                      |
| should hit the 30 s cap and then retry … even if data keeps trickling in                              | buffer 一直增長：29 999 ms 未 reload，30 000 ms reload                                                 | `nextRecheckMs` 改返固定 4000 → 紅（32 s 先 reload） |
| should not treat a readyState drop or a buffered gap at the playhead as progress                      | `readyState` 4→2、`bufferedEnd` 消失都唔算進展；playhead 喺兩段 buffer 中間 `bufferedEnd` 係 undefined | —                                                    |

建議 developer 收錄（main agent 決定幾時派）：

```ts
// src/player/AudioController.test.ts（或者新檔），describe('AudioController S-551 lock-screen stall')
const stalledStart = async () => {
    saveProgress(RECORDING.url, RESUME_AT, DURATION);
    const audio = new FakeAudio();
    const controller = new AudioController(audio.asAudio());
    const detach = controller.attach();
    await controller.load(RECORDING, { autoplay: true });
    audio.emitMetadata(DURATION);
    audio.emitPlaying();
    return { audio, controller, detach };
};

it('should stop at exactly STALL_MAX_RETRIES reloads when audio never arrives, and keep reporting stalled', async () => {
    const { audio, controller, detach } = await stalledStart();
    vi.advanceTimersByTime(STALL_FIRST_RETRY_MS + STALL_RETRY_MS * (STALL_MAX_RETRIES + 3));
    expect(audio.load).toHaveBeenCalledTimes(STALL_MAX_RETRIES);
    expect(controller.getSnapshot().isStalled).toBe(true);
    detach();
});

it('should hit the 30 s cap even if data keeps trickling in', async () => {
    const { audio, detach } = await stalledStart();
    let end = RESUME_AT;
    const grow = () => {
        end += 0.1;
        audio.buffered = timeRanges([[RESUME_AT, end]]);
    };
    const STEP = 1000;
    for (let t = 0; t + STEP < STALL_MAX_WAIT_MS; t += STEP) {
        grow();
        vi.advanceTimersByTime(STEP);
    }
    vi.advanceTimersByTime(STEP - 1);
    expect(audio.load).not.toHaveBeenCalled();
    grow();
    vi.advanceTimersByTime(1);
    expect(audio.load).toHaveBeenCalledTimes(1);
    detach();
});
```

（其餘 4 個同樣寫法；完整檔案喺 QA scratchpad `qa/s551/qaS551Edge.test.ts`。）

## 4. 芝See菇Bi 書架 tile（`acd8ea5`）

對照：HEAD build vs 「HEAD 但 `chisee/tile.webp` 用返 `acd8ea5^` 版本」build，主頁「廣播劇」tab。

| 尺寸     | 新 tile                                                                               | 版面                                             | 逐 pixel 比                                                                                       |
| -------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 390×844  | `tile-B2aSAkmw.webp`（舊 `tile-zcCspjdM.webp`），1216×608，連結名「芝See菇Bi Family」 | 5 張 tile 位置 / 尺寸同舊 build 一樣；冇橫向捲動 | 28 183 px 唔同，bbox x 26–363、y 468–571，全部喺 tile（27, 468, 337×168）入面（下半被下一張疊住） |
| 1280×800 | 同上                                                                                  | 一樣；冇橫向捲動                                 | 95 935 px 唔同，bbox x 649–1255、y 484–643，全部喺 tile（649, 484, 607×304）入面                  |

`dist/assets/tile-B2aSAkmw.webp` 同 `src/dramas/chisee/tile.webp` byte 一樣。目視：黃底、角色喺左中，右上角細 logo 清楚，冇被其他 tile 或者文字蓋住。

---

## 失敗測試詳情

冇。

## 問題修正優先順序

| 優先 | ID / Ticket        | 嚴重度 | 描述                                                                       | 時機                                              |
| ---- | ------------------ | ------ | -------------------------------------------------------------------------- | ------------------------------------------------- |
| 1    | CUI-0011           | 🟢 Low | 極慢網開播 metadata 前睇唔到下載進度，4 / 12 / 20 s reload 由頭再下載      | 下一輪 iPhone 實機 log 之後再決定（方案 A）       |
| 2    | S-583（冇 ticket） | 🟢     | `playing` + `rs≥3` + buffer < 10 s + 位置凍結 → 首次 retry 喺 8 s 唔係 4 s | 已知 optional；睇實機 `playing` 嗰行 `rs` / `buf` |
| 3    | 補測               | —      | §3 嘅 6 個 edge case test                                                  | 方便時由 developer 收錄                           |

## 測試建議（下一步）

1. Release 時 bump `package.json` 到 **1.20.7**（三份 review 都提過），再部署
2. 用戶 iPhone + AirPods 按下面 checklist 試；有任何唔對，連撳版本號 5 下複製 playback log 回報
3. 實機 log 出嚟之後，同一輪決定 S-583 同 CUI-0011

### iPhone + AirPods checklist（畀用戶）

1. 開 app，版本號顯示 **v1.20.7**（PWA 自動更新）
2. 前台撳播：1 秒內出聲，鎖屏 / 控制中心顯示「播緊」，進度條行
3. 播緊鎖機，用鎖屏或者 AirPods 暫停、再播：由原位繼續，幾秒內出聲
4. 自動接住播：拉去一集最尾 30 秒，鎖機等佢播完，下一集自己開始而且有聲，鎖屏顯示新一集名
5. 卡住復原：鎖機播緊（或者接住播時）由 Wi-Fi 行出去轉 4G。冇聲嘅話，約 4–8 秒內鎖屏應該轉返「Play」圖示，之後自己接返；或者喺鎖屏撳 Play，應該即刻由原位重新開始（唔係由 0:00）
6. 撳播之後即刻亮屏 / 切去第二個 app 再返嚟（4 秒內）：唔應該斷一斷或者重新開始
7. 卡過之後開返嗰集：續播位置冇被洗走
8. 主頁「廣播劇」：芝See菇Bi Family 顯示新封面
9. 回報 log 時留意有冇 `retry` 行，同埋 `playing` 嗰行嘅 `rs=` / `buf=`（S-583 / CUI-0011 要用）

---

## Handoff receipt

```handoff-receipt
protocol: 2
status: pass
score: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "pass (src/player/** 98.56% lines / 96.2% branches; stallWatchdog, loadProgress, bufferedEnd 100%)"
  e2e: pass
  security: pass
  data_integrity: pass
  performance: pass
  no_critical: pass
  pwa_update: "pass (v1.20.6 origin/main -> v1.20.7 simulated bump of HEAD, 4/4)"
next_action: merge_main
next_agent: main
branch: "claude/keen-pascal-5iifg0"
tickets: ["CUI-0011"]
context: "QA S-551 lock-screen stall (merges 2631e3b, 2c73260, 9161297) + chisee tile (acd8ea5) PASS @51c0f59. npm test 157 files/1872 tests, tsc -b 0, lint 0, build 0, E2E_PORT=4209 npm run e2e 590/0 first run (no CUI-0010 flake). Chromium scenarios 31/0 against repo dist + newE2EContext: (a) normal play -> playbackState playing with the play event, 9 s no retry; (b) audio hangs -> retry left=3 at 3.94 s, playbackState paused at 3.96 s, left=2 at 11.9 s, saved progress byte-identical; (c) slow but progressing (0.1x and 0.5x realtime after metadata) -> no retry; frozen position with growing buffer -> first retry at 29.9 s (S-582 cap) then +8.0 s; (d) hidden->visible at 2.5 s -> no reload, deadline unchanged; (e) Media Session play while stalled -> ms:play then retry ... remote, playing again, fresh left=3 after 4.0 s; (f) every log line has buf=. QA edge tests 6/6 in scratch copy, mutations 3/3 red; proposed to developer, not committed. Chisee tile loads new hashed file at 390x844 and 1280x800; pixel diff vs old-tile build confined to that tile; layout unchanged. PWA v1.20.6 -> v1.20.7 4/4. New CUI-0011 (Low, non-blocking): before loadedmetadata Chromium exposes no download progress, so a very slow start (<~0.5 Mbps) is reloaded at 4/12/20 s from byte 0. S-583 optional, no ticket. Release must bump package.json to 1.20.7. iPhone + AirPods checklist in report section 'iPhone + AirPods checklist'."
```
