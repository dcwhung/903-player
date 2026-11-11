# QA — Phase 3c（admin UI 樣式 + 3b 用後回饋，api 0.6.0）— 2026-11-11 — S1

- Tier: T3（API 寫 D1 新路徑、還原語意改、新依賴 `@jsquash/webp`、全 admin 樣式）| Code commit: `d6136d3`（`3bea508` 淨 review docs）| Verdict: ✅ pass
- L1：`.proj-docs/plans/2026-11-10_plan_phase3-admin.md` §3c；`mockup: _mockups_/admin-style/index.html`（含 ⑨ nav v4）；plan 後用戶確認嘅改動（主題、圖例三行、記錄版本欄、還原寫 D1 + 提示、nav v4、W-711）；review `.proj-docs/reviews/2026-11-11_review_phase3c-admin-style.md`（pass 95 → 100）
- Ledger（`impact --since 0cfa53d`）：SKIP 9（含 `catalog-data`）/ REVERIFY 5（admin、api、drama、coming-soon、repo-tooling）/ UNCOVERED 34（全部 `apps/admin/**`、`apps/api/src/{admin/confirmId,catalog/rollback}.ts`、`_mockups_/admin-style/*`，歸入 admin / api）/ IGNORED 4
- 範圍更正：派工寫 `catalog-data`，但佢 SKIP（frozen、冇改）；`packages/catalog/src/scan/*` 屬 `drama` 鏈 → 驗 drama。`coming-soon` / `repo-tooling` REVERIFY 只因 `package-lock.json`：diff 淨係加 `@jsquash/webp` 1.5.0 + `wasm-feature-detect` 1.10.1、api version 0.6.0，現有版本冇變
- Plan 更新：`admin.md` 加 AC-12（3c）+ 12 checks + 3c smoke；`api.md` 加 AC-16；`drama.md` 加 AC-7（`<劇ID>-NN`）。Freeze S1 × 5 @`3bea508`（admin 197、api 96、drama 166、coming-soon 162、repo-tooling 22 檔）；之後 `impact` 淨係 drama 嘅舊 **S3** 行 STALE（plan 改咗 + monorepo 前舊 path，留畀下次 S3），同 2 個已刪 admin 檔以 UNCOVERED 出現（工具對刪除檔嘅顯示）

## Runs

| Command                                                                                      | Result                                                                                          | Time  |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----- |
| CI run 43034842298 @ `d6136d3`（引用）：lint、`tsc -b`、`npm test`、build、build:admin       | success；**E2E job failure = runner DNS 裝唔到 Playwright 依賴，e2e 兩步 skipped**（唔關 code） | 4 min |
| `npm test -- apps/admin apps/api packages/catalog/src/{schedule,admin,scan}` + drama plan 檔 | 109 files / 998 pass                                                                            | 61 s  |
| `npm run build:admin`                                                                        | JS 428.0 kB（gzip 136.7）、CSS 38.4 kB；wasm 281 / 346 kB（lazy）                               | 1 s   |
| `PW_CHROMIUM_PATH=… npm run e2e:admin`                                                       | 12 / 12 PASS                                                                                    | 20 s  |
| `PW_CHROMIUM_PATH=… npm run e2e`（player；drama / coming-soon / repo-tooling，補 CI）        | 780 PASS / 0 FAIL                                                                               | 638 s |
| Coverage v8：admin unit / api（workerd）/ catalog scan + admin                               | admin lines 84.0%；api 改動檔 85–100%；`draft.ts` 100、`merge.ts` 97.9、`airTime.ts` 100        | 2 min |
| 補充 smoke（scratchpad Playwright + `e2e/mockApi.mjs`，build 版）+ 403 頁                    | 7 / 7 PASS（見下）                                                                              | 30 s  |
| 臨時 workerd test（還原 preflight，跑完已刪）                                                | 2 / 2 pass                                                                                      | 10 s  |
| `wrangler dev`（臨時 `.dev.vars`、`--persist-to` scratchpad，完咗已刪）；CLI smoke           | 見下                                                                                            | 1 min |

- 主題：login 卡底色 系統淺 `#fff` / 系統深 `rgb(27,38,53)`；系統深 + 手動淺 → 淺、系統淺 + 手動深 → 深；擋晒 `/assets/*.js` 都已有 `data-theme="dark"`（first paint 前）；三個掣 `aria-pressed`、揀深色存 `admin.theme`、reload 仍深、揀跟系統刪 key。403 頁（`deniedPage()` HTML）同一組 4 個組合底色 / 字色跟足
- 列表圖例：廣播劇 / 節目各 3 行（不同 y）：圓點 → 待發佈（+ 新）→ ⠿ 拖曳
- 上下架記錄：`使用中` / `失敗` pill 同「還原」喺版本欄、只有舊成功版本有還原掣；確認框有「只會還原上架狀態；名稱、簡介、圖片、集數及排程會維持目前版本。」→ `POST /api/publishes/2/rollback`
- nav v4：「內容」→「更新」→ 節目 → 廣播劇；主題 + 收合同一行、FLIP、reduced motion 即切、< 1100px 自動收（`e2e:admin`）
- 還原（api AC-16）：current D1 有無效圖 → 422、`golden` definition / `updated_at` 冇變、publishes 冇多行；latest `episode_ids` 多一個 ID → 409、同樣冇寫。寫 D1 / R2 失敗寫返 / draft 唔郁由 `publish.test.ts` 證；W-711 409 由 `adminRoutes.test.ts`（兩個 case）證
- api AC-15/16（`wrangler dev`）：`/`（含 `admin.theme` script）、`/shows`、`/dramas/lancy/schedule`、`/history` 200 SPA；`/banner.webp` 200 `image/webp`；`/api/health` `{"ok":true,"version":"0.6.0"}`；`/api/me`、`/api/nope` 401；`/auth/google/start` 302（S256）；`/auth/nope`、`/catalog/v1/catalog.json` Worker 404
- drama AC-7 CLI：`drama-from-folder -- <新劇> --id qa` → arcs `qa-01`、`qa-02` + 2 個 TODO；`--existing` 再跑輸出 byte 一樣；fixture 已刪

## Hard Gates

all pass，除 Coverage 要講明：admin 改動 TS(X) 有 11 個 < 80%（`navCollapse.ts` 40、`flip.ts` 54、`ShowFields` 45、`ArcScanBox` 33、`ArcEditor` 59、`ArcIdField` 60 等）+ 8 個冇 unit 嘅頁面 / container（`AppShell`、`UpdatePage`、`PublishPage`、`StatCards` 等）。未覆蓋嘅係 hook / 頁面部份；純邏輯（`isNavMini`、`flipOffset`、`durationMs`）有 unit，hook 行為由 `e2e:admin`（收合記住、< 1100px、FLIP、播放時間 checkbox、確認自動 ID）行過（L2）。跟 3b 嘅做法接受，見「建議補測」

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- Observation：CI 43034842298 e2e job 因 runner DNS（`archive.ubuntu.com`）失敗，冇跑過 code 嘅 e2e；本機 e2e + e2e:admin 全綠補咗。merge 前請 main agent rerun failed job，等 CI 綠（`.claude/CLAUDE.md` push 次序）
- Observation：smoke 第一輪「login 跟主題」用 `body` 底色量（login 頁 body 係 nav 藍，設計如此）→ 改量 `.login .card` 先啱，屬 harness，唔係產品問題

## 建議補測

- `useNavCollapse`：窄視窗 peek 唔寫 localStorage、視窗變闊收返 peek（hook test）
- `useFlip`：reduced motion 唔 call `animate`、timeout 收 `.flipping`（hook test）
- `ShowFields` / `ArcIdField`：「設定播放時間」唔剔唔寫 `airTime`；儲存未改嘅自動 ID 都 call confirm-id。全部已由 e2e 證行為，屬補 unit，唔 block

```handoff-receipt
status: pass
stage: S1
chain: admin, api, drama, coming-soon, repo-tooling
commit: d6136d3
tickets: none
next_action: main_agent_rerun_ci_e2e_then_push_docs_then_merge
context: "Phase 3c S1 pass @d6136d3. catalog-data SKIP (frozen, untouched); scan changes belong to drama, verified instead. CI 43034842298: lint/tsc/unit/build/build:admin success, E2E job failed at Playwright install (runner DNS) so e2e skipped -> rerun failed job before merge. Local: plan unit 109 files/998, build:admin ok, e2e:admin 12/12, player e2e 780/0, smoke 7/7 (theme x login/403/first paint/switch, legend 3 rows, history version column + restore note, nav groups), rollback 422/409 write nothing (temp workerd test), wrangler dev health 0.6.0 + banner.webp, CLI <id>-NN. Coverage: admin 84.0% overall; 11 changed files < 80% + 8 untested pages, e2e-covered (accepted as 3b). Plans admin/api/drama updated; 5 chains frozen S1; QA commit local only (not pushed)."
```
