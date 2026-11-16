# QA — admin backlog Lane F（admin 0.0.2）— 2026-11-12 — S1

- Tier: T1（PATCH，admin 單一 workspace）| Commit: `1e6414a` | Verdict: ✅ pass
- Ledger（base `713cb85` = merge-base origin/main）: SKIP 11 / REVERIFY 3（`admin` `coming-soon` `repo-tooling`）/ UNCOVERED 1（新 `apps/admin/src/features/dramas/DramaTabs.test.tsx` → admin 鏈，plan scope = `git ls-files apps/admin`）
- `coming-soon` / `repo-tooling`：淨係 `package-lock.json` 嘅 `apps/admin` version `0.0.1 → 0.0.2` 一行（`git diff` 已核），冇依賴 / 行為改動 → 沿用 plan 重新 freeze，冇額外驗
- Plan：沿用 `plans/admin.md`（AC-19 範圍內嘅 Lane A 後續清理，冇新 AC）
- 驗咗嘅 S-ID：S-857、S-858、S-859、S-861、S-880

## Runs

| Command                                                                                | Result                                        | Time |
| -------------------------------------------------------------------------------------- | --------------------------------------------- | ---- |
| `npx vitest run --project @903-player/admin --coverage.enabled --coverage.provider=v8` | 77 files / 369 tests pass                     | 37 s |
| `npm run build -w apps/admin`                                                          | ok                                            | 7 s  |
| `E2E_PORT=4186 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node apps/admin/e2e/run.mjs` | 39 PASS / 0 FAIL（「admin e2e: all passed」） | 53 s |
| 引用 main agent：root `npm run lint` pass；`npm test` 358 files / 3816 tests pass      | 唔重跑（`1e6414a` 淨改 comment）              | —    |

- 跑完 `pgrep -af "vite preview"` 冇殘留；code 未 push，冇 CI run 可引用

## 驗證要點（L2）

- S-857：`paths.test.ts`「should swap the encoded drama ID and keep the tab」「should leave other paths alone」、`DramaTabs.test.tsx`「should encode the drama ID in every tab link」、`DramaList.test.tsx`「should encode the drama ID in the editor path」pass
- S-858 / S-880：`isoDate.test.ts` + `dates` / schedule 現有 unit 全綠；`1e6414a` 淨改 `isoDate.ts` 兩行 comment
- S-859：`DateField.test.tsx`「should measure at most once per frame while scrolling」「should drop a pending measure when the calendar closes」、`dateFieldModel.test.ts`「should keep the current side near the edge …」pass；e2e schedule section（DateField 月曆 / 儲存彈錯 W-715、S-843）全綠
- S-861：`DateField.test.tsx` `afterEach` 還原 `innerHeight` + mocks，成個 project 一齊跑 369/369 冇串 test 污染

## Hard Gates

all pass。Coverage（改動 source，lines）：`paths.ts` / `isoDate.ts` / `dateFieldModel.ts` / `DramaTabs.tsx` / `DramaRow.tsx` 100、`useDramaEditor.ts` 97、`usePopoverPlacement.ts` 91

## Findings

- 冇 🔴 / 🟡；reviewer 🟢 S-881（ResizeObserver，原有行為）已入 backlog，唔重複

## 建議補測

- none（S-857 path 換 ID、S-859 rAF 節流 + 收起取消 + 24px hysteresis 邊界 test 已齊）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: admin S1 (re-frozen, whole chain incl. new DramaTabs.test.tsx); coming-soon S1, repo-tooling S1 (lockfile admin version line only, re-frozen)
tickets: none
ci: none (code not pushed); local admin e2e 39/39 @ 1e6414a
next_action: main agent push code + docs together; cite this report; CI on push to confirm
context: T1, 0 blocking findings; S-857/858/859/861/880 verified; no new IDs
```
