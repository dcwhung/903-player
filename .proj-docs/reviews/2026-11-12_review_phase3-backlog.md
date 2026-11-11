# Code Review — 2026-11-12 — Phase 3 backlog 清理（api 0.6.1 → 0.6.2）

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/charming-heisenberg-8z30x3` `f0b8724..3f06a1b`（merge `fix/phase3-backlog-api` `5cb6871..ed72829`、`fix/phase3-backlog-admin` `5cb6871..bee744c`、bump `3f06a1b`；`d1470f0` deploy docs 唔睇）
- SSoT（L1）：`.proj-docs/backlog.md` 22 個 ID 嘅描述同 Source 報告；用戶追加「新」pill 跟 player NewBadge（`--new-badge-*`，`#c0362c` / 白字）
- Tier：T3（auth redirect、D1 SQL、publish / rollback、deploy workflow）
- 總評：22 項都做咗，前後端合約（`enable: true`、409 `reason: 'arcScheduled'`）對得上，S-809 server 驗兩次兼 HMAC 簽名，冇 open redirect。一個 🟡：S-774 冇蓋到 admin SPA（static assets），而 backlog 原文講嘅「ops 頁」就係佢（W-713）

## Hard Gates

- Lint：改咗嘅 ts / tsx / mjs `npx eslint` exit 0；改咗嘅檔 + `deploy-api.yml` + `README.md` `npx prettier --check` exit 0
- Type：`npx tsc -b` exit 0
- Tests：api `vitest run --config vitest.config.ts` 8 個相關 test 檔 162 pass；admin + catalog 相關 31 檔 148 pass（包括 `colorTokens.node.test.ts`、`motionTokens.node.test.ts`）
- Coverage：每項新 logic 都有 unit test（`safeNext`、`mightBeRenamed`、`droppedScheduledArc`、`checkExtendedImage`、`isWellFormed`、`motionTiming`）
- Security：冇新依賴（n/a）；No Critical：pass
- CI：head `3f06a1b` run `43083826283` 跑緊（e2e 由佢驗，唔重跑）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                 |
| -------- | ------ | ------- | ------------------------------------ |
| 正確性   | 25     | 25      | 各項行為同 backlog 一致              |
| 安全性   | 15     | 20      | W-713（-5）                          |
| 可維護性 | 20     | 20      | 字眼 / motion 抽返單一來源           |
| 測試覆蓋 | 15     | 15      | 紅燈 commit 齊；樣式有 CSS 原文 test |
| 性能     | 10     | 10      | 新 SQL 只加細表 `NOT EXISTS`         |
| 代碼風格 | 10     | 10      | lint / prettier 過                   |
| **總分** | **95** | **100** |                                      |

**結果：✅ pass**（W-713 merge 前要修，改一個檔）

## 🟡 W-713 S-774 只蓋到 Worker 路徑：admin SPA 仍然可以被 frame

- 位置：`apps/api/src/index.ts:27-28`（`denyFraming` 只掛 `/auth/*`、`/api/*`）；`apps/admin/public/`（只有 `banner.webp`，冇 `_headers`）
- L1：backlog S-774「ops 頁冇 CSP / `frame-ancestors`（`public/_headers`）」。當時嘅 ops 頁 `apps/api/public` 已經冇咗，由 admin SPA（`wrangler.toml [assets] directory = "../admin/dist"`）取代，即係 S-774 講嘅就係 admin SPA，修正方法都已經寫明係 `_headers`
- L2：`wrangler.toml` `run_worker_first = ["/api/*", "/auth/*", "/catalog/*"]`，`/`、`/dramas/…`、`/shows/…` 同 SPA fallback 嘅 `index.html` 都唔經 Worker，所以 `denyFraming` 永遠唔會跑；`apps/admin/dist` 冇 `_headers`，所以呢啲 response 冇 `X-Frame-Options`，亦冇 `frame-ancestors`。而真正有「發佈 / 還原 / 刪除」掣嘅頁就係呢啲
- L3：`SameSite=Lax` 令被跨站 frame 時唔會帶 session，所以實際風險低（同 S-774 原文一樣）。不過依家 clickjacking 防護淨係靠 cookie 設定，冇第二層
- 方案 A（推薦）：加 `apps/admin/public/_headers`（Vite 會 copy 入 `dist`，Workers static assets 會讀，wrangler 唔會當普通檔上載）：
    ```
    /*
      X-Frame-Options: DENY
      Content-Security-Policy: frame-ancestors 'none'
    ```
    淨係加 `frame-ancestors`，唔加 `script-src`，所以唔會擋 `index.html` 嘅 inline theme script。`vite preview` 唔識讀 `_headers`，所以 e2e 驗唔到；加一個 node test 讀檔內容，deploy 後再用 `curl -sI <WORKER_ORIGIN>/dramas` 驗 header（SPA fallback 都要有），記入 deploy 記錄
- 方案 B：`run_worker_first = true`，所有 asset 都經 Worker 加 header。代價係每個 asset request 都要行 Worker（計 request 數），仲要自己用 `env.ASSETS.fetch` 處理 fallback，改動大過問題本身
- 建議：方案 A

## 🟢 / Observation

- S-825 `apps/api/src/auth/next.ts` `isAuthPath`：唔處理 dot-segment，所以 `safeNext('/x/../auth/google/start')` 會照收。瀏覽器 normalise 之後，login 完會再行一次 OAuth start（或者 callback 出 400）。只係攻擊者自己砌嘅 URL 先會中，唔會離開本站，唔算 open redirect；可以喺 `safeNext` 用 `new URL(next, 'https://x').pathname` normalise 之後再判斷
- S-826 `.github/workflows/deploy-api.yml`：`Check admin build` 喺 `Apply D1 migrations` 之後。如果 build exit 0 但冇出 `index.html`，D1 已經 migrate 咗先停，即係注釋話要避免嘅「半套 deploy」；將檢查搬去 build 之後、migration 之前
- S-827 `apps/api/src/admin/order.ts`：如果之前已經寫咗 `order: 2.0`（REAL binding），`json_extract(...) IS NOT CAST(2 AS INTEGER)` 會當兩個數相等，所以唔會改寫成 `2`。因為 `JSON.parse` 讀出嚟都係 `2`，所以冇實際影響；backlog S-799 原文講嘅「deploy 後 QA 喺真 D1 跑一次」要保留，順便查下 production 有冇 `.0`

## 開發者講明嘅偏差：判斷

1. S-795 `ALPH` 唔當圖：✅ 啱，RIFF container 規格寫明 ALPH 一定要跟 VP8 一齊出現；`ANMF` 只檢查有冇，唔拆入面嘅 frame，作為輕量檢查可以接受
2. S-814 purge 改喺 `commitPublish` 只 log：✅ 普通 publish 都會受惠，因為以前 R2 已經寫咗都會回 500。第一個 race 未修，backlog S-814 要保留嗰半，唔好成條 close
3. S-802 用 `NOT EXISTS`：✅ D1 寫入係串行做，後嚟嗰個 statement 一定睇到前一個；`arc_id IS ?3` 處理到 NULL
4. S-804 回 409 `arcScheduled`：✅ server 嘅 `reason` 同 admin `ARC_SCHEDULED_REASON` 一致，而且 admin 先檢查 `reason` 再檢查 `arcId`，所以唔會誤判成「ID 重複」。排程一定要有明確嘅 `arc.id`（`schedule.ts:67`），所以唔會漏
5. S-823 重現唔到、只加 e2e guard（1024 / 720px）：✅ 可以接受；backlog 保留做「已有 guard」
6. S-821 例子只用模板：✅ 短篇集同每日播而家做法一致
7. S-812 新增 `--crop-frame`：✅ 用途同 `--on-nav` 唔同，分開一個 token 係啱

## 重點檢查

- **S-809**：client（`loginHref.ts`）同 server（`next.ts`）用同一套規則：要 `/` 開頭，唔可以係 `//`、`\`、C0 / DEL 字元或者 `/auth*`，server 仲限長度 2048。`next` 喺 `/start` 驗一次，跟住同 state 一齊用 HMAC 簽入 cookie；callback `openOAuthState` 驗完簽名之後再行一次 `safeNext`。test 試過 `//evil.com`、`/\evil`、`https://…`、header 注入、篡改 cookie（→ 400），全部擋到。Hono `c.redirect` 會 `encodeURI` 非 Latin-1 字元 ✅
- **S-799**：`strftime('%Y-%m-%dT%H:%M:%fZ', …, '+0.001 seconds')` 出嘅格式同 `toISOString` 一樣，SQLite 讀得 `Z` 結尾，所以 `max()` 用字串比較就等於比較時間；`coalesce(…, '')` 處理 parse 唔到嘅情況。真 D1 同 miniflare 用同一個 SQLite engine，`CAST` 唔受 binding 影響 ✅（見 S-827）
- **S-800**：`mightBeRenamed` = 種類一樣，加上短篇 `name`（即係資料夾名，`displayName` 另外存）或者日子最少有一個重疊。邊界：如果唔見咗嗰套劇冇短篇 / 冇日子，就永遠唔會中，結果係照建 draft（同修之前「全擋」相比係另一個方向）；daily 劇日子重疊會多擋，即係退返舊行為，偏保守。ID 只喺真係建咗劇先遞增 ✅
- **S-801**：`plan.updatedAt` 冇值，只會係冇 diff，因為 `json === null` 一定有 error ✅
- **S-808**：build → migrate → check → deploy，跟足 backlog；檢查嘅位置見 S-826
- **S-797**：`publishSnapshot` 會讀埋 `status`，唔係 `ok` 就喺寫 D1 之前回 409 ✅
- **TDD**：每項都有紅燈 commit 喺實作之前（S-808 係 CI YAML，冇得寫 unit test）；S-813 / S-815 / S-823 / S-824 本身已經綠，開發者已經講明
- **Motion**：`motionTiming` 喺每次 render 讀 token，冇 cache，跟 CLAUDE.md；冇 token 時 0ms，唔會卡住 ✅
- **Version**：api 0.6.2 + lockfile 同步；`Brand.test` 改為只比較 `apiPackage.version`，`auth.test` 都係讀 package version（S-815）✅

## ✅ 做得好嘅地方

- `wording.ts` 儲完整句子，冇用片段砌，所以 CLI 嘅字眼一個字都冇變
- `next` 簽入 state cookie，Worker 唔使記任何 server state，callback 仲會再驗一次
- CSS 原文 test（hex、motion 時間）可以防同類問題再出現

## Handoff receipt

```
HANDOFF_RECEIPT
agent: code-reviewer
status: pass
score: 95
hard_gates: { lint: pass, type: pass, tests: pass, coverage: pass, no_critical: pass, security_scan: n/a }
blocking: none（hard gate）；W-713 merge 前要修
findings: W-713；S-825 S-826 S-827（backlog）
next_action: developer 修 W-713（apps/admin/public/_headers + node test，commit `fix: W-713 | …`）→ re-review W-713 → QA
context: CI run 43083826283（3f06a1b）跑緊；報告只 commit，未 push。backlog 要保留 S-814 race 嗰半、S-799 真 D1 QA、S-823 guard
```
