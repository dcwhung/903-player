# 903-player-api（Backend Phase 2a / 2b / 3a / 3b / 3c / 4 / App 外觀 / 選擇發佈）

Cloudflare Worker：管理 catalog 內容（D1）、publish `catalog.json`（R2）、代出 `catalog.json` 同圖畀 player。
Plan：`.proj-docs/plans/2026-11-08_plan_phase2a-backend.md`、`.proj-docs/plans/2026-11-10_plan_phase2b-backend.md`（2b-1、2b-2）、`.proj-docs/plans/2026-11-10_plan_phase3-admin.md`（3a、3b）、`.proj-docs/plans/2026-11-12_plan_phase4-5.md`（Phase 4 L1）、`.proj-docs/plans/2026-11-13_plan_branding.md`（App 外觀）、`.proj-docs/plans/2026-11-13_plan_selective-publish.md`（選擇發佈）。版本記錄：`CHANGELOG.md`。

| 路徑                               | 用途                                                                                                                                                         | 權限                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `/`、`/shows`…（`../admin/dist`）  | Admin SPA（`apps/admin`）：掃描、待辦、編輯、確認發佈、上下架記錄                                                                                            | 公開（資料要 login）          |
| `/auth/google/start`、`/callback`  | Google login（Authorization Code + PKCE）；`start?next=<同站 path>` login 後返嗰度（S-809，唔合規 → `/`）                                                    | 公開                          |
| `POST /auth/logout`                | 登出                                                                                                                                                         | same-origin                   |
| `GET /api/health`                  | `{ ok, version }`                                                                                                                                            | 公開                          |
| `GET /api/me`                      | 而家 login 咗邊個                                                                                                                                            | session                       |
| `POST /api/publish[?force=1]`      | D1 → `catalog.json` → R2；ID 守衛（上次有、今次冇嘅 episode ID → 409）                                                                                       | session + same-origin         |
| `GET /api/publishes`               | Publish 記錄（新到舊）+ `changes`（同上一次 ok publish 比，`{ items, timeline, bannerChanged, brandingChanged }`）+ `error` + `deploy` / `deployRequestedAt` | session                       |
| `POST /api/publishes/:id/rollback` | 還原 #N 嘅上架狀態入 D1（之後新增嘅下架），再正常 publish（新一行）                                                                                          | session + same-origin         |
| 內容 API（2b-1，見下面）           | entries CRUD、R2 掃描、短篇排程（Phase 3 admin 用）                                                                                                          | session（改嘢 + same-origin） |
| Admin API（3a，見下面）            | 自動掃描、待辦、改 ID、資料夾配對、排序、變更摘要                                                                                                            | session（改嘢 + same-origin） |
| `PUT /api/assets`（2b-2，見下面）  | 上載 disc / tile / banner（WebP）、App 圖示（PNG）→ R2 + `assets`，回圖檔名                                                                                  | session + same-origin         |
| 首頁 banner / R2 原圖（4，見下面） | `GET` / `PUT` / `DELETE /api/banner`、`GET /api/dramas/:id/sources`、`GET /api/r2-source?key=`                                                               | session（改嘢 + same-origin） |
| App 外觀（見下面）                 | `GET /api/branding`、`PUT` / `DELETE /api/branding/{icon,text}`、`GET` / `POST /api/publishes/:id/deploy`                                                    | session（改嘢 + same-origin） |
| `GET /api/branding/favicon`        | 302 去已發佈嘅 App 圖示 favicon（冇 → `/favicon.png`），admin 分頁 icon 用                                                                                   | 公開                          |
| `GET /catalog/v1/catalog.json`     | Player 讀嘅 catalog（`max-age=60` + ETag）                                                                                                                   | 公開，CORS 限 player          |
| `GET /catalog/v1/img/<hash>.<ext>` | Catalog 圖（content hash，`immutable`）                                                                                                                      | 公開，CORS 限 player          |

設定喺 `wrangler.toml`（D1 `DB`、R2 `CATALOG`、R2 `AUDIO`（`903-radio-drama`，只 list）、`[vars]`）；secret（`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET`；選填 `GITHUB_DEPLOY_TOKEN`、`VERCEL_DEPLOY_HOOK_URL`，見「App 外觀」）唔入 repo。

- `[vars]`（`ADMIN_EMAILS`、`PLAYER_ORIGINS` 等）**只改 `wrangler.toml`**：每次 `wrangler deploy`（包括 merge 入 `main` 嘅自動 deploy）都會用 `wrangler.toml` 嘅 `[vars]` 蓋走 Cloudflare dashboard 改過嘅 var；dashboard 只用嚟加 Secret（S-778）

## 本機開發

本機全部用 miniflare（`.wrangler/state/`，已 gitignore），唔使 Cloudflare 帳戶。

```sh
cp apps/api/.dev.vars.example apps/api/.dev.vars   # 填 GOOGLE_CLIENT_SECRET、SESSION_SECRET
cd apps/api
npm run migrate:local          # wrangler d1 migrations apply 903-player --local
npm run import -- --local      # repo library → 本機 D1 + R2（見下面「Import」）
npm run dev                    # wrangler dev --local-protocol https → https://localhost:8787
```

- 一定要 **https**：`catalog.json` 嘅圖 URL = `WORKER_ORIGIN` + `/catalog/v1/img/…`，validator 只收 https（或者同 origin 路徑）；`.dev.vars` 嘅 `WORKER_ORIGIN=https://localhost:8787` 蓋過 `wrangler.toml`
- 自簽 cert：browser 第一次開要撳「繼續」；`curl` 加 `-k`
- 本機 Google login 要 Google Cloud OAuth client 有 redirect URI `https://localhost:8787/auth/google/callback`（setup 時加咗嘅係 `http://…`，要另外加 https 版）
- Player 對住本機 Worker：`VITE_CATALOG_URL=https://localhost:8787/catalog/v1/catalog.json npm run dev`（`.dev.vars` 嘅 `PLAYER_ORIGINS` 已包 `http://localhost:5173`）

### Admin SPA（Phase 3b）

`apps/admin`（React SPA）由同一個 Worker 嘅 static assets 出（`wrangler.toml` `[assets] directory = "../admin/dist"`，`not_found_handling = "single-page-application"`，`run_worker_first = ["/api/*", "/auth/*", "/catalog/*"]`）：

- 搵唔到檔案嘅路徑（`/dramas/lancy/schedule` 等）回 `index.html`，由 SPA router 處理；`/auth/google/callback` 成功照舊 redirect `/`
- 版本 pill 顯示呢個 package（`apps/api/package.json`）嘅 version：同一個 Worker deploy，一個版本號
- **Deploy 前一定要 build admin**：`npm run build:admin`（repo 根）；`deploy-api.yml` 喺 `wrangler deploy` 之前自動 build，`apps/admin/**` 有改都會觸發 deploy
- Worker test（`vitest.config.ts`）會開個空 `apps/admin/dist`：wrangler 要個資料夾存在，test 唔使真 SPA
- 本機：`npm run build:admin && npm run dev -w apps/api` → https://localhost:8787 直接用 admin；或者 `npm run dev:admin`（Vite，http://localhost:5173，proxy `/api` `/auth` `/catalog` 去 wrangler dev，改寫 Origin 過 same-origin 守門），先喺 https://localhost:8787 login（cookie 唔分 port）
- 舊 ops 頁（`public/`）已經退役：發佈、記錄、還原全部喺 admin；唔喺 whitelist 嘅「冇權限」頁樣式改為 inline；`/auth/*`、`/api/*` 回應帶 `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'`（淨係 frame-ancestors，唔擋 inline theme script；S-774）。admin SPA static assets 唔經 Worker，要 frame 保護就喺 `apps/admin/public/_headers` 加

Test（Worker code 喺 workerd 跑，`@cloudflare/vitest-plugin`；scripts 喺 Node）：

```sh
npm test -- apps/api            # repo 根
npx tsc -b apps/api             # type check
```

## Import（repo library → D1 + R2）

`scripts/importLibrary.mjs` 掃 `apps/player/src/catalog/{shows,dramas}/library/`（同 `buildCatalogJson.mjs` 共用 `scanLibrary`）：

1. 每張圖 SHA-256 → R2 key `catalog/v1/img/<前 16 hex>.<ext>`
2. 寫 `apps/api/.import/import.sql`（`INSERT … ON CONFLICT DO UPDATE`；內容冇變嘅行連 `updated_at` 都唔郁）
3. 問 D1 `assets` 已經有邊啲圖，淨係上載未有嘅（`wrangler r2 object put`）
4. 圖上載完先跑 SQL

**Production（主要做法，唔使 local clone）**：GitHub → **Actions** → **Import catalog** → **Run workflow**（`.github/workflows/import-catalog.yml`）

0. 先等 Actions → **Deploy API** 喺 `main` 最新嗰次 run 綠咗先 import（migrations 要 apply 咗先，否則 SQL 寫入新欄 / 新表會 fail）
1. Branch 揀 `main`（其他 branch 會即刻 fail），**dry run** 保持剔住 → Run：淨係讀 D1、印出要跑嘅 wrangler 指令，唔上載、唔寫 D1
2. 睇 run 嘅 Summary（幾多 entries、幾多張圖要上載、幾多個 wrangler step）冇問題 → 再 Run 一次，**剔走 dry run** = 真 import
3. Import 完去 admin「更新內容 → 確認發佈」撳 **發佈**，player 先會讀到

用同 `deploy-api.yml` 一樣嘅 GitHub secret `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`（D1 + Workers R2 Storage：Edit 已經夠），只交畀 import 嗰一步；兩次 import 唔會同時跑（排隊）。

**Local CLI（另一個做法）**：

```sh
cd apps/api
npm run import -- --local                # 本機
npm run import -- --remote --dry-run     # production：淨係印指令（會讀 D1）
npm run import -- --remote               # production（要 `npx wrangler login` 或者 CLOUDFLARE_API_TOKEN）
```

Idempotent：重跑幾多次都得。**Import 完之後 D1 = SSoT**，repo `library/` 只係 player 內建 fallback；日常改內容用 admin（`apps/admin`）；repo JSON → import 只係初始化 / 災難復原用。

## 第一次 deploy（merge 之後）

1. Merge 入 `main` → `.github/workflows/deploy-api.yml` 自動跑：api test → `wrangler d1 migrations apply 903-player --remote` → `wrangler deploy`
2. **設定清單 #7**：Cloudflare dashboard → Workers & Pages → `903-player-api` → Settings → Variables and Secrets → 加 **Secret**：
    - `GOOGLE_CLIENT_SECRET`：Google Cloud Console → Credentials → OAuth client
    - `SESSION_SECRET`：`openssl rand -base64 32`

    （或者 `cd apps/api && npx wrangler secret put GOOGLE_CLIENT_SECRET`）。Secret 唔好貼落 chat / repo。

3. 開 `https://903-player-api.dcwhung.workers.dev/` → 用 Google 登入（只有 `ADMIN_EMAILS` 入面嘅 email 得）
4. GitHub → Actions → **Import catalog** → Run workflow（先 dry run，冇問題再剔走 dry run 跑；見上面「Import」，local 可以用 `npm run import -- --remote`）→ admin 撳 **發佈**（第一次冇上次 publish，ID 守衛自動過）

`SESSION_SECRET` 只係簽 OAuth state cookie（10 分鐘）；換咗佢唔會踢走已 login 嘅 session（session token 喺 D1）。

## 開 flag 前驗證 + 開 flag 次序（設定清單 #8–9）

1. 驗 published `catalog.json`：

    ```sh
    curl -s -D - -H 'Origin: https://903-player.vercel.app' \
        https://903-player-api.dcwhung.workers.dev/catalog/v1/catalog.json -o /tmp/catalog.json
    ```

    - Header：`Access-Control-Allow-Origin: https://903-player.vercel.app`、`Vary: Origin`、`Cache-Control: public, max-age=60`、`ETag`
    - 內容：同 `node apps/player/scripts/buildCatalogJson.mjs --image-base x/` 比，`shows` / `dramas` 嘅 id、definition、圖檔名全部一樣（圖 URL、`generatedAt` 除外）
    - 隨便攞一張圖 `curl -sI`：`200`、`image/webp`、`max-age=31536000, immutable`

2. **唔試 Vercel Preview**（用戶 2026-11-09 決定）：Preview 網址唔喺 `PLAYER_ORIGINS`，會被 CORS 擋。Publish 內容已證實同內建一樣，直接開 Production（下一步），開完即刻真機驗；有問題就刪 env var + Redeploy 退返
3. Production：Vercel Production env 加同一個值 → Redeploy
4. GitHub Pages：Repo Settings → Secrets and variables → Actions → **Variables**（唔係 secret）加 `VITE_CATALOG_URL` 同一個值 → 下次 Pages deploy 生效
5. iOS Safari 真機：開 app、斷網再開、進度 / 收藏仍在

關 flag：刪走 `VITE_CATALOG_URL` → redeploy，player 即刻用返內建資料。

## Publish / 還原

- Publish 用 D1 而家嘅 entries；player 最多 60 秒內讀到（Worker edge cache 喺 publish 時即刻清）
- **ID 守衛**：上次 publish 有、今次冇嘅 episode ID → 拒絕（409 + 列出 ID）。聽緊嗰啲集嘅用戶會冇咗進度 / 收藏，確定先剔「照樣 publish」（`?force=1`）
- **還原 #N**（3c）=「還原上架狀態，之後新增嘅變下架」：用 snapshot #N 改 D1，再行正常 publish（新一行，`rollback_of = N`），所以之後 `GET /api/changes` 冇差異、admin 唔會出「待發佈」
    - 只改 `enabled`（節目、劇、短篇三層）：snapshot 有 → 跟 snapshot（冇呢個 key = 預設，刪走）；snapshot 冇（之後先加）→ `enabled: false`，唔刪，集數 ID 仲喺 document，ID 守衛過、收藏唔斷；draft 唔郁
    - **唔還原**內容欄位（名、簡介、圖、集數、排程日期 / schedules）：還原集數會令鎖咗嘅 ID 消失，排程日期由 schedules 表計出，淨改 definition 會唔夾。即係上架項目同 #N 一樣，但文字 / 圖 / 之後加嘅集數係最新版本
    - #N 係 `status = 'failed'`（從未上過 R2）→ 409，乜都唔寫（S-797）
    - 次序：先喺記憶體砌 document → 驗證（422）+ ID 守衛（409）→ 唔過就乜都唔寫；過咗先一個 D1 batch 寫（樂觀鎖，`updated_at` / ETag bump；中途有人改 → 寫返舊值 + 412）→ publish；publish throw（例如 R2 寫唔到）或者被拒 → 另一個 batch 寫返舊 definition（`updated_at` 再 bump）
    - 冇嘢要改又同最新一次一樣 → `{ unchanged: true }`（唔開新行）
- 內容（除 `generatedAt` 外）同最新一次一樣 → `{ unchanged: true, publish }`，唔開新行、唔寫 R2（admin 顯示「內容與目前版本相同」）；`?force=1` 照寫
- 次序：先記 `publishes` 一行，再寫 R2；R2 寫失敗就刪返嗰行（ID 守衛唔會漏咗已上線嘅 ID）；R2 寫咗之後 purge edge cache 失敗只 log、唔當 publish 失敗（S-814：唔係還原會 revert D1，同已上線 catalog 唔夾）；連刪都失敗就標 `status = 'failed'`（migration `0003`）。「而家 publish 緊」、ID 守衛、「內容冇變」比較都只睇最新一行 `status = 'ok'`，記錄照列出 failed 行（`status` 欄）
- 圖 manifest 嘅圖檔名要合 `<sha256 前 16 hex>.<webp|jpg>` 兼已經喺 `assets`
- D1 有 banner（`PUT /api/banner`）就寫入 `catalog.json` 嘅 `banner: { standard, long }`（Worker 圖 URL，同樣要已上載）；冇 = 唔寫（player 用內建圖）。還原 #N 照用而家 D1 嘅 banner（同圖一樣唔還原）
- D1 有 branding（`PUT /api/branding/icon` / `text`）就寫入 `catalog.json` 嘅 `branding: { icon?, text? }`（icon 五張 = Worker 圖 URL，要已上載；兩部分都冇 = 唔寫）；還原 #N 同 banner 一樣照用而家 D1。branding 同上一次 ok publish 唔同 → 觸發重新部署 player（見「App 外觀」）
- **警告**（唔阻 publish）：`POST /api/publish` 200（包括 `unchanged`）同 `GET /api/changes` 都有 `warnings`：
    - `{ kind: 'contrast', target: '<kind>/<id>', foreground, background, ratio, minimum }`：theme 色對唔夠 WCAG AA（`checkThemeContrast`）
    - `{ kind: 'neutralTheme', target }`：theme 10 個必填色 = `NEUTRAL_THEME`（未設定配色；唔理 `art` 同選填欄位，色值唔分大細楷）

## 內容 API（Backend Phase 2b-1）

全部喺 `/api` 底下（要 login；`PUT` / `POST` / `DELETE` 要 same-origin），request body 上限 256 KB（超過 413）。
`kind` = `shows` / `dramas`，`id` 同 folder 名規則一樣（細楷英數同連字號），唔啱 → 400（`scan` / `schedule` 一樣）。

| Method + path                                       | 做咩                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/entries`                                  | `{ entries: [{ kind, id, name, enabled, draft, updatedAt }] }`（節目冇寫 `enabled` = `true`；`draft` 見下面「Admin API」）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `GET /api/entries/:kind/:id`                        | `{ definition, images, published, draft, updatedAt }`，`ETag: "<updatedAt>"`。`published`（0.11.0）= 最新 ok publish document 入面嗰個 entry `{ definition, images }`（`images` 同 D1 一樣係「檔名 → `<hash>.<ext>`」）；未 publish 過 / document 讀唔到 / document 冇佢 = `null`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `PUT /api/entries/:kind/:id`                        | body `{ definition, images }`。更新要 `If-Match: <ETag>`、新增要 `If-None-Match: *`，唔啱 → 412。同 publish 同一套 validator 驗單一 entry（圖要合 `<hash>.<ext>` 兼已上載）→ 唔過 422 `{ error, details }`。劇集改走（舊 definition 有、新 definition 冇）一個有排程嘅短篇 ID → 409 `{ error, arcId: <舊 ID>, reason: "arcScheduled" }`，乜都唔寫（S-804：先 DELETE 排程、改 ID、再排）。成功 200（新增 201）`{ updatedAt, warnings: { missingEpisodeIds } }` + 新 `ETag`；`missingEpisodeIds` = 最新 publish 有、新 definition 冇嘅呢套劇 episode ID（只係提示，publish 時 ID 守衛照擋）                                                                                                                                                                                                                                                                                       |
| `POST /api/entries/:kind/:id/revert`                | 0.11.0：未發佈改動還原返最新 ok publish 嘅版本。要 `If-Match`（冇 / 唔啱 → 412）。body `{ items: [{ arc?, field }] }`（最少一項；`arc` = 短篇 key：id，冇就用名；冇 `arc` = 頂層）。每項將 published 嗰個 definition key 抄返 D1（published 冇 = 刪走）；`tile` / `disc` 連 `images` 入面 published slot 指去嘅檔（冇寫就慣例名 `<slot>.webp` / `arcs/<id>/<slot>.webp`）一齊還原，還原後冇 slot 再指去嘅舊檔 key 刪走；`enabled` / `removedAt` = 上下架（包括未到期嘅下架日）。短篇 `field: "*"` = 成個短篇換返 published；D1 刪咗嘅短篇任何 field 都會成個加返 published 嘅位置。排程規則（`schedules`）唔郁。冇 published 版本 → 409 `{ error, reason: "notPublished" }`；短篇從未發佈 → 409；shape 唔啱、未知 field / 短篇、頂層 `arcs` / `*` → 400。寫入同 `PUT` 同一條路徑（排程 ID 守衛 409、驗證 422、draft 照舊）；回 200 `{ updatedAt, draft, warnings }` + 新 `ETag` |
| `DELETE /api/entries/:kind/:id`                     | 劇集：最新 publish 冇佢嘅 episode ID；節目：從未以上架狀態發佈過（淨係以下架入過 document 都刪得），最新 document 讀唔到就拒絕；否則 409（改 `enabled: false`）。可帶 `If-Match`。成功 204，劇集嘅排程一齊刪                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `POST /api/dramas/:id/scan`                         | List R2 `AUDIO` 嘅 `<audio.folder>/`（兩層，跟 cursor）→ `generateDraft`（`existing` = D1 definition，同 `npm run drama-from-folder` 一套規則）。回 `{ draft, issues, diff }`（`draft` 有 `[錯誤]` 時係 `null`；`diff` = `[{ path, before?, after? }]`），**唔寫 D1**，覆核後再 `PUT`。`audio.host` 唔係 `r2` → 422                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `GET /api/dramas/:id/arcs/:arcId/schedule`          | `{ rule, expanded, updatedAt }`；未有規則 → 404                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `POST /api/dramas/:id/arcs/:arcId/schedule/preview` | body `{ rule }` → 展開 + 驗證成個 definition，唔寫：`{ expanded, warnings }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `PUT /api/dramas/:id/arcs/:arcId/schedule`          | body `{ rule, enable? }` + `If-Match`（劇集 entry 嘅 ETag）。`enable: true`：短篇係下架（`enabled: false`）就同一個 batch 轉 `enabled: true`（S-803；冇帶 / `false` 唔郁，非 boolean → 400）。展開寫入 arc 嘅 `addedAt` / `episodeDates` / `episodeRemovedAt`（冇嘅欄位刪走）→ 驗證 → D1 一個 batch 寫 `entries` + `schedules`（樂觀鎖失敗兩樣都唔寫，412）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `DELETE /api/dramas/:id/arcs/:arcId/schedule`       | 只刪規則（204），definition 入面嘅日子照留                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

排程規則（`packages/catalog/src/schedule/`，只適用於短篇；集數未知嘅短篇唔可以排）：

```jsonc
{ "kind": "dates", "batches": [{ "from": 1, "date": "2026-11-01" }, { "from": 11, "date": "2026-11-19" }] }
{ "kind": "periodic", "start": "2026-11-01", "perRelease": 2, "every": { "days": 7 } }        // 每 7 日上 2 集
{ "kind": "periodic", "start": "2026-11-02", "perRelease": 1, "every": { "weekdays": [1, 3, 5] } } // 0 = 星期日
// 加 "removeAfterDays": 30 = 每批上架後 30 日下架（每批各自計）
```

`periodic` 嘅第一批 = `start` 當日或之後第一個合規嘅星期幾；最尾一批集數可以少過 `perRelease`。

## 圖片上載（Backend Phase 2b-2）

`PUT /api/assets`（要 login + same-origin）：body = WebP 或 PNG 原始 bytes（格式跟 `Content-Type`）。

| 檢查                                                                                                                                                 | 唔過                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `Content-Type: image/webp` 或 `image/png`                                                                                                            | 415                                         |
| 大小 ≤ `ASSET_MAX_BYTES`（1 MB）                                                                                                                     | 413                                         |
| WebP：RIFF / WEBP header（`VP8 ` / `VP8L` / `VP8X`）讀到闊高；PNG：8 bytes signature + 第一個 chunk 係 IHDR（長度 13，闊高 1 至 2^31 - 1；唔驗 CRC） | 422（`invalid WebP: …` / `invalid PNG: …`） |
| 尺寸白名單（`ASSET_DIMENSIONS`）：WebP = disc 600×600、tile 1216×684、banner 1200×517 / 2000×400；PNG = App 圖示 64×64、180×180、192×192、512×512    | 422（`allowed` 列出嗰個格式允許嘅尺寸）     |

- 檔名 = sha256 前 16 hex + `.webp` / `.png`（同 `importLibrary.mjs` / `IMAGE_FILE_PATTERN` 一致；`.png` 淨係 branding icon 用得，entries / banner 唔收）
- 已經有呢個 hash → 200 `{ name, existed: true }`（idempotent，乜都唔寫）
- 未有 → 先寫 R2 `catalog/v1/img/<name>`，再 insert `assets` → 201 `{ name, width, height, bytes }`。R2 寫失敗就唔 insert（R2 有、D1 冇嘅孤兒檔無害；反過嚟 publish 會出爛圖）
- Admin 流程：上載 → 攞 `name` → `PUT /api/entries/:kind/:id` 將 `images` 指去 `name`
- 現有 R2 嘅 1216×608 劇集 tile 照用（只係新上載要合白名單）

本機試：

```sh
npm run dev -w apps/api   # 另一個 terminal
# admin login 後喺 DevTools 抄 __Host-session cookie
curl -k -X PUT https://localhost:8787/api/assets -H 'Origin: https://localhost:8787' \
  -H 'Content-Type: image/webp' -H 'Cookie: __Host-session=<token>' --data-binary @disc.webp
```

## 到期提醒

| 項目                                               | 到期                                                     | 要做                                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Cloudflare API token `903-player-github-deploy`    | 開 token 起 **1 年**（2026-11-08 開）                    | Cloudflare → My Profile → API Tokens 開新 token（同樣權限）→ 換 GitHub secret `CLOUDFLARE_API_TOKEN`   |
| Google OAuth client                                | **6 個月冇用**會被 Google 刪（刪咗 30 日內可以 restore） | 最少半年 login 一次 admin；被刪就喺 Google Cloud Console → Credentials restore                         |
| Google consent screen Testing 模式                 | —                                                        | 只有 test user 登入得（同 whitelist 一致）；加 admin 要同時加 test user 同 `ADMIN_EMAILS`              |
| GitHub fine-grained token（`DEPLOY_GITHUB_TOKEN`） | 開 token 時揀嘅到期日                                    | 開新 token（同樣權限）→ 換 GitHub secret → Run **Deploy API**；過咗期 publish 照成功，`deploy: failed` |

## 首頁 banner + R2 原圖（Phase 4）

Migration `0005_banner.sql`：`banner` 表（只會有 `id = 1` 一行；值 = R2 圖檔名 `<hash>.webp`）。

| Method + path                  | 做咩                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/banner`              | `{ banner: { standard, long } \| null, updatedAt }`                                                                                                                                                                                                                                                                                                                                                                 |
| `PUT /api/banner`              | `{ standard, long }`（兩個都要，唔係 string → 400）；每張要合 `<hash>.webp`、已上載、R2 WebP header 尺寸啱 slot（standard 1200×517、long 2000×400；只 range get 頭 `WEBP_HEADER_BYTES` = 30 bytes），唔過 → 422（`not uploaded` = assets / R2 冇；`is not a valid WebP` = R2 有但唔係 WebP）；回同 `GET` 一樣。同 entries 一樣係草稿：`POST /api/publish` 先上線                                                    |
| `DELETE /api/banner`           | 還原預設（刪行）→ 204；冇 banner 都 204                                                                                                                                                                                                                                                                                                                                                                             |
| `GET /api/dramas/:id/sources`  | 即場掃 `AUDIO` `<audio.folder>/`（= 最新掃描結果，唔寫 D1，draft 劇都得）→ `{ folder, cdCover, coverPhoto, arcs: [{ name, id, cdCover, coverPhoto }] }`；key = `AUDIO` 完整 key（冇 = `null`；`arcs[].id` 對唔到 definition 就 `null`）。400 id 唔合規、404 冇呢套劇、422 `audio.host` 唔係 `r2`                                                                                                                    |
| `GET /api/r2-source?key=<key>` | 代讀原圖：`key` 要係某套 r2 劇（包括 draft；`audio.folder` + `/` 係 key 前綴，folder 可以多層）即場掃描嘅 `cdCover` / `coverPhoto`，其他一律 404（唔收任意 key）；R2 冇呢個 object → 404；> `R2_SOURCE_MAX_BYTES`（20 MB）→ 413；R2 記嘅 Content-Type 唔係 jpeg / png / webp（`image/jpg` 當 jpeg）→ 415；冇 `key` → 400。200 = 原圖（Content-Type 跟副檔名、`private, no-cache` + ETag，`If-None-Match` 啱 → 304） |

- 封面固定檔名（唔分大細楷，`scanListing`）：`cd cover.<jpg|jpeg|png|webp>`（disc）、`cover photo.<…>`（tile；冇 cd cover 時 disc 都用）
- Admin 開劇集編輯頁 / 掃描後自動 call `sources` → slot 冇圖就攞 `r2-source` 裁切上載；冇原圖 = `null` / 404，靜靜雞略過
- 每次 `r2-source` 成本：1 個 D1 query + 該劇一次掃描（根 + 每個短篇各 1 個 list；folder 互相包住就逐套掃到搵到為止）+ 1 個 head（+ 1 個 get）

## App 外觀（App 圖示 + 名稱與簡介）

Migration `0006_branding.sql`：`branding_icon`、`branding_text` 兩個單行表（`id = 1`，各自 `updated_at`；冇行 = 用 repo 內建）+ `publishes.deploy` / `deploy_requested_at`。同 banner 一樣係草稿：`POST /api/publish` 先寫入 `catalog.json`。

| Method + path                    | 做咩                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/branding`              | `{ icon: { favicon, appleTouch, icon192, icon512, maskable, maskableBackground } \| null, text: { name, shortName?, description } \| null, updatedAt }`（icon 值 = R2 圖檔名 `<hash16>.png`；`updatedAt` = 兩部分最新嗰個，都冇 = `null`）                                                                                                                       |
| `PUT /api/branding/icon`         | Body 同 `GET` 嘅 `icon`（六個 key 都要、全部 string、唔准多 key，唔係 → 400）；`maskableBackground` 唔係 `#rrggbb` → 422；每張要合 `<hash>.png`、已上載、R2 PNG IHDR 尺寸啱 slot（favicon 64、appleTouch 180、icon192 192、icon512 / maskable 512），唔過 → 422（同 banner 一樣分 `not uploaded` / `is not a valid PNG` / 尺寸）。底色存細楷；回同 `GET` 一樣    |
| `DELETE /api/branding/icon`      | 還原（用 repo 內建）→ 204（冇都 204）                                                                                                                                                                                                                                                                                                                            |
| `PUT /api/branding/text`         | `{ name, shortName?, description }`（string；`shortName` 可以 `null` / 空 = 唔設；唔准多 key，唔係 → 400）；trim 後存。trim 後空白或者超長 → 422（上限 name 40、shortName 24、description 200 字，`BRANDING_*_MAX_LENGTH`）；回同 `GET` 一樣                                                                                                                     |
| `DELETE /api/branding/text`      | 還原 → 204                                                                                                                                                                                                                                                                                                                                                       |
| `GET /api/branding/favicon`      | **唔使 login**：最新 ok publish 嘅 `branding.icon.favicon` → 302 去嗰張圖；冇 → 302 `/favicon.png`（admin 內建）；`Cache-Control: no-cache`                                                                                                                                                                                                                      |
| `GET /api/publishes/:id/deploy`  | `{ status: 'queued' \| 'in_progress' \| 'success' \| 'failure' \| 'unknown', url }`：查 GitHub Actions `deploy.yml` 喺 `deployRequestedAt` 之後最早嗰個 `repository_dispatch` run（`url` = run 頁）；未有 run = `queued`；觸發失敗（`deploy: 'failed'`）= `failure`；冇 token / `deploy` 係 `none` / `skipped` / GitHub 答唔到 = `unknown`。冇呢次 publish → 404 |
| `POST /api/publishes/:id/deploy` | 重新部署（再 dispatch + Vercel hook，唔使 branding 有改）→ `{ deploy, deployRequestedAt }`；冇呢次 publish → 404，`status = 'failed'` → 409                                                                                                                                                                                                                      |

- `GET /api/changes` 加 `brandingChanged`（D1 草稿 vs 最新 ok publish）；`GET /api/publishes` 每行 `changes.brandingChanged`（同上一次 ok publish 比）、`deploy`、`deployRequestedAt`；`POST /api/publish` 回嘅 `publish` 都有 `deploy` / `deployRequestedAt`

### 重新部署 player

Player 喺 build 時先讀 `branding`（icon 檔、manifest、`<title>` 等），所以 publish 嘅 `branding` 同上一次 ok publish 唔同（包括還原）就自動觸發：

1. `POST https://api.github.com/repos/dcwhung/903-player/dispatches`（`event_type: catalog-branding`、`client_payload.publishId`；header `Authorization: Bearer <GITHUB_DEPLOY_TOKEN>`、`Accept: application/vnd.github+json`、`User-Agent: 903-player-api`）→ `deploy.yml`（GitHub Pages）
2. `POST <VERCEL_DEPLOY_HOOK_URL>`（Vercel production）

- 結果記入 `publishes.deploy`：`triggered`（有設嘅目標全部 2xx）、`failed`（任何一個非 2xx / network error / 10 秒 timeout）、`skipped`（兩個 secret 都冇）、`none`（branding 冇改）。**部署點都唔會令 publish 失敗**（R2 已經寫咗），錯誤只 log（唔 log token / hook URL）
- `deployRequestedAt` 喺觸發之前記低，查 run 用 `created>=`（去毫秒）

**設定（用戶做，兩個都選填）**：

1. GitHub → Settings → Developer settings → Fine-grained tokens：Repository access 只揀 `dcwhung/903-player`；權限 **Contents: Read and write**（`repository_dispatch` 要 Contents 寫權限）、**Actions: Read**（查部署狀態）；到期日記入下面「到期提醒」
2. Repo → Settings → Secrets and variables → Actions → **Secrets** 加 `DEPLOY_GITHUB_TOKEN` = 上面個 token（GitHub secret 名唔准 `GITHUB_` 開頭，`deploy-api.yml` 會同步做 Worker secret `GITHUB_DEPLOY_TOKEN`）
3. Vercel → Project → Settings → Git → **Deploy Hooks**：branch `main` → 抄 URL → 同一頁 GitHub Secrets 加 `VERCEL_DEPLOY_HOOK_URL`
4. Actions → **Deploy API** → Run workflow（`main`）：「Sync optional deploy secrets」一步 `wrangler secret bulk` 寫入 Worker（冇設嘅唔寫；兩個都冇就跳過）
5. 或者唔經 CI：`cd apps/api && npx wrangler secret put GITHUB_DEPLOY_TOKEN`（同 `VERCEL_DEPLOY_HOOK_URL`）

- 要停：刪 GitHub secret 唔會刪 Worker secret；用 `npx wrangler secret delete GITHUB_DEPLOY_TOKEN`（或者 Cloudflare dashboard）
- `deploy.yml` 要有 `on.repository_dispatch.types: [catalog-branding]` 先會跑（player + CI 嗰步做）
- 本機 `.dev.vars` 唔好填真 token：本機 publish 改咗 branding 都會真係觸發部署

## 選擇發佈（0.10.0）

`POST /api/publish` body 選填 `selection`：淨係發佈揀咗嘅新內容 / App 外觀，其他已儲存改動照舊全部發佈。**冇 body 或者冇 `selection` = 舊行為（全部發佈）**，舊 admin 唔使改。

```jsonc
// POST /api/publish（Content-Type: application/json）
{
    "selection": {
        "content": ["newArc/lancy/lancy-07", "newDrama/fresh"], // GET /api/todos 每行嘅 key；冇 = []
        "branding": { "icon": false, "text": true }, // 冇 = 兩個都 false
        "banner": false, // 冇 = false
    },
}
```

- **key**：`GET /api/todos` 每行 `key` = `<kind>/<劇 ID>[/<短篇 ID>]`（例如 `newDrama/fresh`、`newArc/golden/season-2`、`newEpisodes/golden/season-1`、`missingFolder/golden`）。劇 / 短篇改咗 ID 之後 key 跟住變，要重新 `GET /api/todos`
- **每行 `publish`**：
    - `selectable`：新劇 / 新短篇，冇「必須處理」→ 可以揀
    - `incomplete`：新劇 / 新短篇，有「必須處理」（或者劇仲係 draft）→ **今次一定唔發佈**；就算 client 揀咗，server 都自動剔走（唔係 422），回應 `selection.skipped` 列出 `{ key, reason: 'incomplete' }`。理由：更新頁同發佈之間有人改咗設定都唔使成個發佈失敗
    - `always`：已發佈劇集嘅新集數（`newEpisodes`）、資料夾唔見（`missingFolder`）→ 唔可以剔走，跟其他改動一齊發佈（`content` 有佢嘅 key 會忽略）。新集數所屬嘅新劇 / 新短篇冇發佈，佢都唔會 resolve
- **冇揀 / 未完成嘅新內容完全唔入今次 catalog**（D1 唔郁，下次再揀）：即係「同上次發佈一樣」——新劇成個 entry、新短篇喺嗰套劇 definition 嘅 arc：上次 ok publish 有（例如以前以下架狀態發佈過）就換返上次嗰個版本（短篇用 `name` 對，`name` = R2 子資料夾、永遠唔改），冇就剔走。同一套劇其他短篇 / 集數 / 欄位照用 D1。所以已發佈（鎖咗 ID）嘅內容唔會因為冇揀而消失；**ID 守衛照舊**（409 / `?force=1`）
- **冇揀嘅 App 外觀**：`icon`、`text`、`banner` 各自用上次 ok publish 嘅值（冇上次 / 上次冇 = 唔寫），D1 草稿唔郁、唔驗。重新部署 player 照舊用「今次 `branding` 同上次唔同」判斷，即係淨係揀咗而又真係改咗先觸發
- **Findings**：只有今次真係發佈咗嘅行（揀咗嘅 `selectable` + 冇被剔走嘅 `always`）、而且冇「必須」先標 resolved；冇揀嘅留低
- **`unchanged`**：照 selection 砌出嚟嘅 document 同最新一次一樣（例如乜都冇揀、又冇其他改動）→ `{ unchanged: true }`，唔開新行
- 錯誤：body 唔係 JSON object、`selection` / `branding` 唔係 object、多咗未知欄位、`content` 唔係 string array（上限 500）、key 唔係 `<kind>/<劇 ID>[/<短篇 ID>]` 形狀（每段唔可以空、冇空白）或者長過 200 字元、旗唔係 boolean → **400** `{ error }`；body 大過 64 KB（`PUBLISH_BODY_LIMIT_BYTES`）→ **413**；`content` 有待辦冇嘅 key → **422** `{ error: 'unknown selection keys', keys }`（`keys` 最多頭 20 個），乜都唔寫（頁面過時，重新載入）；其餘同普通 publish（422 驗證、409 ID 守衛）。上限見 `src/catalog/selectionLimits.ts`；`GET /api/changes ?selection=` 用同一套驗證
- 回應：普通 publish 嘅欄位 + `selection: { content: [今次發佈咗嘅 key], skipped: [{ key, reason }] }`（冇 `selection` 就冇呢欄）
- 還原 #N 唔受 selection 影響（照舊用而家 D1，未發佈嘅新短篇以下架狀態入 catalog，見「Publish / 還原」）

### `GET /api/changes`（更新頁 / 確認發佈頁）

```jsonc
{
    "base": 12,
    "changes": { "items": [], "timeline": [] }, // D1 vs 最新 ok publish（有 ?selection 就跟 selection）
    "validation": { "ok": true, "episodeCount": 120 },
    "warnings": [],
    "unchanged": false, // 照呢個 selection（冇 = 全部）發佈會唔會回 unchanged
    "bannerChanged": false, // 有 ?selection：揀咗而又改咗先 true
    "brandingChanged": true,
    "appearance": { "icon": false, "text": true, "banner": false }, // 三項各自同上次 ok publish 比（唔理 selection）
    "others": { "items": [], "timeline": [] }, // 「其他改動」：唔計新內容（selectable / incomplete 行）同 App 外觀
    "selection": { "content": [], "skipped": [] }, // 有 ?selection 先有
}
```

- `?selection=<URL-encoded JSON>`（同 body 嘅 `selection` 一樣 shape）：`changes`、`validation`、`warnings`、`unchanged`、`bannerChanged`、`brandingChanged` 跟 selection 計，同 `POST /api/publish { selection }` 會發佈嘅 document 一樣；格式錯 400、未知 key 422（同 publish）
- 更新頁：App 外觀 section 只列 `appearance` 入面 `true` 嘅項目；新內容表每行用 `GET /api/todos` 嘅 `publish`
- 確認發佈頁「其他改動」= `others.items`（`summarizeChanges` 嘅 item：`newShow` / `newEpisodes` / `edit`（`detail.fields`）/ `unlist` 等）；「一項都冇揀」判斷：`content` 空、`appearance` 揀咗嘅都冇、`others.items` 空（或者直接睇 `?selection` 嘅 `unchanged`）

## Admin API（Phase 3a）

全部喺 `/api` 底下，同內容 API 一樣要 login（改嘢要 same-origin），body 上限 256 KB。Migration `0004_admin.sql`：`entries.draft`、`scan_findings` 表、`publishes.error`（deploy 時 `deploy-api.yml` 自動 apply）。

| Method + path                         | 做咩                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/scan`                      | 入 admin 自動掃描：列 `AUDIO` 頂層資料夾 → 每套 `audio.host = r2` 嘅劇 `listingFromR2` + `generateDraft`；有 diff 先寫 D1（新短篇 `enabled: false`）+ 記 finding；新資料夾 → 建 draft 劇（ID `drama-NN`）；新短篇 ID 自動 `<劇 ID>-NN`（兩位數，由已有 ID 嘅短篇數 + 1 起、避開已用，3c）；有劇資料夾唔見 → 記「資料夾唔見」，只有睇落係佢改名嘅新資料夾（同種類 + 有一個短篇名 / 日子一樣）唔自動建，其他照建（S-800）。回 `{ scannedAt, findings, skipped }` |
| `GET /api/todos`                      | 未解決 findings → 待辦矩陣 `{ rows: [{ key, kind, findingIds, dramaId, arcId, name, cells, publish }], blocking }`（`key` / `publish` 見「選擇發佈」）；`cells` = `folder` / `id` / `images` / `schedule` / `summary`，每格 `{ state: done / must / optional / na, target }`；`id` 格：自動派嘅 ID（`drama-NN`、`<劇 ID>-NN`）未經 `confirm-id` 確認或改名就係 `must`                                                                                          |
| `POST /api/entries/dramas/:id/rename` | `{ newId }`：只限從未發佈（任何 ok publish 都冇用過呢個 ID，否則 409）；entries + schedules + findings 一個 batch 改；自動編號短篇 ID `<舊 ID>-NN` 一齊改做 `<新 ID>-NN`（definition、schedules、findings）；可帶 `If-Match`                                                                                                                                                                                                                                   |
| `POST /api/todos/confirm-id`          | `{ dramaId, arcId? }`（3c）：admin 儲存 ID 欄（就算冇改）時叫，確認掃描自動派嘅 ID → finding `detail.idConfirmed = true`，待辦 `id` 格變 `done`；冇 `arcId` = 新劇、有 = 新短篇；對唔到回 `{ confirmed: 0 }`（idempotent）；body 錯 400、冇呢套劇 404                                                                                                                                                                                                          |
| `POST /api/dramas/:id/folder`         | `{ folder }`：配對 R2 頂層資料夾（R2 冇 → 422、其他劇用緊 → 409）→ 即刻重新掃描嗰套劇，同一個 batch 寫 + 刪「資料夾唔見」finding；配對返同一個資料夾又冇 diff → 200 `{ unchanged: true, definition, updatedAt, findings: [] }`，entry 唔郁，只刪 finding（S-801）                                                                                                                                                                                              |
| `GET /api/folders/unmapped`           | `{ folders }`：冇劇用緊嘅頂層資料夾                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `PUT /api/order/:kind`                | `{ ids }`：上架嗰段嘅全部 entry（新次序；唔啱 → 422）→ 一個 batch 寫 `order` 1、2、3…；下架 / draft 唔郁；回 `{ ids, changed }`                                                                                                                                                                                                                                                                                                                                |
| `GET /api/changes`                    | D1（唔包 draft）vs 最新 ok publish：`{ base, changes: { items, timeline }, validation, warnings, unchanged, bannerChanged, brandingChanged, appearance, others }`（選填 `?selection=`，見「選擇發佈」）（`summarizeChanges`；`validation` = `{ ok: true, episodeCount }` 或 `{ ok: false, error }`）                                                                                                                                                           |

- **Draft**（`entries.draft = 1`）：掃描自動建、未齊必須資料嘅劇。`PUT` 先試完整驗證，唔過就用寬鬆驗證（definition 用到但未上載嘅圖當有；其他規則照驗）；一次 `PUT` 通過完整驗證就自動清 `draft`。Publish / `GET /api/changes` 唔包 draft；`DELETE` 照准（從未發佈）
- **Findings**：普通 publish 成功之後，待辦行冇「必須」格（有 `selection` 就再要今次真係發佈咗）嘅 finding 標 `resolved_publish_id`（仲有必須 / 冇揀嘅留低）；「資料夾唔見」喺配對資料夾時刪走
- **下架短篇**（`enabled: false`）：player 唔顯示。ID 守衛唔對稱：`publishes.episode_ids` 只鎖上過架嘅 episode ID（今次上架 + 以前鎖咗而仲喺 document 嘅）；比較時新 document 連下架劇 / 短篇都計，所以落架唔會 409，但從未上架嘅自動 ID（`lancy-04`、`drama-01`；3c 之前嘅 `arc-01`）改 ID 唔使 force；rename「從未發佈」亦只睇鎖咗嘅 ID（W-707）
- **排序**（`PUT /api/order`）：`json_set` 原地改 `order`（`CAST(? AS INTEGER)`，D1 綁 JS number 係 REAL，唔 cast 會寫成 `2.0`）；`updated_at` = MAX(新值, 現行值 + 1 ms)，同時有人寫都唔會令 ETag 倒退或者撞（S-799）。miniflare test 驗過；deploy 後喺真 D1 排一次，再 `GET /api/entries/dramas/<id>` 睇 `order` 係整數、`ETag` 有變
- 每次掃描成本：1 個頂層 list + 每套劇（根 + 每個短篇）各 1 個 list
