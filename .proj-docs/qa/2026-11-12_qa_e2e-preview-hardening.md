# QA — e2e preview 起動 / 停止加固（S-850 / S-851，PR #207）— 2026-11-12 — S1 re-verify

- Tier: T1（淨改 `apps/admin/e2e/run.mjs`、`apps/player/e2e/run.mjs`，test harness）| Commit: `b3e1e7a`（code）/ `2e3d903`（re-review）| Verdict: ✅ pass
- Ledger（`impact --since "$(git merge-base HEAD origin/main)"`）: SKIP 11 / REVERIFY 3（admin、coming-soon、repo-tooling；三條都係 `run.mjs` 改咗）/ UNCOVERED 0 / IGNORED 3（docs）
- SSoT: PR #207 AC（main agent 轉述）+ review `.proj-docs/reviews/2026-11-12_review_admin-e2e-orphan-vite.md`「Re-review（b3e1e7a）」；plans `plans/admin.md`、`plans/repo-tooling.md`、`plans/coming-soon.md`（沿用，冇改）；上次 S1 `2026-11-12_qa_admin-e2e-orphan-vite.md`
- SKIP api / bookmark / card-zoom / catalog-data / drama / home / mini-player / player-core / pwa-shell / show-today-page / ui-foundation（frozen, untouched）

## Runs

| Command / 證據                                                                                                                                                     | Result                                                                                                                                                        | Time |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `npm run build:admin` → 喺 `apps/admin` 跑 `E2E_PORT=4290 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node e2e/run.mjs` → `pgrep -fa "vite.*preview"`               | 34 PASS「admin e2e: all passed」exit 0；跑完 `pgrep` 冇嘢（exit 1）                                                                                           | 44 s |
| Admin stray：`node -e "http…listen(4291)"` 佔 port → `E2E_PORT=4291 node e2e/run.mjs`                                                                              | exit 1，即刻出「port 4291 有人用緊…用 `pgrep -fa "vite.*preview"` 搵出嚟停咗佢，或者用 E2E_PORT 揀第二個」；冇起 vite                                         | <1 s |
| Admin S-851：scratchpad script 由 `run.mjs` 原文抽 `STOP_TIMEOUT_MS` + `stopPreview`，對一個 `process.on('SIGTERM', ()=>{})` 嘅 child 同一個普通 child 叫          | 唔理 SIGTERM：印「vite preview 5000ms 內冇因 SIGTERM 退出，改用 SIGKILL」，5010 ms 後 `signal=SIGKILL`；普通：2 ms `signal=SIGTERM`；冇 child 留低            | 5 s  |
| Player S-850（冇 `dist`）：喺 `apps/player` 跑 `E2E_PORT=4292 node e2e/run.mjs`                                                                                    | vite 自己 stderr「The directory "dist" does not exist. Did you build your project?」+「vite preview exited early (code 1, signal null) on port 4292」，exit 1 | <1 s |
| Player S-850（signal kill 模擬）：臨時空 `apps/player/dist`（gitignored，跑完刪）→ `E2E_PORT=4293 node e2e/run.mjs`，3 s 後 `pkill -KILL -f "vite.*preview.*4293"` | 「vite preview exited early (code null, signal SIGKILL) on port 4293」，exit 1（未修前會 poll 到 15 s 先講「did not start」）                                 | 3 s  |
| 以上每步之後 `pgrep -fa "vite.*preview"`                                                                                                                           | 全部冇嘢                                                                                                                                                      | —    |
| `npx eslint` + `npx prettier --check` 兩個 `run.mjs`                                                                                                               | clean                                                                                                                                                         | —    |
| CI [43213117515](https://github.com/dcwhung/903-player/actions/runs/43213117515) @`b3e1e7a`                                                                        | success：lint、unit、build、e2e（player `npm run e2e` + `e2e:admin`）；同 SHA，唔重跑                                                                         | —    |

Player 正常跑完冇 vite 留低 + coming-soon e2e section：引用 CI 同 SHA 嘅 `npm run e2e`（作者另一個 worktree 同內容 780 PASS / 0 FAIL、冇 vite 留低，只作旁證）。coming-soon / repo-tooling 嘅 unit test 冇 import `run.mjs`，唔重跑。

## Hard Gates

all pass。Coverage：n/a（e2e runner 冇 unit，行為由上面實跑證）。Security / Performance / PWA：n/a

## Findings

冇 🔴 / 🟡。上次 Observation（「vite 起動中途退出即 fail」本機重現唔到）今次用冇 `dist` 同 SIGKILL 兩種方法重現咗，已關。

## 建議補測

- none（低風險 harness 改動，AC 已實跑驗）

```handoff-receipt
protocol: 1
status: pass
stage: S1
ledger: "（已過時）原本 FROZEN admin / coming-soon / repo-tooling S1 @2e3d903；merge b0051a4 用咗 main 嘅 ledger，以下 Addendum 為準"
hard_gates: { tests: pass, coverage: n/a, no_blocking: pass, pwa: n/a, security: n/a, performance: n/a }
tickets: []
next_action: merge_main
next_agent: main
branch: "claude/peaceful-hamilton-35etnm"
context: "S-850/S-851 re-verify S1 pass; admin e2e 34/0 + 冇 vite 留低；stray port exit 1 <1s；stopPreview 對唔理 SIGTERM 嘅 child 5s 後 SIGKILL；player 冇 dist / SIGKILL 都即刻 exited early + vite stderr；CI 43213117515 @b3e1e7a success（含 e2e）；報告 + ledger 只 commit 未 push"
```

## Addendum — merge main 之後 re-freeze（47f4a2b，2026-11-12）

- 上面 receipt 嘅 `FROZEN … @2e3d903` 已過時：merge `b0051a4` 用咗 main（#208）嘅 `apps/admin/e2e/run.mjs` 同 `verification-ledger.tsv`，8ebb6dd 嗰次 freeze 冇咗；admin 跟 main 嘅 freeze（SKIP），S-851 由 #208 取代
- Ledger（`impact --since "$(git merge-base HEAD origin/main)"`）: SKIP 12 / REVERIFY 2（coming-soon、repo-tooling；都係 `apps/player/e2e/run.mjs` hash 變）/ UNCOVERED 0 / IGNORED 3（docs）
- `git diff b3e1e7a HEAD -- apps/player/e2e/run.mjs`：淨係兩行註解 S-844→S-850，邏輯同上面驗過嘅一樣，所以輕量 re-check

| Command / 證據                                                                                | Result                                                                                                                                     |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 冇 `dist`：喺 `apps/player` 跑 `E2E_PORT=4295 node e2e/run.mjs` → `pgrep -fa "vite.*preview"` | vite stderr「The directory "dist" does not exist…」+「vite preview exited early (code 1, signal null) on port 4295」，exit 1；`pgrep` 冇嘢 |
| `npx eslint` + `npx prettier --check apps/player/e2e/run.mjs`                                 | clean                                                                                                                                      |
| CI [43227488155](https://github.com/dcwhung/903-player/actions/runs/43227488155) @`47f4a2b`   | pending（交 report 時仲 `in_progress`，未跑到 e2e）；main agent push 前要確認 success                                                      |

Verdict: ✅ pass，冇新 finding。Re-freeze coming-soon / repo-tooling S1（file list 同 main ledger 嗰份一樣）。
