# QA — 9d sync main（PR #288）— 2026-11-19 — S1

- Tier: T1（merge `origin/main` v2.0.1 #285 + v2.0.2 #286 入 `release/v2.1.0`，加刪一條失效 CSS 規則）| Commit: `2fd49c90`（merge `9250cdc6`）| Verdict: ✅ pass
- Ledger（base = merge-base origin/main `9b59ed24`）: SKIP 4 / REVERIFY 10 / UNCOVERED 0 / IGNORED 13
- REVERIFY 10 條入面，逐個改動檔同 ledger 對 hash：除咗下面 8 行，其他改動檔喺各自 chain 嘅 S1 都已經係當前 hash（v2.0.1 / v2.0.2 喺 main 嘅 S1 freeze 經 `ledger-merge.mjs` 帶咗入嚟）；淨低 REVERIFY 係 S3 行（release 前 S3 處理），#285 / #286 新檔全部已入鏈
- 要重驗嘅 8 行（5 條鏈 S1）：
    - `ledger-merge.mjs` 冇寫入：coming-soon + ui-foundation 嘅 `src/i18n/zh-HK.ts`（加 `homeCard.reopenPlaying`）、`src/styles/tokens.css`（刪 `--list-sheet-height`、加 `--square-sheet-max-height`）；drama + show-today-page 嘅 `e2e/squareDrama.mjs`（表 75% / 480px 置中、每日劇 banner）
    - mini-player：`SleepTimerSheet.module.css`（刪 HomeView `.overlay[data-side='true']` 規則）、`sleepTimerStyles.node.test.ts`（鎖住冇呢條規則）
- 抽查：`--list-sheet-height` 喺 `apps/player/src` 冇人用（`squareSheetSize.node.test.ts` 鎖）；`--square-sheet-max-height` 由 `ListSheet` / `ArcSheet` 用；`reopenPlaying` 由 `HomePlayerHandle.tsx` 用

## Runs

| Command                                                                                                        | Result                                     | Time |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---- |
| `npm test -- <plans/ui-foundation.md Commands>`                                                                | 318 / 318（53 files）                      | 9 s  |
| `npm test -- <plans/coming-soon.md Commands>`                                                                  | 914 / 914（85 files）                      | 32 s |
| `npm test -- <plans/drama.md Commands>`                                                                        | 682 / 682（56 files）                      | 18 s |
| `npm test -- <plans/show-today-page.md Commands>`                                                              | 475 / 475（42 files）                      | 15 s |
| `npm test -- <plans/mini-player.md Commands>`                                                                  | 162 / 162（14 files）                      | 4 s  |
| mini-player AC-4 `npm test -- src/components/shared/player/SleepTimer/`                                        | 51 / 51                                    | —    |
| drama AC-18 `npm test -- src/pages/drama/ src/components/pages/drama/ …/ListSheet/ src/hooks/useListSheet`     | 227 / 227                                  | —    |
| ui-foundation AC-4 `npm test -- …/postcssDuoLandscape …/src/styles/ …/testMediaQuery …/HomePage.test`          | 233 / 233                                  | —    |
| show-today-page AC-9 `npm test -- …/ListSheet/ src/hooks/useListSheet src/pages/show/ …/Sheet/ …/EpisodeList/` | 189 / 189                                  | —    |
| CI `ci.yml` run [44616234005](https://github.com/dcwhung/903-player/actions/runs/44616234005) @ `2fd49c90`     | success（changes / lint+unit+build / E2E） | —    |

- e2e（`squareDrama.mjs` 經 `square.mjs`、`sleepTimer.mjs`、`duo.mjs` 等）：本機唔跑，引用上面 CI 同 SHA run
- Developer 數字（引用，冇重跑）：`npm test` 5371、full e2e 1137 / 0 @ `9250cdc6`、`e2e:visual` vs main 174 / 234 全部喺 9d 准許範圍

## Hard Gates

all pass（改動檔係 CSS / i18n 字串 / test，冇新邏輯；PWA gate 唔適用：冇掂 `sw.js` / manifest / 更新邏輯 / build）

## Findings

- 冇 🔴 / 🟡 / 🟢

## 建議補測

- none（刪規則已由 `sleepTimerStyles.node.test.ts` 鎖；sheet 尺寸由 `squareSheetSize.node.test.ts` + `squareDrama.mjs` 覆蓋）

## Freeze

- 5 條鏈 S1 重新 freeze（成條 chain + stage = ledger 現有行 + 上面 8 行嘅 path）；同兩邊 parent（`dd537084` / `9b59ed24`）比對 chain + stage + path 冇少行：冇少行（只加返 6 行；coming-soon 163、ui-foundation 130、drama 232、show-today-page 215、mini-player 113）；之後 `status` 除 S3 外全部 FROZEN

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: coming-soon / ui-foundation / drama / show-today-page / mini-player S1 re-frozen (full chain + stage; +6 rows dropped by ledger-merge.mjs, 2 mini-player rows updated for 2fd49c90); other REVERIFY only S3 rows
tickets: none
ci: 44616234005 @ 2fd49c90 (success, incl. E2E)
next_action: main agent proceeds to merge PR #288 (QA commit pushed with 9816de4b)
context: T1, 0 findings, no new IDs used (CUI-0046–0048 / S-1280–1289 free); e2e cited from CI, not re-run
```
