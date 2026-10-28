# Batch Review — 2026-10-27 — cleanup（S-525 / S-526 / S-527 / Q-1 / Q-2 / Q-3）

- **日期**：2026-10-27
- **審閱者**：Code Reviewer（獨立角色，冇參與編寫）
- **流程**：Protocol 1 · `/refactor` · Batch（6 item / 4 lane）
- **目標**：`refactor/cleanup/integration`（HEAD `0ecdfd4`），base `origin/main@1e60035`（v1.18.5）
- **背景**：S-525 / S-526 / S-527 出自 `.proj-docs/reviews/2026-10-27_review_size-guard_batch.md`；Q-1 / Q-2 / Q-3 出自 `.proj-docs/qa/2026-10-27_qa_size-guard_batch.md`
- **總評**：Production 代碼零邏輯改動 — `dismissSession.ts` / `useDismissGesture.ts` 只加 JSDoc，`sheetDragCore.ts` → `useSheetDragControls.ts` 係 100% similarity rename。`eslint.config.js` 用 `--print-config` 對 base 版本逐檔比較，7 個代表檔（`.ts` / `.tsx` / `.test.tsx` / `.node.test.ts` / 資料檔 / `e2e/*.mjs`）resolved config 逐 byte 一樣。新 unit test 用 mutation 驗證過：故意整壞 `takePress` / `onPointerCancel` / `settleBack` 嘅 closing guard，新 test 全部變紅。新 e2e 結構清楚、常數具名兼註明來源，只係有兩處可以再穩陣啲。冇 Critical、冇 Warning，得 2 個 🟢 Suggestion。

## 整體 verdict

- 涵蓋 commit：`7e061a6`（A · S-525）、`108fd76`（B · S-526）、`26881c4` + `62957ed` + `30373ec`（C · S-527 / Q-2 / Q-3）、`ab24e89`（D · Q-1）；merge commit `ffe78ee`、`329e4ad`、`61294d4`、`0ecdfd4`
- 整體 score：**98/100**
- Status：**✅ pass**（hard gates 全過、冇 Critical、每個 item ≥ 90）
- Version：未 bump 符合 `sw-parallel-dispatch` 流程（release 時統一 bump 去 1.18.6），唔當 Warning
- Design Origin：`none-required` 合理 — diff 冇 `.tsx` / `.css` / `.scss` production 改動；唯一 `.tsx` 係 `MiniPlayer.test.tsx`（test），冇新 className / layout
- **流程備註**：batch 有 6 個 item，超過 `sw-parallel-dispatch` 嘅 5 個 cap。因為 6 個 item 入面 4 個係 test-only、1 個係純 rename、1 個係 lint config 註解，而且每個 item 都有獨立 Section + 獨立評分，今次照審；下次請 main agent 喺 dispatch 時 split（例如 S-525/526/527 一 batch、Q-1/2/3 一 batch）。

### Hard Gates

| Gate          | 結果    | 證據                                                                                                                       |
| ------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint .` exit 0                                                                                                      |
| Prettier      | ✅ pass | `npx prettier --check .` → All matched files use Prettier code style                                                       |
| Type check    | ✅ pass | `npx tsc -b --noEmit` exit 0                                                                                               |
| Tests（相關） | ✅ pass | `npx vitest run src/components/ArcSheet src/components/MiniPlayer` → **156 passed / 0 failed**                             |
| Coverage      | ✅ pass | Production 只改 JSDoc / 檔名，執行路徑冇變，覆蓋率同上一輪一樣（`dismissSession.ts` 100%、`useDismissGesture.ts` 92.8%）   |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                     |
| Security scan | n/a     | 冇新增依賴（`package.json` / lock 冇改）；e2e 冇外網 — 劇集 R2 音檔 route 做 404，其餘音檔由 `harness.mjs` 原有 route 接住 |
| 循環 import   | ✅ pass | `npx -y madge --circular --extensions ts,tsx src` → No circular dependency found（365 files）                              |

### 評分結果（整體）

| 維度     | 得分   | 滿分    | 備注                                                 |
| -------- | ------ | ------- | ---------------------------------------------------- |
| 正確性   | 25     | 25      | 零邏輯改動；lint resolved config 前後一致            |
| 安全性   | 20     | 20      | 冇新輸入面 / 依賴；e2e 唔出外網                      |
| 可維護性 | 19     | 20      | S-528（-1）                                          |
| 測試覆蓋 | 14     | 15      | S-529（-1）；新 unit test 經 mutation 驗證會捉到退化 |
| 性能     | 10     | 10      | 冇 runtime 改動                                      |
| 代碼風格 | 10     | 10      | Prettier / ESLint 全過；test / e2e 常數具名          |
| **總分** | **98** | **100** |                                                      |

**結果：✅ pass**

| Item                      | 分數 | Status  |
| ------------------------- | ---- | ------- |
| A · S-525 eslint config   | 100  | ✅ pass |
| B · S-526 rename          | 100  | ✅ pass |
| C1 · S-527 closing 契約   | 100  | ✅ pass |
| C2 · Q-2 短按放手         | 100  | ✅ pass |
| C3 · Q-3 pointercancel    | 100  | ✅ pass |
| D · Q-1 ArcSheet 拉閂 e2e | 98   | ✅ pass |

---

## Section A — S-525：`eslint.config.js` 註解 + `.claude/**` ignore

- **Commit**：`7e061a6`（merge `329e4ad`）
- **改動清單**：`ignores` 加 `.claude/**`（附原因註解）；`src/**/*.ts` block 刪冗餘 `**/*.node.test.ts`（註明 `**/*.test.ts` 已包）；資料檔豁免 block 註明而家係 no-op（方案 B）；test / e2e / scripts block 註明「雙保險」

### 核對結果

| 檢查                                   | 結果 | 說明                                                                                                                                                                                                                                                                                                              |
| -------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint 行為不變                          | ✅   | 用 `git show 1e60035:eslint.config.js` 做 base config，`npx eslint --print-config` 比較 `useSheetDrag.ts`、`MiniPlayer.tsx`、`MiniPlayer.test.tsx`、`dismissSession.test.ts`、`src/styles/touchLock.node.test.ts`、`src/i18n/zh-HK.ts`、`e2e/arcSheet.mjs` → 7 個全部 byte-identical（約 46 KB JSON，唔係空輸出） |
| 刪 `**/*.node.test.ts` 安全            | ✅   | minimatch `**/*.test.ts` 本身 match `x.node.test.ts`；`touchLock.node.test.ts` resolved `max-lines-per-function` = off（`0`）前後一樣                                                                                                                                                                             |
| `.claude/**` ignore 冇漏 lint 正式代碼 | ✅   | `git ls-files .claude` 只有 `session-logs/*.md`，冇任何 `.js` / `.ts`；ignore 只係擋 `.claude/worktrees/`                                                                                                                                                                                                         |
| 註解準確                               | ✅   | 「預留 / no-op」同「雙保險」描述同實際 config 一致                                                                                                                                                                                                                                                                |

### 發現

冇。

---

## Section B — S-526：`sheetDragCore.ts` → `useSheetDragControls.ts`

- **Commit**：`108fd76`（merge `ffe78ee`）
- **改動清單**：`git mv`（similarity 100%）+ `useSheetDrag.ts` / `useListTouchDrag.ts` / `useSheetPointerDrag.ts` 3 個 import

### 核對結果

| 檢查                 | 結果 | 說明                                                               |
| -------------------- | ---- | ------------------------------------------------------------------ |
| 內容冇變             | ✅   | `git diff` 顯示 `similarity index 100%`                            |
| 冇殘留舊路徑         | ✅   | `tsc -b` 過；`grep sheetDragCore src` 冇結果（只剩 docs 歷史紀錄） |
| 檔名符合 `use*` 慣例 | ✅   | 檔案 export `useSheetDragControls`，檔名同主 export 一致           |
| 冇新循環 import      | ✅   | madge 過                                                           |

### 發現

冇。

---

## Section C1 — S-527：`closing` 終態契約 JSDoc + 鎖契約 test

- **Commit**：`26881c4`（merge `61294d4`）
- **改動清單**：`dismissSession.ts` `dismiss` JSDoc（+4 / -1，全部係註解）；`useDismissGesture.ts` `Callbacks.onDismiss` + hook `@param onDismiss` JSDoc（+7，全部係註解）；`dismissSession.test.ts` +18（`it.each` 2 個 case）

### 核對結果

| 檢查                      | 結果 | 說明                                                                                                                                                 |
| ------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production 只改 JSDoc     | ✅   | 兩個檔嘅 diff 全部係 `/** … */` 行，冇一行可執行代碼改動                                                                                             |
| 契約描述同實作一致        | ✅   | `settleBack` 有 `session.closing` guard；`armIdle` 排嘅 timer 最終行 `settleBack` 亦被 guard；新手勢由 `onPointerDown` 嘅 `session.closing` guard 擋 |
| Test 測到真實行為         | ✅   | Mutation：拎走 `settleBack` 入面 `\|\| session.closing` → 兩個新 `it.each` case 同原有「sliding away」test 一齊紅                                    |
| 覆蓋滑走前 / 後兩個時間點 | ✅   | `DISMISS_SLIDE_MS - ONE_MS` 同 `DISMISS_SLIDE_MS`，再推 `ARMED_IDLE_MS` 確認 idle timer 唔會救返；常數全部具名                                       |

### 發現

冇（見下面「做得好」）。

---

## Section C2 — Q-2：短按未到 `LONG_PRESS_MS` 放手唔會浮起

- **Commit**：`62957ed`（merge `61294d4`）
- **改動清單**：`MiniPlayer.test.tsx` 加共用常數 `PRESS_X` / `PRESS_Y` / `POINTER_ID` / `SHORT_PRESS_MS = LONG_PRESS_MS / 2`（有 JSDoc）+ 1 個 RTL test

### 核對結果

| 檢查              | 結果 | 說明                                                                                                                                      |
| ----------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 測到真實 bug 情境 | ✅   | Mutation：`takePress` 唔 `clearTimeout(session.longPress)` → 新 test 紅（同時紅埋 `dismissSession.test.ts` 原有 test 同 Q-3 第二個 test） |
| 斷言完整          | ✅   | 放手後再推 `LONG_PRESS_MS`，斷言冇 `data-armed` / `data-lifted` / `data-pressing`，`onChange` / `onDismiss` 都冇叫                        |
| Magic number      | ✅   | 冇；`SHORT_PRESS_MS` 由 `LONG_PRESS_MS` 推算                                                                                              |

### 發現

冇。

---

## Section C3 — Q-3：`onPointerCancel` 2 個 test

- **Commit**：`30373ec`（merge `61294d4`）
- **改動清單**：`MiniPlayer.test.tsx` 新 `describe('pointercancel')`：(1) 浮起後拉到 `FAR_LEFT_X`（過晒成個 card 闊度）再 cancel → 彈返原位、冇 closing、冇 `onDismiss` / `onChange`；(2) 未浮起就 cancel → 長按取消

### 核對結果

| 檢查                      | 結果 | 說明                                                                                                                                         |
| ------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 會捉到「cancel 當放手」   | ✅   | Mutation：`onPointerCancel` 改行 `release(...)`（即當 pointerup）→ test (1) 紅；`FAR_LEFT_X` 特登揀過 dismiss 門檻，令呢個退化一定會觸發關閉 |
| 會捉到「cancel 唔 reset」 | ✅   | Mutation：`onPointerCancel` 只 `takePress` 唔 `settleBack` → test (1)、(2) 都紅                                                              |
| 斷言 offset 真係歸零      | ✅   | `toHaveStyle({ '--mini-dismiss-offset': '0px' })`，唔止睇 attribute                                                                          |
| Magic number              | ✅   | `FAR_LEFT_X = PRESS_X - CARD_WIDTH` 有註解講點解要咁遠                                                                                       |

### 發現

冇。

---

## Section D — Q-1：ArcSheet 向下拉閂 e2e

- **Commit**：`ab24e89`（merge `0ecdfd4`）
- **改動清單**：新 `e2e/arcSheet.mjs`（+171）；`e2e/run.mjs` +4（import + 喺 `runTouchChecks` 之後呼叫 `runArcSheetChecks`）。只改 `e2e/`。

### 核對結果

| 檢查                | 結果 | 說明                                                                                                                                                                                                                              |
| ------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 覆蓋三條路          | ✅   | 觸控 header（pointer）、觸控清單（touch，先捲返頂）、滑鼠 header（pointer）；各測彈返 + 閂表                                                                                                                                      |
| 表高唔 hardcode     | ✅   | 每次拖之前用 `boundingBox().height` 量，`dy` 由 `SHEET_DISMISS_RATIO` 推算                                                                                                                                                        |
| 唔會意外變「甩」    | ✅   | 核對 `useSheetDragControls.ts` `release()`：放手位置當一個新樣本，`pushSample` 掉走 `VELOCITY_WINDOW_MS`（100ms）以外嘅樣本；`HOLD_BEFORE_RELEASE_MS = 200` 之後窗口只剩放手樣本 → velocity = 0，閂唔閂淨係睇距離。註解同實作一致 |
| 跟手指斷言          | ✅   | `FOLLOW_TOLERANCE_PX = 16` > `DRAG_INTENT_PX = 10`（清單路接手前損失嘅距離），有註明原因                                                                                                                                          |
| 彈返 / 閂表 margin  | ✅   | 彈返用門檻一半（`SNAP_BACK_RATIO`）；閂表用門檻 + `DISMISS_MARGIN_PX = 40`，兩邊都離門檻好遠                                                                                                                                      |
| 起始狀態            | ✅   | `useSeriesSheet` 嘅 `useState(firstVisit)` 同步 render，冇 lazy import；`openSheet` 表唔喺度先撳「全集」，再 `waitFor visible` + 斷言冇殘留 transform                                                                             |
| 冇外網              | ✅   | R2 劇集音檔 route 做 404；其他音檔由 `newE2EContext` 原有 route 處理                                                                                                                                                              |
| 常數具名 + 註明來源 | ✅   | 全部常數有名，跨檔常數都註明 `src/...` 出處                                                                                                                                                                                       |

### 發現

#### 🟢 S-528 — e2e 複製咗 3 個 `src` 常數，冇機制保證同步

- **位置**：`e2e/arcSheet.mjs:11`（`DRAMA_AUDIO_BASE`）、`:14`（`SHEET_DISMISS_RATIO`）、`:19-21`（依賴 `VELOCITY_WINDOW_MS` = 100）
- **描述**：三個值都係手抄 `src/config/constants.ts`、`src/components/ArcSheet/sheetDrag.ts`、`src/components/ShowCardStack/cardStack.ts`，註解有寫出處，但冇嘢會喺佢哋唔同步時報錯。
- **影響**：將來改 `DRAMA_AUDIO_BASE` → e2e route 唔再接住，頁面會真係去外網攞音檔（e2e 可能照過，但變咗有外網依賴）；改 `SHEET_DISMISS_RATIO` 去 0.4 → 閂表 case 嘅 `dy` 唔夠，e2e 紅但原因唔明顯。
- **方案 A**：加一個 `*.node.test.ts`（例如 `e2e/arcSheetConstants.node.test.ts` 或者放 `src/components/ArcSheet/`）讀 `e2e/arcSheet.mjs` export 嘅常數，`expect` 同 `src` 嗰邊相等。Trade-off：要 export 常數，多一個 test 檔；但改 src 時即刻提醒。
- **方案 B**：`DRAMA_AUDIO_BASE` 搬去 `e2e/harness.mjs`，同 `AUDIO_HOST` 放埋一齊，並喺 `newE2EContext` 統一 route 做 404；ratio 繼續手抄。Trade-off：解決外網風險（最重要嗰個），ratio 同步仍然靠人。
- **推薦**：B（外網風險係 e2e 規則硬要求），有時間再加 A。

#### 🟢 S-529 — 放手後用固定 `SETTLE_MS` 等，冇等條件

- **位置**：`e2e/arcSheet.mjs:27`、`:54`（`dragDown` 入面 `waitForTimeout(SETTLE_MS)`）；之後 `checkDismiss` 即刻 `count()`、`checkSnapBack` 即刻讀 transform
- **描述**：閂表需時 = `SHEET_SLIDE_MS`（250ms）+ `onClose` re-render，700ms 有 ~2.8 倍 margin，正常唔會 flaky；但 CI 機好忙時固定 sleep 係最常見嘅 flake 來源，同時每個 case 都硬食 700ms。
- **影響**：低機率 false fail；e2e 每個 case 多等幾百 ms。
- **方案 A**：閂表改 `await sheetOf(p).waitFor({ state: 'detached', timeout: 5000 })`；彈返改 `p.waitForFunction` poll 到 `style.transform === ''`（再加短 timeout 斷言佢真係冇閂）。Trade-off：穩陣兼快；彈返 case 仍要一個「確認冇閂」嘅等待窗口。
- **方案 B**：保留 sleep，但 `SETTLE_MS` 改由 `SHEET_SLIDE_MS` 推算（例如 `SHEET_SLIDE_MS * 3`）並註明。Trade-off：改動最少，冇解決根本問題。
- **推薦**：A（同 repo 其他 e2e 一樣大量用 `waitForTimeout`，唔係今次引入嘅新問題，所以只係 Suggestion）。

---

## ✅ 做得好嘅地方（跨 item 通用）

- **零 production 邏輯改動**：清理 batch 嚴守範圍，S-527 只寫 JSDoc、S-526 純 rename，風險極低。
- **Lint 改動有證據**：S-525 刪 glob 之前確認 `**/*.test.ts` 已包 `*.node.test.ts`，resolved config 前後一致。
- **Test 質素高**：Q-2 / Q-3 / S-527 嘅 test 每個都可以被對應嘅 mutation 打紅，唔係「寫咗等於冇寫」嘅 test；常數一律具名、由 production 常數推算。
- **e2e 設計細心**：`HOLD_BEFORE_RELEASE_MS` 特登避開速度判斷，令「拉夠距離閂」同「甩閂」分得開；表高即場量，唔 hardcode；觸控清單路先捲返頂，貼近真實用法。

## 修正優先順序

| 優先 | ID    | 項目                                                  | 建議時機                    |
| ---- | ----- | ----------------------------------------------------- | --------------------------- |
| 1    | S-528 | `DRAMA_AUDIO_BASE` 搬去 `harness.mjs` / 常數同步 test | 下次掂 e2e 時               |
| 2    | S-529 | `SETTLE_MS` 改等條件                                  | 下次掂 e2e 時，或見到 flake |

兩項都唔 block release。

## 修訂後代碼（S-529 方案 A 示意，未套用）

```js
// e2e/arcSheet.mjs — 放手後等條件，唔再固定 sleep
const SETTLE_TIMEOUT_MS = 5000;

/** 閂表：等表 detach */
const waitClosed = (p) =>
    sheetOf(p)
        .waitFor({ state: 'detached', timeout: SETTLE_TIMEOUT_MS })
        .then(() => true)
        .catch(() => false);

/** 彈返：等 inline transform 清空（放手彈返會清） */
const waitRested = (p) =>
    p
        .waitForFunction(
            () => document.querySelector('[role="dialog"]')?.style.transform === '',
            undefined,
            { timeout: SETTLE_TIMEOUT_MS },
        )
        .then(() => true)
        .catch(() => false);
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 98/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "92.8%"
next_action: merge_develop
next_agent: quality-assurance
branch: "refactor/cleanup/integration"
context: "Batch cleanup (S-525 eslint config, S-526 rename useSheetDragControls, S-527 closing JSDoc + test, Q-2/Q-3 MiniPlayer RTL tests, Q-1 ArcSheet drag e2e) — zero production logic change, eslint print-config identical, new tests mutation-verified; 0 Critical / 0 Warning; Suggestions S-528, S-529 non-blocking; batch had 6 items (> 5 cap) — split next time; version bump pending release 1.18.6"
```
