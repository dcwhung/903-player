# Batch QA — 2026-10-27 — size-guard（AU-010 + S-516a / S-516b）

- **日期**：2026-10-27
- **測試員**：Quality Assurance（Senior QA，冇參與編寫）
- **流程**：Protocol 2 · `/test` · Batch（3 item）
- **範圍**：`refactor/size-guard/integration` HEAD `fbede6b`，base `c4d789a`（= origin/main，v1.18.4）；10 檔，+1104 / −475
- **環境**：Linux · Node（本機）· vitest + jsdom + v8 coverage · Playwright（preload 將 `chromium.launch` 指去 `/opt/pw-browsers/chromium`，preload 放 scratchpad，冇入 repo）· `vite preview` port 4177
- **背景**：Reviewer batch 97/100 pass（`.proj-docs/reviews/2026-10-27_review_size-guard_batch.md`）
- **總結**：**✅ pass**。Unit 1440 / 1440（上次 1414 + 新 `dismissSession.test.ts` 26 = 1440，數字對得上）、e2e 546 PASS / 0 FAIL（同上次 baseline 一樣）、靜態 gate 全過、AU-010 反證成功。冇 🔴、冇新 bug；有 3 項 🟡 測試盲點（全部係 main 已有，唔係今次引入），建議 follow-up 補測。

## 整體 verdict

- 涵蓋 fix：
    - Item A · AU-010 — `ed3b148`（merge `3454844`）
    - Item B · S-516a — `7741a4a`（merge `8814656`）
    - Item C · S-516b — `be758ef`、`671e69b`（merge `7f869b9`）
- Edge case gap：3（A 0、B 1、C 2；全部係 main 已存在嘅盲點）
- Regression：✅ pass（unit 全綠、e2e 546 / 0 同 baseline 一致）
- Status：**✅ pass**

### Hard Gates

| Gate           | 結果    | 證據                                                                                                                                                       |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests（unit）  | ✅ pass | `npx vitest run --coverage` → **145 檔 / 1440 test 全過，0 失敗**（97.2 s）；上次 144 / 1414，+1 檔 +26 test = `dismissSession.test.ts`                    |
| Tests（e2e）   | ✅ pass | `npm run build && E2E_PORT=4177 node --import <scratchpad>/pw-preload.mjs e2e/run.mjs` → **546 PASS / 0 FAIL**，「All E2E checks passed」、「冇 JS error」 |
| Coverage       | ✅ pass | Stmts 98.01% · Branch 93.97% · Funcs 98.13% · Lines 98.85%（上次 97.96 / 93.83 / 98.13 / 98.85，冇跌）                                                     |
| Lint           | ✅ pass | `npx eslint .` exit 0（新規則下全 repo 0 超限）                                                                                                            |
| Prettier       | ✅ pass | `npx prettier --check .` → All matched files use Prettier code style                                                                                       |
| Type check     | ✅ pass | `npx tsc -b --noEmit` exit 0                                                                                                                               |
| AU-010 反證    | ✅ pass | 見 Section A：31 行 `.ts` 函數 / 51 行 `.tsx` 函數 / 151 行 `.tsx` 檔全部 error；邊界值 30 / 50 通過；豁免路徑唔報                                         |
| Build          | ✅ pass | `npm run build` exit 0；PWA v2.0.0 generateSW，precache 80 entries，生成 `dist/sw.js`、`dist/workbox-*.js`                                                 |
| 版本號注入     | ✅ pass | bundle `index-THNt4tzE.js` 有 `` `1.18.4` ``；e2e 驗證版本號喺橫額右下角                                                                                   |
| PWA Update     | ✅ pass | 冇改 `vite.config.ts` / SW 註冊 / `public/`；e2e「Service worker 已啟用」。vN → vN+1 實機驗證留返 DevOps release bump 時照做                               |
| Security       | n/a     | 冇新依賴，`package.json` / lock 冇改，冇新輸入面                                                                                                           |
| Data integrity | n/a     | 純結構 refactor，冇改 storage / schema                                                                                                                     |
| Performance    | ✅ pass | 冇新 effect / state；bundle `index-*.js` 402.57 kB（gzip 132.34 kB），CSS 52.83 kB，同上次幾乎一樣（gzip +0.01 kB）                                        |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                                     |

### 改動檔 coverage

| 檔案                              | Stmts | Branch | Funcs | Lines | 未覆蓋                                     |
| --------------------------------- | ----- | ------ | ----- | ----- | ------------------------------------------ |
| `ArcSheet/sheetDragCore.ts`       | 96.62 | 87.87  | 100   | 100   | 63、133、145-151（防禦性 null guard 分支） |
| `ArcSheet/useListTouchDrag.ts`    | 94.73 | 90.24  | 100   | 100   | 35、55、58、62（守衛分支）                 |
| `ArcSheet/useSheetPointerDrag.ts` | 98.03 | 96.42  | 100   | 100   | 26                                         |
| `ArcSheet/useSheetDrag.ts`        | 100   | 100    | 100   | 100   | —                                          |
| `MiniPlayer/useDismissGesture.ts` | 92.78 | 78.04  | 90.9  | 97.5  | 112-115（`onPointerCancel`，main 已係咁）  |
| `MiniPlayer/dismissSession.ts`    | 100   | 100    | 100   | 100   | —                                          |

---

## Section A — AU-010：ESLint 尺寸守衛（`eslint.config.js`）

- **Verdict**：✅ pass
- **反證**（`npx eslint --stdin --stdin-filename …`，內容由 shell 生成經 stdin 餵入，repo 冇留任何檔，`git status` 乾淨）：

| 輸入                                                 | 預期                    | 實際                                                               |
| ---------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| `src/x.ts` 30 行 arrow function                      | 通過                    | ✅ exit 0                                                          |
| `src/x.ts` 31 行 arrow function                      | error                   | ✅ `Arrow function has too many lines (31). Maximum allowed is 30` |
| `src/y.ts` 31 行 `function`（14 行註解 + 14 行空行） | error（照計）           | ✅ `Function 'f' has too many lines (31)` — 空行 / 註解有計        |
| `src/X.tsx` 50 行函數                                | 通過                    | ✅ exit 0                                                          |
| `src/X.tsx` 51 行函數                                | error                   | ✅ `too many lines (51). Maximum allowed is 50`                    |
| `src/X.tsx` 151 行檔                                 | error                   | ✅ `File has too many lines (151). Maximum allowed is 150`         |
| `src/x.ts` 300 行檔                                  | 通過（冇檔案上限）      | ✅ exit 0                                                          |
| `src/i18n/zh-HK.ts` 31 行函數                        | error（只豁免檔案行數） | ✅ error                                                           |
| `src/x.test.ts` / `src/a.node.test.ts` 31 行函數     | 豁免                    | ✅ exit 0                                                          |
| `e2e/x.mjs` / `scripts/a.mjs` 31 行函數              | 豁免                    | ✅ exit 0                                                          |

- **Edge case 評估**：邊界值（30 / 31、50 / 51、150 / 151）、空行註解計算、資料檔「只豁免 max-lines」、test / e2e / scripts 豁免都逐一驗過。✅ no edge case gap。
- **觀察（🟢，唔 block）**：`.ts` block 嘅 `ignores` 入面 `**/*.node.test.ts` 已經被 `**/*.test.ts` 包埋，屬冗餘，冇行為影響。

## Section B — S-516a：`useSheetDrag.ts` 拆成 `sheetDragCore` / `useListTouchDrag` / `useSheetPointerDrag`

- **Verdict**：✅ pass
- **純搬移核對**：將 base 版 `useSheetDrag.ts` 刪走嘅行，同四個新檔嘅行（去縮排、去 `export`、排序）做 `comm` 比對，唯一差異係：`useListTouchDrag` / `usePointerDrag → useSheetPointerDrag` / `useSheetDragControls` 加 `export`、改名，以及 import 拆檔。邏輯 0 改變。
- **Unit**：`ArcSheet.test.tsx`、`sheetDrag.test.ts` 全綠，包括：
    - `leaves pointer drags inside the list to scrolling`（清單入面 pointer 唔接手，交 touch）
    - `takes over a downward touch pull in the list once it is scrolled to the top`
    - `keeps the header pull when a list touch starts at the same time`（**touch 同 pointer 同時觸發**：`startGesture` 見 `gesture.current` 已有就 return false，第二個來源唔搶）
    - `ignores a second pointer and a cancel from another pointer while pulling`
    - `springs back when the list pull is cancelled by the system`（touchcancel → `abort`）
    - `does not close a second time when Escape lands during the slide-away`
    - `starts afresh when the same pointer presses again after a lost release`
- **e2e**：現有 e2e **冇 ArcSheet（全集表）拖拉 / 閂表流程**（上次 QA 已記錄），所以呢個 item 嘅 e2e 斷言數 = 0；e2e 546 / 0 只證明其他頁冇 regression。
- **Edge case 評估**：
    - touch vs pointer 同時：已有 test 鎖住（見上）。
    - 表滑走緊（`close.isPending()`）再按：`startGesture` 拒絕，`does not close a second time…` 覆蓋。
    - reduced motion：`useCloseTimer` 用 `prefersReducedMotion() ? 0 : SHEET_SLIDE_MS`，同搬移前一樣。
    - 開 / 閂之間嘅 stale pointer：`useSheetPointerDrag` 喺 `open` 變化時清 `pointer.current`，`controls.reset` 清 gesture 同 timer，順序同拆前一致（`useSheetDrag` 入面 hook 次序：controls → reset effect → touch → pointer，冇變）。
    - 未覆蓋 branch（`sheetDragCore` 63 / 133 / 145-151、`useListTouchDrag` 35 / 55 / 58 / 62）全部係 null guard / 第二隻手指 / 已 ignored 等防禦分支，拆前已存在。
- **Gap**：1（🟡 Q-1：ArcSheet 冇 e2e，jsdom 唔模擬 `touch-action: pan-y` 同真實捲動交接）。
- **補測建議**：e2e 加「入 series 劇集 → 開全集 → grab bar 向下拉閂；清單捲到頂再向下拉閂；清單中段向下拉只捲唔閂」三條 CDP touch 斷言（可重用 `e2e/touch.mjs` 嘅 `touchDrag`）。

## Section C — S-516b：`useDismissGesture.ts` 抽出 `dismissSession.ts`（+26 test）

- **Verdict**：✅ pass
- **純搬移核對**：`git diff` 顯示 `DismissView`、`Press`、`Session`、`Sync`、`SESSION_REST`、`REST`、`newSession`、`sync`、`settleBack`、`armIdle`、`lift`、`dismiss`、`releaseArmed`、`takePress`、`dropPress` 函數體逐字搬過去，只係加 `export`；`takePress` 參數型別由 `MiniPointerEvent` 收窄做 `PointerRef { pointerId }`（結構相容，`tsc` 過）。`useDismissGesture.ts` 用 `export type { DismissView }` 保留舊 import 路徑，`MiniPlayer` / `dismissView` 唔使改。
- **Unit**：`dismissSession.test.ts` 26 test 全綠，覆蓋 `settleBack` 撳住 / 滑走緊唔郁、`armIdle` 重新計時、`lift` 撳住唔開始 idle、`dismiss` 防重入 + reduced motion 即刻 `onDismiss`、`releaseArmed` 三個 outcome（dismiss / reveal / collapse）、`takePress` 唔同手指唔理 + 清長按 timer、`dropPress`。`MiniPlayer.test.tsx` 手勢組（長按 250 ms 邊界、未夠長按郁咗仍然轉節目、拉過一半關、露出關閉掣、idle / 外面 tap / Escape 收返、reduced motion、滑走中轉頁仍然關、lost release、右鍵 / 中鍵唔浮起）全綠。
- **e2e**：mini player 左右掃轉節目（滑鼠 + 390×844 / 375×667 觸控）全部 PASS，即係非 armed 路徑經過新 `takePress` / `settleBack` 仍正常；但 e2e **冇長按 → 左滑 → 關閉流程**，呢段只有 unit / RTL 覆蓋。
- **Edge case 評估**：
    - **未夠長按放手**：`takePress` unit test「hand back the press and cancel the long press before it lifts」驗咗 timer 被清；但 RTL 層冇「pointerDown → 100 ms pointerUp → 再過 250 ms 都唔浮起」嘅整合 test（🟡 Q-2）。
    - **reduced motion**：unit（`dismiss`）+ RTL（`closes straight away when reduced motion is on`）雙重覆蓋 ✅。
    - **滑走緊再觸發**：`dismiss` 防重入、`settleBack` closing 時唔郁、`ignores Escape while sliding away` ✅。
    - **pointercancel**：`useDismissGesture.ts` 112-115（`onPointerCancel` → `takePress` + `settleBack`）冇 test，reviewer 同 coverage 都確認 main 已係咁（🟡 Q-3）。系統 cancel（例如來電、瀏覽器搶手勢）喺 armed 拉緊時應該彈返，而家冇 test 鎖住。
- **Gap**：2（Q-2、Q-3）。

---

## 跨 fix 互動評估

- **同檔衝突**：三個 item 改動檔互不重疊（`eslint.config.js` / `ArcSheet/*` / `MiniPlayer/*`）。
- **Symbol collision**：兩邊都有叫 `track` / `release` 嘅 module-private 函數（`sheetDragCore.ts` vs `useDismissGesture.ts`），唔同 module、冇 export，冇衝突；新 export symbol 冇重名，`tsc -b` 過。
- **AU-010 × S-516a/b**：新規則下拆出嚟嘅檔全部過 `eslint .`（30 行 `.ts` 上限），證明 S-516 嘅拆法符合 AU-010；反之 AU-010 冇誤傷 `dismissSession.test.ts`（test 豁免）。
- **整體尺寸 / coverage**：整體 coverage 98.01%，比上次 97.96% 仲高少少，冇跌穿 threshold。

## Regression 結論

- Unit 1440 / 1440（= 1414 + 26）、e2e 546 / 0，同 baseline 一致，**外部行為 0 改變**嘅預期成立。
- 截圖冇做 pixel 比對（純 hook refactor、冇 UI 改動；已知 S-510 動畫噪音），按指示略過。

## 發現問題

### 🔴 Critical

冇。

### 🟡 Warning（唔 block，建議 follow-up 補測）

| ID  | Item | 問題                                                                 | 建議                                                                               | Ticket                  |
| --- | ---- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------- |
| Q-1 | B    | ArcSheet 拖拉 / 閂表冇 e2e，jsdom 驗唔到真實 `touch-action` 捲動交接 | e2e 加 grab bar 拉閂 / 清單到頂拉閂 / 清單中段只捲三條 touch 斷言                  | 不需要（main 已有盲點） |
| Q-2 | C    | 冇 RTL 整合 test 驗「未夠長按放手，之後 timer 時間過咗都唔浮起」     | `pointerDown` → `advance(100)` → `pointerUp` → `advance(LONG_PRESS_MS)` → 唔 armed | 不需要                  |
| Q-3 | C    | `onPointerCancel`（`useDismissGesture.ts` 112-115）冇 test           | armed 拉緊時 `pointerCancel` → 彈返 rest、唔觸發 `onDismiss` / `onSwipe`           | 不需要（main 已係咁）   |

### 🟢 Suggestion

- `eslint.config.js` `.ts` block 嘅 `**/*.node.test.ts` ignore 冗餘，可刪（純整潔）。
- Reviewer S-525 / S-526 / S-527 維持唔 block。
- e2e 長遠加 mini player「長按 → 左滑 → 關閉」CDP touch 流程。

## 問題修正優先順序

| 優先 | ID  | Item | Block release | Ticket |
| ---- | --- | ---- | ------------- | ------ |
| 1    | Q-3 | C    | 否            | —      |
| 2    | Q-2 | C    | 否            | —      |
| 3    | Q-1 | B    | 否            | —      |

冇 🔴、冇新 bug，所以唔需要建 CUI ticket（現有最大號 CUI-0005，未用）。

## 測試建議（下一步）

1. DevOps release 時 bump 版本（現 1.18.4 → 1.18.5），照常做 PWA vN → vN+1 自動 reload 驗證。
2. Follow-up 交 developer subagent 補 Q-2、Q-3 unit / RTL test，Q-1 e2e（QA 唔 commit 測試）。
3. AU-010 規則已生效，之後所有 PR 嘅 `npx eslint .` 會自動 block 超長函數 / 檔案。

## Handoff receipt

```handoff-receipt
protocol: 2
agent: quality-assurance
mode: batch
scope: refactor/size-guard/integration@fbede6b (base c4d789a = origin/main v1.18.4) — AU-010, S-516a, S-516b
status: pass
next_action: merge_main
next_agent: devops-engineer
hard_gates:
  tests_unit: pass (145 files / 1440 tests / 0 failed; 1414 + 26 new)
  tests_e2e: pass (546 PASS / 0 FAIL, matches baseline)
  coverage: pass (stmts 98.01 / branch 93.97 / funcs 98.13 / lines 98.85)
  lint: pass
  prettier: pass
  typecheck: pass
  au010_negative_proof: pass (31-line .ts fn, 51-line .tsx fn, 151-line .tsx file all error; exemptions honoured)
  build: pass (dist/sw.js generated, v1.18.4 injected)
  pwa_update: pass (no PWA config change; vN->vN+1 to be verified on release bump)
  security: n/a
  data_integrity: n/a
  no_critical: pass (0)
per_fix:
  A_AU-010: pass
  B_S-516a: pass
  C_S-516b: pass
tickets: []
follow_up: [Q-1 ArcSheet e2e drag/close, Q-2 short-press release integration test, Q-3 onPointerCancel test, redundant node.test ignore]
report: .proj-docs/qa/2026-10-27_qa_size-guard_batch.md
context: "純結構 refactor + lint 守衛；外部行為 0 改變已由 unit 1440/1440 + e2e 546/0 確認；ArcSheet 同 mini player 長按關閉流程 e2e 未覆蓋（main 已有盲點，唔 block）；release 前需 bump 版本（現 1.18.4）"
```
