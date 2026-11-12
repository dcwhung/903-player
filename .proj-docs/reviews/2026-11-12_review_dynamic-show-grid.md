# Code Review — 直版動態 ShowGrid（player 1.35.0，lane L4）

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立）
- 目標：`feature/player-dynamic-show-grid` @ `60a2c2b`，`git diff 33cbf6e..HEAD`（12 files，+512 / −57；33cbf6e mockup commit 唔 review）
- Tier：T2（MINOR，player 直版主頁版面）
- Design Origin：`mockup: _mockups_/dynamic-show-grid/index.html` + 用戶確認規則 1–5（plan `2026-11-12_plan_phase4-5.md` §L4）
- 總評：五條規則全部落實。`portraitColumns` / `spansFullRow` / `spanningPage` 係純函數，同 `paginate` 用同一個 `perPage`，所以橫跨格一定係嗰頁最尾、自己一行。橫版靠 `landscape` 唔畀 inline style、唔加 attribute，CSS media query 再保險一次。冇收斂嘅 🔴 / 🟡，只有 4 條 🟢。

## Hard Gates

all pass。

- ESLint（改動檔 + e2e 三個 `.mjs`）：exit 0；Prettier `--check`：pass
- `apps/player` `npx tsc --noEmit -p .`：exit 0（HEAD）
- 相關 unit test：`npx vitest run` ShowGrid 四個 test 檔（`ShowGrid.test.tsx`、`showGridPages.test.ts`、`showGridCss.node.test.ts`、`showGridFill.test.ts`），64 tests pass
- 冇跑 full suite / e2e（Hard Rule #7，`reviewer-test-scope` hook 會 block）；Developer 報 unit 3850 / e2e 830 pass，由 QA S1 / CI 核實
- Coverage：n/a（冇量度）；新 helper 每個分支都有 test
- Security：冇新依賴

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                     |
| -------- | ------- | ------- | -------------------------------------------------------- |
| 正確性   | 25      | 25      | 規則 1–5 對齊；量度唔兜圈；未量到有 fallback             |
| 安全性   | 20      | 20      | 純版面改動                                               |
| 可維護性 | 20      | 20      | 常數有名；`useShowGridPages` 抽走計算（🟢 S-935）        |
| 測試覆蓋 | 15      | 15      | 1–12 格 unit、CSS 斷言、e2e 手機 + iPad 直放（🟢 S-936） |
| 性能     | 10      | 10      | 只多一個 effect dependency                               |
| 代碼風格 | 10      | 10      | lint / prettier 全過                                     |
| **總分** | **100** | **100** | 結果：✅ pass                                            |

## 規則對照

| 規則                       | 落實位置                                                                                                                           | 驗證                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1 ≤ 2 格一欄、≥ 3 兩欄     | `showGridPages.ts` `portraitColumns`（`PORTRAIT_MULTI_COLUMN_MIN_TILES = 3`、`PORTRAIT_MAX_COLUMNS = 2`）                          | unit 1 / 2 / 3 / 4 / 5 / 7 / 8 / 9 / 12；e2e 2–12 格     |
| 2 單數最尾橫跨、分頁喺嗰頁 | `spansFullRow` + `spanningPage`；`ShowGrid.tsx` `data-span-last` 只加喺 `spanPage` 頁                                              | unit 9 格 4 / 4 / 1；e2e 量今日節目闊 = 內容闊           |
| 3 行數 / 分頁沿用          | `useRowsPerPage(count, columns)`：`columnPx` 按欄數計，`shrunkGridWidth` 加 `columns`                                              | unit 一欄 cap 1.3×（TOKENS）、一欄收窄 176px             |
| 4 一頁置頂、分頁 between   | CSS 改為 `.grid[data-fill][data-paged]`；單頁跟 `.grid` 嘅 `start`                                                                 | CSS test + e2e `topGapPx ≈ 0`                            |
| 5 橫版唔郁                 | `landscape` 時 `style` / `spanPage` 唔畀；`@media` 內 `grid-column: auto`、`aspect-ratio: auto`；`HomeLandscapeGrid` / fill 檔冇改 | unit 1180px 橫版 2 / 5 格冇 inline columns、冇 attribute |

量度兜圈：`ResizeObserver` 只 observe `.pager`（`flex: 1 1 0`、`min-height: 0`），`data-paged` / 欄數 / `maxWidth` 只改內部，唔會改 `.pager` 尺寸；`setLayout` 有 `sameLayout` 擋重複。effect deps 加咗 `columns`，2 → 3 格（`totalRows` 都係 2）都會重新量。

## 🟢 Suggestion / Observation（入 backlog，唔 block）

- S-935：`ShowGrid.module.css:70` `calc(2 * var(--tile-aspect-w))` 嘅 `2` 同 TS `PORTRAIT_MAX_COLUMNS` 冇連繫，改欄數要記得改兩處。L2：Chromium 量到未量到狀態橫跨格高 101.5px，其他格 98.2px（多咗欄距 × 9/32，註解已經講明）。可以 inline 畀 `--show-grid-columns`，或者喺兩邊註解互相指向。
- S-936：冇 rerender test 鎖住「格數變、`totalRows` 唔變但欄數變」要重新量（`useRowsPerPage.ts:96` deps 嘅 `columns`）。建議加 `rerender` 2 → 3 格嘅 test。
- S-937：`5b1c000` 單獨 checkout typecheck 唔過（`shrunkGridWidth` signature 改咗，`e8e9d93` 先跟），bisect 會撞。Developer 已披露。下次 helper 加 optional 參數或者同 caller 同一個 commit。
- S-938：e2e `showGridCounts.mjs` 冇 0 個節目（淨今日節目 1 格）同 9 / 12 格嘅 iPad 情境；unit 已覆蓋，屬補強。

## ✅ 做得好嘅地方

- 欄數 / 橫跨係純函數，`spanningPage` 用同一個 `perPage`，橫跨格冇可能同其他格擠埋一行。
- 橫版雙重保險（JS 唔畀 + CSS `@media` 還原），而且有 test 鎖住。
- e2e 用 remote catalog route 隔離節目數，唔改內建資料，其他 section 唔受影響。

## 修訂代碼

冇（冇 🔴 / 🟡）。

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
  no_critical: pass
  security_scan: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/player-dynamic-show-grid"
context: "L4 dynamic portrait ShowGrid player 1.35.0 review 100/100 at 60a2c2b; integration branch is main; no blocking findings; S-935..S-938 to backlog (main agent owns backlog.md); report committed locally, not pushed"
```
