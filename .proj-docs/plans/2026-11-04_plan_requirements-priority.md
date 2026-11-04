# 2026-11 新需求 + Bug Fix — Priority Plan

**日期**：2026-11-04
**來源**：Google Doc「903 player requirement」（`13H2Eztc89UrXvo6VYAtmhqYd7qL2PjgPg9xFKtyN8nc`）
**Base**：v1.21.5（`main` @ `5ddbaeb`）；**2026-11-04 更新**：`main` 已到 v1.21.9（`0a46920`）
**Priority 準則**（用戶確認）：Bug → 結構 → UX → 新功能

> 原文件有兩個「3/」，最尾「3/ Scan QR」重新編做 **11**；第一個 3/ 拆做 **3a**（bug）同 **3b**（動畫）。

---

## Grill 結論

| #   | Item      | 決定                                                                                                                                                                            |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | 內頁把手  | 只限闊橫版；內頁照舊（左播放器、右清單），**最右邊多一條把手**「播放中：A」；喺 B 撳播放 → 把手變「播放中：B」；撳返回 → 把手放大返主頁右邊卡                                   |
| 5   | 關閉語意  | 只限闊橫版；**唔改行為**（✕ 照舊 = v1.21.1 行為），只係把手加字眼「已暫停：xxx」                                                                                                |
| 6   | 即將上架  | 劇集未來短篇：`drama.json` 預先登記未來上架日嘅短篇 / 集數，顯示「即將上架」+ 日期                                                                                              |
| 7   | Bookmark  | 成集收藏，有「我的收藏」清單                                                                                                                                                    |
| 9   | Home view | Apple HomeView（7 吋 1088×1088 方形）：新增 `square` layout、閒置即 ambient（代替距離感應）、夜間低光主題、睡眠 timer；**同 10 一齊出 v2.0.0 MAJOR**，preview confirm 先寫 code |
| 11  | Scan QR   | 跨機搬進度：A 機出 QR，B 機 scan 即 import（無 server，數據入 URL）；test 性質                                                                                                  |

---

## Priority 表

| Priority | #            | Item                                                                                                                                               | 類型           | Command / Branch                                   | Version             | Preview-First                          | 依賴                                  | Size |
| -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------- | ------------------- | -------------------------------------- | ------------------------------------- | ---- |
| P0       | 3a           | 右邊 player「重溫」pill margin 唔夠（1300×800）                                                                                                    | Bug            | `/fix` `fix/home-card/rewatch-pill-margin`         | PATCH               | ❌（修 baseline）                      | —                                     | S    |
| ~~P0~~   | ~~CUI-0017~~ | ✅ **已完成**（v1.21.6，PR #156；S-648 Shift-reload 跟進 v1.21.9，PR #159）                                                                        | Bug            | —                                                  | —                   | —                                      | —                                     | —    |
| P1       | 8            | Folder restructure（`dramas/` + `shows/` 歸同一 parent；component 按 page / 功能分 sub-folder；唔改功能）                                          | Refactor       | `/refactor` `refactor/structure/folder-hierarchy`  | PATCH               | ❌                                     | 要喺所有 UI 工作之前做，避免 conflict | L    |
| P2       | 5            | 把手加「已暫停：xxx」字眼（唔改 ✕ 行為）                                                                                                           | UX             | `/feature` `feature/home-card/handle-paused-label` | MINOR               | ✅ 把手文字                            | P1                                    | S    |
| P3       | 4            | 內頁右邊把手 + 返回放大 + 同步                                                                                                                     | UX             | `/feature` `feature/home-card/inner-page-handle`   | MINOR               | ✅                                     | P2                                    | L    |
| P4       | 3b           | 右邊 player 開 / 轉節目動畫                                                                                                                        | UX             | `/feature` `feature/motion/player-card`            | MINOR               | ✅（同 1、2 一份 motion mockup）       | P3                                    | M    |
| P5       | 1            | 節目 / 廣播劇 Elastic tab animation                                                                                                                | UX             | `/feature` `feature/motion/elastic-tabs`           | MINOR               | ✅                                     | P1                                    | S    |
| P6       | 2            | 開節目 / 劇集：card 放大 fade out + 內頁放大 fade in                                                                                               | UX             | `/feature` `feature/motion/card-zoom`              | MINOR               | ✅                                     | P1；要兼容現有 View Transitions       | M    |
| P7       | 7            | 成集收藏 + 我的收藏清單                                                                                                                            | 新功能         | `/feature` `feature/bookmark/episode`              | MINOR               | ✅                                     | P1                                    | M    |
| P8       | 6            | 劇集「即將上架」短篇（⚠️ 另一個 session 已開任務卡，開工前先查有冇 branch / PR）                                                                   | 新功能         | `/feature` `feature/drama/coming-soon`             | MINOR               | ✅                                     | P1；schema + JSON schema 改動         | M    |
| P9       | 11           | QR 跨機搬進度（test）                                                                                                                              | 新功能（實驗） | `/feature` `feature/sync/qr-transfer`              | MINOR               | ✅                                     | P7（收藏都要搬）                      | M    |
| P10      | 10           | iPhone Duo 四種姿勢適配                                                                                                                            | 新裝置         | `/feature` `feature/layout/iphone-duo`             | **MAJOR（v2.0.0）** | ✅ **Gate：confirm preview 先寫 code** | P1–P6 layout 穩定之後                 | L    |
| P10      | 9a           | HomeView `square` layout mode（`src/config/layout.ts` 加 `SQUARE_QUERY`；`homeLayoutMode.ts` 加 `square`：左節目格、右播放卡、字 / 掣按 7 吋放大） | 新裝置         | `/feature` `feature/layout/home-view-square`       | **MAJOR（v2.0.0）** | ✅ **Gate：confirm preview 先寫 code** | P1–P6                                 | L    |
| P10      | 9b           | HomeView 閒置 ambient（大字現正播放 + 時間；一掂返詳細）                                                                                           | 新裝置         | `/feature` `feature/layout/home-view-ambient`      | **MAJOR（v2.0.0）** | ✅ **Gate：confirm preview 先寫 code** | 9a                                    | M    |
| P10      | 9c           | 夜間低光主題（ambient 用暗、低對比）                                                                                                               | 新裝置         | `/feature` `feature/layout/home-view-night`        | **MAJOR（v2.0.0）** | ✅ **Gate：confirm preview 先寫 code** | 9b                                    | S    |
| P10      | 9d           | 睡眠 timer（N 分鐘自動暫停，`src/player/` 新模組）                                                                                                 | 新功能         | `/feature` `feature/player/sleep-timer`            | **MAJOR（v2.0.0）** | ✅ **Gate：confirm preview 先寫 code** | —                                     | M    |
| Backlog  | CUI-0016     | `HomePageWide.test.tsx` flake（Low）                                                                                                               | Test           | `/fix`                                             | PATCH               | ❌                                     | —                                     | S    |

### v2.0.0 MAJOR release（9a–9d + 10）

- 9a–9d 同 10 各自 feature branch 開發，**唔獨立 release**；全部 merge 晒先一齊 bump `1.x.x → 2.0.0`
- 做法：各 branch 先 merge 入 `release/v2.0.0` 整合 branch，所有 2.0.0 之前嘅 MINOR / PATCH（P0–P9）照常喺 `main` 出 1.x
- **Preview Gate（用戶要求）**：寫任何 9 / 10 code 之前，先出靜態 HTML preview 交用戶確認；冇 confirm → Reviewer 🔴 reject
    - `_mockups_/home-view/index.html`：方形 split、ambient 大字畫面、夜間低光、睡眠 timer 入口
    - `_mockups_/iphone-duo/index.html`：四種姿勢（闔上直 / 闔上橫 / 打開直 / 打開橫）並排 + 側邊 rail 導覽
- Hard Rule 7：release 前**必須跑 full suite**（unit + e2e），開跑前先知會用戶（版本變化、指令、預計時間）；唔全綠唔可以 tag / merge / deploy

#### HomeView 規格（applealmond 文章）→ 影響

| 硬件特點                                     | 對 app 影響                                        | 決定                            |
| -------------------------------------------- | -------------------------------------------------- | ------------------------------- |
| 7 吋 1088×1088 方形，220 ppi                 | CSS 當正方形係 portrait → 而家跌入手機直版 `stack` | 9a 新增 `square` layout mode    |
| UI 隨距離變（遠 = 大時間 + 簡潔，近 = 詳細） | Web 冇距離 / 鏡頭辨識 API                          | 9b 閒置即 ambient；一掂返詳細   |
| 最低 0.3 nit、床頭櫃                         | 夜間用                                             | 9c 夜間低光主題 + 9d 睡眠 timer |
| 16:9 只得 1088×612                           | 闊版橫額圖唔啱                                     | square 用方形 / 裁切橫額        |
| 空間音訊、Center Stage 鏡頭、廚房模式        | 系統層 / 同電台 app 無關                           | 唔做                            |

### 可平行 lane（`sw-parallel-dispatch`）

| Lane | Items                 | 備註                                       |
| ---- | --------------------- | ------------------------------------------ |
| A    | 3a → 5 → 4 → 3b       | 全部掂 `HomePlayerCard` / 把手，必須順序做 |
| B    | 1、2                  | motion，可同 lane A 平行（P1 完成之後）    |
| C    | 7 → 11、6             | 資料層 + 新頁面                            |
| D    | 9a → 9b → 9c；9d 獨立 | HomeView；preview confirm 咗先開工         |

---

## 未解決問題（開工前再問）

| #       | 問題                                                                                                |
| ------- | --------------------------------------------------------------------------------------------------- |
| 3b      | 動畫款式：slide-in 由右入？轉節目用 crossfade 定 flip？                                             |
| 2       | Card zoom 會唔會取代現有 View Transitions（`TRANSITION_NAME.gauge` / `panel`）？                    |
| 4       | 內頁把手喺直版 / 手機打橫（矮螢幕）唔出，對嗎？                                                     |
| 6       | 「即將上架」短篇喺主頁劇集格、全集一覽表定 chips 顯示？可唔可以預先聽（應該唔可以）？               |
| 7       | 收藏入口放邊（主頁新 tab？）；收藏係咪都要「新」/ 進度圓環？                                        |
| 8       | 新 folder 結構先出一份 tree proposal 俾你確認                                                       |
| 10      | 冇真機：用 viewport 模擬四種姿勢尺寸，要你提供 / 確認尺寸                                           |
| 11      | QR 容量有限（約 2–3 KB）：只搬「未聽完 + 收藏」，定全部進度？                                       |
| 9       | CSS viewport 實際尺寸：假設 DPR 2 → 544×544（冇真機，用 Playwright 模擬）                           |
| 9b      | ambient 閒置幾多秒先轉？冇播嘢時 ambient 顯示乜（今日節目？時鐘？）                                 |
| 9d      | 睡眠 timer 選項（15 / 30 / 60 分？播完呢集？）同入口位置；所有 layout 都用得，要唔要提早喺 1.x 出？ |
| 9a / 10 | 方形 layout 同 iPhone Duo 共用 adaptive layout 基礎，先做邊個？                                     |
