# 架構審計報告

**日期**：2026-11-22 00:39
**項目**：903-player
**審計員**：Architect Agent（4 個分區 subagent）+ main agent 覆核
**審計範圍**：完整 codebase（`apps/player`、`apps/admin`、`apps/api`、`packages/catalog`、root tooling、`.github/workflows`），HEAD `e800401`

**結論**：整體健康，唔需要重構。1 個 Critical（admin 改劇集 ID）、15 個 Warning、其餘係 Observation。Production 依賴 0 個已知漏洞。

**驗證程度**：

- Baseline 實際跑過：`npm run lint` 過、`npm test` 522 檔 / 5,515 test 全過、`npm run test -w apps/api` 過、`npm run typecheck -w apps/api` 過、`npm audit`。
- 冇跑：e2e、`e2e:visual`、build。
- Finding 全部係讀 code 得出，main agent 逐項對過 Critical 同主要 Warning 嘅 code。實際跑過證明嘅只有 AU-026（臨時 unit test）同 AU-014 嘅 1 MiB 上限（Node 實測 `ENOBUFS`）；其餘未重現。
- 已喺 `backlog.md` Open（S-745、S-756、S-775、S-781、S-814、S-867）同 `known-issues.md`（KI-001、KI-002）嘅項目冇重複列出。
- 冇得驗證：GitHub branch protection、Vercel project 設定、Cloudflare dashboard 設定。

---

## 項目概覽

- **類型**：PWA 電台 / 廣播劇播放器 + admin 後台 + Cloudflare Worker API（npm workspaces monorepo）
- **狀態**：Active
- **估計代碼規模**：約 1,600 個 tracked 檔；`.ts` / `.tsx` / `.css` / `.mjs` 約 155,000 行（player 90k、admin 40k、api 13k、catalog 11k，全部連 test）
- **最後活躍**：2026-11-20（v2.2.0 release）

---

## Tech Stack

| 層級           | 技術                                                     | 版本                       | 備注                                           |
| -------------- | -------------------------------------------------------- | -------------------------- | ---------------------------------------------- |
| Frontend       | React + react-router-dom + Vite + vite-plugin-pwa        | 19.3 / 7.18 / 8.3 / 2.0    | player（HashRouter）同 admin SPA               |
| Backend        | Cloudflare Workers + Hono                                | wrangler 4.158 / hono 4.13 | 單一 Worker，連出 admin static assets          |
| Database       | Cloudflare D1（document 式）                             | —                          | 9 個 table，migrations 0001–0007               |
| Storage        | Cloudflare R2                                            | —                          | `CATALOG`（private）、`AUDIO`（public r2.dev） |
| Cache          | Workers Cache API + Service Worker runtime cache         | —                          | 音檔唔經 SW                                    |
| Queue          | 冇                                                       | —                          |                                                |
| Infra / DevOps | GitHub Actions、Vercel（player）、GitHub Pages、wrangler | Node 22                    | 4 個 workflow                                  |
| 測試框架       | Vitest + Testing Library + Playwright                    | 5.0 / 16.3 / ~1.63         | e2e 自家 runner（`e2e/run.mjs`）               |
| 語言 / Lint    | TypeScript + ESLint + Prettier                           | 6.0 / 10.13 / 3.9          | 全部 `strict` + `noUncheckedIndexedAccess`     |

---

## 目錄結構

| 路徑                  | 職責                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `apps/player`         | 公開 PWA：`player/`（AudioController）、`catalog/`、`services/`（localStorage store）、`pages/`、`selectors/`、`e2e/` |
| `apps/admin`          | 後台 SPA：`api/`、`data/`、`features/`（editor、dramas、shows、lists、update、history、appearance）                   |
| `apps/api`            | Worker：`auth/`、`api/`、`catalog/`（publish / serve）、`content/`、`admin/`、`assets/`、`deploy/`、`migrations/`     |
| `packages/catalog`    | 共用型別、JSON schema、runtime validator、排程展開、R2 掃描核心                                                       |
| `scripts/qa`          | `ledger-merge.mjs`（ledger 三方合併）                                                                                 |
| `.proj-docs`          | plans、audits、reviews、QA ledger、backlog                                                                            |
| `_mockups_`、`design` | 設計稿                                                                                                                |

---

## 架構分析

### 整體架構模式

Monorepo；前端係 feature folder + view-model hook + external store；後端係按功能分 folder 嘅 Hono Worker，「草稿（D1）→ 發佈（R2 `catalog.json`）」模型。

### 模組職責

- **player**：`AudioController` 包住唯一一個 `<audio>`，係 external store（`useSyncExternalStore`）；持久化全部 localStorage；catalog 每個 session 揀一次來源（remote → prebuild snapshot → repo library）。邊界清晰。
- **admin**：`useEntryEditor` 分「已儲存版本（連 ETag）」同「草稿」；`AdminData` 持有 todos / entries / changes，每次寫入後全部重讀。弱點係多條寫入路徑對同一份草稿 / ETag 嘅一致性。
- **api**：守門靠註冊次序（`requireSameOrigin` + `requireSession`），所有 `/api` 子 router 都喺 middleware 之後掛，冇漏。冇正式 routes / services / repos 分層，route handler 直接 call store。
- **catalog**：純 TS、冇 Node-only API、冇 DOM；schema 同 runtime validator 有 drift test 鎖住。

### 依賴關係

- `apps/*` → `packages/catalog`，方向單一；admin 冇 import player。
- player `src/` runtime import cycle 0 個（AST 掃描）。
- api 功能 folder 之間互相引用（`catalog/routes` → `admin/*`、`content/sources` → `admin/rescan`），冇單向層次，但冇循環造成嘅實際問題。

---

## API 結構

| Method             | Endpoint                                                                  | 說明                            | 認證                          |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------- | ----------------------------- |
| GET                | `/auth/google/start`、`/auth/google/callback`                             | OAuth（PKCE + 簽名 state）      | 公開                          |
| POST               | `/auth/logout`                                                            | 刪 session                      | same-origin                   |
| GET                | `/catalog/v1/catalog.json`、`/catalog/v1/img/:file`                       | 公開 catalog 同圖               | 公開 + CORS allowlist         |
| GET                | `/api/health`、`/api/branding/favicon`                                    | 版本 / favicon                  | 公開                          |
| GET                | `/api/me`、`/api/entries`、`/api/todos`、`/api/changes`、`/api/publishes` | 讀取                            | session                       |
| GET / PUT / DELETE | `/api/entries/:kind/:id`                                                  | entry CRUD（ETag 樂觀鎖）       | session（寫入 + same-origin） |
| POST               | `/api/entries/:kind/:id/revert`、`/api/entries/dramas/:id/rename`         | 還原 / 改 ID                    | session + same-origin         |
| POST               | `/api/publish`、`/api/publishes/:id/rollback`                             | 發佈 / 還原                     | session + same-origin         |
| GET / POST         | `/api/publishes/:id/deploy`                                               | 部署狀態 / 重新部署             | session（POST + same-origin） |
| PUT                | `/api/assets`、`/api/assets/source`                                       | 上載圖（1 MiB）/ 原圖（20 MiB） | session + same-origin         |
| GET / PUT / DELETE | `/api/dramas/:id/arcs/:arcId/schedule`（另有 `/preview`）                 | 排程                            | session（寫入 + same-origin） |
| POST               | `/api/scan`、`/api/dramas/:id/scan`、`/api/dramas/:id/folder`             | R2 掃描 / 配對                  | session + same-origin         |
| GET                | `/api/dramas/:id/sources`、`/api/r2-source`、`/api/folders/unmapped`      | R2 讀取                         | session                       |
| GET / PUT / DELETE | `/api/banner`、`/api/branding`（`/icon`、`/text`）                        | banner / App 外觀草稿           | session（寫入 + same-origin） |
| PUT / POST         | `/api/order/:kind`、`/api/order/:kind/revert`、`/api/todos/confirm-id`    | 排序 / 確認 ID                  | session + same-origin         |

---

## 數據庫結構

### 主要 Tables

| 名稱                                       | 用途                 | 主要欄位                                                                         |
| ------------------------------------------ | -------------------- | -------------------------------------------------------------------------------- |
| `entries`                                  | 節目 / 劇集 document | PK (`kind`, `id`)；`definition`、`images`（JSON）；`updated_at`（ETag）；`draft` |
| `assets`                                   | R2 已有嘅圖          | PK `hash`；`content_type`、`bytes`                                               |
| `publishes`                                | 每次發佈 snapshot    | `id`；`hash`、`document`、`episode_ids`、`rollback_of`、`status`、`deploy`       |
| `sessions`                                 | admin session        | PK `token_hash`；`email`、`expires_at`                                           |
| `schedules`                                | 短篇排程規則         | PK (`drama_id`, `arc_id`)；`rule`                                                |
| `scan_findings`                            | 掃描發現 / 待辦      | `kind`、`drama_id`、`arc_id`、`resolved_publish_id`                              |
| `banner`、`branding_icon`、`branding_text` | 單行草稿             | `id = 1`                                                                         |

### 關係

冇 foreign key；`schedules` 同 `scan_findings` 靠 `drama_id` / `arc_id` 字串對 `entries.definition` 入面嘅短篇 ID，改 ID 要一個 `DB.batch` 一齊改（見 AU-013）。`publishes.episode_ids` 鎖住上過架嘅 episode ID，做發佈守衛。

---

## 發現問題

### 🔴 Critical

#### [AU-013] Admin 改劇集 ID 之後，用舊草稿 PUT，冚返 server 啱啱改好嘅短篇 ID

- **位置**：`apps/admin/src/features/editor/persist.ts:29-31`；server `apps/api/src/admin/rename.ts`（`withRenamedArcIds`）、`apps/api/src/content/entries.ts:176`（`droppedScheduledArc`）
- **描述**：`persist` 先 `POST …/rename`，server 將自動編號短篇 `<舊 ID>-NN` 改做 `<新 ID>-NN`（definition、`schedules`、`scan_findings`）。跟住 client 即刻 `putEntry(新 ID, draft)`，但草稿嘅短篇 ID 仲係舊嘅；admin 冇任何對應轉換（grep 過）。
- **影響**：
    - 短篇未排程：短篇 ID 被寫返 `<舊 ID>-NN`，同 `scan_findings.arc_id` 對唔上，待辦對唔返。
    - 短篇已排程：PUT 撞 409「此短篇已有排程」，但用戶冇改過短篇 ID；server 已改名而 client 仲係舊 id / etag / URL，再儲存 404，其他草稿改動冇晒。
- **建議**：
    - 方案 A：改名規則搬入 `packages/catalog`，rename 成功後 client 對草稿套同一條規則。改動細，但兩步之間失敗仍要處理。
    - 方案 B：rename endpoint 回埋新 definition，client 合併；或者一個 endpoint 做 rename + save。一致性最好，改動大啲。
    - 兩個方案都要：rename 成功而 PUT 失敗時，先更新 `entry`（id / etag）同 URL。補 `persist.test.ts` 同 e2e「改劇集 ID」。

### 🟡 Warning

#### [AU-014] `ledger-merge.mjs` 就快撞 `execFileSync` 1 MiB 上限

- **位置**：`scripts/qa/ledger-merge.mjs:23`、`:26`
- **描述**：冇設 `maxBuffer`；ledger 而家 848,816 bytes（11-18 係 537k、11-20 係 849k）。
- **影響**：再加約 1,000 行，`git show` 會 throw `ENOBUFS`，parallel lane merge 撞 ledger 時 script crash。
- **建議**：加 `maxBuffer`（例如 64 MiB）。一行改動，最急。

#### [AU-015] CI `changes` job 只睇今次 push 嘅 delta，壞 code 後面跟一個淨 docs push 會令 head 變綠

- **位置**：`.github/workflows/ci.yml:35-47`
- **描述**：分類用 `before..after`，唔係成條 branch 對 main。push A（code，CI 紅）→ push B（淨 docs）→ `check` / `e2e` 跳過當 Success。
- **影響**：branch head 全綠但 code 冇通過 lint / unit / e2e；S3「同一個 SHA 綠咗就引用個 run」會引用到一個冇跑過嘢嘅 run。另外 `git diff --name-only` 預設 rename detection，`git mv src/a.ts docs/a.md` 會當 docs-only。
- **建議**：
    - 方案 A：一律用同 `origin/main` 嘅 merge-base 做 base。最簡單，代價係 branch 有 code 改動時 docs push 都跑全套。
    - 方案 B：保留 delta，但查 `before` 嗰個 SHA 嘅 CI 結論，唔係 success 就退返 merge-base。慳 CI 分鐘，要加 `actions: read`。
    - 推薦 A；兩個方案都加 `--no-renames`。

#### [AU-016] Production 部署冇綁 CI 結果

- **位置**：`vercel.json`、`.github/workflows/deploy.yml`、`.github/workflows/deploy-api.yml:58`
- **描述**：Vercel 對 `main` 只跑 `npm ci` + build；`deploy-api.yml` 只跑 api test（冇 lint、冇 `tsc -b`、冇 admin unit test）但會 deploy admin SPA 同 apply D1 migration；`deploy.yml` 冇 e2e。
- **影響**：直接 push main 或者 merge 一個 CI 紅 / 被跳過（AU-015）嘅 PR，Worker、migration、Vercel 都會出。
- **建議**：最少 `deploy-api.yml` 改跑 root lint + `tsc -b` + `npm test`；Vercel 加 `ignoreCommand` 或者改由 deploy hook 喺 `deploy.yml` 成功後觸發。同 S-781 一齊做。

#### [AU-017] 重跑 Import catalog 會無聲冚走 admin 喺 D1 嘅改動

- **位置**：`apps/api/scripts/importLibrary.mjs:82-87`、`apps/api/README.md:92`、`.github/workflows/import-catalog.yml`
- **描述**：`ON CONFLICT (kind, id) DO UPDATE SET definition, images`，條件只係「同 repo 唔同」。README 寫「idempotent、可以重跑」，但而家 D1 先係 SSoT。
- **影響**：有人剔走 dry run 跑一次，repo library 有嘅每個 entry 變返 repo 舊版；`schedules` 唔郁，規則同 definition 唔夾；草稿冇得還原。dry run Summary 睇唔出會覆蓋幾多行。
- **建議**：預設只 insert（`DO NOTHING`），覆蓋要 `--overwrite`；dry run 列出會覆蓋嘅行數；改寫 README。

#### [AU-018] Publish 冇序列化，R2 同 D1「最新一次」可以唔夾

- **位置**：`apps/api/src/catalog/publish.ts:258-281`、`:312-332`
- **描述**：「讀 latest → guard → insert publishes → R2 put」中間冇鎖亦冇條件寫入。
- **影響**（低機率）：兩個 publish 重疊（或者 publish 撞 rollback）時，R2 可能係較舊嗰份而 D1 顯示較新嗰份係 current；之後再發佈回 `unchanged`，線上一直係舊版。
- **建議**：insert 加樂觀條件（最新 ok publish id 要等於讀到嗰個，否則 409）；`unchanged` 路徑比對 R2 `customMetadata.hash`。

#### [AU-019] Deploy job 入面，帶 secret 嘅步驟之前行咗未隔離嘅第三方 code

- **位置**：`.github/workflows/deploy-api.yml`、`.github/workflows/import-catalog.yml`
- **描述**：同一個 job、同一個 workspace，`npm ci` lifecycle script、vitest、vite build 可以改 `node_modules/.bin/wrangler`，之後帶 `CLOUDFLARE_API_TOKEN` 嗰幾步會行被改過嘅 code。
- **影響**：供應鏈風險；同 S-781（邊個 ref 攞到 secret）唔同，呢個係 job 內隔離。
- **建議**：拆 build / test job（冇 secret，出 artifact）同 deploy job（`npm ci --ignore-scripts`）。另外 `deploy.yml` 嘅 `pages: write` + `id-token: write` 由 workflow 層搬去 `deploy` job。

#### [AU-020] Admin `patchSaved` 撞 412 自動重試後草稿冇同步，下次儲存靜靜冚走人哋嘅改動

- **位置**：`apps/admin/src/features/editor/useEntryEditor.ts:44-51`、`:84-89`
- **描述**：重試會攞最新版本再 PUT，`entry` 變「對方版本 + patch」，但 `draft` 其餘欄位仍係舊值；之後 `run()` 用新 etag，PUT 成功。
- **影響**：單人兩個 tab 都中：Tab 2 拖排序，Tab 1 上載圖（412 重試成功）再撳儲存，排序被還原，冇衝突提示。
- **建議**：重試成功後對草稿做三方合併（`mergeRescan` 有現成邏輯）；或者有未儲存改動時唔自動重試、改出衝突提示。

#### [AU-021] 確認發佈頁冇版本守衛

- **位置**：`apps/admin/src/features/update/usePublish.ts:38`、`useSelectedChanges.ts:47-58`；server `apps/api/src/catalog/selectivePublish.ts`
- **描述**：`POST /api/publish` 只帶 selection，server 照「而家」嘅 D1 出 document；確認頁摘要唔會因為其他人儲存而重讀。
- **影響**：A 停喺確認頁，B 儲存一個已上架節目嘅改動，A 撳發佈，B 未檢查完嘅改動即時上線而確認頁冇顯示過。
- **建議**：publish body 帶 `base` + 摘要 hash，server 對唔上回 409 / 412，行現有 `StaleNotice`。

#### [AU-022] 排程 tab「刪除排程」同「配對資料夾」會 reload，冚走未儲存草稿

- **位置**：`apps/admin/src/features/dramas/useScheduleSave.ts:22`、`:36-37`；`ArcSchedule.tsx:82-85`；`BasicTab.tsx:41-44`
- **描述**：儲存排程有擋 `dirtyKeys`，刪除同配對冇擋，亦冇確認框。
- **影響**：基本資料 tab 未儲存嘅改動無聲消失。
- **建議**：`dirtyKeys.length > 0` 就 disable；刪除排程加 `ConfirmDialog`；`remove` 補 `afterSave` / `refresh`。

#### [AU-023] Admin 編輯頁冇「未儲存就離開」守衛

- **位置**：`apps/admin/src/features/editor/useEntryEditor.ts`（全 app 冇 `beforeunload` / `useBlocker`）
- **影響**：貼咗幾十集標題未儲存，誤撳 nav / breadcrumb / 重新整理，草稿全失。
- **建議**：`useBlocker` + 現有 `ConfirmDialog` + `beforeunload`。搵唔到相關決定記錄；如果係刻意唔做，要用戶確認。

#### [AU-024] `useResource.reload` 冇次序保護

- **位置**：`apps/admin/src/data/useResource.ts:26-37`；放大因素 `AdminData.tsx:25-32`（N+1 重讀）
- **影響**（機制確認，實際撞到屬有可能）：連續拖兩次排序，較舊嘅 refresh 回應遲到，列表彈返第一次嘅次序；下一次拖用錯嘅次序計 `ids`，等於還原第二次拖動。
- **建議**：`reload` 加遞增 token（`useCropSession` 已有同款）；`GET /api/entries?detail=1` 一次回晒。

#### [AU-025] 上下架記錄「還原」冇進行中狀態；載入失敗顯示成「未有記錄」

- **位置**：`apps/admin/src/features/history/HistoryPage.tsx:73-81`、`:99-101`
- **影響**：還原期間掣照撳得，可以連續還原兩次；`listPublishes` 失敗（包括 401）顯示空狀態。
- **建議**：加 busy state + 成功 toast；顯示 `publishes.error`。`HistoryPage` 冇 test 檔。

#### [AU-026] Player：淨係載入、冇播過嘅集都會寫入進度

- **位置**：`apps/player/src/player/AudioController.ts:370-382`；觸發 `src/hooks/useMiniPlayer.ts:69`、`src/pages/drama/useDramaPage.ts:251`
- **描述**：`persist()` 只睇 `hasMetadata()`。暫停時掃 mini player 或者揀短篇唔播，之後 pagehide / 轉集就寫 `{position: 0, updatedAt: now}`。`src/hooks/useStartDrama.ts:42` 註解嘅假設同實際相反。
- **影響**：從未播過嘅集入咗「最近收聽」；主頁格出 ratio 0 嘅「繼續收聽」；已聽過嘅集 `updatedAt` 被瀏覽推前。iOS 冇 gesture 未必載 metadata，可能只係桌面 / Android 中。
- **建議**：
    - 方案 A：controller 記低「今次載入後有冇真正播過 / seek 過」，冇就唔 persist。語義最準。
    - 方案 B：冇舊記錄而 position 0 時唔寫。改動最細，但唔解決 `updatedAt` 被推前。
    - 推薦 A，補 unit test。

#### [AU-027] Player：用內建 catalog 開 app 時，probe store 會永久刪走 remote-only 節目嘅錄音

- **位置**：`apps/player/src/data/recordingValidation.ts:33` → `src/services/probeStore.ts:43` → `src/services/audioProbe.ts:281`
- **描述**：讀 `found` 用今次 session 嘅 registry 篩 `isKnownShowId`，然後即刻寫返落去。
- **影響**：節目喺 build 之後先喺 admin 加入；某次 fallback 去內建 catalog，佢嘅錄音由 storage 刪走，之後只重新 probe 14 日，更舊嘅清單項目永久冇咗（進度同收藏仲喺度）。
- **建議**：`origin === 'bundled'` 嘅 session 唔寫 `found`；或者改喺顯示層篩。

#### [AU-028] `toChineseNumeral` 過咗 99 出錯字，validator 冇上限

- **位置**：`packages/catalog/src/dramas/filename.ts:16-23`
- **描述**：105 →「十五」。template 用 `{noZh}` 而短篇有 ≥ 100 集時，砌出嘅檔名錯，publish 過，播放先 404。
- **影響**：潛伏；現有最長約 50 幾集。
- **建議**：`parseDramaDefinition` 喺 `{noZh}` 而集數 > 99 時 fail（改動細）；或者支援到 999。

### 🟢 Observation

**apps/api**

- entries 嘅圖只驗 hash 已上載，唔驗副檔名同尺寸；`PUT /api/assets/source` 嘅原圖（20 MiB）可以直接做 entry 圖，繞過尺寸白名單（`catalog/publish.ts:74-94`）。建議 `assets` 記副檔名 / kind。
- `/api/scan` 當多層 `audio.folder` 係「資料夾唔見」，仲會幫上層建假 draft 劇（`admin/scan.ts:179-196`）；現有資料全部單層。建議統一：禁 `/` 或者用 prefix 判斷。
- `publishes` 永遠唔清，`publishDocuments` / `publishedFacts` 隨發佈次數線性變重。
- `wrangler.toml` 冇 `[observability]`，多個失敗路徑只靠 `console.error`。
- 公開 endpoint 冇 rate limit；404 圖唔入 cache，每次一個 R2 get。
- banner / branding 單行草稿冇樂觀鎖（加第二個 admin 之前要補）。
- 安全 header 唔齊：`/catalog/v1/img/` 冇 `nosniff`，冇 `Referrer-Policy`，`/api/*` JSON 冇 `no-store`。
- Session 固定 30 日、冇 idle timeout；撤銷 admin 要改 `wrangler.toml` 再 deploy；admin email 寫死喺 repo。
- 下架 / 未到期內容仍然喺公開 `catalog.json`，只靠 player 過濾（設計取捨，要保密先需要改）。
- 重複 helper：`r2FolderOf` 兩份、`isRecord` 兩份、`arcIdsOf` 類四處。

**apps/admin**

- 列表頁唔處理 `entries.error`；`loadAllEntries` 任何一個 `getEntry` 失敗就成個 reject，顯示空列表。
- 編輯頁任何載入錯誤都顯示「找不到」，冇重試；reload 失敗會收起成個編輯畫面。
- 書面語規則漏網：`features/editor/EditorHeader.tsx:31` 寫死 `aria-label="breadcrumb"`；`api/errorMessage.ts:25` 將 server 英文原文同 `Failed to fetch` 直接顯示。`writtenChinese.test.ts` 只掃 `zh-HK.ts`。

**apps/player**

- 減少動態：`MiniPlayer.module.css:55-58` 嘅長按 transition（specificity 0,2,0）贏咗 reduce block 嘅 `.player { transition: none }`（`:147-152`），違反 CLAUDE.md Motion 規則。
- 收藏寫唔到（quota）都出「已加入收藏」（`services/bookmarkStore.ts:139-170`）。
- 過香港午夜唔會自己 re-render：mini player、今日節目頁、「New」標記直接叫 `hkToday()`，只有 drama 頁用 `useHkToday`。
- 離線時 Google Fonts 靠 HTTP cache，SW 冇 route。
- Playback log 喺 production 每個 media event 同步重寫成份 log（約 40 KB）。
- 少過 20 秒嘅集自動接下一集時唔會打剔（`EARLY_ADVANCE_SECONDS` 對 `WATCHED_RATIO`）。
- 收藏嘅 `url` 冇驗 origin（probe store 有驗）；影響只係播到第三方音檔。
- Dead export：`CalendarIcon`、`SoundWaveIcon`、`HAVE_NOTHING`。

**packages/catalog**

- 數字 key 用 `Number(key)`：`""`、`" 1"`、`"1e0"`、`"0x2"` 都收，會撞同一集靜靜覆蓋（`dramas/schema.ts:177-178`）。建議用同 schema 一樣嘅 pattern。
- `EPISODE_PATTERN` 遇到短篇名有「 - 第…」會 parse 錯（`scan/names.ts:12`）。
- `planSchedule` 冇限總跨度，極端輸入會回傳爛日子（`expandSchedule` 有擋）。
- `compareOrderThenId` 用 `localeCompare`，次序跟裝置 locale。
- 每日劇 folder 多一個 sub-folder 就 rescan 唔到（`scan/draft.ts:136-137`）。
- `src/scan/testListing.ts` 係 test helper 但放喺 `src/`。

**Tooling / CI / 依賴 / 文件**

- 約 16,000 行 `.mjs`（e2e、`importLibrary.mjs`、`ledger-merge.mjs`）冇 lint rule、冇 type check（`eslint.config.js:18` 只對 `.ts` / `.tsx`）。
- ESLint 唔係 type-aware，Worker code 冇 `no-floating-promises`。
- `e2e:visual` 同 `apps/player/scripts/arcCover` 嘅 pytest 冇任何 workflow 跑。
- Actions 用 major tag、冇 `dependabot.yml`（全部 first-party，風險低）。
- `@types/node ^26` 對 CI Node 22；冇 `engines` / `.nvmrc`。
- `miniflare` 用 caret 對住 beta prerelease，建議 exact pin。
- 多餘宣告：player 嘅 `ajv` / `ajv-formats`、catalog 嘅 `vite`、`@vitest/coverage-v8` 兩份。
- `.gitignore` 嘅 `.env*` 會連 `.env.example` 都 ignore。
- `npm audit`：production 0 個；dev 14 個（1 low、13 moderate：`fast-uri`、`glob`、`minimatch`、`serialize-javascript`），`npm audit fix` 可以處理部分。
- 文件 drift：`.claude/CLAUDE.md` Unit 一行寫 root `npm test` 跑 player + catalog，實際 5 個 project；QA gate 表冇 `npm run e2e:admin`；`README.md:50`、`:139` 過時。
- Unit test 185 秒，jsdom 建立佔一半（player 318 次、admin 138 次）；vitest 建議 `pool: 'vmThreads'`。

---

## 安全配置審計結果

| 類別          | 項目                                        | 狀態 | 風險 | 建議                                |
| ------------- | ------------------------------------------- | ---- | ---- | ----------------------------------- |
| AuthN         | OAuth PKCE + 簽名 state                     | ✅   | —    | —                                   |
| Session       | `__Host-` HttpOnly Secure Lax，D1 只存 hash | ✅   | —    | 考慮 idle timeout                   |
| CSRF          | 非 safe method 驗 `Origin`                  | ✅   | —    | —                                   |
| CORS          | 只有 `/catalog/v1`，allowlist               | ✅   | —    | —                                   |
| SQL           | Worker 全部 bound params                    | ✅   | —    | —                                   |
| R2 key        | pattern + 白名單                            | ✅   | —    | —                                   |
| HTTP Headers  | frame 相關有；`nosniff` 等唔齊              | ⚠️   | 🟢   | 全域加 `nosniff`、`Referrer-Policy` |
| Rate Limiting | 冇                                          | ⚠️   | 🟢   | Cloudflare rate limiting rule       |
| 依賴庫        | prod 0；dev 14 moderate / low               | ⚠️   | 🟢   | `npm audit fix`                     |
| CI secret     | job 內冇隔離（AU-019）                      | ⚠️   | 🟡   | 拆 job                              |
| XSS           | 冇 `innerHTML` / `dangerouslySetInnerHTML`  | ✅   | —    | —                                   |

---

## 技術債評估

| 類別       | 程度   | 描述                                                               | 預計處理成本 |
| ---------- | ------ | ------------------------------------------------------------------ | ------------ |
| 代碼質量   | 低     | 模組細、註解齊；問題集中喺 admin 多寫入路徑一致性                  | M            |
| 測試覆蓋   | 低     | 5,515 unit + e2e；缺口係 `persist.ts`、`HistoryPage`、並發 publish | S–M          |
| 文件完整性 | 低     | 少量 drift                                                         | S            |
| 安全性     | 低至中 | 應用層穩陣；deploy 把關靠流程紀律（AU-015、016、019、S-781）       | M            |
| 性能       | 低     | admin N+1 重讀、`publishes` 線性增長、playback log                 | S–M          |
| 依賴更新   | 低     | 版本新；dev 依賴 14 個 moderate / low                              | S            |

---

## 建議方向

### 方案 A：修復現有系統

- **適用情況**：架構健康、問題係局部
- **預計工作量**：P0 約 1 日；P1 約 3–5 日
- **優點**：風險低、可以逐個 PR 做
- **缺點**：admin 一致性問題（AU-013、020、021、022）要一齊設計，否則會各自補

### 方案 B：重建

- **適用情況**：唔適用
- **缺點**：冇任何 finding 支持重建

### 推薦

方案 A。

---

## 下一步建議

| 優先級 | 行動                                                                | 負責 Agent         | 預計工作量 |
| ------ | ------------------------------------------------------------------- | ------------------ | ---------- |
| P0     | AU-014 `ledger-merge.mjs` 加 `maxBuffer`                            | Backend Developer  | S（一行）  |
| P0     | AU-013 改劇集 ID 流程（連 test + e2e）                              | Frontend + Backend | M          |
| P1     | AU-015 + AU-016 + AU-019 CI / deploy 把關（同 S-781 一齊）          | DevOps Engineer    | M          |
| P1     | AU-017 import 預設唔覆蓋                                            | Backend Developer  | S          |
| P1     | AU-020 / 021 / 022 / 023 admin 草稿一致性（一齊設計）               | Frontend Developer | M–L        |
| P1     | AU-026 / AU-027 player 進度同 probe store                           | Frontend Developer | M          |
| P2     | AU-018、AU-024、AU-025、AU-028                                      | Backend / Frontend | S–M 各項   |
| P2     | Observation：減少動態 CSS、`.mjs` lint、文件 drift、`npm audit fix` | 各自               | S 各項     |

**需要用戶決定**：

- AU-023：admin 未儲存離開守衛係咪要做。
- 「下架 / 未到期內容仍喺公開 `catalog.json`」係咪可以接受。
- Observation 邊啲入 backlog（本報告未改 `backlog.md`）。
