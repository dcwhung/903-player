# QA — P10 lane 4 Duo 打開・橫內頁摺位 — 2026-11-18 — S1

- Tier: T1（CSS 單一區塊 + lock test + e2e）| Commit: e1d7fd3（code b1ba0e7 + e1d7fd3；HEAD 0ebc89c 淨加 re-review 文件）| PR #272 → `release/v2.0.0` | Verdict: ✅ pass
- Ledger（`impact --since $(git merge-base HEAD origin/main)` = e3d6952）: SKIP 10 / REVERIFY 4（bookmark、home、show-today-page、ui-foundation）/ UNCOVERED 1（`src/pages/shared/duoHinge.node.test.ts`）
- 收窄到 lane 4 diff（`impact --since 2a55c28`）：REVERIFY bookmark / show-today-page / ui-foundation；home 喺 merge-base 範圍 REVERIFY 只因 S3 行（lane 1–3 已知，留 v2.0.0 S3），S1 FROZEN
- S1 STALE 只有 3 行：show-today-page `Page.module.css`；bookmark、ui-foundation `e2e/duo.mjs`（共用 e2e 檔，lane 4 只加 3 個 section，佢哋自己嘅 Duo section 喺同一個 e1d7fd3 run 照 PASS）→ 同一套證據覆蓋，plan 冇改
- drama：`impact` SKIP（S1 scope 未有 `Page.module.css`）；但 AC 包廣播劇頁 → `plans/drama.md` 加 AC-14 + scope 加 `Page.module.css`，重新 freeze
- UNCOVERED 歸屬：`duoHinge.node.test.ts` → show-today-page（鎖 `Page.module.css`，plan core glob `src/pages/shared/*`）

## AC（L1 plan `2026-11-17_plan_p10-duo-homeview.md` lane 4 + `_mockups_/iphone-duo` 打開・橫 方案 A）

| AC                                       | 證據（scratchpad `e2e-lane4b.log` 行號 / unit）                                          | 結果 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | ---- |
| 節目頁兩欄各半，分隔線 x=438，播放掣右半 | 768 divider 438、play 622.2；截圖 `l4/ol-show.png`                                       | ✅   |
| 今日節目頁同上                           | 769 divider 438、play 622.2；`l4/ol-today.png`                                           | ✅   |
| 廣播劇頁同上                             | 770 divider 438、play 622.2；`l4/ol-drama.png`                                           | ✅   |
| 欄闊扣邊框 + 左安全區（S-1127）          | unit `duoHinge` 'should end the list column at the hinge'；assert 改 CSS 前紅（348）     | ✅   |
| 現有裝置零改變                           | `visual-lane4b.log`「比對咗 180 張：全部一樣」；`deviceQueries` 凍結 viewport 全唔 match | ✅   |

## Runs

| Command                                                                                                                            | Result                                                    | Time |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---- |
| `npm test -- …/pages/shared/duoHinge …/pages/shared/landscapeColumns …/styles/deviceQueries …/styles/landscapeBreakpoint`（QA 跑） | 4 files / 56 passed                                       | 1s   |
| 引用：e1d7fd3 lint + `npm test`                                                                                                    | clean / 4993 passed                                       | —    |
| 引用：e1d7fd3 `npm run e2e`（`e2e-lane4b.log`）                                                                                    | 992 PASS / 0 FAIL                                         | —    |
| 引用：e1d7fd3 `npm run e2e:visual` vs origin/main（`visual-lane4b.log`）                                                           | 180/180 全部一樣                                          | —    |
| CI PR #272 run 44299497744 @e1d7fd3                                                                                                | changes ✅、Lint, unit & build ✅、E2E 撰寫時 in_progress | —    |

## Hard Gates

all pass（Coverage：新 CSS 區塊有 unit lock + 3 條 e2e；PWA / Security / Performance：n/a，冇掂 sw / manifest / auth / API）

## Findings

none（冇 🔴 / 🟡）。Review（`.proj-docs/reviews/2026-11-18_review_p10-lane4-duo-hinge.md`）S-1127 / S-1128 喺 e1d7fd3 修咗，re-review 已 commit（0ebc89c）

## 建議補測

none — 純版面 CSS，unit lock + e2e 位置 assert 雙層，no edge case gap

## Ledger

- `plans/show-today-page.md` 加 AC-7 + command；`plans/drama.md` 加 AC-14 + scope `Page.module.css`；bookmark / ui-foundation plan 冇改
- freeze 4 條鏈 S1（成條 chain + stage 檔案清單 + 新檔），前後比對 chain + stage + path：少 0 行、加 2 行（show-today-page `duoHinge.node.test.ts`、drama `Page.module.css`），非 S1 行冇郁；S1 全 FROZEN
- Freeze 後 `impact --since 2a55c28` 淨返 drama / show-today-page REVERIFY，係 S3 行嘅 plan 檔（plan 加 AC），留 v2.0.0 S3 處理
- Main agent push docs 前要等 run 44299497744 E2E 完成（綠先 push）
