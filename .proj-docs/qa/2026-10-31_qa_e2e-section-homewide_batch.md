# Batch QA — 2026-10-31 — e2e runSection（v1.21.2）+ 闊橫版主頁 e2e（v1.21.3）

- 測試員：Quality Assurance（獨立角色）
- 範圍：`feature/e2e/home-wide-checks` @ `172ff5b`（stack 喺 `fix/e2e/waitfor-timeout-log-fail` 上面，兩條都由 origin/main `c49531a` 開始）；冇轉 branch、冇 commit / merge / push
    - Fix A `586c41b`（v1.21.2）：`e2e/harness.mjs` `runSection(log, label, run)`，`e2e/run.mjs` 每個頂層 section 都經佢行；unit test `src/e2eSection.test.ts`
    - Fix B `b333ddd` + `62f9344`（v1.21.3）：`e2e/homeWide.mjs` 1180×820 fill / split / ✕ 閂卡 → 把手 → 開返；`62f9344` 處理 S-645 / S-646
    - `172ff5b` 只係 review docs
    - Review：[batch](../reviews/2026-10-31_review_e2e-section-homewide_batch.md)（98 pass：A 99 / B 98；S-644 仲係 open suggestion）
- 環境：Linux sandbox（4 核）、Node 22、playwright（Chromium）。PWA 測試用 `git archive c49531a` 喺 scratchpad 另外 build v1.21.1
- 總結：✅ **pass**，冇新 ticket
    - `npx vitest run` **2062 / 2062**（baseline 2058 + 4 個新 `e2eSection` test）
    - `npx eslint .`、`npx tsc -b`、`npx prettier --check .` exit 0；`dist/index.html` 有 `v1.21.3`
    - `E2E_PORT=4199 npm run e2e`：第 1 次 **612 / 0**（6 分 30 秒）；第 2 次加 3 條 busy loop 搶 CPU（4 核），都係 **612 / 0**（6 分 52 秒）；兩次都 exit 0，14 個闊橫版主頁 check 全過
    - runSection 注入測試 2 / 2：每次都只得 1 個「中途中止」FAIL，後面嘅 section 照行，有總結，exit 1
    - PWA v1.21.1（`c49531a`）→ v1.21.3（`172ff5b`）：**8 / 8** 自動 reload 顯示 `v1.21.3`

---

## 整體 verdict

| 項目          | 結果                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------- |
| 涵蓋 fix      | A `586c41b`（v1.21.2 runSection）；B `b333ddd` + `62f9344`（v1.21.3 闊橫版主頁 e2e）      |
| Edge case gap | 0（A：注入 2 個情境 + 多行 error；B：CPU 搶用重跑）；建議補測 2 項（見下面，🟢 唔 block） |
| Regression    | ✅ pass：原有 598 個 check 照過，總數 598 + 14 = 612                                      |
| Status        | ✅ pass                                                                                   |

## Hard Gates（`172ff5b`）

| Gate           | 結果    | 證據                                                                                                                                                |
| -------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests          | ✅ pass | unit 2062 / 2062；e2e 2 × 612 / 0（第 2 次有 CPU 搶用）                                                                                             |
| Type check     | ✅ pass | `npx tsc -b` exit 0                                                                                                                                 |
| Lint           | ✅ pass | `npx eslint .` exit 0；`npx prettier --check .` exit 0                                                                                              |
| Build          | ✅ pass | `npm run build`（e2e 第一步）exit 0                                                                                                                 |
| Coverage       | ✅ pass | `runSection` 4 個 unit test 覆蓋全部分支（完成 / Error / 多行 Error / 非 Error）；`src/` 除咗新 test 之外冇改                                       |
| Security       | ✅ pass | 冇新依賴；兩次 e2e「冇 request 出外網」PASS                                                                                                         |
| Data integrity | ✅ pass | 冇改產品代碼；e2e 證實 ✕ = 停播（`paused`）、把手開返係暫停（唔自動播）                                                                             |
| Performance    | ✅ pass | e2e 時間同之前差唔多（598 → 612 個 check，6.5 分鐘）；冇改產品代碼                                                                                  |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                              |
| PWA Update     | ✅ pass | vN `v1.21.1`（`c49531a`）→ vN+1 `v1.21.3`：SW 控制 → 換 dist → `update()` → 自動 reload 顯示 `v1.21.3`，390×844、1180×820 × 2 種情境 × 2 次 = 8 / 8 |

---

## Section A — `586c41b` runSection（v1.21.2）

**Verdict：✅ pass**

### 注入測試（改 `e2e/run.mjs` 之前先備份，跑完用備份抄返；sha256 `94a7e3b3…f547` 前後一樣，`git status` clean）

dist 冇變，所以用 `node e2e/run.mjs` 直接跑（唔再 build）。

| 情境                                                                                                                 | FAIL                                                                                            | PASS           | 後面 section                                                                      | 總結 / exit                     |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| A1：`checkMiniPlayerPosition` 第一行加 `await (await browser.newPage()).locator('#nope').waitFor({ timeout: 500 });` | 1 個：`Mini player 位置：中途中止（locator.waitFor: Timeout 500ms exceeded.）`（log 第 517 行） | 608（612 − 4） | ✅ 照行，包括闊橫版主頁、廣播劇、淺色主頁 + service worker、JS error / 外網 check | `1 E2E check(s) failed`，exit 1 |
| A2（好早）：`checkProbeIgnoresUnknown` 第一行 `throw new Error('injected early\nCall log: noise')`（第一個 section） | 1 個：`先驗 probe 同 audio host：中途中止（injected early）`（log 第 1 行）                     | 606（612 − 6） | ✅ 第 2 行即刻係 390×844 主流程「主頁 8 粒掣」，之後全部照行                      | `1 E2E check(s) failed`，exit 1 |

- 多行 error 只留第一行：A2 輸出冇 `Call log`（同 unit test 一致）
- 少咗嘅 PASS 數啱啱等於嗰個 section 本身嘅 check 數（Mini player 位置 4 個、probe 6 個），即係冇 check 因為其他 section 失敗而唔見咗
- A1 留低咗一個冇 close 嘅空白 page（即係 S-644 講嘅情況），今次冇引出連鎖 FAIL：空白頁冇音、冇 timer。S-644 嘅風險（leak 咗嘅頁播緊音、搶 CPU）喺「section 播緊嘢中途 throw」先會出，今次冇重現，仍然係 🟢

### Edge case 評估

- 好早 throw（未開任何 context）：✅ 總結照出
- 非 Error throw、多行 error：unit test 已經覆蓋，A2 喺真實 run 再證實多行 error 會截短
- 冇 timeout 嘅 hang：`runSection` 救唔到（只救 throw）；Playwright action / `waitFor` 都有預設 timeout，所以實際上會變成 throw。屬設計範圍外，記做觀察 O2

### 建議補測

- 冇（4 個 unit test + 今次 2 個注入情境已經夠）

## Section B — `b333ddd` + `62f9344` 闊橫版主頁 e2e（v1.21.3）

**Verdict：✅ pass**

### 兩次 run 嘅 14 個 check（兩次數值一樣）

| 情境                      | Check                                                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fill（星期日）            | 版面 `fill`；卡 0、mini 0、把手 0                                                                                                                                                                  |
| split（平日）             | 版面 `split`；只得 1 張卡（今日節目）；卡欄 **36.0%**；格右 755.2 = 卡左 755.2、冇橫向捲動                                                                                                         |
| 卡清單                    | 「集數 · 共 21 集」；滑鼠轆：清單 200 px、頁 0 px、卡頂 24 → 24                                                                                                                                    |
| ✕ → 把手 → 開返（公子會） | 返主頁出卡；✕ → `fillWithHandle` + `paused`；把手「打開播放器：公子會」右邊 1180；格闊 755.2 → 1135 px、唔遮把手；把手 → `split`、「開啟 公子會 節目頁，重溫 17/10（六）」；等 1.5 s 仲係 `paused` |

### CPU 搶用（第 2 次 run）

3 條 busy loop 食晒 4 核入面 3 核，成個 run 只慢咗 22 秒，14 個闊橫版 check 冇 flake。`LAYOUT_WAIT_MS` 5 s 同 `WHEEL_SETTLE_MS` 300 ms 喺呢個負載都夠用。

### Edge case 評估

- S-645（「成頁唔郁」以前恆真）：而家用真滑鼠轆，`listTop` 200 > 0 證明真係捲咗，卡頂前後一樣 ✅
- S-646（locator 綁死 DOM）：而家用名搵掣，兩次 run 都穩 ✅
- `if (!split) return ctx.close();`：split 唔出就 log 1 個 FAIL 再收工，唔會跟住撳唔存在嘅 ✕ 浪費 30 s ✅
- 三個情境共用一個 `runSection('闊橫版主頁')`：`checkFill` 一 throw，後面 split / close 都唔會行（記做 O3）

### 建議補測（🟢，由 developer 做，QA 冇 commit）

1. 闊橫版主頁三個情境各自包 `runSection`（或者 `runHomeWideChecks` 入面逐個 try），fill 爆咗都照測 split / close
2. `newE2EPage` 開嘅 context 用 `try/finally` close（同 S-644 一齊做）

## 跨 fix 互動評估

- B 嘅 `runHomeWideChecks` 喺 `run.mjs` 經 A 嘅 `runSection(log, '闊橫版主頁', …)` 行：A1 嗰次「Mini player 位置」失敗之後，闊橫版主頁 14 個 check 照全過 ✅
- 兩個 fix 都改 `e2e/run.mjs`（A 包 section、B 加 import 同一個 section），冇 symbol 撞名；`runSection` 同 `runHomeWideChecks` import 次序冇問題（eslint / tsc 綠）
- 版本號 1.21.1 → 1.21.3 只改 `package.json` / lock；`src/` 只加 test，產品 bundle 只差版本字串
- Coverage：產品代碼冇改，threshold 唔受影響

## Regression 結論

✅ 原有 598 個 check 兩次都過，加 B 嘅 14 個 = 612；冇 JS error、冇外網 request。

## PWA 更新（vN → vN+1）

做法：scratchpad 細 static server（剝走 `/903-player` base）serve v1.21.1 dist → `newE2EContext` 開頁、等 SW 控制、**再 reload 一次**（似返已經裝咗 app 嘅用戶）→ 換 v1.21.3 dist → `registration.update()`。

| 情境                                       | 390×844         | 1180×820        |
| ------------------------------------------ | --------------- | --------------- |
| 星期日（冇揀錄音，即刻換）                 | ✅ 2 / 2，1.4 s | ✅ 2 / 2，1.5 s |
| 平日 22:30（快轉 61 s + visibilitychange） | ✅ 2 / 2，2.0 s | ✅ 2 / 2，2.1 s |

全部 SW 控制、自動 reload 1 次、顯示 `v1.21.3`、page error 0。

另外發現（O1）：如果**第一次開 app 嗰個 page** 未 reload 過就遇到新版，新 SW 會裝好、skipWaiting、接管（`controllerchange`），但頁**唔會 reload**（8 次都係咁）。原因係 workbox-window 喺 `register()` 嗰陣用 `Boolean(navigator.serviceWorker.controller)` 定 `isUpdate`，第一次開冇 controller，所以 vite-plugin-pwa 嘅 `controlling` handler 唔會 call `onNeedReload`。之後再開 app 就係新版。呢個係 library 行為，`c49531a` 已經係咁，同今次 batch 無關。

---

## 失敗測試詳情

冇。

## 觀察（🟢，冇開 ticket）

| ID  | 觀察                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1  | 第一次開 app 嗰個 page 未 reload 過就遇到新版：新 SW 接管咗但頁唔 reload，下次開先係新版（workbox `isUpdate` 喺 register 嗰陣定）。原本已經係咁，同今次無關；實際好少撞到 |
| O2  | `runSection` 只救 throw，唔救冇 timeout 嘅 hang；而家 e2e 用嘅 Playwright API 都有預設 timeout，暫時冇問題                                                                |
| O3  | 闊橫版主頁三個情境共用一個 `runSection`：前面 throw 會令後面情境冇測（建議補測 1）                                                                                        |
| O4  | S-644 喺 A1 注入有出現（留低一個空白 page），但冇引出連鎖 FAIL；風險只喺「播緊嘢嘅 section 中途 throw」                                                                   |

## 問題修正優先順序

| 優先 | ID         | 嚴重度   | 描述                                            | 時機            |
| ---- | ---------- | -------- | ----------------------------------------------- | --------------- |
| 1    | S-644 / O4 | 🟢       | section throw 之後 close 自己開嘅 context       | 下次掂 harness  |
| 2    | O3         | 🟢       | 闊橫版主頁三個情境各自隔離                      | 下次掂 homeWide |
| 3    | CUI-0016   | 🟢（舊） | W-518 unit test flake（今次 1 次全 suite 冇出） | 照舊            |

## 測試建議（下一步）

1. 可以 merge / 出 v1.21.3
2. S-644 同 O3 可以一齊做：`runSection` 收 `browser`，失敗時 close 新開嘅 context；`runHomeWideChecks` 每個情境一個 `runSection`
3. 如果想要 O1 都會即刻換版，可以考慮 `onRegisteredSW` 之後自己聽 `controllerchange`；要先同 updateManager 嘅「唔打斷收聽」規則一齊諗

---

## Handoff receipt

```handoff-receipt
protocol: 2
status: pass
score: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: "pass (unit 2062/2062; e2e 612/0 x2, 2nd under CPU load)"
  coverage: pass
  e2e: "pass (612/0 twice; runSection injections 2/2: one FAIL each, run continues, summary, exit 1)"
  security: pass
  data_integrity: pass
  performance: pass
  no_critical: pass
  pwa_update: "pass (v1.21.1 c49531a -> v1.21.3 172ff5b, 390x844 and 1180x820, 8/8)"
next_action: merge_main
next_agent: devops-engineer
branch: "feature/e2e/home-wide-checks"
tickets: []
context: "Batch QA PASS for 586c41b (runSection) + b333ddd/62f9344 (homeWide e2e) at 172ff5b. Unit 2062/2062 (+4). eslint/tsc/prettier clean. e2e 612/0 twice (2nd with 3 busy loops on 4 cores), all 14 闊橫版主頁 checks stable (card 36.0%, list wheel 200px page 0, close->fillWithHandle paused, handle reopens paused). Injected throw in Mini player 位置 -> exactly 1 中途中止 FAIL, 608 PASS, later sections ran, summary, exit 1; injected early throw in probe section -> 1 FAIL on line 1, 606 PASS, multi-line error trimmed, exit 1; run.mjs restored from backup (hash identical), tree clean. PWA 1.21.1->1.21.3 8/8. Observations only (no tickets): S-644 leak seen but harmless, homeWide scenarios share one runSection, first-visit page does not auto-reload on update (workbox isUpdate, pre-existing)."
```
