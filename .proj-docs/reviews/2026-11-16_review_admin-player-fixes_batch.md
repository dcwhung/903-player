# Batch Review — 2026-11-16 — admin / player fixes（T1–T8）

- 審閱者：Code Reviewer（獨立 subagent）
- 目標：branch `claude/admin-player-fixes-6fzdtw` HEAD `a785dca`，`git diff 7ff599b...HEAD`（59 檔，+1687 / −198）
- Tier：T2（8 個用戶要求嘅 /fix，分 3 條 lane + 1 個 cleanup merge；batch cap 按 lane 計 = 4 ≤ 5）
- 總評：8 項都做足要求，每個新 module 有直接 test，admin 新文字全部書面語，動畫跟 motion 規則。冇 🔴；2 個 🟡：W-777（T6 拉走之後即刻再開，表會隱形卡住，L2 重現到）、W-778（冇 bump version）

## 整體 verdict

- 涵蓋 commit：`eed1252` `d2f5172` `899a422` `3c5a336` `4cec241` `c6cfa8e` `35ece1c` `59fdbf5` `a943f4e` `48a39d8` `c2606f1` `83b47a6` `ddc41e4` `1cc2b7c` `aaa9380`（+ 4 個 merge commit）
- Hard gates：all pass
    - Lint：`npm run lint`（eslint + `prettier --check .`）exit 0
    - Type：`npx tsc -b apps/admin apps/player` exit 0
    - Tests：`npx vitest related <28 個改動檔> --run` → 112 files / 809 tests 全綠（reviewer-test-scope hook 唔准跑 `npm test` full suite；full suite + e2e 交 CI / QA）
    - Coverage：pass（定性）：`pendingModel` `usePublishPlan` `Stepper` `DeleteEntry` `deployModel` `useSheetPresence` 四個 CSS 規則都有新 test 直接打中；`--coverage` 喺 root projects 設定下量唔到數（全部報 0%，工具問題），冇數字
    - No Critical：pass；Security：冇新依賴
- Status：⚠️ warn（90 分；project 規定 lane 嘅 🟡 同一個 session 喺 PR 內清）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                  |
| -------- | ------ | ------- | --------------------- |
| 正確性   | 20     | 25      | W-777（-5）           |
| 安全性   | 20     | 20      | DeployCell `noopener` |
| 可維護性 | 15     | 20      | W-778（-5）           |
| 測試覆蓋 | 15     | 15      |                       |
| 性能     | 10     | 10      |                       |
| 代碼風格 | 10     | 10      |                       |
| **總分** | **90** | **100** |                       |

## Section A — Lane admin pending（T1 + T4，`899a422` `59fdbf5` `a943f4e` `83b47a6`）— ✅ pass

- `pendingPublishCount` = todo rows + `changes.others.items` + `changedAppearance`；`others` 喺 API 已經唔計新內容 / App 外觀（`types.ts` 註），唔會重複計
- 套用配色 / 圖片即存 / R2 自動裁切成功先 `changes.reload()`（R2 用 ref，唔會令 `run` 變而重新觸發 effect）
- `OthersSection` + `ChangeCard` 抽走 Timeline 嘅重複分支；淨係顯示、冇「還原」，符合「一定一併發佈」
- `EmptyNote` 三態（載入中 / 有其他改動唔出 / 沒有待發佈的項目。）有 test；新文字 `其他改動` `以下改動將一併發佈` `{count} 項待發佈` 全部書面語（`writtenChinese.test.ts` 綠）

## Section B — Lane admin delete / stepper / deploy（T2 + T3 + T5，`eed1252` `d2f5172` `3c5a336` `48a39d8` `c2606f1`）— ✅ pass

- T2：DELETE 成功即刻 `entries.mutate` 拎走 + `navigate(..., { replace: true })`，`refresh()` 背景做；失敗留喺頁出錯誤。`useResource.mutate` 有 test
- T3：`usePublishPlan` 同一個 selection / path 畀 UpdatePage 同 Stepper；`path` 條件同「下一步」`canGo` 一致（changes 未載入 / 失敗 / 冇嘢揀 → 唔係 link）
- T5：`linksRun` 喺 model 決定（部署中 / 失敗 / 不明 = link，已部署 = pill，無需部署 = null）；`rel="noopener noreferrer"`；aria-label `{status}，於 GitHub 查看 #{id} 的部署` 書面語；舊 key `deployNone` / `github` / `githubLabel` 冇殘留引用

## Section C — Lane player sheet / info / safe area（T6 + T7 + T8，`4cec241` `c6cfa8e` `35ece1c` `ddc41e4` `1cc2b7c` `aaa9380`）— ⚠️ warn

### 🟡 W-777 — T6：拉走張表之後 260ms 內再開，表會隱形卡住

- L1：T6 要求「開 / 閂都由底滑上 / 滑落」；`.claude/CLAUDE.md` Motion：「唔可以令元素卡住」
- L2：臨時 test（已刪）：`ItemInfoSheet` 拉 grab bar 360px → `settle` 寫 inline `transform: translateY(100%)` + `data-closing="true"` → 250ms 後 `onClose` → `data-sheet-state="closing"`（收埋動畫未完）→ 再 `open` → **同一粒 DOM**、state `open`，但 `style.transform` 仍然係 `translateY(100%)`、`data-closing` 仍然係 `"true"`
- L3：瀏覽器入面 `sheet-in` 由 100% 滑到 inline 嘅 100%，表一直喺畫面外；`data-closing` = `pointer-events: none`、遮罩 inline `opacity: 0`；`aria-modal` dialog 開住但睇唔到、撳唔到，淨係 Escape 閂到。T6 之前閂即 unmount，冇呢個問題（regression）。ArcSheet 同一個寫法
- 位置：`Sheet/useSheetPresence.ts`（closing → open 重用 node）、`Sheet/useSheetDragControls.ts` `settle` / `reset`
- 方案 A（推薦）：`open` 變 true 嗰陣清走拉表殘留（`reset` 加 `removeAttribute('data-closing')`、清 `style.transform` / backdrop `style.opacity`），`useSheetDrag` 本身已經 `[open]` 時叫 `controls.reset`；加 test：拉走 → closing 中再開 → 冇 inline transform / `data-closing`
- 方案 B：closing 中再開就換 `key` 令 overlay remount（簡單，但會失去「由而家個位滑返上嚟」，而且焦點 / drag ref 要重掛）

### 其他

- T6：`useSheetPresence` 喺閂嗰刻先問 `prefersReducedMotion()`、CSS 喺 `no-preference` 入面、用 `--view-transition-fade` / `--ease-view-transition`、600ms 後備 timer —— 跟足 motion 規則
- T7：`--gauge-info-room` 喺唱片闊兩邊預留，今日節目頁同節目頁一樣 cap；`gaugeInfoPosition.node.test.ts` 鎖住
- T8：`--safe-area-bottom-visible` 定義喺 `:root`，`useViewportGap` 寫喺 html，`var()` 解析正確；四個清單 / sheet 底 + `--player-reserved-height` 一齊換

## 跨 fix

### 🟡 W-778 — 改咗 `apps/admin/src` 同 `apps/player/src` 但冇 bump version

- L1：Code Reviewer checklist §Version bump（`sw-git-flow` §Version Bump；唔係「修同一 session 上一個指令嘅 bug」例外）；PWA 版本號由 `package.json` 注入
- L2：`git diff 7ff599b...HEAD --stat` 冇 `apps/admin/package.json` / `apps/player/package.json`
- 方案 A（推薦）：一個 commit bump admin（minor，T3 stepper 係新互動）同 player（patch）；方案 B：release lane 統一 bump，PR description 寫明

## 🟢 / Observation

- S-1092 `tokens.css` `--mini-player-offset-bottom` 重複咗 `--safe-area-bottom-visible` 條式，可以直接用新 token
- S-1093 `SelectionFooter` `canGo` 自己再計一次，同 `usePublishPlan.path` 兩個來源；可以傳 `path` 落去，真係「同一套條件」
- S-1094 `useHeldWhileClosing`：父層每次 render 傳新 array 會喺 render 期間多 set 一次 state（播放中每秒 re-render），未量度，Observation
- Observation：未開 PR；開 PR 時 description 第一行要 `Design Origin:`（改咗 tsx / css）

## ✅ 做得好嘅地方

- 共用抽象抽得啱位：`ChangeCard`、`usePublishPlan`、`SheetOverlay` / `useSheetPresence`，冇複製邏輯
- CSS 規則用 node test 鎖住（safe area、ⓘ 位置、sheet motion），回歸好難無聲無息發生
- 每個副作用（reload changes、navigate replace、`noopener`）都有對應 test

## Handoff receipt

```yaml
handoff-receipt:
    agent: code-reviewer
    scope: batch（T1–T8，branch claude/admin-player-fixes-6fzdtw @ a785dca）
    status: warn
    score: 90
    hard_gates:
        {
            lint: pass,
            type_check: pass,
            tests: pass,
            coverage: pass,
            no_critical: pass,
            security_scan: n/a,
        }
    findings: { critical: [], warning: [W-777, W-778], suggestion: [S-1092, S-1093, S-1094] }
    next_action: invoke_developer_fix
    context: 'Lane C（T6）warn：W-777 拉走後 closing 中再開表會隱形；W-778 admin + player 冇 bump version。Lane A / B pass。修完 re-review 只驗 W-777 / W-778；S-1092..1094 按 project 規定同一 session 清或者問用戶。報告只 commit 未 push。'
```
