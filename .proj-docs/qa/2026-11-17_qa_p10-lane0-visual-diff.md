# QA — p10-lane0-visual-diff（repo-tooling）— 2026-11-17 — S1

- Tier: T1（開發工具 + e2e 入口 refactor；app / UI code、version 冇改）| Commit: b47d102 | Verdict: ✅ pass
- Base: `impact --since e3d6952`（`git merge-base HEAD origin/main`）；ledger 記 `1dd1740`（b47d102 之後淨係加 re-review 報告，code tree 一樣）；引用嘅 log 喺 session scratchpad
- Ledger: SKIP 11 / REVERIFY 3（repo-tooling、coming-soon、catalog-data）/ UNCOVERED 57（6 個 lane 0 新檔 → 歸入 repo-tooling AC-10；51 個 `_mockups_/{iphone-duo,home-view}/` 唔屬呢個 lane，見 Scope 備註）/ IGNORED 5
- Review: `.proj-docs/reviews/2026-11-17_review_p10-lane0-visual-diff.md`（pass 95；finding 已喺 b47d102 修）
- Plan: `.proj-docs/qa/plans/repo-tooling.md` 加 AC-10（5 個 `e2e/` 新檔 + `src/e2eVisualModel.node.test.ts` 入 scope）

## Runs

| Command                                                                                             | Result                                                                                   | Time |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---- |
| `npm test -- apps/player/src/e2e`（QA 跑，b47d102）                                                 | 3 files / 51 tests pass                                                                  | 2s   |
| `PW_CHROMIUM_PATH=… npm run e2e:visual -- --scene drama-daily --viewport 390x844`（QA 跑，b47d102） | `base e3d6952 ↔ working tree（b47d102）`；比對 1 張：全部一樣，exit 0                    | 12s  |
| `node e2e/visualDiff.mjs --scene nope` / `--viewport 1x1`（QA 跑）                                  | 列出可用情境 / viewport，exit 1                                                          | <1s  |
| `npm run lint`（引用 developer，b47d102 tree）                                                      | clean                                                                                    | —    |
| `PW_CHROMIUM_PATH=… npm run e2e`（引用，log `e2e-lane0.log`，18:09 完，b47d102 之後）               | 925 PASS / 0 FAIL（包括「即將上架 / 快將下架」、25 行 Remote catalog、PWA 換版）         | —    |
| `npm run e2e:visual` 對 e3d6952（引用，log `visual-lane0.log`）                                     | 180/180 全部一樣（開跑時 HEAD 仲係 a4a9caf，tree 已係 b47d102 內容）                     | —    |
| `VISUAL_BASE=HEAD` 自己比自己、`--home-gutter` +1px 反例（引用 developer）                          | 180/180 一樣；反例有報唔同                                                               | —    |
| CI 44141877903 @ b47d102                                                                            | Detect code changes ✅ / Lint, unit & build ✅ / E2E (Playwright) 報告時仲係 in_progress | —    |

## Hard Gates

all pass（Coverage：`visualModel.mjs` 純邏輯由 `e2eVisualModel.node.test.ts` 鎖，v8 唔 instrument `e2e/*.mjs`，唔喺 coverage include；PWA / Security / Performance：n/a，`sw.js` / manifest / build config / 輸入 / API 冇改）

## Scope 備註

- repo-tooling：`run.mjs`（`startPreview` / `parsePort` 抽去 `previewServer.mjs`）、root + player `package.json`（加 `e2e:visual` script）、6 個新檔；重新 freeze 成條 S1（40 行 + 6 個新檔）
- coming-soon S1：STALE 淨係因為共用嘅 `run.mjs` + `apps/player/package.json`；e2e「即將上架 / 快將下架」section 喺 925 PASS 入面，plan 不變，重新 freeze
- catalog-data S1：STALE 淨係 `e2e/remoteCatalog.mjs`（`catalogRoute` 加 `export` + 註解，行為不變）；Remote catalog section 喺 925 PASS 入面，plan 不變，重新 freeze。catalog-data S3 嘅 STALE 行係 monorepo 之前嘅舊 path，屬 release 驗收，今次唔掂
- `_mockups_/iphone-duo/`、`_mockups_/home-view/`（51 檔）：PR #267 帶入 `release/v2.0.0`，唔喺呢個 PR 嘅 diff；照慣例 mockup 跟用佢做 Design Origin 嘅功能鏈（P10 lane 1 起）第一次 S1 先 freeze，今次留 UNCOVERED

## Findings

none（🔴 / 🟡 0）

### Observation

- CI 44141877903 嘅 E2E job 報告時未完：main agent push / merge 之前要見到佢綠（本地同一個 tree 已 925 PASS）

## 建議補測

- none（純邏輯已有 51 個 unit test；`visualDiff.mjs` 屬開發工具，靠自己比自己 + 反例驗）

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 11 / REVERIFY 3 / UNCOVERED 57"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: end
next_agent: null
branch: "feature/layout/iphone-duo"
context: "S1 pass @ b47d102; repo-tooling (AC-10) + coming-soon + catalog-data S1 refrozen; local e2e 925/0, e2e:visual 180/180; CI 44141877903 E2E still in_progress at report time - wait for green before push; QA commit local only"
```
