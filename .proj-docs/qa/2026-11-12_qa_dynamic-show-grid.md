# QA — L4 直版動態 ShowGrid（player 1.35.0）— 2026-11-12 — S1

- Tier: T2 | Branch: `feature/player-dynamic-show-grid` | Code commit: eb1812a | Verdict: ✅ pass
- 取代同 branch 上次（已作廢）嘅 S1：code 之後改咗（S-935 inline `--show-grid-columns` + cqi、S-936 rerender test、S-938 e2e 補強）
- Ledger（`impact --since bffa7ea` = `git merge-base HEAD origin/main`）：SKIP 10 / REVERIFY 4（`home` `catalog-data` `coming-soon` `repo-tooling`）/ UNCOVERED 13（`apps/player/e2e/showGridCounts.mjs` + `_mockups_/dynamic-show-grid/**` 12 個 → 歸入 `home`）
- `catalog-data`：淨 `e2e/remoteCatalog.mjs`（`openWithCatalog` export + `contextOptions` 交畀 `newE2EPage`）；`coming-soon` / `repo-tooling`：淨 `e2e/run.mjs`（加 section）、`apps/player/package.json` + `package-lock.json`（1.33.0 → 1.35.0，同 plan L4 一致）
- Plan：`.proj-docs/qa/plans/home.md` 加 AC-8（動態欄數規則）、scope `_mockups_/dynamic-show-grid/**` + `e2e/showGridCounts.mjs`、e2e command；其他三條沿用

## Runs

| Command / 證據                                                                                                | Result                                                     | Time |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---- |
| CI run 43323673299 @ eb1812a — Lint, unit & build（`npm run lint`、`tsc -b`、`npm test`、build、build:admin） | success                                                    | 5m   |
| CI run 43323673299 @ eb1812a — E2E（production smoke、`npm run e2e`、`npm run e2e:admin`）                    | success；「All E2E checks passed」，0 FAIL                 | 12m  |
| ↳ `showGridCounts.mjs`（手機 + iPad 直放 × 0 / 1 / 2 / 4 / 7 / 8 / 11 個節目，14 個 section）                 | 78/78 PASS                                                 | —    |
| ↳ `Remote catalog：…`（catalog-data AC-4）、`闊橫版…`（homeWide）、即將上架、主流程                           | 全 PASS                                                    | —    |
| `npx vitest run --project @903-player/player --coverage src/components/pages/home/ShowGrid/`（本地）          | 74/74；ShowGrid 檔 lines 99.0% / branches 95%（全部 ≥ 80） | 2s   |

CI 同一個 SHA 綠咗，plan 嘅 unit / e2e 指令唔重跑；本地淨跑 coverage（CI 冇 coverage gate）。

## AC-8 對證（CI e2e log 節錄）

- ≤ 2 格一欄：1 個節目（2 格）→ 1 欄，今日節目成行闊
- ≥ 3 格兩欄 + 單數橫跨：2 / 4 / 8 個節目（3 / 5 / 9 格）→ 2 欄，今日節目成行咁闊；偶數（8 / 12 格）唔橫跨、同其他格一樣闊
- 置頂 vs 分頁：一頁放得晒 `align-content start`、`topGap ≈ 0`；手機 9 / 12 格分 2 頁 → `space-between`；iPad 直放 9 / 12 格一頁置頂
- 未量到尺寸：橫跨格 97.3 / 97.3px（手機）、122.6 / 122.6px（iPad）同 16:9 格同高（S-935）
- 0 個節目：catalog 被拒 → 內建 7 個（8 格）兩欄（S-938）
- 闊橫版 4×2 / 手機打橫 / fillShape / HomeFillGrid：`homeWide.mjs`、unit `showGridCss.node.test.ts`（`data-span-last` 喺 landscape media query 還原）全綠，冇 regression

## Hard Gates

all pass（PWA gate n/a：冇改 `sw.js` / 更新邏輯 / build config / manifest；Security / Performance n/a）

## Findings

- 冇 🔴 / 🟡
- Observation：`home` S3 舊行早已 STALE（release 時處理）；今次改 `plans/home.md` 令 `impact` 照列 `REVERIFY home`（S3 行），S1 已 FROZEN

## 建議補測

- none（S-936 / S-938 已補；ShowGrid 純 layout 計算 unit 覆蓋 1–12 格）

## Ledger

- `freeze home S1`：145 檔（原 132 + `showGridCounts.mjs` + mockup 12）
- `freeze catalog-data S1`：131；`coming-soon S1`：162；`repo-tooling S1`：24（全條 chain + stage，無截短）

```handoff-receipt
from: quality-assurance
to: main-agent
stage: S1
status: pass
next_action: proceed_merge
artifacts:
  - .proj-docs/qa/2026-11-12_qa_dynamic-show-grid.md
  - .proj-docs/qa/plans/home.md
  - .proj-docs/qa/verification-ledger.tsv
context: "L4 dynamic portrait ShowGrid player 1.35.0 S1 pass @ eb1812a; CI run 43323673299 success (lint/unit/build/e2e/e2e:admin); froze home 145, catalog-data 131, coming-soon 162, repo-tooling 24; no blocking findings; no new IDs used; QA commit local only, not pushed"
```
