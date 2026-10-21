# 903 Player

自用 PWA，收聽 [hkfm903.live](https://hkfm903.live/) 嘅錄音 archive。

## 功能

- 主頁：7 個節目 + 今日節目（兩個一行）；橫額釘頂（右下角版本號），矮螢幕節目格按高度分頁（左右掃 / 指示點）；今日有新一集（已上架、未聽完）嘅節目格左上角有「New」
- 任何高度都係固定版面：只有集數 / 節目表清單自己捲；清單播緊嗰行嘅掣變暫停
- 節目頁：節目名按畫面闊度縮字完整顯示、唱片 + 可拖動弧形進度條、−60 / −30 / 播放暫停 / +30 / +60、由頭播放、日子 slider（只列有錄音嘅日子，揀中置中，聽過 ≥ 95% 顯示剔）
- 今日節目頁：香港時間今日嘅節目表；今日有節目播就一定顯示今日（未有錄音嘅灰色「未上架」，全部未上架就顯示灰色唱片、唔自動播），今日冇節目播先顯示最近有錄音嘅日子
- 未上架：probe 試過但原站未有（404）嘅集數照列出，灰色、冇播放掣、撳唔到；播放器、日子條、卡疊、mini player 只用播得到嘅
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

| 路徑                    | 用途                                                                             |
| ----------------------- | -------------------------------------------------------------------------------- |
| `src/config/`           | 節目清單、常數                                                                   |
| `src/services/`         | `audioProbe.ts`（喺部機度 probe 錄音）、`probeStore.ts`（localStorage 錄音清單） |
| `src/i18n/`             | 語言包（zh-HK 書面語）                                                           |
| `src/player/`           | `AudioController`（唯一 audio element）、Media Session                           |
| `src/components/`       | UI component（每個 folder 有 `.tsx`、`.module.css`、`.test.tsx`）                |
| `src/pages/`            | 主頁、節目頁、今日節目頁                                                         |
| `src/styles/tokens.css` | Design tokens（來源：mockup）                                                    |
