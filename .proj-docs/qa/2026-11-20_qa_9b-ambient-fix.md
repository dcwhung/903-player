# QA — ambient（PR #296 置中 + 跑馬燈）— 2026-11-20 — S1

- Tier: T1 | Code commit: `08d2d028`（branch head `b31562e9` = + re-review 報告）| Verdict: ✅ pass
- Ledger（`impact --since 6a64e725` = merge-base `origin/release/v2.2.0`）: SKIP 12 / REVERIFY 3（ambient；ui-foundation、coming-soon 只因 `tokens.css`）/ UNCOVERED 0 / IGNORED 1
- Plan: `.proj-docs/qa/plans/ambient.md`（加 AC-13–15、e2e 6 個 section、1-hop `Marquee`（mini-player））

## Runs

| Command / 證據                                                                  | Result                                  | Commit     |
| ------------------------------------------------------------------------------- | --------------------------------------- | ---------- |
| `npm test -- apps/player/src/components/shared/player/Ambient --coverage`（QA） | 22/22；Ambient/\* lines 100%、stmts 99% | `b31562e9` |
| `npm test -- apps/player/src/styles/`（QA，ui-foundation tokens）               | 148/148                                 | `b31562e9` |
| CI run 44710320754（lint、unit、build、e2e 全套）                               | success（lint、unit & build、E2E 全綠） | `08d2d028` |
| Developer：`npm test` 5447 pass；lint / build ok；full e2e 1156 pass            | 引用                                    | `bdf64363` |
| Developer：`npm run e2e:visual` vs `origin/release/v2.2.0`                      | 234/234 零改變                          | `bdf64363` |
| Developer：ambient unit 22 pass；`npm run lint` pass                            | 引用                                    | `08d2d028` |

`bdf64363` → `08d2d028` 只差 `Ambient.module.css` 刪 no-op `tabular-nums` + 註解（S-1340）同 review 報告；`08d2d028` → `b31562e9` 淨 docs。

## AC 對照（新加）

- AC-13 置中：`e2e/ambient.mjs` `checkLayout` 喺「節目播緊 / 節目暫停 / 廣播劇短篇」量睇得見 pixel 左右留白差 ≤ 4px（`MARGIN_TOLERANCE_PX`）；方案 A（每分鐘重新置中）跟用戶決定，冇固定數字格
- AC-14 右格闊 = 時間（±0.5px）：同上 + 「開咗 timer」（只驗闊度 / 一行，S-1342）
- AC-15 名 / 副題一行 + `Marquee`（copy `aria-hidden`）、時間唔係跑馬燈：unit「should scroll the name and status line as a marquee…」+ e2e 一行檢查；減少動態省略號由 `Marquee.module.css` reduce 處理（mini-player S1 frozen，冇改）

## Hard Gates

all pass（PWA gate: no — 唔掂 sw / manifest / build）

## Findings

### Observation

- S-1350 `ui-foundation` / `coming-soon` REVERIFY 只因 `tokens.css` 加一個 `--ambient-disc-col`（加法，`grep` 唯一用者係 `Ambient.module.css`）；e2e 全套 + visual 234/234 證現有畫面零改變 → 兩條鏈 S1 用現有完整檔案清單 re-freeze（S3 行冇掂，留畀 main agent）

## 建議補測

- none（e2e 已覆蓋 AC-13–15；樣式改動屬低風險）

## Ledger

- Freeze S1：ambient 31 行、ui-foundation 130 行、coming-soon 163 行（清單由 ledger 攞，同改前比 chain + stage + path 冇少行）；S3 行冇改（`impact` 仍列 3 條 REVERIFY 係因為 S3 行 STALE，留畀 main agent release 時 refresh）

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
chain: ambient (+ ui-foundation, coming-soon S1 re-freeze for tokens.css)
ci_run: 44710320754 @ 08d2d028 — success（lint、unit & build、E2E 全綠）
tickets: none
next_action: main agent push / merge PR #296; refresh S3 rows at release
context: "AC-13–15 added to ambient plan; S-1350 observation only; no CUI"
```
