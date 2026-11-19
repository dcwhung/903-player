# QA — P10 lane 2 Duo 最近收聽 panel — 2026-11-18 — S1

- Tier: T1（CSS 一段 + lock test + e2e）| Commit: 0e78ddf（code 32011d9 + e2e 收緊）| PR #270 → `release/v2.0.0` | Verdict: ✅ pass
- Ledger（`impact --since $(git merge-base HEAD origin/main)` = e3d6952，含已 merge 嘅 lane 1；今次 diff 0eba817..HEAD）: SKIP 11 / REVERIFY 3（bookmark、coming-soon、ui-foundation）/ UNCOVERED 1（`savedRecentDuo.node.test.ts` → 收入 bookmark）
- `home` SKIP frozen（今次 diff 冇掂 home 鏈嘅檔，唔重驗）；其餘 UNCOVERED（`_mockups_/home-view/*`）屬 lane 1 已記錄嘅 HomeView lane，唔關今次 diff
- coming-soon：只因 `SavedTab.module.css`（佢 scope 有 `SavedTab/`）STALE，同一套證據（`SavedTab/` unit + 32011d9 全套 e2e 包括「即將上架 / 快將下架」）覆蓋；ui-foundation：只因 `e2e/duo.mjs` STALE，證據 = Duo section 全 PASS + e2e:visual

## AC（L1 `_mockups_/iphone-duo/index.html` 闔上・直 notes ~486-487 → bookmark AC-13）

| AC                                                | 證據                                                                                                                                                            | 結果 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Duo 闔上・直 最近收聽跟內容高                     | duo3.log「聽過 2 集，最近收聽跟內容高（104px，清單冇溢出 true）」                                                                                               | ✅   |
| 最高 200px 同 ≤ 40% tab，收藏區高過佢，清單自己捲 | duo3.log「聽過 10 集，最近收聽最高 116.4px（116.42），收藏區高過佢（164.64），清單喺入面捲（true）」；Reviewer 426×612 / 430×690 / 470×590 連 swap 中都係 40.0% | ✅   |
| 普通手機照舊 200px                                | duo3.log「現有手機我的收藏：最近收聽照舊固定 200px（200）」；e2e:visual 180/180 一樣                                                                            | ✅   |
| 冇收藏版照舊佔滿                                  | CSS 用 `.recent:not([data-fill='true'])`；32011d9 全套 e2e bookmark「冇收藏有記錄 = 最近收聽 tab」×3 PASS                                                       | ✅   |

## Runs

| Command                                                                               | Result                                                    | Time |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---- |
| `npm test -- apps/player/src/components/pages/home/SavedTab/`（targeted，今次 QA 跑） | 8 files / 40 passed                                       | 3s   |
| 引用：32011d9 lint + `npm test`                                                       | clean / 4959 passed                                       | —    |
| 引用：32011d9 `npm run e2e`（scratchpad `e2e-lane2.log`）                             | 969 PASS / 0 FAIL                                         | —    |
| 引用：32011d9 `npm run e2e:visual` vs origin/main（`visual-lane2.log`）               | 180/180 全部一樣                                          | —    |
| 引用：0e78ddf Duo section re-run（`duo3.log`，淨改 e2e 檔）+ lint                     | 44 PASS / 0 FAIL，errors []                               | —    |
| CI PR #270：run 44268529242 @32011d9                                                  | lint/unit/build ✅、E2E cancelled（被 0e78ddf push 取消） | —    |
| CI PR #270：run 44271980227 @0e78ddf                                                  | 見 receipt context（QA 交報告時狀態）                     | —    |

## Hard Gates

all pass（Coverage：改動係 CSS，unit coverage n/a，由 lock test + e2e 量度覆蓋；PWA / Security / Performance：n/a）

## Findings

none（冇 🔴 / 🟡；冇新 Observation）

## 建議補測

none — 純樣式，no edge case gap

## Ledger

- `plans/bookmark.md` 加 AC-13 + scope `savedRecentDuo.node.test.ts`、`e2e/duo.mjs`；coming-soon / ui-foundation plan 冇改
- freeze bookmark / coming-soon / ui-foundation S1（成條 chain + stage 檔案清單 + 新檔），前後比對 chain + stage + path 冇少行
