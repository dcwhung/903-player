# QA — builtin-maskable — 2026-11-17 — S1

- Tier: T1（player 1.37.3 / admin 0.9.2 PATCH）| Commit: 4b721ef | Verdict: ✅ pass
- Base: `impact --since 71c3d00`（`git merge-base HEAD origin/main`）
- Ledger: SKIP 11 / REVERIFY 3（admin、coming-soon、repo-tooling）/ UNCOVERED 6 → 歸入 repo-tooling AC-9 / IGNORED 1
- Review: `.proj-docs/reviews/2026-11-17_review_builtin-maskable.md`（pass 100；S-1102 / S-1103 已喺 32bd94f / 4b721ef 修，test-only）
- Plans: `.proj-docs/qa/plans/repo-tooling.md` 加 AC-9（`generateIcons.mjs` 由 out of scope 移入 scope）、`.proj-docs/qa/plans/admin.md` 加 AC-34

## Runs

| Command                                                                                | Result                                                                   | Time |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---- |
| `npm test`（full，4b721ef）                                                            | 468 files / 4830 tests pass                                              | 192s |
| `npm test -- apps/player/scripts/generateIcons`                                        | 14/14（centerSquareCrop = admin centerCrop ×6、兩張 maskable 邊位 + 角） | 2s   |
| coverage `pngPixels.ts`（v8）                                                          | 97.9% lines；`iconLayout.mjs` v8 唔 instrument `.mjs`，6 個 case 行晒    | 3s   |
| `git diff --name-only 71c3d00 HEAD -- apps/player/public apps/admin/src/assets design` | 只有兩張 maskable；其他內建 icon byte-for-byte 不變                      | <1s  |
| PNG IHDR                                                                               | player 512×512、admin 192×192（同 manifest / import 尺寸一樣）           | <1s  |
| 目視 `apps/player/public/icon-maskable-512.png`                                        | 滿版，四邊冇底色留空                                                     | —    |
| CI 44026617547 @ 4a31ca4（引用，唔重跑）                                               | Lint, unit & build ✅ / E2E (Playwright) ✅（包括 PWA 換版 section）     | —    |
| CI 44029383333 @ 4b721ef                                                               | Lint, unit & build ✅；E2E 跑緊（4a31ca4 之後淨 test / review doc）      | —    |

## Hard Gates

all pass（PWA gate：n/a，manifest / `sw.js` / 更新邏輯冇改，icon 內容變只令 precache revision 變，換版由 CI e2e 證）

## Scope 備註

- coming-soon / repo-tooling 嘅 `apps/player/package.json` + `package-lock.json`：淨 version（1.37.2 → 1.37.3、admin 0.9.1 → 0.9.2），重新 freeze
- admin：`CHANGELOG.md`、`package.json`、`src/assets/icon/icon-maskable-192.png`；`brandingModel.ts` import 路徑不變

## Findings

none（🔴 / 🟡 0）

### Observation

- 已安裝嘅 Android PWA 要等 Chrome 下次 manifest check 先換新 icon（手動 follow-up，non-blocking）

## 建議補測

- none（純函數已由 S-1103 鎖 admin centerCrop；生成 script 屬開發工具）

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: 4b721ef
chains_frozen: [repo-tooling, admin, coming-soon]
tickets: []
next_action: main_agent_push_after_ci
context: full npm test 4830/4830; CI 44026617547 green incl. e2e; 44029383333 e2e pending at report time
```
