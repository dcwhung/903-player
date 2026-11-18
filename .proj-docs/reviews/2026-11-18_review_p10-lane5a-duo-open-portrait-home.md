# Code Review — 2026-11-18 — P10 lane 5a：Duo 打開・直主頁全闊 3 欄

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`feature/layout/iphone-duo` commit `86e3c4c`，PR → `release/v2.0.0`；8 檔 +128 / −19
- Tier：T2；Design Origin：`mockup: _mockups_/iphone-duo/index.html`（打開・直 主頁 Q4「3 欄 + 四邊邊框」，`new-op-home.webp`）
- Review Item ID：**S-1129 – S-1132**（冇 C / W）
- 總評：**✅ pass（100 / 100）**。612×876 主頁 3 欄、今日節目同聖艾粒同一行（佔兩欄），現有裝置零改變；四條 🟢 喺同一個 PR / session 清

## Hard Gates

all pass。引用 developer 喺 `86e3c4c` 嘅結果：lint、`npm test` 5002、`npm run e2e` 994 / 0（`Duo 打開・直主頁` 見 log 768：`firstRow 3`、`todaySharesRow true`、`tabsRight 24`）、`npm run e2e:visual` 180 / 180（嗰次 tree 同 commit 只差 `tests/cssRule.ts`，唔影響 build）。自己跑 diff 相關 unit：ShowGrid folder + `homeBottomSpace` + `shortHeightBreakpoint` + `testMediaQuery`（`deviceQueries`）8 檔 113 / 113；`tsc --noEmit -p tsconfig.app.json` 0。Coverage：`spanLastColumns` / `portraitColumns(count, 3)` 有 table test；version bump n/a（plan：S3 後先 bump 2.0.0）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                         |
| -------- | ------- | ------- | ---------------------------- |
| 正確性   | 25      | 25      | S-1129（🟢 / 待用戶確認）    |
| 安全性   | 20      | 20      |                              |
| 可維護性 | 20      | 20      | S-1130（🟢，唔扣分）         |
| 測試覆蓋 | 15      | 15      | S-1131、S-1132（🟢，唔扣分） |
| 性能     | 10      | 10      |                              |
| 代碼風格 | 10      | 10      |                              |
| **總分** | **100** | **100** |                              |

**結果：✅ pass**

## 逐項核對（委託清單）

- **分頁 / 填滿計法**：`useRowsPerPage(count, columns)` 嘅 effect deps 有 `columns`，`useMediaQuery` 用 `useSyncExternalStore`，第一次 render 已經係 3 欄，唔會先 2 後 3 跳。`totalRows = ceil(8 / 3) = 3`，`columnPx` 按 3 欄計；`perPage = rows × 3` 一定係欄數倍數，所以分頁時今日節目喺嗰頁嘅位置 `(count − 1) % columns` 同全局一樣，`spanLastColumns` 用全局 count 計啱。例：7 格 3 欄每頁 2 行 → 第 2 頁淨今日節目，span 3 = 成行，OK
- **未量到（冇 `data-fill`）**：`.grid:not([data-fill])[data-span-last] > :last-child` 個高用「一欄闊 × 9 / 16」，同 span 幾多欄無關，同其他格一樣高 ✅。`@supports not (width: 1cqi)` 嘅 32 / 9 後備假設兩欄成行；3 欄 span 3（7 格）會高 1.5 倍，但 Duo 係新機（Safari ≥ 16 有 cqi），去唔到呢個分支 → 只係註解過時（併入 S-1130）
- **手機嘅 inline var**：`--show-grid-span-last` 只喺 Duo 打開・直區塊用；手機照用 `grid-column: 1 / -1`（同 specificity，Duo 區塊排後，Duo 先蓋過）。visual 180 / 180 證實冇影響 ✅
- **Card-zoom**：`zoomInto` 用 `getBoundingClientRect()` 量框，同格嘅形狀無關；同手機成行闊嘅今日節目一樣做法 ✅
- **`cssRule.ts` `isDeviceRange`**：唔會削弱矮螢幕 lock。`deviceQueries.node.test.ts`「CSS 入面嘅裝置 query」已經鎖住 `src/**/*.css` 每句含 `max-width` 嘅 query 一定係 layout.ts 允許嘅裝置 query 之一，所以冇人可以用 `(max-width: …) and (max-height: …)` 偷渡矮螢幕覆寫；`tokens.css` 嘅 561 斷點冇 max-width，`toContain` 照驗到 ✅
- **廣播劇 / 收藏 tab**：`main.home { max-width: none }` 對三個 tab 都生效，DramaShelf 冇 Duo 打開・直區塊，書架由 480 變 564 闊；未有截圖（見 S-1132）

## Design Fidelity

- Origin `mockup:` 路徑存在，Q4「3 欄 + 四邊邊框」：截圖 `l5/a-home.png` 3 欄、左右 24（e2e `tabsRight 24`）、mini player 同格邊對齊 ✅
- 冇新 className、冇 hardcoded 色 / 尺寸；新 query 同 `DUO_OPEN_PORTRAIT_QUERY` 一字不差（lock 鎖住）
- 偏差：今日節目點擺 mockup 冇畫（見 S-1129）

## 🟢 Suggestion / Observation

- **S-1129**（待用戶確認）今日節目佔兩欄：mockup 打開・直 notes 寫「圖入面漏咗最尾嘅『今日節目』格……正式版有 9 格」，但而家係 7 個節目 + 今日節目 = 8 格；實作揀咗今日節目填返尾行兩欄（commit message 有寫原因）。L1：mockup 冇畫、plan 冇寫；L2：截圖可見效果合理；L3：設計取捨。建議 main agent 將 `l5/a-home.png` 畀用戶確認「佔兩欄」定「一格 + 留空」，確認咗喺 plan 進度記一句
- **S-1130** 過時註解：`showGridPages.ts` 頂部「9 / 12 格都唔用 3 欄」、`PORTRAIT_MAX_COLUMNS`「最多兩欄」、`spansFullRow`「自己一行」、`ShowGrid.tsx` `useShowGridPages` jsdoc「否則兩欄……橫跨成行」、`ShowGrid.module.css` cqi 後備「橫跨只會喺兩欄出現」。補一句「Duo 打開・直例外（3 欄、只填尾行剩低欄）」即可
- **S-1131** `e2e/duo.mjs` `checkOpenPortraitHome` 只驗今日節目同上一格同一行，冇驗佢填到尾（右邊 = 第一行最右格右邊）；`span` 失效變一格都會 PASS。加一個 `near(today.r.right, rightmost.r.right)` 條件
- **S-1132** 打開・直嘅廣播劇 / 收藏 tab 而家都全闊（564px），e2e 同截圖都冇（reviewer hook 唔畀起瀏覽器）。建議 developer 補 `廣播劇`、`收藏` 兩張 612×876 截圖畀用戶睇，有問題先開 lane 5 跟進

## ✅ 做得好嘅地方

- `portraitColumns` 只加可選上限（預設 2），完全跟 plan 第 75 行；手機路徑一行冇變
- 新規則全部收喺 `DUO_OPEN_PORTRAIT_QUERY` 區塊，`homeBottomSpace` lock 同時驗呢段冇郁底部留位
- `isDeviceRange` 註解講明靠邊個 lock 兜底

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
  coverage: pass
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/layout/iphone-duo"
context: "P10 lane 5a @86e3c4c: Duo open-portrait home full width, 3 columns, today tile spans rest of last row (e2e 994/0, visual 180/180, related unit 113/113). No C/W. Clear in-session: S-1129 ask user to confirm today-tile 2-column span (mockup said 9 tiles), S-1130 stale 2-column comments, S-1131 e2e assert today fills row, S-1132 screenshot drama/saved tabs at 612x876. Merge target release/v2.0.0 (no develop); report committed locally, not pushed"
```

---

## Re-review — 2026-11-18 — commit `eec1f19`

- 範圍：上一輪 S-1129 – S-1132 嘅處理 + 用戶 2026-11-18 決定嘅廣播劇分頁兩欄（7 檔 +55 / −9）。冇新 C / W / S ID
- Hard Gates：all pass。引用 developer 喺 `eec1f19` 嘅結果：lint、`npm test` 5002、`npm run e2e` 995 / 0（log 769：`Duo 打開・直廣播劇：兩欄 grid、唔疊 {"stacked":false,"sideBySide":true,"overlap":false}`）、`npm run e2e:visual` 180 / 180（現有裝置零改變）。自己跑 `vitest related` DramaShelf.tsx + module.css：12 檔 211 / 211
- **結果：✅ pass（100 / 100）**

| ID     | 處理                                                                                                                                              | 結果 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| S-1129 | 用戶確認今日節目填返尾行剩低嘅欄，plan 進度第 20 行有記                                                                                           | ✅   |
| S-1130 | `showGridPages.ts` 頂部 / `PORTRAIT_MAX_COLUMNS` / `spansFullRow`、`ShowGrid.tsx` jsdoc、`ShowGrid.module.css` cqi 後備五處都補咗 Duo 3 欄例外    | ✅   |
| S-1131 | `todayFillsRow`：今日節目右邊同所有格最右邊差 ≤ 1px，併入 PASS 條件；span 失效變一格會 FAIL                                                       | ✅   |
| S-1132 | 用戶睇咗三個 tab 612×876 截圖，決定廣播劇改兩欄 grid（實作見下）；截圖 `l5/op-dramas-2col.png` 兩欄、由頂排、同橫額 / 分類掣 / mini player 邊對齊 | ✅   |

### 廣播劇兩欄（新行為核對）

- **Focus / scrub 關閉**：`stacked = forced ?? !(landscape || wide)` → `useShelfFocus(count, false)`：`useShelfLayout` 唔量（layout undefined）→ 冇 inline style、`scrolls` false；`scrubStart` 見 `!layout` 回 null，`onPointerMove` 早退；`onScroll` 只喺 stacked 先掛；`focus` prop 係 undefined → 卡照舊撳落即 open。同 iPad 橫版兩欄同一條路 ✅
- **HomeWide `ShelfGrid`**：兩個 call site 都傳 `stacked`（forced），`??` 唔受 `wide` 影響；Duo 打開・直唔入 `SHELF_SPLIT_QUERY`，兩個 media 區塊唔重疊 ✅
- **CSS**：新區塊只揀 `.shelf:not([data-stacked])`，query 同 `DUO_OPEN_PORTRAIT_QUERY` 一字不差（deviceQueries lock）；`grid-auto-rows: max-content` 令 2:1 卡唔會喺定高書架被壓扁，放唔晒用 `.shelf` 原有 `overflow-y: auto` 捲 ✅
- **即將上架格 / 繼續收聽條**：`UpcomingTile` / `ContinueButton` 冇讀 `data-stacked`，格闊約 276px 入 `@container drama-tile (max-width: 280px)` 短版字（W-533 本身就係為窄格設計，同手機打橫格闊相若）✅
- **Card-zoom**：`data-zoom-key` 喺 `OpenTile` 外框，同 stacked 無關；`zoomInto` 量 `getBoundingClientRect()` ✅
- **5 套劇最後一套單獨喺左欄**：同 iPad 橫版兩欄一樣，冇橫跨；用戶睇過截圖 ✅

### Observation（唔扣分、唔入 backlog）

- `DramaShelf.test.tsx` 有「landscape 唔疊、撳即 open」(line 565)，`wide` 分支冇對應 unit test，靠 e2e `checkOpenPortraitDramas` 鎖；日後有人改 `stacked` 公式時 unit 層冇即時反饋，有需要可以照 `stubLandscape` 補一個

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
  coverage: pass
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/layout/iphone-duo"
context: "Re-review P10 lane 5a @eec1f19: S-1129..S-1132 all resolved (user confirmed today-tile span; comments fixed; e2e todayFillsRow; drama tab 2-col grid on Duo open portrait per user). Drama 2-col verified: focus/scrub/onScroll off when not stacked, ShelfGrid forced stacked unaffected, upcoming/continue use drama-tile container query, card-zoom unchanged. e2e 995/0, visual 180/180, related unit 211/211. No backlog. Merge target release/v2.0.0 (no develop); report committed locally, not pushed"
```
