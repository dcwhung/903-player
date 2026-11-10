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

## 2b-1（今次做；api 0.1.1 → 0.2.0 MINOR，player 1.31.1 → 1.31.2 PATCH，因為 CLI 改咗）

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

## 2b-2（之後另開 plan mode 細化；先記低方向）

### 圖片上載

- `PUT /api/assets`：只收 `image/webp`。
    - 驗 magic bytes（`RIFF....WEBP` + VP8 / VP8L / VP8X header）
    - 由 header 讀尺寸，要對到用途（disc 正方、tile 1216×684、banner 窄 / 闊）
    - 限大小
- 檔名 = sha256 前 16 hex，寫入 `catalog/v1/img/<hash>.webp`，再登記 `assets`；同一張圖重複上載就直接回現有 hash。

### Prebuild snapshot

- Player 加 `scripts/fetchCatalogSnapshot.mjs`，build 前跑：
    - fetch `VITE_CATALOG_URL` 嘅 `catalog.json` + 全部圖，寫入 gitignored 嘅 `src/catalog/snapshot/`
    - 圖 URL 改寫做本地 hashed asset，跟 bundle precache
    - `bundledSource` 有 snapshot 就用 snapshot，冇就用 repo library
    - fetch 失敗 → warn + 用 library，build 唔 fail

### 圖有更新點處理（用戶問）

| 情況                                         | 會點                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Admin 換圖                                   | 新圖 = 新 hash = 新檔名，舊檔唔會被覆蓋，所以 `immutable` cache 永遠安全                                     |
| Publish 之後，用戶 online                    | 最多 60 秒內 runtime `catalog.json` 指去新 hash URL → SW CacheFirst 第一次顯示就下載新圖（Phase 1 已有機制） |
| Publish 之後未 deploy，用戶第一次 offline 開 | 用 build 時嘅 snapshot，即係舊圖（同舊內容一致，唔會爛圖）；之後一 online 就換新                             |
| 下次 deploy                                  | Snapshot 自動攞最新 publish（每次 build 都 fetch），新圖入 precache；舊 precache 喺新 SW activate 時清走     |
| 想 snapshot 即時跟 publish（選配）           | Publish 成功後觸發 GitHub Pages / Vercel deploy hook 自動 rebuild，2b-2 plan 再決定要唔要                    |

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

## Branch / 流程

- 用 session 指定 branch `claude/funny-pasteur-29wbrn`。PR #196 已經 merge，所以先由最新 `origin/main` 重開。
- `/feature`（backend）流程：Backend Developer TDD → Code Review → QA S1 → CI 綠 → merge → DevOps（Deploy API + D1 migration）。
    - QA 鏈：`api` + `catalog-data`；`repo-tooling` 視乎 CLI 改動。
- 批准之後先寫 `.proj-docs/plans/2026-11-10_plan_phase2b-backend.md`，同時更新主計劃 phase 表（2b → 2b-1 / 2b-2），並順手修 S-783（2a plan bucket 寫法）。

## 用戶 dashboard 設定

2b-1 唔使任何設定。`AUDIO` binding 用現有 deploy token，佢已經有 R2 Storage Write，覆蓋所有 bucket。

## 驗證

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
