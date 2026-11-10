# QA — Backend Phase 2b-1（content API + scan / schedule + CLI tsx）— 2026-11-10 — S1

- Tier: T2（api 0.2.0 MINOR + migration + 跨 `packages/catalog` / player CLI）| Code commit: `ccf8e16`（`4a98e9e` 淨 re-review docs）| Verdict: ✅ pass
- L1：`.proj-docs/plans/2026-11-10_plan_phase2b-backend.md` §1–§6；review `.proj-docs/reviews/2026-11-10_review_phase2b-1-backend.md`（warn 85 → re-review pass 100，W-703 / 704 / 705 已修）
- Ledger（`impact --since a46093f` = `git merge-base HEAD origin/main`）：SKIP 8 / REVERIFY 5（api、catalog-data、coming-soon、drama、repo-tooling）/ UNCOVERED 35 / IGNORED 9
- UNCOVERED 分配：`api` ← `apps/api/src/content/*` 9、`migrations/0002_schedules.sql`、`test/{entries,scan,schedule}.test.ts`、`packages/catalog/src/schedule/*` 4；`drama` ← `packages/catalog/src/scan/*` 16、`apps/player/scripts/dramaFromFolder.ts`（`.mjs` / `.d.mts` 已刪）
- Plan 更新：`api.md` 加 AC-10..AC-12 + scope；`drama.md` 加 AC-5（scan 核心 + tsx CLI）+ CLI smoke 指令；`catalog-data.md` out-of-scope 改名；其餘沿用
- coming-soon / repo-tooling / catalog-data REVERIFY 只係 `package.json` version、lockfile、`packages/catalog/src/index.ts` export

## Runs

| Command                                                                                                                                                                                                       | Result                                                                           | Time   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| CI run 42730213299 @ `ccf8e16`（引用，冇重跑）：Detect / Lint, `tsc -b`, unit & build / E2E                                                                                                                   | 全 success：unit 265 files / 3127、e2e 779 PASS / 0 FAIL（PWA 換版 5 個綠）      | 15 min |
| `npm test -- packages/catalog/src/scan packages/catalog/src/schedule apps/api apps/player/scripts/dramaFromFolder apps/player/src/e2eSrcConstants`                                                            | 16 files / 261 pass                                                              | 7 s    |
| Coverage v8：`packages/catalog/src/{scan,schedule}`、`apps/api/src`                                                                                                                                           | lines 99.5% / 96.6% / 98.8%（最低 `content/schedule.ts` 96%、`google.ts` 96.7%） | 20 s   |
| Parity harness（developer scratchpad `parity/records.jsonl`，`generateDraft` + `formatReport` vs 舊 `.mjs`）                                                                                                  | `{ ok: 48, bad: 0 }`                                                             | 3 s    |
| CLI smoke：repo root 臨時 fixture（2 短篇 5 集 + cover）`npm run drama-from-folder -w apps/player -- <相對 folder> --id --out --report`，再 `--existing`                                                      | 見下（drama AC-5）                                                               | 30 s   |
| `wrangler deploy --dry-run`                                                                                                                                                                                   | bindings `DB` / `CATALOG` / `AUDIO (903-radio-drama)`                            | 10 s   |
| 本機 smoke：新 `.wrangler` state → `d1 migrations apply --local`（0001 + 0002 ✅）→ `importLibrary --local` → `wrangler dev --local-protocol https` + curl（D1 插測試 session，local `AUDIO` 放 2 個 object） | 見下（AC-10..AC-12）                                                             | 4 min  |

- AC-10：冇 cookie 401、外站 Origin 403；`GET /api/entries` / `:kind/:id`（`ETag` = updatedAt）；PUT 冇 `If-Match` / 錯 / 舊 ETag / 已存在 + `If-None-Match: *` 全 412；`name` 空 422（欄位錯）；圖 `../evil.webp` 422（S-772）；刪一個 arc → 200 + `warnings.missingEpisodeIds`；新增 201、未 publish DELETE 204、publish 過 DELETE 409；300 KB body 413
- AC-10 scan：golden（local R2 只有 Season 1 兩集）→ `{ draft, issues, diff }`，`diff = [arcs[0].episodes 35 → 2]`、冇嘅短篇保留 + warn；jim（R2 冇 folder）→ `draft: null` + error；D1 冇寫
- AC-11：preview `periodic` 星期一 / 四、每次 5 集、`removeAfterDays 30`（start 2026-12-30）→ addedAt 12-31、6→01-04、11→01-07、16→01-11、下架 1-5→01-30 … 16-17→02-10（人手核對啱）；PUT 冇 / 舊 `If-Match` 412、啱就 200 而且 `schedules` 行 + entry arc 三個欄位同時寫；`every.days 1e12` 422（W-704）；DELETE 204 之後 GET 404、definition 日子保留
- AC-12：publish 兩次 → 第 2 次 `{ unchanged: true }` 同一個 #1（S-780）；改完還原 jim 再 publish 仍 `unchanged`；S-767 / 768 / 770 / 773 由 unit 證（`publish.test.ts` R2 put throw、`auth.test.ts` whitelist 外 401 + 刪 session、Google 網絡錯 502）
- drama AC-5：相對路徑跟 `INIT_CWD`（輸出落 repo root `qa-tmp-fixture/`，`apps/player/` 冇檔）；冇 `--out` 出 `<id>.drama.json` 喺 repo root；folder 唔存在 exit 2；`--existing` 加一集 → 「集數由 3 變 4」，placeholder id `arc-01` / `arc-02` 保留；W-705 由 `draft.test.ts` 證
- repo-tooling：root devDependency 加 `tsx`（MIT）；lockfile 0 個 package 改版本（只 api / player version + 刪 `peer` flag）；`node_modules/tsx` 本身已喺 lockfile（transitive），冇新 package，`npm audit` 唔受影響
- Smoke 完：刪咗 fixture、臨時 `.dev.vars`；developer 原本嘅 `apps/api/.wrangler/` 還原（QA state 搬去 scratchpad）
- Freeze：`freeze <chain> S1` × 5（api 64 檔、drama 162 檔、catalog-data / coming-soon / repo-tooling 沿用 ledger S1 path）；之後 `impact`：S1 冇 STALE；剩低 REVERIFY catalog-data / drama 係 S3 舊行（plan 檔改咗，S3 行本身已經係 monorepo 前舊 path，留俾 S3），UNCOVERED 2 個係已刪嘅 `dramaFromFolder.{mjs,d.mts}`（冇嘢要驗）

## Hard Gates

all pass（Tests：CI 全 unit + 全 e2e 綠 + 本地目標 unit；Coverage：改咗嘅 scan / schedule / api 檔 ≥ 80%；PWA：n/a，冇改 `sw.js` / manifest；Security：401 / 403 / 412 / 413 / 422 本機核實；Performance：S-788 已喺 backlog，本機 workerd 唔量）

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- `npm run drama-from-folder -w apps/player` 只可以喺 repo root 跑（喺 subfolder 跑 npm 報「No workspaces found」，npm 本身行為）；README 已寫「喺 repo 跑」，唔使改
- Scan issue 字眼「本機 folder」喺 API 出 = S-785（已喺 backlog）

## 建議補測

- none（AC-10..AC-12 / AC-5 全部有 unit；高風險 `expandSchedule` 已覆蓋跨月 / 年 / 2-29 / 上限）

```handoff-receipt
status: pass
stage: S1
chain: api, drama, catalog-data, coming-soon, repo-tooling
commit: ccf8e16
next_action: main_agent_push_after_ci_then_merge
context: "Phase 2b-1 S1 pass @ccf8e16; CI 42730213299 cited; local wrangler smoke AC-10..12 ok; parity 48/48; CLI tsx + INIT_CWD ok; 5 chains S1 frozen; QA commit local only (not pushed)"
```
