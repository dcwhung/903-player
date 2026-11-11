# 部署記錄 — Phase 3b admin SPA（api v0.5.0；player v1.33.0 不變）

**日期**：2026-11-11 08:22 (UTC)
**環境**：Production（Cloudflare Worker `903-player-api` + GitHub Pages + Vercel）
**版本**：`0cfa53d4b37595277b47d637853812e3fde7ca17`（PR #201 merge commit；`apps/api` 0.4.0 → 0.5.0；`apps/player` 1.33.0 冇改）
**部署員**：DevOps Agent
**結論**：⚠️ warn — Worker、Pages、Vercel 三個 deploy 都 success；admin SPA build 咗並以 Worker static assets 上載（4 檔）；冇新 D1 migration；sandbox proxy 封鎖 production host，live smoke test 同 admin 手動檢查要用戶做

## 部署步驟

- [x] Lint & Type Check — ✅ `Deploy` run [42986270514](https://github.com/dcwhung/903-player/actions/runs/42986270514) `build` job「Lint & test」：「All matched files use Prettier code style!」
- [x] Unit Tests — ✅ 同一 step：311 / 311 test files、3428 tests passed（同 QA 一樣，包括新 `@903-player/admin` project）；`Deploy API` 喺 workerd 再跑 api test：12 files / 153 tests + scripts 1 file / 12 tests passed（上次 2 files / 16 tests，少咗嘅係已刪嘅 `scripts/opsPage.test.ts`）
- [x] Integration / E2E — ✅ CI run 42983381417 @ `620ed23`（lint、`tsc -b`、build、build:admin、e2e 780 PASS、e2e:admin 6 / 6；QA S1 pass，見 [qa/2026-11-11_qa_phase3b-admin-spa.md](../qa/2026-11-11_qa_phase3b-admin-spa.md)；Review re-review pass 100，見 [reviews/2026-11-11_review_phase3b-admin-spa.md](../reviews/2026-11-11_review_phase3b-admin-spa.md)）
- [x] Security Scan — ⚠️ pipeline 冇獨立 security scan stage（現有狀況，唔係今次引入）
- [x] D1 migration — ✅ `Deploy API` run [42986270101](https://github.com/dcwhung/903-player/actions/runs/42986270101)：`wrangler d1 migrations apply 903-player --remote` →「✅ No migrations to apply!」（repo 仍然係 `0001`..`0004`，同預期一樣）
- [x] Build admin SPA — ✅ 新 step `npm run build -w apps/admin`（`tsc -b && vite build`，vite 8.3.4，2248 modules，346 ms）：`index.html` 0.47 kB、`index-B0HhC3FS.js` 406.70 kB（gzip 129.63）、`index-C5fNscbF.css` 25.59 kB（gzip 6.02）、`banner-BWz953VB.webp` 46.10 kB；hash 同本地 `apps/admin/dist` 一模一樣
- [x] Deploy（Worker）— ✅ `wrangler deploy`（wrangler 4.158.0）：assets directory `apps/admin/dist`，「Read 5 files」、「Found 4 new or modified static assets」→ `/index.html`、`/assets/index-B0HhC3FS.js`、`/assets/index-C5fNscbF.css`、`/assets/banner-BWz953VB.webp`，Uploaded 4 files (0.92 sec)；Worker Total Upload 237.20 KiB / gzip 60.89 KiB（上次 236.38 / 60.45）；Startup 3 ms；**Current Version ID `b72bf0de-9551-4561-8653-9dd04d6e17ff`**（上一個 `5d56f77b-f898-4d75-9e8e-6ba8ec3b9119`，api 0.4.0）；bindings 同上次一樣（`DB`、`CATALOG`、`AUDIO` + 4 個 env var）
- [x] Deploy（GitHub Pages）— ✅ `build`（08:23:42Z）+ `deploy`（08:23:57Z）job success，deployment `7705290805`（env `github-pages`）
- [x] Deploy（Vercel）— ✅ commit status `Vercel` = `success`「Deployment has completed」，2026-11-11T08:22:19Z（[dashboard](https://vercel.com/dcwhungs-projects/903-player/ZzDYFLBVvYVTdkdzS4mmNMjurQno)）
- [ ] Smoke Test（live）— ⚠️ 未能驗證（proxy 403）

「Read 5 files」比上載嘅 4 個多 1 個：dist 入面只有 4 個 Vite 輸出（本地 `find apps/admin/dist -type f` = 4），多出嗰個應該係 wrangler 自己點算嘅項目，唔影響（4 個要出嘅檔都喺上載清單）。

## Player / Pages deploy 有冇觸發

- `deploy.yml` 冇 `paths` filter，每次 push main 都跑 → 今次照跑，**屬預期**；Vercel 亦係每個 main commit 都 build
- 內容同 v1.33.0 一樣：`[catalog-snapshot] hash a3add2a53873c2a80934f0d14acdedbc26d9794f4c8a728b5bef4d71b682e96d · generatedAt 2026-11-09T22:29:48.328Z · 58 images`（同上次一樣），precache 80 entries / 4264.93 KiB（同上次一模一樣），`index-DqKCCMKf.js` 509.30 kB → 用戶唔會見到新 SW 更新
- 今次 `Lint & test` 已包括 admin project 嘅 unit test 同全 repo `prettier --check`，所以 Pages deploy 亦當咗 main 嘅全 repo gate

## Production Smoke Test

| 檢查                                                    | 預期                         | 結果                                         |
| ------------------------------------------------------- | ---------------------------- | -------------------------------------------- |
| `https://903-player-api.dcwhung.workers.dev/api/health` | 200，`version` `0.5.0`       | ⚠️ `HTTP/1.1 403 Forbidden`（sandbox proxy） |
| `https://903-player-api.dcwhung.workers.dev/`           | admin SPA（未登入 → 登入頁） | ⚠️ 未驗證（同一 proxy 限制）                 |
| `https://903-player.vercel.app/`                        | v1.33.0                      | ⚠️ 未驗證                                    |
| `https://dcwhung.github.io/903-player/`                 | v1.33.0                      | ⚠️ 未驗證                                    |
| admin 功能（見下面用戶手動步驟）                        | 見各步                       | 用戶手動（要 Google session）                |

## 改動摘要

- 新 `apps/admin`（React + Vite SPA）：節目 / 劇集 / 短篇列表、自動掃描 bar、拖曳排序（`@dnd-kit`）、WebP 上載（尺寸檢查）、排期、上下架、改名、發佈（確認頁）、上下架記錄 + 還原
- `apps/api`：`wrangler.toml` `[assets] directory = "../admin/dist"`、`not_found_handling = "single-page-application"`、`run_worker_first = ["/api/*", "/auth/*", "/catalog/*"]`；舊 ops 頁（`apps/api/public/index.html`、`ops.css`、`ops.js`）退役；`deniedPage` 改 inline style
- `deploy-api.yml`：paths 加 `apps/admin/**`，`wrangler deploy` 之前加「Build admin SPA」step；`ci.yml` 加 `build:admin`、`e2e:admin`
- D1：冇改 schema

## 指標監察

- Project 冇接 Sentry / Datadog，sandbox 亦連唔到 production，錯誤率 / 延遲未能監察
- Cloudflare dashboard → Workers → `903-player-api` → Metrics / Logs：留意 `/` 同 `/assets/*` 係 asset 回應（唔計 Worker invocation）、`/api/*` 冇新 5xx、`/auth/google/callback` 正常 302

## 用戶手動驗證步驟

來自 [QA 報告](../qa/2026-11-11_qa_phase3b-admin-spa.md)「Deploy 後用戶手動」，加 health 檢查。⑤、⑥ 會真係發佈 / 還原 production catalog。

0. `curl https://903-player-api.dcwhung.workers.dev/api/health` → 200，`{"ok":true,"version":"0.5.0"}`
1. 開 `https://903-player-api.dcwhung.workers.dev/`，用 Google 登入 → admin 載入，pill 顯示「Admin v0.5.0」
2. 自動掃描 bar 顯示上次掃描時間 / 結果
3. 拖一個項目改排序 → reload → 新次序仲喺度（之後可以拖返原位）
4. 上載 600×600（唱片）同 1216×684（橫額）WebP → 縮圖即刻換
5. 改一個節目簡介 → 確認發佈 → 上下架記錄有新一行 → player（Vercel / Pages）60 秒內見到新簡介
6. 喺上下架記錄還原上一版 → player 60 秒內變返
7. 用唔喺 whitelist 嘅 Google 帳戶登入 → 見 403「冇權限」頁（inline style，樣式正常）

另外：開 `https://dcwhung.github.io/903-player/` 同 `https://903-player.vercel.app/` 確認仍然係 `v1.33.0`。

## 回滾方案

**Worker（admin SPA + api）**

- 喺 `apps/api`：`npx wrangler rollback 5d56f77b-f898-4d75-9e8e-6ba8ec3b9119`（Phase 3a / api 0.4.0）
- Workers static assets 係跟 version 走：舊 version 保留佢自己嘅 asset manifest（舊 `public/` 嗰 3 個檔：`index.html`「903 Player Ops」、`ops.css`、`ops.js`）。所以雖然 repo 已經刪咗 ops 頁，回滾之後 workers.dev root 會出返**舊 ops 頁**（Google login、publish、publish 記錄、還原照用），admin SPA 會冇咗；`/api/*`、`/auth/*`、`/catalog/*` 由 0.4.0 Worker 處理。舊 config 冇 SPA fallback，`/shows` 之類 SPA 路徑會落 Worker 回 404 — 正常。回滾後喺 root 確認見到 ops 頁
- 今次冇 D1 migration，0.4.0 同 0.5.0 用同一個 schema（`0004_admin.sql`），回滾唔使碰 D1；喺 admin 做過嘅改動（排序、圖、簡介、發佈）全部係資料，舊 Worker 照讀
- 回滾只係 Cloudflare 上面嘅狀態；main 之後再 push 改 `apps/api/**` / `apps/admin/**` 會再 deploy 0.5.0 系列。要長期回滾就 `git revert -m 1 0cfa53d4b37595277b47d637853812e3fde7ca17` 開 PR merge 入 main（會重新 deploy 出 ops 頁）

**Player（GitHub Pages + Vercel）**

- 今次 player 內容冇變（bundle hash、precache 同 v1.33.0 一樣），唔使回滾；真係要就用 Vercel dashboard → Deployments → Instant Rollback

## 備注

- Sandbox proxy 封鎖 `903-player-api.dcwhung.workers.dev`（`CONNECT tunnel failed, response 403`），只試咗一次，live smoke 同 admin 手動檢查要由用戶做
- wrangler 提示有新版 4.160.0（現用 4.158.0），唔影響今次 deploy
- Pages `build` job post step「Failed to save: Unable to reserve cache」— 同時間 Deploy API job 已經存咗同一個 npm cache key，無害
- 冇讀取或者輸出任何 secret；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 喺 log 入面已 mask
