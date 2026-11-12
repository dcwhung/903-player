# QA — admin 回饋修正批次（api 0.6.2 → 0.6.3）— 2026-11-12 — S1

- Tier: T2（admin UI 13 項 + api 寬鬆驗證）| Commit: `3ae6c88` | Verdict: ✅ pass
- Ledger（`impact --since a2b2c0a`）: SKIP 10 / REVERIFY 4（admin、api、coming-soon、repo-tooling）/ UNCOVERED 12（11 個係 admin / api scope 入面嘅新檔，併入各自鏈；`_mockups_/admin-schedule-unlist/` 屬下一批 feature，唔驗唔 freeze）。SKIP 嘅鏈（bookmark / card-zoom / catalog-data / drama / home / mini-player / player-core / pwa-shell / show-today-page / ui-foundation）frozen, untouched；coming-soon + repo-tooling 嘅 `package-lock.json` 淨改 `apps/api` version 0.6.2 → 0.6.3（diff 已核），證據引用 CI 同 SHA
- SSoT: 用戶 13 項 + 碟面裁切預覽圓框；`.proj-docs/reviews/2026-11-12_review_admin-feedback-0.6.3.md`（pass 100，W-714 resolved，S-831 已補 test）

## Runs

| Command / 證據                                                                                                                              | Result                                                                                                                         | Time  |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----- |
| CI [43114271808](https://github.com/dcwhung/903-player/actions/runs/43114271808) @`3ae6c88`（`changes` 判 code=true）                       | lint / `tsc -b` / unit / build / build:admin 綠；e2e（ubuntu-24.04，有真跑）`All E2E checks passed` + e2e:admin 20 PASS 0 FAIL | –     |
| `npm test -- apps/admin apps/api packages/catalog/src/schedule`                                                                             | 77 files / 477 pass                                                                                                            | 36 s  |
| `PW_CHROMIUM_PATH=… npm run e2e:admin`（本機）                                                                                              | 20 PASS / 0 FAIL（包括今批 6 個新 check）                                                                                      | 27 s  |
| Coverage v8 admin（`apps/admin` 跑）/ api（workerd）                                                                                        | api `entries.ts` 100、`todos.ts` 98.9；admin 見 Hard Gates                                                                     | 1 min |
| 9(b) / W-714：`wrangler dev --local-protocol https --persist-to <scratchpad>`（假 `.dev.vars`，完咗已刪）+ Pillow WebP 經 `PUT /api/assets` | 見下表，10 / 10 符合                                                                                                           | 1 s   |
| AC-15 smoke（scratchpad Playwright + `mockApi.mjs`，`page.route` 令格 target ≠ 成行 target）                                                | 22 / 22 PASS                                                                                                                   | 1 min |

| 9(b) / W-714（`wrangler dev`）               | 結果                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| 新下架節目冇圖 / 淨 Banner / 淨碟面 → 兩張齊 | 201 / 200 / 201 `draft:true`（D1 `draft=1`）→ 200 `draft:false`（D1 `draft=0`）       |
| 新**上架**節目冇圖                           | 422 `tile: no file tile.webp in the folder`                                           |
| publish（有一個 draft 節目 `qadisc`）        | 200；`catalog.json` shows = `qanoimg`、`qapub`，冇 `qadisc`                           |
| 已發佈節目轉下架、缺碟面 / 圖齊              | 422 `disc: no file disc.webp`（`draft` 仍 0）/ 200 `draft:false`                      |
| 已發佈劇轉下架 + 加冇碟面短篇 / 上載碟面後   | 422 `arcs[1].disc: no file qa-s2.webp`（`draft` 仍 0）/ 200；再 publish 200（唔 409） |

- AC-15 smoke 第 8 項：Tab 到行名 link + Enter → `/dramas/lancy/arcs?from=todos…#lancy-02`；排期格 link 撳 / Enter → `/dramas/lancy/schedule#lancy-02`（唔係成行 target）；撳 ✓ 格 / meta 字 = 成行 target
- 第 11 項：Tab 到短篇名 link + Enter → `/dramas/lancy/arcs#lancy-02`，短篇已展開；拖曳掣唔開行；行背景開 `/dramas/lancy`
- 第 6 項：狀態 toggle 開 `rgb(31,122,77)` / 關 `rgb(194,51,58)`，淺色、深色 hover 前後 bg / color / border / shadow / filter 完全一樣。第 5 項：CI / 本機 e2e:admin「disabled arc without a schedule is 未上架 (no grey ✓)」+ `stripModel.test.ts` 5 個（有排程照排程日子）
- 第 12 項：`page.clock` = 2026-01-02 02:00 HKT，記錄頁：`今天 01:00`、`1/1 01:00`（UTC 仍係 2025-12-31）、`31/12/2025 23:00`；冇月/日

## Hard Gates

all pass。Coverage 講明：admin 改動檔 2 個 < 80%：`ArcCells.tsx` lines 76.2、`TodoMatrix.tsx` stmts 77.8（lines 86.4）。未行到嘅行（`DailyLine`、`noArcs`、展開掣 `onClick`、`episodesOf`）全部係舊 code；今次改嘅行（短篇 link、成行 `rowClickTo`）有 unit 行到，再由 e2e:admin 同上面 smoke 證（L2）。同之前 admin QA 一樣處理。其他改動檔 ≥ 83%。Security / Data：寬鬆驗證只限從未發佈嘅下架 entry，上面 `wrangler dev` 證。冇新依賴。Performance：n/a

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- Observation：第 12 項只改數字日期；狀態字嘅 `longDate`（「11 月 16 日」）照舊係中文寫法，冇月/日數字次序問題。用戶睇截圖確認過，唔開 backlog；排程短日期跨年冇年份 = S-830（已喺 backlog）

## 建議補測

- none

```handoff-receipt
HANDOFF_RECEIPT
agent: quality-assurance
stage: S1
scope: admin-feedback-0.6.3 (a2b2c0a..3ae6c88)
status: pass
hard_gates: { tests: pass, coverage: pass（admin 2 檔 < 80% 已講明，改動行有行到）, no_blocking: pass, pwa: n/a, security: pass, performance: n/a }
blocking: []
tickets: []
frozen: [admin S1, api S1, coming-soon S1, repo-tooling S1]
next_action: main agent commit QA 報告 + plans + ledger（CI 已完成，可以 push）
context: CI 43114271808 @3ae6c88 green (check + e2e ubuntu-24.04 real run, player all passed, admin 20/0); local unit 477 pass, e2e:admin 20/0; wrangler dev 9(b)/W-714 10 cases ok (draft only for never-published unlisted, 422 for published, publish excludes draft, no 409); smoke items 5/6/8/11/12 ok; coverage api 98.9-100, admin ArcCells 76.2 / TodoMatrix stmts 77.8 (old lines only)
report: .proj-docs/qa/2026-11-12_qa_admin-feedback-0.6.3.md
```

## Re-verify — 視覺回饋 4 輪（`3ae6c88..3745863`）— S1

- Commit: `3745863`（code；`f3d3519` / `a22f9b7` 淨 docs）| Verdict: ✅ pass | SSoT: review 同檔「追加 review（視覺回饋 4 輪）」pass 100
- Ledger（`impact --since 3ae6c88`）: REVERIFY 1（admin）/ UNCOVERED 13（admin 新 test、`e2e/fixtures/*.webp`、login Design Origin `_mockups_/admin-login/*`，全部併入 admin）/ 其餘 SKIP
- CI [43126936714](https://github.com/dcwhung/903-player/actions/runs/43126936714) @`3745863`：lint / `tsc -b` / unit / build / build:admin 綠；e2e（ubuntu-24.04 真跑）player 綠 + e2e:admin 24 PASS 0 FAIL
- 本機：`npm test -- apps/admin` 66 files / 251 pass；`e2e:admin` 24 / 0；`dist/` = `_headers` `assets/*` `banner.webp` `icon-192.png` `index.html`，冇 fixtures、冇引用
- Smoke（scratchpad Playwright + `mockApi.mjs`）全 PASS：
    - Login 系統淺 / 深 × `admin.theme` 冇 / light / dark 6 組：`data-theme` 跟設定；`.gsi` 淺 `#fff` 字 `rgb(31,31,31)`（16.5:1）、深 `rgb(19,19,20)` 字 `rgb(227,227,227)`（14.5:1），`admin.theme` 蓋過系統；一個 `h1`；背景 banner
    - `?next=`：深連結 → `/auth/google/start?next=%2Fdramas%2Flancy%2Fschedule%23lancy-02`；`/` → 冇 `next`
    - 直向 390×844：login 同 app 都淨出轉向提示（`.gsi` / `main` 唔顯示）
    - 排程 chip hover：淺 / 深最低 4.52:1（揀咗嗰粒），其他 ≥ 11.4；disabled / `.switch` 由 e2e「pressed (hovered) and disabled chips stay readable」證
    - 虛線：10 頁掃晒，媒體框淨 `button.img-slot`；另外只有待辦 `a.cell`（＋）同 R2 `fieldset.scan-box`（唔係媒體框，AC-7）；`.crop` 上載 dialog 由 e2e PNG upload + `mediaSlot.node.test.ts` 證
- Coverage：改動檔 `AuthGate.tsx` 54.5、`DeleteEntry.tsx` 52.9（lines），未行到嘅都係舊行（重試 / logout、刪除 `onConfirm`）；今次加嘅 icon 行有 unit 行到；其他 ≥ 81%
- Findings：冇 🔴 / 🟡；Observation：揀咗 chip 4.52:1 啱啱過 AA，之後改色要留意

```handoff-receipt
HANDOFF_RECEIPT
agent: quality-assurance
stage: S1
scope: admin-feedback-0.6.3 visual follow-up re-verify (3ae6c88..3745863)
status: pass
hard_gates: { tests: pass, coverage: pass（AuthGate / DeleteEntry 舊行 < 80% 已講明）, no_blocking: pass, pwa: n/a, security: n/a, performance: n/a }
blocking: []
tickets: []
frozen: [admin S1]
next_action: main agent commit QA 報告 + admin plan + ledger，同本地 docs commit 一齊 push（CI 43126936714 已完成）
context: CI 43126936714 @3745863 green (e2e ubuntu-24.04 real, admin 24/0); local admin unit 251, e2e:admin 24/0; login 6 theme combos, ?next=, portrait, chip hover contrast (min 4.52), dashed frames only img-slot/crop, dist no fixtures
report: .proj-docs/qa/2026-11-12_qa_admin-feedback-0.6.3.md
```
