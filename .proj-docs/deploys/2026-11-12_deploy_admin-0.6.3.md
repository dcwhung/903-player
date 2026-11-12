# 部署記錄 — admin 回饋修正 + login 重做（api v0.6.3；player v1.33.0 不變）

**日期**：2026-11-12 00:46 (UTC)（香港時間 2026-11-12 08:46）
**環境**：Production（Cloudflare Worker `903-player-api` + GitHub Pages + Vercel）
**版本**：`c302b12cf212c036a25887b819b9ddb80952468c`（PR #205 merge commit；`apps/api` 0.6.2 → 0.6.3；`apps/player` 1.33.0 冇改）
**部署員**：DevOps Agent
**結論**：✅ pass — `Deploy API` success，新 Worker version `934ca7a6-d9b2-4f73-9e80-cec7d0ed8f21`；冇 D1 migration；live curl smoke（未登入部份）全部過，admin asset hash 同 build log 一致，frame header、`?next=` cookie、catalog etag 照舊；W-714 要登入先打到，未登入只證到寫入 API 回 401，其餘列入用戶手動驗證（第 9 步會寫 D1，下面標明）

## 部署步驟

- [x] Lint & Type Check — ✅ CI run [43126936714](https://github.com/dcwhung/903-player/actions/runs/43126936714) @ `3745863`（PR 最後一個 code commit）：lint、`tsc -b` success；PR head `f4c8caf`（淨 docs）CI run [43129196113](https://github.com/dcwhung/903-player/actions/runs/43129196113) success。`Deploy` run [43129528586](https://github.com/dcwhung/903-player/actions/runs/43129528586) `Lint & test` 再跑全 repo lint：「All matched files use Prettier code style!」
- [x] Unit Tests — ✅ CI 43126936714 unit 綠；`Deploy` run `Lint & test` 346 files / 3637 tests passed；`Deploy API` 喺 workerd 再跑 api test：13 files / 201 tests + scripts 1 file / 12 tests passed（多咗 `disabledEntries.test.ts` 11 個，包括 W-714 / S-831）
- [x] Integration / E2E — ✅ CI 43126936714 `npm run e2e`（ubuntu-24.04 真跑）player 全過 + `npm run e2e:admin` 24 PASS / 0 FAIL。QA S1 pass + 視覺回饋 re-verify pass（[qa/2026-11-12_qa_admin-feedback-0.6.3.md](../qa/2026-11-12_qa_admin-feedback-0.6.3.md)）；Review 第一輪 95（W-714 blocking）→ re-review W-714 resolved、100 pass；視覺回饋追加 review 100 pass（[reviews/2026-11-12_review_admin-feedback-0.6.3.md](../reviews/2026-11-12_review_admin-feedback-0.6.3.md)）
- [x] Security Scan — ⚠️ pipeline 冇獨立 security scan stage（現有狀況，唔係今次引入）；今次冇新依賴（Roboto 500 只係 Google Fonts CSS request 多一個字重）
- [x] Build admin SPA — ✅ `npm run build -w apps/admin`（2276 modules）：`index.html` 2.04 kB、`index-_gj-2rnb.js` 436.19 kB（gzip 139.84）、`index-N2okGPDV.css` 43.48 kB（gzip 9.52）、`encode-DUFxKqLL.js` 1.18 kB；`webp_enc*` JS / wasm hash 同 0.6.2 一樣
- [x] Check admin build — ✅ `test -f ../admin/dist/index.html` 過（00:45:55Z）
- [x] D1 migration — ✅ `Deploy API` run [43129528597](https://github.com/dcwhung/903-player/actions/runs/43129528597)：`wrangler d1 migrations apply 903-player --remote` →「✅ No migrations to apply!」（同預期一樣）
- [x] Deploy（Worker）— ✅ `wrangler deploy`（wrangler 4.158.0）：「Read 12 files」、「Found 5 new or modified static assets」（`index.html`、`index-_gj-2rnb.js`、`index-N2okGPDV.css`、`encode-DUFxKqLL.js`、`icon-192.png`）→ Uploaded 5 files（5 already uploaded）；Worker Total Upload 258.36 KiB / gzip 66.44 KiB；Startup 14 ms；**Current Version ID `934ca7a6-d9b2-4f73-9e80-cec7d0ed8f21`**（上一個 `2914a14a-181f-43ee-82f0-4b9ee3fd12f4`，api 0.6.2）；bindings 同上次一樣（`DB`、`CATALOG`、`AUDIO` + 4 個 env var）；00:46:05Z 完成
- [x] Deploy（GitHub Pages）— ✅ `Deploy` run [43129528586](https://github.com/dcwhung/903-player/actions/runs/43129528586)：`build`（00:48:02Z）+ `deploy`（00:48:15Z）success
- [x] Deploy（Vercel）— ✅ commit status `Vercel` = `success`「Deployment has completed」，2026-11-12T00:46:18Z
- [x] Smoke Test（live）— ✅ 見下表

## Player / Pages deploy 有冇觸發

- `deploy.yml` 冇 `paths` filter，每次 push main 都跑 → 今次照跑，**屬預期**；Vercel 亦係每個 main commit 都 build
- Player 內容同 v1.33.0 一樣：build 出 `index-DqKCCMKf.js` 509.30 kB、precache 80 entries / 4264.93 KiB（同 0.6.2 deploy 一模一樣）→ 用戶唔會見到新 SW 更新

## Production Smoke Test

2026-11-12 00:45Z 起，sandbox `curl`（冇登入）。Base：`https://903-player-api.dcwhung.workers.dev`

| 檢查                                                                                                          | 預期                                                                        | 結果                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/health`                                                                                                 | 200，`version` `0.6.3`                                                      | ✅ 200 `{"ok":true,"version":"0.6.3"}`（00:46:05Z 起；00:45:10Z deploy 前仲係 `0.6.2`）                                                                                                         |
| `/`                                                                                                           | admin `index.html`，asset hash 同 build                                     | ✅ 200 `text/html`，`<title>903 Player Admin</title>`，引用 `/assets/index-_gj-2rnb.js` + `/assets/index-N2okGPDV.css`（同 build log；deploy 前係 `index-dItzP52D.js`）                         |
| bundle 內容                                                                                                   | 今批新字眼                                                                  | ✅ `index-_gj-2rnb.js` 436198 B（= build 436.19 kB）有「未上架」、「上下架批次」、「管理介面登入」、`gsi`、`icon-192`；CSS 200 `text/css`                                                       |
| `/icon-192.png`、`/banner.webp`                                                                               | 200                                                                         | ✅ 200 `image/png` / 200 `image/webp`                                                                                                                                                           |
| W-713：`curl -sI` `/`、`/dramas`、`/dramas/x/schedule`、`/icon-192.png`、`/banner.webp`                       | `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'` | ✅ 全部 200 而且兩個 header 齊                                                                                                                                                                  |
| S-774：`curl -sI` `/api/me`、`/auth/google/start`、`/api/health`                                              | 同上兩個 header                                                             | ✅ 401 / 302 / 200，兩個 header 齊                                                                                                                                                              |
| `/api/me`（未登入）                                                                                           | 401                                                                         | ✅ 401 `{"error":"not logged in"}`                                                                                                                                                              |
| S-809：`/auth/google/start?next=/dramas`                                                                      | 302 去 Google，`__Host-oauth` cookie 帶 `next`                              | ✅ 302 `accounts.google.com/o/oauth2/v2/auth`；`__Host-oauth`（`Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`）payload key `expiresAt` / `next` / `state` / `verifier`，`next="/dramas"` |
| S-809：`?next=//evil.com`                                                                                     | 一樣 302，cookie 冇 `next`                                                  | ✅ 302 去 Google；payload key 只有 `expiresAt` / `state` / `verifier`                                                                                                                           |
| `/catalog/v1/catalog.json`（`Origin` Vercel）                                                                 | 200 JSON，CORS 照舊                                                         | ✅ 200 18126 B，`access-control-allow-origin: https://903-player.vercel.app`，`cache-control: public, max-age=60`                                                                               |
| catalog etag                                                                                                  | 同 deploy 前一樣（今次冇 publish）                                          | ✅ `a3add2a53873c2a8…`，deploy 前（00:45:10Z）同 deploy 後一樣（= v1.33.0 snapshot hash，同 0.6.2 deploy 一樣）                                                                                 |
| `/catalog/v1/img/94ece809fdf0746c.webp`                                                                       | 200 `image/webp`                                                            | ✅ 200 `image/webp`                                                                                                                                                                             |
| `/catalog/catalog.json`（Worker 先行）                                                                        | Worker 404                                                                  | ✅ 404                                                                                                                                                                                          |
| W-714（未登入部份）：`PUT /api/entries/shows/smoke-nonexistent`（`enabled: false` 冇圖）、`POST /api/publish` | 未登入唔可以寫                                                              | ✅ 兩個都 401 `{"error":"not logged in"}`，冇寫入。寬鬆驗證只限從未發佈嘅下架 entry、已發佈嘅回 422 呢部份要 admin session，見手動第 9 步；workerd test 13 files 喺 deploy 前跑過               |
| 登入後嘅改動（見下面用戶手動步驟）                                                                            | 見各步                                                                      | 用戶手動（要 Google session）                                                                                                                                                                   |

S-809 cookie 檢查方法：cookie 值係 `<base64url(JSON)>.<HMAC>`，只 decode 前半睇 key 有冇 `next`；冇記錄 `state` / `verifier` 值。

## 改動摘要

- 用戶回饋 13 項 + 碟面裁切預覽圓框（AC-15）：
    - 收合 nav 用 app icon（`icon-192.png`）；Banner / 碟面說明喺圖下、裁切預覽兩格並排（碟面淨圓框）；SaveBar「復原」最左；排程揀咗 chip 實色
    - 排程：下架而冇排程嘅短篇顯示「未上架」（唔出灰 ✓）；表格名「上下架批次」
    - 狀態 toggle 冇 hover 變色；待辦資料夾格 ✓、成行撳得（格入面 link 去自己 target）；劇列表短篇名 link → `/dramas/:id/arcs#arc`
    - 422 驗證錯誤中文；新節目未有圖都存到（draft），存完 toast + 返 `/shows`
    - 日期一律日/月（第二年 = 日/月/年，香港時間）
- api 9(b) + W-714：寬鬆驗證只限「從未發佈」嘅下架 entry；已發佈 entry 轉下架而圖唔齊照舊 422（S-831 regression test）
- 視覺回饋 4 輪（AC-16）：收合 nav 完整 icon；chip 揀咗 / disabled / `.switch` hover 對比 ≥ 4.5；虛線媒體框只喺 `ImageSlot` 同上載 dialog；「刪除」+ `Trash2`、action icon、配對 `Link2`；login 全頁 banner + 毛玻璃卡 + Google 官方掣（`--gsi-*` 淺 / 深，Roboto 500）
- `apps/api` 0.6.3；D1 冇改 schema；冇新依賴

## 指標監察

- Project 冇接 Sentry / Datadog；sandbox 只可以 curl workers.dev
- Deploy 後 00:46:48Z–00:52:46Z（約 6 分鐘）每 20 秒打 `/api/health`、`/`、`/catalog/v1/catalog.json`：51 個 request 全部 200，冇 5xx；平均 0.34 s、最慢 0.51 s（經 sandbox proxy；0.6.2 deploy 時平均 0.38 s、最慢 0.79 s，冇惡化）
- Cloudflare dashboard → Workers → `903-player-api` → Metrics / Logs：留意 `/api/*`、`/auth/*` 冇新 5xx

## 用戶手動驗證步驟

1. 開 `https://903-player-api.dcwhung.workers.dev/`（唔改資料）→ 先睇第 2 步嘅 login 頁，再用 Google 登入 → pill 顯示「Admin v0.6.3」

**唔改 production 資料**

2. **Login 頁新款（深淺色）**：登入前（或者登出後）睇 login 頁 → 成頁 banner 做背景、中間毛玻璃卡（細 banner + Admin pill、標題「管理介面登入」、一句說明）、Google 官方款「Sign in with Google」藥丸掣。淺色：掣白底灰邊；深色：掣深灰底（`#131314`）淺字。系統淺 / 深都試，再喺 app 入面用主題掣揀「淺色」/「深色」之後登出睇返，login 頁跟主題設定。直向窄畫面淨出「請轉為橫向或使用電腦」
3. **排程頁：下架、冇排程嘅短篇顯示「未上架」**：開一套有下架短篇嘅劇 → 「排程」tab → 下架而冇排程嘅短篇顯示「未上架」，唔再出灰 ✓；有排程嘅照出排程日子；排法唔同時批次表標題係「上下架批次」（淨睇，唔好儲存）
4. **待辦表撳成行、資料夾 ✓**：開「待辦」→ 資料夾已配對嘅格出 ✓；撳行嘅空位 / ✓ 格 / 說明字 → 去嗰行嘅目標頁；撳格入面嘅 link（例如排期）→ 去嗰格自己嘅頁；用 Tab 到行名 link 撳 Enter 都得（淨導航，唔好儲存）
5. **劇列表撳短篇名**：開「廣播劇」列表 → 撳某套劇下面嘅短篇名 → 去 `/dramas/<id>/arcs#<短篇>`，嗰個短篇已展開；撳行背景就照舊開劇嘅基本資料；拖曳掣唔會開頁（只撳，唔好拖，拖放會即存排序）
6. **日期日/月**：開「記錄」（上下架記錄）同排程頁 → 日期全部係「日/月」（例如 `12/11`），今日顯示「今天 HH:MM」，唔係今年嘅顯示「日/月/年」；冇「月/日」次序
7. **收合 nav icon**：撳 nav 嘅收合掣 → 收合後頂部顯示完整 app icon（自己嘅圓角方形，冇額外圓框、冇裁切、陰影跟 icon 形狀），淺色 / 深色都睇；再撳展開還原（只存喺本機 localStorage，唔改 D1）
8. **上載碟面預覽淨係圓框**：開一個節目或者短篇 → 撳碟面 slot → 揀一張 PNG / JPG / WebP → 預覽 dialog「裁切後」格淨係一個圓形虛線框（冇長方形框），同「原圖」格並排、大小一樣 → **撳「取消」**，唔會上載、唔會改資料（撳確定就會上載 R2 + 寫 D1，唔好撳）

**⚠️ 會改 production D1 資料**

9. **新節目未有圖都儲存到，儲存後返列表**（會寫 D1：新增一個 draft 節目；唔撳發佈就唔會入 catalog / player 見唔到）：
    - 「節目」列表撳「＋」→ 用一個明顯係測試嘅 ID（例如 `zz-test-063`）、狀態保持「下架」、唔上載任何圖 → 儲存
    - 預期：儲存成功、出 toast、自動返 `/shows` 列表；新節目喺「未上架」區（draft），唔可以拖
    - 對照（可選，唔會寫入）：將狀態改「上架」而冇圖再儲存 → 中文錯誤「無法儲存」，乜都冇寫
    - **唔好撳發佈**。驗完入去嗰個節目撳「刪除」刪走（未發佈過嘅可以刪）
    - W-714 補充（可選，**唔建議喺 production 做**）：已發佈節目轉下架同時缺圖會回 422；呢個 workerd test 同 QA `wrangler dev` 已證，production 唔使再試

另外：GitHub Pages / Vercel 嘅 player 應該仍然係 `v1.33.0`。

## 回滾方案

**Worker（admin SPA + api）**

- 喺 `apps/api`：`npx wrangler rollback 2914a14a-181f-43ee-82f0-4b9ee3fd12f4`（Phase 3 backlog / api 0.6.2）
- Workers static assets 跟 version 走：回滾後 workers.dev 出返 **0.6.2 嘅 admin UI**（舊 login 頁、冇今批 13 項 UI 改動），`/api/health` 回 `0.6.2`
- 冇 D1 migration，回滾唔使碰 D1。注意：0.6.2 冇 9(b) 寬鬆驗證，回滾後新建而冇圖嘅下架節目要上載晒圖先儲存到；第 9 步期間寫咗嘅 draft 節目照留喺 D1，0.6.2 讀得（draft 欄 0.6.2 已有），驗完照刪就冇影響
- 回滾只係 Cloudflare 上面嘅狀態；main 之後再 push 改 `apps/api/**` / `apps/admin/**` / `packages/catalog/**` / `package-lock.json` / `deploy-api.yml` 會再 deploy 0.6.3 系列。要長期回滾就 `git revert -m 1 c302b12cf212c036a25887b819b9ddb80952468c` 開 PR merge 入 main
- 回滾後確認：`curl …/api/health` → `0.6.2`；root `index.html` 引用 `index-dItzP52D.js` + `index-D5YU4mvd.css`

**Player（GitHub Pages + Vercel）**

- 今次 player 內容冇變，唔使回滾；真係要就用 Vercel dashboard → Deployments → Instant Rollback

## 備注

- `deploy-api.yml` 次序：npm test（00:45:49Z）→ Build admin（00:45:55Z）→ Check admin build（00:45:55Z）→ Apply D1（00:45:57Z）→ Deploy（00:46:05Z），全部 success
- `icon-192.png` 今次第一次以 admin static asset 上載（收合 nav 用）
- wrangler 提示有新版 4.160.1（現用 4.158.0），唔影響今次 deploy
- Sandbox 連唔到 `dcwhung.github.io` / `903-player.vercel.app`，player 狀態以 workflow / commit status 為準
- W-714 寬鬆驗證嘅登入後行為 sandbox 冇 admin session 驗唔到；證據係 deploy 前 workerd `disabledEntries.test.ts` 11 tests + QA `wrangler dev` 10 / 10
- Backlog 照舊：S-828..S-834（review 開，唔 block）
- 冇讀取或者輸出任何 secret；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 喺 log 入面已 mask；smoke 記錄冇存 OAuth `state` / `verifier` / `code_challenge`
