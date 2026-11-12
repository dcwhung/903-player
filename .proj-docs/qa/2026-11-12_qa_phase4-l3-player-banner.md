# QA — Phase 4 L3 player 1.34.0 首頁 banner 讀 catalog — 2026-11-12 — S1

- Tier: T2（MINOR 1.33.0 → 1.34.0，home + catalog-data 跨鏈）| Commit: `ff87221`（code `12664c0` + e2e fixture fix `ff87221`；`b0c269d` 淨 review 報告）| Verdict: ✅ pass
- Ledger（base `aa05e34` = merge-base origin/main）: SKIP 9 / REVERIFY 5（`home` `catalog-data` `ui-foundation` `coming-soon` `repo-tooling`）/ UNCOVERED 2（`HomeBanner/HomeBanner.test.tsx`、`HomeLandscapeGrid/bannerImages.test.ts` → 合 home plan glob `src/components/pages/home/Home*/*`，併入 `home`）/ IGNORED 3
- `ui-foundation`：淨 `tests/fakeBannerImage.ts` 加 `crossOrigin` 欄位（test helper），用家 `bannerEdges.test.ts` / `useBannerEdges.test.ts` 喺下面 run 綠 → 沿用 plan 重新 freeze S1（S3 行留畀 release QA）
- `coming-soon` / `repo-tooling`：淨 `apps/player/package.json` + `package-lock.json` 嘅 player version `1.33.0 → 1.34.0` 兩行（`git diff` 已核），冇依賴 / 行為改動 → 沿用 plan 重新 freeze
- Plan：`plans/home.md` 加 AC-8 + `HomeBanner/` 指令 + banner e2e；`plans/catalog-data.md` 加 AC-8（`activeBanner` / snapshot banner / CORS）+ 指令
- Freeze 後 `impact` 仍列 `home` / `catalog-data` / `ui-foundation` REVERIFY：淨係 2026-11-04 baseline 嘅 S3 行（舊 path deleted + plan hash），S1 行全部 FROZEN；S3 留畀 release QA
- Review：`.proj-docs/reviews/2026-11-12_review_phase4-l3-player-banner.md`（100 pass，S-925–S-929 唔重複）

## Runs

| Command                                                                                                                                                                                                          | Result                                                                                                      | Time  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----- |
| `npm test -- apps/player/src/components/pages/home/ apps/player/src/catalog/ apps/player/scripts/catalogSnapshot apps/player/scripts/buildCatalogJson packages/catalog/src/document apps/player/src/pages/home/` | 886 tests pass                                                                                              | 33 s  |
| `npx vitest run --project @903-player/player <HomeBanner HomeLandscapeGrid catalog/runtime catalog/snapshot scripts/catalogSnapshot> --coverage`                                                                 | 151 pass；coverage 見 Gates                                                                                 | 15 s  |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e` @ `ff87221`（main agent 本機，log 引用，唔重跑）                                                                                                        | 787 PASS / 0 FAIL                                                                                           | ~10 m |
| CI `ci.yml` run [43322987780](https://github.com/dcwhung/903-player/actions/runs/43322987780) @ `ff87221`（lint、`tsc -b`、unit、build、e2e）                                                                    | ✅ success：unit 362 files / 3898；e2e 826 PASS / 0 FAIL「All E2E checks passed」（含 banner 5 個新 check） | —     |

## 驗證要點（L2）

- e2e「Remote catalog banner」：橫額 `src` = `…/e2e-catalog/banner/banner.webp`、載入到、CORS 模式；「跨 origin banner」：`https://catalog-images.e2e.test/e2e-catalog/banner/banner.webp` 照出
- Fallback（壞 JSON / `schemaVersion` 2 / 慢過 1.5 秒）：橫額 = 內建 `assets/banner-BWz953VB.webp` ×3；844×390 橫版入格用 `banner-wide-*.webp`；橫額高 = 格高 / 圓角 / 版本號位置 check 全綠
- Unit：`runtime.test.ts`（remote 有 / 冇 banner、fallback 用 snapshot banner、冇 snapshot = undefined）、`source.test.ts`（banner 檔名 → bundle URL、缺圖成份 snapshot 唔用）、`catalogSnapshot.test.ts`（banner 兩張圖下載 + 改寫檔名）、`HomeBanner.test.tsx` / `bannerImages.test.ts`（有 / 冇 catalog banner）
- PWA gate：唔適用（`sw.js` / manifest / 更新邏輯冇改；banner 圖行現有 catalog 圖 CacheFirst route）

## Hard Gates

all pass。Coverage（改動 source，lines / branches）：`runtime.ts` 100 / 95.2、`snapshot/source.ts` 100 / 90、`catalogSnapshot.ts` 99 / 91.2、`HomeBanner.tsx` 100 / 71.4、`bannerEdges.ts` 100 / 85.7、`FittedBanner.tsx` 90.9 / 50；全部 lines ≥ 80%

## Findings

- 冇 🔴 / 🟡 / 🟢

## 建議補測

- none（有 / 冇 banner、remote / snapshot / 內建三個來源、snapshot 缺圖、同 origin + 跨 origin CORS 已有 unit + e2e）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: home S1 (re-frozen, +HomeBanner.test.tsx +bannerImages.test.ts, plan AC-8); catalog-data S1 (re-frozen, plan AC-8); ui-foundation S1 (re-frozen, test helper only); coming-soon S1, repo-tooling S1 (player version lines only, re-frozen)
tickets: none
ci: run 43322987780 success @ ff87221 (unit 362/3898, e2e 826/0); local e2e 787/787 @ ff87221 (main agent)
next_action: main agent push docs after CI; then PR / merge per parallel-lane rules
context: T2, 0 findings; no new IDs used (S-930–S-934, C-021, W-728–W-729 still free)
```
