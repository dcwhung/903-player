# 903-player：Backend Admin + Runtime Catalog 計劃

## Context

而家所有節目 / 廣播劇 / 短篇都係 build-time：`src/catalog/{dramas,shows}/library/<id>/` 入面嘅 `drama.json` / `show.json` 同 webp 會打包入 bundle，再由 SW precache。上架 / 下架日期其實已經係 runtime 用 `hkToday()` 判斷，但係**任何改動**（加劇、加短篇、改日期、換封面）都要 commit + deploy。

目標：

- 加一個 Cloudflare 上嘅 backend admin 管內容
- frontend 改為 runtime 讀 publish 出嚟嘅 `catalog.json`
- 上下架唔使再 rebuild

## 已確認決定（grill 結果）

| 項目              | 決定                                                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend stack     | Cloudflare Workers + Hono（TypeScript）+ D1（SQLite）+ R2 binding                                                                                                                                                |
| Frontend 點攞資料 | Admin 撳「Publish」→ 寫 `catalog/v1/catalog.json` + 圖片上 R2 public；frontend fetch，stale-while-revalidate                                                                                                     |
| 管理範圍          | Show + 廣播劇 + 短篇（arc）+ 集數 + banner                                                                                                                                                                       |
| Cover             | Admin 頁 browser canvas 生 candidate（center / fit-blur / fit-extend）+ MediaPipe face 偵測做初始 crop，可以拖改，即場 preview disc / tile                                                                       |
| Theme             | 由 disc 自動抽色生成 10 色 palette + color picker 微調 + contrast 檢查                                                                                                                                           |
| Login             | 自己整嘅 login page +「用 Google 登入」（OAuth），whitelist 淨係 `donald.cw.hung@gmail.com`；HttpOnly session cookie                                                                                             |
| R2 集數           | Admin 撳「從 R2 掃描」→ 用現有 `dramaFromFolder` 邏輯 parse 檔名 → 覆核 → 存入 D1                                                                                                                                |
| 排程              | 指定日期、固定週期（由 X 日起每 N 日 / 星期上 M 集）、上架後 N 日自動下架；backend 展開成每集日期寫入 `catalog.json`，frontend availability 邏輯唔使改                                                           |
| Banner            | 單一 banner（窄版 + 闊版）換圖                                                                                                                                                                                   |
| 上載格式          | Banner / CD cover admin 接受 PNG 或 WebP；browser 喺上載前 resize 去目標尺寸（disc 正方、tile 1216×684、banner 窄 / 闊）再轉 WebP，所以 R2 同 player 只會有 WebP。API 只收 `image/webp`，會驗 magic bytes 同尺寸 |
| Show grid         | 動態 grid，要先做 `_mockups_` preview                                                                                                                                                                            |
| Audio 上載        | 繼續自己用 CF dashboard / rclone 上 R2；admin 只負責掃描                                                                                                                                                         |
| Domain            | Admin + API 同一個 Worker（Workers static assets），用 `*.workers.dev`                                                                                                                                           |
| Repo              | Monorepo，**唔使開新 GitHub repo**：同一個 `dcwhung/903-player` 轉 npm workspaces                                                                                                                                |
| Fallback          | Build 時 prebuild script fetch R2 上**最新** published `catalog.json` bundle 做 snapshot（即每次 build 都係最新）；runtime 再背景更新                                                                            |

## 架構

```
admin (React SPA) ──► Worker /api (Hono) ──► D1 (drafts, schedule, users, sessions)
                              │
                              ├─ R2 binding: list audio folders, store images
                              └─ Publish: catalog.json + hashed images ─► R2 public (CDN)
player PWA ──fetch──► catalog.json (SWR + bundled snapshot fallback)
audio ─────────────► R2 (unchanged URLs, they are progress keys)
```

## Monorepo 結構

```
apps/player/      現有 PWA（由 root 搬入；Vercel Root Directory + deploy.yml path 要改）
apps/admin/       React + Vite admin SPA
apps/api/         Hono Worker（wrangler.toml：D1、R2 binding、static assets = admin dist）
packages/catalog/ 由 src/catalog/{core,dramas/lib,shows/lib} 抽出：
                  schema / reader / availability / filename / episodes / registry
                  + catalog.json 型別同 validator（player、api、admin 三邊共用）
```

## Backend（apps/api）要做

1. **D1 schema + migration**
    - Tables：`users`、`sessions`、`shows`、`dramas`、`arcs`、`episodes`、`schedules`、`assets`、`banner`、`publishes`
    - 一張 publish 記錄存一份 snapshot 同 hash，方便 rollback
2. **Auth**：
    - Google OAuth（PKCE）→ 驗證 email 喺 whitelist（env var `ADMIN_EMAILS`）
    - Session cookie 設 `HttpOnly; Secure; SameSite=Lax`
    - 全部 `/api/*` 加 middleware
    - Secret（`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET`）用 `wrangler secret`
3. **CRUD API**：
    - Shows、dramas、arcs、episodes（titles、files override）、banner
    - Request 用 `packages/catalog` 嘅 validator 驗證（同 frontend 一套規則）
4. **R2 掃描**：
    - `POST /api/dramas/:id/scan` 用 R2 binding list `<folder>/<arc>/`
    - 套 `renderFileName` / `dramaFromFolder` 邏輯，回傳 diff（新增 / 消失 / 唔 match 模板）俾 admin 覆核
    - `dramaFromFolder.mjs` 核心要抽入 `packages/catalog`
5. **排程展開**：
    - `expandSchedule(rule) → episodeDates / episodeRemovedAt`
    - 三種規則：指定日期 / 週期 / 上架後 N 日下架
    - Pure function，unit test 覆蓋邊界（HK 時區、跨月）
6. **Asset 上載**：
    - `PUT /api/assets` 收 browser 處理好嘅 webp
    - 用 content-hash 命名存 R2：`catalog/img/<hash>.webp`，immutable cache
7. **Publish**：
    - Build `catalog.json`（schemaVersion、generatedAt、shows、dramas、banner）
    - 用 validator 驗證，唔過就拒絕
    - 寫 R2（`Cache-Control: max-age=60`）
    - 記錄 publish history；rollback = 重新 publish 舊 snapshot
8. **Migration script**：
    - 將現有 7 個 show + 6 個 drama 嘅 JSON + webp 匯入 D1 / R2
    - 驗證 publish 出嚟嘅 `catalog.json` 生成嘅 episode URL **同現有完全一樣**（progress key 唔可以變；每劇現有 `drama.test.ts` pin 住 URL，可以重用做驗收）

## Frontend player（apps/player）要做

1. **Catalog 來源改 async**：
    - 新增 `CatalogProvider`（仿 `src/data/RecordingsProvider.tsx`）
    - Bundled snapshot 即刻 render，然後 fetch `catalog.json`，validate 通過先換
    - 新增 `remoteSource`（`FolderSource` 已預留接口，見 `src/catalog/core/folderSource.ts`）
2. **拆 module-level registry**：
    - 而家 `src/catalog/dramas/index.ts` / `shows/index.ts` 喺 import 時就 build，約 25 個檔直接 call `SHOWS`、`findShow`、`enabledDramas()`
    - 改為 context hook（`useCatalog()`）或者 selector 收 registry 參數
    - 呢個係最大嘅 refactor，要先做，獨立 PR
    - `recordingValidation.ts` 嘅 `SHOW_IDS` 都要改
3. **Prebuild snapshot**：
    - `scripts/fetchCatalogSnapshot.mjs` 喺 build 前 fetch 最新 published `catalog.json`
    - Fetch 失敗就用 repo 入面 commit 咗嘅版本
4. **SW runtime caching**：
    - `catalog.json` 用 StaleWhileRevalidate
    - R2 圖片（hashed）用 CacheFirst
    - 唔再 precache library webp
5. **Banner** 改讀 `catalog.banner`，冇就用現有 `src/assets` 做 default
6. **動態 show grid**：
    - 先做 `_mockups_/dynamic-show-grid/index.html` 交你確認
    - 再改 `ShowGrid.module.css` / `HomeLandscapeGrid`
7. **E2E**：
    - Fixture 改用 mock `catalog.json`（取代 `withE2EFixtures`）
    - `e2e/sampleData.mjs` 改為由 fixture 讀
8. **Version bump**：Runtime catalog 係 MINOR（v1.29.0）

## Admin（apps/admin）要做

- Login 頁（Google 按鈕）
- 列表：Shows / Dramas
- Drama 詳情：基本資料、arcs、集數表（R2 掃描 diff）、排程規則 + 展開後日曆 preview
- Cover 編輯器：
    - 上載 PNG / WebP，或者揀 R2 `cover photo`；用 canvas 輸出 WebP（Safari 唔支援 `toBlob('image/webp')` 嘅話就 fallback 用 wasm encoder）
    - 生成 candidate + face 偵測初始 crop
    - 拖 crop 框
    - Disc / tile preview：重用 player 嘅 disc CSS
- Theme 編輯器：抽色、picker、contrast
- Banner 上載（窄 + 闊，收 PNG / WebP，resize + 轉 WebP）
- Publish 頁：同上次 publish 嘅 diff、validate 結果、publish、history / rollback
- UI 新畫面要跟 Preview-First：先做 `_mockups_/admin/` 俾你確認

## 分 phase（每 phase 獨立 PR）

| Phase | 內容                                                                                                                                       | 前置 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 0     | Monorepo 搬 folder + 抽 `packages/catalog`（純 refactor，行為唔變）+ 改 Vercel / CI                                                        | —    |
| 1     | Player：registry 改 context + `catalog.json` 讀取 + bundled snapshot + SW caching（用 repo 現有 JSON 生成 `catalog.json`，未需要 backend） | 0    |
| 2     | API：D1 schema、Google login、CRUD、migration script、publish                                                                              | 0    |
| 3     | Admin 基本：login、CRUD、R2 scan、排程、publish（`_mockups_/admin` 確認後）                                                                | 2    |
| 4     | Admin cover 編輯器 + theme 抽色 + banner                                                                                                   | 3    |
| 5     | Player 動態 show grid（mockup 確認後）                                                                                                     | 1    |

Phase 1 完成之後 player 已經同 backend 解耦：就算 backend 未完成，都可以手動放 `catalog.json` 上 R2 去用。

## 風險

- 🔴 Episode URL = localStorage progress key：migration 同 publish 都要 assert URL 一樣
- 🔴 Phase 0 搬 folder 會影響 Vercel Root Directory、GitHub Pages `deploy.yml`、e2e path、`tsconfig`：要喺同一個 PR 改齊，同埋要你喺 Vercel dashboard 改 Root Directory
- 🟡 R2 public bucket 要開 CORS 俾 player origin fetch `catalog.json`
- 🟡 Google OAuth 要你喺 Google Cloud Console 開 OAuth client（redirect URI = workers.dev domain）
- 🟡 Admin 改咗但未 publish 嘅 draft 狀態要清楚顯示

## 驗證

- `packages/catalog`：現有 catalog unit test 全部搬過去，照綠
- Migration：生成嘅 `catalog.json` 經 player 讀，每劇 `drama.test.ts` pin 住嘅 URL / 集數一樣
- API：Vitest + `@cloudflare/vitest-pool-workers` 測 auth whitelist、scan diff、`expandSchedule`、publish validator
- Player：`npm test` + `npm run e2e`（fixture `catalog.json`；offline 第一次開用 snapshot）
- 手動：`wrangler dev` 本地跑 admin → 改日期 → publish → player 唔 rebuild 都見到變化
