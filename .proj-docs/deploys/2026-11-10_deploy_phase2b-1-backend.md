# 部署記錄 — Backend Phase 2b-1（api v0.2.0 + player v1.31.2）

**日期**：2026-11-10 06:50 (UTC)
**環境**：Production（GitHub Pages + Vercel + Cloudflare Worker `903-player-api`）
**版本**：`3a0ec8451e9934ceda6fbf6de8278ecef6411d20`（PR #197 merge commit；`apps/api` 0.1.1 → 0.2.0；`apps/player` 1.31.1 → 1.31.2，淨係 CLI script 改動）
**部署員**：DevOps Agent
**結論**：⚠️ warn — Pages、Vercel、Worker 三個 deploy 都 success，D1 `0002_schedules.sql` 已 apply，新 `AUDIO` binding 已出現；sandbox proxy 封鎖 production host，live smoke test 未能做

## 部署步驟

- [x] Lint & Type Check — ✅ `Deploy` run [42770878606](https://github.com/dcwhung/903-player/actions/runs/42770878606) `build` job「Lint & test」：「All matched files use Prettier code style!」
- [x] Unit Tests — ✅ 同一 step：265 / 265 test files、3127 tests passed；`Deploy API` 喺 workerd 再跑 api test：7 files / 93 tests + 2 files / 16 tests passed
- [x] Integration / E2E — ✅ CI run 42730213299 @ `ccf8e16`（QA S1 pass，見 [qa/2026-11-10_qa_phase2b-1-backend.md](../qa/2026-11-10_qa_phase2b-1-backend.md)；Review 100 pass，見 [reviews/2026-11-10_review_phase2b-1-backend.md](../reviews/2026-11-10_review_phase2b-1-backend.md)）
- [x] Build — ✅ `@903-player/player@1.31.2 build`，precache 80 entries（4243.42 KiB）
- [x] Security Scan — ⚠️ pipeline 冇獨立 security scan stage（現有狀況，唔係今次引入）
- [x] Deploy（GitHub Pages）— ✅ `build`（06:49:49Z）+ `deploy`（06:50:01Z）job success，deployment `7675557332`（env `github-pages`）
- [x] Deploy（Vercel）— ✅ commit status `Vercel` = `success`「Deployment has completed」，2026-11-10T06:48:56Z（[dashboard](https://vercel.com/dcwhungs-projects/903-player/CEpvEnzaVBQ5CKSX73zXciDs6Uzj)）
- [x] D1 migration — ✅ `Deploy API` run [42770878230](https://github.com/dcwhung/903-player/actions/runs/42770878230)：`wrangler d1 migrations apply 903-player --remote` → `0002_schedules.sql` ✅（Executed 2 commands）
- [x] Deploy（Worker）— ✅ `wrangler deploy`（wrangler 4.158.0）→ `https://903-player-api.dcwhung.workers.dev`，Current Version ID `e2478108-b808-4f75-b8e0-b0a4cbdc8419`；static assets 3 個（上載 1 個新、2 個已有）
- [ ] Smoke Test（live）— ⚠️ 未能驗證（proxy 403）

## Worker bindings（deploy log）

| Binding                                                               | 類型                 |
| --------------------------------------------------------------------- | -------------------- |
| `env.DB`（`903-player`）                                              | D1 Database          |
| `env.CATALOG`（`903-player-catalog`）                                 | R2 Bucket            |
| `env.AUDIO`（`903-radio-drama`）— **新**                              | R2 Bucket            |
| `GOOGLE_CLIENT_ID`、`ADMIN_EMAILS`、`PLAYER_ORIGINS`、`WORKER_ORIGIN` | Environment Variable |

`AUDIO` binding deploy 成功，代表 `CLOUDFLARE_API_TOKEN` 對 `903-radio-drama` 有權限；Worker 只會 list / head（`POST /api/dramas/:id/scan`），唔寫。

## Production Smoke Test

| 檢查                                                    | 預期                   | 結果                                                |
| ------------------------------------------------------- | ---------------------- | --------------------------------------------------- |
| `https://903-player-api.dcwhung.workers.dev/api/health` | 200，`version` `0.2.0` | ⚠️ `curl: (56) CONNECT tunnel failed, response 403` |
| ops 頁 Google login                                     | 照常登入               | ⚠️ 未驗證                                           |
| `https://903-player.vercel.app/`                        | v1.31.2                | ⚠️ 未驗證（同一 proxy 限制）                        |
| `https://dcwhung.github.io/903-player/`                 | v1.31.2                | ⚠️ 未驗證                                           |

## 改動摘要

- `apps/api`：content CRUD、R2 scan（`AUDIO` binding）、arc schedule endpoint；publish / auth hardening（S-767、S-768、S-770、S-772、S-773、S-780）；W-703 至 W-705 修正
- D1 `0002_schedules.sql`：新 `schedules` 表（只係新增，唔改現有表）
- `packages/catalog`：抽出 drama folder scan（`scan/`）同 `expandSchedule`（`schedule/`）
- `apps/player`：`scripts/dramaFromFolder` 改用 `packages/catalog` 嘅 scan；淨係 CLI，app bundle 行為冇變，只係 version bump 1.31.1 → 1.31.2

## 指標監察

- Project 冇接 Sentry / Datadog，sandbox 亦連唔到 production，錯誤率 / 延遲未能監察
- Worker 可以喺 Cloudflare dashboard → Workers → `903-player-api` → Metrics / Logs 睇

## 用戶手動驗證步驟

1. `curl https://903-player-api.dcwhung.workers.dev/api/health` → 200，`version` 係 `0.2.0`
2. 開 ops 頁（`https://903-player-api.dcwhung.workers.dev/`），Google login 照常成功
3. 開 `https://903-player.vercel.app/` 同 `https://dcwhung.github.io/903-player/`，確認顯示 `v1.31.2`
4. （可選）ops 頁按 Publish，內容冇改應該回報 `unchanged`（S-780）

**結果（用戶 2026-11-10 確認）**：1 ✅ health 回 0.2.0；2 ✅ ops 頁 Google login 正常；3 ✅ 顯示 v1.31.2。4 未做（可選）。

## 回滾方案

**Worker**

- `npx wrangler rollback d1d42a34-a6d3-496c-925c-4c76ad9ddbe8`（喺 `apps/api`；上一個 version，v1.31.1 deploy 嗰次）
- D1 `0002_schedules.sql` 只係加表，舊 Worker 唔讀佢，回滾 Worker 唔使 down migration；真係要清就 `wrangler d1 execute 903-player --remote --command "DROP TABLE schedules"`，同時要喺 `d1_migrations` 刪返 `0002_schedules.sql` 嗰行，否則之後唔會再 apply

**Player（GitHub Pages + Vercel）**

- 今次 app bundle 行為冇變，一般唔使回滾
- Vercel：dashboard → Deployments → 上一個 production（v1.31.1）→ Promote to Production / Instant Rollback
- 經 git：`git revert -m 1 3a0ec8451e9934ceda6fbf6de8278ecef6411d20`，bump version，開 PR merge 入 main

## 備注

- Sandbox proxy 封鎖 `903-player-api.dcwhung.workers.dev`、`903-player.vercel.app`、`dcwhung.github.io`，只試咗一次，live smoke 要由用戶做
- wrangler 提示有新版 4.159.0（現用 4.158.0），唔影響今次 deploy
- 冇讀取或者輸出任何 secret；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 喺 log 入面已 mask
