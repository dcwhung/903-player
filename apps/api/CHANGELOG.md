# Changelog — @903-player/api

版本跟 SemVer。0.8.0 之前嘅變更見 git log（`apps/api/package.json` 嘅 version bump commit）同 `.proj-docs/deploys/`。

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
