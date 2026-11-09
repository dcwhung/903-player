# 部署記錄 — Backend Phase 2a（player v1.31.0 + api v0.1.0）

**日期**：2026-11-09 09:43 (UTC)
**環境**：Production（GitHub Pages + Vercel + Cloudflare Worker `903-player-api`）
**版本**：`be8575fcd3d1be5f5008d55bb3225b963f1b2360`（PR #193 merge commit；`apps/player` 1.30.0 → 1.31.0；新 `apps/api` 0.1.0）
**部署員**：DevOps Agent
**結論**：⚠️ warn — GitHub Pages 同 Worker 首次 deploy 都 success；Vercel 冇 post commit status（merge 後 10 分鐘仍然冇）；sandbox proxy 封鎖三個 production host，live smoke test 未能做

## 部署步驟

- [x] Lint & Type Check — ✅ `Deploy` run [42595181990](https://github.com/dcwhung/903-player/actions/runs/42595181990) `build` job「Lint & test」：`eslint . && prettier --check .` →「All matched files use Prettier code style!」
- [x] Unit Tests — ✅ 同一 step：257 files / 3027 tests passed；`Deploy API` 喺 workerd 再跑 api test：4 + 2 files、47 + 16 tests passed
- [x] Integration / E2E — ✅（QA S1 @ `5190aa5`：CI 42579655596 e2e 779 / 0，見 [qa/2026-11-09_qa_phase2a-backend.md](../qa/2026-11-09_qa_phase2a-backend.md)）
- [x] Build — ✅ `@903-player/player@1.31.0 build`，precache 80 entries（4240.53 KiB）；`VITE_CATALOG_URL` 空 = runtime catalog 關住
- [x] Security Scan — ⚠️ pipeline 冇獨立 security scan stage（現有狀況，唔係今次引入）
- [x] Deploy（GitHub Pages）— ✅ `build` + `deploy` job success（09:43:04Z），deployment `7651493142`（env `github-pages`，status `success`，`https://dcwhung.github.io/903-player/`）
- [x] D1 migration — ✅ `Deploy API` run [42595181958](https://github.com/dcwhung/903-player/actions/runs/42595181958)：`wrangler d1 migrations apply 903-player --remote` → `0001_init.sql` ✅（6 commands）
- [x] Deploy（Worker）— ✅ `wrangler deploy`（wrangler 4.158.0）→ `https://903-player-api.dcwhung.workers.dev`，Version ID `f6417e0f-c680-4272-af7e-3b1f2e16df20`；static assets 3 個（`index.html`、`ops.css`、`ops.js`）
- [ ] Deploy（Vercel）— ⚠️ 未確認：`be8575f` 冇 `Vercel` commit status（之前 `dce3a9d`、`7ea239b`、`2666780` 都喺 merge 後 ~2 分鐘有「Deployment has completed」）
- [ ] Smoke Test（live）— ⚠️ 未能驗證（proxy 403）

## Worker bindings（deploy log）

| Binding                                                               | 類型                 |
| --------------------------------------------------------------------- | -------------------- |
| `env.DB`（`903-player`）                                              | D1 Database          |
| `env.CATALOG`（`903-player-catalog`）                                 | R2 Bucket            |
| `GOOGLE_CLIENT_ID`、`ADMIN_EMAILS`、`PLAYER_ORIGINS`、`WORKER_ORIGIN` | Environment Variable |

`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET` 唔經 CI，要用戶喺 Cloudflare 設（`apps/api/README.md` setup 第 7 步）；未設之前 Google login 用唔到，屬預期，唔係 deploy 失敗。

## Production Smoke Test

| 檢查                                                    | 預期                   | 結果                                                |
| ------------------------------------------------------- | ---------------------- | --------------------------------------------------- |
| `https://dcwhung.github.io/903-player/`                 | v1.31.0                | ⚠️ `curl: (56) CONNECT tunnel failed, response 403` |
| `https://903-player.vercel.app/`                        | v1.31.0                | ⚠️ 同上                                             |
| `https://903-player-api.dcwhung.workers.dev/api/health` | 200，`version` `0.1.0` | ⚠️ 同上                                             |
| `…/`                                                    | ops 頁 HTML            | ⚠️ 未驗證                                           |
| `…/catalog/v1/catalog.json`                             | 404（未 publish）      | ⚠️ 未驗證                                           |
| `…/api/me`                                              | 401                    | ⚠️ 未驗證                                           |

## 改動摘要

- 新 `apps/api` Cloudflare Worker：D1 schema（`0001_init.sql`）、Google login、catalog import / publish / serve（R2）、ops 頁
- 新 `.github/workflows/deploy-api.yml`：main push 改到 `apps/api` / `packages/catalog` 先跑；test → D1 migration → `wrangler deploy`
- Player v1.31.0：runtime catalog 經 `VITE_CATALOG_URL`（repo variable）開關；今次 build 個 variable 係空，所以 production 行為同 v1.30.0 一樣，唔會 call Worker

## 指標監察

- Project 冇接 Sentry / Datadog，sandbox 亦連唔到 production，錯誤率 / 延遲未能監察
- Worker 可以喺 Cloudflare dashboard → Workers → `903-player-api` → Metrics / Logs 睇

## 用戶手動驗證步驟

1. Vercel dashboard → 903-player → Deployments：睇 `be8575f` 有冇 production deployment；冇就 Redeploy（或者 push 下一個 commit 觸發），失敗就睇 build log（今次 root `npm ci` 多咗 `apps/api` 嘅 wrangler / workerd devDependencies）
2. 開 `https://903-player.vercel.app/` 同 `https://dcwhung.github.io/903-player/`，確認顯示 `v1.31.0`；已裝 PWA 應該彈更新提示
3. Worker：`curl https://903-player-api.dcwhung.workers.dev/api/health`（`0.1.0`）、`/`（ops 頁）、`/catalog/v1/catalog.json`（404）、`/api/me`（401）
4. 設 Worker secrets `GOOGLE_CLIENT_SECRET`、`SESSION_SECRET`（setup 第 7 步）之後再試 Google login

## 回滾方案

**Player（GitHub Pages + Vercel）**

- Vercel：dashboard → Deployments → 上一個 production（`dce3a9d`，v1.30.0）→ Promote to Production / Instant Rollback
- 經 git：`git revert -m 1 be8575fcd3d1be5f5008d55bb3225b963f1b2360`，bump version（例如 1.31.1），開 PR merge 入 main（PWA 要新 `sw.js` 先會更新）

**Worker**

- 今次係首次 deploy，冇上一個 version 可以 `wrangler rollback`；player 冇 call Worker（flag 關），所以 Worker 有問題唔影響用戶
- 要停：Cloudflare dashboard → Workers → `903-player-api` → Settings 停用 `workers.dev` route，或者 `npx wrangler delete`（喺 `apps/api`）
- D1 `0001_init.sql` 只建表；回滾唔使 down migration，除非要清走 DB

## 備注

- Sandbox proxy 封鎖 `dcwhung.github.io`、`903-player.vercel.app`、`903-player-api.dcwhung.workers.dev`，live smoke 同 header 檢查要由用戶做
- Vercel `check-suite` 喺之前嘅 commit 都係 `queued`，冇參考價值；判斷要睇 commit status `Vercel`
- 冇讀取或者輸出任何 secret；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 喺 log 入面已 mask
