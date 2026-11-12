# QA — Lane C player / catalog 雜項（S-779 / S-793 / S-771 / S-760 / S-750）— 2026-11-12 — S1

- Tier: T1（e2e harness、prebuild snapshot script、註解、arcCover 改名）| Branch: `fix/lane-c-player-catalog-misc` | Commit: `4587f5b`（code）/ `d6cd2c0`（HEAD，之後淨 docs）| Verdict: ✅ pass
- 處理咗：S-779（harness 預設 404 `CATALOG_IMAGE_HOST`）、S-793（`runPool` 失敗即停開新、等 in-flight 先 reject，TDD）、S-771 / S-760（淨註解）、S-750（arcCover `REPO_ROOT` → `APP_ROOT`）。S-765 未修（harness 改 SW request 令 S-648 Shift-reload 5/5 fail，已還原 + 註解記限制，見 review addendum）
- Ledger（`impact --since "$(git merge-base HEAD origin/main)"` = `725ae90`）: SKIP 10 / REVERIFY 4（catalog-data、coming-soon、repo-tooling、ui-foundation）/ UNCOVERED 5（全部 `apps/player/scripts/arcCover/`）/ IGNORED 1（docs）
    - catalog-data：`catalogSnapshot.{ts,test.ts}`（S-793）+ `src/config/catalogImage.ts`（淨註解）；coming-soon / repo-tooling：`e2e/harness.mjs`；ui-foundation：`packages/catalog/tests/jsonSchemas.ts`（淨註解）
- SSoT: review `.proj-docs/reviews/2026-11-12_review_lane-c-player-catalog-misc.md`（pass 100，含 addendum `d6cd2c0`）；plans `plans/{catalog-data,coming-soon,repo-tooling,ui-foundation}.md`（沿用，冇改）
- SKIP admin / api / bookmark / card-zoom / drama / home / mini-player / player-core / pwa-shell / show-today-page（frozen, untouched）

## Runs

| Command / 證據                                                                                                                                  | Result                                                                                                                       | Time |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---- |
| `npm test -- apps/player/scripts/catalogSnapshot apps/player/src/catalog packages/catalog/src/document`（catalog-data plan）                    | 235 / 235 pass                                                                                                               | 12 s |
| `npx vitest run --project @903-player/player --coverage.enabled --coverage.include=scripts/catalogSnapshot.ts scripts/catalogSnapshot`          | 10 / 10；`catalogSnapshot.ts` lines 98.97% / branches 89.28%                                                                 | 8 s  |
| `python3 -m pytest -q`（喺 `apps/player/scripts/arcCover`）+ `grep -rn REPO_ROOT --include=*.py`                                                | 101 passed（24 subtests）；`REPO_ROOT` 冇殘留                                                                                | 53 s |
| Main agent：`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e` @`4587f5b`（log 喺 session scratchpad `e2e2.log`，14:54 寫，commit 14:44） | exit 0，780 PASS / 0 FAIL「All E2E checks passed」；Remote catalog 14 個 check、即將上架、PWA 換版 7 個（包括 S-648）全 PASS | —    |
| Main agent：root `npm run lint`；`npm test`（`ceb6dbd..1e2e03d`，`4587f5b` 只改 harness）                                                       | pass；353 files / 3785 tests pass                                                                                            | —    |

- S-779：e2e「冇 request 出外網（mock 咗嘅 host 除外）」PASS，同時「跨 origin 圖有 CORS header，`<img crossorigin>` 照出到（`catalog-images.e2e.test`）」PASS → 預設 404 冇蓋過 `remoteCatalog.mjs` 嘅 route
- S-793：新 test「should wait for downloads in flight, start no new one, then clean up」：reject 嗰刻 in-flight = 0、只開 2 張圖、tmp folder 清晒
- CI 未跑（未 push）；`git diff 4587f5b d6cd2c0` 淨係 review 報告。唔重跑 full e2e：harness 改動喺同一份 code 上已有 full e2e 證據
- 冇跑 plan 嘅 AC-5 snapshot build（本機 Worker）：S-793 只改失敗路徑，成功路徑行為冇變，失敗路徑由 unit 證；catalog-data 其他 command 由 main agent full `npm test` / e2e 覆蓋

## Hard Gates

all pass（Coverage：`catalogSnapshot.ts` ≥ 80%，其他改動係註解 / test harness / Python 改名；PWA：`sw.js` / manifest / 更新邏輯冇改，PWA 換版 e2e 全 PASS；Security / Performance：n/a）

## Findings

冇 🔴 / 🟡，冇新 CUI。

- Observation：S-765（SW 自己 fetch `e2e-catalog/catalog.json` 拎到 SPA fallback 200 入 cache）仍然存在，已知、未修，app parse 唔到照 fallback，冇用戶影響；review 已記，唔另開
- Observation：arcCover 5 個檔 UNCOVERED，同 `2026-11-09_qa_r2-bucket-rename.md` 一樣用 pytest 驗、唔 freeze；等 S-762 決定開鏈或 ignore
- Observation：freeze 後 `impact` 仍列 ui-foundation REVERIFY：S1 已 FROZEN（`status`），係舊 S3 行 `packages/catalog/tests/jsonSchemas.ts`（@cdb5263）hash 早已同 main 唔同，S3 release freeze 會清；唔屬 S1
- Code review 新開 S-862 / S-864 / S-865（open，backlog）；S-863 close — 唔屬 QA 範圍

## 建議補測

- none（S-793 已有 TDD test；其餘係註解 / 改名 / harness，由 full e2e 證）

Re-freeze S1：catalog-data、coming-soon、repo-tooling、ui-foundation（file list 同原本 ledger S1 行一樣）。

```handoff-receipt
protocol: 1
status: pass
stage: S1
ledger: "FROZEN catalog-data / coming-soon / repo-tooling / ui-foundation S1 @d6cd2c0; SKIP 10; UNCOVERED arcCover x5 (pytest 101 pass, not frozen, S-762)"
hard_gates: { tests: pass, coverage: pass, no_blocking: pass, pwa: n/a, security: n/a, performance: n/a }
tickets: []
next_action: merge_main
next_agent: main
branch: "fix/lane-c-player-catalog-misc"
context: "S-779/S-793/S-771/S-760/S-750 S1 pass; snapshot unit 235/235, catalogSnapshot.ts 99% lines; arcCover pytest 101; main agent e2e 780/0 @4587f5b + lint + npm test 3785; S-765 still open (Observation); report + ledger committed locally, not pushed; CI must be green on push before merge"
```

> ID 重編（2026-11-12 merge 時）：parallel lane 撞號，以先 merge 入 `main` 嘅 Lane D 為準，本報告嘅新 S-ID 已改做 backlog 現行編號。
