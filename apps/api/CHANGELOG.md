# Changelog — @903-player/api

版本跟 SemVer。0.8.0 之前嘅變更見 git log（`apps/api/package.json` 嘅 version bump commit）同 `.proj-docs/deploys/`。

## 0.11.0 — 2026-11-14

還原未發佈改動（`.proj-docs/plans/2026-11-14_plan_revert-unpublished.md`）。舊 client 唔受影響。

### Added

- `GET /api/entries/:kind/:id` 加 `published: { definition, images } | null`：最新 ok publish document 入面嗰個 entry（`images` 轉返 `<hash>.<ext>`，同 D1 一樣）；未 publish 過、document 讀唔到（fail closed）或者冇佢 = `null`
- `POST /api/entries/:kind/:id/revert`（要 `If-Match`）：body `{ items: [{ arc?, field }] }`，逐項將 definition key 還原返 published 嘅值（published 冇 = 刪走）；`tile` / `disc` 連圖一齊還原、清走冇 slot 再指去嘅舊圖 key；`enabled` / `removedAt` 還原上下架；短篇 `field: "*"` 成個換返，D1 刪咗嘅短篇加返 published 嘅位置。冇 published / 短篇從未發佈 → 409；shape 唔啱 / 未知 field 或短篇 → 400；寫入同 `PUT` 同一條路徑，回應一樣 `{ updatedAt, draft, warnings }` + ETag。排程規則唔郁
- `packages/catalog` 匯出 `arcIdOf`、`entryImageFile`、`arcImageFile`、`IMAGE_SLOTS`（同變更摘要同一套 slot → 檔名規則）

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
