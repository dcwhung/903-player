# QA — P10 lane 5b Duo 打開・直內頁 — 2026-11-18 — S1

- Tier: T2 | Commit: `8770311`（code `e8db0d0` + `8770311`，PR #274 → `release/v2.0.0`）| Verdict: ❌ fail（1 🟡）
- Ledger（`impact --since $(git merge-base HEAD origin/main)` = `e3d6952`）：SKIP 6（admin、api、card-zoom、mini-player、pwa-shell、repo-tooling）/ REVERIFY 8 / UNCOVERED 5（`DateColumn/*` 3、`pages/shared/SideRow*` 2）/ IGNORED 19
- 8 條 REVERIFY 鏈嘅 S1 STALE 行（45 行）全部係 `73c4726..8770311` 改嘅檔：show-today-page、drama、player-core（指定）+ bookmark、catalog-data、coming-soon、home、ui-foundation（STALE 只因呢個 diff：`ShowPage.tsx`、`DayCell.tsx`、`DailyDramaPage.tsx`、`ArcPicker/*`、`tokens.css`、`e2e/duo.mjs`、`tests/cssRule.ts`；同一套證據覆蓋）
- 新檔歸屬：`DateColumn/*` → show-today-page + drama；`pages/shared/SideRow*` → show-today-page（`src/pages/shared/*` glob）+ drama（plan 已更新，fail 未 freeze）

## Runs

| Command / 證據                                                                                                                     | Result                           | Time |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---- |
| 引用 developer @`8770311`：lint、`npm test`                                                                                        | 0 error、5013 passed             | —    |
| 引用 developer @`8770311`：`npm run e2e`（log `scratchpad/e2e-lane5b2.log`）                                                       | 1001 PASS / 0 FAIL               | —    |
| 引用 developer @`8770311`：`npm run e2e:visual` vs origin/main（log `scratchpad/visual-lane5b2.log`）                              | 180/180 一樣                     | —    |
| CI run [44329713571](https://github.com/dcwhung/903-player/actions/runs/44329713571) @`8770311`（changes / lint+unit+build / e2e） | success ×3                       | —    |
| `npx vitest run --coverage` DateColumn、SideRow、PlayerPanel、ArcPicker、pages/drama、pages/show、DateStrip（8 + 5 檔）            | 全綠；9 個改動檔 lines 100%      | 28s  |
| scratchpad `qa5b/infoSheetProbe.mjs`（612×876 `#/show/gongzi`，`itemInfo.mjs` 示範 catalog）                                       | 資料 sheet x 0、闊 612、頂 439.8 | 15s  |
| scratchpad `qa5b/sideProbe.mjs` / `curProbe.mjs`（612×876 節目頁 / 系列劇集頁）                                                    | 見 Findings                      | 30s  |

## AC（show-today-page AC-8 / drama AC-16）

- 節目頁 / 每日劇集頁日子直排喺唱片右邊、播放掣底 420 < 摺位 438；系列劇集頁全集 + 短篇直排（欄左 444）；今日節目卡 + 指示點（底 424.3）喺摺位以上；全集表頂 438、左 0 闊 612；資料表闊 612、頂 439.8（e2e `duo.mjs` 打開・直 7 個 PASS + probe）
- 日子欄撳完焦點留喺「轉去 27/11 星期五」、live region 讀「已轉到 27/11 星期五」（probe；unit `DateColumn.test.tsx` 'keep focus…announce'）
- 現有裝置零改變：visual 180/180

## Hard Gates

- Tests / Coverage / Security（n/a）/ Performance（n/a）/ PWA（n/a，冇掂 SW / manifest）：pass
- No blocking finding：❌ QA-1（下面）

## Findings

### 🟡 QA-1 日子直排現正播放嗰格冇咗框 → CUI-0026

- L1: mockup `_mockups_/iphone-duo/new-opr-show.webp`（現正播放 28/11 有框）；`DateColumn.module.css:3`「現正播放加框（同 mockup new-opr-show）」；`.current` 喺 `8770311` 仲加咗 `cursor: default`
- L2: `curProbe.mjs` @dist `8770311`：`button[aria-current="date"]` className `_cell_96xgs_81 _current_96xgs_120 _cell_wxte7_3`、`border 0px none`；截圖 `scratchpad/qa5b/now-badgirl.png`（`e8db0d0` 前嘅 `l5/b-showd.png` 有框）
- L3: W-792 修訂將 `<span>` / `<button>` 合併時 className 漏咗 `styles.current`（`DateColumn.tsx` button `className`），`.current` 變 dead CSS；同時影響節目頁同每日劇集頁

### 🟢 / Observation

- S-QA-2 直排日子 / 短篇欄右邊 604（離畫面 8px，跟播放器欄 inset），清單 / mockup 右邊 588；mockup 寫明「間距正式版再調」，唔違反 AC（backlog，main agent 決定）

## 建議補測

- `DateColumn.test.tsx`：現正播放格有 `current` class（non-scoped）— 鎖住 QA-1（CUI-0026 一齊做）

## Freeze

- S1 freeze @`8770311`：bookmark、catalog-data、coming-soon、home、player-core、ui-foundation（ledger 原有 chain + stage 全部 path，freeze 前後 chain + stage + path 一樣：2624 行）
- 未 freeze：show-today-page、drama（QA-1）；plan 加 AC-8 / AC-16 + `DateColumn` / `SideRow` scope。CUI-0026 修好後只重驗呢兩條（`DateColumn` unit + `duo.mjs` 打開・直 + visual）

---

# Re-verify — CUI-0026 + S-QA-2 — 2026-11-18 — S1

- Tier: T1 | Commit: `7e11982`（HEAD `93ed781` = reviewer 淨 docs commit，code 一樣）| Verdict: ✅ pass
- Ledger（`impact --since $(git merge-base HEAD origin/main)`）：SKIP 9 / REVERIFY 5（show-today-page、drama + bookmark、home、ui-foundation：後三條 S1 STALE 只係 `e2e/duo.mjs`）/ UNCOVERED 5（`DateColumn/*`、`pages/shared/SideRow*`，歸入 show-today-page + drama）/ IGNORED 21
- Freeze 後 S1 全部 FROZEN；`impact` 仲列 drama / home / show-today-page / ui-foundation REVERIFY 只因 S3 行（release 前已 STALE，屬 S3，唔喺今次範圍）

## Runs

| Command / 證據                                                                                    | Result                                         | Time |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---- |
| 引用 developer @`7e11982`：lint、`npm test`（scratchpad `lint-lane5b3.log` / `unit-lane5b3.log`） | 0 error、5014 passed                           | —    |
| 引用 developer @`7e11982`：`npm run e2e`（`e2e-lane5b3.log`）                                     | All passed；新斷言 588 ≤ 588 ×2、border 1px    | —    |
| 引用 developer @`7e11982`：`npm run e2e:visual` vs origin/main（`visual-lane5b3.log`）            | 180/180 一樣                                   | —    |
| CI run [44340502692](https://github.com/dcwhung/903-player/actions/runs/44340502692) @`7e11982`   | changes ✅；lint+unit+build 報告時 in_progress | —    |
| `npx vitest run --project @903-player/player` DateColumn、SideRow、PlayerPanel、ArcPicker         | 8 檔 70/70                                     | 6s   |
| scratchpad `qa5c/reProbe.mjs` / `dailyProbe.mjs`（612×876，dist @ e2e build）                     | 見下                                           | 30s  |

## AC（show-today-page AC-8 / drama AC-16）

- CUI-0026：現正播放格 className 有 DateColumn `_currentDay_`、`border 1px solid` — 節目頁 `#/show/badgirl` 同每日劇集頁 `#/drama/c18`（runtime catalog，同 `duo.mjs`）；unit「should frame the playing day only」鎖住（只現正播放格有 `currentDay`）
- S-QA-2：日子欄 / 短篇欄右邊 588（節目頁、每日劇集頁、系列劇集頁 `#/drama/chisee`），同清單一樣；每日劇集日子欄底 420 < 摺位 438；唱片中心 246 / 218（兩邊對稱 padding，置中冇變）；現有裝置零改變（visual 180/180）
- 改動行（`DateColumn.tsx` className 三元式）兩個 branch 由新 unit 覆蓋；CSS 改動由 e2e + probe 覆蓋

## Hard Gates

all pass（CI E2E 未完，main agent push 前睇 run 44340502692）

## Findings

- 無新 finding；QA-1 → CUI-0026 completed；S-QA-2 resolved（`7e11982`）

## 建議補測

- none（`DateColumn.test.tsx` 已加，`duo.mjs` 已加 border / 右邊斷言）

## Freeze

- S1 freeze（report 同上）：show-today-page 175 → 180、drama 213 → 218（各加 `DateColumn/*` 3 + `SideRow*` 2）；bookmark 56、home 176、ui-foundation 130（前後一樣）
- chain + stage + path 比對：ledger 2624 → 2634 行，`diff` 只多咗上面 10 行，冇少行
