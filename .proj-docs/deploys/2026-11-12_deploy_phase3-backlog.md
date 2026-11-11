# 部署記錄 — Phase 3 backlog 清理（api v0.6.2；player v1.33.0 不變）

**日期**：2026-11-11 19:33 (UTC)（香港時間 2026-11-12 03:33）
**環境**：Production（Cloudflare Worker `903-player-api` + GitHub Pages + Vercel）
**版本**：`a2b2c0a3d5b1648f3a8aea0ed9a89f4018687333`（PR #204 merge commit；`apps/api` 0.6.1 → 0.6.2；`apps/player` 1.33.0 冇改）
**部署員**：DevOps Agent
**結論**：✅ pass — `Deploy API` success，新 Worker version `2914a14a-181f-43ee-82f0-4b9ee3fd12f4`；新 `deploy-api.yml` 次序（test → build admin → check `dist/index.html` → D1 migration → deploy）喺 production 跑通；冇 D1 migration；live curl smoke（未登入部份）全部過，包括 W-713 / S-774 frame header 同 S-809 `next` 驗證；6 項登入後先見到嘅改動要用戶手動檢查（S-803、S-799 會改 production D1 資料，下面標明）

## 部署步驟

- [x] Lint & Type Check — ✅ CI run [43085009901](https://github.com/dcwhung/903-player/actions/runs/43085009901) @ `323e0e7`（PR 最後一個 code commit）：lint、`tsc -b` success；PR head `824bc55`（淨 docs）CI run [43087955216](https://github.com/dcwhung/903-player/actions/runs/43087955216) success。`Deploy` run [43088016431](https://github.com/dcwhung/903-player/actions/runs/43088016431) `Lint & test` 再跑全 repo lint：「All matched files use Prettier code style!」
- [x] Unit Tests — ✅ CI 43085009901 unit 334 files / 3561 tests 全綠；`Deploy API` 喺 workerd 再跑 api test：12 files / 189 tests + scripts 1 file / 12 tests passed
- [x] Integration / E2E — ✅ CI 43085009901 `npm run e2e` + `npm run e2e:admin`（ubuntu-24.04）794 PASS / 0 FAIL。QA S1 pass（[qa/2026-11-12_qa_phase3-backlog.md](../qa/2026-11-12_qa_phase3-backlog.md)）；Review 95 pass，W-713 已 resolve（[reviews/2026-11-12_review_phase3-backlog.md](../reviews/2026-11-12_review_phase3-backlog.md)）
- [x] Security Scan — ⚠️ pipeline 冇獨立 security scan stage（現有狀況，唔係今次引入）；今次冇新依賴
- [x] Build admin SPA（S-808：喺 migration 之前）— ✅ `npm run build -w apps/admin`（2274 modules）：`index.html` 1.95 kB、`index-dItzP52D.js` 430.07 kB（gzip 137.64）、`index-D5YU4mvd.css` 39.44 kB（gzip 8.77）、`encode-BGvyLREx.js` 1.18 kB；`webp_enc*` JS / wasm hash 同 0.6.1 一樣
- [x] Check admin build（S-826：喺 migration 之前）— ✅ `test -f ../admin/dist/index.html` 過（19:32:50Z）
- [x] D1 migration — ✅ `Deploy API` run [43088016349](https://github.com/dcwhung/903-player/actions/runs/43088016349)：`wrangler d1 migrations apply 903-player --remote` →「✅ No migrations to apply!」（同預期一樣）
- [x] Deploy（Worker）— ✅ `wrangler deploy`（wrangler 4.158.0）：「Read 11 files」（多咗 `_headers`，wrangler 當設定檔讀，唔當 asset 上載）、「Found 4 new or modified static assets」（`index.html`、`index-dItzP52D.js`、`index-D5YU4mvd.css`、`encode-BGvyLREx.js`）→ Uploaded 4 files（5 already uploaded）；Worker Total Upload 257.95 KiB / gzip 66.35 KiB；Startup 5 ms；**Current Version ID `2914a14a-181f-43ee-82f0-4b9ee3fd12f4`**（上一個 `8e3a0a3c-41be-455e-ab63-43d3771fd585`，api 0.6.1）；bindings 同上次一樣（`DB`、`CATALOG`、`AUDIO` + 4 個 env var）；19:33:00Z 完成
- [x] Deploy（GitHub Pages）— ✅ `Deploy` run [43088016431](https://github.com/dcwhung/903-player/actions/runs/43088016431)：`Lint & test` 334 / 334 test files、3561 tests passed；`build`（19:36:16Z）+ `deploy`（19:36:33Z）success
- [x] Deploy（Vercel）— ✅ commit status `Vercel` = `success`「Deployment has completed」，2026-11-11T19:33:09Z
- [x] Smoke Test（live）— ✅ 見下表

## Player / Pages deploy 有冇觸發

- `deploy.yml` 冇 `paths` filter，每次 push main 都跑 → 今次照跑，**屬預期**；Vercel 亦係每個 main commit 都 build
- Player 內容同 v1.33.0 一樣：build 出 `index-DqKCCMKf.js` 509.30 kB、precache 80 entries / 4264.93 KiB（同 3c / 3c prod fixes deploy 一模一樣）→ 用戶唔會見到新 SW 更新

## Production Smoke Test

2026-11-11 19:33Z 起，sandbox `curl`（冇登入）。Base：`https://903-player-api.dcwhung.workers.dev`

| 檢查                                                                                   | 預期                                                                        | 結果                                                                                                                                                                              |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/health`                                                                          | 200，`version` `0.6.2`                                                      | ✅ 200 `{"ok":true,"version":"0.6.2"}`（19:33:07Z 起；19:32:21Z deploy 前仲係 `0.6.1`）                                                                                           |
| W-713：`curl -sI` `/`、`/dramas`、`/dramas/x/schedule`（SPA fallback）、`/banner.webp` | `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'` | ✅ 4 條 path 都係 200 而且兩個 header 齊；`/assets/index-dItzP52D.js` 都有                                                                                                        |
| S-774：`curl -sI` `/api/me`、`/auth/google/start`（另加 `/api/health`）                | 同上兩個 header                                                             | ✅ 401 / 302 / 200，兩個 header 齊                                                                                                                                                |
| `/_headers` 唔可以原檔出                                                               | 落 SPA fallback                                                             | ✅ 200 `text/html`，md5 同 `/` 一樣（`e5ec59ed…`）                                                                                                                                |
| `/`、`/dramas/x/schedule`                                                              | admin `index.html`，asset hash 同 build                                     | ✅ 200 `text/html`，`<title>903 Player Admin</title>`，引用 `/assets/index-dItzP52D.js` + `/assets/index-D5YU4mvd.css`（同 build log）；bundle 有 `0.6.2`、有「此短篇已有排程」   |
| S-809：`/auth/google/start?next=/dramas`                                               | 302 去 Google，`__Host-oauth` cookie 帶 `next`                              | ✅ 302 `accounts.google.com/o/oauth2/v2/auth`（`code_challenge_method=S256`）；`__Host-oauth`（`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`）payload 有 `next="/dramas"` |
| S-809：`?next=//evil.com`                                                              | 一樣 302，cookie 冇 `next`                                                  | ✅ 302 去 Google；payload key 只有 `expiresAt` / `state` / `verifier`，冇 `next`；cookie 長度 200（有 `next=/dramas` 時 223）                                                     |
| S-809 其他：`https://evil.com`、`/\evil.com`、`/auth/me`、冇 `next`                    | 冇 `next`                                                                   | ✅ 全部冇 `next`（cookie 長度都係 200）；`/dramas/x/schedule#arc` → `next="/dramas/x/schedule#arc"`                                                                               |
| `/api/me`（未登入）                                                                    | 401                                                                         | ✅ 401 `{"error":"not logged in"}`                                                                                                                                                |
| `/catalog/v1/catalog.json`（`Origin` Vercel）                                          | 200 JSON，CORS 照舊                                                         | ✅ 200 18126 B，`access-control-allow-origin: https://903-player.vercel.app`，`cache-control: public, max-age=60`                                                                 |
| catalog etag                                                                           | 同 deploy 前一樣（今次冇 publish）                                          | ✅ `a3add2a53873c2a8…`，deploy 前（19:32:21Z）同 deploy 後一樣（= v1.33.0 snapshot hash）                                                                                         |
| `/catalog/v1/img/94ece809fdf0746c.webp`                                                | 200 `image/webp`                                                            | ✅ 200 `image/webp`                                                                                                                                                               |
| `/catalog/catalog.json`（Worker 先行）                                                 | Worker 404（唔落 SPA fallback）                                             | ✅ 404                                                                                                                                                                            |
| 登入後嘅改動（見下面用戶手動步驟）                                                     | 見各步                                                                      | 用戶手動（要 Google session）                                                                                                                                                     |

S-809 cookie 檢查方法：cookie 值係 `<base64url(JSON)>.<HMAC>`，只 decode 前半睇 key 有冇 `next`；冇記錄 `state` / `verifier` 值。

## 改動摘要

- 22 個 backlog ID（19 項 + S-826 關；S-825 / S-827 新開）：
    - Auth / 安全：S-809 login 帶 `?next=` 返深連結（server `safeNext` 驗兩次 + 簽入 OAuth state）；S-774 `/auth/*`、`/api/*` 拒絕被 frame；W-713 admin SPA static assets 用 `_headers` 拒絕被 frame
    - 排程 / entries：S-803 `PUT …/schedule` 收 `enable: true`，同一個 D1 batch 轉上架；S-804 有排程嘅短篇改 ID → 409 `arcScheduled`，admin 顯示「此短篇已有排程，請先移除排程再修改 ID。」
    - 掃描：S-800 劇集資料夾唔見咗只擋似改名嘅新資料夾；S-801 同一個資料夾冇 diff 重新配對回 200 `unchanged`；S-802 唔重覆插入相同 open finding；S-785 CLI 字眼抽返單一來源
    - 發佈：S-797 / S-813 / S-814 還原去失敗嘅 publish 回 409、purge 失敗只 log；S-795 WebP 檢查 extended chunk；S-799 排序寫入 `CAST(? AS INTEGER)` + `updated_at` MAX
    - Admin UI：S-811 新增劇 dialog Tab 循環 / Esc / 關閉後 focus 返 ＋；「新」pill 跟 player NewBadge（紅底白字）；S-806 / S-812 motion / 顏色 token；S-815 / S-821 / S-822 / S-824 細項
    - CI：S-808 / S-826 `deploy-api.yml` 先 build admin、檢查 `dist/index.html`，先至跑 D1 migration
- `apps/api` 0.6.2；D1 冇改 schema；冇新依賴

## 指標監察

- Project 冇接 Sentry / Datadog；sandbox 只可以 curl workers.dev
- Deploy 後 19:34:05Z–19:39:32Z（約 5.5 分鐘）每 20 秒打 `/api/health`、`/`、`/catalog/v1/catalog.json`：54 個 request 全部 200，冇 5xx；平均 0.38 s、最慢 0.79 s（經 sandbox proxy）
- Cloudflare dashboard → Workers → `903-player-api` → Metrics / Logs：留意 `/api/*`、`/auth/*` 冇新 5xx

## 用戶手動驗證步驟

1. 開 `https://903-player-api.dcwhung.workers.dev/`，用 Google 登入 → pill 顯示「Admin v0.6.2」

**唔改 production 資料**

2. **S-809 深連結返原頁**：開一個深連結（例如某套劇嘅排程頁 `/dramas/<id>/schedule`）→ 登出 → 喺登入畫面撳登入 → Google 登入完應該返返嗰個深連結，唔係 `/`
3. **S-811 新增劇 dialog 焦點**：劇集列表撳「＋」→ 焦點喺 dialog 入面；一路撳 Tab / Shift+Tab 只會喺 dialog 入面循環；撳 Esc 關 → 焦點返去「＋」掣（淨開關，唔好建立）
4. **「新」紅色 pill**：列表 / 編輯器有「新」嘅項目 → pill 係紅底白字（同 player 嘅 NewBadge 一樣），淺色 / 深色都睇
5. **S-804 有排程嘅短篇改 ID**：開一個已有排程嘅短篇（冇嘅話用第 6 步嗰個），改佢嘅 ID → 撳儲存 → 出「此短篇已有排程，請先移除排程再修改 ID。」，server 回 409、乜都冇寫；之後撳「復原」

**⚠️ 會改 production D1 資料**

6. **S-803 排期新短篇自動轉上架**（會寫 D1：排程 + 該短篇轉上架）：揀一個未上架嘅新短篇，加排程 → 儲存 → 短篇應該即刻變成已上架（一個 request 搞掂，唔會出現有排程但未上架）。**唔好撳發佈**，否則 player 會見到；驗完可以刪排程再下架還原
7. **S-799 真 D1 拖曳排序**（會寫 D1：`order` 同 `updated_at`）：
    - 先喺已登入嘅瀏覽器開 `…/api/entries/dramas/<id>`，記低 `ETag`（DevTools → Network → Response Headers）同 `order`
    - 喺列表拖一個項目換位 → 再開同一條 URL：`order` 應該係整數（`2` 唔係 `2.0`），`ETag` 有向前行（同之前唔同）
    - 拖返原位還原排序；**唔好撳發佈**
    - 過咗就可以關 S-799（順便睇下有冇 `.0`，關乎 S-827）

另外：GitHub Pages / Vercel 嘅 player 應該仍然係 `v1.33.0`。

## 回滾方案

**Worker（admin SPA + api）**

- 喺 `apps/api`：`npx wrangler rollback 8e3a0a3c-41be-455e-ab63-43d3771fd585`（Phase 3c prod fixes / api 0.6.1）
- Workers static assets 跟 version 走：回滾後 workers.dev 出返 **0.6.1 嘅 admin UI**（冇 `_headers` → admin 頁冇 frame header；login 唔帶 `?next=`），`/api/health` 回 `0.6.1`
- 冇 D1 migration，回滾唔使碰 D1。注意：0.6.1 唔識 `PUT …/schedule` 嘅 `enable: true`（會當冇），但 0.6.1 admin 本身會分兩個 request，前後端一齊回滾冇問題；S-803 / S-799 期間寫咗嘅資料照留，兩個版本都讀得
- 回滾只係 Cloudflare 上面嘅狀態；main 之後再 push 改 `apps/api/**` / `apps/admin/**` / `packages/catalog/**` / `package-lock.json` / `deploy-api.yml` 會再 deploy 0.6.2 系列。要長期回滾就 `git revert -m 1 a2b2c0a3d5b1648f3a8aea0ed9a89f4018687333` 開 PR merge 入 main
- 回滾後確認：`curl …/api/health` → `0.6.1`；root `index.html` 引用 `index-ClaSYBn-.js`

**Player（GitHub Pages + Vercel）**

- 今次 player 內容冇變，唔使回滾；真係要就用 Vercel dashboard → Deployments → Instant Rollback

## 備注

- 新 `deploy-api.yml` 次序第一次喺 production 跑：Build admin（19:32:44Z）→ Check admin build（19:32:50Z）→ Apply D1（19:32:52Z）→ Deploy（19:33:00Z），全部 success
- `ubuntu-latest` 照舊用喺 `deploy-api.yml` / `deploy.yml`；`ci.yml` E2E job 仲係 pin `ubuntu-24.04`
- wrangler 提示有新版 4.160.1（現用 4.158.0），唔影響今次 deploy
- Sandbox 連唔到 `dcwhung.github.io` / `903-player.vercel.app`（allowlist 冇），player 狀態以 workflow / commit status 為準
- 未關：S-825（`safeNext` dot-segment）、S-827（`order: 2.0`）照 backlog；S-799 等用戶第 7 步結果
- 冇讀取或者輸出任何 secret；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 喺 log 入面已 mask；smoke 記錄冇存 OAuth `state` / `verifier` / `code_challenge`
