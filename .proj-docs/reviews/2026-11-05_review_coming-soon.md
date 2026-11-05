# Code Review — 2026-11-05 — 即將上架 / 快將下架（feature/drama/coming-soon，P8 #6）

- 審閱者：Code Reviewer（獨立）
- 目標：`git diff origin/feature/bookmark/episode...HEAD`（HEAD `b2bb2c5`）— `52b2bc7`、`aeba564`、`a49c593`、`2938d84`、`b2bb2c5`（v1.27.0 → v1.28.0 MINOR）；`073ec3a` merge P7 唔睇
- Design Origin：`mockup: _mockups_/coming-soon/index.html`（`b2bb2c5` commit message；未有 PR，開 PR 時 description 第一行要照寫）
- Tier：T3（新 feature、跨 catalog / registry / 主頁 / 劇集頁 / 收藏 tab）
- 總評：上架 / 下架判斷全部係 pure selector，registry 一律 `today` 參數 + `hkToday()` 預設，結構清楚，test 多。一個 🟡：部分集數下架之後，主頁書架次序會郁

## Hard Gates

all pass — `npx tsc -b` exit 0；`npm run lint`（eslint + prettier）exit 0；相關 unit `npx vitest run <改過嘅 folder>` 93 files / 1109 tests 全綠（冇跑 full suite / e2e）；新核心邏輯 coverage：`selectors/availability.ts` lines 100%、`catalog/dramas/lib/availability*.ts` lines 100%。Security：冇新依賴。

CI（同一個 SHA `b2bb2c5`）：run [#75 / 42068391074](https://github.com/dcwhung/903-player/actions/runs/42068391074) — **success**（`Detect code changes`、`Lint, unit & build`（lint / unit / production build）、`E2E (Playwright)`（`npm run e2e`，包括新 section「即將上架 / 快將下架」）全部 success）

## 評分結果

| 維度     | 得分   | 滿分    | 備注  |
| -------- | ------ | ------- | ----- |
| 正確性   | 20     | 25      | W-531 |
| 安全性   | 20     | 20      |       |
| 可維護性 | 20     | 20      |       |
| 測試覆蓋 | 15     | 15      |       |
| 性能     | 10     | 10      |       |
| 代碼風格 | 10     | 10      |       |
| **總分** | **95** | **100** |       |

**結果：✅ pass**（hard gates 全過、≥ 90、無 🔴；W-531 建議 merge 前修）

## 🟡 Warning

### W-531 部分集數 / 短篇下架之後，主頁書架次序會郁

- 位置：`src/pages/home/useHomeDramaItems.ts:68`（`dramaEpisodesOf(id, today)` 只畀今日有得聽嘅集）→ `src/selectors/dramaShelf.ts:37-48`（`touched`、`finished` 判斷、`released` addedAt 全部用呢個清單）
- L1：用戶揀咗「下架後 … 書架排位唔郁」
- L2：臨時 unit test（跑完已刪）：A 聽緊第 1 集（最近），B 聽緊第 1 集；A 第 1 集 `removedAt: 2026-12-01`。`2026-11-30` 次序 `[A, B]`，`2026-12-01` 變 `[B, A]`（A 由「收聽中」跌落「未聽過」）
- L3：同一原因仲有兩個情況：未聽嘅集下架咗 → 套劇變「全部聽完」排最尾；最新一批 / 最新短篇下架 → `released` addedAt 變舊，排後
- 方案 A（推薦）：`useShelfDramas` 傳畀 `dramaShelfOrder` 嘅 `episodesOf` 改用 catalog 已上架嘅集數（`catalogEpisodesOf(id).filter((e) => !isArcUpcoming(e.addedAt, today))`），同 `liveSeriesContinue` 用嘅清單一樣；`dramaShelfOrder` 保持 pure，唔使改；加一個 test 鎖住「下架前後次序一樣」
- 方案 B：`shelfKey` 分開兩個清單（排位用 catalog 已上架、其他用 live）；改動多啲，`ShelfDrama` signature 要改

## 🟢 Suggestion / Observation

- S-699 `src/pages/drama/useDramaPage.ts:108,331`：`useMemo(() => dailyEpisodesOf(drama.id) / seriesEpisodesOf(drama.id), [drama])` 冇 `today`，留喺劇集頁過香港午夜唔會出新一批 / 收走已下架嘅集（Developer 自報風險；registry 註釋寫「過咗香港午夜自動轉」）。改法：`const today = hkToday()` 傳入並加入 deps，同 `useShelfDramas` 一樣
- S-700 `src/components/pages/home/DramaShelf/DramaTile.tsx:13-20` × `DramaTileParts.tsx:20-23`：短篇數個 span 一向 `aria-hidden`，H2 / E1 字尾（「· 新短篇 12/11 上架」）因此讀屏聽唔到；`tileLabel` 可以加長版日子句（mockup 冇明寫，所以只係建議）
- S-701 `src/selectors/availability.ts:51-57`：`warned` 用短篇名做 key，兩套劇有同名短篇只會 warn 一次；可以用 `${addedAt}:${arc}` 或者加 dramaId
- S-702 Design-Source Binding：`Design Origin:` 只喺 `b2bb2c5` commit body；開 PR 時 description 第一行要寫 `Design Origin: mockup: _mockups_/coming-soon/index.html`

## Developer 自報偏離（唔扣分，等用戶決定）

1. 日期用 app 現有「日/月」（`formatDayMonth`）唔係 mockup「月/日」：同 app 其他地方一致，等用戶拍板
2. e2e 時鐘推到 30/11：真 catalog addedAt 係 10/24–10/27，19/10 會當全部未上架；週日相同、sample 錄音跟住移，合理
3. e2e fixtures 只喺 `--mode e2e` 編入：**已核實** — 本機 `npx vite build`（production mode）輸出 grep `e2e-soon` / `e2e-upcoming` / `e2e-gone` / `903player:e2e:dramas` 冇結果；`bundledSource.ts` 用 `import.meta.env.MODE === 'e2e'` 靜態條件，tree-shaking 剷走。`package.json` `e2e` = `npm run build -- --mode e2e && node e2e/run.mjs`，CI `ci.yml` e2e job 都係 `npm run e2e`，一致；`check` job 嘅 `npm run build` 係 production mode
4. 直版成套劇下架字接喺標籤後面（`PickerLabel` `replace` 只喺 unloaded）：等用戶拍板
5. 窄欄短版下架字（container query，讀屏照讀長版）：a11y OK
6. registry `hkToday()` 喺 useMemo 過午夜唔即時轉：見 S-699（改法好細，建議順手修）

## 重點項目核對

- 規則：上架 = `addedAt` 當日 HK 00:00（`addedAt > today` 先未上架）、下架 = `today >= removedAt`、快將下架 `≤ LEAVING_SOON_DAYS`（30，`config/constants.ts`）✅；集數有效上架日取三層最遲、下架日取三層最早 ✅；未知集數唔砌集（`count ?? 0`）✅
- 續聽跳下一集未下架（`liveSeriesContinue`）、進度唔刪、收藏留灰「已下架」可左滑 / Delete（`aria-disabled` 但照 focus）、舊 URL 返主頁 + toast 等啟動畫面走先出 ✅
- a11y：即將上架 chip / 一覽表行 / 摺埋批次 / 灰格全部 `aria-disabled="true"` 唔用 `disabled`；讀屏一律長版日子（`releaseDateLong` / `removalDateLong`）；圖示 `aria-hidden` ✅（S-700）
- 減少動態：今次冇新 animation / transition ✅
- i18n：新字全入 `zh-HK.ts` `availability.*`（grep 非 test `.ts/.tsx` 冇中文字串 literal）✅；顏色全部 token（`tokens.css` `--leave-*` / `--upcoming-*`，附對比度註釋）✅；magic number 有名常數 ✅

## ✅ 做得好嘅地方

- `selectors/availability.ts` / `availabilityLabels.ts` 全 pure、`today` 由外面傳，test 唔使 mock 時鐘
- e2e fixtures 用 localStorage flag 逐個 context 開，其他 e2e section 照睇真 catalog；production 唔包
- `nextRelease` 靠 stable sort 令同日新短篇排先，簡潔

## 修訂代碼（W-531 方案 A 示意）

```ts
// src/pages/home/useHomeDramaItems.ts — 排位用 catalog 已上架嘅集（下架唔郁，W-531）
const releasedEpisodesOf = (id: string, today: string) =>
    catalogEpisodesOf(id).filter((e) => !isArcUpcoming(e.addedAt, today));
// useShelfDramas
() => dramaShelfOrder(enabledDramas(today), (id) => releasedEpisodesOf(id, today), progressMap),
```

## Handoff receipt

```HANDOFF_RECEIPT
agent: code-reviewer
task: review feature/drama/coming-soon P8 #6 (52b2bc7, aeba564, a49c593, 2938d84, b2bb2c5) v1.28.0
status: pass
score: 95
hard_gates:
  lint: pass
  type_check: pass
  tests: pass (93 related unit files, 1109 tests; full suite / e2e not run per scope rule; CI run 42068391074 on b2bb2c5 success incl. e2e)
  coverage: pass (selectors/availability 100% lines, catalog/dramas/lib/availability 100% lines)
  no_critical: pass
  security_scan: n/a (no new dependencies)
findings:
  critical: []
  warning: [W-531]
  suggestion: [S-699, S-700, S-701, S-702]
next_action: proceed_to_qa
context: >
  W-531 (shelf order moves after partial removal; violates user pick
  "書架排位唔郁") recommended to fix before merge, plan A in report.
  Developer-reported deviations left for user decision (not scored);
  production build verified free of e2e fixtures.
report: .proj-docs/reviews/2026-11-05_review_coming-soon.md
```
