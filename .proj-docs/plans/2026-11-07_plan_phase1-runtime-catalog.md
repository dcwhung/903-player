# Backend Phase 1：Player 喺 runtime 讀 `catalog.json`（v1.30.0）

## Context

Phase 0 已經上線：monorepo + `@903-player/catalog`，版本 v1.29.1。而家每一次加劇、改上下架都要 rebuild。Phase 1 目標係令 player 可以喺 runtime 讀一份 `catalog.json`；Phase 2 嘅 backend 之後就 publish 呢份檔，唔使再 rebuild。

主計劃：`.proj-docs/plans/2026-11-06_plan_backend-admin.md`。

用戶 2026-11-07 決定：

| 決定     | 內容                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 生效時機 | 趁 splash 時攞新資料。開 app 嗰陣喺 splash 期間 fetch `catalog.json`，最多等 1.5 秒；攞到就**今次即刻用**；冇網、太慢或者資料壞，就用上次 cache，再唔得就用 app 內建資料 |
| 開關     | 先關住上線。冇設定 catalog URL，app 就照用內建資料，用戶零變化；Phase 2 backend 可以 publish 先開                                                                        |
| 最高原則 | 現有用戶零影響：episode ID、storage key、URL、上下架邏輯都唔准變                                                                                                         |

## 核心設計：每次開 app 揀一次資料來源，啟動前決定

Catalog 係開 app 時喺 splash 期間決定嘅，**一次 session 只揀一次，中途唔會換**。所以唔使將大約 25 個 consumer 改用 React context：

- 現有 module-level function（`enabledDramas()`、`SHOWS`、`findShow()` 等）照用，只係內部改為讀「今次啟動揀咗嘅 registry」。
- Diff 細好多，33 個直接 import registry 嘅 unit test 唔使改，因為預設仍然係內建資料。
- 代價：用緊 app 嗰陣，新 publish 嘅內容要下次開 app 先見到。符合用戶揀嘅「趁 splash」。

### 啟動次序（`apps/player/src/main.tsx`）

```
1. await initCatalog()   ← 新：URL 未設定就即刻 resolve（內建）；有就 fetch，最多 1.5s
2. migrateStorage()      ← 原有，要喺 catalog 定咗之後先跑
3. AudioController / UpdateManager / registerSW   ← 原有
4. render(<App/>)        ← splash 一直由 index.html 遮住；hideSplash 最少 2s 嘅規則照舊
```

## 要做

### A. `packages/catalog`：`catalog.json` 格式同 parser

- 新 `src/document/`：
    - `CatalogDocument` v1：`schemaVersion: 1`、`generatedAt`、`shows[]`、`dramas[]`。每項格式係 `{ id, definition, images: { "<file>": "<absolute URL>" } }`，`definition` 同而家 `show.json` / `drama.json` 一模一樣。
    - `parseCatalogDocument(unknown)`：任何一項唔合格就**成份拒絕**，然後 fallback。
    - `documentSource(doc)`：轉做現有 `FolderSource`。`folderSource.ts` 已經預留咗呢個 seam，`readImage` 嘅「檔案存在」檢查自然變成「manifest 有列出」。
- `schemas/catalog.schema.json` 加 JSON schema 同 runtime parser 一致性 test（跟 `jsonSchemas.node.test.ts` 嘅 pattern）。
- `banner` 欄位留俾 Phase 4，`schemaVersion` 遇到唔識嘅版本就 fallback。

### B. Player：可切換 registry

- 新 `apps/player/src/catalog/runtime.ts`：
    - `initCatalog({ url, fetchImpl, timeoutMs })` 同 `activeSource()`。
    - 預設 source 係而家 `bundledSource`（包括 e2e mode 嘅 `withE2EFixtures`），lazy build；冇 call 過 `initCatalog` 嘅 unit test 照舊攞內建 registry。
    - Remote 文件 parse 通過，**而且**用 `buildRegistry` / `buildShowRegistry` 成功 build 到，先換；否則 fallback，並 `console.warn`。
- `catalog/dramas/index.ts`、`catalog/shows/index.ts`：
    - 由「import 時 build」改為「第一次用時讀 `activeSource()` build，然後 memo」，export 名同簽名不變。
    - `SHOWS` 由 const 改為 getter 或者 lazy array，要確保 `SHOWS.map`、`for…of` 等現有用法照 work。
- `data/recordingValidation.ts` 嘅 `SHOW_IDS` 由 module 載入時計，改為 lazy。
- `initCatalog` 之後唔准再換 source；dev mode 換嘅話 throw，保證一次 session 只揀一次。

### C. Fetch、cache 同開關

- URL 來源係 build-time `VITE_CATALOG_URL`。**未設定就成個功能關住**，`initCatalog` 即刻 resolve，唔會有任何 network request。
- 時限 `CATALOG_FETCH_TIMEOUT_MS = 1500`，係 named constant。
- SW（`vite.config.ts` workbox `runtimeCaching`）：
    - `catalog.json` 用 NetworkFirst，`networkTimeoutSeconds` 同上面一致：快就攞最新，慢或者 offline 就用 SW cache。
    - Catalog 圖片用 CacheFirst（hashed 檔名，immutable），加 expiration 上限。
- R2 CORS 留俾 Phase 2 開關嗰陣設定，Phase 1 唔使。

### D. 工具：由 repo 資料生成 `catalog.json`

- `apps/player/scripts/buildCatalogJson.mjs`：讀 `library/` 生成 `catalog.json`，圖片 URL 用參數指定 base。Phase 1 用嚟做 e2e fixture，Phase 2 用嚟做 migration。
- **一致性 test（最重要）**：由生成嘅 `catalog.json` build 出嚟嘅 registry，同內建 registry 比較每一集嘅 episode ID 同 URL、上下架日期、theme，全部要一樣。呢個就係「用戶零影響」嘅自動證明。

### E. e2e

- E2E build（`--mode e2e`）設定 `VITE_CATALOG_URL` 做同 origin path，由 Playwright route 提供 fixture，唔會觸發 `externalRequests` 檢查。
- 新 section `e2e/remoteCatalog.mjs`，測以下情況：
    1. 正常 catalog 加咗一套測試劇，開 app 即刻見到
    2. 壞 JSON、`schemaVersion` 唔啱，fallback 內建
    3. 超過 1.5 秒，fallback，splash 唔會卡住
    4. 第二次開 app 時 offline，用 SW cache
    5. 冇 catalog 但有 v1 收聽進度，migration 照 work
- 現有 765 項 e2e 用 flag off 嘅路徑照跑，確保預設行為唔變。
- 拆分 build：`e2e` mode 開 flag；正式 build 唔設定，即係關住。

### F. 其他

- Version：MINOR → **1.30.0**。新能力，但預設關住；用戶只會經歷一次平時嘅自動更新。
- `.proj-docs/plans/` 存一份 Phase 1 plan，主計劃 Phase 1 嗰行打 ✅（完成時）。
- Branch：`feature/catalog/runtime-catalog-json`（由 `main` 開）。

## 唔做（留俾之後嘅 phase）

| 項目                                                                          | 留俾    |
| ----------------------------------------------------------------------------- | ------- |
| Prebuild 攞最新 published `catalog.json` 做 snapshot（要有 publish 先有意義） | Phase 2 |
| Banner 讀 catalog                                                             | Phase 4 |
| 動態 show grid                                                                | Phase 5 |
| `appAudioBase` 注入                                                           | Phase 2 |
| 用緊 app 時即時換資料、React context 化                                       | 唔做    |

## 風險

- 🔴 **改咗啟動次序**，`await initCatalog()` 要排喺 render 之前。Flag off 時一定要同步 resolve，唔可以多等一個 tick 令 splash 時間改變；e2e 嘅 `checkSplashRemoved` 5 秒限制照守。
- 🔴 **Module-level `SHOWS` 由 const 變 lazy**：所有 `SHOWS` 用法都要 test 覆蓋，現有 unit test 同 e2e 就係基準。
- 🟡 **Remote catalog 同內建資料不一致**會令 episode ID 唔對，引致進度對唔返。由 D 嘅一致性 test 同 Phase 2 publish 嘅驗證把關。
- 🟡 **SW NetworkFirst 時限要同 fetch 時限一致**，避免雙重等待。

## 驗收

- Unit：
    - `parseCatalogDocument`：合格、缺欄位、唔識嘅 `schemaVersion`、圖片 URL 唔喺 manifest
    - `initCatalog`：off、成功、timeout、壞資料、build 失敗、重複 init
    - 一致性 test：生成 vs 內建
    - `npm test` 全綠
- e2e：新 section + 現有 765 項全綠，CI 引用。
- `npm run lint`、`npx tsc -b`。
- Flag off 嘅 production build 行為同 v1.29.1 一樣：除咗新 code，冇額外 request，啟動時間唔變。
- 流程：Code Review → QA S1 → CI 綠 → merge → DevOps 驗 deploy → 用戶手動確認 v1.30.0。
