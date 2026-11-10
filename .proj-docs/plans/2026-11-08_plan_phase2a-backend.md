# Backend Phase 2：Worker API + D1 + Google login + publish `catalog.json`

## Context

Phase 1（v1.30.0）令 player 識喺 splash 期間讀 runtime `catalog.json`，但 production 仲關住（`VITE_CATALOG_URL` 未設）。Phase 2 要整 backend，令內容由 D1 管理、publish 出 `catalog.json`，之後上下架唔使 rebuild。主計劃：`.proj-docs/plans/2026-11-06_plan_backend-admin.md`。

用戶 2026-11-08 決定：

| 決定     | 內容                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 拆 phase | **2a**：Worker 骨架 + D1 + Google login + migration + publish + 開 flag；**2b**：CRUD + R2 掃描 + 排程展開 + 圖片上載 + prebuild snapshot |
| D1 模型  | **Document 式**：每個 show / drama 一行，存同 `drama.json` / `show.json` 一樣嘅 definition JSON + 圖 manifest；排程規則（2b）另開 table   |
| Hosting  | **Worker 代出** `GET /catalog/v1/catalog.json` 同 `/catalog/v1/img/<hash>.webp`（讀 R2 binding），CORS / Cache-Control 喺 code 控制       |
| 開 flag  | **2a 完成即開** production `VITE_CATALOG_URL`（publish 內容同內建一模一樣，用戶零變化）                                                   |

最高原則照舊：**episode ID、storage key、上下架結果唔准變**。

---

## Phase 2a（今次做）

### 1. `apps/api`（新 workspace）

```
apps/api/
  wrangler.toml          D1 binding DB、R2 binding CATALOG（新 private bucket）、vars、static assets = public/
  migrations/0001_init.sql
  src/index.ts           Hono app
  src/auth/              google.ts（OAuth + PKCE）、session.ts、middleware.ts
  src/catalog/           store.ts（D1 讀寫）、publish.ts、serve.ts
  src/config.ts          named constants（cookie 名、TTL、cache 秒數）
  public/index.html      最簡 ops 頁（login / 現狀 / Publish / history）—— 先出 _mockups_/admin-ops/ 確認
  scripts/importLibrary.mjs
  vitest.config.ts       @cloudflare/vitest-pool-workers（miniflare D1 / R2）
```

- Stack：Hono（MIT）+ wrangler + `@cloudflare/vitest-pool-workers`；引入前跑 `npm audit`、查 license。
- Root `vitest.config.ts` projects 加 `apps/api`，`npm test` 一次過跑三個 workspace。
- `apps/api/package.json` version `0.1.0`，`GET /api/health` 回 version（build 時注入）。

### 2. D1 schema（`0001_init.sql`）

| Table       | 欄位（重點）                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `entries`   | `kind`（shows/dramas）、`id`、`definition`（JSON text）、`images`（JSON：檔名 → asset hash）、`updated_at`；PK (kind,id) |
| `assets`    | `hash`（sha256 前 16 hex）、`content_type`、`bytes`、`created_at`                                                        |
| `publishes` | `id`、`created_at`、`created_by`、`hash`、`document`（完整 snapshot JSON）、`episode_ids`（JSON）                        |
| `sessions`  | `token_hash`（SHA-256）、`email`、`expires_at`                                                                           |

唔開 `users` table：whitelist 用 env var `ADMIN_EMAILS`。

### 3. Google login（server-side Authorization Code + PKCE）

- `GET /auth/google/start`：生 `state` + PKCE verifier，放 HMAC 簽名（`SESSION_SECRET`）嘅短命 cookie（10 分鐘），302 去 Google（scope `openid email`）。
- `GET /auth/google/callback`：驗 state → 用 code + verifier + client secret 換 token（直接 TLS 去 Google token endpoint，所以 id_token 可信）→ `email_verified` + email 喺 `ADMIN_EMAILS` → 開 session。
- Session：32 byte random token，D1 存 hash，cookie `__Host-session`（`HttpOnly; Secure; SameSite=Lax; Path=/`），30 日。
- Middleware：全部 `/api/*`（除 `/api/health`）要 session；POST / PUT / DELETE 再驗 `Origin` = Worker origin（CSRF）。
- `POST /auth/logout`、`GET /api/me`。
- Whitelist 外嘅 email：403 頁，唔開 session。

### 4. Migration（`scripts/importLibrary.mjs`）

- 重用 `apps/player/scripts/buildCatalogJson.mjs` 嘅掃描邏輯（抽 `scanLibrary()` export，唔重寫）：讀 7 show + 6 drama 嘅 JSON + 圖。
- 每張圖算 sha256 → `catalog/v1/img/<hash>.<ext>`；輸出：
    1. `import.sql`（`INSERT … ON CONFLICT DO UPDATE`，idempotent，可以重跑）
    2. 圖片上載清單 → `wrangler r2 object put`（已存在就跳過）
- 本地用 `--local`，production 用 `--remote`。

### 5. Publish

- `POST /api/publish`：
    1. 讀 `entries` → 砌 `CatalogDocument`（images 轉 `<WORKER_ORIGIN>/catalog/v1/img/<hash>.webp`）
    2. `parseCatalogDocument` + `buildRegistry` / `buildShowRegistry`（`packages/catalog` 同一套 validator）
    3. **ID 守衛**：計全部 episode ID；上次 publish 有、今次冇嘅 ID → 拒絕（要 `?force=1` + 回應列明邊啲）
    4. 寫 R2 `catalog/v1/catalog.json`，D1 記 `publishes` snapshot
- `GET /api/publishes`（history）、`POST /api/publishes/:id/rollback`（重新寫舊 snapshot，照行守衛）。

### 6. Serving（公開，唔使 login）

- `GET /catalog/v1/catalog.json`：`Cache-Control: public, max-age=60`、`ETag`；`GET /catalog/v1/img/:file`：`max-age=31536000, immutable`。
- CORS：`Access-Control-Allow-Origin` 只回 `PLAYER_ORIGINS`（Vercel + GitHub Pages）入面 match 到嘅 origin，`Vary: Origin`。
- 圖片同 `catalog.json` 喺同一個 folder（`catalog/v1/`）→ Phase 1 SW 圖片 CacheFirst route 自然 match，**解決 S-763**。

### 7. `packages/catalog`：`appAudioBase` 注入

- `dramas/episodes.ts` 唔再用 `import.meta.env.BASE_URL`：`buildEpisodes` / `buildRegistry` 收 `{ appAudioBase }` 參數。
- Player：`apps/player` 嘅 registry 傳 `` `${import.meta.env.BASE_URL}dramas/` ``；Worker publish 驗證時傳固定值（只驗結構，唔出 URL）。
- 刪 package tsconfig 嘅 `vite/client` types + TODO。
- 一致性 test（`catalogJson.test.ts`）照綠 = URL / ID 冇變。

### 8. Player（v1.31.0，MINOR）

- **S-764**：catalog 圖 `<img>` 加 `crossorigin="anonymous"`（Worker 有 CORS）→ `cacheableResponse.statuses` 改 `[200]`，唔再 cache opaque。涉及 `.tsx` → PR 寫 `Design Origin: none-required`（冇 layout / className 改動）。
- `deploy.yml`（GitHub Pages）build 讀 repo variable `VITE_CATALOG_URL`；Vercel 用 dashboard env。
- Code 唔 hardcode Worker URL。

### 9. CI / Deploy

- `ci.yml`：`apps/api` 跟 unit / lint / typecheck 一齊跑。
- 新 `.github/workflows/deploy-api.yml`：main push 而且改咗 `apps/api/**` 或 `packages/catalog/**` → `wrangler d1 migrations apply --remote` → `wrangler deploy`（用 `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secret）。

### 10. 開 flag 次序（merge 之後）

1. Worker deploy 成功 → 用戶 login ops 頁 → 跑 import → 撳 Publish
2. 驗：`curl` published `catalog.json` 經 `buildCatalogDocument` 比較（同內建一樣，除 image URL / generatedAt）；CORS header 啱
3. ~~先開 Vercel Preview~~（用戶 2026-11-09 決定跳過：Preview origin 唔喺 CORS 白名單）→ 直接開 Production + GitHub Pages variable → redeploy；有問題刪 env var + Redeploy 退返
4. iOS Safari 真機：開 app、offline 再開、進度 / 收藏仍在

### 唔做（2b）

CRUD API、R2 audio 掃描（`dramaFromFolder` 核心抽入 package）、`schedules` table + `expandSchedule`、`PUT /api/assets`（webp magic bytes + 尺寸）、prebuild snapshot（build 時 fetch 最新 published `catalog.json`）、publish diff。

### 2a 期間內容 SSoT

Import 完之後 **D1 = SSoT**；repo `library/` 只係內建 fallback。Admin（Phase 3）未有之前要改內容 → 改 repo JSON（merge 入 `main`）再重跑 import + publish（idempotent）。Import 用 GitHub Actions 手動 workflow **Import catalog**（`.github/workflows/import-catalog.yml`，只限 `main`，預設 dry run；用戶 2026-11-09 揀，因為冇 local clone），local `npm run import -w apps/api -- --remote` 係後備。

---

## 用戶要喺 dashboard 做嘅設定清單

**實作開始前（1–6）；merge 後（7–9）**

| #   | 平台         | 要做                                                                                                                                                                                                                                                                                                                        | 交返俾我                       |
| --- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | Cloudflare   | Workers & Pages：確認 account 嘅 `*.workers.dev` subdomain（未開就開）                                                                                                                                                                                                                                                      | subdomain 名                   |
| 2   | Cloudflare   | D1 → Create database `903-player`（location：Western Europe，主要用戶喺西歐）                                                                                                                                                                                                                                               | `database_id`                  |
| 3   | Cloudflare   | R2 → Create bucket `903-player-catalog`，**唔開 public access**（Worker 代出）；另外話我知現有音檔 bucket 名（2b 掃描用）                                                                                                                                                                                                   | 兩個 bucket 名                 |
| 4   | Cloudflare   | My Profile → API Tokens → Custom token：Account › Workers Scripts:Edit、D1:Edit、Workers R2 Storage:Edit（只限你個 account）                                                                                                                                                                                                | 唔使交；放 GitHub secret（#6） |
| 5   | Google Cloud | 開 project → OAuth consent screen：External、**Testing** 模式、test user 加 `donald.cw.hung@gmail.com`、scope `openid` `email` → Credentials → OAuth client ID（Web application）：Authorized redirect URI `https://903-player-api.dcwhung.workers.dev/auth/google/callback` + `http://localhost:8787/auth/google/callback` | Client ID（唔係 secret）       |
| 6   | GitHub       | Repo Settings → Secrets and variables → Actions：secret `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`                                                                                                                                                                                                                     | 話我知加咗                     |
| 7   | Cloudflare   | 第一次 deploy 之後：Worker `903-player-api` → Settings → Variables and Secrets 加 secret `GOOGLE_CLIENT_SECRET`、`SESSION_SECRET`（`openssl rand -base64 32`）                                                                                                                                                              | 話我知加咗                     |
| 8   | Vercel       | Publish 驗證完：Settings → Environment Variables，Production 加（跳過 Preview） `VITE_CATALOG_URL=https://903-player-api.dcwhung.workers.dev/catalog/v1/catalog.json` → Redeploy                                                                                                                                            | —                              |
| 9   | GitHub       | Repo variable（唔係 secret）`VITE_CATALOG_URL` 同一個值 → 下次 Pages deploy 生效                                                                                                                                                                                                                                            | —                              |

Secret 一律唔好貼落 chat；`GOOGLE_CLIENT_ID`、`ADMIN_EMAILS`、`PLAYER_ORIGINS` 非 secret，放 `wrangler.toml` `[vars]`。（✅ 用戶 2026-11-08 已確認 Vercel Production 而家冇 `VITE_CATALOG_URL`，上個 session 嘅手動確認完成。）

---

## 設定結果（用戶 2026-11-08 完成 1–6）

| #   | 值（全部唔係 secret）                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `dcwhung.workers.dev` → API `https://903-player-api.dcwhung.workers.dev`                                                                                     |
| 2   | D1 `903-player`：`03511373-0025-44c4-90c4-2e1480d75e76`（WEUR）                                                                                              |
| 3   | R2 `903-player-catalog`（WEUR，Public Development URL / Custom Domain 都冇開）；音檔 bucket `radio-drama`（WEUR）→ 2026-11-09 改名 `903-radio-drama`（見下） |
| 4   | Account API token `903-player-github-deploy`：Workers Scripts / D1 / Workers R2 Storage Write，1 年到期                                                      |
| 5   | Google OAuth：External + Testing，test user 得用戶 Gmail；client `678038303553-e1sa3dlsj2mlrf09hvijukbbhksjth4h.apps.googleusercontent.com`                  |
| 6   | GitHub secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`                                                                                              |

追加決定：

- **全部 WEUR**：主要用戶同 admin 都喺西歐；Worker 照加 edge cache（Cache API）做多層保險
- **音檔 bucket 改名 `903-radio-drama`** ✅（PR #196，v1.31.1，2026-11-09）：R2 改唔到名 → 開新 bucket + Cloudflare Super Slurper（R2 Data Migration）copy + 換 `DRAMA_AUDIO_BASE`（4 處：catalog、`dramaFromFolder`、e2e harness、`fetch_sources.py`）+ 舊 bucket 留幾個星期。進度 / 收藏用 episode ID，唔受影響
- **到期提醒**：Cloudflare token 1 年到期（換新 GitHub secret）；Google OAuth client 6 個月冇用會被刪（30 日內可 restore）

## Ops 頁（用戶 2026-11-08 確認 mockup）

- Design Origin：`mockup: _mockups_/admin-ops/index.html`（6 個狀態：未 login、冇權限、主畫面、Publish 成功、ID 守衛拒絕、還原確認）
- 做法 **A**：2a 用最簡工具樣式；Phase 3 admin 嘅 Publish 頁沿用同一套 API 同狀態流程，外觀跟 `_mockups_/admin/` 重畫，到時刪走 ops 頁

## 風險

- 🔴 **Episode ID 變咗 = 用戶進度冇咗**：一致性 test + publish ID 守衛 + 開 flag 前 curl 比較，三重把關
- 🔴 **appAudioBase 改簽名**影響 player 全部集數 URL：一致性 test + 現有每劇 `drama.test.ts` URL pin 鎖住
- 🟡 Worker 喺 player 啟動 critical path：Worker 死 / 慢 → 1.5s 後 fallback SW cache / 內建（Phase 1 已驗）
- 🟡 `crossorigin` 加咗而 CORS header 唔啱 → 圖出唔到：e2e 用 Playwright route 模擬 CORS header；開 Production flag 後即刻真機睇，有問題即刪 env var 退返
- 🟡 Google Testing 模式：只 test user 登入得，符合 whitelist；唔使 Google 審核
- 🟢 Free plan：100k request / 日、D1 / R2 免費額度遠超所需

## 驗證

- Unit（`npm test -- apps/api`、`packages/catalog`）：OAuth state / PKCE / whitelist 拒絕、session 過期、Origin CSRF、publish 守衛（ID 消失拒絕 / force）、rollback、serve 嘅 CORS / Cache-Control / 404、import SQL idempotent、`appAudioBase` 注入
- Player：`catalogJson.test.ts` 一致性 + 受影響 unit；e2e `remoteCatalog` 加 CORS / crossorigin case（CI 跑 full e2e）
- 本地：`wrangler dev --local` → import `--local` → login（localhost redirect）→ publish → player `VITE_CATALOG_URL=http://localhost:8787/...` `npm run dev` 見到同內建一樣
- `npm run lint`、`npx tsc -b`
- 流程：Developer（backend）→ Code Review → QA S1（新鏈 `api`，plan 凍結）→ CI 綠 → merge → DevOps deploy Worker → 用戶做清單 7–9 → 驗收

## 其他

- Branch：今個 session 指定 `claude/sleepy-curie-uuur1k`（由 `main`）
- 批准後先寫 `.proj-docs/plans/2026-11-08_plan_phase2a-backend.md`（本 plan）+ 主計劃 phase 表拆 2a / 2b
- Preview-First：ops 頁先出 `_mockups_/admin-ops/index.html` 確認先寫
- Version：player v1.31.0；api 0.1.0
