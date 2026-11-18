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
