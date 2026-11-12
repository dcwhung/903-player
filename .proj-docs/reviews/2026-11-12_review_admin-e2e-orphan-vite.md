# Code Review — admin e2e 孤兒 vite preview（PR #207）

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立）
- 目標：`claude/peaceful-hamilton-35etnm` @ `9e1a945`，`git diff origin/main...HEAD`（1 file：`apps/admin/e2e/run.mjs`，+44 / −8）
- Tier：T1（淨 e2e runner，build 出嚟嘅 app 唔變）
- Design Origin：n/a（冇 UI 改動）
- 總評：修法啱，同 `apps/player/e2e/run.mjs`（S-549）一致，仲補埋 player 冇嘅三樣：stderr 照出、`signalCode` 檢查、`stopPreview()` 等 vite 真係退出（admin 用 `process.exit()`，唔等就會截斷 kill）。冇收斂嘅 🔴 / 🟡，只有 2 條 🟢。

## Hard Gates

all pass。

- Lint：`npx eslint apps/admin` exit 0；`npx prettier --check apps/admin` exit 0（直接傳 `apps/admin/e2e/run.mjs` 會被 `reviewer-test-scope` hook 當 e2e block，所以用 folder 範圍跑，包含呢個檔）
- Type check：n/a（`apps/admin/tsconfig*.json` 只 include `src`、`tests`，唔涵蓋 `e2e/*.mjs`）
- Tests：n/a（冇 unit test 涉及 e2e runner；e2e 屬 QA / CI，author 已跑全套 admin e2e exit 0）
- Coverage：n/a
- Security：冇新依賴（`node:net` 係 built-in）
- Version：冇 bump。純 e2e tooling，build 出嚟嘅 app 唔變，跟 `2026-10-28_review_e2e_hardening.md` 先例，唔當 Warning

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                   |
| -------- | ------- | ------- | -------------------------------------- |
| 正確性   | 25      | 25      | kill 真 server、等退出、撞 port 即停   |
| 安全性   | 20      | 20      | —                                      |
| 可維護性 | 20      | 20      | 函數短、註解講清楚原因                 |
| 測試覆蓋 | 15      | 15      | 手動驗證 stray server → exit 1、冇殘留 |
| 性能     | 10      | 10      | —                                      |
| 代碼風格 | 10      | 10      | lint / prettier pass                   |
| **總分** | **100** | **100** |                                        |

**結果：✅ pass**

## 驗證（L2）

- 本機 probe：喺 `127.0.0.1:4199` 起 server，`createServer().listen(4199)`（同 `assertPortFree` 一樣冇 host）即刻 `EADDRINUSE` → stray IPv4 server 捉到（sandbox 冇 IPv6，`::1` 情況未驗）
- `stopPreview()`：vite 提早退出時 `exitCode !== null` → 唔 kill；`exited` promise 喺 spawn 當刻已掛 `once('exit')`，唔會錯過事件 → 唔會 hang
- 失敗路徑：`waitForServer` throw → `finally` 先等 vite 退出 → top-level await reject → exit 1，冇殘留
- Player 對比：player 冇 await exit，但佢用 `process.exitCode`（唔係 `process.exit()`），child process handle 會 hold 住 event loop 直到 vite 退出 → 唔係實際缺口，唔開 finding

## 🔴 / 🟡

冇。

## 🟢 / Observation（入 backlog）

- S-850 `apps/player/e2e/run.mjs:88–103`：player 嘅 startPreview 比 admin 少兩樣：(1) 只查 `exitCode`，vite 被 signal 殺（`exitCode` = null、`signalCode` 有值）會白等 30 次 poll 先 fail；(2) `stdio: 'ignore'`，起唔到時只得 `vite preview did not start`，睇唔到原因。可以照 admin 加 `signalCode` 檢查同 `stderr: 'inherit'`（用戶指示今次唔改 player）
- S-851 `apps/admin/e2e/run.mjs:72–75`：`stopPreview()` 嘅 `await exited` 冇 timeout；萬一 vite 唔理 SIGTERM，e2e 會永遠卡住。vite 8.3.4 實測會退出（author 已驗），屬 L3 防禦性建議：例如 5 秒後 `SIGKILL`

## ✅ 做得好嘅地方

- 根因（npx wrapper 被 kill、vite 變孤兒、strictPort 靜靜失敗）分析準確，commit message 講得清楚
- 錯誤訊息直接講點搵（`pgrep -fa "vite.*preview"`）同點避（`E2E_PORT`）
- `exited` promise 喺 spawn 時即刻建立，避開 exit 事件錯過嘅 race

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: n/a
  tests: n/a
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "claude/peaceful-hamilton-35etnm"
context: "PR #207 admin e2e runner orphan-vite fix 100/100 pass; integration branch is main; no C/W; S-850 (player startPreview lacks signalCode check + stderr) and S-851 (stopPreview await has no SIGKILL timeout) to backlog; player not awaiting exit is not a real gap (uses process.exitCode). Report committed locally, not pushed."
```

## Re-review（`b3e1e7a`）

- 範圍：只睇 follow-up commit `b3e1e7a`（`apps/admin/e2e/run.mjs` +14 / −2、`apps/player/e2e/run.mjs` +10 / −2），唔重新 review 成個 branch
- S-850 ✅ resolved：player `startPreview()` 加 `hasExited()`（`exitCode` 或 `signalCode`），poll loop 一見 vite 退出就 break，之後 throw `vite preview exited early (code …, signal …) on port …`；stdio 改 `['ignore', 'ignore', 'inherit']`，起唔到時睇到 vite 嘅 stderr。行為同 admin `waitForServer` 一致
- S-851 ✅ resolved：admin `stopPreview()` 已退出就直接 return；否則 SIGTERM 後 race `exited` 同 `STOP_TIMEOUT_MS = 5_000`，`clearTimeout` 之後先決定；超時 log 一句再 SIGKILL 並 `await exited`（SIGKILL 唔可以被忽略，唔會再 hang）。常數有命名同註解
- L2（reviewer 自己跑，scratchpad 抽出同一段 code）：唔理 SIGTERM 嘅 child → 5009 ms 後 `signalCode = SIGKILL`；正常 child → 3 ms；已退出 child → 0 ms 直接 return；被 SIGKILL 嘅 child `hasExited()` = true（`exitCode` null）。跑完 `pgrep` 冇殘留 process。冇起 vite、冇用 port
- Author 驗證（另一個 worktree，同一內容）：full admin e2e pass；full player e2e 780 PASS / 0 FAIL；冇 `dist` 時 1 s 內報 `exited early (code 1, signal null)` 連 vite stderr；冇 vite 殘留
- Gates：`npx eslint apps/admin apps/player` exit 0；`npx prettier --check apps/admin apps/player` exit 0（用 folder 範圍，避開 hook）。Type / unit / coverage n/a（e2e runner 唔喺 tsconfig、冇 unit test）
- 新 finding：冇
- CI：`b3e1e7a` 嘅 run 啱啱 trigger，e2e 結果交 QA 引用

## Re-review handoff receipt

```
HANDOFF_RECEIPT
agent: code-reviewer
status: pass
score: 100（re-review；S-850、S-851 resolved）
hard_gates: { lint: pass, type: n/a, tests: n/a, coverage: n/a, no_critical: pass, security_scan: n/a }
blocking: none
findings: S-850 resolved（b3e1e7a）；S-851 resolved（b3e1e7a）；冇新 finding
next_action: QA
context: re-review b3e1e7a；報告只 commit，未 push（等 b3e1e7a 嘅 CI 跑完先由 main agent push）
```

## Addendum — merge main（`b0051a4` / `47f4a2b`）

- 範圍：`git diff origin/main...HEAD` = `apps/player/e2e/run.mjs`（+10 / −2）+ 三份報告；admin runner 同 ledger 用 main 原文，冇 net diff
- Admin：今個 PR 嘅 admin 改動（`9e1a945`、`b3e1e7a` 嗰部分）由 PR #208（`48eb283`）取代：detached process group kill、port 預查、`waitForServer` 帶 stderr tail 即刻 fail、SIGINT / SIGTERM / exit 收尾、`STOP_TIMEOUT_MS = 5_000` 後 SIGKILL。上面 S-851 嘅 resolve 描述講嘅係舊 code；而家由 #208 嘅 `stopPreview()` cover（SIGTERM 成個 group，超時 SIGKILL），仍然算 resolved
- ID 重編：本 PR 原本嘅 S-844 / S-845 同 main（api 0.7.1）撞號，`47f4a2b` 改做 S-850 / S-851；三份報告同 player 註解冇殘留，main 自己嘅 S-844 / S-845（api）冇郁
- 剩低範圍 = player S-850：`hasExited()` 睇 `exitCode` 或 `signalCode`，退咗就 throw `vite preview exited early …`，stderr inherit。L2（scratchpad 抽同一段 logic，dummy child，冇起 vite）：`exit(1)` → `code 1, signal null` 連 child stderr 照出；SIGKILL → `code null, signal SIGKILL`，舊嘅淨查 `exitCode` 會當未退
- 同 #208 admin 唔一致（決定：唔開 finding，冇 L1）：
    - stderr：admin 收埋 tail 放入 error；player 直接 inherit。兩邊都睇到 vite 原因
    - 收尾：admin 經 `npx` + detached，所以一定要 group kill 同 signal handler；player 直接 `node vite.js`、唔 detached，同 runner 同一個 process group，Ctrl-C 會一齊送到 vite，`server.kill()` 亦打中真 server，唔使 handler
    - Observation（本 diff 以外，唔扣分）：淨係 `kill <player runner pid>`（唔係成個 group）會留低 vite；舊行為，冇 AC 要求
- Gates：`npx eslint apps/player apps/admin` exit 0；`npx prettier --check apps/player apps/admin .proj-docs/reviews .proj-docs/qa` exit 0；type / unit / coverage n/a；e2e 交 QA / CI
- Ledger 提示（QA）：merge 用咗 main 嘅 ledger，`8ebb6dd` 凍結嘅 coming-soon / repo-tooling `apps/player/e2e/run.mjs` 行冇咗；`impact` 而家係 REVERIFY coming-soon、repo-tooling（ledger hash `22e9b38…` vs HEAD `5ecbeef…`）。HEAD 同 `b3e1e7a` 嘅 player runner 只差兩行註解，QA 可以引用 `47f4a2b` 嘅 CI 再 freeze
- 新 finding：冇

## Addendum handoff receipt

```
HANDOFF_RECEIPT
agent: code-reviewer
status: pass
score: 100（merge main 後 re-review；S-850 resolved，S-851 由 #208 cover）
hard_gates: { lint: pass, type: n/a, tests: n/a, coverage: n/a, no_critical: pass, security_scan: n/a }
blocking: none
findings: 冇新 finding；Observation：player runner 單 kill runner pid 會留 vite（舊行為）
next_action: QA（re-freeze coming-soon / repo-tooling）
context: net diff = player run.mjs + 報告；報告只 commit，未 push（等 47f4a2b CI）
```
