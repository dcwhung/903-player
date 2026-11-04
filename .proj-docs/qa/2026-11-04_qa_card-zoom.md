# QA — P6 #2 主頁格仔 Z3 card zoom — 2026-11-04 — S1

- Tier: T2（MINOR 1.26.0，home + view transition util / CSS，跨模組）｜Commit: `2570e85`（`feature/motion/card-zoom`，base `origin/main` `ce10808`）｜Verdict: ❌ fail（2 個 🟡，冇產品 bug）
- Ledger（`impact --since ce10808`）：SKIP 1（pwa-shell）/ REVERIFY 7（catalog-data drama home mini-player player-core show-today-page ui-foundation）/ UNCOVERED 18 / IGNORED 1；REVERIFY 嘅 S1 行只因今次改動（1-hop `HomePage.tsx` `ShowTile.tsx` `DramaTile.tsx` 等 + `global.css` `viewTransition*`）；UNCOVERED 收入新鏈 `card-zoom`；`_mockups_/**`、`e2e/*.mjs`、`package*.json` 照舊唔收入
- CI：`8089b9c` / `4a83fd6` 喺 lint 紅（unit / e2e 冇跑）；`2570e85` docs-only push，lint / unit / e2e skipped → 冇可引用嘅綠 CI，全部本機跑

## Runs

| Command                                                                                                 | Result                                                    | Time |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---- |
| `npx vitest run` 7 條 REVERIFY 鏈 plan 列嘅 test + card-zoom 6 個新 test 檔（96 個 path）               | 171 檔 / 2068 pass                                        | 75s  |
| `E2E_PORT=4174 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（build + 全部 section，冇重跑）  | 634 check：633 PASS / 1 FAIL（「返回主頁」），冇 JS error | 478s |
| `npx eslint .` / `npx tsc -b --noEmit`                                                                  | exit 0 / exit 0                                           | 40s  |
| `npx prettier --check _mockups_/card-zoom/index.html .proj-docs/reviews/2026-11-04_review_card-zoom.md` | exit 1（2 檔 warn）                                       | 3s   |

- e2e `cardZoom`：直版 zoom / unzoom、闊橫版 1180×820 zoom（唔係 expand）各 1 個過場 `ran:true` 兼清走標記（AC-1/2/3）；其他 section（open / switch / back / expand、mini player、drama、touch、PWA）全 PASS；AC-2 冇來源 / 格仔出界、AC-4 繼續收聽 / reduced-motion、AC-5 同步開播：由 `HomePageZoom.test.tsx` `useGoHome.test.tsx` `cardZoom.test.ts` `ShowPage.test.tsx` 覆蓋（綠）；repro reduce 即刻轉頁

## Hard Gates

- Tests ❌（C-1）、Lint ❌（C-2）；其餘 pass（Coverage 引用 review：`cardZoom.ts` 96.87%，其餘新檔 100%；PWA / Security / Performance n/a）；Observation：KI-001 冇出現

## Findings

### 🟡 C-1 e2e 主流程撳返回即刻斷言 URL，窄版 unzoom 轉頁晚一格 → CUI-0018

- L1: CLAUDE.md QA 設定「E2E（全部）`npm run e2e`」+ S1 Hard Gate Tests 全綠；AC-3「現有唔壞」
- L2: `npm run e2e` → `FAIL  返回主頁`（主流程，緊接「暫停時存低進度」）；scratchpad repro（`vite preview :4175`，390×844 撳格 → 返回 → 即刻讀 URL）正常動態 2/3 仲係 `#/show/gongzi`、1.5s 後 3/3 `#/`；reduce 3/3 即刻 `#/`
- L3: `e2e/run.mjs:1381-1382` click 後即刻 `page.url().endsWith('#/')`；主流程由格仔入頁 → `useGoHome` 行 `unzoomHome`，`navigate('/')` 喺 `startViewTransition` update callback 先行。產品行為正確（1.5s 後 3/3 到主頁、之後 theme-color 等 check 全 PASS），只改 e2e 加 `waitForURL`

### 🟡 C-2 `npm run lint` 紅：新 mockup 同 review 報告未 prettier → CUI-0019

- L1: `package.json` `lint` = `eslint . && prettier --check .`；`.github/workflows/ci.yml`「Lint, unit & build」
- L2: CI 41920936640 @ `8089b9c` / 41920263481 @ `4a83fd6` exit 1；本機 `prettier --check` 同樣 2 檔 warn
- L3: `_mockups_/card-zoom/index.html`、`.proj-docs/reviews/2026-11-04_review_card-zoom.md` 未 format；review 只 check src delta。lint 紅令 CI 從未喺 code SHA 跑過 unit / e2e

## Ledger / plans

- `freeze <chain> S1` @ `2570e85`：catalog-data 98、drama 143（plan 列嘅 unit + e2e 全綠，唔掂 C-1 / C-2 嘅檔）；未 freeze：home、mini-player、player-core、show-today-page、ui-foundation（plan 包「390×844 主流程」）、card-zoom（新 plan；CLAUDE.md chain 清單要加）。修好後只重跑 `npm run lint` + `npm run e2e`（src 冇改就引用本報告 unit），再 freeze 呢 6 條

## 建議補測

- none（AC-2 / AC-4 / AC-5 已有 unit；CUI-0018 修正本身就係 e2e 斷言改等 URL）

```handoff-receipt
protocol: 2
status: fail
score: n/a
stage: S1
ledger: "SKIP 1 / REVERIFY 7 / UNCOVERED 18"
hard_gates:
  lint: fail
  type_check: pass
  tests: fail
  coverage: pass
next_action: invoke_developer
next_agent: frontend-developer
tickets: [CUI-0018, CUI-0019]
branch: "feature/motion/card-zoom"
context: "card zoom S1 fail @2570e85, product OK (unit 2068/2068, e2e 633/634 incl cardZoom). CUI-0018: e2e/run.mjs:1381 checks URL right after back; unzoom navigates in VT callback -> add waitForURL. CUI-0019: prettier on mockup + review md (CI lint red). Frozen S1 catalog-data, drama; new plan card-zoom. Rerun lint + e2e then freeze rest. Uncommitted"
```

---

## S1 重驗 @4dcd1f5（HEAD `f4707f8`）— ✅ pass

- 改動：`4dcd1f5` 只改 `e2e/harness.mjs`（`reachesHash`）、`e2e/run.mjs` 3 處、2 個檔 prettier；`f4707f8` 只改 `.claude/CLAUDE.md`；`git diff 2570e85 HEAD -- src` 空 → unit 引用上面 `2570e85` 嘅 2068 / 2068
- CI：41924171144 @ `4dcd1f5` 畀 `f4707f8` push cancel；41924530294 @ `f4707f8` docs-only skipped → 冇可引用 run，本機跑

| Command                                                                        | Result                                  | Time |
| ------------------------------------------------------------------------------ | --------------------------------------- | ---- |
| `npm run lint`                                                                 | exit 0                                  | 50s  |
| `E2E_PORT=4174 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（一次） | 635 / 635 PASS「All E2E checks passed」 | 479s |

- C-1 → CUI-0018 verified：「轉到節目頁並自動播放」「返回主頁」「返回主頁（續播 10/10 後）」PASS；`cardZoom` 3 個 check PASS
- C-2 → CUI-0019 verified：lint exit 0。兩張 ticket 移去 `.tickets/completed/0001-0200/`
- Hard Gates：all pass；Findings：冇新 🔴 / 🟡
- Ledger：`freeze <chain> S1` @ `f4707f8`：home 128（+ `useGoHome.test.tsx` `HomePageZoom.test.tsx`）、mini-player 52、player-core 94、show-today-page 95、ui-foundation 77（+ `cardZoom.node.test.ts`）、card-zoom 17。之後 `impact` 得 home / ui-foundation REVERIFY，全部係舊 S3 行（S1 已 FROZEN），等 release S3

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 1 / REVERIFY 7 / UNCOVERED 18 (base ce10808); after freeze S1 all FROZEN"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: merge_main
next_agent: null
tickets: [CUI-0018 completed, CUI-0019 completed]
branch: "feature/motion/card-zoom"
context: "card zoom S1 re-verify pass @4dcd1f5 (HEAD f4707f8, src unchanged since 2570e85 -> unit 2068/2068 cited). lint exit 0; e2e 635/635 local (CI 4dcd1f5 cancelled, f4707f8 docs-only skipped). CUI-0018/0019 completed. Frozen S1: home mini-player player-core show-today-page ui-foundation card-zoom (+ catalog-data drama earlier). QA files uncommitted"
```
