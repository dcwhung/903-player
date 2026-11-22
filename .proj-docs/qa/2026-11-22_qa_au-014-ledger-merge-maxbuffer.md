# QA — au-014-ledger-merge-maxbuffer（repo-tooling）— 2026-11-22 — S1

- Tier: T1（repo 工具 + root test 設定；冇 app code，`sw.js` / manifest / build 冇改）| Commit: ef95f21（`65a859e` + `ef95f21`，base `e800401`）| Verdict: ✅ pass
- Base: `impact --since e800401`（`git merge-base HEAD origin/main`）；branch `fix/tooling/au-014_ledger-merge-maxbuffer`（未 push）
- Ledger: SKIP 14 / REVERIFY 1（repo-tooling：`vitest.config.ts`）/ UNCOVERED 0 / IGNORED 2（`scripts/qa/ledger-merge.{mjs,test.mjs}`，`ledger-ignore` S-866）
- Plan: `.proj-docs/qa/plans/repo-tooling.md` 加 AC-12 + 指令（新 vitest project）；其他 AC 不變

## Runs

| Command                                                                                                        | Result                                                                                                                                 | Time |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `npm test`（root）                                                                                             | 523 files / 5522 tests pass                                                                                                            | 219s |
| `npx vitest run --project @903-player/repo-scripts`                                                            | 1 file / 7 tests pass                                                                                                                  | 1s   |
| `npx vitest list --filesOnly`：HEAD vs `origin/main` 嘅 `vitest.config.ts`                                     | 523 vs 522；`diff` 只多 `[@903-player/repo-scripts] scripts/qa/ledger-merge.test.mjs`（player 318、admin 138、catalog 38、api 27 + 1） | 20s  |
| `npm run lint`                                                                                                 | eslint clean；prettier 全部過                                                                                                          | 58s  |
| QA 臨時 repo：ledger 1,440,929 bytes（12,000 行），ours 改 row 10 + 加 1 行、theirs 改 row 20 + 加 1 行，merge | exit 0，`12002 rows written`；row 10 = ours、row 20 = theirs、兩邊新行都喺、冇 conflict marker                                         | <5s  |
| 同一個 repo 跑 `origin/main` 版 script（對照）                                                                 | `ENOBUFS`（確認修之前真係壞）                                                                                                          | <1s  |
| QA 臨時 repo：兩邊都改 row 5、檔案唔存在                                                                       | exit 1；stdout 列 `big S1 …/file-5.ts`；寫入 29 行，row 5 冇寫入                                                                       | <1s  |
| 冇 MERGE_HEAD / `HEAD no-such-ref` / 喺 `sub/` 跑 / 唔喺 git repo 跑                                           | 四個都 exit 2、stderr 啱啱 1 行（`ledger-merge: …`）、stdout 0 行；`git status --porcelain` 空、ledger sha 不變、冇多咗檔              | <1s  |
| `node scripts/qa/ledger-merge.mjs HEAD HEAD`（真 ledger，848,816 bytes）                                       | exit 0，`4304 rows written`；sha256 前後一樣，`git status` 空                                                                          | <1s  |

- E2E / `e2e:visual`：n/a（diff 淨係 `scripts/qa/*` + root `vitest.config.ts`，冇 app / e2e code）；冇跑
- QA 情境 script 喺 scratchpad（唔 commit）；同 `ledger-merge.test.mjs` 7 個 test 覆蓋同一批情境，結果一致

## Hard Gates

all pass（Coverage：`ledger-merge.mjs` 係 spawn 出嚟跑嘅 CLI，冇 line coverage 數字；每條分支（合併、exit 1、四種 exit 2）都有 test + QA 情境實跑；PWA / Security / Performance n/a）

## Findings

冇 🔴 / 🟡。

### Observation

- `.proj-docs/qa/ledger-ignore` 對 `scripts/qa/*` 嘅注釋寫「唔入 build / test」，而家 `ledger-merge.test.mjs` 會入 root `npm test`；ignore 本身照舊有效（今次 impact 計佢 IGNORED），只係注釋過時。冇違反 AC，唔 block
- No edge case gap：exit code 三條路 + 過 1 MiB 都已有 test

## Scope / freeze

- repo-tooling S1：原有 49 行（全條 chain + stage 由 ledger 攞，已包括 plan 同 `vitest.config.ts`）重新 freeze；`scripts/qa/*` 屬 ledger-ignore，唔加入 ledger
- Freeze 後同 `origin/main` 比 chain + stage + path：4304 行一樣，冇少行；repo-tooling S1 49 → 49，sha 變咗嘅只有 plan 同 `vitest.config.ts`；S1 STALE 0（`impact` 仍顯示 REVERIFY 係 S3 嗰兩行，屬 release）
- 建議補測：none

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 14 / REVERIFY 1 / UNCOVERED 0"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: proceed
next_agent: main
branch: "fix/tooling/au-014_ledger-merge-maxbuffer"
context: "S1 @ ef95f21: AU-014 pass. npm test 5522/5522 (523 files, +1 repo-scripts file only), lint clean, 7/7 ledger-merge tests, QA temp-repo scenarios (1.44 MiB merge exit 0, conflict exit 1, four exit-2 cases) and real ledger HEAD HEAD byte-identical. repo-tooling S1 refrozen with full 49-file list, no row lost vs origin/main. e2e / visual n/a (no app code). Observation: ledger-ignore comment for scripts/qa/* is stale. QA commit local only, not pushed; CI not run on this SHA"
```
