# Code Review — 2026-11-18 — P10 lane 6：HomeView 節目頁（播放器為主 + 清單 sheet）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`feature/layout/home-view-square` commit `75a97e8`，PR #275 → `release/v2.0.0`；22 檔 +1288 / −123（`git diff c9a45a1..75a97e8`）
- Tier：T2；Design Origin：`mockup: _mockups_/home-view/index.html`（節目頁 S3 設計 1 / S5 清單 icon，v4 頁頭）
- Review Item ID：**W-795**、**S-1138 – S-1140**（冇 C）
- 總評：**⚠️ warn（95 / 100）**。544×544 版面、清單掣 + badge、清單 sheet（開閂、拉走、減少動態）都啱；現有裝置零改變（visual 180 / 180）。一條 🟡：由「我的收藏」入嚟自動開嘅 sheet，閂咗焦點跌去 `<body>`

## Hard Gates

all pass。引用 developer 喺 `75a97e8` 嘅結果：lint 0、`npm test` 5033 passed、`npm run e2e` 1021 / 0、`npm run e2e:visual` 180 / 180 一樣（scratchpad `*-lane6.log`）。自己跑：`tsc --noEmit -p tsconfig.app.json` 0；改動檔 `eslint` 0；相關 unit（ListSheet、ListButton、pages/show、EpisodeList、PlayerPanel、PageHeader、deviceQueries）17 檔 234 / 234。Coverage（行）：ListSheet / ListButton 100 %、pages/show 99 %（`useListSheet.ts` 89 %）。Version bump n/a（plan：S3 後先 bump 2.0.0）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                 |
| -------- | ------ | ------- | ------------------------------------ |
| 正確性   | 20     | 25      | W-795                                |
| 安全性   | 20     | 20      |                                      |
| 可維護性 | 20     | 20      | S-1138、S-1139（🟢，唔扣分）         |
| 測試覆蓋 | 15     | 15      |                                      |
| 性能     | 10     | 10      |                                      |
| 代碼風格 | 10     | 10      | S-1140（PR description，🟢，唔扣分） |
| **總分** | **95** | **100** |                                      |

**結果：⚠️ warn**

## 🟡 Warning

### W-795 由「我的收藏」入頁自動開嘅清單 sheet，閂咗焦點跌去 `<body>`

- 位置：`apps/player/src/pages/show/useListSheet.ts`（focusKey 自動開）+ `components/shared/common/Sheet/useSheetBehaviour.ts` `useSheetFocus`（`opener = document.activeElement`）
- L1：`ListSheet.tsx` 自己嘅合約「開咗焦點入表，閂咗返去清單掣」；`ListSheet.test.tsx`「close … and give focus back to the list button」；WAI-ARIA APG Dialog（閂咗焦點返去合理位置）；global-rules Accessibility（鍵盤導航）
- L2：Playwright（544×544，`apps/player/dist`）：清單入面收藏 14/11 → 返主頁 →「我的收藏」→ 撳「開啟 公子會 14/11」→ sheet 自動開、14/11 highlight（`li[data-focused]` 喺 390–447px，睇得到）、焦點喺 dialog ✅ → Escape → `document.activeElement` = `BODY`。自己撳清單掣開（Enter / tap）再 Escape / 撳遮罩，焦點都返清單掣 ✅，所以淨係自動開嗰條路有事
- L3：自動開嗰陣冇「撳過嘅掣」，`useSheetFocus` 記低嘅 opener 係 `<body>`；讀屏 / 鍵盤用戶閂表之後由頁頂重新行
- 方案 A（推薦）：`ListSheet` 加可選 `returnFocusTo?: RefObject<HTMLElement>`（或者 `useSheetBehaviour` 收 fallback），opener 係 `body` / 唔喺 DOM 時改 focus 清單掣；`ShowHeaderActions` 將 `ListButton` 嘅 ref 傳落去。Trade-off：改 2 個 shared hook 簽名，ArcSheet / ItemInfoSheet 唔傳就行為不變；lane 7 今日節目 / 廣播劇頁直接用得
- 方案 B：`useSheetFocus` 閂嗰陣 opener 係 `body` 就 focus `[aria-haspopup="dialog"][aria-expanded]` 對應嗰粒掣（用 `aria-controls` 連 sheet id）。Trade-off：唔使傳 ref，但靠 DOM 查詢，要加 `aria-controls`
- 測試：`ShowPageSquare.test.tsx` 由收藏入嗰個 case 加 Escape → `expect(listButton).toHaveFocus()`

## 🟢 Suggestion / Observation

- S-1138 `pages/show/useListSheet.ts`：lane 7（今日節目、廣播劇頁）都要「清單掣 toggle + 收藏入嚟自動開」，放 `pages/show` 會令其他頁 import 節目頁嘅 hook；搬去 `src/hooks/useListSheet.ts`（或 `ListSheet/` 隔離）
- S-1139 `tokens.css` `--disc-large-share: 0.72` 同 `Disc.module.css` `.large { width: 72% }` 兩個來源；`.large` 改用 `calc(var(--disc-large-share) * 100%)`（計出嚟一樣，visual 唔變），免得改一邊 HomeView 唱片唔再係 256px
- S-1140 PR #275 description 冇字面 `Design Origin:` 行（code-reviewer checklist 要求第一行）；Summary 第二行已寫 `_mockups_/home-view` 同 plan，路徑存在，同 lane 0–5b 做法一樣，所以唔當 🔴。Merge 前 main agent 喺 PR body 第一行補 `Design Origin: mockup: _mockups_/home-view/index.html`
- Observation（要用戶決定）：`aria-modal` 嘅底部 sheet 冇 Tab 圍住焦點：Tab 過最後一行 → `BODY` → 背後嘅返回掣、清單掣、進度條（Playwright 14 下 Tab）。ArcSheet / ItemInfoSheet 共用同一個 `useSheetBehaviour`，係現有做法（plan 指定照 ArcSheet 砌），唔算今次 PR；要唔要開清理 lane 加 focus trap / 背景 `inert` 由用戶揀

## Design Fidelity（developer 自報偏差）

| #   | 偏差                                                            | 判斷                                                                                                                                                        |
| --- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 遮罩蓋埋頁頭，開住撳清單掣其實撳中遮罩（一樣閂）                | ✅ 接受。mockup `.scrim` 喺 `.hd.v4` 後面、`inset: 0`，本身都蓋住頁頭；Playwright `elementFromPoint` = `list-sheet-backdrop`，撳嗰度 sheet 閂、焦點返清單掣 |
| 2   | 撳 sheet 入面一集，sheet 唔閂                                   | ✅ 接受。mockup 只列「再撳、✕、向下拖」閂；留住睇到「播放中」狀態，同現有頁內清單一致                                                                       |
| 3   | 由收藏入嚟自動開 sheet                                          | ✅ 行為接受（否則 highlight 嗰集收埋咗）；焦點問題見 W-795                                                                                                  |
| 4   | 日子條用現有 7 日置中條，唔係 mockup 4 格靠左；底 8px 唔係 36px | ✅ 接受（重用 DateStrip，唔另起一套；mockup 文字寫「日子條貼近底邊」，8px 更貼）。屬可見偏差，main agent 喺 PR / 回報同用戶講一聲                           |
| 5   | sheet 底色用主題 `--color-bg`，唔係 mockup `#1b1a17`            | ✅ 接受。CSS 規則唔准 hardcode hex；跟節目主題                                                                                                              |

## 指定核對

- **a11y**：sheet `role="dialog"` + `aria-modal` + `aria-labelledby`（「集數」）；清單掣 `aria-haspopup="dialog"` + `aria-expanded`；badge `aria-hidden`、數量喺 label（「集數清單，共 4 集」），唔會讀兩次 ✅。開咗焦點入 dialog、Escape / ✕ / 遮罩閂咗返清單掣 ✅（例外 W-795）
- **ⓘ 只喺有簡介先出**：unit（公子會加 summary）頁頭次序「返回 → 清單 → 節目資料」、唱片圈冇第二粒；e2e（冇簡介）清單掣係頁頭最後一粒 ✅
- **長清單**：`#/show/badgirl` 21 集，sheet 頂 206.7px（= 38%），`ul` 自己捲（scrollHeight 1184 / client 265，wheel 捲到 919）✅
- **減少動態**：`reducedMotion: 'reduce'` 開即出、`getAnimations()` 0、Escape 即走 ✅（跟 CLAUDE.md Motion 規則，經 `useSheetPresence`）
- **現有裝置零改變**：新 CSS 全部喺 `SQUARE_QUERY` block，`deviceQueries.node.test.ts` 鎖住字串；JS 分支靠 `useMediaQuery(SQUARE_QUERY)`；`GaugeInfoRow` 抽 `InfoButton` 後 markup 一樣；`EpisodeList` 預設 `heading` true、淨係多 `data-sheet-scroll` attribute；visual 180 / 180、`ShowPage.test` / `ShowPageInfo.test` 照過 ✅
- **Lane 7 重用**：`ListButton`（label / count / open / onToggle）、`ListSheet`（title / summary / closeLabel / children，捲動 panel 用 `data-sheet-scroll` 認）喺 `components/shared/common/ListSheet/`，冇節目頁依賴 ✅（hook 見 S-1138）

## ✅ 做得好嘅地方

- `ListSheet` 完全重用 `useSheetPresence` / `useSheetBehaviour` / `SheetOverlay`，開閂動畫、拉走、減少動態同全集表一致
- `episodeCount` / `episodeCountText` 由 EpisodeList 抽出，badge、讀屏名、表頭同一個來源
- `ShowPage` 拆 `ShowPlayer` / `ShowEpisodes` / `useShowLayout`，主 component 由 49 行減到 43 行

```handoff-receipt
protocol: 1
status: warn
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "99%"
next_action: invoke_developer
next_agent: frontend-developer
branch: "feature/layout/home-view-square"
context: "P10 lane 6 @75a97e8 (PR #275 -> release/v2.0.0): HomeView show page matches mockup; existing devices unchanged (visual 180/180). Fix W-795 (focus returns to <body> after closing the sheet auto-opened from 我的收藏; Playwright repro) in this PR and clear S-1138 (move useListSheet to src/hooks for lane 7), S-1139 (Disc .large width from --disc-large-share); main agent adds 'Design Origin: mockup: _mockups_/home-view/index.html' to PR body (S-1140), tells user about date-strip deviation #4, and asks whether to open a lane for sheet focus trap (pre-existing, all bottom sheets). Report committed locally, not pushed"
blockers:
  - "W-795: ListSheet auto-opened via focusKey returns focus to BODY on close; must return to ListButton (add unit assertion)"
```

---

## Re-review — 2026-11-18 @7b77d12

- 範圍：只驗 W-795 + S-1138 / S-1139 修正同佢哋嘅 diff（15 檔，+176 / −44），唔搵新 🟢
- 證據（developer 喺 7b77d12 跑，引用唔重跑）：lint 0、unit 5038 passed、e2e 1023 PASS / 0 FAIL、visual 180/180 一樣（`*-lane6b.log`）；reviewer 另跑 diff 相關 unit（ArcSheet、ItemInfo、ListSheet、Sheet、useListSheet、ShowPageSquare）143/143

| ID     | 結果 | 驗證                                                                                                                                                                                                                                                                              |
| ------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-795  | ✅   | `useSheetFocus` 打開前焦點係 `<body>` / 唔喺 DOM 先 fallback 去 `returnFocusTo`（閂嗰刻讀 ref）；`useListSheet.buttonRef` → `ListButton ref`（React 19 ref prop）→ `ListSheet returnFocusTo`。unit（ListSheet、ShowPageSquare）+ e2e「由收藏自動開後 Escape 閂…焦點返清單掣」PASS |
| S-1138 | ✅   | `useListSheet` 搬去 `src/hooks/`，`pages/show/useListSheet.ts` 刪咗，加 unit（toggle / close、每個新 focusKey 開一次）                                                                                                                                                            |
| S-1139 | ✅   | `.large { width: calc(var(--disc-large-share) * 100%) }`；token 喺 `tokens.css` `:root`（唯一定義 0.72），`dist` CSS 一致；visual 180/180 → 現有裝置 large 唱片闊度不變，HomeView 由 e2e square 版面驗                                                                            |
| S-1140 | ✅   | PR body 第一行 `Design Origin: mockup: _mockups_/home-view/index.html`                                                                                                                                                                                                            |

- **ArcSheet / ItemInfoSheet 不變**：兩者仍叫 `useSheetBehaviour(open, onClose)`（`returnFocusTo` optional → `undefined`）；opener 可用時 `restoreFocus` 同舊 `opener?.focus?.({ preventScroll: true })` 一樣，只係 opener 靠唔住時多咗 `fallback?.current` → undefined → 冇動作，同舊行為一致；相關 unit 全綠
- **用戶決定（2026-11-18）**：日期條偏差（#4，保留現有 7 日置中、底 8px）接受；所有 bottom sheet 嘅 focus trap → lane 6 merge 後另開清理 lane（已決定，唔 block 本 PR）

**結果：✅ pass（100/100）**

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
  coverage: "99%"
next_action: proceed_to_qa
next_agent: quality-assurance
branch: "feature/layout/home-view-square"
context: "Re-review P10 lane 6 @7b77d12 (PR #275 -> release/v2.0.0): W-795 fixed (auto-opened ListSheet returns focus to ListButton via optional returnFocusTo; unit + e2e), S-1138 / S-1139 / S-1140 done. ArcSheet / ItemInfoSheet unchanged (no returnFocusTo), Disc .large computed width unchanged (visual 180/180). User decisions: date-strip deviation accepted; bottom-sheet focus trap -> cleanup lane after lane 6 merges. Report committed locally, not pushed"
blockers: []
```
