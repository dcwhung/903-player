# QA — P2 publish serialisation (AU-018, Lane G) — 2026-11-22 — S1

- Tier: T1（api 0.14.1 PATCH + admin 0.10.1 PATCH）| Commit: `68b8e257`（code `95cb5dbf`）| Verdict: ✅ pass
- Ledger（`impact --since 82f25ed2`）：SKIP 11 / REVERIFY 4（`admin` `api` `coming-soon` `repo-tooling`）/ UNCOVERED 1（`apps/api/test/publishSerialisation.test.ts` → 加入 `api` 鏈）
- Plans：`.proj-docs/qa/plans/api.md` AC-36、`.proj-docs/qa/plans/admin.md` AC-38（新增）；`coming-soon` / `repo-tooling` 淨係 `package-lock.json` 嘅 admin / api `version` 兩行（diff 已核）

## Runs

| Command                                                                                                 | Result                                         | Time  |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----- |
| `npm run lint`                                                                                          | exit 0                                         | —     |
| `npx tsc -b` / `npm run typecheck -w apps/api`                                                          | exit 0 / exit 0                                | —     |
| `npm test`                                                                                              | 538 files / 5734 passed，exit 0                | 226 s |
| `npm run test -w apps/api`（workerd + scripts）                                                         | 29 files / 475 + 1 file / 40，exit 0           | 24 s  |
| `vitest run test/publishSerialisation.test.ts`（head）                                                  | 14/14                                          | —     |
| 同一個 test 放落 base source（`git archive 82f25ed2`，scratch copy）                                    | 9 fail / 5 pass，exit 1（見下）                | —     |
| base 再改 2 個重疊 case 嘅 `toBeInstanceOf(PublishConflictError)` → `toBeDefined()`                     | 2/2 fail：`expected undefined to be defined`   | —     |
| `PW_CHROMIUM_PATH=… E2E_PORT=4398 npm run e2e:admin`                                                    | 62 PASS / 0 FAIL，exit 0（一次過，冇 timeout） | —     |
| scratchpad `conflictSmoke.mjs`（`mockApi.mjs` + `page.route` 409 publishConflict，preview 同一個 dist） | 5/5 PASS，exit 0                               | —     |

- Base 上 fail 嘅 case（證新 test 真係捉到競態）：重疊 publish 兩個都落地（輸家 `error` = undefined）、冇 R2 object 嘅首次重疊、舊 base 照寫（`promise resolved … instead of rejecting`）、`insertPublish` 撞 base 照插、API 輸家 `200`（應 `409`）、crash 後誤報 `unchanged`、restore vs publish 兩個次序 + 選擇發佈拎走短篇（W-870 / W-871）三個 `expected 200 to be 409`
- Base 上照 pass 嘅 5 個係非競態對照（base 相同時照插、略過 failed 行、R2 有最新就 `unchanged`、R2 寫失敗之後唔擋、冇人發佈時還原照得）
- `conflictSmoke.mjs` 頭兩次 FAIL 係 script 自己錯（alert 字比較用 `===` + `trim`、URL 用 `endsWith('/publish')` 但有 `?selection=`），改 script 之後同一個 build 5/5；產品冇改

## Browser checks（admin，1280×860，淺 + 深）

- 發佈頁 409 publishConflict：留喺 `/publish`、alert =「內容已於其他視窗或裝置變更，以下已更新為最新的變更，請檢查後再次發佈。」、冇「發佈失敗」、`GET /api/changes` 4 → 6（重讀摘要）、mock 冇記錄發佈；再撳「發佈」→ 去「發佈 / 部署」、發佈 1 次
- 412 版本守衛（`saveElsewhere`）照舊：同一個提示、冇發佈、再撳先發佈（`e2e:admin`「publish guard」亦 PASS）
- 記錄頁「還原至 #2」→ 確認 → 409：alert =「另一次發佈或還原剛剛完成或仍在進行，本次還原未能完成，請稍後再試。」（書面語），冇出 server 英文訊息，記錄重讀 1 次；200 / 200 `unchanged` 都冇 alert
- 截圖（scratchpad，唔 commit）：`publish-409-conflict-{light,dark}.png` `history-409-rollback-conflict-{light,dark}.png`

## Hard Gates

all pass（Coverage：新 / 改 src 由 14 個專門 case + 原有 publish / rollback test 覆蓋；冇 PWA / player 改動，PWA gate n/a）

## Findings

- 冇 🔴 / 🟡
- Observation：真 Cloudflare R2 條件寫入（`onlyIf` etag / `If-None-Match: *`）同真 D1 並發只喺 miniflare / workerd 驗過，production 行為 = deploy 後 S2

## 建議補測

- none（併發 case 已齊：重疊 publish、首次冇 object、crash 後唔 `unchanged`、restore vs publish 兩個次序、選擇發佈拎走短篇）

## Freeze（S1，chain + stage + path 同 base ledger 比，冇少行）

- `admin` 483 → 483、`api` 160 → 161（+`publishSerialisation.test.ts`）、`coming-soon` 163 → 163、`repo-tooling` 51 → 51
- 其餘 STALE 只剩 S3 行（release 範圍，唔屬今次）

```handoff-receipt
status: pass
stage: S1
chains: admin, api, coming-soon, repo-tooling
commit: 68b8e257
next_action: main_agent_merge
context: AU-018 publish serialisation verified; real R2/D1 concurrency = post-deploy S2
```
