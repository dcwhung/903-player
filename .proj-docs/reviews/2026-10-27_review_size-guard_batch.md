# Batch Review — 2026-10-27 — size-guard（AU-010 + S-516a / S-516b）

- **日期**：2026-10-27
- **審閱者**：Code Reviewer（獨立角色，冇參與編寫）
- **流程**：Protocol 1 · `/refactor` · Batch（3 item）
- **目標**：`refactor/size-guard/integration`（HEAD `7f869b9`），base `origin/main@c4d789a`（v1.18.4）
- **背景**：`.proj-docs/audits/2026-10-27_20-30_audit_size-limits.md`（AU-010，約第 327–364 行）；S-516 出自 `.proj-docs/reviews/2026-10-27_review_size-limits_batch.md`
- **總評**：三個 item 都係純 refactor / lint config。Lane B 同 Lane C 逐個函數核對過，函數本體逐字搬（normalise 之後 diff 只剩 `export` 同 `usePointerDrag` → `useSheetPointerDrag` 改名），hook 呼叫次序、deps array、ref / box 用法完全冇變。Lane A 嘅 ESLint 規則同 audit 建議一字不差，用 stdin probe 驗證過 30 / 31 行、150 / 151 行嘅邊界。冇 Critical、冇 Warning，得三個 🟢 Suggestion。

## 整體 verdict

- 涵蓋 commit：`ed3b148`（A）、`7741a4a`（B）、`be758ef` + `671e69b`（C）；merge commit `3454844`、`8814656`、`7f869b9`
- 整體 score：**97/100**
- Status：**✅ pass**（hard gates 全過、冇 Critical、每個 item ≥ 90）
- Version：未 bump 符合 `sw-parallel-dispatch` 流程（batch 完先由 main agent 開 `chore/release/v1.18.5_bump_version` 統一 bump），唔當 Warning
- Design Origin：`none-required` 合理 — diff 冇任何 `.tsx` / `.css` / `.scss`（只有 `eslint.config.js` 同 6 個 `.ts`）

### Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint .` exit 0（新尺寸規則已生效，全 codebase 零違規）                                                                                                                       |
| Prettier      | ✅ pass | `npx prettier --check .` → All matched files use Prettier code style                                                                                                                |
| Type check    | ✅ pass | `npx tsc -b --noEmit` exit 0                                                                                                                                                        |
| Tests（相關） | ✅ pass | `npx vitest run src/components/ArcSheet src/components/MiniPlayer src/hooks` → **25 files / 246 passed / 0 failed**                                                                 |
| Coverage      | ✅ pass | 改動檔（v8）：`dismissSession.ts` 100%、`useSheetPointerDrag.ts` 98% stmts、`sheetDragCore.ts` 96.6%、`useListTouchDrag.ts` 94.7%、`useDismissGesture.ts` 92.8%；全部 lines ≥ 97.5% |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                              |
| Security scan | n/a     | 冇新增依賴（`package.json` / lock 冇改）                                                                                                                                            |
| 循環 import   | ✅ pass | `npx -y madge --circular --extensions ts,tsx src` → No circular dependency found（365 files）                                                                                       |

### 評分結果（整體）

| 維度     | 得分   | 滿分    | 備注                                                        |
| -------- | ------ | ------- | ----------------------------------------------------------- |
| 正確性   | 25     | 25      | 逐函數核對行為等價；ESLint 邊界 probe 過                    |
| 安全性   | 20     | 20      | 冇新輸入面 / 依賴                                           |
| 可維護性 | 17     | 20      | S-525（-1）、S-526（-1）、S-527（-1）                       |
| 測試覆蓋 | 15     | 15      | 新 `dismissSession.test.ts` 26 個 test 斷言真實狀態 / timer |
| 性能     | 10     | 10      | 冇新增 re-render / effect / listener                        |
| 代碼風格 | 10     | 10      | Prettier / ESLint 全過；常數具名                            |
| **總分** | **97** | **100** |                                                             |

**結果：✅ pass**

| Item                    | 分數 | Status  |
| ----------------------- | ---- | ------- |
| A · L7 / AU-010         | 99   | ✅ pass |
| B · S-516a useSheetDrag | 99   | ✅ pass |
| C · S-516b dismiss      | 99   | ✅ pass |

---

## Section A — L7 / AU-010：ESLint 尺寸守衛

- **Commit**：`ed3b148`（merge `3454844`）
- **改動清單**：`eslint.config.js` +34 行 — 4 個具名常數（`TS_FN_MAX_LINES` 30、`TSX_FN_MAX_LINES` 50、`TSX_FILE_MAX_LINES` 150、`SIZE_LINES`）+ 4 個 config block

### 核對結果

| 檢查                   | 結果 | 說明                                                                                                                                     |
| ---------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 同 AU-010 規格一致     | ✅   | glob、ignores、`skipBlankLines/skipComments: false`、豁免名單全部同 audit 第 333–360 行一樣；仲將 30 / 50 / 150 抽成具名常數，比規格更好 |
| `.ts` 函數 30 行邊界   | ✅   | stdin probe `src/probe.ts`：30 行 exit 0；31 行 → `has too many lines (31). Maximum allowed is 30  max-lines-per-function`               |
| `.tsx` 檔案 150 行邊界 | ✅   | probe `src/probe.tsx` 151 行 → `File has too many lines (152)... max-lines`                                                              |
| `.tsx` 函數 50 行      | ✅   | `--print-config src/components/MiniPlayer/MiniPlayer.tsx` → `max-lines-per-function` max 50、`max-lines` max 150，兩個 skip 都係 false   |
| test 檔豁免            | ✅   | `--print-config dismissSession.test.ts` → 兩條規則 severity 0                                                                            |
| `.ts` 唔加 `max-lines` | ✅   | 同 sw-coding-style-ts 一致（hook / service 冇檔案上限）                                                                                  |
| 冇誤豁免               | ✅   | 豁免 block 只關 `max-lines`，資料檔嘅函數上限照用                                                                                        |
| 唔重寫 `measure.cjs`   | ✅   | 用戶決定；ESLint 計法已同 AST 量度吻合（audit 已 dry-run 驗證）                                                                          |

### 發現

#### 🟢 S-525 `eslint.config.js` 有三處冗餘 / no-op 設定，註解有誤導

- **位置**：`eslint.config.js` 第 32、41、48–51、53–56 行
- **描述**：
    1. 資料檔 block（`src/i18n/zh-HK.ts` 等）設 `'max-lines': 'off'`，但 `.ts` block 本身冇開 `max-lines`，所以呢個 block 實際係 no-op（已用 `--print-config src/i18n/zh-HK.ts` 確認：關之前已經係 `[0, 300]`）。註解寫「只豁免檔案行數」，會令人以為 `.ts` 有檔案上限。
    2. `ignores: ['**/*.test.ts', '**/*.node.test.ts']` — `*.node.test.ts` 已經被 `**/*.test.ts` match 咗。
    3. 最後嗰個 test / e2e / scripts block：src 兩個 block 已經 `ignores` 咗 test 檔，而 `e2e/**`、`scripts/**` 唔喺 `src/**` glob 入面，所以成個 block 都係雙保險。
- **影響**：冇功能影響；但第 1 點有誤導性，將來有人想幫 `.ts` 加 `max-lines` 嗰陣會唔知資料檔原來未被保護過。
- **方案 A**：刪走三處冗餘（豁免 block、`*.node.test.ts`、最後 block）。最乾淨，但同 audit 規格 / 用戶決定嘅文字唔再一一對應，將來加 `.ts` 檔案上限時要記得補返豁免。
- **方案 B**：保留 block 做預留，改註解講清楚：「預留：`.ts` 而家冇 `max-lines`；將來加嘅話資料檔照樣豁免」；`*.node.test.ts` 可留（明示意圖）。
- **推薦**：**方案 B** — 改一行註解，保留用戶決定嘅痕跡，零風險。

---

## Section B — S-516a：`useSheetDrag.ts` 362 → 20 行

- **Commit**：`7741a4a`（merge `8814656`）
- **改動清單**：
    - `sheetDragCore.ts`（178 行）：`Gesture` / `SheetDragControls` / `SheetElements` / `GetElement`、`bindElements`、`paint` / `settle` / `useCloseTimer` / `track` / `release` / `startGesture` / `endGesture` / `createControls` / `useSheetDragControls`
    - `useListTouchDrag.ts`（91 行）：`ListTouch`、`findTouch`、`engageListTouch`、`createListTouchHandlers`、`useListTouchDrag`
    - `useSheetPointerDrag.ts`（95 行）：`PointerGesture`、`startPointer` / `markMoved` / `takePointer` / `dropPointer` / `createPointerHandlers`、`useSheetPointerDrag`（原 `usePointerDrag`）
    - `useSheetDrag.ts`（20 行）：只剩 orchestrator

### 核對結果

| 檢查           | 結果 | 說明                                                                                                                                                                                                                                        |
| -------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 函數本體逐字搬 | ✅   | 原檔（`git show c4d789a:...`）同 4 個新檔用 `prettier --print-width 200` normalise、去 import / export 後逐行 sort diff：唯一差異係 `usePointerDrag` → `useSheetPointerDrag` 一處呼叫同簽名行（因 export 換行）                             |
| Hook 呼叫次序  | ✅   | `useSheetDrag`：`useBox` → `useSheetDragControls`（內含 `useBox` → `useCloseTimer`（`useRef`×2、`useEffect`、`useMemo`、`useEffect`）→ `useMemo`）→ `useEffect(reset)` → `useListTouchDrag` → `useSheetPointerDrag` → `useMemo`，同原本一樣 |
| Deps array     | ✅   | `[open, controls]`、`[elements, open, controls]`、`[open, pointer]`、`[elements, gesture, close]`、`[elements]` 全部冇變                                                                                                                    |
| 公開 API       | ✅   | 對外只有 `useSheetDrag`（`useSheetBehaviour.ts` import 路徑不變）；改名嘅 `useSheetPointerDrag` 原本非 export                                                                                                                               |
| 新 export 範圍 | ✅   | 只 export 跨檔需要嘅型別 / `bindElements` / `useSheetDragControls`；`paint`、`settle`、`useCloseTimer` 等仍係 module-private                                                                                                                |
| 函數 ≤ 30 行   | ✅   | ESLint 已驗；最長係 `createPointerHandlers`（~30）                                                                                                                                                                                          |
| 循環 import    | ✅   | 單向：`useSheetDrag` → `{core, touch, pointer}`；`touch` / `pointer` → `core`（type-only）                                                                                                                                                  |
| 測試           | ✅   | 冇新 test 合理（純搬，`ArcSheet.test.tsx` 已經覆蓋 touch / pointer 路徑），改動檔 lines coverage 100%                                                                                                                                       |

### 發現

#### 🟢 S-526 `sheetDragCore.ts` 同 `sheetDrag.ts` 名太近，而且 core 檔入面有 hook

- **位置**：`src/components/ArcSheet/sheetDragCore.ts`
- **描述**：同一 folder 而家有 `sheetDrag.ts`（純數學：`sheetOffset` / `shouldDismissSheet` / `SHEET_SLIDE_MS`）同 `sheetDragCore.ts`（DOM 操作 + `useCloseTimer` / `useSheetDragControls` 兩個 hook）。單睇檔名分唔到邊個係純函數、邊個有 React hook；而其餘 hook 檔都係 `useXxx.ts` 命名。
- **影響**：新人搵「拉表閂表嘅判斷」可能開錯檔；冇功能影響。
- **方案 A**：將 `sheetDragCore.ts` 改名做 `useSheetDragControls.ts`（同主 export 一致，跟 `useListTouchDrag.ts` / `useSheetPointerDrag.ts` 一個 pattern）。要改 3 個 import。
- **方案 B**：保留檔名，喺檔頭加一段 JSDoc：「`sheetDrag.ts` = 純計算；本檔 = DOM 寫入 + controls hook（pointer / touch 共用）」。
- **推薦**：**方案 A** — 改名成本低（3 行 import），命名同其餘兩個拆出嚟嘅 hook 一致；唔想動 import 就用 B。

---

## Section C — S-516b：`useDismissGesture.ts` 294 → 185 行

- **Commits**：`be758ef`（test + 新模組）、`671e69b`（refactor）；merge `7f869b9`
- **改動清單**：
    - 新 `dismissSession.ts`（133 行）：`DismissView` / `Press` / `Session` / `Sync` / `PointerRef`、`SESSION_REST` / `REST`、`newSession` / `sync` / `settleBack` / `armIdle` / `lift` / `dismiss` / `releaseArmed` / `takePress` / `dropPress`
    - 新 `dismissSession.test.ts`（26 test）
    - `useDismissGesture.ts`：只留 pointer event 相關（`track`、`startPress`、`releaseSwipe`、`release`、`createHandlers`）同 hook；`export type { DismissView }` re-export 保持舊 import 路徑

### 核對結果

| 檢查                   | 結果 | 說明                                                                                                                                                                                                  |
| ---------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 函數本體逐字搬         | ✅   | 9 個 transition 函數同原檔第 64–109、111–124、155–161、193–199、264 行逐行一樣；`releaseArmed` 只係 prettier 換行                                                                                     |
| `takePress` 型別改動   | ✅   | `MiniPointerEvent` → `PointerRef { pointerId }`：函數只讀 `event.pointerId`，`PointerEvent<HTMLElement>` 結構上符合，call site（`release`、`onPointerCancel`）唔使改；令純模組唔依賴 React 型別，合理 |
| Hook 呼叫次序 / deps   | ✅   | `useBox` ×2 → `useState` → `useClickSuppression` → `useEffect([box])` → `useSettleOutside`（`[armed, box, setView, container]`）→ `useMemo([box, container, onDismiss])`，同原本一樣                  |
| 公開 API / import 路徑 | ✅   | `useDismissGesture` 不變；`DismissView` 經 `export type {...}` re-export，`dismissView.ts` / `dismissView.test.ts` / `MiniPlayer.tsx` 唔使改                                                          |
| 名衝突                 | ✅   | `createContainerApi` 入面 `dismiss:` property 呼叫 import 嘅 `dismiss`，同原本 module-level 函數一樣解析                                                                                              |
| 循環 import            | ✅   | `useDismissGesture` → `dismissSession` → `miniPlayerDismiss` 單向                                                                                                                                     |
| 新 test 質素           | ✅   | 每個 test 都斷言實際 session 狀態 / `setView` payload / timer 觸發，包括邊界（`ARMED_IDLE_MS - ONE_MS` 未觸發、`+ ONE_MS` 觸發）、重複 `dismiss` 只叫一次、reduced motion、其他 pointer 唔理          |
| 冇 magic number        | ✅   | 全部閾值由 `miniPlayerDismiss` import（`DISMISS_RATIO`、`REVEAL_MIN_PX` 等），`WIDTH` / `POINTER_ID` 具名；`x: 0, y: 0, from: 0` 係原點，可接受                                                       |
| Global stub 清理       | ✅   | `stubReducedMotion` 用 `vi.stubGlobal`，由 `tests/setup.ts` 嘅 `afterEach(vi.unstubAllGlobals)` 清走，唔會漏去下一個 test                                                                             |
| Coverage               | ✅   | `dismissSession.ts` 100%；`useDismissGesture.ts` lines 97.5%（未覆蓋 112–115 = `onPointerCancel`，原本已經係咁）                                                                                      |

### Developer 觀察：`dismiss()` 之後 session 永遠停喺 `closing`

**判斷：唔使開 bug ticket，但要將隱含契約寫低（S-527）。**

- `dismiss()` 設 `closing = true` 之後，冇任何路徑會清返：`settleBack` 見 `closing` 就 return，`onPointerDown` 見 `closing` 就唔接新手勢。即係 session 一旦 dismiss 就係終態。
- 呢個係 **refactor 前已經存在嘅設計**（原檔第 95–109 行一模一樣），唔係今次引入。
- 目前唯一 consumer 係 `HomePage` → `useMiniPlayer()`：`onDismiss` = `useDismissal().dismiss` → `dismissed = true` → `useMiniPlayer` 回 `null` → `{miniPlayer && <MiniPlayer />}` unmount。下次再出現係新 mount，`useBox(newSession())` 係新 session。所以現時行為正確。
- 風險只會喺「將來有 consumer 嘅 `onDismiss` 唔會令 MiniPlayer unmount」先出現（例如改成淡出但保留 component）。屬設計約束，唔係 bug；用文件 + 測試鎖住就夠，唔值得為假設情況改狀態機（而且改咗就唔再係純 refactor）。

### 發現

#### 🟢 S-527 `dismiss()` 終態契約冇寫明

- **位置**：`src/components/MiniPlayer/dismissSession.ts` 第 81–96 行（`dismiss` JSDoc）；`useDismissGesture` 嘅 `onDismiss` 參數
- **描述**：`closing` 係單向終態，正確性完全靠 caller 喺 `onDismiss` 之後 unmount MiniPlayer，但 code 入面冇任何地方講。
- **影響**：將來改 `useMiniPlayer` / `HomePage` 嘅人可能整出「關閉之後 mini player 仲喺度但撳極都冇反應」嘅 bug。
- **方案 A**：喺 `dismiss` JSDoc 同 `useDismissGesture` 嘅 `onDismiss` 參數加一句：「`closing` 係終態：`onDismiss` 必須令 MiniPlayer unmount（`useMiniPlayer` 回 `null`）；再出現時係新 session」。再喺 `dismissSession.test.ts` 加一個 test 斷言 `dismiss` 之後 `settleBack` / `armIdle` 都唔會清 `closing`，將契約鎖死。
- **方案 B**：喺 slide timeout `onDismiss()` 之後 reset session（`closing = false`、`Object.assign(session, SESSION_REST)`）令 session 可重用。行為改動，要另開 `/fix` + TDD，同埋要處理「unmount 時 `pendingDismiss` 已清」嘅次序。
- **推薦**：**方案 A** — 零行為改動，符合純 refactor 範圍；B 解決一個今日唔存在嘅問題。

### 其他觀察（唔計分、唔開 ID）

- `SESSION_REST`、`armIdle` export 出嚟主要畀 test 用（`useDismissGesture` 冇 import）。純模組 export 內部 transition 做單元測試可以接受；如果想收窄，可以 test 改用 `newSession()` 比較，但唔建議為咗呢個加 indirection。
- TDD 證據：`be758ef`（`test:`）同時新增咗 `dismissSession.ts`，嗰個 commit 時 `useDismissGesture.ts` 仲有一份重複實現，到 `671e69b` 先刪。對 refactor 嚟講係 characterization test 先行，可接受；只係 commit type 寫 `test` 但含 production 檔，下次建議 test commit 只放 test（先 red），或者改用 `refactor:` 做 type。歷史已 merge 入 integration，唔建議改寫。

---

## ✅ 做得好嘅地方（跨 item 通用）

- 三個 item 都嚴守「純搬、唔改邏輯」，連註解都原封搬，review 可以機械式驗證。
- Lane A 將 30 / 50 / 150 抽成具名常數 + `SIZE_LINES` 共用 object，比 audit 規格更易維護；規則直接上 `'error'`，因為 AU-001–009 已全部清晒，`npx eslint .` 一次過綠。
- Lane B 拆檔方向清晰：core（狀態 + DOM）/ touch（清單）/ pointer（header）三塊，依賴單向，type-only import。
- Lane C `PointerRef` 結構型別令 `dismissSession.ts` 完全唔依賴 React，可以用 fake timer 純單元測試；26 個 test 覆蓋晒每個 transition 嘅 happy path 同防呆分支；`DismissView` re-export 保住舊 import 路徑。

## 修正優先順序

| 優先 | ID    | Item | 嚴重度 | 推薦方案                                  | 預計改動        |
| ---- | ----- | ---- | ------ | ----------------------------------------- | --------------- |
| 1    | S-527 | C    | 🟢     | A：JSDoc 寫明終態契約 + 加一個鎖契約 test | ~10 行          |
| 2    | S-525 | A    | 🟢     | B：改豁免 block 註解                      | 1–2 行          |
| 3    | S-526 | B    | 🟢     | A：`sheetDragCore.ts` 改名                | 1 檔 + 3 import |

全部係 Suggestion，唔 block merge；可以喺 release 前一齊做，或者記入 backlog。每個 ID 一個 commit（`fix: S-52X | ...`）。

## 修訂後代碼（建議片段）

S-525（方案 B）：

```js
{
    // 預留：.ts 而家冇 max-lines（hook / service 唔限檔案行數），呢個 block 暫時係 no-op；
    // 將來如果幫 .ts 加 max-lines，資料檔照樣豁免（函數上限照用）
    files: ['src/i18n/zh-HK.ts', 'src/dramas/schema.ts', 'src/dramas/registry.ts'],
    rules: { 'max-lines': 'off' },
},
```

S-527（方案 A）：

```ts
/**
 * 關閉：card 滑走（減少動畫就即刻），之後先 onDismiss（停播 + 收起）。
 * closing 係終態：之後 settleBack / 新手勢都唔再郁呢個 session。onDismiss 必須令 MiniPlayer
 * unmount（useMiniPlayer 回 null），再出現時係新 session
 */
export const dismiss = (session: Session, setView: Sync, width: number, onDismiss: () => void) => {
```

```ts
it('should stay closing after dismiss: settleBack and idle cannot revive the session', () => {
    const session = makeSession({ armed: true });
    dismiss(session, vi.fn(), WIDTH, vi.fn());
    settleBack(session, vi.fn());
    armIdle(session, vi.fn());
    vi.advanceTimersByTime(ARMED_IDLE_MS);
    expect(session).toMatchObject({ closing: true, offset: WIDTH });
});
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 97/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "92.8%"
next_action: merge_develop
next_agent: quality-assurance
branch: "refactor/size-guard/integration"
context: "Batch size-guard (AU-010 ESLint guard, S-516a useSheetDrag split, S-516b dismissSession extract) pure refactor verified behaviour-equivalent; 0 Critical / 0 Warning; Suggestions S-525, S-526, S-527 non-blocking; version bump pending release 1.18.5"
```
