# Code Review — 2026-11-10 — 闊橫版內頁把手預留位常駐（唱片唔再跟把手變大細）

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/busy-carson-6u0wlx` `420347f`（base `origin/main` `b94a14d`），8 檔 +40 / -18
- SSoT（L1）：用戶揀方案 A —「唱片大細唔可以跟把手出 / 走變」，接受冇把手時右邊長留約 30px × `--ui-scale` 空位；`sw-git-flow` §Version Bump
- Tier：T1（一條 CSS 規則搬入 media query + 註解 + test）
- 總評：改法啱、範圍細。`.fixed:has([data-page-handle])` 改做 `WIDE_BANNER_QUERY` 入面常駐 `padding-right`，container 闊度唔再跟把手變，唱片 `100cqw` 計法自然穩定。得一個 🟡：冇 bump version

## Hard Gates

all pass

- Lint：developer 已跑 `npm run lint` pass；我對改動檔再跑 `prettier --check`（CSS / test / hooks）clean
- Type：pass（developer `npm test` / lint 已含；改動冇新 type）
- Tests：我重跑 `playerHandle.node.test.ts` + `ShowPage.test.tsx` 51 pass；冇跑 full suite / e2e（developer 已跑 full e2e：gauge 闊 607 → 607、中心 897.5 → 897.5）
- Coverage：pass（唯一邏輯改動係 CSS 規則，有 node test 讀原文鎖住）
- Security：n/a（冇新依賴）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                   |
| -------- | ------ | ------- | ------------------------------------------------------ |
| 正確性   | 25     | 25      | 預留位唔再跟把手加減；同 SHORT_LANDSCAPE 互斥、次序啱  |
| 安全性   | 20     | 20      | 冇影響                                                 |
| 可維護性 | 20     | 20      | media query 有 test 對 `WIDE_BANNER_QUERY` 鎖住        |
| 測試覆蓋 | 15     | 15      | unit 鎖規則 + 舊 `:has` 規則已刪；e2e 量把手走前後唱片 |
| 性能     | 10     | 10      | 少咗一個 `:has()` 選擇器                               |
| 代碼風格 | 5      | 10      | W-703 冇 bump version                                  |
| **總分** | **95** | **100** |                                                        |

**結果：✅ pass**（W-703 要喺 merge 前補）

## 逐項核對

- **Media query 同 `WIDE_BANNER_QUERY` 同步**：有 guard。test 用 `cssDeclarations(pageCss, '.fixed', WIDE_BANNER_QUERY)`，`tests/cssRule.ts` `contextOf` 要 `@media` prelude 完全一樣先攞到宣告；CSS 或 `layout.ts` 任何一邊改咗，`padding-right` 會變 `undefined`，test fail
- **次序 / specificity**：新規則喺頂層 `.fixed`（`padding-right: env(...)`）同 LANDSCAPE `.page` 規則之後，同 specificity 後寫贏
- **SHORT_LANDSCAPE**：`min-height: 562px` 對 `max-height: 561px` 互斥；手機打橫冇把手（`usePageHandle` 用 `WIDE_BANNER_QUERY`），亦冇預留位，同之前一樣
- **`.playerColumn:not(:has(~ .listColumn))` 全行**：照樣 `grid-column: 1 / -1`；只係內容盒右邊少咗預留位，訊息中心向左偏約 15px × `--ui-scale`（見 S-786）
- **HomePage `fillWithHandle`**：用 `main.wide[data-layout='fillWithHandle']`，唔經 `.fixed`，冇依賴舊 `:has`
- **View transition / card-zoom**：`global.css` 嘅 back / zoom-handle 規則用自己嘅 `:has([data-page-handle]:not([data-leaving]))`，冇依賴 `Page.module.css` 舊規則；預留位常駐唔影響配對名
- **DramaPage.tsx（搵唔到劇集）**：都用 `.fixed`，闊橫版而家同樣有預留位，同其他內頁一致，冇問題
- **舊註解**：`InnerPageHandle.tsx`、`PlayerHandle.module.css`、`tokens.css`、`useFadeOut.ts`、`usePageHandle.ts` 已更新；`src` / `e2e` 冇其他講「預留位收返」嘅註解。只剩 mockup 文案（S-785）
- **e2e `checkHandleLeaves`**：`padding > 0` + gauge 闊 / 中心前後相等；`measurePageHandle` 嘅 `contentRight` 檢查唔受影響

## 🔴 / 🟡

### W-703 冇 bump version（`apps/player/package.json` 仍然 `1.31.1`）

- L1：`sw-git-flow` §Version Bump —「所有改動預設都要 bump」，唯一例外係修正同一 session 對上一個指令整出嚟嘅 bug，而且要喺 commit body 寫 `No version bump: …`
- L2：`git diff origin/main...HEAD --stat` 冇 `package.json`；commit body 冇 no-bump 說明。呢個 bug 係 P3 #4（2026-11-04，`2026-11-04_review_p3-4-inner-page-handle.md`）留低，唔係同一 session。repo 慣例（`eb781cd`、`80ca26f`）code commit 同一個 commit bump
- L3：PWA 版本號 / update 偵測靠 `version`；唔 bump 嘅話 S3 `impact` base 同用戶睇到嘅版本號都分唔出呢個 fix
- 方案 A（推薦）：PATCH bump `1.31.1 → 1.31.2`（`apps/player/package.json` + `package-lock.json`），獨立 commit `fix: W-703 | bump player to 1.31.2`
- 方案 B：同下一個改動一齊 bump —— 唔建議，違反「每個改動自己 bump」，而且 PR merge 後 main 上面會有一段冇版本號對應嘅 code

## 🟢 / Observation（入 backlog，唔 block）

- S-785 `_mockups_/inner-page-handle/index.html:182,197` 仍寫「冇預留位」、「預留位一齊收返」；用戶已改揀方案 A，建議更新文案（Design Origin 引用時唔會誤導）
- S-786 闊橫版載入中 / 搵唔到節目（`.playerColumn` 用晒成行）冇把手時，訊息中心向左偏約 15px × `--ui-scale`；屬方案 A 已接受嘅 trade-off 延伸，記錄就得
- S-787 開 PR 時 description 第一行要有 `Design Origin:`（CSS 改動）；建議 `baseline`（user-approved option A），註明唯一視覺差異係右邊常駐預留位

## ✅ 做得好嘅地方

- 由根源（size container 闊度）入手，唔係喺唱片尺寸上加補償
- unit test 同時鎖新規則 + 斷言舊 `:has` 規則已刪；e2e 直接量用戶睇到嘅症狀（gauge 闊 / 中心）

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
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: invoke_qa
next_agent: quality-assurance
branch: "claude/busy-carson-6u0wlx"
context: "420347f pass 95: reserve always applied under WIDE_BANNER_QUERY (test guards query sync), no dependency from fillWithHandle / view-transition / card-zoom on old :has rule, SHORT_LANDSCAPE unaffected. W-703: no version bump — PATCH 1.31.1 -> 1.31.2 before merge. Observations S-785 (mockup wording), S-786 (full-row message ~15px off-center), S-787 (PR needs Design Origin line). Report committed, not pushed (code CI may be running) — main agent pushes after CI green."
```
