# Code Review — 2026-11-12 — Backlog Lane C（player / catalog 雜項）

- 審閱者：Code Reviewer（獨立 subagent）
- 目標：`fix/lane-c-player-catalog-misc` `725ae90..1e2e03d`（4 commits：`ceb6dbd` `313c348` `c74af36` `1e2e03d`；10 files，+110 / −23）
- 處理嘅 backlog ID：S-765、S-779（`ceb6dbd`）、S-793（`313c348`）、S-771、S-760（`c74af36`）、S-750（`1e2e03d`）
- SSoT（L1）：`.proj-docs/backlog.md` Open 表各條描述，同 Source 報告（`2026-11-07_review_phase0a-monorepo`、`2026-11-07_review_phase0b-catalog`、`2026-11-07_review_phase1-runtime-catalog`、`2026-11-09_review_phase2a-backend`、`2026-11-10_review_phase2b-2-backend`）
- Tier：T2（e2e harness、build-time snapshot script、Python tooling、comment；build 出嚟嘅 app 行為唔變）
- Design Origin：n/a（冇 UI 改動）
- 總評：6 項都按 backlog 原意做咗，範圍收得窄。`runPool` 改法啱，而且有 red → green test 鎖住「等 in-flight 完先 reject」。harness 揀 `abort` 唔揀 `fulfill` 嘅理由寫入 comment。冇收斂嘅 🔴 / 🟡，只有 4 條 🟢

## Hard Gates

all pass。

- Lint：改咗嘅 5 個 ts / mjs 檔 `npx eslint` exit 0；改咗嘅非 Python 檔 `npx prettier --check` exit 0（author 另外跑咗 root `npm run lint` pass）
- Type check：`npx tsc -b` exit 0
- Tests：`npx vitest run apps/player/scripts/catalogSnapshot.test.ts` 10 pass；arcCover `python3 -m pytest` 101 pass（24 subtests）。冇跑 full suite / e2e（e2e 由 main agent 背景跑，結果交 QA）
- Coverage：`catalogSnapshot.ts` statements 99.08% / lines 98.97% / branches 89.28%（≥ 80%）
- Security：冇新依賴（n/a）；No Critical：pass
- Ruff：3 個 E501 + 2 個檔 format diff，同 `725ae90` 逐條一樣（喺 scratchpad 用 `git archive 725ae90` 對比），唔係今次引入（見 S-855）
- Version：冇 bump。e2e harness、build 時先跑嘅 snapshot script（成功路徑輸出唔變）、Python tooling 同 comment，build 出嚟嘅 app 唔變。跟 `2026-11-12_review_admin-e2e-orphan-vite.md` / `2026-10-28_review_e2e_hardening.md` 先例，唔當 Warning

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                     |
| -------- | ------- | ------- | ---------------------------------------- |
| 正確性   | 25      | 25      | 6 項行為 / 字眼同 backlog 一致           |
| 安全性   | 20      | 20      | —                                        |
| 可維護性 | 20      | 20      | comment 寫明原因；S-852、S-854（唔扣分） |
| 測試覆蓋 | 15      | 15      | S-793 有 red → green；S-853（唔扣分）    |
| 性能     | 10      | 10      | 失敗後唔再開新下載，等待有 timeout 上限  |
| 代碼風格 | 10      | 10      | eslint / prettier 過；ruff 同 main 一樣  |
| **總分** | **100** | **100** |                                          |

**結果：✅ pass**

## 逐項驗證

- **S-765**（`harness.mjs` `catalogNotFound`）：SW request 改 `route.abort('blockedbyclient')`。L3 推理：page 嘅 `fetchJson` 會收到 network error，`initCatalog` 嘅 `catch` 照 fallback 內建資料（`runtime.ts`），冇 unhandled rejection；SW 入面 NetworkFirst 失敗唔會變 page `pageerror`。`remoteCatalog.mjs` 後註冊嘅 `catalogRoute` 自己 fulfill 埋 SW request，冇用 `fallback()`，所以唔受影響。L2（author scratch script，vite preview 4199 + e2e build）：舊版 cache 有 `e2e-catalog/catalog.json text/html`，新版 cache 空
- **S-779**：`CATALOG_IMAGE_HOST/**` 加預設 `notFound`，喺 catch-all abort 之後註冊（優先過佢），`remoteCatalog.mjs` 再後註冊蓋過。`MOCKED_ORIGINS` comment「全部有預設 route」核過：5 個 origin 都有。L2（author）：舊版 fetch rejected，新版 resolved（404），`externalRequests` 空
- **S-793**（`runPool`）：每個 worker 自己 `catch`，所以 `Promise.all` 一定等齊；`failure ??=` 保留第一個 error；loop 先查 `!failure` 先攞下一張。等 in-flight 有上限：`downloadImage` 每張都經 `withTimeout`。Test 用 gate 控制：concurrency 2、4 張圖，只 request 咗 2 張，reject 嗰刻 `inFlight` = 0，`data.tmp/` 冇殘留。L3：舊 code 會即刻 reject（`inFlight` = 1），所以呢個 test 對舊 code 係紅（同 author 講嘅 TDD 記錄一致）
- **S-771**：`ShowTile.tsx:40–42` today variant 用 `todayArt` 加 `crossOrigin`，新 comment 如實描述，仲講明同 origin 冇分別。選改 comment 唔改行為，符合 backlog「不一致」嘅原意
- **S-760**：`packages/catalog/tsconfig.src.json` `include: ["src"]`，`exclude` `*.node.test.ts`；import 呢個檔嘅只有兩個 `*.node.test.ts`，所以唔會經 import 拉入 src project。新 comment 正確
- **S-750**：arcCover 入面冇 `REPO_ROOT` 殘留；`APP_ROOT.parents[1]` = repo 根嘅 comment 同 code 一致；pytest 101 pass

## 🔴 / 🟡

冇。

## 🟢 / Observation（入 backlog）

- S-852 `apps/player/scripts/arcCover/review/build.py:343`、`review/fetch_sources.py:111`：常數改咗 `APP_ROOT`，但 CLI flag 仍叫 `--repo`，`args.repo / "src" / "catalog"` 其實係 app 根。flag 有 `argparse.SUPPRESS`，影響細；下次改 arcCover 可以改 `--app-root`（或者保留 `--repo` 做 alias）
- S-853 `apps/player/e2e/harness.mjs`：S-765 / S-779 只有 author 嘅 scratch script 驗證，冇 committed check；如果將來有人改返 `fallback()`，`catalog-json` cache 入 HTML 又會靜靜返嚟。下次改 e2e 可以喺一個預設 section 尾斷言 `caches.open('catalog-json')` 冇 key
- S-854 `packages/catalog/tests/jsonSchemas.ts:1`：comment 仲寫「`scripts/`」，但 `packages/catalog` 冇 `scripts/`，全 repo 亦冇 script import 呢個檔；下次改呢個檔順手刪
- S-855 `apps/player/scripts/arcCover`：ruff 3 個 E501（`constants.py:3`、`review/fetch_sources.py:130`、`tests/test_fetch_sources.py:159`），另外有 2 個檔 format diff（author 講 1 個，實際係 `review/fetch_sources.py`、`tests/test_fetch_sources.py`）。`725ae90` 已經係咁，今次冇引入；backlog 未有記錄，下次改 arcCover 可以 `ruff format` 加拆長行
- Observation：S-765 嘅 harness comment 話「fulfill SW request 會令 Chromium 重複裝 SW」。改用 `abort` 之後 PWA 換版 section 會唔會受影響，要睇 main agent 嗰次 e2e（QA 引用），reviewer 冇重跑

## ✅ 做得好嘅地方

- `runPool` 嘅 test 用 gate + `inFlight` 計數，直接量到「reject 時仲有冇下載未完」，唔靠時間猜
- harness comment 寫齊三樣：點解唔 fulfill、點解唔再 fallback、abort 之後 app 會點
- S-771 揀最細改動，comment 講明點解冇實際分別

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: merge_develop
next_agent: quality-assurance
branch: "fix/lane-c-player-catalog-misc"
context: "Lane C (S-765, S-779, S-793, S-771, S-760, S-750) 100/100 pass; integration branch is main; no C/W; new S-852 (arcCover --repo flag still named repo), S-853 (no committed e2e guard for catalog-json cache), S-854 (jsonSchemas.ts line 1 stale 'scripts/'), S-855 (pre-existing ruff E501 + 2 format diffs in arcCover) to backlog. No version bump accepted (tooling/comment only). e2e (incl. PWA update section after SW abort change) to be cited by QA from main agent run. Report committed locally, not pushed."
```

## Addendum — `4587f5b` S-765 revert（2026-11-12）

- 範圍：只睇 `4587f5b`（`apps/player/e2e/harness.mjs` +6 / −7），唔重新 review 成個 branch
- 觸發：第一次 full e2e 781 PASS / 1 FAIL「PWA 換版（Shift-reload 嘅 tab，S-648）：A 2、B 1」
- L2（main agent 實測，scratch runner 只跑 `pwaUpdate.mjs` `runPwaUpdateChecks`，同一份 e2e build）：
    - `725ae90` 舊 harness 0/5 fail；`ceb6dbd`（abort）5/5 fail；SW request 改用 `route.fallback({ headers })`（`accept: application/json`）都係 5/5 fail
    - 拆開試：舊 harness + 只加 S-779 → 0/3 fail；新 harness 拎走 S-779 → 3/3 fail。即係問題來自 S-765，S-779 冇關係
    - `4587f5b` 之後 0/5 fail；full e2e 背景重跑緊，結果交 QA 引用
- 判斷：✅ `4587f5b` 啱
    - `catalogNotFound` 嘅 code 同 `725ae90` 一模一樣（`git diff 725ae90 4587f5b` 喺呢度淨係 comment 有改），即係 SW 分支完全還原
    - 新 comment 寫齊三樣：fulfill / abort / 改 header 都試過；S-648 會多 reload 一次；S-765 係已知副作用，要喺 harness 以外修
    - S-779 保留冇問題：e2e build 嘅 catalog 喺同 origin `e2e-catalog/`，`catalogCaching.ts` 嘅 SW route 唔會 match `CATALOG_IMAGE_HOST`，所以嗰度嘅 request 全部係 page 發、唔經 SW，唔會有重裝 SW 嘅問題（L3，同上面 0/3 一致）
    - `npx eslint apps/player/e2e` exit 0；`npx prettier --check apps/player/e2e` exit 0（用 folder 範圍，避開 hook）
- Reviewer 自我更正：原本 review 將「abort 會唔會影響 PWA 換版」列做 Observation 交 e2e 驗，冇當 finding 處理；而 comment 本身已經寫咗 fulfill 會令 SW 重裝，應該要求先用 PWA section 驗過先算 pass。以後 harness 改動如果有掂 SW request，要求 author 先跑 `runPwaUpdateChecks` 先送 review
- 處理咗嘅 ID 更新：
    - **S-765：未處理**。harness 入面修唔到，要喺 harness 以外修：例如 e2e build 嘅 `vite preview` 唔做 SPA fallback（`vite.config.ts`，唔喺今次範圍）。backlog 保留 Open，位置改做 `vite.config.ts` / e2e preview，並註明「harness 唔可以改 SW request（S-648）」
    - S-779、S-793、S-771、S-760、S-750：維持 ✅
- 🟢 更新：
    - S-853 close（moot）：佢要求用 e2e 鎖住「`catalog-json` cache 冇嘢」，但而家係刻意保留呢個副作用，加呢個 assert 一定 fail。將來喺 harness 以外修 S-765 時，assert 應該跟住嗰次改動一齊加，寫喺 S-765 入面就得，唔使另開 ID
    - S-852、S-854、S-855 不變
- 分數：最終狀態（`4587f5b`）冇 🔴 / 🟡，維持 100/100、✅ pass。`ceb6dbd` 嘅 regression 喺 merge 之前已經修好，所以唔扣分；處理咗嘅 ID 由 6 個減做 5 個

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: merge_develop
next_agent: quality-assurance
branch: "fix/lane-c-player-catalog-misc"
context: "Addendum 4587f5b: SW catalog branch restored to route.fallback() (code identical to 725ae90), fixes S-648 PWA Shift-reload double install (scratch runner 0/5 vs ceb6dbd 5/5). S-765 NOT resolved: keep Open, relocate to vite.config.ts / e2e preview SPA fallback (outside harness). Resolved: S-779, S-793, S-771, S-760, S-750. S-853 closed as moot (fold guard into S-765). S-852/S-854/S-855 unchanged. QA must cite the full e2e rerun on 4587f5b. Report committed locally, not pushed."
```
