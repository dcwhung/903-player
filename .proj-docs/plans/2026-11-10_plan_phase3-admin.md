# Phase 3：Admin（`apps/admin`）+ 配套 API / catalog 欄位

## Context

Phase 2b（api 0.3.0、player 1.32.0）已經上線：D1 係內容 SSoT，CRUD / R2 掃描 / 排程 / 圖片上載 / publish API 齊晒，但係冇 UI，改內容仍然係 repo JSON → Import → Publish，或者 `curl`。

Phase 3 做 admin SPA，令日常操作變成：**入 admin 自動掃 R2 → 處理待辦（ID、圖、排期）→ 確認發佈**；小改動直接入節目 / 廣播劇改。

- UI 已經用 Preview-First 確認：`_mockups_/admin/index.html`（v16，commit `c10f1a0`，用戶 2026-11-10 確認「無其他嘢要改」）
- 主計劃：`.proj-docs/plans/2026-11-06_plan_backend-admin.md`（Phase 3 一行要更新範圍）
- ai-dev-team 設計規則（`rules/global-rules.md`）：Design-Source Binding、PWA Layout & Preview-First、**UX Flow & Icon-First**（≤ 3 步、icon-first、說明文字 ≤ 1 行、animation ≤ 300ms + reduced motion）

## Mockup 確認咗嘅決定（摘要）

| 項目       | 決定                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Nav        | App banner（`banner.webp`）+ 橙色「Admin vX」pill；更新內容（待辦數）/ 內容：節目、廣播劇 / 記錄：上下架記錄                     |
| 入口       | 入 admin 自動掃描 R2；新資料夾自動建廣播劇、新短篇 / 新集數自動加入（寫 D1）；資料夾唔見咗 → 唔自動建，入「需要處理」揀配對      |
| 待辦       | 矩陣（行 = 新內容，欄 = 資料夾 / ID / 圖片 / 排期 / 簡介）；紅「設定」= 必須、灰「＋」= 選填                                     |
| 編輯頁     | 由待辦入嚟：flow bar + 「儲存並返回待辦」；由列表入嚟：「儲存」；每頁一個儲存掣；提示收入 ⓘ tooltip / placeholder                |
| 列表       | 廣播劇：名稱 / 短篇 / 集數 / 狀態（每短篇一行，>4 個收埋、原位展開）；節目：名稱 / 狀態；拖 ⠿ 排序（放手即存）；下架嘅固定排最底 |
| 狀態       | 上架（綠）/ 下架（紅）掣；節目、廣播劇、短篇三層都有                                                                             |
| 名稱       | 節目 / 廣播劇標題雙擊改；短篇展開後直接輸入框；短篇名 = 顯示名稱，R2 子資料夾名唔改                                              |
| R2 欄位    | 資料夾、檔名模板、集數、各集標題放虛線框「由 R2 掃描」+「重新掃描」掣                                                            |
| 各集標題   | 一個 textarea，每行「第 X 集 ｜ 標題」                                                                                           |
| 圖片       | 縮圖右下 ✎ / ＋，只收已裁好嘅 WebP（600×600 / 1216×684）；裁切編輯器 Phase 4                                                     |
| 排程       | 一句話規則 + 預設 chip；集數條（已上架灰 ✓ 一行，由「今天」換行顯示新批次）；排法唔同 → 出「上架批次」表                         |
| 節目資訊   | 簡介、播放時間（時 / 分 roller，15 分鐘一格，完結 ≤ 開始 + 3 小時）、主持；預覽「：」對齊                                        |
| 廣播劇資訊 | 簡介；短篇：簡介、聲演（P9.5 預備，player 暫唔顯示）                                                                             |
| 確認發佈   | 時間線（即時上線 / 日期 → 類型 tag → 縮圖 + 名 → 集數）+ 數量 pill + 驗證 ✓ + 大「發佈」掣                                       |
| 上下架記錄 | 一次一行，變更用類型 tag / 縮圖 / 名 / 狀態 pill；使用中綠邊、失敗紅邊 + 原因；還原                                              |
| 直向手機   | < 720px 淨係顯示「請轉為橫向或使用電腦」                                                                                         |
| UI 樣式    | 開發時再調，參考用戶附圖（圓角卡、漸變統計卡、側邊 nav）                                                                         |

## 拆 PR

| PR     | 內容                                                                                   | 版本                                                                       |
| ------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **3a** | `packages/catalog` 新欄位 + `apps/api` 新 endpoint / migration + player 篩選同顯示名稱 | api 0.3.0 → **0.4.0**、player 1.32.0 → **1.33.0**（MINOR）                 |
| **3b** | `apps/admin` SPA + Worker 出 admin + CI / deploy + 退役 ops 頁                         | admin 首發；pill 顯示 **api 版本**（同一個 Worker deploy，一個版本號就夠） |

3a 先 merge + deploy（向後兼容：新欄位全部 optional），3b 用真 API 開發。

---

## 3a：資料欄位 + API

### 1. `packages/catalog` 新欄位（全部 optional）

| 位置  | 欄位                                         | 規則                                              |
| ----- | -------------------------------------------- | ------------------------------------------------- |
| show  | `enabled?: boolean`                          | 冇 = true                                         |
| show  | `summary?: string`                           | ≤ 500 字                                          |
| show  | `hosts?: string[]`                           | 每個 1–40 字，≤ 12 個                             |
| show  | `airTime?: { start: 'HH:MM', end: 'HH:MM' }` | 分鐘 ∈ {00,15,30,45}；end > start 且 ≤ start + 3h |
| drama | `summary?: string`                           | 同上                                              |
| arc   | `enabled?: boolean`                          | 冇 = true                                         |
| arc   | `displayName?: string`                       | 播放器顯示名；`name` 繼續 = R2 子資料夾 + key     |
| arc   | `summary?: string`、`cast?: string[]`        | 同 show                                           |

- 改：`src/shows/schema.ts`、`src/dramas/schema.ts`（type + `parseShowDefinition` / `parseDramaDefinition`）、`schemas/{show,drama}.schema.json`（`additionalProperties: false`，一定要加）、`src/core/jsonSchemas.node.test.ts` 同步檢查
- `src/scan/merge.ts` 嘅 `HAND_WRITTEN_ARC_KEYS` 加 `enabled`、`displayName`、`summary`、`cast`（唔加就 rescan 會剷走）
- 新增 pure function（admin / api 共用）：
    - `src/admin/episodeTitles.ts`：`formatTitles(arc) → string`、`parseTitles(text, firstNo, count) → { titles, errors[] }`（格式「第 X 集 ｜ 標題」，錯誤指明第幾行：集數超出、重複、格式錯）
    - `src/admin/changes.ts`：`summarizeChanges(prevDoc, nextDoc, today) → { items: [{ kind: 'newDrama'|'newArc'|'newEpisodes'|'edit'|'unlist'|'rollback', entry, arc?, detail }], timeline: [{ date | 'now', items }] }`（確認發佈時間線 + 上下架記錄共用）
    - `src/admin/airTime.ts`：驗證 + `formatAirTime(airDays, airTime)`（「星期一至五 15:00 - 16:30」）
- 重用：`compareOrderThenId`（`src/core/ordering.ts`）、`buildEpisodes`、`expandSchedule`、`generateDraft`、`parseCatalogDocument`

### 2. Player（`apps/player`，Design Origin：`baseline:`，視覺只改文字）

- `packages/catalog/src/shows/registry.ts`：`allShows()` 濾走 `enabled === false`（`HomePage`、`selectors/recordings.ts`、`services/audioProbe.ts` 自動跟）
- `packages/catalog/src/dramas/episodes.ts`：`buildEpisodes` 跳過 `enabled === false` 嘅 arc；`arcAvailabilityOf` 同步
    - 收藏指住下架短篇：照舊行為同下架整套劇一樣（收藏格顯示不可播），唔刪記錄
- `displayName`：`SeriesEpisode` / `ArcAvailability` 帶 `arcLabel = displayName ?? name`；UI label 改用 `arcLabel`（`ArcSheet/arcLabels.ts`、`ArcRow`、`ArcPicker`、`PlayerGauge`、`SavedBox`）；key / URL / ID 繼續用 `name` / `id`
- P9.5 欄位（`summary`、`hosts`、`cast`、`airTime`）只係帶喺 catalog.json，player 唔顯示

### 3. D1 migration `0004_admin.sql`

- `entries.draft INTEGER NOT NULL DEFAULT 0`：掃描自動建立、未齊必須資料嘅廣播劇。`draft = 1`：
    - `PUT` 用寬鬆驗證（容許冇圖、placeholder ID、預設 theme）
    - Publish 唔包；`DELETE` 照准（從未發佈）
    - 一次 `PUT` 通過完整驗證 → 自動清 `draft`
- `scan_findings(id, kind, drama_id, arc_id, detail JSON, created_at, resolved_publish_id)`：記錄掃描發現（新劇 / 新短篇 / 新集數 / 資料夾唔見），待辦矩陣由佢 + entry 現況計；發佈成功就填 `resolved_publish_id`

### 4. API（`apps/api/src/admin/`，全部經 `requireSameOrigin` + `requireSession`）

| Method + path                         | 做咩                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/scan`                      | 列 AUDIO bucket 頂層資料夾（delimited list）→ 每套 `audio.host = r2` 嘅劇用現有 `listingFromR2` + `generateDraft` merge；有 diff → 寫 D1（同一個 D1 batch，bump `updatedAt`）+ 寫 finding。新資料夾 → `generateDraft` 建 `draft = 1` 嘅劇（ID `drama-NN`、`enabled: false`）。新短篇 → `enabled: false`（未排期唔會上架）。有劇資料夾唔見 → 新資料夾唔自動建，寫「需要處理」finding。回 `{ scannedAt, findings, skipped: issues }` |
| `GET /api/todos`                      | 未解決 findings → 矩陣行：每格 `done / must / optional / na` + 跳轉目標（`/dramas/:id/arcs#arc` 等）。必須：資料夾配對、placeholder ID（`drama-NN`、`arc-NN`）、劇嘅唱片 + 橫額、排期（新短篇 / 新劇仲係 `enabled: false` 而冇排程 / 上架日）                                                                                                                                                                                      |
| `POST /api/entries/dramas/:id/rename` | `{ newId }`：只限從未發佈；改 PK + `schedules.drama_id` + findings（一個 batch）                                                                                                                                                                                                                                                                                                                                                   |
| `POST /api/dramas/:id/folder`         | `{ folder }`：配對資料夾（「需要處理」/ 編輯頁 dropdown），之後自動 rescan 嗰套                                                                                                                                                                                                                                                                                                                                                    |
| `GET /api/folders/unmapped`           | 冇劇用緊嘅頂層資料夾（dropdown 用）                                                                                                                                                                                                                                                                                                                                                                                                |
| `PUT /api/order/:kind`                | `{ ids: [...] }`：一個 batch 寫晒 `order`（只排上架嗰段；下架嘅唔郁）                                                                                                                                                                                                                                                                                                                                                              |
| `GET /api/changes`                    | `documentFromEntries`（唔包 draft）vs 最新 `ok` publish → `summarizeChanges` + `validateDocument` 結果（確認發佈頁一次 call）                                                                                                                                                                                                                                                                                                      |
| `GET /api/publishes`                  | 加 `changes`：同上一個 publish 嘅 document 比較（`summarizeChanges`），失敗行帶 `error`（publish 失敗時寫入 `publishes` 新欄 `error TEXT`，入 `0004`）                                                                                                                                                                                                                                                                             |

- 排程 API 唔使改；admin 用現有 `GET/PUT/DELETE/preview`。「舊批次排法唔同」由 admin 對比 `expanded` 同已過日期嘅 `episodeDates` 計（pure function 放 `packages/catalog/src/admin/batches.ts`）
- 圖片：現有 `PUT /api/assets` → admin 收到 `name` 即刻 `PUT` entry（上載即存，唔使再撳儲存）
- 每次入 admin 掃描成本：1 個頂層 list + 每套劇（根 + 每個短篇）各 1 個 list ≈ 40 個 R2 Class A op，單人用可以忽略

### 3a 測試

- `packages/catalog`：新欄位 parser / JSON schema 同步、`parseTitles`（格式錯 / 重複 / 超出）、`summarizeChanges`（新劇 / 新短篇 / 新集數 / 下架 / 排程時間線）、`airTime` 邊界、merge 保留新 arc 欄位
- `apps/api`（workerd + miniflare R2）：`/api/scan`（新資料夾 → draft、新短篇 enabled false、資料夾唔見唔自動建）、draft 寬鬆驗證 + 自動清、publish 唔包 draft、rename 限從未發佈、order batch、todos 每格狀態、changes
- Player：show / arc `enabled: false` 唔顯示、`displayName` label、ID / URL 唔變（現有每劇 `drama.test.ts` pin ID 照綠）

---

## 3b：`apps/admin` SPA

### 1. 結構

```
apps/admin/
  src/
    app/          AppShell（nav + banner + 直向提示）、routes
    api/          fetch wrapper（credentials same-origin、ETag / If-Match、412 / 422 / 409 錯誤型別）
    features/
      update/     UpdatePage（自動掃描 bar、待辦矩陣、確認發佈時間線）
      shows/      ShowList、ShowEditor（播放時間 roller、主持 chips、預覽）
      dramas/     DramaList（短篇欄 + 原位展開）、DramaEditor（基本資料 / 短篇 / 排程 tab）
      history/    HistoryPage（上下架記錄、還原）
    ui/           Toggle（上架 / 下架）、Switch、SortableList、ImageSlot、Chips、TimeRoller、Pill、Tooltip、FlowBar、SaveBar、EditableTitle
    styles/       tokens.css（由 mockup `:root` token 抽出；admin 自己一套，唔用 player theme）
```

- React 19 + Vite 8 + TypeScript + `react-router-dom` 7（全部同 player 一樣版本）；拖曳排序 `@dnd-kit/sortable`（有鍵盤操作：Space 拎起、↑↓、Esc）
- i18n：跟 player `t()` 做法（`apps/admin/src/i18n/zh-HK.ts`，書面語）
- 版本 pill：build 時注入 `apps/api/package.json` version
- 跟 mockup 對應：每個 feature component 頂部註明 `Design Origin: mockup: _mockups_/admin/index.html#<section>`

### 2. Worker 出 admin（`apps/api/wrangler.toml`）

```toml
[assets]
directory = "../admin/dist"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*", "/auth/*", "/catalog/*"]
```

- `/auth/google/callback` 成功繼續 redirect `/`（SPA 入口）；`deniedPage` 照用
- 刪 `apps/api/public/` + `apps/api/scripts/opsPage.test.ts`（ops 頁功能全部喺 admin：發佈、記錄、還原）；`apps/api/README.md` 同步

### 3. CI / Deploy

- `ci.yml`：加 `npm run build -w apps/admin`；admin unit test 入 root `vitest.config.ts` projects；admin e2e（Playwright，mock API route）入現有 e2e job
- `deploy-api.yml`：trigger paths 加 `apps/admin/**`；`wrangler deploy` 之前 `npm run build -w apps/admin`
- QA chain：新增 `admin`（`.claude/CLAUDE.md` chain 清單 + `.proj-docs/qa/plans/admin.md`）

### 4. UX 自檢（UX Flow & Icon-First Rule）

| 流程        | 步驟                                         | 步數 |
| ----------- | -------------------------------------------- | ---- |
| 新短篇設 ID | 撳矩陣「設定」→ 輸入 ID → 儲存並返回待辦     | 3 ✅ |
| 新短篇排期  | 撳「設定」→ 揀預設 chip → 儲存並返回待辦     | 3 ✅ |
| 加圖        | 撳「設定」→ 撳縮圖 → 揀檔（上載即存）        | 3 ✅ |
| 發佈        | 撳「更新內容」/「前往發佈」→ 發佈            | 2 ✅ |
| 排序        | 拖 ⠿（放手即存）                             | 1 ✅ |
| 落架一套劇  | 撳劇 → 撳上架 / 下架掣 → 儲存                | 3 ✅ |
| 改名        | 撳劇 → 雙擊標題 → 輸入 + Enter（Enter 即存） | 3 ✅ |
| 還原        | 撳上下架記錄 → 還原 → 確認                   | 3 ✅ |

- Icon：新增 ＋、✎、⟳、⠿、ⓘ 用同一套 icon set（`lucide-react`），icon-only 一律 `aria-label`
- Animation：展開 / 拖曳 / 儲存成功用 `--motion-*` token（≤ 300ms），全部包 `prefers-reduced-motion`；JS 喺動畫開始先讀 reduced-motion（跟 player `utils/motion.ts` 做法）
- Layout：App shell（nav 固定、內容區自己 scroll）、`100dvh`；直向 < 720px 淨係顯示提示

### 3b 測試

- Unit / component（vitest + Testing Library）：API wrapper（412 / 422 / 409 對應 UI 狀態）、Toggle / Switch / TimeRoller（15 分鐘、≤ 3 小時、改開始自動收窄）、SortableList 鍵盤、episode titles textarea 錯誤行、flow bar「儲存並返回待辦」只喺由待辦入嚟出現
- E2E（Playwright，mock API）：登入 → 自動掃描 → 待辦設 ID + 排期 → 確認發佈 → 上下架記錄見到新一行；拖曳排序；直向手機見提示
- 手動（`wrangler dev` + 本機 admin build）：真 Google login、上載 WebP、publish → player 60 秒內見到

---

## 流程

- Branch：3a 同 3b 各自開（session 指定 branch `claude/charming-heisenberg-8z30x3` 用嚟放 plan + mockup docs；開發 branch 由最新 `origin/main` 開，開 PR 前 `git fetch origin main`）
- `/feature`：3a Backend Developer（+ player label 改動，Design Origin `baseline:`）→ Code Review → QA S1（`api`、`catalog-data`、`drama`、`home`）→ CI 綠 → merge → DevOps（D1 migration `0004` + Worker）
- 3b Frontend Developer（Design Origin `mockup: _mockups_/admin/index.html`）→ Code Review → QA S1（`admin`、`api`）→ CI 綠 → merge → DevOps
- 批准之後：寫 `.proj-docs/plans/2026-11-10_plan_phase3-admin.md`（本 plan）、主計劃 Phase 3 行更新範圍（加 show / arc `enabled`、`displayName`、P9.5 欄位、圖片上載提前）、`.proj-docs/plans/2026-11-04_plan_requirements-priority.md` P9.5 註明 backend 欄位已喺 Phase 3 預備

## 風險

- 🟡 新短篇 `enabled: false` 直至排期：漏咗排期就唔會上架（待辦矩陣「排期」係必須，擋住確認發佈）
- 🟡 `draft` 寬鬆驗證：一定要確保 publish 唔包 draft，否則壞資料出街（test 覆蓋）
- 🟡 Show `enabled` 濾走之後，`audioProbe` 用 `name` 搵節目：要確認下架節目唔再 probe
- 🟡 自動掃描寫 D1：同 admin 編輯緊同一套劇會 412；admin 收到 412 → 「重新載入」提示（mockup ⑫）
- 🟢 Workers static assets `run_worker_first` 要 wrangler 4：`apps/api` 用緊 `wrangler ^4.158.0`，冇問題

## 驗證（總結）

- `npm test`（全部 projects）、`npm run lint`、`npx tsc -b`、`npm run e2e`（player）+ admin e2e
- 3a deploy 後：`curl POST /api/scan` 冇新嘢時 findings 空；`GET /api/changes` 同最新 publish 比冇改動
- 3b deploy 後（用戶手動）：login → 自動掃描 bar → 拖排序 → 改一個節目簡介 → 確認發佈 → 上下架記錄有新行 → player 60 秒內見到
