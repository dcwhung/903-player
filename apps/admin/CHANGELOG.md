# Changelog — @903-player/admin

版本跟 SemVer。0.1.0 之前嘅變更見 git log（`apps/admin/package.json` 嘅 version bump commit）同 `.proj-docs/deploys/`。

## 0.10.0 — 2026-11-22

草稿一致性（2026-11-22 codebase audit AU-020 至 AU-023）。

### Added

- 未儲存就離開會問（AU-023）：節目 / 劇集編輯頁同「App 外觀」嘅名稱與簡介有未儲存改動時，app 內轉頁（導覽、breadcrumb、上一頁）出「放棄未儲存的變更？」確認框（留下 / 離開）；重新整理或關 tab 出瀏覽器原生提示。編輯頁自己儲存之後嘅跳轉（改 ID、返回待辦、刪除）同頁內切換 tab 唔會問
- 確認發佈頁版本守衛（AU-021，要 api 0.14.0）：撳「發佈」時如果內容已經喺其他視窗或裝置變更，唔會發佈；頁面顯示提示同最新摘要，檢查後要再撳一次。重讀失敗會講明未能載入，並提供「重新載入」
- 頁面 render 出錯時顯示書面語錯誤提示同「重新載入」，取代 React Router 預設英文畫面

### Changed

- Router 改用 data router（`createBrowserRouter`），路由表不變
- 排程「刪除」要先確認（只刪排程規則，各集已設定嘅日期不變）；有未儲存改動時「刪除」排程同「配對」資料夾停用並顯示提示（AU-022）
- 重新掃描唔再還原你清空咗嘅欄位：本機刪走嘅欄位當係本機改動

### Fixed

- 圖片上載 / 配色 / R2 自動裁切撞到版本衝突自動重試之後，草稿會對齊最新已儲存版本；未儲存提示只列你真正改過嘅欄位，之後儲存唔會再靜靜還原另一個視窗嘅改動（AU-020）
- 刪除排程之後待辦同導覽數字即時更新（AU-022）

## 0.9.4 — 2026-11-22

改劇集 ID 修正（2026-11-22 codebase audit AU-013）。

### Fixed

- 改劇集 ID 再儲存：server 已將自動編號短篇 ID（`<舊 ID>-NN`）改做 `<新 ID>-NN`，草稿而家跟住改先 PUT，唔再將短篇 ID 寫返舊嘅，亦唔再因為短篇有排程而撞 409
- 改 ID 成功但儲存失敗：編輯頁會搬去新 ID（連 `#短篇` 同 `?todo=`），草稿同錯誤提示保留，再撳儲存係普通儲存，唔會再改一次 ID
- 淨係改 ID、冇其他改動：唔再送多一個 PUT
- 改 ID 後「確認 ID」會用新嘅短篇 ID

## 0.9.3 — 2026-11-17

分段掣統一（用戶 2026-11-17 決定）：新共用元件 `ui/SegmentedTabs`。

### Changed

- 「App 圖示」dialog 嘅裝置掣（iPhone / Android / 瀏覽器分頁）同劇集「類型」（短篇集 / 每日播）改用排程「編輯｜預覽」嘅樣：膠囊軌道 + 一粒共用嘅主色膠囊，換選項時滑過去（減少動態就直接換）；兩組都可以用 ← → / Home / End 換
- 「所有裝置使用同一裁切」打咗剔時成組裝置掣停用，冇一個顯示揀中（同之前一樣）；停用字色唔再半透明

### Removed

- `ui/Switch` 同舊 `.view-tabs` / `.view-pill` / `.switch` / `.icon-dialog .seg` 樣式（由 `.seg-tabs` 取代）

## 0.9.2 — 2026-11-17

內建預設 App 圖示嘅 Android maskable 改成滿版（用戶 2026-11-17 決定）。

### Fixed

- 「App 外觀」卡用「內建預設」圖示時，Android（圓形 / 方形）預覽唔再四邊留空：內建 maskable 預覽（`assets/icon/icon-maskable-192.png`）由 `apps/player/scripts/generateIcons.mjs` 重新生成，同 0.9.1 自訂 maskable 一樣滿版（原圖置中正方形裁切 = 「調整 App 圖示」預設框，底色 `#98bdde` 只喺透明位見到），同調整 dialog 一致；player 1.37.3 嘅內建 `icon-maskable-512.png` 一齊改

## 0.9.1 — 2026-11-16

App 圖示裁切 dialog 修正（用戶 2026-11-16 報告）。

### Fixed

- 「更換 / 調整 App 圖示」撳裝置分頁（iPhone / Android / 瀏覽器分頁）後唔再成個 dialog 同頁面變暗：裁切框外嘅暗位只喺原圖入面（另一層 `.dim`，裁走圖外），框同右下角拉柄唔受影響
- Android 單獨調（圓形裁切框）時暗位右邊唔再出現一條大弧（圓框陰影）
- Android（圓形 / 方形）預覽同上載嘅 maskable 512 PNG 唔再四邊留空：裁切框 = 成張圖（實線圈 = 遮罩邊界），虛線圈（框嘅 80%）= 安全區，遮罩底色只喺透明位見到；iPhone / 瀏覽器分頁輸出不變

## 0.9.0 — 2026-11-16

App 圖示重新裁切（用戶 2026-11-16 決定：存原圖 + 裁切框，重新裁切唔會越裁越差）。要 api 0.13.0。

### Added

- 「App 外觀」→ App 圖示卡：「iPhone 主畫面」「Android（圓形）」「Android（方形）」預覽係掣（鍵盤可用，aria-label「調整 iPhone 主畫面圖示」等，hover / focus 用現有 token）。撳就開「調整 App 圖示」：由原圖 + 上次嘅框 / 遮罩底色開始，預先揀嗰個裝置、取消「所有裝置使用同一裁切」，其他裝置嘅框照舊。Android 圓形同方形係同一張 maskable，兩個都開 Android
- 更換 App 圖示時連原圖（`PUT /api/assets/source`）+ 每個裝置嘅框 + 同一裁切一齊存（`branding.icon.source`）；調整時原圖已存就唔再上載，五張 PNG 由原圖重新畫
- 內建預設圖示：由 repo 原圖（`design/app-icon.png` 副本，內建底色 `#98bdde`）開始，儲存時連原圖上載
- 呢個版本之前上載嘅自訂圖示（冇原圖）：用已上載嘅 512 × 512 圖示代替原圖，dialog 出提示；儲存後就有原圖記錄

### Fixed

- 未發佈嘅短篇（「新」）唔再將上架日已過嘅批次當「已上架」：排程全部集數改得、tab 細字「已排程（未發佈）」、時間軸冇 ✓，儲存唔再寫入舊 `listed` 批次；排程 tab 加提示「此短篇尚未發佈，前台看不到；發佈後按排程上架。」

### Changed

- 處理待辦表格：「簡介」欄放喺「排期」之前；「新內容」標題刪走「只可選擇已設定完成的項目」提示

## 0.8.3 — 2026-11-16

Batch review：`.proj-docs/reviews/2026-11-16_review_admin-player-fixes_batch.md`（T1–T5 + cleanup）。

### Added

- 「處理待辦」/「確認發佈」stepper 步驟撳得：同更新頁「下一步」共用 `usePublishPlan`，未載入 / 載入失敗 / 冇嘢揀時唔畀跳（T3）

### Changed

- 處理待辦頁列出其他已儲存改動（「其他改動」，淨係顯示、一定一併發佈）；側欄待發佈數計埋其他改動同 App 外觀（T1）
- 刪除 entry 成功即刻由清單拎走、返回清單頁（`replace`），背景再重讀（T2）
- 「沒有待發佈的項目。」只喺真係乜都冇嘅時候出；套用配色 / 圖片即存 / R2 自動裁切成功後重讀待發佈改動（T4）
- 發佈 / 部署記錄頁：部署中 / 失敗 / 不明嘅部署 pill 本身連去 GitHub run（`noopener noreferrer`），已部署係 pill、無需部署唔出（T5）
- 更新頁「下一步」直接用 `usePublishPlan` 嘅路徑，同 stepper 同一個來源（S-1093）

## 0.8.1 — 2026-11-15

### Changed

- 編輯頁有未儲存改動時，「還原」掣（欄位旁、圖位圓形掣、「其他已修改」）唔再灰咗顯示，改為隱藏；「已修改」照出，儲存或者復原之後掣即刻返嚟（用戶 2026-11-15：所有頁面 disabled 嘅還原掣隱藏）
- App 外觀頁「還原 App 圖示」「還原名稱與簡介」同首頁 Banner「還原首頁 Banner」：內建預設（冇得還原）時唔顯示，唔再灰咗（C-023）
- 掣隱藏時欄位標題行保持同一高度，輸入框唔會上下跳（S-1012）
- 「還原」掣寫死 line-height（`--revert-btn-line-height`），標題行最細高度由同一組 custom property 計：載入 Poppins / Noto Sans TC 之後掣隱藏都唔會再令輸入框跳 2px；確認框嘅「還原 N 項」維持原本高度（S-1012）
- App 外觀頁（App 圖示、名稱與簡介）同首頁 Banner 還原成功、「還原」掣消失之後，focus 搬去同一張卡嘅「更換」/「儲存」；「儲存」唔撳得就搬去卡標題，唔再跌落 body（S-1013）
- 刪走冇再用嘅 `revert.dirtyTip` 文字
- 確認框入面嘅「還原 N 項」冇剔任何一項時照舊灰咗（確認框必須有確認掣）

## 0.8.0 — 2026-11-14

配 api 0.12.0（`reorder` change item、`POST /api/order/:kind/revert`、entry 還原拒絕 `order`）。Plan：`.proj-docs/plans/2026-11-14_plan_publish-change-accuracy.md`（#5、#6 決定 A）。

### Added

- 確認發佈頁時間線：拖曳排序改為成個列表一張卡「[修改] 節目排序已更改」/「[修改] 廣播劇排序已更改」（即時上線組最頂、還原記錄之後；卡頭排序 icon，冇 entry 名 / 碟面）+ 最右「還原」（aria-label「還原節目排序」/「還原廣播劇排序」）。冇發佈剔格，同其他已儲存改動一樣
- 排序還原：沿用還原確認框「還原節目排序？」/「還原廣播劇排序？」，一項「節目排序」/「廣播劇排序」（預設剔）→「還原 1 項」→ `POST /api/order/:kind/revert` → toast「已還原節目排序」/「已還原廣播劇排序」→ 待辦 / entry / 變更重讀；409 `notPublished` 喺框入面講「此項目尚未發佈，無法還原」；卡冇咗 focus 搬去頁面標題（S-1007）
- 發佈 / 部署記錄頁：`reorder` 一行「修改 · 節目排序 / 廣播劇排序」，冇縮圖、冇狀態 pill、冇 entry 名

### Changed

- 統計卡「修改」計埋排序；淨係排序都可以發佈（「發佈」掣、更新頁「下一步」照開）
- 編輯頁「已修改」用 catalog `sameJson` 比較（唔理 key 次序）：配色值一樣、key 次序唔同唔再當已修改（#5）
- 編輯頁唔再出排序（`order`）嘅還原，「其他已修改」一行都冇（#6：排序喺確認發佈頁成個列表還原）
- `RevertFlow` 改收 `perform`（entry 還原 / 排序還原共用確認框、toast、focus）
- 發佈 / 部署記錄頁「還原」掣同確認框「還原」掣改用統一淺紅底還原樣式（`.revert-btn`）
- 版本 pill「Admin vX」改顯示 admin 版本（`apps/admin/package.json`，`__ADMIN_VERSION__`），唔再用 api 版本

### Unchanged

- 舊發佈記錄嘅 `fields: ['images']` 照出「圖片」

## 0.7.0 — 2026-11-14

配 api 0.11.0（`GET /api/entries/:kind/:id` 嘅 `published`、`POST /api/entries/:kind/:id/revert`）。Design Origin：`_mockups_/admin-revert/index.html`（用戶確認）。

### Added

- 確認發佈頁時間線：「修改」/「下架」行（劇本身或者某個短篇）最右「還原」；新節目 / 新劇 / 新短篇 / 新集數、劇本身刪咗、少咗集數冇。短篇名唔做 link，冇「全部還原」
- 還原確認框「還原<名>？」：逐項剔格（預設全剔，冇剔 = 淡咗 + 虛線框），圖並排「已發佈 / 目前」、文字前後、配色色塊、下架行「恢復上架」；「還原 N 項」，冇剔就灰。確認 → `POST …/revert`（If-Match）→ toast「已還原<名>」→ 待辦 / entry / 變更重讀（嗰行即刻冇咗）；412 重讀再試、409（未發佈 / 短篇有排程）、其他錯誤喺框入面用書面語講
- 編輯頁（節目、劇集基本資料、短篇 tab 每個短篇）：同已發佈唔同嘅欄位，標題旁「已修改」+「還原」、輸入框下面「已發佈：…」；圖位鉛筆旁紅色圓形還原掣（「還原橫圖」/「還原碟面」）+ 圖名旁「已修改」。名稱 = 標題旁；配色 = 配色 tab 頂行；上架狀態 + 下架日期（`enabled` / `removedAt`）= 「狀態」欄（確認框逐個剔）；冇編輯位嘅欄位（R2 資料夾、排序、各集標題等）= 表格最尾「其他已修改：…」一行。有未儲存改動時還原掣灰咗（title 講原因）；還原完重讀 entry。從未發佈嘅節目 / 劇 / 短篇乜都唔出

### Changed

- 「刪除」掣（`button.ghost-danger`，包括排程刪除、App 外觀還原預設）同所有「還原」掣一樣：淺紅底 `--danger-bg` + 紅字 `--danger-ink`
- 節目簡介改用同劇集 / 短篇一樣嘅 `SummaryField`（多咗 500 字上限）
- 還原成功後 focus 唔再跌返去頁面最頂：搬去同一個欄位嘅輸入框；確認發佈頁就搬去同一張卡，卡都冇咗就搬去頁面標題（S-1007）
- 短篇從未發佈嘅 409 改講「此短篇尚未發佈，無法還原」（S-1011）
- 編輯頁（包括「其他已修改」一行）唔出新集數（`episodes` / `episodeDates`）嘅還原，同確認發佈頁一樣由發佈剔格處理（S-1008）

## 0.6.0 — 2026-11-14

配 api 0.10.2（劇同短篇嘅「修改」分開報，換圖寫明橫圖 / 碟面）。Design Origin：`_mockups_/admin-publish-summary/index.html`（B v2）。

### Changed

- 確認發佈時間線重做：按幾時上線分組（「即時上線 · 按「發佈」後」綠點；「11 月 16 日 · 星期一」accent 點），組內每套劇 / 節目一張卡（卡頭碟面 + 名），下面縮排逐行：劇本身嘅改動寫「劇集」/「節目」+ 欄位 chip（例如「修改 · 劇集 · 碟面」），短篇行有短篇自己嘅碟面（冇就用劇集碟面）+ 短篇名 + 欄位 chip 或者「第 39–40 集」；新劇一行「新劇 · 全 N 集」。類型 tag：新 = 綠、修改 = 橙、下架 = 紅、App 外觀 = 藍
- 今次發佈嘅 App 外觀（名稱與簡介 / App 圖示 / 首頁 Banner）喺即時上線組最頂各自一張卡；圖示 / 名稱與簡介寫完整重新部署說明「發佈後自動重新部署播放器（約 5 分鐘）；已安裝的 App 須重新安裝方會更新圖示」，Banner 冇
- 確認發佈頁（方案 1）：拎走「本次發佈」卡同統計卡下面嗰行數量 pill（「＋1 短篇」「App 外觀已更改」等），成頁 = 四格數字 → 時間線 → 發佈；「✓ 驗證通過」、驗證錯誤、配色警告照舊
- 未完成項目（待辦未完成 + server 自動剔走嘅揀選）改喺時間線最尾「不會在本次發佈 · 設定完成後可再發佈」一組：灰點、虛線框、灰階碟面，按劇分卡，每行「[未完成] 短篇碟面 短篇名 原因（例如尚未設定排期）」；冇就唔出
- 確認發佈頁底「返回待辦」掣字改為「返回」（讀屏照讀「返回待辦」）；編輯頁 flow bar 嘅「返回待辦」不變

### Fixed

- 時間線短篇縮圖：冇 `id` 嘅短篇用名對返短篇（同 catalog 一樣），唔再一律用劇集碟面

## 0.5.1 — 2026-11-14

### Fixed

- 發佈 / 部署記錄：「修改」嘅狀態 pill 改用確認發佈頁同一套欄位標籤（之前顯示原本 key，例如「theme」；短篇欄位顯示 `arcs.<id>.<key>`），短篇寫短篇名，認不到嘅寫「其他」

## 0.5.0 — 2026-11-14

### Added

- 確認發佈「本次發佈」同時間線嘅「修改」寫埋改了哪些欄位，例如「修改 · 蘭茜夫人劇場（配色、簡介）」；短篇欄位寫短篇名（「戀愛二分一：簡介、聲演」）。來源係 `GET /api/changes` 已有嘅 `detail.fields`，api 不變；認不到嘅欄位顯示「其他」

## 0.4.0 — 2026-11-13

### Changed

- 側邊選單左上 banner（收合時嘅 app icon）由「去更新頁」改為收合 / 展開選單，同底部收合掣一樣（`aria-expanded`；讀屏讀「903 Player Admin Admin v…（收合選單 / 展開選單）」）；冇 button 框同 hover 底色

## 0.3.1 — 2026-11-13

配 api 0.10.1。

### Fixed

- 節目編輯頁：從未上架過嘅節目（淨係以下架發佈過）出返「刪除」掣，唔再顯示「已發佈的項目不可刪除」

## 0.3.0 — 2026-11-13

選擇發佈（`.proj-docs/plans/2026-11-13_plan_selective-publish.md`，配 api 0.10.0）。Design Origin：`_mockups_/admin-selective-publish/index.html`（Q1–Q4）。

### Added

- 更新頁「App 外觀」section：只列同上次發佈不同的項目（App 圖示 / 名稱與簡介 / 首頁 Banner，`GET /api/changes` `appearance`），全部冇改就唔出；表頭「項目 · 狀態 · 發佈」，狀態 pill 跟 App 外觀頁（自訂 · 未發佈 / 內建預設 · 未發佈）
- 待辦矩陣最後一欄「發佈」：`selectable` 勾選框（預設勾，Q1）、`incomplete` 只顯示「未完成」（冇勾選框，tooltip 列出未設定項目）、`always`（新集數）顯示「一併發佈」；撳勾選格唔會跳去編輯頁
- 更新頁底「已選擇 N 項發佈 · M 項未完成（不會發佈）」；冇揀任何新內容 / App 外觀、又冇其他改動 →「未選擇任何內容」+「下一步」灰（Q4）
- 確認發佈頁「本次發佈」：揀咗的新內容、App 外觀、其他已儲存的改動（`others.items`，Q3）；「以下項目尚未完成，不會在本次發佈：…」；App 外觀重新部署提示移入呢張卡
- 選擇用 URL `?selection=` 帶去確認發佈頁（reload 照用；冇就用更新頁而家的選擇 / 預設選擇），`GET /api/changes?selection=` 計統計、時間線、驗證；「發佈」送 `POST /api/publish { selection }`，`skipped` 唔係空就 toast 講明；422 `unknown selection keys` → 提示「重新載入」（重讀資料 + 返更新頁）

### Changed

- 「必須處理」唔再擋「下一步：確認發佈」：未完成的新內容今次唔發佈（設定照留，下次再揀）
- 設定完成的待辦行唔再變淡（佢哋正係今次會發佈的行）

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
