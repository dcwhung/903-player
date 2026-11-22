# QA — AU-013 改劇集 ID 之後儲存（短篇 ID）— 2026-11-22 — S1

- Tier: T1（PATCH：admin 0.9.4、api 0.13.1）| Commit: `cad4868`（branch `fix/admin/au-013_rename-arc-ids`，未 push）| Verdict: ✅ pass
- Ledger（`impact --since e800401` = merge-base `origin/main`）: SKIP 9（ambient、bookmark、card-zoom、home、mini-player、player-core、pwa-shell、show-today-page、ui-foundation：frozen, untouched）/ REVERIFY 6（admin、api、catalog-data、drama、coming-soon、repo-tooling）/ UNCOVERED 12（10 → admin、2 `packages/catalog/src/scan/arcIdRename.*` → drama）/ IGNORED 3；S1 freeze 後 impact 仍列 6 條 REVERIFY 只因 S3 行 STALE，留俾下次 release S3
- Plans：admin AC-36、api AC-32、drama AC-20（新增）；catalog-data / coming-soon / repo-tooling 沿用；coming-soon / repo-tooling：淨係 `package-lock.json` 兩個 workspace version（0.9.4 / 0.13.1，同 `apps/{admin,api}/package.json` 一致），由 lint / `tsc -b` / `npm test` 證
- Review: `.proj-docs/reviews/2026-11-22_review_p0-audit-fixes_batch.md` Section B（兩輪，100 / 100，S-1393–S-1397 已關）

## Runs

| Command                                                                                             | Result                                                                | Time  |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----- |
| `npm run lint`                                                                                      | exit 0                                                                | 52 s  |
| `npx tsc -b`                                                                                        | exit 0                                                                | 20 s  |
| `npm test`（root，全部 projects）                                                                   | 528 files / 5563 tests 綠                                             | 197 s |
| `npm run test -w apps/api`（workerd + scripts）                                                     | 27 files / 449 + 1 file / 12 綠                                       | 24 s  |
| `npm run e2e:admin`（內置 Chromium，冇用 `PW_CHROMIUM_PATH`）                                       | `admin e2e: all passed`（含 3 個「rename drama ID」check）            | 97 s  |
| `apps/admin` `vitest run src/features/{editor,dramas}` + 改動 src coverage                          | 205 tests；6 個改動檔 lines 100%（branch 最低 `persist.ts` 71%）      | 30 s  |
| `apps/api` `adminRoutes.test.ts` + `src/admin/rename.ts` coverage；`packages/catalog` `src/scan`    | 34 tests，lines 100% / stmts 94.5%；78 tests，`arcIdRename.ts` 100%   | 15 s  |
| Player bundle：scratch copy 用 merge-base 同 HEAD 嘅 `packages/catalog` 各 `vite build`             | `--mode e2e` 同 production 各 77 檔 sha256 全部一樣（對照組改動有變） | 20 s  |
| 舊 code：scratch copy 換返 `origin/main` `persist.ts` 跑 `persist.test.ts` `dramaIdRename.test.tsx` | 11 fail / 2 pass（AU-013 case：PUT 嘅短篇 ID deep-equal 唔啱）        | 6 s   |

- Player e2e / `e2e:visual` 冇跑：catalog-data / drama 嘅改動係加 export（`renamedArcId` `withRenamedArcIds` `PLACEHOLDER_ARC_WIDTH`），player `dist` 同 merge-base byte 一樣 → 兩條鏈已凍結嘅 e2e 證據照用（S1 只跑對應改動嘅 e2e；冇 player UI / CSS 改動）

## Scenarios（→ 證據）

- 冇排程嘅自動編號短篇：`persist.test.ts`「should rename first, then PUT the arc IDs the server renamed (AU-013)」
- 有排程嘅短篇（以前 409）：e2e「the save keeps the arc IDs the server renamed」（mock 同 api 一樣，舊短篇 ID 會 409；排程跟去 `<新 ID>-01`）；api `adminRoutes.test.ts`「should accept a PUT … after a rename with a scheduled arc (AU-013)」（舊 ID 409 → 改咗 200、`schedules` 行跟新 ID）
- 改 ID + 其他改動：`dramaIdRename.test.tsx`「should PUT the arc IDs the server renamed when the save also changes a field」+ 上面 e2e
- 淨改 ID（冇 PUT）：`persist.test.ts` / `dramaIdRename.test.tsx`（S-1396）+ e2e「a rename-only save sends no PUT and shows no error」
- rename 成功、PUT 失敗、再儲存：`persist.test.ts`（422 / 412 / 網絡）、`useEntryEditor.test.tsx`「rename succeeded but the PUT failed」3 個（含 StrictMode）、`dramaIdRename.test.tsx`「should stay on the renamed entry …」+ e2e「a failed PUT stays on the new ID, saving again is a plain PUT」
- 自訂短篇 ID 唔郁：`arcIdRename.test.ts`「should leave custom arc ids untouched」；e2e `special`、api `drama-01-extra` 照舊
- `?from=todos` / `?todo=`：`dramaIdRename.test.tsx`「should keep the todo flow on the renamed entry … (S-1395)」+ `renamedUrl.test.ts` 5 個；`confirmAll`：`idConfirm.test.ts`「should confirm auto-numbered arcs under the ID the server renamed them to」；mock 同 catalog 規則一致：`mockRenameParity.test.ts`；SQL GLOB 闊度：api S-1393 test

## Hard Gates

all pass（Coverage 見上；Security / Data：rename + PUT 寫入路徑由 api test 證 409 守衛同排程跟隨；PWA gate no — 唔掂 player `sw.js` / manifest / build；Performance n/a）

## Findings

none（冇三層收斂嘅 🔴 / 🟡；冇 🟢 / Observation）

## Freeze

S1：`admin` 462 → 472（+10 新檔）、`api` 158、`drama` 232 → 234（+`arcIdRename.{ts,test.ts}`）、`catalog-data` 149、`coming-soon` 163、`repo-tooling` 49；每條都畀晒成條 chain + stage 嘅檔，同 `e800401` 比對 chain + stage + path 冇少行；S3 行冇郁

## 建議補測

none — 規則（`renamedArcId`）同 `persist` 嘅 rename / PUT 分支已有直接 unit（自訂 ID、闊度 ±1、冇 `arcs`、rename 自己失敗），no edge case gap

```handoff-receipt
protocol: 1
status: pass
stage: S1
chain: admin, api, drama, catalog-data, coming-soon, repo-tooling
commit: cad4868
ci_run: n/a
next_action: merge_ready
branch: "fix/admin/au-013_rename-arc-ids"
context: "AU-013 S1 pass at cad4868: lint / tsc / npm test 5563 / api 461 / e2e:admin all green; 3 rename e2e checks + unit cover scheduled arc, rename-only, failed PUT then plain PUT, custom IDs, todo flow; new tests fail on old persist.ts; player dist byte-identical to merge-base so player e2e / visual not rerun; 6 chains frozen S1, no rows lost; branch not pushed, no CI run yet"
```
