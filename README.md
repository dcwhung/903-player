# 903 Player

自用 PWA，收聽 [hkfm903.live](https://hkfm903.live/) 嘅錄音 archive。

## 功能

- 主頁：橫額下面「節目 / 廣播劇」切換（記住上次揀邊個）；「新」全 app 統一紅底白字膠囊；節目 tab 係 7 個節目 + 今日節目（兩個一行）；橫額釘頂（右下角版本號），矮螢幕節目格按高度分頁（左右掃 / 指示點）；今日有新一集（已上架、未聽完）嘅節目格左上角有「新」
- 任何高度都係固定版面：只有集數 / 節目表清單自己捲；清單播緊嗰行嘅掣變暫停
- 節目頁：節目名按畫面闊度縮字完整顯示、唱片 + 可拖動弧形進度條、−60 / −30 / 播放暫停 / +30 / +60、由頭播放、日子 slider（只列有錄音嘅日子，揀中置中，聽過 ≥ 95% 顯示剔）
- 今日節目頁：香港時間今日嘅節目表；今日有節目播就一定顯示今日（未有錄音嘅灰色「未上架」，全部未上架就顯示灰色唱片、唔自動播），今日冇節目播先顯示最近有錄音嘅日子
- 未上架：probe 試過但原站未有（404）嘅集數照列出，灰色、冇播放掣、撳唔到；播放器、日子條、卡疊、mini player 只用播得到嘅
- 橫版（打橫而且 ≥ 640px 闊，`src/config/layout.ts`）：節目頁 / 今日節目頁左播放器、右清單（唔出日子條，唱片用盡左欄）；
  主頁一頁放晒（手機打橫橫額入格 5 欄 × 2 行，其他橫額成行用闊版圖 + 4 欄）；
  闊 ≥ 1024px 字同掣 × 1.3、iPad 打橫 × 1.5（`--ui-scale`）。Preview：`design/previews/landscape-preview.html`
- 廣播劇（`src/dramas/<id>/drama.json`，見下面「資料檔」）：主頁廣播劇 tab 一行一套劇；全部用淺色主題（頁頂狀態列墊深色帶，iOS 白字睇得清），碟面用劇集圖
    - 芝See菇Bi Family（短篇劇集）：唱片下面「現正播放」+ 短篇 chips 左右掃，揀短篇換集數清單（有集名大字顯示集名，冇就顯示「第 N 集」）；入頁續播上次聽緊嗰集（聽完就下一集）；一集播完自動接下一集（播完一個短篇接下一個短篇，最後一集播完就停）；「☰ 全集」釘住 chips 最左，打開全集一覽表（分組：播放中 → 新上架 → 未聽完 → 已聽完；圓環 = 聽完幾多集；右邊掣續聽 / 播未收聽 / ↺ 重聽），短篇 chips 同一次序；集數清單聽完嘅排最底；新短篇（catalog `addedAt`）上架 14 日內有「新」；主頁劇集格：未聽過 / 播緊時只有短篇數（右下），聽過未播緊就喺圖底出「繼續收聽」（短篇數移去右上），有未聽過嘅新短篇左上角出「新」
    - 黃金少年（短篇劇集，`arcUnit: "season"`）：4 季 126 集，主頁角落「全 4 季」，碟面跟播緊嗰季（每季一張 `season-N-disc.webp`）
    - 森美小儀系列（短篇劇集）：7 個短篇 109 集（來不及聽你說愛我 10、公子森林 40、十九樓半的夏天 10、森之愛情I - 森之聖誕 10、森之愛情Ⅱ - 電燈膽 9、森之聖誕2010 15（每集有集名）、森美幻想劇 15），每個短篇有自己碟面（`<短篇>-disc.webp`）
    - 少爺占系列（短篇劇集）：2 個短篇 38 集（八王子 21、忠孝公路 17），每個短篇有自己碟面
    - 18 樓 C 座（每日劇集，⚠️ 暫時停用：`src/dramas/c18/drama.json` `enabled: false`，主頁唔出、劇集頁當搵唔到）：同節目頁一樣嘅日子條 + 集數清單，日子條只排有集數嘅日子，重播舊集標「重溫」
    - 播緊廣播劇返主頁唔會停，mini player 改為顯示嗰套劇
    - 集數清單喺每套劇嘅 `drama.json`：芝See 係真清單（12 個短篇、97 集）、黃金少年 4 季 126 集、森美小儀系列 7 個短篇 109 集、少爺占系列 2 個短篇 38 集，錄音喺 Cloudflare R2（`DRAMA_AUDIO_BASE`，`<劇集 folder>/<短篇>/<原檔名>`，檔名由 template 砌）；18樓C座 ⚠️ 仲係假資料，錄音未 host，撳播放會一直「連線中…」。Preview：`design/previews/radio-drama-preview.html`
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
| `src/shows/<id>/show.json` + `art.jpg`                   | `name`（原站節目名，亦用嚟砌錄音網址）、`fileTime`（HHMM）、`airDays`（0 = 日 … 6 = 六）、`order`、`art`、`theme`（深色 10 隻色）                                                                                                               |
| `src/dramas/<id>/drama.json` + `tile.webp` + `disc.webp` | `name`、`kind`（`series` 短篇劇 / `daily` 每日劇）、`enabled`、`order`、`arcUnit`、`addedAt`、`audio`（`host`：`r2` / `app`、`folder`、檔名 `file` template）、`theme`（淺色 + `statusBar` / `headerRule` / `titleFont`）、`arcs` 或 `episodes` |

- folder 名 = id = route（`/show/:id`、`/drama/:id`），只可以細楷英數同連字號
- 短篇劇 `arcs[]`：`name`（= R2 folder 名）、`episodes`（集數，或者集名 list，冇集名寫 `null`）、`titles`（`{ "集數": "集名" }` 零散補集名）、`firstNo`（有第零集寫 `0`）、`addedAt`（上架日，14 日內出「新」）、`disc`（短篇自己碟面）、`files`（`{ "集數": "完整檔名" }` 不規則檔名）
- 檔名 template token：`{no}` `{no2}` `{noZh}`（中文數字）`{arc}` `{folder}` `{title}`；`[ … ]` 入面 token 空值就整段略去，例如 `{no2} - {arc} - 第{noZh}集[ - {title}].m4a`。每日劇用 `{date}` / `{yyyymmdd}`
- ⚠️ `name` / `fileTime` / `audio` / 檔名唔可以亂改：錄音網址係已儲進度（localStorage）嘅 key
- 橫版主頁 grid 寫死 4 欄 × 2 行 = 7 個節目 + 今日格；加減節目要一齊改 `ShowGrid.module.css`（`src/shows/shows.test.ts` 會提醒）

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

### App icon

`public/` 入面嘅 icon（`icon-192`、`icon-512`、`icon-maskable-512`、`apple-touch-icon` 180、`favicon` 64）
全部由 `design/app-icon.png` 生成。改咗原圖之後執行：

```bash
node scripts/generateIcons.mjs
```

用 Playwright 嘅 Chromium 縮放（唔使另外裝套件）；maskable 同 apple-touch-icon 填 `#98bdde` 底色，
maskable 內容縮到 80%（安全區）。有 ImageMagick 就順手無損壓縮（像素唔變），冇就跳過。

## 部署（只需做一次）

GitHub repo → **Settings → Pages → Build and deployment → Source** 揀 **GitHub Actions**。
之後每次 push `main`（或者喺 Actions 手動執行）都會自動 build 同重新 deploy 去
`https://<owner>.github.io/903-player/`。

## 目錄

| 路徑                    | 用途                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `src/config/`           | 常數、theme primitive（`showThemes.ts`）、版面 breakpoint                             |
| `src/catalog/`          | 資料檔共用層：JSON reader、theme schema、folder source                                |
| `src/shows/`            | 7 個節目：`<id>/show.json` + `art.jpg`，registry（`SHOWS` / `findShow` / `themeFor`） |
| `src/dramas/`           | 廣播劇：`<id>/drama.json` + 圖，schema / 檔名 template / 集數 builder / registry      |
| `src/services/`         | `audioProbe.ts`（喺部機度 probe 錄音）、`probeStore.ts`（localStorage 錄音清單）      |
| `src/i18n/`             | 語言包（zh-HK 書面語）                                                                |
| `src/player/`           | `AudioController`（唯一 audio element）、Media Session                                |
| `src/components/`       | UI component（每個 folder 有 `.tsx`、`.module.css`、`.test.tsx`）                     |
| `src/pages/`            | 主頁、節目頁、今日節目頁                                                              |
| `src/styles/tokens.css` | Design tokens（來源：mockup）                                                         |
