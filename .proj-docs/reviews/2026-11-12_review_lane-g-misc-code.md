# Code Review — 2026-11-12 — Backlog Lane G（雜項 code）

- 審閱者：Code Reviewer（獨立 subagent）
- 目標：`refactor/misc/S-856_lane-g-misc-code` `origin/main...1da1d29`（1 commit；7 files，+60 / −30）
- 處理嘅 backlog ID：S-856、S-862、S-864、S-865
- SSoT（L1）：`.proj-docs/backlog.md` Open 表 S-856 / S-862 / S-864 / S-865；Source 報告 `2026-11-12_review_api-lane-b-backlog`、`2026-11-12_review_lane-c-player-catalog-misc`；ai-dev-team `sw-git-flow` §Version Bump
- Tier：T2（api runtime 一個常數 refactor、Python tooling、comment；行為唔變）
- Design Origin：n/a（冇 UI 改動）
- 總評：4 項都跟 backlog 原意做，範圍收得窄，冇夾帶。`--app-root` / `--repo` 用同一個 `dest`，舊 flag 照用，兩邊都有 alias test。一個 🟡：`apps/api` 源碼改咗但冇 bump version（W-718）

## Hard Gates

all pass。

- Lint：`npx eslint` + `npx prettier --check`（`webp.ts`、`jsonSchemas.ts`）exit 0；arcCover `ruff check` All checks passed、`ruff format --check` 22 files already formatted（S-865 清晒）
- Type check：`apps/api` `npx tsc -b` exit 0
- Tests：`apps/api` `vitest run test/webp.test.ts test/assets.test.ts` 20 pass；`jsonSchemas` 嘅 3 個 importer（`core/jsonSchemas.node.test.ts`、`document/catalogSchema.node.test.ts`、player `libraryJsonSchemas.node.test.ts`）291 pass；arcCover `pytest tests/test_review.py tests/test_fetch_sources.py` 42 pass（25 subtests）。冇跑 full suite / e2e（author 已跑 root `npm test` 3809、api 217 + 12、arcCover 103）
- Coverage：純 refactor，`webp.ts` 改動行由 `webp.test.ts`（VP8 / VP8L / VP8X）同 `assets.test.ts` 1216×684 VP8 cover
- Security：冇新依賴（n/a）；No Critical：pass

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                       |
| -------- | ------ | ------- | ------------------------------------------ |
| 正確性   | 25     | 25      | 4 項行為同 backlog 一致；alias 兩邊有 test |
| 安全性   | 20     | 20      | —                                          |
| 可維護性 | 15     | 20      | W-718 冇 bump api version（−5）            |
| 測試覆蓋 | 15     | 15      | S-890（唔扣分）                            |
| 性能     | 10     | 10      | —                                          |
| 代碼風格 | 10     | 10      | eslint / prettier / ruff 全過              |
| **總分** | **95** | **100** |                                            |

**結果：✅ pass（W-718 要 merge 前修）**

## 逐項驗證

- **S-856**（`webp.ts`）：`UINT16_BYTES = 2` 取代 `VP8_HEIGHT_OFFSET` 同 `uint24` / `uint32` 入面嘅 `2`。值一樣，`uint16` 入面嘅 `at + 1`（16-bit 欄位內第二個 byte）同 shift `<< 8` / `<< 16`（bit 位）唔屬同一個概念，留 literal 合理。`git grep '\b2\b' webp.ts` 只剩 line 37 doc comment
- **S-862**（`build.py`、`fetch_sources.py`）：`add_argument("--app-root", "--repo", dest="app_root", …)`，`help=argparse.SUPPRESS` 照舊。`Paths.repo` → `app_root`，3 處 caller 全改；`git grep -- --repo` 除 backlog 描述外冇其他文件 / script 引用舊 flag。tests 全部改用 `--app-root`，另加 `test_parse_args_should_keep_repo_as_alias_of_app_root` / `test_repo_flag_should_stay_an_alias_of_app_root` 兩邊 flag 都驗
- **S-864**（`jsonSchemas.ts:1`）：刪 `/ scripts/`；`packages/catalog` 確實冇 `scripts/`，3 個 importer 都係 `*.node.test.ts`
- **S-865**：`constants.py` docstring 拆行、`fetch_sources.py` `main` 同 test setUp 換行；ruff check / format 而家全綠

## 🟡 W-718 `apps/api` 源碼改咗但冇 bump version

- 位置：`apps/api/package.json:4`（仍係 `0.7.2`）；改動喺 `apps/api/src/assets/webp.ts`
- L1：`sw-git-flow` §Version Bump：所有改動（包括 refactor）預設要 bump，唯一例外（修正同一 session 對上一個指令整出嚟嘅 bug）唔成立；commit body 亦冇 `No version bump:` 說明。Review 清單「Version bump」= 🟡（先例：W-712）
- L2：`git diff origin/main...HEAD -- '*/package.json'` 冇輸出；`esbuild webp.ts --format=esm` 新舊對比：多咗 `const UINT16_BYTES = 2;`，3 行改咗（`--minify` 都唔同）。`deploy-api.yml` `paths: apps/api/**` → merge 入 main 會 deploy 一個 bundle 唔同、版本號照舊 `0.7.2` 嘅 Worker
- L3：同 Lane C「build 出嚟唔變 → 唔 bump」嘅先例唔同：今次 Worker bundle 真係變咗，admin pill / 403 頁讀嘅 api 版本會對唔上 deploy 紀錄；backlog line 3 已經記「api 0.7.2 已 deploy」
- 方案 A（推薦）：api PATCH `0.7.2 → 0.7.3`，獨立 commit `fix: W-718 | bump apps/api to 0.7.3`。`git grep 0.7.2 -- apps packages` 只有 `package.json`，冇 hardcode test 要跟改
- 方案 B：唔 bump，喺 commit body / PR description 寫明「純 refactor，行為唔變，不 bump」並由用戶確認例外。Trade-off：慳一個版本號，但違反現行規則，而且 deploy 紀錄同版本號脫鈎

## 🟢 / Observation（入 backlog，唔 block）

- S-890 `apps/api/test/webp.test.ts:16`：VP8 unit test 只用 600×600（闊 = 高），讀錯 `VP8_HEIGHT_OFFSET` 都唔會 fail；而家只靠 `assets.test.ts:46` 嘅 1216×684 route test 間接 cover。可以加一個非正方形 VP8 unit case

## ✅ 做得好嘅地方

- alias 用同一個 `dest`，兩個 script 寫法一致，comment 寫明「app root，唔係 git repo root」
- refactor 冇夾帶行為改動；ruff 舊問題一次清晒

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: "pass (api webp+assets 20; jsonSchemas importers 291; arcCover pytest 42)"
  coverage: "pass (pure refactor; webp.ts changed lines covered by webp.test.ts + assets.test.ts)"
  no_critical: pass
  security_scan: "n/a (no new dependencies)"
next_action: invoke_developer
next_agent: backend-developer
branch: "refactor/misc/S-856_lane-g-misc-code"
context: "Lane G (S-856, S-862, S-864, S-865) 95 pass. Fix W-718 before merge: bump apps/api 0.7.2 -> 0.7.3 (one commit 'fix: W-718 | ...'), Worker bundle changes and deploy-api.yml fires on apps/api/**. New S-890 (non-square VP8 unit test) to backlog. Report committed locally, not pushed."
blockers:
  - "W-718 api version bump (0.7.3) before merge"
```
