# QA — Backend Phase 2b-2（圖片上載 + prebuild snapshot）— 2026-11-10 — S1

- Tier: T3（新 mutating endpoint + D1 migration + build plugin 改 precache 內容；api 0.3.0、player 1.32.0）| Code commit: `0fae3e7` | Verdict: ✅ pass
- L1：`.proj-docs/plans/2026-11-10_plan_phase2b-backend.md` §2b-2；review `.proj-docs/reviews/2026-11-10_review_phase2b-2-backend.md`（pass 100，8 個偏差已接受）
- Ledger（`impact --since 3a0ec84` = `git merge-base HEAD origin/main`）：SKIP 8（pwa-shell 等，scope 冇改）/ REVERIFY 5（api、catalog-data、coming-soon、drama、repo-tooling）/ UNCOVERED 13 / IGNORED 9
- UNCOVERED 分配：`api` ← `migrations/0003`、`src/assets/{routes,webp}.ts`、`test/{assets,webp}.test.ts`、`test/webp.ts`；`catalog-data` ← `catalogSnapshot.{ts,test.ts}`、`snapshot/source{,.test}.ts`、`localize{,.test}.ts`、`episodeOptionsFor.ts`（亦入 `drama`）
- Plan 更新：`api.md` AC-13 + 本機 smoke；`catalog-data.md` AC-5（snapshot）+ scope / 指令；`repo-tooling.md` PWA gate 註（plugin 只改 precache 內容）
- coming-soon / drama / repo-tooling REVERIFY 只係 `bundledSource.ts`、version、lockfile、`vite.config.ts`（plugin 掛載）

## Runs

| Command                                                                                                                                                                                                                | Result                                                                      | Time   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------ |
| CI run 42776468972 @ `0fae3e7`（引用，冇重跑）：Detect / Lint, `tsc -b`, unit & build / E2E                                                                                                                            | 全 success：unit 270 files / 3166、e2e 779 PASS / 0 FAIL（PWA 換版 7 個綠） | 16 min |
| `npm test -- apps/api packages/catalog/src/schedule packages/catalog/src/document apps/player/scripts/catalogSnapshot apps/player/scripts/buildCatalogJson apps/player/src/catalog apps/player/scripts/catalogCaching` | 420 pass                                                                    | 20 s   |
| Coverage v8：`catalogSnapshot.ts` + `snapshot/source.ts` + `{dramas,shows}/lib/*`；`localize.ts`                                                                                                                       | lines 98.6% / branch 83.3%；`localize.ts` 100%                              | 15 s   |
| 本機 Worker：scratchpad config（只 0001 + 0002）apply → 插 2 行舊 `publishes` → 真 config apply 0003 → `importLibrary --local` → `wrangler dev --local-protocol https` + D1 測試 session + curl                        | 見下（api AC-13）                                                           | 6 min  |
| Snapshot build × 4（本機 Worker URL ×2、唔通 URL、`--mode e2e` + URL）+ production 冇 URL；vite preview + Playwright 擋 runtime `catalog.json`                                                                         | 見下（catalog-data AC-5）                                                   | 6 min  |

- api AC-13 migration：0003 喺 0001 + 0002 之上 apply ✅，兩行舊 publish `status = ok`；`UPDATE … status='bogus'` → `CHECK constraint failed`
- api AC-13 上載（Pillow 砌圖）：`image/png` 415；1 MB + 10 bytes 413（chunked 冇 Content-Length 都 413）；假 chunk `XXXX` 422；1216×608 422（列明 `600×600, 1216×684`）；600×600 VP8 201 `e70f5b60f1d091a6.webp`（= `sha256sum` 前 16 hex）；再上載（`image/WebP; charset=x`）200 `existed`；1216×684 VP8L 201；600×600 VP8X（alpha）201；冇 session 401、外站 Origin 403；`GET /catalog/v1/img/<name>` 200 `image/webp`、bytes 同原檔一樣；`assets` 行 bytes 啱
- Admin 流程：`PUT /api/entries/dramas/{c18,lancy}` 指去新圖 200 → publish #3 / #5 ✅
- S-786：插一行 `failed`（#4，`episode_ids []`）→ publish 回 `unchanged`（對 #3）、冇 409；`/api/publishes` #4 `failed` / `current: false`、#3 `current: true`；之後 publish 開 #5。S-787：scan、schedule GET / PUT / DELETE drama id 唔合規 400；合規但冇 404；`GET /api/entries/dramas/BAD!` 400
- catalog-data AC-5：log `[catalog-snapshot] hash 2a585da9… · 58 images` = publish #3 hash = Worker `ETag`；第二次 `b632cf32…` = publish #5；`data/img` 58 張全部 sha256 前 16 = 檔名，全部喺 `dist`（按內容比）兼喺 `sw.js` precache；preview 擋 `https://localhost:8787/**` → 廣播劇書架攞 snapshot 新 tile `b31142c3db90801e-*.webp`（library 冇呢張）
- Fallback：`https://localhost:9/…` → `warn … using the repo library TypeError: fetch failed`、exit 0、上次 snapshot `data/` 已清、`dist` 冇 snapshot 圖；`--mode e2e` + URL → 冇 snapshot log、Worker `catalog.json` hit 數不變；production 冇 URL → 冇 fetch、`sw.js` 冇 NetworkFirst / CacheFirst、`dist` 冇 `localhost` / e2e catalog 字串（同 1.31.x 一樣行 library）
- Freeze：`freeze <chain> S1` × 5（api 70、catalog-data 130、coming-soon 162、drama 163、repo-tooling 22 檔）；之後 `impact` 淨係 REVERIFY catalog-data = 舊 S3 行（2026-11-04 baseline，留俾 S3），S1 冇 STALE
- PWA：build 版本 `1.32.0`，preview 主頁橫額顯示 `v1.32.0`；換版 vN→vN+1 由 CI e2e「PWA 換版」7 個 section 證
- 清理：停 `wrangler dev` / preview；刪 `.dev.vars`、`src/catalog/snapshot/data*`、`apps/player/coverage/`；原本 `apps/api/.wrangler/`、`.import/import.sql`、`apps/player/dist/` 還原（QA 用 scratchpad 備份）

## Hard Gates

all pass（Tests：CI 全 unit + 全 e2e 綠 + 本地目標 unit；Coverage：snapshot / localize ≥ 80%，Worker 上載路徑由 9 個 test case + 本機 curl 覆蓋；PWA：precache 內容改變已核實、換版 e2e 綠；Security：415 / 413 / 422 / 401 / 403 本機核實；Performance：冇新 hot path（S-789 / S-790 已喺 backlog））

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- Observation：schedule 嘅 `arcId` 唔合規（例如 `BAD!`）回 404 `no such arc`，唔係 400；S-787 / plan 只講 drama id，唔違反 L1，唔開 backlog
- 有 snapshot 時 precache 由 81 → 82：舊 library tile 同新 snapshot tile 兩份都入 = S-789（已喺 backlog）

## 建議補測

- none（plan「驗證」列嘅 unit case 全部有；本機再核實 status matrix、migration、fallback）

```handoff-receipt
status: pass
stage: S1
chain: api, catalog-data, coming-soon, drama, repo-tooling
commit: 0fae3e7
next_action: main_agent_push_docs_then_merge
context: "Phase 2b-2 S1 pass @0fae3e7; CI 42776468972 cited (unit 3166, e2e 779/0); local wrangler: upload 415/413/422/422/201/200, migration 0003 on 0001+0002 rows=ok, S-786/S-787 ok; snapshot build hash == publish hash, 58 imgs in dist + sw precache, fallback/e2e/no-URL ok; v1.32.0; 5 chains S1 frozen; QA commit local only (not pushed)"
```
