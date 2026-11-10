# Backend Phase 2b：內容 API（2b-1）+ 圖片上載 / prebuild snapshot（2b-2）

## Context

Phase 2a（api v0.1.1、player v1.31.0）已經上線：D1 係內容 SSoT，Worker publish `catalog.json`。不過要改內容，而家仍然要改 repo JSON → Import → Publish。

Phase 2b 要補齊 API，等 Phase 3 admin 可以直接改 D1：

- CRUD
- R2 音檔掃描
- 排程展開
- 圖片上載
- prebuild snapshot

主計劃：`.proj-docs/plans/2026-11-06_plan_backend-admin.md`。音檔 bucket 已經改名做 `903-radio-drama`（PR #196，v1.31.1）。

用戶 2026-11-10 決定：

| 項目     | 決定                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| 拆 PR    | **2b-1**：CRUD + R2 掃描 + 排程 + backlog 修正；**2b-2**：圖片上載 + prebuild snapshot                      |
| 排程     | **儲存時展開**：規則存 `schedules` table，同時展開寫入 D1 definition 嘅 `episodeDates` / `episodeRemovedAt` |
| 掃描邏輯 | **抽核心入 `packages/catalog`，CLI 變薄**                                                                   |
| Snapshot | **Build 時連圖一齊下載**入 dist 再 precache；fetch 唔到就用 repo library                                    |

最高原則照舊：episode ID、storage key、上下架結果唔准無聲改變。

---

## 2b-1（✅ PR #197 → `3a0ec84`；api 0.1.1 → 0.2.0 MINOR，player 1.31.1 → 1.31.2 PATCH，因為 CLI 改咗）

### 1. `packages/catalog`：抽 R2 掃描核心（`src/scan/`）

由 `apps/player/scripts/dramaFromFolder.mjs` 抽出純邏輯，**唔郁 fs**。

- **輸入**：`FolderListing`，即係 `{ rootFiles: string[]; arcs: { name; files: string[] }[] }`
    - CLI 由 fs 砌
    - Worker 由 R2 `list({ prefix, delimiter })` 砌
- **抽出嚟嘅部分**：
    - 檔名 parse：`parseEpisodeFileName`、`parseEpisodeNumeral`、`toChineseNumeral`
    - `findSuspicious`、`classify`
    - series / daily 分析
    - template 揀選
    - `--existing` 合併邏輯（`mergeArcs` / `mergeDaily` / placeholder arc id）
    - `generateDraft(listing, { id, existing, today })`
- **CLI 改做 `apps/player/scripts/dramaFromFolder.ts`**：
    - 只負責 argv、fs listing、寫檔、`--verify` HEAD、報告格式
    - 用 `tsx` 跑：加做 root devDependency，引入前跑 `npm audit` 同查 license（MIT）
    - 加 npm script `drama-from-folder`
- **Test**：
    - 現有 `dramaFromFolder.test.ts` 嘅 case 分兩邊：純邏輯 case 搬去 package，CLI case 留低
    - 繼續將輸出餵畀 `parseDramaDefinition` + `buildEpisodes` 驗
    - `e2eSrcConstants` 嘅 `DRAMA_AUDIO_BASE` 核對改為直接 import package 常數
- **README**：「下載單一檔案」嗰段改為「喺 repo 跑 `npm run drama-from-folder -w apps/player -- …`」，並寫明主要入口已經改為 admin / API 掃描

### 2. `packages/catalog`：`expandSchedule`（`src/schedule/`）

Pure function，只適用於 series arc；daily 劇本身已經逐日列出，所以唔適用。

```ts
type ScheduleRule =
  | { kind: 'dates'; batches: { from: number; date: string }[] }           // 指定日期
  | { kind: 'periodic'; start: string; perRelease: number;                  // 由 start 起每次上 M 集
      every: { days: number } | { weekdays: Weekday[] } }                   // 每 N 日 / 指定星期幾
  & { removeAfterDays?: number };                                           // 上架後 N 日下架（每批各自計）

expandSchedule(rule, { firstNo, count }) →
  { addedAt, episodeDates: Record<no, date>, episodeRemovedAt: Record<"a-b", date> }
```

- 日子用 `packages/catalog/src/date.ts` 現有嘅 `addDays` / `weekdayOf` / `isCalendarDate`。全部係 HK 日曆日（YYYY-MM-DD 字串運算），所以冇時區偏移問題。
- 展開結果一定要過 `availabilitySchema` 現有 validator（同一套規則）。
- Unit test 要覆蓋：
    - 跨月、跨年、2 月 29 日
    - 每星期多日
    - `perRelease` 大過剩餘集數
    - `removeAfterDays` 邊界
    - `count` 未知（未上架短篇）→ 拒絕

### 3. D1 migration `0002_schedules.sql`

```sql
CREATE TABLE schedules (
  drama_id TEXT NOT NULL, arc_id TEXT NOT NULL,
  rule TEXT NOT NULL,            -- ScheduleRule JSON
  updated_at TEXT NOT NULL,
  PRIMARY KEY (drama_id, arc_id)
);
```

`deploy-api.yml` 已經會跑 `d1 migrations apply --remote`，唔使改。

### 4. CRUD API（`apps/api/src/content/`，全部經現有 `requireSameOrigin` + `requireSession`）

| Method + path                                       | 做咩                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/entries`                                  | 列表：kind、id、name、enabled、updatedAt                                                                                                                                                                                                                                                                                                                                                        |
| `GET /api/entries/:kind/:id`                        | `{ definition, images, updatedAt }`，`ETag` = updatedAt                                                                                                                                                                                                                                                                                                                                         |
| `PUT /api/entries/:kind/:id`                        | 新增或者成份替換 `{ definition, images }`。流程：<br>① 要帶 `If-Match`（新增用 `If-None-Match: *`），唔對 → 412<br>② 用 `packages/catalog` validator 驗單一 entry；圖 manifest 嘅 hash 要喺 `assets` 入面，而且合 `IMAGE_FILE_PATTERN`（順手解決 S-772）<br>③ 唔過 → 422，附欄位錯誤<br>④ 回應附 `warnings`：同最新 publish 比，會消失嘅 episode ID（只係提示，真正守門仍然係 publish ID 守衛） |
| `DELETE /api/entries/:kind/:id`                     | 只限從未 publish 過嘅 entry（最新 publish 冇佢嘅 episode ID）；有 publish 過 → 409，提示改 `enabled: false`                                                                                                                                                                                                                                                                                     |
| `POST /api/dramas/:id/scan`                         | R2 `AUDIO` binding list `<audio.folder>/` → `generateDraft(listing, { existing: 現有 definition })`。回傳 `{ draft, issues, diff }`，**唔寫 D1**；admin 覆核之後再 `PUT`                                                                                                                                                                                                                        |
| `GET /api/dramas/:id/arcs/:arcId/schedule`          | `{ rule, expanded }`                                                                                                                                                                                                                                                                                                                                                                            |
| `POST /api/dramas/:id/arcs/:arcId/schedule/preview` | 展開 + 驗證，唔寫（俾 admin 日曆 preview 用）                                                                                                                                                                                                                                                                                                                                                   |
| `PUT /api/dramas/:id/arcs/:arcId/schedule`          | 展開 → 寫入 definition 嘅 arc（`addedAt` / `episodeDates` / `episodeRemovedAt`）→ 驗證 → D1 `batch()` 一次過寫 `schedules` + `entries`（atomic），要帶 `If-Match`                                                                                                                                                                                                                               |
| `DELETE /api/dramas/:id/arcs/:arcId/schedule`       | 只刪規則，definition 入面嘅日子保留                                                                                                                                                                                                                                                                                                                                                             |

- **R2 binding**：`wrangler.toml` 加 `[[r2_buckets]] binding = "AUDIO"`、`bucket_name = "903-radio-drama"`。code 只會 `list` / `head`。
- **`apps/api/src/catalog/store.ts`**：加 `getEntry` / `putEntry` / `deleteEntry` / schedule 讀寫，SQL 全部 parameterized。
- **Request body**：限 256 KB；`kind` / `id` 用現有 `checkId` 規則。

### 5. Backlog 一併修（2b-1 範圍）

| ID    | 修法                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------ |
| S-767 | `commitPublish` 改為先 insert `publishes` 後寫 R2；R2 寫失敗就刪返嗰行（或者標 failed），test 模擬 R2 put throw          |
| S-768 | `requireSession` 加 `isAdminEmail(email, env.ADMIN_EMAILS)`；唔喺 whitelist → 401 + 刪 session                           |
| S-770 | `google.ts`：network error / id_token decode 失敗 → `GoogleAuthError` → 502 文字頁                                       |
| S-772 | 見 CRUD `PUT` ②（publish 都加同一個檢查）                                                                                |
| S-780 | Publish 比較「除 `generatedAt` 外」嘅內容同最新一次一樣 → 回 `{ unchanged: true }`，唔開新行、唔寫 R2（`?force=1` 照寫） |
| S-773 | `SECOND_MS` 統一用 `config.ts` 嗰個（順手）                                                                              |

S-769 / S-781（workflow）留返下次改 workflow 先做。

### 6. Ops 頁

唔加新 UI。CRUD / scan / schedule 留俾 Phase 3 admin 用，所以 2b-1 冇 `.tsx` / `.css` 改動，唔使 mockup。S-780 嘅「冇變」回應要喺 ops 頁顯示一句文字，但唔改 layout：`Design Origin: none-required`。

---

## 2b-2（2026-11-10 plan mode 細化，用戶批准）

### Context

2b-1（PR #197，api 0.2.0）已經做好 CRUD、R2 掃描同排程，仲差兩樣：

1. **圖片上載**：Phase 3 / 4 admin 要將 disc / tile 上載去 R2，攞返 hash 名，再寫入 entry 嘅 `images`。
2. **Prebuild snapshot**：而家 player 內建資料（離線第一次開 app、或者 catalog fetch 唔到時用）係 repo library；D1 已經係 SSoT，所以 library 會愈嚟愈舊。改為 build 時攞最新 publish（連圖）做內建資料。

用戶決定：

| 項目               | 決定                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Snapshot           | Build 時 fetch 最新 `catalog.json` 連全部圖入 bundle（precache）；fetch 唔到就用 repo library（2026-11-10）                                                  |
| Publish 後 rebuild | **唔自動**：snapshot 跟下次 deploy 更新；想即時就手動跑 Deploy workflow（2026-11-10）                                                                        |
| 上載尺寸           | **白名單：disc 600×600、tile 1216×684**（節目同劇集統一 16:9）；卡顯示比例唔改（劇集 2:1 繼續 cover 裁）；R2 現有 6 張 1216×608 劇集 tile 照用（2026-11-10） |
| Banner             | 唔入 catalog.json，留 Phase 4                                                                                                                                |

版本：api 0.2.0 → **0.3.0**；player 1.31.2 → **1.32.0**（MINOR：內建資料來源改變）。

---

### A. 圖片上載 API（`apps/api`）

#### `PUT /api/assets`

經現有 `requireSameOrigin` + `requireSession`。

- **Request**：body = 原始 bytes，`Content-Type: image/webp`；其他 type → 415。
- **大小上限**：`ASSET_MAX_BYTES`（1 MB），超過 → 413。現有最大嘅圖遠細過呢個數。
- **驗證**（新增 `apps/api/src/assets/webp.ts`，pure function）：
    - Magic bytes：`RIFF` + `WEBP`，chunk 係 `VP8 ` / `VP8L` / `VP8X`
    - 由 header 讀闊高
    - 唔合規 → 422
- **尺寸白名單**：`ASSET_DIMENSIONS = [{600,600}, {1216,684}]`（named constants，喺 `config.ts`）；唔喺白名單 → 422，error 列明允許嘅尺寸。
- **命名**：sha256 前 16 hex → `<hash>.webp`，同 `importLibrary.mjs` / `IMAGE_FILE_PATTERN` 一致。
- **寫入次序**：
    1. `assets` 已經有呢個 hash → 200 `{ name, existed: true }`（idempotent）
    2. 未有 → 先 R2 `put catalog/v1/img/<name>`（`contentType: image/webp`），再 insert `assets` → 201 `{ name, width, height, bytes }`
    - 先寫 R2 後 insert：R2 有、D1 冇嘅孤兒檔無害；反過嚟（D1 有、R2 冇）就會令 publish 出爛圖。
- Admin 流程：上載 → 攞 `name` → `PUT /api/entries/:kind/:id` 將 `images` 指去 `name`（2b-1 已經驗 hash 喺 `assets` 同檔名 pattern）。

#### 順手修 backlog

| ID    | 修法                                                                                                                                                                         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-786 | Publish 嘅 S-767 失敗路徑：`deletePublish` 都失敗 → 嗰行標 `failed`（migration `0003` 加 `status` 欄，預設 `ok`）；`unchanged` 比較同 ID 守衛只用 `status = 'ok'` 嘅最新一行 |
| S-787 | `scan` / `schedule` 嘅 invalid id 由 404 改 400，同 `/entries` 一致                                                                                                          |

S-788（每次讀成份 publish document）效能影響細，留 backlog。

---

### B. Player prebuild snapshot（`apps/player`）

#### 1. Vite plugin `catalogSnapshot()`（新增 `apps/player/scripts/catalogSnapshot.ts`）

用 plugin 嘅 `buildStart`，唔用 npm `prebuild`：plugin 知道 `mode` 同 catalog URL，CI 嘅 e2e build 唔會誤 fetch。

- **觸發條件**（三樣都要成立先 fetch）：
    - `command === 'build'`
    - `mode !== 'e2e'`
    - 有 catalog URL（即係 Pages / Vercel production；CI 冇設定）
- **步驟**：
    1. 刪舊 `src/catalog/snapshot/`（避免本機舊 snapshot 殘留）
    2. fetch `catalog.json`（timeout `SNAPSHOT_FETCH_TIMEOUT_MS`）→ 用 `packages/catalog` 嘅 `parseCatalogDocument` + `buildRegistry` / `buildShowRegistry` 驗（同 player runtime 同一套 validator）
    3. 逐張圖 fetch（並發上限 `SNAPSHOT_IMAGE_CONCURRENCY`）→ 驗 sha256 前 16 hex 等於檔名（integrity）→ 寫 `snapshot/img/<name>`
    4. `images` 嘅值改寫做檔名，寫 `snapshot/catalog.json`；先寫暫存 folder，全部成功先 rename（atomic）
    5. 任何一步失敗 → `console.warn` 兼清走暫存，build 繼續用 repo library（唔 fail build）
- `.gitignore` 加 `apps/player/src/catalog/snapshot/`。
- Build log 印出 snapshot 嘅 hash、`generatedAt`、圖數，方便追查。

#### 2. 內建來源揀 snapshot 定 library

- 新增 `src/catalog/snapshot/source.ts`：
    - `import.meta.glob('./catalog.json')` + `import.meta.glob('./img/*.{webp,jpg}', { query: '?url' })`
    - folder 唔存在時 glob 回 `{}`
- `packages/catalog` 新增 pure function `localizeDocument(doc, urlByFile)`：將 snapshot document 嘅圖檔名換做 Vite asset URL，再交 `documentSource`。
- `dramas/lib/bundledSource.ts`、`shows/lib/bundledSource.ts`：
    - 有 snapshot → `documentSource(snapshot, kind)`
    - 冇 snapshot → 現有 library
    - e2e mode 照舊行 `withE2EFixtures(library)`
- 圖由 Vite hash 入 `dist/assets/`，現有 `globPatterns` 已經包 webp，所以自動 precache。
- `catalogJson.test.ts` 同每劇 `drama.test.ts` 繼續測 library（CI 冇 snapshot）；新增 test 用細 fixture snapshot 測切換同 `localizeDocument`。

#### 3. 圖有更新點處理（已確認）

| 情況                                         | 會點                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| Admin 換圖                                   | 新圖 = 新 hash = 新檔名，舊檔唔會被覆蓋，`immutable` cache 永遠安全               |
| Publish 之後，用戶 online                    | 最多 60 秒內 runtime `catalog.json` 指去新圖 → SW CacheFirst 第一次顯示就下載     |
| Publish 之後未 deploy，用戶第一次 offline 開 | 用 build 時 snapshot（舊內容 + 舊圖，一致，唔會爛圖）；之後一 online 就換新       |
| 下次 deploy                                  | Snapshot 自動攞最新 publish，新圖入 precache，舊 precache 喺新 SW activate 時清走 |

---

### 關鍵檔案

- **新增**：
    - `apps/api/src/assets/{routes,webp}.ts` + tests
    - `apps/api/migrations/0003_publish_status.sql`
    - `apps/player/scripts/catalogSnapshot.ts` + test
    - `apps/player/src/catalog/snapshot/source.ts`
    - `packages/catalog/src/document/localize.ts` + test
- **修改**：
    - `apps/api/src/{config.ts,api/routes.ts,catalog/{publish,store}.ts,content/*}`（S-786 / S-787）
    - `apps/player/vite.config.ts`（加 plugin）
    - `apps/player/src/catalog/{dramas,shows}/lib/bundledSource.ts`
    - `.gitignore`
    - `apps/api/README.md`、`README.md`
- **重用**：
    - `packages/catalog`：`parseCatalogDocument`、`documentSource`、`buildRegistry`、`buildShowRegistry`
    - `apps/api`：`sha256Hex`（`lib/crypto.ts`）、`IMAGE_FILE_PATTERN`、`CATALOG_IMAGE_KEY_PREFIX`、`assets` store
    - `apps/player`：`catalogCaching.ts` 現有 runtime cache 規則（唔使改）

### 流程

- Branch `claude/funny-pasteur-29wbrn`（已經基於 main `3a0ec84` + docs）。
- `/feature` 流程：Backend Developer（API + player plugin 都係非 UI，冇 `.tsx` / `.css` 改動）→ Code Review → QA S1（`api`、`catalog-data`、`pwa-shell`、`repo-tooling`）→ CI 綠 → merge → DevOps。
- 批准之後先更新 `.proj-docs/plans/2026-11-10_plan_phase2b-backend.md` 嘅 2b-2 段（記錄上面嘅決定），同埋主計劃 phase 表。
- 用戶 dashboard：唔使設定。

### 驗證

- **Unit**（只跑相關）：
    - webp header parse：VP8 / VP8L / VP8X、截短、假 magic
    - 上載：415 / 413 / 422 尺寸 / 201 / 200 existed、R2 失敗唔 insert
    - S-786 failed 行唔計入比較；S-787 返 400
    - Snapshot plugin（mock fetch）：成功、catalog 壞、圖 hash 唔對、timeout → fallback、e2e mode / 冇 URL 唔 fetch
    - `localizeDocument`；`bundledSource` 揀 snapshot 定 library
- **本機**：
    - `wrangler dev` + `curl -T disc.webp` 上載
    - `VITE_CATALOG_URL=<本機 Worker> npm run build -w apps/player` → `dist` 有 snapshot 圖、`sw.js` precache 有齊
    - 斷網再 build → warn + library
- `npm run lint`、`npx tsc -b`；e2e 同 full suite 交 CI（e2e build 唔郁 snapshot，行為唔變）。
- **Deploy 後**：
    - Deploy log 見到 snapshot hash 同已 publish 嘅 hash 一樣
    - 用戶飛行模式第一次開 app（新裝 / 清 cache）見到封面

---

## 關鍵檔案（2b-1）

- 新增：`packages/catalog/src/scan/*`、`packages/catalog/src/schedule/*`、`apps/api/src/content/{routes,entries,scan,schedule}.ts`、`apps/api/migrations/0002_schedules.sql`、`apps/player/scripts/dramaFromFolder.ts`
- 修改：
    - `apps/api/src/{api/routes.ts,catalog/{publish,store,routes}.ts,auth/{middleware,google}.ts,config.ts,env.ts}`
    - `apps/api/wrangler.toml`
    - `packages/catalog/src/index.ts`
    - `apps/player/scripts/dramaFromFolder.test.ts`、`apps/player/src/e2eSrcConstants.test.ts`、`fetch_sources.py` test 嘅常數來源（如有需要）
    - `README.md`、`apps/api/README.md`
- 刪除：`apps/player/scripts/dramaFromFolder.mjs`、`.d.mts`
- 重用：
    - `packages/catalog`：`parseDramaDefinition`、`buildEpisodes`、`availabilitySchema`、`date.ts`、`checkId`
    - `apps/api`：`validateDocument`、`latestEpisodeIds`、`missingEpisodeIds`、test helpers（`apps/api/test/helpers.ts`、`fixtures.ts`）

## Branch / 流程（2b-1）

- 用 session 指定 branch `claude/funny-pasteur-29wbrn`。PR #196 已經 merge，所以先由最新 `origin/main` 重開。
- `/feature`（backend）流程：Backend Developer TDD → Code Review → QA S1 → CI 綠 → merge → DevOps（Deploy API + D1 migration）。
    - QA 鏈：`api` + `catalog-data`；`repo-tooling` 視乎 CLI 改動。
- 批准之後先寫 `.proj-docs/plans/2026-11-10_plan_phase2b-backend.md`，同時更新主計劃 phase 表（2b → 2b-1 / 2b-2），並順手修 S-783（2a plan bucket 寫法）。

## 用戶 dashboard 設定（2b-1）

2b-1 唔使任何設定。`AUDIO` binding 用現有 deploy token，佢已經有 R2 Storage Write，覆蓋所有 bucket。

## 驗證（2b-1）

- Unit（只跑相關）：
    - `npm test -- packages/catalog/src/scan packages/catalog/src/schedule apps/api apps/player/scripts/dramaFromFolder`
    - 覆蓋：CRUD 412 / 422 / 409、scan diff（miniflare R2 放假 object）、schedule 寫入 atomic、S-767 / 768 / 770 / 772 / 780 各自有 test
- Parity：抽核心之前，先用現有 CLI test fixture 錄低 `generateDraft` 輸出；抽完之後輸出一定要 byte 一樣（6 套劇嘅 `--existing` 都要跑）
- `npm run lint`、`npx tsc -b`；e2e 同 full suite 交 CI
- Deploy 後手動：
    1. ops 頁 login
    2. `curl` `GET /api/entries`（帶 cookie）
    3. `POST /api/dramas/golden/scan` → `diff` 應該係空（內容冇變）
    4. 再 publish → 回 `unchanged`（S-780）
