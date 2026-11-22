# Changelog — @903-player/api

版本跟 SemVer。0.8.0 之前嘅變更見 git log（`apps/api/package.json` 嘅 version bump commit）同 `.proj-docs/deploys/`。

## 0.14.1 — 2026-11-22

Publish 序列化（2026-11-22 codebase audit AU-018、review S-1430）。冇 D1 migration；冇獨立嘅鎖，所以冇「鎖放唔返」嘅情況。

### Fixed

- 兩個重疊嘅 publish（或者 publish 撞還原）只有一個會落地，R2 嘅 `catalog.json` 同 D1「最新 ok publish」唔會再唔夾：
    - `commitPublish` 要傳 `base`（砌 document 時讀到嘅最新 ok publish id）；最新 ok publish 已經唔係 `base` 就唔寫
    - `publishes` 嘅 insert 改成條件 insert（同一句 SQL 對返最新 ok publish 仲係 `base`），輸咗嗰個乜都冇寫
    - R2 寫入帶條件（commit 開頭讀到嘅 etag 要未變；當時未有 object 就要而家都未有），條件唔啱就刪返啱啱記嗰行
- 輸咗嗰個 request 回 `409 { error: 'another publish finished or is in progress; reload and try again', reason: 'publishConflict' }`（冇 `missing`，同 ID 守衛嘅 409 分得開）；`POST /api/publish`（`?force=1` 都一樣）同 `POST /api/publishes/:id/rollback` 都係
- 還原輸咗（409）時 D1 跟線上：贏咗嗰次 publish 冇帶上線嘅 entry 寫返舊 definition；已經帶埋還原嘅上架狀態上線嘅 entry 保持（唔會出現線上上架、D1 下架）。即係還原冇記錄成 `rollback_of` 行，但佢嘅上架狀態可能已經由贏咗嗰次 publish 發佈
- `unchanged` 要 R2 `catalog.json` 嘅 `customMetadata.hash` 等於最新 ok publish 嘅 hash 先成立：publish 記咗行但 R2 冇寫到（Worker 中途死咗）之後，同一份內容再發佈會真係寫 R2，唔再回 `unchanged`

## 0.14.0 — 2026-11-22

確認發佈版本守衛（2026-11-22 codebase audit AU-021）。舊 client 照用得：`fingerprint` 可以唔傳。

### Added

- `GET /api/changes` 回 `fingerprint`（`<最新 ok publish id 或 0>.<將會發佈嘅 catalog.json 嘅 sha256，唔計 generatedAt>`）；驗證唔過時冇呢個欄位
- `POST /api/publish` 可以帶 `fingerprint`：server 用準備寫入嗰份 document 重新計，對唔上回 412 `stale publish confirmation`，唔寫 `publishes`、唔寫 R2、唔 purge、唔觸發部署；唔係字串回 400；`?force=1` 遇到過時 fingerprint 照回 412。冇帶就同以前一樣

### Changed

- 「內容唔計 `generatedAt`」嘅比較抽成 `contentWithoutGeneratedAt`，`sameContent` 同 fingerprint 共用

## 0.13.2 — 2026-11-22

Import catalog 預設唔再蓋過 D1（2026-11-22 codebase audit AU-017）。Worker 行為冇變，只改 `scripts/importLibrary.mjs`。

### Changed

- `npm run import`：預設只加 D1 未有嘅 entry（`ON CONFLICT DO NOTHING`），已有嘅行（admin 改過嘅 definition / images / `updated_at`）完全唔郁；只上載同記錄要加嗰啲 entry 引用嘅圖，冇嘢要加就唔寫任何嘢
- 新 flag `--overwrite`：還原返之前嘅 upsert（用 repo library 取代已有 entry，`schedules` 唔郁），災難復原先用
- Dry run 同真跑都會印行數：預設 `entries: X to insert, Y existing kept (Z differ from the repo library)`；`--overwrite` 印 `entries: X to insert, Y to overwrite, Z unchanged` 同一行 `WARNING:`

### Fixed

- 讀 D1 嘅回應形狀唔啱（唔係 JSON、空 array、`success: false`、`results` 唔係 array）會喺任何上載 / 寫入之前 exit 1，唔再當成 D1 冇行（W-858）

## 0.13.1 — 2026-11-22

改劇集 ID 嘅短篇改名規則搬去 `@903-player/catalog`（2026-11-22 codebase audit AU-013）；API 行為冇變。

### Changed

- `POST /api/entries/dramas/:id/rename`：`<舊 ID>-NN` → `<新 ID>-NN` 規則改用 catalog 嘅 `withRenamedArcIds`（admin 共用同一份）；SQL `GLOB` 嘅位數跟 `PLACEHOLDER_ARC_WIDTH`，唔再寫死兩位

## 0.13.0 — 2026-11-16

App 圖示重新裁切（用戶 2026-11-16 決定：存原圖 + 裁切框，重新裁切唔會越裁越差）。舊 client 照用得：`source` 可以唔傳，冇原圖嘅圖示照舊有效。

### Added

- `PUT /api/assets/source`：App 圖示原圖（PNG / JPEG / WebP、任何尺寸、≤ 20 MB）原封不動存 R2 + `assets`（`<hash16>.<png|jpg|webp>`）；Content-Type 錯 415、magic bytes 對唔上 422、太大 413
- `PUT /api/branding/icon` 可以帶 `source: { image, same, boxes: { ios, android, tab } }`（原圖檔名 + 每種裝置嘅裁切框 + 「所有裝置使用同一裁切」）；`GET /api/branding` 有就出返。形狀錯 400、框出界 / 原圖未上載 422。只係 admin 草稿資料，唔寫入 `catalog.json`
- Migration `0007_branding_icon_source.sql`：`branding_icon.source_image`、`source_crop`（JSON）

## 0.12.2 — 2026-11-16

本機 CLI `dramaFromFolder` 刪除（S-751）之後嘅清理；API 行為同 admin 見到嘅掃描字眼一字不差。

### Removed

- `packages/catalog` 掃描：`generateDraft` 嘅 `source` 參數、`ScanSource` type（只得 R2 一套字眼 `SCAN_WORDING`）；`episodeUrls` / `coverUrls`（原本畀 CLI `--verify` 用）
- `POST /api/scan`、`POST /api/dramas/:id/scan`、重新掃描唔再傳 `source: 'r2'`

## 0.12.0 — 2026-11-14

變更摘要準確度（`.proj-docs/plans/2026-11-14_plan_publish-change-accuracy.md`）。舊 client 照用得；`reorder` 係新 change kind，識得 0.11.0 item 嘅 client 要加返先顯示到。

### Added

- `POST /api/order/:kind/revert`（`kind` = `shows` / `dramas`）：排序成個列表還原返最新 ok publish 嘅次序。D1 每個 entry 嘅 `definition.order` 換返 published 嘅值（published 冇 `order` = 刪 key；published 冇呢個 entry = 唔郁）；`json_set` / `json_remove` 原地改，唔郁其他欄位，次序冇變嘅 entry 連 `updated_at` 都唔郁。冇 ok publish → 409 `{ error, reason: "notPublished" }`；回 200 `{ updated }`（真係改咗嘅 entry 數）。權限同 `PUT /api/order/:kind` 一樣（session + same-origin）
- 變更摘要（`GET /api/changes`、`GET /api/publishes`）新 item `{ kind: "reorder", when: "now", detail: { list: "shows" | "dramas" } }`（冇 `entry`）：前後都上架嘅 entry 相對次序（同 player 一樣：有 `order` 按 `order`，冇就排最後，再按 id）唔同 → 每個列表一個，排喺 `now` 組最頂（`rollback` 之後）；淨係重新編號、新加 / 拎走 / 落架嘅 entry、第一次發佈唔報
- `packages/catalog` 匯出 `sameJson`（key 次序唔算嘅 JSON 比較，admin 編輯頁用）

### Changed

- `order` 唔再逐個 entry 報「修改」（由 `reorder` 代替）
- `POST /api/entries/:kind/:id/revert` 頂層 `field: "order"` → 400（排序要成個列表還原）

### Fixed

- 選擇發佈：冇揀 / 未完成嘅新短篇由 definition 拎走時，佢 slot 指去嘅圖都由 `images` 拎走（仲有其他 slot 指去就留）；換返上次發佈版本嘅短篇，佢 slot 指去嘅圖用上次發佈嘅值。之前會令確認發佈頁出假「修改 · 劇集 · 圖片」，catalog 亦留低冇用嘅圖（#1 #2）。確認發佈頁預覽同真發佈共用同一條路徑
- 前後兩個版本都冇 slot 指去嘅圖唔再報「圖片」改動（#4）；以前選擇性發佈留喺 production catalog 嘅冇用圖（#3）唔會再出，下次發佈自然清走

## 0.11.0 — 2026-11-14

還原未發佈改動（`.proj-docs/plans/2026-11-14_plan_revert-unpublished.md`）。舊 client 唔受影響。

### Added

- `GET /api/entries/:kind/:id` 加 `published: { definition, images } | null`：最新 ok publish document 入面嗰個 entry（`images` 轉返 `<hash>.<ext>`，同 D1 一樣）；未 publish 過、document 讀唔到（fail closed）或者冇佢 = `null`
- `POST /api/entries/:kind/:id/revert`（要 `If-Match`）：body `{ items: [{ arc?, field }] }`，逐項將 definition key 還原返 published 嘅值（published 冇 = 刪走）；`tile` / `disc` 連圖一齊還原、清走冇 slot 再指去嘅舊圖 key；`enabled` / `removedAt` 還原上下架；短篇 `field: "*"` 成個換返，D1 刪咗嘅短篇加返 published 嘅位置。冇 published / 短篇從未發佈 → 409；shape 唔啱 / 未知 field 或短篇 → 400；寫入同 `PUT` 同一條路徑，回應一樣 `{ updatedAt, draft, warnings }` + ETag。排程規則唔郁
- `packages/catalog` 匯出 `arcIdOf`、`entryImageFile`、`arcImageFile`、`IMAGE_SLOTS`（同變更摘要同一套 slot → 檔名規則）
- 短篇從未發佈嘅 409 帶 `reason: "arcNotPublished"`（同 entry 嘅 `notPublished` 分開，S-1011）
- `tile` / `disc` 兩邊 definition 都冇 key（慣例檔名）照樣還原得，唔再 400（W-745）；`field` 淨係認 own key，`constructor` / `toString` / `__proto__` 等 → 400（W-746）
- `episodes` / `episodeDates`（頂層每日播同短篇）→ 400：新集數唔經還原，由發佈處理（S-1008）
- published 圖 URL 唔係 `/catalog/v1/img/<name>` 格式：還原唔郁 D1 嗰個圖 key（fail closed，S-1009）
- 最新 publish document 按 id + hash cache 喺 isolate 入面，連續 `GET` 多個 entry 只讀 + parse 一次（S-1006）

## 0.10.2 — 2026-11-14

### Changed

- `GET /api/changes`、`GET /api/publishes` 嘅「修改」item（`packages/catalog` `summarizeChanges`）：
    - 劇同短篇分開：劇本身一項 edit；每個短篇各自一項，帶 `arc` ref，`detail.fields` 係短篇 key（唔再係 `arcs.<id>.<key>`）
    - 換圖寫明邊張：逐個 `images` 檔名比較，按 definition 指去嘅檔名（冇寫就用慣例名）報 `tile` / `disc`，短篇就報喺嗰個短篇嘅 item；對唔到欄位先報 `images`；新短篇 / 落架短篇嘅圖唔報

## 0.10.1 — 2026-11-13

### Fixed

- `DELETE /api/entries/shows/:id`：淨係以下架（`enabled: false`）入過 catalog document、從未以上架狀態發佈過嘅節目可以刪（之前最新 document 有佢就 409）；同列表「未上架 / 已下架」同一個判斷。曾經上過架嘅照舊 409；最新 document 讀唔到照拒絕（S-844）。劇集不變

## 0.10.0 — 2026-11-13

選擇發佈（`.proj-docs/plans/2026-11-13_plan_selective-publish.md`）：更新頁有「必須處理」嘅待辦都可以淨發佈揀咗嘅新內容 / App 外觀。冇 `selection` = 舊行為，舊 admin 唔受影響。

### Added

- `POST /api/publish` body 選填 `selection: { content?: string[], branding?: { icon?, text? }, banner? }`：冇揀 / 未完成嘅新劇 / 新短篇唔入今次 catalog（上次發佈有就用上次版本，冇就剔走；D1 唔郁）；冇揀嘅 icon / text / banner 用上次 ok publish 嘅值；回應加 `selection: { content, skipped }`
- 揀咗有「必須處理」（或者 draft）嘅行：自動剔走，列入 `selection.skipped`（`reason: 'incomplete'`）；未知 key → 422 `{ error: 'unknown selection keys', keys }`；格式錯 → 400
- `GET /api/todos` 每行加 `key`（`<kind>/<劇 ID>[/<短篇 ID>]`）同 `publish`（`selectable` / `incomplete` / `always`）
- `GET /api/changes` 加 `appearance: { icon, text, banner }`、`others`（唔計新內容同 App 外觀嘅其他改動）、`unchanged`；選填 `?selection=`（changes / validation / warnings / unchanged / bannerChanged / brandingChanged 跟 selection 計）

### Changed

- 有 `selection` 時發佈後只 resolve 今次真係發佈咗嘅待辦行 findings
- 加固（S-980）：selection key 要合 `<kind>/<劇 ID>[/<短篇 ID>]` 形狀、≤ 200 字元，唔啱 400；`POST /api/publish` body 上限 64 KB（413）；422 `keys` 最多送返頭 20 個
- `admin/changes.ts` 拆出 `changeDocuments.ts`（比較用 document、App 外觀比較）同 `publishChanges.ts`（發佈記錄摘要），行為不變

## 0.9.0 — 2026-11-13

App 外觀（`.proj-docs/plans/2026-11-13_plan_branding.md`）：App 圖示 + 名稱與簡介，publish 後自動重新部署 player。

### Added

- `GET /api/branding`、`PUT` / `DELETE /api/branding/icon`（五張 PNG：favicon 64、appleTouch 180、icon192、icon512、maskable 512 + `maskableBackground`）、`PUT` / `DELETE /api/branding/text`（name ≤ 40、shortName? ≤ 24、description ≤ 200 字）；migration `0006_branding.sql`
- `PUT /api/assets` 收 PNG（`image/png`：signature + IHDR 闊高，只限 icon 四個尺寸），檔名 `<hash16>.png`；WebP 不變
- Publish 寫 `catalog.json` 嘅 `branding: { icon?, text? }`；`GET /api/changes` 同 `GET /api/publishes` 每行 `changes` 加 `brandingChanged`
- Publish 嘅 branding 有改 → 觸發重新部署 player：GitHub `repository_dispatch`（`catalog-branding`）+ Vercel Deploy Hook；選填 secret `GITHUB_DEPLOY_TOKEN`、`VERCEL_DEPLOY_HOOK_URL`（冇 = `skipped`，失敗 = `failed`，都唔影響 publish）
- Publish 記錄加 `deploy`（`none` / `triggered` / `skipped` / `failed`）同 `deployRequestedAt`（`POST /api/publish`、`GET /api/publishes`）
- `GET /api/publishes/:id/deploy`（GitHub Actions `deploy.yml` run 狀態 + 連結）、`POST /api/publishes/:id/deploy`（重新部署）
- `GET /api/branding/favicon`（公開）：302 去已發佈嘅 favicon，冇就 `/favicon.png`
- `deploy-api.yml`：GitHub secret `DEPLOY_GITHUB_TOKEN` / `VERCEL_DEPLOY_HOOK_URL` 有設先同步做 Worker secret（`wrangler secret bulk`），未設就跳過

### Changed

- `PUT /api/banner` 嘅已上載圖檢查抽做 `assets/storedImage.ts`（banner / branding 共用），行為不變

## 0.8.1 — 2026-11-13

Phase 4 L1 review backlog（`.proj-docs/reviews/2026-11-12_review_api-phase4-0.8.0.md`）。API contract 只有加欄位；加 response 欄位當 PATCH，跟 0.7.1 慣例（S-945）。

### Added

- `GET /api/publishes` 每行 `changes` 加 `bannerChanged`（同上一次 ok publish 比 banner；淨換 banner 嗰次 `items` 係空都分得出，S-903）

### Fixed

- `GET /api/r2-source`：`audio.folder` 多層（例如 `a/b`）時用 folder 前綴配對，同 `GET /api/dramas/:id/sources` 一致，唔再一律 404（S-900）
- `GET /api/r2-source`：R2 記嘅 Content-Type `image/jpg` 當 `image/jpeg`，唔再 415（S-904）
- `PUT /api/banner`：R2 有 object 但唔係 WebP 報 `is not a valid WebP`，唔再同冇上載一樣報 `not uploaded`（S-902）

### Changed

- `PUT /api/banner` 驗尺寸只 range get 頭 30 bytes（`parseWebpHeader`），唔再 get 成個 WebP（S-901）
- 由圖檔名攞 hash 抽做 `hashOfImageName`（S-905）

## 0.8.0 — 2026-11-12

Phase 4 L1（`.proj-docs/plans/2026-11-12_plan_phase4-5.md`）。

### Added

- 首頁 banner：`GET` / `PUT` / `DELETE /api/banner`（migration `0005_banner.sql`，D1 單行草稿；`DELETE` = 還原預設）
- Publish 有 banner 就寫入 `catalog.json` 嘅 `banner: { standard, long }`
- `PUT /api/assets` 白名單加 banner 兩個尺寸（1200×517、2000×400，`ASSET_DIMENSIONS`）
- Publish 警告（唔阻 publish）：`POST /api/publish` 同 `GET /api/changes` 回 `warnings`（theme contrast 唔合格、未設定配色 = `NEUTRAL_THEME`）
- `GET /api/changes` 加 `bannerChanged`
- R2 原圖：`GET /api/dramas/:id/sources`（即場掃 cd cover / cover photo key）、`GET /api/r2-source?key=`（白名單 = 最新掃描結果，上限 20 MB，只准圖片，ETag / 304）
