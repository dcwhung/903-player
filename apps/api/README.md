# 903-player-api（Backend Phase 2a）

Cloudflare Worker：管理 catalog 內容（D1）、publish `catalog.json`（R2）、代出 `catalog.json` 同圖畀 player。
Plan：`.proj-docs/plans/2026-11-08_plan_phase2a-backend.md`。

| 路徑                               | 用途                                                                   | 權限                  |
| ---------------------------------- | ---------------------------------------------------------------------- | --------------------- |
| `/`（`public/`）                   | Ops 頁：login、而家 publish 緊乜、Publish、記錄 / 還原                 | 公開（資料要 login）  |
| `/auth/google/start`、`/callback`  | Google login（Authorization Code + PKCE）                              | 公開                  |
| `POST /auth/logout`                | 登出                                                                   | same-origin           |
| `GET /api/health`                  | `{ ok, version }`                                                      | 公開                  |
| `GET /api/me`                      | 而家 login 咗邊個                                                      | session               |
| `POST /api/publish[?force=1]`      | D1 → `catalog.json` → R2；ID 守衛（上次有、今次冇嘅 episode ID → 409） | session + same-origin |
| `GET /api/publishes`               | Publish 記錄（新到舊）                                                 | session               |
| `POST /api/publishes/:id/rollback` | 重新 publish 舊 snapshot（記做新一行，一樣行 ID 守衛）                 | session + same-origin |
| `GET /catalog/v1/catalog.json`     | Player 讀嘅 catalog（`max-age=60` + ETag）                             | 公開，CORS 限 player  |
| `GET /catalog/v1/img/<hash>.<ext>` | Catalog 圖（content hash，`immutable`）                                | 公開，CORS 限 player  |

設定喺 `wrangler.toml`（D1 `DB`、R2 `CATALOG`、`[vars]`）；secret（`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET`）唔入 repo。

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
3. Import 完去 ops 頁撳 **Publish**，player 先會讀到

用同 `deploy-api.yml` 一樣嘅 GitHub secret `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`（D1 + Workers R2 Storage：Edit 已經夠），只交畀 import 嗰一步；兩次 import 唔會同時跑（排隊）。

**Local CLI（另一個做法）**：

```sh
cd apps/api
npm run import -- --local                # 本機
npm run import -- --remote --dry-run     # production：淨係印指令（會讀 D1）
npm run import -- --remote               # production（要 `npx wrangler login` 或者 CLOUDFLARE_API_TOKEN）
```

Idempotent：重跑幾多次都得。**Import 完之後 D1 = SSoT**，repo `library/` 只係 player 內建 fallback；Phase 3 admin 未有之前要改內容 → 改 repo JSON → merge 入 `main` → 重跑 import（Import catalog workflow）→ Publish。

## 第一次 deploy（merge 之後）

1. Merge 入 `main` → `.github/workflows/deploy-api.yml` 自動跑：api test → `wrangler d1 migrations apply 903-player --remote` → `wrangler deploy`
2. **設定清單 #7**：Cloudflare dashboard → Workers & Pages → `903-player-api` → Settings → Variables and Secrets → 加 **Secret**：
    - `GOOGLE_CLIENT_SECRET`：Google Cloud Console → Credentials → OAuth client
    - `SESSION_SECRET`：`openssl rand -base64 32`

    （或者 `cd apps/api && npx wrangler secret put GOOGLE_CLIENT_SECRET`）。Secret 唔好貼落 chat / repo。

3. 開 `https://903-player-api.dcwhung.workers.dev/` → 用 Google 登入（只有 `ADMIN_EMAILS` 入面嘅 email 得）
4. GitHub → Actions → **Import catalog** → Run workflow（先 dry run，冇問題再剔走 dry run 跑；見上面「Import」，local 可以用 `npm run import -- --remote`）→ ops 頁撳 **Publish**（第一次冇上次 publish，ID 守衛自動過）

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
- 還原 = 重新寫舊 snapshot（新一行 publish，`rollback_of` 記住來源）；D1 entries 唔郁

## 到期提醒

| 項目                                            | 到期                                                     | 要做                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Cloudflare API token `903-player-github-deploy` | 開 token 起 **1 年**（2026-11-08 開）                    | Cloudflare → My Profile → API Tokens 開新 token（同樣權限）→ 換 GitHub secret `CLOUDFLARE_API_TOKEN` |
| Google OAuth client                             | **6 個月冇用**會被 Google 刪（刪咗 30 日內可以 restore） | 最少半年 login 一次 ops 頁；被刪就喺 Google Cloud Console → Credentials restore                      |
| Google consent screen Testing 模式              | —                                                        | 只有 test user 登入得（同 whitelist 一致）；加 admin 要同時加 test user 同 `ADMIN_EMAILS`            |
