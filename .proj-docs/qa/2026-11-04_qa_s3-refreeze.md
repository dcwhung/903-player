# QA — S3 re-freeze（merge main v1.21.11 → 1.21.12）

- 日期：2026-11-04｜Stage：S3（PR re-baseline，唔係 release）｜Tier：T1（PATCH，CSS token + 1 個新 node test + e2e check，冇 JS 邏輯改動）
- Commit：`cdb5263`（branch `claude/youthful-tesla-5ktxms`，merge 入 main 嘅 P0 3a tag pill；version 1.21.12）
- 本機冇跑任何 suite：同一個 SHA 嘅 CI 已綠，按 S3 規則引用

## Ledger 摘要（`impact --since d6bcf7c`）

- SKIP 6（`catalog-data` `drama` `mini-player` `player-core` `pwa-shell` `show-today-page`）｜REVERIFY 2（`home` `ui-foundation`）｜IGNORED 7（docs）
- UNCOVERED 4：`src/components/HomePlayerCard/homePlayerCardTag.node.test.ts`（新檔，符合 `home` glob `src/components/Home*/*` → 加入 `home` scope）；`e2e/homeWide.mjs`（`home` plan Commands 已列，屬 e2e 入口，唔入 scope）；`package.json` / `package-lock.json`（只改 version）
- Plan 改動：`plans/home.md` scope 84 → 85、vitest 加 `src/components/HomePlayerCard/`（25 → 26 個 test 檔）；`plans/ui-foundation.md` 冇改（`src/styles/tokens.css` 已喺 scope）

## CI 證據（SHA `cdb526339713384728666ef95e89187b0220aefa`）

| Run                                                                                   | Event        | Lint, unit & build | E2E (Playwright) |
| ------------------------------------------------------------------------------------- | ------------ | ------------------ | ---------------- |
| [41842642735](https://github.com/dcwhung/903-player/actions/runs/41842642735)（引用） | pull_request | success            | success          |
| 41842356699                                                                           | push         | success            | success          |

## Findings

- 冇（L1 / L2 / L3 冇任何一層指向問題；CI 全綠 = L2 pass）

## Observation

- CI 喺同一個 SHA 跑咗兩次（`push` + `pull_request`）：`ci.yml` 對非 main push 同 PR 都觸發，重複用 runner；唔 block，唔開 ticket

## 凍結結果

- `freeze home S3` + `freeze ui-foundation S3` @ `cdb5263` → `status` 8 / 8 FROZEN
