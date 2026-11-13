# Changelog — @903-player/admin

版本跟 SemVer。0.1.0 之前嘅變更見 git log（`apps/admin/package.json` 嘅 version bump commit）同 `.proj-docs/deploys/`。

## 0.1.0 — 2026-11-12

Phase 4 L2（`.proj-docs/plans/2026-11-12_plan_phase4-5.md`）。Design Origin：`_mockups_/admin-phase4/index.html`（Q1–Q17）。

### Added

- 封面裁切編輯器（碟面 / 橫圖 / 首頁 Banner 共用）：候選「置中裁切」（可拖框 + 右下角縮放，鎖輸出比例）、「完整 · 模糊背景」、「完整 · 延伸邊緣」；右邊用 player 碟面 / 橫圖 / banner 樣式即場預覽
- 原圖上限：邊長 8000 px（讀檔頭，decode 前檢查）、檔案 20 MB；輸出再對 `ASSET_MAX_BYTES` 檢查（S-805 / S-816）
- 原圖或裁切範圍細過輸出尺寸：黃色放大警告（唔阻上載）
- R2 原圖自動裁切：開劇集編輯頁 / 重新掃描後，已儲存版本有 slot 冇圖 → 讀 `sources` → `r2-source` → 置中裁切 → 上載 → 一次儲存（最新 ETag，412 重讀再試）；碟面用 `cd cover`，冇就 `cover photo`；橫圖用 `cover photo`；冇原圖 / 唔係 R2 劇靜靜雞略過；每個 slot 每次開頁只試一次
- 配色編輯器（節目 + 廣播劇）：「現用」+ 碟面抽色三套候選（細版 player 預覽 + AA / ⚠ N，用 `packages/catalog` 嘅 `checkThemeContrast`）、「更換另外三套」（九套輪換）、「套用」；新劇現用 =「未設定（中性灰）」，第一套標「建議」但唔自動套用；`titleFont` / `headerRule` 唯讀顯示、儲存時原封不動
- 首頁 Banner 頁：窄版 → 闊版兩步裁切（「上一張」記住兩步嘅裁切），「上載兩張」先寫入；中途取消兩張都唔換；「還原預設」要確認
- 發佈頁：配色警告（對比度 + 未設定配色）收埋一行摘要「N 項配色警告（不影響發佈）」+「展開」（有驗證錯誤就全部展開），每行有連結去對應配色；驗證錯誤譯做中文（首頁 Banner 缺圖：「首頁 Banner 不完整：缺少闊版（2000 × 400）」+「前往 Banner 頁」；譯唔到顯示原文）；banner 有改動都算可發佈
- 抽色回歸參考 test：用 player 13 套人手配色嘅碟面跑抽色，記錄最接近候選嘅色差（只做參考，唔 block）

### Changed

- tile 介面名改為「橫圖」，首頁嗰個叫「首頁 Banner」（S-893）
- 尺寸提示用 `aria-describedby` 連住上載掣；載入 / 上載中 dialog 鎖住，Esc / 撳外面唔收（S-817）
