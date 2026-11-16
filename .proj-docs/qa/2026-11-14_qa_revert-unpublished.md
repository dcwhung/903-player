# QA — 還原未發佈改動（api 0.11.0 + admin 0.7.0）— 2026-11-14 — S1

- Tier: T2（新 endpoint + admin UI，跨模組）| Commit: `9c20e3b`（re-review `bea7064`）| Verdict: ✅ pass
- Ledger（base = merge-base origin/main `245ea33`）: SKIP 10 / REVERIFY 4（`admin` `api` `coming-soon` `repo-tooling`）/ UNCOVERED 35（28 個 → `admin`，包括 Design Origin `_mockups_/admin-revert/index.html`；7 個 `apps/api` → `api`）/ IGNORED 5
- Freeze（成條 chain + stage）：admin 404 → 432（+28）、api 139 → 146（+7）、coming-soon 162、repo-tooling 26；同 freeze 前比對 chain + stage + path 冇少行、其他鏈不變；之後 `impact` 冇 REVERIFY / UNCOVERED
- `coming-soon` / `repo-tooling`：STALE 只有 `package-lock.json`，diff 淨係 `apps/admin` `0.6.0 → 0.7.0`、`apps/api` `0.10.2 → 0.11.0` 兩行 version → 沿用 plan 重新 freeze，冇額外驗
- Plan：`plans/admin.md` 加 AC-28（Design Origin `_mockups_/admin-revert/index.html`）；`plans/api.md` 加 AC-29（`GET` `published` + `POST …/revert`）；兩份都跟 plan 實作差異（S-1008 方案 A：唔還原集數）
- e2e：本機唔跑 — CI 同 SHA `9c20e3b` run 43595885995 綠（包括 E2E job），引用

## Runs

| Command                                                                                                   | Result                                     | Time |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---- |
| `npm test -- apps/admin packages/catalog apps/api`                                                        | 1961 / 1961 pass（183 files）              | 81 s |
| `npx tsc -b`（root）                                                                                      | exit 0                                     | —    |
| coverage `apps/admin`（v8，`--coverage.include=<41 個改動 src>`）                                         | 663 / 663 pass；見 Hard Gates              | 90 s |
| coverage `apps/api`（v8，`content/*` 7 個 + `catalog/store.ts`）                                          | 413 / 413 pass；見 Hard Gates              | —    |
| coverage `packages/catalog`（v8，`src/admin/editChanges.ts`）                                             | 873 / 873 pass；見 Hard Gates              | —    |
| CI `ci.yml` run [43595885995](https://github.com/dcwhung/903-player/actions/runs/43595885995) @ `9c20e3b` | success（changes / lint+unit+build / E2E） | 18 m |

## 驗證要點（L2）

- api AC-29：`revert.test.ts` — `published` null（冇 publish / 唔喺 document / parse 唔到）、短篇加返原位、`enabled` + `removedAt`、412（舊 / 冇 `If-Match`）、409 × 2、404、壞 body 8 種 400；`revertEdgeCases.test.ts` — 慣例檔名（W-745）、`constructor` / `toString` / `__proto__` / `hasOwnProperty` 400（W-746）、`episodes` / `episodeDates` 400（S-1008）、圖 URL fail closed + 唔漏去 GET（S-1009）、document 讀一次 / 新 publish 重讀（S-1006）— 綠
- admin AC-28：`revertRows` / `revertScope`（唔出集數、頂層 `arcs` / `images`、未發佈）；`EditorRevert`（原位已修改 + 已發佈值、配色 tab、狀態包 `removedAt`、focus S-1007）；`PublishRevert`（淨還原剔咗嘅、冇剔 = 灰、409 書面語 + `arcNotPublished` S-1011、412 重讀、focus 去卡 / h1）；`revertStyles.node`（還原 / 刪除掣淺紅底）；`revertEndpoints`（`publishedVersion` 唔蓋列表 boolean）— 綠
- e2e「revert」2 個 check（CI 綠）：時間線短篇行 → 確認框剔走「還原簡介」→「還原 1 項」；編輯頁已修改 + 還原簡介 + 碟面圖位還原掣

## Hard Gates

all pass。Coverage（lines / branch）：admin 改動 src 合共 93.2 / 84.9（新 `features/revert/*` 全部 100 lines）；低過 80% lines 嘅舊檔 `ShowFields.tsx` 58.3、`BasicFields.tsx` 70.0、`MediaAside.tsx` 75.0、`ArcFields.tsx` 78.6（由 `BasicFields` 拆出）、`endpoints.ts` 78.0、`main.tsx` 0 — 未覆蓋行係原有 `onChange` handler / bootstrap，base `245ea33` 同一批檔係 54.5 / 57.1 / 66.7 / — / 77.1 / 0，今次全部升咗，新加嘅還原行有 unit + e2e 覆蓋。api 改動 src 99.7 / 88.0；`editChanges.ts` 100 / 93.8。Security / data：`POST …/revert` 寫 D1 — 樂觀鎖（412）、own-key 白名單（W-746）、經 `writeEntry` 同 PUT 同一套驗證 + S-804 守衛，均有 test

## Findings

- 冇 🔴 / 🟡 / 🟢

## 建議補測

- none（review fix W-745 / W-746 / S-1006–S-1011 全部有 unit；畫面由 unit + CI e2e 覆蓋）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: admin S1 (AC-28, +28 new files incl. mockup + e2e), api S1 (AC-29, +7 new files), coming-soon S1, repo-tooling S1 (lockfile version lines only) — re-frozen, full chain + stage
tickets: none
ci: 43595885995 @ 9c20e3b (success, incl. E2E)
next_action: main agent pushes bea7064 + QA commit together (code CI finished)
context: T2, 0 findings, no new IDs used (S-1012+ free); e2e cited from CI, not re-run
```
