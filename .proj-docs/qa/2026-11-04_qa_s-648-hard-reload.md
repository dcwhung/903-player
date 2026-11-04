# QA — 2026-11-04 — S-648 Shift-reload 嘅 tab 搶輸 skip-waiting 都 reload（v1.21.8）

- 測試員：Quality Assurance（獨立角色）
- 範圍：`fix/pwa/s-648-hard-reload` @ `0b9b389`（base origin/main `1872914`）；冇轉 branch、冇改 source、冇 commit / merge / push
    - `bc6c1ee`（S-648）：`main.tsx` 喺 `registerSW` 之前行 `isHardReload(navigator.serviceWorker)`：冇 controller + 已有 registration 而 `active.state === 'activated'` → `updateManager.markControlled()`；`registerSW` 喺 `.finally` 先叫
    - `5d0f944`（S-653）抽 `isHardReload` + unit test；`deaa728`（S-651）只認 `activated`（唔認 `activating`）；`0b9b389`（S-652）只係註解
    - `e2e/pwaUpdate.mjs`：新 Shift-reload 情境（CDP `Page.reload { ignoreCache: true }` + `openRaceWinner` deterministic race）；第一次開 app 情境加「第一次安裝接管唔 reload」斷言
    - Review：[2026-11-04_review_s-648-hard-reload.md](../reviews/2026-11-04_review_s-648-hard-reload.md)（97 pass）
- 環境：Linux sandbox（4 核）、Node 22.23、playwright Chromium。Swapped build 用 `git archive 0b9b389`（v1.21.8 + 假 v1.21.9）同 `git archive 1872914`（main v1.21.7 + 假 v1.21.8）喺 scratchpad 另外 build，repo 嘅 `package.json` 冇郁過；每個 build 嘅 bundle 只有自己個版本號、entry hash 唔同
- 總結：✅ **pass**；冇新 ticket
    - `npm test` **2082 / 2082**（baseline 2073 + 9，數目啱）
    - `npx eslint .`、`npx tsc -b`、`npx prettier --check .` exit 0
    - `npm run e2e` 2 次：**619 PASS / 0 FAIL**（第 2 次 4 條 busy loop 搶 4 核，load 4.95），7 個 PWA check 兩次都過
    - Shift-reload + 搶贏嘅 tab（v1.21.8 → v1.21.9）**22 / 22**：兩個 tab 都 reload **1 次**去新版；main 對照 **7 / 7** Shift-reload 嘅 tab 停喺舊版
    - 真第一次開：單 tab 11 / 11、兩個 tab 快速相繼開 **46 / 46** 第一次安裝冇 reload，之後換版各 reload 1 次
    - 播緊嘢 + 另一個 tab Shift-reload **12 / 12**：播緊嘅 tab 停播 + 61 s + 收埋之前 0 次 reload
    - 上次 matrix 重跑 30 / 30；新 e2e Shift-reload check 喺 main build **3 / 3 紅**（偵測力）

---

## Hard Gates（`0b9b389`）

| Gate           | 結果    | 證據                                                                                                                                                                                                     |
| -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests          | ✅ pass | unit 2082 / 2082（169 files，77 s）；e2e 619 / 0 × 2（7 m 19 s 冇負載、7 m 40 s 有負載）                                                                                                                 |
| Type check     | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                                                      |
| Lint           | ✅ pass | `npx eslint .` exit 0；`npx prettier --check .` exit 0                                                                                                                                                   |
| Build          | ✅ pass | `npm run build`（e2e 第一步）× 2 exit 0；scratchpad `vite build` v1.21.8 / v1.21.9 / main v1.21.7 / v1.21.8 exit 0                                                                                       |
| Coverage       | ✅ pass | `isHardReload` 7 條路（冇 SW / 受控 / 冇 registration / installing / activating / activated / reject）+ `markControlled` 2 條路有 unit test；review 實測 `updateManager.ts` lines 100%                   |
| Security       | ✅ pass | 冇新依賴（lock 只改 version）；e2e「冇 request 出外網」兩次 PASS                                                                                                                                         |
| Data integrity | ✅ pass | `markControlled` 只改 `hasSeenController`，reload 一律經 `handleNeedReload` → `reloadOnce` → `playerController.stop()`（存進度）；播緊 reload 0 次（12 個 Shift-reload 播放情境 + 4 個單 tab + e2e × 2） |
| Performance    | ✅ pass | 多一個 `getRegistration()`（registerSW 延後一個 IPC，量唔到差）；換版 reload 時間同上次一樣（星期日 1.2–1.4 s、平日 ~2.05 s 包括 2 s 等 + 快轉）；e2e +~13 s（新 Shift-reload section）                  |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                                                                                   |
| PWA Update     | ✅ pass | vN `v1.21.8` → vN+1 `v1.21.9`：Shift-reload 22 / 22、第一次開 11 / 11、兩 tab 第一次開 46 / 46、返嚟 8 / 8、兩 tab 10 / 10，每個 tab 自動 reload **1 次**、行 `v1.21.9`、page error 0                    |

---

## 1. Unit（2082 = 2073 + 9）

`src/pwa/updateManager.test.ts` 喺 main 有 43 個 test、而家 52 個：+2 `UpdateManager.markControlled (S-648)`（即刻 reload / 播緊等停先 reload）+7 `isHardReload (S-648)`（冇 SW、受控、冇 registration、installing、activating（S-651）、activated → true、reject）。其他 file 冇加減，169 files 同上次一樣 → 數目同預期完全一樣，冇差異要解釋。

## 2. e2e（`npm run e2e` × 2）

| Run | 條件                                       | 總數    | 7 個 PWA check | 時間     |
| --- | ------------------------------------------ | ------- | -------------- | -------- |
| 1   | 冇負載                                     | 619 / 0 | ✅ 7 / 7       | 7 m 19 s |
| 2   | 4 條 `sha256sum /dev/zero` 搶 4 核（4.95） | 619 / 0 | ✅ 7 / 7       | 7 m 40 s |

7 個 PWA check：第一次開（接管冇 reload、load 1 / 有新版 reload 1）、返嚟 1、兩個 tab A 1 B 1、**Shift-reload B 冇 controller（true）A 1 B 1**、播緊（true → true 0 次 / 停播 1 次）。617 → 619 = 新 Shift-reload check + 第一次開新負向斷言。負載 process 按 PID kill，事後 `ps` 0 個殘留。

**偵測力（mutation）**：將 branch 嘅 `e2e/` 配 main build（`1872914` v1.21.7 → 假 v1.21.8，scratchpad 副本）只跑 PWA section 3 次：Shift-reload check **3 / 3 FAIL（A 1、B 0）**，其餘 6 個 check 3 / 3 PASS（main 已有嘅行為）。即係新 check 係 deterministic regression detector（上次 O1 兩個 tab check 只有 ~2 / 3 命中，今次 `openRaceWinner` 令 race 固定）。

## 3. Swapped build regression

腳本 `scratchpad/scripts/pwa4.mjs`（新，Shift-reload / 第一次開兩 tab）+ `pwa3.mjs`（上次 matrix）。細 static server（`127.0.0.1`、`no-cache`），`newE2EContext`（mock 外網、固定時鐘、星期日 22:30 主頁冇揀錄音 → 規則係即刻換）。Shift-reload 用 CDP `Page.reload { ignoreCache: true }`（同 e2e 一樣）。數 `load` event 計 reload；用 entry script（`assets/index-<hash>.js`）判斷行緊邊個 build。addInitScript 記錄文件開頭嘅 `controller` / `active.state`，同包住 `getRegistration()` 記錄 `isHardReload` 實際見到乜。

### 3.1 Shift-reload tab + 搶贏 race 嘅 tab（v1.21.8 → v1.21.9）

A：返嚟（reload 過）；`RACE` = A 快轉 61 s 先開 B（A 一定搶先 skipWaiting）。B：開 → 受控 → Shift-reload（文件開頭 `ctl false / active activated`，證實真係「未受控 + SW 已 activated」）。

| 情境                                        | 次數 | 結果                                         |
| ------------------------------------------- | ---- | -------------------------------------------- |
| RACE，B 叫 `update()`                       | 5    | ✅ 5 / 5：A 1、B 1，都係 v1.21.9             |
| RACE，A 叫 `update()`                       | 5    | ✅ 5 / 5：A 1、B 1                           |
| 自然 race（冇快轉），B 叫 `update()`        | 3    | ✅ 3 / 3：A 1、B 1                           |
| 單一 Shift-reload tab（冇 A）               | 3    | ✅ 3 / 3：B 1（自己 onNeedRefresh → reload） |
| B 連續 Shift-reload 兩次                    | 3    | ✅ 3 / 3：A 1、B 1                           |
| Shift-reload 後等 8 s 先換版（冇假 reload） | 3    | ✅ 3 / 3：等待期間 B load 冇變；A 1、B 1     |

22 / 22（另 smoke 1 次）。每次 B Shift-reload 後、未換版前 load 數 = 預期（2 / 連續兩次 3）→ Shift-reload 本身唔會引起 reload；換版後再等 3 s 冇第二次 reload；page error 0。

**對照組 main（`1872914` v1.21.7 → v1.21.8）**：RACE B 叫 3 次、A 叫 3 次 + smoke 1 次 → **7 / 7 B 停喺 v1.21.7（B reload 0、A reload 1）**。同一個 harness 喺 fix branch 22 / 22 過 → 證實係 `bc6c1ee` 修好。

### 3.2 真第一次開（冇 registration）

| 情境                                                                                 | 次數 | 結果                                                    |
| ------------------------------------------------------------------------------------ | ---- | ------------------------------------------------------- |
| 單 tab（`pwa4 first`）                                                               | 3    | ✅ 3 / 3：接管後 6 s load 1；換版 reload 1              |
| 單 tab（`pwa3 first`，2 種時間 × 2 尺寸 × 2）                                        | 8    | ✅ 8 / 8：`initialLoads` 1；reload 1                    |
| 兩 tab 相隔 0 / 150 / 400 / 800 ms 開                                                | 12   | ✅ 12 / 12：A、B 第一次安裝後都 load 1；換版各 reload 1 |
| 兩 tab，B entry JS 延遲 100–1500 ms（11 個值）                                       | 16   | ✅ 16 / 16                                              |
| 兩 tab，B entry JS 扣住直到 A 嘅 SW 入 `activating` / `activated` 先放（每 5 ms 查） | 18   | ✅ 18 / 18                                              |

46 / 46 兩 tab 冇假 reload。`getRegistration` 記錄：延遲 200–700 ms 時 `isHardReload` 見到 `active` 仲係 `null`（installing）→ false；扣到 activating / activated 先放嘅 18 次，B 嘅 script 行嗰陣已經被 claim（`controller` 有）→ 一開頭就 return false；冇一次撞到「activated 但未 claim」。

### 3.3 Shift-reload + 播緊嘢（每格 3 次）

| 情境                                                             | 結果     |
| ---------------------------------------------------------------- | -------- |
| A 播緊（公子會節目頁）→ B Shift-reload → B 叫 `update()`（RACE） | ✅ 3 / 3 |
| 同上，自然 race                                                  | ✅ 3 / 3 |
| 同上，A 叫 `update()`（RACE）                                    | ✅ 3 / 3 |
| B Shift-reload 之後先開播（播緊嘅係 Shift-reload tab），A 叫更新 | ✅ 3 / 3 |

12 / 12 每次逐步（播緊嘅 tab）：

| 步驟                     | 播緊嘅 tab reload | build   | 另一個 tab         |
| ------------------------ | ----------------- | ------- | ------------------ |
| 1 換版後（+3 s）         | 0                 | v1.21.8 | reload 1 → v1.21.9 |
| 2 播緊、前景 +3 s        | 0                 | v1.21.8 |                    |
| 3 播緊、收埋 + 快轉 61 s | 0                 | v1.21.8 |                    |
| 4 前景、撳暫停、等 2 s   | 0                 | v1.21.8 |                    |
| 5 前景、快轉 61 s        | 0                 | v1.21.8 |                    |
| 6 收埋                   | **1**             | v1.21.9 | 仍然 1             |

即係 A 開播之後先 Shift-reload B（`aPlayingBeforeHard` true），播緊嘅 tab 一直等到停播 + grace + 收埋先 reload；被 Shift-reload 嘅 tab 自己播緊（`markControlled` 路）亦一樣受保護。

### 3.4 上次 matrix 重跑（v1.21.8 → v1.21.9）

| 情境                                             | 結果                                                          |
| ------------------------------------------------ | ------------------------------------------------------------- |
| 第一次開 / 返嚟 × 星期日 / 平日 × 390 / 1180 × 2 | ✅ 16 / 16：reload 1（星期日 1.23–1.42 s、平日 2.05–2.07 s）  |
| 播緊（第一次開 / 返嚟 × 2 尺寸）                 | ✅ 4 / 4：前景 / 收埋 + 61 s / 暫停前景 + 61 s 都 0；收埋先 1 |
| 兩個冇播 tab（RET / FIRST / BOTH × 邊個 update） | ✅ 6 / 6：A 1、B 1                                            |
| A 播緊 + B（RET / FIRST × 邊個 update）          | ✅ 4 / 4                                                      |

30 / 30，冇 regression。

## 4. QA 補測（主動 edge case；暫時 test file `src/pwa/qaS648.tmp.test.ts`，跑完即刪，冇 commit）

| #   | Given / When / Then                                                                                                           | 結果 |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | 未受控、`active.state = 'redundant'` → `isHardReload` false                                                                   | ✅   |
| 2   | 未受控、`active` null、得 `waiting`（installed）→ false                                                                       | ✅   |
| 3   | 未受控、`active` activated + 有新 `installing` → true（Shift-reload 撞正新版安裝中都當見過 controller）                       | ✅   |
| 4   | `markControlled` 後 controllerchange + library `onNeedReload` + 再一下 controllerchange → reload 剛好 1 次                    | ✅   |
| 5   | claim 嘅 controllerchange 喺 `markControlled` 之前到（getRegistration 期間）→ 唔 reload；之後真換版嘅 controllerchange → 1 次 | ✅   |
| 6   | `markControlled`、有錄音、播緊 → controllerchange → 停播、前景 timer 行 180 s → 0；收埋 → 1                                   | ✅   |
| 7   | `markControlled` 後先嚟 `onNeedRefresh` → 只 `applyUpdate`、唔 reload；之後 controllerchange → reload 1                       | ✅   |

7 / 7 pass（`npx vitest run` 該 file），刪除後 `git status` 乾淨。

另外 swapped build 補測（3 次）：**部署咗新版之後先 Shift-reload**（B 由 network 攞到 v1.21.9，舊 SW 仍 active → mark）：B 多 reload 一次去**同一版** v1.21.9（load 3），之後受控、冇 loop；A 照常去 v1.21.9。同 review「可接受：多 reload 一次、無害、受播放規則保護」一致 → 觀察 O2，唔開 ticket。

## Edge case 評估

- Shift-reload × 搶贏 / 自然 race × 邊個叫 `update()` × 單 tab × 連續兩次 × 等耐先換 ✅；播緊（另一個 tab / 自己）✅；第一次安裝單 tab / 兩 tab（間隔、延遲、扣住到 activating / activated）✅；`reloadOnce`、claim 早過 mark ✅
- `✅ no edge case gap`

---

## 觀察（唔 block、唔開 ticket）

- **O1 — `activated` 同 claim 之間理論空隙**：workbox `clientsClaim` 喺 `activate` listener 入面冇 `waitUntil(clients.claim())`（`dist/workbox-*.js` 已確認），所以 spec 上 B 有可能見到 `activated` 但未被 claim → 多 reload 一次同一版。review S-651 已記錄（precache cleanup 嘅 `waitUntil` 通常長過 claim）。今次 34 次針對性探測（扣住 B 嘅 entry JS 到 A 嘅 SW 入 activating / activated + 11 個延遲值）一次都撞唔到：扣到 activated 先放時 B 已經被 claim。影響亦只係同一版 reload 一次（經 `handleNeedReload`，播緊唔 reload）。
- **O2 — 部署後先 Shift-reload 會多 reload 一次同一版**：見上面補測，review 已接受。
- **O3 — `getRegistration()` 永遠唔 resolve 會令 SW 唔 register**：review 觀察，spec 上唔會、今次冇見過；照 review 建議唔加 timeout。

## 失敗測試詳情

冇 hard gate 失敗，冇新 bug。

## 問題修正優先順序

| 優先 | ID       | 嚴重度   | 描述                                        | 時機   |
| ---- | -------- | -------- | ------------------------------------------- | ------ |
| —    | S-648    | 🟢       | 已修好（22 / 22；main 對照 7 / 7 重現）     | 今次   |
| 1    | O1 / O2  | 觀察     | 同一版多 reload 一次嘅理論 / 已知情況，無害 | 唔使做 |
| 2    | CUI-0016 | 🟢（舊） | W-518 unit test flake（今次全 suite 冇出）  | 照舊   |

## 測試建議（下一步）

1. 可以 merge / 出 v1.21.8：S-648 修好，冇 regression，e2e 新 check 係 deterministic detector
2. 實機：desktop Chrome / Edge 真 Shift-reload（⌘⇧R / Ctrl+F5）+ 另一個 tab 換版，同 iOS Safari（冇 Shift-reload，但「重新載入（不使用快取）」/ 開發者選項）各驗一次；CDP `ignoreCache` 同真按鍵喺 Chromium 行為一樣，但其他瀏覽器未驗
3. 如果將來改 SW（例如自己寫 `activate` handler），記得保持 claim 早過 `activated`，或者改用 `event.waitUntil(clients.claim())` 封死 O1

---

## Handoff receipt

```handoff-receipt
protocol: 2
status: pass
score: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: "pass (unit 2082/2082 = 2073 + 9 new; e2e 619/0 x2)"
  coverage: pass
  e2e: "pass (619/0 idle and 619/0 under 4-core CPU load; 7 PWA checks 14/14; new Shift-reload check red 3/3 on main build)"
  security: pass
  data_integrity: pass
  performance: pass
  no_critical: pass
  pwa_update: "pass (v1.21.8 -> v1.21.9 Shift-reload + race winner 22/22 both reload once; main 1872914 control 7/7 Shift-reloaded tab stuck; first visit single 11/11 and two tabs 46/46 no reload on install; playing + Shift-reload 12/12 no reload until paused + grace + hidden; previous matrix 30/30)"
next_action: merge_main
next_agent: devops-engineer
branch: "fix/pwa/s-648-hard-reload"
tickets: []
context: "QA PASS at 0b9b389 for bc6c1ee (S-648) + 5d0f944 (S-653) + deaa728 (S-651) + 0b9b389 (S-652), v1.21.8. No new tickets. Observations O1 (theoretical activated-before-claim window, 0/34 probes) and O2 (Shift-reload after deploy reloads once to the same build, review-accepted) are non-blocking."
```
