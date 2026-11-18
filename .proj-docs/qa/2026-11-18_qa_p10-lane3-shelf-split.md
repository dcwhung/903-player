# QA — P10 lane 3 shelf-split 主頁（Duo 打開・橫 / HomeView）— 2026-11-18 — S1

- Tier: T2（新版面 + 跨 home / card-zoom / mini-player）| Commit: 35fa781（code 3ef9b86 + 35fa781）| PR #271 → `release/v2.0.0` | Verdict: ✅ pass
- Ledger（`impact --since $(git merge-base HEAD origin/main)` = e3d6952）: SKIP 2（admin、api）/ REVERIFY 12 / UNCOVERED 24（`_mockups_/home-view/*` 15 + 新 code / test / e2e 9）
- 12 條 REVERIFY 鏈 S1 STALE 嘅檔全部喺 lane 3 diff（`3ef9b86^..35fa781`）入面（`status` 對 diff 檔清單 grep -v = 0 行）；除咗 home / card-zoom / mini-player，其餘 9 條（bookmark、catalog-data、coming-soon、drama、player-core、pwa-shell、repo-tooling、show-today-page、ui-foundation）只因共用檔（`HomePage.tsx`、`HomeWide.tsx`、`DramaShelf/*`、`EpisodeList.module.css`、`tokens.css`、`e2e/run.mjs`、`postcssDuoLandscape.*`）STALE，由同一套 35fa781 全套 unit + e2e + e2e:visual 覆蓋，plan 冇改
- UNCOVERED 歸屬：`_mockups_/home-view/**`（Design Origin）、`useWideHome.*`、`HomeWideLeft.tsx`、`ShelfGrid.tsx`、`showShelfItems.ts`、`useShowOpeners.ts`、`HomePageShelfSplit.test.tsx`、`e2e/shelfSplit.mjs` → home；`e2e/cardZoom.mjs` → card-zoom

## AC（L1 plan lane 3 + `_mockups_/iphone-duo` 打開・橫 主頁 + `_mockups_/home-view` 主頁 S2 / S7 + 用戶決定 2026-11-18）

| AC                                           | 證據（`e2e-lane3b.log` 行號 / unit）                                                                        | 結果 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---- |
| 有卡：置頂 5:1 闊橫額 + tabs，同 tabs 一樣闊 | 812 Duo（24,24）5.00:1 398/398；820 HomeView（16,16）5.00:1 240/240                                         | ✅   |
| 一欄疊卡 7 節目 + 今日節目；劇集 tab 都疊    | unit `HomePageShelfSplit` 'list every show and today' / 'stack the drama shelf too'；截圖 `l3/*-dramas.png` | ✅   |
| 疊卡底同卡對齊；卡喺右半（Duo = hinge 438）  | 813 588/588、814 左邊 438；821 536/536、822 左邊 272                                                        | ✅   |
| 冇卡 / 閂卡：原本 fill 格，橫額第一格、唔捲  | 815 / 823 `{"layout":"fill","bannerInGrid":true,"scrolls":false}`；816 / 824 格仔並排                       | ✅   |
| 閂卡出把手                                   | 805 Duo 主頁把手貼右邊 0px；`l3cmp/b-hv-closed.png`（HomeView fill 格 + 右邊把手，QA 睇過）                 | ✅   |
| 撳卡入頁                                     | 817 / 825 撳疊卡入節目頁；unit 'open a show page from its card'                                             | ✅   |
| Duo 過場同 iPad                              | 818 zoom-handle / unzoom-handle；819 expand / back                                                          | ✅   |
| HomeView 過場同窄版                          | 826 / 827 zoom / unzoom（W-787 已修）                                                                       | ✅   |
| 現有裝置零改變                               | `visual-lane3b.log`「比對咗 180 張：全部一樣」；unit 'keep the banner-in-grid layout (no shelf)'            | ✅   |

## Runs

| Command                                                                                                                                                     | Result                                         | Time |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---- |
| `npm test -- apps/player/src/pages/home …/hooks/useWideHome …/hooks/useHomeSide …/scripts/postcssDuoLandscape …/DramaShelf …/HomeBanner`（targeted，QA 跑） | 25 files / 324 passed                          | 15s  |
| 引用：35fa781 lint + tsc + `npm test`                                                                                                                       | clean / 4990 passed                            | —    |
| 引用：35fa781 `npm run e2e`（scratchpad `e2e-lane3b.log`，含 shelfSplit + duo + cardZoom）                                                                  | 985 PASS / 0 FAIL                              | —    |
| 引用：35fa781 `npm run e2e:visual` vs origin/main（`visual-lane3b.log`）                                                                                    | 180/180 全部一樣                               | —    |
| CI PR #271 run 44284349461 @35fa781                                                                                                                         | changes ✅、lint/unit/build ✅、E2E 見 receipt | —    |

## Hard Gates

all pass（Coverage：新檔各有 unit（`HomePageShelfSplit`、`useWideHome`）+ e2e；PWA / Security / Performance：n/a，冇掂 sw / manifest / auth / API）

## Findings

none（冇 🔴 / 🟡）。Review W-787..W-790、S-1124、S-1125 喺 35fa781 修咗，由 e2e 826 / 827、unit 'empty corner pill'、'saved tab' 覆蓋；re-review 由 Reviewer 確認

### Observation

- S-1126（review）HomeWide shelf 模式橫額冇 `view-transition-name`，開 / 閂卡橫額跳位：L3 未截中途圖，冇 L2，留 re-review 處理

## 建議補測

none — 版面 / 過場已有 unit + e2e 雙層，no edge case gap

## Ledger

- `plans/home.md` 加 AC-10 + scope / commands；`plans/card-zoom.md` 加 AC-7 + `e2e/cardZoom.mjs`；其餘 plan 冇改
- freeze 12 條鏈 S1（成條 chain + stage 檔案清單 + 新檔），前後比對 chain + stage + path 冇少行（S1 少 0 行、加 24 行：home 23、card-zoom 1；其他 stage 行冇郁）
- Freeze 後 `impact` 淨返 home / ui-foundation REVERIFY，全部係 S3 行（plan 檔、lane 1 檔），留 v2.0.0 S3 處理；S1 全 FROZEN

## Update — 579ebb1（W-791 分類掣過場名）— S1 ✅ pass

- 改動：`HomePage.module.css` 兩條位置過場名 rule 收窄到 `[data-layout='split']`；`HomeWide.tsx` / `DramaShelf.module.css` 淨改註解；新 `shelfSplitTabs.node.test.ts`（→ home）；`e2e/shelfSplit.mjs` 驗 computed `view-transition-name`
- Ledger（`impact --since 4b67b76`）：REVERIFY 7（bookmark、coming-soon、drama、home、mini-player、pwa-shell、show-today-page；6 條只因 `HomeWide.tsx` / `DramaShelf.module.css` 註解 STALE）/ UNCOVERED 1 / 其餘 SKIP
- L1 AC-10（`plans/home.md` 加「有卡 / 冇卡分類掣先係 `home-tabs` 過場名（W-791）」+ scope / command 加新 test）；L2 `e2e-lane3c.log` 814 / 817 / 824 / 827 PASS，冇 CSS 改動時紅（developer 證據）
- Runs：QA 跑 `npm test -- apps/player/src/pages/home/shelfSplitTabs` 2/2；引用 579ebb1 lint clean、`npm test` 4992 passed、`npm run e2e` 989 PASS / 0 FAIL（`e2e-lane3c.log`）、`npm run e2e:visual` vs origin/main 180/180 全部一樣（`visual-lane3c.log`）
- CI PR #271 run 44289027305 @579ebb1：changes ✅、Lint, unit & build ✅、E2E 撰寫時 in_progress（main agent push docs 前要等佢完）
- Findings：none；建議補測：none
- Freeze 7 條鏈 S1（成條 chain + stage 清單，home 加新 test），前後比對 chain + stage + path：少 0 行、加 1 行（home S1 新 test），非 S1 行冇郁；S1 全 FROZEN，`impact` 淨返 home / ui-foundation S3 行
