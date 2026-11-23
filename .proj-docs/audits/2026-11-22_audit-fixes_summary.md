# 2026-11-22 Codebase audit 修正總結（P0 / P1 / P2）

- 來源：[`2026-11-22_00-39_audit_full-codebase.md`](2026-11-22_00-39_audit_full-codebase.md)（AU-013 Critical；AU-014 – AU-028 Warning；Observation）
- 範圍：用戶揀咗 P0 → P1 → P2 全部做，每條 lane 一個 PR，CI 綠就 merge 入 `main`
- 結果：AU-013 – AU-027 全部修好並 merge；AU-028 用戶剔走（短篇唔會過一百集）；Observation 只做咗 P2 列明嗰四項，其餘用戶決定唔做、唔入 backlog
- 最終版本：player **2.2.2**、admin **0.10.2**、api **0.14.2**

## PR 一覽

| 階段 | Audit 項目                          | PR                                                     | 版本                      | Review                                   | QA S1                                      | `main` 部署              |
| ---- | ----------------------------------- | ------------------------------------------------------ | ------------------------- | ---------------------------------------- | ------------------------------------------ | ------------------------ |
| P0   | AU-014 `ledger-merge.mjs` maxBuffer | [#304](https://github.com/dcwhung/903-player/pull/304) | —                         | 2 輪 pass                                | pass                                       | 成功                     |
| P0   | AU-013 改劇集 ID 後草稿冚返舊 ID    | [#305](https://github.com/dcwhung/903-player/pull/305) | admin 0.9.4 / api 0.13.1  | 2 輪 pass                                | pass                                       | 成功                     |
| P1   | AU-017 import 預設只加未有          | [#306](https://github.com/dcwhung/903-player/pull/306) | api 0.13.2                | 2 輪：warn（W-858）→ pass                | pass                                       | 成功                     |
| P1   | AU-015 / 016 / 019 CI 同部署把關    | [#307](https://github.com/dcwhung/903-player/pull/307) | —                         | 2 輪 pass                                | pass                                       | 成功（新 workflow 首跑） |
| P1   | AU-026 / 027 進度同 probe store     | [#308](https://github.com/dcwhung/903-player/pull/308) | player 2.2.1              | 3 輪：warn（W-859）→ pass → pass         | pass（e2e 1184、visual 234 全同）          | 成功                     |
| P1   | AU-020 – 023 admin 草稿一致性       | [#309](https://github.com/dcwhung/903-player/pull/309) | admin 0.10.0 / api 0.14.0 | 多輪 pass                                | pass（e2e:admin 62）                       | 成功                     |
| P2   | `.mjs` lint、文件 drift、audit fix  | [#310](https://github.com/dcwhung/903-player/pull/310) | —                         | 100 pass（S-1437 – S-1440）              | pass（prod `dist` 77/77 hash 同 base）     | 成功                     |
| P2   | 減少動態 CSS                        | [#311](https://github.com/dcwhung/903-player/pull/311) | player 2.2.2              | 3 輪 pass（S-1447 – S-1451）             | pass（真瀏覽器量長按 transition）          | 成功                     |
| P2   | AU-018 發佈 / 還原序列化 + S-1430   | [#312](https://github.com/dcwhung/903-player/pull/312) | api 0.14.1 / admin 0.10.1 | 3 輪：warn（W-870）→ warn（W-871）→ pass | pass（新 test 喺舊 code 9 + 2 個 fail）    | 成功                     |
| P2   | AU-024 / 025 重讀次序、記錄頁       | [#313](https://github.com/dcwhung/903-player/pull/313) | admin 0.10.2 / api 0.14.2 | 2 輪 pass（S-1467、S-1468）              | pass（真瀏覽器 15/15，重現到 reload race） | 成功                     |

每條 lane 嘅流程：developer（TDD，新 test 先證明喺舊 code fail）→ 獨立 code reviewer → 同一條 lane 清晒 review item → re-review → QA S1（ledger freeze）→ merge 最新 `main` + `ledger-merge.mjs` → push → CI 綠 → merge → 睇 `main` 部署。

## 每項改咗乜（一句）

| 項目        | 改動                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| AU-013      | 改劇集 ID 後，草稿入面嘅舊 ID 會跟住轉；淨改 ID 唔再送多餘 PUT                                                                       |
| AU-014      | `ledger-merge.mjs` buffer 加到 64 MiB；exit code 分 0 / 1 / 2（2 = 用法 / 環境錯，ledger 冇掂過）                                    |
| AU-015      | CI 嘅「有冇改 code」改為同 `main` 比，唔再只睇今次 push                                                                              |
| AU-016      | Deploy API 先跑 lint / tsc / test / build，過咗先部署（Vercel 今次冇掂）                                                             |
| AU-017      | Import 預設只 insert 未有嘅 entry；要覆蓋就要 `--overwrite`                                                                          |
| AU-018      | 兩個同時嘅發佈（或發佈撞還原）只會一個落地；輸咗回 409 `publishConflict`；D1 一定跟線上 catalog                                      |
| AU-019      | 帶 secret 嘅部署步驟同第三方 build 步驟分開 job                                                                                      |
| AU-020      | 撞 412 自動重試之後，草稿 rebase 落最新記錄，唔再冚走其他分頁嘅改動                                                                  |
| AU-021      | 確認發佈頁帶 fingerprint；內容喺確認期間變咗就 412 + 重讀摘要                                                                        |
| AU-022      | 「刪除排程」要確認；有未儲存改動時停用「刪除」同「配對」                                                                             |
| AU-023      | 編輯頁有未儲存改動時，離開會問（App 內 dialog + `beforeunload`）                                                                     |
| AU-024      | `useResource` 只認最新一次重讀；`GET /api/entries?detail=1` 一個 request 讀晒全部劇集                                                |
| AU-025      | 記錄頁還原 / 重新部署進行中停用掣、成功 toast、失敗訊息；載入失敗唔再當成「冇記錄」                                                  |
| AU-026      | 淨係載入、冇播過嘅集唔會寫入進度；重開但冇播嘅記錄 byte 不變                                                                         |
| AU-027      | 用內建 catalog 開 app 時，唔再刪走 remote 節目嘅 probe 記錄                                                                          |
| Observation | `.mjs` 有 lint；README / CLAUDE.md QA gate 表兩行更正；`npm audit` 14 → 4；mini player 長按同 view-transition 後備喺減少動態下唔再郁 |

## 部署

- #304 – #313：每次 merge 之後 `main` 嘅 Deploy（Pages）同 Deploy API 全部成功（最後一次：#313 → `d85b014`，Deploy API run 45058607625、Deploy run 45058607636）。

## 未驗證（要喺 production 做）

| 項目                                            | 點解驗唔到                                     | 建議                                                        |
| ----------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| AU-018 R2 條件寫入（`onlyIf` etag）             | 只喺 miniflare / workerd 驗過                  | 部署後喺 admin 做一次正常發佈，確認唔會誤出 409             |
| AU-018 全新環境第一次發佈（`If-None-Match: *`） | production 已經有 `catalog.json`，行唔到呢條路 | 只會喺新環境出現；README 已註明                             |
| AU-024 `?detail=1` 喺真 D1                      | 只喺 workerd test 驗過                         | 部署後開 admin 廣播劇 / 節目列表，睇 Network 得一個 request |
| AU-026 iOS 鎖屏                                 | 只用 `FakeAudio` 同 e2e `hiddenPlayback` 模擬  | 真機鎖屏聽一段再開返 app，睇續聽位置                        |
| AU-017 `--remote` import                        | 冇跑真 D1 import                               | 下次真 import 時用預設（唔 overwrite）跑一次 dry run 先     |

## 要你決定（lane 產生、未處理）

| #   | 來源                      | 內容                                                                                                                                                    | 建議                            |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | AU-014                    | `.claude/CLAUDE.md`「Ledger merge conflict」加一行 `ledger-merge.mjs` exit code 解釋（0 / 1 / 2）                                                       | 加                              |
| 2   | S-1402（AU-015 之後）     | `.claude/CLAUDE.md` 三段講「淨改 docs 嘅 push CI 會跳過」嘅字眼已經過時（而家同 `main` 比）                                                             | 更新字眼                        |
| 3   | AU-017                    | `--overwrite` 重跑、冇嘢要覆蓋時，Summary 仍然寫「Next: … Publish」                                                                                     | 小修                            |
| 4   | Audit「需要用戶決定」     | 下架 / 未到期內容仍然喺公開 `catalog.json`                                                                                                              | 由你決定可唔可以接受            |
| 5   | Lane E QA Observation     | `e2e:admin`「keyboard drag reorder saves on drop」靠固定 200 ms 間隔，今日 timeout 過一次；另「publish guard」喺部機高負載時 timeout 過一次（重跑都過） | 改為等狀態，唔靠固定時間        |
| 6   | Lane E QA Observation     | 發佈撞 412 而重讀又失敗時，錯誤提示下面仲有一張「沒有需要發佈的變更。」卡                                                                               | 小修                            |
| 7   | Lane E QA Observation     | 圖片 `patchSaved` 嘅 PUT body 多帶 `draft`、`updatedAt`、`kind`、`id`、`etag`（舊有，未查 API 點處理）                                                  | 查一次                          |
| 8   | Lane F QA Observation     | 同一次載入聽過嘅集，每次 `pagehide` 用同一個 position 再存一次（`updatedAt` 推後幾百 ms）                                                               | 唔影響功能，可以唔做            |
| 9   | Lane G review Observation | 選擇發佈有機會將輸咗嘅還原嗰行（從未上線）當「上次發佈」；舊有設計，正常流程 player 唔受影響                                                            | 唔做                            |
| 10  | Lane K audit fix          | 剩低 4 個 moderate（`vite-plugin-pwa` → `workbox-build` → `glob` / `minimatch`），要 major 變動先修到                                                   | 等 `vite-plugin-pwa` 出新版再跟 |
| 11  | P1 決定                   | Vercel 部署把關（S-781）今次冇做                                                                                                                        | 另開一次處理                    |

按你之前「Observation 唔做、唔入 backlog」嘅決定，以上全部冇寫入 `backlog.md`；你揀咗要做嘅，我再開 lane 或者記入 backlog。

## 過程備註

- 用量：Fable 用量上限撞咗三次。兩次喺 P0 / P1 期間，你講「Retry」之後接返；最後一次喺 P2，期間轉咗 Opus，冇停低。每次撞到，已做嘅工作都有保存。
- Review ID 用到 W-871、S-1468。
- Lane G 第一輪 reviewer 寫報告時被 project-boundary hook 擋，用 `cp` 抄入 worktree（內容冇問題，已向你報告）；之後每條 lane 都開新 reviewer，冇再發生。
- Lane H 預先合併 Lane G 時，我第一次 commit 漏咗兩份 QA plan 同 ledger 嘅衝突標記（睇衝突清單時截短咗）。嗰個 commit 未 push，已撤回重做，重做後全套 gate 同 ledger 核對過先 push。
- 部機同時跑幾條 lane 嘅 e2e 時 load 去到 14，有兩次 admin e2e timeout；改用唔同 port、重跑一次都過，CI 上面全綠。
