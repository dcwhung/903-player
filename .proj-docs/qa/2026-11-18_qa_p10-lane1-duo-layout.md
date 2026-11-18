# QA — p10-lane1-duo-layout（ui-foundation）— 2026-11-18 — S1

- Tier: T2（新版面 + build 加 PostCSS plugin；`sw.js` / manifest / 更新邏輯冇改）| Commit: f01f02e（ledger 記 a11f905 = 淨 docs）| Verdict: ❌ fail（1 個 🟡，只限 drama / show-today-page）
- Base: `impact --since e3d6952`（`git merge-base HEAD origin/main`）；PR #269 → `release/v2.0.0`
- Ledger: SKIP 2（admin、api）/ REVERIFY 12 / UNCOVERED 57（6 個 lane 1 新檔 + 36 個 `_mockups_/iphone-duo/` → 入 ui-foundation；15 個 `_mockups_/home-view/` 留 UNCOVERED，Design Origin 係 HomeView lane 3 / 6 / 7）
- 12 條 REVERIFY 嘅 S1 STALE 行全部係今次 diff（`origin/release/v2.0.0...HEAD`）嘅檔；ui-foundation / catalog-data S3 STALE 係 monorepo 前舊 path，屬 release，唔掂（freeze 後 ui-foundation 仍顯示 REVERIFY 係因為 S3 行）。Plan: `.proj-docs/qa/plans/ui-foundation.md` 加 AC-4（Duo）+ scope + 指令；其他鏈 plan 不變

## Runs

| Command                                                                                                        | Result                                                                                                  | Time |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---- |
| `npm run lint`、`tsc`（引用 developer，f01f02e）                                                               | clean                                                                                                   | —    |
| `npm test`（引用 developer，f01f02e）                                                                          | 4955 passed                                                                                             | —    |
| `PW_CHROMIUM_PATH=… npm run e2e`（引用，scratchpad `e2e-lane1b.log`，07:36 完，f01f02e 之後）                  | 952 PASS / 0 FAIL；Duo 26 行（24px 邊框、mini player 24px、46% 欄、22px icon、把手 0、全集表左 / 底 0） | —    |
| `npm run e2e:visual` 對 e3d6952（引用，`visual-lane1b.log`）                                                   | 比對咗 180 張：全部一樣                                                                                 | —    |
| `npx vitest run …postcssDuoLandscape …deviceQueries …testMediaQuery …landscapeBreakpoint …HomePage.test`（QA） | 5 files / 132 tests pass                                                                                | 5s   |
| `grep '@media…639' dist/assets/*.css`（QA，e2e build）                                                         | 15 個闔上・橫區塊（複製品 + 人手寫）+ 3 個 Duo 打橫 + 3 個 Duo 四姿勢                                   | <1s  |
| Playwright 量 docked 資料表 + `--mini-player-offset-bottom` / `--toast-offset-bottom`（QA，scratchpad script） | 底 0（全部）；右 8 / 8 / 38（Duo）vs 0 / 30（對照）；Duo offset 24 / 24，對照 8 / 8；0 JS error         | 40s  |
| CI 44257975863 @ f01f02e                                                                                       | Detect code changes ✅ / Lint, unit & build ✅ / E2E (Playwright) 報告時 in_progress                    | —    |

## Hard Gates

- Tests ✅；Coverage ✅（`tests/mediaQuery.ts` 94% lines；`postcssDuoLandscape.ts` 4 個 unit test + build 輸出核實；`layout.ts` 淨常數；CSS 由 e2e / visual 驗）；PWA n/a（`vite.config.ts` 只加 `css.postcss`，PWA 換版 7 行喺 952 PASS 入面）；Security / Performance n/a；No blocking finding ❌（drama / show-today-page，見下）

## Findings

### 🟡 Duo 打橫節目資料表右邊離畫面 8px → CUI-0025

- L1：plan `.proj-docs/plans/2026-11-17_plan_p10-duo-homeview.md:15` 用戶決定 2026-11-18「打橫嘅全集表 / 資料表：伸出邊框貼畫面邊」；現有手機打橫同一張表右邊 0
- L2：`#/show/gongzi`（示範 catalog）docked `dialog` 右邊：612×426 **8**、612×438 **8**、876×612 **38**；對照 844×390 **0**、1000×562 **30**；底邊全部 0
- L3：`ItemInfoSheet.module.css:177-183` Duo 區塊淨係 `bottom: calc(-1 * var(--duo-edge-inset))`，冇 `right`；右欄表照受 `.scope` 8px padding
- 影響鏈：drama、show-today-page（`ItemInfoSheet.module.css` 屬呢兩條）→ 唔 freeze；ui-foundation 本身嘅 AC-4 檔全部 pass

### Observation

- 短提示 24px 靠 `--toast-offset-bottom: var(--mini-player-offset-bottom)`（量到 24），`duo.mjs` 冇直接斷言；CI E2E job 報告時未完：push / merge 前要見到綠（本地同 tree 952/0）

## Scope / freeze

- ui-foundation S1：原有 88 行 + 6 個新檔（`tests/mediaQuery.ts`、`src/testMediaQuery.node.test.ts`、`src/styles/deviceQueries.node.test.ts`、`scripts/postcssDuoLandscape{,.test}.ts`、`e2e/duo.mjs`）+ 36 個 `_mockups_/iphone-duo/`
- 同一份證據重新 freeze（STALE 淨係因為今次 diff，plan 指令係 `npm test` / `npm run e2e` 子集，visual 180/180 證現有裝置零改變）：repo-tooling、home、mini-player、player-core、pwa-shell、coming-soon、bookmark、card-zoom、catalog-data（S1）
- 唔 freeze：drama、show-today-page（等 CUI-0025）
- 建議補測：`e2e/duo.mjs` 資料表貼右邊 + 底邊（CUI-0025 一齊加）；短提示底 24px

```handoff-receipt
protocol: 2
status: fail
score: n/a
stage: S1
ledger: "SKIP 2 / REVERIFY 12 / UNCOVERED 57"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: invoke_developer
next_agent: frontend-developer
branch: "feature/layout/iphone-duo"
context: "S1 @ f01f02e: 1 Major CUI-0025 (Duo landscape docked ItemInfoSheet right edge 8px off screen; fix right: -duo-edge-inset in ItemInfoSheet.module.css + duo.mjs assertion). ui-foundation + 9 other chains refrozen; drama & show-today-page NOT frozen until fix re-verified. e2e 952/0, visual 180/180 cited; CI 44257975863 E2E in_progress at report time. QA commit local only, not pushed"
```

---

## Update 1 — 2026-11-18 08:20 — S1 re-verify（`ffccc59` `19da287` `d796cf3`）

- Tier: T2 | Commit: d796cf3（ledger 記 b3baba8 = reviewer 淨 docs）| Verdict: ✅ pass
- Ledger（`impact --since e3d6952`，freeze 前 vs 5de5659）：REVERIFY 4（drama、show-today-page、home、ui-foundation S1）/ SKIP 10 / UNCOVERED 15（`_mockups_/home-view/`，同上）。mini-player 冇 STALE（新 commit 冇掂佢嘅檔），唔使 re-freeze
- Plans 不變（全部係 `npm test` / `npm run e2e` 子集，下面全套證據覆蓋）

| Command                                                                   | Result                                                                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `npm test` + `npm run lint`（引用 developer，d796cf3）                    | 4956 passed；clean                                                                                                         |
| `npm run e2e`（引用，scratchpad `e2e-lane1c.log`，19da287）               | 966 PASS / 0 FAIL；Duo 40 行，包括資料表右 0 / 底 0（闔上・橫、Seated）、右 30 底 0（打開・橫）、內頁把手離邊 0、短提示 24 |
| `npm run e2e:visual` 對 origin/main（引用，`visual-lane1c.log`，19da287） | 180 張全部一樣                                                                                                             |
| `scratchpad/qa/duoInfo2.mjs`（QA，現有 dist，CSS 核實含三個 fix）         | 612×426 / 612×438 右 0 底 0；876×612 右 30 底 0；對照 844×390 右 0、1000×562 右 30；mini / toast 24；0 JS error（20s）     |
| CI 44263374327 @ d796cf3（PR #269）                                       | Detect ✅ / Lint, unit & build ✅ / E2E (Playwright) 報告時 in_progress（19da287 run 44262501599 俾 d796cf3 cancel）       |

- d796cf3 淨改 `homeBottomSpace.node.test.ts`（node test，`npm test` 覆蓋），所以 19da287 嘅 e2e / visual 證據適用
- Hard Gates：all pass（Coverage：三個改動係 CSS，由 e2e 斷言 + lock test 覆蓋；PWA / Security / Performance n/a）

### Findings

- CUI-0025 ✅ 已修 → ticket 移去 `.tickets/completed/0001-0200/CUI-0025.md`（W-784 同一問題，reviewer re-review 2 亦 resolved）
- 冇新 finding；上次 Observation「短提示 24px 冇直接斷言」已由 `duo.mjs` 補（4 個姿勢「短提示離底 24px」）

### Scope / freeze

- Re-freeze S1（全條 chain + stage 檔案清單由 ledger 攞 + plan）：drama 212、show-today-page 174、home 151、ui-foundation 130
- Freeze 前後 chain + stage + path 逐行比對：2593 行一樣，冇少行；S1 STALE 0（ui-foundation 仍顯示 REVERIFY 係 S3 舊 path，屬 release）
- 建議補測：none

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 10 / REVERIFY 4 / UNCOVERED 15"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: proceed
next_agent: main
branch: "feature/layout/iphone-duo"
context: "S1 re-verify @ d796cf3: CUI-0025 fixed (ffccc59) and closed; drama, show-today-page, home, ui-foundation S1 frozen @ b3baba8 (full chain lists, 2593 rows unchanged). e2e 966/0 + visual 180/180 on 19da287, unit 4956 + lint on d796cf3 cited; targeted Duo info-sheet measure pass. CI 44263374327 E2E in_progress at report time: must be green before push/merge. QA commit local only, not pushed"
```
