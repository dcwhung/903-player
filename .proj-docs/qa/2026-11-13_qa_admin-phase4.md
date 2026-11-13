# QA — Lane L2 admin 0.1.0（Phase 4）— 2026-11-13 — S1

- Tier: T2（MINOR，admin 新功能 + catalog / api 小改）| Commit: `e2b9ca8` | Verdict: ✅ pass
- Ledger（base `fc83424` = merge-base origin/main）: SKIP 9 / REVERIFY 5（`admin` `api` `catalog-data` `coming-soon` `repo-tooling`）/ UNCOVERED 63（55 個 `apps/admin` 新檔 + 6 個 `_mockups_/admin-phase4/*` → admin 鏈；`packages/catalog/src/core/hexColour{,.test}.ts` → catalog-data 鏈）/ IGNORED 2
- `coming-soon` / `repo-tooling`：淨係 `package-lock.json` 嘅 `apps/admin` version `0.0.2 → 0.1.0` 一行（`git diff` 已核），冇依賴 / 行為改動 → 沿用 plan 重新 freeze，冇額外驗
- Plan：`plans/admin.md` 加 AC-20（Phase 4 L2）+ Design Origin；`plans/api.md` 加 AC-24（S-917 / S-918）；`plans/catalog-data.md` 加 AC-9（S-892 / S-916）
- Review：`.proj-docs/reviews/2026-11-12_review_admin-phase4.md`（W-724–W-726、S-910–S-918、S-892 已修），唔重複

## Runs

| Command                                                                                  | Result                                                                                                                                                                       | Time  |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `npm test`（root，全部 workspace）                                                       | 382 files / 4131 tests pass                                                                                                                                                  | 133 s |
| `npm run lint`                                                                           | eslint 0、prettier 全過                                                                                                                                                      | 35 s  |
| `npm run typecheck -w apps/api`                                                          | exit 0                                                                                                                                                                       | 4 s   |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e -w apps/admin`（含 admin build） | build ok；43 PASS / 0 FAIL（「admin e2e: all passed」）                                                                                                                      | 59 s  |
| `npx vitest run --project @903-player/admin --coverage.enabled --coverage.provider=v8`   | 92 files / 486 tests pass                                                                                                                                                    | 44 s  |
| CI `43339643985` @ `e2b9ca8`（lint / unit / build / player + admin e2e）                 | success：lint / tsc / unit / build 綠；E2E job player「All E2E checks passed」+ admin「admin e2e: all passed」（合共 908 PASS / 0 FAIL，含 player「Remote catalog」section） | —     |

- 跑完 `pgrep -af "vite preview"` 冇殘留；e2e 期間 `www.google.com` 被 proxy 拒（login 頁外部資源），唔影響結果
- Freeze（S1，成條鏈）：admin 264 → 324、api 111、catalog-data 135 → 137、coming-soon 162、repo-tooling 24；同 freeze 前比對 chain + stage + path 淨少 `admin S1 apps/admin/src/ui/ImagePreviewDialog.test.tsx`（檔案已喺 branch 刪除），其他冇少行；5 條鏈 S1 全部 FROZEN；另 `catalog-data` S3 91 行 STALE 喺 `origin/main` 已經係咁（S3 範圍，唔喺今次 S1）

## 驗證要點（L2）

- 封面裁切（AC-20）：`CropEditor.test.tsx`「should refuse a file over 20 MB without decoding (S-816)」「… over 8000 px from its header …」「should warn in yellow when the source is smaller …」「should keep the dialog open on Esc while uploading (S-817)」「should link the size hints … aria-describedby (S-817)」、`ChoiceCanvas`「完整 · 模糊背景」pass；e2e「R2 auto crop: empty drama slots fill from cd cover / cover photo in one save」PASS
- 配色：`ThemeEditor.test.tsx`「should mark a new drama as 未設定（中性灰） and suggest the first candidate without applying it」「should keep titleFont and headerRule untouched」pass；e2e「配色: current + three extracted candidates, rotate, apply saves the theme」PASS；`palette.regression.node.test.ts`（參考數，唔 block）pass
- 首頁 Banner：`useBannerFlow.test.ts`「should write nothing when the two-step change is cancelled」pass；e2e「首頁 Banner: default, two-step crop, upload both, then restore with confirm」PASS
- Publish / 記錄：`PublishPage.test.tsx`（中文錯誤 + 前往 Banner 頁、淨 Banner 改動可發佈、冇改動 disabled）pass；e2e「publish: 配色 warnings fold into one line, expand with links」+ 記錄頁淨換「首頁 Banner」PASS
- catalog / api：`hexColour.test.ts`、`themeSchema.test.ts`、`publishWarnings.test.ts`（每個 colour key + 大細楷，S-918）全綠；`THEME_COLOUR_KEYS` export 經 api typecheck
- Motion：`phase4.css` 新動畫全部喺 `@media (prefers-reduced-motion: no-preference)`（line 284、465）

## Hard Gates

all pass，除 Coverage 要講明（同之前 admin QA 一樣處理）：改動 / 新 source（lines）大部份 93–100；< 80% 有 8 個 —

- 新檔 `discPixels.ts` 20（canvas `getImageData`，jsdom 冇 canvas，unit 已 mock）、`useThemeApply.ts` 50（一行 `patchSaved`）：由 e2e「配色 … apply saves the theme」實跑
- `AppRoutes.tsx` 0（route 表，`/banner`、`/dramas/:id/theme` 由 e2e 行到）、`endpoints.ts` 74（新 banner / r2-source fetch 由 e2e Banner + R2 auto crop 行到）
- `MediaAside` 66.7、`ArcEditor` 76.5、`uploadChoice` 77.8、`useRescan` 78.6：新加嘅 prop / `afterScan` 行有 unit 或 e2e 行到，未行到係舊行或 wasm fallback 分支（e2e「PNG upload … wasm」證）
- Security / Data：admin 只經現有 `/api/*`（session + CSRF 屬 api 鏈，冇改）；PWA：n/a；Performance：n/a（冇 backend 行為改動，`warnings.ts` 淨 refactor）

## Findings

- 冇 🔴 / 🟡；冇新 ID
- Observation：`discPixels.ts` / `useThemeApply.ts` unit coverage 低（上面講明），冇 L1 違反 → 唔 block

## 建議補測

- none（S1 高風險邏輯 `cropGeometry` / `imageHeader` / `palette` / `r2AutoCrop` / `warningModel` 已 100 / 96.8 / 98.7 / 100 / 100）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: admin S1 (re-frozen 264 -> 324 rows: +55 new apps/admin files, +6 _mockups_/admin-phase4, -1 deleted ImagePreviewDialog.test.tsx); api S1 (111, AC-24); catalog-data S1 (135 -> 137, +hexColour.ts/.test.ts, AC-9); coming-soon S1 (162), repo-tooling S1 (24) lockfile admin version line only
tickets: none
new_ids: none
ci: 43339643985 success @ e2b9ca8 (lint/tsc/unit/build/player+admin e2e, 908 PASS / 0 FAIL)
next_action: main agent push this docs commit after CI (no code change since e2b9ca8); proceed to merge / release flow
context: T2, 0 blocking findings; npm test 382/4131, lint 0, api typecheck 0, e2e:admin 43/0, admin coverage run 486 pass; freeze diff vs before: no chain+S1+path lost except deleted file
```
