# QA — Phase 0b `packages/catalog`（`@903-player/catalog`）— 2026-11-07 — S1

- Tier: T3（抽 package + test setup 改 root vitest projects；user-facing 冇改）| Code commit: `3bc9c53`（本地 HEAD 加 review docs `c69ae4d` + 本報告）| Verdict: ✅ pass
- L1：`.proj-docs/plans/2026-11-06_plan_backend-admin.md` Phase 0 / 0b（補註：module 次序令 bundle 唔同 → 用戶決定 bump 1.29.1）；用戶要求現有用戶零影響
- Ledger（`impact --since $(git merge-base HEAD origin/main)` = `dbaf948`，rename 遷移後）：SKIP 0 / REVERIFY 12（全部鏈）/ UNCOVERED 20 個新檔 + 3 個鏈外檔；IGNORED 7
    - `impact` 另外列 35 個已 rename 舊 path（S-756，同 Phase 0a 一樣人手過濾）

## Rename 處理（照 Phase 0a W-701）

- Ledger 第 3 欄：51 行（35 個 rename 檔）舊 path → 新 path，hash / commit / report 冇郁（`diff` 證實淨係第 3 欄變）；18 個 R100 hash 照 match，R082–R099 保留舊 hash → STALE，由今次重驗
- 新檔分配：`catalog-data` ← `packages/catalog/src/{constants,date,date.test,index}.ts`、`apps/player/src/catalog/libraryJsonSchemas.node.test.ts`；`coming-soon` ← `constants.ts`（LEAVING_SOON_DAYS）；`ui-foundation` ← `showTheme.ts`、`scripts/blankDiscTokens.test.ts`；`repo-tooling` ← root `tsconfig.json` / `vitest.config.ts`、`apps/player/tsconfig.{app,node}.json`、`packages/catalog/{package.json,tsconfig*.json,vitest.config.ts,src/console.d.ts}`
- 鏈外（照 `repo-tooling` plan out of scope）：`.vscode/settings.json`（schema path）、`scripts/arcCover/` 2 檔（comment + test 讀 constants path）→ S-762
- Plans：12 份 Paths 行改「root `vitest.config.ts` projects，`npm test -- <path>` 子字串 filter」；catalog-data / coming-soon / drama / player-core / ui-foundation scope + 指令改 `packages/catalog/…`；repo-tooling 加新 config 檔、AC-1 寫 Phase 0b bump 例外

## Runs

| Command                                                                                | Result                                                                                                  | Time   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------ |
| CI run 42363202581 @ `3bc9c53`：Detect / Lint, unit & build / E2E（引用，冇重跑）      | 全 success：unit 242 files / 2780 tests、e2e 765 PASS / 0 FAIL                                          | 13 min |
| 5 份改咗嘅 plan 指令（新 path 驗證 filter 有 match）                                   | catalog-data 19/413、coming-soon 71/766、player-core 19/357、drama 40/543、ui-foundation 36/193 全 pass | ~100 s |
| `git diff -M dbaf948 3bc9c53`：R082–R099 新舊檔內容比較；app 側 `--diff-filter=M` 加行 | 淨係 import / re-export path / comment 變；邏輯冇改                                                     | —      |

- 零影響證據（L2）：diff 冇任何行碰 `903player:progress:v2` / `bookmarks:v2` / storage key；`episodeId.ts`（+ test）R100；`HK_TIMEZONE` / `LEAVING_SOON_DAYS` / `DRAMA_AUDIO_BASE` 值同舊 `config/constants.ts` 一樣；`ShowTheme` / `NEUTRAL_THEME` 同舊 `showThemes.ts` 逐行一樣；`date.ts` 純函數原樣搬（format 函數留 player）；e2e 3 檔淨改 comment
- CI e2e 涵蓋：`PWA 換版` 7 項 PASS（第一次開 app / 返嚟用戶 / 兩個 tab / Shift-reload / 播緊嘢唔換）、`v1 → v2 升級` 10 項 PASS、版本號 v1.29.1 顯示；冇做 swapped build / PWA 矩陣（S1 規則）
- arcCover：sandbox 冇 Python deps，冇重跑；引用 developer pytest 101 pass；人手核實 `REPO_ROOT.parents[1]/packages/catalog/src/constants.ts` 讀到同 `R2_BASE` 一樣

## Hard Gates

all pass（Tests：CI 全 unit + e2e 綠；Coverage：冇新邏輯，n/a；PWA：e2e 換版 section 綠；Security / Performance：n/a）

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation（入 backlog）

- S-762 `.vscode/settings.json`、`apps/player/scripts/arcCover/` 唔屬任何鏈，每次改都喺 `impact` 出 UNCOVERED；可以 `ledger-ignore` 加 `.vscode/*`，arcCover 開鏈（pytest）或者 ignore

## 凍結

- `freeze <chain> S1` × 12；scope = 遷移後 ledger 嗰條鏈 S1 path + 上面新檔；證據 = CI 同 SHA 全 unit + 全 e2e + plan 指令
- Freeze 後 `status`：12 條鏈 S1 FROZEN @`c69ae4d`（code 同 `3bc9c53` 一樣）；S3 STALE 594 行（8 條鏈，留俾下次 S3）

## 建議補測

- none（純搬位，冇新邏輯）

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: 3bc9c53 (code); ledger frozen @c69ae4d (docs-only diff from 3bc9c53)
ci_run: 42363202581 (3bc9c53, success: lint + unit 242/2780 + build v1.29.1 + e2e 765/0 incl. PWA 換版 7/7)
frozen: [bookmark, card-zoom, catalog-data, coming-soon, drama, home, mini-player, player-core, pwa-shell, repo-tooling, show-today-page, ui-foundation] S1 @c69ae4d
next_action: proceed_to_merge
context: "51 ledger rows path-migrated (S-756 manual), 20 new files assigned. Commit only, not pushed. S3 rows of 8 chains stale as on main."
```
