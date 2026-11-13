# 903 Player

自用 PWA，收聽 [hkfm903.live](https://hkfm903.live/) 嘅錄音 archive。

## 功能

- 主頁：橫額下面「節目 / 廣播劇」切換（記住上次揀邊個）；「新」全 app 統一紅底白字膠囊；節目 tab 係 7 個節目 + 今日節目（兩個一行）；橫額釘頂（右下角版本號），矮螢幕節目格按高度分頁（左右掃 / 指示點）；今日有新一集（已上架、未聽完）嘅節目格左上角有「新」
- 自動播放：主頁撳節目格 / 今日節目格，或者直接開節目 / 今日節目 / 每日劇集頁，冇其他嘢載入緊先自動播；mini player 有嘢播緊或者暫停緊（未左滑關閉）就唔蓋過，唱片係未開始樣（節目頁 / 今日節目頁照顯示節目碟面，每日劇集頁係黑碟），撳播放先換；撳嘅節目 / 劇集本身已經載入（就算 mini player 關咗）都唔播，保持暫停。今日節目頁未開始樣時左右掃卡只係換睇邊個節目，撳播放先播。主頁劇集格：撳格只係入頁（短篇劇集永遠唔自動播，入頁都唔播，等用戶撳播放 / 揀集）；撳「繼續收聽」條唔入頁，淨係喺 mini player 播續聽嗰集（會蓋過播緊嘅嘢）
- 任何高度都係固定版面：只有集數 / 節目表清單自己捲；清單播緊嗰行嘅掣變暫停；「現正播放」同清單集名放唔落就用「…」收尾，只有清單播緊（唔計暫停）嗰行先跑馬燈
- 節目頁：節目名按畫面闊度縮字完整顯示、唱片 + 可拖動弧形進度條、−60 / −30 / 播放暫停 / +30 / +60、由頭播放、日子 slider（只列有錄音嘅日子，揀中置中，聽過 ≥ 95% 顯示剔）
- 今日節目頁：香港時間今日嘅節目表；今日有節目播就一定顯示今日（未有錄音嘅灰色「未上架」，全部未上架就顯示灰色唱片、唔自動播），今日冇節目播先顯示最近有錄音嘅日子
- 未上架：probe 試過但原站未有（404）嘅集數照列出，灰色、冇播放掣、撳唔到；播放器、日子條、卡疊、mini player 只用播得到嘅
- 橫版（打橫而且 ≥ 640px 闊，`src/config/layout.ts`）：節目頁 / 今日節目頁左播放器、右清單（唔出日子條，唱片用盡左欄）；
  主頁一頁放晒（手機打橫橫額入格 5 欄 × 2 行，其他橫額成行用闊版圖 + 4 欄）；
  闊 ≥ 1024px 字同掣 × 1.3、iPad 打橫 × 1.5（`--ui-scale`）。Preview：`design/previews/landscape-preview.html`
- 廣播劇（`src/catalog/dramas/library/<id>/drama.json`，見下面「資料檔」）：主頁廣播劇 tab 一行一套劇；全部用淺色主題（頁頂狀態列墊深色帶，iOS 白字睇得清），碟面用劇集圖
    - 芝See菇Bi Family（短篇劇集）：唱片下面「現正播放：短篇 · 第 N 集」（暫停講「已暫停」、揀短篇載入咗未開始講「下一集」，清單行同樣講「已暫停 / 未開始」）+ 短篇 chips 左右掃，揀短篇換集數清單（冇播放時順便載入嗰個短篇嘅續聽集，唔自動播，碟面同時間跟住轉；播緊就淨係換清單）（有集名大字顯示集名，冇就顯示「第 N 集」）；入頁揀中上次聽緊嗰集（聽完就下一集），撳播放先播：未播時碟面係嗰集嘅短篇碟面、唱片兩邊時間同弧形顯示續播位置 / 總長（未聽過嗰集就 --:--）、唱片下面 / chips 上面講「繼續收聽：短篇 · 第 N 集 · 集名」（第一次入未聽過就係黑碟 +「揀一個短篇開始收聽」）；集數同集名之間一律用「 · 」分隔（chips 上面、mini player、鎖屏、主頁「繼續收聽」）；一集播完自動接下一集（播完一個短篇接下一個短篇，最後一集播完就停）；「☰ 全集」釘住 chips 最左，打開全集一覽表（分組：播放中 → 新上架 → 未聽完 → 已聽完；圓環 = 聽完幾多集；右邊掣續聽 / 播未收聽 / ↺ 重聽；✕ / 遮罩 / Escape 或者向下拉閂，直版橫版都得），短篇 chips 同一次序；集數清單照集數次序（聽完嘅留喺原位），入頁 / 轉短篇即刻捲到播緊（或者下一集）嗰集，放喺清單頂、露出半行上一集，向上捲睇返之前集數；自動播下一集就順滑捲過去；轉畫面（打橫 / 打直）都會重新捲返播緊嗰集；新短篇（catalog `addedAt`）上架 14 日內有「新」；主頁劇集格：未聽過 / 播緊時只有短篇數（右下），聽過未播緊就喺圖底出「繼續收聽」掣（短篇數移去右上；直版疊卡撳暗咗嘅卡任何位置都係先 focus），有未聽過嘅新短篇左上角出「新」
    - 黃金少年（短篇劇集，`arcUnit: "season"`）：4 季 126 集，主頁角落「全 4 季」，碟面跟播緊（或者暫停時揀咗）嗰季（每季一張 `arcs/season-N/disc.webp`），未揀季時用系列碟面 `disc.webp`
    - 森美小儀系列（短篇劇集）：7 個短篇 109 集（來不及聽你說愛我 10、公子森林 40（每集有集名）、十九樓半的夏天 10、森之愛情I - 森之聖誕 10（每集有集名）、森之愛情II - 電燈膽 9、森之聖誕2010 15（每集有集名）、森美幻想劇 15），每個短篇有自己碟面（`arcs/<短篇>/disc.webp`）
    - 少爺占系列（短篇劇集）：2 個短篇 38 集（八王子 21、忠孝公路 17），每個短篇有自己碟面
    - 蘭茜夫人劇場（短篇劇集）：3 個短篇 100 集（戀愛二分一 30、初戀無限次 33、我心不死 37），每個短篇有自己碟面
    - 短篇圖：每個短篇有正方形碟面（`arcs/<短篇>/disc.webp`）同長方形圖（`arcs/<短篇>/tile.webp`，16:9 1216×684，`drama.json` arc `tile`）；長方形圖暫時未用，留底防將來要。芝See 嘅短篇喺 R2 冇 cover，兩樣都冇
    - 18 樓 C 座（每日劇集，⚠️ 暫時停用：`src/catalog/dramas/library/c18/drama.json` `enabled: false`，主頁唔出、劇集頁當搵唔到）：同節目頁一樣嘅日子條 + 集數清單，日子條只排有集數嘅日子，重播舊集標「重溫」
    - 播緊廣播劇返主頁唔會停，mini player 改為顯示嗰套劇
    - 集數清單喺每套劇嘅 `drama.json`：芝See 係真清單（12 個短篇、97 集）、黃金少年 4 季 126 集、森美小儀系列 7 個短篇 109 集、少爺占系列 2 個短篇 38 集、蘭茜夫人劇場 3 個短篇 100 集，錄音喺 Cloudflare R2（`DRAMA_AUDIO_BASE`，`<劇集 folder>/<短篇>/<原檔名>`，檔名由 template 砌）；18樓C座 ⚠️ 仲係假資料，錄音未 host，撳播放會一直「連線中…」。Preview：`design/previews/radio-drama-preview.html`
- 主頁 mini player：左右掃轉今日節目；長按 0.25 秒浮起（副題換做「‹‹ 滑動關閉」）之後左滑關閉（似 iOS 鎖屏通知：過一半闊度即關，拉少少露出「⏻ 關閉」掣），關閉 = 停播 + 收起，之後再開始播先出返（唔記落 localStorage，重開 app 照出）；讀屏 / 鍵盤有「關閉播放器」掣。Preview：`design/previews/swipe-dismiss-preview.html`
- 自動續播（進度存喺本機 localStorage）、鎖屏 / 耳機控制、深色 + 跟系統淺色

## 架構

```
GitHub Actions（push main / 手動）
  └─ npm run build → apps/player/dist/ ─► GitHub Pages
PWA（用戶部機）
  ├─ src/services/audioProbe.ts：逐個節目砌錄音網址，用 metadata-only <audio> 試
  ├─ src/services/probeStore.ts：搵到嘅錄音存 localStorage（唯一資料來源）
  └─ <audio> 直接播 audio.hkfm903.live
```

原站冇 JSON API 亦冇 CORS，HTML 站仲封鎖數據中心 IP，所以唔再爬 HTML。
PWA 喺用戶部機度按每個節目嘅播出日，砌過去 14 日嘅錄音網址
（`https://audio.hkfm903.live/<節目>/<YYYYMMDD>_<HHMM>_<節目>.aac`），
用只載 metadata 嘅 `<audio>` 試下有冇（`<audio>` 唔使 CORS），
每個節目保留最新 50 個錄音喺 localStorage，作為唯一資料來源。
GitHub Actions 只負責 build 同 deploy。

## 資料檔（節目 / 廣播劇）

節目同廣播劇都唔寫喺 TypeScript，而係**一個 folder 一套**，build time 由 `import.meta.glob` 自動發現（純邏輯：JSON reader、theme schema、folder source、schema validator、registry，喺 repo 根嘅 `packages/catalog/`，package 名 `@903-player/catalog`）。
加一套 = 新開 folder，放 JSON + 圖，**唔使改 code**；JSON 唔合格 `npm test` 會指出邊個檔邊個欄位（`src/*/catalog.test.ts` / schema validator）。

| 路徑                                                                     | 內容                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/catalog/shows/library/<id>/show.json` + `tile.webp` + `disc.webp`   | `name`（原站節目名，亦用嚟砌錄音網址）、`fileTime`（HHMM）、`airDays`（0 = 日 … 6 = 六）、`order`、`tile`（主頁節目格，16:9 1216×684）、`disc`（碟面，600×600）、`theme`（深色 10 隻色）；optional：`enabled`（`false` = 下架，主頁 / 今日節目 / probe 都唔出）、`summary`、`hosts`、`airTime`（`{ start, end }`，15 分鐘一格，最多 3 小時） |
| `src/catalog/dramas/library/<id>/drama.json` + `tile.webp` + `disc.webp` | `name`、`kind`（`series` 短篇劇 / `daily` 每日劇）、`enabled`、`order`、`arcUnit`、`addedAt` / `removedAt`、`audio`（`host`：`r2` / `app`、`folder`、檔名 `file` template）、`theme`（淺色 + `statusBar` / `headerRule` / `titleFont`）、`arcs` 或 `episodes`、`summary`                                                                     |

- `summary`（≤ 500 字）、`hosts` / `cast`（≤ 12 個，每個 1–40 字）、`airTime` 係 P9.5 預備欄位：只帶喺 catalog，player 暫時唔顯示
- folder 名 = id = route（`/show/:id`、`/drama/:id`），只可以細楷英數同連字號
- 短篇劇 `arcs[]`：`name`（= R2 folder 名）、`episodes`（集數，或者集名 list，冇集名寫 `null`）、`titles`（`{ "集數": "集名" }` 零散補集名）、`firstNo`（有第零集寫 `0`）、`addedAt`（上架日，14 日內出「新」）、`removedAt`（下架日）、`episodeDates`（`{ "11": "2026-11-19" }` 逐集上架：呢集起嘅上架日）、`episodeRemovedAt`（`{ "3": 日子 }` / `{ "1-5": 日子 }` 集數下架）、`disc`（短篇自己碟面）、`tile`（短篇長方形圖，暫時未用）、`files`（`{ "集數": "完整檔名" }` 不規則檔名）、`enabled`（`false` = 下架呢個短篇）、`displayName`（player 顯示名，`name` 照係 R2 folder 名同 key）、`summary`、`cast`
- 上架 / 下架（P8 #6，`_mockups_/coming-soon`）：日子一律係香港時間當日 00:00 起。`addedAt` 係將來日子 = 即將上架（劇集層 = 整套新劇喺主頁書架最尾出灰格、撳唔到；短篇層 = chips / 全集一覽表最尾「即將上架」；`episodeDates` = 集數清單摺埋「第 11–20 集 · 19/11（四）上架」），上架當日自動變正常 + 14 日「新」；未上架短篇可以唔寫 `episodes`（一定要有 `addedAt`）。`removedAt` / `episodeRemovedAt` 前 30 日出琥珀色「⏳ 快將下架」，當日起清單、chips、書架、最近收聽、繼續收聽全部收埋，收藏 tab 保留灰色「已下架」行（進度唔刪，刪咗 `removedAt` 就返晒出嚟）；一集嘅有效下架日 = 劇集 / 短篇 / 集數三層最早嗰個
- 檔名 template token：`{no}` `{no2}` `{noZh}`（中文數字）`{arc}` `{folder}` `{title}`；`[ … ]` 入面 token 空值就整段略去，例如 `{no2} - {arc} - 第{noZh}集[ - {title}].m4a`。每日劇用 `{date}` / `{yyyymmdd}`
- ⚠️ `name` / `fileTime` / `audio` / 檔名唔可以亂改：錄音網址係已儲進度（localStorage）嘅 key
- Editor 自動完成 + 即時驗證：`packages/catalog/schemas/drama.schema.json`、`packages/catalog/schemas/show.schema.json`（JSON Schema draft-07，hover 有廣東話說明，色有色盤）。VS Code 靠 `.vscode/settings.json` 嘅 `json.schemas` 自動套用，資料檔唔使加 `$schema`；其他 editor 可以喺檔頭加 `"$schema": "../../../../../../../packages/catalog/schemas/drama.schema.json"`（runtime 唔理呢個 key）。
  Schema 刻意嚴過 runtime：多出嚟 / 打錯嘅 key 會出紅線（runtime 只係唔理）。以下淨係 runtime（`npm test`）驗：圖檔真係喺 folder、folder 名格式、arc name / 每日 date 唔重複、`titles` / `files` / `episodeDates` / `episodeRemovedAt` 集數喺範圍之內、上架 / 下架日先後（下架遲過上架；短篇唔遲過劇集、集數唔遲過短篇；`episodeDates` 遞增）、`episodeRemovedAt` 範圍唔重疊。
  兩邊規則由 `packages/catalog/src/core/jsonSchemas.node.test.ts` 對住同一批例子鎖住（現有資料檔合唔合 schema 由 `apps/player/src/catalog/libraryJsonSchemas.node.test.ts` 驗）；改 `schema.ts` 記得一齊改 schema
- 橫版主頁 grid 寫死 4 欄 × 2 行 = 7 個節目 + 今日格；加減節目要一齊改 `ShowGrid.module.css`（`src/catalog/shows/lib/shows.test.ts` 會提醒）

### 內建資料：prebuild snapshot（Backend Phase 2b-2）

D1（`apps/api`）已經係內容 SSoT，repo `library/` 只係 fallback。Production build 時（`VITE_CATALOG_URL` 有設定）Vite plugin `scripts/catalogSnapshot.ts` 喺 `buildStart`：

1. 清走舊 `src/catalog/snapshot/data/`（gitignored；每次 build 都清，唔會用本機殘留）
2. Fetch 最新 publish 嘅 `catalog.json`（timeout `SNAPSHOT_FETCH_TIMEOUT_MS`）→ 用 player runtime 同一套 validator 驗（`parseCatalogDocument` + 兩個 registry）
3. 下載全部圖（同時最多 `SNAPSHOT_IMAGE_CONCURRENCY` 張；包括首頁 `banner` 兩張），sha256 前 16 hex 一定要等於檔名
4. `images` 同 `banner` 改寫做檔名 → 先寫 `data.tmp/`，全部成功先 rename 做 `data/`
5. Build log 印 `[catalog-snapshot] hash … · generatedAt … · N images`（hash = publish hash，可以同 admin 上下架記錄對）

`src/catalog/snapshot/source.ts` 用 `import.meta.glob` 包入 bundle（圖經 Vite hash 入 `dist/assets/`，PWA 自動 precache），`dramas` / `shows` 嘅 `bundledSource` 有 snapshot 就用 snapshot，冇就用 `library/`。

- 任何一步失敗（fetch 唔到、驗唔過、圖 hash 唔啱）→ `console.warn` + 清走暫存，build 照行，用 `library/`
- 唔會 fetch：`vite` dev server、`--mode e2e`（e2e 照用 `library/` + 測試劇）、冇 `VITE_CATALOG_URL`（CI）
- Unit test 永遠用 `library/`（本機 build 過留低嘅 snapshot 唔影響）
- Publish 之後唔會自動 rebuild：snapshot 跟下次 deploy 更新；想即時更新就手動跑 Deploy workflow

首頁橫額（Phase 4，v1.34.0）：`catalog.json` 選填 `banner`（`standard` 1200×517 + `long` 2000×400，尺寸鎖死）。
`src/catalog/runtime.ts` 嘅 `activeBanner()` 跟同一個 source：用緊 runtime catalog 就跟佢（冇 `banner` = 內建圖，唔退去 snapshot），
fallback 就跟 prebuild snapshot 嘅 `banner`，都冇就用 `src/assets/banner.webp` / `banner-wide.webp`（`bannerImages()`）。
橫額 `<img>` 同邊色 canvas 一律 CORS 載入（R2 圖唔會 taint canvas）；SW 照用 catalog 圖嘅 CacheFirst（banner 圖同其他圖喺同一個 `img/` folder）

### App 外觀 branding（build 時套用，v1.36.0）

`catalog.json` 選填 `branding`（admin「App 外觀」頁出）：App 圖示 + 名稱 / 簡介，production build（`VITE_CATALOG_URL` 有設定）時喺 `vite.config.ts` 讀：

- `branding.text` → manifest `name` / `short_name`（冇 `shortName` 就用 `name`）/ `description`；`index.html` 嘅 `<title>`、`meta description`、`og:title` / `og:site_name` / `og:description`（`scripts/brandingConfig.ts`，值做 HTML escape）。冇就保持寫死嘅 `903 Player` / `903 叱咤 Player`
- `branding.icon` → 下載五張 PNG（`favicon` / `appleTouch` / `icon192` / `icon512` / `maskable`，驗 PNG magic bytes + sha256 檔名）覆蓋 `public/` 內建嗰五張，寫去 branded public 副本（gitignored）再改 `publicDir`（`scripts/brandingIcons.ts`）。下載失敗 / 唔係 PNG / hash 唔啱 → 用全套內建 icon，build 唔會失敗
- 唔改 runtime 行為：只係 build 時嘅值。已安裝 app 嘅圖示 / 名稱要重裝先更新
- `vite.config.ts` 自己 fetch catalog 讀 branding（唔靠 `catalogSnapshot` 喺 `buildStart` 寫嘅檔——snapshot 喺 `configResolved` 之後先行，manifest / `publicDir` 要更早定）；e2e / 冇 `VITE_CATALOG_URL` / 任何失敗 → 用內建值
- apps/api publish 改咗 `branding` 會向呢個 repo dispatch `catalog-branding`（`.github/workflows/deploy.yml` 收），重 build 套用

### 由本機 folder 生成 drama.json（`apps/player/scripts/dramaFromFolder.ts`）

> 主要入口已經改為 admin / API 掃描：`POST /api/dramas/:id/scan` 直接 list R2 bucket `903-radio-drama`（見 `apps/api/README.md`）。
> 本機 CLI 留俾未上載 / 想離線檢查 folder 嘅情況用。

R2 嘅 r2.dev 網址冇 listing，所以 CLI 由**上載去 R2 嗰份本機 folder** 生成 `drama.json` 草稿同檢查報告。
掃描 / 草稿規則喺 `packages/catalog/src/scan/`（同 Worker 共用），CLI 只負責讀 folder、寫檔、`--verify` 同報告；
要喺 repo 跑（`npm install` 之後，用 `tsx` 行 TypeScript，唔使 build）。

folder 結構（同 R2 一樣）：

```text
<劇名>/
  cover photo.png                      ← 劇集封面（cover photo.jpg / cover-photo.jpg 都得）
  <短篇>/
    cover photo.jpg                    ← 短篇封面（可以冇）
    01 - <短篇> - 第一集.m4a
    02 - <短篇> - 第二集 - <集名>.m4a   ← 有集名就加「 - 集名」
```

每日劇就直接喺 `<劇名>/` 放 `YYYYMMDD.m4a`。

```bash
# 喺 repo 根（或者 repo 入面任何 folder）跑；相對路徑同預設輸出檔都跟你而家嘅 folder

# 1. 新劇：生成草稿，順手 HEAD 驗晒 R2 網址，報告同時寫落 report.txt
npm run drama-from-folder -w apps/player -- "/路徑/森美小儀系列" --id sammy-kitty --verify --report report.txt

# 2. 已上架嘅劇加集 / 加短篇：畀埋現有 drama.json，人手欄位（名、色調、次序、圖…）照留
npm run drama-from-folder -w apps/player -- "/路徑/森美小儀系列" --existing drama.json --out sammy-kitty.drama.json
```

| 選項              | 作用                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--id <id>`       | app 嘅 folder 名（細楷英數同連字號）；預設輸出檔名 `<id>.drama.json`，冇就用劇名                                                                                                                        |
| `--existing <檔>` | 現有 `drama.json`：集數 / 集名 / `files` / `firstNo` 以 folder 為準，有變報 `[資料]`；人手補嘅集名（檔名冇）照留兼用 `files` 寫明真檔名；folder 冇嘅短篇照留兼提示，新短篇 `addedAt` = 今日（香港時間） |
| `--out <檔>`      | 輸出路徑                                                                                                                                                                                                |
| `--report <檔>`   | 報告同時寫落呢個檔（UTF-8，冇 BOM）；`[錯誤]` 冇寫 `drama.json` 都照寫報告                                                                                                                              |
| `--force`         | 輸出檔已經存在都覆蓋（預設唔覆蓋：已有同名檔就停，exit `2`，免得冚走人手改過嘅 `drama.json`）                                                                                                           |
| `--verify`        | 逐條 HEAD R2 錄音同封面網址（同時最多 6 條、每條 10 秒 timeout；429 / 5xx / 逾時等 1 秒再試一次），列出唔得嘅                                                                                           |

報告會列：每個短篇幾多集 / 集數範圍 / 封面、跳號、重複、檔名唔合格式、檔名入面短篇名同 folder 名唔一樣、
可疑字元（羅馬數字 `Ⅱ` 對 `II`、全形英文字母 / 數字（例如 `Ｘ`、`０`）、macOS 嘅 NFD、頭尾空格、隱形字元）、略過咗嘅檔。
中文全形標點（`？`、`！`、`，`、`：`）係正常寫法，唔會報；**唔好**將佢哋改做半形（Windows 檔名唔准 `?`，而且改名會令網址變，用戶已儲嘅進度會冇）。

- exit code：

    | code | 意思                                                                                                                                                                             |
    | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `0`  | 成功                                                                                                                                                                             |
    | `1`  | 有 `[錯誤]`（跳號 / 重複 / 檔名讀唔到 / 冇錄音檔、`--existing` 壞咗或者同 folder 唔夾），**冇寫檔**                                                                              |
    | `2`  | 參數錯（包括 `--out` / `--report` 嘅 folder 唔存在、上層其實係檔案、本身係 folder、冇權限寫入：掃 folder 之前就停），或者輸出檔已經存在（冇加 `--force`），**冇寫 `drama.json`** |
    | `3`  | 已寫檔，但 `--verify` 有網址唔得                                                                                                                                                 |
    | `4`  | 程式出錯（唔係 folder 問題）：請將成段輸出傳返嚟                                                                                                                                 |
    | `5`  | `drama.json` **已經寫好**，只係最尾寫唔到 `--report` 報告檔（預檢過咗之後先出事，例如磁碟滿）；畫面有成份報告，唔使重行                                                          |

- `[注意]` 唔會阻住生成，但要睇：例如檔名用 `Ⅱ`、folder 用 `II`，script 會用 `files` 逐集寫明真檔名
- 短篇次序跟 R2 listing（UTF-8 字典序）；新劇嘅 `theme` 係中性色、`enabled: false`，上架前要改
- **要傳返嚟**：生成嘅 `*.drama.json`、成份報告（`report.txt`）、劇集同每個短篇嘅封面圖
- Windows（PowerShell / cmd）：
    - 報告用 `--report report.txt`，**唔好**用 `| tee report.txt` 或者 `> report.txt`：PowerShell 會用 console code page
      （香港 Windows 預設 Big5）或者 UTF-16 轉碼，中文會變亂碼。`--report` 寫 UTF-8 冇 BOM，Windows 10（1903）或以上嘅
      記事本識讀；舊版記事本見到亂碼就用 VS Code 或者瀏覽器開
    - 路徑用雙引號包住嗰陣，**尾唔好加 `\`**：`"D:\劇\黃金少年\"` 入面嘅 `\"` 會當咗係字面嘅 `"`，連後面嘅參數都黐埋落去。
      寫 `"D:\劇\黃金少年"`（script 見到路徑有 `"` 會講點改；冇引號嘅尾 `\` / `/` 會自動食走）
- 規則同 app 一致：`packages/catalog/src/scan/*.test.ts` 同 `apps/player/scripts/dramaFromFolder.test.ts` 將輸出餵畀 app 嘅
  `parseDramaDefinition` + `buildEpisodes` 驗，亦會由現有每套劇嘅網址砌返 folder 樹，再生成要同 commit 咗嘅 `drama.json` 一樣；
  改 `packages/catalog/src/dramas/` 規則時要一齊改 `src/scan/`

## 開發

npm workspaces monorepo：app 喺 `apps/player/`（version 嘅唯一來源係 `apps/player/package.json`）；
劇集 / 節目資料嘅純邏輯喺 `packages/catalog/`（`@903-player/catalog`，直接 export TS source，冇 build step；JSON Schema 喺 `packages/catalog/schemas/`）。
Catalog backend（Cloudflare Worker + D1 + R2）喺 `apps/api/`（version 喺 `apps/api/package.json`；runbook 見 `apps/api/README.md`）；
Admin SPA（React，由同一個 Worker 出）喺 `apps/admin/`（版本 pill 用 api version；`npm run dev:admin` / `npm run build:admin` / `npm run e2e:admin`）。
下面指令全部喺 repo 根跑（`dev` / `build` / `e2e` 等 root scripts 轉發去 `apps/player`；`npm test` 用 root `vitest.config.ts` 嘅 projects 一次過跑 player + admin + catalog + api，
`npm run coverage` 用同一份 root 設定只跑 player + catalog 兩個 project；
`npm run lint` 用 root 嘅 ESLint / Prettier 設定檢查成個 repo；`npx tsc -b` 用 root `tsconfig.json` 覆蓋全部 workspace）。
下面提到嘅 `src/`、`e2e/`、`scripts/`、`public/` 都喺 `apps/player/` 入面。

```bash
npm install
npm run dev        # 本地開發
npm test           # Vitest
npm run coverage   # 覆蓋率（root vitest：player + catalog）
npm run lint       # ESLint + Prettier
npm run e2e        # Playwright 端對端測試（假錄音寫入 localStorage + 模擬 audio server）
npm run build      # 輸出 apps/player/dist/
npm test -- src/utils   # 只跑部分 test（path 子字串，player 同 catalog 都會 match；要準就寫 apps/player/src/utils）
npm test -- --project @903-player/catalog   # 只跑一個 workspace
```

### 端對端測試（e2e）

Playwright 鎖咗 `~1.63.0`（`apps/player/package.json`），瀏覽器版本要同套件對得上。新機第一次跑之前裝一次 Chromium：

```bash
npx playwright install chromium
```

`npm run e2e` 會先 `npm run build`，再喺 `apps/player` 用 `node e2e/run.mjs` 起 preview server（預設 port 4173）跑晒所有檢查，
截圖輸出去 `apps/player/e2e/screenshots/`（唔入 git）。

- 瀏覽器已經裝咗喺其他位置（例如 CI / 雲端容器預先裝好）：設 `PLAYWRIGHT_BROWSERS_PATH` 指去嗰個資料夾，
  `npx playwright install` 同 `npm run e2e` 都會用佢，唔使再下載
- 預裝 Chromium 版本同鎖住嘅 Playwright 唔夾（例如雲端 sandbox）：設 `PW_CHROMIUM_PATH` 直接指去 Chromium 執行檔，
  例如 `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`。`e2e/run.mjs`、`scripts/generateIcons.mjs`、
  `scripts/arcCover/review/verify.cjs` 都經 `scripts/chromiumLaunch.mjs` 讀佢；冇 set 就由 Playwright 自己揀
- 幾個 worktree 同時跑：用 `E2E_PORT=4174 npm run e2e` 避開撞 port
- 唔使網絡：所有 context 都經 `e2e/harness.mjs` 嘅 `newE2EContext` 開，外部 host 全部 mock 晒——
  audio host 答假錄音（WAV）、廣播劇 R2 答 404、Google Fonts 由本機答。
    - **Poppins 本機供應**：`fonts.googleapis.com` 照 `index.html` css2 網址要嘅字重（400 / 500 / 600）答
      `@font-face`，字型檔由 `fonts.gstatic.com/e2e/…` 答 devDependency `@fontsource/poppins`（OFL-1.1）嘅
      latin / latin-ext woff2，其他路徑 404。頁頭標題完整顯示、日子條冇剪走、mini player 跑馬燈呢啲斷言靠字型度量，
      Poppins 比 fallback 字型（例如 Inter）闊，用 fallback 量會 false negative；`run.mjs` 有檢查確認 Poppins 真係載入咗
    - **中文字用系統 fallback**：Noto Sans TC / Noto Serif TC 唔供應（冇 `@font-face`）。中文字喺任何字型都係約 1em 闊，
      用系統 CJK 字型（例如 WenQuanYi）量出嚟同 Noto 差唔多，唔值得為 e2e 加十幾 MB 字型檔
      其他外部 request 一律 abort，`run.mjs` 最尾嘅檢查見到有就 FAIL；`index.html` 新加外部 host 要喺
      harness 加 mock（`src/e2eSrcConstants.test.ts` 掃晒 `index.html` 所有 `http(s)://` 網址鎖住）。驗證離線：
      `HTTPS_PROXY=http://127.0.0.1:9 HTTP_PROXY=http://127.0.0.1:9 npm run e2e`（Chromium 跟 proxy 環境變數，連唔到外網）

### App icon

`public/` 入面嘅 icon（`icon-192`、`icon-512`、`icon-maskable-512`、`apple-touch-icon` 180、`favicon` 64）
全部由 `design/app-icon.png`（repo 根）生成。改咗原圖之後執行：

```bash
node apps/player/scripts/generateIcons.mjs
```

用 Playwright 嘅 Chromium 縮放（唔使另外裝套件）；maskable 同 apple-touch-icon 填 `#98bdde` 底色，
maskable 內容縮到 80%（安全區）。有 ImageMagick 就順手無損壓縮（像素唔變），冇就跳過。

### 短篇碟面 / tile 候選圖（`apps/player/scripts/arcCover/`）

將短篇（或者廣播劇本身）嘅封面相生成幾款候選圖畀人揀：碟面 `disc` 600×600 webp、
長方形 `tile` webp（短篇 16:9 1216×684；唔填 `--arc` 即係廣播劇本身，書架 2:1 1216×608）。
Python 工具，唔屬於 app build，唔入 npm scripts；依賴裝喺 venv（OpenCV 要 4.x：5.0 拎走咗 Haar cascade）：

```bash
python3 -m venv /tmp/arcCover-venv
/tmp/arcCover-venv/bin/pip install -r apps/player/scripts/arcCover/requirements.lock   # 確實版本（輸出 byte 一樣）
/tmp/arcCover-venv/bin/python apps/player/scripts/arcCover/generate.py \
    --input "cover photo.png" --drama lancy --arc half --out /tmp/arcCover
/tmp/arcCover-venv/bin/python -m pytest apps/player/scripts/arcCover/tests   # 唔使網絡
/tmp/arcCover-venv/bin/ruff check apps/player/scripts/arcCover && /tmp/arcCover-venv/bin/ruff format --check apps/player/scripts/arcCover
```

- 依賴：`requirements.txt`（淨係 generator，下限避開 libwebp CVE-2023-4863）、`requirements-dev.txt`（加 pytest / jsonschema / ruff）、
  `requirements.lock`（`pip freeze` 出嚟嘅確實版本，升級後要重新 freeze）。喺 repo 根跑 pytest / ruff 留低嘅 cache 已經喺 root `.gitignore`，唔會整爛 `npm run lint`
- 封面喺 R2：`<DRAMA_AUDIO_BASE>/<劇集 folder>/<短篇 folder>/cover photo.(png|jpg)`；r2.dev 對 Python urllib 回 403，用 `curl` 下載
- 輸入喺分析之前驗晒（搵唔到 / 唔係圖、`--title-box` 超出原圖、`--round` < 1、`--title-scale` 唔喺 (0, 1]），錯就印 `error: …`、exit 2，唔會出 traceback
- 輸出 `<out>/<drama>/<arc>/round-N/`（唔填 `--round` 就自動下一個；已有 round 要 `--force` 先覆蓋，舊檔會成個清走）。
  先寫去 `round-N.partial/`，成功先 rename，中途出錯唔會留低半個 round。入面有：
    - 候選圖 `<arc>-disc-<方法>.webp`、`<arc>-tile-<方法>.webp`（廣播劇本身用 `drama-` 開頭）
    - `previews/*.png`：碟面照 app 咁疊（圓形、暗角、坑紋、碟心、碟邊，跟 `drama.json` theme 色）+ 全集表 52px 圓碟 + 40px 細碟（連 3px divider 外圈）；tile 加圓角同書架 2:1 crop 框。
      暗角跟 CSS `radial-gradient(circle, …)` 嘅 farthest-corner：由 0.78 個半徑開始，碟邊約 16% 黑
    - `analysis.png`（saliency 熱圖、人面綠框、標題字紅框、焦點）、`contact.png`（全部預覽一張睇晒）
    - `manifest.json`：一個 round 一份，方便跨 round 砌 review 頁；格式見 `scripts/arcCover/manifest.schema.json`（schema 2，test 有驗）：
        - 頂層：`schema`、`tool`、`toolVersion`、`env`（`python` / `pillow` / `libwebp` / `opencv` / `numpy` 版本）、`drama`、`arc`（廣播劇本身係 `null`）、
          `level`（`arc` / `drama`）、`round`、`source { file, sha256, width, height }`、`analysis { faces, textBoxes, textSource, focal }`、`analysisImage`、`contactSheet`、`variants`
        - `variants[]`：`{ id, kind, method, file, preview, width, height, sha256, params, duplicateOf }`；`id` = `<kind>-<方法>`，
          `duplicateOf` = 同一個 kind 入面 bytes 一樣嘅前一個候選 `id`（冇就 `null`），crop 類 `params` 有 `crop` 同 `upscale`（> 1 即係要放大）
- 方法：`center-crop`（中間）、`saliency-crop`（可見 saliency 最多：碟面計埋圓形、碟心同暗角）、`face-crop`（包住人面，人面放碟心上面；冇人面就用最突出範圍；最多放大 1.25 倍；原圖本身太細就例外，按需要放大，manifest `params.upscale` 記實際倍數）、
  `text-safe-crop`（唔切開標題字；避唔到就至少成行字喺圖入面）、`fit-blur`（成張圖 + 模糊放大底）、`fit-extend`（成張圖 + 由邊緣生成延伸：平滑漸變底色 + 同高度抽返顆粒）；
  加 `--title-box x,y,w,h` 會用手動字框（代替自動偵測），並多出一張 `title-shrink` 碟面（標題縮到 `--title-scale`，預設 0.85）
- 同一張圖、同一組參數、同一個 venv（`manifest.env` 一樣）輸出完全一樣（冇隨機；補底顆粒用固定 seed）；換 library 版本 sha256 / `duplicateOf` 可能會變
- 人面 / 標題字偵測係 heuristic（Haar cascade + 眼睛過濾、筆劃密度 + 顏色），風格化封面會漏 / 誤報，睇 `analysis.png` 判斷；揀好之後要手動 copy 入 `src/catalog/dramas/library/<id>/`

#### 新劇 / 新短篇封面 workflow（review 頁：`apps/player/scripts/arcCover/review/`）

候選圖喺 claude.ai Artifact review 頁揀（<https://claude.ai/artifact/4xzNxQTTy9XjCQg46TLKiT>），詳細見
`apps/player/scripts/arcCover/review/README.md`。生成物全部放 repo 外嘅 work 資料夾（`--work`；唔填用 `$ARC_COVER_WORK`，再冇就 `$TMPDIR/903-player-covers`），唔入 git。

1. **原圖**：`fetch_sources.py <id> --work $WORK`（由 R2 下載 `cover photo.png|jpg` / `cover-photo.jpg`，名轉 NFC 再 URL-encode；
   新短篇加 `--arc "短篇名=slug"`；exit 1 = R2 冇，exit 3 = 網絡 / proxy 出錯）
2. **出 round**：`generate.py --input $WORK/arcCover-src/<id>/<slug>.png --drama <id> [--arc <slug>] --out $WORK/arcCover`
3. **砌頁**：`review/build.py --work $WORK` → `$WORK/review/site/`（`index.html` + `rounds.json` + 圖）、`files.json`（全部）、
   `publish-N.json`（全部檔分批；加 `--previous <上次 files.json 或 Artifact 檔案 listing>` 會喺最後一批對冇咗嘅舊 path
   傳 `null` 刪走，`index.html` 唔刪；listing = JSON path 陣列或一行一個 path）
4. **Publish**：新 session 第一次 publish 之前，Claude 一定要先對 URL 叫 Artifact `action:"read"`，再叫
   `action:"list", scope:"files"`，否則 publish（以及覆蓋 / `null` 刪走舊 session 送過嘅 path）會被拒；
   將 listing 嘅 path 存落檔，用 `build.py --previous <嗰個檔>` 重新 build，舊 path 就會刪走。
   真係要唔睇就覆蓋某啲 path（用家明確要求），先喺 publish 用 `overwrite_unread` 逐個列出。
   然後逐份 `publish-N.json` 更新同一條 URL（`file_path` = `site/index.html`，`files` = 嗰份 json）。
   Artifact 上限：每次 publish ≤ 255 個檔 / 64MB、每版 ≤ 511 個檔（連 `index.html`；每批 64MB 亦預留主頁大小）；
   冇傳嘅檔會保留。每次都全部重送（而家大約 90 個檔），唔做增量，免得記錯「送咗乜」令頁面靜靜冇咗新 `rounds.json`；
   用家揀完，Claude 用 ArtifactData 讀 `reviews` collection（doc id `<drama>--<slug>--r<round>`，值 = 候選 id / `keep` / `own` / `null`；
   未儲存 = `keep` 沿用現有圖）
5. **入 app**：揀中嘅 webp copy 去 `src/catalog/dramas/library/<id>/`：整套劇 `tile.webp` / `disc.webp`，短篇 `arcs/<slug>/tile.webp` / `arcs/<slug>/disc.webp`
   （新短篇喺 `drama.json` 加 `disc` / `tile`）
6. **PATCH bump** `apps/player/package.json` version

## 部署（只需做一次）

GitHub repo → **Settings → Pages → Build and deployment → Source** 揀 **GitHub Actions**。
之後每次 push `main`（或者喺 Actions 手動執行）都會自動 build 同重新 deploy 去
`https://<owner>.github.io/903-player/`。

另外 Vercel 都由 `main` 部署（`vite.config.ts` 見到 `VERCEL` 就用根路徑 `/`）。`vercel.json` 指定 install / build / output（`npm ci` → `npm run build -w apps/player` → `apps/player/dist`），Root Directory 留 repo 根。`vercel.json` 關咗工作 branch
（`claude/**`、`fix/**`、`hotfix/**` 等）嘅 preview 部署：免費 plan 每日部署次數有限，一個 session push 多次
會用晒額度，令 merge 入 `main` 嗰次被拒（「Deployment rate limited」）。新增 branch 前綴要記得加入呢個清單。

## 目錄

以下 path 相對 `apps/player/`（`design/`、`_mockups_/`、`.proj-docs/` 留喺 repo 根）。

| 路徑                      | 用途                                                                                                                                                                                                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config/`             | 常數、theme primitive（`showThemes.ts`）、版面 breakpoint                                                                                                                                                                                                                                                                         |
| `src/catalog/shows/`      | 節目：`index.ts`（`SHOWS` / `findShow` / `themeFor`）、`lib/`（build time folder source）+ `library/<id>/`（`show.json` + `tile.webp` + `disc.webp`）                                                                                                                                                                             |
| `src/catalog/dramas/`     | 廣播劇：`index.ts`（registry 實例）、`lib/`（build time folder source、e2e fixtures）+ `library/<id>/`（`drama.json`、`drama.test.ts`、圖；短篇圖喺 `arcs/<slug>/`）                                                                                                                                                              |
| `src/catalog/snapshot/`   | Prebuild snapshot：`source.ts`（有 `data/` 就包入 bundle）；`data/` 由 `scripts/catalogSnapshot.ts` build 時生成（gitignored）                                                                                                                                                                                                    |
| `src/services/`           | `audioProbe.ts`（喺部機度 probe 錄音）、`probeStore.ts`（localStorage 錄音清單）                                                                                                                                                                                                                                                  |
| `src/i18n/`               | 語言包（zh-HK 書面語）                                                                                                                                                                                                                                                                                                            |
| `src/player/`             | `AudioController`（唯一 audio element）、Media Session                                                                                                                                                                                                                                                                            |
| `src/components/shared/`  | 跨 page 共用 component：`common/`（Disc、Marquee、PageHeader…）、`player/`（PlayerPanel、NowPlaying、EpisodeList、DateStrip）                                                                                                                                                                                                     |
| `src/components/pages/`   | 只俾單一 page 用嘅 component：`home/`、`today/`、`drama/`（每個 folder 有 `.tsx`、`.module.css`、`.test.tsx`）                                                                                                                                                                                                                    |
| `src/pages/`              | `home/`、`today/`、`show/`、`drama/` 頁面同 page hook；`shared/` 放多頁共用（`Page.module.css`、`LoadState`、item builder）                                                                                                                                                                                                       |
| `src/styles/tokens.css`   | Design tokens（來源：mockup）                                                                                                                                                                                                                                                                                                     |
| `../../packages/catalog/` | `@903-player/catalog`（repo 根）：`src/core/`（JSON reader、theme schema、folder source、episode ID）、`src/dramas/`（schema / 檔名 template / 集數 builder / registry）、`src/shows/`（schema / registry）、上架 / 下架 selector、HK 日子；`schemas/`（`drama.json` / `show.json` 嘅 JSON Schema，`.vscode/settings.json` 套用） |
