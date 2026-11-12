# QA — Lane D repo tooling — 2026-11-12 — S1

- Tier: T1（root config / CI workflow，冇 app code）| Commit: `8ff0756` | Verdict: ✅ pass
- Ledger（base `450e5d4` = merge-base origin/main）: SKIP 11 / REVERIFY 3（`repo-tooling` `api` `coming-soon`）/ UNCOVERED 0 / IGNORED 2（review 報告、`ledger-ignore`）
- `api`：`deploy-api.yml` 屬 api 鏈（ledger 行 + `plans/api.md` scope），唔搬去 repo-tooling；`plans/api.md` 加 AC-20（S-769）
- `coming-soon`：淨係 `package-lock.json` root devDeps block（解析版本唔變，`npm ls` 全部 `deduped` 去 `typescript@6.0.3` / `vitest@5.0.5`）→ 沿用 plan 重新 freeze，冇額外驗
- Plans：`plans/repo-tooling.md` 加 AC-5（S-752 / S-759 / S-761 / S-762 / S-766）、scope 加 `.proj-docs/qa/ledger-ignore`、Out of scope 註明 `deploy-api.yml` 屬 api、`.vscode/` / `arcCover/` 改由 ledger-ignore 處理
- S-781（GitHub Environment）冇做：要用戶設定，唔計入今次 AC

## Runs

| Command                                                                                        | Result                                                                    | Time  |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----- |
| `npm run coverage`（root，S-761）                                                              | 267 files / 3217 tests pass；All files stmts 98.59 / lines 99.32；exit 0  | 115 s |
| `deploy-api.yml` / `ci.yml` YAML parse + 每步 `env` 清單（python `yaml.safe_load`）            | ok（見下）                                                                | 1 s   |
| `Require main` guard `run:` 抽出，`REF=refs/heads/feat bash --noprofile --norc -eo pipefail`   | `::error::Deploy API only runs on main (got refs/heads/feat)…`，exit 1    | 1 s   |
| `qa-ledger.sh impact --since eb781cd~1`（有改 `.vscode/` / `arcCover/` 嘅 base）               | 兩個 path 冇出 UNCOVERED（入 IGNORED）                                    | 1 s   |
| CI `8ff0756` run [43231620345](https://github.com/dcwhung/903-player/actions/runs/43231620345) | completed success（lint、tsc、unit 353 / 3784、build、smoke、e2e、admin） | 16 m  |

- 冇喺本機重跑 `npm test` / `npm run e2e`：同一個 SHA CI 已綠，引用 run

## 驗證要點（L2）

- AC-5 production smoke：e2e job step 7「Production smoke (catalog flag off)」success（5 s），log `{ versionShown: true, catalogRequests: [], pageErrors: [] }`；`sw.js` `catalog-json` grep 冇觸發 `::error::`；step 8 `npm run e2e`「All E2E checks passed」喺 smoke 之後照跑
- AC-5 artifact：check job「Upload production build」success → e2e job「Download production build」success
- AC-5 coverage：報告目錄同時有 `apps/player/{src,scripts}` 同 `packages/catalog/src/{admin,document,dramas,scan,schedule,selectors,shows}`
- AC-20 S-769：job-level `env` 空；`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 只喺 `Apply D1 migrations`、`Deploy Worker`；第一步 `Require main`（`if: github.ref != 'refs/heads/main'`），之後次序 checkout → setup-node → npm ci → npm test → build admin → check admin → migrate → deploy（AC-17 不變）。真 run = merge 後 main push
- AC-3：lockfile 只加 root devDeps 三行，CI `npm ci` 過

## Hard Gates

all pass（Coverage：改動檔全部係 config / workflow，n/a；Security：secret 範圍收窄，見 AC-20）

## Findings

- 冇 🔴 / 🟡
- Observation O-1：真 `workflow_dispatch` 非 main 被擋、main push deploy 用 step-level secret 成功，要 merge 後先證到（S2 / deploy 時睇 Deploy API run）

## 建議補測

- none（CI / tooling 改動，冇高風險邏輯）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: repo-tooling S1, api S1, coming-soon S1 (lockfile root devDeps only, re-frozen)
tickets: none
ci: run 43231620345 @ 8ff0756 — completed success (lint, tsc, unit 353/3784, build, production smoke, e2e, e2e:admin)
next_action: main agent push (CI already completed); merge PR after branch-head `npm run lint`
context: T1, 0 blocking findings; S-752/S-759/S-761/S-762/S-766/S-769 verified; S-781 not in scope (needs user GitHub Environment)
```

## 補註（merge `origin/main` 後重新 freeze）

- `main` 經 PR #207 改咗 `apps/player/e2e/run.mjs`（preview 起停加固，已經有自己嘅 review / QA），同今次改嘅檔冇重疊；ledger 衝突取 `main` 版本，再用合併後內容重新 freeze `api`、`coming-soon`、`repo-tooling` S1（路徑同上面一樣）
- 證據：合併 commit 嘅 CI run（lint、unit、build、production smoke、e2e）
