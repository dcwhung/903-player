# QA — 闊橫版內頁把手預留位常駐（唱片唔再變大細）— 2026-11-10 — S1

- Tier: T1（CSS + e2e / unit 鎖；player 1.31.1 → 1.31.2 PATCH）| Code commit: `cd9852b`（code = `420347f` + version bump；`248eedf` / `70b5b96` 淨 docs / mockup）| Verdict: ✅ pass
- L1：用戶 bug（闊橫版內頁揀集時把手消失、預留位收埋、唱片變大右移）；用戶揀方案 A（唱片唔跟把手；接受右邊常駐空位、S-786 全行訊息偏左）；review `.proj-docs/reviews/2026-11-10_review_inner-page-handle-reserve.md`（pass 95）
- Ledger（`impact --since b94a14d` = `git merge-base HEAD origin/main`）：SKIP 8 / REVERIFY 5（home、show-today-page、coming-soon、ui-foundation、repo-tooling）/ UNCOVERED 1（`_mockups_/inner-page-handle/index.html`）/ IGNORED 1
- UNCOVERED 分配：`_mockups_/inner-page-handle/index.html` → `home`（內頁把手 Design Origin，同 AC-2 闊橫版把手同一條鏈）
- REVERIFY 原因：home（`InnerPageHandle.tsx` / `PlayerHandle.module.css` / `playerHandle.node.test.ts` / `useFadeOut.ts` / `usePageHandle.ts`，後四個淨註解）；show-today-page（`Page.module.css`）；coming-soon / ui-foundation（`tokens.css` 註解、`homeWide.mjs`、version）；repo-tooling（`package.json` / `package-lock.json` version）
- Freeze 後 `impact` 仲列 `ui-foundation` REVERIFY：只因佢舊 S3 行（上次 release 之前已經 STALE），S1 已 FROZEN；下次 S3 release 重新 freeze
- Plan 沿用：`.proj-docs/qa/plans/{home,show-today-page,coming-soon,ui-foundation,repo-tooling}.md`（冇改）

## Runs

| Command                                                | Result                                                                                                                 | Time   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| CI run 42771085935 @ `cd9852b`（ci.yml，引用，冇重跑） | 全 success：Lint, unit & build（unit 257 files / 3027 pass，build 綠）；E2E 780 PASS / 0 FAIL（包括 PWA 換版 section） | 13 min |
| （參考）CI run 42729141734 @ `420347f`                 | success（同一份 code，未 bump version）                                                                                | 16 min |

- 新 e2e 檢查（`homeWide.mjs` `checkHandleLeaves`）喺 CI log：「喺劇集頁開始播，把手消失、預留位照留（右邊 45px）」、「把手拆走前後唱片唔變大細、唔移位（闊 607 → 607，中心 897.5 → 897.5）」PASS
- 各 plan 嘅 e2e section（闊橫版內頁把手、闊橫版主頁播放卡動畫、touch、390×844 主流程、320×640、主頁頁頂橫額、節目頁 / 今日節目頁尺寸、Shell 高度、即將上架 / 快將下架）全部喺 CI 780 PASS 入面
- 各 plan 嘅 unit 指令係 `npm test` 嘅子集 → 以 CI 3027 pass 引用
- coming-soon plan 嘅手動 viewport 矩陣冇做：呢條鏈只係 `tokens.css` 註解 + version + `homeWide.mjs`（屬 home 把手 section），冇碰佢嘅行為
- repo-tooling dist hash 比較只限「冇 bump version」；今次有 bump → 以 CI lint / unit / build / e2e 綠代替

## Hard Gates

all pass（Tests：CI unit + e2e 綠；Coverage：改動係 CSS 規則，由 `playerHandle.node.test.ts` + e2e 量度鎖住；Security / Performance：n/a；PWA：`sw.js` / manifest / 更新邏輯冇改，CI PWA 換版 section 綠）

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- 右邊常駐空位（闊橫版內頁冇把手時都留 45px）、S-786 全行訊息偏左：用戶已接受（方案 A）— 唔係 finding
- W-703 已喺 `cd9852b` 處理；S-785 mockup 已改（`70b5b96`）；S-786 / S-787 跟 review backlog

## 建議補測

- none（低風險 CSS 改動；no edge case gap — unit 鎖 CSS 規則，e2e 量度預留位同唱片闊 / 中心）

```handoff-receipt
status: pass
stage: S1
chain: home, show-today-page, coming-soon, ui-foundation, repo-tooling (+ _mockups_/inner-page-handle/index.html → home)
commit: cd9852b
next_action: main_agent_push_then_merge
context: "S1 pass @cd9852b; CI 42771085935 all green (unit 3027, e2e 780/0 incl. new reserve-stays + disc 607→607 / 897.5→897.5 checks, PWA update green); 5 chains S1 re-frozen; mockup assigned to home. Report + ledger committed locally, not pushed"
```
