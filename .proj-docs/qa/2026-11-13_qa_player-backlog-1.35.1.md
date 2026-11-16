# QA — player 1.35.1 橫額 fallback + 主頁 backlog — 2026-11-13 — S1

- Tier: T1 | Branch: `fix/player-backlog-1.35.1` | Code commit: 4e81ee0 | Verdict: ✅ pass
- 範圍：S-925 / S-926 / S-927 / S-928 / S-929 / S-939 / S-941 + review 修正 S-955..S-958 + version 1.35.1（review：`.proj-docs/reviews/2026-11-13_review_player-backlog-1.35.1.md`，pass 100/100，L2 re-review pass）
- Ledger（`impact --since 6584b81` = `git merge-base HEAD origin/main`）：SKIP 6 / REVERIFY 8 / UNCOVERED 4（`HomeLandscapeGrid/useBannerImages{.ts,.test.ts}`、`CoverBanner.test.tsx`、`FittedBanner.test.tsx` → 歸入 `home`，plan glob `src/components/pages/home/Home*/*` 已涵蓋）
- REVERIFY 嘅 S1 STALE：`home`（banner / ShowGrid code + test）；`catalog-data`（`e2e/remoteCatalog.mjs`、`HomePage.test.tsx`）；`coming-soon` / `repo-tooling`（`e2e/harness.mjs`、`e2e/run.mjs`、`apps/player/package.json` + `package-lock.json` 1.35.0 → 1.35.1）；`drama` / `mini-player` / `player-core` / `show-today-page` 淨係 `HomePage.test.tsx` / `HomePageWide.test.tsx`（`BANNER_ALT` 改用 `t('home.bannerAlt')`）。S3 STALE 行屬 release，今次唔處理
- Plan：`plans/home.md` AC-8 加 S-925 / S-929 / S-955、AC-9 加 S-941 / S-939 / S-956、AC-8 e2e 加兩個 S-929 section；其他七條沿用

## Runs

| Command / 證據                                                                                                                                    | Result                                        | Time |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---- |
| `npm test -- <home plan 全部 path> apps/player/src/catalog apps/player/scripts/catalogSnapshot`（home + catalog-data AC-8）                       | 63 files / 634 tests pass                     | 28s  |
| `npx vitest run --project @903-player/player --coverage src/components/pages/home/{HomeLandscapeGrid,HomeBanner,ShowGrid}/`                       | 186/186；lines 99.4%，最低 FittedBanner 91.7% | 10s  |
| `npm run e2e` @ 4e81ee0（main agent 跑，log `/tmp/claude-0/-home-user-903-player/87ce90b1-edf7-5167-bff3-6ff0a51f2177/scratchpad/e2e-final.log`） | 「All E2E checks passed」，869 PASS / 0 FAIL  | 15m  |
| ↳ 上一次 @ cb46ef2（`…/scratchpad/e2e.log`，差 S-955..S-958）                                                                                     | 869 PASS / 0 FAIL                             | —    |

e2e 由 main agent 跑（port 4173 佔用），QA 引用 log，唔重跑。

## AC 對證（e2e-final log 節錄）

- AC-8 / S-929：`Remote catalog banner 404（直版 / 手機打橫 / 闊橫版）：主頁橫額換返內建圖`（`banner-*.webp` / `banner-wide-*.webp`，有 request 過 catalog URL 先換）、`跨 origin banner CORS 唔批：主頁橫額換返內建圖` 全 PASS
- AC-8 / S-955：unit `useBannerImages.test.ts` remount 後直接用內建圖、`onError` = `undefined`；冇 catalog banner 時唔掛 `onError`（唔會 loop）
- AC-8 / S-925：`bannerImages.node.test.ts` 內建 WebP 檔頭 = `ASSET_DIMENSIONS`
- AC-9 / S-941：未量到橫跨格 97.3 / 97.3px（手機）、122.6 / 122.6px（iPad）喺 0.5px 容差內；S-939 / S-956 `showGridCss.node.test.ts` 鎖 `32 / 9` = `PORTRAIT_MAX_COLUMNS` × tile 比例
- 其餘 home / catalog-data / 即將上架 / 主流程 section 全 PASS，冇 regression

## Hard Gates

all pass（coverage 改咗嘅檔全部 ≥ 80%；PWA gate n/a：冇改 `sw.js` / 更新邏輯 / build config / manifest；Security / Performance n/a）

## Findings

- 冇 🔴 / 🟡 / 🟢；冇用新 ID
- Observation：`checkBannerCorsRejected` 冇自己 `ctx.close()`，由 `runSection` `closeNewContexts` 收尾（同 `checkCrossOriginImages` 一樣），唔使改

## 建議補測

- none（S-929 / S-955 已有 unit + 4 個 e2e check；純 fallback 邏輯 edge case 已覆蓋：失敗、remount、冇 catalog banner）

## Ledger

- `freeze home S1`：151 檔（原 147 + UNCOVERED 4）；`catalog-data` 135、`coming-soon` 162、`repo-tooling` 24、`drama` 169、`mini-player` 52、`player-core` 101、`show-today-page` 104（全條 chain + stage 由 ledger 攞，S-866，無截短）
- freeze 後 `impact` 淨 `REVERIFY home`：係 `home` S3 舊行（今次改 `plans/home.md`），S1 已 FROZEN，release 時處理
- merge `origin/main`（`fc83424`，api 0.8.1）：`ledger-merge.mjs` 報 `coming-soon` / `repo-tooling` S1 `package-lock.json` 兩邊都改；merge 後 lock 對比 main 淨係多 player `1.35.1` 一行，`npm ci` 通過 → 用全條 chain + stage 清單重新 freeze（162 / 24 檔，S-866）

```handoff-receipt
from: quality-assurance
to: main-agent
stage: S1
status: pass
next_action: proceed_merge
artifacts:
  - .proj-docs/qa/2026-11-13_qa_player-backlog-1.35.1.md
  - .proj-docs/qa/plans/home.md
  - .proj-docs/qa/verification-ledger.tsv
context: "player 1.35.1 banner fallback + home backlog S1 pass @ 4e81ee0; unit 634/634, coverage changed files >= 80%; e2e-final 869 PASS 0 FAIL (main agent run); froze 8 S1 chains with full chain+stage lists; no findings, no new IDs; QA commit local only, not pushed"
```
