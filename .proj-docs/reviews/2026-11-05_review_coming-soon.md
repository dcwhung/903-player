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

## Re-review 5f2e550

- 範圍：`git diff d568c06..5f2e550` — `ae81140`（W-531 / S-699）、`4c38f5c`（用戶決定：灰格撳落冇反應、橫版第二行唔再被裁）、`5f2e550`（`.claude/CLAUDE.md` e2e 指令）
- Hard gates：all pass — `npx tsc -b` exit 0；`npm run lint` exit 0；相關 unit `npx vitest run src/components/pages/home/DramaShelf src/pages/drama src/pages/home src/selectors/{dramaShelf,availability,continueListening}.test.ts` 26 files / 318 tests 全綠（冇跑 full suite / e2e）
- CI（同一個 SHA `5f2e550`）：run [#78 / 42072852107](https://github.com/dcwhung/903-player/actions/runs/42072852107) — **success**（`Detect code changes`、`Lint, unit & build`、`E2E (Playwright)` 全部 success）。三個 commit 係同一次 push，`changes` job 由 push 前 SHA 比較，所以見到 code 改動，冇跳過 lint / unit / build / e2e；`4c38f5c` 冇自己嘅 run（唔使，5f2e550 個 run 已經包埋佢）
- 新分數：**100 / 100**，✅ pass（冇 🔴 / 🟡）

| ID    | 狀態    | 覆核                                                                                                                                                                                                                                                                                                                                                      |
| ----- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-531 | ✅ 已修 | `useHomeDramaItems.ts` `shelfEpisodesOf` = `releasedEpisodes(catalogEpisodesOf(id), today)`，同 `liveSeriesContinue` 共用 `releasedEpisodes`（`selectors/availability.ts`），即係報告方案 A。`dramaShelf.test.ts` 新加 3 個 test：收聽中嗰集下架、未聽嗰集下架（唔會變「聽完」）、未上架唔計。上次嘅重現情況（`[A,B]` → `[B,A]`）而家下架前後都係 `[A,B]` |
| S-699 | ✅ 已修 | 新 `useTodaysEpisodes(drama, read)` 按 `[drama, read, today]` memo，每日 / 短篇劇集頁都用；`read` 係 module 層面 function（`dailyNewestFirstOf`）同 registry method（`seriesEpisodesOf`，reference 穩定）                                                                                                                                                 |

用戶決定（`4c38f5c`）：

- 灰格：`UpcomingTile` 唔再接 `focus?.open`（疊卡撳卡 focus / 捲動 handler），撳落完全冇反應；`aria-disabled` 照留，Tab / 讀屏照行到。`DramaShelf.test.tsx` 新 test 撳兩下：focus 冇郁、冇 `scrollTo`、冇 `onOpen` ✅；e2e 加咗直版撳灰格條 ✅
- 橫版第二行：`hasSecondLine` 喺有集名，或者聽緊時有成套劇下架字時都加 `detailedNowPlaying`，預留兩行高，同 `NowPlaying` `SecondLine` 嘅規則一樣（unloaded 時下架字取代第一行，唔使預留）✅
- `CLAUDE.md`：E2E 兩行改成 `npm run build -- --mode e2e`，同 `package.json` 一致 ✅

S-699 test 冇經過 red，覆蓋評估：

- Hook 本身：我將 deps 改返 `[drama, read]`（即係舊行為），`useTodaysEpisodes.test.ts` 會紅（1 failed），test 真係鎖住「過午夜重新攞」✅
- 接駁位：兩個頁面改用 hook 只係兩行 diff，冇 page 層 test；同樣，將 `useShelfDramas` 改返 live 清單，`src/pages/home` 同 `dramaShelf.test.ts` 173 個 test 全綠，即係 W-531 個接駁位冇 test 鎖住（見 S-703）。邏輯本身已經由 selector test 覆蓋，判斷**夠用**，接駁位建議補

🟢：

- S-703 `src/pages/home/useHomeDramaItems.ts:62-63`（同 `useDramaPage.ts:124,347`）：W-531 / S-699 嘅 test 只鎖住 selector / hook，冇 test 鎖住「主頁書架用 catalog 已上架清單」同「頁面用 `useTodaysEpisodes`」；改返舊寫法唔會有 test 紅。建議 `HomePage.test.tsx` 加一個 mock `catalogEpisodesOf` 有已下架集數嘅排位 test
- S-704 `useTodaysEpisodes`：`today` 喺下一次 render 先更新；頁面暫停緊又冇其他 state 變，過咗午夜唔會自己 re-render（commit message 寫「refresh pages at HK midnight」講多咗少少）。同 app 其他「每次 render 重新攞 `hkToday()`」做法一致，唔扣分；真係要準時轉可以加一個午夜 timer 觸發 render

```HANDOFF_RECEIPT
agent: code-reviewer
task: re-review feature/drama/coming-soon d568c06..5f2e550 (W-531, S-699, user decisions, CLAUDE.md) v1.28.0
status: pass
score: 100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass (26 related unit files, 318 tests; full suite / e2e not run per scope rule; CI run 42072852107 on 5f2e550 success incl. e2e)
  coverage: pass (releasedEpisodes / useTodaysEpisodes covered; S-699 hook test verified red by mutation)
  no_critical: pass
  security_scan: n/a (no new dependencies)
findings:
  critical: []
  warning: []
  suggestion: [S-703, S-704]
next_action: proceed_to_qa
context: >
  W-531 and S-699 fixed and verified; user decisions (upcoming tile ignores
  taps, landscape second line) implemented with unit + e2e. Wiring of both
  fixes not guarded by tests (S-703, backlog). No re-review needed.
report: .proj-docs/reviews/2026-11-05_review_coming-soon.md
```

## Re-review 2 a13ec07（QA S1 fail 之後）

- 範圍：`git diff a27d5a0..a13ec07` — `f37aa6d`（W-533 / CUI-0021、S-700、S-705、直版成套劇下架改放「全集」chip，用戶決定）、`e67e021`（`CLAUDE.md` chain 清單加 `bookmark` `coming-soon`，用戶批准）、`4046913`（prettier QA 報告 / plan）、`a13ec07`（`useTightCount`：短篇數放唔落成段收埋）
- Hard gates：all pass — `npx tsc -b` exit 0；`npm run lint` exit 0；相關 unit（`DramaShelf`、`ArcPicker`、`src/pages/drama`、`src/pages/home` 嘅 test 檔）25 files / 300 tests 全綠（冇跑 full suite / e2e）
- CI（同一個 SHA `a13ec07`）：run [#84 / 42080750515](https://github.com/dcwhung/903-player/actions/runs/42080750515) — **success**（`Detect code changes`、`Lint, unit & build`、`E2E (Playwright)` 全部 success）。`4046913` 個 run #83 被 #84 cancel 咗（同 branch 新 push），#84 嘅 `changes` 由 push 前 SHA 比較，包埋 `f37aa6d`–`a13ec07` 全部 code
- 新分數：**100 / 100**，✅ pass（冇 🔴 / 🟡）

| ID               | 狀態    | 覆核                                                                                                                                                                                                                                |
| ---------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-533 / CUI-0021 | ✅ 已修 | 短篇數（`metaCount`）同上架字尾（`metaRelease`，`flex: none`）拆開兩截；`useTightCount` 量到放唔落就成段收埋「N 個短篇 ·」，上架字一定完整。e2e `checkReleaseNote` 喺 1300×800 / 844×390 / 390×844 斷言字尾完整、喺格入面、喺讀屏名 |
| S-700            | ✅ 已修 | `tileLabel` 加 `release.label`（長版日子，例如「新短篇 02/12（三）上架」）；unit 鎖住讀屏名                                                                                                                                         |
| S-705            | ✅ 已修 | 同一個拆截修好；格闊 ≤ 280px（`@container drama-tile`）字尾 / 左上角下架字換短版「⏱ 後日上架」/「⏳ 19/12」                                                                                                                         |

重點核對：

- **`useTightCount` 量度邏輯**：
    - Loop：observe 嘅係 parent（`.open` 掣或者 `.topBar`），兩個都係 `position: absolute` + 左右 inset，闊度由格決定，唔跟角落字變；`fitCount` 嘅結果只睇可用闊度，收埋 / 放返短篇數唔會改 parent 闊度，所以唔會 ResizeObserver loop ✅
    - Layout thrash：每次 callback `removeAttribute` → 讀 `scrollWidth` / `clientWidth` → 可能 `setAttribute`，同一個 task 入面完成，冇中間 paint，冇閃；每格一次 forced layout，書架最多十幾格，可接受 ✅
    - 字型：`document.fonts?.ready.then(fitCount)` 補量 Poppins 載完之後嘅闊度 ✅
    - Cleanup：`observer.disconnect()` ✅；`fonts.ready` 冇 cancel，unmount 之後會量一次已經 detach 嘅 node，冇副作用。`enabled` 轉 false 時 attribute 留低，但 `MetaText` 唔再出 `metaCount`，selector 冇嘢可以收，無害
    - 只係 `[enabled]` 做 deps：字變（見 S-706）唔會重新量
- **i18n**：`tileNewArc` / `tileNewEpisodes` 改做「新短篇 {when}」/「全新集數 {when}」，`withReleaseSuffix` 刪咗，冇殘留引用（`grep` 冇 `{meta}`）；「·」改由 `.metaCount::after { content: '·' }` 出，跟短篇數一齊收埋，視覺上唔會淨低一粒點 ✅（S-707）
- **讀屏名**：`tileLabel` 依次接「新」→ 下架 → 上架，例如「蘭茜夫人劇場，05/12（六）下架，新短篇 02/12（三）上架」；角落字成個 `aria-hidden`，資訊全部喺入頁掣個名度 ✅（S-708）
- **chip 下架字唔重覆**：`chipLeavingOf(arc, today, dramaRemovedAt)` 喺成套劇同日或者更早下架時唔出短篇小標（成套劇已經講咗，而且短篇會一齊走）；成套劇遲過短篇先下架就照出短篇自己個日子。成套劇嘅日子：未開始聽 → 取代 chips 上面標籤；聽緊（直版）→「全集」chip LK1 小標，讀屏「全集，05/12（六）下架」；橫版 `.allLeaving` 收埋，由唱片下面第二行講。unit 覆蓋同日 / 遲過兩個情況 ✅
- `CLAUDE.md`：chain 清單加 `bookmark` `coming-soon`，同 `.proj-docs/qa/plans/coming-soon.md` 一致 ✅

🟢：

- S-706 `src/components/pages/home/DramaShelf/useTightCount.ts:19-31`：effect 只跟 `enabled`，`item.meta` / `item.release.text` 變（例如過午夜「後日上架」→「明日上架」、新短篇上架「9 個短篇」→「10 個短篇」）但格冇變闊窄，就唔會重新量，可能放得落都收埋，或者 `metaRelease` 被 `overflow: hidden` 裁走（冇 …）。改法：deps 加 `item.meta`、`item.release?.text`（hook 加參數 `content`）
- S-707 `DramaShelf.module.css` `.metaCount::after { content: '·' }`：分隔符喺 CSS 寫死，唔經 i18n；換語言要記得改 CSS。可以接受（標點、`aria-hidden`），只記錄
- S-708 `DramaTileParts.tsx:20-25`：上架字接入讀屏名用咗 `availability.tileLeaving`（'{name}，{label}'），key 名講「下架」但而家兩樣都用；可以改名做通用 key（例如 `availability.tileWithNote`），避免之後改下架字句式時連上架都改埋

```HANDOFF_RECEIPT
agent: code-reviewer
task: re-review 2 feature/drama/coming-soon a27d5a0..a13ec07 (W-533 / CUI-0021, S-700, S-705, 全集 chip leaving tag, useTightCount) v1.28.0
status: pass
score: 100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass (25 related unit files, 300 tests; full suite / e2e not run per scope rule; CI run 42080750515 on a13ec07 success incl. e2e)
  coverage: pass (useTightCount hide / restore, release label, chipLeavingOf same-day / later, dramaNoticeOf tag covered)
  no_critical: pass
  security_scan: n/a (no new dependencies)
findings:
  critical: []
  warning: []
  suggestion: [S-706, S-707, S-708]
next_action: proceed_to_qa
context: >
  W-533 / CUI-0021, S-700, S-705 fixed; user decision (whole-drama leaving
  tag on 全集 chip in portrait) implemented. useTightCount has no resize
  loop and cleans up; re-measure on content change is backlog (S-706).
  QA S1 re-run for coming-soon (and drama / card-zoom chains touched).
report: .proj-docs/reviews/2026-11-05_review_coming-soon.md
```

## Re-review 3 e7b981a（P7 → P8 merge）

- 範圍：`8477b12..e7b981a`，只睇 merge 解決同 merge 帶入嘅改動（`git show --cc e7b981a`；P7 `e286912` / `4327328` 本身已 review 100 + QA S1 pass，唔再睇）
- Hard gates：all pass — `npx tsc -b` exit 0；`npm run lint` exit 0；相關 unit（`SavedTab`、`HomeTabs`、`src/pages/home`、`selectors/bookmarks`、`icons`）22 files / 232 tests 全綠（冇跑 full suite / e2e）
- CI（同一個 SHA `e7b981a`）：run [#92 / 42104960458](https://github.com/dcwhung/903-player/actions/runs/42104960458) — **success**（`Detect code changes`、`Lint, unit & build`、`E2E (Playwright)` 全部 success）
- 新分數：**100 / 100**，✅ pass（冇 🔴 / 🟡 / 🟢）

核對方法：將 merge 對 P8 parent（`e7b981a^1`）嘅 diff 同 P7 本身（merge-base `8cfbd15` → `e7b981a^2`）嘅 diff 逐行比較（`src`、`e2e`，icons 另外睇）；唯一多出嚟嘅係下面 P8 嘅接駁行同 test，冇其他改動混入，亦冇 P7 / P8 行被食咗。`git grep` 冇 conflict marker。

| 項目                            | 結果                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RecentPanel.tsx`               | = P7 版本（`recentLabel` span 有 ellipsis、`recentScroll` / columns 喺 `SavedTab.tsx` 冇郁）+ P8 嘅 `openLabel`（讀屏加長版下架日）同 LR1 琥珀第二行。收藏版同淨最近收聽版（`mode: 'recent'`）都係用 `RecentPanel`，兩個都有 LR1 ✅                                                                                                                                                                                                                                               |
| `useSavedView.ts`               | = P7 版本（`useProgressMap`、`useRecentTracks`、`mode`、`recentColumns`）+ P8 三樣：`today = hkToday()` 一次攞、傳入 `RowContext`；最近收聽行 `leaving: trackLeaving(track, today)`（之前 P8 喺 map 入面再叫一次 `hkToday()`，而家同一個 `today`，更一致）；`boxView` 嘅 `removed`（灰 banner）同 `bookmarkAvailability` ✅。第三個 tab 出唔出（`useThirdTab`）同 `mode` 都用同一個 `useRecentTracks`，P8 registry 已經濾走已下架集數，兩邊判斷一致，唔會出空嘅「最近收聽」tab ✅ |
| icons 拆檔                      | `strokeIcon.tsx`（`StrokeIcon` + `IconProps`，同兩邊原本一樣）、`noticeIcons.tsx`（⏱ / ⏳，同 P8 原本一樣）、`icons.tsx` 由 `BackIcon` 起內容同 P7 版本逐字一樣，再 `export { ClockIcon, HourglassIcon } from './noticeIcons'`。export 名單 = 兩個 parent 嘅聯集（16 個），所有 import 唔使改；冇循環 import ✅                                                                                                                                                                   |
| `SavedTabAvailability.test.tsx` | view 補返 P7 嘅 `mode` / `recentColumns`；新 test 鎖住淨最近收聽 tab 都有 LR1 ✅                                                                                                                                                                                                                                                                                                                                                                                                  |
| `SavedTab.module.css`           | P7 `.recentLabel` / `--saved-recent-star` 同 P8 `.leaving` / `[data-removed]` 灰行 / 灰 banner 兩邊都喺度 ✅                                                                                                                                                                                                                                                                                                                                                                      |
| ledger 合併                     | 2399 行（連表頭）全部 7 欄；P8 parent 冇少行、P7 parent 冇少行、冇多出兩邊都冇嘅行、冇重覆行。同一個 chain 有新舊 freeze 行並存，跟註釋由 QA re-freeze ✅                                                                                                                                                                                                                                                                                                                         |

🟢：冇新 finding（S-714 起冇用）。

```HANDOFF_RECEIPT
agent: code-reviewer
task: re-review 3 feature/drama/coming-soon merge e7b981a (P7 recent-only tab + W-535 into P8)
status: pass
score: 100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass (22 related unit files, 232 tests; full suite / e2e not run per scope rule; CI run 42104960458 on e7b981a success incl. e2e)
  coverage: pass (LR1 on recent-only pane added; merged files covered by existing SavedTab / HomeSaved / HomeTabs tests)
  no_critical: pass
  security_scan: n/a (no new dependencies)
findings:
  critical: []
  warning: []
  suggestion: []
next_action: proceed_to_qa
context: >
  Merge resolution verified line by line: merged = P8 + P7 delta with only
  the P8 wiring (today, trackLeaving, removed boxes, LR1) added; icons split
  keeps the union of exports; ledger keeps every row from both parents.
  QA to re-freeze chains touched by the merge.
report: .proj-docs/reviews/2026-11-05_review_coming-soon.md
```

## Re-review 4 62e0a85（主頁格同日下架只講一次、繼續收聽條位唔夠收埋下架字）

- 範圍：`git diff 34e4e54..62e0a85`（用戶新決定：同一張格同日下架只出較高一層，廣播劇 > 短篇 > 集；繼續收聽條位唔夠就成段收埋下架字，集名優先）。今次喺獨立 worktree（detached `origin/feature/drama/coming-soon`）review，commit 只 add 報告檔
- Hard gates：all pass — `npx tsc -b` exit 0；`npm run lint` exit 0；相關 unit（`DramaTileAvailability`、`DramaShelf`、`dramaTileNotices`、`selectors/availability`、`seriesAvailability`、`ArcPickerAvailability`、`HomePage`、`HomePageWide`、`Marquee`）9 files / 151 tests 全綠（冇跑 full suite / e2e）
- CI（同一個 SHA `62e0a85`）：run [#95 / 42107452301](https://github.com/dcwhung/903-player/actions/runs/42107452301) — **success**（`Detect code changes`、`Lint, unit & build`、`E2E (Playwright)` 全部 success）
- 新分數：**100 / 100**，✅ pass（冇 🔴 / 🟡）

### 34e4e54 嘅問題（reviewer 自己做錯）

- 上次（re-review 3）喺 developer 嘅 worktree commit 報告時，`git add <報告>` 之後用咗冇路徑嘅 `git commit`，連 developer 已經 stage 嘅 `git mv useTightCount.ts → useHideWhenTight.ts` 一齊 commit 咗（`34e4e54` stat：報告 +45、`{useTightCount.ts => useHideWhenTight.ts}` 0 行）。`DramaTile.tsx` 仲 import `./useTightCount`，所以 `34e4e54` 單獨 build 唔到
- 證據：CI run [#93 / 42106939629](https://github.com/dcwhung/903-player/actions/runs/42106939629)（`34e4e54`）`Lint, unit & build` → `Run npm test` failure：`Failed to resolve import "./useTightCount" from "src/components/pages/home/DramaShelf/DramaTile.tsx"`，e2e skipped
- 影響：只係 `34e4e54` 一個 commit；`62e0a85` 已經補返 import，branch HEAD 正常。歷史入面留低一個紅 commit（bisect 會撞到），唔好 rebase 改（禁止 force push）
- 之後做法：用自己嘅 worktree；commit 用 `git commit <報告路徑>`（只 commit 指定檔），唔用 `git add -A` / `commit -a` / 冇路徑嘅 `git commit`

### 覆核

| 項目                                 | 結果                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sameRemovalDay` 共用                | `selectors/availability.ts` 新 pure function（`outer === inner`），劇集頁 `chipLeavingOf` 同主頁 `withoutRepeatedLeaving` 都用；unit 覆蓋同日 / 唔同日 / 冇上層 ✅                                                                                                                                                                |
| chip 行為冇變                        | 由 `dramaRemovedAt <= leaving.date` 改成 `===`。schema `checkNotAfter`（`availabilitySchema.ts:47-56`）規定短篇下架日唔可以遲過成套劇，合法資料入面「成套劇早過短篇」唔會出現，所以兩個寫法結果一樣 ✅                                                                                                                            |
| `withoutRepeatedLeaving`             | 左上角日子（`leavingCorner` 新加 `date` = `dramaLeaving` 取最早嗰日，順序成套劇 > 部分短篇 > 部分集數）同續聽嗰集嘅有效下架日（三層最早）同一日 → 條上面收埋（視覺 + 讀屏名都冇）；唔同日兩度都出。續聽嗰集嘅日子一定 ≤ 成套劇日子，所以成套劇快將下架時只會「同日收埋」或者「集數早啲落架兩度都講」，符合「只出較高一層」✅      |
| `useHideWhenTight`                   | 改名同抽出 `Fits`：角落字用 `fitsWithoutOverflow`（同之前 `useTightCount` 一樣），繼續收聽條用 `continueFits`（`[data-marquee-text]` 全長 `scrollWidth` + flex gap + 下架字 `offsetWidth` ≤ 條 `clientWidth`）。`fits` 係 module 層面 function，reference 穩定，加入 deps 冇問題 ✅                                               |
| 量度 / loop                          | 先除 `data-tight` 再量（下架字顯示緊先量得到 `offsetWidth`），同一個 task 入面完成，冇閃。observe 嘅係 parent（繼續收聽掣，`position: absolute; inset: auto 0 0`），闊度跟格唔跟內容；收埋下架字只係令 Marquee 有多啲位，Marquee 自己嘅 `useOverflow` ResizeObserver 睇嘅係佢自己個 box，唔會改條嘅闊度，所以唔會互相觸發 loop ✅ |
| cleanup                              | `observer.disconnect()` ✅；`fonts.ready` 冇 cancel，unmount 後量 detach node，無害（同上次一樣）                                                                                                                                                                                                                                 |
| S-706（字變唔重量）                  | **未處理**：deps 仍然係 `[enabled, fits]`。繼續收聽條方面風險細：載入緊呢套劇就冇條，所以條出現期間 `resume.label` 好少變（轉集會 unmount / remount 重新量）；過午夜「後日下架」→「明日下架」闊度相近。S-706 照留 backlog                                                                                                         |
| 刪咗 `continue-line` container query | 只影響繼續收聽條嘅窄條短版「⏳ 05/12」（`2938d84` 加嘅），而家改成「全句或者成段收埋」，係用戶今次決定。W-533 / S-705 用嘅係 `drama-tile` container query（角落字 `noteFull` / `noteTag`），冇郁；`DramaShelf.module.css` 冇殘留 `leavingTag` / `leavingFull` 引用 ✅                                                             |
| 讀屏名                               | 條收埋下架字（位唔夠）時讀屏名照有長版日子（`continueLabel` 跟 `resume.leaving`，同 CSS 無關）；同日去重時讀屏名都冇，因為左上角日子已經喺 `tileLabel` 入面 ✅                                                                                                                                                                    |

🟢：

- S-714 `src/hooks/useDramaContinue.ts:20-24`：`leavingOf` 仲出 `tag: dayWhen(...)`，但繼續收聽條已經冇短版（`dramaTileTypes.ts` `resume.leaving` type 都冇 `tag`），變咗冇人用嘅欄；可以刪走
- S-715 `src/pages/home/dramaTileNotices.ts:88-93`：`ResumeWithLeaving` 重寫咗一次 `DramaShelfItem['resume']` 嘅形狀；可以直接用 `NonNullable<DramaShelfItem['resume']>`（或者抽一個共用 type），避免兩邊改漏

```HANDOFF_RECEIPT
agent: code-reviewer
task: re-review 4 feature/drama/coming-soon 34e4e54..62e0a85 (same-day leaving once per tile, 繼續收聽 hides leaving when tight, useHideWhenTight) v1.28.0
status: pass
score: 100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass (9 related unit files, 151 tests; full suite / e2e not run per scope rule; CI run 42107452301 on 62e0a85 success incl. e2e)
  coverage: pass (sameRemovalDay, withoutRepeatedLeaving, strip hide / show covered)
  no_critical: pass
  security_scan: n/a (no new dependencies)
findings:
  critical: []
  warning: []
  suggestion: [S-714, S-715]
next_action: proceed_to_qa
context: >
  User decisions implemented; chip behaviour unchanged for schema-valid data.
  S-706 (re-measure on text change) still open in backlog. Reviewer's own
  34e4e54 swept in the developer's staged rename and fails CI run 42106939629
  on its own; fixed at 62e0a85, history left as is (no force push).
report: .proj-docs/reviews/2026-11-05_review_coming-soon.md
```
