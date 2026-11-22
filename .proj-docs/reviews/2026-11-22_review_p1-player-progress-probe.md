# Code Review — P1 player 進度同 probe store（AU-026、AU-027）

- **日期**：2026-11-22
- **審閱者**：Code Reviewer（獨立，冇寫過呢段 code）
- **目標**：branch `fix/player/au-026-027_progress-probe-store`，base `5bc0dba`
    - Round 1：`1c818fb`（AU-026）、`fd6e8f5`（AU-027）
    - Round 2：`6138642`（W-859）、`db4f59a`（S-1421、S-1422）
    - Round 3：`de46eb0`（S-1423）
- **Tier**：T1（PATCH，player 單一模組 × 2）
- **總評**：✅ pass（Round 3）。Round 1 係 ⚠️ warn（W-859）；Round 2 確認 W-859、S-1421、S-1422 已修；Round 3 確認 S-1423 已修，冇新嘅 🔴 / 🟡。

## Hard Gates

all pass（lint、`tsc -b`、相關 unit test、coverage、no Critical；冇新依賴）。三輪都係。

## 評分結果（Round 3）

| 維度     | 得分    | 滿分    | 備注                                              |
| -------- | ------- | ------- | ------------------------------------------------- |
| 正確性   | 25      | 25      | Round 1 因 W-859 係 20                            |
| 安全性   | 20      | 20      | 帶返落 storage 嘅項目照驗 origin / 日期 / 時間    |
| 可維護性 | 20      | 20      |                                                   |
| 測試覆蓋 | 15      | 15      |                                                   |
| 性能     | 10      | 10      | fallback session 每次寫多讀一次 storage，可以接受 |
| 代碼風格 | 10      | 10      |                                                   |
| **總分** | **100** | **100** | Round 1：95                                       |

**結果：✅ pass**

## Section A — AU-026

### 🟡 W-859（Round 1 提出，Round 2 ✅ 已修）— 冇「播緊嘅 timeupdate」時，停低 / 離開頁面嗰下唔存進度

（Round 1 報告叫 W-858；同另一份 review 撞號，改為 W-859。）

- **L1**：AU-026 方案 A（真係聽過嘅一定要存）；HTML spec pause steps 係 `paused` 變 `true` → `timeupdate` → `pause`
- **L2**（臨時 test；`5bc0dba` 全過，`fd6e8f5` fail）：P1 spec 次序暫停、P2 播緊未有 timeupdate 就 `pagehide`、P3 鎖屏播完再暫停，進度都冇存
- **L3**：停低嗰下嘅 `timeupdate` 到時已經暫停，唔叫 `notePlayed()` 但照更新 `state.currentTime`，`onPause` 再比較就相等；`persist()` 冇補睇位置
- **修正（`6138642`，方案 A）**：`notePlayedIfPlaying()`（`state.isPlaying || !audio.paused`）用喺 `onTimeUpdate` 同 `persist()` 開頭；`FakeAudio.pause()` 先發 `timeupdate` 再發 `pause`；加 7 個 test。

### Round 2 驗證

- 我嘅 P1 / P2 / P3 / P4 喺 `6138642` 嘅 controller 全過；喺 `fd6e8f5` 嘅 controller P1 / P2 / P3 照 fail（即係新 test 真係驗到個 bug）
- 放寬條件之後 AU-026 嘅保證仲喺度（臨時 test + lane 嘅 test）：
    - 載入冇播就 hide：唔寫。暫停 seek：寫
    - 續播位置套用：位置相等，唔當播過；A 播緊時載入 B（冇 autoplay、B 有舊進度 300）→ metadata → hide，B 記錄冇變
    - 撳咗播但位置冇行（包括卡住、`state.isPlaying` 仲係 `true`）：位置相等，唔寫；lane 嘅 byte-identical test 蓋到
    - `switchTo` 之後舊 source 遲到嘅 event：`duration` 已經係 `NaN`，`notePlayed()` 同 `persist()` 都喺 `hasMetadata()` 擋住
    - watchdog reload 到 `loadedmetadata` 之間：`duration` 係 `NaN` 時唔寫，同以前一樣（剩低嘅窗口見 S-1423）
- `FakeAudio.pause()` 改動冇削弱現有 test：除 `persistGate.test.ts` 之外冇 test 檔改過；`vitest related`（fake + controller）67 files / 1102 tests 全過。多咗嗰下 timeupdate 嚟到時已經暫停，唔會觸發 early advance

### Round 3 驗證（`de46eb0`：`hasTrustedPosition()` = `hasMetadata() && pendingStart === 0`，用喺 `notePlayed()`、`persist()`、`onTimeUpdate`）

- S-1423 ✅：我原本嘅 probe（autoplay、舊進度 300、`duration` 已知未有 `loadedmetadata`、hide）而家記錄冇變；lane 7 個新 test 有 4 個喺 `db4f59a` 嘅 controller fail（包括改過嘅 failed-source test），3 個 control 照過
- (a) `pendingStart` 唔會卡住：只喺 `switchTo`、metadata 未到嘅 `seek()`、`recoverSource`、`reload` 設定，四條路之後都會有新一次 `loadedmetadata`（`audio.load()` / 換 src 一定將 `duration` 重設做 `NaN` 再發）；metadata 到咗之後任何 `seek()` 都會清。臨時 test：reload → metadata → 位置 320，UI 同存檔都跟到；metadata 前 seek 再播，照存
- (b) UI：窗口入面嘅 timeupdate（位置 0）以前會令進度條跳去 0 再跳返，而家停喺續播位置；係少咗一下閃動，冇其他可見改變
- (c) 窗口入面唔會 early advance / 標已聽：`onTimeUpdate` 直接 return；`ended` 冇可能喺 `loadedmetadata` 之前出現
- (d) reload 之後 `loadedmetadata` 永遠唔到：`duration` 係 `NaN`，`persist()` 本身以前都擋，已存嘅進度照留；`switchTo` 存舊集嗰下同以前一樣唔寫（臨時 test：窗口入面換集，舊集記錄冇變、新集冇記錄）

### Round 1 查過、冇問題嘅位

- `onPause` / `onEnded` 嘅 `notePlayed()` 喺 persist 之前；所有 seek 路徑經 `seek()`；`switchTo` 先 `persist()` 再清 flag
- 三個改咗嘅舊 test 係 fake 嘅 artefact；`useStartDrama.ts:42` 註解同實際一致；冇 magic number；lint 過

## Section B — AU-027

冇 🔴 / 🟡。逐個 session 狀態對過 `catalog/runtime.ts`（Round 2 已有直接 test）：

| 狀態                                                        | `isCatalogComplete()`   | 結果                                |
| ----------------------------------------------------------- | ----------------------- | ----------------------------------- |
| remote 載入成功                                             | `true`                  | 照舊清走唔識嘅節目                  |
| `VITE_CATALOG_URL` 未設定（冇叫 `initCatalog`）             | `true`                  | 同以前一樣                          |
| fetch 進行中有人寫                                          | `false`                 | 保留（安全嗰邊）                    |
| fetch 失敗 / timeout / parse 失敗 / fetch 期間讀過 registry | `false`                 | 保留                                |
| timeout 之後 remote 先到                                    | `false`（成個 session） | `withTimeout` 已 reject，結果冇人用 |

- 冇其他 writer：`PROBE_STORAGE_KEY` 嘅 `setItem` 只有 `writeProbeState`；`storageMigration.ts` 只讀
- registry 成個 session 唔換，帶返落去嘅同 `state.found` 唔會重疊；數量唔會越積越多，下次 catalog 齊全就清
- 注入保護同以前一樣強（origin、日期、時間照驗，逐欄位抄）；多出嗰次 storage 讀有自己嘅 try/catch

## 🟢 Suggestion / Observation

- S-1420 `apps/player/package.json`：branch 冇 bump version；main agent 喺 release 處理
- S-1421 ✅ 已修（`db4f59a`）：`runtime.test.ts` 9 個 test，蓋晒上表每個狀態，包括 fetch 進行中、期間讀過 registry、timeout 後先到
- S-1422 ✅ 已修（`db4f59a`）：`probeStoreFallback.test.ts` 3 個 test（壞 JSON、`getItem` throw、`found` 唔係 array），斷言寫入內容完全相等
- S-1423 ✅ 已修（`de46eb0`）：續播位置未套用時寫位置 0 冚咗舊進度；修正範圍比建議闊（連 `persist()`、`onTimeUpdate` 都擋），見 Round 3 驗證
- S-1424 `apps/player/src/catalog/runtimeImportOrder.test.ts`：Round 3 跑 touched 目錄時 timeout（5009 ms，上限 5 秒），單獨重跑過（成個檔 4.62 秒）；Round 1 認唔到嗰個 fail 好可能係同一個。呢個檔 branch 冇改過，同 main 嘅時間未比較。方向：加大呢個 test 嘅 timeout
- Observation：`loadedmetadata` 如果真係冇派到（`duration` 已知但 event 漏咗），而家進度條同存檔會停喺續播位置，直到 seek / 換集；照 spec 唔會發生，未喺實機驗

## ✅ 做得好嘅地方

- AU-027 揀「寫嗰陣補返」而唔係「fallback 唔寫」，新搵到嘅錄音喺 fallback session 照存到
- W-859 嘅修正連 fake 一齊改返跟 spec，仲加咗兩個反面 guard（位置冇行就唔寫）

## 跑過嘅指令

- Round 1：`npm run lint`、`npx tsc -b` exit 0；`vitest related`（4 個 source）93 files / 1456 tests 全過；touched 目錄第一次 1 fail（認唔到邊個）、重跑 815 全過，當偶發；舊 code 對照 `persistGate.test.ts` 8 / 15 fail、`probeStoreFallback.test.ts` 5 / 9 fail
- Round 3：`npm run lint`、`npx tsc -b` exit 0；touched 目錄 48 files / 840 tests，839 過 / 1 timeout（S-1424，單獨重跑過）；`vitest related`（controller）64 files / 1023 tests 全過；Round 1–3 臨時 probe 喺 `de46eb0` / `db4f59a` 兩個 controller 各跑一次
- Round 2：`npm run lint`、`npx tsc -b` exit 0；`npx vitest run apps/player/src/{player,services,catalog,data}` 48 files / 833 tests 全過；`vitest related`（fake + controller）67 files / 1102 tests 全過；臨時 probe 喺 `6138642` / `fd6e8f5` / `5bc0dba` 三個 controller 各跑一次
- Coverage（Round 1 量度，lines）：`AudioController.ts` 87.33%、`probeStore.ts` 97.14%、`runtime.ts` 100%；Round 2 冇重新量
- 冇跑 e2e（按指示）。驗唔到：實機鎖屏 timeupdate 頻率同 `pause()` 之後嘅事件次序（只有 spec 同 repo 註解做根據）；`duration` 早過 `loadedmetadata` 出現嘅窗口喺真 browser 有冇；真 remote catalog 嘅 fallback

## Handoff

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "87%"
next_action: invoke_qa
next_agent: quality-assurance
branch: "fix/player/au-026-027_progress-probe-store"
context: "Round 3 pass at de46eb0: W-859, S-1421, S-1422, S-1423 fixed. Open non-blocking: S-1420 (version bump, main agent at release), S-1424 (runtimeImportOrder.test.ts near its 5 s timeout, flaky under load, file untouched by branch). Next QA S1 (player-core, catalog-data)."
```
