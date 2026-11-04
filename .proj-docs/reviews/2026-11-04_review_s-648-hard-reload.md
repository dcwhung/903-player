# Code Review — 2026-11-04 — S-648 Shift-reload 嘅 tab 搶輸 race 都 reload

- 審閱者：Code Reviewer（獨立角色，冇寫過呢個 commit）
- 流程：標準（/fix）
- 目標：`fix/pwa/s-648-hard-reload` → `bc6c1ee`（v1.21.8），base `origin/main` `1872914`
- 來源：S-648（`reviews/2026-11-04_review_cui-0017-pwa-update-e2e_batch.md`），方案 A 已獲用戶批准
- Design Origin：`none-required`（冇 `.tsx` UI / `.css` 改動；`main.tsx` 只係 SW 啟動次序）✅
- Review Item ID：`grep -rhoE "\b[CWS]-[0-9]{3}\b" .proj-docs` 證實最高 C-011 / W-520 / S-650；全 repo（除 `node_modules` / `dist` / `.git`）同 git log 冇人用過 S-651 起 / W-521 起。今次用 **S-651、S-652、S-653**（冇 C / W）
- 總評：**✅ pass（97）**。改法啱：喺 `registerSW` 之前用 `getRegistration()` 判斷，第一次開 app 時 registration 未存在或者 SW 仲喺 `installing`（`active` 係 `null`），所以上一份 review 擔心嘅「SW 喺 callback 前已 activate」誤判基本上冇咗。仍然有一個好窄嘅 race（第二個 tab / reload 撞正第一次安裝嘅 **activating** 階段）會多 reload 一次同一版，無害，開 S-651；改一行就封得到。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                  |
| ------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint src/main.tsx src/pwa/updateManager.ts src/pwa/updateManager.test.ts e2e/pwaUpdate.mjs` exit 0；`prettier --check`（同上 + `package.json`）全部合規        |
| Type check    | ✅ pass | `npx tsc --noEmit -p tsconfig.app.json` exit 0                                                                                                                        |
| Tests         | ✅ pass | `npx vitest run src/pwa/updateManager.test.ts src/e2eSection.test.ts src/e2eSrcConstants.test.ts` → 3 files / 67 tests passed（只跑相關；full unit + full e2e 交 QA） |
| Coverage      | ✅ pass | `src/pwa/updateManager.ts`：Lines 100%、Statements 100%、Functions 100%、Branches 97.72%（`main.tsx` 係 entry，一向由 e2e 覆蓋）                                      |
| No Critical   | ✅ pass | 0 個 🔴                                                                                                                                                               |
| Security scan | n/a     | 冇新增依賴（`package-lock.json` 只改 version）                                                                                                                        |

### Version bump

`package.json` / `package-lock.json` 1.21.7 → 1.21.8 ✅

---

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                             |
| -------- | ------ | ------- | ------------------------------------------------ |
| 正確性   | 24     | 25      | S-651 activating 階段嘅窄 race（多 reload 一次） |
| 安全性   | 20     | 20      |                                                  |
| 可維護性 | 19     | 20      | S-652 `updateSW?.` 靜靜雞 no-op                  |
| 測試覆蓋 | 14     | 15      | S-653 `detectHardReload` 判斷式冇 unit test      |
| 性能     | 10     | 10      | 多一個 `getRegistration()` IPC，可忽略           |
| 代碼風格 | 10     | 10      |                                                  |
| **總分** | **97** | **100** |                                                  |

**結果：✅ pass**

---

## 改動清單

- `src/pwa/updateManager.ts`：`markControlled()` → `hasSeenController = true`
- `src/main.tsx`：`detectHardReload()`（冇 controller → `getRegistration()` → 有 `active` 就 `markControlled()`）；`registerSW` 搬去 `detectHardReload().finally(...)`，`updateSW` 改 `let`，`applyUpdate` 用 `updateSW?.(true)`
- `src/pwa/updateManager.test.ts`：`markControlled` 兩個 test（即刻 reload / 播緊等停先 reload）
- `e2e/pwaUpdate.mjs`：抽 `openRaceWinner` / `raceReloads`；新 `checkHardReload`（CDP `Page.reload { ignoreCache: true }`，斷言 B 冇 controller）；`checkFirstVisit` 加「第一次安裝接管唔 reload」斷言

---

## Caller 關注點逐項核實

| 關注點                                                | 結果                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 真第一次開（冇任何 registration）                     | ✅ `getRegistration()` → `undefined` → 唔 mark；`registerSW` 喺之後先行，所以自己嘅 register 唔會令自己誤判。e2e `checkFirstVisit` 新斷言（load 1 次）同 mutation（mark 晒所有未受控 load → load 2 次）證實。                                                                                                                                                                                                                                                                                                      |
| 第二個 tab 喺第一個 tab 嘅 SW **installing** 期間開   | ✅ registration 存在但 `active === null`（precache 未完）→ 唔 mark；之後 claim → 當第一次安裝，唔 reload。                                                                                                                                                                                                                                                                                                                                                                                                         |
| 第二個 tab / 第一次開時 reload 撞正 SW **activating** | ⚠️ **S-651**。SW spec Activate：先 `registration.active = worker`、state `activating`，再 dispatch `activate`（workbox `clientsClaim` 喺 listener 入面 call `clients.claim()`）。如果 B 嘅 `getRegistration()` 喺呢個空隙 resolve，就會 `markControlled()`，跟住 claim 嘅 controllerchange 當換版 → 多 reload 一次（同一版本、經 `handleNeedReload`：播緊唔 reload、`reloadOnce`、reload 後已受控所以冇 loop）。窗口係 ms 級，影響無害，但 `main.tsx` 註解同 commit message「一定查唔到 registration」講得太絕對。 |
| 舊部署 / 唔同 SW script 留低嘅 registration           | ✅ 同 scope 有 active worker 嘅話，正常 navigation 一定受控（`controller` 非 null → 早 return，同改之前 `controlledAtLoad` 一樣）；淨係 bypass（Shift-reload / DevTools bypass）先會未受控而有 active，呢個正正係要捉嘅情況。之後 `registerSW` 換 script URL → 新 SW 喺 waiting → 照行 `onNeedRefresh`。                                                                                                                                                                                                           |
| Scope mismatch                                        | ✅ `getRegistration()` 冇參數 = 用 document URL 搵最長 scope match，同瀏覽器揀 controller 嘅規則一樣；match 到就一定會控制正常 navigation。（同 origin 有 root-scope 嘅其他 app SW 嘅話，頁面一開就受控、`controlledAtLoad` 已經係 true —— 改之前已經係咁，唔係今次 regression。）                                                                                                                                                                                                                                 |
| Hard reload 前已部署（頁面由 network 載到新版）       | ✅ 可接受：舊 SW 仍 active → mark；新 SW 裝好 → 自己 `onNeedRefresh` 或另一個 tab 搶先 → reload 去**同一版**一次。S-648 原文已指出「忽略反而啱」，而家變成多 reload 一次，無害、受播放規則保護。S-651 方案 A 順帶令「新 SW 啱啱 activating 時 hard reload」唔 mark（頁面已經係新版，忽略正確）。                                                                                                                                                                                                                   |
| `registerSW` 延後一個 `getRegistration()`             | ✅ `registerSW` 本身已經係 async（`await import('workbox-window')`），多一個 registration lookup 可以忽略。`onRegisteredSW` / `startUpdateChecks` 照樣喺 register 完先行；`immediate: true` 不變。                                                                                                                                                                                                                                                                                                                 |
| `applyUpdate` 喺 `updateSW` set 之前被 call           | ✅ 實際上去唔到：`apply()` 只喺 `pendingAction === 'refresh'` 先 call `applyUpdate`，而 `'refresh'` 淨係由 `onNeedRefresh`（即係 `registerSW` 內部）set；`startServiceWorker()` 同步 return，所以 callback 一定喺 assign 之後。但 `?.` 令將來錯誤次序靜靜雞 no-op 兼留低 `applied = true`（之後 `handleNeedRefresh` 全部 return）→ **S-652**。                                                                                                                                                                     |
| `getRegistration()` 期間另一個 tab skip-wait          | ✅ `controllerchange` listener 喺 module 同步加，唔使等 `registerSW`；未受控 → claim → 判斷照舊（mark 咗就 reload，未 mark 就當第一次安裝 —— 同 S-648 之前一樣）。                                                                                                                                                                                                                                                                                                                                                 |
| 冇 `serviceWorker` / 非 secure context                | ✅ `!serviceWorker` → return → `.finally` 照叫 `registerSW`，plugin 自己 `'serviceWorker' in navigator` 判斷 no-op。`getRegistration()` reject（例如 Firefox 某啲 privacy 設定 `SecurityError`）→ `.catch(() => undefined)` → 唔 mark、照 register。                                                                                                                                                                                                                                                               |
| `getRegistration()` 永遠唔 resolve                    | 觀察（唔開 ID）：spec 上唔會；未見過已知 bug（hang 嘅係 `.ready`）。真係 hang 會令 SW 唔 register，所以如果想穩陣可以加 timeout race；我唔建議為假設情況加複雜度。                                                                                                                                                                                                                                                                                                                                                 |

### PWA hard rule（global-rules §PWA Version & Self-Update Rule）

| 項目                                                                       | 結果                                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 版本號顯示（`package.json`，build time 注入）                              | ✅ 冇改動；version bump 1.21.8                                                                   |
| Update 偵測（啟動 + `visibilitychange` + interval 常數）                   | ✅ `startUpdateChecks` 冇改，仍喺 `onRegisteredSW` 啟動                                          |
| 自動 reload（waiting → SKIP_WAITING → controllerchange → reload，防 loop） | ✅ 今次補埋 hard reload 嘅 tab；全部經 `handleNeedReload` → `reloadOnce`；reload 後受控，冇 loop |
| 未儲存狀態保護                                                             | ✅ `reload` dep 先 `playerController.stop()`；播緊唔 reload（新 test 覆蓋）                      |
| `sw.js` / `index.html` 唔長 cache                                          | ✅ n/a（冇改 hosting / cache 設定）                                                              |
| Unit test（update handler）                                                | ✅ `markControlled` 2 個 test；`updateManager.ts` 100% lines                                     |
| Preview / 固定畫面 / viewport                                              | n/a（冇 UI 改動）                                                                                |

---

## 問題清單

### 🔴 Critical

冇。

### 🟡 Warning

冇。

### 🟢 Suggestion

#### 🟢 S-651 — 第一次安裝嘅 activating 空隙仍然可以誤 mark（註解講得太絕對）

- 位置：`src/main.tsx:48-61`（`detectHardReload` 同上面 JSDoc）
- 描述：`registration.active` 喺 worker 入 `activating` 時已經 set，早過 `activate` event 入面嘅 `clients.claim()`。第一次開 app 時，如果第二個 tab（或者第一個 tab reload）係 SW install 期間 navigate（所以未受控），而佢嘅 `getRegistration()` 啱啱喺 activating → claim 之間 resolve，就會 `markControlled()`，claim 嘅 controllerchange 被當換版 → 多 reload 一次。註解「第一次開 app 未 register，一定查唔到 registration」只係對「單一 tab」成立。
- 影響：ms 級窗口；同一版本 reload 一次，經 `handleNeedReload`（播緊唔 reload、`reloadOnce`），reload 後受控冇 loop。唔影響數據。
- 方案 A（推薦）：只認已經 activated 嘅 worker：
    ```ts
    if (existing?.active?.state === 'activated') {
        updateManager.markControlled();
    }
    ```
    優：一行；activating 期間唔 mark → claim 當第一次安裝（啱）；順帶「新 SW 啱啱 activating 時 Shift-reload」（頁面由 network 已經係新版）都唔 mark，亦係啱。缺：`activated` 同 claim 嘅 controllerchange 之間仍有理論上嘅次序 race（workbox 冇 `waitUntil(claim)`，但 precache cleanup 嘅 `waitUntil` 通常長過 claim），窗口再細好多。
- 方案 B：再加 navigation type：`performance.getEntriesByType('navigation')[0]?.type === 'reload'` 先 mark（Shift-reload 係 `reload`，新開 tab 係 `navigate`）。優：「第二個 tab」情況完全排除。缺：第一次開時普通 reload 撞正 activating 仍然可能；多一個 API 依賴（舊 Safari 冇 Navigation Timing L2 要 fallback）。
- 推薦：A，並將註解改成「單一 tab 第一次開查唔到；其他 tab 令 SW 仲喺 activating 嘅唔算」。

#### 🟢 S-652 — `updateSW?.(true)` 喺次序錯時靜靜雞 no-op 兼卡死 `applied`

- 位置：`src/main.tsx:23`、`:78-81`
- 描述：而家去唔到（見上表），但如果將來有人喺 register 前 call `handleNeedRefresh` / 令 `apply()` 行 `'refresh'`，`applied` 會變 true 而 SKIP_WAITING 冇發，之後 `handleNeedRefresh` 全部 return → 停喺舊版、冇 error。
- 方案 A（推薦）：唔好 gate `registerSW`：同步 `const updateSW = registerSW(...)`，`detectHardReload()` 同時 fire（`void detectHardReload()` 寫喺 `registerSW` **之前**，令 `getRegistration()` 先入 queue）。第一次安裝嘅 SW 要 precache 完先有 `active`，所以並行都唔會令真第一次開誤判；`updateSW` 返去 `const`，冇 `?.`。缺：「先查再 register」嘅次序保證由 spec 嚴格順序變成實際時間差（install 要秒級），要喺註解講清楚。
- 方案 B：保留現狀，喺 `applyUpdate` 加註解說明點解一定已 set（或者 `updateSW` 未 set 就唔 set `applied`，要改 `UpdateManager` 介面）。
- 推薦：B（最細）；如果做 S-651 順手可以考慮 A。

#### 🟢 S-653 — Hard reload 判斷式冇 unit test

- 位置：`src/main.tsx:52-61`
- 描述：`markControlled` 有 test，但「冇 controller + registration 有 active（+ S-651 嘅 state）」呢個判斷淨係 e2e 覆蓋；S-651 呢類邊界（activating / installing / reject）e2e 好難整。
- 方案 A（推薦）：抽 `isHardReload(container: Pick<ServiceWorkerContainer, 'controller' | 'getRegistration'> | undefined): Promise<boolean>` 去 `src/pwa/updateManager.ts`，unit test：冇 container、有 controller、冇 registration、`installing` only、`active` activating、`active` activated、reject。
- 方案 B：維持 e2e only，喺 e2e 加「B 喺 A install 期間開」情境。缺：時序難控制、慢。
- 推薦：A。

### 觀察（唔開 ID、唔扣分）

- `e2e/pwaUpdate.mjs:259`：`checkHardReload` 嘅 `};` 同下一個 JSDoc 之間少咗一行空行（Prettier 唔理，其他 function 之間都有）。
- `hardReload` 用 CDP `Page.reload ignoreCache` 加 `uncontrolled` 斷言，確保情境真係成立，唔會因瀏覽器行為變咗而白白 pass —— 好。

---

## TDD

單一 commit（測試同實作一齊），commit message 提供紅綠證據：冇修正 `checkHardReload` 4/4 fail（「B 冇 controller（true）… B 0」），有修正 4/4 pass；mutation（mark 晒所有未受控 load）被 `checkFirstVisit` 新斷言捉到（load 2 次）。接受。

---

## ✅ 做得好嘅地方

- 判斷時機揀得啱：放喺 `registerSW` 之前，直接避開上一份 review 方案 A 嘅主要缺點（自己 register 完 SW 已 activate 嘅誤判）。
- `markControlled` 只改 `hasSeenController`，reload 照走 `handleNeedReload` → 播放保護、grace、`reloadOnce` 全部沿用，冇開新路徑。
- e2e 抽 `openRaceWinner` / `raceReloads` 令兩個 race 情境共用同一個 deterministic setup；`checkFirstVisit` 加負向斷言，令「過度 mark」嘅 mutation 有得捉。
- 錯誤處理完整：`getRegistration` reject、冇 `serviceWorker` 都會照 register。

---

## 修正優先順序

| 優先 | ID    | 內容                                    | 可否 defer |
| ---- | ----- | --------------------------------------- | ---------- |
| 1    | S-651 | `active.state === 'activated'` + 改註解 | 可         |
| 2    | S-653 | 抽 `isHardReload` + unit test           | 可         |
| 3    | S-652 | `updateSW` 註解或改並行 register        | 可         |

---

## 修訂後代碼（節錄，`src/main.tsx`，S-651 方案 A）

```ts
/**
 * Shift-reload：頁面冇 controller，但 SW 一早 activated（S-648）。要喺 registerSW 之前查：
 * 單一 tab 第一次開 app 未 register，查唔到 registration；
 * 其他 tab 令 SW 仲喺 installing / activating（claim 未到）嘅唔算，否則會將第一次安裝誤當換版（S-651）
 */
const detectHardReload = async (): Promise<void> => {
    const serviceWorker = navigator.serviceWorker;
    if (!serviceWorker || serviceWorker.controller) {
        return;
    }
    const existing = await serviceWorker.getRegistration().catch(() => undefined);
    // activating 時 registration.active 已經 set，但 clients.claim() 未做：唔可以當見過 controller
    if (existing?.active?.state === 'activated') {
        updateManager.markControlled();
    }
};
```

---

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 97/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "100%"
  no_critical: pass
  security_scan: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "fix/pwa/s-648-hard-reload"
context: "bc6c1ee (v1.21.8) S-648 hard-reload tab now reloads after losing the skip-waiting race: 97 pass, 0 C / 0 W. Suggestions (deferrable, one commit per ID if taken): S-651 only mark when registration.active.state === 'activated' (a 2nd tab whose getRegistration resolves while the first-install SW is activating gets one harmless same-build reload) and soften the 'can never see a registration' comment; S-652 updateSW?. silently no-ops / leaves applied=true if order ever changes; S-653 extract isHardReload predicate for unit tests. QA: full unit + full e2e + manual desktop Shift-reload + two-tab update check."
blockers: []
```
