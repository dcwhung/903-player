# QA — api 0.8.1 Phase 4 L1 review backlog（S-900..S-905 + W-732、S-945..S-948）— 2026-11-13 — S1

- Tier: T1（PATCH；只限 `apps/api`，`GET /api/publishes` 加一個欄位）| Commit: `d6e9b0b`（review `8c52c7f`）| Verdict: ✅ pass
- Ledger（base `df90c05` = merge-base origin/main）: SKIP 13 / REVERIFY 1（`api`）/ UNCOVERED 3（`apps/api/src/assets/imageName.ts` + `apps/api/test/imageName.test.ts` → 入 `api`；`package-lock.json`）/ IGNORED 3
- `package-lock.json`：diff 淨係 `apps/api` version `0.8.0 → 0.8.1` 一行。UNCOVERED 係因為 base `df90c05` 嘅 ledger 冇咗 `coming-soon` / `repo-tooling` 嘅 lockfile 行（`22e0e84` merge 時跌咗；origin/main `d536dd9` 已補返）→ 沿用 plan 重新 freeze 兩條鏈（成條 chain + stage，加返 lockfile），冇額外驗。之後 merge `main` 會撞呢兩行，跑 `node scripts/qa/ledger-merge.mjs`，exit 1 列出就重新 freeze
- Plan：`plans/api.md` 加 AC-23 + scope 加 `assets/imageName.ts`
- e2e：唔跑 — diff 冇 player / admin 檔，api plan 冇列 e2e（AC-22 / AC-23 只靠 workerd vitest）

## Runs

| Command                                                                          | Result                                           | Time |
| -------------------------------------------------------------------------------- | ------------------------------------------------ | ---- |
| `npm test`（`apps/api`；= `vitest.config.ts` + `vitest.scripts.config.ts`）      | workerd 17 files / 271 pass；scripts 1 / 12 pass | 16 s |
| `npm test -- packages/catalog/src/schedule`（plan 指令，scope 檔冇改）           | 2 files / 80 pass                                | 3 s  |
| `npx tsc -b`（`apps/api`）                                                       | exit 0                                           | 4 s  |
| `npm run lint`（root：eslint + `prettier --check .`）                            | exit 0                                           | 40 s |
| coverage（`apps/api` workerd v8，`--coverage.include` 改動檔）                   | 見 Hard Gates                                    | 14 s |
| Mutation 核 W-732（`sources.ts:117` 改做 `.slice(0, 1)`，跑 `r2Source.test.ts`） | 19/19 照綠（見 S-949）；已還原                   | 5 s  |
| CI                                                                               | n/a — branch 未 push（`d6e9b0b` 冇 run）         | —    |

## 驗證要點（L2，對 AC-23）

- S-900：`r2Source.test.ts`「several levels」（`廣播劇/黃金少年` 嘅 sources 同 r2-source 200、上一層 404）、「nested drama folders」200 — 綠
- S-901：`banner.test.ts`「read only the WebP header」（spy 兩次 get 都係 range 30）；`webp.test.ts` `parseWebpHeader` VP8 / VP8L / VP8X、成個細檔、非 WebP、VP8 截短 throw — 綠
- S-902：`banner.test.ts` R2 冇 object → `not uploaded`、唔係 WebP → `is not a valid WebP` — 綠
- S-903：`banner.test.ts` `GET /api/publishes` 淨換 banner `items` 空但 `bannerChanged: true`、第一次 publish 有 banner 先 true — 綠
- S-904：`r2Source.test.ts` `image/jpg` 200 + `content-type: image/jpeg`；S-905：`imageName.test.ts` — 綠
- Review 修正：W-732 test 已改用內層先掃到嘅 key；S-945 CHANGELOG 寫明 PATCH 慣例；S-946 `sameBanner`；S-947 `flatMap` + 最深排先；S-948 `readChunk` 收 `Pick<Chunk, 'kind' | 'payload'>`

## Hard Gates

all pass。Coverage（lines）：`admin/changes.ts` 97.9、`assets/imageName.ts` 100、`assets/webp.ts` 100、`banner/routes.ts` 100、`assets/routes.ts` 97.6、`catalog/publish.ts` 97.6、`content/sources.ts` 97.5。Security：r2-source 白名單仍然係即場掃描 exact match（S-900 前綴只揀候選劇），由 test 證（L2）

## Findings

- 冇 🔴 / 🟡
- 🟢 S-949 `apps/api/src/content/sources.ts:98`、`apps/api/test/r2Source.test.ts:186`：S-947 最深排先之後，W-732 test 又驗唔到逐套掃 loop — `.slice(0, 1)` mutation 19/19 照綠（L2）；刪走 `.sort` 亦照綠。最深嗰套劇對佢 prefix 下面嘅檔一定列得出外層會列嘅 key（同一層檔、同一套 `coverRolesOf`），所以第二套之後實際行唔到，行為冇錯（冇違反 AC）。修：`sources.ts:98` 註解「通常掃一次就中」改做「最深嗰套一定列晒外層喺佢 prefix 下面會列嘅 key，loop 只係保險」；export `dramasCoveringKey`（`:100`），`r2Source.test.ts` 加一個 test 驗 `(await dramasCoveringKey(env.DB, deep)).map((d) => d.folder)` 等於 `[inner, FOLDER]`，鎖住最深排先（S-947）；`:186` test 名改做「should serve a key only the inner drama folder scans」
- Observation（review 已列，唔重複）：`banner/routes.ts:39` 真 R2 range 超出 object 長度；`apps/admin/src/api/types.ts:89` 未有 `bannerChanged`

## 建議補測

- S-949 嘅 `dramasCoveringKey` 次序 test（上面）；其他 none（S-900..S-905 每項已有專屬 test）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: api S1 (re-frozen, AC-23 added, imageName.ts in scope); coming-soon S1, repo-tooling S1 (lockfile api version line only; restored package-lock row, re-frozen)
tickets: none
ci: n/a (branch not pushed; no run for d6e9b0b)
next_action: main agent fixes S-949 in this PR, then push code + docs together and wait for CI green (lint, unit, build, e2e) before merge; merge main → run scripts/qa/ledger-merge.mjs
context: T1, 0 blocking findings, new ID S-949 only; e2e not run (no player/admin change)
```

## S-949 修正（main agent）

- `dramasCoveringKey` export，`r2Source.test.ts` 加 test 鎖住「最深嘅劇排先」（`[inner, FOLDER]`）；註解改寫做「最深嗰套已經夠，loop 只係保險」；`:186` test 改名
- `apps/api` `npm test`：workerd 272 pass、scripts 12 pass；`tsc -b`、repo root `npm run lint` 過
- `api` S1 成條鏈（111 個檔）重新 freeze
