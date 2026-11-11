# QA — Phase 3c production 回饋修正（api 0.6.0 → 0.6.1）— 2026-11-12 — S1

- Tier: T1（admin UI 修正 + catalog 加一個純函數 + version bump）| Code commit: `cd9c953`（`81bd446` docs、`a316495` S-820 `ci.yml`）| Verdict: ❌ fail（1 個 🟡，CUI-0024）→ re-verify `244ef8a` 後 ✅ pass
- L1：用戶 8 項（派工 SSoT）；review `.proj-docs/reviews/2026-11-12_review_phase3c-prod-fixes.md`（95 pass，W-712）
- Ledger（`impact --since ca8a617`，head `a316495`）：SKIP 8 / REVERIFY 6（admin、api、catalog-data、coming-soon、drama、repo-tooling）/ UNCOVERED 8（6 個 `apps/admin/**` 歸 admin；`packages/catalog/src/scan/example{,.test}.ts` 歸 drama（plan glob `scan/*`））/ IGNORED 3
- 範圍：catalog-data 淨係 `index.ts` 多 export 一個；coming-soon / repo-tooling 因 `package-lock.json`（淨係 api 0.6.1 一行）；`a316495` 再加 `ci.yml` e2e `runs-on: ubuntu-24.04`（repo-tooling）；Plan 更新：`admin.md` 加 AC-13（8 項）+ AC-13 smoke；`drama.md` 加 AC-8（`exampleFileName`）

## Runs

| Command                                                                                                       | Result                                                                                     | Time  |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----- |
| CI run 43074264440 @ `81bd446`（引用）                                                                        | lint、`tsc -b` ✅；**`npm test` ❌ `Brand.test.tsx`**；build / build:admin / E2E skipped   | 5 min |
| CI run 43075649110 @ `a316495`                                                                                | 收尾時 in_progress；E2E `needs: check` → unit 紅就唔會跑，S-820 未有 CI 證據               | —     |
| `npm test -- apps/admin apps/api packages/catalog/src/{scan,schedule,admin,dramas,core,document}`             | 970 pass / **1 fail**（同 CI）                                                             | 31 s  |
| `npm test -- apps/api packages/catalog/src/{scan,dramas,core,document,shows,schedule,date.test.ts}`           | 38 files / 799 pass（api、drama、catalog-data）                                            | 25 s  |
| `npm test`（全部，repo-tooling plan）                                                                         | 328 files / 3501 pass / **1 fail**（同一個 `Brand.test.tsx`，其餘全綠）                    | —     |
| `npx tsc -b`；`npm run lint`                                                                                  | exit 0；exit 0（prettier 全過）                                                            | 1 min |
| `npm run build:admin`；`PW_CHROMIUM_PATH=… npm run e2e:admin`                                                 | JS 430.2 kB（gzip 137.5）；**12 / 12 PASS**（end roller 喺完結框下、實色 pill、檔名例子）  | 21 s  |
| 補充 smoke（scratchpad Playwright + `mockApi.mjs`，劇 / 短篇加 `disc`；script 已刪）                          | 9 / 9 PASS（見下）                                                                         | 40 s  |
| Player `dist`：HEAD vs 還原 `packages/catalog` 嗰 3 個檔（`index.ts`、`scan/index.ts`、刪 `example.ts`）build | 77 檔 sha256 **一樣**（含 `sw.js`）→ player 唔受影響，player e2e 唔使跑                    | 2 min |
| Coverage v8：admin / catalog scan                                                                             | admin lines 84.3%；`example.ts` 100% lines；`SaveBar` 100、`TimeRoller` 100、`thumbs` 84.6 |       |

- 1 Savebar：「已發佈的項目不可刪除。」全句、色 `rgb(217,54,62)` = `--danger`、冇「如需下架」；改欄位後「● 有未儲存的變更」喺儲存掣前（DOM 次序 + x 968–1127 < 1135、同一行）；2 Roller：`e2e:admin` 量完結 roller 喺完結框正下、左對齊；`TimeRoller.test` 綠；3 圖例：全上架 → 上架中 + 拖曳；有下架 + 冇改動 → 上架中 / 已下架 + 拖曳（冇待發佈 / 新）；有新短篇 → 加待發佈 / 新；節目 → 上架中 + 拖曳
- 4 細碟：列表、短篇 tab、排程 chip 都係短篇碟 → 劇碟 → `.thumb.blank`；5 標題碟：有 = 已儲存劇碟 URL；冇 = `.thumb.blank`
- 6 類型鎖住：`.pill.solid`「短篇集」、冇 switch；7 檔名例子：`例：01 - 戀愛二分一.m4a`（e2e）+ `example.test.ts`；8 時間線：綠點 / 日期 / 第一行中心 y 都係 381.4

## Hard Gates

- Tests ❌：`Brand.test.tsx` 1 fail（CI + 本機）→ C-014 / CUI-0024
- Coverage：admin 改動檔 < 80%：`DeleteEntry` 35、`BasicFields` 57、`DramaList` 57、`BasicTab` 75、`ArcCells` 75；行為由 `e2e:admin` + smoke 行過（L2），跟 3b / 3c 做法接受；其他 all pass

## Findings

### 🟡 C-014 Brand.test 仲 pin api 0.6.0 → CUI-0024

- L1：W-712 / `apps/api/package.json` version 0.6.1（`cd9c953`）；Hard Gate「Tests 全綠」
- L2：`npm test -- apps/admin` → `Brand.test.tsx:9` "expected '0.6.1' to be '0.6.0'"；CI 43074264440 同一句
- L3：bump 淨改 `auth.test.ts`，漏咗 `apps/admin/src/app/Brand.test.tsx:9` 嘅 pin（之前 `b906677`、`63eba68` 都有改）；產品正確（pill 顯示 0.6.1）。修 = 改做 `'0.6.1'`

## Re-verify（CUI-0024 修好，`244ef8a`；docs head `5cb6871`）

- `244ef8a` 淨改 `Brand.test.tsx:9` pin → `'0.6.1'`；本機 `npm test -- apps/admin` 49 files / 165 pass；CUI-0024 → completed
- CI run 43076256444 @ `5cb6871`（引用）全綠：lint、`tsc -b`、`npm test`、build、build:admin；E2E job runner label `ubuntu-24.04`，Install Playwright Chromium、`npm run e2e`、`npm run e2e:admin` 全 success → S-820 驗證（repo-tooling `ci.yml`）
- Freeze：第一輪 ✅ `api` 96、`drama` 168、`catalog-data` 131、`coming-soon` 162 檔 freeze S1 @`a316495`（改動同 `Brand.test.tsx` 無關）；之後 `impact` drama 仍 REVERIFY 只因舊 **S3** 行（143 STALE，留畀下次 S3）；re-verify 後 S1 @`5cb6871`：`admin` 203 檔（加 6 個新 test / `legendModel.ts`）、`repo-tooling` 22 檔；`impact` 而家淨係 drama 舊 S3 行（143 STALE）

## 建議補測

- none（`DeleteEntry` / list 嘅 unit 屬舊缺口，已由 smoke 證行為）

```handoff-receipt
status: pass
stage: S1
chain: admin, api, drama, catalog-data, coming-soon, repo-tooling
commit: 5cb6871
tickets: CUI-0024 (completed)
next_action: main_agent_commit_qa_docs_then_merge
context: "Phase 3c prod fixes S1 pass after re-verify. 8 user items PASS (e2e:admin 12/12, smoke 9/9, unit). C-014/CUI-0024 fixed in 244ef8a (Brand.test pin 0.6.1): local npm test -- apps/admin 49 files/165 pass; CI 43076256444 @5cb6871 all green incl. E2E on ubuntu-24.04 (npm run e2e + e2e:admin) -> S-820 verified. Frozen S1: admin, repo-tooling @5cb6871; api, drama, catalog-data, coming-soon @a316495. impact now only shows drama's old S3 rows (143 STALE, next S3). QA docs not committed."
```
