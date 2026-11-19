# Code Review — P10 lane 7b HomeView 廣播劇頁

- 日期：2026-11-18
- 審閱者：Code Reviewer（獨立）
- 目標：PR #278 `feature/layout/home-view-square` → `release/v2.0.0`，commit `a98f864`（`git diff c1f0b85..a98f864`，22 files，+1311 / −65）
- Tier：T2（新 UI 分支，只喺 `SQUARE_QUERY` render）
- Design Origin：`mockup: _mockups_/home-view/index.html`「廣播劇頁」（~1841–2240）+ S8（~2529）
- 總評：分層（全集 / 短篇）、短篇表 banner +「全集」掣、焦點返清單掣都做得啱，現有裝置零改變有證據；一條 🟡（播緊 A 揀 B 之後頁面同清單掣講兩個唔同短篇），兩條 🟢

## Hard Gates

All pass（引用 `a98f864` 證據，冇重跑全套）：lint 0（`lint-lane7b.log`）、unit 489 files / 5103 tests 綠（`test-lane7b.log`）、e2e all passed / 0 FAIL（`e2e-lane7b.log`，新 `squareDrama.mjs` 17 條 PASS）、visual 18/180 = 全部係已接受嘅 lane 6c `drama-series` 外框（`visual-lane7b.log`）；冇新依賴。Reviewer 另跑：`tsc --noEmit -p apps/player` exit 0；diff 相關 6 個 test 檔 91/91 綠。

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                    |
| -------- | ------ | ------- | ------------------------------------------------------- |
| 正確性   | 20     | 25      | W-796                                                   |
| 安全性   | 20     | 20      | 冇新輸入 / storage                                      |
| 可維護性 | 20     | 20      | ListSheetHeader 抽檔、GaugePanel 改用 PlayerGauge props |
| 測試覆蓋 | 15     | 15      | series square 8 個 + daily square test + e2e 17 條      |
| 性能     | 10     | 10      |                                                         |
| 代碼風格 | 10     | 10      | 全部 token，media query 同 `SQUARE_QUERY` 一致          |
| **總分** | **95** | **100** |                                                         |

**結果：✅ pass**（W-796 屬 lane backlog，要喺本 session 喺 PR 內清，re-review 確認）

## 🟡 Warning

### W-796 播緊短篇 A、喺全集表揀短篇 B：頁面講 A，清單掣 / 短篇表講 B

- 位置：`apps/player/src/pages/drama/SeriesSquare.tsx` `useSquareSheets` / `listButtonOf` / `arcBanner`（用 `view.arc` = 揀咗嘅 B）vs `SeriesSquarePlayer.tsx`（用 `view.upNext` = 播緊嘅 A）
- **L1**：mockup 廣播劇頁 notes（~1851）「播緊某個短篇：頁面顯示短篇名同集名；badge 係**嗰個短篇**嘅集數；清單 icon 撳開係短篇表」+ S8「播緊短篇顯示短篇、開短篇表」— badge / 短篇表同頁面顯示嘅短篇係同一個
- **L2**：臨時 test（跑完已刪）：544×544 入芝See，全集表撳「播放 青春期 第 1 集」→ 頁面「青春期 · 第 1 集」、清單掣「青春期集數清單，共 4 集」；再經「全集」掣開全集表撳「三十六計」行 → 全集表閂、冇其他 dialog，`audio.src` 仍係青春期，頁面仍係「青春期 · 第 1 集」，但清單掣變「三十六計集數清單，共 36 集」、badge 36
- **L3**：直版 / 橫版有 chips 同清單喺頁面上，揀咗 B 一眼見到；HomeView 冇，揀完表閂咗畫面唯一變化係 badge 4 → 36，用戶會以為冇揀到，或者唔知清單掣而家開邊個短篇
- 方案 A（推薦）：HomeView 揀短篇（全集表撳行）之後直接開 B 嘅短篇表（「跟住你喺邊一層」，用戶即刻見到 B 嘅集數，撳一集就播）；短篇表閂咗而冇播 B 就 `pickArc` 返播緊嗰個短篇，頁面 / badge 再一致。Trade-off：要喺 square 加一個「揀完開短篇表」嘅 hook，閂表 reset 揀選要小心唔好影響由收藏入嚟（focusKey）
- 方案 B：保留現有語意，但唱片下面加一行提示（例如「已揀：三十六計」）或者清單掣 badge / 讀屏名跟返播緊嗰個短篇。Trade-off：改動細，但 mockup 冇呢行，footer 高度要重計；或者 badge 跟 A 而短篇表開 B 又唔一致
- 兩個方案都改 HomeView 互動，mockup 冇畫呢個情境 → 建議 main agent 帶方案 A 問用戶一次

## 🟢 Suggestion

- S-1147 `apps/player/src/pages/drama/SeriesSquarePlayer.tsx` `ArcTitle` — 有成套劇下架字時取代成行狀態字，所以播緊時「現正播放 / 已暫停 / 連線中…」都唔見；現有 `NowPlaying` 係聽緊時保留狀態行、下架字取代第二行（集名）。HomeView 要留集名做身份可以理解，但「連線中…」冇咗就冇文字講緊載入。建議：聽緊（status ≠ unloaded）保留狀態行、下架字放喺集名行之下或取代集名；或者確認係刻意（寫入註解）
- S-1148 `apps/player/src/components/pages/drama/ArcEpisodesSheet/ArcEpisodesSheet.tsx` L32 — `SERIES_LIST` 同 `pages/drama/SeriesListColumn.tsx` L50 一模一樣，註解仲要寫「同 SeriesListColumn 一樣」；抽一個 export 共用，免得之後只改一邊

## Observation

- `DailySquare` 嘅 `ListSheet` + `EpisodeList` 同 `ShowEpisodes` square 分支幾乎一樣（差 `labels="taggedDate"`），兩處而已，暫時唔使抽
- 短篇表 banner「聽緊第 N 集」喺 `status = ready`（載入咗未開始）都會出；字面輕微唔準，唔開 ID

## Developer 判斷

| #   | 判斷                                            | 結論                                                                                                                                                                                            |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | e2e 分檔 `squareDrama.mjs` spread 入 square.mjs | 接受：square.mjs 已近 800 行；入口仍然係同一個 section，`SQUARE` 照舊寫死做獨立對照                                                                                                             |
| 2   | 每日劇集頁跟 lane 6 做                          | 接受：mockup 冇畫；播放器 + 日子條 + 清單 sheet + ⓘ 喺頁頭同節目頁一致，e2e 唱片 256 / 冇出界 PASS                                                                                              |
| 3   | 分層用 `view.empty`                             | 接受：`empty` = 未聽過、未載入、未揀；聽過未載入係「繼續收聽」嗰個短篇，屬短篇層，同 mockup「播緊短篇」一致                                                                                     |
| 4   | 播緊 A 揀 B                                     | **會令人混淆** → W-796                                                                                                                                                                          |
| 5   | 短篇表 banner 用劇集圖                          | 接受：mockup「上面同全集表一樣有橫額」                                                                                                                                                          |
| 6   | 「全集」膠囊                                    | 接受：32px 高、12px 左右、4px gap、16px icon、13px 字同 `.allbtn` 一樣；顏色用 `--color-title` / `--color-bg` token 代替 mockup 寫死嘅 #3b2408 / #ffe680，跟主題，撳得到範圍照 `--touch-target` |
| 7   | 下架字位置                                      | 未揀短篇取代「揀一個短篇開始收聽」接受；播緊時取代狀態行見 S-1147                                                                                                                               |
| 8   | e2e 出界檢查剔走日子條入面嘅格                  | 接受：日子條自己左右捲，格被剪係設計；同一個 test 另外驗日子條成條喺畫面入面（`strip.y + h ≤ vh`）                                                                                              |

## 指定檢查項

- **`allRef` / lane 6c**：`SeriesListColumn.tsx` L109 照舊將 `view.sheet.allRef` 傳畀 `ArcPicker`（直版 / 橫版 / Duo「全集」chip）；square 係 `SeriesDramaPage` 早 return 嘅獨立分支，`allRef` 改綁 `ListButton`，兩邊唔會同時 mount → 一個 ref 一粒掣。e2e Duo / 手機全集表焦點條目 PASS、visual 只有已接受外框
- **Rules of Hooks**：`SeriesDramaPage` / `DailyDramaPage` 嘅 `useMediaQuery(SQUARE_QUERY)` 喺所有 hook 之後、無條件呼叫；`useSquareSheets` 喺 `SeriesSquare` 內，切版面會 remount，冇 hook 次序問題
- **ArcSheet CSS square block**：只喺 520–568 × 520–568 生效（同 `SQUARE_QUERY` 一致），Duo / 手機尺寸唔中；`max-width: none` + `height: var(--list-sheet-height)` 令全集表同短篇表一樣由 38% 開始（e2e 全集表頂 206.7 = 短篇表頂）
- **ListSheet 改動**：冇 `banner` / `action` 時 markup 同原本一樣（✕ 喺表頭最右）；`ListSheet.test` 新增 banner / action 兩個 case；`data-banner="false"` 唔中任何 selector
- **Motion**：冇新動畫；短篇表 / 全集表互換沿用 ListSheet / ArcSheet 現有開閂（減少動態直接切換），e2e 用 `reducedMotion: 'reduce'` 驗
- **焦點**：第一次入自動開全集表、由收藏入嚟自動開短篇表、由「全集」掣轉去嘅全集表，鍵盤閂都返清單掣（`returnFocusTo = allRef`）；滑鼠撳遮罩唔搬焦點、冇 ring（e2e PASS）

## ✅ 做得好嘅地方

- 分層邏輯集中喺 `useSquareSheets`，全集表開閂沿用頁面原本 state，冇複製第一次入 / 揀短篇邏輯
- `ListSheetHeader` 抽檔加 banner / action，重用 `BANNER_OVERLAY`，同全集表 ✕ 位置一致
- e2e 有唱片尺寸、出界、banner 110px、38% 起點、Escape / 遮罩焦點，仲留手機對照

## 修訂代碼（W-796 方案 A 草圖）

```tsx
// SeriesSquare.tsx — HomeView 揀短篇後直接開嗰個短篇嘅短篇表；閂咗冇播就跟返播緊嗰個短篇
const useSquareSheets = (view: SeriesDramaView) => {
    const arcList = useListSheet(view.focusKey);
    // ...
    // W-796：全集表撳行（揀短篇）→ 閂全集表、開短篇表，用戶即刻見到揀咗邊個短篇
    const pickArc = (arc: string) => {
        view.sheet.pick(arc);
        arcList.show(); // 需要 useListSheet 加 show()（open 已係 boolean）
    };
    // W-796：短篇表閂咗而播緊另一個短篇 → 揀返播緊嗰個，頁面 / badge 一致
    const closeArc = () => {
        arcList.close();
        if (view.upNext && view.arc !== view.upNext.arc) view.pickArc(view.upNext.arc);
    };
    // ...
};
```

## Handoff receipt

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
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "feature/layout/home-view-square"
context: "P10 lane 7b @a98f864 (PR #278 -> release/v2.0.0): W-796 (square: playing arc A + pick B in 全集表 -> page shows A, list button/badge/arc sheet show B; reproduced; recommend opening B's arc sheet on pick and reverting to playing arc on close - ask user once) + S-1147 (notice hides status/連線中 while listening) + S-1148 (dup SERIES_LIST) are lane backlog to clear in this PR this session with re-review. Judgements 1-3, 5, 6, 8 accepted. allRef: phone/landscape/Duo still on ArcPicker 全集 chip, square on ListButton, no regression. Report committed locally, not pushed"
```

---

# Re-review — 2026-11-19 — `42e2215`

- 範圍：`git diff f417399..42e2215`（11 files，+401 / −83），只驗 W-796 / S-1147 / S-1148 嘅修正
- 用戶決定（2026-11-18）：W-796 用方案 A（揀 B → 開 B 嘅短篇表；冇播 B 就閂 → 跟返播緊嘅 A）
- Hard Gates：all pass — lint 0 + prettier 過（`lint-lane7b2.log`）、unit 490 files / 5113 綠（`test-lane7b2.log`）、e2e 1097 PASS / 0 FAIL（`e2e-lane7b2.log`）、visual 18/180 全部 `drama-series` 外框、0 個元素位置唔同，同上一輪一樣係已接受嘅 lane 6c（`visual-lane7b2.log`）；log 喺 session scratchpad。Reviewer 另跑：`tsc --noEmit -p apps/player` exit 0；`vitest related`（6 個改咗嘅 source）20 files / 262 綠
- 評分：正確性 25/25（W-796 已修），其他維度不變 → **100/100，✅ pass**

## 逐項

| ID     | 結論    | 證據                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-796  | ✅ 已修 | `useSquareSheets.ts`：`pickArc` = `all.pick` + `arcList.show()`；全集表 / 短篇表 `onClose` 都係 `closeAll`，載入咗（`start === undefined`）而 `upNext.arc ≠ view.arc` 就 `followPlayingArc()`（`setPicked(null)`，唔經 `useArcPick`，唔會重新載入）。e2e：播緊「三十六計」揀「你生日所以我生日」→ 即刻開佢嘅短篇表（3 集、焦點入表），頁面仍然三十六計；Escape → 焦點返清單掣、badge 36、清單掣講三十六計；再揀撳一集播 → 頁面 / badge 變 3。截圖 `l7b2/3-…`、`4-…` 對得上；unit 5 個新 case |
| S-1147 | ✅ 已修 | `ArcTitle`：`status === 'unloaded'` 先由下架字取代狀態行；聽緊保留「現正播放 / 已暫停 / 連線中…」，下架字取代集名行（同 `NowPlaying` 一致）；unit 驗 3 個狀態 + 連線中 + unloaded                                                                                                                                                                                                                                                                                                            |
| S-1148 | ✅ 已修 | `components/pages/drama/seriesEpisodeList.ts` `SERIES_EPISODE_LIST` 由 `SeriesListColumn` 同 `ArcEpisodesSheet` 共用，值不變                                                                                                                                                                                                                                                                                                                                                                 |

## Developer 判斷

| #   | 判斷                                                   | 結論                                                                                                                                                                                                        |
| --- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 未揀短篇（全集層）揀短篇：載入續聽集 + 開佢嘅短篇表    | 接受：載入係原本 `useArcPick`（冇播先載入）；開短篇表跟 mockup「揀咗 = 短篇層、清單掣開短篇表」，同播緊時一致。e2e「全集表揀短篇即刻換去短篇表」PASS                                                        |
| 2   | 暫停 A 揀 B：照舊載入 B，唔使 revert                   | 接受：`useArcPick` 喺 `!isPlaying` 時 `player.load(resume)` → `loaded` 變 B，`followPlaying` 見 `upNext.arc === view.arc` 唔郁；載入未完就閂都只係短暫跟返 A，載入完 `playingArc` = B，結果一樣             |
| 3   | 未聽短篇有資料會自動彈資料 → 短篇表等資料閂咗先出      | 接受（Observation）：`arcOpen` 加 `!view.infoSheet.open`，避免兩張 modal 疊；資料表係 modal，期間撳唔到清單掣，冇卡死路徑。呢條 branch 冇 unit / e2e（catalog 冇有資料嘅未聽短篇），屬冇 L2 嘅推論，唔開 ID |
| 4   | 由「我的收藏」入 B（focusKey）而播緊 A：閂短篇表跟返 A | 接受：同一條 `closeAll` 路徑；方形頁唱片區講 A（`upNext = loaded`），唔跟返就會重現 W-796 嘅頁面 / 清單掣唔一致；冇嘢載入時 `start` 有值，唔 revert，入嚟睇 B 照舊                                          |

## 指定檢查：手機 / Duo 系列頁零改變

- `useViewedArc` 加 `followPlaying`，`useSeriesArcs` 改 `...viewed` 再由 `useArcPick` 嘅 `pickArc` 蓋過（spread 次序啱），`arcPicked` 照舊回傳；`followPlayingArc` 只喺 `useSquareSheets` 用
- `pick` / `close` 嘅 override 只喺 `SeriesSquare` 傳畀 `SeriesArcSheet`；`SeriesListColumn` 照舊傳 `view.sheet`，淨係常數搬檔（值相同）；`useListSheet.show` 新增、其他 caller 冇用
- visual 18/180 同上一輪一樣（只有 lane 6c 外框、0 元素位移）；e2e 手機 / Duo 全集表 / 焦點條目 PASS

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
branch: "feature/layout/home-view-square"
context: "Re-review P10 lane 7b @42e2215 (PR #278 -> release/v2.0.0): W-796 fixed per user option A (pick arc -> its arc sheet; close without playing -> followPlayingArc reverts to loaded arc, no reload; e2e + 5 unit), S-1147 fixed (status kept while listening, notice replaces episode line), S-1148 fixed (shared SERIES_EPISODE_LIST). Judgements 1-4 accepted (3 = untested info-sheet-first branch, observation only). Phone/Duo series page unchanged (square-only overrides; visual 18/180 = accepted lane 6c ring, 0 element moves). No new IDs. Report committed locally, not pushed"
```
