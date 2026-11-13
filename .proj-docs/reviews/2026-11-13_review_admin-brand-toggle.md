# Code Review — 左上 banner / icon 收合選單（admin 0.4.0）

- 日期：2026-11-13
- 審閱者：Code Reviewer（獨立）
- 目標：`feature/admin-brand-toggle` @ `7317190`，`git diff origin/main...HEAD`（7 檔，+76 / −30；淨 diff 冇 `node_modules`）；re-review @ `8d924e4`
- SSoT：用戶要求（撳左上 icon = 收合 / 展開掣）；Design Origin：`mockup: _mockups_/admin-style/index.html#i`（⑨ / ⑨b nav v4）；`.claude/CLAUDE.md` §Motion、§Admin 介面文字
- Tier：T1（單一 component 行為改動 + CSS）
- 總評：行為正確。`BrandToggle` 同底部掣用同一個 `toggle`（先 `capture()` 再 `onToggle()`），所以 FLIP 同減少動態（`flip.ts` 冇改）照舊。`<button type="button">` 有 `aria-expanded`，`aria-label` 寫明動作；收細時 `img alt=""`，避免讀兩次。冇其他嘢依賴 brand link 去 `/`：nav 仲有「更新」項目，已 grep `brand-link`、`logo-mini`、`Admin v` 同 nav link 數目，code / test / e2e 都冇用到。冇新增 i18n 字串，組合出嚟嘅 label 只用現有書面語「收合選單 / 展開選單」。第一輪得一個收斂 🟡（W-741），已喺 `8d924e4` 修好。

## Hard Gates

all pass。

- lint：`npx eslint Nav.tsx Nav.test.tsx` exit 0；`npx prettier --check` 改動嘅 src / css / CHANGELOG / package.json 全過。`e2e/run.mjs` 嘅 lint 引用 developer 跑嘅 `npm run lint`，因為 reviewer hook 唔畀直接跑含 e2e path 嘅指令
- type：`apps/admin` `npx tsc -b` exit 0
- unit（diff 相關）：`Nav.test.tsx` + `styles/navLogo.node.test.ts`，2 files / 9 tests pass；冇跑 e2e（留 QA / CI）
- coverage：`BrandToggle` 兩個分支（mini / 展開）都有 test，包括 `aria-expanded` 同 click → `onToggle`
- security：冇新依賴；version 已 bump（admin 0.4.0，lockfile 同步）

## 評分結果（第一輪）

| 維度     | 得分   | 滿分    | 備注                       |
| -------- | ------ | ------- | -------------------------- |
| 正確性   | 20     | 25      | W-741（收細 icon 有框）    |
| 安全性   | 20     | 20      |                            |
| 可維護性 | 20     | 20      |                            |
| 測試覆蓋 | 15     | 15      | e2e 框檢查有漏，併入 W-741 |
| 性能     | 10     | 10      |                            |
| 代碼風格 | 10     | 10      |                            |
| **總分** | **95** | **100** |                            |

**結果：✅ pass**（≥ 90、冇 🔴；W-741 已喺本 PR 修，見 Re-review）

## 🟡 W-741 收細 nav 左上 app icon 多咗一個 1px 方框（全域 `button` 嘅 inset box-shadow）

- 位置：`apps/admin/src/styles/app.css` 新 reset ／ `apps/admin/src/styles/theme.css` `.shell.mini .nav .logo-mini`
- L1：`theme.css` 對 `.logo-mini` 嘅規則寫明「直接顯示完整 app icon…唔加底、唔裁切」（⑨b mockup）；今次 CHANGELOG 0.4.0 同 app.css 註解都寫明「冇 button 框」
- L2：用 `7317190` build 出嚟嘅 CSS，喺 Chromium 量 `.shell.mini .nav button.logo-mini`：`box-shadow: rgb(219, 227, 236) 0px 0px 0px 1px inset`、`border-radius: 0px`（rest / hover / focus 都係）。截圖量 icon 透明圓角位：角落像素 `(213,221,230)`，nav 天藍底 `(29,119,186)`，即四角見到淺灰方框。原因：全域 `button { box-shadow: inset 0 0 0 1px var(--line) }`；以前 `<a>` 有 `.nav a { box-shadow: none }`，改做 button 之後冇規則蓋返。展開 banner 冇事，因為 `.nav .brand-link` 有自己嘅 box-shadow
- L3：e2e 新 step 只檢查展開 banner 嘅 `borderTopWidth` + `backgroundColor`，冇睇 `boxShadow`，亦冇檢查收細 icon，所以捉唔到
- 影響：收細 nav 每頁都見到（外觀 regression），同 CHANGELOG 講法唔一致
- 方案 A（推薦）：`theme.css` `.shell.mini .nav .logo-mini` 加 `box-shadow: none`；`navLogo.node.test.ts` 鎖住；e2e 框檢查加 `boxShadow`，撳 icon 之前先驗收細 icon
- 方案 B：`app.css` 另加 `.nav .logo-mini { box-shadow: none; }`；唔可以放入連 `:hover` 嘅 reset group，否則 (0,4,0) 會喺 hover 時蓋走 banner 陰影。改動細，但 icon 樣式分散喺兩個檔

## 🟢 / Observation

- Observation：兩個掣做同一件事，但名唔同（「903 Player Admin Admin v…（收合選單）」vs「收合選單」），讀屏用戶分得開；「Admin Admin」重複係舊有 `app.name` + `app.version`，唔屬今次改動
- Observation：brand 掣冇 hover 底色，只有 `cursor: pointer`（CHANGELOG 寫明刻意）；focus-visible 用 `.nav :focus-visible` 嘅 2px `--on-nav` outline（已量到 `solid 2px`）

## ✅ 做得好嘅地方

- 重用 `toggle`（包括 FLIP `capture`），冇複製邏輯；React 保留同一個 `<button>`，撳完 focus 唔會跳走
- e2e 改用 `exact: true`，處理到 Playwright 子字串匹配嘅陷阱，四處都改齊
- reset 連 `:hover:not(:disabled)` 一齊寫，specificity (0,4,0) 贏全域 hover

## Re-review（W-741）

- 修正：`8d924e4`（`fix: W-741 | ...`，一個 item 一個 commit），用方案 A
- `theme.css` `.shell.mini .nav .logo-mini` 加 `box-shadow: none`；`navLogo.node.test.ts` 加 `box-shadow:\s*none` assertion（developer 報修正前 fail）
- `e2e/run.mjs`：`frameOf` helper 撳之前驗收細 icon 嘅 border / 底色 / box-shadow；banner 照舊只驗 border + 底色（設計陰影唔算框）
- L2 重驗：用 `8d924e4` build 出嚟嘅 CSS 喺 Chromium 量收細 icon：`box-shadow: none`、`background: rgba(0, 0, 0, 0)`、`border: 0px`（rest / hover / focus 都係），focus 仍有 `solid 2px` outline
- `npx vitest run navLogo.node.test.ts Nav.test.tsx` 9 / 9 pass；`theme.css`、`navLogo.node.test.ts` prettier 過
- 結論：W-741 已關閉，冇新 🔴 / 🟡

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/admin-brand-toggle"
context: "Re-review @8d924e4: W-741 closed (collapsed .logo-mini box-shadow none, node test + e2e frameOf lock it; Chromium L2 re-probe confirms). No open findings. Integration branch is main; merge after code CI green, then QA S1."
```
