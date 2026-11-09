# 903-player：Backend Admin + Runtime Catalog 計劃

## Context

而家所有節目 / 廣播劇 / 短篇都係 build-time：`src/catalog/{dramas,shows}/library/<id>/` 入面嘅 `drama.json` / `show.json` 同 webp 會打包入 bundle，再由 SW precache。上架 / 下架日期其實已經係 runtime 用 `hkToday()` 判斷，但係**任何改動**（加劇、加短篇、改日期、換封面）都要 commit + deploy。

目標：

- 加一個 Cloudflare 上嘅 backend admin 管內容
- frontend 改為 runtime 讀 publish 出嚟嘅 `catalog.json`
- 上下架唔使再 rebuild
- 收聽進度 / 收藏同音檔 URL 脫鉤（2026-11-06 用戶提出）：先改用 episode ID 做 key，將來 audio 搬 server / 換 bucket / 改檔名都唔會冇咗進度

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
| 進度 key          | 由音檔 URL 改為穩定 episode ID（組合 ID，browser 自己計得返）；先 migrate 晒進度同收藏先開始 backend 工作（Phase −1）                                                                                            |
| Fallback          | Build 時 prebuild script fetch R2 上**最新** published `catalog.json` bundle 做 snapshot（即每次 build 都係最新）；runtime 再背景更新                                                                            |

## 架構

```
admin (React SPA) ──► Worker /api (Hono) ──► D1 (drafts, schedule, users, sessions)
                              │
                              ├─ R2 binding: list audio folders, store images
                              └─ Publish: catalog.json + hashed images ─► R2 public (CDN)
player PWA ──fetch──► catalog.json (SWR + bundled snapshot fallback)
audio ─────────────► R2（URL 只用嚟播放；進度 / 收藏 key = episode ID）
```

## Phase −1：Episode ID + 進度 migration（最先做）

### 問題

`903player:progress:v1` 同 `903player:bookmarks:v1` 用音檔 URL 做 key（`src/services/progressStore.ts`、`src/services/bookmarkStore.ts`）。換 R2 bucket / domain、搬 server、改檔名、改 R2 folder 名，進度同收藏都會無聲無息咁冇晒。

### 受影響 storage

| Key                         | 而家 key              | 處理                                   |
| --------------------------- | --------------------- | -------------------------------------- |
| `903player:progress:v1`     | 音檔 URL              | 搬去 `progress:v2`，key = episode ID   |
| `903player:bookmarks:v1`    | 每個收藏存 `url`      | 搬去 `bookmarks:v2`，加 `id`，用 ID 搵 |
| `903player:probed:v1`       | 節目錄音清單（cache） | 唔使改，可以隨時重新 probe             |
| `903player:playback-log:v1` | Debug 播放紀錄        | 唔使改                                 |

### Episode ID 格式

| 類型             | ID                             | 備註                                                             |
| ---------------- | ------------------------------ | ---------------------------------------------------------------- |
| 廣播劇（有短篇） | `drama:<dramaId>:<arcId>:<no>` | `arcId` = 新加嘅 ASCII slug，見下面                              |
| 廣播劇（每日播） | `drama:<dramaId>:<YYYY-MM-DD>` |                                                                  |
| 電台節目錄音     | `show:<showId>:<YYYY-MM-DD>`   | 錄音係 probe 出嚟，backend 冇記錄，所以一定要 browser 自己計得返 |

- **Arc 要加 `id` 欄位**：而家 arc 嘅 `name` 同時係顯示名同 R2 sub-folder 名（中文），slug 只喺圖片 folder（例如 `arcs/half/`）出現，冇圖嘅 arc 冇 slug。用 `name` 做 ID 會令 R2 folder 改名時進度冇咗，所以 `drama.json` 每個 arc 加必填 `id`（ASCII slug，有圖嘅沿用圖片 folder 名），`schemas/drama.schema.json` + `src/catalog/dramas/lib/schema.ts` 同步改，同一劇入面唔可以重複
- `SeriesEpisode` / `DailyEpisode` / `Recording`（`src/types/`）加 `id`；`buildEpisodes()` 同 recordings selector 負責生成
- 放棄嘅方案：backend 派 opaque ID（ULID）。改集數編號都唔受影響，但節目錄音冇 backend 記錄，結果兩套規則並存

### Migration 做法（idempotent，每次開 app 都安全重跑）

1. 用完整 catalog 砌 URL → ID 對照表，**包括已下架嘅集數**（下架嘅都可能有進度）+ probe store 入面嘅節目錄音（URL 可以由 `showId` + 日子 + `fileTime` 反推）
2. 讀 `progress:v1`：對到 ID 嘅寫入 `progress:v2`（v2 已經有嘅唔覆蓋）；對唔到嘅留喺 v1，唔刪
3. 下次開 app 再試對唔到嘅（例如之後重新上架嘅集數）
4. `progress:v1` 保留至少 3 個 MINOR 版本先清，方便 rollback
5. Bookmarks 同一套做法：`bookmarks:v1` → `bookmarks:v2`

### 要改嘅地方

- `src/services/progressStore.ts`、`src/services/bookmarkStore.ts`：API 由 `url` 改為 `id`（`getWatchedUrls` → `getWatchedIds` 等）
- 新增 `src/services/storageMigration.ts`：v1 → v2，喺 app 啟動（render 之前）跑
- 約 15 個非 test 檔 call 緊 progress / bookmark API，要逐個改為用 `id`；播放仍然用 `url`
- 每劇 `src/catalog/dramas/library/<id>/drama.test.ts`：加 pin ID（URL pin 保留到 migration 完成）
- E2E：加一條「舊 v1 進度 → 升級後進度仍在」嘅 test
- Version：MINOR（v1.29.0）；task type `/feature`，喺現有 repo 結構做，唔使等 monorepo

### 實作決定（v1.29.0，2026-11-07）

- **Arc slug**：有圖嘅沿用圖片 folder 名（golden `season-1`…`season-4`；jim `hachioji` `zhongxiao`；lancy `half` `first-love` `heart`；sammy-kitty `too-late` `forest` `summer` `love-1` `love-2` `xmas-2010` `fantasy`）
- **chisee slug（用戶確認）**：三十六計 `36-stratagems`、你生日所以我生日 `shared-birthday`、初戀嗱喳麵 `first-love-noodles`、大妒忌 `jealousy`、好朋友手牽手 `hand-in-hand`、小苦妹撲水 `little-sister`、我們都在會考中成長 `hkcee`、游亁水 `dry-swim`、苦榮去做GYM `gym`、青春期 `puberty`、青春期眞神奇 `puberty-wonder`、Ｘ時mas時小提議 `xmas-proposal`
- Slug 規則 `^[a-z0-9]+(?:-[a-z0-9]+)*$`（可以數字開頭，例如 `36-stratagems`）；`dramaFromFolder.mjs` 新短篇出 placeholder `arc-01`…（避開已用嘅）兼 TODO warning，`--existing` 保留舊 `id`
- **v1 處理：原封不動**（唔刪、唔改）。理由：rollback 返 v1.28 時佢讀返 v1 就有晒舊資料；idempotent 靠「v2 已有嗰個 ID 唔覆蓋」
- **收藏額外記錄** `903player:bookmarks-migrated:v1`（已搬過嘅 v1 URL list）：v1 唔刪，冇呢個記錄嘅話用戶喺新版移除咗嘅收藏下次開 app 會由 v1 復活。對唔到 ID 嘅收藏唔記，下次再試
- **對照次序**：URL → catalog 全部集數（停用劇、已下架、未上架都計）+ probe store → 節目錄音 URL 反推（`showEpisodeOfUrl`，唔理 `fileTime`）；收藏對唔到 URL 再用收藏自己記低嘅欄位計（show / daily 直接計；series 用劇 + 短篇名 + 集數喺 catalog 搵）
- Probe store（`probed:v1`）唔改 key：讀嗰陣由 `showId` + 日子補 `id`，舊 cache 照用
- 任何 localStorage / JSON 錯誤都食咗，唔阻 render；進度同收藏分開 try

### 對後面 phase 嘅影響

- Phase 2 migration 驗收由「URL 一定要同而家一樣」改為「**ID** 一定要同而家一樣」；URL 之後可以自由改
- `catalog.json` 每集帶 `id`，player 唔再自己由 URL 推
- P9 QR 進度轉移：ID 短過 URL，QR 放得落更多記錄

## Monorepo 結構

```
apps/player/      現有 PWA（由 root 搬入；Vercel 用 root `vercel.json` 指定 build，dashboard Root Directory 唔使改；deploy.yml path 要改）
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
    - 驗證 publish 出嚟嘅 `catalog.json` 每集 **episode ID 同現有完全一樣**（Phase −1 之後進度 key = ID；每劇 `drama.test.ts` pin 住 ID，可以重用做驗收）

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
8. **Version bump**：Runtime catalog 係 MINOR（v1.30.0；v1.29.0 係 Phase −1）

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

| Phase | 內容                                                                                                                                              | 前置 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| −1    | Episode ID + 進度 / 收藏 migration（`/feature`，v1.29.0）。Phase 0 之前完成                                                                       | —    |
| 0     | Monorepo 搬 folder + 抽 `packages/catalog`（純 refactor，行為唔變）+ 改 Vercel / CI                                                               | −1   |
| 1 ✅  | Player：registry 改 context + `catalog.json` 讀取 + bundled snapshot + SW caching（用 repo 現有 JSON 生成 `catalog.json`，未需要 backend）        | 0    |
| 2a ✅ | API：Worker + D1（document 式）+ Google login + migration + publish（Worker 代出 catalog.json）+ 開 flag；見 `2026-11-08_plan_phase2a-backend.md` | 1    |
| 2b    | API：CRUD + R2 掃描 + 排程展開 + 圖片上載 + prebuild snapshot                                                                                     | 2a   |
| 3     | Admin 基本：login、CRUD、R2 scan、排程、publish（`_mockups_/admin` 確認後）                                                                       | 2b   |
| 4     | Admin cover 編輯器 + theme 抽色 + banner                                                                                                          | 3    |
| 5     | Player 動態 show grid（mockup 確認後）                                                                                                            | 1    |

Phase 0b（抽 `packages/catalog`，2026-11-07）：`dramas/episodes.ts` 嘅 `host: 'app'` 仲用 `import.meta.env.BASE_URL`（package tsconfig 暫時加 `vite/client` types + TODO）；改做 `appAudioBase` 參數注入**押後到 Phase 2**（backend 冇 Vite，到時先改簽名）。

Phase 0b 版本：抽 package 之後 Rolldown 嘅 module 次序改咗，所以 `assets/index-*.js`、`index.html`、`sw.js` 同 Phase 0a 唔係 byte 一樣（行為唔變，CSS 同圖片一樣）；用戶決定（2026-11-07）接受差異，bump PATCH v1.29.1。

Phase 1 完成之後 player 已經同 backend 解耦：就算 backend 未完成，都可以手動放 `catalog.json` 上 R2 去用。

## 風險

- 🔴 進度 / 收藏 migration：v1 對唔到嘅記錄唔可以刪；v1 保留幾個版本先清。之後 migration 同 publish 都 assert **ID** 一樣
- 🟡 Arc `id` 一旦定咗就唔可以改（改咗等於進度冇咗）；admin 介面要鎖住已 publish arc 嘅 `id`
- 🔴 Phase 0 搬 folder 會影響 Vercel Root Directory、GitHub Pages `deploy.yml`、e2e path、`tsconfig`：要喺同一個 PR 改齊。Vercel 用 root `vercel.json`（`installCommand` / `buildCommand: npm run build -w apps/player` / `outputDirectory: apps/player/dist`），**唔好改 dashboard Root Directory**（改咗反而 build 失敗）；Phase 0a 實作（2026-11-07）
- 🟡 R2 public bucket 要開 CORS 俾 player origin fetch `catalog.json`
- 🟡 Google OAuth 要你喺 Google Cloud Console 開 OAuth client（redirect URI = workers.dev domain）
- 🟡 Admin 改咗但未 publish 嘅 draft 狀態要清楚顯示

## 驗證

- `packages/catalog`：現有 catalog unit test 全部搬過去，照綠
- Phase −1：unit test 覆蓋 ID 生成、v1 → v2 migration（對到 / 對唔到 / 重跑 idempotent / v2 已有唔覆蓋）；e2e 驗舊進度升級後仍在
- Migration：生成嘅 `catalog.json` 經 player 讀，每劇 `drama.test.ts` pin 住嘅 ID / 集數一樣
- API：Vitest + `@cloudflare/vitest-pool-workers` 測 auth whitelist、scan diff、`expandSchedule`、publish validator
- Player：`npm test` + `npm run e2e`（fixture `catalog.json`；offline 第一次開用 snapshot）
- 手動：`wrangler dev` 本地跑 admin → 改日期 → publish → player 唔 rebuild 都見到變化
