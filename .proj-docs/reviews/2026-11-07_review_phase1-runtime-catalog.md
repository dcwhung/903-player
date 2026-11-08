# Code Review — 2026-11-07 — Backend Phase 1：runtime `catalog.json`（v1.30.0，預設關住）

- 審閱者：Code Reviewer（subagent）
- 目標：`feature/catalog/runtime-catalog-json` @ `e7d5130` vs `origin/main`（9 commits：`6daa4d2` plan、`176a750` parser、`a3bad21` runtime source、`0ccba64` SW caching、`3377039` buildCatalogJson、`6ba4ef1` SW 次序 fix、`5288662` e2e、`684dd12` 1.30.0、`e7d5130` plan ✅）
- SSoT（L1）：`.proj-docs/plans/2026-11-07_plan_phase1-runtime-catalog.md`（用戶批准）、`.proj-docs/plans/2026-11-06_plan_backend-admin.md`（L130：backend 用同一個 `packages/catalog` validator）；用戶決定：splash fetch ≤ 1.5s 即用、production 關住、現有用戶零影響
- Tier：T2（啟動次序 + SW + registry 由 import 時 build 改 lazy）
- Design Origin：none-required 成立（`.tsx` 只改 `SHOWS` → `allShows()`，冇 className / layout）
- 總評：flag off 路徑乾淨（`if (CATALOG_URL) await …` build 時剷走，SW 唔加 route）；remote 路徑雙重驗證、timeout、一次 session 只揀一次都有 test 鎖住。1 個 🟡：theme 自由字串可以帶任意 URL 入 CSS，繞過圖片 URL 白名單

## Hard Gates

all pass

- Lint：`npm run lint`（ESLint + `prettier --check .`）exit 0；Type：`npx tsc -b` exit 0
- Tests（Hard Rule 7，只跑相關）：30 檔 534 pass（`packages/catalog/src/document`、`catalog/runtime`、`catalogJson`、`runtimeImportOrder`、`scripts/catalogCaching`、`scripts/buildCatalogJson`、`catalog/shows`、`src/data`、`storageMigration`、`audioProbe`、`selectors`、`HomePage`、`useDramaNewLabels`）。冇跑 full suite / e2e（developer 已跑，CI 跑緊）
- Coverage：`runtime.ts` lines 100% / branch 94.7%；`document.ts` lines 100% / branch 94.3%
- Security：冇新第三方依賴（lockfile 只改 version）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                               |
| -------- | ------ | ------- | ------------------------------------------------------------------ |
| 正確性   | 25     | 25      | flag off 行為不變；一致性 test 逐集比 ID / URL / 日子 / theme / 圖 |
| 安全性   | 15     | 20      | W-702                                                              |
| 可維護性 | 20     | 20      | 函數短、常數有名、comment 講清楚次序原因                           |
| 測試覆蓋 | 15     | 15      | 失敗路徑（網絡 / 404 / 非 JSON / schema / build / timeout ×3）齊   |
| 性能     | 10     | 10      | registry memo；flag off 零 request                                 |
| 代碼風格 | 10     | 10      | lint / prettier 過                                                 |
| **總分** | **95** | **100** |                                                                    |

**結果：✅ pass**

## 🟡 W-702 — remote theme 嘅 `headerRule` / `titleFont` 可以帶任意 URL 入 CSS

- 位置：`packages/catalog/src/core/themeSchema.ts:42-45`（`readOptionalString`，冇內容限制）→ `apps/player/src/config/showThemes.ts:50-51` → `apps/player/src/pages/shared/Page.module.css:54`（`background: var(--theme-header-rule)`）
- L1：Phase 1 parser 規則「圖 URL 只收 https 或同 origin 絕對 path」（`document.ts` `isCatalogImageUrl`）嘅目的係限制 remote 文件可以令 app 去邊度攞資源；主計劃 L130 定咗 backend 都用同一套 validator，所以 validator 漏咗嘅嘢 Phase 2 admin 都會照收
- L2：臨時 test（跑完已刪）：`golden` 嘅 `theme.headerRule = 'url(http://tracker.invalid/p.gif)'`，`parseCatalogDocument` + `buildRegistry` 都過，`dramaThemeFor('golden').headerRule` 原封不動
- L3：以前呢兩個字串只嚟自 bundle（repo review 過），而家嚟自網絡。React style 用 `setProperty`，執行唔到 JS，但可以令劇集頁去任何 host（包括 `http:`）攞圖：追蹤用戶、mixed content、版面被改。Production 而家關住，所以唔 block，但要喺 Phase 2 開 flag 之前修
- 方案 A：`readTheme` 對 `headerRule` 加白名單：只准 `linear-gradient` / `repeating-linear-gradient` / `radial-gradient` / `calc` 幾個 function、hex 色、長度 / 百分比 / 關鍵字，唔准 `\`、引號；`titleFont` 只准 font-family 字元（`^[\p{L}\p{N}\s'",-]+$`u）。Trade-off：規則要同 `drama.schema.json` 一齊改（示意 regex 已核過 `library/` 現有 6 個 `headerRule` 同 `c18` 嘅 `titleFont` 全部過、`url(` / `//` / `image-set(` / CSS escape 全部拒絕），將來想用新 CSS 寫法要改 validator
- 方案 B：只拒絕危險 token（大小寫不分嘅 `url(`、`image(`、`image-set(`、`element(`、`\`）。改動細，但係黑名單，CSS escape 同新 function 容易漏
- 推薦：A（同圖 URL 一樣用白名單）；放喺 `packages/catalog`，JSON schema 加相同 `pattern`，`catalogSchema` / `jsonSchemas` 一致性 test 自然鎖住

## Developer 自報偏離（逐項判斷）

1. `main.tsx` 次序：合理。`AudioController` constructor 冇讀 storage，`attachPlaybackLog` 用自己嘅 key（唔屬 migration），`UpdateManager` 唔讀 catalog；`isHardReload` / `controllerchange` 要同步先行（S-648）。`runtimeImportOrder.test.ts` 鎖住 import 時唔讀 registry
2. e2e harness：合理。SW 發嘅 request 交本機 server，本機冇呢個檔 → 同 404 一樣 fallback；`remoteCatalog.mjs` 自己嘅 route 會答埋 SW request，所以「離線用 SW cache」嗰項真係經 SW。冇遮住真問題（S-765 記低一個小差異）
3. `allShows()` / `allDramas()` + 15 個 wrapper：合理。plan 准「getter 或 lazy array」，function 比 Proxy array 易讀；wrapper 用 `Registry['x']` type 鎖簽名
4. `activeDramaRegistry()` / `activeShowRegistry()`：命名比 `activeSource` 準確（回傳 registry 唔係 source），接受
5. SW 1s / page 1.5s：合理，comment 寫咗原因；plan 嘅「一致」本意係避免雙重等待，呢個做法更好
6. `loadEnv` + define：合理，同 `__APP_VERSION__` 一致；`vite.config.ts` 用 `mode` function 形式，Vitest 仍然攞到 define
7. Parser 規則：合理，regex 核過（`..`、開頭 `/`、backslash、protocol-relative `//` 都拒絕）；漏咗嘅係 theme 字串（W-702），唔係 parser 本身

## 重點核對

- 安全：audio URL 由 `host` enum（`r2` / `app`）+ 固定 base + encode 砌，remote 改唔到 host；圖 URL 只入 `<img src>`；冇 `innerHTML`；唯一缺口見 W-702
- 一次 session：重複 init、init 前讀過、fetch 期間讀過三種都有 test；dev throw / prod warn 用 `import.meta.env.DEV`
- 一致性 test：`catalogJson.test.ts` 比每集 `episodes`（含 `id`、`url`）、每週 `dramaStatus` / `dramaEpisodesOf` / `enabledDramas` / `upcomingDramas`、theme、art、arc tile、show theme；圖 URL normalize 做 `kind/id/檔名` 再比，而且斷言兩邊圖數一樣。覆蓋足夠

## 🟢 / Observation（已入 backlog）

- S-763 `apps/player/scripts/catalogCaching.ts:58`：圖 CacheFirst 只 match 同 `catalog.json` 同一個 folder；`buildCatalogJson --image-base` 可以係另一個 base，Phase 2 圖唔喺同 folder 就唔會 offline cache
- S-764 `catalogCaching.ts:19`：`statuses: [0, 200]` 會將 opaque 錯誤（例如 404）當成功 cache 60 日，opaque response 喺 Chrome 每個按 ~7 MB 計 quota；Phase 2 R2 開 CORS 後改 `<img crossorigin>` 再剷走 0
- S-765 `apps/player/e2e/harness.mjs:111`：其他 section SW 發嘅 catalog request 去本機 preview server，response 會入 `catalog-json` cache（可能係 SPA fallback 嘅 HTML）；而家冇影響（parse 失敗 → 內建），寫低畀將來 debug
- Observation：主頁 grid 寫死 7 個節目，remote 節目數唔同會亂（plan 已排 Phase 5）

## ✅ 做得好嘅地方

- `withTimeout` 同時處理 fetch 唔理 abort、body 下載緊兩種情況，仲各有 test
- `runtimeImportOrder.test.ts` 用 test 鎖住「import 時唔准讀 registry」呢個隱性約束
- 一致性 test 由同一個 `buildCatalogJson.mjs` 生成，e2e fixture 同 Phase 2 migration 共用，證明鏈完整

## 修訂代碼（W-702，方案 A 示意）

```ts
// packages/catalog/src/core/themeSchema.ts
/** headerRule：只准 gradient / calc、hex 色、數字單位同關鍵字；冇 url() / image-set() / escape */
const HEADER_RULE_PATTERN =
    /^(?:(?:repeating-)?(?:linear|radial)-gradient|calc|[a-z-]+|#[0-9a-f]{3,8}|-?[\d.]+(?:%|px|deg|rem|em)?|[(),/\s+*-])+$/i;
const CSS_FUNCTION_PATTERN = /([a-z-]+)\(/gi;
const ALLOWED_FUNCTIONS = new Set([
    'linear-gradient',
    'repeating-linear-gradient',
    'radial-gradient',
    'calc',
]);
/** titleFont：font-family 名同引號、逗號 */
const FONT_FAMILY_PATTERN = /^[\p{L}\p{N}\s'",-]+$/u;

const isSafeHeaderRule = (value: string): boolean =>
    HEADER_RULE_PATTERN.test(value) &&
    [...value.matchAll(CSS_FUNCTION_PATTERN)].every(([, name]) =>
        ALLOWED_FUNCTIONS.has(name.toLowerCase()),
    );
// readTheme：headerRule 唔過 isSafeHeaderRule、titleFont 唔過 FONT_FAMILY_PATTERN → fail(ctx, …)
```

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/catalog/runtime-catalog-json"
context: "Phase 1 runtime catalog.json v1.30.0 review pass (95); W-702 (theme headerRule/titleFont accept url() from remote catalog) must be fixed before Phase 2 enables VITE_CATALOG_URL - production is off so not blocking; S-763..S-765 backlog; QA S1 should cite CI run of e7d5130 for e2e; integration branch is main (no develop)"
```
