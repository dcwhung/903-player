# Code Review — 2026-11-17 — 共用 SegmentedTabs（admin 0.9.3）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/admin-player-fixes-6fzdtw` HEAD `35dc592`，`git diff 766e281..35dc592`（18 檔，+507 / −230）
- 涵蓋 commit：`dbc2ecb`（新 `ui/SegmentedTabs` + `segmentedTabsModel`，遷移排程「編輯｜預覽」、App 圖示裝置掣、劇集類型；刪 `ui/Switch` 同舊 CSS）、`35dc592`（admin 0.9.3 + CHANGELOG）
- Tier：T2（共用 UI 元件 + 3 處遷移；冇 API / 新依賴）
- Review Item ID：**W-780**、**S-1104 – S-1105**（冇 C）
- 總評：**✅ pass（95 / 100）**。1 條三層收斂 🟡（toggle 模式方向鍵由「揀中」嗰格計，唔係由 focus 嗰格計）；按專案 backlog 規則應喺呢個 PR 內修

## Hard Gates

all pass

- Unit：`npx vitest related --run` 6 個改咗嘅 source → 8 files / 74 tests；另跑 `SegmentedTabs` / `ScheduleTab` / `Toggle` / `stateStyles.node` / `motionTokens` test → 5 files / 54 tests，全綠
- Type：`tsc -p apps/admin/tsconfig.app.json --noEmit` exit 0；Lint：`eslint apps/admin/src apps/admin/e2e` exit 0，改咗嘅檔 `prettier --check` 通過
- Coverage：`SegmentedTabs.tsx` + `segmentedTabsModel.ts` stmt / line / func 100%，branch 89%（≥ 80%）
- Security：冇新依賴（`package-lock.json` 只改 version）
- E2E：CI run `44035627253`（head `35dc592`）review 時仍 `in_progress`，main agent merge 前要確認綠

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                            |
| -------- | ------ | ------- | ----------------------------------------------- |
| 正確性   | 20     | 25      | W-780                                           |
| 安全性   | 20     | 20      | 純 UI                                           |
| 可維護性 | 20     | 20      | 純邏輯抽去 model；三處重複實作合併做一個元件    |
| 測試覆蓋 | 15     | 15      | 新元件 14 個 test，舊 Switch test 搬過嚟        |
| 性能     | 10     | 10      |                                                 |
| 代碼風格 | 10     | 10      | 動畫只喺 `no-preference`，用 `--motion-*` token |
| **總分** | **95** | **100** |                                                 |

**結果：✅ pass**

## 🟡 Warning

### W-780 toggle 模式方向鍵由揀中嗰格起計，focus 喺另一格時跳錯位

- 位置：`apps/admin/src/ui/SegmentedTabs.tsx` `onKeyDown`（`nextSegmentIndex(event.key, index, …)`，`index` = 揀中值嘅位置）
- L1：用戶批准嘅 plan 同 CHANGELOG 0.9.3「兩組都可以用 ← → / Home / End 換」；WAI-ARIA 方向鍵係由**目前 focus** 嗰格移去隔籬。tabs 模式有 roving tabIndex（focus 一定喺揀中格）所以冇事；toggle 模式每粒掣都喺 Tab 次序（同舊 `.switch` / `.seg` 一樣），focus 可以停喺未揀嘅格
- L2：臨時 test（已刪）重現：裝置 3 格、揀中 iPhone、Tab 去「瀏覽器分頁」撳 ←，結果揀中 + focus 都係「分頁」（預期 Android）；focus 喺 Android 撳 →，結果停喺 Android（預期分頁）。兩格嘅「類型」：揀中短篇集、focus 每日播撳 → 會揀每日播（預期循環返短篇集）
- L3：鍵盤用戶喺 App 圖示 dialog 撳 ← 會向右跳，或者撳完冇反應，好似壞咗
- 方案 A（推薦）：`onKeyDown` 用 focus 嗰格嘅位置（例如 `SegmentButton` 傳返自己嘅 index，或者 `Array.prototype.indexOf.call(buttons, event.currentTarget)`）做起點；兩個模式都啱，tabs 模式行為唔變。加一個「focus ≠ 揀中」嘅 toggle test
- 方案 B：toggle 模式都用 roving tabIndex（得揀中格喺 Tab 次序），即係 radiogroup 行為；改動 Tab 次序，同舊實作唔對等，要用戶同意

```tsx
// SegmentedTabs.tsx — 由 focus 嗰格起計（W-780）
const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const buttons = [...(groupRef.current?.querySelectorAll('button') ?? [])];
    const from = Math.max(0, buttons.indexOf(event.currentTarget));
    const target = nextSegmentIndex(event.key, from, options.length);
    const option = target === null ? undefined : options[target];
    if (disabled || target === null || !option) return;
    event.preventDefault();
    onChange(option.value);
    buttons[target]?.focus();
};
```

## 🟢 Suggestion / Observation

- **S-1104** `IconDialog` 上載中（`crop.busy`）`disabled` 而家會令裝置膠囊消失、冇一格揀中（舊實作 busy 時照顯示 `aria-pressed` 揀中），但左邊裁切圖仍然顯示嗰部裝置嘅框，上載完膠囊又彈返出嚟。plan 寫明「disabled = 冇揀中」所以唔算違規；如果想保留揀中，可以將「冇揀中」（`same`）同「鎖住」（busy）拆兩個 prop。要用戶決定，CHANGELOG 亦未提呢個改動
- **S-1105** toggle 模式 = 單選 + 方向鍵，語意上更接近 `radiogroup` / `radio`（`aria-checked`）；`aria-pressed` group 冇方向鍵慣例，讀屏用戶未必估到 ← → 會即刻改「類型」。可以接受（即時改類型只係改 draft、可以還原、未儲存），日後統一 a11y 時再考慮
- Observation：舊 class 全清：`.view-tabs` / `.view-pill` / `.switch` / `.icon-dialog .seg` 喺 `apps/admin` source、e2e、深色主題 rule 都冇剩引用（`stateStyles.node.test` 鎖住）；`_mockups_/admin/index.html` 自帶 `<style>` 嘅 `.switch` 係歷史 mockup，唔受影響
- Observation：a11y 對等：tabs 模式 role / `aria-selected` / `aria-controls` / roving tabIndex / tabpanel `aria-labelledby` 同舊 ViewTabs 一樣；toggle 模式 group + `aria-label` + `aria-pressed` + 全部可 Tab 同舊 Switch / `.seg` 一樣；新加方向鍵屬加強（見 W-780 / S-1105）

## ✅ 做得好嘅地方

- 膠囊位置改用 `--seg-index` / `--seg-count` 計，2 格同 3 格共用一套 CSS；滑動方向（拉長效果）由純函數計，`setState` during render 寫法啱
- 動畫只喺 `prefers-reduced-motion: no-preference`，用現有 `--motion-*` token；停用唔用 opacity，對比度有 test 鎖
- e2e 對比度 helper 同步支援 `aria-pressed`，舊 Switch test 搬返過嚟冇丟

## Handoff receipt

```handoff-receipt
agent: code-reviewer
task: /review SegmentedTabs refactor (admin 0.9.3)
branch: claude/admin-player-fixes-6fzdtw
commit: 35dc592
report: .proj-docs/reviews/2026-11-17_review_segmented-tabs.md
protocol: 1
stage: T2
score: 95/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security: pass
status: pass
next_action: invoke_developer
findings:
  critical: 0
  warning: 1 (W-780)
  suggestion: 2 (S-1104, S-1105)
context: >
  Score 95 maps to pass, but per project rule lane findings are cleared in this PR: fix W-780 (toggle-mode
  arrow keys start from the selected index instead of the focused button; reproduced) with option A + a
  focus-not-selected test, then re-review. S-1104 (busy hides device selection) needs a user decision.
  CI run 44035627253 on 35dc592 was in_progress at review time; confirm green before merge.
  Report committed locally only, not pushed.
blockers:
  - "W-780 toggle-mode arrow keys use selected index, not focused button"
```

---

## Re-review — 2026-11-17 — `d16a925..4504739`

- 範圍：只驗 W-780、S-1104 嘅修正（9de31fc、4504739）；S-1105 由 main agent 收做 observation，唔再跟
- Hard gates：all pass — related unit（`SegmentedTabs`、`features/appearance`、`stateStyles`，16 files / 98 tests）、eslint、`tsc --noEmit`（apps/admin）、prettier；CI run 44037011796 on 4504739 = success（lint / unit / build / e2e）
- Version：兩個 commit 修同一 session 上一個 commit（35dc592，0.9.3）嘅 review item，符合唔使 bump 嘅例外

| ID     | 結果 | 驗證                                                                                                                                                                                                                                                           |
| ------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-780  | 已修 | `onKeyDown` 用 `event.currentTarget` 喺 group 入面嘅位置做起點；新 test「focus 車厘子 ← → 香蕉」「focus 香蕉（未揀）→ → 車厘子」用舊寫法（由揀中 index 起計）會揀錯格，test 有分辨力                                                                           |
| S-1104 | 已修 | `disabled` 只鎖、照顯示揀中；`value: T \| null` 先代表冇揀中（冇膠囊、aria 全 false）。`DeviceTabs` 傳 `same ? null : device`，同舊行為一致；揀中 + disabled 字留 `--on-primary`，有 CSS test。其他 caller（ScheduleBars、BasicFields）冇傳 `disabled`，冇影響 |

Observation（唔扣分、唔使跟）：tabs 模式配 `value = null` 會令全部 tab `tabIndex=-1`、鍵盤去唔到；而家冇 caller 咁用（只有 toggle 模式傳 null）。

### Handoff receipt（re-review）

```handoff-receipt
agent: code-reviewer
task: /review re-review SegmentedTabs (W-780, S-1104)
branch: claude/admin-player-fixes-6fzdtw
commit: 4504739
report: .proj-docs/reviews/2026-11-17_review_segmented-tabs.md
protocol: 1
stage: T2
score: 100/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security: n/a
status: pass
next_action: proceed_to_qa
findings:
  critical: 0
  warning: 0
  suggestion: 0
context: >
  W-780 and S-1104 verified fixed; S-1105 closed as observation by main agent. CI run 44037011796 on
  4504739 green incl. e2e. Re-review appended and committed locally only, not pushed.
blockers: []
```
