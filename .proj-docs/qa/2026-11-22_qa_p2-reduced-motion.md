# QA — p2-reduced-motion（Lane J，player 2.2.2）— 2026-11-22 — S1

- Tier: T1 | Commit: `ee018fa8`（base `204cbfde`）| Verdict: ✅ pass
- Ledger: SKIP 11 / REVERIFY 4（`ui-foundation` `mini-player` `coming-soon` `repo-tooling`）/ UNCOVERED 1（`apps/player/src/styles/viewTransitionReducedMotion.node.test.ts` → 屬 `ui-foundation` plan 嘅 `src/styles/*` glob，plan 唔使改）/ IGNORED 1
- `coming-soon` / `repo-tooling` 只係 `apps/player/package.json` + `package-lock.json` version bump（2.2.1 → 2.2.2）
- Review：`.proj-docs/reviews/2026-11-22_review_p2-reduced-motion.md`（3 輪 pass，S-1447..S-1451 已關）
- 未 push，冇 CI run 可引用 → 全部喺 `ee018fa8` 本機重跑

## Runs

| Command                                                                                                   | Result                                    | Time   |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------ |
| `npm run lint`                                                                                            | exit 0（prettier 全過）                   | —      |
| `npx tsc -b`                                                                                              | exit 0                                    | —      |
| `npm test`（repo-tooling 要 full unit；涵蓋其餘三條鏈 plan 嘅 test 檔）                                   | exit 0，533 files / 5673 tests            | 227 s  |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium E2E_PORT=4393 npm run e2e`                                    | exit 0，1184 PASS / 0 FAIL，版本 `v2.2.2` | —      |
| `PW_CHROMIUM_PATH=… E2E_PORT=4393 npm run e2e:visual`（base `204cbfd` ↔ working tree `ee018fa8`）         | exit 0，234/234 一樣                      | —      |
| Playwright 長按（scratchpad `pressCheck.mjs`，e2e build + `vite preview` 4393，390×844、DPR 1，下面詳列） | exit 0，7/7 PASS                          | <1 min |

## 真 browser 驗收（主頁 mini player 長按，`.player[data-pressing='true']`）

| `reducedMotion` | 靜止 transition                     | 撳住期間 transition-property / duration | 撳住期間 transform                                          |
| --------------- | ----------------------------------- | --------------------------------------- | ----------------------------------------------------------- |
| `reduce`        | `none` / `0s`                       | `none` / `0s`（37 個 sample 全部一樣）  | 第一個 sample 已經 `scale(0.97)`，闊度一直 355.02（即刻縮） |
| `no-preference` | `transform, box-shadow` / `0.2s ×2` | `transform` / `0.25s`（原本嘅過場）     | 由 1 → 0.970234，闊度 366 → 355.11 有 15 個中間值（動畫）   |

- 兩邊都顯示 `v2.2.2`、0 個 pageerror
- View transition fallback（`::view-transition-old/new(*):only-child`）：app 喺 reduce 時 JS 唔開 view transition（`src/utils/viewTransition`），喺 app 入面觸發唔到 → 靠 `src/styles/viewTransitionReducedMotion.node.test.ts` + `cssRule.node.test.ts`（`motionLeftOnWhenReduced`）鎖住，喺上面 `npm test` 綠

## Hard Gates

all pass（PWA gate n/a：冇改 `sw.js` / manifest / 更新邏輯；Coverage：改動只係 CSS 同 test helper，helper 由 `cssRule.node.test.ts` 直接測）

## Findings

none（冇 🔴 / 🟡；冇 Observation）

## 建議補測

- none（no edge case gap：改動係 CSS selector，unit test 已逐條 selector 鎖 reduce 熄動畫）

## Ledger freeze（S1，`ee018fa8`）

| Chain           | 之前 | 之後 | 備註                                          |
| --------------- | ---- | ---- | --------------------------------------------- |
| `ui-foundation` | 130  | 131  | 加 `viewTransitionReducedMotion.node.test.ts` |
| `mini-player`   | 113  | 113  |                                               |
| `coming-soon`   | 163  | 163  |                                               |
| `repo-tooling`  | 51   | 51   |                                               |

- 四條鏈 `status` S1 = FROZEN @`ee018fa8`；chain + stage + path 同 base ledger 比冇少行，只多 1 行（上表）
- `impact` 仍列呢四條 REVERIFY：係 S3 行 STALE（今次改動 + `ui-foundation` S3 嘅 `apps/player/tests/fakeAudio.ts` 早已 STALE），屬 release S3，唔係 S1 範圍
