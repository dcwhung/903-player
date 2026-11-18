# Code Review — 2026-11-18 — P10 lane 3：新主頁（Duo 打開・橫 / HomeView shelf split）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`feature/layout/iphone-duo` code commit `3ef9b86`（HEAD `ed03f2a` 加 plan doc），PR → `release/v2.0.0`；21 檔 +664 / −96
- Tier：T2；Design Origin：`mockup: _mockups_/iphone-duo/index.html`（打開・橫 主頁）+ `_mockups_/home-view/index.html`（主頁，S2 / S7）；冇播放卡行為跟用戶決定（全闊橫額 + 兩欄、閂卡出把手）
- Review Item ID：**W-787 – W-790、S-1124 – S-1126**（冇 C）
- 總評：**⚠️ warn（80 / 100）**。Duo 打開・橫完全啱；HomeView 有兩個「當咗闊版但內頁 / 收藏 tab 仲係窄版」嘅漏位（W-787、W-788）

## Hard Gates

all pass（lint、tsc、`npm test` 4976、`npm run e2e` 981 / 0、`npm run e2e:visual` 180 / 180 引用 developer 喺本 tree 嘅 log；自己跑 diff 相關 unit：`npm test -- apps/player/src/pages/home …/postcssDuoLandscape …/DramaShelf …/useHomeSide …/src/styles` 455 / 455，連跑 4 次全綠；第一次有 2 個 fail 冇重現，見 Observation）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                  |
| -------- | ------ | ------- | --------------------- |
| 正確性   | 15     | 25      | W-787、W-788          |
| 安全性   | 20     | 20      |                       |
| 可維護性 | 20     | 20      | S-1124、S-1125 唔扣分 |
| 測試覆蓋 | 10     | 15      | W-790                 |
| 性能     | 10     | 10      |                       |
| 代碼風格 | 5      | 10      | W-789（設計還原）     |
| **總分** | **80** | **100** |                       |

**結果：⚠️ warn**

L2 環境：`apps/player/dist`（09:43 build）**唔係 HEAD**（bundle 入面係 `shelf && mode==='split'` 先出橫額 / 書架，同 `HomeWide.tsx` 唔一樣），所以自己 `vite build --mode e2e --outDir scratchpad/rv3/dist` 由 HEAD 重新 build、另開 preview，`/opt/pw-browsers/chromium` 實測。

## 🟡 Warning

**W-787** HomeView 主頁撳卡入頁 / 返主頁揀錯過場（`hooks/useHomeSide.ts`、`pages/home/HomePage.tsx` `right.side`、`pages/home/useTileOpen.ts`、`hooks/usePageHandle.ts`）

- L1：`useTileOpen` / `wideZoomMotion` 契約「內頁會有把手先 zoom-handle；expand = ⤢ 嘅卡變內頁、返回倒轉（back）」；`useGoHome` / `usePageHandle` 仍然用 `WIDE_BANNER_QUERY` 判斷闊版，而 `useHomeSide` / 主頁 `right.side` 改咗用 `useWideHome().wide`（包 SQUARE）。兩邊對 HomeView 嘅判斷唔一致
- L2：HomeView 544×544 播緊公子會，撳 Bad Girl 卡 → `data-view-transition=zoom-handle`，但內頁 `[data-page-handle]` 數量 0（Duo 打開・橫係 1）；返主頁變 `unzoom`。撳公子會自己張卡 → `expand`，返主頁冇過場（Duo：`back`）
- L3：zoom-handle 舊卡（`player-panel`）冇新對象，只係淡走疊喺展開緊嘅內頁上面；expand 返回突然跳
- 方案 A（推薦）：`right.side` / `useHomeSide` 喺「shelf 但唔係 WIDE_BANNER」（即 HomeView）回 `'none'`，HomeView 行返窄版 zoom / unzoom，同而家內頁一致；lane 6 HomeView 內頁如果加把手再開返。Trade-off：HomeView 冇咗 expand 變形
- 方案 B：`useTileOpen` 計 `handle` 時同 `usePageHandle` 共用同一個「內頁會唔會出把手」判斷（抽 `usePageHandleWide()`），`useGoHome` 嘅 `wide` 改用 `useWideHome().wide`。Trade-off：要決定 HomeView 內頁 back 動畫點收（內頁冇把手但主頁有卡）

**W-788** HomeView 有播放卡時「我的收藏 / 最近收聽」tab 文字闊度 0（`pages/home/HomePage.tsx` `useSavedLayout`、`selectors/bookmarks.ts` `RECENT_COLUMNS.wide = 2`）

- L1：`useSavedLayout` mode ≠ stack 一律 `'wide'`（兩欄最近收聽），係為 iPad 闊左欄設計；HomeView split 左欄只有約 240px；用戶要求 HomeView saved tab 要做埋（review 重點）
- L2：HomeView split 收藏 tab：`.recentText` / `.recentName` 闊 **0px**（Duo 打開・橫 78px），截圖只見碟 + ☆，冇節目名同日子（`scratchpad/rv3/hv-saved-split.png`）
- 方案 A（推薦）：`useSavedLayout` 加 shelf 判斷，HomeView split 用 `'phone'`（一欄），fill（全闊 512px）先用 `'wide'`；加 e2e 斷言文字闊 > 0。Trade-off：版面跟 split / fill 轉
- 方案 B：SavedTab CSS 加 SQUARE 區塊 `.recentList[data-cols='2']` 改一欄。Trade-off：JS `recentColumns` 同 CSS 唔一致，排序（左右左右）要再核對

**W-789** 新主頁「今日節目」卡右下角多咗粒空白深色 pill（`pages/home/useShowShelfItems.ts` `meta: ''`、`DramaShelf/DramaTile.tsx` `TileCorners`）

- L1：Design Origin mockup 同現有 `ShowTile` today 款都冇角落字
- L2：Duo / HomeView 今日卡 `[data-corner]` 16×4px、`rgba(0,0,0,0.55)`（`scratchpad/rv3/hv-today.png` 右下角）
- 方案 A（推薦）：`TileCorners` 喺 `!item.meta && !item.release` 時唔出 meta span。方案 B：CSS `.meta:empty { display: none }`（一行，但靠空字串約定）

**W-790** 疊卡 zoom 來源冇測試（plan「已知風險」：卡片放大過場來源由節目格變咗疊卡，要補對應）

- L1：`.proj-docs/plans/2026-11-17_plan_p10-duo-homeview.md` 已知風險最後一條；L2：`e2e/shelfSplit.mjs` 只斷言 hash，`e2e/cardZoom` 只跑現有 viewport；unit 冇驗 shelf 卡 `data-zoom-key`（`show:<id>` / `today`）。W-787 正正係呢個缺口漏咗
- 方案 A（推薦）：`shelfSplit.mjs` 加「撳疊卡 → 過場款式 + 返主頁 unzoom 搵返同一張卡（`data-zoom-source`）」兩個 viewport；方案 B：只加 unit 斷言 `data-zoom-key` + `useTileOpen` motion（快，但唔驗 DOM 搵卡）

## 🟢 Suggestion / Observation

- **S-1124** `scripts/postcssDuoLandscape.ts`：記號放錯（前面唔係 `WIDE_BANNER_QUERY`、中間夾咗另一個註解）會靜靜雞唔複製；加 node test 對 `EpisodeList.module.css`、`tokens.css` 真檔跑 plugin，斷言各有一份 `SQUARE_QUERY` 複製品，或者記號冇對象時 `result.warn`
- **S-1125** `pages/home/HomePage.tsx`：每次 render 同時計 `useHomeTiles` 同 `useShowShelfItems`（兩套 `useShowOpeners` / `useTileOpen` / `useRecordings`），`useWideHome` 叫兩次；可以按 `shelf` 只計需要嗰份
- **S-1126** `pages/home/HomeWide.tsx` shelf 模式：橫額冇 `view-transition-name`（第一格名清咗），開 / 閂卡（split ↔ fill）時分類掣有變形、橫額由半闊跳去全闊；可以畀橫額 `home-banner` 名（未截過場中途圖，L3）
- Observation：疊卡顯示播放日（「星期一至五」）但 `aria-hidden`，讀屏冇（同劇集卡短篇數一樣做法，節目格本身冇呢個資料）
- Observation：`apps/player/dist` 喺 developer e2e（09:38）之後俾其他 build 覆寫咗；QA 用之前要由 HEAD 重新 build
- Observation：related unit 第一次跑有 2 個 fail（log 冇留低），之後 4 次全綠；QA S1 留意 flaky

## ✅ 做得好嘅地方

- `useShowOpeners` 抽得乾淨，節目格同疊卡共用自動播 / 入頁邏輯；`ShelfColumn` 用可選 prop 擴充，現有直 / 橫版行為冇變
- `@square-clone` 只認 `WIDE_BANNER_QUERY`、條件同原本唔重疊，冪等測試齊；Duo 打開・橫 zoom-handle / unzoom-handle 實測正確

## Handoff receipt

```handoff-receipt
protocol: 1
status: warn
score: 80/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: invoke_developer
next_agent: frontend-developer
branch: "feature/layout/iphone-duo"
context: "P10 lane 3 @3ef9b86: Duo open-landscape OK; fix W-787 (HomeView side=card/handle vs narrow inner pages: zoom-handle with no page handle, expand with no back), W-788 (HomeView split saved tab uses 'wide' 2-col recent, text width 0), W-789 (empty meta pill on today card), W-790 (no e2e/unit for shelf-card zoom); clear S-1124..S-1126 in-session; apps/player/dist is stale vs HEAD, rebuild before QA; report committed locally, not pushed"
```

## Re-review — 2026-11-18 @ `35fa781`

- 範圍：只驗 W-787 – W-790、S-1124 – S-1126 嘅修正同 `35fa781` 本身嘅 diff（15 檔 +377 / −180），包括用戶 2026-11-18 設計改動（疊卡只限有播放卡嘅一欄 `split`；冇卡 / 閂卡用返原本填滿格）
- Hard Gates：all pass，引用 developer 喺 `35fa781` 嘅 log（lint、tsc、`npm test` 4990、`npm run e2e` 985 / 0、`npm run e2e:visual` 180 / 180：`scratchpad/{e2e,visual}-lane3b.log`）；自己跑 diff 相關 unit（`npx vitest run …/pages/home …/useWideHome …/useHomeSide …/postcssDuoLandscape …/DramaShelf`）321 / 321
- 評分：**95 / 100**（正確性 20 / 25：W-791；其餘滿分）
- 結果：**⚠️ warn**。分數過 90，但 W-791 係呢個 commit 帶入嘅新 🟡，而用戶規定 lane backlog 要同一個 session 清晒，所以唔當 pass

| ID     | 狀態        | 驗證                                                                                                                                                                                                                                                                  |
| ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-787  | ✅ resolved | `transitionSide(mode, pageHandles)` 喺 `HomePage` `right.side` 同 `useHomeSide` 共用，同 `usePageHandle` 一樣睇 `WIDE_BANNER_QUERY`；unit 8 例；e2e HomeView 其他節目 / 播緊嘅節目都係 `zoom` / `unzoom`，Duo 照舊 `zoom-handle` / `unzoom-handle`、`expand` / `back` |
| W-788  | ✅ resolved | `shelf && split && !pageHandles` → `'phone'`；unit 鎖住 Duo `wide` / HomeView `phone`                                                                                                                                                                                 |
| W-789  | ✅ resolved | `hasMeta` 為 false 就唔出 meta span；unit 斷言今日卡冇 `[data-corner]`                                                                                                                                                                                                |
| W-790  | ✅ resolved | `shelfSplit.mjs` `checkZoom` 兩部機 × 兩款（其他節目 / 自己節目），用返 `cardZoom.mjs` 嘅 probe 同 `single()`；log 4 條 PASS，`ran: true`、`clean: true`                                                                                                              |
| S-1124 | ✅ resolved | plugin 用真 `EpisodeList.module.css` / `tokens.css` 跑，斷言有 `SQUARE_QUERY` 複製品                                                                                                                                                                                  |
| S-1125 | ✅ resolved | `useWideHome` 得一次；兩份都計嘅理由（`HomeWide` 過場期間用 `useCardMotion` 凍結嘅 mode，同 `HomePage` 唔一定同步）成立，`showShelfItems` 變 pure、openers 共用                                                                                                       |
| S-1126 | ✅ 接受唔改 | 同意：用戶決定之後開 / 閂卡成個左欄喺「固定橫額 + 疊卡」同填滿格之間換，同現有 iPad 格仔重排一樣，橫額冇共同對象唔使硬配名。但見 W-791：而家 tab 過場名喺換版時指錯元素                                                                                               |

**W-791** 冇播放卡 / 閂咗卡時（新主頁填滿格）`home-tabs` 過場名落咗去成個格仔，分類掣冇名（`pages/home/HomePage.module.css` L85–104、`pages/home/HomeWide.tsx` `data-shelf`、`pages/home/HomeWideLeft.tsx`）

- L1：`HomePage.module.css` `.gridColumn > :first-child { view-transition-name: home-tabs }` 係闊版「分類掣保持原位」嘅契約；`main.wide[data-shelf]` 兩條位置 selector 寫明前提「左欄頂多咗闊版橫額，分類掣先係第二格」
- L2（DOM + selector 決定性對照）：`HomeWide` 喺 shelf 時**唔理 mode** 都有 `data-shelf`；`HomeWideLeft` 只喺 `shelfColumn` 先出橫額。所以 fill / fillWithHandle 時 `.gridColumn` 子元素係 `[HomeTabs .wrap, HomeFillGrid nav]` → 分類掣中 `:first-child` 變 `none`，`nav` 中 `:nth-child(2)` 變 `home-tabs`。現有 unit（`HomePageShelfSplit.test.tsx`：fill 時 main 有 `data-shelf`、橫額喺 nav 入面）同 e2e log（`bannerInGrid: true`）證實呢個 DOM。用瀏覽器量 computed `view-transition-name` 被 reviewer-test-scope hook 擋咗，交 QA S1 補截（876×612、544×544 星期日冇卡，`.gridColumn` 兩個子元素）
- L3：閂 / 開卡（`useCardMotion` 過場）時 `home-tabs` group 由分類掣個框變形去成個格仔個框（分類掣快照拉到成格咁大）；填滿格撳格入頁時，成個格仔做獨立 group 疊喺展開緊嘅內頁上面淡出，唔係同 root 一齊 dim
- 方案 A（推薦）：兩條位置 selector 收窄到有橫額嗰陣，例如 `main.wide[data-shelf][data-layout='split']`（`data-layout` 同 `HomeWideLeft` 一樣用 `useCardMotion` 凍結 mode，兩者同步）；fill 時跌返去通用 `:first-child` = 分類掣。Trade-off：靠 `split` ⇔ 有橫額嘅約定，要喺註解寫明
- 方案 B：唔用位置 selector，`HomeTabs` 外層（或 `HomeWideLeft` 包一層）直接帶 class / `data-home-tabs` 定過場名。Trade-off：要改通用 `.gridColumn > :first-child`，會影響現有闊橫版，要靠 `e2e:visual` 證明零改變
- 修嗰陣順手更新過時註解：`HomeWide.tsx` L25、`DramaShelf.module.css` L73 仲寫 `useShowShelfItems`；`HomePage.module.css` L85 註解要講明只係有播放卡嗰陣先有橫額。加 unit：fill 時分類掣係 `.gridColumn` 第一格（或者 node test 對 CSS selector）

### Handoff receipt（re-review）

```handoff-receipt
protocol: 1
status: warn
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: invoke_developer
next_agent: frontend-developer
branch: "feature/layout/iphone-duo"
context: "P10 lane 3 re-review @35fa781: W-787, W-788, W-789, W-790, S-1124, S-1125 resolved; S-1126 accepted as is (user design). New W-791 from this commit: with data-shelf but no card (fill / fillWithHandle), HomePage.module.css main.wide[data-shelf] .gridColumn > :first-child / :nth-child(2) put view-transition-name home-tabs on the fill-grid nav and none on the tabs (banner only renders in split now); scope the two rules to data-layout='split' (or name tabs explicitly), fix stale useShowShelfItems comments, add a unit. QA S1 to capture computed view-transition-name at 876x612 / 544x544 without a card (browser probe blocked for reviewer). Report committed locally, not pushed"
```

## Re-review 2 — 2026-11-18 @ `579ebb1`

- 範圍：只驗 W-791 嘅修正同 `579ebb1` 本身嘅 diff（5 檔 +45 / −6）；唔搵新 🟢
- Hard Gates：all pass（引用 main agent 喺 `579ebb1` 跑嘅結果：lint、`npm test` 4992 passed、`npm run e2e` 989 PASS / 0 FAIL、`npm run e2e:visual` 對 `origin/main` 180 / 180 一致）；reviewer 只補跑新 lock test `shelfSplitTabs.node.test.ts`（2 passed）
- 評分：**100 / 100**
- 結果：**✅ pass**

| ID    | 狀態        | 驗證                                                                                                                                                                                                                                                                                                      |
| ----- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-791 | ✅ resolved | 方案 A：兩條位置 selector 收窄到 `main.wide[data-shelf][data-layout='split']`；`data-layout={mode}` 同 `HomeWideLeft` 嘅 `shelfColumn = shelf && mode === 'split'` 用同一個 `useCardMotion` 凍結 mode，橫額有冇同 selector 一定同步；fill / fillWithHandle 跌返通用 `.gridColumn > :first-child` = 分類掣 |

- 鎖：`shelfSplitTabs.node.test.ts` 斷言 split 兩條規則存在、冇 split 嘅舊 selector 冇宣告；`e2e/shelfSplit.mjs` 有卡（`checkSplit`）同冇卡（`checkFill`）兩部機都用 computed style 驗左欄得一個 `home-tabs` 而且係分類掣（developer 確認拎走 CSS 修正會紅）
- 過時註解：`HomeWide.tsx`、`DramaShelf.module.css` 改返 `showShelfItems`；`HomePage.module.css` 註解寫明只有 split 先有橫額
- DUO_QUERY media block 冇重複位置 selector，唔使同步改
- 冇新 finding

### Handoff receipt（re-review 2）

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
next_action: proceed_to_qa
next_agent: quality-assurance
branch: "feature/layout/iphone-duo"
context: "P10 lane 3 re-review 2 @579ebb1: W-791 resolved (positional view-transition-name rules scoped to main.wide[data-shelf][data-layout='split'], same frozen mode as HomeWideLeft banner; node lock test + e2e computed-style checks with and without card at 876x612 / 544x544). Stale comments fixed. No new findings; all lane-3 review items cleared. Gates cited from main agent run on 579ebb1. Report committed locally, not pushed"
```
