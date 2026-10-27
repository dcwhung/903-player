# Batch Review — 2026-10-27 — size-limits（AU-001 – AU-009）

- **日期**：2026-10-27
- **審閱者**：Code Reviewer（獨立角色，冇參與編寫）
- **流程**：Protocol 1 · `/refactor` · Batch（5 lane）
- **目標**：`refactor/size-limits/integration`（HEAD `292d64a`），base `main@d7cc63b`
- **背景**：`.proj-docs/audits/2026-10-27_20-30_audit_size-limits.md`
- **總評**：五條 lane 都係純搬檔 / 抽函數，DOM、className、`data-*`、aria、文案、hook 呼叫次序同 effect 依賴全部保持不變。有一項 🟡 Warning：Lane D 新增咗 type-only 循環 import，audit 明文要求避免，而 main 原本係零循環。另有兩項 🟢 Suggestion。UI Visual Gate 見到嘅 `home-291x494.png` 1 device px 差異，已查明係跑馬燈動畫相位差咗一個 frame，屬渲染時序噪音，唔係行為改變。

## 整體 verdict

- 涵蓋 commit：`50a4528`、`d37103a`、`f652e97`、`4309bd0`、`2b64db9`、`b10c577`、`534ea68`、`fb75ba3`、`5d38c55`、`5d610a5`、`1c29a5a`（11 個 non-merge commit）
- 整體 score：**93/100**（全部發現合計扣分；以下各 lane 分數為主）
- Status：**✅ pass**（hard gates 全過、冇 Critical、每條 lane ≥ 90）

### Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                     |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint . --ignore-pattern '.claude/**'` exit 0。直接跑 `npx eslint .` 會出 639 個 parsing error，原因係 `.claude/worktrees/baseline-main` 入面多咗一個 tsconfig root（屬環境問題，唔關 code 事；移除 worktree 之後就唔使加 ignore） |
| Prettier      | ✅ pass | `npx prettier --check . '!.claude/**'` → All matched files use Prettier code style。唔加 ignore 時，13 個 warn 全部喺 baseline worktree 嘅 `design/previews`                                                                             |
| Type check    | ✅ pass | `npx tsc -b --noEmit` exit 0                                                                                                                                                                                                             |
| Tests（相關） | ✅ pass | `npx vitest run src/pages src/components/{ArcSheet,EpisodeList,MiniPlayer,ShowGrid,PlayerPanel,DateStrip,PageHeader,ShowCardStack} src/hooks` → **557 passed / 0 failed**                                                                |
| Coverage      | ✅ pass | 只計改動檔（v8）：Stmts 98.7% · Branch 92.34% · Funcs 98.41% · Lines 99.83%（≥ 80%）                                                                                                                                                     |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                   |
| Security scan | n/a     | 冇新增依賴（`package.json` / lock 冇改）                                                                                                                                                                                                 |
| 尺寸規則      | ✅ pass | `node node_modules/.audit-tmp/measure.cjs .` → functions measured 1186，over limit 0。改動嘅 `.tsx` 最大係 `PlayerGauge.tsx` 120 行（≤ 150）                                                                                             |

### 評分結果（整體）

| 維度     | 得分   | 滿分    | 備注                                       |
| -------- | ------ | ------- | ------------------------------------------ |
| 正確性   | 25     | 25      | 逐條核對過行為等價，見各 lane              |
| 安全性   | 20     | 20      | 冇新輸入面 / 依賴                          |
| 可維護性 | 13     | 20      | W-467（-5）、S-509（-1）、S-511（-1）      |
| 測試覆蓋 | 15     | 15      | 5 組新 test，質素好；改動檔 coverage 98.7% |
| 性能     | 10     | 10      | 冇新增 re-render / effect 觸發             |
| 代碼風格 | 10     | 10      | Prettier / ESLint 全過                     |
| **總分** | **93** | **100** |                                            |

**結果：✅ pass**

| Lane                   | 分數 | Status  |
| ---------------------- | ---- | ------- |
| A · AU-001 / AU-002    | 100  | ✅ pass |
| B · AU-003             | 100  | ✅ pass |
| C · AU-004             | 100  | ✅ pass |
| D · AU-005（+ AU-009） | 95   | ✅ pass |
| E · AU-006 – AU-009    | 98   | ✅ pass |

---

## UI Visual Gate：`home-291x494.png` 差異原因

**結論：屬可接受嘅渲染時序噪音，唔係行為改變。唔需要改 code。**

1. **差異內容**：喺 (167,860)-(353,889) 範圍內，將 main 張圖成塊橫移**剛好 1 device px**，就同 integration 張圖逐 pixel 完全一樣（整數位移比對嘅殘差係 0）。即係字形、字距、box 尺寸都冇變，淨係跑馬燈 track 嘅 `translateX` 相位唔同。
2. **數值吻合一個 frame**：`MARQUEE_SPEED_PX_PER_S = 30`，一個 frame（16.67 ms）會捲 0.5 CSS px，喺 DPR 2 之下就係 **1 device px**。換句話講，兩個 branch 截圖嗰刻，動畫時間剛好差一個 frame。
3. **點解會受時間影響**：`e2e/harness.mjs` 用 `clock.install`，但時鐘照真實時間行；`run.mjs` 喺 `goto(BASE)`（URL 冇咗 hash，係成頁重新載入，仲要等 splash 淡出）之後，經過 `checkFixedHome`、`checkPagedHome`（撳點 + 600 ms）先截圖，截圖又用 Playwright 預設 `animations: 'allow'`。跑馬燈係 `infinite` CSS animation，相位等於「由 `data-overflow` commit 到截圖」經過嘅實際時間。headless Chromium 嘅 frame 會量化成 16.67 ms 一格，所以同一個 branch 跑兩次會落喺同一個 frame（兩次一致）；但 bundle 內容唔同（多咗 module、CSS module 次序有變），載入 / 執行時間就可能偏移一個 frame。
4. **排除咗結構性原因**：
    - **Remount / 多咗 render**：`MiniPlayerCard` 係冇 hook 嘅 function component，回傳 Fragment，DOM 層級同 main 一樣（`section.player` 直接包住 row → dots → progress → srOnly button）。`<section>` 只得一個 child，type 係穩定嘅 `MiniPlayerCard`，唔會 remount。`useMiniPlayerContent` 嘅 hook 次序（`usePlayer` → `useNavigate` → `useTodaySelection` → `useShownTime`）冇變，`Marquee` / `useOverflow` 都冇改。
    - **CSS**：比較兩個 `dist/assets/index-*.css`，size 一樣（52831 bytes），抽走 hash 之後 rule 集合完全相同，只係 module 次序變咗（例如 `PageDots` 由 `MiniPlayer` 之前搬到之後、`Marquee` 移後）。CSS Modules 嘅 class 都係 scoped，而 `Marquee .box` 同 `MiniPlayer .name` / `.nameLine .name` 冇設定相同屬性，兩者嘅相對次序亦冇變，所以 cascade 結果唔受影響。
    - **其他跑馬燈截圖**：`narrow-mini-marquee.png` 喺 main 同 integration 之間逐 pixel 相同。佢喺播放開始後等固定時間先截圖，同一條 code path 冇差異。
5. **其餘 52 張差異圖**（唱片自轉 / 拖拉）同 main 自己重跑嘅噪音一致，同今次改動無關。

> 建議收窄呢類噪音，見 S-510（e2e harness，唔屬任何 lane，唔 block）。

---

## Section A — AU-001 / AU-002 `refactor/drama-page/AU-001_split-drama-page`

- **Commit**：`5d38c55`（AU-002 hooks）、`1c29a5a`（AU-001 拆頁）
- **改動清單**：`DramaPage.tsx` 只留 router；新增 `DramaHeader.tsx`、`DailyDramaPage.tsx`、`SeriesDramaPage.tsx`（連 `SeriesPlayerColumn`、`arcPickerLabel`、`seriesNowPlaying`）、`SeriesListColumn.tsx`（連 `SeriesArcSheet`、`arcCover`、`SERIES_LIST`）；新 hook `src/hooks/useEpisodePress.ts`；`useDramaPage.ts` 抽出 `useSeriesSheet` / `arcCounter` / `useSeriesArcs`，另加 `export type SeriesDramaView`；`useShowPage.ts` 抽出 `useShowStrip`。

**行為核對**

- DOM：`main.page.locked.fixed` > `playerColumn(+detailedNowPlaying)` / `listColumn > listBody > listContent[inert]` / 直版時 `arcSheet` 係 `<main>` 最後一個 child，三者次序同 main 一致。`dockedSheet={landscape && arcSheet}` 直版時 render `false`，同原本 `{landscape && arcSheet}` 等價。
- Hook 次序：`useSeriesSheet` 內部仍然係 `useState(firstVisit)` → `usePlayer` → `useRefreshedOn`，`sheetOpen` 照舊排喺 `progressMap` 之前；之後係 `usePlaybackRows` → `useSeriesArcs`（`useViewedArc` → `useArcOrder` → `useArcPick`）→ `useStandby` → `useArcSheetActions`，同原本一樣。`useEpisodePress` 只係多咗一次 `usePlayer()`（`useContext`），每次 render 都會呼叫，次序穩定。
- `pressEpisode` 嘅語意：Drama 頁傳 `isPlaying`（`isLoaded && player.isPlaying`），Show 頁傳 `isPlayingCurrent`（`playing !== null && player.isPlaying`），條件由 caller 決定，冇改。
- 偏離 audit 嘅地方都接受：`useSeriesSheet(firstVisit, loadedUrl)` 唔收 `pickArc`，因為 `pickArc` 要等 `useSeriesArcs` 先有，收咗反而會造成依賴循環；`arcCounter` 冇 hook，做純函數係啱嘅命名；`SeriesArcSheet` 自己 call `usePlayer()`，兩個擺位用同一套 props（`current={recording === current ? current : undefined}`）。
- Callback identity：原本 `selectEpisode` / `pressEpisode` 都冇 memo，搬出嚟之後一樣冇 memo，冇新增 effect 依賴。`useShowStrip` 保留 `useMemo` 同原本三個依賴。
- 冇 type 循環：`SeriesListColumn` / `SeriesDramaPage` 只係 type import `useDramaPage`，而 `useDramaPage` 冇 import 返頁面檔。

**發現**：冇。

**測試**：`useEpisodePress.test.ts` 有 4 個 case（揀集、撳播緊嗰集暫停、未播撳現集 = 播、播緊撳另一集 = 轉集），用真 `PlayerProvider` + fake audio，斷言 `src` / `play` / `pause`，質素好。

**評分**：100/100 · ✅ pass

---

## Section B — AU-003 `refactor/arc-sheet/AU-003_split-arc-sheet`

- **Commit**：`d37103a`（arcLabels）、`fb75ba3`（ArcRow / useSheetBehaviour）
- **改動清單**：`arcLabels.ts`（`GROUP_TITLES`、`arcStatus`、`joinStatus`、`visibleStatus`、`rowLabel`、`playLabel`）；`ArcRow.tsx`（`ArcRowProps`、`PlayButtonIcon`、`ArcCover`、`ArcRow`）；`useSheetBehaviour.ts`（`useSheetFocus` + `useSheetBehaviour`）；`ArcSheet.tsx` 由 278 行減到 104 行。

**行為核對**

- 逐行搬，冇改邏輯。`setSheet` 照舊用 `useCallback([sheetRef, bindSheet])`，係穩定嘅 callback ref，冇因為搬檔令每秒 re-render 重掛 ref。
- 依賴方向：`ArcSheetProps extends Omit<ArcRowProps, 'summary'>`，`ArcRow.tsx` 冇 import `ArcSheet.tsx`，冇循環。`RowProps` 改名做 `ArcRowProps`，因為要 export，用 component 名做前綴合理。
- CSS module 冇拆（兩個檔共用 `ArcSheet.module.css`），`.current .ring` 呢類跨元素 selector 照用得。

**發現**：冇。

**測試**：`arcLabels.test.ts` 有 16 個 case，覆蓋 4 種狀態 × 係咪 current、新上架標籤、讀屏名、播放掣名，直接斷言用戶睇到嘅中文字串，常數有命名，質素好。

**評分**：100/100 · ✅ pass

---

## Section C — AU-004 `refactor/episode-list/AU-004_split-episode-list`

- **Commit**：`b10c577`
- **改動清單**：`episodeListTypes.ts`（`EpisodeItem` / `EpisodeLabels` / `EpisodeScrollAlign`）；`EpisodeRow.tsx`（`RowIcon` / `RowDate` / `UnavailableRow` / `EpisodeRow`）；`useScrollToCurrent.ts`（`ORIENTATION_QUERY` / `scrollToTop` / `useScrollMemo` / `useScrollToCurrent`）；`EpisodeList.tsx` 用 `export type { … } from './episodeListTypes'` 保留舊 import 路徑。

**行為核對**

- `useScrollToCurrent` 原封不動，effect 依賴 `[listRef, currentKey, listKey, orientation, isTop, remember]` 冇變；`listRef` 只喺 effect 入面讀，符合 `react-hooks/refs`。
- `pages/episodeItems.ts`、`pages/dramaItems.ts` 照舊由 `EpisodeList/EpisodeList` import 型別，tsc 通過；亦冇 `EpisodeList ↔ EpisodeRow` 循環。

**發現**：冇。

**評分**：100/100 · ✅ pass

---

## Section D — AU-005 `refactor/mini-player/AU-005_split-mini-player`

- **Commit**：`f652e97`（拆 component）、`534ea68`（`showMiniPlayer`，AU-009）
- **改動清單**：`MiniPlayerCard.tsx`、`MiniPlayerDots.tsx`、`DismissButton.tsx`、`dismissView.ts`（+ test）；`MiniPlayer.tsx` 由 165 行減到 87 行；JSDoc 搬返落 `MiniPlayer` 上面；`useMiniPlayer.ts` 抽出純函數 `showMiniPlayer`，hook 嘅 JSDoc 亦搬返落 hook 上面。

**行為核對**

- `MiniPlayer` 嘅 rest props 去咗 `MiniPlayerCard`，再由佢解構 `labels/keys/index/tags/positionLabel/onChange/onDismiss/mode/armed`，傳落 `MiniPlayerRow` 嘅 rest set 同原本完全一樣。`tags = []` 嘅 default 搬咗去 Card，結果等價。
- `data-testid="mini-player-close"`、`aria-hidden`、`tabIndex=-1`、`data-pressing/armed/dragging/revealed/closing/lifted` 全部保留。
- `useMiniPlayerContent` 嘅 hook 次序冇變（見上面 Visual Gate 第 4 點）。

### 🟡 W-467 — MiniPlayer 新增 type-only 循環 import

- **位置**：`src/components/MiniPlayer/MiniPlayerCard.tsx:2`、`src/components/MiniPlayer/MiniPlayerDots.tsx:3`
- **描述**：`MiniPlayer.tsx` import `MiniPlayerCard`，`MiniPlayerCard` / `MiniPlayerDots` 又 `import type { MiniPlayerProps } from './MiniPlayer'`，形成兩條循環：`MiniPlayer → MiniPlayerCard → MiniPlayer`，同埋 `MiniPlayer → MiniPlayerCard → MiniPlayerDots → MiniPlayer`。用同一個 import-graph script 掃 main，結果係**零循環**；integration 就只有呢兩條。
- **影響**：runtime 唔受影響（type import 會被擦走），但 audit AU-003 / AU-004 明文要求避免 type-only 循環（madge 預設會計 type import），而同一個 batch 嘅 Lane B / C 都特登抽咗型別檔嚟避開。日後如果有人將 `import type` 改成 value import（例如要用一個常數），就會變成真循環，ESM 初始化次序可能出 `undefined`。
- **方案 A（推薦）**：新增 `src/components/MiniPlayer/miniPlayerTypes.ts`，將 `MiniPlayerProps` 搬過去；`MiniPlayer.tsx` 加 `export type { MiniPlayerProps } from './miniPlayerTypes'`，令 `useMiniPlayer.ts` / `MiniPlayer.test.tsx` 嘅舊 import 路徑照用；Card / Dots 改為由 `./miniPlayerTypes` import。好處係同 Lane C（`episodeListTypes.ts`）一致，依賴單向；代價係多一個檔。
- **方案 B**：`MiniPlayerDots` 自己定義 `DotsProps`（6 個欄位，型別抄 `PageDots`），`MiniPlayerCard` 就改用 `ComponentProps<typeof MiniPlayerRow>` 加上 Dots 嘅 props 組合，唔再引用 `MiniPlayerProps`。好處係唔使新檔；代價係欄位定義重複，`MiniPlayerProps` 改欄位時要改兩處。
- **推薦**：A。

**測試**：`dismissView.test.ts` 有 4 個 case。`data-lifted` 嘅四個排除條件逐個測咗（audit 指出呢度最易錯），idle 時全部 `undefined` 都有斷言，質素好。

**評分**：95/100（可維護性 -5）· ✅ pass

---

## Section E — AU-006 – AU-009 `refactor/size-trims/AU-006_component-hook-trims`

- **Commit**：`50a4528`（TodayPlayerColumn / TodayHeader）、`4309bd0`（useGridPager）、`2b64db9`（GaugeActions）、`5d610a5`（useDateStrip / useFitText + applyFit / useDiscTurn / useCardDrag）

**行為核對**

- `TodayPlayerColumn`：DOM 次序（header → LoadState → TodayStack / TodayEmpty → 橫版 NowPlaying）冇變；`cards[index]?.title` 同原本 `names[index]` 等價（`names = cards.map((c) => c.title)`）。
- `TodayHeader`：`useGoHome()` 回傳 `useCallback([navigate])`，搬入 TodayHeader 之後 identity 一樣穩定。`header` 喺 `playerColumn` 同 `listColumn` 之間搬位時會 remount，但原本係 plain `div`，一樣會 remount，所以等價。
- `useGridPager`：`index` 只畀 `PageDots` 用，夾值（clamp）`Math.min(index, pageCount - 1)` 搬入 hook 之後，對外結果同原本一樣。
- `GaugeActions`：DOM / aria / icon size 照舊。
- `applyFit`：主體逐行搬出 effect；`active` guard 留喺 effect 入面，unmount 之後唔會再寫 style。
- `DiscTurn` 改用 explicit interface，`faceRef: RefObject<HTMLSpanElement | null>` 同 `useRef<HTMLSpanElement>(null)` 推導出嚟嘅型別一致；`useDiscScrub` / `useGaugeGestures` 照舊用 `type DiscTurn`。
- `clickCapture`：只喺 event 時傳 `motion` / `clicks`，冇喺 render 時讀 ref。

### 🟢 S-509 — `useStripInput` 冇用 hook，但用咗 `use` 前綴

- **位置**：`src/components/DateStrip/useDateStrip.ts:63`
- **描述**：`useStripInput` 入面冇任何 React hook，只係砌兩個 handler。用 `use` 前綴，會令 rules-of-hooks 限制佢唔可以喺條件 / 迴圈入面呼叫，讀者亦會以為佢有 state。
- **方案 A**：改名做 `stripInputHandlers(options, go)`，同 Lane A 將 `arcCounter` 做純函數嘅做法一致。
- **方案 B**：保留現名，喺 JSDoc 寫明「純 handler 工廠，冇 state」。
- **推薦**：A（audit 用咗呢個名，但當時未確定入面有冇 hook，可以接受修正）。

### 🟢 S-511 — `TodayPlayerColumn` 收成個 `useTodayPage()` 回傳值

- **位置**：`src/pages/TodayPlayerColumn.tsx:56`
- **描述**：`state: ReturnType<typeof useTodayPage>` 將成個 hook 嘅形狀（包括 `selectShow`、`cardKeys` 等用唔着嘅欄位）綁咗落 column。同一個 batch 嘅 `SeriesPlayerColumn` / `SeriesListColumn` 都用 `Pick<SeriesDramaView, …>` 收窄。
- **方案 A**：先定義 `type TodayView = ReturnType<typeof useTodayPage>`，再用 `Pick<TodayView, 'status' | 'isSearching' | 'current' | 'index' | 'items' | 'cards' | 'theme' | 'selectIndex'>`。
- **方案 B**：維持現狀。好處係少啲型別噪音；代價係 hook 加欄位都會「影響」column 嘅 props 型別。
- **推薦**：A（可以同 S-509 喺同一個 follow-up 做）。

**測試**：`useGridPager.test.ts` 有 5 個 case（四捨五入、`clientWidth === 0` guard、`goTo`、頁數變少時夾值），完全對應 audit 建議。`applyFit` 5 個 case 用 getter 模擬 `scrollWidth` 跟字體大小變，覆蓋「清走舊 size」、「按比例縮」、「捨入後再逐步縮」、`minPx` 下限、讀唔到 CSS size，質素好。

**評分**：98/100（可維護性 -2）· ✅ pass

---

## 跨 lane / e2e

### 🟢 S-510 — e2e 截圖受無限 CSS 動畫相位影響

- **位置**：`e2e/run.mjs:1476`（同類 `p.screenshot` 調用）
- **描述**：harness 嘅時鐘照真實時間行，截圖又用預設 `animations: 'allow'`，所以跑馬燈 / 唱片自轉嘅相位會跟 bundle 載入時間浮動。今次 66 張截圖入面，真正需要人手排除嘅噪音全部來自呢度。
- **方案 A**：做比對用嘅截圖時傳 `{ animations: 'disabled' }`。Playwright 會將無限動畫回到初始狀態，跑馬燈停喺 0、唱片停喺 0°，兩個 branch 可以逐 pixel 比對。代價係截圖唔再顯示動畫中途嘅樣。
- **方案 B**：比對專用 context 開 `reducedMotion: 'reduce'`（Marquee 會改用 `…` 收尾、唱片唔轉）。代價係同時會改到 layout 分支（`data-overflow` 會收埋副本），比對嘅就唔再係預設 UI。
- **推薦**：A（只影響截圖，唔影響 e2e 斷言）。唔屬任何 lane，唔 block 今次 merge。

---

## TDD 執行驗證

今次係 `/refactor`，安全網係現有測試（main 同 integration 都係 546 個 e2e PASS，相關 unit test 557 個全綠）。新 test 同實現放喺同一個 commit（例如 `5d38c55`、`d37103a`、`f652e97`、`4309bd0`、`5d610a5`），所以冇辦法由 git 歷史獨立核實 Red → Green，只可以依賴 lane 自報。新 test 針對嘅都係抽出嚟、原本冇直接 test 嘅純函數 / hook，斷言具體，可以接受；唔扣分。

## Design-Source Binding

`Design Origin: baseline: main@d7cc63b（DOM / className 不變）` **正確**。核對結果：diff 入面新增嘅 `styles.*` / `page.*` 引用全部係搬過嚟嘅舊 class（新增 − 刪除 = 空集）；冇改任何 `.css` 檔；`data-*` / aria 屬性只係搬位；build 出嚟嘅 CSS rule 集合同 main 完全相同。

## Version

各 lane 冇 bump，按 batch 流程喺 release 時統一 bump `1.18.3 → 1.18.4`（PATCH：純 refactor，冇對外行為改變）。呢個做法合理，唔當 Warning。**release commit 必須記得 bump**。

## ✅ 做得好嘅地方（跨 lane）

- 每條 lane 都嚴守「搬檔唔改邏輯」：effect 依賴、`useCallback` / `useMemo` 依賴、hook 次序逐個保留，連註解都跟住代碼一齊搬。
- Lane B / C 主動避開 type 循環（`ArcRowProps` 組合、`episodeListTypes.ts` + re-export），公開 import 路徑零改動。
- 偏離 audit 嘅地方都有充分理由，而且寫入 commit message（`useSeriesSheet` 簽名、`arcCounter` 改做純函數）。
- 新 test 全部用 `should … when …` 命名、常數有名、斷言用戶睇到嘅字串或者 DOM 狀態，冇 snapshot。
- `MiniPlayer` / `useMiniPlayerContent` 錯放嘅 JSDoc 已經歸位（audit 嘅「順手修」）。

## 修正優先順序

| 優先 | ID    | Lane | 描述                                        | Block？                              |
| ---- | ----- | ---- | ------------------------------------------- | ------------------------------------ |
| 1    | W-467 | D    | 抽 `miniPlayerTypes.ts` 解除 type 循環      | 否（status pass），建議 release 前修 |
| 2    | S-509 | E    | `useStripInput` 改名做 `stripInputHandlers` | 否                                   |
| 3    | S-511 | E    | `TodayPlayerColumn` 用 `Pick` 收窄 `state`  | 否                                   |
| 4    | S-510 | e2e  | 截圖 `animations: 'disabled'`               | 否                                   |

每個 item 一個 commit：`fix: W-467 | 抽 MiniPlayerProps 去 miniPlayerTypes.ts 解除循環` 等。

## 修訂後代碼（W-467 方案 A）

```ts
// src/components/MiniPlayer/miniPlayerTypes.ts（新檔：由 MiniPlayer.tsx 原封搬過嚟）
import type { ShowTheme } from '../../config/showThemes';
import type { MiniPlayerTag } from '../../selectors/miniPlayer';

export interface MiniPlayerProps {
    // …原本 MiniPlayer.tsx 入面嘅欄位同 JSDoc，一字不改…
}
```

```ts
// src/components/MiniPlayer/MiniPlayer.tsx
import type { MiniPlayerProps } from './miniPlayerTypes';
// 型別喺 miniPlayerTypes（Card / Dots 都用，免循環）；re-export 令 useMiniPlayer 舊 import 路徑照用
export type { MiniPlayerProps } from './miniPlayerTypes';
```

```ts
// src/components/MiniPlayer/MiniPlayerCard.tsx、MiniPlayerDots.tsx
import type { MiniPlayerProps } from './miniPlayerTypes';
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 93/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "98.7%"
next_action: merge_develop
next_agent: quality-assurance
branch: "refactor/size-limits/integration"
context: "Batch size-limits A–E 全部 pass（A100/B100/C100/D95/E98）；純 refactor 行為不變；home-291x494 差 1 device px = 跑馬燈相位差一個 frame（30px/s×16.67ms×DPR2），屬渲染噪音；非 block follow-up：W-467（Lane D type 循環）、S-509/S-511（Lane E）、S-510（e2e）；release 時 bump 1.18.4"
```
