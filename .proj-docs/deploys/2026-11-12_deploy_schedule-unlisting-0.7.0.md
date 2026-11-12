# 部署記錄 — 排程下架 schedule unlisting（api v0.7.0；player v1.33.0 不變）

**日期**：2026-11-12 10:02 (UTC)（香港時間 2026-11-12 18:02）
**環境**：Production（Cloudflare Worker `903-player-api` + GitHub Pages + Vercel）
**版本**：`0c03889d93f350a74b23513025e16cfb9bb947e9`（PR #206 merge commit；`apps/api` 0.6.3 → 0.7.0；`apps/player` 1.33.0 冇改）
**部署員**：DevOps Agent
**結論**：✅ pass — `Deploy API` success，新 Worker version `52810f10-20d2-4e52-ba79-cdbd3435c0c9`；冇 D1 migration；live curl smoke（未登入部份）全部過，admin asset hash 同 build log 一致，bundle 有 0.7.0 同今批新字眼，frame header 照舊；登入後嘅排程 UI 列入用戶手動驗證（儲存排程會寫 D1，下面標明）

## 部署步驟

- [x] Lint & Type Check — ✅ CI run [43194052694](https://github.com/dcwhung/903-player/actions/runs/43194052694) @ `168ba7a`（PR 最後一個 code commit）：lint、`tsc -b` success；之後 `339e450` / `8c3e990` 淨改 docs
- [x] Unit Tests — ✅ CI 43194052694 unit 綠（QA 本機 `npm test` 352 files / 3757 pass）；`Deploy API` 喺 workerd 再跑 api test：13 files / 207 tests + scripts 1 file / 12 tests passed（10:01:52Z–10:02:05Z）
- [x] Integration / E2E — ✅ CI 43194052694：player e2e 780 PASS「All E2E checks passed」+ `e2e:admin` 34 PASS / 0 FAIL（包括 W-715 section）。QA S1 pass（[qa/2026-11-12_qa_schedule-unlisting.md](../qa/2026-11-12_qa_schedule-unlisting.md)）；Review 95 pass，W-715 merge 前已修（[reviews/2026-11-12_review_schedule-unlisting.md](../reviews/2026-11-12_review_schedule-unlisting.md)）
- [x] Security Scan — ⚠️ pipeline 冇獨立 security scan stage（現有狀況，唔係今次引入）；今次冇新依賴（`package-lock.json` 淨改 api version）；rule 形狀 + 數值上限照驗（422 唔係 500）
- [x] Build admin SPA — ✅ `npm run build -w apps/admin`（2289 modules）：`index.html` 2.04 kB、`index-CH2sdtHw.js` 464.09 kB（gzip 148.70）、`index-CYb7juJR.css` 50.76 kB（gzip 10.77）、`encode-IgzKc9Fc.js` 1.18 kB；`webp_enc*` JS / wasm hash 同 0.6.3 一樣
- [x] Check admin build — ✅ `test -f ../admin/dist/index.html` 過（10:02:11Z）
- [x] D1 migration — ✅ `Deploy API` run [43196562718](https://github.com/dcwhung/903-player/actions/runs/43196562718)：`wrangler d1 migrations apply 903-player --remote` →「✅ No migrations to apply!」（同預期一樣；`unlist` 係 `schedules.rule` JSON 新欄位，唔使改 schema）
- [x] Deploy（Worker）— ✅ `wrangler deploy`（wrangler 4.158.0）：「Read 12 files」、「Found 4 new or modified static assets」（`index.html`、`index-CH2sdtHw.js`、`index-CYb7juJR.css`、`encode-IgzKc9Fc.js`）→ Uploaded 4 files（6 already uploaded）；Worker Total Upload 264.45 KiB / gzip 67.88 KiB；Startup 4 ms；**Current Version ID `52810f10-20d2-4e52-ba79-cdbd3435c0c9`**（上一個 `934ca7a6-d9b2-4f73-9e80-cec7d0ed8f21`，api 0.6.3）；bindings 同上次一樣（`DB`、`CATALOG`、`AUDIO` + 4 個 env var）；10:02:20Z 完成
- [x] Deploy（GitHub Pages）— ✅ `Deploy` run [43196562865](https://github.com/dcwhung/903-player/actions/runs/43196562865)：`build` + `deploy` success（10:06:07Z）
- [x] Deploy（Vercel）— ✅ commit status `Vercel` = `success`，10:03:03Z
- [x] Smoke Test（live）— ✅ 見下表

## Player / Pages deploy 有冇觸發

- `deploy.yml` 冇 `paths` filter，每次 push main 都跑 → 今次照跑，**屬預期**；Vercel 亦係每個 main commit 都 build
- Player code 同 v1.33.0 一樣（PR #206 冇改 `apps/player/**`）→ 用戶唔會見到新 SW 更新
- Pages run 結果：`build`（10:05:55Z）+ `deploy`（10:06:07Z）success；commit status `Vercel` = `success`「Deployment has completed」，10:03:03Z

## Production Smoke Test

2026-11-12 10:01Z 起，sandbox `curl`（冇登入）。Base：`https://903-player-api.dcwhung.workers.dev`

| 檢查                                                                       | 預期                                                                        | 結果                                                                                                                                                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/health`                                                              | 200，`version` `0.7.0`                                                      | ✅ 200 `{"ok":true,"version":"0.7.0"}`（10:02:21Z 起；10:01:31Z deploy 前仲係 `0.6.3`）                                                                                                           |
| `/`                                                                        | admin `index.html`，asset hash 同 build                                     | ✅ 200 `text/html`，`<title>903 Player Admin</title>`，引用 `/assets/index-CH2sdtHw.js` + `/assets/index-CYb7juJR.css`（同 build log；deploy 前係 `index-_gj-2rnb.js`）                           |
| `/` frame header                                                           | `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'` | ✅ 兩個 header 齊                                                                                                                                                                                 |
| `curl -sI` `/dramas`、`/dramas/x/schedule`、`/icon-192.png`                | 200 + 同上兩個 header                                                       | ✅ 全部 200 而且兩個 header 齊                                                                                                                                                                    |
| `curl -sI` `/api/me`、`/api/health`                                        | 401 / 200 + 同上兩個 header                                                 | ✅ 401 / 200，兩個 header 齊                                                                                                                                                                      |
| `/api/me`、`/api/dramas`、`/api/entries/shows/smoke-nonexistent`（未登入） | 401                                                                         | ✅ 全部 401；`/api/me` body `{"error":"not logged in"}`                                                                                                                                           |
| `PUT /api/dramas/smoke-x/arcs/smoke-y/schedule`、`POST /api/publish`       | 未登入唔可以寫                                                              | ✅ 兩個都 403（冇 `Origin` header → `requireSameOrigin` 喺 session 之前擋，同 `apps/api/src/api/routes.ts` 守門次序一致），冇寫入                                                                 |
| bundle 內容（版本 pill）                                                   | `0.7.0` + 今批新字眼                                                        | ✅ `index-CH2sdtHw.js` 464099 B（= build 464.09 kB）：`0.7.0`（`__API_VERSION__`，pill「Admin v0.7.0」）、「快速套用」、「上架 N 日後」、「今日」、W-715 文案「早於今日」都有；CSS 200 `text/css` |
| `/catalog/v1/catalog.json`（`Origin` Vercel）                              | 200 JSON，CORS 照舊，etag 唔變（今次冇 publish）                            | ✅ 200，`access-control-allow-origin: https://903-player.vercel.app`，etag `a3add2a53873c2a8…` deploy 前後一樣                                                                                    |
| 登入後嘅排程改動（見下面用戶手動步驟）                                     | 見各步                                                                      | 用戶手動（要 Google session）                                                                                                                                                                     |

## 改動摘要

- 排程下架（AC-17 / api AC-11）：`schedules.rule` 加 optional `unlist`（指定日全部 / 上架 N 日後 / 逢星期 X 下架 N 集）同 `unlisted`（已過下架日嘅集數照留）；舊 `removeAfterDays` 照讀當 `afterDays`；`planSchedule`
- Admin 排程 tab：上架 / 下架兩個 panel（< 900px 疊）+ 編輯｜預覽 pill tabs；下架方式做「快速套用」chips；預覽標題 + 摘要（「第 a–b 集上架 · 第 c–d 集下架」）+ 合併時間軸 + 上下架批次表
- 「今日」marker（同批次日撞就標嗰格；單一來源 `hkToday`，S-835；文案一律「今日」，S-841）
- DateField：DD/MM/YYYY + 月曆 popover（最早 = 今日、近底向上開、鍵盤）
- W-715：下架日早過今日（例如「上架 N 日後」由舊上架日計）或者唔遲過上架日 → 淨喺「儲存」彈錯、唔存
- `apps/api` 0.7.0；D1 冇改 schema；冇新依賴

## 指標監察

- Project 冇接 Sentry / Datadog；sandbox 只可以 curl workers.dev
- Deploy 後 10:03:05Z–10:09:02Z（約 6 分鐘）每 20 秒打 `/api/health`、`/`、`/catalog/v1/catalog.json`：54 個 request 全部 200，冇 5xx；平均 0.33 s、最慢 0.60 s（經 sandbox proxy；0.6.3 deploy 時平均 0.34 s、最慢 0.51 s，冇明顯惡化）
- Cloudflare dashboard → Workers → `903-player-api` → Metrics / Logs：留意 `/api/dramas/*/schedule*` 冇新 5xx

## 用戶手動驗證步驟

1. 開 `https://903-player-api.dcwhung.workers.dev/` → Google 登入 → pill 顯示「Admin v0.7.0」（唔改資料）

**唔改 production 資料（淨睇、唔好撳「儲存」）**

2. **排程 tab 版面**：開一套多短篇嘅劇 → 「排程」tab → 見到「編輯｜預覽」pill tabs；編輯入面有「上架」同「下架」兩個 panel（闊畫面並排，窄過 900px 上下疊）；「上架」panel 有「快速套用」（每日 1 集 / 每週 1 次等）；「下架」panel 嘅下架方式都係「快速套用」chips：不下架 / 指定日全部 / 上架 N 日後 / 逢星期 X 下架 N 集，撳 chip 會切換下面嘅設定，揀咗嘅 chip 實色、hover 睇得清楚（淺色 / 深色都睇）
3. **「今日」marker**：撳「預覽」→ 時間軸同上下架批次表有「今日」標記；如果今日啱啱係批次日，標記喺嗰格（顯示「日/月（今日）」）；淨睇
4. **DateField**：喺「上架開始日期」或者「下架日期」→ 輸入框格式係 DD/MM/YYYY；打開月曆 → 今日之前嘅日子灰咗揀唔到，最早可揀今日；將頁面捲到個欄近畫面底 → 月曆向上彈出（唔會切咗）；鍵盤方向鍵 / Enter / Esc 都用得
5. **預覽標題同摘要**：改咗設定之後撳「預覽」→ 頂部有標題同一行摘要，例如「第 1–5 集上架 · 第 1–3 集下架」，分隔符同時間軸一樣（`·`）；冇排程時顯示「今日起沒有排程中的上架或下架。」；淨睇，**唔好撳「儲存」**
6. **W-715 錯誤（唔會寫入）**：揀一個已經上架咗一段時間嘅短篇 → 下架揀「上架 N 日後」→ 日數設細過「今日 − 上架日」（例如上架咗 10 日就填 1）→ 撳「儲存」→ 彈錯「無法儲存：第 N 集的下架日期（日/月 星期）早於今日，請修改下架設定。」，**冇儲存**（重新入頁設定冇變）。呢個錯係儲存前喺瀏覽器擋，唔會送去 server；但如果你填嘅日數冇觸發錯誤，就會真係儲存（變咗第 7 步），所以日數一定要細

**⚠️ 會改 production D1 資料**

7. **儲存一個有下架嘅排程**（會寫 D1 `schedules` 同嗰個短篇嘅上 / 下架日子；唔撳發佈就唔會入 catalog，player 見唔到）：
    - 只用**測試用嘅劇 / 短篇**；冇嘅話就驗完即刻刪排程
    - 注意：短篇本身係「下架」嘅話，儲存排程會同時將佢轉做「上架」（頁面有提示）；揀返本身已上架嘅短篇最穩陣
    - 「下架」揀「指定日全部」，日子揀未來某日 → 儲存 → 出「已儲存」；重新開頁 → 下架設定照留，預覽有「下架」批次
    - 驗完撳排程「刪除」（`Trash2` icon，讀屏「刪除排程」）刪走排程，再確認短篇狀態同之前一樣
    - **唔好撳「發佈」**

另外：GitHub Pages / Vercel 嘅 player 應該仍然係 `v1.33.0`。

## 回滾方案

**Worker（admin SPA + api）**

- 喺 `apps/api`：`npx wrangler rollback 934ca7a6-d9b2-4f73-9e80-cec7d0ed8f21`（admin 回饋 + login 重做 / api 0.6.3）
- Workers static assets 跟 version 走：回滾後 workers.dev 出返 **0.6.3 嘅 admin UI**（舊排程 tab，冇下架 panel / DateField / 今日 marker），`/api/health` 回 `0.6.3`
- 冇 D1 migration，回滾唔使碰 D1。注意：0.6.3 嘅 rule 驗證唔識 `unlist` / `unlisted` / `from` / `listed` 欄位 —— 0.7.0 期間儲存咗嘅新格式排程，回滾後 `GET` 排程會回 `expanded: null` + error（0.6.3 會照回規則，admin 顯示錯誤，唔會 500），要喺 0.6.3 重新設定或者刪排程；短篇已寫入嘅上 / 下架日子照留，發佈唔受影響
- 回滾只係 Cloudflare 上面嘅狀態；main 之後再 push 改 `apps/api/**` / `apps/admin/**` / `packages/catalog/**` / `package-lock.json` / `deploy-api.yml` 會再 deploy 0.7.0 系列。要長期回滾就 `git revert -m 1 0c03889d93f350a74b23513025e16cfb9bb947e9` 開 PR merge 入 main
- 回滾後確認：`curl …/api/health` → `0.6.3`；root `index.html` 引用 `index-_gj-2rnb.js` + `index-N2okGPDV.css`

**Player（GitHub Pages + Vercel）**

- 今次 player 內容冇變，唔使回滾；真係要就用 Vercel dashboard → Deployments → Instant Rollback

## 備注

- `deploy-api.yml` 次序：npm test（10:01:52Z–10:02:05Z）→ Build admin（10:02:11Z）→ Check admin build（10:02:11Z）→ Apply D1（10:02:12Z）→ Deploy（10:02:20Z），全部 success
- 寫入 API 未登入回 403 而唔係上次記錄嘅 401：今次 curl 冇帶 `Origin`，`requireSameOrigin` 先擋（CSRF 守門喺 session 之前）；兩種都係冇寫入。為免對 production 送寫入 request，冇再帶 same-origin `Origin` 重試
- wrangler 提示有新版 4.160.1（現用 4.158.0），唔影響今次 deploy
- Sandbox 連唔到 `dcwhung.github.io` / `903-player.vercel.app`，player 狀態以 workflow / commit status 為準
- 登入後嘅排程 UI sandbox 冇 admin session 驗唔到；證據係 CI `e2e:admin` schedule 13 個 section（包括 W-715）+ QA 截圖
- Backlog 照舊：review S-836..S-840（S-835 / S-841 已喺今次修）同 QA 🟢（W-715 錯誤淨講第一集）
- 冇讀取或者輸出任何 secret；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 喺 log 入面已 mask
