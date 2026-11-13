# Changelog — @903-player/admin

版本跟 SemVer。0.1.0 之前嘅變更見 git log（`apps/admin/package.json` 嘅 version bump commit）同 `.proj-docs/deploys/`。

## 0.2.0 — 2026-11-13

App 外觀 branding（`.proj-docs/plans/2026-11-13_plan_branding.md`）。Design Origin：`_mockups_/admin-appearance/index.html`（v2，Q1–Q6）。

### Added

- App 外觀頁（`/appearance`，`/banner` 轉址照舊）：卡次序 App 圖示 → 名稱與簡介 → 首頁 Banner
- App 圖示卡：狀態 pill（內建預設 / 自訂 · 未發佈 / 自訂）、還原（確認）、更換；預覽原圖、iPhone 圓角、Android 圓形 / 方形、瀏覽器分頁，置中平均用盡闊度
- 更換 App 圖示 dialog（Q6）：揀本機檔（PNG / JPG / WebP）→ 正方形裁切；「所有裝置使用同一裁切」（預設勾選），取消後 iPhone / Android / 瀏覽器分頁各自裁切（Android 框有安全區虛線圈）；Android 遮罩底色 4 色（由 icon 邊緣抽 2 色 + 黑 + 白）；輸出五張 PNG（favicon 64、apple-touch 180、icon 192 / 512、maskable 512，maskable 縮入 80% 安全區置中填底色）逐張 `PUT /api/assets`（`image/png`）再 `PUT /api/branding/icon`；原圖細過 512 × 512 黃色警告
- 名稱與簡介卡（Q2 / Q3）：App 名、短名、簡介 + 提示 + WhatsApp 分享預覽同主畫面預覽（即時更新）；短名 > 12 字元黃色提示；字數；「儲存」有改先可以撳；App 名有改 → 確認；「還原」（確認）
- 發佈頁：`brandingChanged` 加入變更摘要「App 外觀已更改」+「須重新部署」提示
- 發佈 / 部署記錄每行加部署狀態 pill（無需部署 / 未設定自動部署 / 部署中 / 已部署 / 部署失敗）；`triggered` 行 poll `GET /api/publishes/:id/deploy`（有上限 / 間隔常數，離開頁面停）；失敗有 GitHub 連結 + 「重新部署」

### Changed

- `index.html` 分頁 icon 改為 `/api/branding/favicon`（跟已發佈嘅 App 圖示）
- 首頁 Banner 頁（`BannerPage`）併入 App 外觀頁第三張卡（`BannerCard`）

## 0.1.0 — 2026-11-12

Phase 4 L2（`.proj-docs/plans/2026-11-12_plan_phase4-5.md`）。Design Origin：`_mockups_/admin-phase4/index.html`（Q1–Q17）。

### Added

- 封面裁切編輯器（碟面 / 橫圖 / 首頁 Banner 共用）：候選「置中裁切」（可拖框 + 右下角縮放，鎖輸出比例）、「完整 · 模糊背景」、「完整 · 延伸邊緣」；右邊用 player 碟面 / 橫圖 / banner 樣式即場預覽
- 原圖上限：邊長 8000 px（讀檔頭，decode 前檢查）、檔案 20 MB；輸出再對 `ASSET_MAX_BYTES` 檢查（S-805 / S-816）
- 原圖或裁切範圍細過輸出尺寸：黃色放大警告（唔阻上載）
- R2 原圖自動裁切：開劇集編輯頁 / 重新掃描後，已儲存版本有 slot 冇圖 → 讀 `sources` → `r2-source` → 置中裁切 → 上載 → 一次儲存（最新 ETag，412 重讀再試）；碟面用 `cd cover`，冇就 `cover photo`；橫圖用 `cover photo`；冇原圖 / 唔係 R2 劇靜靜雞略過；每個 slot 開頁只試一次，⟳ 重新掃描之後仲係冇圖嘅 slot 再試一次（做緊嘅唔重複）；掃描先發現嘅新短篇要儲存後先試
- 配色編輯器（節目 + 廣播劇）：「現用」+ 碟面抽色三套候選（細版 player 預覽 + AA / ⚠ N，用 `packages/catalog` 嘅 `checkThemeContrast`）、「更換另外三套」（九套輪換）、「套用」；新劇現用 =「未設定（中性灰）」，第一套標「建議」但唔自動套用；`titleFont` / `headerRule` 唯讀顯示、儲存時原封不動
- 首頁 Banner 頁：窄版 → 闊版兩步裁切（「上一張」記住兩步嘅裁切），「上載兩張」先寫入；中途取消兩張都唔換；「還原預設」要確認
- 發佈頁：配色警告（對比度 + 未設定配色）收埋一行摘要「N 項配色警告（不影響發佈）」+「展開」（有驗證錯誤就全部展開），每行有連結去對應配色；驗證錯誤譯做中文（首頁 Banner 缺圖：「首頁 Banner 不完整：缺少闊版（2000 × 400）」+「前往 Banner 頁」；譯唔到顯示原文）；banner 有改動都算可發佈
- 上下架記錄：讀 `GET /api/publishes` 嘅 `changes.bannerChanged`（api 0.8.1，S-903）；淨換首頁 Banner 嗰次顯示「更換 · 首頁 Banner」，唔再顯示「沒有內容變更」；同其他變更一齊時排喺最後；舊 api / 舊記錄冇呢個欄位當冇換
- 抽色回歸參考 test：用 player 13 套人手配色嘅碟面跑抽色，記錄最接近候選嘅色差（只做參考，唔 block）

### Changed

- tile 介面名改為「橫圖」，首頁嗰個叫「首頁 Banner」（S-893）
- 尺寸提示用 `aria-describedby` 連住上載掣；載入 / 上載中 dialog 鎖住，Esc / 撳外面唔收（S-817）
