# QA — backlog lanes L1–L4（S-747 / S-890 / S-788 + S-1052 / S-881 / S-796 + W-760）— 2026-11-16 — S1 batch

- Tier: T1 | Commit: fa7676e（code `bb9f6ba`）| Verdict: ✅ pass
- Ledger（`impact --since 48dfb14`）: SKIP 8 / REVERIFY 6（admin、api、catalog-data、coming-soon、drama、repo-tooling）/ UNCOVERED 1（`apps/api/test/latestEpisodeIds.test.ts` → 併入 api，plan scope `apps/api/test/*` 已包）/ IGNORED 2
- Plan: 沿用 `plans/{admin,api,catalog-data,drama,coming-soon,repo-tooling}.md`，冇改
- Review: `.proj-docs/reviews/2026-11-16_review_backlog-lanes_batch.md`（pass 100）

## Runs

| Command                                                                                                                                                    | Result                                                                                                                                                                       | Time |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `npm test -- apps/admin/src/ui packages/catalog/src/scan apps/player/scripts/dramaFromFolder apps/player/src/catalog/snapshot packages/catalog/src/dramas` | 34 files / 390 pass                                                                                                                                                          | 12s  |
| `npm test -- apps/api`                                                                                                                                     | 27 files / 440 pass                                                                                                                                                          | 18s  |
| `npm test -- apps/player/src/catalog apps/player/scripts packages/catalog/src/document`                                                                    | 37 files / 445 pass                                                                                                                                                          | 15s  |
| changed-src coverage（v8，各 project `--coverage.include=<改動檔>`；api 喺 `apps/api` 跑）                                                                 | 見 Hard Gates                                                                                                                                                                | 60s  |
| CI run 43855057329 @ fa7676e（https://github.com/dcwhung/903-player/actions/runs/43855057329）                                                             | lint、tsc、unit、build、E2E 全 success；player e2e 869 PASS / 0 FAIL（版本 v1.36.1、「Remote catalog」section、冇 JS error）、admin e2e 53 PASS（「admin e2e: all passed」） | —    |

## 逐個 fix

- **S-747（drama）**：`isPlaceholderArcId`（`^arc-\d+$`）+ library 每個 `drama.json` 一條 `it.each`，現有 library 全部冇 placeholder；`draft.test.ts` 新 2 case（warn 字眼、正 / 反例 `arc-1b` `my-arc-01` 等）pass
- **S-890（api）**：`webp.test.ts`「non-square VP8」pass（寬高分開讀）
- **S-788 + S-1052（api）**：`latestEpisodeIds.test.ts` 4 case（未 publish → null、最新 ok、跳過較新 failed、空 list）pass；`disappearingIds` / 劇 DELETE 守衛改用佢，節目仍讀 document（fail closed 不變），`entries.test.ts` 原有 PUT warnings / DELETE case 全綠；三個 query 共用 `LATEST_OK_PUBLISH`
- **S-881（admin）**：`DateField.test.tsx` ResizeObserver 新 case（觸發重新量位、unmount disconnect、冇 RO 唔 crash）pass
- **S-796 + W-760（catalog-data / player 1.36.1）**：`usesBundledSnapshot`：DEV 一律 library、production build 行為不變（`source.test.ts` pass）；player e2e 由 CI 同 SHA 證
- **coming-soon / repo-tooling**：只因 `apps/player/package.json` + `package-lock.json` version bump（player 1.36.1、api 0.12.1、admin 0.8.2），diff 冇其他改動；CI `npm ci` + lint / unit / build / e2e 證
- 跨 fix 互動：`packages/catalog/src/index.ts`（S-747 export）同 player snapshot（S-796）屬 catalog-data，兩個改動唔互相 import；冇其他共用檔

## Hard Gates

all pass — 改動 src lines coverage：`usePopoverPlacement.ts` 92.1、`store.ts` 100（B 80）、`entries.ts` 100、`scan/merge.ts` 97.9、`snapshot/source.ts` 100（全部 ≥ 80%）。Security / Performance：n/a（冇新輸入面；S-788 淨係少讀一欄）。PWA：n/a（冇改 `sw.js` / manifest / 更新邏輯；版本號由 CI e2e 證）。

## Findings

None。

## 建議補測

- none（S-788 / S-747 有 edge case unit；S-881 / S-796 低風險，冇 edge case gap）

## Freeze

- `admin` S1 437、`api` S1 153 + `latestEpisodeIds.test.ts` = 154、`catalog-data` S1 147、`coming-soon` S1 162、`drama` S1 169、`repo-tooling` S1 26 行（清單 = ledger 現有 chain + stage 行，冇少行）

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
chain: admin, api, catalog-data, coming-soon, drama, repo-tooling
commit: fa7676e
report: .proj-docs/qa/2026-11-16_qa_backlog-lanes_batch.md
next_action: main_agent_push_and_merge
blocking: none
tickets: none
context: Batch S1 for S-747, S-890, S-788+S-1052, S-881, S-796+W-760. Targeted unit 390+440+445 pass, changed-src coverage >= 92% lines. CI 43855057329 green at fa7676e (player e2e 869 PASS, admin e2e 53 PASS). Ledger re-frozen (admin 437, api 154, catalog-data 147, coming-soon 162, drama 169, repo-tooling 26). Docs committed locally, not pushed.
```
