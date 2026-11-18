# Code Review — 2026-11-18 — P10 lane 2：Duo 闔上・直「最近收聽」高度跟內容

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`feature/layout/iphone-duo` HEAD `32011d9`（PR → `release/v2.0.0`），`git diff origin/release/v2.0.0...HEAD`（3 檔，+133 / −0）
- Tier：T2（只加一個 Duo-only CSS `@media` 區塊 + 鎖定測試 + e2e 斷言）；Design Origin：`mockup: _mockups_/iphone-duo/index.html`（#cp「闔上・直」notes）
- Review Item ID：**S-1122、S-1123**（冇 C / W）
- 總評：**✅ pass（100 / 100）**。`40%` 喺所有 portrait 狀態都對住 `.saved`（分頁區）計，換版淡出緊都唔變；現有裝置唔受影響

## Hard Gates

all pass

- Lint / format：`savedRecentDuo.node.test.ts` `npx eslint` exit 0；`SavedTab.module.css`、`savedRecentDuo.node.test.ts` `npx prettier --check` 通過。`e2e/duo.mjs` 自己跑唔到（`reviewer-test-scope` hook 見到路徑有 `e2e` 就 block），引用 developer 喺 `32011d9` 嘅 `npm run lint` 綠
- Unit（diff 相關，自己跑）：`npx vitest run savedRecentDuo.node.test.ts recentTab.node.test.ts savedPolish.node.test.ts` → 3 files / 20 tests 全綠
- Coverage：淨 CSS 改動，冇 TS 邏輯；三條 CSS 規則都有鎖定測試（`.recent` 固定高、Duo `height` / `max-height`、`.recentScroll` `flex`）
- 冇重跑、引用 developer 喺 `32011d9` 嘅結果：`npm test` 4959 passed；`npm run e2e` 969 PASS / 0 FAIL（log 第 800–802 行係新斷言）；`npm run e2e:visual` 對 origin/main 180 / 180 一樣
- Security：冇新依賴；版本冇 bump，符合 plan（全部 lane 綠咗先 bump 2.0.0）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                       |
| -------- | ------- | ------- | ---------------------------------------------------------- |
| 正確性   | 25      | 25      | 40% 基準、換版、捲動都實測過                               |
| 安全性   | 20      | 20      |                                                            |
| 可維護性 | 20      | 20      | 區塊有註解、query 同 `DUO_COVER_PORTRAIT_QUERY` 由測試鎖住 |
| 測試覆蓋 | 15      | 15      | 缺口記喺 S-1122、S-1123（🟢，唔扣分）                      |
| 性能     | 10      | 10      |                                                            |
| 代碼風格 | 10      | 10      |                                                            |
| **總分** | **100** | **100** |                                                            |

**結果：✅ pass**

## 重點核對（L2 實測：`apps/player/dist` + vite preview + `/opt/pw-browsers/chromium`，收藏 1 個、聽過 10 集）

| Viewport                  | `data-layout` | 分頁區 `.saved` | 最近收聽 | 比例   | 換版淡出緊（`data-leaving`） | 清單捲到 |
| ------------------------- | ------------- | --------------- | -------- | ------ | ---------------------------- | -------- |
| 426 × 612（simulator）    | phone         | 291.06          | 116.42   | 40.0 % | 一樣                         | ✅ 476px |
| 430 × 690（範圍上限）     | phone         | 367.94          | 147.17   | 40.0 % | 一樣                         | ✅ 445px |
| 470 × 590（範圍最矮最闊） | phone         | 256.69          | 102.67   | 40.0 % | 一樣                         | ✅ 489px |

- **40% 基準**：`.recent` 嘅 containing block 係 `.saved`（`flex: 1 1 0` 喺 `.swap` 入面，高度 definite），`.saved` 只有左右 padding，所以 40% = 成個分頁區高，同 mockup「分頁區 40%」一致。三個 viewport 都啱啱 40.0 %
- **換版（solo / leaving / entering）**：淡出緊嘅 `.saved[data-leaving]` 係 `position: absolute; inset: 0`，containing block 變成 `.swap` 嘅 padding box；`.swap` 冇 padding，in-flow `.saved` 又係佔滿 `.swap`，兩者同高。實測加 `data-leaving` 前後高度完全一樣，淡出期間唔會跳。`data-solo` 只影響 banner，唔影響 `.recent`；`entering` 只係 opacity 動畫
- **`land` / `wide`**：Duo 區塊有 `orientation: portrait`，`SHORT_LANDSCAPE_LAYOUT_QUERY` / `WIDE_BANNER_QUERY` 全部要 landscape，所以呢個區塊生效時 `data-layout` 一定係 `phone`（實測三個都係）。`.saved[data-layout='land'] .recent`（specificity 較高）同 Duo 規則永遠唔會同時生效
- **冇收藏版**：`:not([data-fill='true'])` 排除咗，`fill` 版照舊佔滿 tab
- **捲動 / `useRowSwipe`**：`useRowSwipe` 只用喺收藏 box 行（`SavedRow.tsx`），最近收聽行冇左滑。`.recentScroll` 改 `flex: 0 1 auto` + 原有 `min-height: 0`：內容少時跟內容高（e2e 2 集 104px、冇溢出），超過上限時縮細並自己捲（上表）
- **現有裝置零改變**：query 範圍 420–470 × 590–690 portrait，凍結嘅 27 個 viewport 冇一個入到；visual diff 180 / 180 一樣，e2e 390 × 844 對照照舊 200px

## 🟢 Suggestion

- **S-1122** `apps/player/e2e/duo.mjs` `checkRecentPanel`：10 集嗰個 case 冇斷言 `many.overflows === true`（清單真係喺 panel 入面捲）。如果將來有人拎走 `.recentScroll` 嘅 `min-height: 0`，panel 照樣量到 ≤ cap、但內容會溢出 panel 外，現有斷言捉唔到；加多個條件就鎖住捲動路徑
- **S-1123** `apps/player/e2e/duo.mjs` `recentLook`：`saved: panel.top - tab.top` 連埋 `--saved-gap`，「收藏區高過佢」比實際寬鬆約 11px。可以改量 `.scroll`（收藏 box 捲動區）嘅高；而家比例 60 / 40 差距大，唔影響結果

## Observation

- 只喺 Chromium 驗過（sandbox 冇 WebKit）。百分比 `max-height` 對住 flex item（flexed 後 definite 高）喺 WebKit 係標準行為，冇證據有差，唔列 finding；QA 如有真機 / WebKit 可以順手睇

## ✅ 做得好嘅地方

- 改動收得好窄：一個 Duo-only 區塊、用 `:not([data-fill])` 避開冇收藏版，冇郁共用 token
- 測試註解寫明 `flex: 1 1 0` 喺 `height: auto` 會縮到 0 嘅原因；e2e 有 390 × 844 對照，而且新斷言冇 CSS 時係紅

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: n/a
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/layout/iphone-duo"
context: "P10 lane 2 @32011d9: Duo cover-portrait recent panel; 40% resolves against .saved in all portrait/swap states (measured); only S-1122/S-1123 (e2e assertion tightening) to clear in-session; merge target is release/v2.0.0 (no develop); report committed locally, not pushed"
```
