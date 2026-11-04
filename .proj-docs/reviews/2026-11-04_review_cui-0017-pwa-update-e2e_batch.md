# Batch Review — 2026-11-04 — CUI-0017 兩個 tab 換版 + PWA 換版 e2e

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 流程：標準（/fix + test），Batch 模式（2 個 fix）
- 目標（stacked，base `origin/main` `5ddbaeb`）：
    - Section A：`fix/pwa/cui-0017-two-tab-reload` → `8593986`（v1.21.6）
    - Section B：`feature/e2e/pwa-update` → `401918b`（v1.21.7，喺 A 上面；審閱時 checkout 呢個 branch）
- Design Origin：`none-required`（冇 `.tsx` UI / `.css` 改動；`main.tsx` 只加一個 dep 欄位）✅
- Review Item ID：`grep -rhoE "\b[CWS]-[0-9]{3,4}\b" .proj-docs/reviews/` 證實最高 C-011 / W-518 / S-647；全 repo（除 `node_modules` / `dist`）冇人用過 S-648 起 / W-519 起。今次用 **W-519、W-520、S-648、S-649、S-650**（冇 C）
- 總評：**整體 ⚠️ warn**（A 99 pass / B 88 warn）。A 嘅根因分析同 workbox-window 7.4 原始碼吻合，修正細、全部經 `handleNeedReload`（播放保護 + `reloadOnce`），冇 reload loop、冇播緊 reload。剩一個窄嘅殘餘洞（hard reload 嘅頁）開 S-648。B 嘅 e2e 有用、mutation-check 過，但「播緊唔 reload」嗰個負向斷言可以喺更新未偵測到時白白 pass（W-519），而自己開嘅 static server 聽晒所有 interface 兼有 path traversal（W-520）。

---

## 整體 verdict

- 涵蓋 commit：`8593986`、`401918b`
- Status：⚠️ warn（Section B warn）

### Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                         |
| ------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint src/main.tsx src/pwa/updateManager.ts src/pwa/updateManager.test.ts e2e/pwaUpdate.mjs e2e/run.mjs` exit 0；`npx prettier --check`（同上 + `package.json`）全合規                 |
| Type check    | ✅ pass | `npx tsc -b --noEmit` exit 0                                                                                                                                                                 |
| Tests         | ✅ pass | `npx vitest run src/pwa/updateManager.test.ts src/e2eSection.test.ts src/e2eSrcConstants.test.ts`：3 files / 65 tests 全綠（full unit / full e2e 由 QA 跑；developer 報 e2e 617 / 0）        |
| Coverage      | ✅ pass | `src/pwa/updateManager.ts`：Stmts 100% / Branch 97.72% / Funcs 100% / Lines 100%（唯一未覆蓋 branch L170 係舊有 `Math.max`）；新 `hasSeenController` 三條路（載入有 / 冇 / 第二下）都有 test |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                       |
| Security scan | ✅ n/a  | 冇依賴改動（`package-lock.json` 只改 version）                                                                                                                                               |

### Version bump

- A：1.21.5 → 1.21.6 ✅（`8593986` 內 `package.json` + `package-lock.json` 一致）；B：1.21.6 → 1.21.7 ✅

---

## Section A — `8593986` fix(pwa)：搶輸 skip-waiting 嘅 tab 都 reload（CUI-0017）

### 改動清單

- `src/pwa/updateManager.ts`：`UpdateManagerDeps.controlledAtLoad: boolean`；private `hasSeenController`（constructor 由 dep 初始化）；`handleControllerChange` 改為 `isUpdate = hasSeenController || applied || pendingAction !== undefined`，之後 `hasSeenController = true`，係 update 就 `handleNeedReload()`
- `src/main.tsx`：`controlledAtLoad: Boolean(navigator.serviceWorker?.controller)`（喺 `new UpdateManager(...)` 入面讀，早過 `registerSW`）
- `src/pwa/updateManager.test.ts`：harness 預設 `controlledAtLoad: false`；新 `describe` 3 個 test（載入有 controller + 冇錄音即刻 reload；載入有 controller + 播緊等停 + grace + 收埋；第一次開第一下忽略、第二下 reload）

### 根因核實（`node_modules/workbox-window/Workbox.js`、`vite-plugin-pwa/dist/client/build/register.js`）

- `Workbox.js:19` `WAITING_TIMEOUT_DURATION = 200`；L156 `if (state === 'installed' && registration.waiting === sw)` 先 dispatch `waiting` ✅
- L80–93：`updatefound` 喺 `register()` 後 60 s 內、`_updateFoundCount === 0`、script URL 一樣 → 當自己嘅 SW（行 `waiting` 200 ms 路）；否則 external → `installed(isExternal)` 即刻 `showSkipWaitingPrompt` ✅
- `register.js`：prompt 模式 `controlling` listener 只喺 `showSkipWaitingPrompt` 入面加 → 冇 `onNeedRefresh` 就冇 `onNeedReload` ✅
- 補充：實際用戶多數係 30 分鐘 interval / 返前景（>60 s）先搵到更新，行 external 路冇 200 ms delay，所以 CUI-0017 喺真實環境主要出現喺「開 app 後 60 s 內搵到更新」。修正兩條路都啱。

### 針對 caller 提出嘅風險逐項核實

| 風險                                          | 結論                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reload loop                                   | ✅ 冇。`controllerchange` 只喺有新 SW activate 先 fire；reload 後新頁由最新 SW 控制，冇再 activate 就冇下一下。同頁多次 → `reloadOnce`。library `onNeedReload` + 自己 listener 雙觸發都只係同一個 `handleNeedReload`（舊 test 已覆蓋）。DevTools「Update on reload」喺 navigation 前已換好 SW，新頁一開始就受新 SW 控制，唔會 loop。 |
| 播緊 reload                                   | ✅ 唔會。新路徑 `applied = false` → `handleNeedReload` 一定行 `pendingAction = 'reload'` + `canApply`（播緊 false；有錄音要 grace + 收埋 / 啱啱返前景）。新 test「wait for stop + grace + hidden」覆蓋。                                                                                                                             |
| `controller` 喺 `registerSW` 之前讀           | ✅ 可靠。同一個同步 module body，object literal 喺 `registerSW(...)` 之前 evaluate；而且 `registerSW` 自己 `await import('workbox-window')` 先 register，所以就算擺後少少都唔會撞。真正嘅限制係「唔可以喺任何 `await` 之後讀」，註釋講「registerSW 之前」都算準。                                                                    |
| navigation 之後、module 行之前被 claim        | ✅ 安全。controllerchange 喺 listener 加之前已 fire（miss 咗），頁面 `controlledAtLoad = true`；之後只有真正嘅新版先再 fire。來源係另一個 tab 第一次安裝 → 同版本，冇 reload 正確。                                                                                                                                                  |
| 另一個 tab 第一次安裝時開嘅 tab（未受控）     | ✅ 第一下 claim 忽略、之後換版 reload（新 test 第 3 個）。                                                                                                                                                                                                                                                                           |
| Hard reload（未受控但 SW 已 active）          | ⚠️ 殘餘窄洞，見 **S-648**。                                                                                                                                                                                                                                                                                                          |
| 冇 SW / 非 secure context                     | ✅ `navigator.serviceWorker?.controller` → `false`；listener 亦用 `?.`。                                                                                                                                                                                                                                                             |
| 載入有 controller、有錄音、前景、停咗未夠 60s | ✅ `canApply` false → `scheduleWhileHidden` 前景唔 schedule；前景永遠唔因 timer reload（舊規則不變）。                                                                                                                                                                                                                               |

### PWA hard rule（global-rules §PWA Version & Self-Update Rule）

| 項目                                                                       | 結果                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 版本號顯示（`package.json`，build time 注入）                              | ✅ 冇改動                                                                                 |
| Update 偵測（啟動 + `visibilitychange` + interval 常數）                   | ✅ 冇改動（`startUpdateChecks`）                                                          |
| 自動 reload（waiting → SKIP_WAITING → controllerchange → reload，防 loop） | ✅ 今次補返「搶輸 race 嘅 tab」；`reloadOnce` 防 loop                                     |
| 未儲存狀態保護                                                             | ✅ `reload` dep 先 `playerController.stop()`（pause + persist）；播緊唔 reload            |
| `sw.js` / `index.html` 唔長 cache                                          | ✅ n/a（冇改 hosting；GitHub Pages `max-age=600`，SW 主 script update 預設 bypass cache） |
| Test                                                                       | ✅ 3 個新 unit test + Section B e2e                                                       |

### 發現

#### 🟢 S-648 — Hard reload（Shift-reload）嘅頁，搶輸 race 時仍然停喺舊版

- 位置：`src/main.tsx:43`、`src/pwa/updateManager.ts:118`（`handleControllerChange`）
- 描述：Shift-reload 由 network 載入、頁面**唔受控**，但 registration 已經有 active SW → `controlledAtLoad = false`。之後部署新版：`clients.claim()` 會接管呢個未受控嘅頁，所以佢第一下 controllerchange 其實係**換版**（v_old → v_new），唔係第一次安裝。如果呢個 tab 冇收過 `onNeedRefresh`（另一個 tab 喺 200 ms 入面搶先 SKIP_WAITING，即係 CUI-0017 同一個 race），`applied` / `pendingAction` 都冇 → 當第一次安裝忽略 → 停喺舊版（之後 `hasSeenController = true`，再下一版先會換）。
- 影響：要同時滿足「hard reload」+「部署發生喺 hard reload 之後」+「開 app 60 s 內搵到更新」+「搶輸 race」；standalone PWA（iOS / Android 主畫面）冇 Shift-reload，所以實際只影響 desktop 瀏覽器分頁。冇 error、下次開就新版。（如果部署喺 hard reload 之前，頁面已經係 network 最新版，忽略反而啱。）
- 方案 A：喺 `onRegisteredSW` 判斷「register 完已經有 active SW 但頁面未受控」→ 當見過 controller：
    - 加 `UpdateManager.markExistingWorker = (): void => { this.hasSeenController = true; }`；`main.tsx` `onRegisteredSW` 入面 `if (swRegistration.active && !navigator.serviceWorker.controller) updateManager.markExistingWorker();`
    - 優：細、可 unit test；覆蓋 hard reload。缺：第一次安裝時如果 SW 喺 `register()` resolve 前已經 activate（極快），之後嗰下 claim 會多 reload 一次（同版本、一次、仍受播放規則保護），無害。
- 方案 B：controllerchange 時比較 controller 嘅 build 版本（例如 SW `postMessage` 回 `__APP_VERSION__`，同頁面嘅版本比較），唔同先 reload。
    - 優：語意最準（hard reload 載到新版就唔使 reload）。缺：要改 SW（`injectManifest` 或加 message handler）+ async 協議，改動大好多。
- 推薦：A；可以留到下一個 patch（同 S-647 一樣，唔係 regression，改之前已經係咁）。

### 評分

| 維度     | 得分   | 滿分    | 備注                                                     |
| -------- | ------ | ------- | -------------------------------------------------------- |
| 正確性   | 24     | 25      | S-648（hard reload 殘餘窄洞）                            |
| 安全性   | 20     | 20      |                                                          |
| 可維護性 | 20     | 20      | 狀態單一 flag，判斷集中喺一處，全部經 `handleNeedReload` |
| 測試覆蓋 | 15     | 15      | 3 個新 test 對應 ticket 驗證方式；coverage 100% lines    |
| 性能     | 10     | 10      |                                                          |
| 代碼風格 | 10     | 10      | JSDoc 清楚交代 workbox 200 ms 行為同 CUI-0017            |
| **總分** | **99** | **100** |                                                          |

**結果：✅ pass**

### TDD

- 單一 commit（test + 實作一齊）。新 describe 嘅第 1、2 個 test 喺舊代碼必然紅（`controlledAtLoad` 冇作用，controllerchange 被忽略）；第 3 個喺舊代碼第二下亦會忽略 → 紅。另有 developer 嘅 mutation check（拎走 CUI-0017 條件 → e2e two-tab FAIL）。接受，同之前 review 一致。

---

## Section B — `401918b` test(e2e)：PWA 換版 e2e（第一次開 / 返嚟 / 兩個 tab / 播緊）

### 改動清單

- `e2e/pwaUpdate.mjs`（新，222 行）：自己嘅 static server（port 0，serve `dist/`，`no-cache`，`sw.js` 尾加 `// e2e revision N`）；`openTab` 數 `load`；4 個情境逐個 `section`
- `e2e/run.mjs`：import + `await runPwaUpdateChecks({ browser, errors, log }, section)`

### Caller 關注點核實

| 關注點               | 結論                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cleanup on failure   | ✅ 每個情境包 `section` → `runSection` `finally` 閂期間新開嘅 context（`ctx.close()` 唔喺 `finally` 都冇問題）；server `close()` 喺 `finally`，Node 22 `close()` 會閂 idle keep-alive，context 已閂所以唔會 hang。                                                                                                                                                                                                                                       |
| 固定等待             | `NO_SECOND_RELOAD_MS` 3 s（負向 loop guard，CPU 慢只會 false-pass 唔會 false-fail，可接受）；`PLAYING_HOLD_MS` 4 s 負向斷言可以喺更新未偵測到時白 pass → **W-519**。                                                                                                                                                                                                                                                                                     |
| 假時鐘 + 真 SW       | `clock.install` 唔暫停，workbox 200 ms timer 跟真實時間行 ✅。`fastForward` 同時推 `performance.now()` → 如果 `updatefound` 遲過快轉先到，workbox 當 external（冇 200 ms）—兩條路都會 `onNeedRefresh`，唔影響結果。播緊情境入面 `checkForUpdate` resolve 時 SW 多數仲喺 installing，即係第一次 61 s 快轉大概率喺 `pendingAction` 未 set 之前發生（「過咗 grace」部分其實冇驗到，見 W-519）。停播之後嗰段：`onNeedRefresh` 早過或遲過快轉都會 apply，穩。 |
| Two-tab 決定性       | A、B 都喺 60 s 內 register → 兩邊都行 200 ms `waiting` 路，race 結果由毫秒級決定；對「修正有效」嘅驗證係穩定（有修正兩個都 reload），但作為 mutation detector 有機會偶爾漏報（ticket 實測 3/3、4/4 都撞到，接受）。                                                                                                                                                                                                                                      |
| Static server 忠實度 | Base path `/903-player/` 同 GitHub Pages build 一致 ✅；hash routing 冇 SPA fallback 需要 ✅。`no-cache` 同 Vercel（`max-age=0, must-revalidate`）近似，但同 GitHub Pages（`max-age=600`）唔同，註釋「同 hosting 規則一樣」唔準；只改 `sw.js` 註解 = precache manifest 同 asset hash 全部唔變，冇驗到 lazy chunk 換 hash → **S-649**。                                                                                                                   |
| Server 安全          | `listen(0)` 綁 `0.0.0.0`（實測 `{ address: '0.0.0.0' }`），`decodeURIComponent` 喺 URL normalize 之後先做 → `/903-player/..%2F..%2F..%2Fetc%2Fpasswd` 可讀 `dist` 以外檔案 → **W-520**。                                                                                                                                                                                                                                                                 |

### 發現

#### 🟡 W-519 — 「播緊唔 reload」負向斷言冇確認更新已經到，可以白白 pass

- 位置：`e2e/pwaUpdate.mjs:186-196`（`checkPlaying`）
- 描述：`checkForUpdate` 只等 `registration.update()` resolve（spec 上喺 installing worker set 好就 resolve，install / 200 ms waiting / `onNeedRefresh` 仲未發生）。之後即刻 `setHidden` + `fastForward(61 s)` + 等 4 s，然後斷言 `loads === before`。如果 CI 慢、4 s 內 `onNeedRefresh` 未到，斷言照 pass，但「播緊時有新版都唔換」其實冇被驗過；而且大部分情況快轉喺 `pendingAction` set 之前發生，「收埋過咗 grace」嗰部分（`scheduleWhileHidden` timer 路）亦冇真正被行過。
- 影響：保護「播緊唔打斷」呢條 PWA hard rule 嘅 e2e 喺 CPU 爭用時會 false-pass（同 S-579 一類問題）。Developer mutation check 本機有紅，所以而家有效，但冇保證。
- 方案 A：快轉之前等 SW 去到 waiting，hold 完再斷言仍然 waiting（證明更新到咗而且被 hold 住）：
    - 優：細、確定性高；同時證明「有新版喺度但冇 apply」。缺：多兩個 evaluate。
- 方案 B：`addInitScript` 包 `ServiceWorkerContainer` / 暴露 `window.__e2eNeedRefresh` 等 app 真係收到 `onNeedRefresh`。
    - 優：直接等 app 層事件。缺：要 hook app 內部或者加 test-only 全域，侵入性高。
- 推薦：A（見下面修訂代碼）。

#### 🟡 W-520 — e2e static server 聽晒所有 interface，兼有 path traversal

- 位置：`e2e/pwaUpdate.mjs:46,53,64`
- 描述：`server.listen(0, resolve)` 綁 `0.0.0.0`；`pathname` 係 WHATWG normalize 之後再 `decodeURIComponent`，`%2F` 編碼嘅 `..` 唔會被 normalize，`join(DIST, '../../..')` 就走出 `dist/`。實測 `/903-player/..%2F..%2F..%2Fetc%2Fpasswd` → `/home/etc/passwd`（再多一層就係 `/etc/passwd`）。另外 malformed `%` 會令 `decodeURIComponent` throw，async handler 變 unhandled rejection（Node 22 預設會令 process crash）。
- 影響：e2e 跑緊嗰幾分鐘，同一網絡（例如咖啡店 Wi-Fi）入面掃到嗰個 random port 嘅人可以讀開發者 home 入面任何檔案（`.ssh`、`.npmrc` token 等）。只係 test code、唔會上 production，所以係 Warning 唔係 Critical。`run.mjs` 用嘅 `vite preview` 預設只聽 localhost，呢個 server 反而更開放。
- 方案 A：只聽 loopback + 驗證 resolve 後路徑喺 `DIST` 入面 + catch decode：
    - 優：三行改動，徹底堵死。缺：base 要用 `127.0.0.1`（同屬 potentially trustworthy origin，SW 照用得）。
- 方案 B：改用現成 `sirv` / `serve-handler`（已處理 traversal）。
    - 優：唔使自己維護。缺：新 devDependency，要附「新增依賴說明」。
- 推薦：A。

#### 🟢 S-649 — Static server 同 hosting 唔完全一樣，註釋講「同 hosting 規則一樣」唔準

- 位置：`e2e/pwaUpdate.mjs:2-3,40-41,54`
- 描述：GitHub Pages 對所有檔案發 `Cache-Control: max-age=600`，唔係 `no-cache`（SW 主 script update 預設 bypass HTTP cache，所以偵測結果一樣，但 `index.html` / asset 嘅 cache 行為唔同）。「換版」只改 `sw.js` 註解，precache manifest 同 asset hash 唔變，冇驗到 ticket 提到嘅「lazy chunk 換 hash 載唔到」嗰類問題。
- 方案 A：註釋改為「`no-cache` 近似 Vercel；GitHub Pages 係 `max-age=600`，SW update 預設 bypass HTTP cache 所以偵測行為一樣」，並寫明只模擬 SW byte 變化。
- 方案 B：加一個 `max-age=600` 模式再跑一次 first-visit 情境；或者 release 時同時改一個 precache entry 嘅 revision，令 install 真係重新 fetch。
- 推薦：A（而家）；B 留做將來加強。

#### 🟢 S-650 — Section label 用 function 名，`BASE_PATH` 同 `run.mjs` 重複

- 位置：`e2e/pwaUpdate.mjs:10,217`
- 描述：`section(\`PWA 換版：${check.name}\`)`出`PWA 換版：checkFirstVisit`呢類英文識別字，同其他 section（同埋`env.log` 入面「第一次開 app」）嘅中文 label 唔一致；FAIL 總結要識 code 先睇得明。`'/903-player/'`喺`run.mjs:42`同`vite.config.ts` 都有。
- 方案 A：`SCENARIOS` 改為 `[['第一次開 app', checkFirstVisit], ...]`，`homeWide.mjs` 已經係咁寫。
- 方案 B：每個 check function 加 `label` 屬性。
- 推薦：A；`BASE_PATH` 可以由 harness export 一個（或者喺 `e2eSrcConstants.test.ts` 鎖住）。

### 評分

| 維度     | 得分   | 滿分    | 備注                                          |
| -------- | ------ | ------- | --------------------------------------------- |
| 正確性   | 24     | 25      | S-649（hosting 忠實度註釋）                   |
| 安全性   | 15     | 20      | W-520（0.0.0.0 + path traversal）             |
| 可維護性 | 20     | 20      | 獨立模組、port 0 唔撞 preview、常數有名有註釋 |
| 測試覆蓋 | 10     | 15      | W-519（播緊情境負向斷言可以白 pass）          |
| 性能     | 10     | 10      | 4 個情境約 2 分鐘內（61 s 用快轉）            |
| 代碼風格 | 9      | 10      | S-650                                         |
| **總分** | **88** | **100** |                                               |

**結果：⚠️ warn**

### TDD

- e2e commit 本身係測試；developer 提供 3 個 mutation check（拎走 CUI-0017 條件、拎走 controllerchange listener、拎走播放保護）各自令對應情境 FAIL，接受為紅綠證據。

---

## ✅ 做得好嘅地方（跨 fix 通用）

- 根因分析精準到 workbox 原始碼行號級別，修正只係一個 flag + 一行條件，冇 fork library、冇改 SW。
- 所有換版路徑都經 `handleNeedReload` → `canApply` → `reloadOnce`，播放保護同 loop guard 冇被繞過。
- E2E 用「數 `load` 次數」做斷言，同時驗「有 reload」同「只 reload 一次」；port 0 避免同 `vite preview` / 其他 worktree 撞（S-549 教訓）。
- 播緊情境用 `waitForPlaybackState('paused')` 而唔係固定 sleep 先快轉（S-579 教訓）。
- Mutation check 有交代，三個保護各自有對應紅燈。

## 修正優先順序

| 優先 | ID    | Section | 工作量 | 說明                                        |
| ---- | ----- | ------- | ------ | ------------------------------------------- |
| 1    | W-520 | B       | 5 min  | loopback + traversal guard + decode catch   |
| 2    | W-519 | B       | 10 min | 等 waiting SW 先快轉，hold 後斷言仍 waiting |
| 3    | S-650 | B       | 5 min  | section label 中文化                        |
| 4    | S-649 | B       | 2 min  | 註釋改準                                    |
| 5    | S-648 | A       | 20 min | 可留下一個 patch（舊有窄洞，非 regression） |

## 修訂後代碼（節錄，`e2e/pwaUpdate.mjs`）

```js
import { resolve, sep } from 'node:path';

// W-520：只聽 loopback；127.0.0.1 同 localhost 一樣係 potentially trustworthy，SW 照用得
const LOOPBACK_HOST = '127.0.0.1';

const startDistServer = async () => {
    let revision = 0;
    const server = createServer(async (req, res) => {
        let pathname;
        try {
            pathname = decodeURIComponent(new URL(req.url, 'http://e2e').pathname);
        } catch {
            res.writeHead(400).end(); // malformed %：唔好 unhandled rejection
            return;
        }
        if (!pathname.startsWith(BASE_PATH)) {
            res.writeHead(404).end();
            return;
        }
        const file = pathname.slice(BASE_PATH.length) || 'index.html';
        const absolute = resolve(DIST, file);
        // W-520：%2F 編碼嘅 .. 唔會被 URL normalize，要喺檔案系統層再擋
        if (!absolute.startsWith(resolve(DIST) + sep)) {
            res.writeHead(404).end();
            return;
        }
        // ...其餘同而家一樣，readFile(absolute)
    });
    await new Promise((done) => server.listen(0, LOOPBACK_HOST, done));
    return {
        base: `http://${LOOPBACK_HOST}:${server.address().port}${BASE_PATH}`,
        // ...
    };
};

/** W-519：新 SW 已裝好喺 waiting（app 嘅 onNeedRefresh 喺呢個之後 200 ms 內到） */
const hasWaitingWorker = (p) =>
    p.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting !== null);

const waitForWaitingWorker = (p) =>
    p.waitForFunction(
        async () => (await navigator.serviceWorker.getRegistration())?.waiting != null,
        undefined,
        { timeout: CONTROLLER_WAIT_MS },
    );

// checkPlaying 入面：
server.release();
await checkForUpdate(tab.p);
await waitForWaitingWorker(tab.p); // 確定有新版喺度先開始「播緊唔換」斷言
await setHidden(tab.p, true);
await tab.p.clock.fastForward(GRACE_PLUS_MS);
await tab.p.waitForTimeout(PLAYING_HOLD_MS);
const stillWaiting = await hasWaitingWorker(tab.p);
env.log(
    tab.loads === before && stillWaiting,
    `${label}：收埋 app 播緊嘢，過咗 grace period 都唔 reload（reload ${tab.loads - before} 次，新版仲等緊 ${stillWaiting}）`,
);

// S-650
const SCENARIOS = [
    ['第一次開 app', checkFirstVisit],
    ['返嚟嘅用戶', checkReturningVisit],
    ['兩個 tab（CUI-0017）', checkTwoTabs],
    ['播緊嘢', checkPlaying],
];
// for (const [name, check] of SCENARIOS) await section(`PWA 換版：${name}`, () => check(env, server));
```

（S-648 方案 A 節錄，`src/pwa/updateManager.ts` / `src/main.tsx`）

```ts
/** register 完已經有 active SW 但頁面未受控（hard reload）：之後嘅 controllerchange 係換版（S-648） */
markExistingWorker = (): void => {
    this.hasSeenController = true;
};

// main.tsx onRegisteredSW：
if (swRegistration.active && !navigator.serviceWorker.controller) {
    updateManager.markExistingWorker();
}
```

---

## Handoff receipt（Round 1，已被 Round 2 取代）

```handoff-receipt
protocol: 1
status: warn
score: 94/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "100%"
next_action: invoke_developer
next_agent: frontend-developer
branch: "feature/e2e/pwa-update"
context: "Batch warn: A 8593986 CUI-0017 two-tab reload pass 99 (S-648 hard-reload residual gap, pre-existing, can defer); B 401918b PWA update e2e warn 88 (W-519 playing negative assertion can pass before update is detected; W-520 e2e static server binds 0.0.0.0 with %2F path traversal; S-649, S-650). Fix W-520, W-519 on feature/e2e/pwa-update (one commit per ID), then re-review B; A may proceed. Overall score is the mean, per-section scores govern."
blockers:
  - "W-519 e2e/pwaUpdate.mjs:186-196 wait for registration.waiting before fastForward and assert still waiting after hold"
  - "W-520 e2e/pwaUpdate.mjs:46,53,64 listen on 127.0.0.1, reject paths resolving outside dist, catch decodeURIComponent"
```

---

## Round 2 — Section B re-review（`feature/e2e/pwa-update` HEAD `bcf8593`）

- 涵蓋 commit（全部喺 `401918b` 上面，一個 finding 一個 commit）：`07b8275`（W-520）、`88d90ed`（W-519）、`a224b40`（S-650）、`bcf8593`（S-649）
- Section A（`8593986`）冇改動，維持 99 pass；S-648 由 developer 決定 defer（理由：喺 `onRegisteredSW` 用 `registration.active` 判斷，SW 喺 callback 前已 activate 嘅真第一次開會多 reload 一次）。接受，記入 session log follow-up。

### Hard Gates（重跑）

| Gate          | 結果    | 證據                                                                                                                                                                                 |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint          | ✅ pass | `npx eslint e2e/pwaUpdate.mjs e2e/run.mjs src/main.tsx src/pwa/updateManager.ts src/pwa/updateManager.test.ts` exit 0；`npx prettier --check`（同上 + `package.json`）合規           |
| Type check    | ✅ pass | `npx tsc -b --noEmit` exit 0                                                                                                                                                         |
| Tests         | ✅ pass | `npx vitest run src/pwa/updateManager.test.ts src/e2eSection.test.ts src/e2eSrcConstants.test.ts`：3 files / 65 tests 全綠；developer 報 PWA section 5 / 5 PASS（full e2e 由 QA 跑） |
| Coverage      | ✅ pass | `src/pwa/updateManager.ts` 冇改動（lines 100% / branch 97.72%）                                                                                                                      |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                               |
| Security scan | ✅ n/a  | 冇依賴改動                                                                                                                                                                           |

### 逐項核實

| ID    | Commit    | 結果     | 核實                                                                                                                                                                                                                                                                                                                                                                                       |
| ----- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W-520 | `07b8275` | ✅ fixed | `server.listen(0, '127.0.0.1')`，base 改 `http://127.0.0.1:<port>/903-player/`（potentially trustworthy，SW 照用得）。`distFile()` decode 包 try/catch；`resolve(DIST, name).startsWith(DIST)`，`DIST` 帶尾 `/` → `dist-x` 唔會誤中。我用同一段邏輯 node 實測：`/903-player/`、`sw.js`、`%2E`、`assets/../sw.js` → dist 內；`..%2Fdist-x/a`、`..%2F..%2Fetc%2Fpasswd`、`%E0%A4%A` → null。 |
| W-519 | `88d90ed` | ✅ fixed | `waitForWaiting`（15 s，100 ms poll，等唔到返 `false` 唔 throw）喺 `setHidden` + `fastForward` 之前；hold 後 `readWaiting` 再讀；斷言 `detected && stillWaiting && loads === before`，log 帶 `（true → false）` 方便睇。等唔到 waiting 會明確 FAIL，唔再白 pass；developer mutation（拎走兩個播放保護）仍然 FAIL。                                                                         |
| S-650 | `a224b40` | ✅ fixed | `SCENARIOS` 改 `[label, check]` 中文 label，同 `homeWide.mjs` 一致。`'/903-player/'` 重複嗰點：`run.mjs` 嘅 `BASE` 係另一個 server（vite preview），同意唔使抽；no change needed。                                                                                                                                                                                                         |
| S-649 | `bcf8593` | ✅ fixed | 註釋寫明 no-cache 唔係模擬 hosting（Pages `max-age=600`）、`updateViaCache` 預設 `imports` 令 sw.js 檢查 bypass HTTP cache、lazy chunk 換 hash 唔喺範圍。準確。                                                                                                                                                                                                                            |

### 觀察（唔開 ID、唔扣分）

- 4 個 commit 冇 bump version，body 寫明「fixes review finding on 401918b (same session, same command)」→ 符合 `sw-git-flow` §Version Bump 例外 ✅。
- Commit subject 冇帶 review ID（ID 喺 body 第一行）；之前 main 上嘅慣例係 subject 尾 `(S-643)`。可追溯，但下次建議放返 subject，方便 `git log --oneline` grep。
- `DIST = new URL('../dist/', import.meta.url).pathname` 喺路徑有空格 / 非 ASCII 時會係 percent-encoded（`fileURLToPath` 先啱）；`401918b` 已經係咁，本 repo 路徑冇呢個問題。

### Section B 評分（Round 2）

| 維度     | 得分    | 滿分    | 備注                             |
| -------- | ------- | ------- | -------------------------------- |
| 正確性   | 25      | 25      | S-649 註釋改準                   |
| 安全性   | 20      | 20      | W-520 loopback + traversal guard |
| 可維護性 | 20      | 20      | `distFile` 抽出，邏輯清楚        |
| 測試覆蓋 | 15      | 15      | W-519 負向斷言有前提 + 事後確認  |
| 性能     | 10      | 10      |                                  |
| 代碼風格 | 10      | 10      | S-650 中文 label                 |
| **總分** | **100** | **100** |                                  |

**結果：✅ pass**

### 整體 verdict（Round 2）

- A 99 pass（S-648 deferred）/ B 100 pass → **Batch ✅ pass**（hard gates 全 pass、冇 Critical、冇未處理 Warning）

## Handoff receipt（Round 2）

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
branch: "feature/e2e/pwa-update"
context: "Batch pass (round 2): A 8593986 CUI-0017 two-tab reload 99 pass (S-648 hard-reload residual deferred to session-log follow-up); B 401918b + 07b8275 (W-520) + 88d90ed (W-519) + a224b40 (S-650) + bcf8593 (S-649) PWA update e2e 100 pass. Stacked: fix/pwa/cui-0017-two-tab-reload then feature/e2e/pwa-update. QA to run full unit + full e2e + two-tab swapped-build PWA regression."
```
