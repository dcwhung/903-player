# Code Review — 2026-11-18 — P10 lane 5b：Duo 打開・直三個內頁

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`feature/layout/iphone-duo` commit `e8db0d0`，PR → `release/v2.0.0`；17 檔 +483 / −44
- Tier：T2；Design Origin：`mockup: _mockups_/iphone-duo/index.html`（打開・直內頁：`new-op-today`（A）、`new-opr-show` / `new-opr-drama`（B）、`new-op-drama`）
- Review Item ID：**W-792 – W-794**、**S-1135 – S-1137**（冇 C）
- 總評：**⚠️ warn（85 / 100）**。節目頁、短篇劇頁、今日節目喺 612×876 啱 mockup，現有裝置零改變（visual 180 / 180）。三條 🟡：直排日子撳完焦點冇咗兼冇讀出、每日劇集頁冇跟、全集表 / 資料表仲係 480 闊

## Hard Gates

all pass。引用 developer 喺 `e8db0d0` 嘅結果：lint、`npm test` 5007、`npm run e2e` 999 / 0、`npm run e2e:visual` 180 / 180。自己跑：`tsc --noEmit -p tsconfig.app.json` 0；`vitest related`（8 個改動檔）18 檔 222 / 222；改動檔 `eslint` 0 error、`prettier --check` 過。Coverage（行）：ArcPicker / PlayerPanel / SeriesListColumn / SideRow 100 %，branch 見 S-1135。Version bump n/a（plan：S3 後先 bump 2.0.0）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                         |
| -------- | ------ | ------- | ---------------------------- |
| 正確性   | 10     | 25      | W-792、W-793、W-794          |
| 安全性   | 20     | 20      |                              |
| 可維護性 | 20     | 20      | S-1136、S-1137（🟢，唔扣分） |
| 測試覆蓋 | 15     | 15      | S-1135（🟢，唔扣分）         |
| 性能     | 10     | 10      |                              |
| 代碼風格 | 10     | 10      |                              |
| **總分** | **85** | **100** |                              |

**結果：⚠️ warn**

## 🟡 Warning

### W-792 直排日子（DateColumn）撳完焦點跌去 `<body>`，轉集冇讀出

- 位置：`apps/player/src/components/shared/player/DateColumn/DateColumn.tsx`（`index === current` 分支）
- L1：global-rules Accessibility（鍵盤導航）；日子條現有合約（`useDateStrip.ts`：撳日子後焦點交返日子條、轉集經 polite live region 讀「已轉到…」）；WCAG 2.4.3 / 4.1.3
- L2：自己用 Playwright（612×876，`#/show/badgirl`，`apps/player/dist`）：focus「轉去 27/11 星期五」+ Enter → `document.activeElement` = `BODY`；`main` 入面 `[aria-live]` 0 個。嗰粒掣變咗 `<span aria-current>`，所以焦點冇咗。另外成欄冇名（「現正播放」標籤冇連去 `ul`）、20 個 tab stop（日子條得 1 個）
- L3：讀屏（VoiceOver）焦點冇咗會跳返頁頂，用戶唔知已經轉咗集
- 方案 A（推薦）：現正播放嗰格都用 `<button aria-current="date" aria-disabled="true">`（撳無效），焦點留喺原位；欄外加 `useStepAnnouncement(dateLabel)` 嘅 polite live region；`ul` 用 `aria-labelledby` 連標籤。Trade-off：改動細，tab stop 數唔變
- 方案 B：成欄做一個 roving-tabindex group（↑↓ 轉集，同日子條 ←→ 一致）+ live region。Trade-off：鍵盤同日子條一致、只得 1 個 tab stop，但要多寫 key handler 同測試

### W-793 每日劇集頁（DailyDramaPage）冇改，日子條喺摺位以下

- 位置：`apps/player/src/pages/drama/DailyDramaPage.tsx` `DailyPlayer`（`PlayerPanel` 冇傳 `stripSide`）
- L1：plan lane 5「節目頁／廣播劇頁日子條、短篇選擇搬去右邊直排」；mockup 說明「日子條／短篇選擇喺上半屏右邊直排」；lane brief「player + selector in the top half」
- L2：runtime catalog 開返 `c18`（同 `visualScenes.mjs` 做法），612×876：播放掣底 420，日子條 456–500（摺位 438），截圖 `scratchpad/r-daily.png`
- 影響：內建 library 嘅 `c18` 係 `enabled: false`，而家淨係 runtime catalog 開到，所以實際影響細
- 方案 A（推薦）：`DailyPlayer` 加 `stripSide={useMediaQuery(DUO_OPEN_PORTRAIT_QUERY)}`（同 `ShowPlayer` 一樣），`e2e/duo.mjs` 加每日劇集一個情境。Trade-off：一行改動，用返 DateColumn，W-792 修好就一齊受惠
- 方案 B：問用戶每日劇集係咪唔使做（mockup 只畫咗短篇劇），答唔使就喺 plan 寫明。Trade-off：唔使改 code，但同一類頁喺 Duo 有兩種版面

### W-794 全集表 / 資料表喺 Duo 打開・直仍然 480 闊置中，冇貼邊

- 位置：`ArcSheet.module.css` / `ItemInfoSheet.module.css` `.sheet { max-width: var(--page-max-width) }`；`tokens.css` Duo 打開・直區塊淨改咗 `--arc-sheet-max-height`
- L1：mockup `new-op-drama`（全集表左右貼畫面邊）；用戶 2026-11-18 決定「全集表 / 資料表伸出邊框貼畫面邊（同 preview、同直向姿勢一致）」
- L2：`#/drama/chisee` 612×876：dialog「全集」`x 66、width 480、y 438`，頁面 `main` 闊 596（`scratchpad/r-arc.png`）。高度 50 % 啱
- 方案 A（推薦）：兩個 sheet 嘅 CSS 各加 Duo 打開・直區塊 `max-width: none`（左右邊框跟 lane 4 打橫嘅做法）。Trade-off：淨 Duo query，現有裝置唔受影響（visual 可證）
- 方案 B：`tokens.css` Duo 區塊加一個 sheet 闊度 token，兩個 sheet 改用佢。Trade-off：少一個重複 query，但要改現有 `.sheet` 規則嘅 token 名（visual 要再驗）

## 🟢 Suggestion / Observation

- S-1135 Duo 分支冇 unit test：`PlayerPanel` stripSide（branch 55 %）、`SideRow`（50 %）、`ArcPicker` vertical 嘅 `scrollIntoView` 分支、「Duo 打開・直短篇 chips 只出一次」；而家淨靠 e2e 位置斷言
- S-1136 `SeriesDramaPage`：`pickerSide` 時 side 只喺 `current ?` 分支 render，冇 upNext 嗰陣（`noneUp`）成組短篇選擇（連「全集」）會冇咗；而家冇集數就冇短篇，暫時去唔到，加註解或者 fallback 返 list column
- S-1137 直排短篇欄（12 粒，scrollHeight 616 / clientHeight 264）喺 612×876 啱啱第 6 粒喺欄底完，睇唔出下面仲有；mockup 有半粒露出。可以加日子條咁嘅底部淡出
- Observation：直排模式冇咗日子條拖動時唱片跟轉 / 捉住（`spinRef`、`onHold` 冇用）— mockup B 本身冇拖動手勢，OK
- Observation：`scrollIntoView({ block: 'nearest' })`（DateColumn mount、ArcPicker vertical）冇捲到外層：入頁同撳最舊一日後，`window` / `main` / 其他 ancestor scrollTop 全 0，淨係 `.list` 捲（526）
- Observation：`--duo-today-disc-size` 固定 200px 唔跟殼高公式；Duo 打開・直高度範圍 860–900 固定，指示點底 424 < 438，S-1121 嘅 600×890 平板一樣夠位
- Observation：`--arc-sheet-max-height: 50%` 同時影響資料表，符合「全集表／資料表最高只到摺位」；找不到節目 / 廣播劇、catalog 延遲載入、冇集數（StatusMessage）喺 612×876 冇橫向溢出

## ✅ 做得好嘅地方

- 所有新樣式都喺 `[data-strip-side]`、`[data-vertical]`、`.sideRow`（淨 Duo render）或者同 `DUO_OPEN_PORTRAIT_QUERY` 一字不差嘅 query 入面，visual 180 / 180
- `DayText` 重用、`SeriesArcPicker` 抽出嚟避免兩份 ArcPicker props；`useMediaQuery` 喺 early return 之前叫

## 修訂代碼（W-792 方案 A 摘要）

```tsx
// DateColumn：現正播放都係掣，焦點唔會冇；轉集經 live region 讀出
const { announcement, markStep } = useStepAnnouncement(dateLabel); // 要加 dateLabel prop
<button
    type="button"
    aria-current={isCurrent ? 'date' : undefined}
    aria-disabled={isCurrent || undefined}
    onClick={() => { if (isCurrent) return; markStep(true); onPick(url); }}
/>
<span role="status" aria-live="polite" className={strip.visuallyHidden}>{announcement}</span>
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: warn
score: 85/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: invoke_developer
next_agent: developer
branch: "feature/layout/iphone-duo"
context: "P10 lane 5b @e8db0d0: show / series drama / today OK at 612x876, visual 180/180. Fix W-792 (DateColumn focus lost to body + no live announcement), W-793 (DailyDramaPage strip 456-500 below fold 438; or user rules daily out of scope), W-794 (arc / info sheet still 480 wide centred, mockup edge-to-edge); S-1135-S-1137 cleared in this PR per parallel-lane rule; re-review only those diffs; merge target release/v2.0.0; report committed locally, not pushed"
```

## Re-review — 2026-11-18 — commit `8770311`

- 範圍：上一輪 W-792 – W-794、S-1135 – S-1137 嘅修正（13 檔 +236 / −41）。冇新 C / W / S ID
- Hard Gates：all pass。引用 developer 喺 `8770311` 嘅結果：lint、`npm test` 5013、`npm run e2e` 1001 / 0（新增「Duo 打開・直每日劇集頁」「全集表貼兩邊畫面邊」）、`npm run e2e:visual` 180 / 180（現有裝置零改變）
- 自己跑（Playwright，`apps/player/dist` + e2e harness，612×876）：見下表 L2
- **結果：✅ pass（100 / 100）**

| ID     | 處理                                                                                                                                                                                                                                                                                                                                                   | 結果 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| W-792  | 每格都係 `<button>`；現正播放 `aria-current="date"` + `aria-disabled`，撳無效（`markStep(false)` 清通知、唔 `onPick`）；`ul aria-labelledby` 標籤；`useStepAnnouncement` polite live region。L2：`#/show/badgirl` focus「轉去 26/11 星期四」+ Enter → 焦點留喺同一粒掣（已變 `aria-current`），`status` 讀「已轉到 26/11 星期四」；list 名「現正播放」 | ✅   |
| W-793  | `DailyPlayer` 傳 `stripSide={useMediaQuery(DUO_OPEN_PORTRAIT_QUERY)}`；e2e `checkOpenPortraitDaily`（runtime catalog 開 `c18`）斷言日子欄喺右半、摺位以上                                                                                                                                                                                              | ✅   |
| W-794  | `ArcSheet` / `ItemInfoSheet` 各加 Duo 打開・直 `.sheet { max-width: none }`，query 同 `DUO_OPEN_PORTRAIT_QUERY` 一致；dist CSS 兩條規則都有；L2：`#/drama/chisee` 全集表 `x 0、width 612`（之前 66 / 480）；e2e 斷言貼兩邊                                                                                                                             | ✅   |
| S-1135 | 新 unit：DateColumn 焦點 / 通知 / 撳現正播放唔播、PlayerPanel `stripSide`（list 代替 slider）、ArcPicker vertical `scrollIntoView({block:'nearest'})`、SideRow 有冇 side                                                                                                                                                                               | ✅   |
| S-1136 | `pickerSide = query && view.upNext !== undefined`；冇碟時 `SeriesListColumn` 照舊 render 短篇選擇（`!pickerSide`）                                                                                                                                                                                                                                     | ✅   |
| S-1137 | `.list` / `.chips[data-vertical]` 加 `mask-image` 底部 24px 淡出 + `padding-bottom: var(--space-6)`                                                                                                                                                                                                                                                    | ✅   |

### 指定核對

- **淡出唔遮最尾一格**（L2，`--space-6` = 24px，淡出區 = 盒底 24px）：
    - 日子欄 21 格（scrollHeight 856 / clientHeight 308）：捲到底，最尾一格底同欄底距離 **24px**（剛好喺淡出區之上）；入頁時中段格淡出 = 提示下面仲有
    - 放得晒（DOM 淨留 3 格）：最尾一格底距欄底 196px，冇被淡出
    - 短篇欄 12 粒（640 / 264）：捲到底距離 **24px**；flex column 嘅 `padding-bottom` 有計入捲動範圍
- **`aria-disabled` 現正播放對讀屏**：仍係 `BUTTON`、`tabIndex 0`，Tab / 讀屏照行到；讀「轉去 30/11 星期一，目前日期，變暗，按鈕」，表達到「呢日播緊、撳冇用」；撳落焦點唔郁、唔重播、通知清空。同 repo 現有 `aria-disabled`（GaugeActions、BookmarkButton、UpcomingArcRow「Tab / 讀屏照行到」）同一做法 ✅

### Observation（唔扣分、唔入 backlog）

- 現正播放嗰格 aria-label 仍係「轉去 …」，加上「目前日期・變暗」意思清楚，但字面略重複；日子條（DayCell）現正播放用 `<span>` 冇 label，兩邊讀法唔完全一樣。屬措辭偏好，冇 L1
- S-1136 fallback 冇 unit test（淨靠 code path），暫時冇集數嘅劇去唔到

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
  coverage: pass
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/layout/iphone-duo"
context: "Re-review P10 lane 5b @8770311: W-792..W-794, S-1135..S-1137 all resolved. L2 at 612x876: DateColumn focus stays on tapped day + polite '已轉到…'; current day is a focusable aria-disabled button (reachable, not replayed); arc sheet x0 w612; fade leaves last item 24px clear when scrolled to end (dates 21, chips 12) and 196px when list fits. e2e 1001/0, visual 180/180, unit 5013 cited. No backlog. Merge target release/v2.0.0 (no develop); report committed locally, not pushed"
```
