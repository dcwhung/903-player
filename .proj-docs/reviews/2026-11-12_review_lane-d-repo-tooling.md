# Code Review — 2026-11-12 — Lane D repo tooling（S-752 / S-759 / S-761 / S-762 / S-766 / S-769）

- 審閱者：Code Reviewer（subagent）
- 目標：`refactor/lane-d-repo-tooling` `450e5d4..8ff0756`（1 個 commit，6 個檔：`ci.yml`、`deploy-api.yml`、`.proj-docs/qa/ledger-ignore`、root `package.json` / `package-lock.json`、root `vitest.config.ts`）
- SSoT（L1）：`.proj-docs/backlog.md` 六個 ID 嘅描述同 Source 報告；`.proj-docs/qa/plans/repo-tooling.md` AC-2 / AC-3
- Tier：T2（CI / deploy workflow、root 依賴同 coverage 設定；冇改 app 源碼，player / admin / api bundle 唔受影響）
- 總評：六項都跟足 backlog 做，冇 🔴 / 🟡。`deploy-api.yml` 嘅 secret 而家只有 wrangler 兩步攞到，`Require main` 喺 checkout 之前用 `working-directory: .`，冇問題。Production smoke 我喺本機跑過，結果同開發者一樣。留低 4 條 🟢，最重要係 S-852：production 由 v1.31.1 起已經設咗 `VITE_CATALOG_URL`，所以呢個 smoke 守住嘅「flag off」唔再係 production 實際行緊嘅路徑
- S-781（GitHub Environment）今次冇做，因為要用戶喺 GitHub Settings 開 environment，backlog 保留 open；`deploy-api.yml` 檔頭注釋已經寫明 main guard 只係防手滑

## Hard Gates

- Lint：`npm run lint`（eslint + `prettier --check .`）exit 0
- Type：`npx tsc -b` exit 0
- Tests：diff 冇改到 test 對象；root coverage 設定用兩個檔驗（`npx vitest run --coverage --project @903-player/player --project @903-player/catalog apps/player/scripts/catalogCaching.test.ts packages/catalog/src/admin/airTime.test.ts`）：2 檔 40 pass。json-summary 有 330 檔（catalog src 50、player src 276、player scripts 4），冇 test 檔 / `.d.ts` / `main.tsx`，亦冇 project 以外嘅檔，同開發者嘅數一樣
- Coverage：n/a（冇新 logic；呢次係加 coverage 報告，冇設 threshold）
- Security：新增嘅 root devDependencies 全部係 workspace 已經用緊嘅同一版本（`npm ls`：typescript 6.0.3、vitest 5.0.5、@vitest/coverage-v8 5.0.5 都係 deduped），冇新 package 入 lockfile → pass；No Critical：pass
- CI：head `8ff0756` run `43231620345` 跑緊（e2e 同新 smoke 由佢驗，唔重跑）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                            |
| -------- | ------- | ------- | ----------------------------------------------- |
| 正確性   | 25      | 25      | 六項同 backlog 一致；smoke 本機正面跑過         |
| 安全性   | 20      | 20      | secret 收窄到 wrangler step；冇新依賴           |
| 可維護性 | 20      | 20      | 注釋寫明 `--project` 下 coverage pattern 點解讀 |
| 測試覆蓋 | 15      | 15      | CI 多咗 production smoke；YAML 冇得寫 unit test |
| 性能     | 10      | 10      | artifact 只留 1 日；smoke 用 4174 唔撞 e2e      |
| 代碼風格 | 10      | 10      | lint / prettier 過                              |
| **總分** | **100** | **100** |                                                 |

**結果：✅ pass**

## 🟢 / Observation

- S-852 `.github/workflows/ci.yml` production smoke：`deploys/2026-11-10_deploy_v1.31.1.md` 寫明 CI build 嘅 `VITE_CATALOG_URL` 已經指向 Worker，即係 production 而家係 flag 開 + prebuild snapshot。新 step 守住嘅係「repo variable 冇設」嗰個 fallback 設定（呢個設定仍然有效，backlog S-766 原文都係咁要求），但 step 注釋寫「production 真正 flag off 路徑」會令人以為 production 行緊呢條路。建議改注釋做「repo variable 未設時嘅 flag off 設定」；production 真正行緊嘅路徑（真 Worker + snapshot）CI 依然冇 smoke，可以考慮另外開 backlog
- S-853 `ci.yml` `player-dist-production` 設咗 `retention-days: 1`：CLAUDE.md 講過 e2e 被 cancel 之後要 rerun 補跑。如果超過 1 日先「Re-run failed jobs」，check job 唔會重跑，所以 e2e job 會喺 `Download production build` 就 fail。可以改做 3–7 日，或者喺 runbook 寫明超過 1 日要 re-run all jobs
- S-854 `ci.yml` smoke 等 preview 嗰個 curl loop：等夠 30 秒都唔會報錯，之後由 `page.goto` 嘅 ECONNREFUSED 令 step fail，而 `$RUNNER_TEMP/preview.log` 從來冇印出嚟，fail 咗都睇唔到原因。可以 loop 完再 `curl -sf` 一次，唔得就 `cat` 個 log 再 `exit 1`
- S-855 `README.md:160-168`：寫住「root scripts 轉發去 `apps/player`」，而 `npm run coverage` 而家係 root vitest 跑 player + catalog，唔再係轉發。可以喺 `# 覆蓋率` 後面補「（player + catalog）」

## 重點檢查

- **S-752 / S-759**：root 宣告嘅 range 同 workspace 完全一樣（`^6.0.3`、`^5.0.5`）；lockfile 淨係 root `devDependencies` block 多咗三行，冇 `"peer"` 噪音，舊 package 版本一個都冇郁（repo-tooling AC-3）✅
- **S-761**：我睇咗 vitest 嘅 `isIncluded`，加上面 L2 嘅數，確認開 `--project` 之後 include / exclude 係對每個 project root match，所以用 `src/**` 係啱。另外多咗 exclude `**/*.d.ts`，比 player 自己個 config 更乾淨。`npm run coverage -w apps/player` 依然用 `vite.config.ts` 嗰份設定 ✅
- **S-762**：用 `qa-ledger.sh` `is_ignored` 同一個 glob 規則試過：`.vscode/settings.json`、`arcCover/generate.py`、`arcCover/sub/x.py` 都 match；`scripts/generateIcons.mjs` 冇 match（冇錯殺）✅
- **S-769**：job 層 `env` 已經刪走；兩個 wrangler step 各自有 token / account id；`npm ci`（lifecycle script）、`npm test`、admin build 都攞唔到 secret。`Require main` 擺第一步，checkout 之前 `apps/api` 仲未存在，所以用 `working-directory: .`（`GITHUB_WORKSPACE` 喺 checkout 之前已經存在）。`REF` 經 env 傳入，唔會有 expression injection ✅
- **S-766**：
    - check job `npm run build` 之後上載 `apps/player/dist`，`if-no-files-found: error`。`public/` 冇 dotfile，所以 upload-artifact 預設唔上載隱藏檔都唔受影響
    - e2e job 喺 Playwright 裝好之後、`npm run e2e` 覆蓋 dist 之前做 smoke，次序啱
    - Heredoc：YAML block scalar 去咗縮排之後 `EOF` 喺第 0 格，`<<'EOF'` 唔會做變數展開；我用 python yaml 抽出 `run` 跑過 `bash -n`，冇 syntax error
    - `pkill -f "vite preview --port 4174"` 會連 `npm exec` 同真正 listen 嘅 vite 一齊收，我本機跑完冇 process 留低
    - 版本號：`HomeStack` / `HomeWide` 每次只 render 一個 `AppVersion`，所以 `getByText(exact)` 唔會撞 strict mode
    - L2：本機 `npm run build` → `sw.js` 有 0 個 `catalog-json`；喺 `apps/player` 用 `RUNNER_TEMP` / `SMOKE_PORT=4174` 跑抽出嚟嘅 script → `{ versionShown: true, catalogRequests: [], pageErrors: [] }`，exit 0
    - actionlint 喺 sandbox 都下載唔到，以上係逐行人手讀 + 本機實際跑嘅結果；`actions/upload-artifact@v5` / `download-artifact@v5` 同 repo 現有寫法一致
- **Version**：冇 bump。三個 app 嘅源碼同 build 設定都冇改（root `vitest.config.ts` 唔入 build），所以 dist 唔會變，跟 repo-tooling AC-1 嘅做法 → n/a
- **TDD**：CI YAML / config 冇得寫 unit test；smoke 本身就係測試，開發者亦講咗反向 build（設 `VITE_CATALOG_URL`）時兩項檢查都會 fail

## ✅ 做得好嘅地方

- `vitest.config.ts` 注釋寫低 `--project` 下 pattern 點樣 match 同出處，第時改 coverage 嘅人唔使再查 vitest 源碼
- Smoke 先做最平嘅 `sw.js` grep 再開瀏覽器，error message 直接講出最可能嘅原因（`VITE_CATALOG_URL` 漏咗入 build）
- `deploy-api.yml` guard 同 `import-catalog.yml` 一個寫法，檔頭寫清楚只係防手滑，真正嘅邊界要等 S-781

## Handoff receipt

```
HANDOFF_RECEIPT
agent: code-reviewer
status: pass
score: 100
hard_gates: { lint: pass, type: pass, tests: pass, coverage: n/a, no_critical: pass, security_scan: pass }
blocking: none
findings: S-852 S-853 S-854 S-855（🟢，入 backlog）；S-781 刻意未做（要用戶開 GitHub Environment）
next_action: QA
context: 450e5d4..8ff0756；報告只 commit，未 push（CI run 43231620345 跑緊，由 main agent 等 CI 完先 push）。QA repo-tooling 鏈引用呢個 run（包括新 production smoke 同 e2e）；S-752 S-759 S-761 S-762 S-766 S-769 可以喺 backlog 關
```

## 補註（merge `origin/main` 後）

- `main`（PR #207）已經用咗 S-850 / S-851，本報告原本嘅 S-850–S-853 改號做 S-852–S-855（內容不變）
