# QA — S-751 remove dramaFromFolder CLI — 2026-11-16 — S1

- Tier: T1（player 1.36.1 / api 0.12.1 PATCH）| Commit: 89cc4e4a（code = 7e024e3e；之後淨 comment + docs）| Verdict: ✅ pass
- Ledger: SKIP 8 / REVERIFY 6（drama、api、catalog-data、coming-soon、repo-tooling、ui-foundation）/ UNCOVERED 3（新 test：`libraryRoundTrip.node.test.ts`、`draftSchema.node.test.ts` → drama；`tsconfigTypes.test.ts` → repo-tooling，plan 加 AC-8）/ IGNORED 6
- Plans: `.proj-docs/qa/plans/{drama,api,catalog-data,repo-tooling}.md`（repo-tooling 加 AC-8 + scope 一行）

## Runs

| Command                                                                                       | Result                                                | Time |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---- |
| drama plan `npm test -- …`（+ `apps/player/scripts/tsconfigTypes.test.ts`）                   | 568/568                                               | 20s  |
| `npm test -w apps/api`                                                                        | 423/423 + 12/12                                       | ~60s |
| catalog-data `npm test -- packages/catalog/src/{core,document}/ … apps/player/scripts`        | 591/591                                               | ~40s |
| `npx tsc -b`、`npm run typecheck -w apps/api`                                                 | 0 error                                               | 20s  |
| coverage `packages/catalog/src/scan/{draft,existing,merge,names}.ts`                          | lines 97.9–100%                                       | 15s  |
| AC-9 字眼：scratchpad `compare.mts`（tsx）base 48dfb14a 傳 `source: 'r2'` vs HEAD，12 個 case | byte 一樣（23 issue）                                 | 5s   |
| 同一 script base 唔傳 `source`（folder 字眼）vs HEAD                                          | 18 行唔同（證明比較有效）                             | 5s   |
| `git grep` CLI 名 / `episodeUrls` / `coverUrls` / `ScanSource` / `wordingOf` / `source: 'r2'` | 只剩歷史 session log、README 一句「已刪除」、3 個註解 | 1s   |
| CI run 43857927285 @7e024e3e（lint、unit、build、e2e）                                        | success（引用，唔重跑）                               | —    |

AC-9 case：NFD + 壞 id、缺集 + folder 名對唔上、雜檔、每日缺日子 + 壞日期、kind 唔對（兩個方向）、`existing` null / string / `arcs` 唔係 array / arc item 壞、空 folder、混合每日同短篇；比較 `kind` / `issues` / `summaries` / `json` 全部。

## Hard Gates

all pass

- Round-trip（AC-11）：`libraryRoundTrip.node.test.ts` 每套 library 劇用 admin 參數（`id`）重掃 = committed `drama.json`，由零生成嘅 audio path 同 app 一樣，lancy 合併 case 照驗
- Lockfile：只少 root `tsx`、兩個 workspace version、esbuild 平台包加 `peer`/`optional` 旗；冇解析版本改動（`tsx` 4.23.15 留作 vite optional peer）
- 7e024e3e → 89cc4e4a 淨係 `apps/api/src/content/r2Listing.ts` 一行註解 + docs（T0）

## Findings

none（🔴 / 🟡 冇）

### Observation

- Freeze 後 `impact` 仍列 drama / catalog-data / ui-foundation REVERIFY：只係 S3 行（plan 檔、`packages/catalog/tests/jsonSchemas.ts` 屬舊 release freeze），S1 全部 FROZEN；下次 release S3 處理
- `impact` 將已刪檔（`dramaFromFolder.{ts,test.ts}`、`scan/urls.{ts,test.ts}`）列 UNCOVERED：刪除檔冇得 freeze，已由 drama S1 行移除（工具行為，唔使跟進）

## 建議補測

- none（CLI 刪除；R2 字眼由 `draft.test.ts` 同 AC-9 比較覆蓋）

## Addendum — merge origin/main 259b1256（#249 backlog lanes）

- 合併：S-747 `isPlaceholderArcId` + library「no placeholder arc ids」describe 搬入 `libraryRoundTrip.node.test.ts`（`libraryIds()` 全部劇）；player 1.36.2、api 0.12.2
- Re-verify（merge 工作樹）：drama plan + `apps/player/scripts` 652/652；`npm test -w apps/api` 428 + 12；catalog-data 子集 505/505。AC-9 字眼比較唔重跑：S-747 warn 字係 main 有意加，由 `draft.test.ts` 鎖
- `ledger-merge.mjs` exit 1 嘅行：api / catalog-data / coming-soon / drama / repo-tooling S1 用「merged ledger 行 + script 列出嘅 path − 已刪檔」重新 freeze（verified_commit 記 93bcaba1，merge 未 commit）
- 同兩邊 parent 比 chain + stage + path：vs 93bcaba1 只多 `api S1 apps/api/test/latestEpisodeIds.test.ts`（main 加）；vs MERGE_HEAD 只少 4 個已刪檔（`dramaFromFolder.{ts,test.ts}`、`scan/urls.{ts,test.ts}`）、多 3 個新 test 行；全 ledger 冇其他行消失；S1 全部 FROZEN

```handoff-receipt
status: pass
stage: S1
chains_frozen: drama, api, catalog-data, coming-soon, repo-tooling, ui-foundation (S1)
report: .proj-docs/qa/2026-11-16_qa_S-751-remove-cli.md
commit: 89cc4e4a
ci_evidence: actions run 43857927285 @7e024e3e success
next_action: main_agent_commit_and_push
tickets: none
context: AC-9 wording byte-identical base(r2) vs HEAD over 12 cases; round-trip guard intact; no live CLI refs
```
