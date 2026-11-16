# QA — publish summary 方案 1（admin 0.6.0 + api 0.10.2）— 2026-11-14 — S1

- Tier: T2（MINOR admin + catalog `summarizeChanges` 跨模組）| Commit: `295e7cc`（re-review `fc12cf6`）| Verdict: ✅ pass
- Ledger（base = merge-base origin/main `75971eb`）: SKIP 10 / REVERIFY 4（`admin` `api` `coming-soon` `repo-tooling`）/ UNCOVERED 14（12 個 → `admin`；`packages/catalog/src/admin/editChanges{,.test}.ts` → `api`）/ IGNORED 3
- Freeze（成條 chain + stage）：admin 393 → 404（+12、−`SelectionCard.tsx` 已刪）、api 137 → 139、coming-soon 162、repo-tooling 26；同 freeze 前比對 chain + stage + path 冇少其他行、其他鏈不變。之後 `impact` 淨剩 `SelectionCard.tsx` UNCOVERED（已刪檔，工具照 diff 列出，freeze 唔到）
- `coming-soon` / `repo-tooling`：STALE 只有 `package-lock.json`，diff 淨係 `apps/admin` `0.5.1 → 0.6.0`、`apps/api` `0.10.1 → 0.10.2` 兩行 version → 沿用 plan 重新 freeze（成條 chain + stage），冇額外驗
- Plan：`plans/admin.md` 加 AC-27（Design Origin `_mockups_/admin-publish-summary/index.html` 方案 1）；`plans/api.md` 加 AC-28（`summarizeChanges`）
- e2e：本機唔跑 — CI 同 SHA `295e7cc` run 43579511808 綠（包括 E2E job），引用

## Runs

| Command                                                                                                   | Result                                     | Time |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---- |
| `npm test -- apps/admin packages/catalog apps/api`                                                        | 1891 / 1891 pass（175 files）              | 69 s |
| `npx tsc -b`（root）                                                                                      | exit 0                                     | —    |
| coverage `apps/admin`（v8，`--coverage.include=<改動 src>`）                                              | 633 / 633 pass；見 Hard Gates              | 70 s |
| coverage `packages/catalog`（v8，`src/admin/{editChanges,changes}.ts`）                                   | 873 / 873 pass；見 Hard Gates              | —    |
| CI `ci.yml` run [43579511808](https://github.com/dcwhung/903-player/actions/runs/43579511808) @ `295e7cc` | success（changes / lint+unit+build / E2E） | 17 m |

- 註：run 43578906068 @ `dcff0ab` cancelled（`concurrency`，被 `295e7cc` 取代），唔計
- Flaky：admin suite 喺本機跑咗 3 次（全部 unit、admin + catalog coverage、admin coverage），全綠，冇重現 reviewer 見過嘅單次失敗 → 唔登記 KI

## 驗證要點（L2）

- api AC-28：`editChanges.test.ts` — 短篇修改每個一項（`arc` ref、冇前綴 key，S-999）、共用檔報晒 slot（W-743）、已刪 / 未上架 / 新檔唔報（W-744）、對唔到 slot = `images` — 綠
- admin AC-27：`timelineEntries` 按劇分卡 + 新劇一行；`thumbs` 短篇碟 → 劇碟 → 黑碟；`skipModel` / `SkipGroup` 未完成 + server 剔走、冇就唔出、淨得 skip 組；`TimelineRows` 劇集 skip 行冇短篇碟（S-1005）；`PublishPage` 冇本次發佈卡 — 綠
- e2e「selective publish」（CI 綠）：劇卡 +「不會在本次發佈」行字 + 冇本次發佈卡 / pill 行 +「返回」（`aria-label` 返回待辦）；App 外觀卡排最頂 + 重新部署說明；短篇行用 `lancy-half-disc.webp`；記錄頁「碟面」「橫圖」、冇 `disc`

## Hard Gates

all pass。Coverage（lines / branch）：admin 改動 src 合共 98.4 / 91.0（最低 `todoModel.ts` 93.2 / 76.7、`Timeline.tsx` 93.8 / 93.8，其餘 100 lines）；`editChanges.ts` 100 / 93.8、`changes.ts` 98.3 / 87.5。Security / data：n/a（純顯示 + 唯讀摘要，publish / D1 寫入不變）

## Findings

- 冇 🔴 / 🟡 / 🟢

## 建議補測

- none（三條 review fix 已有 unit；顯示由 unit + CI e2e 覆蓋）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: admin S1 (AC-27, +11 new files + mockup, -SelectionCard.tsx), api S1 (AC-28, +editChanges.ts/.test.ts), coming-soon S1, repo-tooling S1 (lockfile version lines only) — re-frozen, full chain + stage
tickets: none
ci: 43579511808 @ 295e7cc (success, incl. E2E)
next_action: main agent pushes fc12cf6 + QA commit together (code CI finished)
context: T2, 0 findings, no new IDs used (S-1006+ free); no flake seen in 3 local admin runs; e2e cited from CI, not re-run
```
