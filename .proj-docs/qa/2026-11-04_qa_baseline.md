# QA Baseline — Verification Ledger 初始凍結（S3）

- 日期：2026-11-04｜Commit：`a561a46`（v1.21.10）｜Stage：S3（baseline，初次建立 ledger）
- 環境：cloud sandbox，Node v22.23.4，Playwright 1.63.0，`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`（chromium-1243）
- Plans：`.proj-docs/qa/plans/*.md`（8 條鏈）；Known issues：`.proj-docs/qa/known-issues.md`

## 跑過嘅指令（每個 full suite 只跑一次）

| 指令                                                                                  | 結果                                    | 時間                    |
| ------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------- |
| `npm run lint`                                                                        | pass（ESLint + Prettier）               | 111 s                   |
| `npm test`                                                                            | 170 / 170 files，2095 / 2095 tests pass | 315 s（vitest 312.6 s） |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`                              | 617 / 619 pass，**2 FAIL**，exit 1      | 554 s（含 build）       |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（rerun @ `d6bcf7c`，低負載） | 619 / 619 pass，exit 0                  | —                       |

## Observation

- 第一次跑 2 個 FAIL（`run.mjs`「窄畫面 mini player」291×562 今日節目卡向右拖一半；`touch.mjs` 375×667 播緊時碟自轉）：passed on single rerun at low load; first run had load avg ~13（兩個 full suite 同時跑，4 核）→ 唔開 KI / ticket

## 凍結結果

- 8 / 8 條鏈 FROZEN S3：`pwa-shell` `ui-foundation` `catalog-data` `drama` `mini-player`（@`a561a46`）；`show-today-page` `home` `player-core`（rerun 綠之後補凍結）
- src 檔案全部有 plan 歸屬（UNCOVERED 0）
