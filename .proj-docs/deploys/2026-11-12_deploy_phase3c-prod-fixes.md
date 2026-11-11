# 部署記錄 — Phase 3c production 修正（api v0.6.1；player v1.33.0 不變）

**日期**：2026-11-11 18:42 (UTC)（香港時間 2026-11-12 02:42）
**環境**：Production（Cloudflare Worker `903-player-api` + GitHub Pages + Vercel）
**版本**：`f0b87245e9f58dce8fcaffc6a1ad8c5e892acdff`（PR #203 merge commit；`apps/api` 0.6.0 → 0.6.1；`apps/player` 1.33.0 冇改）
**部署員**：DevOps Agent
**結論**：✅ pass — `Deploy API` success，新 Worker version `8e3a0a3c-41be-455e-ab63-43d3771fd585`；admin SPA 重新 build，上載 4 個改咗嘅 asset；冇 D1 migration；live curl smoke（未登入部份）全部過；8 項修正喺登入後先見到，要用戶手動檢查（全部唔改 production 資料）

## 部署步驟

- [x] Lint & Type Check — ✅ CI run [43076256444](https://github.com/dcwhung/903-player/actions/runs/43076256444) @ `5cb6871`（PR 最後一個 code commit 之後嘅 run）：lint、`tsc -b` success；PR head `0d2d190`（淨 docs）CI run [43080128384](https://github.com/dcwhung/903-player/actions/runs/43080128384) success。`Deploy` run [43080203554](https://github.com/dcwhung/903-player/actions/runs/43080203554) `Lint & test` 再跑全 repo lint（見下面 Pages）
- [x] Unit Tests — ✅ CI 43076256444 `npm test` 全綠；`Deploy API` 喺 workerd 再跑 api test：12 files / 161 tests + scripts 1 file / 12 tests passed
- [x] Integration / E2E — ✅ CI 43076256444 E2E job 喺 `ubuntu-24.04`（S-820 修正）跑：Install Playwright Chromium、`npm run e2e`、`npm run e2e:admin` 全 success。QA S1 pass（[qa/2026-11-12_qa_phase3c-prod-fixes.md](../qa/2026-11-12_qa_phase3c-prod-fixes.md)：`e2e:admin` 12 / 12、smoke 9 / 9）；Review 95 pass（[reviews/2026-11-12_review_phase3c-prod-fixes.md](../reviews/2026-11-12_review_phase3c-prod-fixes.md)）
- [x] Security Scan — ⚠️ pipeline 冇獨立 security scan stage（現有狀況，唔係今次引入）
- [x] D1 migration — ✅ `Deploy API` run [43080203659](https://github.com/dcwhung/903-player/actions/runs/43080203659)：`wrangler d1 migrations apply 903-player --remote` →「✅ No migrations to apply!」（同預期一樣）
- [x] Build admin SPA — ✅ `npm run build -w apps/admin`（2272 modules）：`index.html` 1.95 kB、`index-ClaSYBn-.js` 430.17 kB（gzip 137.48）、`index-BqgDfWBh.css` 39.25 kB（gzip 8.72）、`encode-DgVSVhgc.js` 1.18 kB；`webp_enc*` JS / wasm hash 同 0.6.0 一樣；JS 大小同 QA 本機 build（430.2 kB）一樣
- [x] Deploy（Worker）— ✅ `wrangler deploy`（wrangler 4.158.0）：「Read 10 files」、「Found 4 new or modified static assets」（`index.html`、`index-ClaSYBn-.js`、`index-BqgDfWBh.css`、`encode-DgVSVhgc.js`）→ Uploaded 4 files（5 already uploaded）；Worker Total Upload 250.10 KiB / gzip 64.28 KiB；Startup 5 ms；**Current Version ID `8e3a0a3c-41be-455e-ab63-43d3771fd585`**（上一個 `d4caa36a-bb0d-4465-b3c0-e71da2718d66`，api 0.6.0）；bindings 同上次一樣（`DB`、`CATALOG`、`AUDIO` + 4 個 env var）；18:42:46Z 完成
- [x] Deploy（GitHub Pages）— ✅ `Deploy` run [43080203554](https://github.com/dcwhung/903-player/actions/runs/43080203554)：`Lint & test`「All matched files use Prettier code style!」+ 328 / 328 test files、3502 tests passed；`build`（18:45:34Z）+ `deploy`（18:45:48Z）success，Pages「Reported success!」
- [x] Deploy（Vercel）— ✅ commit status `Vercel` = `success`「Deployment has completed」，2026-11-11T18:43:22Z
- [x] Smoke Test（live）— ✅ 見下表

## Player / Pages deploy 有冇觸發

- `deploy.yml` 冇 `paths` filter，每次 push main 都跑 → 今次照跑，**屬預期**；Vercel 亦係每個 main commit 都 build
- Player 內容同 v1.33.0 一樣：build 出 `index-DqKCCMKf.js` 509.30 kB、precache 80 entries / 4264.93 KiB（同 3c deploy 一模一樣）；QA 亦已證 `packages/catalog` 改動前後 player `dist` 77 檔 sha256 一樣（含 `sw.js`）→ 用戶唔會見到新 SW 更新

## Production Smoke Test

2026-11-11 18:43Z 起，sandbox `curl`（冇登入）。Base：`https://903-player-api.dcwhung.workers.dev`

| 檢查                                               | 預期                                    | 結果                                                                                                                                          |
| -------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/health`                                      | 200，`version` `0.6.1`                  | ✅ 200 `{"ok":true,"version":"0.6.1"}`（18:42:47Z 起）                                                                                        |
| `/banner.webp`                                     | 200 `image/webp`                        | ✅ 200 `image/webp` 46100 B                                                                                                                   |
| `/`                                                | admin `index.html`，asset hash 同 build | ✅ 200 `text/html` 1957 B，`<title>903 Player Admin</title>`，引用 `/assets/index-ClaSYBn-.js` + `/assets/index-BqgDfWBh.css`（同 build log） |
| `/history`、`/shows/xyz`（SPA 深連結）             | 同 `/` 一樣嘅 `index.html`              | ✅ 200，md5 同 `/` 一樣（`6e89c1b2…`）                                                                                                        |
| `/assets/index-ClaSYBn-.js`、`index-BqgDfWBh.css`  | 200，大小同 build                       | ✅ 200 `text/javascript` 430179 B；200 `text/css` 39250 B；bundle 入面 version 字串 `0.6.1`、有「已發佈的項目不可刪除」                       |
| `/api/me`、`/api/shows`（未登入）                  | 401                                     | ✅ 401 `{"error":"not logged in"}`                                                                                                            |
| `/auth/google/start`                               | 302 去 Google（PKCE S256）              | ✅ 302 `accounts.google.com/o/oauth2/v2/auth`，`redirect_uri` = workers.dev callback，`code_challenge_method=S256`                            |
| `/catalog/v1/catalog.json`（`Origin` Vercel）      | 200 JSON，CORS 照舊                     | ✅ 200 18126 B，`access-control-allow-origin: https://903-player.vercel.app`，`cache-control: public, max-age=60`                             |
| catalog etag                                       | 同 0.6.0 deploy 一樣（今次冇 publish）  | ✅ `a3add2a53873c2a8…`（= v1.33.0 snapshot hash，同 3c deploy 一樣）                                                                          |
| `/catalog/v1/img/94ece809fdf0746c.webp`            | 200 `image/webp`                        | ✅ 200 `image/webp` 40206 B                                                                                                                   |
| `/catalog/catalog.json`、`/auth/me`（Worker 先行） | Worker 404（唔落 SPA fallback）         | ✅ 404 `text/plain`                                                                                                                           |
| 8 項修正（登入後，見下面用戶手動步驟）             | 見各步                                  | 用戶手動（要 Google session）                                                                                                                 |

## 改動摘要

- Admin（`apps/admin`）8 項 production 回饋修正：
    1. Savebar：「已發佈的項目不可刪除。」紅色、刪咗下架提示；「有未儲存的變更」放喺儲存掣前
    2. 時間 roller 喺撳嗰個框下面打開（以前完結時間都喺開始框下面開）
    3. 列表圖例只顯示列表真係有嘅類別
    4. 劇集列表、短篇 tab、排程 chip 顯示短篇碟（短篇碟 → 劇碟 → 空白碟，同 player 一樣次序）
    5. 編輯器標題顯示已儲存嘅碟，冇就空白碟
    6. 鎖住嘅劇集類型顯示做實色 pill
    7. 檔名範本顯示例子（`packages/catalog` `exampleFileName`）
    8. 上下架時間線：日期、圓點同第一行置中
- `apps/api` 0.6.1（W-712），admin pill 跟住；D1 冇改 schema；冇新依賴
- CI（S-820）：`ci.yml` E2E job pin `ubuntu-24.04`

## 指標監察

- Project 冇接 Sentry / Datadog；sandbox 只可以 curl workers.dev
- Deploy 後 18:42:47Z–18:46:18Z（約 4 分鐘）重覆 `/api/health`、`/`、`/catalog/v1/catalog.json` 都係 200，冇見 5xx
- Cloudflare dashboard → Workers → `903-player-api` → Metrics / Logs：留意 `/api/*` 冇新 5xx

## 用戶手動驗證步驟

只針對今次 8 項修正；**全部唔使儲存、唔使發佈，唔會改 production 資料**（改咗欄位之後撳「復原」，唔好撳「儲存」）。

1. 開 `https://903-player-api.dcwhung.workers.dev/`，用 Google 登入 → pill 顯示「Admin v0.6.1」
2. **Savebar**：開一個已發佈嘅劇集 / 短篇 → 刪除位置顯示紅色「已發佈的項目不可刪除。」，冇「如需下架」提示；改一個欄位（唔儲存）→「● 有未儲存的變更（…）」喺儲存掣前面同一行；然後撳「復原」
3. **時間 roller**：喺排程撳「完結」時間框 → roller 喺完結框下面打開（唔係開始框下面）；撳開始框 → 喺開始框下面；唔揀值直接關
4. **列表圖例**：睇劇集 / 節目列表 → 圖例只列列表真係有嘅類別（例如冇待發佈項目就唔顯示「待發佈 / 新」）
5. **短篇細碟**：劇集列表、短篇 tab、排程 chip 每行有細碟；有短篇碟就用短篇碟，冇就用劇碟，兩樣都冇就空白碟
6. **標題碟**：開一個劇集編輯器 → 標題旁邊顯示已儲存嘅碟；冇碟嘅劇顯示空白碟
7. **類型 pill**：開一個類型已鎖住嘅劇集 → 類型顯示實色 pill（例如「短篇集」），唔係 disabled switch
8. **檔名範本**：劇集編輯器檔名範本下面顯示例子，例如「例：01 - 戀愛二分一.m4a」（模板 + 第一集）
9. **上下架時間線**：開上下架記錄 → 第一行嘅日期、綠點同內容垂直置中對齊（只睇，唔撳還原）

另外：GitHub Pages / Vercel 嘅 player 應該仍然係 `v1.33.0`。

## 回滾方案

**Worker（admin SPA + api）**

- 喺 `apps/api`：`npx wrangler rollback d4caa36a-bb0d-4465-b3c0-e71da2718d66`（Phase 3c / api 0.6.0）
- Workers static assets 跟 version 走：回滾後 workers.dev 出返 **0.6.0 嘅 admin UI**（上面 8 項修正冇咗），`/api/health` 回 `0.6.0`
- 0.6.0 同 0.6.1 API 行為一樣（今次淨係 admin UI + `packages/catalog` 一個純函數 + version bump），冇 D1 migration，回滾唔使碰 D1，亦唔影響 catalog / player
- 回滾只係 Cloudflare 上面嘅狀態；main 之後再 push 改 `apps/api/**` / `apps/admin/**` / `packages/catalog/**` / `package-lock.json` 會再 deploy 0.6.1 系列。要長期回滾就 `git revert -m 1 f0b87245e9f58dce8fcaffc6a1ad8c5e892acdff` 開 PR merge 入 main（注意會連 `ci.yml` 嘅 `ubuntu-24.04` pin 一齊 revert，S-820 會再出現，revert 時應保留 `ci.yml`）
- 回滾後確認：`curl …/api/health` → `0.6.0`；root `index.html` 引用 `index-DHoiDCg1.js`

**Player（GitHub Pages + Vercel）**

- 今次 player 內容冇變，唔使回滾；真係要就用 Vercel dashboard → Deployments → Instant Rollback

## 備注

- `deploy-api.yml` / `deploy.yml` 仍然喺 `ubuntu-latest`（26.04）跑，唔使 apt，冇受 S-820 影響；淨係 `ci.yml` E2E job pin 咗 `ubuntu-24.04`
- wrangler 提示有新版 4.160.1（現用 4.158.0），唔影響今次 deploy
- Sandbox 連唔到 `dcwhung.github.io` / `903-player.vercel.app`（allowlist 冇），player 狀態以 workflow / commit status 為準
- 冇讀取或者輸出任何 secret；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 喺 log 入面已 mask；smoke 記錄冇存 OAuth `state` / `code_challenge`
