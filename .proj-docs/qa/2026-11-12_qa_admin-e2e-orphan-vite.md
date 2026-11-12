# QA — admin e2e runner 孤兒 vite preview（PR #207）— 2026-11-12 — S1

- Tier: T1（淨改 `apps/admin/e2e/run.mjs`，test harness）| Commit: `9e1a945`（code）/ `6481445`（review 報告）| Verdict: ✅ pass
- Ledger（`impact --since 0c03889` = `merge-base HEAD origin/main`）: SKIP 13 / REVERIFY 1（admin）/ UNCOVERED 0 / IGNORED 1（review 報告）
- SSoT: 用戶 AC（PR #207）：AC-1 跑完 `node apps/admin/e2e/run.mjs` 冇 vite preview 留低；AC-2 port 俾 stray server 佔住時第二次跑要 fail 兼有清楚訊息。Review `.proj-docs/reviews/2026-11-12_review_admin-e2e-orphan-vite.md`（100/100，S-850 / S-851 淨建議）；plan `plans/admin.md`（沿用，冇改）
- SKIP api / bookmark / card-zoom / catalog-data / coming-soon / drama / home / mini-player / player-core / pwa-shell / repo-tooling / show-today-page / ui-foundation（frozen, untouched）

## Runs

| Command / 證據                                                                                                                                | Result                                                                                                                                                                                              | Time |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| AC-1：`E2E_PORT=4196 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node apps/admin/e2e/run.mjs` → `pgrep -fa "vite.*preview"`（跑之前同之後）    | 34 PASS / 0 FAIL「admin e2e: all passed」exit 0；之前、之後 `pgrep` 都冇嘢（exit 1）                                                                                                                | 44 s |
| AC-2：喺 `apps/admin` 起 stray `node …/vite/bin/vite.js preview --port 4196 --strictPort`（pid 2984，curl 200）→ 同一 port 再跑 `e2e/run.mjs` | exit 1；stderr「port 4196 有人用緊（可能係上次 e2e 留低嘅 vite preview，或者另一個 worktree），用 `pgrep -fa "vite.*preview"` 搵出嚟停咗佢，或者用 E2E_PORT 揀第二個」；冇開 browser、冇 poll stray | 1 s  |
| AC-2 之後：`pgrep -fa "vite.*preview"`                                                                                                        | 淨係 stray 2984（runner 冇起第二個 vite、冇郁 stray）；QA kill 2984 後 `pgrep` 冇嘢                                                                                                                 | —    |
| CI [43197865870](https://github.com/dcwhung/903-player/actions/runs/43197865870) @`9e1a945`                                                   | success：lint / unit / build / e2e（包括 e2e:admin）；同 SHA，唔重跑                                                                                                                                | —    |

上次 schedule-unlisting QA 嘅 Observation「`run.mjs` 跑完留低 `vite preview --port 4195`」今次重現唔到（AC-1），即係已修。

## Hard Gates

all pass。Coverage：n/a（改動檔係 e2e runner 本身，冇 unit；行為由上面 AC-1 / AC-2 實跑證）。Security / Performance：n/a（冇 auth / 輸入 / 數據寫入、冇 backend）。PWA：n/a

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- Observation：「vite 起動中途自己退出 → 即刻 fail」（`waitForServer` 檢查 `exitCode`）本機冇重現到觸發條件（port 已被 `assertPortFree` 先擋），淨由 code review 覆蓋；冇 AC 要求

## 建議補測

- none（低風險 harness 改動，AC 已實跑驗）

```handoff-receipt
protocol: 1
status: pass
stage: S1
ledger: "FROZEN admin S1 @6481445 (code 9e1a945)"
hard_gates: { tests: pass, coverage: n/a, no_blocking: pass, pwa: n/a, security: n/a, performance: n/a }
tickets: []
next_action: merge_main
next_agent: main
branch: "claude/peaceful-hamilton-35etnm"
context: "admin e2e orphan vite fix S1 pass; AC-1 e2e:admin 34/0 then pgrep vite.*preview empty; AC-2 stray on 4196 -> exit 1 in 1s with clear message, stray untouched then killed; CI 43197865870 @9e1a945 success; report + ledger committed locally, not pushed"
```
