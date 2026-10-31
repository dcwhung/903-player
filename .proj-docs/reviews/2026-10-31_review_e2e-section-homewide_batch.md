# Batch Review — 2026-10-31 — e2e runSection + 闊橫版主頁 e2e

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 流程：標準（/fix + test），Batch 模式（2 個 fix）；hard gates 全 pass、≥ 90 分、冇 Critical → pass
- 目標（stacked，base `origin/main` `c49531a`）：
    - Section A：`fix/e2e/waitfor-timeout-log-fail` → `586c41b`（v1.21.2）
    - Section B：`feature/e2e/home-wide-checks` → `b333ddd`（v1.21.3，喺 A 上面；審閱時 checkout 呢個 branch）
- Design Origin：`none-required`（冇 `.tsx` / `.css` 改動，只係 e2e 腳本、unit test、version）
- Review Item ID：`grep -rhoE "\b[CWS]-[0-9]{3}\b" .proj-docs .tickets` 證實最高 C-011 / W-518 / S-643，今次用 **S-644 – S-646**（冇 C / W）
- 總評：**整體 ✅ pass**（A 99 / 100、B 98 / 100）。A 將「一個 waitFor 超時令成個 run 冇總結」收得乾淨：`runSection` 細、有 unit test，`git diff -w` 證實除咗包 section 之外冇邏輯改動，冇變數跨 section 斷咗。B 覆蓋闊橫版主頁 4 個狀態，斷言大部分有咬力（mutation 證實）。只有 3 個 Suggestion。

---

## 整體 verdict

- 涵蓋 commit：`586c41b`、`b333ddd`
- Status：✅ pass

### Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                           |
| ------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint e2e/harness.mjs e2e/run.mjs e2e/homeWide.mjs src/e2eSection.test.ts` exit 0；`npx prettier --check`（同上 + `package.json`）全合規                 |
| Type check    | ✅ pass | `npx tsc --noEmit -p tsconfig.app.json` exit 0（`src/e2eSection.test.ts` 喺 `src` include 入面）                                                               |
| Tests         | ✅ pass | `npx vitest run src/e2eSection.test.ts src/e2eSrcConstants.test.ts src/styles/homeCardWidth.node.test.ts`：3 files / 20 tests 全綠（full unit / e2e 由 QA 跑） |
| Coverage      | ✅ pass | `runSection` 兩個分支（成功 / throw）+ `firstLine` 兩個分支（Error / 非 Error）全部有 test 行到 → 100%；`homeWide.mjs` 本身係 e2e，n/a                         |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                         |
| Security scan | ✅ n/a  | 冇依賴改動（`package-lock.json` 只改 version 1.21.1 → 1.21.3）                                                                                                 |

### Version bump

- A：1.21.1 → 1.21.2 ✅；B：1.21.2 → 1.21.3 ✅（`package.json` + `package-lock.json` 一致）

---

## Section A — `586c41b` fix(e2e)：section throw 都 log FAIL 再行落去

### 改動清單

- `e2e/harness.mjs`：`firstLine(error)` + `runSection(log, label, run)`：try → `true`；catch → `log(false, "<label>：中途中止（<第一行>）")` → `false`
- `e2e/run.mjs`：每個 top-level section 包 `runSection`；390×844 主流程成段縮排（`-w` 之後真正改動只係包裝 + prettier 重排長行）
- `src/e2eSection.test.ts`：4 個 test（成功唔 log、throw log 一個 FAIL、只留第一行、非 Error throw）

### 針對 caller 提出嘅風險逐項核實

| 風險                                        | 結論                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 本來跨 section 共用嘅變數而家困咗喺 closure | ✅ 冇事。`errors` 搬咗去 try 頂層（喺所有 section 之前），全部 section 照共用；`context` / `page` 只喺主流程用，之後冇人引用（eslint `no-undef` exit 0 亦證實）。`metrics` / `todayMetrics`（module 層）、`sheetMissedTaps`（module 層 `let`，section 入面 assign）冇受影響                                                                                                                                                  |
| section 之後依賴佢設嘅 state                | ✅ 冇。每個 section 自己開 `newE2EContext`（獨立 storage / clock）；主流程中途 throw 只會令 `metrics` 表少幾行同 `sheetMissedTaps` 保持 0（INFO 唔印），兩樣都只係資訊性輸出                                                                                                                                                                                                                                                 |
| section throw 留低打開咗嘅 context          | ⚠️ 會留低（見 S-644）。冇 try/finally：`narrow` / `loop` / `small` / 迴圈 `ctx` 同外部模組入面開嘅 context throw 之後唔會 close，直到 `finally` `browser.close()`。影響只喺「已經有一個 FAIL」嘅 run：leak 咗嘅頁可能仲播緊音 / 跑 timer，搶 CPU，令後面計時敏感 check（卡住 watchdog、背景播放）出連鎖 FAIL；佢哋嘅 `pageerror` 仲會寫入 `errors`，令最尾「冇 JS error」多一個 FAIL。第一個 FAIL 永遠準確，所以唔開 Warning |
| 次序                                        | probe 兩個 check 而家喺主流程開 context 之前行（以前喺 `newPage` 之後、`goto` 之前），兩者獨立，冇影響                                                                                                                                                                                                                                                                                                                       |
| 主流程 context 冇 close                     | 舊問題（v1.21.1 之前已經係咁），唔計入今次                                                                                                                                                                                                                                                                                                                                                                                   |

### 發現

#### 🟢 S-644 — Section throw 之後 context 冇 close，可能引出連鎖 FAIL

- 位置：`e2e/harness.mjs:256`（`runSection`）；`e2e/run.mjs` 各 section（例如 `320×640 窄畫面`、`主頁頁頂橫額` 迴圈）
- 描述：`runSection` 令 run 喺 throw 之後繼續，但 throw 嗰個 section 開嘅 context 唔會 close。
- 影響：失敗 run 入面後面 section 可能因 CPU 爭用 / 殘留 `pageerror` 出假 FAIL，削弱今次修正想要嘅「一個 FAIL 指出真兇」。
- 方案 A：`runSection` 收 `browser`，開始前記低 `browser.contexts()`，catch 入面 close 新開嘅 context。
    - 優：一處改、全部 section（包括外部模組）受惠。缺：簽名多一個參數；要小心唔好 close 主流程（只喺失敗時 close「今次 section 新開」嗰啲就冇問題）。
- 方案 B：每個 section 用 `try { … } finally { await ctx.close(); }`，或者加 `withContext(browser, opts, fn)` helper。
    - 優：成功路徑都保證 close，意圖清楚。缺：要改十幾處 + 外部模組，diff 大。
- 推薦：A（細改動，對準「失敗後繼續」呢個新行為）。

### 評分

| 維度     | 得分   | 滿分    | 備注                  |
| -------- | ------ | ------- | --------------------- |
| 正確性   | 25     | 25      |                       |
| 安全性   | 20     | 20      |                       |
| 可維護性 | 19     | 20      | S-644                 |
| 測試覆蓋 | 15     | 15      | 4 個 unit test 全分支 |
| 性能     | 10     | 10      |                       |
| 代碼風格 | 10     | 10      |                       |
| **總分** | **99** | **100** |                       |

**結果：✅ pass**

### TDD

- 單一 commit（test + 實作一齊），但 commit message 有「注入 timeout 到 `checkMiniPlayerPosition` → 1 FAIL / 594 PASS / 有總結 / exit 1」嘅紅綠證據，接受。

---

## Section B — `b333ddd` test(e2e)：闊橫版主頁 fill / split / ✕ / 把手

### 改動清單

- `e2e/homeWide.mjs`（新，178 行）：1180×820；`checkFill`（星期日）、`checkSplit`（36% 卡欄、格喺卡左、卡入面「集數 · 共 N 集」清單）、`checkCloseAndReopen`（✕ 停播 → `fillWithHandle`、把手貼右邊、格變闊 → 把手開返、暫停冇自動播）
- `e2e/run.mjs`：`runSection(log, '闊橫版主頁', …)` 註冊喺「Mini player 重溫規則」之後、「廣播劇」之前

### 對 app 代碼核實

- `HomeWide.tsx`：`<main data-layout={mode}>` → `gridColumn` + `SplitCard` / `HomePlayerHandle`；`[data-home-card]` 嘅 `closest('main > *')` 係卡欄（`flex: 0 0 calc(100% * var(--home-pane-ratio))`），所以 `column.width / content` 量嘅正係 token 比例 ✅
- `homeLayoutMode.ts`：`cardClosed` 優先 → `fillWithHandle`，同 e2e 期望一致 ✅
- `HomePlayerCard.tsx`：✕（`miniPlayer.dismissLabel` = 關閉播放器）喺 `section[data-home-card]` 嘅兄弟位，`CardHeader` 係 section 第一個 button（見 S-646）
- Measure 喺 View Transition 期間：`getBoundingClientRect` 量嘅係真 DOM（過場只係 snapshot），所以 `before` / `after` 闊度比較唔受動畫影響 ✅

### `PANE_RATIO = 0.36` 寫死：接受

- 同 `run.mjs` 頂嘅顏色常數一樣，係「獨立期望」：token 被改錯（mutation 0.4）e2e 會紅，呢個正係想要嘅保護。
- 如果經 `e2eSrcConstants.test.ts` 鎖成「e2e 常數 = token」，兩邊會一齊郁，e2e 就變成量自己，失去獨立性。
- 「CSS 用 token」呢一半已經由 `src/styles/homeCardWidth.node.test.ts` 鎖住（`flex: 0 0 calc(100% * var(--home-pane-ratio))`），兩層覆蓋互補。刻意改比例時要同步改 e2e 常數，註釋已經指去 `tokens.css --home-pane-ratio`，夠清楚。

### 發現

#### 🟢 S-645 — 「成頁唔郁」斷言恆真

- 位置：`e2e/homeWide.mjs:89-96`（`checkCardEpisodes`）
- 描述：用 JS 設 `ul.scrollTop = 200`，再讀 `document.scrollingElement.scrollTop`。直接改元素 `scrollTop` 永遠唔會捲到 document，所以 `page === 0` 恆真；`list > 0` 只證明清單溢出得。
- 影響：卡清單 scroll chaining 漏去成頁（例如冇 `overscroll-behavior` / 主頁冇 lock）呢類回歸捉唔到，但 log 寫住「成頁唔郁」。
- 方案 A：`hover` 清單後 `page.mouse.wheel(0, LIST_SCROLL_PX)`（捲到底再 wheel 一次測 chaining），再讀清單同 `main` / document 嘅 scroll。
    - 優：同用戶操作一致，真係測到「成頁唔郁」。缺：wheel 係 async smooth scroll，要 `waitForFunction` 等清單 scrollTop 變。
- 方案 B：保留 JS 設 scrollTop，但 log 改做「清單溢出、可以自己捲」，「成頁唔郁」交返畀 `checkFixedHome` 類 check。
    - 優：零 flake。缺：闊橫版主頁冇真手勢覆蓋。
- 推薦：A。

#### 🟢 S-646 — 兩個 locator 綁死 DOM 結構

- 位置：`e2e/homeWide.mjs:137`（`card(p).locator('..').getByRole('button', { name: CLOSE_LABEL })`）、`:162`（`card(p).getByRole('button').first()`）
- 描述：第一個靠 ✕ 係 `section` 兄弟（`ThemeScope` 入面）；第二個靠 `CardHeader` 係卡入面第一個 button。卡結構一調（例如 ✕ 搬入 section、header 前面加指示點掣），會出「搵唔到 / 搵錯 button」而唔係有意義嘅 FAIL。
- 影響：維護成本、FAIL 訊息誤導（尤其 `.first()` 搵錯會 log 一個唔相干嘅 aria-label）。
- 方案 A：用 role + name：`p.getByRole('button', { name: CLOSE_LABEL, exact: true })`（split 時底部冇 mini player，全頁唯一）；header 用 `card(p).getByRole('button', { name: new RegExp(REWATCH_SHOW.name) })`，斷言改做 `count() === 1`。
    - 優：跟無障礙語意，唔跟 DOM 層次。缺：header aria-label 文案改要同步。
- 方案 B：app 加 `data-home-card-close` / `data-home-card-header` hook。
    - 優：最穩。缺：為 test 改 production markup（雖然已有 `data-home-card` / `data-home-handle` 先例）。
- 推薦：A。

#### 觀察（唔開 ID）

- `checkFill` 喺 `hasLayout('fill')` 成立後即刻數卡 / mini / 把手。如果 mini player 遲過 `nav[aria-busy=false]` 先出，check 可能喺 flip 去 `split` 之前 pass。實際上星期日假數據冇節目，加上 `miniPlayerRules.mjs` 已經覆蓋星期日規則，風險低。
- `✕` 同「開返」兩個 playback 斷言用 `!== 'playing'`（`none` 都算 pass）；配埋 header 名字 check，足夠證明「開返係閂咗嗰個節目、冇自動播」。

### 評分

| 維度     | 得分   | 滿分    | 備注                                   |
| -------- | ------ | ------- | -------------------------------------- |
| 正確性   | 25     | 25      |                                        |
| 安全性   | 20     | 20      |                                        |
| 可維護性 | 19     | 20      | S-646                                  |
| 測試覆蓋 | 14     | 15      | S-645；其他斷言 mutation 證實有咬力    |
| 性能     | 10     | 10      | 每情境獨立 context，成功路徑全部 close |
| 代碼風格 | 10     | 10      | 常數全部命名 + 註釋，冇 magic number   |
| **總分** | **98** | **100** |                                        |

**結果：✅ pass**

### TDD

- 純 test commit；mutation（`--home-pane-ratio: 0.4`、✕ 唔停播）都轉紅，等同紅燈證據，接受。

---

## ✅ 做得好嘅地方（跨 fix 通用）

- `runSection` 細而專一：唔重複 log 成功、只取 Playwright error 第一行，FAIL 訊息短而有用；unit test 用 URL 動態 import，同 `e2eSrcConstants.test.ts` 一致。
- 大段縮排用 `git diff -w` 驗證得到，commit message 有提，審閱成本低。
- `homeWide.mjs` 每個情境獨立 context + 獨立 clock，唔受主流程播過乜影響；`if (!split) return ctx.close()` 前提唔成立就早退，唔會一連串假 FAIL。
- 所有門檻（容差、等待、邊緣 px）都係命名常數 + 原因註釋。
- `0.36` 做獨立期望嘅取捨啱：同 node test 互補，唔係重複。

## 修正優先順序

| 次序 | ID    | Fix | 嚴重度 | 建議                               |
| ---- | ----- | --- | ------ | ---------------------------------- |
| 1    | S-645 | B   | 🟢     | wheel 真手勢測捲動                 |
| 2    | S-644 | A   | 🟢     | runSection 失敗時 close 新 context |
| 3    | S-646 | B   | 🟢     | role + name locator                |

全部係 Suggestion，唔阻 merge；可以喺下一個 e2e commit 順手做（每個 ID 一個 commit）。

## 修訂後代碼（參考）

S-644 方案 A：

```js
// e2e/harness.mjs
/**
 * 行一個 e2e section：中途 throw 就 log 一個 FAIL、close 呢個 section 新開嘅 context（S-644：
 * 唔好留低播緊嘅頁搶 CPU / 寫 pageerror，令後面出連鎖 FAIL），再行落去
 */
export const runSection = async (log, label, run, browser) => {
    const before = new Set(browser?.contexts() ?? []);
    try {
        await run();
        return true;
    } catch (error) {
        log(false, `${label}：中途中止（${firstLine(error)}）`);
        const leaked = (browser?.contexts() ?? []).filter((ctx) => !before.has(ctx));
        await Promise.allSettled(leaked.map((ctx) => ctx.close()));
        return false;
    }
};
```

S-646 方案 A：

```js
// e2e/homeWide.mjs
// split 時底部冇 mini player，✕ 全頁唯一（S-646：唔靠 ✕ 係卡嘅兄弟）
await p.getByRole('button', { name: CLOSE_LABEL, exact: true }).click();
// …
// 開返之後卡頁頭（開頁掣）要係閂咗嗰個節目（S-646：唔靠「第一個 button」）
const header = card(p).getByRole('button', { name: new RegExp(REWATCH_SHOW.name) });
log(
    reopened && (await header.count()) === 1,
    `${label}：撳把手開返張卡，係閂咗嗰個節目（${await layoutOf(p)}）`,
);
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
  coverage: "100%"
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/e2e/home-wide-checks"
context: "Batch pass: 586c41b runSection (99) + b333ddd homeWide e2e (98); only S-644..S-646 suggestions; QA to run full unit + e2e (expect 612 PASS)"
```
