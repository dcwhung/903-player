# Batch QA — 2026-10-31 — PWA 第一次開 app 換版（v1.21.4）+ e2e section 清 context（v1.21.5）

- 測試員：Quality Assurance（獨立角色）
- 範圍：`refactor/e2e/section-cleanup` @ `a1f6192`（stack 喺 `fix/pwa/first-visit-reload` `d2aa938` 上面，兩條都由 origin/main `3860935` 開始）；冇轉 branch、冇 commit / merge / push
    - Fix 1 `9f5da37` + `d2aa938`（v1.21.4）：`UpdateManager.handleControllerChange()`，`src/main.tsx` 聽 `navigator.serviceWorker` 嘅 `controllerchange`；自己發過 `SKIP_WAITING` 或者有等緊嘅新版（S-647）先當換版，第一次安裝 clientsClaim 唔理（修 O1）
    - Fix 2 `d7e6243`（v1.21.5）：`runSection(log, label, run, browser)` 完結時閂晒 section 開咗嘅 context（S-644）；`run.mjs` 用 `section(label, run)`；`e2e/homeWide.mjs` 三個情境各自一個 section（O3）
    - `a1f6192` 只係 review docs
    - Review：[batch](../reviews/2026-10-31_review_pwa-first-visit-e2e-cleanup_batch.md)（99 / 100 pass）
- 環境：Linux sandbox（4 核）、Node 22、playwright（Chromium）。PWA build 用 `git archive a1f6192` 喺 scratchpad 另外 build（v1.21.5 同假 v1.21.6），repo 嘅 `package.json` 冇改過
- 總結：✅ **pass**；開咗 **CUI-0017**（🟡，舊問題，唔 block）
    - `npm test` **2070 / 2070**（baseline 2062 + 5 `updateManager` + 3 `e2eSection`）
    - `npx eslint .`、`npx tsc -b`、`npx prettier --check .` exit 0；`dist/index.html` 有 `v1.21.5`
    - `npm run e2e`：**612 PASS / 0 FAIL**，exit 0
    - PWA 第一次開 app：v1.21.5 → v1.21.6 **8 / 8** 自動 reload 1 次；對照組 v1.21.3（main）→ v1.21.5 0 次（O1 重現）→ 證實係今次修正
    - 返嚟用戶 8 / 8、播緊嘢 4 / 4 唔會中途 reload、兩個 tab（B 先換、A 播緊）2 / 2
    - runSection 注入 3 次：其餘情境照行、section 完 contexts = 0；mutation（唔傳 browser）見到 context leak + 播緊嘅頁留低

---

## 整體 verdict

| 項目          | 結果                                                                               |
| ------------- | ---------------------------------------------------------------------------------- |
| 涵蓋 fix      | Fix 1 `9f5da37` + `d2aa938`（v1.21.4 PWA）；Fix 2 `d7e6243`（v1.21.5 e2e harness） |
| Edge case gap | Fix 1：1（兩個 tab 都冇播嘢時，搶輸嘅 tab 停喺舊版 → CUI-0017，舊問題）；Fix 2：0  |
| Regression    | ✅ pass：e2e 612 / 0；返嚟用戶換版 8 / 8；播放中唔 reload                          |
| Status        | ✅ pass                                                                            |

## Hard Gates（`a1f6192`）

| Gate           | 結果    | 證據                                                                                                                                       |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Tests          | ✅ pass | unit 2070 / 2070（169 files，83 s）；e2e 612 / 0                                                                                           |
| Type check     | ✅ pass | `npx tsc -b` exit 0                                                                                                                        |
| Lint           | ✅ pass | `npx eslint .` exit 0；`npx prettier --check .` exit 0                                                                                     |
| Build          | ✅ pass | `npm run build`（e2e 第一步）exit 0；scratchpad build v1.21.5 / v1.21.6 exit 0                                                             |
| Coverage       | ✅ pass | `handleControllerChange` 3 個分支（applied / pendingAction / 都冇）+ 播放等待 + 唔重複 reload 都有 unit test；`runSection` close 3 個 test |
| Security       | ✅ pass | 冇新依賴；e2e「冇 request 出外網」PASS                                                                                                     |
| Data integrity | ✅ pass | reload 前 `playerController.stop()`（存進度）路徑冇改；播放中 reload 0 次                                                                  |
| Performance    | ✅ pass | 換版 reload 時間同之前一樣（星期日 ~1.3–1.6 s，平日 ~2.1 s 包括 2 s 等 + 快轉）；e2e 時間冇明顯變                                          |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                     |
| PWA Update     | ✅ pass | vN `v1.21.5` → vN+1 `v1.21.6`：第一次開 8 / 8、返嚟 8 / 8，自動 reload **1 次**、顯示 `v1.21.6`、page error 0                              |

---

## Section A — Fix 1 `9f5da37` + `d2aa938` PWA 第一次開 app 換版（v1.21.4）

**Verdict：✅ pass**（附 CUI-0017，舊問題）

### 做法

scratchpad 細 static server（剝走 `/903-player`，`cache-control: no-cache`），用 `newE2EContext` 開頁（mock 外網、固定時鐘）。等 SW 控制 → 換 serve 嘅 build → `registration.update()`。數 `load` event 計 reload 次數，見到新版本號之後再等 3 s 確認冇第二次 reload。腳本：scratchpad `scripts/pwa2.mjs`；另外用 main agent 畀嘅 `pwa-first-visit.mjs` 對照。

- 星期日（`2026-10-18 22:30`）：主頁冇揀錄音 → 規則係即刻換
- 平日（`2026-10-19 22:30`）：等 2 s → `clock.fastForward(61 s)` → `visibilitychange` hidden（同上次 matrix 一樣）

### 1. 第一次開 app（O1 修正）

| 情境                     | 390×844                   | 1180×820                  |
| ------------------------ | ------------------------- | ------------------------- |
| 星期日                   | ✅ 2 / 2，reload 1，1.3 s | ✅ 2 / 2，reload 1，1.3 s |
| 平日（快轉 61 s + 收埋） | ✅ 2 / 2，reload 1，2.1 s | ✅ 2 / 2，reload 1，2.1 s |

- 第一次安裝 clientsClaim 嗰下 `controllerchange` **冇 reload**（16 / 16 次換版前 `load` 都係 1）
- 對照組：v1.21.3（`3860935` main build）→ v1.21.5，第一次開 **冇 reload**（`pwa2.mjs` 15 s 等唔到，`pwa-first-visit.mjs` navigations +0）→ 修正之前確實壞，修正之後好返
- `pwa-first-visit.mjs v1215 v1216`：第一次開 / `SECOND=1` 都係 navigations **+1**、errors 0

### 2. 返嚟用戶（上次嘅 8-case matrix 重跑）

| 情境                     | 390×844                   | 1180×820                  |
| ------------------------ | ------------------------- | ------------------------- |
| 星期日                   | ✅ 2 / 2，reload 1，1.6 s | ✅ 2 / 2，reload 1，1.5 s |
| 平日（快轉 61 s + 收埋） | ✅ 2 / 2，reload 1，2.1 s | ✅ 2 / 2，reload 1，2.1 s |

全部 page error 0，顯示 `v1.21.6`；冇因為 `controllerchange` 同 library `onNeedReload` 一齊嚟而 reload 兩次（`reloadOnce`）。

### 3. 播緊嘢唔可以 reload（平日、公子會節目頁 `ensurePlaying`）

第一次開（`playing`）同返嚟用戶（`playing2`）× 390×844 / 1180×820 = 4 次，每次逐步：

| 步驟                              | 4 / 4 結果                                       |
| --------------------------------- | ------------------------------------------------ |
| 1 播緊、前景，`update()` 後等 6 s | 冇 reload；新 SW 喺 `waiting`（未 skipWaiting）  |
| 2 播緊、收埋 3 s + 快轉 61 s      | 冇 reload                                        |
| 3 返前景、撳暫停、等 2 s          | 冇 reload（grace 未夠）                          |
| 4 前景、快轉 61 s                 | 冇 reload（前景唔會因 timer reload）             |
| 5 收埋                            | ✅ reload **1 次**、顯示 `v1.21.6`、waiting 清咗 |

### 4. 兩個 tab

| 情境                                                         | 結果                                                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| A 第一次開、播緊；B 主頁（冇錄音），B 叫 `update()`（S-647） | ✅ 2 / 2：B 即刻 reload 1 次去 v1.21.6；A 播緊（前景 / 收埋）都冇 reload；暫停 + 61 s + 收埋 → A reload 1 次去 v1.21.6 |
| A 第一次開、冇播；B 主頁，B 叫 `update()`                    | ⚠️ 2 / 2：A（external `installed` 即刻 `onNeedRefresh`）搶先換咗；**B 停喺 v1.21.5**                                   |
| A、B 都係返嚟用戶、冇播；B 叫 `update()`                     | ⚠️ 4 / 4：B 換咗；**A 停喺 v1.21.5**（快轉 61 s + hidden → visible 都唔換）                                            |
| 同上，A 叫 `update()`                                        | ⚠️ 3 / 3 得一個 tab 換（2 次 A 停、1 次 B 停）                                                                         |
| 對照：main build v1.21.3 → v1.21.5，兩個返嚟用戶             | 1 / 2 A 停喺舊版 → **舊問題**，唔係今次引入                                                                            |

根源：workbox-window 對自己註冊嘅 SW 更新，`installed` 之後 `setTimeout(200)` 先 dispatch `waiting`，而且要嗰陣 `registration.waiting === sw`。另一個 tab 喺 200 ms 入面已經 `SKIP_WAITING`，搶輸嘅 tab `waiting` 永遠唔 dispatch → `onNeedRefresh` 冇 call → `handleControllerChange` 見 `applied = false`、`pendingAction = undefined`，當係第一次安裝唔理。S-647 只救「已經收到 `onNeedRefresh`」嘅 tab（上面第一行證實有效）。開 **CUI-0017**（🟡）：建議按「載入時有冇 controller」分辨第一次安裝同換版。

### Edge case 評估

- 第一次安裝 claim 唔 reload ✅；第一次開換版 ✅；返嚟 ✅；`reloadOnce` 唔重複 ✅；播緊 / grace / 前景規則 ✅；另一個 tab 先換、呢個 tab 有 pending ✅
- 盲點：另一個 tab 先換、呢個 tab **冇** pending → CUI-0017
- 建議補測（由 developer 做）：CUI-0017 修正時加 unit「載入時有 controller、冇 `onNeedRefresh`、`controllerchange` → 按規則 reload」同「載入時冇 controller：第 1 下唔 reload、第 2 下 reload」

---

## Section B — Fix 2 `d7e6243` runSection 清 context + 闊橫版主頁分 section（v1.21.5）

**Verdict：✅ pass**

### 注入測試（`e2e/homeWide.mjs` 先備份去 scratchpad，跑完抄返；sha256 `54d9981a…88ea` 前後一樣，`git status` clean）

dist 係 `npm run e2e` 啱啱 build 嘅 v1.21.5，所以直接 `node e2e/run.mjs`。喺 `runHomeWideChecks` 每個 section 之後 log `browser.contexts()` 數量同播緊嘅頁。

| 情境                                                                   | FAIL                                                                 | 其他情境                                            | Section 完之後                                                      | 總結 / exit                               |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| B1：`checkFill` 第一個 log 之後 `throw`（自己個 `ctx.close()` 行唔到） | 1：`闊橫版主頁（冇 mini player）：中途中止（QA-injected checkFill）` | ✅ split、閂卡 / 開返照行；闊橫版 13 PASS（14 − 1） | contexts = 0（3 個 section 都係）                                   | 611 PASS、`1 E2E check(s) failed`、exit 1 |
| B2：`checkCloseAndReopen` `ensurePlaying` 之後 `throw`（播緊公子會）   | 1：`闊橫版主頁播放卡閂卡 / 開返：中途中止（…while playing）`         | ✅ fill、split 照行；闊橫版 8 PASS（14 − 6）        | throw 前 contexts = 1 → 之後 **0**                                  | 606 PASS、exit 1                          |
| B3 mutation：B1 + B2，`runSection` 唔傳 `browser`（即係 v1.21.4 行為） | 2                                                                    | ✅ split 照行                                       | fill 後 1、split 後 1、閂卡後 **2**，其中一頁仲有「暫停」掣（播緊） | 605 PASS、`2 E2E check(s) failed`         |

- B3 證實冇 `browser` 會 leak context、而且播緊嘅頁會一直留到 run 完（S-644 描述嘅情況）；有 `browser` 就清走
- 少咗嘅 PASS 數啱啱係嗰個情境自己 throw 之後嘅 check，冇其他情境被拖累（O3 修正有效）
- 正常跑（冇注入）e2e 612 / 0，闊橫版 14 個 check 全過，同上次一樣

### Edge case 評估

- unit：close reject 唔影響結果、完成都會 close、舊 context 唔掂 ✅
- 注入：前段 / 後段 throw、播緊嘢 throw ✅；`✅ no edge case gap`

---

## 跨 fix 互動評估

- Fix 1 改 `src/`（產品），Fix 2 只改 `e2e/` + `src/e2eSection.test.ts`，冇共用 symbol
- e2e「淺色主頁 + service worker」section 經新 `section()` 行，SW 啟用 PASS；第一次開 app 嘅 clientsClaim 冇令 e2e 頁 reload（612 / 0、冇 JS error）
- 版本號 1.21.3 → 1.21.4 → 1.21.5 只改 `package.json` / lock
- Coverage：新產品代碼只有 `handleControllerChange`（4 行）+ `main.tsx` 1 行 listener，全部有 unit test / swapped-build 覆蓋

## Regression 結論

✅ e2e 612 / 0、unit 2070 / 2070；返嚟用戶換版 8 / 8；播放中唔會 reload；冇 JS error、冇外網 request。

---

## 失敗測試詳情

冇 hard gate 失敗。附帶問題（舊問題，唔 block）：

### CUI-0017 🟡 兩個 tab 同時開住：搶輸嘅 tab 停喺舊版

- 位置：`src/pwa/updateManager.ts` `handleControllerChange`；workbox-window 7.4 `waiting` 200 ms 延遲
- 預期：兩個 tab 都按規則（冇錄音即刻、播緊等停 + grace + 收埋）換去新版
- 實際：搶輸嘅 tab 冇 `onNeedRefresh`，`controllerchange` 被當係第一次安裝，停喺舊版，返前景都唔換
- Error：冇（page error 0）
- 根源 / 建議：見 Section A 第 4 部分同 `.tickets/pending/0001-0200/CUI-0017.md`

## 問題修正優先順序

| 優先 | ID       | 嚴重度   | 描述                                                  | 時機           |
| ---- | -------- | -------- | ----------------------------------------------------- | -------------- |
| 1    | CUI-0017 | 🟡       | 兩個 tab：冇收到 `onNeedRefresh` 嘅 tab 換版唔 reload | 下一個 PWA fix |
| 2    | CUI-0016 | 🟢（舊） | W-518 unit test flake（今次全 suite 冇出）            | 照舊           |

## 測試建議（下一步）

1. 可以 merge / 出 v1.21.5：O1 修好咗，冇 regression
2. CUI-0017：`main.tsx` 記低載入時有冇 controller，`handleControllerChange` 用嚟分「第一次安裝」同「換版」；修完用兩個 tab swapped-build 重驗（返嚟 / 第一次開 × 邊個叫 `update()` × ≥ 3 次）
3. 實機（iOS home screen app）驗第一次開換版：Chromium 驗唔到 iOS 背景暫停時 `controllerchange` 嘅次序

---

## Handoff receipt

```handoff-receipt
protocol: 2
status: pass
score: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: "pass (unit 2070/2070; e2e 612/0)"
  coverage: pass
  e2e: "pass (612/0; runSection injections 3/3: other homeWide scenarios run, contexts=0 after each section; mutation without browser leaks a playing page)"
  security: pass
  data_integrity: pass
  performance: pass
  no_critical: pass
  pwa_update: "pass (v1.21.5 -> v1.21.6 first visit 8/8 and returning 8/8, 1 reload each; playing never reloads until paused + grace + hidden 4/4; main v1.21.3 first visit control 0 reloads)"
next_action: merge_main
next_agent: devops-engineer
branch: "refactor/e2e/section-cleanup"
tickets: [CUI-0017]
context: "Batch QA PASS at a1f6192 for 9f5da37+d2aa938 (v1.21.4 controllerchange first-visit reload) and d7e6243 (v1.21.5 runSection closes contexts, homeWide 3 sections). Unit 2070/2070; eslint/tsc/prettier clean; e2e 612/0. PWA swapped builds from git archive in scratchpad (repo package.json untouched): first visit 1.21.5->1.21.6 8/8 auto reload once (390x844, 1180x820, Sunday/weekday x2), first-install claim never reloads, main 1.21.3 first visit does not reload (O1 fixed); returning 8/8; playing first/returning 4/4: no reload while playing visible/hidden, paused visible, +61s visible, reload once on hidden. Two tabs with A first-visit playing and B applying: 2/2 both end on 1.21.6 (S-647 works). New CUI-0017 (Medium, pre-existing on main, non-blocking): with two idle tabs the tab that loses the race never gets onNeedRefresh (workbox 200 ms waiting delay) so handleControllerChange ignores the controllerchange and it stays on the old version (reproduced 9/9 on 1.21.5, 1/2 on main). runSection: throw in checkFill / in checkCloseAndReopen while playing -> one FAIL each, other scenarios run, contexts 0 after section; mutation without browser leaves 2 contexts incl. a playing page. homeWide.mjs restored by copy (hash identical); tree clean except QA report, index and CUI-0017."
```
