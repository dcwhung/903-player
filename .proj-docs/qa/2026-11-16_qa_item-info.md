# QA — P9.5 #12 節目資料（item info，player 1.34.0）— 2026-11-16 — S1

- Tier: T2（MINOR、跨模組：catalog registry、PlayerPanel、ArcSheet、今日節目表、Sheet 抽出共用）| Branch: `feature/catalog/item-info` | Commit: `f47d174`（code）/ `22e69ba`（HEAD，之後淨 docs）| Verdict: ✅ pass
- Ledger（`impact --since "$(git merge-base HEAD origin/main)"` = `713cb85`）: SKIP 2（admin、api）/ REVERIFY 12 / UNCOVERED 153（新 code / test 51 + `_mockups_/catalog-item-info/` 102）/ IGNORED 3
    - 主鏈：catalog-data、drama、show-today-page；其餘 9 條（bookmark、card-zoom、coming-soon、home、mini-player、player-core、pwa-shell、repo-tooling、ui-foundation）係共用檔被改（`useDramaPage`、`ShowPage`、`tokens.css`、`i18n`、`constants`、ArcSheet `sheetDrag` 等 → `Sheet/` 改名、version bump）→ 按各自 plan 重驗
    - UNCOVERED 歸鏈：ItemInfo / Sheet / `useItemInfoSheet` / `dragVelocity` / `selectors/itemInfo` / mockup / `e2e/itemInfo.mjs` → show-today-page（+ drama 共用嗰啲）；ArcSheet 新檔、`useSeriesInfo` / `useDailyInfo` / `seriesPageLabels` / `e2e/arcSheet.mjs` → drama；`selectors/itemInfo*` → catalog-data（1-hop）
- SSoT: `.proj-docs/plans/2026-11-16_plan_item-info.md`；review `.proj-docs/reviews/2026-11-16_review_item-info-rereview.md`（100/100 pass）；plans 更新 `plans/{catalog-data,drama,show-today-page}.md`（加 AC、scope、commands），其餘 9 份沿用

## Runs

| Command / 證據                                                                                                                                    | Result                                                                                                       | Time      |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------- |
| `npm test -- <12 份 plan 嘅 npm test path 聯集 + item-info 新 test>`（146 + 10 個 path；唔係全部 `npm test`）                                     | 275 files / 3199 tests pass                                                                                  | 105 s     |
| `npx vitest run --project @903-player/player --project @903-player/catalog --coverage --coverage.include=<52 個改動 / 新增 .ts/.tsx> <相關 test>` | 764 tests pass；52 檔全部 ≥ 80%（合計 lines 99.1% / stmts 98.0% / branches 93.9%；最低 `icons.tsx` 85.4%）   | ~60 s     |
| `npm run lint`（eslint + `prettier --check .`）                                                                                                   | pass                                                                                                         | 39 s      |
| `E2E_PORT=4180 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e` @`22e69ba`（code = `f47d174`）                                             | exit 0，823 PASS / 0 FAIL「All E2E checks passed」；`節目資料：…` 25 個 check、PWA 換版、冇 JS error 全 PASS | 10 m 57 s |
| 手動 Playwright 橫版 1280×800（e2e build + vite preview :4181，`itemInfo.mjs` 示範 catalog；script 喺 session scratchpad `manual/`）              | 見下                                                                                                         | ~2 min    |
| `git diff 713cb85 HEAD -- apps/player/package.json package-lock.json`                                                                             | 淨係 `1.33.0 → 1.34.0` 兩行（repo-tooling）                                                                  | —         |

- 橫版右欄 sheet（reviewer observation，用戶已真機接受「撳 sheet 以外任何可撳元素都閂」）實測冇誤閂：
    - 節目頁 `#/show/gongzi`：撳 sheet 入面（banner、主持 chip、簡介、空白位）唔閂；撳 ⓘ 本身（連撳兩次）唔閂；撳右欄碟面非掣位置唔閂；撳左欄集數掣即閂；✕ / Escape 閂，ⓘ 再開
    - 短篇劇 `#/drama/lancy`：全集 sheet 入面撳「劇集資料」箭咀唔閂；揀「戀愛二分一」→ 獨立 sheet；撳 sheet 入面（簡介、聲演 chip）、撳 ⓘ 唔閂；撳左欄「全集」→ 資料 sheet 閂、全集 sheet 出
- 未跑：repo-tooling plan 嘅全部 `npm test`（今次指示唔跑 full suite；淨 version bump，由 push 後 CI 同 SHA 證）；PWA gate（`sw.js` / manifest / 更新邏輯 / build config 冇改，PWA 換版 e2e 照 PASS）

## Hard Gates

all pass（Coverage：改動檔 52 個全部 ≥ 80%；PWA：n/a；Security / Data：n/a（只讀 catalog 欄位、localStorage 讀寫有 try/catch）；Performance：n/a（冇 backend API 改動））

## Findings

- 冇三層收斂嘅 🔴 / 🟡；冇新 🟢
- Observation：freeze 後 `impact` 仍列 REVERIFY 6（catalog-data / drama / home / pwa-shell / show-today-page / ui-foundation）= 呢幾條鏈嘅 **S3** 行 STALE（S1 全部 FROZEN @`22e69ba`），屬下次 release S3；UNCOVERED 7 = `ArcSheet/` 下舊 `sheetDrag` 等已改名去 `shared/common/Sheet/` 嘅已刪 path（`impact --since` 用 git diff 列出刪除端），唔使驗

## 建議補測

- none（item-info 新邏輯已有 unit + e2e 覆蓋；橫版「撳 ⓘ / sheet 入面唔閂」如要長期守住，可喺 `e2e/itemInfo.mjs` 節目頁橫版 section 加 2 個斷言，非必要）

```handoff-receipt
protocol: 1
status: pass
stage: S1
ledger: "FROZEN S1 @22e69ba: catalog-data / drama / show-today-page (plans updated) + bookmark / card-zoom / coming-soon / home / mini-player / player-core / pwa-shell / repo-tooling / ui-foundation (plans unchanged); SKIP admin, api; UNCOVERED 153 assigned to show-today-page / drama / catalog-data"
hard_gates: { tests: pass, coverage: pass, no_blocking: pass, pwa: n/a, security: n/a, performance: n/a }
tickets: []
next_action: merge_main
next_agent: main
branch: "feature/catalog/item-info"
context: "item-info S1 pass; unit 275 files / 3199 tests (12 plan path union, not full npm test); coverage 52 changed files >=80%; lint pass; e2e 823/0 @22e69ba; landscape right-column sheet manual check: inside sheet / info button do not close, left-column buttons close; report + ledger + 3 plans committed locally, not pushed; CI (incl. full npm test) must be green on push before merge"
```
