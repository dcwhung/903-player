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
