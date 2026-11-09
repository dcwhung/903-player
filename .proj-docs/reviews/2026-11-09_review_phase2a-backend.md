# Code Review — 2026-11-09 — Backend Phase 2a：Worker API + D1 + Google login + publish（player v1.31.0、api v0.1.0）

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/sleepy-curie-uuur1k` `a1b64cc..900d574`（9 commits：`b71dfb8` appAudioBase 注入、`864ab57` scanLibrary export、`505c993` Worker、`ee0d950` importLibrary、`83d87b5` ops 頁、`a0cccff` lockfile、`e5d8416` S-764、`d2aef18` CI / deploy、`900d574` runbook）
- SSoT（L1）：`.proj-docs/plans/2026-11-08_plan_phase2a-backend.md`（用戶批准）、`.proj-docs/plans/2026-11-06_plan_backend-admin.md`；mockup `_mockups_/admin-ops/index.html`
- Tier：T3（新 workspace、auth、production deploy workflow、player 集數 URL 簽名改動）
- 總評：安全面做得紮實（PKCE S256 + HMAC state cookie、`email_verified` + whitelist、token 只存 SHA-256、`__Host-` cookie、mutating route 驗 Origin、CORS allowlist + `Vary: Origin`、edge cache 唔串 origin、圖檔名 regex 杜絕 path traversal、403 頁 email 經 `hono/html` escape、ops 頁全用 `textContent`）。冇 🔴 / 🟡；12 條 🟢 / Observation 入 backlog

## Hard Gates

all pass

- Lint：`npx eslint apps/api packages/catalog apps/player/{src,scripts,e2e} eslint.config.js` exit 0；`npx prettier --check apps/api packages/catalog .github` exit 0；`apps/api/src` 已納入 30 行函數上限 rule
- Type：`npx tsc -b`（player + api + catalog）exit 0
- Tests（Hard Rule 7，只跑相關）：`npx vitest run apps/api packages/catalog/src/{dramas,document} apps/player/src/catalog apps/player/scripts/{buildCatalogJson,catalogCaching,dramaFromFolder}.test.ts …/Disc …/ShowTile` → 38 檔 499 pass（包括每劇 `drama.test.ts` URL pin、`catalogJson.test.ts` 一致性、`catalogImageCors.node.test.ts`）。冇跑 full suite / e2e（CI `42542305909` 跑緊）
- Coverage：`episodes.ts` lines 100% / branch 95.5%；`registry.ts` lines 98.4% / branch 88.9%；Worker（workerd 量唔到 v8 coverage）逐條 route / 分支對過 test 名：auth 23、publish 14、serve 9 個 case 覆蓋全部成功 + 失敗路徑
- Security：新依賴 `hono` 4.13.17（MIT）、`wrangler` 4.158.0（MIT OR Apache-2.0）、`miniflare` beta（MIT）、`@cloudflare/vitest-plugin` 1.6.0（MIT，`cloudflare/workers-sdk`，peer `vitest ^4.1 || ^5`）；`npm audit --omit=dev` 0；全量 17 個 low / moderate 全部係舊有 eslint / workbox 鏈，冇一個嚟自新依賴

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                                                  |
| -------- | ------- | ------- | ------------------------------------------------------------------------------------- |
| 正確性   | 25      | 25      | ID 唔包 URL；一致性 test + 每劇 URL pin 全綠；rollback byte-identical；ID 守衛有 test |
| 安全性   | 20      | 20      | OAuth / session / CSRF / CORS / XSS / traversal 全部有 test 鎖住                      |
| 可維護性 | 20      | 20      | config 全 named constant；函數短；scanLibrary 共用冇重寫                              |
| 測試覆蓋 | 15      | 15      | 失敗路徑齊（state 篡改 / 過期、unverified、錯 aud、Google 拒絕、cross-origin）        |
| 性能     | 10      | 10      | edge cache + ETag / 304；圖 immutable；404 唔 cache                                   |
| 代碼風格 | 10      | 10      | lint / prettier 過                                                                    |
| **總分** | **100** | **100** |                                                                                       |

**結果：✅ pass**

## 🔴 / 🟡

冇。

## Developer 聲明嘅偏離（全部接受）

- `@cloudflare/vitest-plugin@1.6.0` 代替 `vitest-pool-workers`：repo 用 vitest 5，後者只支援 4；同一個 workers-sdk repo 嘅繼任 package。`test/applyMigrations.ts` 每個 test 前清 D1（連 `sqlite_sequence`）、R2、catalog.json edge cache，test 之間冇殘留
- `publishes` 多咗 `show_count` / `drama_count` / `episode_count` / `rollback_of`：ops 頁 history 唔使 parse 成份 document；`rollback_of` FK 啱
- 中間 commit 冇 peer deps（至 `a0cccff`）：見 S-777
- 本機要 https：validator 只收 https 圖 URL，`.dev.vars.example` 已設 `WORKER_ORIGIN=https://localhost:8787`，README 講明要加 https redirect URI
- 403 頁由 Worker 出：mockup 狀態 ② 要顯示 email，靜態頁做唔到；用同一個 `/ops.css`
- `PLAYER_ORIGINS`：同 plan §6 一致；Preview 試 flag 要臨時加 origin，README L91 已寫（見 S-778）

## Design Fidelity

- `apps/api/public/*` → `mockup: _mockups_/admin-ops/index.html`：class 名（`card` `center` `bar` `who` `facts` `notice ok|warn` `check` `danger` `actions` `table-wrap` `tag` `version` `btn primary` `small`）同 mockup 一致；mockup 展示用 `.frame` / `.state-label` 由 `.stack` 取代；新增 `.lead` / `p.plain` 對應 mockup inline 字樣式。顏色全部 `:root` token + dark mode，冇動畫。6 個狀態：①③④⑤⑥ `index.html`，② `deniedPage.ts`
- Player `.tsx`（9 處 `<img>`）→ `none-required` 成立：diff 只加 `crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}` + import，className / layout 零改動；3 個主頁橫額（bundled）冇郁，`catalogImageCors.node.test.ts` 鎖住
- PR 未開：main agent 開 PR 時第一行要寫兩條 `Design Origin:`，並附「新增依賴說明」（S-776）

## PWA

- 版本 1.31.0（`apps/player/package.json`，MINOR 合理）；update / reload 流程冇改；`CACHEABLE_STATUSES = [200]`，所有 catalog `<img>` 已係 CORS 模式，唔會再 cache opaque

## 🟢 / Observation（入 backlog，唔 block）

- S-767 `catalog/publish.ts:121-137` 先寫 R2 後 insert `publishes`；insert 失敗 → live catalog 冇記錄，嗰次新加嘅 ID 下次唔受守衛保護。建議先 insert 後寫 R2（失敗方向較保守）
- S-768 `auth/middleware.ts:22-28` session 唔再對 `ADMIN_EMAILS`：whitelist 拎走個 email 仍有效最多 30 日；`requireSession` 加一行 `isAdminEmail`
- S-769 `deploy-api.yml:30-32` Cloudflare secret 喺 job 層 env，`npm ci` lifecycle script / `npm test` 都攞到；搬去兩個 wrangler step。`workflow_dispatch` 可揀非 main ref deploy production，加 `if: github.ref == 'refs/heads/main'`
- S-770 `auth/google.ts:45-69` 網絡錯 / id_token 唔係合法 base64 JSON 會變 500（唔係 `GoogleAuthError` → 502 文字）；包一層轉 `GoogleAuthError`
- S-771 `ShowTile.tsx:38` 今日節目格用 bundled `todayArt` 都加咗 `crossOrigin`，同 `config/catalogImage.ts:4` comment「內建圖唔使」唔一致（同 origin，冇實際影響）
- S-772 `catalog/publish.ts:46` 只驗 hash 喺 `assets`，冇驗圖檔名合 `IMAGE_FILE_PATTERN`；`<hash>.png` 會 publish 出 serve 必定 404 嘅 URL
- S-773 DRY：`SECOND_MS` 喺 `config.ts:3` 同 `oauthState.ts:14` 各一份；`importLibrary.mjs:22-25` 複製 wrangler.toml / config 常數（有 comment）
- S-774 ops 頁冇 CSP / `frame-ancestors`（`public/_headers`）；`SameSite=Lax` 已令被 frame 時唔帶 session，風險低
- S-775 Observation：Cloudflare 文件寫 `*.workers.dev` 上 Cache API 操作冇效果（sandbox proxy 擋咗，未能 fetch 文件核實；miniflare 有實作所以本機重現唔到）→ 用戶「Worker 加 edge cache 多層保險」決定喺 production 可能冇生效（功能照啱，只係每次讀 R2）。Deploy 後量第二次 request 或者加 debug header 核實
- S-776 Observation：PR description 要有 global-rules「新增依賴說明」（上面 Security 一行可直接用）
- S-777 Observation：`505c993`–`83d87b5` lockfile 冇 peer deps，嗰幾個 SHA `npm ci` 唔得；bisect 用 `--first-parent`（同 S-758）
- S-778 `apps/api/README.md:91`「或者 dashboard var」：`wrangler.toml` 有 `[vars]`，下次 `wrangler deploy` 會蓋走 dashboard 改動；建議只寫改 `wrangler.toml`

## ✅ 做得好嘅地方

- `appAudioBase` 注入乾淨：package 完全脫離 Vite，publish 驗證用 `.invalid` host，ID 唔受 URL 影響，每劇 URL pin 原封不動
- Edge cache 只存冇 CORS header 嘅 base response、cache key 固定 `WORKER_ORIGIN`，出門先按 Origin 加 header，仲有 test 驗唔會串 origin
- Import idempotent 有真 D1 test（重跑零變化、單引號 escape、只上載未有嘅圖、SQL 喺上載後先跑）

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T3
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "episodes.ts 100% / registry.ts 98.4% lines; Worker routes all branches tested"
next_action: invoke_qa
next_agent: quality-assurance
branch: "claude/sleepy-curie-uuur1k"
context: "Phase 2a review pass 100, no C/W; S-767..S-778 to backlog; QA S1 new chain api after CI 42542305909 green; PR needs Design Origin lines + dependency note"
```

## Re-review 241de18

- 範圍：只驗 `241de18`（修 CI 42542305909 嘅「冇 request 出外網」FAIL：`https://catalog-images.e2e.test`）；`5190aa5` 淨 docs 對過內容
- Hard gates：`npm run lint` pass（eslint + prettier 全 repo）；type n/a（`.mjs`）；e2e 唔由 reviewer 跑，引 developer 本機 log 779 PASS / 0 FAIL，包括「冇 request 出外網」PASS；CI 42579655596 跑緊（`changes` 用 push 前後 diff，包到 `241de18` 嘅 `.mjs`，e2e 會跑）
- 外網檢查冇變弱：`isExternal` 邏輯冇改，只加一個 `.test`（RFC 6761 保留 TLD，唔會解析到真網址）origin 入 `MOCKED_ORIGINS`；其他外部 host 照 abort + 記錄
- Single source：host 只喺 `harness.mjs:36` `CATALOG_IMAGE_HOST` 定義一次；`remoteCatalog.mjs` 嘅 base / glob 由佢 derive，repo 冇其他 hardcode
- Version bump 例外：`e5d8416`（同 session、已 bump 1.31.0）引入；改動只係 e2e harness，唔入 bundle，例外成立
- `5190aa5`：README / plan 跳過 Vercel Preview 同用戶決定一致，rollback 步驟寫清楚，同時解決咗 S-778 提到嘅 Preview 白名單問題；prettier pass
- S-779 Observation：`CATALOG_IMAGE_HOST` 入咗 `MOCKED_ORIGINS` 但 `newE2EContext` 冇預設 route（同 `DRAMA_AUDIO_BASE` 唔同），其他 section 如果請求佢會繞過 abort 直接 DNS fail；可以加預設 404 route，令「mock」名副其實

結果：✅ pass，冇新 C / W

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T3
ledger: n/a
hard_gates:
  lint: pass
  type_check: n/a
  tests: "pass (developer local e2e 779/0; CI 42579655596 pending)"
  coverage: n/a
next_action: invoke_qa
next_agent: quality-assurance
branch: "claude/sleepy-curie-uuur1k"
context: "Re-review 241de18 pass; S-779 observation to backlog; QA S1 after CI 42579655596 green (cite that run)"
```
