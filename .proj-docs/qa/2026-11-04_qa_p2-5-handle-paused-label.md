# QA — P2 #5 handle 已暫停 label — 2026-11-04 — S1

- Tier: T1（PATCH → 1.22.2，單一模組 HomePlayerHandle + i18n / token）｜Commit: `1b9dc91`（`feature/home-card/handle-paused-label`，base `origin/main` `de1ab51`）｜Verdict: ✅ pass｜`git diff 888bc76 1b9dc91` 只有 mockup + review md → 引用 developer @ `888bc76`：tsc / eslint / prettier clean、full e2e 622 / 0（含「把手見到已暫停」56.9px）
- Ledger（`impact --since de1ab51`）：SKIP 3（catalog-data / pwa-shell / show-today-page）/ REVERIFY 5 / UNCOVERED 5 / IGNORED 1
    - REVERIFY 嘅 S1 stale 檔：`home`（HomePlayerCard.module.css、HomePlayerHandle.tsx、HomePageWide.test.tsx）、`ui-foundation`（zh-HK.ts、tokens.css）、`drama` `mini-player` `player-core`（只係 1-hop 嘅 HomePageWide.test.tsx：label 字串改名 + 1 個新 case）；UNCOVERED：`homePlayerHandle.node.test.ts`（新，屬 home glob → 收入 home）、`e2e/homeWide.mjs`、`package*.json`、`_mockups_/home-handle-paused/index.html`（見 Observation）

## Runs

| Command                                                                                                                                        | Result                                     | Time |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---- |
| `npx vitest run` home plan 指令（27 檔，含新 `homePlayerHandle.node.test.ts`、`HomePageWide.test.tsx`）                                        | 27 files / 312 pass                        | 13s  |
| `npx vitest run` ui-foundation plan 指令（28 檔，含 `src/i18n/` `src/styles/`）                                                                | 28 files / 138 pass                        | 8s   |
| `npm run build` + `vite preview :4199` + Playwright spot-check（e2e harness，webfont 擋咗，sandbox 得 WenQuanYi）script：scratchpad `spot.mjs` | 35 / 35 PASS，冇 page error                | ~60s |
| CI run 41873177517 @ `1b9dc91`：changes / lint, unit & build / E2E（Playwright）                                                               | 3 / 3 success（引用，冇本機重跑 full e2e） | —    |

- Spot-check（1300×800，ui-scale 1.5）AC-1：公子會（深色 show）同芝See菇Bi Family（淺色 drama，`scheme: light`）兩邊：status「已暫停」高 56.9px ≥ 3 × 16.5px、喺碟上面（bottom 324.9 < disc top 336.9）、`aria-hidden`；色 muted（show `#aba79c` vs 名 `rgb(242,227,179)`；drama `#7a5a20` vs 名 `rgb(168,72,0)`）
- AC-2：碟底 → 名第一個字 12.0px = handle gap 12px（`--space-2` 8px × 1.5）；同一把手改返 `text-align:center` 截圖對照，名會跌落去中間（scratchpad `handle-compare.png`）
- AC-3：塞超長名：名 box 143px、內容 440px → `text-overflow: ellipsis` 截咗；status 照 56.9px、名冇出把手（513 < 550）
- AC-4：✕ 後焦點喺把手；Enter → `split`、playbackState 仍 `paused`；accessible name「已暫停：{name}，打開播放器」（show / drama 各 1 個）；AC-5：390×844 直版：mini player 照出，`[data-home-handle]` 0 個、「已暫停」字 0 個

## Hard Gates

all pass（Coverage：新 CSS 由 `homePlayerHandle.node.test.ts` 4 條 + HomePageWide 新 case 鎖住；PWA gate n/a：冇掂 sw / manifest / build config；Security / Performance n/a）

## Findings

冇 🔴 / 🟡。

### Observation

- O-1 Drama 把手名「芝See菇Bi Family」喺 sandbox 直寫時中英字重疊；`text-align:center` 一樣重疊 → 唔係今次改動，係 webfont 擋咗 + WenQuanYi metrics（e2e 環境限定），未有 L1 違反
- O-2 `_mockups_/` 唔屬任何鏈但 `impact` 當 code 報 UNCOVERED；建議喺 `.proj-docs/qa/ledger-ignore` 加 `_mockups_/**`（backlog）；O-3 `e2e/homeWide.mjs`、`package*.json` 同 baseline 一樣唔收入鏈（見 2026-11-04_qa_p1-folder-restructure O-2）；homeWide 改動由 CI E2E @ `1b9dc91` 覆蓋
- O-4 freeze 後 `impact --since de1ab51`：7 SKIP / 1 REVERIFY（`ui-foundation`）——佢嘅 S3 行仲係 zh-HK.ts / tokens.css 舊 hash（S1 行已 FROZEN）；同 p1-folder-restructure O-1 一樣，等下次 release S3 re-freeze 自然清

## Ledger / plans

- `freeze <chain> S1` × 5：`home`（104 → 105 檔 + plan，加 `homePlayerHandle.node.test.ts`）、`ui-foundation`（70）、`drama`（142）、`mini-player`（51）、`player-core`（93），scope = 現有 S1 行 + 新檔
- `plans/*.md` 冇改（home 嘅「85 個 / 26 個 test 檔」數目冇跟新 test 更新：plan 寫明確實清單 = ledger，改 plan 會令 home 嘅 S3 plan 行 stale）；`drama` `mini-player` `player-core`：唯一 stale 檔係 HomePageWide.test.tsx，已喺 home 指令跑過；冇跑佢哋其餘 plan 指令

## 建議補測

- none（低風險樣式 / 文案；developer 已補 node CSS test + HomePageWide case，no edge case gap）

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 3 / REVERIFY 5 / UNCOVERED 5"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_main
next_agent: null
branch: "feature/home-card/handle-paused-label"
context: "P2 #5 handle 已暫停 S1 pass @1b9dc91: vitest home 312 + ui-foundation 138, Playwright 1300x800 35/35 (show+drama, gap 12px, long name, keyboard, portrait), CI 41873177517 green; 5 chains frozen S1; QA files uncommitted"
```
