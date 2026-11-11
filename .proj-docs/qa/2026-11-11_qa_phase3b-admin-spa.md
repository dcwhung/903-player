# QA — Phase 3b（`apps/admin` SPA + Worker static assets）— 2026-11-11 — S1

- Tier: T3（新 app、Worker 出 assets、CI / deploy workflow、退役 ops 頁；api 0.4.0 → 0.5.0）| Code commit: `620ed23`（`6a29aa6` 淨 review docs）| Verdict: ✅ pass
- L1：`.proj-docs/plans/2026-11-10_plan_phase3-admin.md` §3b（決定表、UX 步數表）；Design Origin `mockup: _mockups_/admin/index.html`；review `.proj-docs/reviews/2026-11-11_review_phase3b-admin-spa.md`（warn 85 → re-review pass 100；W-708..W-710 已修；S-803..S-811 backlog）
- Ledger（`impact --since 44709a0` = `git merge-base HEAD origin/main`）：SKIP 10 / REVERIFY 3（api、repo-tooling、coming-soon）/ UNCOVERED 166（全部 `apps/admin/**`）/ IGNORED 4
- 新鏈 `admin`（S-807）：plan `.proj-docs/qa/plans/admin.md`（AC-1..AC-11），scope = `git ls-files apps/admin`；`.claude/CLAUDE.md` chain 清單加 `admin`。`api.md` 加 AC-15（assets / SPA fallback）、AC-8 標退役；`repo-tooling.md` 加 AC-4
- `coming-soon` REVERIFY 只因 `package-lock.json`：diff 淨係加 admin 依賴（`@dnd-kit/*`、`lucide-react`）+ 幾個套件 `dev` flag，現有版本冇變 → plan unit（`npm test` 已包）+ player e2e 綠，re-freeze
- Freeze：`freeze <chain> S1` × 4 @`6a29aa6`（admin 167、api 94（刪咗 ops 頁 5 檔）、repo-tooling 22、coming-soon 162 檔）；之後 `impact` REVERIFY 0，淨係 4 個已刪檔（`apps/api/public/*`、`scripts/opsPage.test.ts`）以 UNCOVERED 出現 = ledger 工具對刪除檔嘅顯示，唔使驗（api AC-15：`/ops.js` 已回 SPA）

## Runs

| Command                                                                                                | Result                                                                 | Time      |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------- |
| CI run 42983381417 @ `620ed23`（引用）：lint、`tsc -b`、`npm test`、build、build:admin、e2e、e2e:admin | success                                                                | 16 min    |
| `npm test`                                                                                             | 311 files / 3428 pass                                                  | 122 s     |
| `npx tsc -b`；`npm run lint`（eslint + `prettier --check .`）                                          | 0 error；exit 0                                                        | 14 + 36 s |
| `npm run build:admin`                                                                                  | JS 406.7 kB（gzip 129.6）、CSS 25.6 kB                                 | 1 s       |
| `PW_CHROMIUM_PATH=… npm run e2e:admin`                                                                 | 6 / 6 PASS                                                             | 11 s      |
| `PW_CHROMIUM_PATH=… npm run e2e`（player；coming-soon / repo-tooling）                                 | 780 PASS / 0 FAIL                                                      | 641 s     |
| Coverage v8 `apps/admin`（unit）                                                                       | lines 72.3%；`api` 82.9%、`model` 95.3%、`ui` 86.0%、`*Model.ts` ≥ 93% | 40 s      |
| 補充 smoke（scratchpad Playwright + `e2e/mockApi.mjs` 疊 route，build 版）                             | 19 / 19 PASS（見下）                                                   | 40 s      |
| `wrangler dev`（臨時 `.dev.vars`、`--persist-to` scratchpad；完咗已刪）                                | 見 api AC-15                                                           | 1 min     |

- admin AC-9 錯誤：412 →「已在其他視窗或裝置修改」+ 重新載入；422 →「無法儲存」；401 →「登入已逾時」+「重新登入（新分頁）」（`/auth/google/start`、`_blank`），簡介 draft 保留、冇英文 `not logged in`（W-710）；409 publish → 列 2 個消失 ID + 處理方法；`unchanged` 一句；publish 500 / 掃描 500 / 排序 500（錯誤 + 次序還原）中文訊息
- admin AC-8 圖片：PNG →「只接受 WebP」、500×500 →「唱片尺寸須為 600×600（現為 500×500）」、壞 RIFF →「無法讀取此圖片」，三個都冇 call `/api/assets`；600×600 WebP → `PUT /api/assets`（`image/webp`）再 PUT entry（上載即存）；橫額 slot 拒 600×600
- admin AC-11 UX 步數（build 版實際撳）：發佈 2（「前往發佈」→ 發佈）、加圖 3、排期 3（預設 chip 存 `weekdays [1,3,5]` / 5 集）、落架 3（`enabled: false`）、改名 3（Enter 即存）、還原 3（POST `/api/publishes/1/rollback`；使用中嗰行冇還原掣）；設 ID 3 + 排序 1 由 `e2e:admin` 證
- admin AC-7 W-709：focus dropdown 撳 ↓ + 揀資料夾 → 0 個 POST；撳「配對」→ POST `{ folder }`
- admin AC-6 / AC-10：roller 分鐘 wheel 只得 00 / 15 / 30 / 45，開始 15:00 時完結時 wheel 最大 18；reduce 時拖曳排序 `getAnimations()` 0（no-preference 2）、toast 照出；844×390 有 nav、390×844 淨係轉橫提示
- api AC-15（`wrangler dev`，build 咗嘅 admin）：`/`、`/shows`、`/dramas/lancy/schedule`、`/history`、舊 `/ops.js` → 200 SPA `index.html`；`/assets/*.js` 200 JS；`/api/health` `{"ok":true,"version":"0.5.0"}`；`/api/me`、`/api/nope` 401 JSON；`/auth/google/start` 302 Google（PKCE S256）；`/auth/nope`、`/catalog/v1/catalog.json`、`/catalog/v1/unknown` Worker 404 text（唔會變 SPA）。`deniedPage` inline style 由 api unit 證
- repo-tooling AC-4：CI check job 有 `build:admin`、e2e job 有 `e2e:admin`（run 42983381417 兩步都 success）；deploy workflow 改動 = merge 後先跑（S2 / deploy）

## Hard Gates

all pass，除 Coverage 要講明：admin unit lines 72.3%（< 80%）。0% 嘅檔全部係 page / container（`lists/*`、`HistoryPage`、`PublishPage`、`UpdatePage`、`AppShell`）同 3 個 hook（`useReorder`、`usePublish`、`useScan`）；佢哋嘅成功 / 錯誤分支逐個由 `e2e:admin` + 補充 smoke 行過（L2），邏輯層（`api`、`model`、`*Model.ts`、`ui`）≥ 80%。QA 判斷接受，見「建議補測」

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- Observation：admin unit coverage 72.3%（上面 Coverage），唔係缺陷，冇 L1 違反 → 唔 block
- Deploy 後用戶手動（S1 範圍外，要真 Google / D1 / R2）：① workers.dev root 用 Google 登入 → admin 載入、pill「Admin v0.5.0」；② 自動掃描 bar 顯示時間 / 結果；③ 拖排序後 reload 次序仲喺度；④ 上載 600×600 / 1216×684 WebP，縮圖即刻換；⑤ 改一個節目簡介 → 確認發佈 → 上下架記錄有新行 → player 60 秒內見到；⑥ 還原上一版 → player 60 秒內變返；⑦ whitelist 外帳戶見 403 頁（inline style）

## 建議補測

- `usePublish`：409 → `blocked`、`unchanged`、其他錯誤 → `failed`（hook test，state machine）
- `useReorder`：PUT 失敗 → error + `pendingIds` 清返（樂觀次序還原）
- （可選）`useScan`：掃描失敗 → 錯誤 + 重試。三項都已由 e2e / smoke 證行為，屬補 unit 覆蓋，唔 block

```handoff-receipt
status: pass
stage: S1
chain: admin, api, repo-tooling, coming-soon
commit: 620ed23
next_action: main_agent_push_docs_then_merge
context: "Phase 3b S1 pass @620ed23; CI 42983381417 success (lint/tsc/unit/build/build:admin/e2e/e2e:admin); local npm test 311 files/3428, tsc -b 0, lint 0, build:admin ok, e2e:admin 6/6, player e2e 780/0; supplementary smoke 19/19 (409/412/422/401, WebP checks, UX steps 2/3/3/3/3/3, W-709, reduced motion, roller); wrangler dev: SPA fallback for deep links, /api /auth /catalog hit Worker, health 0.5.0; admin unit coverage 72.3% (pages/hooks e2e-covered; suggested hook tests usePublish/useReorder); new chain admin + plan, CLAUDE.md chain list; 4 chains frozen S1; QA commit local only (not pushed)"
```
