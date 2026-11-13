# Changelog — @903-player/api

版本跟 SemVer。0.8.0 之前嘅變更見 git log（`apps/api/package.json` 嘅 version bump commit）同 `.proj-docs/deploys/`。

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
