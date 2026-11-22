# QA — AU-015 / AU-016 / AU-019 CI 同 deploy 把關 — 2026-11-22 — S1

- Tier: T3（workflow / deploy；冇 app / Worker code、冇 version bump）| Commit: `9a62db0`（branch `fix/ci/au-015-016-019_ci-deploy-gating`，已 merge `origin/main` `dbb310a`，未 push）| Verdict: ✅ pass
- Ledger（`impact --since dbb310a` = merge-base `origin/main`）: SKIP 13 / REVERIFY 2（api、repo-tooling）/ UNCOVERED 2（`scripts/ci/detect-code-changes.{sh,test.mjs}`）/ IGNORED 2；freeze 後 UNCOVERED 0，兩條鏈仍列 REVERIFY 只因 S3 行 STALE（留俾下次 release S3）
- UNCOVERED 歸屬：入 `repo-tooling` 鏈、冇改 `ledger-ignore`。規則：`ledger-ignore` 只收「唔屬任何功能鏈、唔入 build / CI」嘅本機工具（S-762；`scripts/qa/*` 係 merge 時本機跑）；`scripts/ci/*` 由 `ci.yml` 直接叫、決定 check / e2e 跑唔跑 = plan Chain 嘅「CI（`ci.yml`）」
- Plan：`.proj-docs/qa/plans/repo-tooling.md` 加 AC-13（`ci.yml` 偵測 + `deploy.yml` 權限）；`.proj-docs/qa/plans/api.md` 加 AC-34（`deploy-api.yml` / `import-catalog.yml` 一直凍結喺 api 鏈，repo-tooling plan 寫明 out of scope）。Review: `.proj-docs/reviews/2026-11-22_review_p1-ci-import_batch.md`（Fix 2，兩輪 pass，S-1401 / S-1404 已關）

## Runs

| Command                                                                                             | Result                                                     | Time  |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----- |
| `npm run lint`                                                                                      | exit 0                                                     | 90 s  |
| `npx tsc -b`                                                                                        | exit 0                                                     | 33 s  |
| `npm test`（root，全部 projects；包括 `@903-player/repo-scripts` 20 個 = detect 13 + ledger 7）     | 530 files / 5611 tests 綠                                  | 366 s |
| `actionlint` 1.7.12 四個 workflow（冇 shellcheck，`run:` 內容冇 lint）+ PyYAML parse                | exit 0，四個檔 parse 到                                    | 1 s   |
| Detect script：scratchpad 臨時 git repo × 8 + branch HEAD（`env -i`，只設 `GITHUB_SHA` / `OUTPUT`） | 全部符合預期（見下）                                       | 5 s   |
| Scratch copy（`git archive HEAD`，proxy 照舊）`npm ci --ignore-scripts` → admin build → wrangler    | 全部 exit 0（見下）                                        | 2 min |
| `import-catalog.yml` Import / Summary `run:` 抽出嚟用 `bash --noprofile --norc -eo pipefail` 跑     | 7 個情境 exit 0，參數 + Summary 啱；npm fail → step exit 3 | 3 min |

- e2e / visual 冇跑：repo-tooling plan AC-12 / AC-13 同一條規則（冇 app code → n/a）；`dist` 輸入冇變。永遠冇跑 `--remote`，冇 Cloudflare call，冇 trigger workflow

## Scenarios（→ 證據；證到乜 / 證唔到乜）

- Detect script（真 script、真 git；證到分類邏輯，證唔到 runner 上 `fetch-depth: 0` checkout 真係有 `origin/main`）：code 之後淨 docs commit → `code=true`；淨 docs branch（`.md` + `.proj-docs/`）→ `false`；`git mv src/a.ts docs/a.md` → `true`；`docs/筆 記/中文 筆記 a.md` + `說明 文件.md` → `false`；冇 `origin/main` → `base=none code=true`；SHA = `origin/main` → `true`；冇 `GITHUB_SHA` → exit 2、output 檔冇開；加碼：檔名有 tab → `true`（安全嗰邊）。呢條 branch HEAD：`base=dbb310a… code=true`
- Workflow 結構（讀 + parse；證到語法同接線，證唔到 runner 行為）：`ci.yml` `check` `needs: changes` + `if: needs.changes.outputs.code == 'true'`、`e2e` `needs: check`；`deploy-api.yml` `deploy` `needs: build` 冇 `if`，artifact `admin-dist` 上載 `apps/admin/dist` → 下載去 `apps/admin/dist`（= `wrangler.toml` `../admin/dist`），兩個 job 第一步都係非 main 守衛（抽出嚟跑：exit 1）；`deploy.yml` workflow `contents: read`、`build` `contents: read` + `pages: read`、`deploy` `pages: write` + `id-token: write`；四個檔所有 `run:` 冇 `${{ }}`；`secrets.*` 只喺 `deploy-api.yml` 三個 step + `import-catalog.yml` Import step 嘅 `env`
- Secret step 冇變：`origin/main` 同而家由 `Apply D1 migrations` 到檔尾（33 行，三個 step）`diff` 冇輸出；parse 後三個 step 物件相等
- Secret job install（真 npm / wrangler 4.158.0，local；證到冇 lifecycle script 都用得，證唔到 `--remote` / runner）：lockfile 有 install script 嘅只有 `esbuild` / `fsevents` / `workerd`；`npm ci --ignore-scripts` exit 0 → `npm run build -w apps/admin` exit 0（有 `index.html`）→ `wrangler deploy --dry-run` exit 0（讀到 assets、bundle 340.50 KiB、3 個 binding）→ `wrangler d1 migrations apply 903-player --local` 7 個 ✅ → `npm run import -w apps/api -- --local --dry-run` / `… --overwrite` exit 0。註：真 workflow 嘅 admin build 喺 build job（完整 `npm ci`）做，呢度喺 `--ignore-scripts` 嘅 tree build，係更嚴嘅條件
- Import / Summary step（PATH 上 `npm` shim 記低參數、`--remote` 換 `--local` 再叫真 npm；輸出係真 script 對 local D1）：(1) Dry run 預設：參數 `--remote --dry-run`；title `Import catalog (dry run)`、`entries: 13 to insert…`、59 steps、「Nothing was written. Run again…」；D1 / R2 前後 0；(2) 真跑預設有 insert：參數 `--remote`；59 steps、「Next: open the ops page and **Publish**.」；D1 13 entries / 58 assets、R2 58；(3) 真跑 / dry run 冇嘢加：0 steps → 「Nothing was changed… nothing new to publish.」/「…a real run would not change anything…」（S-1404）；(4) Overwrite（先改 `dramas/jim`）：dry `--remote --dry-run --overwrite`、真跑 `--remote --overwrite`；title `- OVERWRITE`、`1 to overwrite, 12 unchanged`、粗體 `WARNING:` 行；dry run 後 `jim` 冇變，真跑後變返 repo 版本；(5) Import fail（假 npm exit 3）→ step exit 3（pipefail，Summary 唔會跑）

## Hard Gates

all pass（Coverage n/a：冇 app source，`detect-code-changes.sh` 每個分支都有 unit + 上面實跑；Security：secret 範圍見上；PWA gate no；Performance n/a）；建議補測：none — no edge case gap（detect script 13 個 unit 已鎖 AU-015 兩個情境 + fallback + S-1401）

## Findings

冇三層收斂嘅 🔴 / 🟡；🟢 / Observation（唔 block）：

- `--overwrite` 重跑而冇行要蓋（`0 to overwrite, 13 unchanged`）：SQL step 照跑一次 → Summary 寫 1 step +「Next: … **Publish**」+ `WARNING: … replaces 0 existing entries`，其實冇嘢變。S-1404 只定義「0 個 wrangler step」，冇 L1；純文字，要唔要改由 main agent / 用戶決定

## Merge 後先驗到（第一次真 Actions run）

- Branch push：`changes` job 真 output（淨 docs branch 跳過 check / e2e；有 code 嘅 branch 之後淨 docs push 照跑全套）；`Import catalog`：新 input `overwrite` 喺 UI 出到、真 dry run Summary
- `Deploy API`（S-1403：path filter 包括 workflow 自己 → merge 即係 production deploy，要睇住）：build job 綠、`admin-dist` 上載 / 下載、`--ignore-scripts` 之下三個 wrangler step、`/api/health` + admin SPA 出到（api AC-34）；`Deploy`（Pages）：build job `pages: read` 過到 `configure-pages`（fail = build 紅、冇半套；補救見 repo-tooling AC-13）

## Freeze

S1 @ `9a62db0`：`api` 158 → 158（hash 變 3 行：兩個 workflow + plan）、`repo-tooling` 49 → 51（多 `scripts/ci/*` 兩行；hash 變 3 行：`ci.yml`、`deploy.yml`、plan）；每條都畀晒成條 chain + stage 嘅檔。同 `origin/main` 比 chain + stage + path：冇少行、只多上面兩行（4316 → 4318）；其他鏈同 S3 行 byte 一樣

```handoff-receipt
protocol: 1
status: pass
stage: S1
chain: api, repo-tooling
commit: 9a62db0
ci_run: n/a
next_action: merge_ready
branch: "fix/ci/au-015-016-019_ci-deploy-gating"
context: "AU-015/016/019 S1 pass at 9a62db0: lint / tsc -b / npm test 530 files 5611 green; detect script 8 temp-repo scenarios + branch HEAD code=true; actionlint + YAML parse clean, no expr in run, 3 secret steps byte-identical to origin/main; scratch copy npm ci --ignore-scripts + admin build + wrangler deploy --dry-run + local migrations + local import dry runs exit 0; import-catalog Import / Summary steps run extracted in 7 scenarios; no e2e (no app code); api S1 158 rows, repo-tooling S1 49 -> 51 (scripts/ci/* added to chain, ledger-ignore untouched), no rows lost; plans: repo-tooling AC-13, api AC-34; first real Deploy API / Deploy / CI changes / Import catalog runs only verifiable after merge (S-1403: watch Deploy API); observation: overwrite re-run with nothing to overwrite still says Publish; branch not pushed, no CI run yet"
```
