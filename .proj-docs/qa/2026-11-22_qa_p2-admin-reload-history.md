# QA — admin reload / history (AU-024 + AU-025) — 2026-11-22 — S1

- Tier: T1 | Commit: `584bdd2e`（code `2262bb46`）| Base: `82f25ed2` | Verdict: ✅ pass
- Ledger: SKIP 11 / REVERIFY 4（admin、api、coming-soon、repo-tooling）/ UNCOVERED 7（全部歸 admin / api）/ IGNORED 2
- Plan：`.proj-docs/qa/plans/admin.md` 新增 AC-38、`.proj-docs/qa/plans/api.md` 新增 AC-36；coming-soon / repo-tooling 沿用（淨係 `package-lock.json` 嘅 admin / api workspace version，由 lint / `tsc -b` / `npm test` 證）；Review：`.proj-docs/reviews/2026-11-22_review_p2-admin-reload-history.md`

## Runs（head `584bdd2e`，exit code 直接睇）

| Command                                                                                       | Result                                               | Time  |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----- |
| `npm run lint`                                                                                | exit 0                                               | —     |
| `npx tsc -b`；`npm run typecheck -w apps/api`                                                 | exit 0；exit 0                                       | —     |
| `npm test`                                                                                    | 539 files / 5736 tests，exit 0                       | 178 s |
| `npm run test -w apps/api`                                                                    | workerd 29 files / 468 + scripts 1 file / 40，exit 0 | —     |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium E2E_PORT=4397 npm run e2e:admin`                  | 65 PASS / 0 FAIL，exit 0（第一次就過，冇重跑）       | —     |
| admin coverage（`apps/admin`，v8，改動 src）                                                  | 見下                                                 | 93 s  |
| api coverage（`apps/api --config vitest.config.ts`，`content/{entries,publishedVersion}.ts`） | lines 100 / 100，stmts 96.5 / 95.2                   | —     |
| scratchpad Playwright（`vite preview` :4397 + `mockApi.mjs`，DSF 1，淺 + 深）                 | 15/15，exit 0                                        | —     |

Admin coverage（lines）：`useResource.ts` 100、`HistoryPage.tsx` 94.7、`HistoryRow.tsx` 100、`useHistoryActions.ts` 100、`HistoryHeader.tsx` / `RollbackButton.tsx` / `DeployCell.tsx` 100（skipFull 冇列）、`endpoints.ts` 86、`AdminData.tsx` 47.8（未行 = L50–64 `AdminDataProvider`，今次冇改；改咗嘅 `loadedOf` / `loadAllEntries` 有行到；provider 由 e2e 行）

## Browser acceptance（AC-38 / AC-36）

- (1) 還原：`還原至 #2` → dialog「還原」**連撳兩下** → request 扣住期間 3/3 個掣（2 個還原 + 1 個重新部署）disabled、表 `aria-busy=true`；放行後 toast「已還原至 #2」、掣恢復；rollback request = 1。500 → 「還原失敗：D1 busy」
- (2) `GET /api/publishes` 500：淨出「載入失敗：D1 unavailable」+「重試」，table 0、「共 N 次」0、空狀態 0；撳重試 → 表同「共 3 次」返嚟、alert 消失
- (3) 入 `/dramas`、`/shows`：各淨一個 `GET /api/entries?detail=1`，逐個 entry GET = 0；由列表入編輯頁改簡介儲存 → `PUT` `If-Match: "lancy-v1"` / `"waves-v1"`（= detail etag）200，再儲存 `If-Match "…-v2"` 200（編輯頁開頁自己嘅 `getEntry` 係原有行為，唔屬列表）
- (4) Reload race（瀏覽器重現到）：第一個 `?detail=1` 扣 3 s 回舊名，期間撳「重新掃描」觸發第二個即回新名；舊嗰個遲返之後列表仍然係新名（舊名 0）；另有 `useResource.test.ts` unit
- 截圖：scratchpad `qaH/h1-*` `h1f-*` `h2-*` `h3-*` `h4-*`（`-light` / `-dark`）

## Hard Gates

all pass（PWA gate n/a：admin 冇 SW / manifest）

## Findings

### 🟢 / Observation

- 冇

## 建議補測

- none（AC-38 / AC-36 已有 unit + e2e；no edge case gap）

## Freeze

- admin S1、api S1、coming-soon S1、repo-tooling S1：ledger 現有成條 chain + stage 檔案 + 今次新檔重新 freeze；同 base ledger 比對 chain + stage + path 冇少行
- 行數（S1）：admin 483 → 489（+6 新檔）、api 160 → 161（+1）、coming-soon 163 → 163、repo-tooling 51 → 51；四條 S1 `status` 全 FROZEN（`impact` 仍列 REVERIFY 係因為 S3 行 STALE，屬 release S3）
- SKIP：ambient、bookmark、card-zoom、catalog-data、drama、home、mini-player、player-core、pwa-shell、show-today-page、ui-foundation（frozen，冇改）
