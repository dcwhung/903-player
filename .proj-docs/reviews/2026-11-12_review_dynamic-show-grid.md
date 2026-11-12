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

## Re-review（S-935–S-938）

- 日期：2026-11-12；目標：`eb1812a`，`git diff aebb087..HEAD`（5 files，+183 / −31）；S-937 另驗 `git rev-list 33cbf6e..HEAD`
- 結果：S-935、S-936、S-937、S-938 **全部已處理**。冇收斂嘅 🔴 / 🟡；新增 3 條 🟢（S-939–S-941）。分數維持 100/100，✅ pass

### Hard Gates

all pass。

- ESLint + Prettier `--check`（5 個改動檔）：pass；`apps/player` `npx tsc -b`：exit 0
- 相關 unit：ShowGrid 五個 test 檔 74 tests pass；e2e 冇跑（Hard Rule #7），Developer 報 e2e 860 PASS，`eb1812a` CI run `43323673299` 跑緊，由 QA 引用

### 逐條核實

| ID    | Commit              | 核實                                                                                                                                                                                                                                                                                                                                                    | 狀態      |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| S-935 | `6ace44c`           | 數學：橫跨格高 `(100cqi − (n − 1) × gap) / n × 9 / 16`，`100cqi` = `.grid` content box（已扣 gutter），等於 `minmax(0, 1fr)` 一欄闊 × 16:9，同其他格一樣高。`--show-grid-columns` inline 覆蓋 `.grid` 預設 1；React custom property 唔加 `px`（test 鎖 `'2'`）。`@supports not (width: 1cqi)` 喺主規則之後、`@media` 橫版之前，橫版 `height: auto` 還原 | ✅ 已處理 |
| S-936 | `7c10b06`           | Mutation：將 `useRowsPerPage.ts` deps 嘅 `columns` 拎走，新 test fail（1 failed / 16），還原後 pass，真係鎖住                                                                                                                                                                                                                                           | ✅ 已處理 |
| S-937 | `f715e92`（squash） | Scratch worktree 逐個 commit `tsc -b --force`：`f715e92`、`d69f6c2`、`384721d`、`aebb087`、`7c10b06`、`6ace44c`、`eb1812a` 全部 exit 0、冇輸出                                                                                                                                                                                                          | ✅ 已處理 |
| S-938 | `eb1812a`           | 0 個節目 → schema 拒絕、退返內建（格數由 `buildCatalogDocument` 計，唔寫死 8）；iPad 9 / 12 格 `tabletPages: 1`；今日節目同第一格同高（填滿）；拎走 `data-fill` 量未量到狀態，鎖 S-935（舊公式差 3.4px > 容差 2px，會 fail）                                                                                                                            | ✅ 已處理 |

`container-type: inline-size` 對其他 layout 嘅影響（L2 讀 code 核實，冇問題）：

- `.grid` 係 `flex: 0 0 100%`，闊度唔靠內容，inline-size containment 唔改闊；`useRowsPerPage` 量 `viewport.clientWidth`，唔受影響
- 格入面（`ShowTile`、`NewBadge`）冇用 `cq*` 單位或者 `@container`；`--player-shell-height: 100cqh` 要 block 軸 container，`.grid` 只係 inline-size，照舊對住 `.scope`
- Layout containment 令 `.grid` 做 fixed / absolute containing block 同 stacking context：格入面冇 fixed 元素（`MiniPlayer` / `ViewportDebug` 用 portal），card zoom 用 `getBoundingClientRect`（viewport 座標），唔受影響
- 橫版：同一個 `.grid` 規則，4 × 2 由 `@media` 蓋，containment 唔改尺寸；手機打橫用 `HomeLandscapeGrid`，唔經呢度

### 🟢 Suggestion / Observation（新增，唔 block）

- S-939：`ShowGrid.module.css:88` 後備 `aspect-ratio: calc(var(--show-grid-columns) * …) / …`：`HomeBanner.module.css:38` 註解講明舊 iOS 嘅 `aspect-ratio` 唔一定接受 `calc()` / `var()`，咁會變 computed-value time 無效 → `auto`，今日節目（內容全部 absolute）會縮到 0 高。L1：HomeBanner 寫低嘅 project 做法；L2：冇 iOS 15 瀏覽器重現不到（舊 code 一樣寫法，唔係新風險）。橫跨只會喺兩欄出現，可以照 HomeBanner 寫死 `32 / 9`。
- S-940（Developer 提出嘅 `HomeBanner` `/ 2`）：直版 1 欄（catalog 只有 1 個節目）時，橫額仍然係兩欄格高（約 98px），節目格起碼 203px。HomeBanner 註解已經接受「可以矮過節目格」，mockup `dynamic-show-grid` 寫明橫額唔喺範圍，冇違反 AC，**唔使即刻改**。建議開 follow-up 畀用戶決定橫額係咪要跟欄數：要跟就將 `--show-grid-columns` 搬上兩者共同嘅 ancestor（橫額同 `.grid` 係兄弟，讀唔到 `.grid` 嘅值），要出 mockup 確認；唔跟就喺兩邊註解互相指向，記低刻意分開。
- S-941：`showGridCounts.mjs` 未量到檢查用 `EDGE_TOLERANCE_PX = 2`，手機上舊公式只差 3.4px（欄距 12px × 9 / 32），餘量 1.4px。可以畀呢個檢查一個細啲嘅容差（例如 0.5px）。

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
context: "L4 re-review at eb1812a: S-935..S-938 resolved (S-936 mutation-verified, S-937 all 7 commits tsc -b pass); new S-939..S-941 to backlog (main agent owns backlog.md; S-940 HomeBanner /2 = user design decision, no code change now); integration branch is main; CI run 43323673299 in progress, report committed locally, not pushed"
```
