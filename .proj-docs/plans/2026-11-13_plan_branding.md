# 903-player：App 外觀 — App 圖示 + 名稱與簡介（品牌）

## Context

用戶 2026-11-13 要求 admin 可以更新 App 圖示（player 同 admin 共用）同 App 名 / 簡介，放喺「品牌 → App 外觀」頁（同首頁 Banner 一齊）。
Mockup：`_mockups_/admin-appearance/index.html`（v2，Q1–Q6 全部確認）。Branch：`feature/admin-branding`（已有 nav / 文字 / 分頁改動，未開 PR）。

## 已確認決定

| 項目       | 決定                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 生效方式   | Publish 之後自動重新部署 player；**GitHub Pages**（`repository_dispatch`）+ **Vercel**（Deploy Hook）兩個都觸發                                                                                            |
| Icon 上載  | 一張原圖（PNG / JPG / WebP），browser 裁正方形，自動輸出 favicon 64、apple-touch 180、icon 192 / 512、maskable 512（**PNG**）；splash、og-icon 暫時唔跟                                                    |
| 各自裁切   | Q6：預設「所有裝置使用同一裁切」；取消勾選後三個分頁各自調：iPhone（180）、Android（192 / 512 / maskable 512，圓形 / 方形同一張）、瀏覽器分頁（64）                                                        |
| 遮罩底色   | Q1：maskable 512 = icon 縮到安全區（80%）放中間，四周填底色；預設抽 icon 邊緣色，可揀 4 個（抽色 2 個 + 黑 + 白）                                                                                          |
| 文字       | App 名（manifest `name`、`<title>`、`og:title`、`og:site_name`）、短名（manifest `short_name`；空 = 用 App 名；> 12 字元黃色提示，Q2）、簡介（meta description、`og:description`、manifest `description`） |
| 改名確認   | Q3：App 名有改，儲存時彈確認                                                                                                                                                                               |
| 還原       | Q4：圖示、名稱與簡介、Banner 各自「還原」（確認）；還原 = 用 repo 內建                                                                                                                                     |
| 部署狀態   | Q5：「發佈 / 部署」頁每行加部署狀態（部署中 / 已部署 / 部署失敗 + GitHub 連結 + 重新部署 / 無需部署）；狀態淨係追 GitHub Actions（Vercel hook 冇狀態 API）                                                 |
| Admin icon | Admin 分頁 icon 跟 publish 咗嘅 App 圖示（冇就用 repo 內建）                                                                                                                                               |
| 版本       | api 0.9.0、admin 0.2.0、player 1.36.0（MINOR）                                                                                                                                                             |
| 文字       | Admin 介面一律書面語（`.claude/CLAUDE.md`「Admin 介面文字」）                                                                                                                                              |

## Contract

### `packages/catalog`

- `ASSET_DIMENSIONS` 加 icon 尺寸：`iconFavicon` 64、`iconAppleTouch` 180、`icon192` 192、`icon512` 512、`iconMaskable` 512（PNG）
- Catalog document 加選填 `branding?: { icon?: CatalogIcon; text?: CatalogText }`
    - `CatalogIcon = { favicon, appleTouch, icon192, icon512, maskable: string(url); maskableBackground: '#rrggbb' }`（五張都要，缺一張拒絕）
    - `CatalogText = { name: string; shortName?: string; description: string }`（trim 後非空；長度上限命名常數：name 40、shortName 24、description 200）
    - 唔識嘅 key 拒絕（同 banner 一樣）

### `apps/api`（0.9.0）

- Migration `0006_branding.sql`：單行 table（同 `0005_banner.sql` 做法），存 icon 五個檔名 + `maskableBackground`、text 三欄，各自 `updatedAt`
- `PUT /api/assets`：除 WebP 外收 **PNG**（magic bytes + IHDR 闊高），只限 icon 五個尺寸；檔名 `<hash16>.png`
- `GET /api/branding` → `{ icon: {…檔名, maskableBackground} | null, text: {…} | null, updatedAt }`
- `PUT /api/branding/icon`（五個檔名 + 底色，檔名要已上載、尺寸啱）、`DELETE /api/branding/icon`（還原，204 idempotent）
- `PUT /api/branding/text`（驗長度 / 非空）、`DELETE /api/branding/text`
- Publish：有就寫 `catalog.branding`；`GET /api/changes` 加 `brandingChanged: boolean`；`GET /api/publishes` changes 加 `brandingChanged`
- **部署觸發**：publish 成功而 `brandingChanged` → `POST https://api.github.com/repos/dcwhung/903-player/dispatches`（`event_type: catalog-branding`，`client_payload.publishId`）+ `POST <VERCEL_DEPLOY_HOOK_URL>`；secret `GITHUB_DEPLOY_TOKEN`、`VERCEL_DEPLOY_HOOK_URL`（未設就跳過，publish 照成功，記錄 `deploy: skipped`）
- Publish 記錄加 `deploy: 'none' | 'triggered' | 'skipped' | 'failed'` + `deployRequestedAt`
- `GET /api/publishes/:id/deploy` → 用 token 查 GitHub Actions `deploy.yml` 喺 `deployRequestedAt` 之後嘅 `repository_dispatch` run → `{ status: 'queued' | 'in_progress' | 'success' | 'failure' | 'unknown', url }`
- `POST /api/publishes/:id/deploy`（重新部署）：再 dispatch（同 Vercel hook）
- `GET /api/branding/favicon`（唔使登入）：有 publish 咗嘅 icon 就 302 去 favicon，冇就 302 去 `/favicon.png`（admin 分頁 icon 用）

### `apps/player`（1.36.0）

- Prebuild snapshot（`scripts/catalogSnapshot.ts`）：catalog 有 `branding.icon` → 下載五張圖寫入 build 嘅 `favicon.png`、`apple-touch-icon.png`、`icon-192.png`、`icon-512.png`、`icon-maskable-512.png`（覆蓋 public 內建）；冇就用內建
- `vite.config.ts`：有 `branding.text` → manifest `name` / `short_name` / `description`、`index.html` `<title>`、`meta description`、`og:title`、`og:site_name`、`og:description` 用 catalog 值；冇就用而家寫死嘅值
- 唔改 runtime 行為（已安裝 app icon 要重裝先變）

### CI

- `deploy.yml` 加 `repository_dispatch: types: [catalog-branding]`（build 照跑 lint + test）

### `apps/admin`（0.2.0）

- App 外觀頁卡次序：App 圖示 → 名稱與簡介 → 首頁 Banner（mockup ①）
- 圖示卡：預覽（原圖、iPhone、Android 圓形 / 方形、瀏覽器分頁），置中平均；更換 dialog（mockup ②：同一裁切 / 三分頁、遮罩底色 4 色）→ 上載五張 PNG → `PUT /api/branding/icon`
- 名稱與簡介卡（mockup ③）：三欄 + WhatsApp / 主畫面預覽 + 改名確認
- 發佈頁：`brandingChanged` 摘要 + 「須重新部署」提示；發佈 / 部署頁每行部署狀態 + 重新部署（mockup ④）
- `index.html` icon link 改為 `/api/branding/favicon`

## 用戶要做

1. GitHub：fine-grained token，只限 `dcwhung/903-player`，權限 **Contents: Read and write**（`repository_dispatch` 要）+ **Actions: Read**（查部署狀態）→ GitHub repo secret **`DEPLOY_GITHUB_TOKEN`**（GitHub 唔准 secret 名以 `GITHUB_` 開頭；`deploy-api.yml` 會同步做 Worker secret `GITHUB_DEPLOY_TOKEN`）
2. Vercel：Project → Settings → Git → Deploy Hooks，branch `main` → GitHub repo secret `VERCEL_DEPLOY_HOOK_URL`
3. 加完兩個 secret 之後手動 Run 一次「Deploy API」先會寫入 Worker（步驟見 `apps/api/README.md`「重新部署 player」）

## 實作差異（Backend 2026-11-13）

- D1 開兩個單行 table（`branding_icon`、`branding_text`），各自 `updated_at`、各自刪；`publishes` 加 `deploy`、`deploy_requested_at`
- 還原 #N 唔還原舊 branding：同 banner 一樣照用 D1 而家嘅 branding；只有 D1 branding 同上一次 ok publish 唔同先觸發重新部署 player（同 `apps/api/README.md`「Publish / 還原」一致；`apps/api/test/deploy.test.ts` rollback 會 / 唔會觸發部署嘅 test 鎖住）
- Entries / banner 圖檔名照舊只收 WebP；PNG 只限 branding icon
- Player icon 唔係喺 `scripts/catalogSnapshot.ts` 下載：由 `apps/player/scripts/brandingIcons.ts` 下載五張 PNG（驗 PNG + sha256）寫去 branded public 副本，`vite.config.ts` 經 `scripts/brandingBuild.ts` 改 `publicDir` 覆蓋內建 icon（`publicDir` 要喺 config 階段定，snapshot 嘅 buildStart 太遲）
- 所以 production build 會 fetch 兩次 catalog：config 階段 `loadBranding`（branding）同 `catalogSnapshot` buildStart（snapshot）各一次；publish 剛好喺兩次之間會令 branding 同 snapshot 屬不同版本，下次 build 自然一致

## 實作次序（同一條 branch，唔開 parallel lane）

1. catalog + api（Backend Developer）
2. admin（Frontend Developer）
3. player + CI（Frontend Developer）
4. Code Review → QA S1 → 用戶睇截圖 → 用戶話先開 PR

## 風險

- 🟡 GitHub / Vercel secret 未設：publish 照成功，部署狀態顯示「未設定自動部署」，要手動 deploy
- 🟡 Dispatch 同 push 撞：deploy.yml `concurrency: pages` 唔取消，排隊
- 🟡 Admin favicon 經 302：瀏覽器 cache；icon 換咗要 reload 先見
- 🟢 舊 player 讀到 `branding`：選填欄位，忽略
