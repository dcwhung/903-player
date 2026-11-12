# Code Review — Backlog Lane E（CI / e2e 基建）

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立 subagent）
- 目標：`fix/lane-e-ci-e2e` `713cb85..d7d2562`（1 commit；7 files，+79 / −12）
- 處理嘅 backlog ID：S-757、S-765、S-852、S-853、S-854、S-855
- SSoT（L1）：`.proj-docs/backlog.md` Open 表各條描述；`reviews/2026-11-12_review_lane-d-repo-tooling.md`（S-852–S-855）；`reviews/2026-11-12_review_lane-c-player-catalog-misc.md` Addendum（S-765 要喺 harness 以外修）
- Tier：T2（e2e preview server、CI workflow、QA plan / README；production `dist` 同 `sw.js` 冇變）
- Design Origin：n/a（冇 UI 改動）；PWA gate：n/a（plugin 只掛 `configurePreviewServer`，build 輸出唔變）
- 總評：六項都跟 backlog 做足。S-765 揀咗 Lane C addendum 建議嘅方向：harness 冇改，SW request 照舊原封不動去 preview，改由 e2e mode 嘅 preview 喺 SPA fallback 之前答 404，所以 S-648 嘅前提冇郁到。新 e2e section 先確認 SW 真係發過 request 先數 cache，唔會因為冇 request 而空過。冇 🔴 / 🟡，有 1 條 🟢

## Hard Gates

all pass（lint 0、`tsc -b` 0、related unit `catalogCaching` + `catalogSnapshot` 25 pass；author `npm test` 3809 pass；coverage n/a：冇 unit 核心邏輯改動；冇新依賴）。Full e2e 由 main agent 背景跑 3 次，QA 引用，reviewer 冇跑（避開 port 4173 / `dist`）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                   |
| -------- | ------- | ------- | ------------------------------------------------------ |
| 正確性   | 25      | 25      | middleware 次序、base path、mode gating 都核過（L2）   |
| 安全性   | 20      | 20      | 只影響本機 e2e preview                                 |
| 可維護性 | 20      | 20      | 🟢 S-868 兩處舊 comment 未跟住改（唔扣分）             |
| 測試覆蓋 | 15      | 15      | 新 section 有 RED（200 / 1 key）→ GREEN 記錄           |
| 性能     | 10      | 10      | 新 section 多 1 秒 settle；artifact 保留 7 日，dist 細 |
| 代碼風格 | 10      | 10      | 常數有名（`HTTP_NOT_FOUND`、`SW_CACHE_SETTLE_MS`）     |
| **總分** | **100** | **100** |                                                        |

**結果：✅ pass**

## 逐項驗證

- **S-765**（`vite.config.ts` `e2eCatalogNotFound`、`run.mjs --mode e2e`）
    - L3（讀 vite 8.3.4 `node_modules/vite/dist/node/chunks/node.js:35698–35718`）：`configurePreviewServer` 冇 return function，所以 middleware 喺 `baseMiddleware`、`htmlFallbackMiddleware` 之前行；req.url 未去 base，所以 `folder` 要帶 `/903-player/`，code 用 `catalogUrl` 嘅 folder 正係咁
    - L2（reviewer 實測，現有 `dist`、port 4199）：`--mode e2e` 時 `e2e-catalog/catalog.json`、`e2e-catalog/dramas/x/a.webp` → 404；`e2e-catalogue/x`、`some/route`、`/` → 200（SPA fallback 照行）。production mode 全部 200（行為不變）
    - Gating：`mode === E2E_MODE && catalogUrl.startsWith('/')`；production / CI smoke（`npx vite preview` 冇 `--mode`）同絕對 URL 都唔掛 plugin
    - 副作用（正面）：SW 經 preview 攞 `e2e-catalog/` 嘅圖都變 404，唔會再將 HTML 當圖入 cache
    - `checkDefaultNotCached`：`requestfinished` 只收 `req.serviceWorker()` 嘅 `catalog.json`；assert「有 request 而且全部 404」再加「`catalog-json` 0 key」。context 由 `runSection` 收尾時統一 close（`harness.mjs:296`）
- **S-852**：`ci.yml` 兩段注釋改做「repo variable 未設時嘅 fallback 設定」，寫清 smoke / e2e / snapshot unit 分工，真 production bundle 冇 smoke 指去 S-867（main agent 要喺 backlog 開）
- **S-853**：`player-dist-production` `retention-days: 7`，同檔另一個 artifact（`ci.yml:188`）一致；注釋講明超過 7 日要「Re-run all jobs」
- **S-854**：loop 之後再 `curl -sf`，唔得就 `::error::` + `cat preview.log` + `exit 1`。`set -euo pipefail` 下 loop 入面 `curl && break` 唔會觸發 `-e`，核過
- **S-855**：README 改做「`dev` / `build` / `e2e` 等 root scripts 轉發」，`coverage` 寫明 root vitest 跑 player + catalog；對過 root `package.json:17` 同 `vitest.config.ts:14–18`，正確
- **S-757**：`vercel.json` 入 `repo-tooling` scope（AC-6），`buildCommand` / `outputDirectory` 對到 `apps/player`；out-of-scope 一行刪返
- QA plan：`catalog-data.md` section 數 8 個，對過 `runRemoteCatalogChecks`（`origin/main` 7 個 + 新 1 個）
- Version：冇 bump。production `dist` 冇變（plugin 只喺 preview 行），同 Lane C / D 一樣當 tooling 改動接受

## 🔴 / 🟡

冇。

## 🟢 / Observation

- S-868 `apps/player/e2e/harness.mjs:116–117`：comment 仲寫「已知副作用（S-765，未修）……要修就要喺 harness 以外」，今次已經喺 preview 修咗；`remoteCatalog.mjs:4–6` 檔頭 1–6 嘅 scenario 清單亦冇加新 section。成本好細，可以喺呢個 PR 順手改；唔改就入 backlog
- Observation：S-854 嘅 loop 如果 preview 一起就死（例如 4174 撞 port），仍然要等夠 30 秒先報錯；log 會印出，只係慢，唔使改
- Observation：S-765 對 PWA 換版（S-648）嘅影響要睇 main agent 3 次 full e2e（`pwaUpdate.mjs` 用自己嘅 static server，唔經 vite preview，理論上冇關係）

## ✅ 做得好嘅地方

- 跟 Lane C addendum 嘅結論喺 harness 以外修，冇再試改 SW request
- 新 assert 先證明 SW 有發 request 先數 cache，避免空過
- S-854 用假 `npx` 實際驗過 30 秒 timeout 同 log 輸出

```handoff-receipt
agent: code-reviewer
task: review
status: pass
score: 100
hard_gates:
    lint: pass
    type_check: pass
    tests: pass
    coverage: n/a
    no_critical: pass
    security_scan: n/a
findings: S-868（🟢，stale comment：harness.mjs S-765「未修」、remoteCatalog.mjs 檔頭清單）
next_action: QA
next_agent: quality-assurance
branch: "fix/lane-e-ci-e2e"
context: "Lane E (S-757, S-765, S-852, S-853, S-854, S-855) 100/100 pass; integration branch main; no C/W; S-868 can be fixed in this PR or go to backlog; main agent to open S-867 (production Worker+snapshot smoke, referenced by ci.yml comment). No version bump accepted (dist unchanged). QA cites main agent's 3x full e2e (Remote catalog default-404 section + PWA update S-648). Report committed locally, not pushed."
```
