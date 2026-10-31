# Batch Review — 2026-10-31 — PWA 第一次開 app 換版 reload + e2e section 閂 context

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 流程：標準（/fix + /refactor），Batch 模式（2 個 fix）；hard gates 全 pass、≥ 90 分、冇 Critical → pass
- 目標（stacked，base `origin/main` `3860935`）：
    - Section A：`fix/pwa/first-visit-reload` → `9f5da37`（v1.21.4）
    - Section B：`refactor/e2e/section-cleanup` → `874a1fb`（v1.21.5，喺 A 上面；審閱時 checkout 呢個 branch）
- Design Origin：`none-required`（冇 `.tsx` UI / `.css` 改動；`main.tsx` 只加一個 event listener）✅
- Review Item ID：`grep -rhoE "\b[CWS]-[0-9]{3,4}\b" .proj-docs/` 證實最高 C-011 / W-518 / S-646，今次用 **S-647**（冇 C / W）
- 總評：**整體 ✅ pass**（A 99 / 100、B 100 / 100）。A 嘅根因分析準確（`workbox-window` `_isUpdate` 喺 `register()` 一次過定死，vite-plugin-pwa 2.0.0 prompt 模式嘅 `controlling` handler 靠佢判斷），修正細、跟足 `handleNeedReload` 嘅播放保護同 `reloadOnce`，冇 reload loop。B 正確收咗 S-644 同 QA O3，冇 section 依賴之後仲開住嘅 context。只有 1 個 Suggestion（A：另一個 tab 換版嘅第一次開 app 殘餘漏洞，舊行為不變）。

---

## 整體 verdict

- 涵蓋 commit：`9f5da37`、`874a1fb`
- Status：✅ pass

### Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                               |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint          | ✅ pass | `npx eslint src/main.tsx src/pwa/updateManager.ts src/pwa/updateManager.test.ts e2e/harness.mjs e2e/homeWide.mjs e2e/run.mjs src/e2eSection.test.ts` exit 0；`npx prettier --check`（同上 + `package.json`）全合規 |
| Type check    | ✅ pass | `npx tsc -b --noEmit` exit 0                                                                                                                                                                                       |
| Tests         | ✅ pass | `npx vitest run src/pwa/updateManager.test.ts src/e2eSection.test.ts`：2 files / 46 tests 全綠（full unit / e2e 由 QA 跑）                                                                                         |
| Coverage      | ✅ pass | `src/pwa/updateManager.ts`：Stmts 100% / Branch 97.56% / Lines 100%（唯一未覆蓋 branch L160 係舊有 `Math.max`）；`runSection` 新分支（有 / 冇 browser、throw / 成功、close reject）全部有 test                     |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                                             |
| Security scan | ✅ n/a  | 冇依賴改動（`package-lock.json` 只改 version 1.21.3 → 1.21.5）                                                                                                                                                     |

### Version bump

- A：1.21.3 → 1.21.4 ✅；B：1.21.4 → 1.21.5 ✅（`package.json` + `package-lock.json` 一致）

---

## Section A — `9f5da37` fix(pwa)：第一次開 app 之後嘅更新都 reload

### 改動清單

- `src/pwa/updateManager.ts`：`handleControllerChange()` — `applied`（今頁發過 SKIP_WAITING）先 delegate 去 `handleNeedReload()`，否則忽略
- `src/main.tsx`：`navigator.serviceWorker?.addEventListener('controllerchange', updateManager.handleControllerChange)`
- `src/pwa/updateManager.test.ts`：新 `describe('UpdateManager.handleControllerChange')` 4 個 test（未 apply 忽略、第一次開 app apply 後 reload 一次、播緊等停、同 library `onNeedReload` 一齊來只 reload 一次）

### 根因核實

- `node_modules/workbox-window/Workbox.js:294`：`this._isUpdate = Boolean(navigator.serviceWorker.controller)` 只喺 `register()` 定一次；`_onControllerChange`（L216–227）每次都 dispatch `controlling`，`isUpdate` 用嗰個舊值。
- `node_modules/vite-plugin-pwa/dist/client/build/register.js`（v2.0.0）prompt 分支：`controlling` listener 只喺 `event.isUpdate` 先 call `onNeedReload` → 第一次開 app（冇 controller）永遠唔 call。✅ 同 commit message 一致。
- 同一頁之後 `registration.update()` 搵到嘅新 SW，workbox 因 `_updateFoundCount > 0` 當 external → `installed(isExternal)` / `waiting` → `onNeedRefresh` 照到，所以 `applied` 會正確變 `true`。

### 針對 caller 提出嘅風險逐項核實

| 風險                                        | 結論                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 播緊音時 reload                             | ✅ 唔會。`applyUpdate` 先 `playerController.stop()`；`handleControllerChange` 走 `handleNeedReload`，佢 `applied && !isPlaying()` 先即刻 reload，否則 `pendingAction = 'reload'` 行返 `canApply`（停夠 grace + 收埋 / 啱啱返前景）。SKIP_WAITING 到 controllerchange 之間用戶撳 Play 嘅 race 有 test 覆蓋（"should wait for playback to stop"）。 |
| Reload loop                                 | ✅ 冇。同頁內 `reloadOnce`（`createReloadOnce`）擋住第二次；reload 之後新頁 `applied = false`，只有再見到 waiting SW 兼今頁發 SKIP_WAITING 先會再 reload。第一次安裝 `clientsClaim` 嘅 controllerchange 因 `applied = false` 被忽略（有 test）。                                                                                                  |
| 第二次開 app 雙重觸發                       | ✅ library `onNeedReload` 同自己嘅 listener 都會 call `handleNeedReload`；即刻 reload 路徑由 `reloadOnce` 擋，等緊路徑兩次都只係設同一個 `pendingAction = 'reload'`。有 test。listener 喺 `wb.register()`（async import）之前註冊，次序唔影響結果。                                                                                               |
| 另一個 tab 換版（今 tab `applied = false`） | ✅ 行為同改之前一樣：`handleControllerChange` no-op；有 controller 時 register 嘅頁照由 library `onNeedReload` → `handleNeedReload` 等時機 reload。第一次開 app 嘅頁仍然有舊漏洞，見 S-647。                                                                                                                                                      |
| 第一次安裝 claim 遲過 `applied = true`      | 理論 race（SW1 啟用 claim 嘅 controllerchange 未派到頁面，SW2 已 waiting 兼已 apply）：結果只係早一次 reload 去 SW1 控制嘅頁，之後 SW2 照正常流程；冇 loop、冇打斷播放。唔開 ID。                                                                                                                                                                 |
| 冇 SW 嘅瀏覽器 / 非 secure context          | `navigator.serviceWorker?.` 防住 undefined ✅                                                                                                                                                                                                                                                                                                     |

### PWA hard rule（global-rules §PWA Version & Self-Update Rule）

| 項目                                                                       | 結果                                                                                                           |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 版本號顯示（來自 `package.json`，build time 注入）                         | ✅ `vite.config.ts` 讀 `package.json` → `__APP_VERSION__` / `%APP_VERSION%`（冇改動）                          |
| Update 偵測（啟動 + `visibilitychange` + interval 常數）                   | ✅ `startUpdateChecks`：`checkNow` 啟動、`visibilitychange` / `pageshow`、`UPDATE_CHECK_INTERVAL_MS`（冇改動） |
| 自動 reload（waiting → SKIP_WAITING → controllerchange → reload，防 loop） | ✅ 今次正係補返第一次開 app 呢個缺口；`reloadOnce` 防 loop                                                     |
| 未儲存狀態保護                                                             | ✅ reload 前 `playerController.stop()`（pause + persist）；播緊唔 reload                                       |
| `sw.js` / `index.html` 唔長 cache                                          | ✅ n/a（冇改 hosting；GitHub Pages 預設 `max-age=600`，SW update check 預設 bypass HTTP cache）                |
| Test                                                                       | ✅ 新 handler 4 個 unit test                                                                                   |

### 發現

#### 🟢 S-647 — 第一次開 app 嘅頁，如果新版由另一個 tab 啟用，仍然停喺舊版（而且之後所有更新都唔再 apply）

- 位置：`src/pwa/updateManager.ts:110`（`handleControllerChange`）
- 描述：Tab A 第一次開 app（register 時冇 controller），之後新 SW 喺 waiting → A `pendingAction = 'refresh'`；Tab B 先發 SKIP_WAITING。A 收到 controllerchange 但 `applied = false` → 忽略；library 亦因 `isUpdate = false` 唔 call `onNeedReload`。之後 A 符合條件 `apply()` → `applied = true` → `updateSW(true)`，但 `Workbox.messageSkipWaiting()`（`Workbox.js:453`）見 `registration.waiting === null` 乜都唔做，冇 controllerchange → A 停喺舊版直到手動重開；之後新版 `handleNeedRefresh` 又因 `applied` early return。
- 影響：同 QA O1 同一類（第一次開 app 冇自動換版），只喺多 tab / 多 window 出現；standalone PWA（尤其 iOS）通常單一 instance，所以機會低。改之前已經係咁，唔係 regression。
- 方案 A：判斷條件改做「今頁知道有新版等緊」：`if (this.applied || this.pendingAction !== undefined) this.handleNeedReload();`。第一次安裝 claim 時 `pendingAction` 必定係 `undefined`（未有 `onNeedRefresh`），所以仍然唔會誤 reload；`handleNeedReload` 會將 `pendingAction` 改做 `'reload'`，繼續行播放保護。加一個 test：`handleNeedRefresh`（播緊 / 未夠 grace）→ `handleControllerChange` → 停播後 reload 一次。
    - 優：一行改動，覆蓋多 tab；唔使改 library。缺：「有 waiting SW」嘅 controllerchange 理論上可能係另一個更新版本（v3 而唔係 v2）—— 但都係新版，reload 一樣啱。
- 方案 B：`apply()` 之前檢查 `registration.waiting`，冇就改行 reload 路徑（`pendingAction = 'reload'`）。
    - 優：亦都處理「waiting 已經冇咗」嘅其他原因。缺：要將 `registration` 注入 `UpdateManager` deps，改動較大；冇 controllerchange 時 reload 時機要另外判斷。
- 推薦：A（細、可測、同今次修正嘅意圖一致）。可以喺呢個 branch 或下一個 patch 做。

### 評分

| 維度     | 得分   | 滿分    | 備注                                           |
| -------- | ------ | ------- | ---------------------------------------------- |
| 正確性   | 24     | 25      | S-647（舊有邊界，未完全收口）                  |
| 安全性   | 20     | 20      |                                                |
| 可維護性 | 20     | 20      | 重用 `handleNeedReload`，冇複製判斷邏輯        |
| 測試覆蓋 | 15     | 15      | 4 個 test 覆蓋 ignore / reload / 播緊 / 雙觸發 |
| 性能     | 10     | 10      |                                                |
| 代碼風格 | 10     | 10      | 註釋清楚交代 library 行為                      |
| **總分** | **99** | **100** |                                                |

**結果：✅ pass**

### TDD

- 單一 commit（test + 實作一齊）；commit message 有 Chromium swapped-build 紅綠證據（v1.21.3 → v1.21.4 重現 bug、v1.21.4 → v1.21.99 reload 一次），接受。新 test 喺舊代碼必然紅（`handleControllerChange` 唔存在）。

---

## Section B — `874a1fb` refactor(e2e)：section 完結閂 context；闊橫版主頁 3 個情境各自一個 section

### 改動清單

- `e2e/harness.mjs`：`runSection(log, label, run, browser)` 開始時記低 `browser.contexts()`，`finally` 閂晒期間新開嘅（close reject 忽略）；冇 `browser` 行為同舊一樣
- `e2e/run.mjs`：`section(label, run)` 包 `runSection(..., browser)`（closure 喺 call 時先讀 `browser`，launch 之後先用，冇問題）；`git diff -w` 證實除咗改名 + prettier 重排冇邏輯改動；`runHomeWideChecks` 改為直接 call
- `e2e/homeWide.mjs`：`SCENARIOS` 3 個情境逐個 `runSection(env.log, label, () => check(env), env.browser)`（QA O3）
- `src/e2eSection.test.ts`：3 個新 test（throw 閂新 context 留舊、成功都閂、close reject 唔令 section fail / 唔 log）

### 「成功路徑閂 context」會唔會打爛之後依賴佢嘅 section

逐個 section 核實：

| Section / context                                                                       | 之前                                 | 而家                                                                        | 有冇人之後用                                                                                                                     |
| --------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `390×844 主流程`（`context` / `page`）                                                  | 從來冇 close，開到 `browser.close()` | section 完結閂                                                              | ❌ 冇。兩個都係 section arrow 入面 `const`，之後冇引用；`metrics` / `todayMetrics`（module 層）喺 section 內寫完，之後只係 print |
| `淺色主頁 + service worker`（`light`）                                                  | 冇 close                             | 閂                                                                          | ❌ 冇；之後只有最尾 `errors` / `externalRequests` 總結                                                                           |
| `320×640` / 循環掃 / `320×568` / 橫額 / 節目頁尺寸                                      | 自己 close                           | 已閂，`ctx.close()` 再 call 一次被 `.catch` 吞（亦唔會出現喺 `contexts()`） | ❌                                                                                                                               |
| 外部模組（touch / arcSheet / hiddenPlayback / miniPlayerRules / dramaPages / homeWide） | 自己 close（成功路徑）               | 同上                                                                        | ❌（`sheetMissedTaps` 係 return 值，唔係 context）                                                                               |
| probe check                                                                             | 自己 close                           | 同上                                                                        | ❌                                                                                                                               |

- 冇 nested section（`runHomeWideChecks` 唔再包喺外層 section），所以冇「內層閂咗外層 context」嘅問題；就算將來 nest，diff 用「開始前快照」，內層只會閂自己期間開嘅。
- Sections 全部順序 `await`，冇並行，`contexts()` 快照唔會捉到其他 section 嘅 context。
- 唯一行為差異（觀察，唔開 ID）：主流程同淺色主頁嘅 page 以前一直開到尾，佢哋之後先出嘅 `pageerror` / 外網 request 會入最尾兩個總結 check；而家 section 完就閂，呢類「遲到」事件唔再計。呢個正正係 S-644 想消除嘅跨 section 噪音（主流程頁播緊音會搶 CPU），而且每個 check 應該喺自己 section 內證明自己，可以接受。QA 乾淨 run 612 / 0 亦證實冇 check 依賴佢。

### 發現

- 冇新 ID。

### 評分

| 維度     | 得分    | 滿分    | 備注                              |
| -------- | ------- | ------- | --------------------------------- |
| 正確性   | 25      | 25      | S-644 / O3 完整收口               |
| 安全性   | 20      | 20      |                                   |
| 可維護性 | 20      | 20      | 一處 `finally`，全部 section 受惠 |
| 測試覆蓋 | 15      | 15      | 3 個新 test 覆蓋新分支            |
| 性能     | 10      | 10      | 失敗 run 唔再留低播緊嘅頁         |
| 代碼風格 | 10      | 10      |                                   |
| **總分** | **100** | **100** |                                   |

**結果：✅ pass**

### TDD

- 單一 commit；commit message 有注入 throw 喺 `checkFill` → 1 FAIL / 610 PASS / 每個 section 之後 0 context 嘅證據，接受。

---

## ✅ 做得好嘅地方（跨 fix）

- A 讀穿 library + workbox 源碼搵到真正根因，而唔係喺 `onNeedRefresh` 加 timer 硬 reload；修正重用現有 `handleNeedReload` / `reloadOnce`，播放保護、防 loop 全部自動繼承。
- A 用 swapped build 喺真 Chromium 驗證兩個方向 + 第一 / 第二次開 app，證據完整。
- B 用「開始前快照 diff」而唔係追蹤每個 `newE2EContext`，外部模組零改動都受惠；close 錯誤吞咗唔會變假 FAIL。
- 兩個 commit 都有清楚嘅廣東話註釋交代「點解」。

## 修正優先順序

| 優先 | ID    | Section | 建議                                                                                        |
| ---- | ----- | ------- | ------------------------------------------------------------------------------------------- |
| 1    | S-647 | A       | `handleControllerChange` 條件加 `pendingAction !== undefined` + 1 個 test（可下一個 patch） |

## 修訂後代碼（S-647 方案 A，供參考）

```ts
/**
 * navigator.serviceWorker 嘅 controllerchange（main.tsx 自己聽）。第一次開 app 時 register 冇 controller，
 * workbox 嘅 isUpdate 一直係 false，library 唔會 call onNeedReload，頁面停喺舊版。
 * 自己發過 SKIP_WAITING，或者知道有新版等緊（另一個 tab 先換咗）先當係換版；
 * 兩樣都冇（第一次安裝 clientsClaim 接管）唔使 reload
 */
handleControllerChange = (): void => {
    // S-647：另一個 tab 啟用咗新版，今頁 applied 仲係 false 但 pendingAction 係 'refresh'
    if (this.applied || this.pendingAction !== undefined) {
        this.handleNeedReload();
    }
};
```

```ts
it('should reload after another tab activated the update on a first visit', () => {
    const h = createHarness();
    h.setPlaying(true);
    h.manager.handleNeedRefresh(); // 播緊：等緊，未 apply
    h.manager.handleControllerChange(); // 另一個 tab 發咗 SKIP_WAITING
    expect(h.deps.applyUpdate).not.toHaveBeenCalled();
    expect(h.deps.reload).not.toHaveBeenCalled();
    h.setPlaying(false);
    expect(h.deps.reload).toHaveBeenCalledTimes(1);
});
```

（`h.setPlaying(false)` 之後是否即刻 reload 取決於 harness 嘅 `hasRecording` / `isVisible` 預設；同現有 "should wait for playback to stop" test 一致即可。）

---

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 99/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "100%"
next_action: merge_develop
next_agent: quality-assurance
branch: "refactor/e2e/section-cleanup"
context: "Batch pass: 9f5da37 PWA first-visit controllerchange reload (A 99, S-647 suggestion: multi-tab first-visit residual gap, pre-existing) + 874a1fb e2e runSection closes section contexts (B 100); no C/W; stacked on fix/pwa/first-visit-reload; QA to run full unit + full e2e (expect 612 PASS) + swapped-build PWA regression"
```
