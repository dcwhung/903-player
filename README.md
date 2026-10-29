# 903 Player

自用 PWA，收聽 [hkfm903.live](https://hkfm903.live/) 嘅錄音 archive。

## 功能

- 主頁：橫額下面「節目 / 廣播劇」切換（記住上次揀邊個）；「新」全 app 統一紅底白字膠囊；節目 tab 係 7 個節目 + 今日節目（兩個一行）；橫額釘頂（右下角版本號），矮螢幕節目格按高度分頁（左右掃 / 指示點）；今日有新一集（已上架、未聽完）嘅節目格左上角有「新」
- 自動播放：主頁撳節目格 / 今日節目格，或者直接開節目 / 今日節目 / 每日劇集頁，冇其他嘢載入緊先自動播；mini player 有嘢播緊或者暫停緊（未左滑關閉）就唔蓋過，唱片係未開始樣（黑碟），撳播放先換；撳嘅節目 / 劇集本身已經載入（就算 mini player 關咗）都唔播，保持暫停。今日節目頁未開始樣時左右掃卡只係換睇邊個節目，撳播放先播。主頁劇集格：撳格只係入頁（短篇劇集永遠唔自動播，入頁都唔播，等用戶撳播放 / 揀集）；撳「繼續收聽」條唔入頁，淨係喺 mini player 播續聽嗰集（會蓋過播緊嘅嘢）
- 任何高度都係固定版面：只有集數 / 節目表清單自己捲；清單播緊嗰行嘅掣變暫停；「現正播放」同清單集名放唔落就用「…」收尾，只有清單播緊（唔計暫停）嗰行先跑馬燈
- 節目頁：節目名按畫面闊度縮字完整顯示、唱片 + 可拖動弧形進度條、−60 / −30 / 播放暫停 / +30 / +60、由頭播放、日子 slider（只列有錄音嘅日子，揀中置中，聽過 ≥ 95% 顯示剔）
- 今日節目頁：香港時間今日嘅節目表；今日有節目播就一定顯示今日（未有錄音嘅灰色「未上架」，全部未上架就顯示灰色唱片、唔自動播），今日冇節目播先顯示最近有錄音嘅日子
- 未上架：probe 試過但原站未有（404）嘅集數照列出，灰色、冇播放掣、撳唔到；播放器、日子條、卡疊、mini player 只用播得到嘅
- 橫版（打橫而且 ≥ 640px 闊，`src/config/layout.ts`）：節目頁 / 今日節目頁左播放器、右清單（唔出日子條，唱片用盡左欄）；
  主頁一頁放晒（手機打橫橫額入格 5 欄 × 2 行，其他橫額成行用闊版圖 + 4 欄）；
  闊 ≥ 1024px 字同掣 × 1.3、iPad 打橫 × 1.5（`--ui-scale`）。Preview：`design/previews/landscape-preview.html`
- 廣播劇（`src/dramas/<id>/drama.json`，見下面「資料檔」）：主頁廣播劇 tab 一行一套劇；全部用淺色主題（頁頂狀態列墊深色帶，iOS 白字睇得清），碟面用劇集圖
    - 芝See菇Bi Family（短篇劇集）：唱片下面「現正播放：短篇 · 第 N 集」（暫停講「已暫停」、揀短篇載入咗未開始講「下一集」，清單行同樣講「已暫停 / 未開始」）+ 短篇 chips 左右掃，揀短篇換集數清單（冇播放時順便載入嗰個短篇嘅續聽集，唔自動播，碟面同時間跟住轉；播緊就淨係換清單）（有集名大字顯示集名，冇就顯示「第 N 集」）；入頁揀中上次聽緊嗰集（聽完就下一集），撳播放先播：未播時碟面係嗰集嘅短篇碟面、唱片兩邊時間同弧形顯示續播位置 / 總長（未聽過嗰集就 --:--）、唱片下面 / chips 上面講「繼續收聽：短篇 · 第 N 集 · 集名」（第一次入未聽過就係黑碟 +「揀一個短篇開始收聽」）；集數同集名之間一律用「 · 」分隔（chips 上面、mini player、鎖屏、主頁「繼續收聽」）；一集播完自動接下一集（播完一個短篇接下一個短篇，最後一集播完就停）；「☰ 全集」釘住 chips 最左，打開全集一覽表（分組：播放中 → 新上架 → 未聽完 → 已聽完；圓環 = 聽完幾多集；右邊掣續聽 / 播未收聽 / ↺ 重聽；✕ / 遮罩 / Escape 或者向下拉閂，直版橫版都得），短篇 chips 同一次序；集數清單照集數次序（聽完嘅留喺原位），入頁 / 轉短篇即刻捲到播緊（或者下一集）嗰集，放喺清單頂、露出半行上一集，向上捲睇返之前集數；自動播下一集就順滑捲過去；轉畫面（打橫 / 打直）都會重新捲返播緊嗰集；新短篇（catalog `addedAt`）上架 14 日內有「新」；主頁劇集格：未聽過 / 播緊時只有短篇數（右下），聽過未播緊就喺圖底出「繼續收聽」掣（短篇數移去右上；直版疊卡撳暗咗嘅卡任何位置都係先 focus），有未聽過嘅新短篇左上角出「新」
    - 黃金少年（短篇劇集，`arcUnit: "season"`）：4 季 126 集，主頁角落「全 4 季」，碟面跟播緊（或者暫停時揀咗）嗰季（每季一張 `season-N-disc.webp`），未揀季時用系列碟面 `disc.webp`
    - 森美小儀系列（短篇劇集）：7 個短篇 109 集（來不及聽你說愛我 10、公子森林 40（每集有集名）、十九樓半的夏天 10、森之愛情I - 森之聖誕 10（每集有集名）、森之愛情II - 電燈膽 9、森之聖誕2010 15（每集有集名）、森美幻想劇 15），每個短篇有自己碟面（`<短篇>-disc.webp`）
    - 少爺占系列（短篇劇集）：2 個短篇 38 集（八王子 21、忠孝公路 17），每個短篇有自己碟面
    - 蘭茜夫人劇場（短篇劇集）：3 個短篇 100 集（戀愛二分一 30、初戀無限次 33、我心不死 37），每個短篇有自己碟面
    - 短篇圖：每個短篇有正方形碟面（`<短篇>-disc.webp`）同長方形圖（`<短篇>-tile.webp`，16:9 1216×684，`drama.json` arc `tile`）；長方形圖暫時未用，留底防將來要。芝See 嘅短篇喺 R2 冇 cover，兩樣都冇
    - 18 樓 C 座（每日劇集，⚠️ 暫時停用：`src/dramas/c18/drama.json` `enabled: false`，主頁唔出、劇集頁當搵唔到）：同節目頁一樣嘅日子條 + 集數清單，日子條只排有集數嘅日子，重播舊集標「重溫」
    - 播緊廣播劇返主頁唔會停，mini player 改為顯示嗰套劇
    - 集數清單喺每套劇嘅 `drama.json`：芝See 係真清單（12 個短篇、97 集）、黃金少年 4 季 126 集、森美小儀系列 7 個短篇 109 集、少爺占系列 2 個短篇 38 集、蘭茜夫人劇場 3 個短篇 100 集，錄音喺 Cloudflare R2（`DRAMA_AUDIO_BASE`，`<劇集 folder>/<短篇>/<原檔名>`，檔名由 template 砌）；18樓C座 ⚠️ 仲係假資料，錄音未 host，撳播放會一直「連線中…」。Preview：`design/previews/radio-drama-preview.html`
- 主頁 mini player：左右掃轉今日節目；長按 0.25 秒浮起（副題換做「‹‹ 滑動關閉」）之後左滑關閉（似 iOS 鎖屏通知：過一半闊度即關，拉少少露出「⏻ 關閉」掣），關閉 = 停播 + 收起，之後再開始播先出返（唔記落 localStorage，重開 app 照出）；讀屏 / 鍵盤有「關閉播放器」掣。Preview：`design/previews/swipe-dismiss-preview.html`
- 自動續播（進度存喺本機 localStorage）、鎖屏 / 耳機控制、深色 + 跟系統淺色

## 架構

```
GitHub Actions（push main / 手動）
  └─ npm run build → dist/ ─► GitHub Pages
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

節目同廣播劇都唔寫喺 TypeScript，而係**一個 folder 一套**，build time 由 `import.meta.glob` 自動發現（`src/catalog/` 係共用嘅 JSON reader / theme schema / folder source）。
加一套 = 新開 folder，放 JSON + 圖，**唔使改 code**；JSON 唔合格 `npm test` 會指出邊個檔邊個欄位（`src/*/catalog.test.ts` / schema validator）。

| 路徑                                                     | 內容                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shows/<id>/show.json` + `tile.webp` + `disc.webp`   | `name`（原站節目名，亦用嚟砌錄音網址）、`fileTime`（HHMM）、`airDays`（0 = 日 … 6 = 六）、`order`、`tile`（主頁節目格，16:9 1216×684）、`disc`（碟面，600×600）、`theme`（深色 10 隻色）                                                        |
| `src/dramas/<id>/drama.json` + `tile.webp` + `disc.webp` | `name`、`kind`（`series` 短篇劇 / `daily` 每日劇）、`enabled`、`order`、`arcUnit`、`addedAt`、`audio`（`host`：`r2` / `app`、`folder`、檔名 `file` template）、`theme`（淺色 + `statusBar` / `headerRule` / `titleFont`）、`arcs` 或 `episodes` |

- folder 名 = id = route（`/show/:id`、`/drama/:id`），只可以細楷英數同連字號
- 短篇劇 `arcs[]`：`name`（= R2 folder 名）、`episodes`（集數，或者集名 list，冇集名寫 `null`）、`titles`（`{ "集數": "集名" }` 零散補集名）、`firstNo`（有第零集寫 `0`）、`addedAt`（上架日，14 日內出「新」）、`disc`（短篇自己碟面）、`tile`（短篇長方形圖，暫時未用）、`files`（`{ "集數": "完整檔名" }` 不規則檔名）
- 檔名 template token：`{no}` `{no2}` `{noZh}`（中文數字）`{arc}` `{folder}` `{title}`；`[ … ]` 入面 token 空值就整段略去，例如 `{no2} - {arc} - 第{noZh}集[ - {title}].m4a`。每日劇用 `{date}` / `{yyyymmdd}`
- ⚠️ `name` / `fileTime` / `audio` / 檔名唔可以亂改：錄音網址係已儲進度（localStorage）嘅 key
- Editor 自動完成 + 即時驗證：`schemas/drama.schema.json`、`schemas/show.schema.json`（JSON Schema draft-07，hover 有廣東話說明，色有色盤）。VS Code 靠 `.vscode/settings.json` 嘅 `json.schemas` 自動套用，資料檔唔使加 `$schema`；其他 editor 可以喺檔頭加 `"$schema": "../../../schemas/drama.schema.json"`（runtime 唔理呢個 key）。
  Schema 刻意嚴過 runtime：多出嚟 / 打錯嘅 key 會出紅線（runtime 只係唔理）。以下淨係 runtime（`npm test`）驗：圖檔真係喺 folder、folder 名格式、arc name / 每日 date 唔重複、`titles` / `files` 集數喺範圍之內。
  兩邊規則由 `src/catalog/jsonSchemas.node.test.ts` 對住同一批例子鎖住；改 `schema.ts` 記得一齊改 schema
- 橫版主頁 grid 寫死 4 欄 × 2 行 = 7 個節目 + 今日格；加減節目要一齊改 `ShowGrid.module.css`（`src/shows/shows.test.ts` 會提醒）

### 由本機 folder 生成 drama.json（`scripts/dramaFromFolder.mjs`）

R2 嘅 r2.dev 網址冇 listing，所以由**上載去 R2 嗰份本機 folder** 生成 `drama.json` 草稿同檢查報告。
個 script 係單一檔案、只用 Node 內置功能（**Node 18.3 或以上**，建議 20+；18.0–18.2 冇 `parseArgs`，會一開始就出 SyntaxError），**唔使 clone 呢個 repo、唔使 `npm install`**。

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
# 1. 下載（一個檔）；Windows 要打 curl.exe（見下面），或者用瀏覽器開條網址「另存新檔」
curl -LO https://raw.githubusercontent.com/dcwhung/903-player/main/scripts/dramaFromFolder.mjs

# 2. 新劇：生成草稿，順手 HEAD 驗晒 R2 網址，報告同時寫落 report.txt
node dramaFromFolder.mjs "/路徑/森美小儀系列" --id sammy-kitty --verify --report report.txt

# 3. 已上架嘅劇加集 / 加短篇：畀埋現有 drama.json，人手欄位（名、色調、次序、圖…）照留
node dramaFromFolder.mjs "/路徑/森美小儀系列" --existing drama.json --out sammy-kitty.drama.json
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
    - 下載用 `curl.exe -LO …`：Windows PowerShell 5.1 入面 `curl` 係 `Invoke-WebRequest` 嘅別名，`-LO` 會出錯；
      或者直接用瀏覽器開 raw 網址「另存新檔」
    - 報告用 `--report report.txt`，**唔好**用 `| tee report.txt` 或者 `> report.txt`：PowerShell 會用 console code page
      （香港 Windows 預設 Big5）或者 UTF-16 轉碼，中文會變亂碼。`--report` 寫 UTF-8 冇 BOM，Windows 10（1903）或以上嘅
      記事本識讀；舊版記事本見到亂碼就用 VS Code 或者瀏覽器開
    - 路徑用雙引號包住嗰陣，**尾唔好加 `\`**：`"D:\劇\黃金少年\"` 入面嘅 `\"` 會當咗係字面嘅 `"`，連後面嘅參數都黐埋落去。
      寫 `"D:\劇\黃金少年"`（script 見到路徑有 `"` 會講點改；冇引號嘅尾 `\` / `/` 會自動食走）
- 規則同 app 一致：`scripts/dramaFromFolder.test.ts` 將輸出餵畀 app 嘅 `parseDramaDefinition` + `buildEpisodes` 驗，
  亦會由現有每套劇嘅網址砌返 folder 樹，再生成要同 commit 咗嘅 `drama.json` 一樣；改 `src/dramas/` 規則時要一齊改 script

## 開發

```bash
npm install
npm run dev        # 本地開發
npm test           # Vitest
npm run coverage   # 覆蓋率
npm run lint       # ESLint + Prettier
npm run e2e        # Playwright 端對端測試（假錄音寫入 localStorage + 模擬 audio server）
npm run build
```

### 端對端測試（e2e）

Playwright 鎖咗 `~1.63.0`（`package.json`），瀏覽器版本要同套件對得上。新機第一次跑之前裝一次 Chromium：

```bash
npx playwright install chromium
```

`npm run e2e` 會先 `npm run build`，再用 `node e2e/run.mjs` 起 preview server（預設 port 4173）跑晒所有檢查，
截圖輸出去 `e2e/screenshots/`（唔入 git）。

- 瀏覽器已經裝咗喺其他位置（例如 CI / 雲端容器預先裝好）：設 `PLAYWRIGHT_BROWSERS_PATH` 指去嗰個資料夾，
  `npx playwright install` 同 `npm run e2e` 都會用佢，唔使再下載
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
全部由 `design/app-icon.png` 生成。改咗原圖之後執行：

```bash
node scripts/generateIcons.mjs
```

用 Playwright 嘅 Chromium 縮放（唔使另外裝套件）；maskable 同 apple-touch-icon 填 `#98bdde` 底色，
maskable 內容縮到 80%（安全區）。有 ImageMagick 就順手無損壓縮（像素唔變），冇就跳過。

### 短篇碟面 / tile 候選圖（`scripts/arcCover/`）

將短篇（或者廣播劇本身）嘅封面相生成幾款候選圖畀人揀：碟面 `disc` 600×600 webp、
長方形 `tile` webp（短篇 16:9 1216×684；唔填 `--arc` 即係廣播劇本身，書架 2:1 1216×608）。
Python 工具，唔屬於 app build，唔入 npm scripts；依賴裝喺 venv（OpenCV 要 4.x：5.0 拎走咗 Haar cascade）：

```bash
python3 -m venv /tmp/arcCover-venv
/tmp/arcCover-venv/bin/pip install -r scripts/arcCover/requirements.lock   # 確實版本（輸出 byte 一樣）
/tmp/arcCover-venv/bin/python scripts/arcCover/generate.py \
    --input "cover photo.png" --drama lancy --arc half --out /tmp/arcCover
/tmp/arcCover-venv/bin/python -m pytest scripts/arcCover/tests   # 唔使網絡
/tmp/arcCover-venv/bin/ruff check scripts/arcCover && /tmp/arcCover-venv/bin/ruff format --check scripts/arcCover
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
- 人面 / 標題字偵測係 heuristic（Haar cascade + 眼睛過濾、筆劃密度 + 顏色），風格化封面會漏 / 誤報，睇 `analysis.png` 判斷；揀好之後要手動 copy 入 `src/dramas/<id>/`

## 部署（只需做一次）

GitHub repo → **Settings → Pages → Build and deployment → Source** 揀 **GitHub Actions**。
之後每次 push `main`（或者喺 Actions 手動執行）都會自動 build 同重新 deploy 去
`https://<owner>.github.io/903-player/`。

## 目錄

| 路徑                    | 用途                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/config/`           | 常數、theme primitive（`showThemes.ts`）、版面 breakpoint                                             |
| `src/catalog/`          | 資料檔共用層：JSON reader、theme schema、folder source                                                |
| `src/shows/`            | 7 個節目：`<id>/show.json` + `tile.webp` + `disc.webp`，registry（`SHOWS` / `findShow` / `themeFor`） |
| `src/dramas/`           | 廣播劇：`<id>/drama.json` + 圖，schema / 檔名 template / 集數 builder / registry                      |
| `src/services/`         | `audioProbe.ts`（喺部機度 probe 錄音）、`probeStore.ts`（localStorage 錄音清單）                      |
| `src/i18n/`             | 語言包（zh-HK 書面語）                                                                                |
| `src/player/`           | `AudioController`（唯一 audio element）、Media Session                                                |
| `src/components/`       | UI component（每個 folder 有 `.tsx`、`.module.css`、`.test.tsx`）                                     |
| `src/pages/`            | 主頁、節目頁、今日節目頁                                                                              |
| `src/styles/tokens.css` | Design tokens（來源：mockup）                                                                         |
| `schemas/`              | `drama.json` / `show.json` 嘅 JSON Schema（editor 自動完成 + 驗證，`.vscode/settings.json` 套用）     |
