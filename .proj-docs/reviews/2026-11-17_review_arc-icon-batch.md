# Batch Review — 2026-11-17 — arc / icon batch

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/admin-player-fixes-6fzdtw` HEAD `9f777d7`，`git diff 703b95b...HEAD`（56 檔，+1759 / −229）
- 流程：Batch（3 個 item）；Tier **T2**（admin 0.8.x → 0.9.0、api → 0.13.0、D1 migration `0007`）
- Review Item ID：今次用 **S-1096 – S-1099**（冇 C / W）
- 總評：**✅ pass（100 / 100）**。冇三層收斂嘅 🔴 / 🟡；4 條 🟢 / Observation（見下）。

## 整體 verdict

- 涵蓋 commit：`a969e39` + `5a87b5a`（Section A）；`7336a20`、`3e8a294`、`e05fb96`、`f4d99b2` + `59bfcfe`（Section B）；`4438da0`、`9f777d7`（Section C）
- Hard gates：lint / tsc / unit / coverage / no-critical / security / E2E all pass
    - `npm run lint` exit 0；`npx tsc -b apps/admin apps/api apps/player` exit 0
    - Admin：`npm test -- apps/admin/src/features/{appearance,dramas,update} apps/admin/src/app/appIcon apps/admin/src/styles/iconPreviews apps/admin/src/i18n` → 49 files / 316 tests 全綠（包括 `writtenChinese.test.ts`）
    - API：`npm run test -w apps/api` 會跑 full suite，被 `reviewer-test-scope` hook 擋（Hard Rule #7）；改為跑相關檔 `npx vitest run test/brandingSource.test.ts test/branding.test.ts test/assets.test.ts`（cwd `apps/api`）→ 3 files / 67 tests 全綠
    - Coverage（改咗嘅核心邏輯）：appearance + `stripModel` / `scheduleModel` 合計 Stmts 95.0% / Branch 90.9% / Lines 96.9%；最低 `useIconUpload.ts` Stmts 82%（Lines 100%）
    - 冇新依賴（`package-lock.json` 只改 version）
    - E2E：CI run `43966063612`（head `9f777d7`）success（Detect code changes、Lint, unit & build、E2E (Playwright) 全綠）
- Version bump：admin 0.9.0、api 0.13.0，CHANGELOG 有 Added / Fixed / Changed ✅

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                        |
| -------- | ------- | ------- | ----------------------------------------------------------- |
| 正確性   | 25      | 25      |                                                             |
| 安全性   | 20      | 20      | session + same-origin、415 / 422 / 413、source 唔入 catalog |
| 可維護性 | 20      | 20      |                                                             |
| 測試覆蓋 | 15      | 15      | S-1099（🟢，唔扣分）                                        |
| 性能     | 10      | 10      |                                                             |
| 代碼風格 | 10      | 10      |                                                             |
| **總分** | **100** | **100** |                                                             |

**結果：✅ pass**

## Section A — /fix 未發佈短篇排程（`a969e39`）

- `isArcLive` = `!neverPublished && !isNewArc && isArcPublished !== false`（未知照舊當上過架，同 `isArcPublished` 一致）；`scheduleContextOf(..., { published: false })` → `listed: []`、`unlisted: {}`，所以時間軸、可上 / 下架範圍、儲存都唔再帶舊 `listed`
- 所有 caller 都改咗：`scheduleContextOf` 只有 `ArcSchedule` + `arcTabNote` 用；`timelineModel` 全部由 ctx 推，冇其他地方顯示「已上架」
- `keepsPlan`：未發佈 periodic 規則由第一批起計排唔返同一套日子就改為自訂批次，唔會靜靜改日子
- 新字串「此短篇尚未發佈，前台看不到；發佈後按排程上架。」「已排程（未發佈）」書面語 ✅
- 測試：stripModel / scheduleModel / timelineModel unit + ScheduleTab（冇鎖集數 + 提示；重排唔帶舊 listed）+ e2e `liveArcs` fixture
- 評分：100；發現：冇

## Section B — /feature App 圖示重新裁切（api 0.13.0 / admin 0.9.0）

- **Auth**：`assetRoutes` 掛喺 `apiRoutes.use('*', requireSameOrigin, requireSession)` 之下，`PUT /api/assets/source` 自動受保護
- **大小 / 類型**：`bodyLimit(R2_SOURCE_MAX_BYTES = 20 MiB)` 喺讀 body 之前 → 413；Content-Type 白名單（去參數、唔分大細楷）→ 415；magic bytes（PNG 8 byte、JPEG `FF D8 FF`、WebP `RIFF????WEBP`）→ 422；admin `loadSource` 用同一套類型同 20 MB 上限
- **儲存**：content hash 命名、R2 先 D1 後；重複上載回 200 `existed`（同 bytes ⇒ 同 magic ⇒ 同副檔名，key 一致）；`/catalog/v1/img/` 嘅 `SERVED_IMAGE_FILE_PATTERN` 已經收 png / jpg / webp，admin 讀得返原圖
- **`source` 驗證**：形狀要完全一樣（多 key → 400）；框要有限、≥ 0、非空、≤ 8000 px；檔名 pattern + D1 `hasAsset` + R2 `head` → 422；D1 存嘅 JSON 壞咗就當冇原圖（admin 用 512 圖示代替）
- **唔會漏入 catalog.json**：`branding/document.ts iconOf` 只揀 `ICON_IMAGE_KEYS` + `maskableBackground`；publish、selective publish、rollback、`/api/changes` 全部經呢個 builder；`brandingSource.test.ts` 鎖住
- **Migration 0007**：兩欄 nullable `ADD COLUMN`，舊行唔受影響；`deploy-api.yml` 先 `d1 migrations apply` 後 `wrangler deploy`，冇「新 Worker SELECT 未有嘅欄」嘅空檔
- **Admin**：預覽改為 `<button>`（有 `aria-label` / `title`）；過場放喺 `prefers-reduced-motion: no-preference`，用現有 `--motion-*` token；書面語 ✅；內建圖示由同 repo 原圖開始（`appIcon.node.test` 鎖住係同一張）；舊圖示用 512 圖示代替並出提示
- 評分：100；發現：S-1096、S-1097、S-1098、S-1099（全部 🟢）

## Section C — /fix 待辦表格（`4438da0`）+ CHANGELOG（`9f777d7`）

- `TODO_COLUMNS` 「簡介」排喺「排期」之前；刪咗 `update.contentHint` 同 i18n key（tsc 過，冇其他引用）；兩個新 test 鎖住
- CHANGELOG 0.9.0 Fixed / Changed 對得上 Section A / C
- 評分：100；發現：冇

## 🟢 / Observation

- **S-1096**（Observation）`apps/api/src/catalog/serve.ts:86`：原圖（≤ 20 MB）同其他圖一樣經公開嘅 `/catalog/v1/img/<hash>.<ext>` 出（長 cache）。catalog.json 冇呢個檔名，16 hex hash 估唔到，風險低；只係記錄「原圖係公開 URL」
- **S-1097**（Observation）`apps/api/src/assets/routes.ts:113`：每次「更換」都會喺 R2 多一張 ≤ 20 MB 原圖，冇 GC（同其他 content-hash 圖一樣，舊設計）。admin 用量好細，暫時唔使處理
- **S-1098**（🟢）`apps/api/src/branding/iconSource.ts:291`：框只限 8000 px 上限，冇對原圖實際尺寸（Worker 冇 decode）。只係 admin 草稿資料，admin 每次由原圖重新畫，唔影響前台
- **S-1099**（🟢）`apps/admin/src/features/appearance/useIconUpload.ts:12-29`：Branch 62.5%，`!crop.ready` / `renderIcons` 失敗兩條路冇 unit test（行為同搬出嚟之前一樣）

## ✅ 做得好嘅地方

- API 驗證分層清楚：形狀 400 → 內容 422 → 唔讀 D1 / R2 先驗框；舊 client 唔傳 `source` 照用得
- `isArcLive` 未知時照舊當上過架，唔會因為列表未載入就解鎖已上架集數
- 測試有咬力：API 覆蓋 415 / 422 / 413 / 未上載 / 唔入 catalog.json；admin 鎖住內建原圖同 repo 原圖一致

## 🟢 處理建議（backlog 同一 session 清晒）

| ID     | 建議                | 原因                                                                              |
| ------ | ------------------- | --------------------------------------------------------------------------------- |
| S-1096 | 當 Observation 結案 | hash URL 估唔到、原圖本身唔敏感；要收起就要另開 auth 圖路由，唔抵                 |
| S-1097 | 當 Observation 結案 | 所有 content-hash 圖都冇 GC（舊設計），admin 更換次數極少                         |
| S-1098 | 當 Observation 結案 | Worker 唔 decode 原圖，驗唔到實際尺寸；admin-only 草稿，唔影響前台                |
| S-1099 | 而家修（lane 內）   | 加兩個 unit test（`!ready` → encodeFailed；`renderIcons` 錯誤回錯誤文字），細改動 |
