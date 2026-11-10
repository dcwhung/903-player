# 部署記錄 — Backend Phase 2b-2（api v0.3.0 + player v1.32.0）

**日期**：2026-11-10 08:30 (UTC)
**環境**：Production（GitHub Pages + Vercel + Cloudflare Worker `903-player-api`）
**版本**：`62972d156c78f7fb568b26761e43c453fe0c4900`（PR #199 merge commit；`apps/api` 0.2.0 → 0.3.0；`apps/player` 1.31.2 → 1.32.0）
**部署員**：DevOps Agent
**結論**：⚠️ warn — Pages、Vercel、Worker 三個 deploy 都 success，D1 `0003_publish_status.sql` 已 apply，Pages build 成功攞到 catalog snapshot；sandbox proxy 封鎖 production host，live smoke test 未能做

## 部署步驟

- [x] Lint & Type Check — ✅ `Deploy` run [42782776103](https://github.com/dcwhung/903-player/actions/runs/42782776103) `build` job「Lint & test」：「All matched files use Prettier code style!」
- [x] Unit Tests — ✅ 同一 step：270 / 270 test files、3166 tests passed；`Deploy API` 喺 workerd 再跑 api test：9 files / 113 tests + 2 files / 16 tests passed
- [x] Integration / E2E — ✅ CI run 42780615952 @ `7286785`（QA S1 pass，見 [qa/2026-11-10_qa_phase2b-2-backend.md](../qa/2026-11-10_qa_phase2b-2-backend.md)；Review 100 pass，見 [reviews/2026-11-10_review_phase2b-2-backend.md](../reviews/2026-11-10_review_phase2b-2-backend.md)）
- [x] Build — ✅ `@903-player/player@1.32.0 build`，precache 80 entries（4262.46 KiB；上次 80 entries / 4243.42 KiB）
- [x] Catalog snapshot — ✅ build log：`[catalog-snapshot] hash a3add2a53873c2a80934f0d14acdedbc26d9794f4c8a728b5bef4d71b682e96d · generatedAt 2026-11-09T22:29:48.328Z · 58 images`（冇 fallback warning；plugin `buildStart` 用咗 3.7s）
- [x] Security Scan — ⚠️ pipeline 冇獨立 security scan stage（現有狀況，唔係今次引入）
- [x] Deploy（GitHub Pages）— ✅ `build`（08:30:05Z）+ `deploy`（08:30:19Z）job success，deployment `7677205617`（env `github-pages`，`https://dcwhung.github.io/903-player/`）
- [x] Deploy（Vercel）— ✅ commit status `Vercel` = `success`「Deployment has completed」，2026-11-10T08:28:59Z（[dashboard](https://vercel.com/dcwhungs-projects/903-player/7uLxUwgcEfjLYWe5U3gJuu5c6S4m)）
- [x] D1 migration — ✅ `Deploy API` run [42782776079](https://github.com/dcwhung/903-player/actions/runs/42782776079)：`wrangler d1 migrations apply 903-player --remote` → `0003_publish_status.sql` ✅（Executed 2 commands）
- [x] Deploy（Worker）— ✅ `wrangler deploy`（wrangler 4.158.0）→ `https://903-player-api.dcwhung.workers.dev`，Current Version ID `3e719f5c-30f1-4cd2-bf27-1ebdbc03cf4d`；static assets 3 個（冇需要更新）；bindings 同上次一樣（`DB`、`CATALOG`、`AUDIO` + 4 個 env var）
- [ ] Smoke Test（live）— ⚠️ 未能驗證（proxy 403）

## Catalog snapshot

| 項目            | 值                                                                 |
| --------------- | ------------------------------------------------------------------ |
| hash            | `a3add2a53873c2a80934f0d14acdedbc26d9794f4c8a728b5bef4d71b682e96d` |
| generatedAt     | `2026-11-09T22:29:48.328Z`                                         |
| images          | 58                                                                 |
| precache 數     | 80（同上次一樣；size +19 KiB）                                     |
| 同最新 publish  | ⚠️ 未能比較（sandbox 連唔到 Worker）— 要用戶喺 ops 頁對            |
| Vercel 有冇攞到 | ⚠️ 未知 — Vercel build log 喺 sandbox 睇唔到                       |

GitHub runner 連到 Worker 同 catalog 圖片 host，所以 Pages build 用嘅係 snapshot，唔係 repo library。Vercel 係另一個 build，要喺 Vercel dashboard 嘅 build log 搵 `[catalog-snapshot] hash …`（如果見到 `failed, using the repo library` 就代表 Vercel 用咗 repo library，唔算 deploy 失敗，但要跟進）。

## Production Smoke Test

| 檢查                                                    | 預期                     | 結果                                         |
| ------------------------------------------------------- | ------------------------ | -------------------------------------------- |
| `https://903-player-api.dcwhung.workers.dev/api/health` | 200，`version` `0.3.0`   | ⚠️ `HTTP/1.1 403 Forbidden`（sandbox proxy） |
| ops 頁 publish 列表                                     | 有 status 欄、標 current | ⚠️ 未驗證                                    |
| `https://903-player.vercel.app/`                        | v1.32.0                  | ⚠️ 未驗證（同一 proxy 限制）                 |
| `https://dcwhung.github.io/903-player/`                 | v1.32.0                  | ⚠️ 未驗證                                    |

## 改動摘要

- `apps/api`：`PUT /api/assets`（ops 上載圖片入 R2）；S-786 publish 失敗標 `failed`，unchanged / episode 守衛 / 「publish 緊」只睇最新 `status = 'ok'` 嗰行；S-787
- D1 `0003_publish_status.sql`：`publishes` 加 `status` 欄（`NOT NULL DEFAULT 'ok'`，CHECK `ok` / `failed`），舊行自動係 `ok`
- `apps/player`：build-time catalog snapshot Vite plugin（`scripts/catalogSnapshot.ts`），production build 喺 `buildStart` 攞最新 publish 連圖包入 bundle；失敗 / e2e / 冇 URL → repo library

## 指標監察

- Project 冇接 Sentry / Datadog，sandbox 亦連唔到 production，錯誤率 / 延遲未能監察
- Worker 可以喺 Cloudflare dashboard → Workers → `903-player-api` → Metrics / Logs 睇

## 用戶手動驗證步驟

1. `curl https://903-player-api.dcwhung.workers.dev/api/health` → 200，`version` 係 `0.3.0`
2. 開 `https://903-player.vercel.app/` 同 `https://dcwhung.github.io/903-player/`，確認顯示 `v1.32.0`
3. 開 ops 頁（`https://903-player-api.dcwhung.workers.dev/`），Google login 後 publish 列表照常顯示，有 status 欄，current 嗰個有標記
4. 喺 ops 頁對最新 publish 嘅 hash（亦即 `catalog.json` 嘅 ETag / `publishes.hash`）係咪 `a3add2a5…b682e96d`；唔同即係 build 之後再 publish 過，或者 snapshot 攞錯版本
5. Vercel dashboard 嗰次 deployment 嘅 build log，搵 `[catalog-snapshot] hash …`，hash 應該同上面一樣
6. （可選）新裝 PWA 後開飛航模式第一次開 app，封面圖照樣顯示

## 回滾方案

**Worker**

- `npx wrangler rollback e2478108-b808-4f75-b8e0-b0a4cbdc8419`（喺 `apps/api`；上一個 version，Phase 2b-1 / api 0.2.0）
- D1 `0003_publish_status.sql` 只係加欄（有 default），舊 Worker insert 唔填 `status` 都會係 `ok`，回滾 Worker 唔使 down migration。要注意：舊 Worker 唔識 `failed`，如果已經有 `failed` 行，舊 Worker 會當佢係有效 publish 睇
- 真係要清欄：`wrangler d1 execute 903-player --remote --command "ALTER TABLE publishes DROP COLUMN status"`，同時喺 `d1_migrations` 刪返 `0003_publish_status.sql` 嗰行

**Player（GitHub Pages + Vercel）**

- Vercel：dashboard → Deployments → 上一個 production（v1.31.2）→ Promote to Production / Instant Rollback
- 經 git：`git revert -m 1 62972d156c78f7fb568b26761e43c453fe0c4900`，bump version，開 PR merge 入 main
- Snapshot 有問題但唔想 revert：production build 冇 catalog URL 或者 fetch 失敗都會 fallback 用 repo library

## 備注

- Sandbox proxy 封鎖 `903-player-api.dcwhung.workers.dev`、`903-player.vercel.app`、`dcwhung.github.io`，只試咗一次，live smoke 要由用戶做
- wrangler 提示有新版 4.159.0（現用 4.158.0），唔影響今次 deploy
- Build log 有 `/903-player/splash/*.webp didn't resolve at build time` 提示，係現有狀況，runtime 先 resolve
- 冇讀取或者輸出任何 secret；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 喺 log 入面已 mask
