# Code Review — 2026-11-10 — Phase 3a：admin 資料欄位 + API（api v0.4.0、player v1.33.0）

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/charming-heisenberg-8z30x3` `6481f7c..HEAD`（`c45ea3d` catalog 欄位 + admin helpers、`236d0cd` player displayName、`5760a86` summarizeChanges 落架集數、`7000579` api endpoints / drafts / findings、`0827821` mockup prettier）
- SSoT（L1）：`.proj-docs/plans/2026-11-10_plan_phase3-admin.md` §3a、`.claude/CLAUDE.md`
- Tier：T3（新 mutating endpoint、D1 migration `0004`、掃描自動寫 D1、player 顯示改動）
- 總評：守門、draft 排除、migration、schema ↔ parser 同步、`HAND_WRITTEN_ARC_KEYS`、每劇 ID pin 全部 OK。兩個問題都同「短篇 placeholder ID 改名」有關：待辦行跟住 `arc_id` 對，改咗 ID 之後成行消失（C-013）；下架短篇 / 劇嘅 placeholder ID 一 publish 就入咗 ID 守衛，之後改 ID 就 409（W-707）

## Hard Gates

- Lint：`npm run lint`（eslint + `prettier --check .`）exit 0；新 api / catalog 函數全部 ≤ 30 行（超 30 行嘅只係原有 JSX component，今次每個只加 1–4 行）
- Type：`npx tsc -b` exit 0
- Tests（只跑相關）：`npx vitest related --run <75 個改動 .ts/.tsx>` → 119 檔 1837 pass；6 個每劇 `drama.test.ts` → 54 pass（ID pin 冇變）。冇跑 full suite / e2e
- Coverage：`packages/catalog/src/admin/**` lines 98.1% / branch 91%。Worker 量唔到 v8 coverage，靠 test 名逐條對 code path
- Security：冇新依賴
- No Critical：**fail**（C-013）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                           |
| -------- | ------ | ------- | ---------------------------------------------- |
| 正確性   | 5      | 25      | C-013（-15）、W-707（-5）                      |
| 安全性   | 20     | 20      | 新 route 全部喺 same-origin + session 之後     |
| 可維護性 | 20     | 20      | 函數短、常數有名                               |
| 測試覆蓋 | 15     | 15      | plan「3a 測試」列嘅 case 都有                  |
| 性能     | 10     | 10      | `GET /api/publishes` 載晒全部 document → S-798 |
| 代碼風格 | 10     | 10      | lint / prettier 過                             |
| **總分** | **80** | **100** |                                                |

**結果：❌ fail**（有 Critical）

## 🔴 C-013 待辦 `newArc` 行跟 placeholder `arc_id` 對，改咗短篇 ID 之後成行消失，「排期」必須都冇埋

- 位置：`apps/api/src/admin/todos.ts` `toRows`（`arcsOf(ctx.definition).find((a) => a.id === finding.arc_id)`，搵唔到就 `cellsOf` 回 `undefined`）；`rescan.ts` `arcFindings` 用 `arc.id` 記 finding
- L1：plan §3a `GET /api/todos`「必須：… placeholder ID（`arc-NN`）… 排期（新短篇仲係 `enabled: false` 而冇排程）」；§風險「漏咗排期就唔會上架（待辦矩陣『排期』係必須，擋住確認發佈）」
- L2：臨時 test（跑完已刪）：scan 出新短篇 `arc-01` → `blocking: 1`；`PUT` 將 `arc-01` 改做 `season-2`（仲係 `enabled: false`、冇排程）→ `GET /api/todos` 回 `rows: []`、`blocking: 0`；`scan_findings` 仲有一行 `arc_id = 'arc-01'` 永遠唔會 resolved。現有 test「done once fixed」靠手寫 `UPDATE scan_findings SET arc_id = 'season-2'` 先過，production code 冇任何地方做呢步
- L3：正常流程係先改 ID（必須）再排期，所以呢個情況幾乎一定會發生；新短篇冇人提就永遠下架。`newEpisodes` 行嘅排期格同樣用舊 `arcId`
- 方案 A（推薦）：finding 用短篇 `name`（= R2 子資料夾，永遠唔改）對：`toRows` 用 `detail.arc` 搵 arc，`arc_id` 淨係做顯示 / 跳轉，由現況 arc 攞。改動細，舊 finding `detail.arc` 已經有
- 方案 B：`PUT /api/entries/dramas/:id` 比較新舊 definition，按 `name` 搵出改咗嘅 arc id，同一個 batch `UPDATE scan_findings SET arc_id`（`schedules.arc_id` 都要跟）。完整啲，但要改 PUT 路徑同 schedule
- 要加 test：唔手改 `scan_findings`，改 arc ID 之後行仲喺度、排期仲係 `must`

## 🟡 W-707 下架短篇 / 劇嘅 placeholder ID 一 publish 就入咗 ID 守衛，之後改 ID 要 force

- 位置：`apps/api/src/config.ts` `VALIDATION_BUILD_OPTIONS.includeDisabledArcs`（publish 時寫入 `publishes.episode_ids`）；`apps/api/src/admin/rename.ts` `wasEverPublished`（`document LIKE` 連下架劇都算）
- L1：plan §3a「placeholder ID 係必須（要改）」+「rename 只限從未發佈」；偏差 #4 本意係「落架唔當 ID 消失」，唔係「從未上過架嘅 ID 都鎖死」
- L2：臨時 test：已發佈嘅 `golden` → scan 出 `arc-01`（`enabled: false`）→ publish 200，`episode_ids` 有 `drama:golden:arc-01:1` → 將 `arc-01` 改做 `season-2` → publish **409**。新劇同理：draft 上載晒圖之後自動清 draft，`enabled: false` + `drama-01` 都會入 document，之後 rename 回 409
- L3：3b 之前 ops 頁仲有 publish 掣，`curl POST /api/scan` 係 deploy 驗證步驟，路徑真實存在；唯一出路係 `force=1`（成個守衛一齊跳過）
- 方案 A（推薦）：守衛做唔對稱：`episode_ids` 只存上架短篇（player 睇到嘅），比較時新 document 用 `includeDisabledArcs: true` 計。落架照唔會 409，從未上架嘅 ID 唔會被鎖；`wasEverPublished` 改為只睇 `episode_ids`
- 方案 B：`POST /api/publish` server 端用 `loadTodoRows` 擋：有 `must` 格就 422（plan「擋住確認發佈」由 API 執行，唔淨靠 3b UI）。要同時修好 C-013 先可靠

## Developer 報嘅偏差（逐條判斷）

| #   | 偏差                                                      | 判斷                                                                                                                    |
| --- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | `arcLabel` optional + `arcLabelOf()`                      | 接受。冇 displayName 嘅 object 同之前一模一樣，ID pin、snapshot 唔郁                                                    |
| 2   | 下架節目 `findShow` / `themeFor` 都搵唔到；錄音驗證時被剷 | 接受。被剷嘅只係 probe cache（重新上架會再 probe）；收藏只係 `isKnownBookmark` 隱藏，冇刪 storage                       |
| 3   | PlayerGauge 唔改                                          | 接受。`view.arc` 係進度環，唔係短篇名                                                                                   |
| 4   | `includeDisabledArcs`                                     | 方向接受（落架唔應該 409），但而家將從未上架嘅 placeholder ID 都鎖埋 → W-707                                            |
| 5   | `newShow` kind + `when`；rollback 冇 `entry`              | 接受。`ChangeItem.entry` 已經標 optional，3b 要處理                                                                     |
| 6   | airTime 唔收 24:00、唔收過午夜                            | 接受（plan「end > start」）；深夜節目暫時寫唔到 airTime，P9.5 先需要                                                    |
| 7   | `publishes.error` 只喺 mark-failed 寫                     | 接受。另一條路徑會刪成行，冇地方寫                                                                                      |
| 8   | 冇 must 先 resolve；配對資料夾刪 `missingFolder`          | 接受。但 C-013 嗰啲搵唔到 arc 嘅行永遠唔會 resolve                                                                      |
| 9   | draft 寬鬆驗證用 placeholder URL                          | 接受。`listEntries WHERE draft = 0`，publish / changes 都唔包 draft，placeholder URL 唔會出街（`drafts.test.ts` 有 L2） |

## 其他重點核對

- 守門：`adminRoutes` 掛喺 `contentRoutes`，即係喺 `apiRoutes.use('*', requireSameOrigin, requireSession)` 之後，8 個新 route 全部受保護，亦受 256 KB body limit
- Migration `0004`：`ADD COLUMN … NOT NULL DEFAULT 0 CHECK` 舊行全部 0；舊 Worker 用列明 column 嘅 SELECT，先跑 migration 再 deploy 冇問題
- 掃描：冇 diff 唔寫；entry 用樂觀鎖寫兼 bump `updated_at`（admin 會收 412）；finding 有 `guard`；有資料夾唔見就唔自動建新劇（改名唔會變兩套）；新劇 `ON CONFLICT DO NOTHING`
- Rename：`wasEverPublished` 只計 `ok` 行；`entries` + `schedules` + `scan_findings` 喺同一個 batch，第 2、3 句 `EXISTS` 跟第 1 句
- Order：`sameSet` 擋重複 / 漏；`json_set` 唔會冚咗其他欄位；冇變嘅唔 bump
- Design Origin `baseline:` 屬實：player diff 只換 label 來源（`arcLabelOf` / `summaryLabel` / `arcLabelFor`），冇改 className / layout / CSS；key、URL、`onPick` 照用 `arc`
- TDD：test 同 code 喺同一個 commit，history 睇唔到 red-first；請 developer 喺 PR 補一句說明（唔扣分）

## 🟢 / Observation（入 backlog）

- S-798 `apps/api/src/catalog/routes.ts` `GET /api/publishes`：每次載晒全部 `publishes.document` 再逐行 `summarizeChanges`（developer 已報）；可以喺 publish 時計好 `changes` 存欄位，或者分頁
- S-799 `apps/api/src/admin/order.ts`：`updated_at` 由讀取時嘅值計，冇同現行值取 `MAX`；同一 ms 有另一個寫入可能撞 ETag。`json_set` 綁數字只喺 miniflare 驗過，deploy 後 QA 喺真 D1 跑一次 `PUT /api/order`
- S-800 `apps/api/src/admin/scan.ts` `buildPlan`：任何一個未配對嘅 `missingFolder`（例如退咗役、刪咗 R2 資料夾嘅劇）會一直擋住全部新資料夾自動建劇；可以加「唔再掃」選項，或者只喺新資料夾數 ≤ 唔見數先擋
- S-801 `apps/api/src/admin/folders.ts` `commitPairing`：配對返同一個資料夾（冇 diff）→ `plan.updatedAt` 冇值 → 回 422「folder scan failed」，`issues` 係空；應該回 200 + 只刪 finding
- S-802 `apps/api/src/admin/findings.ts`：兩個同時進行嘅 scan 喺同一 ms 計到同一個 `guard`，輸咗嗰個嘅 finding 都會寫入（`toRows` 會合返做一行，無害）

## ✅ 做得好嘅地方

- Draft 隔離做得乾淨：`listEntries` 一處過濾，publish / changes / ID 守衛自動跟；寬鬆驗證只放寬未上載嘅圖，其他規則照驗
- 掃描、配對、rename 全部「先寫 entry、後寫 finding / schedule，用 `EXISTS … updated_at = guard` 跟」，樂觀鎖輸咗就乜都唔郁
- `summarizeChanges` 唔 parse definition，壞 document 都比較得；catalog admin helper 有齊邊界 test

## Handoff receipt

```handoff-receipt
protocol: 1
status: fail
score: 80/100
stage: T3
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: "pass (vitest related: 119 files / 1837; per-drama drama.test.ts 6 files / 54)"
  coverage: "packages/catalog/src/admin 98.1% lines / 91% branch; Worker routes branch-checked by test names"
  no_critical: fail
  security_scan: "n/a (no new dependencies)"
next_action: invoke_developer
next_agent: developer
branch: "claude/charming-heisenberg-8z30x3"
context: "Phase 3a fail 80: C-013 (todos newArc row matched by placeholder arc_id, disappears after arc id rename; blocking drops to 0 while arc still unscheduled; finding never resolved) and W-707 (includeDisabledArcs + wasEverPublished lock never-listed placeholder arc/drama IDs into the ID guard -> 409 after rename). Fix commits: 'fix: C-013 | ...', 'fix: W-707 | ...'. Deviations 1-3,5-9 accepted, 4 accepted in direction (see W-707). S-798..S-802 to backlog. Re-review only C-013 / W-707 diffs. Report committed locally, not pushed (code CI running)."
```
