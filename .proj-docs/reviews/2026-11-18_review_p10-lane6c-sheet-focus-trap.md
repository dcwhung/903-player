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
