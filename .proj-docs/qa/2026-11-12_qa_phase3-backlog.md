# QA — Phase 3 backlog 清理（api 0.6.1 → 0.6.2）— 2026-11-12 — S1

- Tier: T3（auth redirect、D1、publish / rollback、deploy workflow）| Commit: `323e0e7` | Verdict: ✅ pass
- Ledger（`impact --since f0b8724`）: SKIP 7 / REVERIFY 6（admin、api、drama、catalog-data、coming-soon、repo-tooling）/ UNCOVERED 10（全部係 admin / api / drama scope glob 入面嘅新檔，併入各自鏈）
- SSoT: `.proj-docs/reviews/2026-11-12_review_phase3-backlog.md`（pass 100）；ID 原文 = `f0b8724:.proj-docs/backlog.md`
- SKIP bookmark / card-zoom / home / mini-player / player-core / pwa-shell / show-today-page / ui-foundation（frozen, untouched）
- catalog-data（`packages/catalog/src/index.ts` 多 export 一個 type）、coming-soon + repo-tooling（`package-lock.json` 只改 api version）：diff 已核，證據引用 CI 同 SHA

## Runs

| Command / 證據                                                                                                                                        | Result                                                                                                                                                                                                                                                  | Time  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| CI [43085009901](https://github.com/dcwhung/903-player/actions/runs/43085009901) @`323e0e7`（`changes` 判 code=true）                                 | lint / `tsc -b` / unit 334 files 3561 / build / build:admin / e2e + e2e:admin（ubuntu-24.04）794 PASS 0 FAIL                                                                                                                                            | 9 min |
| `npm test -- apps/admin apps/api packages/catalog/src/scan packages/catalog/src/schedule`                                                             | 74 files / 481 pass                                                                                                                                                                                                                                     | 31 s  |
| Coverage v8：admin / api（workerd）/ catalog scan                                                                                                     | api 改動檔 lines 86–100%；scan 97.9–100%（`wording.ts` 100）；admin 見 Hard Gates                                                                                                                                                                       | 2 min |
| S-809 server：`wrangler dev`（假 `.dev.vars`，完咗已刪）`curl /auth/google/start?next=…` 解 `__Host-oauth` payload                                    | 合規深連結 → `next="/dramas/x/schedule#arc"`；`//evil.com`、`/\evil`、`https://evil.com`、`/auth/me`、`/auth`、`/x\r\nSet-Cookie…` → 冇 `next`                                                                                                          | 1 min |
| S-809 篡改：改 payload `next="//evil.com"` 保留舊簽名 → callback；簽名啱但 state 錯                                                                   | 400 / 400                                                                                                                                                                                                                                               | —     |
| S-809 client：`loginHref.test.ts` + `LoginScreen.test.tsx` + CI e2e:admin login check（`?next=%2Fdramas%2Flancy%2Fschedule%23lancy-02`）              | pass                                                                                                                                                                                                                                                    | —     |
| W-713：`npm run build:admin` → `dist/_headers`；同一個 `wrangler dev` `curl -sI`                                                                      | `_headers` 內容啱；`/`、`/dramas`、`/dramas/x/schedule`（SPA fallback）、`/banner.webp` 都有 `X-Frame-Options: DENY` + `frame-ancestors 'none'`；`/_headers` 唔會原檔出（回 index.html）                                                                | 1 min |
| S-785 CLI 字眼：base `f0b8724` worktree vs HEAD 用 `tsx` 跑 `generateDraft` 8 個情況（NFD、壞 `--id`、缺短篇 / 日、folder 名、kind、`--existing` 壞） | 20 行輸出 `diff` 完全一樣；R2 字眼由 `draft.test.ts` S-785 4 test 證                                                                                                                                                                                    | 20 s  |
| S-812 / S-806 smoke（scratchpad Playwright + `mockApi.mjs`）淺 / 深色                                                                                 | `.pill.new` `rgb(192,54,44)` / 白 / 700；nav active、`.count`、主題掣、裁切框都係 `#fff`（同改之前 hex 一樣）；spinner reduce = `none 0s`、no-preference = `spin 0.8s`；鍵盤排序 reduce = 冇 transition、0 animation，no-preference = `transform 200ms` | 30 s  |
| `deploy-api.yml` YAML 步驟（S-808 / S-826）                                                                                                           | test → Build admin → Check admin build → Apply D1 → Deploy；check 步驟喺空 `dist` exit 1                                                                                                                                                                | —     |

重點 ID 對應 unit（全部喺上面本機 run + CI 綠）：S-803 `schedule.test.ts`「PUT schedule with enable: true」4 個（一個 `DB.batch`，stale If-Match 兩樣都唔寫）+ `DramaEditor.test.tsx`（淨一個 PUT body `{ rule, enable: true }`、冇 `PUT /api/entries`）；S-804 `schedule.test.ts` 409 `reason: 'arcScheduled'` + `errorMessage.test.ts`「此短篇已有排程，請先移除排程再修改 ID。」；S-800 `adminScan.test.ts`（無關新資料夾照建、日子重疊先擋）；S-801 `adminRoutes.test.ts`（200 `unchanged: true`、D1 唔變）；S-797 `publish.test.ts`（`failed` → 409、history 唔變）；S-795 `webp.test.ts` 4 個；S-811 `DramaList.test.tsx` 2 個 + CI e2e:admin「＋ dialog」

## Hard Gates

all pass。Coverage 講明：admin 改動檔有 3 個 lines < 80%（`flip.ts` 48.6，今次淨係刪 code；`endpoints.ts` 74.4、`DramaList.tsx` 71.4）—— 今次改嘅行（`putSchedule` `enable`、＋ dialog）有 unit 行到，FLIP / 列表由 CI e2e:admin 證；同 Phase 3b / 3c QA 一樣嘅處理。Security：S-809 / W-713 上面證；冇新依賴。Performance：n/a（只係 `NOT EXISTS` 細表）

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- Observation：S-806 令排序位移由 240 ms 變 200 ms（`--motion-base`），係跟 token 嘅預期效果；用戶睇唔出
- Observation：client `loginHref` 擋 `/auth/` 前綴但唔擋 `/auth` 本身；server `safeNext` 會擋（上面 curl 證），冇影響
- Ledger：freeze 之後 `impact` 仲出 `REVERIFY drama`，原因係 drama 嘅舊 S3 行（Phase 0a 前嘅 `src/…` path + 舊 plan hash），唔關今次 S1 事；S1 已 FROZEN，下次 S3 會覆蓋
- Production 未驗（交 DevOps）：deploy 後 `curl -sI <WORKER_ORIGIN>/dramas` 同一條唔存在嘅 SPA path，要有 `X-Frame-Options: DENY` + `frame-ancestors 'none'`；S-799 真 D1、S-825 / S-827 照 backlog

## 建議補測

- none（高風險邏輯 S-809 / S-800 / S-803 / S-804 已有邊界 test）

```handoff-receipt
HANDOFF_RECEIPT
agent: quality-assurance
stage: S1
status: pass
hard_gates: { tests: pass, coverage: pass（admin 3 檔 < 80% 已講明）, no_blocking: pass, pwa: n/a, security: pass, performance: n/a }
blocking: none
findings: none blocking；Observation ×2
frozen: admin、api、drama、catalog-data、coming-soon、repo-tooling（S1 @323e0e7）
next_action: main agent commit QA docs（plans + ledger + 本報告），CI 已完成可以 push；deploy 後 DevOps curl 驗 W-713
context: CI 43085009901 @323e0e7 全綠（e2e 794/0）；S-809 server curl + 篡改 400；W-713 dist/_headers + wrangler dev header；S-785 CLI 字眼 diff 一樣
```
