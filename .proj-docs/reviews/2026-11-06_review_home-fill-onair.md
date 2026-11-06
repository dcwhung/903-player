# Code Review — 2026-11-06 — 主頁填到底 + 播放器空狀態 + ON AIR（v1.28.3）

- 審閱者：Code Reviewer（獨立，worktree `.claude/worktrees/review-homefill`）
- 目標：`fix/ui/home-fill-bottom` @ `58426ce`（base `origin/main` `561066c`，v1.28.2 → v1.28.3）：`683298d` mockup、`501171c` 填到底（A + B3 + C3）、`c5212f5` 空播放卡 + 收藏播緊行、`db27678` banner 高半行 + 最近收聽行先排、`71e44e6` ON AIR pill + 左邊條、`58426ce` 闊橫版卡清單暫停狀態
- SSoT（L1）：用戶決定 A、B3、C3（`_mockups_/home-fill-bottom/index.html`）、D、E（已畀 ON AIR 取代）、F、G、ON AIR（preview `WVJYMHWbvmmYbrkie7Pp3m`）、闊橫版卡清單暫停 bug
- Design Origin：`683298d` / `c5212f5` `baseline: v1.28.2 production screens`；`501171c` `mockup: _mockups_/home-fill-bottom/index.html`（檔案存在）；`71e44e6` / `58426ce` `mockup: ON AIR combo preview`；**`db27678` 冇**（W-696）
- Tier：T1（PATCH，CSS / 小組件 / 一個 fallback 修正 + version bump）
- 總評：每項決定都有對應改動同 node / unit test 鎖住；bug 根因（`liveState` 預設 `'playing'`）喺 `toPlayableItem` 一個位修，所有清單受惠。冇 🔴；一個 🟡（commit 漏 Design Origin，開 PR 時補）

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                                                                     |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | pass    | 改動檔 `eslint` exit 0（0 error；CSS 檔 ignored warning）、`prettier --check` 全過                                                                                                                                                                                                       |
| Type check    | pass    | `npx tsc -b` exit 0                                                                                                                                                                                                                                                                      |
| Unit（相關）  | pass    | `npx vitest related <43 個改動 ts/tsx>`：40 files / 459 tests passed；7 個改動 `*.node.test.ts`（CSS 原文）`npx vitest run`：45 tests passed（冇跑 full suite / e2e）                                                                                                                    |
| CI（同 SHA）  | ✅ pass | [run 42253711967](https://github.com/dcwhung/903-player/actions/runs/42253711967) @ `58426ce`：lint / unit / build / E2E（Playwright）全綠；1600×800 左上角 19/12（S-725）喺 CI 都過                                                                                                     |
| Coverage      | pass    | 每項決定有 test：`homeBottomSpace`（A）、`showGridCss` / `showGridFill`（B3）、`dramaShelfCss`（C3）、`PlayerGauge` / `BookmarkButton` / `DramaPage`（D）、`savedPolish`（F）、`recentTab` / `RecentPanel`（G）、`onAirBadge` / 各清單（ON AIR）、`HomePageWide` + `episodeItems`（bug） |
| No Critical   | pass    | 0 個 🔴                                                                                                                                                                                                                                                                                  |
| Security scan | n/a     | 冇新依賴                                                                                                                                                                                                                                                                                 |

## 評分結果

| 維度     | 得分   | 滿分    | 備注                          |
| -------- | ------ | ------- | ----------------------------- |
| 正確性   | 25     | 25      |                               |
| 安全性   | 20     | 20      |                               |
| 可維護性 | 15     | 20      | W-696 commit 漏 Design Origin |
| 測試覆蓋 | 15     | 15      |                               |
| 性能     | 10     | 10      |                               |
| 代碼風格 | 10     | 10      |                               |
| **總分** | **95** | **100** |                               |

**結果：✅ pass**

## 決定逐條核對

| #      | 結果 | 覆核                                                                                                                                                                                                                                                                                                                          |
| ------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | ✅   | `main.home` / `main.wide` `padding-bottom: var(--mini-player-offset-bottom)`；舊嘅收藏 tab `:has([data-saved-mode])` 特例刪走（已併入通用規則）；有 mini player 規則冇郁                                                                                                                                                      |
| B3     | ✅   | `--show-tile-max-grow: 1.5`；`.grid[data-fill] { align-content: space-between }`。`useRowsPerPage` 量 `rowGap` 係 CSS gap 屬性，唔包 align-content 分出嚟嘅距離，唔會兜圈（註解講明）                                                                                                                                         |
| C3     | ✅   | focus 下面嘅卡 `translateY(card × (1 − rest-scale)) scale(rest-scale)`；三種狀態同一組 transform function，過渡順；`--drama-shelf-card` 有 `0px` fallback；reduced motion 沿用現有 `@media (prefers-reduced-motion: reduce)` 即刻切換                                                                                         |
| D      | ✅   | `empty = status === 'unloaded' && !arcPicked`；play / ★ `aria-disabled`、`onClick` 早退、冇 toast；Tab / 讀屏照行到；淡色用現有 `--unavailable-opacity`。未載入時冇「由頭播放」掣（`onStart` 分支 `restart: undefined`），唔使另外 disable                                                                                    |
| E      | ✅   | `--saved-box-playing-bg` 同主題色字已刪（test 鎖住冇殘留），由 ON AIR 取代                                                                                                                                                                                                                                                    |
| F      | ✅   | `--saved-row-pad-bottom` / `--saved-row-height` / `--saved-banner-tall`；`.card` padding 同 token 共用；solo `min-height` / `max-height` 都用 tall                                                                                                                                                                            |
| G      | ✅   | `ul[data-cols='2']` 兩欄 grid，DOM 次序 = 畫面次序（左右左右、單數左欄多一個由 grid 自然做到）；分隔線改畫行頂，第 2 格唔畫，冇雙線                                                                                                                                                                                           |
| ON AIR | ✅   | `--color-on-air: #c8102e`、白字 5.88:1；equaliser `aria-hidden`；動畫同 glow 只喺 `no-preference`，靜止高度喺 query 外（減少動態唔卡、唔等 `animationend`）；`--onair-pulse` 由 `--view-transition-move` 推；暫停 / 未開始 = 灰靜止條 + 揀中框保留 +「聽到 x / y」；冇外圈；行掣 `aria-label` 講一次「播放中」；連線中冇 pill |
| Bug    | ✅   | `toPlayableItem`：`ctx.liveState ?? playbackStateOf({ isPlaying, position: live.currentTime })`；節目頁 / 劇集頁有傳 `liveState` 唔受影響；`HomePageWide` test 重現用戶報告（暫停後冇「播放中」、`聽到 0:26 / 1:53:59`、灰條）                                                                                                |

其他：i18n 冇新寫死字（pill 用 `common.status.playing`、時間用 `player.progressText`，`MessageKey` 型別過 tsc）；version 1.28.3（`package.json` + lock，`c5212f5`），後面三個 commit 屬同一個未 merge 嘅 PATCH；PWA 版本 / update 流程冇郁（n/a）；新函數都 ≤ 30 行（`liveStatus`、`RowBody`、`RowLamp`、`useStandby` 18 行）。

## 🔴 / 🟡

### W-696 `db27678` commit 冇 `Design Origin:` 行

- 位置：`db27678` fix(ui): taller saved banners and row-major recent list columns（改 `SavedTab.module.css`、`RecentPanel.tsx`、`tokens.css`）
- L1：Reviewer Design Fidelity 規則（UI 改動要有 Design Origin）；本 repo 慣例每個 UI commit 都寫（同 branch 其餘 5 個都有）
- L2：`git log -1 --format=%B db27678` 冇 `Design Origin:`；其餘 commit 有
- L3：改動有用戶決定 F / G 做依據，內容冇問題，只係追溯斷咗
- 方案 A（推薦）：開 PR 時 description 第一行寫 Design Origin，並逐個 commit 列 origin，`db27678` 寫 `baseline: v1.28.2 production screens (user decisions F, G)`。唔使改 history
- 方案 B：rebase reword 補返 commit message。要 force push，branch 已推，唔建議

## 🟢 / Observation

- S-729 `db27678` 嘅 CI run 123 紅（舊 recent-list 欄數 assertion），`71e44e6` 先修；中間 commit 唔綠，bisect 時留意
- S-730 收藏 tab（`savedRowStatus`）同今日節目清單（`todayItems.statusOf`）未知時長（連線中）時都當播緊，會出 pill；同改之前寫「播放中」一樣，唔係 regression，但同 EpisodeRow「連線中冇 pill」唔一致（L2 欠，淨係睇 code），睇真機再決定要唔要跟
- S-731 左邊條幾何（3px 闊、上下 18%、收藏行字右移 10px）寫喺組件 CSS，冇入 token；暫時得一個來源，日後再用多一處就抽
- S-732 `SavedRow` 由 33 行變 36 行（JSX 為主），之後再加嘢要拆
- S-733 TDD：bug fix 嘅 test 同修正喺同一個 commit，睇唔到先紅後綠；commit body 有講重現步驟

## ✅ 做得好嘅地方

- bug 喺共用 `toPlayableItem` 修根因，唔係喺闊橫版卡補一個 `liveState`，其他未傳嘅 caller 都一齊安全
- CSS 決定全部有 node test 讀原文鎖住（包括 reduced-motion query 入面只有邊幾個 selector）
- 減少動態處理跟 CLAUDE.md：靜止樣喺 query 外，即時生效，冇 JS cache

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "fix/ui/home-fill-bottom"
context: "A / B3 / C3 / D / F / G / ON AIR / 闊橫版卡暫停 bug 全部落實，C=0 W=1 S=5（W-696、S-729 至 S-733）；CI run 42253711967 @ 58426ce ✅ success（lint、unit、build、E2E 全綠）；W-696 開 PR 時 description 補 Design Origin（含 db27678 嘅 F / G），唔使改 code"
```
