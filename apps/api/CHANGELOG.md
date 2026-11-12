# Changelog — @903-player/api

版本跟 SemVer。0.8.0 之前嘅變更見 git log（`apps/api/package.json` 嘅 version bump commit）同 `.proj-docs/deploys/`。

## 0.8.0 — 2026-11-12

Phase 4 L1（`.proj-docs/plans/2026-11-12_plan_phase4-5.md`）。

### Added

- 首頁 banner：`GET` / `PUT` / `DELETE /api/banner`（migration `0005_banner.sql`，D1 單行草稿；`DELETE` = 還原預設）
- Publish 有 banner 就寫入 `catalog.json` 嘅 `banner: { standard, long }`
- `PUT /api/assets` 白名單加 banner 兩個尺寸（1200×517、2000×400，`ASSET_DIMENSIONS`）
- Publish 警告（唔阻 publish）：`POST /api/publish` 同 `GET /api/changes` 回 `warnings`（theme contrast 唔合格、未設定配色 = `NEUTRAL_THEME`）
- `GET /api/changes` 加 `bannerChanged`
- R2 原圖：`GET /api/dramas/:id/sources`（即場掃 cd cover / cover photo key）、`GET /api/r2-source?key=`（白名單 = 最新掃描結果，上限 20 MB，只准圖片，ETag / 304）
