# QA — Phase 3a（admin 資料欄位 + API）— 2026-11-10 — S1

- Tier: T2（新欄位跨 `packages/catalog` / player + 新 endpoint + D1 migration 0004；api 0.3.0 → 0.4.0、player 1.32.0 → 1.33.0）| Code commit: `6e67400`（`86fe08d` 淨 review docs）| Verdict: ✅ pass
- L1：`.proj-docs/plans/2026-11-10_plan_phase3-admin.md` §3a；review `.proj-docs/reviews/2026-11-10_review_phase3a-admin-api.md`（fail 80 → re-review pass 100；C-013、W-707 已修；S-798..S-802 backlog）
- Ledger（`impact --since 62972d1` = `git merge-base HEAD origin/main`）：SKIP 3（card-zoom、home、pwa-shell）/ REVERIFY 10 / UNCOVERED 32 / IGNORED 8
- REVERIFY 10：api、catalog-data、drama（直接改）；bookmark（`savedItems` / `useSavedView` label 改用 `arcLabelOf`）、coming-soon、player-core、mini-player、show-today-page、ui-foundation（`types/drama.ts`）、repo-tooling（version + lockfile）係 1-hop / 共用檔
- `home` 係 SKIP：scope 冇檔改到（`HomePage` 經 `allShows()` 自動跟，由 catalog-data `shows/registry.test.ts` 證），唔重驗
- UNCOVERED 分配：`api` ← `apps/api/src/admin/*`、`migrations/0004_admin.sql`、`test/{adminRoutes,adminScan,drafts}.test.ts`、`packages/catalog/src/admin/*`、`_mockups_/admin/{index.html,banner.webp}`（3b Design Origin，只凍結）；`catalog-data` ← `packages/catalog/src/core/textFields.ts`；`drama` ← `packages/catalog/src/dramas/arcLabel{,.test}.ts`、`apps/player/src/catalog/dramas/arcLabelFor.test.ts`
- Plan 更新：`api.md` AC-14（3a API + migration）；`catalog-data.md` AC-6（show 新欄位 / `enabled`）；`drama.md` AC-6（arc `enabled` / `displayName`、ID pin）

## Runs

| Command                                                                                                                          | Result                                                               | Time   |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| CI run 42878341996 @ `6e67400`（引用，冇重跑）：Detect / Lint（eslint + `prettier --check .`）、`tsc -b`、unit & build / E2E     | 全 success：unit 279 files、e2e 780 PASS / 0 FAIL（PWA 換版 7 個綠） | 15 min |
| `npm test`（10 條鏈 plan 指令嘅聯集 ≈ 全部 project，一次過跑）                                                                   | 279 files / 3327 pass                                                | 104 s  |
| `npx tsc -b`                                                                                                                     | 0 error                                                              | 18 s   |
| Coverage v8 `packages/catalog`：`src/admin/*`、`dramas/{arcLabel,episodes,schema}`、`shows/{registry,schema}`、`core/textFields` | lines 99.0% / branch 94.0%（最低 `rawDefinition.ts` 92.5%）          | 10 s   |
| Coverage v8 `apps/api`（workerd）`src/admin/*`：153 test                                                                         | lines 96.3% / branch 76.6%（最低 `rescan.ts` 86.2%）                 | 60 s   |
| Migration 本機：scratchpad config（0001–0003）apply + 插舊 `entries` ×2 / `publishes` ×2（1 行 `failed`）→ apply 0004            | 見下（api AC-14）                                                    | 2 min  |

- api AC-14 migration：0004 喺舊資料上 apply ✅；舊 `entries.draft = 0`、`publishes.error = NULL`、`status` 保留（`ok` / `failed`）；`scan_findings` + `scan_findings_open` index 建立；`draft = 2` → `CHECK constraint failed: draft IN (0, 1)`；`kind = 'bogus'` → CHECK 擋
- api AC-14 Worker（workerd vitest，L2）：scan — 冇 diff 唔寫、新集數 + finding、新短篇 `enabled: false` + placeholder ID、新資料夾 → draft 劇「only once」（重跑冪等）、有劇資料夾唔見唔建劇兼只 flag 一次、壞資料夾跳過；draft — 冇圖照存、其他規則照擋、完整驗證自動清、publish 唔包、DELETE 准；todos — 新 draft 劇每格、新短篇 placeholder / 排期 must、改短篇 ID 後行仲喺度 + 排期發佈後 resolve（C-013 ×2）、missing folder、發佈 resolve；rename — 從未發佈連 schedules / findings、淨係下架時發佈過照准（W-707）、上架發佈過 409、400 / 404 / 412；ID 守衛 — 只鎖上架過、下架後照鎖、刪上架短篇 409（W-707 ×3）；folders、order（只排上架、draft / 下架唔郁、ids 唔齊 400、shows）、changes（發佈後冇改動、validation error 唔 fail、唔包 draft）、publishes `changes` + 失敗行 `error: 'R2 down'`
- catalog-data AC-6 / drama AC-6：`jsonSchemas.node.test.ts` parser ↔ schema 同步、`shows/schema.test.ts`、`dramas/schema.test.ts`、`shows/registry.test.ts`（`enabled: false` 濾走）、`registryAvailability.test.ts`（下架 arc）、`arcLabel.test.ts` / `arcLabelFor.test.ts`、`scan/draft.test.ts`（merge 保留新欄位）全綠；每劇 `library/*/drama.test.ts` ID pin 喺 diff 冇改、照綠
- bookmark：收藏格短篇 heading / 讀屏名、最近收聽 label 改 `arcLabelOf`，key 照用 `section.arc`；plan unit 綠，CI e2e `bookmark.mjs` 綠
- drama AC-5 CLI smoke 冇跑：`scripts/dramaFromFolder.ts` 冇改，`merge.ts` 只加 keys，由 `draft.test.ts` 證
- PWA：版本 `1.33.0`（`apps/player/package.json`）；10 條鏈 plan 都係 PWA gate no，唔掂 `sw.js` / manifest
- Freeze：`freeze <chain> S1` × 10（api 98、bookmark 54、catalog-data 131、coming-soon 162、drama 166、mini-player 52、player-core 101、repo-tooling 22、show-today-page 104、ui-foundation 88 檔，@`86fe08d` = code `6e67400` + review docs）；之後 `impact` UNCOVERED 0，淨係 REVERIFY catalog-data / drama / player-core / ui-foundation = 舊 S3 行（2026-11-04 baseline，留俾 S3），S1 冇 STALE

## Hard Gates

all pass（Tests：本地全 unit + `tsc -b` 綠，CI 全 e2e 780 / 0 綠；Coverage：改動模組 lines ≥ 86%；Security：新 endpoint 全部 same-origin + session（`adminScan` same-origin test、`publish` session test）；Data：migration 0004 喺舊資料上 apply OK、draft 唔入 publish；Performance：`GET /api/publishes` 載全部 document = S-798 已喺 backlog）

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- Observation：`apps/api` admin branch coverage 76.6%（`rescan.ts` 57.9%：R2 list 錯誤分支）；lines ≥ 86%，唔違反 gate，唔開 backlog
- Deploy 後手動（DevOps / 用戶，S1 範圍外）：① 遠端 D1 apply `0004`；② `POST /api/scan` 冇新嘢時 `findings` 空；③ `GET /api/changes` 同最新 publish 比冇改動（plan §驗證）；④ 真 D1 跑一次 `PUT /api/order/dramas`（`json_set` 綁數字，S-799）；⑤ `/api/publishes` 舊行 `changes` / `error: null` 正常

## 建議補測

- none（plan「3a 測試」列嘅 case 全部有；C-013 / W-707 有專屬 test）

```handoff-receipt
status: pass
stage: S1
chain: api, bookmark, catalog-data, coming-soon, drama, mini-player, player-core, repo-tooling, show-today-page, ui-foundation
commit: 6e67400
next_action: main_agent_push_docs_then_merge
context: "Phase 3a S1 pass @6e67400; CI 42878341996 cited (lint/tsc/unit 279 files, e2e 780/0); local npm test 3327 pass, tsc -b 0; coverage catalog admin lines 99% / api admin 96%; migration 0004 on 0001-0003 data ok (draft 0, error NULL, CHECKs); C-013/W-707 tests green; 10 chains S1 frozen (home SKIP); post-deploy manual: remote D1 0004, scan empty, changes empty, PUT /api/order on real D1 (S-799); QA commit local only (not pushed)"
```
