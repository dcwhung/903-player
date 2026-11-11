# 部署記錄 — Phase 3c admin UI 樣式 + 3b 回饋（api v0.6.0；player v1.33.0 不變）

**日期**：2026-11-11 16:19 (UTC)
**環境**：Production（Cloudflare Worker `903-player-api` + GitHub Pages + Vercel）
**版本**：`ca8a617b3fd38682efd127d3ef704991d3003725`（PR #202 merge commit；`apps/api` 0.5.0 → 0.6.0；`apps/player` 1.33.0 冇改）
**部署員**：DevOps Agent
**結論**：✅ pass — Worker、Pages、Vercel 三個 deploy 都 success；admin SPA build 咗並以 Worker static assets 上載（8 檔）；冇新 D1 migration；今次 sandbox 加咗 `903-player-api.dcwhung.workers.dev` 入 allowlist，live curl smoke 全部過（未登入部份）；登入後嘅 admin 功能要用戶手動檢查

## 部署步驟

- [x] Lint & Type Check — ✅ `Deploy` run [43057004392](https://github.com/dcwhung/903-player/actions/runs/43057004392) `build` job「Lint & test」：「All matched files use Prettier code style!」
- [x] Unit Tests — ✅ 同一 step：322 / 322 test files、3488 tests passed；`Deploy API` 喺 workerd 再跑 api test：12 files / 161 tests + scripts 1 file / 12 tests passed（log 入面 `[auth] Google login failed …`、`Error: R2 down` 係 failure-path test 故意觸發嘅 stderr）
- [x] Integration / E2E — ⚠️ CI run 43034842298 @ `d6136d3`：lint、`tsc -b`、`npm test`、build、build:admin success；**E2E job 失敗**：`ubuntu-latest` 而家係 Ubuntu 26.04（resolute），`npx playwright install --with-deps` 嘅 apt「Temporary failure resolving 'archive.ubuntu.com'」，e2e 兩步 skipped（唔關 code，共 4 次）。用戶決定用 QA 本機證據 merge：`e2e:admin` 12 / 12 PASS、player `e2e` 780 PASS（QA S1 pass，見 [qa/2026-11-11_qa_phase3c-admin-style.md](../qa/2026-11-11_qa_phase3c-admin-style.md)；Review re-review pass 100，見 [reviews/2026-11-11_review_phase3c-admin-style.md](../reviews/2026-11-11_review_phase3c-admin-style.md)）。Runner 問題記入 backlog S-820
- [x] Security Scan — ⚠️ pipeline 冇獨立 security scan stage（現有狀況，唔係今次引入）
- [x] D1 migration — ✅ `Deploy API` run [43057004680](https://github.com/dcwhung/903-player/actions/runs/43057004680)：`wrangler d1 migrations apply 903-player --remote` →「✅ No migrations to apply!」（repo 仍然係 `0001`..`0004`，同預期一樣）
- [x] Build admin SPA — ✅ `npm run build -w apps/admin`（2270 modules）：`index.html` 1.95 kB、`index-DHoiDCg1.js` 428.01 kB（gzip 136.74）、`index-B2SyXWFO.css` 38.42 kB（gzip 8.53）、`encode-CmGg2yUa.js` 1.18 kB、`webp_enc-XbVNZKAM.js` / `webp_enc_simd-Djp5481M.js` 各約 20 kB、`webp_enc-BpZvKflB.wasm` 281.26 kB、`webp_enc_simd-CFvKQ_80.wasm` 345.58 kB（wasm lazy load）；大小同 QA 本機 build 一樣
- [x] Deploy（Worker）— ✅ `wrangler deploy`（wrangler 4.158.0）：「Read 10 files」、「Found 8 new or modified static assets」→ Uploaded 8 files（1 already uploaded = `banner.webp`，同 3b 一樣）；Worker Total Upload 250.10 KiB / gzip 64.27 KiB（上次 237.20 / 60.89）；Startup 6 ms；**Current Version ID `d4caa36a-bb0d-4465-b3c0-e71da2718d66`**（上一個 `b72bf0de-9551-4561-8653-9dd04d6e17ff`，api 0.5.0）；bindings 同上次一樣（`DB`、`CATALOG`、`AUDIO` + 4 個 env var）；16:19:37Z 完成
- [x] Deploy（GitHub Pages）— ✅ `build`（16:23:06Z）+ `deploy`（16:23:21Z）job success，deployment `7715415799`（env `github-pages`）
- [x] Deploy（Vercel）— ✅ commit status `Vercel` = `success`「Deployment has completed」，2026-11-11T16:20:06Z
- [x] Smoke Test（live）— ✅ 見下表

## Player / Pages deploy 有冇觸發

- `deploy.yml` 冇 `paths` filter，每次 push main 都跑 → 今次照跑，**屬預期**；Vercel 亦係每個 main commit 都 build
- 內容同 v1.33.0 一樣：`index-DqKCCMKf.js` 509.30 kB、precache 80 entries / 4264.93 KiB、catalog snapshot 58 images（同 3b deploy 一模一樣）→ 用戶唔會見到新 SW 更新
- `Lint & test` 已包括全 repo `prettier --check` 同所有 project unit test，所以 Pages deploy 亦當咗 main 嘅全 repo gate

## Production Smoke Test

2026-11-11 16:21Z 起，sandbox `curl`（冇登入）。Base：`https://903-player-api.dcwhung.workers.dev`

| 檢查                                               | 預期                            | 結果                                                                                                                        |
| -------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/api/health`                                      | 200，`version` `0.6.0`          | ✅ 200 `{"ok":true,"version":"0.6.0"}`                                                                                      |
| `/banner.webp`                                     | 200 `image/webp`                | ✅ 200 `image/webp` 46100 B                                                                                                 |
| `/`                                                | admin `index.html`              | ✅ 200 `text/html` 1957 B，`<title>903 Player Admin</title>`、`admin.theme` script、`/assets/index-DHoiDCg1.js`（同 build） |
| `/history`、`/shows/xyz`（SPA 深連結）             | 同 `/` 一樣嘅 `index.html`      | ✅ 200，md5 同 `/` 一樣（`7da3112d…`）                                                                                      |
| `/api/me`、`/api/shows`（未登入）                  | 401                             | ✅ 401 `{"error":"not logged in"}` → SPA 顯示登入頁，同 3b 行為一樣                                                         |
| `/auth/google/start`                               | 302 去 Google（PKCE S256）      | ✅ 302 `accounts.google.com/o/oauth2/v2/auth`，`redirect_uri` = workers.dev callback，`code_challenge_method=S256`          |
| `/catalog/v1/catalog.json`（`Origin` Vercel）      | 200 JSON，CORS 照舊             | ✅ 200 18126 B，`access-control-allow-origin: https://903-player.vercel.app`，`cache-control: public, max-age=60`           |
| catalog etag                                       | 同 3b 一樣（今次冇 publish）    | ✅ `a3add2a53873c2a8…`（= v1.33.0 snapshot hash）                                                                           |
| `/catalog/v1/img/94ece809fdf0746c.webp`            | 200 `image/webp`                | ✅ 200 `image/webp` 40206 B                                                                                                 |
| `/catalog/catalog.json`、`/auth/me`（Worker 先行） | Worker 404（唔落 SPA fallback） | ✅ 404 `text/plain`                                                                                                         |
| admin 登入後功能（見下面用戶手動步驟）             | 見各步                          | 用戶手動（要 Google session）                                                                                               |

## 改動摘要

- Admin 樣式系統（`apps/admin`）：淺 / 深 / 跟系統主題（first paint 前套用 `admin.theme`）、可收合 nav v4（FLIP，減少動態即切）、tooltip、列表圖例、403 頁 + 直向提示
- 圖片：接受 PNG / JPG / WebP，置中裁切再用 `@jsquash/webp`（wasm，lazy）轉 WebP，上載前預覽
- 上下架記錄：版本欄顯示 `使用中` / `失敗` pill 同還原掣；**還原改為將上架狀態寫返 D1**（之後新增嘅項目會下架），確認框講明只還原上架狀態
- 劇集：自動 arc ID `<劇ID>-NN`、`POST /api/todos/confirm-id`；W-711：改劇名會撞 arc ID 就拒絕
- `apps/api` 0.6.0；D1 冇改 schema；依賴新增 `@jsquash/webp` 1.5.0 + `wasm-feature-detect` 1.10.1

## 指標監察

- Project 冇接 Sentry / Datadog；sandbox 只可以 curl workers.dev
- Deploy 後約 5 分鐘內重覆 `/api/health`、`/`、`/catalog/v1/catalog.json` 都正常（200），冇見 5xx
- Cloudflare dashboard → Workers → `903-player-api` → Metrics / Logs：留意 `/api/*` 冇新 5xx、`/auth/google/callback` 正常 302、`/assets/*.wasm` 只喺用上載功能時先載

## 用戶手動驗證步驟

來自 [QA 報告](../qa/2026-11-11_qa_phase3c-admin-style.md)。⑥、⑦ 會真係發佈 / 還原 production catalog。

1. 開 `https://903-player-api.dcwhung.workers.dev/`，用 Google 登入 → admin 載入，pill 顯示「Admin v0.6.0」
2. 主題切換：淺 / 深 / 跟系統，reload 後保持；nav 收合掣同主題掣同一行，收合有動畫
3. 列表圖例三行（圓點 / 待發佈 / 拖曳）；撳列表一行開編輯器
4. 上載一張 PNG 或 JPG（唱片 / 橫額）→ 見裁切預覽 → 上載後縮圖換咗（WebP）
5. 新劇集 arc：自動 ID 係 `<劇ID>-NN`，確認 ID 流程正常
6. 改一個節目簡介 → 確認發佈 → 上下架記錄有新一行（版本欄有 `使用中` pill）→ player 60 秒內見到新簡介
7. 喺上下架記錄還原上一版 → 確認框有「只會還原上架狀態…」→ player 60 秒內上架狀態變返；名稱 / 簡介 / 圖片維持目前版本
8. 用唔喺 whitelist 嘅 Google 帳戶登入 → 新 403 頁，主題色跟系統 / 已揀嘅主題

另外：開 `https://dcwhung.github.io/903-player/` 同 `https://903-player.vercel.app/` 確認仍然係 `v1.33.0`。

## 回滾方案

**Worker（admin SPA + api）**

- 喺 `apps/api`：`npx wrangler rollback b72bf0de-9551-4561-8653-9dd04d6e17ff`（Phase 3b / api 0.5.0）
- Workers static assets 跟 version 走：回滾後 workers.dev 會出返 **3b 嘅 admin UI**（冇主題切換、冇 nav v4、圖片上載只收 WebP、冇裁切預覽），`/api/health` 回 `0.5.0`
- **還原會變返舊做法**：0.5.0 嘅還原只係將舊 catalog 重新發佈，**唔會將上架狀態寫返 D1**；所以回滾後喺 admin 還原，D1 草稿同已上線 catalog 可能唔夾，下次發佈會用返 D1 嘅狀態。回滾期間要還原就預咗發佈前喺 admin 手動檢查上架狀態
- `POST /api/todos/confirm-id` 會冇咗（3b UI 亦冇用）；已經用 `<劇ID>-NN` 存咗嘅 arc ID 係資料，0.5.0 照讀
- 今次冇 D1 migration，0.5.0 同 0.6.0 用同一個 schema（`0004_admin.sql`），回滾唔使碰 D1
- 回滾只係 Cloudflare 上面嘅狀態；main 之後再 push 改 `apps/api/**` / `apps/admin/**` 會再 deploy 0.6.0 系列。要長期回滾就 `git revert -m 1 ca8a617b3fd38682efd127d3ef704991d3003725` 開 PR merge 入 main
- 回滾後確認：`curl …/api/health` → `0.5.0`；root 見到 3b admin（冇主題掣）

**Player（GitHub Pages + Vercel）**

- 今次 player 內容冇變（bundle hash、precache 同 v1.33.0 一樣），唔使回滾；真係要就用 Vercel dashboard → Deployments → Instant Rollback

## 備注

- CI e2e runner 問題（Ubuntu 26.04 apt DNS）唔影響 deploy：`deploy-api.yml` 同 `deploy.yml` 都喺 `ubuntu-latest`（26.04，image `ubuntu26/20261101.186`）跑，但唔使 apt，全部 success。已開 backlog S-820（建議 e2e job pin `ubuntu-24.04` 或等 image 修正）
- 為咗做 live smoke，sandbox environment allowlist 加咗 `903-player-api.dcwhung.workers.dev`（以後 deploy 都可以直接 curl smoke）
- wrangler 提示有新版 4.160.1（現用 4.158.0），唔影響今次 deploy
- 冇讀取或者輸出任何 secret；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 喺 log 入面已 mask；smoke 記錄冇存 OAuth `state`
