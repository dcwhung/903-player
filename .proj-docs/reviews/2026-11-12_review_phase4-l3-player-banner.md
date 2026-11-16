# Code Review — Phase 4 L3：player 1.34.0 首頁 banner 讀 catalog

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立）
- 目標：`feature/player-catalog-banner` @ `12664c0`，`git diff origin/main...HEAD`（21 檔，+434 / −49）
- Spec：`.proj-docs/plans/2026-11-12_plan_phase4-5.md`「L3：player 1.34.0」第 1–3 點
- Tier：T2（MINOR，新功能，跨 runtime / snapshot / home component）
- 總評：三點都跟 spec。`bannerImages()` 經 `activeBanner()` 揀 remote → snapshot → 內建圖，尺寸鎖死所以 `--banner-ratio` 唔變；snapshot 連 banner 兩張一齊下載、改檔名、bundle 時 localize，缺圖成份 snapshot 唔用（同 entry 圖一致）。`HomeFillGrid` / `landscapeLayout` / `fillShape` 冇郁；`HomeLandscapeGrid` folder 只改咗 `CoverBanner` / `FittedBanner` 嘅 `src` + `crossOrigin` 同 `bannerEdges` 嘅 CORS，冇排版改動。冇收斂嘅 🔴 / 🟡。

## Hard Gates

all pass。

- lint：`npx eslint <改動 .ts/.tsx/.mjs>` exit 0；`npx prettier --check <21 個改動檔>` 全過
- type：`apps/player` `npx tsc -b` exit 0
- unit（只跑 diff 相關）：`npm test -- apps/player/scripts/catalogSnapshot apps/player/src/catalog/catalogImageCors apps/player/src/catalog/runtime apps/player/src/catalog/snapshot apps/player/src/components/pages/home` → 48 files / 464 tests pass
- e2e 由 main agent 跑（Hard Rule #7，reviewer 唔跑）。Coverage n/a（冇量度），`activeBanner` / `bannerImages` / `loadSnapshot` banner / snapshot banner 下載都有專屬 test。Security：冇新依賴。
- Version：`apps/player/package.json` 1.33.0 → 1.34.0，`package-lock.json` 同步。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                                 |
| -------- | ------- | ------- | -------------------------------------------------------------------- |
| 正確性   | 25      | 25      | remote / snapshot / 內建三條路都有 test；snapshot 缺 banner 圖成份棄 |
| 安全性   | 20      | 20      | banner URL 經 L0 `readImageUrl`（https 或同 origin 路徑）；CORS 載入 |
| 可維護性 | 20      | 20      | S-925（尺寸常數）只係建議                                            |
| 測試覆蓋 | 15      | 15      | 有 / 冇 banner、malformed、snapshot fallback、e2e 同 / 跨 origin     |
| 性能     | 10      | 10      | banner 同 entry 圖共用下載 Map（同名只下載一次）；render 時讀係 O(1) |
| 代碼風格 | 10      | 10      | lint / prettier 全過；註解寫明決定                                   |
| **總分** | **100** | **100** | **結果：✅ pass**                                                    |

## Developer 設計決定（獨立判斷）

- `activeBanner()` 代替 spec 講嘅 `useCatalog` / `CatalogProvider`：repo 確實冇呢兩個（`grep` 冇結果），registry 一向係 module-level function 經 `runtime.ts`；`main.tsx:90` 喺 render 前 `await initCatalog`，所以 render 時讀冇 race。計「讀過」同 registry 一致，啱。
- remote 冇 banner 就用內建圖、唔退去 snapshot：同 L1「還原預設 = 刪 banner」一致，否則 admin 還原咗都仲會見到舊 snapshot 圖。同意。
- banner 喺 player `source.ts` localize：`localizeDocument` 係 `...doc` spread，banner 會原封保留落去 player 再換，冇 double-localize；唔 bump catalog package 合理。
- `crossOrigin`：R2 圖跨 origin 冇 CORS 會 taint `bannerEdges` canvas；SW route（`catalogCaching.ts:61`）只 cache 200，要 CORS 先唔係 opaque。內建圖同 origin，加咗冇分別。取消豁免 test 啱。
- 冇 CHANGELOG 檔：README snapshot 段 + commit message 已經寫，符合 repo 現況。

## 🟢 Suggestion / Observation（入 backlog，唔 block）

- S-925 `apps/player/src/components/pages/home/HomeLandscapeGrid/bannerImages.ts:14`：四個尺寸常數再抄一份，註解話同 `ASSET_DIMENSIONS.bannerStandard / bannerLong` 一致；而家 catalog banner 依賴呢個尺寸，建議直接 import `ASSET_DIMENSIONS`（S-805 SSoT），免得日後只改一邊。
- S-926 `apps/player/src/components/pages/home/HomeBanner/HomeBanner.test.tsx:39`：`FittedBanner` 只斷言 `src` 係兩張其中一張；建議用 `bannerRule(8, false, …)` 揀出嘅 `rule.image` 斷言準確嗰張。
- S-927 `HomeBanner.test.tsx:31-41`：`CoverBanner` / `FittedBanner` 嘅 case 放咗喺 `HomeBanner/` folder；建議搬去 `HomeLandscapeGrid/` 各自嘅 test，跟 component folder 規範。
- S-928 `apps/player/e2e/remoteCatalog.mjs:28`：`BANNER_ALT` 同 `run.mjs:115` 抄咗一份；可以抽去共用 e2e module。
- S-929 `HomeBanner.tsx` / `CoverBanner.tsx` / `FittedBanner.tsx`：catalog banner 圖 404 或冇 CORS 時 `<img>` 爛圖，冇退返內建圖；spec 冇要求（「冇」= 冇 `banner` 欄位），entry 圖都係咁，可以考慮 `onError` fallback。
- Observation：`HomeLandscapeGrid` folder 有 3 個檔改咗（`src` / `crossOrigin`），plan 原文「唔使改」；冇排版 / CSS 改動，L4 只改直版 `ShowGrid`，merge 衝突風險低。
- Observation：R2 banner 圖要等第一次 render 先入 SW CacheFirst；闊版 `long` 只喺 `WIDE_BANNER_QUERY` match 先載，離線轉方向可能未有 cache（同 entry 圖行為一致）。

## ✅ 做得好嘅地方

- `imagesOf` / `withFileNames` 用返 `imageOf`，banner 同 entry 圖一樣驗 `<hash>.<ext>`、同名只下載一次；壞 banner 圖成份 snapshot 拒絕，有 test。
- runtime test 用 `vi.doMock('./snapshot/source')` 覆蓋 snapshot fallback / 冇 initCatalog / remote 優先三條路。
- e2e fixture 同時試同 origin 同跨 origin banner，仲驗 fallback 用返內建圖。

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "feature/player-catalog-banner"
context: "C=0, W=0, S-925 (import ASSET_DIMENSIONS), S-926 (FittedBanner test assert exact image), S-927 (move CoverBanner/FittedBanner tests), S-928 (dup BANNER_ALT in e2e), S-929 (onError fallback to built-in); integration branch is main; e2e run by main agent; no layout change in HomeLandscapeGrid/HomeFillGrid"
```
