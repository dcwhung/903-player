# QA — sheet page-jump（docked ⓘ / 全集）— 2026-11-16 — S1

- Tier: T1（player 1.37.2 PATCH）| Commit: `62b5063` | Verdict: ✅ pass
- Branch: `claude/admin-player-fixes-6fzdtw`；base `9a0ca6f`（`git merge-base HEAD origin/main`）；review re-review ✅ pass 100（`.proj-docs/reviews/2026-11-16_review_sheet-page-jump.md`，W-779 / S-1095 已修）
- Ledger: SKIP 10（admin、api、bookmark、card-zoom、catalog-data、home、mini-player、player-core、pwa-shell、ui-foundation）/ REVERIFY 4（drama、show-today-page、coming-soon、repo-tooling）/ UNCOVERED 1 → `Sheet/useSheetBehaviour.test.tsx` 歸入 drama、show-today-page、coming-soon（三條都有 `useSheetBehaviour.ts`）
- Plans：沿用 drama AC-13、show-today-page AC-6、coming-soon、repo-tooling（冇改 plan）

## Runs

| Command                                                                                           | Result                                       | Time  |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----- |
| `npm test`（root，包晒 4 條鏈 plan 列嘅 unit）                                                    | 462 files / 4754 tests 綠                    | 174 s |
| `npm test -- src/components/shared/common/Sheet/ --project @903-player/player --coverage`（hook） | 18 tests；`useSheetBehaviour.ts` lines 95.7% | 10 s  |
| CI run 43953159262 @ `62b5063`（Detect code changes、Lint unit & build、E2E (Playwright)）        | success（引用，冇本地重跑 e2e）              | —     |

## Scenarios（改動 → 證據）

- 開 / 閂 sheet focus 唔捲祖先：`useSheetBehaviour.test.tsx`（開 = `focus({ preventScroll: true })`；閂 = 焦點返 ⓘ 而且 `preventScroll`）✅
- 兩個 `.docked` overlay `overflow: clip`：`sheetMotion.node.test.ts`「docked sheet overflow」2 個 case ✅
- 橫版 ⓘ / 直版 ⓘ / 橫版全集 page scroll 位置不變：CI e2e `itemInfo.mjs` 新 section（scrollTop 0、可捲範圍 +0px）✅
- W-779 flaky（`劇集資料：✕ 喺 banner 右上角`）：`settleAnimations` 取代 `SETTLE_MS`；CI 同 SHA e2e 綠 ✅
- Version：player 1.37.2（`apps/player/package.json` + lockfile 只改呢一行）✅

## Hard Gates

all pass（Coverage：`useSheetBehaviour.ts` lines 95.7%，CSS 由 node test 鎖；PWA gate n/a：冇改 `sw.js` / manifest / 更新邏輯；Security / Performance n/a）

## Findings

- 冇 🔴 / 🟡 / 🟢

## 手動 follow-up（唔 block）

- iOS 真機（Safari + standalone）手機打橫撳 ⓘ / 全集：成頁唔再彈上彈落；直版 ⓘ 同樣唔捲

## 建議補測

- none（focus 同 CSS 兩個 root cause 各有 unit / node test，加 3 個 e2e scroll section）

## Freeze

- S1：drama、show-today-page、coming-soon、repo-tooling（檔案清單 = ledger 現有 chain + S1 行，drama / show-today-page / coming-soon 加 `useSheetBehaviour.test.tsx`）
- 未郁 S3 行（drama / show-today-page 早已 STALE，留待 release S3）
- 核對：freeze 前後比對 chain + stage + path，0 行消失，三條鏈 S1 各 +1

```handoff-receipt
agent: quality-assurance
stage: S1
scope: sheet page-jump fix（branch claude/admin-player-fixes-6fzdtw @ 62b5063）
status: pass
hard_gates: { tests: pass, coverage: pass, no_blocking_finding: pass, pwa_update: n/a, security_data: n/a, performance: n/a }
findings: { critical: [], warning: [], suggestion: [] }
tickets: []
next_action: main_agent_push_and_merge
context: 'npm test 4754/4754；CI 43953159262 @ 62b5063 全綠（e2e 引用）；drama / show-today-page / coming-soon / repo-tooling S1 freeze；報告 + ledger 只 commit 未 push。手動 follow-up：iOS 真機確認唔再彈。'
```
