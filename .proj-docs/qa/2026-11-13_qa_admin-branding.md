# QA — admin-branding（App 外觀）— 2026-11-13 — S1

- Tier: T2 | Commit: `60f2262`（code = `744b974`，之後淨改 review 報告）| Verdict: ✅ pass
- 範圍：`git merge-base HEAD origin/main`（`0af488a`）..HEAD；SSoT `.proj-docs/plans/2026-11-13_plan_branding.md`、mockup `_mockups_/admin-appearance/index.html`
- Ledger: SKIP 9（bookmark / card-zoom / drama / home / mini-player / player-core / pwa-shell / show-today-page / ui-foundation，frozen untouched）/ REVERIFY 5（admin、api、catalog-data、coming-soon、repo-tooling）/ UNCOVERED 81（全部撥入上面 4 條鏈）/ IGNORED 7
- Plan 新 AC：admin AC-21、api AC-25、catalog-data AC-10、repo-tooling AC-7（coming-soon 淨 version / 註釋，沿用 plan）

## Runs

| Command                                                                                                  | Result                                                                                                                                                                                                                             | Time     |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `npm test`（本機）                                                                                       | 408 files / 4352 tests pass                                                                                                                                                                                                        | 183 s    |
| `npm test -w apps/api`（本機）                                                                           | 20 files / 354 + scripts 1 / 12 pass                                                                                                                                                                                               | 21 s     |
| CI `ci.yml` @ `744b974`（run 43445238213，push）                                                         | lint、`tsc -b`、unit、build、build:admin、production smoke、`npm run e2e`（870 ✓，「All E2E checks passed」）、`npm run e2e:admin`（45 PASS，包「App 外觀」「App 圖示 previews fit」「首頁 Banner」）全綠 → 引用，唔重跑 e2e       | 19 min   |
| Changed-file coverage（admin / player / catalog，v8）                                                    | 57 檔 lines 95.1%；< 80%：`AppRoutes.tsx` 0%（route 表，e2e 覆蓋）、`endpoints.ts` 74%（未行嘅係舊函數，改動行有覆蓋）、`HistoryPage.tsx` 72%（`useRedeploy`，下面 smoke 補證）                                                    | 3 min    |
| 冇 URL production build（HEAD vs `origin/main` worktree）                                                | manifest + 五張 icon sha256 一樣；`index.html` 淨差 bundle hash + `v1.36.0`                                                                                                                                                        | 2 × 40 s |
| Branded build（scratchpad HTTP server：catalog.json 含 branding，名 `QA $' & <Brand>`、簡介含 `"` `$&`） | manifest name / short_name / description 套用；`<title>`、description、og:title / og:site_name / og:description 正確 escape，`$'` `$&` 冇破壞 HTML（W-736），module script 1 個；五張 icon sha256 = fixture，`sw.js` precache 有齊 | 40 s     |
| Branded build，maskable PNG 404                                                                          | `[branding-icons] falling back`，五張 = 內建；文字照套；branded-public 刪走                                                                                                                                                        | 40 s     |
| `deploy-api.yml`「Sync optional deploy secrets」（`bash -e` + stub `npx`）                               | 冇 secret → exit 0、冇叫 wrangler；一個 / 兩個 → log 淨名、JSON `-rw-------`、跑完刪                                                                                                                                               | 1 s      |
| `deploy.yml` YAML parse                                                                                  | `on` = push main / workflow_dispatch / `repository_dispatch: [catalog-branding]`                                                                                                                                                   | 1 s      |
| Redeploy smoke（scratchpad Playwright + `apps/admin/e2e/mockApi.mjs`，`/history` 撳「重新部署 #2」）     | 成功：1 POST、重讀記錄 1 次、toast「已重新開始部署 #2」、狀態變「已部署」；502：toast「重新部署失敗：GitHub 502」、仍「部署失敗 + 重新部署」                                                                                       | 10 s     |

## Hard Gates

all pass（coverage 三個 < 80% 檔見上，改動行由 e2e / smoke 證；PWA：SW 策略 / 更新邏輯冇改，manifest 只喺 catalog 有 branding 先變，上面兩個 build + CI PWA 換版 section 證；Security：secret 唔入 log，見 deploy-api step）

## Findings

冇三層收斂嘅 🔴 / 🟡。

### 🟢 / Observation

- Observation：真 GitHub dispatch / Vercel hook / 部署狀態 API 要用戶設 `DEPLOY_GITHUB_TOKEN`、`VERCEL_DEPLOY_HOOK_URL` 並 Run「Deploy API」先驗到（plan「用戶要做」）→ merge 後 S2 / UAT

## Freeze

- S1 @`60f2262`：admin 324 → 372、api 111 → 129、catalog-data 137 → 147、coming-soon 162 → 162、repo-tooling 24 → 26（ledger 2219 → 2297 行）
- 同 `origin/main` 比 chain + stage + path：淨少 admin `features/banner/BannerPage{,.test}.tsx` 兩行（檔已刪，由 `BannerCard` 取代，冇得 freeze）；`impact` 會照列佢哋做 UNCOVERED，屬刪檔，唔使驗
- `catalog-data` S3 91 行 STALE 係 `origin/main` 已有（monorepo 搬 path），屬 S3 release，今次唔郁

## 建議補測

- `HistoryPage` `useRedeploy`：成功 toast + reload、失敗 toast 嘅 unit（而家只有 smoke 證，令檔案 coverage ≥ 80%）

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: 60f2262
report: .proj-docs/qa/2026-11-13_qa_admin-branding.md
frozen: admin S1 372, api S1 129, catalog-data S1 147, coming-soon S1 162, repo-tooling S1 26
tickets: none
next_action: main_agent_commit_then_user_screenshots
context: "S1 pass for feature/admin-branding; CI 744b974 green cited for e2e / e2e:admin; branded + plain player builds verified locally; one suggested unit test (useRedeploy)."
```

## 補測（2026-11-13，main agent）

- QA 建議補 `HistoryPage` `useRedeploy` unit test：已加 `apps/admin/src/features/history/HistoryPage.test.tsx`「HistoryPage redeploy」2 個 case（成功 → toast + 重新載入列表；502 → toast 錯誤、唔重新載入）
- admin unit 107 files / 556 tests 全綠；`npx tsc -b apps/admin`、`npm run lint` 過
- admin S1 用成條 chain re-freeze（372 行，行數不變），同上一個 commit 比 chain + stage + path 冇少行
