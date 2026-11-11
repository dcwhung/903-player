# 部署記錄 — Phase 3a admin 資料欄位 + admin API（api v0.4.0 + player v1.33.0）

**日期**：2026-11-10 19:07 (UTC)
**環境**：Production（GitHub Pages + Vercel + Cloudflare Worker `903-player-api`）
**版本**：`44709a0828c18b7e88b27387ad2c9a4c6aa8c491`（PR #200 merge commit；`apps/api` 0.3.0 → 0.4.0；`apps/player` 1.32.0 → 1.33.0）
**部署員**：DevOps Agent
**結論**：⚠️ warn — Pages、Vercel、Worker 三個 deploy 都 success，D1 `0004_admin.sql` 已 apply，Pages build 攞到 catalog snapshot；sandbox proxy 封鎖 production host，live smoke test 同 admin endpoint 檢查要用戶手動做

## 部署步驟

- [x] Lint & Type Check — ✅ `Deploy` run [42881254776](https://github.com/dcwhung/903-player/actions/runs/42881254776) `build` job「Lint & test」：「All matched files use Prettier code style!」
- [x] Unit Tests — ✅ 同一 step：279 / 279 test files、3327 tests passed；`Deploy API` 喺 workerd 再跑 api test：12 files / 153 tests + 2 files / 16 tests passed（log 入面 `network down` / `R2 down` 係 test 故意整嘅錯誤分支 stderr）
- [x] Integration / E2E — ✅ CI run 42878341996 @ `6e67400`（e2e 780 PASS / 0 FAIL；QA S1 pass，見 [qa/2026-11-10_qa_phase3a-admin-api.md](../qa/2026-11-10_qa_phase3a-admin-api.md)；Review re-review pass 100，見 [reviews/2026-11-10_review_phase3a-admin-api.md](../reviews/2026-11-10_review_phase3a-admin-api.md)）
- [x] Build — ✅ `@903-player/player@1.33.0 build`，precache 80 entries（4264.93 KiB；上次 80 entries / 4262.46 KiB）
- [x] Catalog snapshot — ✅ build log：`[catalog-snapshot] hash a3add2a53873c2a80934f0d14acdedbc26d9794f4c8a728b5bef4d71b682e96d · generatedAt 2026-11-09T22:29:48.328Z · 58 images`（同 v1.32.0 一樣，之後冇再 publish；冇 fallback warning；plugin `buildStart` 5.6s）
- [x] Security Scan — ⚠️ pipeline 冇獨立 security scan stage（現有狀況，唔係今次引入）
- [x] Deploy（GitHub Pages）— ✅ `build`（19:07:02Z）+ `deploy`（19:07:19Z）job success，deployment `7691575995`（env `github-pages`，`https://dcwhung.github.io/903-player/`）
- [x] Deploy（Vercel）— ✅ commit status `Vercel` = `success`「Deployment has completed」，2026-11-10T19:03:47Z（[dashboard](https://vercel.com/dcwhungs-projects/903-player/3piFFeUZE4B24u8ejW4zXvdKVEq3)）
- [x] D1 migration — ✅ `Deploy API` run [42881254973](https://github.com/dcwhung/903-player/actions/runs/42881254973)：`wrangler d1 migrations apply 903-player --remote` → `0004_admin.sql` ✅（Executed 5 commands：2 個 `ALTER TABLE`、`CREATE TABLE scan_findings`、`CREATE INDEX scan_findings_open` + migration 記錄）
- [x] Deploy（Worker）— ✅ `wrangler deploy`（wrangler 4.158.0）→ `https://903-player-api.dcwhung.workers.dev`，Total Upload 236.38 KiB / gzip 60.45 KiB，Current Version ID `5d56f77b-f898-4d75-9e8e-6ba8ec3b9119`；static assets 3 個（冇需要更新）；bindings 同上次一樣（`DB`、`CATALOG`、`AUDIO` + 4 個 env var）
- [ ] Smoke Test（live）— ⚠️ 未能驗證（proxy 403）

## Catalog snapshot

| 項目            | 值                                                                 |
| --------------- | ------------------------------------------------------------------ |
| hash            | `a3add2a53873c2a80934f0d14acdedbc26d9794f4c8a728b5bef4d71b682e96d` |
| generatedAt     | `2026-11-09T22:29:48.328Z`                                         |
| images          | 58                                                                 |
| precache 數     | 80（同上次一樣；size +2.5 KiB）                                    |
| 同最新 publish  | ✅ 同 v1.32.0 deploy 用戶確認嘅 Publish #1 hash 一樣               |
| Vercel 有冇攞到 | ⚠️ 未知 — Vercel build log 喺 sandbox 睇唔到                       |

Pages `build` job（19:02:37Z 開始）同 Worker deploy（19:03:50Z 完）係並行，snapshot 可能經舊 Worker 攞；`catalog.json` 由 R2 出，兩個版本出嘅內容一樣，唔影響。

## Production Smoke Test

| 檢查                                                    | 預期                   | 結果                                         |
| ------------------------------------------------------- | ---------------------- | -------------------------------------------- |
| `https://903-player-api.dcwhung.workers.dev/api/health` | 200，`version` `0.4.0` | ⚠️ `HTTP/1.1 403 Forbidden`（sandbox proxy） |
| `https://903-player.vercel.app/`                        | v1.33.0                | ⚠️ 未驗證（同一 proxy 限制）                 |
| `https://dcwhung.github.io/903-player/`                 | v1.33.0                | ⚠️ 未驗證                                    |
| admin endpoint（見下面用戶手動步驟）                    | 見各步                 | 用戶手動（要 Google session）                |

## 改動摘要

- `apps/api`：Phase 3a admin API（`apps/api/src/admin/*`）— `POST /api/scan`（自動掃描 + findings、新資料夾建 draft 劇）、待辦矩陣、rename、folders、`PUT /api/order/:kind`（拖曳排序，`json_set`）、`GET /api/changes`（D1 vs 最新 ok publish）、`/api/publishes` 加 `changes` / `error`；ID 守衛只鎖上架過嘅（C-013、W-707）
- D1 `0004_admin.sql`：`entries.draft`（`NOT NULL DEFAULT 0`，CHECK 0 / 1）、新表 `scan_findings` + index `scan_findings_open`、`publishes.error`（nullable）
- `packages/catalog` / `apps/player`：show / arc 新欄位（`enabled`、`displayName` 等），`arcLabelOf` 統一短篇 label；`enabled: false` 嘅節目 / 短篇唔顯示

## 指標監察

- Project 冇接 Sentry / Datadog，sandbox 亦連唔到 production，錯誤率 / 延遲未能監察
- Worker 可以喺 Cloudflare dashboard → Workers → `903-player-api` → Metrics / Logs 睇（留意 `/api/scan`、`/api/order/*` 有冇 5xx）

## 用戶手動驗證步驟

步驟 3–7 喺 ops 頁（`https://903-player-api.dcwhung.workers.dev/`）Google login 之後，同一個 tab 開 DevTools Console 貼（same-origin，cookie 自動帶）。步驟 3、5 會寫 D1，但喺「冇改動」情況下應該乜都唔寫。

1. `curl https://903-player-api.dcwhung.workers.dev/api/health` → 200，`version` 係 `0.4.0`
2. 開 `https://903-player.vercel.app/` 同 `https://dcwhung.github.io/903-player/`，確認顯示 `v1.33.0`，節目 / 劇集 / 短篇名照常顯示
3. 遠端 D1 0004（CI log 已見 ✅，可再確認）：Cloudflare dashboard → D1 → `903-player` → Console 跑 `SELECT name FROM d1_migrations ORDER BY id;` → 最後一行 `0004_admin.sql`；`PRAGMA table_info(entries);` 有 `draft`；`PRAGMA table_info(publishes);` 有 `error`
4. `POST /api/scan` 冇新嘢 → `findings` 空：

    ```js
    await (await fetch('/api/scan', { method: 'POST', credentials: 'same-origin' })).json();
    ```

    預期 `findings: []`、`skipped: []`（或者只有已知要跳過嘅資料夾）。如果有 finding，記低內容（可能係 R2 真係有新集數 / 資料夾，唔一定係 bug）

5. `GET /api/changes` 冇改動：

    ```js
    await (await fetch('/api/changes', { credentials: 'same-origin' })).json();
    ```

    預期 `base` = 最新 ok publish id，`changes` 冇任何新增 / 修改 / 刪除，`validation` 冇 error

6. 真 D1 跑 `PUT /api/order/dramas`（S-799，`json_set` 綁數字）— 用現有次序 PUT 返一次，唔會改到次序：

    ```js
    const { entries } = await (await fetch('/api/entries', { credentials: 'same-origin' })).json();
    const listed = entries.filter((e) => e.kind === 'dramas' && e.enabled === true && !e.draft);
    const defs = await Promise.all(
        listed.map(async (e) => ({
            id: e.id,
            order: (
                await (
                    await fetch(`/api/entries/dramas/${e.id}`, { credentials: 'same-origin' })
                ).json()
            ).definition.order,
        })),
    );
    const ids = defs.sort((a, b) => a.order - b.order).map((d) => d.id);
    console.log(ids);
    const res = await fetch('/api/order/dramas', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
    });
    console.log(res.status, await res.json());
    ```

    預期 `200`，`ids` 同送出一樣，`changed` 係 0 / 空（如果原本 order 唔係 1、2、3… 連續，會重新編號，屬正常）；之後再跑步驟 5，`changes` 唔應該出現次序以外嘅改動；之後 `GET /api/entries/dramas/<id>` 嘅 `definition.order` 係數字（唔係字串）

7. `/api/publishes` 舊行：

    ```js
    await (await fetch('/api/publishes', { credentials: 'same-origin' })).json();
    ```

    預期舊 publish 行照常列出，`status` `ok`，`error: null`，有 `changes` 欄；ops 頁 publish 列表照常顯示

8. Vercel dashboard 嗰次 deployment 嘅 build log，搵 `[catalog-snapshot] hash …`，hash 應該係 `a3add2a5…b682e96d`

## 回滾方案

**Worker**

- `npx wrangler rollback 3e719f5c-30f1-4cd2-bf27-1ebdbc03cf4d`（喺 `apps/api`；上一個 version，Phase 2b-2 / api 0.3.0）
- D1 `0004_admin.sql` 係純加法（`draft` 有 default 0、`error` nullable、`scan_findings` 新表），舊 Worker 唔識呢啲欄 / 表但唔會出錯，回滾 Worker 唔使 down migration。要注意：如果回滾前已經用 `POST /api/scan` 建咗 draft 劇（`draft = 1`、`enabled: false`），舊 Worker 唔識 `draft`，publish 會當佢係普通 entry 處理（未齊圖 / ID 可能令驗證失敗、publish 唔到）；回滾前先喺 D1 睇 `SELECT kind, id FROM entries WHERE draft = 1;`，有就先處理（刪走或者補齊）
- 真係要清：`DROP TABLE scan_findings;`、`ALTER TABLE entries DROP COLUMN draft;`、`ALTER TABLE publishes DROP COLUMN error;`（經 `wrangler d1 execute 903-player --remote --command …`），同時喺 `d1_migrations` 刪返 `0004_admin.sql` 嗰行；`draft` 有 CHECK constraint，SQLite 可能唔准 DROP COLUMN，要重建表 — 唔建議，除非必要

**Player（GitHub Pages + Vercel）**

- Vercel：dashboard → Deployments → 上一個 production（v1.32.0）→ Promote to Production / Instant Rollback
- 經 git：`git revert -m 1 44709a0828c18b7e88b27387ad2c9a4c6aa8c491`，bump version，開 PR merge 入 main（會連 api 一齊 revert；只想回滾 Worker 就用上面 `wrangler rollback`）

## 備注

- Sandbox proxy 封鎖 `903-player-api.dcwhung.workers.dev`（`CONNECT tunnel failed, response 403`），只試咗一次，live smoke 同 admin endpoint 要由用戶做
- wrangler 提示有新版 4.160.0（現用 4.158.0），唔影響今次 deploy
- Build log 有 `/903-player/splash/*.webp didn't resolve at build time` 提示，係現有狀況，runtime 先 resolve
- 冇讀取或者輸出任何 secret；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 喺 log 入面已 mask
