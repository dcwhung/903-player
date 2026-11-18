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
