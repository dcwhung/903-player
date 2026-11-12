# QA — admin backlog Lane A（admin 0.0.1）— 2026-11-12 — S1

- Tier: T1（PATCH，admin 單一 workspace）| Commit: `f0d1f23`（`HEAD` `6922948` 淨加 review 報告，`apps/` + lockfile 同 `f0d1f23` 一樣）| Verdict: ✅ pass
- Ledger（base `450e5d4` = merge-base origin/main）: SKIP 11 / REVERIFY 3（`admin` `coming-soon` `repo-tooling`）/ UNCOVERED 7（全部係新 `apps/admin/src/**` 檔：`google-g.svg`、`episodeRangeKey.ts` + test、`isoDate.ts` + test、`paths.test.ts`、`useOutsidePointer.test.ts` → admin 鏈，plan scope = `git ls-files apps/admin`）
- `coming-soon` / `repo-tooling`：淨係 `package-lock.json` 嘅 `apps/admin` version `0.0.0 → 0.0.1` 一行（`git diff` 已核），冇依賴 / 行為改動 → 沿用 plan 重新 freeze，冇額外驗
- Plan：`plans/admin.md` 加 AC-19（Lane A）
- 驗咗嘅 S-ID：S-828、S-829、S-830、S-832、S-833、S-834、S-836、S-837、S-838、S-839、S-840、S-843、S-848

## Runs

| Command                                                                                | Result                                                 | Time  |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----- |
| `npx vitest run --project @903-player/admin --coverage.enabled --coverage.provider=v8` | 362/362 pass                                           | 36 s  |
| `npm run build -w apps/admin`                                                          | ok                                                     | 6 s   |
| `E2E_PORT=4185 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node apps/admin/e2e/run.mjs` | 39 PASS / 0 FAIL（「admin e2e: all passed」）          | 51 s  |
| `E2E_PORT=4190 … node apps/admin/e2e/run.mjs`（S-848）                                 | exit 1，0.46 s，`port 4190 is blocked by Node fetch …` | 0.5 s |
| 引用 main agent：root `npm run lint` pass；`npm test` 357 files / 3803 tests pass      | 唔重跑                                                 | —     |

- 跑完 `pgrep -af "vite preview"` 冇殘留；code 未 push，冇 CI run 可引用

## 驗證要點（L2）

- S-828：`paths.test.ts`「should encode IDs as one path segment / hash」、`todoModel.test.ts`「should encode the drama ID in the path」pass
- S-830：`dates.test.ts`「should add the year to a short date in another year than today」「should take today in Hong Kong time by default」pass
- S-833 / S-832：e2e「login screen when /api/me is 401」新 assert（`<img alt="">` 載入到、20×20）pass；`grep` `Brand.tsx` / `LoginScreen.tsx` / `styles/*.css` 冇 `big` prop、`.brand-banner.big`、inline `<svg>`
- S-838：`DateField.test.tsx` 4 個新 test（Esc、Tab 出去收、Tab 喺入面唔收、resize / scroll 重新定位）pass
- S-839：`useOutsidePointer.test.ts`「should keep one listener across renders …」pass
- S-840：`timelineModel` 3 個 listing-change test + `ScheduleTab.test.tsx`「saved wording … draft wording again after a listing change」pass
- S-843：`useScheduleForm` / `validationMessage` / `episodeRangeKey` test pass；e2e「… naming the range (W-715, S-843)」= `第 1–30 集的下架日期（6/11 五）早於今日` pass
- S-848：見上表 red → green（修之前約 32 s「vite preview did not start」，main agent 證據）；S-834：`apps/admin/e2e/*.mjs` 檔案路徑全部用 `fileURLToPath`，淨低 `.pathname` 係 request URL
- S-829 / S-836 / S-837：純 refactor，`isoDate.test.ts` + 現有 unit / e2e（`boxOf` call site 喺 nav check）全綠

## Hard Gates

all pass。Coverage（改動 source，lines）：全部 ≥ 80%（最低 `ArcSchedule.tsx` 82、`usePopoverPlacement.ts` 89，其餘 97–100）

## Findings

- 冇 🔴 / 🟡；reviewer 🟢 S-852–S-856 已入 backlog，唔重複

## 建議補測

- none（S-843 範圍合併、S-830 跨年、S-840 listingDirty 嘅邊界 test 已齊）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: admin S1 (re-frozen, plan AC-19 added); coming-soon S1, repo-tooling S1 (lockfile admin version line only, re-frozen)
tickets: none
ci: none (code not pushed); local admin e2e 39/39 @ f0d1f23-equivalent tree
next_action: main agent push code + docs together; cite this report; CI on push to confirm
context: T1, 0 blocking findings; S-828/829/830/832/833/834/836/837/838/839/840/843/848 verified
```
