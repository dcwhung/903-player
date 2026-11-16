# 部署記錄 — 未上架狀態 + 短篇記憶（api v0.7.1；player v1.33.0 不變）

**日期**：2026-11-12 11:59 (UTC)（香港時間 2026-11-12 19:59）
**環境**：Production（Cloudflare Worker `903-player-api` + GitHub Pages + Vercel）
**版本**：`450e5d4a3e5cb8d23f9dc597409da2d8bea91e7f`（PR #209 merge commit；`apps/api` 0.7.0 → 0.7.1；`apps/player` 1.33.0 冇改）
**部署員**：DevOps Agent
**結論**：✅ pass — `Deploy API` success，新 Worker version `20cec1bb-4e66-4b58-9f0c-e56043d2554f`；冇 D1 migration；live curl smoke（未登入部份）全部過，admin asset hash 同 build log 一致，bundle 有 0.7.1、「待處理」、「未上架」，frame header 照舊；登入後嘅畫面列入用戶手動驗證（全部淨睇，唔寫 D1）

## 部署步驟

- [x] Lint & Type Check — ✅ CI run [43211104605](https://github.com/dcwhung/903-player/actions/runs/43211104605) @ `e212680`（PR 最後一個 code commit）：lint、`tsc -b` success；之後 `8f5cd60` / `01387ba` 淨改 docs
- [x] Unit Tests — ✅ CI 43211104605 unit 綠（QA 本機 `npm test` 353 files / 3784 pass）；`Deploy API` 喺 workerd 再跑 api test：13 files / 212 tests + scripts 1 file / 12 tests passed（11:59:14Z–11:59:22Z）
- [x] Integration / E2E — ✅ CI 43211104605：player e2e + `e2e:admin` success（QA 本機 admin e2e 39 PASS / 0 FAIL）。QA S1 pass（[qa/2026-11-12_qa_unlisted-status-0.7.1.md](../qa/2026-11-12_qa_unlisted-status-0.7.1.md)）；Review 90 pass，W-716 / W-717 merge 前已修（[reviews/2026-11-12_review_unlisted-status-0.7.1.md](../reviews/2026-11-12_review_unlisted-status-0.7.1.md)）
- [x] Security Scan — ⚠️ pipeline 冇獨立 security scan stage（現有狀況，唔係今次引入）；今次冇新依賴（`package-lock.json` 淨改 api version）
- [x] Build admin SPA — ✅ `npm run build -w apps/admin`（2290 modules）：`index.html` 2.04 kB、`index-BAUZ-jIq.js` 465.55 kB（gzip 149.13）、`index-BdpxawG9.css` 50.90 kB（gzip 10.80）、`encode-oXYzjscf.js` 1.18 kB；`webp_enc*` JS / wasm hash 同 0.7.0 一樣
- [x] Check admin build — ✅ `test -f ../admin/dist/index.html` 過（11:59:26Z）
- [x] D1 migration — ✅ `Deploy API` run [43213746012](https://github.com/dcwhung/903-player/actions/runs/43213746012)：`wrangler d1 migrations apply 903-player --remote` →「✅ No migrations to apply!」（同預期一樣；`published` / `publishedArcs` 由最新 ok publish 計，唔使改 schema）
- [x] Deploy（Worker）— ✅ `wrangler deploy`（wrangler 4.158.0）：「Read 12 files」、「Found 4 new or modified static assets」（`index.html`、`index-BAUZ-jIq.js`、`index-BdpxawG9.css`、`encode-oXYzjscf.js`）→ Uploaded 4 files（6 already uploaded）；Worker Total Upload 267.71 KiB / gzip 68.67 KiB；Startup 4 ms；**Current Version ID `20cec1bb-4e66-4b58-9f0c-e56043d2554f`**（上一個 `f6f7ab11-0778-4018-90b8-a9a21c635b94`，見備注）；bindings 同上次一樣（`DB`、`CATALOG`、`AUDIO` + 4 個 env var）；11:59:34Z 完成
- [x] Deploy（GitHub Pages）— ✅ `Deploy` run [43213746231](https://github.com/dcwhung/903-player/actions/runs/43213746231)：`build`（12:01:51Z）+ `deploy`（12:02:05Z）success
- [x] Deploy（Vercel）— ✅ commit status `Vercel` = `success`「Deployment has completed」，12:00:22Z
- [x] Smoke Test（live）— ✅ 見下表

## Player / Pages deploy 有冇觸發

- `deploy.yml` 冇 `paths` filter，每次 push main 都跑 → 今次照跑，**屬預期**；Vercel 亦係每個 main commit 都 build
- Player code 同 v1.33.0 一樣（PR #209 冇改 `apps/player/**`）→ 用戶唔會見到新 SW 更新

## Production Smoke Test

2026-11-12 11:59Z 起，sandbox `curl`（冇登入，冇送任何寫入 request）。Base：`https://903-player-api.dcwhung.workers.dev`

| 檢查                                                                                       | 預期                                                                        | 結果                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/health`                                                                              | 200，`version` `0.7.1`                                                      | ✅ 200 `{"ok":true,"version":"0.7.1"}`（11:59:34Z 起；11:59:24Z deploy 前仲係 `0.7.0`）                                                                                                                 |
| `/`                                                                                        | admin `index.html`，asset hash 同 build                                     | ✅ 200 `text/html`，`<title>903 Player Admin</title>`，引用 `/assets/index-BAUZ-jIq.js` + `/assets/index-BdpxawG9.css`（同 build log；deploy 前係 `index-CH2sdtHw.js` / `index-CYb7juJR.css`）          |
| `/` frame header                                                                           | `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'` | ✅ 兩個 header 齊                                                                                                                                                                                       |
| `curl -sI` `/dramas`、`/dramas/x/schedule`、`/icon-192.png`                                | 200 + 同上兩個 header                                                       | ✅ 全部 200 而且兩個 header 齊                                                                                                                                                                          |
| `curl -sI` `/api/me`、`/api/health`                                                        | 401 / 200 + 同上兩個 header                                                 | ✅ 401 / 200，兩個 header 齊                                                                                                                                                                            |
| `/api/me`、`/api/dramas`、`/api/entries`、`/api/entries/shows/smoke-nonexistent`（未登入） | 401                                                                         | ✅ 全部 401 `{"error":"not logged in"}`（`/api/entries` 係今次加 `published` 欄位嘅 endpoint）                                                                                                          |
| bundle 內容                                                                                | `0.7.1` + 今批新字眼                                                        | ✅ `index-BAUZ-jIq.js` 465550 B（= build 465.55 kB）：`0.7.1`（pill「Admin v0.7.1」）、「待處理」（「待處理（{count}）· 處理待辦後才可排序」）、「未上架」、「未上架 / 已下架」都有；CSS 200 `text/css` |
| `/catalog/v1/catalog.json`（`Origin` Vercel）                                              | 200 JSON，CORS 照舊，etag 唔變（今次冇 publish）                            | ✅ 200，`access-control-allow-origin: https://903-player.vercel.app`，etag `a3add2a53873c2a8…` 同 0.7.0 deploy 記錄一樣                                                                                 |
| 登入後畫面（見下面用戶手動步驟）                                                           | 見各步                                                                      | 用戶手動（要 Google session）                                                                                                                                                                           |

## 改動摘要

- 未上架狀態（api AC-19 / admin AC-18）：`GET /api/entries` 每個項目加 `published`（劇集再加 `publishedArcs`），由最新 `status = 'ok'` 嘅 publish 一條 query 計（`apps/api/src/catalog/store.ts` `publishedFacts`、`apps/api/src/content/published.ts`；S-845）；上過架嘅都算（W-716）
- Admin：下架而從未上過架 = 灰色「未上架」，上過架再下架 = 紅色「已下架」；劇集列表、短篇 tab、排程 tab、節目列表同圖例都跟；舊 API 冇欄位就照舊當「已下架」
- 列表分隔：草稿組改叫「待處理（N）· 處理待辦後才可排序」（S-847）；底部組「未上架 / 已下架（N）」
- 短篇記憶：同一套劇轉 tab 記住揀咗嘅短篇（短篇 tab 展開嗰個 ⇄ 排程 tab 揀咗嗰粒 chip），每次轉 tab 都捲去嗰行（W-717）；揀嘅時候用 replace 寫入 URL hash，重新整理保留、上一頁唔會逐粒行返轉頭、撳嗰行唔會跳（S-846）
- 刪除守衛：最新 document 讀唔到時 DELETE 拒絕（S-844）
- `apps/api` 0.7.1；D1 冇改 schema；冇新依賴

## 指標監察

- Project 冇接 Sentry / Datadog；sandbox 只可以 curl workers.dev
- Deploy 後 11:59:54Z–12:06:12Z（約 6 分鐘）每 20 秒打 `/api/health`、`/`、`/catalog/v1/catalog.json`：54 個 request 全部 200，冇 5xx；平均 0.33 s、最慢 0.44 s（經 sandbox proxy；0.7.0 deploy 時平均 0.33 s、最慢 0.60 s，冇惡化）
- Cloudflare dashboard → Workers → `903-player-api` → Metrics / Logs：留意 `GET /api/entries` 冇新 5xx、CPU 時間冇明顯上升（每個 request 多咗一條讀 publish 嘅 D1 query）

## 用戶手動驗證步驟

全部淨睇，**冇一步會寫 D1**：唔好撳「儲存」、「刪除」或者「發佈」，亦唔好拖曳排序。

1. 開 `https://903-player-api.dcwhung.workers.dev/` → Google 登入 → pill 顯示「Admin v0.7.1」
2. **劇集列表：未上架灰色 vs 已下架紅色**：開劇集列表 → 揀一套有下架短篇嘅劇 → 從未上過架嘅短篇 pill 係灰色「未上架」，上過架再下架嘅係紅色「已下架」；縮圖角點同樣灰 / 紅；圖例有「未上架」（灰）同「已下架」（紅）兩項；淺色 / 深色都睇
3. **短篇 tab：未上架灰色 vs 已下架紅色**：入同一套劇 → 「短篇」tab → 每個短篇嘅狀態 pill 同第 2 步列表一致（灰「未上架」/ 紅「已下架」）
4. **短篇記憶（短篇 ↔ 排程）**：喺「短篇」tab 展開某個短篇（URL 尾變成 `#<短篇 ID>`）→ 轉去「排程」tab → 嗰個短篇嘅 chip 已揀咗 → 喺排程揀另一粒 chip → 轉返「短篇」tab → 展開嘅係啱啱揀嗰個，畫面捲咗去嗰行；撳展開嗰下畫面唔會自己跳
5. **重新整理**：喺第 4 步之後按重新整理 → 仍然係同一個短篇展開 / 同一粒 chip 揀咗；連按兩次「上一頁」會直接返劇集列表，唔會逐粒 chip 行返轉頭
6. **「待處理」分隔（有草稿先睇到）**：如果列表有未處理嘅草稿，草稿組上面嘅分隔寫「待處理（N）· 處理待辦後才可排序」；底部組寫「未上架 / 已下架（N）」或者「已下架（N）」。冇草稿就跳過呢步，**唔好為咗驗而開草稿**

另外：GitHub Pages / Vercel 嘅 player 應該仍然係 `v1.33.0`。

## 回滾方案

**Worker（admin SPA + api）**

- 喺 `apps/api`：`npx wrangler rollback f6f7ab11-0778-4018-90b8-a9a21c635b94`（api 0.7.0，PR #208 deploy 嘅版本，即係今次 deploy 前 live 嘅版本）
- `52810f10-20d2-4e52-ba79-cdbd3435c0c9`（PR #206 deploy）同 `f6f7ab11` 內容一樣（PR #208 淨改 `apps/admin/e2e/run.mjs`，admin asset hash 都係 `index-CH2sdtHw.js` / `index-CYb7juJR.css`），兩個都可以做回滾目標
- Workers static assets 跟 version 走：回滾後 workers.dev 出返 **0.7.0 嘅 admin UI**（冇灰色「未上架」、冇短篇記憶，草稿組分隔係舊文案），`/api/health` 回 `0.7.0`
- 冇 D1 migration，回滾唔使碰 D1；0.7.1 冇改任何寫入格式，回滾冇資料兼容問題
- 回滾只係 Cloudflare 上面嘅狀態；main 之後再 push 改 `apps/api/**` / `apps/admin/**` / `packages/catalog/**` / `package-lock.json` / `deploy-api.yml` 會再 deploy 0.7.1 系列。要長期回滾就 `git revert -m 1 450e5d4a3e5cb8d23f9dc597409da2d8bea91e7f` 開 PR merge 入 main
- 回滾後確認：`curl …/api/health` → `0.7.0`；root `index.html` 引用 `index-CH2sdtHw.js` + `index-CYb7juJR.css`

**Player（GitHub Pages + Vercel）**

- 今次 player 內容冇變，唔使回滾；真係要就用 Vercel dashboard → Deployments → Instant Rollback

## 備注

- `deploy-api.yml` 次序：npm test（11:59:14Z–11:59:22Z）→ Build admin（11:59:26Z）→ Check admin build（11:59:26Z）→ Apply D1（11:59:28Z）→ Deploy（11:59:34Z），全部 success
- **回滾目標更正**：交接資料話 live 係 `52810f10-…`（0.7.0），但 PR #208（`df64fff`，改 `apps/admin/e2e/run.mjs`）merge 時 `deploy-api.yml` 嘅 `apps/admin/**` path filter 觸發咗 `Deploy API` run [43211087830](https://github.com/dcwhung/903-player/actions/runs/43211087830)，11:40:35Z 出咗 `f6f7ab11-0778-4018-90b8-a9a21c635b94`（內容同 0.7.0 一樣）。今次 deploy 前 live 係 `f6f7ab11`
- 未登入 smoke 冇送任何寫入 request（`PUT` / `POST` / `DELETE` 全部冇打）
- wrangler 提示有新版 4.160.1（現用 4.158.0），唔影響今次 deploy
- Sandbox 連唔到 `dcwhung.github.io` / `903-player.vercel.app`，player 狀態以 workflow / commit status 為準
- 登入後畫面 sandbox 冇 admin session 驗唔到；證據係 CI `e2e:admin`（未上架 / 已下架、短篇記憶、reload / Back）+ QA 截圖
- Backlog：S-848（e2e port 檢查）、S-849（`publishedFacts` 補 test）開；W-716、W-717、S-844–S-847 PR 內已修
- 冇讀取或者輸出任何 secret；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 喺 log 入面已 mask
