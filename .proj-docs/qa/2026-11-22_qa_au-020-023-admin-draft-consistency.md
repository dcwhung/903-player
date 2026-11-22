# QA — AU-020–AU-023 Admin 草稿一致性 — 2026-11-22 — S1

- Tier: T2（MINOR：admin 0.10.0 + api 0.14.0，跨 admin / api）| Commit: `31a002f`（branch `fix/admin/au-020-023_draft-consistency`，未 push）| Verdict: ✅ pass
- Ledger（`impact --since 9ab781b` = merge-base `origin/main`）: SKIP 11 / REVERIFY 4（admin、api、coming-soon、repo-tooling）/ UNCOVERED 13（11 個歸 admin、2 個歸 api）/ IGNORED 3；S1 freeze 後仍列 4 條 REVERIFY 只因 S3 行 STALE，留俾下次 release S3
- Plan：`.proj-docs/qa/plans/admin.md` 新增 AC-37、`.proj-docs/qa/plans/api.md` 新增 AC-35；coming-soon / repo-tooling 沿用（淨係 `package-lock.json` 嘅 admin / api workspace version，由 lint / `tsc -b` / `npm test` 證）；Review: `.proj-docs/reviews/2026-11-22_review_p1-admin-draft-consistency.md`（S-1431–S-1436 已關）

## Runs

| Command                                                                                         | Result                                                                               | Time         |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------ |
| `npm run lint`                                                                                  | exit 0                                                                               | 67 s         |
| `npx tsc -b`                                                                                    | exit 0                                                                               | 40 s         |
| `npm test`（root，全部 projects）                                                               | 535 files / 5668 tests 綠                                                            | 436 s        |
| `npm run test -w apps/api`（workerd + scripts）                                                 | 28 files / 461 + 1 file / 40 綠                                                      | 33 s         |
| `npm run e2e:admin`（內置 Chromium，冇用 `PW_CHROMIUM_PATH`）                                   | 第 1 次 61 / 62（「keyboard drag reorder saves on drop」timeout）；重跑 1 次 62 / 62 | 169 s + 96 s |
| changed-file coverage（v8；`apps/admin` 同 `apps/api` 各跑，`--coverage.include=src/…`）        | admin lines 97.09%（每個檔 ≥ 88%，`main.tsx` 入口除外，由 e2e 行）；api lines 97.32% | 3 min        |
| scratchpad Playwright（`vite preview` 出 `dist` + `mockApi.mjs`，deviceScaleFactor 1）          | 11 個情境全過，20 張截圖（淺 + 深）                                                  | 2 min        |
| 舊 code 對照：scratch copy（`git archive HEAD`）將改過嘅 `src` 換返 `origin/main` 版本跑新 test | admin 26 個 test 紅 + 2 個檔 import 唔到；api 9 個 test 紅                           | 1 min        |

- Player e2e / `e2e:visual` 冇跑：`git diff --stat 9ab781b HEAD` 冇 `apps/player` / `packages/catalog` 檔；S1 只跑 REVERIFY 鏈 plan 列明嘅指令（`sw-validation-gate` §2），player 嗰啲鏈全部 SKIP（frozen, untouched）；`e2e:visual` 係 player viewport 嘅「現有裝置零改變」，admin / api 改動唔入佢範圍

## Scenarios（→ 證據；browser = scratchpad Playwright）

- AU-020：browser 兩個 tab —— B 喺短篇分頁鍵盤拖「戀愛二分一」落一格並儲存；A（之前開、改咗簡介）上載碟面 → `PUT 412 → GET → PUT 200`，儲存列「有未儲存的變更（簡介）」，再儲存後 server 次序仍係 B 嘅 `lancy-02,half,love-after`、簡介同碟面都喺度。Unit：`useEntryEditor.test.tsx`「rebasing the draft after a 412 retry」3 個、`entryDraft.test.ts`「rebaseDraft」+「should keep a locally removed field removed over a rescan result」
- AU-022：browser —— dialog「刪除排程？／只會刪除排程規則，各集已設定的上架及下架日期維持不變。」掣「取消」「刪除」，focus 開喺「取消」，Esc / 取消都冇 DELETE，focus 返「刪除排程」；確認後 DELETE 1 次、`GET /api/todos` 重讀、nav「更新 1」變冇數字；草稿有改動時「刪除」disabled + 提示；配對 disabled + 提示、冇 POST。Unit：`unsavedReload.test.tsx` 5 個、`ArcSchedule.test.tsx`
- AU-021：browser —— 冇變：POST 帶 `fingerprint`、發佈成功；另一邊儲存咗：`POST 412`、冇 publish、留喺 `/publish`、提示「…以下已更新為最新的變更，請檢查後再次發佈。」、摘要重讀，再撳 `200`；重讀失敗：「…未能載入最新的變更…」+「重新載入」、發佈掣 disabled，重新載入期間出「正在載入最新的變更…」，成功後可發佈；selection 過時：淨係出過時提示。e2e「publish guard」；unit `PublishPage.test.tsx`（version guard 3 + S-1433 / S-1436 4）、`publishEndpoints.test.ts`；API `publishFingerprint.test.ts` 9 個（包括「no fingerprint … (old behaviour)」）+ `selectivePublish.test.ts` 3 個；rollback：`rollback.ts` 冇改、原有 api rollback test 同 e2e 記錄頁 check 照綠
- AU-023：browser —— 冇改動：側欄直接走；有改動：麵包屑 / 側欄 / 上一頁（節目編輯頁）出「放棄未儲存的變更？／此頁有未儲存的變更，離開後將會遺失。」，focus 開喺「留下」、Tab 喺「留下」「離開」循環、Esc = 留喺度草稿仲喺；配色 / 基本資料分頁唔問；儲存後離開唔問；由待辦入、改 ID 欄後「儲存並返回待辦」直接返 `/`。e2e 3 個「leave guard」（reload 嘅 `beforeunload` 淨係有改動先出、App 外觀「名稱與簡介」）+「rename drama ID」3 個（改 ID 後自己跳轉冇被擋）；unit `LeaveGuard.test.tsx`、`leaveGuardEditors.test.tsx` 10 個、`TextCard.test.tsx`、`RouteError.test.tsx`
- 文字：`writtenChinese.test.ts` 綠；截圖入面每句都順（見 Observation 一條）。減少動態：diff 冇 `.css` 檔，dialog / 提示沿用 `ConfirmDialog`、`.note`；`reducedMotion: reduce` 下 `.scrim` / `.card` `animation-name` = none，dialog 即開即關

## Hard Gates

all pass（Coverage 見上；Security / Data：fingerprint 過時 = 412、乜都唔寫，由 workerd test 證；PWA gate no；Performance：`/api/changes` / `/api/publish` 多一次 sha256，冇新 query，n/a）

## Findings

冇三層收斂嘅 🔴 / 🟡；Observation（唔 block）：

- `e2e:admin`「keyboard drag reorder saves on drop」第 1 次 timeout（等唔到「已更新次序」），重跑 62 / 62；同一個步驟喺 scratchpad 連做 5 次都過。呢個 check 靠固定 200 ms 嘅按鍵間隔，diff 冇掂廣播劇列表；未登記 KI（只中過一次）
- 412 重讀失敗嗰款：黃色提示下面同時有紅色「載入失敗：boom」同一張「沒有需要發佈的變更。」卡（原有嘅載入失敗畫面）；發佈掣係 disabled，但嗰句會令人以為冇嘢要發佈
- 截圖只存 scratchpad，冇入 repo

## Freeze

S1 @ `31a002f`：`admin` 472 → 483（+11 新檔）、`api` 158 → 160（+2）、`coming-soon` 163 → 163、`repo-tooling` 51 → 51；每條都畀晒成條 chain + stage 嘅檔；同 `origin/main` 比對 chain + stage + path：少 0 行、多 13 行（就係上面 13 個新檔），冇重複；其餘鏈同全部 S3 行逐 byte 冇變（4319 → 4332 行）

## 建議補測

none — 每個 AU 嘅核心 case 喺舊 code 都會紅，no edge case gap

```handoff-receipt
protocol: 1
status: pass
stage: S1
chain: admin, api, coming-soon, repo-tooling
commit: 31a002f
ci_run: n/a
next_action: merge_ready
branch: "fix/admin/au-020-023_draft-consistency"
context: "AU-020..AU-023 S1 pass at 31a002f: lint / tsc / npm test 5668 / api 461 + 40 green; e2e:admin 61/62 then 62/62 on the one allowed rerun (keyboard drag reorder timing, untouched by the diff, 5/5 in a scratch probe); changed-file coverage admin 97.09% / api 97.32% lines; real-browser scenarios for all four AUs pass with light + dark screenshots in scratchpad; new tests fail on origin/main sources (admin 26 + 2 import errors, api 9); player e2e / visual not required (no player / catalog change); 4 chains frozen S1 with full lists, 0 rows lost vs origin/main, 13 new rows; observations: one e2e flake, wording of the failed re-read screen; branch not pushed, no CI run yet"
```
