# Code Review — 2026-10-30 — 背景播放 e2e（`e2e/hiddenPlayback.mjs`）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 流程：標準：hard gates 全 pass、≥ 90 分、冇 Critical → pass
- 目標：`claude/keen-pascal-5iifg0` `a199645` test(e2e): cover playback while the page is hidden (v1.20.12)（branch 由 main `801f25f` 重開，PR #147 之後），main checkout 審，冇轉 branch、冇 push
- 改動：新 `e2e/hiddenPlayback.mjs`（`run.mjs` 喺 arcSheet 之後行）；`harness.mjs` 抽出 `serveWav`；`dramaPages.mjs` export `SERIES_ROUTE`、`dismissAutoSheet`；`src/e2eSrcConstants.test.ts` 鎖 4 個手抄常數；version 1.20.11 → 1.20.12
- Review Item ID：`grep -rhoE "\b[CWS]-[0-9]{3}\b" .proj-docs` 證實最高 C-011 / W-514 / S-626，今次用 **S-627 – S-629**（冇 C / W）
- 總評：**97 / 100，✅ pass**。三個情境直接對應 v1.20.8（背景唔 reload、mark 後報卡住）、v1.20.8 接住播同「轉背景即存進度」，填補咗 e2e 之前對 hidden 完全唔可見嘅缺口（v1.20.8 / v1.20.9 review 都提過）。visibility 覆寫係 per context，唔會漏去其他 e2e。我自己單獨跑咗 5 次（其中 3 次喺 load ≈ 5 / 4 core 嘅 CPU 爭用下）全部 8 / 8 PASS。只有三個細 suggestion：一個固定 `waitForTimeout`（S-529）、兩處數字 / 依賴未寫清楚。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                      |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint e2e` exit 0；`npx prettier --check e2e src/e2eSrcConstants.test.ts` 合規                                                                                                                                                      |
| Type check    | ✅ n/a  | 只改 `.mjs` + 一個 test；`src/e2eSrcConstants.test.ts` 經 vitest 編譯                                                                                                                                                                     |
| Tests         | ✅ pass | `npx vitest run src/e2eSrcConstants.test.ts`：14 / 14。e2e：`npm run build` + `vite preview` + 臨時 runner（只行 `runHiddenPlaybackChecks`）：無負載 2 次 + CPU 爭用 3 次，每次 8 / 8 PASS、~26 s、0 page error；developer 報全套 598 / 0 |
| Coverage      | ✅ n/a  | test-only                                                                                                                                                                                                                                 |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                    |
| Security scan | ✅ n/a  | 冇依賴改動                                                                                                                                                                                                                                |

臨時 runner 放喺 scratchpad，跑完已停 preview / 負載 process；`dist/` 係 gitignored，working tree 冇改動。

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                           |
| -------- | ------ | ------- | ---------------------------------------------- |
| 正確性   | 25     | 25      |                                                |
| 安全性   | 20     | 20      |                                                |
| 可維護性 | 19     | 20      | S-629（情境 2 依賴 Chromium `stalled` 冇寫低） |
| 測試覆蓋 | 14     | 15      | S-627（固定 sleep，可以併入 mark 等待）        |
| 性能     | 10     | 10      | 新增 ~26 s                                     |
| 代碼風格 | 9      | 10      | S-628（`left=3`、`5000` 手寫）                 |
| **總分** | **97** | **100** |                                                |

**結果：✅ pass**

---

## 指定檢查點

### (1) Flake 風險（CPU 爭用下嘅時間餘量）— ✅ 低

| 等待                                | 上限                                                           | 實際需要                                                            | 餘量 |
| ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- | ---- |
| `waitAudible`（開播 / 換集後出聲）  | `PLAY_WAIT_MS` 10 s                                            | 本機 WAV、~1 s 位置前進；換集前要播 ~2 s                            | 大   |
| `waitSwitched`                      | 10 s                                                           | 離尾 3 s 跳，app 喺尾 1 s 換 → ~2 s                                 | 大   |
| mark → `playbackState === 'paused'` | `STALL_HIDDEN_MARK_MS + 3 s` = 15 s，喺 5 s sleep 之後先開始等 | mark 喺換集 play() 後 12 s → 由開始等計 ~7 s                        | ~8 s |
| 亮屏 → `retry … left=3`             | 3 s                                                            | `visibilitychange` handler 同步 `retryIfOverdue`，即刻寫 log        | 大   |
| 存進度 ±1 s                         | 1 s                                                            | `pagehide` / hidden 同步 `persist()`；兩次 `evaluate` 之間只差幾 ms | 大   |

CPU 爭用（4 core、6 個 busy loop，load ≈ 5）下 3 次全過，時間同無負載差唔多（26 s）。`total === 1` 喺 `retried` 之後即刻讀，下一次 retry 要再等 `STALL_RETRY_MS` 8 s，唔會撞。

### (2) visibility 覆寫會唔會漏去其他 e2e — ✅ 唔會

- `ctx.addInitScript(installHiddenControl)` 只裝喺 `startSeries` 開嘅新 context；兩個情境都 `await ctx.close()`（`playing` false 都會行到）。`Document.prototype` / `HTMLMediaElement.prototype` 嘅改寫只喺嗰個 context 嘅 page 生效。
- `ctx.route` 同樣係 context 級；hang 住嘅 request 由 `ctx.close()` 清走。
- `run.mjs` 喺 arcSheet 之後、mini player 之前行，前後 check 用自己嘅 context，唔受影響（developer 全套 598 / 0 印證）。

### (3) Magic number — 大致 ✅，兩處見 S-628

- 手抄常數（`PLAYBACK_LOG_STORAGE_KEY`、`PROGRESS_STORAGE_KEY`、`STALL_HIDDEN_MARK_MS`、`EARLY_ADVANCE_SECONDS`）全部 export 兼由 `src/e2eSrcConstants.test.ts` 鎖住 ✅；其他等待 / 容差都係具名常數，有註解。
- 例外：regex 寫死 `left=3`（= `STALL_MAX_RETRIES`）；`PAST_FIRST_DEADLINE_MS = 5000` 註解話係「比 `STALL_FIRST_RETRY_MS`（4 s）多留位」，但 `harness.mjs` 已經 export `STALL_FIRST_RETRY_MS`，可以直接由佢計。

### (4) `dismissAutoSheet` / `SERIES_ROUTE` export — ✅

只加 `export`，函數本身冇改；`dismissAutoSheet` 失敗時 log fail 兼返回 false（唔 throw），`startSeries` 用 `ready` 擋住後續步驟，同 `dramaPages.mjs` 原本用法一致。scenario 模組互相 import 唔理想但可接受；將來多過一個 scenario 要用時，可以搬去 `harness.mjs`（唔開 ID）。

### (5) 其他

- 檔頭註解講明 Playwright 冇 hidden API、Chromium 唔會因此節流 timer、iOS JS 凍結要靠 unit test — 範圍講得清楚，唔會令人以為 e2e 覆蓋咗 iOS。
- `serveWav` 抽出後 `audioResponder` 行為不變（未知 URL 仍然 404）。
- version bump 1.20.11 → 1.20.12 ✅。

---

## 問題清單

### 🔴 Critical

冇。

### 🟡 Warning

冇。

### 🟢 Suggestion

#### S-627 — 情境 2 用固定 `waitForTimeout(PAST_FIRST_DEADLINE_MS)`（S-529）

- 位置：`e2e/hiddenPlayback.mjs` `checkHiddenStall()` 第 172 行
- 描述：「過咗首個 deadline 都唔 reload」係負面斷言，所以要等；但跟住本身就會等 `playbackState === 'paused'`（mark，12 s）。喺 mark 之後先讀 retry 數，已經涵蓋 4 s、8 s、12 s 三個 deadline，仲慳返 5 s 固定 sleep。
- 方案 A：刪 `waitForTimeout`，先等 `paused`，再 `retryLines` 斷言 0（訊息改「直到報卡住都冇 reload」），保留兩行 log 令 check 數唔變。方案 B：保留，註解寫明係負面斷言、S-529 例外。推薦：A。

#### S-628 — `left=3` 同 `5000` 手寫

- 位置：`e2e/hiddenPlayback.mjs` 第 22、189 行
- 描述：見 (3)。`STALL_MAX_RETRIES` 改咗，regex 會靜靜唔再 match（check FAIL，但原因難搵）。
- 方案 A：export `STALL_MAX_RETRIES` 手抄常數，加入 `e2eSrcConstants.test.ts` 嘅 `it.each`，regex 用 template；`PAST_FIRST_DEADLINE_MS` 改由 harness 嘅 `STALL_FIRST_RETRY_MS` + 具名 margin 計（如果做 S-627 A 就直接刪）。方案 B：註解寫明對應 src 常數。推薦：A。

#### S-629 — 情境 2「亮屏即刻重試」依賴 Chromium 喺背景期間發咗 `stalled`，冇寫低

- 位置：`e2e/hiddenPlayback.mjs` `checkHiddenStall()`
- 描述：v1.20.12（CUI-0011）之後，metadata 前、前景、`NETWORK_LOADING` 而未收 `stalled` 會當載緊。情境 2 嘅下一集 request 永遠唔答；亮屏時之所以即刻 retry，係因為 Chromium 喺背景 ~17 s 期間已經發咗 `stalled`（約 3 s）。我 5 次 run 都係咁，所以唔係 flake；但如果將來 Chromium 改咗 `stalled` 行為，或者 CUI-0011 規則再改，呢個 check 會變成要等到 30 s cap，失敗訊息唔會提示原因。
- 方案 A：喺 `checkHiddenStall` doc 加一句依賴說明（CUI-0011：`stalled` 令前景唔再當載緊）。方案 B：亮屏前加一個 log：`window.__e2eAudio.networkState` 同有冇收過 `stalled`（init script 順手記），失敗時一眼睇到。推薦：A（零成本），B 可選。

---

## ✅ 做得好嘅地方

- 終於喺真 Chromium 覆蓋 hidden 規則：背景唔 reload、mark 後鎖屏轉 Play、亮屏即刻 retry 一次、背景接住播唔 reload、轉背景即存進度。
- 用 `HTMLMediaElement.prototype.play` 捕捉唔喺 DOM 嘅 audio element，唔使改 app code 開後門。
- 每個情境自己開 / 閂 context，hang 住嘅 route 由 `ctx.close()` 清，唔會拖累後面 check。
- 手抄常數全部鎖喺 `e2eSrcConstants.test.ts`（commit 講明先紅），developer 仲用 app 側 mutation（`isHidden → false`、拎走 persist-on-hide）證實 e2e 會紅。
- `serveWav` 抽出重用，`audioResponder` 簡化而行為不變。

## 修正優先順序

| 優先 | ID    | 建議時機                  |
| ---- | ----- | ------------------------- |
| 1    | S-627 | 下次掂 hiddenPlayback e2e |
| 2    | S-628 | 同上                      |
| 3    | S-629 | 同上（一句註解）          |

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 97/100
hard_gates:
  lint: pass
  type_check: n/a
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "claude/keen-pascal-5iifg0"
context: "hidden-playback e2e review pass 97: 5 focused runs (3 under CPU load) all 8/8 PASS, visibility override is per-context, constants locked. Suggestions only: S-627 fixed waitForTimeout (fold into mark wait), S-628 hardcoded left=3 / 5000, S-629 document reliance on Chromium stalled (CUI-0011)"
```
