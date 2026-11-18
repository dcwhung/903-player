# Code Review — P10 lane 7a HomeView 今日節目頁

- 日期：2026-11-18
- 審閱者：Code Reviewer（獨立）
- 目標：PR #277 `feature/layout/home-view-square` → `release/v2.0.0`，commit `070f7ad`（`git diff 3ceddb8..070f7ad`，15 files，+1061 / −47）
- Tier：T2（新 UI 分支，只喺 `SQUARE_QUERY` render）
- Design Origin：`mockup: _mockups_/home-view/index.html`（PR description 第一行，路徑存在）
- 總評：做法同 lane 6 節目頁一致，現有裝置零改變有證據，冇 🔴 / 🟡；兩條 🟢

## Hard Gates

All pass（引用 070f7ad 嘅證據，冇重跑）：lint 0（eslint + `prettier --check .`）、type（`tsc -b` 喺 build 入面）綠、unit 487 files / 5079 tests 綠、e2e all passed（新 `square.mjs` 5 個 section）、visual 180 張中 18 張唔同 = 全部係 `drama-series`（release 上已接受嘅 lane 6c focus ring，base = `origin/main` merge-base），**`today` 全部現有 viewport 0 diff**；冇新依賴。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                    |
| -------- | ------- | ------- | ------------------------------------------------------- |
| 正確性   | 25      | 25      | selectIndex / selectedKey / ⓘ 跟節目轉都啱              |
| 安全性   | 20      | 20      | 冇新輸入 / storage                                      |
| 可維護性 | 20      | 20      | TodayStandard 原封搬；GaugePanel 重用 PlayerGauge       |
| 測試覆蓋 | 15      | 15      | 7 個頁面 test + 6 個 selector test + e2e；S-1146 補分支 |
| 性能     | 10      | 10      |                                                         |
| 代碼風格 | 10      | 10      | 全部 token，冇 magic number                             |
| **總分** | **100** | **100** |                                                         |

**結果：✅ pass**

## 指定檢查項

- **TodayStandard 真係冇改**：對比 `3ceddb8:TodayPage.tsx` L36–80 同 `070f7ad` TodayStandard，JSX / hook 次序逐行一樣，只係 `date` / `handlePage` 搬上 `TodayPage`；`TodayHeader` 原文搬檔。`TodayShowList` 加 `heading`（預設 true，原 markup 不變）同 `data-sheet-scroll`（純 attribute，同 EpisodeList 做法）；visual today 0 diff 佐證。
- **Selector a11y**：`ul[aria-label=揀今日節目]` > `li` > `button`，`aria-current="true"`，未上架 `disabled` + aria-label「名，未上架」— OK。方向鍵：呢個係一列獨立按鈕，唔係 tablist / radiogroup / listbox 呢類 composite widget，APG 冇要求 roving tabindex；plan、mockup 都冇講，Tab 逐格（最多 5 格）可接受，唔加。
- **selectIndex standby 語意**：standby（播緊非今日嘢）撳格 = 換睇（同卡疊 / 指示點一致），撳播放先播；播緊今日節目就即刻轉。撳已揀中嗰格冇動作。同 mockup「撳就轉去嗰個節目」唔衝突，跟現有指示點語意係合理選擇。
- **scrollTo vs 減少動態**：第一次 render 用 `'auto'`；之後 `scrollBehavior()` 喺 effect 嗰刻先叫 `prefersReducedMotion()`，冇 cache — 符合 CLAUDE.md Motion。用 `scrollTo` 唔用 `scrollIntoView`，唔會帶動固定版面，正確。
- **Inset focus ring**：`.cell:focus-visible { outline-offset: -focus-ring-width }`，揀中外框用 inset box-shadow；捲動 `ul` 剪唔到兩樣 — 正確。
- **隔離**：新 CSS 全部喺現有 square media query 內（`[data-square-today]`、`.squareFooter`）；`--square-player-footer` 抽出後節目頁數值不變（square e2e 綠）。

## Mockup 偏差判斷

| #   | 偏差                                       | 判斷                                                                                                     |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 1   | ⓘ 第一次入唔自動彈                         | 接受：mockup「今日節目」只講撳開 ⓘ，冇講自動彈；頁頭 ⓘ 本身可見。註解理由要改（S-1145）                  |
| 2   | Sheet 冇資料展開箭咀；唔寫 today info seen | 接受：mockup 寫 sheet「有播出時間同收聽狀態」，冇資料展開；HomeView 係獨立裝置，唔寫 seen 唔影響其他裝置 |
| 3   | Selector 底 8px（mockup 28px）             | 接受：同 lane 6 已接受日子條一致，唱片多返位                                                             |
| 4   | 第 5 格冇捲動提示                          | 唔 block：main agent 問緊用戶 edge fade                                                                  |
| 5   | 全部未上架 → TodayEmpty                    | 接受：同現有今日頁空狀態一致；頁頭清單掣照出、冇 ⓘ。缺 test（S-1146）                                    |

## 🟢 Suggestion

- S-1145 `apps/player/src/pages/today/useTodayShowInfo.ts` L8–9 — 註解話「今日節目表本身已經有資料展開」，但 HomeView sheet 冇展開箭咀（偏差 2），理由對 HomeView 唔成立；改寫成「頁頭 ⓘ 常駐可見，唔自動彈」之類。
- S-1146 `apps/player/src/pages/today/TodayPageSquare.test.tsx` — `TodaySquare` 嘅全部未上架 → `TodayEmpty` 分支同 standby 撳格只換睇（唔換 `audio.src`）冇 test；各加一個。

## ✅ 做得好嘅地方

- `TodayPage` 只做 `SQUARE_QUERY` 分支，舊版面原封搬去 `TodayStandard`，隔離清楚；仲有一個 phone 對照 test。
- `ShowSelector` 純 presentational，reveal 邏輯細而可測（jsdom 用 offset mock 驗 `left: 46`）。
- 全部尺寸入 `tokens.css`，註解寫明 mockup 來源。

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
context: "P10 lane 7a @070f7ad (PR #277 -> release/v2.0.0): no C/W; S-1145 (useTodayShowInfo comment) + S-1146 (square TodayEmpty + standby-select tests) are lane backlog to clear this session. Deviations 1-3, 5 accepted; 4 (edge fade) awaits user, not blocking. TodayStandard verbatim move, today visual 0 diff. Report committed locally, not pushed"
```

---

# Re-review — 2026-11-18 — `4a2e84f`（`git diff 0918861..4a2e84f`）

- 審閱者：Code Reviewer（獨立）
- 範圍：用戶 2026-11-18 三個決定（selector edge fade、第一次入自動開全部今日節目資料、頁頭 ⓘ = 而家個節目）+ S-1145 / S-1146；只驗今輪 diff
- Hard Gates：all pass — lint 0（`lint-lane7a2.log`）、type check（`tsc --noEmit -p apps/player` exit 0）、unit 5090/5090（`unit-lane7a2.log`；reviewer 另跑 diff 相關 3 檔 51/51）、e2e 1075 PASS / 0 FAIL（`e2e-lane7a2.log`）、visual 18/180 全部係已接受嘅 drama-series 外框（0 個元素位置唔同），today 0 diff（`visual-lane7a2.log`）。Log 喺 session scratchpad `*-lane7a2.log`，截圖 `l7a2/`
- 評分：100/100（各維度滿分，冇 🔴 / 🟡）
- **結果：✅ pass**

## 指定檢查項

- **手機 seen 記錄行為不變**：`TodayPage.tsx`（`TodayStandard`）同 `useTodayInfo.ts` 唔喺 diff；手機照舊 `useTodayInfoExpanded` 一個 instance。HomeView 只喺 `TodaySquare` 用同一個 hook（square / 標準二揀一 render，唔會兩個 instance 同時讀寫）；`TODAY_INFO_SEEN_STORAGE_KEY` 共用係用戶決定（2）要求。e2e「現有手機今日節目頁照舊」PASS、`TodayPage.test` 一齊跑綠。
- **自動開邏輯**：`useListSheet(hasInfo && info.expanded ? 'today-info' : undefined)` — 錄音 / 資料未載完 `hasInfo=false` 唔開亦唔寫 seen，資料到先開一次；閂咗 focusKey 唔變 → 唔會再彈；reload 讀到 seen → 唔開（unit + e2e 都驗）。預設 e2e catalog 冇簡介，所以其他 square 情境唔受自動開干擾；`checkTodayInfo` 明確 seed seen。
- **ⓘ = 而家個節目**：`useTodayShowInfo` 冇改行為，只改註解（S-1145 已清）；unit 驗閂咗自動 sheet 之後 ⓘ 淨係晴朗資料。
- **焦點返清單掣（判斷）**：同意 developer。自動開嘅係「節目表」sheet，佢自己嘅入口就係清單掣（`returnFocusTo={buttonRef}`，同 W-795 由收藏入嚟自動開一致）；ⓘ 開嘅係另一張 sheet（單一節目資料），焦點去 ⓘ 會令鍵盤用戶以為兩張表同源。滑鼠 / 觸控閂唔搬焦點、冇 focus ring（C-025 e2e PASS）。
- **ResizeObserver cleanup**：effect cleanup 移除 `scroll`、`resize` listener 同 `observer.disconnect()`；deps `[listRef, count]`，格數變會拆舊裝新；`ResizeObserver` 唔存在（jsdom）有 guard；`setFade` 值冇變就回傳 prev，捲動唔會連續 re-render。
- **淡出唔遮全格**：`padding-inline = --show-selector-fade`，闊度 calc 加返 `2 × fade`，≤ 4 格照放得晒、冇淡出；`revealCell` 把 inset 計入，揀中格（連外框 / focus 環）唔會停喺淡出位。e2e `fadeState` 喺頭 / 中 / 尾驗「完全見到嘅 4 格冇壓住淡出位」（inset 24px）；截圖 `fade-start.png` 第 5 格只露邊、淡出。淡出只喺仲有格嗰邊出（`data-fade-*`），捲到盡冇。
- **Motion**：淡出冇動畫；`mask-image` 冇 `-webkit-` 前綴，同現有 `DateColumn` / `DateStrip` / `ArcPicker` 做法一致。
- **S-1146**：已加全部未上架 → `TodayEmpty`（清單掣照出、冇 ⓘ）同 standby 撳格淨係換睇（`audio.src` 唔變）兩個 test — 已清。

## 🟢 / Observation

- Observation：同一次入頁內，閂咗自動 sheet 再撳清單掣，各行仍然展開（`choice` 冇改）；同手機「今次入頁展開、下次收合」語意一致，唔使改。
- Observation：`window` `resize` listener 喺有 `ResizeObserver` 時重複，但無害（setState 去重），亦令 jsdom test 可驗；唔開 ID。

## ✅ 做得好嘅地方

- 自動開完全重用 `useListSheet(focusKey)` + `useTodayInfoExpanded`，冇新 storage key、冇複製 seen 邏輯。
- e2e 覆蓋淡出三個位置 + 第一次入 / 再入 / Escape / 滑鼠閂四條路，仲留手機對照。

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
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "feature/layout/home-view-square"
context: "Re-review P10 lane 7a @4a2e84f (PR #277): user decisions 2026-11-18 (edge fade, first-visit all-info sheet gated by 903player:today-info-seen:v1, header i = current show) correct; phone today path untouched; ResizeObserver/listeners cleaned up; fade padding keeps full cells clear (e2e). Focus-return to list button accepted. S-1145, S-1146 cleared; no new C/W/S. Evidence: lint 0, unit 5090, e2e 1075, visual 18/180 only accepted drama-series ring, today 0 diff. Report committed locally, not pushed"
```
