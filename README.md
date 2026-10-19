# 903 Player

自用 PWA，收聽 [hkfm903.live](https://hkfm903.live/) 嘅錄音 archive。

## 功能

- 主頁：5 個節目 + 今日節目（兩個一行）
- 節目頁：唱片 + 可拖動弧形進度條、−60 / −30 / 播放暫停 / +30 / +60、由頭播放、日子 slider（只列有錄音嘅日子，揀中置中，聽過 ≥ 95% 顯示剔）
- 今日節目頁：香港時間今日有錄音嘅節目；今日未有就顯示最近有錄音嘅日子
- 自動續播（進度存喺本機 localStorage）、鎖屏 / 耳機控制、深色 + 跟系統淺色

## 架構

```
GitHub Actions（push main / 每 30 分鐘 / 手動）
  ├─ npm run scrape → public/data/recordings.json（爬唔到嘅節目沿用上次 deploy 嘅資料）
  └─ npm run build  → dist/ ─► GitHub Pages
PWA ─ fetch data/recordings.json ─► <audio> 直接播 audio.hkfm903.live
```

原站冇 JSON API 亦冇 CORS，所以由 GitHub Actions 爬 HTML 生成 JSON，同 PWA 一齊發佈。

## 開發

```bash
npm install
npm run dev        # 本地開發（要自行放 public/data/recordings.json）
npm test           # Vitest
npm run coverage   # 覆蓋率
npm run lint       # ESLint + Prettier
npm run scrape     # 爬原站，寫 public/data/recordings.json
npm run e2e        # Playwright 端對端測試（假資料 + 模擬 audio server）
npm run build
```

## 部署（只需做一次）

GitHub repo → **Settings → Pages → Build and deployment → Source** 揀 **GitHub Actions**。
之後每次 push `main` 同每 30 分鐘都會自動爬資料同重新 deploy 去
`https://<owner>.github.io/903-player/`。

## 目錄

| 路徑                    | 用途                                                                              |
| ----------------------- | --------------------------------------------------------------------------------- |
| `scripts/`              | 爬蟲（`parseRecordings.ts` 解析、`scrape.ts` 合併 fallback、`scrapeCli.ts` 入口） |
| `src/config/`           | 節目清單、常數                                                                    |
| `src/i18n/`             | 語言包（zh-HK 書面語）                                                            |
| `src/player/`           | `AudioController`（唯一 audio element）、Media Session                            |
| `src/components/`       | UI component（每個 folder 有 `.tsx`、`.module.css`、`.test.tsx`）                 |
| `src/pages/`            | 主頁、節目頁、今日節目頁                                                          |
| `src/styles/tokens.css` | Design tokens（來源：mockup）                                                     |
