# Batch QA — 2026-10-27 — cleanup（S-525 / S-526 / S-527 / Q-1 / Q-2 / Q-3）

- **日期**：2026-10-27
- **測試員**：Quality Assurance（Senior QA，冇參與編寫）
- **流程**：Protocol 2 · `/test` · Batch（6 item）
- **範圍**：`refactor/cleanup/integration` HEAD `b5847c7`，base `1e60035`（= origin/main，v1.18.5）；13 檔，+530 / −8（其中 252 行係 review 報告）
- **環境**：Linux · Node（本機）· vitest + jsdom + v8 coverage · Playwright（preload 將 `chromium.launch` 指去 `/opt/pw-browsers/chromium`，preload 放 scratchpad，冇入 repo）· `vite preview` port 4179
- **背景**：Reviewer batch 98/100 pass（`.proj-docs/reviews/2026-10-27_review_cleanup_batch.md`），0 Critical / 0 Warning，Suggestion S-528、S-529
- **Batch cap 備註**：6 個 item 超過 `sw-parallel-dispatch` 嘅 5 個 cap。用戶已知，main agent 決定照一批做（6 個入面 4 個係 test-only、1 個純 rename、1 個 lint config 註解，冇 production 邏輯改動）。QA 照每個 item 獨立 Section 驗，冇用整體 pass 掩蓋個別 item。下次請 split。
- **總結**：**✅ pass**。Unit 1445 / 1445（上次 1440 + 5 新 test，數字對得上）、e2e 561 PASS / 0 FAIL（上次 546 + Q-1 新 15 個斷言）、靜態 gate 全過。Q-1 e2e 獨立連跑 3 次 + CPU 加壓再跑 3 次，共 6 × 15 = 90 個斷言全過，冇 flaky。3 個新 unit / RTL test 用 mutation 反證，全部會被打紅。冇 🔴、冇新 bug、冇開 ticket；有 3 項 🟡 測試盲點，建議 follow-up。

## 整體 verdict

- 涵蓋 item：
    - A · S-525 — `7e061a6`（merge `329e4ad`）
    - B · S-526 — `108fd76`（merge `ffe78ee`）
    - C1 · S-527 — `26881c4`（merge `61294d4`）
    - C2 · Q-2 — `62957ed`（merge `61294d4`）
    - C3 · Q-3 — `30373ec`（merge `61294d4`）
    - D · Q-1 — `ab24e89`（merge `0ecdfd4`）
- Edge case gap：3（A 0、B 0、C1 1、C2 0、C3 1、D 1）
- Regression：✅ pass（unit 全綠、e2e 561 / 0，舊有 546 個全部照過）
- Status：**✅ pass**

### Hard Gates

| Gate           | 結果    | 證據                                                                                                                                                       |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests（unit）  | ✅ pass | `npx vitest run --coverage` → **145 檔 / 1445 test 全過，0 失敗**（84.2 s）；上次 145 / 1440，+5 = S-527 `it.each` 2 + Q-2 1 + Q-3 2                       |
| Tests（e2e）   | ✅ pass | `npm run build && E2E_PORT=4179 node --import <scratchpad>/pw-preload.mjs e2e/run.mjs` → **561 PASS / 0 FAIL**，「All E2E checks passed」、「冇 JS error」 |
| Q-1 flaky 檢查 | ✅ pass | 獨立 runner 連跑 3 次：每次 15 / 15，13.4–13.6 s；4 核 CPU 開 8 條 busy loop 加壓再跑 3 次：每次 15 / 15，13.2–14.0 s；JS error 0                          |
| Coverage       | ✅ pass | Stmts 98.05% · Branch 94.02% · Funcs 98.21% · Lines 98.88%（上次 98.01 / 93.97 / 98.13 / 98.85，四項都升）                                                 |
| Lint           | ✅ pass | `npx eslint .` exit 0                                                                                                                                      |
| Prettier       | ✅ pass | `npx prettier --check .` → All matched files use Prettier code style                                                                                       |
| Type check     | ✅ pass | `npx tsc -b --noEmit` exit 0                                                                                                                               |
| Build          | ✅ pass | `npm run build` exit 0；PWA v2.0.0 generateSW，precache 80 entries，生成 `dist/sw.js`、`dist/workbox-*.js`                                                 |
| 版本號注入     | ✅ pass | bundle `index-74igCDM9.js` 有 `1.18.5`；e2e 驗證版本號喺橫額右下角                                                                                         |
| PWA Update     | ✅ pass | 冇改 `vite.config.ts` / SW 註冊 / `public/`；e2e「Service worker 已啟用」。冇 production 改動，唔需要 bump 版本；如果照 release，vN → vN+1 由 DevOps 驗    |
| Security       | n/a     | 冇新依賴，`package.json` / lock 冇改，冇新輸入面                                                                                                           |
| Data integrity | n/a     | 冇改 storage / schema                                                                                                                                      |
| Performance    | ✅ pass | Bundle `index-*.js` 402.57 kB（gzip 132.34 kB）、CSS 52.83 kB，同上次完全一樣（改名 / 註解唔影響產物）                                                     |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                                     |

### 改動檔 coverage

| 檔案                               | Stmts | Branch | Funcs | 未覆蓋 stmt 行                                                                       |
| ---------------------------------- | ----- | ------ | ----- | ------------------------------------------------------------------------------------ |
| `ArcSheet/useSheetDragControls.ts` | 96.63 | 87.88  | 100   | 133、145、151（同改名前 `sheetDragCore.ts` 一樣）                                    |
| `ArcSheet/useListTouchDrag.ts`     | 94.74 | 90.24  | 100   | 35、55、62（守衛分支，冇變）                                                         |
| `ArcSheet/useSheetPointerDrag.ts`  | 98.04 | 96.43  | 100   | 26（冇變）                                                                           |
| `ArcSheet/useSheetDrag.ts`         | 100   | —      | 100   | —                                                                                    |
| `MiniPlayer/dismissSession.ts`     | 100   | 100    | 100   | —                                                                                    |
| `MiniPlayer/useDismissGesture.ts`  | 94.85 | 80.49  | 95.45 | 44、49、92、102、119（`onPointerCancel` 112-115 已由 Q-3 覆蓋，Stmts 92.78 → 94.85） |

---

## Section A — S-525：`eslint.config.js` 註解 / 冗餘 ignore + `.claude/**`

- **Verdict**：✅ pass
- **驗證**：用 base `1e60035` 嘅舊 config（暫存喺 `node_modules/.qa-old-eslint.config.mjs`，驗完即刪，`git status` 乾淨）同新 config 對 7 個代表檔做 `eslint --print-config`，md5 全部一樣：

| 檔案（代表類別）                                                                        | 舊 vs 新 effective config |
| --------------------------------------------------------------------------------------- | ------------------------- |
| `src/hooks/swipe.ts`（`.ts` hook）                                                      | 一樣                      |
| `src/hooks/swipe.test.ts`（test）                                                       | 一樣                      |
| `src/hooks/miniPlayerDismissed.node.test.ts`（node test，即刪咗嗰個冗餘 ignore 嘅對象） | 一樣                      |
| `src/components/ArcSheet/ArcSheet.tsx`（`.tsx`）                                        | 一樣                      |
| `src/i18n/zh-HK.ts`（資料檔豁免）                                                       | 一樣                      |
| `src/components/ArcSheet/ArcSheet.test.tsx`                                             | 一樣                      |
| `e2e/run.mjs`                                                                           | 一樣                      |

- 新 config `npx eslint .` exit 0；`.claude/worktrees/` 存在，新 ignore 生效。
- **Edge case 評估**：✅ no edge case gap。改動係註解 + 一個被 `**/*.test.ts` 已包含嘅冗餘 glob + 一個 ignore；`*.node.test.ts` 經 print-config 證實仍然豁免 `max-lines-per-function`。Lint config 唔係 runtime 邏輯，唔需要補 test。

## Section B — S-526：`sheetDragCore.ts` → `useSheetDragControls.ts`

- **Verdict**：✅ pass
- **驗證**：`git diff` 顯示 `similarity index 100%`（內容一字不改）；3 個 import 全部改晒；`src/`、`e2e/` 冇殘留 `sheetDragCore` 字眼（只有 `.claude/session-logs` 歷史記錄提到，正常）。tsc / build 過、ArcSheet unit test 全綠、改動檔 coverage 同改名前逐項一樣。Q-1 新 e2e 喺真 Chromium 證實拖動行為冇變。
- **Edge case 評估**：✅ no edge case gap。純改名，行為 0 改變，由 tsc + 現有 ArcSheet unit + Q-1 e2e 覆蓋。

## Section C1 — S-527：`dismissSession` `closing` 終態 JSDoc + 鎖契約 test

- **Verdict**：✅ pass
- **驗證**：
    - JSDoc 講「onDismiss 必須令 MiniPlayer unmount（useMiniPlayer 回 null）」：核對 `src/hooks/useMiniPlayer.ts:209`，`dismissed` 時確實回 `null`，描述準確。
    - 新 `it.each`（滑走完之前 / 之後各一）：`settleBack` + `armIdle` + `dropPress` + 再推 `ARMED_IDLE_MS`，斷言 session 仍然 `closing` 兼 `setView` 冇被叫。
    - **Mutation 反證**（喺 scratchpad 嘅 `git archive HEAD` 副本做，repo 冇改）：`settleBack` 拎走 `|| session.closing` → 2 個新 test + 1 個原有 test 紅。✅ 會捉到退化。
- **Edge case 評估**：🟡 1 個 gap（Q-4）。JSDoc 寫「新手勢都唔再郁呢個 session」，個守衛喺 `useDismissGesture.ts:103`（`onPointerDown` 見 `session.closing` 就 return），但冇 RTL test 斷言「滑走緊再撳一下唔會重新開始 press / 唔會 `data-pressing`」。另外 `dropPress` 對 closing session 仍然會改 `pressing` / `press` 欄（只係 `settleBack` 冇 sync，畫面睇唔到），test 用 `toMatchObject` 冇鎖呢兩欄——唔影響行為，記錄備查。

## Section C2 — Q-2：MiniPlayer 短按放手唔浮起

- **Verdict**：✅ pass
- **驗證**：test 撳落 → 推 `LONG_PRESS_MS / 2` → 放手 → 再推成個 `LONG_PRESS_MS`，斷言冇 `data-armed` / `data-lifted` / `data-pressing`，`onChange`、`onDismiss` 都冇叫。常數具名、由 production `LONG_PRESS_MS` 推算。
- **Mutation 反證**：`takePress` 唔 `clearTimeout(session.longPress)` → 新 Q-2 test 紅（連帶 Q-3 第二個 test 同原有 `takePress` unit test 紅）。✅
- **Edge case 評估**：✅ no edge case gap。剛好 `LONG_PRESS_MS` 邊界已有原有 test（`lifts after a long press`）覆蓋；放手前後兩段時間都推過，涵蓋「timer 未清」嘅真實 bug 情境。

## Section C3 — Q-3：MiniPlayer `onPointerCancel`

- **Verdict**：✅ pass
- **驗證**：2 個 test——浮起後拉過成個 card 闊度先 cancel（唔當放手：冇閂、冇轉台、offset 返 0）；浮起前 cancel（長按停計）。`useDismissGesture.ts` 112-115 由未覆蓋變覆蓋。
- **Mutation 反證**：`onPointerCancel` 改 no-op → 2 個新 test 都紅。✅
- **Edge case 評估**：🟡 1 個 gap（Q-5）。`takePress` 只認同一隻手指（`pointerId`），但冇 test 斷言「另一隻手指嘅 pointercancel 唔會打斷而家嘅 press / 拖動」。`takePress` 嘅 unit test 有測 pointerId 唔同回 `null`，但 component 層冇；風險低。

## Section D — Q-1：新 e2e `e2e/arcSheet.mjs`

- **Verdict**：✅ pass
- **驗證**：
    - 15 個斷言 = 3 組（觸控表頭、觸控清單、滑鼠表頭）× 5（開表原位、拉唔夠時跟手指、放手彈返、再開、拉夠閂表）。全 suite 跑一次 + 獨立 runner 3 次 + CPU 加壓 3 次，**7 次共 105 個斷言全部 PASS**，冇 JS error，每次耗時穩定（13.2–14.0 s）。
    - 複製常數核對：`SHEET_DISMISS_RATIO = 0.25`（`ArcSheet/sheetDrag.ts:2`）、`SHEET_SLIDE_MS = 250`（`sheetDrag.ts:8`）、`VELOCITY_WINDOW_MS = 100`（`ShowCardStack/cardStack.ts:8`）、`DRAMA_AUDIO_BASE`（`config/constants.ts:42`）——全部同 src 一致。
    - 實測數值：表高 658 px；彈返拉 82 px（< 164.5），閂表拉 205 px（≥ 164.5 + 40 margin），兩邊離門檻都有足夠距離，唔會因捨入而搖擺。
- **Flaky 評估（回應 S-529）**：`SETTLE_MS = 700` 係 `SHEET_SLIDE_MS` 嘅 2.8 倍；加壓（CPU 跑滿 200%）下都冇失敗，**今日環境未見 flaky**。但「放手彈返」斷言要求 transform 已清空，如果 CI 機極慢、動畫 + `onClose` 超過 700 ms 就會誤報 FAIL。同意 Reviewer S-529：改用 `waitForFunction` 等條件（transform === '' / dialog count === 0），唔 block。
- **Edge case 評估**：🟡 1 個 gap（Q-6）。(1) 清單路只測「捲到頂」，冇測「清單未捲到頂向下拉 → 應該捲清單，唔應該拉表」呢個負面情境；(2) 刻意停 200 ms 令速度 = 0，「快速甩」閂表路冇 e2e。兩者係 e2e 範圍擴展，唔係今次 item 嘅缺陷。

---

## 跨 item 互動評估

- **同檔衝突**：C1 / C2 / C3 同改 `MiniPlayer/` 但分開檔（`dismissSession.ts` JSDoc、`dismissSession.test.ts`、`MiniPlayer.test.tsx`、`useDismissGesture.ts` JSDoc），新常數 `PRESS_X` / `PRESS_Y` / `POINTER_ID` / `SHORT_PRESS_MS` 只喺 `describe` 入面，冇撞名；B 改名同 D e2e 冇 import 關係（e2e 只用 DOM）。
- **Symbol collision**：冇新 export。
- **Lint × rename**：A 嘅 config 對 B 新檔名 `useSheetDragControls.ts` 照套 `.ts` 函數 ≤ 30 行規則，`eslint .` 過。
- **GAS-001/002/003**：屬 GAS 專案知識條目，同本 React PWA batch 無關，冇觸發。
- **整體尺寸 / coverage**：只加 test + 註解，coverage 四項都升，冇 threshold 風險。

## Regression 結論

- Unit 1445 / 1445（= 1440 + 5）、e2e 561 / 0（= 546 + 15），舊有 test 全部照過；bundle 大小一字不差。**production 行為 0 改變**嘅預期成立。

## 失敗測試詳情

冇。

## 問題修正優先順序

| 優先 | ID  | 類型        | 內容                                                                            | Ticket                | 負責               |
| ---- | --- | ----------- | ------------------------------------------------------------------------------- | --------------------- | ------------------ |
| 1    | Q-6 | 🟡 測試盲點 | ArcSheet e2e：清單未捲到頂向下拉要捲清單唔拉表；快速甩閂表；連同 S-529 改等條件 | —（非 bug，唔開 CUI） | Frontend Developer |
| 2    | Q-4 | 🟡 測試盲點 | MiniPlayer RTL：滑走緊（closing）再撳唔會開新 press                             | —                     | Frontend Developer |
| 3    | Q-5 | 🟡 測試盲點 | MiniPlayer RTL：另一隻手指 pointercancel 唔打斷現有 press                       | —                     | Frontend Developer |

（冇 bug，所以冇開 CUI ticket；現有最大仍然係 CUI-0005。）

## 測試建議（下一步）

1. 呢個 batch 冇 production 改動，可以 merge 入 main；版本號可以唔 bump，或者跟下一個功能一齊 release。
2. Follow-up 交 developer subagent 處理 Q-4 / Q-5 / Q-6 + Reviewer S-528 / S-529（QA 唔 commit 測試）。S-529 同 Q-6 都係掂 `e2e/arcSheet.mjs`，建議一齊做。
3. 下次 dispatch 守返 5 個 item cap。

## Handoff receipt

```handoff-receipt
protocol: 2
agent: quality-assurance
mode: batch
scope: refactor/cleanup/integration@b5847c7 (base 1e60035 = origin/main v1.18.5) — S-525, S-526, S-527, Q-1, Q-2, Q-3 (6 items > cap 5, user-acknowledged)
status: pass
next_action: merge_main
next_agent: devops-engineer
hard_gates:
  tests_unit: pass (145 files / 1445 tests / 0 failed; 1440 + 5 new)
  tests_e2e: pass (561 PASS / 0 FAIL; 546 + 15 new)
  q1_flaky_check: pass (3 isolated runs + 3 CPU-stressed runs, 90/90 assertions)
  coverage: pass (stmts 98.05 / branch 94.02 / funcs 98.21 / lines 98.88)
  lint: pass
  prettier: pass
  typecheck: pass
  build: pass (dist/sw.js generated, v1.18.5 injected)
  pwa_update: pass (no PWA config change)
  security: n/a
  data_integrity: n/a
  performance: pass (bundle size unchanged)
  no_critical: pass (0)
per_fix:
  A_S-525: pass
  B_S-526: pass
  C1_S-527: pass
  C2_Q-2: pass
  C3_Q-3: pass
  D_Q-1: pass
tickets: []
follow_up: [Q-4 closing-state new press RTL test, Q-5 other-pointer pointercancel RTL test, Q-6 ArcSheet e2e list-not-at-top + fling, S-528, S-529]
report: .proj-docs/qa/2026-10-27_qa_cleanup_batch.md
context: "Test / 註解 / rename / lint-config only，production 行為 0 改變（unit 1445/1445、e2e 561/0、bundle 一樣）；新 unit test 經 mutation 證實有效；Q-1 e2e 7 次 105 斷言冇 flaky（S-529 固定 sleep 建議照做，非 blocking）；冇 bug、冇 ticket"
```
