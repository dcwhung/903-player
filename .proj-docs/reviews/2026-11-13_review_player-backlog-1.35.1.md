# Code Review — player 1.35.1：banner 圖 fallback + 首頁 backlog 清理

- 日期：2026-11-13
- 審閱者：Code Reviewer（獨立）
- 目標：`fix/player-backlog-1.35.1` @ `cb46ef2`（`e645494` + `cb46ef2`），`git diff $(git merge-base HEAD origin/main)...HEAD`（19 檔）
- 範圍：S-925、S-926、S-927、S-928、S-929、S-939、S-941 + version 1.35.1；S-940 刻意唔做
- Tier：T1（PATCH，bug fix + test / e2e 整理，冇排版改動）
- 總評：七項都做到 backlog 講嘅嘢。`useBannerImages` 喺 catalog 圖 `onError` 時兩張一齊換返內建圖，換完 `onError` 變 `undefined`（冇 retry loop），即時切換冇動畫，符合 CLAUDE.md Motion 規則。尺寸改由 `ASSET_DIMENSIONS` 嚟（值同舊常數一樣 1200 × 517 / 2000 × 400），`--banner-ratio` 唔變。ShowGrid fallback `32 / 9` 同舊 `calc()` 喺兩欄時數值一樣（`portraitColumns` 最多 2 欄），冇排版改動。冇收斂嘅 🔴 / 🟡。

## Hard Gates

all pass。

- lint：`npm run lint`（`eslint .` + `prettier --check .`）exit 0（第一次撞到 main agent e2e 嘅暫存 `_dbg.mjs` 消失 ENOENT，重跑 pass）
- type：`npx tsc -b apps/player` exit 0
- unit（只跑 diff 相關）：`npx vitest run apps/player/src/components/pages/home/{HomeLandscapeGrid,HomeBanner,ShowGrid} apps/player/src/pages/home` → 34 files / 380 tests pass
- e2e 由 main agent 跑（Hard Rule #7）；main agent 報 banner 404 × 3 viewport、S-941 0.5px 都 pass，`cb46ef2` 修正「CORS 唔批」check 後要再跑一次。Coverage n/a；`useBannerImages` / `bannerImages({ builtIn })` 有專屬 test。Security：冇新依賴。
- Version：`apps/player/package.json` 1.35.0 → 1.35.1，`package-lock.json` 同步。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                                |
| -------- | ------- | ------- | ------------------------------------------------------------------- |
| 正確性   | 25      | 25      | fallback 兩張一齊換；內建圖唔再處理 onError；尺寸同舊值一致         |
| 安全性   | 20      | 20      | `crossOrigin` 保留；fallback 只去同 origin 內建圖                   |
| 可維護性 | 20      | 20      | 尺寸 SSoT 回歸 catalog；S-955 / S-956 只係建議                      |
| 測試覆蓋 | 15      | 15      | hook / 三個 component 都有 error case；e2e 404 三種擺法 + CORS 唔批 |
| 性能     | 10      | 10      | 每次 render O(1)；S-955 轉向重試係 observation 級                   |
| 代碼風格 | 10      | 10      | lint / prettier 全過；註解寫明 S 號同理由                           |
| **總分** | **100** | **100** | **結果：✅ pass**                                                   |

## 逐項核對

- S-925：`bannerImages.ts` 用 `ASSET_DIMENSIONS.bannerStandard / bannerLong`，node test 對住 WebP 檔頭比 `ASSET_DIMENSIONS`。✅
- S-926：`FittedBanner.test.tsx:24-30` 用 `bannerRule(COUNT, MINI_PLAYER, NaN).image` 斷言準確嗰張。✅
- S-927：`CoverBanner.test.tsx` / `FittedBanner.test.tsx` 喺 `HomeLandscapeGrid/`，`HomeBanner.test.tsx` 唔再 import 佢哋。✅
- S-928：`BANNER_ALT` 只喺 `e2e/harness.mjs:260` 定義，`run.mjs` / `remoteCatalog.mjs` import。✅
- S-929：hook + 三個 component + unit test + e2e（404 直版 / 手機打橫 / 闊橫版；跨 origin ACAO 批第二個 origin）。`cb46ef2` 解釋 Playwright `route.fulfill` 冇 ACAO 會當批准，改用 `serveImage(route, FOREIGN_ORIGIN)`，合理；`readFileSync` / `imageFile` 仲有 `serveImage` 用緊，冇 unused。✅
- S-939：`aspect-ratio: 32 / 9` 字面值，node test 驗等於 2 × tile token 比例。✅（見 S-956）
- S-941：`UNFILLED_SPAN_TOLERANCE_PX = 0.5` 具名常數，只用喺未量到橫跨格比較，其他照用 `EDGE_TOLERANCE_PX`。✅

## 🟢 Suggestion / Observation（同一個 PR 修）

- S-955 `apps/player/src/components/pages/home/HomeLandscapeGrid/useBannerImages.ts:9`：`failed` 係每個 component instance 嘅 `useState`；直版 `HomeBanner` ↔ 手機打橫 `FittedBanner` ↔ 闊橫版 `CoverBanner` 係唔同 instance，轉向 / 改大細 remount 就由 `false` 再試一次已知會失敗嘅 catalog URL（404 唔入 SW cache），每次轉向都多一個 request，換圖前可能閃一下爛圖 / alt 字（L3 推斷，未重現）。建議：module-level 記住「catalog banner 已失敗」（例如 `let catalogBannerFailed = false`，`onError` 設 true 再 `setFailed`；`activeBanner()` init 後唔再換 source，所以唔使 key by URL），hook 初始值讀佢；test 加一個 remount 後直接用內建圖嘅 case，並喺 `beforeEach` 提供 reset（例如 export `resetBannerFallbackForTest`）。
- S-956 `apps/player/src/components/pages/home/ShowGrid/showGridCss.node.test.ts:97`：`32 / 9` 只鎖住「2 × tile 比例」，個 2 來自 `showGridPages.ts:7` `PORTRAIT_MAX_COLUMNS`，test 冇對住佢；改最多欄數 fallback 會靜靜地錯。建議 export `PORTRAIT_MAX_COLUMNS`（`showGridPages.ts` 冇 import，node test 可直接 import），斷言改 `toBeCloseTo(PORTRAIT_MAX_COLUMNS * tileRatio)`，CSS 註解同步講「= 最多欄數 × tile 比例」。
- S-957 `apps/player/e2e/remoteCatalog.mjs:305`：`cb46ef2` 改咗做「ACAO 批第二個 origin」，但 function 仲叫 `checkBannerWithoutCors`；建議改名 `checkBannerCorsRejected`（`:429` 同步）。
- S-958 `apps/player/src/components/pages/home/HomeLandscapeGrid/FittedBanner.test.tsx:37`：fallback case 寫死 `/banner\.webp$/`，冇跟 `bannerRule` 揀嘅 `image`（S-926 嘅精神）；日後 rule 改揀 `long` 呢個 case 會錯 fail。建議用 `const { image } = bannerRule(...)` 揀預期：`image === 'long' ? /banner-wide\.webp$/ : /banner\.webp$/`，或者斷言等於 `bannerImages({ builtIn: true })[image].src`。
- Observation：`apps/player/src/pages/home/HomePage.test.tsx:20`、`HomePageWide.test.tsx:16` 仲各自寫死 `BANNER_ALT` 字面值（S-928 只講 e2e，唔喺 diff 範圍）；unit test 可以改用 `t('home.bannerAlt')`，唔強制。
- Observation：`<picture>` 揀咗 `long` source 而 `long` 失敗時，`standard` 都會一齊換內建圖（註解有寫明「兩張一齊換」），合理。

## ✅ 做得好嘅地方

- `onError` 喺內建圖時係 `undefined`，結構上杜絕 error → 換圖 → error loop，有 test 鎖住。
- `cb46ef2` 先用獨立 probe 證實 Playwright 行為再改 fixture，e2e 唔會變成假綠。
- ShowGrid fallback 用 node CSS test 對 token 計比例，而唔係抄數字。

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "fix/player-backlog-1.35.1"
context: "C=0, W=0, S-955 (module-level banner fallback memory across remount), S-956 (lock 32/9 to PORTRAIT_MAX_COLUMNS in node test), S-957 (rename checkBannerWithoutCors), S-958 (FittedBanner fallback test follow bannerRule image); all to be fixed in same PR; integration branch is main; e2e re-run needed for cb46ef2 (main agent); S-940 intentionally not done"
```
