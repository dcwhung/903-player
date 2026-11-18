# QA — P10 lane 6 HomeView 節目頁 — 2026-11-18 — S1

- Tier: T2 | Commit: `7b77d12`（code `75a97e8` + `7b77d12`，review `ae1f52a`；PR #275 → `release/v2.0.0`）| Verdict: ✅ pass
- Ledger（`impact --since $(git merge-base HEAD origin/main)` = `e3d6952`）：SKIP 5（admin、api、card-zoom、mini-player、pwa-shell）/ REVERIFY 9 / UNCOVERED 13 / IGNORED 22
- 9 條 REVERIFY 鏈嘅 S1 STALE 行（27 行）全部係 `75a97e8^..7b77d12` 改嘅檔：show-today-page、player-core（指定）+ bookmark、catalog-data、coming-soon、drama、home、repo-tooling、ui-foundation（STALE 只因呢個 diff：`ShowPage.tsx`、`EpisodeList.tsx`、`Sheet/useSheetBehaviour.ts`、`GaugeInfoRow.tsx`、`Page.module.css`、`tokens.css`、`zh-HK.ts`、`icons.tsx`、`PageHeader.module.css`、`e2e/run.mjs`、`e2e/bookmark.mjs`；改動都係加可選 prop / export，預設行為不變；同一套證據覆蓋）
- 其餘 REVERIFY 只因 S3 行（release 前已 STALE，屬 S3，唔喺今次範圍）
- 新檔歸屬：`ListSheet/*` 6、`PageHeaderActions.tsx`、`hooks/useListSheet*` 2、`pages/show/{ShowEpisodes,ShowPlayer,ShowPageSquare.test}`、`e2e/square.mjs` → show-today-page；`ShowPlayer.tsx`（import `usePlayer`）同時入 player-core 1-hop

## Runs

| Command / 證據                                                                                                                | Result                                                     | Time |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---- |
| 引用 developer @`7b77d12`：`npm run lint`、`npm test`（scratchpad `lint-lane6b.log` / `test-lane6b.log`）                     | 0 error；485 檔 5038 passed                                | —    |
| 引用 developer @`7b77d12`：`npm run e2e`（`e2e-lane6b.log`）                                                                  | 1023 PASS / 0 FAIL；`square.mjs` 22 個 PASS                | —    |
| 引用 developer @`7b77d12`：`npm run e2e:visual` vs origin/main（`visual-lane6b.log`）                                         | 180/180 一樣                                               | —    |
| CI run [44359882411](https://github.com/dcwhung/903-player/actions/runs/44359882411) @`7b77d12`                               | changes ✅；lint+unit+build 報告時 in_progress；e2e 未開始 | —    |
| CI run [44352770934](https://github.com/dcwhung/903-player/actions/runs/44352770934) @`75a97e8`（W-795 修正前）               | success                                                    | —    |
| `npx vitest run --project @903-player/player --coverage` ListSheet、useListSheet、pages/show、Sheet、EpisodeList、PlayerPanel | 18 檔 194/194；改動檔 lines 100%、branch 97.5%             | 11s  |
| scratchpad `qa6/scrimProbe.mjs`（544×544 `#/show/gongzi`，dist e2e build）                                                    | 見 AC                                                      | 15s  |

- 證據有效：lane 改動檔 mtime 全部早過 log（17:10–17:32），working tree clean，`7b77d12` 內容 = 跑 log 嗰陣

## AC（show-today-page AC-9；mockup `_mockups_/home-view/index.html` 節目頁 + 決定）

- 播放器為主：唱片 256×256 置中（x 144）、唱片格頂 76 = 頁頭底 60 + 16；頁面冇集數清單、冇把手；冇出界掣（e2e square）
- 頁頭：返回 / 清單掣（badge 4 = 集數）/ ⓘ 最右（528）、成頁一粒 ⓘ；冇資料嘅節目唔出 ⓘ，清單掣做最右（probe `返回主頁@16`、`集數清單，共 4 集@484`）
- Sheet：由底升起（頂 206.7 / 底 544）、icon 實色、焦點入表、4 行；✕ / Escape / 再撳 / 向下拉 / 遮罩閂，閂咗 `aria-expanded=false`、焦點返清單掣（e2e ×4；遮罩由 probe 補：`dialog false`、focus「集數清單，共 4 集」、0 JS error）
- 由我的收藏入頁自動開；Escape 閂焦點返清單掣（W-795，e2e + unit `ShowPageSquare.test.tsx`）
- 減少動態：開冇動畫、閂即刻冇咗（e2e + unit `ListSheet.test.tsx`）
- 現有裝置零改變：visual 180/180；e2e「現有手機節目頁照舊：集數清單喺頁面、冇清單掣」
- 日子條 7 日置中條（底 536 / 544）= 用戶 2026-11-18 接受，唔係 finding；sheet focus trap 屬另一條 lane

## Hard Gates

all pass（CI E2E 未完，main agent push / merge 前睇 run 44359882411）

## Findings

- 無 finding（W-795、S-1138 – S-1140 已由 re-review @`7b77d12` 確認）

## 建議補測

- none（遮罩閂行共用 `SheetOverlay`，已有 unit；今次 probe 驗過 ListSheet 都得）

## Freeze

- S1 freeze（ledger `verified_commit` = `7d8dbb1`：reviewer 淨 docs commit，`apps/` `packages/` 同 `7b77d12` 一樣）：show-today-page 180 → 193（+ 上面 13 個新檔）、player-core 101 → 102（+ `ShowPlayer.tsx`）；bookmark 56、catalog-data 149、coming-soon 163、drama 218、home 176、repo-tooling 46、ui-foundation 130（前後一樣）
- chain + stage + path 比對：ledger 2634 → 2648 行，只多咗上面 14 行，冇少行；freeze 後 S1 全部 FROZEN，`impact` 仲列 drama / home / player-core / show-today-page / ui-foundation REVERIFY 只因 S3 行
- Plan 更新：`show-today-page.md` 加 AC-9 + scope + 指令；`player-core.md` 加 `ShowPlayer.tsx`
