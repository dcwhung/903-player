# QA — Phase 0a monorepo（`apps/player` workspace）— 2026-11-07 — S1

- Tier: T3（build / test setup 搬位；純 refactor，user-facing 零改動）| Code commit: `ee72715`（本地 HEAD 加 docs `5488898` `ec0fb33` + 本報告）| Verdict: ✅ pass
- L1：`.proj-docs/plans/2026-11-06_plan_backend-admin.md`「Monorepo 結構」/ Phase 0；用戶要求現有用戶零影響、唔 bump version（1.29.0），前提 dist byte-for-byte 一樣
- Ledger（`impact --since $(git merge-base HEAD origin/main)`，W-701 遷移後）：SKIP 0 / REVERIFY 11（全部 11 條鏈；plan 檔改 path 令 plan 行 STALE）/ UNCOVERED 8 個真檔 + 新鏈 `repo-tooling`；IGNORED 10
    - `impact` 另外列 721 個 rename 舊 path（已刪）+ 54 個 R100 新 path（main 已經冇鏈，例如 `public/`、`arcCover/`），唔係新 code（S-756）

## W-701 處理（ledger / plans path 遷移）

- Ledger 第 3 欄：1171 行 path 改（hash、commit、report 冇郁；`diff` 證實淨係第 3 欄變）
    - 716 個 R100：加 `apps/player/` 前綴 → hash 照 match，仍然係已驗證狀態
    - R098 / R099（`e2e/harness.mjs`、`e2e/run.mjs`、`scripts/dramaFromFolder.test.ts`）同 `package.json`：改新 path、**保留舊 hash** → 照實 STALE，由今次驗收重驗
    - 冇改：`_mockups_/`、`package-lock.json`（仲喺 root）；S3 baseline 入面 2026-11-04 之前已刪嘅舊 path（main 上已經 STALE，留俾下次 S3）
- 11 份 plan：加一行「Paths：相對 `apps/player/`」，`npx vitest run …` → `npm test -- …`（跟 CLAUDE.md QA 表）；`npm run e2e` 照用；L2：drama plan 新指令喺 repo root 跑 → 40 files / 543 tests pass

## Runs

| Command                                                                                              | Result                                                         | Time   |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------ |
| CI run 42353667556 @ `ee72715`：Detect / Lint, unit & build / E2E（引用，冇重跑）                    | 全 success：unit 240 files / 2780 tests、e2e 765 PASS / 0 FAIL | 13 min |
| `npm run build` → `apps/player/dist` 77 檔 sha256 vs `origin/main` 獨立 build（`main-indep.sha256`） | `diff` 冇輸出，清單 hash 一樣                                  | ~40 s  |
| drama plan：`npm test -- <plan 16 個 path>`                                                          | 40 / 543 pass                                                  | 25 s   |

- Vercel preview @ `ee72715`：commit status `Vercel = success`（引用，冇重做）；冇做 swapped build / PWA 矩陣（S1 規則；dist 一樣 → SW precache 一樣）

## Hard Gates

all pass（Tests：CI unit + e2e 全綠；Coverage：冇新邏輯，n/a；PWA：dist byte-for-byte 一樣；Security / Performance：n/a）

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation（入 backlog）

- S-755 `.claude/CLAUDE.md` QA 表 chains 清單未有新鏈 `repo-tooling`；同 S-753 一齊下次改 CLAUDE.md 時補
- S-756 `qa-ledger.sh impact` 唔識 rename：搬位之後舊 path 當 UNCOVERED 列出（今次 721 行），要人手過濾；可以考慮 `git diff -M` 跟 rename
- S-757 `vercel.json` 未入任何鏈：TEMP `ee72715` revert 後先定稿，下次 S3 納入 `repo-tooling`

## 凍結

- `freeze <chain> S1` × 12（11 條舊鏈 + `repo-tooling`）；scope = 遷移後 ledger 嗰條鏈嘅 S1 path（冇加減），證據 = CI 同 SHA 全 unit + 全 e2e + dist 一樣
- Freeze 後 `status`：12 條鏈 S1 FROZEN @`ec0fb33`（code 同 `ee72715` 一樣）；S3 STALE 588 行，同 `origin/main` snapshot 跑 `status` 一樣（遷移冇令 S3 變好或者變差）
- Freeze 後 `impact`：SKIP 4（bookmark / card-zoom / coming-soon / repo-tooling）、REVERIFY 8 = 2026-11-04 S3 baseline 行本身 STALE（main 一樣），留俾下次 S3

## 建議補測

- none（純搬位，冇新邏輯）

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: ee72715 (code); ledger frozen @ec0fb33 (docs-only diff from ee72715)
ci_run: 42353667556 (ee72715, success: lint + unit 240/2780 + build + e2e 765/0)
tickets_verified: [W-701 -> fixed by QA (ledger 1171 paths migrated, 11 plans updated)]
frozen: [bookmark, card-zoom, catalog-data, coming-soon, drama, home, mini-player, player-core, pwa-shell, show-today-page, ui-foundation, repo-tooling(new)] S1 @ec0fb33
next_action: proceed_to_merge
context: "dist rebuild 77 files sha256 identical to origin/main. Commit only, not pushed. After reverting TEMP ee72715, check the new SHA's CI before merge; vercel.json not frozen (S-757). S3 rows of 8 chains stale as on main."
```
