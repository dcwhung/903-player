# Batch QA — 2026-11-04 — CUI-0017 兩個 tab 換版（v1.21.6）+ PWA 換版 e2e（v1.21.7）

- 測試員：Quality Assurance（獨立角色）
- 範圍：`feature/e2e/pwa-update` @ `a7d6a3e`（stack 喺 `fix/pwa/cui-0017-two-tab-reload` `8593986` 上面，兩條都由 origin/main `5ddbaeb` 開始）；冇轉 branch、冇 commit / merge / push
    - Fix 1 `8593986`（v1.21.6）：`UpdateManagerDeps.controlledAtLoad`（`main.tsx` 喺 `registerSW` 之前讀 `navigator.serviceWorker.controller`）→ `hasSeenController`；`handleControllerChange` 喺 `hasSeenController || applied || pendingAction` 時當換版，之後標記見過。第一次開 app 嘅第一下 claim 照舊唔理
    - Fix 2 `401918b` + `07b8275`（W-520）+ `88d90ed`（W-519）+ `a224b40`（S-650）+ `bcf8593`（S-649）（v1.21.7）：新 `e2e/pwaUpdate.mjs`（自己嘅 static server，`127.0.0.1:0`，serve `dist/`，「換版」= `sw.js` 尾加註解）：第一次開、返嚟、兩個冇播嘅 tab、播緊嘢；`run.mjs` 登記
    - `1af5a9e` / `a7d6a3e` 只係 review docs
    - Review：[batch](../reviews/2026-11-04_review_cui-0017-pwa-update-e2e_batch.md)（Round 2 pass：A 99 / B 100；S-648 defer）
- 環境：Linux sandbox（4 核）、Node 22、playwright（Chromium）。Swapped build 用 `git archive a7d6a3e`（v1.21.7 + 假 v1.21.8）同 `git archive 5ddbaeb`（main v1.21.5 + 假 v1.21.6）喺 scratchpad 另外 build，repo 嘅 `package.json` 冇改過
- 總結：✅ **pass**；**CUI-0017 證實修好** → completed；冇新 ticket
    - `npm test` **2073 / 2073**（baseline 2070 + 3 個 CUI-0017 test）
    - `npx eslint .`、`npx tsc -b`、`npx prettier --check .` exit 0
    - `npm run e2e` 2 次：**617 PASS / 0 FAIL**（第 2 次 4 條 busy loop 搶 CPU，load ~4.9），5 個 PWA check 兩次都過，冇 flake
    - 兩個 tab swapped build（v1.21.7 → v1.21.8）**30 / 30**：兩個 tab 都 reload **1 次**去 v1.21.8；播緊嘅 tab 停播 + 61 s + 收埋之前 0 次 reload
    - 對照 main（v1.21.5 → v1.21.6）**9 / 9 有一個 tab 停喺舊版**（bug 喺 main 重現）
    - 上次 matrix 重跑：第一次開 / 返嚟 16 / 16、播緊 4 / 4

---

## 整體 verdict

| 項目          | 結果                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 涵蓋 fix      | Fix 1 `8593986`（v1.21.6 CUI-0017）；Fix 2 `401918b` `07b8275` `88d90ed` `a224b40` `bcf8593`（v1.21.7 PWA 換版 e2e）          |
| Edge case gap | Fix 1：0（S-648 hard reload 殘餘洞已由 review 記錄、defer，唔計新 gap）；Fix 2：0（觀察 O1：兩個 tab check 喺 main 4 / 6 紅） |
| Regression    | ✅ pass：e2e 2 × 617 / 0；第一次開 / 返嚟 16 / 16；播緊唔 reload 4 / 4                                                        |
| Status        | ✅ pass                                                                                                                       |

## Hard Gates（`a7d6a3e`）

| Gate           | 結果    | 證據                                                                                                                                               |
| -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests          | ✅ pass | unit 2073 / 2073（169 files，80 s）；e2e 617 / 0 × 2（7 m 06 s 冇負載、7 m 31 s 有負載）                                                           |
| Type check     | ✅ pass | `npx tsc -b` exit 0                                                                                                                                |
| Lint           | ✅ pass | `npx eslint .` exit 0；`npx prettier --check .` exit 0                                                                                             |
| Build          | ✅ pass | `npm run build`（e2e 第一步）× 2 exit 0；scratchpad build v1.21.7 / v1.21.8 / main v1.21.5 / v1.21.6 exit 0，各自 bundle 入面得返自己個版本號      |
| Coverage       | ✅ pass | `handleControllerChange` 新條件 3 條路（載入有 controller 冇錄音 / 載入有 controller 播緊 / 第一次開第二下）有 unit test；review 實測 lines 100%   |
| Security       | ✅ pass | 冇新依賴；e2e server 只聽 `127.0.0.1`、traversal guard（W-520，review 已驗）；e2e「冇 request 出外網」PASS                                         |
| Data integrity | ✅ pass | reload 一律經 `handleNeedReload` → `reloadOnce` → `playerController.stop()`（存進度）；播緊 reload 0 次（16 個 swapped-build 播放情境 + e2e 2 次） |
| Performance    | ✅ pass | 換版 reload 時間同上次一樣（星期日 1.2–1.5 s，平日 ~2.06 s 包括 2 s 等 + 快轉）；e2e 總時間 +~0.5 min（新 PWA section）                            |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                             |
| PWA Update     | ✅ pass | vN `v1.21.7` → vN+1 `v1.21.8`：第一次開 8 / 8、返嚟 8 / 8、兩個 tab 30 / 30，每個 tab 自動 reload **1 次**、顯示 / 行 `v1.21.8`、page error 0      |

---

## Section A — Fix 1 `8593986` CUI-0017 搶輸 skip-waiting 嘅 tab 都 reload（v1.21.6）

**Verdict：✅ pass**

### 做法

scratchpad 腳本 `scripts/pwa3.mjs`（上次 `pwa2.mjs` 改良）：細 static server（`127.0.0.1`、`no-cache`、剝走 `/903-player`），`newE2EContext` 開頁（mock 外網、固定時鐘、星期日 `2026-10-18 22:30` 主頁冇揀錄音 → 規則係即刻換）。等 SW 控制 → 換 serve 嘅 build → 指定 tab `registration.update()`。數 `load` event 計 reload；用文件入面 entry script（`assets/index-<hash>.js`）判斷頁面行緊邊個 build（播放頁冇版本號都驗到），兩個 tab 都換咗之後再等 3 s 確認冇第二次 reload。390×844。

- `RET`：A 開完 reload 一次（返嚟用戶）先開 B
- `FIRST`：A 第一次開（未 reload）、受控之後先開 B（ticket 嘅「第一次開」行）
- `BOTH`：A、B 喺 SW 未接管前一齊開（兩個都係第一次開，都要忽略第一下 claim）— 新加嘅 edge case

### 1. 兩個冇播嘢嘅 tab（ticket matrix，每格 3 次）

| 情境                    | B 叫 `update()`                     | A 叫 `update()`                     |
| ----------------------- | ----------------------------------- | ----------------------------------- |
| RET（兩個都係返嚟）     | ✅ 3 / 3：A 1、B 1 次，都係 v1.21.8 | ✅ 3 / 3：A 1、B 1 次，都係 v1.21.8 |
| FIRST（A 第一次開 + B） | ✅ 3 / 3：A 1、B 1                  | ✅ 3 / 3：A 1、B 1                  |
| BOTH（兩個都第一次開）  | ✅ 3 / 3：A 1、B 1                  | ✅ 3 / 3：A 1、B 1                  |

18 / 18 兩個 tab 都 reload 剛好 1 次、page error 0；第一次開嘅 clientsClaim 冇引起 reload（換版前 `load` 數同預期一樣：RET A = 2、其餘 = 1）。

### 2. A 播緊嘢（公子會節目頁 `ensurePlaying`）+ B 主頁冇錄音（每格 3 次）

| 情境  | B 叫 `update()` | A 叫 `update()` |
| ----- | --------------- | --------------- |
| RET   | ✅ 3 / 3        | ✅ 3 / 3        |
| FIRST | ✅ 3 / 3        | ✅ 3 / 3        |

12 / 12 每次逐步：

| 步驟                               | A reload | A build | B                  |
| ---------------------------------- | -------- | ------- | ------------------ |
| 1 `update()` 後 B 換咗（+3 s）     | 0        | v1.21.7 | reload 1 → v1.21.8 |
| 2 A 播緊、前景 +3 s                | 0        | v1.21.7 |                    |
| 3 A 播緊、收埋 + 快轉 61 s（+3 s） | 0        | v1.21.7 |                    |
| 4 A 前景、撳暫停、等 2 s           | 0        | v1.21.7 |                    |
| 5 A 前景、快轉 61 s                | 0        | v1.21.7 |                    |
| 6 A 收埋                           | **1**    | v1.21.8 | 仍然 1（冇第二次） |

即係播緊嘅 tab 唔理佢有冇收過 `onNeedRefresh`（新嘅 controllerchange 路），都要等停播 + grace + 收埋先 reload，前景唔會因 timer reload — 現有規則冇被繞過。

### 3. 對照組：main build（`5ddbaeb`）v1.21.5 → v1.21.6

| 情境                   | 結果                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ |
| RET，B 叫 `update()`   | ❌ 3 / 3 B 停喺 v1.21.5（A 換咗）                                              |
| RET，A 叫 `update()`   | ❌ 3 / 3 得一個換（2 次 B 停、1 次 A 停；快轉 61 s + hidden → visible 都唔換） |
| FIRST，B 叫 `update()` | ❌ 3 / 3 B 停喺 v1.21.5                                                        |

9 / 9 重現 → 同一個 harness 喺 fix branch 30 / 30 過，證實係 `8593986` 修好，唔係環境變咗。

### 4. 上次嘅單 tab matrix 重跑（v1.21.7 → v1.21.8）

| 情境                         | 390×844                       | 1180×820                   |
| ---------------------------- | ----------------------------- | -------------------------- |
| 第一次開，星期日             | ✅ 2 / 2，reload 1，1.2–1.3 s | ✅ 2 / 2，reload 1，1.3 s  |
| 第一次開，平日（+61 s 收埋） | ✅ 2 / 2，reload 1，2.06 s    | ✅ 2 / 2，reload 1，2.06 s |
| 返嚟，星期日                 | ✅ 2 / 2，reload 1，1.4 s     | ✅ 2 / 2，reload 1，1.5 s  |
| 返嚟，平日                   | ✅ 2 / 2，reload 1，2.05 s    | ✅ 2 / 2，reload 1，2.06 s |
| 播緊（第一次開 / 返嚟）      | ✅ 2 / 2                      | ✅ 2 / 2                   |

播緊 4 / 4：播緊前景 6 s、播緊收埋 + 61 s、暫停前景 2 s、暫停前景 + 61 s 都係 0 reload，新 SW 一直喺 `waiting`；收埋先 reload **1 次**去 v1.21.8、`waiting` 清咗。第一次開嘅 claim 16 / 16 冇 reload（`initialLoads` = 1）。

### 5. QA 補測（主動 edge case，暫時 test file 跑完即刪，冇 commit）

| #   | Given / When / Then                                                                                                                                  | 結果        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | 載入有 controller、冇錄音；library `onNeedReload` + 自己 listener 兩下 controllerchange → reload 1 次                                                | ✅          |
| 2   | 第一次開、播緊：claim → `onNeedRefresh` → 另一個 tab skip（controllerchange）；收埋 120 s 仍播 → 0；停播 59.999 s → 0；60 s → 1，冇發 `SKIP_WAITING` | ✅          |
| 3   | 載入有 controller、有錄音、暫停、前景；controllerchange 後 timer 行 180 s → 0；hidden → visible → 1                                                  | ✅          |
| 4   | 第一次開、有錄音、收埋；第一下 claim + 120 s + 返前景 → 0                                                                                            | ✅          |
| 5   | 載入有 controller、冇錄音；controllerchange（已 reload）之後先嚟 `onNeedRefresh` → 預期唔再發 `SKIP_WAITING`                                         | ⚠️ 會發一次 |

#5：`reloadOnce` 之後 `pendingAction` 已清，遲嚟嘅 `onNeedRefresh` 會行 `apply()` → `applyUpdate()`。**唔係 defect、唔開 ticket**：(a) 舊有行為（改之前 `handleNeedReload` → `handleNeedRefresh` 次序一樣）；(b) 頁面已經喺 reload 途中；(c) workbox 只會喺 `registration.waiting === sw` 先 dispatch `waiting`，已經 activate 咗嘅 SW 唔會再觸發 `onNeedRefresh`，實際只可能係再新一版 vN+2 剛好裝好，咁發 `SKIP_WAITING` 亦只係令其他 tab 按自己規則換。記錄做觀察 O2。

### Edge case 評估

- 返嚟 / 第一次開 / 兩個都第一次開 × 邊個叫 `update()` ✅；播緊等規則 ✅；`reloadOnce` 唔重複 ✅；claim 唔 reload ✅
- 已知殘餘：S-648（Shift-reload 未受控頁 + 搶輸 race）由 review 記錄、developer defer，今次冇改動、冇重驗，唔計新 gap
- `✅ no edge case gap`（新）

---

## Section B — Fix 2 PWA 換版 e2e（v1.21.7）

**Verdict：✅ pass**

### 穩定性（`npm run e2e` × 2）

| Run | 條件                               | 總數    | 5 個 PWA check                                   | 時間     |
| --- | ---------------------------------- | ------- | ------------------------------------------------ | -------- |
| 1   | 冇負載                             | 617 / 0 | ✅ 5 / 5（兩 tab A 1、B 1；waiting true → true） | 7 m 06 s |
| 2   | 4 條 `sha256sum /dev/zero` 搶 4 核 | 617 / 0 | ✅ 5 / 5（同上）                                 | 7 m 31 s |

- 有負載都冇 flake；W-519 修正後「播緊唔 reload」條件 `detected && stillWaiting` 兩次都係 `true → true`，即係負向斷言真係喺有新版等緊時驗到
- 負載 process 按 PID kill，跑完 `ps` 確認冇殘留；server 用 port 0 冇同 `vite preview`（4173）撞

### 偵測力（mutation：用 main build `5ddbaeb` 跑新 `pwaUpdate.mjs`，scratchpad 副本，冇改 repo）

| Check             | main 結果                                  |
| ----------------- | ------------------------------------------ |
| 第一次開          | PASS 6 / 6（v1.21.4 修正已喺 main，預期）  |
| 返嚟              | PASS 6 / 6                                 |
| 兩個 tab CUI-0017 | **FAIL 4 / 6**（A 1 B 0 × 3、A 0 B 1 × 1） |
| 播緊（2 個）      | PASS 6 / 6（main 已經有播放保護，預期）    |

觀察 O1：兩個 tab check 做 regression detector 約 2 / 3 命中（reviewer 已預計「有機會偶爾漏報」）；我嘅 matrix 腳本喺開完 B 之後等 1.5 s 先換 build，main 9 / 9 命中。唔影響「修正有效」嘅判斷（fix branch 2 × e2e + 30 / 30 都係兩個 tab 都換），**唔 block、唔開 ticket**；建議將來可以喺 `checkTwoTabs` 開完 B 之後等兩個 tab `controller` + 短 settle 再 `release()`，或者重複 2 次，提高命中率。

### Edge case 評估

- 第一次開 / 返嚟 / 兩 tab / 播緊 4 個情境都有 section 包住；有負載冇 flake；server loopback + traversal（W-520）review 已驗
- `✅ no edge case gap`（O1 係偵測力觀察）

---

## 跨 fix 互動評估

- Fix 1 改 `src/`（產品）；Fix 2 只加 `e2e/pwaUpdate.mjs` + `run.mjs` 一行 import 一個 section，冇共用 symbol
- Fix 2 嘅兩個 tab check 正正驗 Fix 1：e2e 兩次 A 1、B 1；main 對照 4 / 6 紅
- e2e「淺色主頁 + service worker」section 喺 PWA section 之後照過（SW 啟用、冇 JS error、冇外網 request）；PWA section 自己嘅 server / context 完結都閂（之後 section 冇受影響）
- 版本號 1.21.5 → 1.21.6 → 1.21.7 只改 `package.json` / lock；`dist/index.html` 顯示 `v1.21.7`
- Coverage：新產品代碼只有 1 個 dep 欄位 + 1 個 flag + 1 行條件，全部有 unit test + swapped build 覆蓋

## Regression 結論

✅ unit 2073 / 2073、e2e 2 × 617 / 0；第一次開 / 返嚟換版 16 / 16；播緊唔會 reload（單 tab 4 / 4、兩 tab 12 / 12）；冇 JS error、冇外網 request。

---

## 失敗測試詳情

冇 hard gate 失敗，冇新 bug。

## 問題修正優先順序

| 優先 | ID       | 嚴重度   | 描述                                           | 時機             |
| ---- | -------- | -------- | ---------------------------------------------- | ---------------- |
| —    | CUI-0017 | 🟡       | 已修好 → completed                             | 今次             |
| 1    | S-648    | 🟢       | Shift-reload 未受控頁搶輸 race（review defer） | 下一個 PWA patch |
| 2    | O1       | 觀察     | e2e 兩個 tab check 喺 main 約 2 / 3 命中       | 有空先做         |
| 3    | CUI-0016 | 🟢（舊） | W-518 unit test flake（今次全 suite 冇出）     | 照舊             |

## 測試建議（下一步）

1. 可以 merge / 出 v1.21.7：CUI-0017 修好，冇 regression
2. S-648 按 review 方案 A 做（`onRegisteredSW` 見 `registration.active` 而頁面未受控 → 標記見過 controller），之後用 CDP `Page.reload({ ignoreCache: true })` 加一個 swapped-build 情境驗
3. O1：`checkTwoTabs` 開完 B 之後加 settle 或者重複，提高對 CUI-0017 回歸嘅命中率
4. 實機（iOS home screen app + Safari 分頁）驗兩個 tab 換版：Chromium 驗唔到 iOS 背景暫停時 `controllerchange` 嘅次序

---

## Handoff receipt

```handoff-receipt
protocol: 2
status: pass
score: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: "pass (unit 2073/2073; e2e 617/0 x2)"
  coverage: pass
  e2e: "pass (617/0 idle and 617/0 under 4-core CPU load; 5 PWA checks 10/10; two-tab check detects main bug 4/6)"
  security: pass
  data_integrity: pass
  performance: pass
  no_critical: pass
  pwa_update: "pass (v1.21.7 -> v1.21.8 two tabs 30/30 both reload once; first visit 8/8, returning 8/8; playing never reloads until paused + grace + hidden 16/16; main 5ddbaeb control 9/9 one tab stuck)"
next_action: merge_main
next_agent: devops-engineer
branch: "feature/e2e/pwa-update"
tickets: [CUI-0017]
context: "Batch QA PASS at a7d6a3e for 8593986 (v1.21.6 CUI-0017 controlledAtLoad/hasSeenController) and 401918b+07b8275+88d90ed+a224b40+bcf8593 (v1.21.7 PWA update e2e). CUI-0017 moved to completed."
```
