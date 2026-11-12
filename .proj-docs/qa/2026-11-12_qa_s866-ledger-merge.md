# QA — S-866 ledger 三方合併工具 + ledger 修復 — 2026-11-12 — S1

- Scope：`scripts/qa/ledger-merge.mjs`（新，ledger-ignore）、`.proj-docs/qa/ledger-ignore`（repo-tooling 鏈）、`.proj-docs/qa/verification-ledger.tsv`（修復）
- SSoT：backlog S-866；`.proj-docs/qa/plans/repo-tooling.md` AC-5（ledger-ignore 令 `impact` 唔再出 UNCOVERED）

## 驗證

| 檢查                                                                                                         | 結果                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 重播 Lane C merge（ours `7236165`、theirs `934a21d`，base `725ae90`），用 `node scripts/qa/ledger-merge.mjs` | exit 0，2120 行，0 重複行；每條鏈每個 stage 行數同 `934a21d` 一樣（例如 catalog-data S1 131 / S3 98）                                                                        |
| 同 `origin/main`（`7a8ca63`）比                                                                              | main 每一行（去重後）都喺結果入面；結果多 228 行 S3（catalog-data 31、drama 22、home 19、mini-player 9、player-core 62、pwa-shell 18、show-today-page 10、ui-foundation 57） |
| 重播 Lane A 第二次 merge（ours `9943058`、theirs `46304bf`）                                                 | exit 1，列出 coming-soon / repo-tooling `package-lock.json` 兩邊都改、都唔啱而家個檔 → 要人手重新 freeze（符合設計，唔會靜靜寫錯）                                           |
| `qa-ledger.sh impact --since origin/main`                                                                    | 只有 `repo-tooling` REVERIFY（`ledger-ignore`）；`scripts/qa/*` IGNORED                                                                                                      |
| root `npm run lint`                                                                                          | pass                                                                                                                                                                         |

## 發現

- `main` 嘅 ledger 喺 PR #213 merge（`2802116`）之後有 228 行重複：當時用嘅一次性合併 script key 只有「chain + path」，冇計 stage，同一個檔嘅 S3 行俾 S1 行蓋咗。今次用修正版（key = chain + stage + path）重做，補返 228 行 S3
- `qa-ledger.sh freeze` 會刪走同一個 chain + stage 嘅全部行再寫；只 freeze 改咗嘅檔會截短條鏈（PR #210 merge 時中過，#211 修返）

## 結論

pass。`repo-tooling` S1 重新 freeze（全部 23 個檔，連 `ledger-ignore`）。
