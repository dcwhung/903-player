# QA — admin brand toggle（admin 0.4.0 + W-741）— 2026-11-13 — S1

- Tier: T1（MINOR 單一模組；`apps/admin` nav 左上 banner / icon 改做收合 / 展開掣）| Commit: `8d924e4`（review `8e46385`）| Verdict: ✅ pass
- Ledger（base `51a23ba` = merge-base origin/main）: SKIP 11 / REVERIFY 3（`admin` `coming-soon` `repo-tooling`）/ UNCOVERED 0 / IGNORED 2
- `coming-soon` / `repo-tooling`：STALE 只有 `package-lock.json`，diff 淨係 `apps/admin` `0.3.1 → 0.4.0` 一行 version → 沿用 plan 重新 freeze（成條 chain + stage），冇額外驗
- Plan：`plans/admin.md` 加 AC-24（左上品牌收合）+ 對應 command
- e2e：本機唔跑 — CI 同 SHA `8d924e4` run 43524161162 綠（包括 E2E job），引用

## Runs

| Command                                                                     | Result                                     | Time |
| --------------------------------------------------------------------------- | ------------------------------------------ | ---- |
| `npm test -- apps/admin`                                                    | 111 files / 589 pass                       | 49 s |
| coverage `apps/admin`（v8，include `src/app/Nav.tsx`，`src/app/Nav*` test） | 11 pass；見 Hard Gates                     | —    |
| CI `ci.yml` run 43524161162 @ `8d924e4`                                     | success（changes / lint+unit+build / E2E） | 17 m |

- 註：run 43523197756 @ `7317190` cancelled（`concurrency`，被 `8d924e4` 取代），唔計

## 驗證要點（L2，對 admin AC-24）

- `Nav.test.tsx`「should toggle the nav from the top-left brand (mini = %s → %s)」：兩個方向都綠，`aria-expanded` = `!mini`
- e2e「nav v4」check（CI 綠）：收合 icon border / 底色 / box-shadow = `0px|rgba(0, 0, 0, 0)|none`（W-741）→ 撳 icon 展開 → banner 冇框 / 底色 → 撳 banner 收合
- 舊收合掣 selector 改 `exact: true`（reduced motion、< 1100px 自動收 check 照綠），新 label 唔會撞名
- `navLogo.node.test.ts`：收合 icon CSS `box-shadow: none` 鎖住 — 綠

## Hard Gates

all pass。Coverage（lines）：`Nav.tsx` 100（stmts 95.2、branch 81.8）。CSS 改動由 node test + e2e computed style 覆蓋。Security / data：n/a（純 UI）

## Findings

- 冇 🔴 / 🟡 / 🟢

## 建議補測

- none（兩個方向 unit + e2e 實撳都有；FLIP 同收合掣共用 `toggle`，原有 FLIP / reduced motion check 覆蓋）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: admin S1 (AC-24), coming-soon S1, repo-tooling S1 (lockfile version line only) — re-frozen, full chain + stage
tickets: none
ci: 43524161162 @ 8d924e4 (success, incl. E2E)
next_action: main agent pushes 8e46385 + QA commit together (code CI finished), then merge main → scripts/qa/ledger-merge.mjs
context: T1, 0 findings, no new IDs used (S-993+ free); e2e cited from CI, not re-run
```
