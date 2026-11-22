# QA — p2-tooling-docs（Lane K）— 2026-11-22 — S1

- Tier: T1（tooling / lockfile / docs，冇 shipped runtime 改動、冇 bump version）| Commit: `a9b7359d` | Verdict: ✅ pass
- Ledger（base `204cbfde`）：SKIP 12 / REVERIFY 3（`repo-tooling` `admin` `coming-soon`）/ UNCOVERED 0 / IGNORED 3（docs）
- Review：`.proj-docs/reviews/2026-11-22_review_p2-tooling-docs.md`（100/100）；plan：`.proj-docs/qa/plans/repo-tooling.md` AC-14（新增）、`admin.md` / `coming-soon.md` 沿用
- Branch 未 push → 冇同 SHA 嘅 CI 可引用，以下全部喺 `a9b7359d` 本機跑（exit code 直接檢查，冇 pipe）

## Runs

| Command                                                                        | Result                                                      | Time  |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----- |
| `npm run lint`                                                                 | exit 0                                                      | 84s   |
| `npx tsc -b`                                                                   | exit 0                                                      | 35s   |
| `npm test`                                                                     | exit 0，532 files / 5660 tests                              | 430s  |
| `E2E_PORT=4391 PW_CHROMIUM_PATH=… npm run e2e`                                 | exit 0，PASS 1184 / FAIL 0                                  | 1156s |
| `E2E_PORT=4392 PW_CHROMIUM_PATH=… npm run e2e:admin`                           | exit 0，PASS 58 / FAIL 0                                    | 120s  |
| `VISUAL_PORT=4471 PW_CHROMIUM_PATH=… npm run e2e:visual`（base = merge-base）  | exit 0，234 張全部一樣（base 用 HEAD node_modules，見下行） | 385s  |
| `npm run build`（HEAD）vs base worktree `npm ci && npm run build`，dist sha256 | 77 / 77 檔一樣（`diff` exit 0，包括 `sw.js`）               | —     |
| scratch `.mjs` × `npx eslint`（HEAD vs base，驗完刪）                          | 見 AC-14 ①                                                  | —     |
| `npm audit`                                                                    | 4 moderate（base 1 low + 13 moderate）                      | —     |

## AC-14 驗收

1. **`.mjs` lint 生效**：`apps/player/e2e/zz.mjs`（unused const + 未定義名 + `document`）→ HEAD exit 1：`no-unused-vars`、`no-undef 'undefinedName'`，`document` 冇報、`_ok` 豁免；`scripts/zz.mjs`（unused + `document`）→ exit 1：`no-undef 'document'`（browser globals 只限 e2e）；乾淨 `process.env` 檔 exit 0。Base 同三個檔全部 exit 0（即係之前冇 lint）
2. **README / CLAUDE.md 逐句核實**：`apps/player/src/catalog/libraryJsonSchemas.node.test.ts` 存在、逐個 `library/*/drama.json` / `show.json` 過 schema；`src/utils` 子字串只 match `apps/player`（17 檔）+ `apps/admin`（1 檔），catalog 冇；Playwright `~1.63.0` 喺 player + admin `package.json`；player `e2e` script = `npm run build -- --mode e2e && node e2e/run.mjs`。CLAUDE.md Unit 行 = root `vitest.config.ts` projects（player / admin / catalog / `apps/api/vitest.config.ts` = `@903-player/api` / `vitest.scripts.config.ts` = `@903-player/api-scripts` / inline `@903-player/repo-scripts` `scripts/**/*.test.mjs`）；Admin E2E 行：admin `e2e` = `npm run build && node e2e/run.mjs`、`build` = `tsc -b && vite build`（冇 mode）、`vite preview --port … --strictPort`、`E2E_PORT || 4174`、`page.route(/\/(api|auth)\//)` mock、`executablePath: process.env.PW_CHROMIUM_PATH`：全部屬實
3. **Lockfile**：逐 package 比 base，21 項全部 `dev`、0 major（eslint 10.13→10.15、typescript-eslint 8.71.2→8.73.0、fast-uri 3.1.8→3.1.9、serialize-javascript 7.1.2→7.1.4，加 3 個 nested `minimatch` 11.0.9 + `@isaacs/nonrecursive-glob-match`）；root / workspace manifest 冇改。`npm audit` 剩 4 moderate = `vite-plugin-pwa` → `workbox-build` → `glob` / `minimatch`（fix 要 semver-major）
4. **e2e runner**：player / admin e2e 全綠（上表）；`{ cause }` / 刪 `SWIPE_FROM_PX` 過 lint
5. **現有用戶零影響**：serialize-javascript 經 `workbox-build` 砌 `sw.js` → 用 repo-tooling Phase 0a 指令比 production `dist`：77 檔 sha256 全部一樣

## Hard Gates

all pass（Coverage n/a：改動係 config / e2e runner / lockfile，冇 source；PWA gate n/a：`dist` byte-for-byte 一樣）

## Findings

冇（0 個 🔴 / 🟡 / 🟢）

## Freeze

- `repo-tooling` S1：51 → 51 行（plan 改咗，重新 freeze）；`admin` S1：472 → 472；`coming-soon` S1：163 → 163；chain + stage + path 同 base 比冇少行（4320 → 4320）；`status` 三條鏈 S1 = FROZEN，S3 行照舊 STALE（等 release S3）
- 未驗：coming-soon plan 嘅手動 Playwright 多 viewport 睇格（`dist` 一樣 + e2e「即將上架 / 快將下架」section 綠，冇 UI 改動，唔做）；CI（branch 未 push）

## 建議補測

- none
