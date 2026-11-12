# QA — 排程下架 schedule unlisting（api 0.6.3 → 0.7.0）— 2026-11-12 — S1

- Tier: T2（catalog + api + admin 跨模組，MINOR）| Commit: `168ba7a` | Verdict: ✅ pass
- Ledger（`impact --since c302b12` = `merge-base HEAD origin/main`）: SKIP 8 / REVERIFY 5（admin、api、catalog-data、coming-soon、repo-tooling）/ UNCOVERED 22（全部喺 admin glob `apps/admin/**` + Design Origin `_mockups_/admin-schedule-unlist/*`，或者 api glob `packages/catalog/src/schedule/*`，併入各自鏈）
- SSoT: `.proj-docs/reviews/2026-11-12_review_schedule-unlisting.md`（pass 95）；plan `plans/admin.md` AC-17、`plans/api.md` AC-11（0.7.0 下架）
- SKIP bookmark / card-zoom / drama / home / mini-player / player-core / pwa-shell / show-today-page / ui-foundation（frozen, untouched）；player code 冇改，player e2e 引用 CI
- catalog-data（`packages/catalog/src/index.ts` 加 export）、coming-soon + repo-tooling（`package-lock.json` 只改 api version 0.6.3 → 0.7.0）：diff 已核，證據 = 下面本機 `npm test` + CI 同 SHA；`apps/api/src/content/schedule.ts` 淨改註解

## Runs

| Command / 證據                                                                                                       | Result                                                                                                                                                               | Time   |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `npm test`                                                                                                           | 352 files / 3757 pass                                                                                                                                                | 2m20s  |
| `npm run test -w apps/api`                                                                                           | workerd 13 files / 207 + scripts 1 / 12 pass                                                                                                                         | —      |
| `npm run build:admin`                                                                                                | ok                                                                                                                                                                   | 0.5 s  |
| `E2E_PORT=4195 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node apps/admin/e2e/run.mjs`                               | 34 PASS / 0 FAIL（schedule 13 個 section，包括 W-715「unlist date before today pops an error only on 儲存」）                                                        | 42 s   |
| Coverage v8：`--project @903-player/admin`（dramas / ui / editor / model）+ `--project @903-player/catalog` schedule | catalog `src/schedule` lines 97.7；admin 見 Hard Gates                                                                                                               | 1 min  |
| CI [43194052694](https://github.com/dcwhung/903-player/actions/runs/43194052694) @`168ba7a`                          | success：lint / `tsc -b` / unit / build / build:admin；e2e（player）780 PASS「All E2E checks passed」；e2e:admin 34 PASS「all passed」（包括 W-715 section）；0 FAIL | 16 min |
| CI [43190871204](https://github.com/dcwhung/903-player/actions/runs/43190871204) @`ad1829d`（review 時嘅 code）      | success（包括 player e2e + e2e:admin）；`ad1829d..168ba7a` 淨改 `apps/admin` + review 檔，player e2e 引用呢個 run                                                    | 16 min |

W-715 驗證（`97677a8`..`168ba7a`）：`useScheduleForm.test.ts` 4 個（過去日子擋、今日 / 之後准、已落架集數唔計、報第一集）+ `validationMessage.test.ts` 譯中文 + e2e section 全 pass；截圖 `apps/admin/e2e/screenshots/schedule-unlist-past{,-dark}.png`：「上架 N 日後」= 10（27/10 上架、今日 12/11）→「無法儲存：第 1 集的下架日期（6/11 五）早於今日，請修改下架設定。」，冇存。S-835（`ArcSchedule` / `ScheduleViews` / `DateCalendar` 同一個 `hkToday`）、S-841（文案「今日」）由 unit + e2e「今日」section 證

UI 證據（淺 + 深，gitignored）：`schedule-edit`、`schedule-preview`、`schedule-datefield{,-up}`、`schedule-today-overlap`、`schedule-conflict`、`schedule-unlist-past`、`schedule-all-listed` 等 `apps/admin/e2e/screenshots/schedule-*.png`：上架 / 下架 panel、編輯｜預覽 tabs、預覽標題 + 時間軸 + 批次表、今日 marker、月曆向上開 + 今日前日子灰，同 Design Origin 一致

## Hard Gates

all pass。Coverage 講明：admin 改動檔 lines < 80% 有 3 個 ——`CadenceSentence.tsx` 66.7（新檔；未行到嘅係 `onChange` handler / 「每 N 日」分支，行為由 e2e:admin 編輯 / DateField section 行過）、`BasicFields.tsx` 57.1、`endpoints.ts` 71.4（未行到嘅係舊行，同 3b / 3c / backlog QA 一樣處理）；其他改動檔 82–100%（`timelineModel` 99、`scheduleModel` 96、`useScheduleForm` 95.7、`DateCalendar` / `MonthGrid` / `SchedulePanels` / `ScheduleViews` 100）。Security：rule 形狀 + 數值上限照驗（422 唔係 500）、冇新依賴。Performance：n/a

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- 🟢 W-715 錯誤淨講第一集（「第 1 集的下架日期…」），review 例子係範圍（「第 1–10 集」）；冇 AC 要求範圍，入 backlog 可以考慮
- Observation：`apps/admin/e2e/run.mjs` 跑完留低 `vite preview --port 4195`（今次重現，已 kill）；唔影響結果，下次跑要換 port / 先 kill
- Ledger：freeze 後 `impact` 淨出 `UNCOVERED` `EpisodeStrip.tsx` / `useSchedulePreview.ts`，兩個係今次刪咗嘅檔（工具將已刪 path 當 uncovered），冇嘢要驗
- Ledger：catalog-data 嘅舊 S3 行（Phase 0a 前 path）仍然 STALE，唔關今次 S1 事，下次 S3 覆蓋

## 建議補測

- none（W-715 / unlist 邊界：today 准、kept 唔計、legacy `removeAfterDays`、listing day reject 已有 test）

```handoff-receipt
protocol: 1
status: pass
stage: S1
ledger: "FROZEN admin / api / catalog-data / coming-soon / repo-tooling S1 @168ba7a"
hard_gates: { tests: pass, coverage: pass（admin 3 檔 < 80% 已講明）, no_blocking: pass, pwa: n/a, security: pass, performance: n/a }
tickets: []
next_action: merge_main
next_agent: main
branch: "claude/charming-heisenberg-8z30x3"
context: "schedule unlisting api 0.7.0 S1 pass @168ba7a; W-715 verified (unit + e2e:admin + screenshot); local npm test 3757 pass, api 219 pass, e2e:admin 34/0; CI 43194052694 @168ba7a success (unit, build, e2e 780 PASS, e2e:admin 34 PASS, 0 FAIL); report committed locally, not pushed"
```
