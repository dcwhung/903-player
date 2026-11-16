# QA — S-743 收藏 tab 改用集數 id — 2026-11-16 — S1

- Tier: T1（player 1.36.3 PATCH）| Commit: d2bd23a（之後 75ae155 淨 review 報告，T0）| Verdict: ✅ pass
- Ledger（base 5012550）: SKIP 3（admin、api、pwa-shell）/ REVERIFY 11（bookmark、card-zoom、catalog-data、coming-soon、drama、home、mini-player、player-core、repo-tooling、show-today-page、ui-foundation）/ UNCOVERED 0 / IGNORED 2
- 主鏈 = bookmark；其餘 10 條只係 S1 scope 檔被 1-hop 改到（`useDramaPage` / `useShowPage` / `ShowPage` / drama 頁 / `cardZoom` / `showPageState` / `renderWithProviders`），或 version bump（`apps/player/package.json`、`package-lock.json`）
- Plans: 沿用 `.proj-docs/qa/plans/<chain>.md`（冇改）

## Runs

| Command                                                                                                                                                                | Result                                 | Time |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---- |
| 11 條 REVERIFY 鏈 plan 第一行 `npm test -- …` 嘅 path 合併一次跑（132 個 path filter）                                                                                 | 253 files / 2925 passed                | 72s  |
| CI run [43866969630](https://github.com/dcwhung/903-player/actions/runs/43866969630) @d2bd23a：lint、`tsc -b`、unit、build、production smoke、`npm run e2e`、e2e:admin | success（引用，唔重跑）                | 18m  |
| Sandbox `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（等 CI 期間）                                                                                         | 831 PASS / 0 FAIL 時撞 10 分鐘上限被停 | 10m  |

- catalog-data / repo-tooling 嘅特別步驟（branded build、snapshot、AC-6 smoke 等）唔涉及今次 diff（只係 focus state 同 version），由 CI 同 SHA lint / unit / build / production smoke / e2e 證
- e2e section：bookmark（收藏清單 → ★ tab、撳行入頁唔播、▷ 原地播、左滑移除）、cardZoom、dramaPages、run.mjs 主流程等全部喺 CI e2e step 入面綠
- Main agent 喺 d2bd23a 跑過 `npm test` 436 files / 4553 全綠；developer 跑過 e2e 869 PASS（只記錄，唔作主要證據）

## Hard Gates

all pass

- `focusUrl` 喺 `apps/player/src`、`apps/player/e2e` 只剩註解同「舊 state 唔認」嘅 test（`useEpisodeFocus.test.tsx:20`）
- 行 key / zoomKey / `onOpen` 由 `b.url` / `track.url` 改 `b.id` / `track.id`（`useSavedView.ts`）；`HomeSaved.test.tsx` 新 test 鎖 `data-zoom-key` = `episode:<id>`、冇 `https://`
- 清單行仍用網址：`focusKeyOf(episodes, focusId)` 由 id 轉返 url，三個頁（節目頁、每日劇集、短篇劇集）嘅 focus test 以 `focusId` 入頁照捲去 / highlight
- PWA gate: no（唔掂 sw / manifest / build config / 更新邏輯）

## Findings

none（🔴 / 🟡 冇）

### Observation

- Freeze 後 `impact` 仍列 ui-foundation REVERIFY：只係 S3 行（舊 release freeze 嘅 plan 檔 + 已刪 path），S1 全部 FROZEN；下次 release S3 處理（同之前報告一樣，唔使跟進）
- Sandbox e2e 被停係我設嘅 background 上限（10 分鐘），唔係 test fail；證據以 CI 同 SHA run 為準

## 建議補測

- none（`focusKeyOf` 係單純 lookup，三個頁嘅 focus test 已間接覆蓋；低風險，no edge case gap）

## Freeze

- `qa-ledger.sh freeze <chain> S1` × 11（bookmark、card-zoom、catalog-data、coming-soon、drama、home、mini-player、player-core、repo-tooling、show-today-page、ui-foundation），檔案清單 = ledger 原有該 chain + S1 全部 path；freeze 前後比對 chain + stage + path：冇少行、冇多行（1075 行更新 hash / commit）
