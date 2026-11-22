# Code Review — 2026-11-22 — P2 tooling / docs（Lane K：`.mjs` lint、文件 drift、`npm audit fix`）

- 審閱者：Code Reviewer（獨立，冇寫呢啲 code）
- Branch：`chore/tooling/mjs-lint-docs-audit`，head `5e3a3a34`，base `origin/main` `204cbfde`
- 涵蓋 commit：`313f877d`（lint）、`f8140219`（docs）、`5e3a3a34`（lockfile）
- Tier：T1（tooling config + 文件 + lockfile；runtime code 冇變）
- 總評：**✅ pass，100/100**，冇 🔴 / 🟡

## Hard Gates

- Lint：pass（自己跑 `npm run lint`，exit 0；ESLint + `prettier --check .`）
- Type check：pass（自己跑 `npx tsc -b`，exit 0）
- Tests：冇重跑。改動冇對應 unit test（兩個 e2e runner、config、文件、lockfile）；developer 報 `npm test` 5660、api 449 + 40、build、player e2e 1184、`e2e:admin` 58 全綠，e2e 屬 QA / CI
- Coverage：n/a（冇改核心邏輯）
- No Critical：pass
- Security scan：pass（冇新增直接依賴；`package.json` 全部冇變）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                          |
| -------- | ------- | ------- | ----------------------------- |
| 正確性   | 25      | 25      | 文件每句都同 repo 對得上      |
| 安全性   | 20      | 20      | 淨係 dev 依賴嘅 minor / patch |
| 可維護性 | 20      | 20      |                               |
| 測試覆蓋 | 15      | 15      | n/a（冇邏輯改動）             |
| 性能     | 10      | 10      |                               |
| 代碼風格 | 10      | 10      |                               |
| **總分** | **100** | **100** |                               |

**結果：✅ pass**

## 驗過冇問題

### Commit 1 `313f877d` — `.mjs` lint

- `eslint.config.js` 新 block 真係生效：`eslint --print-config scripts/qa/ledger-merge.mjs` 有 64 條 rule，`no-undef` / `no-unused-vars` 都係 error，globals 有 `process`、冇 `window`（Node-only script 用到 browser global 會報）
- Repo 有 48 個 `.mjs`（`apps/admin/e2e` 11、`apps/player/e2e` 29、`apps/player/scripts` 4、`apps/api/scripts` 1、`scripts/ci` 1、`scripts/qa` 2），全部 lint 過（exit 0）。Browser globals 只畀 `apps/*/e2e/**` 同 `generateIcons.mjs`，同 brief 一致
- `apps/player/e2e/run.mjs`：`SWIPE_FROM_PX` 成個 `apps/player/e2e` 冇其他地方用，刪走安全
- `apps/admin/e2e/run.mjs:66`：`{ cause: error }` 只係保留原本 error，訊息冇變

### Commit 2 `f8140219` — 文件

- `.claude/CLAUDE.md`：將空白同表格分隔線正規化之後同 base 比，**只有兩行唔同**：「Unit（全部）」行改咗，同新增「Admin E2E」行。其餘行只係 Prettier 因為欄闊變咗而重新對齊，內容逐字一樣。符合用戶預先批准嘅範圍
- 「Unit（全部）」行：root `vitest.config.ts` 嘅 projects 係 `apps/player`、`apps/admin`、`packages/catalog`、`apps/api/vitest.config.ts`（`@903-player/api`）、`apps/api/vitest.scripts.config.ts`（`@903-player/api-scripts`）、inline `@903-player/repo-scripts`（`scripts/**/*.test.mjs`），逐個對過
- 「Admin E2E」行：root `e2e:admin` = `npm run e2e -w apps/admin --`；admin `e2e` = `npm run build && node e2e/run.mjs`；`build` = `tsc -b && vite build`；`run.mjs` 預設 port 4174、`E2E_PORT` 可改、`vite preview --strictPort`、mock `/api` 同 `/auth`、支援 `PW_CHROMIUM_PATH`，全部對得上
- `README.md:50`：舊嘅 `src/*/catalog.test.ts` 已經唔存在；`apps/player/src/catalog/libraryJsonSchemas.node.test.ts` 存在，亦真係驗 `library/<id>` 嘅 JSON
- `README.md:133`：player 同 admin 嘅 `package.json` 都係 `playwright ~1.63.0`
- `README.md:139`：player `e2e` = `npm run build -- --mode e2e && node e2e/run.mjs`

### Commit 3 `5e3a3a34` — `npm audit fix`

- 只改 `package-lock.json`（`git diff --name-only` 確認）
- 版本變動：`eslint` 10.13.0 → 10.15.0、`typescript-eslint` 同 `@typescript-eslint/*` 8.71.2 → 8.73.0、`@eslint/config-array` 0.23.5 → 0.23.6、`ignore` 7.0.12 → 7.0.16、`semver` 7.8.5 → 7.8.6、`fast-uri` 3.1.8 → 3.1.9、`serialize-javascript` 7.1.2 → 7.1.4。直接依賴冇 major bump，全部 `dev: true`

## 🟢 / Observation

- `S-1437` `README.md:127`：註解「player 同 catalog 都會 match」唔啱。`src/utils` 而家 match 嘅係 `apps/player/src/utils` 同 `apps/admin/src/utils`；`packages/catalog/src` 冇 `utils`。舊有問題（唔係今次引入），但同一個 commit 就係修 README drift，建議喺呢個 PR 改一行（「player 同 admin 都會 match」）。唔 block
- `S-1438` `eslint.config.js:55`：e2e block 嘅 `...globals.node` 多餘（flat config 會同上一個 `**/*.mjs` block 嘅 globals 合併），可以只寫 `globals.browser`。純風格，可以唔改
- `S-1439` `package-lock.json`：`eslint`、`@eslint/config-array`、`@typescript-eslint/typescript-estree` 各自多咗 nested `minimatch` 11.0.9（頂層仍然係 10.2.6）同新 transitive 套件 `@isaacs/nonrecursive-glob-match` 1.1.0（BlueOak-1.0.0，寬鬆 license）。`minimatch` 11 要 Node `20 || >=22`，CI / Deploy 用 Node 22，本機 22.23.5，冇影響。Observation，唔使跟進
- `S-1440` `eslint.config.js`：`.cjs`（得一個：`apps/player/scripts/arcCover/review/verify.cjs`）同 `eslint.config.js` 自己仍然冇 rule。照 brief 屬範圍外，唔 block；要唔要做由 main agent 決定（`.cjs` 要 `sourceType: 'commonjs'`）
- Version：lane 冇 bump（照 project 慣例由 main agent 喺 release 統一處理）；今次冇 runtime 改動

## ✅ 做得好嘅地方

- `.mjs` 嘅 browser globals 收窄到真係有 `page.evaluate` 嘅檔，Node-only script 用錯 global 會被捉到
- `CLAUDE.md` 改動嚴格守住用戶批准嘅兩行
- Lint 改動同 lockfile 升級分開 commit，容易 revert

## Handoff

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: n/a
  coverage: n/a
  no_critical: pass
  security_scan: pass
next_action: invoke_qa
next_agent: quality-assurance
context: "Pass at 5e3a3a34. No C / W. Open non-blocking: S-1437 (README.md:127 comment, one-line fix recommended in this PR), S-1438 (redundant globals.node, optional), S-1439 (nested minimatch 11, observation, no action), S-1440 (.cjs / eslint.config.js unlinted, out of scope, main agent decides). Reviewer re-ran lint and tsc only; unit / e2e results are the developer's. Ledger rows touched: repo-tooling (eslint.config.js, package-lock.json, apps/player/e2e/run.mjs), coming-soon (package-lock.json, apps/player/e2e/run.mjs), admin (apps/admin/e2e/run.mjs)."
```
