# 2026-11 新需求 + Bug Fix — Priority Plan

**日期**：2026-11-04
**來源**：Google Doc「903 player requirement」（`13H2Eztc89UrXvo6VYAtmhqYd7qL2PjgPg9xFKtyN8nc`）
**Base**：v1.21.5（`main` @ `5ddbaeb`）
**Priority 準則**（用戶確認）：Bug → 結構 → UX → 新功能

> 原文件有兩個「3/」，最尾「3/ Scan QR」重新編做 **11**；第一個 3/ 拆做 **3a**（bug）同 **3b**（動畫）。

---

## Grill 結論

| #   | Item      | 決定                                                                                                                                          |
| --- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | 內頁把手  | 只限闊橫版；內頁照舊（左播放器、右清單），**最右邊多一條把手**「播放中：A」；喺 B 撳播放 → 把手變「播放中：B」；撳返回 → 把手放大返主頁右邊卡 |
| 5   | 關閉語意  | 只限闊橫版；**唔改行為**（✕ 照舊 = v1.21.1 行為），只係把手加字眼「已暫停：xxx」                                                              |
| 6   | 即將上架  | 劇集未來短篇：`drama.json` 預先登記未來上架日嘅短篇 / 集數，顯示「即將上架」+ 日期                                                            |
| 7   | Bookmark  | 成集收藏，有「我的收藏」清單                                                                                                                  |
| 9   | Home view | Apple 新產品 Home view 適用 UI；**Park**，等用戶補 link / 規格                                                                                |
| 11  | Scan QR   | 跨機搬進度：A 機出 QR，B 機 scan 即 import（無 server，數據入 URL）；test 性質                                                                |

---

## Priority 表

| Priority | #        | Item                                                                                                      | 類型           | Command / Branch                                   | Version | Preview-First                    | 依賴                                  | Size |
| -------- | -------- | --------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------- | ------- | -------------------------------- | ------------------------------------- | ---- |
| P0       | 3a       | 右邊 player「重溫」pill margin 唔夠（1300×800）                                                           | Bug            | `/fix` `fix/home-card/rewatch-pill-margin`         | PATCH   | ❌（修 baseline）                | —                                     | S    |
| P0       | CUI-0017 | 兩個 tab 搶輸嘅停喺舊版（現有 ticket，Medium）                                                            | Bug            | `/fix` `fix/pwa/CUI-0017_second-tab-update`        | PATCH   | ❌                               | —                                     | M    |
| P1       | 8        | Folder restructure（`dramas/` + `shows/` 歸同一 parent；component 按 page / 功能分 sub-folder；唔改功能） | Refactor       | `/refactor` `refactor/structure/folder-hierarchy`  | PATCH   | ❌                               | 要喺所有 UI 工作之前做，避免 conflict | L    |
| P2       | 5        | 把手加「已暫停：xxx」字眼（唔改 ✕ 行為）                                                                  | UX             | `/feature` `feature/home-card/handle-paused-label` | MINOR   | ✅ 把手文字                      | P1                                    | S    |
| P3       | 4        | 內頁右邊把手 + 返回放大 + 同步                                                                            | UX             | `/feature` `feature/home-card/inner-page-handle`   | MINOR   | ✅                               | P2                                    | L    |
| P4       | 3b       | 右邊 player 開 / 轉節目動畫                                                                               | UX             | `/feature` `feature/motion/player-card`            | MINOR   | ✅（同 1、2 一份 motion mockup） | P3                                    | M    |
| P5       | 1        | 節目 / 廣播劇 Elastic tab animation                                                                       | UX             | `/feature` `feature/motion/elastic-tabs`           | MINOR   | ✅                               | P1                                    | S    |
| P6       | 2        | 開節目 / 劇集：card 放大 fade out + 內頁放大 fade in                                                      | UX             | `/feature` `feature/motion/card-zoom`              | MINOR   | ✅                               | P1；要兼容現有 View Transitions       | M    |
| P7       | 7        | 成集收藏 + 我的收藏清單                                                                                   | 新功能         | `/feature` `feature/bookmark/episode`              | MINOR   | ✅                               | P1                                    | M    |
| P8       | 6        | 劇集「即將上架」短篇                                                                                      | 新功能         | `/feature` `feature/drama/coming-soon`             | MINOR   | ✅                               | P1；schema + JSON schema 改動         | M    |
| P9       | 11       | QR 跨機搬進度（test）                                                                                     | 新功能（實驗） | `/feature` `feature/sync/qr-transfer`              | MINOR   | ✅                               | P7（收藏都要搬）                      | M    |
| P10      | 10       | iPhone Duo 四種姿勢適配                                                                                   | 新裝置         | `/feature` `feature/layout/iphone-duo`             | MINOR   | ✅                               | P1–P6 layout 穩定之後                 | L    |
| Parked   | 9        | Apple Home view UI                                                                                        | 新裝置         | —                                                  | —       | —                                | 等用戶規格                            | ?    |
| Backlog  | CUI-0016 | `HomePageWide.test.tsx` flake（Low）                                                                      | Test           | `/fix`                                             | PATCH   | ❌                               | —                                     | S    |

### 可平行 lane（`sw-parallel-dispatch`）

| Lane | Items           | 備註                                       |
| ---- | --------------- | ------------------------------------------ |
| A    | 3a → 5 → 4 → 3b | 全部掂 `HomePlayerCard` / 把手，必須順序做 |
| B    | 1、2            | motion，可同 lane A 平行（P1 完成之後）    |
| C    | 7 → 11、6       | 資料層 + 新頁面                            |
| 獨立 | CUI-0017        | `src/pwa/`，可即刻同 P0 平行               |

---

## 未解決問題（開工前再問）

| #   | 問題                                                                                  |
| --- | ------------------------------------------------------------------------------------- |
| 3b  | 動畫款式：slide-in 由右入？轉節目用 crossfade 定 flip？                               |
| 2   | Card zoom 會唔會取代現有 View Transitions（`TRANSITION_NAME.gauge` / `panel`）？      |
| 4   | 內頁把手喺直版 / 手機打橫（矮螢幕）唔出，對嗎？                                       |
| 6   | 「即將上架」短篇喺主頁劇集格、全集一覽表定 chips 顯示？可唔可以預先聽（應該唔可以）？ |
| 7   | 收藏入口放邊（主頁新 tab？）；收藏係咪都要「新」/ 進度圓環？                          |
| 8   | 新 folder 結構先出一份 tree proposal 俾你確認                                         |
| 10  | 冇真機：用 viewport 模擬四種姿勢尺寸，要你提供 / 確認尺寸                             |
| 11  | QR 容量有限（約 2–3 KB）：只搬「未聽完 + 收藏」，定全部進度？                         |
| 9   | Home view 規格 + link                                                                 |
