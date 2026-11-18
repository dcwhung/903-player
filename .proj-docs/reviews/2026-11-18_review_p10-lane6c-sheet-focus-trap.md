# Code Review — P10 lane 6c：bottom sheet focus trap

- 日期：2026-11-18
- 審閱者：Code Reviewer
- 目標：PR #276 `fix/a11y/sheet-focus-trap` → `release/v2.0.0`，`c6b5f3a`（`git diff cc9c147..c6b5f3a`，6 檔 +261 / -6）
- Tier：T2（共用 hook 行為改動，影響 ArcSheet / ItemInfoSheet / ListSheet）
- 來源：用戶決定 2026-11-18（`2026-11-18_review_p10-lane6-homeview-show.md` Observation → 清理 lane）
- 總評：做法正確、範圍細。Tab 只喺 `open` 期間、`aria-modal="true"` 先困；閂緊 / docked 唔困；Escape、拉閂唔受影響。冇 🔴 / 🟡

## Hard Gates

all pass。引用 developer 喺 `c6b5f3a` 嘅結果（scratchpad `*-lane6c.log`）：lint 0（`eslint . && prettier --check .`）、`npm test` 5046 passed、`npm run e2e` 全過（包括 `390×844 鍵盤全集表` 25 粒 / 27 下 Tab 出表 0 次、`HomeView 清單 sheet` 9 粒 / 11 下 0 次、Tab 循環後 Escape 焦點返清單掣）、`npm run e2e:visual` 180 / 180 一樣。自己跑：`tsc --noEmit -p tsconfig.app.json` 0；`useSheetBehaviour.test.tsx` 10 / 10，coverage `sheetFocusTrap.ts` 行 100 %、branch 88 %（未覆蓋：L17 checkVisibility fallback、L43 另一張 modal、L50 / L52 `?? sheet`）。Security scan n/a（冇新依賴）。Version bump n/a（plan：S3 後先 bump 2.0.0）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                 |
| -------- | ------- | ------- | ---------------------------------------------------- |
| 正確性   | 25      | 25      | 條件同 APG dialog 一致；三張表 Playwright 驗過       |
| 安全性   | 20      | 20      | 冇相關面                                             |
| 可維護性 | 20      | 20      | 純函數抽出 `sheetFocusTrap.ts`，hook 只加一行        |
| 測試覆蓋 | 15      | 15      | 8 個 unit + 2 個 e2e 情境；S-1141 補一個 branch 即可 |
| 性能     | 10      | 10      | 只喺撳 Tab 嗰刻 query 一次                           |
| 代碼風格 | 10      | 10      |                                                      |
| **總分** | **100** | **100** |                                                      |

**結果：✅ pass**

## 指定檢查（L2 = 自己喺 `apps/player/dist` 用 Playwright 跑過）

| 檢查                         | 結果                                                                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 閂咗 / 滑走緊唔困            | listener 喺 `useEffect(open)` 掛，`open=false`（包括 `useSheetPresence` closing 期間）cleanup 已移除；unit「closed」過                                                                                                                            |
| Docked（aria-modal=false）   | 每次 keydown 讀 attribute，轉向即時生效。L2：ItemInfoSheet 1180×820 docked，Tab 由「關閉」行去背後「返回主頁」→ 播放 → 收藏（冇困）；直版 Tab 留喺「關閉」                                                                                        |
| Nested modal                 | `isInOtherModal` 交畀焦點所在嗰張。L2：劇集頁喺全集表揀未聽短篇 → 全集表先閂、「劇集資料」先開，同一時間只有 1 張 `aria-modal`，Tab / `<body>` Tab 都留喺「劇集資料」。分支未有 unit（S-1141）                                                    |
| Escape / 拉閂                | `sheetKeyHandler` 先處理 Escape，`trapTab` 對非 Tab 即 return；`useSheetDrag` 冇改。e2e 拉閂（觸控 + 滑鼠）全過；L2 Escape 閂 ItemInfoSheet / ArcSheet 正常                                                                                       |
| Focusables / checkVisibility | selector 包 disabled（`:disabled`）、`tabindex=-1`、`[inert]` / `[hidden]`。L2：`delete Element.prototype.checkVisibility` 之後 ArcSheet Tab 序列同有 API 時一模一樣（關閉 → 3 組短篇 / 播放 → 循環返關閉）；三張表冇 `display:none` 嘅可聚焦元素 |
| Pointer                      | 只聽 `keydown` Tab，冇 pointer / focusin handler；撳 `<body>` 唔會被拉返，要下一下 Tab 先返入表                                                                                                                                                   |

## 🔴 / 🟡

冇。

## 🟢 / Observation

- **S-1141**　`sheetFocusTrap.ts:43`：「焦點喺另一張 `aria-modal` 表」分支冇 unit（現時 app 唔會兩張同開，L2 見上）。加一個 test：兩張 `TrapSheet`，焦點喺第二張最尾，Tab 只由第二張處理（focus → 第二張最頭）。建議喺本 PR 補（lane backlog 同 session 清）
- **S-1142**　Observation（現有、唔係本 PR 引入；L2 重現）：劇集頁喺全集表揀未聽短篇彈「劇集資料」，Escape 閂之後焦點跌去 `<body>`（opener 係全集表入面嘅短篇掣，已隨全集表 unmount；ItemInfoSheet 冇傳 `returnFocusTo`）。同 W-795 同類。要唔要另開 lane（例如 SeriesDramaPage 傳「全集」掣做 `returnFocusTo`）由 main agent 問用戶
- e2e `focusTrap.mjs` 嘅 `TABBABLE` 同 src selector 唔完全一樣（冇 `area` / `summary` / `contenteditable`）：註解已講明只用嚟揀最頭 / 最尾、出表判斷唔靠佢，可接受，唔開 ID

## ✅ 做得好嘅地方

- 撳鍵嗰刻先計 focusables（lazy render 有 unit 鎖住），唔 cache；`focus({ preventScroll: true })` 同開表一致
- 只喺兩頭同「已走出表」先 `preventDefault`，中間交返瀏覽器，原生 Tab 次序唔變
- e2e 行勻一圈 + 2 步、兩頭循環、`<body>` 返入表三樣都驗，ArcSheet / ListSheet 共用一個 helper

## 修訂代碼

冇 🔴 / 🟡，唔使。

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
  coverage: "100% lines (sheetFocusTrap.ts)"
  no_critical: pass
  security_scan: n/a
next_action: proceed_to_qa
next_agent: quality-assurance
branch: "fix/a11y/sheet-focus-trap"
context: "P10 lane 6c @c6b5f3a (PR #276 -> release/v2.0.0): Tab trapped only while open and aria-modal=true; closing/docked untouched (Playwright: ItemInfoSheet docked Tab leaves sheet, portrait stays); Escape/drag unaffected; checkVisibility-less run identical. S-1141: add unit for other-modal branch (fix in this PR, lane backlog same session). S-1142 Observation (pre-existing): closing 劇集資料 opened from ArcSheet arc pick drops focus to <body>; main agent asks user whether to open a lane. Report committed locally, not pushed"
blockers: []
```

---

# Re-review — 2026-11-18 — @9dde826

- 範圍：只驗 S-1141 / S-1142 嘅修正同 `9dde826` diff（10 檔，+149 / −9），唔重新 review 成個 branch
- Hard gates（引用 developer log，冇重跑）：lint 0（`eslint . && prettier --check .`）；type check pass（e2e build = `tsc -b && vite build`）；unit 5050 passed；e2e All passed（新增 `劇集資料` / `劇集資料橫版`：Escape 閂咗焦點返 `BUTTON 全集`）；visual 180/180 一樣
- Status：✅ pass，100/100

## S-1141 — 已修

- `useSheetBehaviour.test.tsx`：兩張 `aria-modal` `TrapSheet` 同開，焦點喺先掛 listener 嗰張；中間 Tab 交返瀏覽器、最尾 Tab → ✕、Shift+Tab 由最頭 → 最尾，全部留喺第一張。冇 `isInOtherModal` 分支時第二張嘅 listener 會將焦點扯走，test 會紅

## S-1142 — 已修

- Ref 路徑：`useSeriesInfo`（`useRef`，穩定）→ `infoSheet.returnFocusTo` + `allRef` → `useDramaPage` `sheet.allRef` → `SeriesArcPicker` → `ArcPicker` → `AllChip` `<button ref>`；另一頭 `SeriesDramaPage` → `ItemInfoSheet` → `useSheetBehaviour(open, onClose, returnFocusTo)`
- 「全集」掣同一時間只有一粒：`SeriesListColumn` 只喺 `!pickerSide` 出 picker，`SeriesDramaPage` 只喺 `pickerSide` 出直排 picker，兩者互斥；`ArcPicker` 冇 early return，`AllChip` 一定 render，所以 ref 喺直版 / 橫版 docked / Duo 打開・直都有掛（unit 三個 layout 都驗，Duo 加驗 `[data-vertical]`）
- 冇唱片（`upNext` 冇值）時 `pickerSide` false，picker 照舊喺清單上面，ref 一樣有掛
- 行為不變：`restoreFocus` 仍然先用打開前嗰粒掣，靠唔住先 fallback；由 ⓘ 打開「劇集資料」opener 有效，唔受影響。`DailyDramaPage` / `ShowPlayer` 冇傳 `returnFocusTo`，同之前一樣；`returnFocusTo` 係 ref object，effect deps 唔會因每次 render 新 object 重跑
- 已知未做（main agent 問緊用戶，唔 block）：第一次入自動開嘅 ArcSheet 本身 Escape 仍跌去 `<body>`（加 `returnFocusTo` 會令 visual scene `drama-series` 多一個 focus ring）

## Handoff receipt（re-review）

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
  coverage: "S-1141 branch covered by new unit; S-1142 covered by 3 unit (portrait / landscape / Duo open portrait) + 2 e2e"
  no_critical: pass
  security_scan: n/a
next_action: proceed_to_qa
next_agent: quality-assurance
branch: "fix/a11y/sheet-focus-trap"
context: "Re-review @9dde826 (PR #276 -> release/v2.0.0): S-1141 fixed (two-modal unit), S-1142 fixed (ItemInfoSheet returnFocusTo = single 全集 chip ref, attached in every layout; other pages unchanged). Open user decision (non-blocking): auto-opened ArcSheet Escape still drops focus to <body>. Report committed locally, not pushed"
blockers: []
```

---

# Re-review — 2026-11-18 — @7853b3b

- 範圍：只驗 `9dde826..7853b3b` 嘅 code diff（用戶 2026-11-18 決定：自動開嘅表閂咗焦點返入口掣，接受**鍵盤** focus ring）同 QA Observation 2（`focusTrap.mjs` markEnds），唔重新 review 成個 branch
- Hard gates（引用 developer log，冇重跑）：lint 0；type check pass（e2e build）；unit 5058 passed；e2e 1037 / 0；visual exit 1：18 / 180 唔同，全部 `drama-series`
- Status：❌ fail，85/100（C-025）

## Visual diff 核實

- 自己逐 pixel 計 4 張（390×844、844×390、1024×768、1920×1080）：diff pixel 數 = bbox 2px 外框周界（488 / 488、620 / 620、708 / 708），全部喺外框 2px 帶入面，head 色一致（`168,72,0`）；crop 睇到外框圍住「☰ 全集」掣，base 冇框；0 個元素位置唔同。即係 `button:focus-visible`（`global.css` 2px outline、offset 2px），同 developer 講法一致

## Ref plumbing — 正確

- ArcSheet：`useSeriesInfo` `allRef` → `SeriesArcSheet` `returnFocusTo={sheet.allRef}` → `useSheetBehaviour`；「全集」掣同一時間只有一粒（上一輪已驗）
- ItemInfoSheet：`useItemInfoSheet` `useRef` → `sheet.returnFocusTo` + `gaugeInfo.infoRef`；`ShowPlayer` `infoInHeader` 時唔傳 gaugeInfo 畀唱片圈，HomeView 頁頭（`square && listed`）先出 `HeaderInfoButton`，兩粒 ⓘ 互斥；`DailyDramaPage` spread `info.gaugeInfo` 入 `PlayerPanel` → `PlayerGauge` → `GaugeInfoRow` → `InfoButton ref`
- Series 劇集 `gaugeInfo` 冇 `infoRef`（佢自動開嘅係全集表，由 `allRef` 負責），正確；`restoreFocus` 仍然先用有效 opener，撳 ⓘ / 「全集」開嘅路徑唔變
- `focusTrap.mjs` first / last 拆兩個 attribute：1 粒時 `first+last`，`isEnd` 判斷正確（Observation 2 已修）

## 🔴 C-025 — 撳 / 拉閂自動開嘅表都會出 focus ring，而且之後一直跟住

- **L1**：用戶 2026-11-18 決定只接受**鍵盤**閂嘅 focus ring；P10「現有裝置零改變」；commit 自己嘅 test 註解（`SeriesDramaPageInfo.test.tsx`「撳 / 拉閂就冇，:focus-visible」）同實際唔符
- **L2**（Playwright，scratch e2e build，390×844，`#/drama/chisee` 自動開全集表）：

    | 閂法          | 焦點     | `:focus-visible` |
    | ------------- | -------- | ---------------- |
    | Escape        | 「全集」 | true（已接受）   |
    | 滑鼠撳遮罩    | 「全集」 | **true**         |
    | 觸控 tap 遮罩 | 「全集」 | **true**         |
    | 觸控向下拉閂  | 「全集」 | **true**         |
    | 滑鼠撳 ✕      | 「全集」 | false            |

    之後再用滑鼠撳「全集」開、撳遮罩閂：仍然 `true`（ring 黐住；base 呢條路焦點喺 `<body>` / 滑鼠撳嘅掣，冇 ring）

- **L3 成因**：自動開時頁面未有任何互動，`useSheetFocus` 用 script focus 張表，Chromium 當佢 `:focus-visible`；撳遮罩 / 拉 grab bar 撳嘅係唔可 focus 嘅元素，焦點冇變，閂時 `restoreFocus` 由一個 focus-visible 元素用 script 轉去「全集」，啟發式沿用 → ring。✕ 係可 focus 嘅掣，滑鼠 mousedown 已經重設咗，所以冇。ItemInfoSheet（節目資料 / 劇集資料 ⓘ）用同一個 hook，同一機制（呢條冇另外跑，L3）
- **影響**：手機第一次入節目頁 / 連續劇頁，最常見嘅閂法（tap 遮罩、向下拉）會喺「全集」/ ⓘ 出 2px 框，現有裝置畫面改變，超出用戶接受範圍；visual scene 只用 Escape，所以冇捉到
- **方案 A（推薦）**：`useSheetFocus` 開住時記低最後輸入（`keydown` vs `pointerdown`，capture listener，閂時一齊拆）；冇有效 opener 時，**最後輸入係鍵盤先**行 `returnFocusTo`，pointer / 觸控就照舊（唔搬焦點，同 base 一樣冇 ring）。Trade-off：滑鼠 / 觸控閂後焦點喺 `<body>`（同改之前一樣，冇退步）；鍵盤 Escape / Enter ✕ 照樣返入口掣。加 e2e：遮罩 tap / 拉閂後 `:focus-visible` = false，Escape 後 = true
- **方案 B**：照搬焦點，pointer 時用 `focus({ focusVisible: false })`。Trade-off：保留焦點位置；但 probe 入面喺呢個 Chromium 試過 blur 再 `focus({ focusVisible: false })` 仍然 `true`，Safari 支援亦未確定，靠唔住
- **方案 C**：用戶改為接受滑鼠 / 觸控都見 ring。要 main agent 問用戶；揀呢個要改返 test 註解同補 e2e 鎖住現況

## 🟢 / Observation

- S-1143 `e2e/itemInfo.mjs:197`：`checkShowLandscape` 嘅 JSDoc（「節目頁橫版：sheet 喺右欄…」）被新函數夾開，而家擺喺 `checkShowAutoOpenFocus` 上面，`checkShowLandscape` 冇 doc；搬返落去
- S-1144 `useSheetBehaviour.ts:63`：註解「唔傳（ArcSheet / ItemInfoSheet）行為不變」已過時（兩個都傳），改做「唔傳就行為不變」
- Observation（L3，唔喺呢個 diff）：W-795 ListSheet 自動開（HomeView 由「我的收藏」入）用同一個 fallback，理論上有同樣 pointer ring；方案 A 改喺 `useSheetFocus` 會一齊修

## Handoff receipt（re-review @7853b3b）

```handoff-receipt
protocol: 1
status: fail
score: 85/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "auto-open focus return covered by 8 unit + 6 e2e checks (Escape only); pointer/touch close not covered"
  no_critical: fail
  security_scan: n/a
next_action: invoke_developer
next_agent: developer
branch: "fix/a11y/sheet-focus-trap"
context: "Re-review @7853b3b (PR #276 -> release/v2.0.0): ref plumbing correct (allRef / infoRef single attachment per layout, opener path unchanged); visual 18/180 verified = 2px :focus-visible ring around 全集 only (Escape scene, user-accepted). C-025: auto-opened sheet closed by mouse/touch backdrop or drag-down also shows the ring on 全集 (Playwright: :focus-visible true; sticky on later pointer open/close) - exceeds user's keyboard-only acceptance. Recommend A: fallback returnFocusTo only when last input was keyboard. If user prefers C (accept ring for pointer), main agent asks. S-1143/S-1144 comment fixes, same session. Report committed locally, not pushed"
blockers:
  - "C-025: pointer/touch close of auto-opened ArcSheet/ItemInfoSheet shows focus ring"
```

---

# Re-review — 2026-11-18 — @9763748

- 範圍：只驗 C-025 / S-1143 / S-1144 嘅修正同 `7853b3b..9763748` code diff（`useSheetBehaviour.ts` +35、unit +84 / +14、e2e `arcSheet` / `focusTrap` / `itemInfo` / `square`），唔重新 review 成個 branch
- Hard gates：lint 0（`eslint . && prettier --check .`，developer log）；自己跑 `tsc --noEmit -p tsconfig.app.json` 0、改動檔 eslint 0、`npx vitest run useSheetBehaviour.test.tsx SeriesDramaPageInfo.test.tsx` 36 / 36；unit 5066 passed、e2e 1053 / 0（developer log）；visual 18 / 180 全部 `drama-series`，pixel 數（488 / 620 / 708）同 @7853b3b 一模一樣、0 個元素位置唔同 = 同一個已接受嘅 Escape 2px ring
- Red proof：`probe-red-lane6f.log` 用 @7853b3b 跑新 e2e，6 個 ArcSheet pointer check 全 FAIL（焦點 true、`:focus-visible` true），修正後全 PASS
- Status：✅ pass，100/100

## C-025 — 已修（方案 A）

- `trackInputModality()`：開住先掛 `keydown` / `pointerdown` capture listener，cleanup 一齊拆；只喺**冇有效 opener** 時先睇，最後輸入係鍵盤先行 `returnFocusTo`。有 opener 嘅路徑（撳 ⓘ / 「全集」開）完全唔變（unit「usable opener after a pointer close」鎖住）
- 次序：capture 喺 document bubble 嘅 `sheetKeyHandler` 之前行，Escape 嗰下已經記咗 keyboard 先觸發 `onClose`；Enter ✕ 同理。每次開都係新 closure，上一次嘅 modality 唔會帶落嚟（unit 有）
- **L2**（自己 Playwright，scratch `dist-rr6f` e2e build、port 4211，390×844 `#/drama/chisee` 自動開）：

    | 閂法                                   | 焦點     | `:focus-visible` |
    | -------------------------------------- | -------- | ---------------- |
    | Escape                                 | 「全集」 | true（已接受）   |
    | Tab 去 ✕ 再 Enter                      | 「全集」 | true（鍵盤）     |
    | 滑鼠撳遮罩                             | `<body>` | false            |
    | 觸控 tap 遮罩                          | `<body>` | false            |
    | 滑鼠撳 ✕                               | `<body>` | false            |
    | 先 Tab、再滑鼠撳遮罩（最後係 pointer） | `<body>` | false            |
    | 滑鼠撳表入面、再 Escape                | 「全集」 | true（鍵盤）     |

    page error 0。觸控向下拉閂由 e2e `觸控向下拉閂（自動開）` 覆蓋（PASS）

## W-795 行為改變 — 接受

- HomeView 收藏自動開嘅清單 sheet 用滑鼠 / 觸控閂，焦點唔再去清單掣、留喺 `<body>`：即係返 `main` base 嘅行為（冇退步），亦同用戶「只接受鍵盤見 ring」一致；鍵盤閂照返清單掣（e2e `HomeView 清單 sheet 收藏自動開` 仍 PASS、新增滑鼠撳遮罩 check PASS）。pointer 用戶唔靠焦點位置導航，冇實際損失

## S-1143 / S-1144 — 已修

- S-1143：`checkShowLandscape` JSDoc 搬返佢上面
- S-1144：註解改做「唔傳就行為不變」

## Observation（唔開 ID）

- L3：螢幕閱讀器 browse mode（例如 NVDA）啟動 ✕ 可能只送 `click`、冇 `keydown`，自動開閂後焦點會留喺 `<body>`，同 `main` base 一樣，唔係退步
- L2：先用鍵盤閂（「全集」已有 ring）、再用滑鼠撳「全集」開 / 撳遮罩閂，ring 仍然喺度。Chromium 原生行為（空白頁：Tab 聚焦掣再用滑鼠撳，`:focus-visible` 仍 true），要用戶先用過鍵盤先會出現，唔係本 PR 範圍

## Handoff receipt（re-review @9763748）

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
  coverage: "modality branch covered by 7 unit (keyboard / pointer / none / mixed both orders / fresh per open / usable opener) + 1 SeriesDramaPage unit + 8 e2e pointer checks"
  no_critical: pass
  security_scan: n/a
next_action: proceed_to_qa
next_agent: quality-assurance
branch: "fix/a11y/sheet-focus-trap"
context: "Re-review @9763748 (PR #276 -> release/v2.0.0): C-025 fixed with option A (capture keydown/pointerdown while open; returnFocusTo only after keyboard when no usable opener). Own Playwright on scratch build: Escape / Enter on X -> 全集 + ring (accepted); mouse scrim / touch tap / mouse X / Tab-then-scrim -> <body>, no ring. Red proof probe-red-lane6f.log. Visual 18/180 identical to @7853b3b accepted Escape ring. W-795 ListSheet pointer close back to main baseline (<body>), keyboard unchanged - accepted. S-1143 / S-1144 fixed. No new IDs. Report committed locally, not pushed"
blockers: []
```
