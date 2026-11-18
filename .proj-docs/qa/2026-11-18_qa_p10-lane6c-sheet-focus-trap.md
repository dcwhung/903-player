# QA — P10 lane 6c Sheet focus trap — 2026-11-18 — S1

- Tier: T2 | Commit: `9dde826`（code `c6b5f3a` + `9dde826`，review `e848def` + re-review `cafcdb1`；PR #276 → `release/v2.0.0`）| Verdict: ✅ pass
- Ledger（`impact --since $(git merge-base HEAD origin/main)` = `e3d6952`）：SKIP 6（admin、api、card-zoom、mini-player、pwa-shell、repo-tooling）/ REVERIFY 8 / UNCOVERED 2 / IGNORED 24
- S1 STALE 行全部係 `c6b5f3a^..9dde826` 改嘅檔：drama、show-today-page、coming-soon（`Sheet/useSheetBehaviour*`、`ItemInfoSheet.tsx`、`ArcPicker*`、`pages/drama/*`、`e2e/{arcSheet,itemInfo,square}.mjs`）+ bookmark、catalog-data、player-core（STALE 只因 `useDramaPage.ts` 加一行 `allRef`）；同一套證據覆蓋
- home、ui-foundation 只得 S3 行 STALE（release 前已 STALE，屬 S3，唔喺今次範圍）
- 新檔歸屬：`Sheet/sheetFocusTrap.ts`、`e2e/focusTrap.mjs` → drama + show-today-page（兩條鏈都有 `Sheet/*` glob；`focusTrap.mjs` 由 `arcSheet.mjs` / `square.mjs` import）

## Runs

| Command / 證據                                                                                                                                                         | Result                                                     | Time |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---- |
| 引用 developer @`9dde826`：`npm run lint`、`npm test`（scratchpad `lint-lane6d.log` / `unit-lane6d.log`）                                                              | 0 error；485 檔 5050 passed                                | —    |
| 引用 developer @`9dde826`：`npm run e2e`（`e2e-lane6d.log`）                                                                                                           | 1029 PASS / 0 FAIL；All E2E checks passed                  | —    |
| 引用 developer @`9dde826`：`npm run e2e:visual` vs origin/main（`visual-lane6d.log`）                                                                                  | 180/180 一樣                                               | —    |
| 引用 developer @`c6b5f3a`：lint / unit 5046 / e2e / visual 180（`*-lane6c.log`）；CI run [44369338858](https://github.com/dcwhung/903-player/actions/runs/44369338858) | success                                                    | —    |
| CI run [44375914684](https://github.com/dcwhung/903-player/actions/runs/44375914684) @`9dde826`                                                                        | changes ✅；lint+unit+build 報告時 in_progress；e2e 未開始 | —    |
| `npx vitest run --project @903-player/player --coverage` Sheet、ItemInfo、ArcPicker、`SeriesDramaPageInfo.test.tsx`（include = 6 個改動 src 檔）                       | 9 檔 86/86；lines 99.3%、branch 96%                        | 8s   |
| scratchpad `qa6c/probe.mjs`（dist e2e build，`itemInfo.mjs` 示範 catalog）                                                                                             | 見 AC；0 JS error                                          | ~40s |

- 證據有效：working tree clean；`9dde826..HEAD` 只有 review `.md`

## AC（drama AC-17 / show-today-page AC-10）

- Modal 困 Tab：ArcSheet 390×844 25 粒、27 下 Tab 出表 0 次、兩頭循環、`<body>` Tab 返入表（e2e arcSheet）；ListSheet HomeView 9 粒同上（e2e square）；ItemInfoSheet 直版「節目資料」/「劇集資料」、Duo 打開・直「劇集資料」：`aria-modal=true`、Tab / Shift+Tab / `<body>` Tab 出表 0 次（probe；表入面只得 1 粒 ✕）；同一時間只有 1 張 `aria-modal`
- Docked 唔困：1280×800「節目資料」`aria-modal=false`，Tab 由表行去「返回主頁」；「全集」最尾 Tab 出表（probe）；unit `should not trap Tab when the sheet is docked`
- Escape / 拉閂 / 焦點返原掣不變：e2e 觸控 + 滑鼠拉閂、HomeView ✕ / Escape / 再撳 / 向下拉 / 收藏自動開 Escape 焦點返清單掣全 PASS
- S-1142 焦點返「全集」：直版 + 橫版（e2e itemInfo `BUTTON 全集`）、Duo 打開・直（probe：焦點 `BUTTON 全集`，喺直排 picker）；unit 3 個（直 / 橫 / Duo）
- 零視覺改變：visual 180/180
- 已知未決（main agent 問緊用戶，唔係 finding）：第一次入自動開嘅 ArcSheet Escape 焦點跌去 `<body>`

## Hard Gates

all pass（CI 未完：main agent push / merge 前睇 run 44375914684）

## Findings

### 🟢 / Observation

- Observation：第一次入節目頁自動開嘅「節目資料」Escape 閂後焦點都係 `<body>`（probe 390×844）；同上面已知未決同源（自動開冇 opener），跟用戶決定一齊處理，唔係今次 PR 引入
- Observation：`e2e/focusTrap.mjs` `markEnds` 表入面只得 1 粒時 first / last 標記會互相覆蓋（`checkTabWrap` 會報 FAIL）；現有兩個 caller 都有多粒，冇影響（只係 probe 用喺 ItemInfoSheet 時見到）

## 建議補測

- none（S-1141 other-modal 分支已補 unit；ItemInfoSheet 困 Tab 由共用 hook unit 覆蓋）

## Freeze

- S1 freeze（ledger `verified_commit` = `cafcdb1`：reviewer 淨 docs commit，`apps/` `packages/` 同 `9dde826` 一樣）：drama 218 → 220、show-today-page 193 → 195（+ 上面 2 個新檔）；coming-soon 163、bookmark 56、catalog-data 149、player-core 102（前後一樣）
- chain + stage + path 比對：ledger 2648 → 2652 行，只多咗上面 4 行，冇少行；freeze 後 S1 全部 FROZEN，`impact` 仲列 drama / home / player-core / show-today-page / ui-foundation REVERIFY 只因 S3 行
- Plan 更新：`drama.md` 加 AC-17 + scope + 指令；`show-today-page.md` 加 AC-10 + scope + 指令

```handoff-receipt
from: quality-assurance
to: main-agent
stage: S1
status: pass
next_action: main_agent_commit_push_after_ci
context: "P10 lane 6c @9dde826 (PR #276): modal sheets trap Tab (ArcSheet/ListSheet e2e, ItemInfoSheet probe incl. Duo open portrait); docked not trapped; S-1142 focus returns to 全集 (portrait/landscape e2e, Duo probe+unit); visual 180/180. CI 44375914684 in_progress at report time. Ledger S1 frozen 6 chains, +4 rows, none lost. 2 Observations, no tickets."
```

---

# Re-verify — P10 lane 6c — 2026-11-18 — S1 @`7853b3b`

- Tier: T2 | Commit: `7853b3b`（`9dde826..7853b3b` code 只有 `7853b3b`：自動開嘅表閂咗焦點返入口掣，用戶 2026-11-18 決定）| Verdict: ✅ pass
- Ledger（`impact --since e3d6952`）：S1 STALE 只有 coming-soon、drama、player-core、show-today-page（`7853b3b` 改嘅 16 個檔）；其餘 SKIP；home / ui-foundation 只係 S3 行；UNCOVERED `apps/player/e2e/.rr-probe.tmp.mjs` = reviewer 平行跑緊嘅 untracked probe，唔屬今次 diff

## Runs

| Command / 證據                                                                                                          | Result                                                         | Time |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---- |
| 引用 developer：`npm run lint`、`npm test`（scratchpad `lint-lane6e.log` / `unit-lane6e.log`）                          | 0 error；485 檔 5058 passed                                    | —    |
| 引用 developer：`npm run e2e`（`e2e-lane6e.log`）                                                                       | 1037 PASS / 0 FAIL                                             | —    |
| 引用 developer：`npm run e2e:visual` vs `e3d6952`（`visual-lane6e.log`，crop `scratchpad/l6e/`）                        | exit 1：180 張 18 張唔同（見下，用戶已接受）                   | —    |
| `npx vitest run --coverage`（plan AC-10 / AC-17 unit + PlayerPanel + ShowPageInfo / Series / DailyDramaPageInfo，HEAD） | 16 檔 156/156；改動 10 個 src 檔 lines 99.2%、branch 93.3%     | 10s  |
| CI run [44382319672](https://github.com/dcwhung/903-player/actions/runs/44382319672) @`7853b3b`                         | changes ✅；lint + unit + build 報告時 in_progress；e2e 未開始 | —    |

- 證據時間：developer log 19:15–19:37 跑 working tree（visual log 寫 `769e58c` + 未 commit 改動），`7853b3b` 19:38 commit；HEAD 嘅 unit 由上面 coverage run 再證

## AC（drama AC-17 / show-today-page AC-10 補充）

- 自動開全集表 → 「全集」：e2e 390×844 鍵盤（arcSheet）、手機橫 844×390（itemInfo）`BUTTON 全集`；unit 直 / 橫 docked / Duo 打開・直
- 自動彈「節目資料」→ ⓘ：e2e 直 / 1280×800 docked / Duo 612×876（itemInfo）、HomeView 頁頭 ⓘ（square）；modal 表 1 粒 ✕ Tab 循環 PASS（Observation 2 `markEnds` 修好，`first+last`）
- 每日劇「劇集資料」→ 唱片 ⓘ：只有 unit（`DailyDramaPageInfo.test.tsx`）；唔另做 probe：同節目頁共用 `useItemInfoSheet` → `PlayerPanel` → `InfoButton` ref 同一條路（`DailyDramaPage.tsx:47` spread `gaugeInfo`、`:56` spread `sheet` 連 `returnFocusTo`），瀏覽器行為已由節目頁 e2e 證
- Escape / 拉閂 / Tab 困 / docked 唔困：e2e 原有 check 全 PASS
- 上次 Observation 1（自動開 Escape 跌 `<body>`）：已解決

## 視覺改變（用戶 2026-11-18 接受，唔係 finding）

- `drama-series` 全部 18 個 viewport：320×568、375×667、390×844、430×932、568×320、640×360、667×375、844×390、932×430、1000×561、1000×562、768×1024、820×1180、1024×768、1180×820、1280×800、1440×900、1920×1080
- 每張 488–708 pixel、0 個元素位置唔同；crop（例 `drama-series@390x844-{base,head}-crop.png`）只係「全集」外圍 2px focus ring；其餘 162 張一樣

## Hard Gates

all pass（CI 未完：main agent push / merge 前睇 run 44382319672）

## Findings

- none（上次 2 個 Observation 已解決）

## 建議補測

- none

## Freeze

- S1 re-freeze @`7853b3b`（全條 chain + stage 清單由 ledger 攞）：coming-soon 163、drama 220、player-core 102、show-today-page 195（前後一樣）
- chain + stage + path 比對：ledger 2652 → 2652 行，冇少冇多；freeze 後 S1 全部 FROZEN，`impact` 仲列 REVERIFY 只因 S3 行
- Plan 更新：`drama.md` AC-17、`show-today-page.md` AC-10 加自動開焦點返入口掣 + 指令（ItemInfoSheet probe 改由 e2e 取代）

```handoff-receipt
from: quality-assurance
to: main-agent
stage: S1
status: pass
next_action: main_agent_commit_push_after_ci
context: "P10 lane 6c re-verify @7853b3b (PR #276): auto-opened ArcSheet returns focus to 全集 (e2e 390x844 + 844x390, unit incl. Duo), auto-opened info sheet returns to ⓘ (e2e show portrait/landscape/Duo + HomeView header; daily drama unit only, same code path, no probe needed). Visual 18/180 drama-series = 2px 全集 focus ring, user-accepted. CI 44382319672 in_progress. Ledger S1 re-frozen 4 chains, 2652 rows, none lost. No findings."
```
