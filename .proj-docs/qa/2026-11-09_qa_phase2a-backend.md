# QA — Backend Phase 2a（`apps/api` + player v1.31.0）— 2026-11-09 — S1

- Tier: T2（新 workspace + 跨模組 `packages/catalog` 簽名 + CI / deploy）| Code commit: `5190aa5`（`61c61a0` 淨 review docs）| Verdict: ✅ pass
- L1：`.proj-docs/plans/2026-11-08_plan_phase2a-backend.md`；新鏈 plan `.proj-docs/qa/plans/api.md`（AC-1..AC-8）；review `.proj-docs/reviews/2026-11-09_review_phase2a-backend.md`（100 pass + re-review pass）
- Ledger（`impact --since dce3a9d` = `git merge-base HEAD origin/main`）：SKIP 3（player-core / pwa-shell / ui-foundation）/ REVERIFY 9 / UNCOVERED 47 / IGNORED 8
- REVERIFY 9：catalog-data、repo-tooling（直接改）；bookmark、card-zoom、coming-soon、drama、home、mini-player、show-today-page 只係 1-hop 改到（`crossOrigin` attribute / `buildRegistry` 多一個參數 / test 改 call site）
- 新檔分配：`api`（新鏈）← `apps/api/**` 41 個（README 除外） + `_mockups_/admin-ops/index.html` + `.github/workflows/deploy-api.yml` + 1-hop `apps/player/scripts/buildCatalogJson.{mjs,d.mts}`；`catalog-data` ← `src/catalog/dramas/lib/episodeOptions.{ts,test.ts}`、`src/config/catalogImage.ts`、`src/catalog/catalogImageCors.node.test.ts`
- 要 main agent 跟：`.claude/CLAUDE.md` QA 表 chain 清單加 `api`（QA 冇改 CLAUDE.md）

## Runs

| Command                                                                                                  | Result                                                                                                                       | Time   |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| CI run 42579655596 @ `5190aa5`（引用，冇重跑）：Detect / Lint, `tsc -b`, unit & build / E2E              | 全 success：unit 257 files / 3027、e2e 779 PASS / 0 FAIL（Remote catalog 14 個 incl. CORS / crossorigin 2 個新、PWA 換版綠） | 15 min |
| `npm test -- apps/api`                                                                                   | 6 files / 63 pass（workerd 47 + scripts 16）                                                                                 | 9 s    |
| `npm test -- packages/catalog apps/player/src/catalog apps/player/scripts` + 6 個改咗嘅 component folder | 65 files / 947 pass（`catalogJson` 一致性、`episodeOptions`、`catalogImageCors`）                                            | 15 s   |
| Coverage v8：`apps/api/src` / `importLibrary.mjs` / `episodes.ts` + `registry.ts`                        | lines 98.9% / 95% / 100% + 98.4%（最低 `google.ts` stmts 89%）                                                               | 20 s   |
| `importLibrary.mjs --local` ×2（新 `.wrangler` state）                                                   | 13 entries / 58 圖；第 2 次「0 to upload」，`entries` 13 行連 `updated_at` 逐字一樣（AC-4）                                  | 110 s  |
| `wrangler dev --local-protocol https` + curl（D1 插測試 session）                                        | 見下（AC-2 / 3 / 5 / 6）                                                                                                     | 2 min  |
| Published `catalog.json` vs `buildCatalogDocument`（node script）                                        | schemaVersion 1；7 + 6 entries 次序同；definition 0 差；圖 key 同、hash = 檔案 SHA-256 前 16 hex（AC-7）                     | 1 s    |
| Playwright（`/opt/pw-browsers/chromium`，390×844）行 ops 頁                                              | 5 個狀態全對（AC-8，見下）；0 pageerror                                                                                      | 10 s   |

- AC-1 / AC-3：`/auth/google/start` 302 → `accounts.google.com`（`scope=openid email`、`code_challenge_method=S256`、state），`__Host-oauth` `Max-Age=600; HttpOnly; Secure; SameSite=Lax`；亂 state callback 400；`/api/me` 冇 session 401；POST 冇 Origin / 外站 Origin 403；whitelist 外 403 頁、escape email 由 `auth.test.ts` 證（要真 Google，冇本機重做）
- AC-5：改 D1 刪 c18 一集 → publish 409 `missing: ["drama:c18:2025-08-11"]` 而且 R2 ETag 冇變；`?force=1` 200（478 集）；rollback #2 200（`rollbackOf: 2`、hash 同 #2）；rollback 去 #3 409 同一個 ID；`/999`、`/abc` 404
- AC-6：Vercel / GitHub Pages origin → `Access-Control-Allow-Origin` 回該 origin + `Vary: Origin`；外站 / Vercel Preview 冇 ACAO；`max-age=60` + ETag，`If-None-Match` 304；圖 `image/webp`、`max-age=31536000, immutable`、有 ACAO；未 publish / 冇圖 / `..%2F` 404
- AC-8：未 login（Google 登入掣 `/auth/google/start`）→ 主畫面（email、7 個節目、6 套劇、479 集、history 4 行）→ 守衛拒絕（列 ID、未剔「強制 Publish」disabled，剔咗先撳得）→ 成功 notice「已 publish #5 …478 集」→ 還原卡「還原去 #4？」（取消收埋、確認 #6 479 集）→ 登出返 login、`/api/me` 401；截圖喺 scratchpad，冇 commit
- catalog-data：`appAudioBase` 注入後 `catalogJson.test.ts`（生成 vs 內建 registry 每集 ID / URL 一樣）+ 每劇 URL pin 綠；`git diff` 證 `audioBase` 只係由 `import.meta.env.BASE_URL + 'dramas/'` 搬去 `PLAYER_EPISODE_OPTIONS`，字串一樣
- repo-tooling：lockfile 舊有 package 0 個改版本（只 `apps/player` 1.30.0 → 1.31.0）、0 個刪、加 65 個（api 依賴）；`deploy.yml` 加 `VITE_CATALOG_URL` repo variable（未設 = 空 = 關）；`ci.yml` 加 `npx tsc -b`
- Smoke 完：刪咗臨時 `apps/api/.dev.vars`，還原 developer 原本嘅 `apps/api/.wrangler/`（QA state 搬去 scratchpad）
- 冇做 swapped build / PWA 矩陣（S1 規則）
- Freeze：`freeze <chain> S1` × 10（api 46 檔、catalog-data 123 檔（+4 新）、其餘 8 條沿用 ledger S1 path）；之後 `impact --since dce3a9d` 冇 REVERIFY / UNCOVERED；catalog-data 等 7 條 `status` 仍 STALE 係 S3 舊行（同 main 一樣，留俾 S3）

## Hard Gates

all pass（Tests：CI 全 unit + 全 e2e 綠 + 本地目標 unit；Coverage：改咗嘅 api / catalog 檔 ≥ 80%；PWA：n/a，`sw.js` 只改 `cacheableResponse` statuses、CI PWA 換版綠；Security：AC-1..AC-3 核實；Performance：未量（本機 workerd 唔代表 production；edge cache 效果跟 S-775 deploy 後核實））

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- S-780 🟢 冇改動再 publish 都開新 publish 行而且 hash 唔同（`generatedAt` 每次新）：publish #1 / #2 內容一樣、hash `5f35931c…` / `246b61ad…`；plan 冇要求去重（backlog）
- review S-767..S-779 已喺 backlog，唔再提

## 建議補測

- none（AC 全部有 unit；高風險守衛 / rollback 已有 `publish.test.ts`）

```handoff-receipt
status: pass
stage: S1
chain: api (new), catalog-data, repo-tooling, bookmark, card-zoom, coming-soon, drama, home, mini-player, show-today-page
commit: 5190aa5
next_action: main_agent_commit_push_then_merge
context: "Phase 2a S1 pass @5190aa5; CI 42579655596 cited (unit 3027, e2e 779/0); local wrangler smoke AC-1..AC-8 ok; 10 chains S1 frozen; add `api` to CLAUDE.md QA chain list; S-780 to backlog"
```
