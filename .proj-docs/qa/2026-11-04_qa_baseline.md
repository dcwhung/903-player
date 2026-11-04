# QA Baseline — Verification Ledger 初始凍結（S3）

- 日期：2026-11-04｜Commit：`a561a46`（v1.21.10）｜Stage：S3（baseline，初次建立 ledger）
- 環境：cloud sandbox，Node v22.23.4，Playwright 1.63.0，`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`（chromium-1243）
- Plans：`.proj-docs/qa/plans/*.md`（8 條鏈）；Known issues：`.proj-docs/qa/known-issues.md`

## 跑過嘅指令（每個 full suite 只跑一次）

| 指令                                                     | 結果                                    | 時間                    |
| -------------------------------------------------------- | --------------------------------------- | ----------------------- |
| `npm run lint`                                           | pass（ESLint + Prettier）               | 111 s                   |
| `npm test`                                               | 170 / 170 files，2095 / 2095 tests pass | 315 s（vitest 312.6 s） |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e` | 617 / 619 pass，**2 FAIL**，exit 1      | 554 s（含 build）       |

## E2E FAIL（未登記 KI，冇重跑：full suite 限跑一次，harness 冇單 section runner）

1. `run.mjs`「窄畫面 mini player」：`291×562 今日節目卡向右拖一半：後面嗰張卡見到節目名（opacity 0.00）`（向左嗰個 pass）
2. `touch.mjs`「真手指 touch」：`375×667 觸控今日節目頁：播緊時碟自轉（animation-play-state paused）`

- L2 只有一次執行；跑嗰陣 4 核 load average 約 13，可能係時序 flake，但未重現 / 未證實 → 唔當 KI，唔凍結相關鏈
- 相關實作：`src/pages/TodayPlayerColumn.tsx` + `src/components/ShowCardStack/`、`src/components/PlayerPanel/useGaugeGestures.ts`（`player.isAudible`）+ `src/components/Disc/`

## 凍結結果

| Chain                                                                                       | 結果                                          |
| ------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `pwa-shell` `ui-foundation` `catalog-data` `drama` `mini-player`                            | FROZEN S3                                     |
| `show-today-page`（Disc / 今日節目頁）、`home`（ShowCardStack）、`player-core`（isAudible） | **唔凍結**：上面 2 個 e2e FAIL 落喺佢哋 scope |

- 下一步：喺乾淨負載下重跑一次 `npm run e2e`；兩個都綠 → 按 plan freeze 嗰 3 條鏈；仲 fail → 開 CUI ticket
- src 檔案全部有 plan 歸屬（plan 層面 UNCOVERED 0）；未凍結 3 條鏈獨有嘅 155 個 src 檔喺 `impact` 會顯示 UNCOVERED（ledger 而家有 5 條鏈、394 行）
