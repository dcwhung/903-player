# QA — P4 #3b 闊橫版播放卡動畫（O1 open + S3 switch）— 2026-11-04 — S1

- Tier: T1（PATCH 1.24.1，home 單一模組 + view transition util / CSS）｜Commit: `164e9e5`（`feature/motion/player-card`，base `origin/main` `99ed676`）｜Verdict: ✅ pass
- 引用 developer：tsc / eslint / prettier clean；vitest home / utils / styles 580 @ `28d7c06`，W-526 後 194（含 `useCardMotion.test.ts` 4）；full e2e 630 @ `28d7c06`。冇本機重跑 vitest / full e2e：引用同一 SHA 嘅 CI + 針對 e2e 未覆蓋路徑嘅 spot-check
- Ledger（`impact --since 99ed676`）：SKIP 1（catalog-data）/ REVERIFY 7（drama home mini-player player-core pwa-shell show-today-page ui-foundation）/ UNCOVERED 14 / IGNORED 1
    - 其他 6 條鏈 REVERIFY 只因 1-hop `HomeWide.tsx` / `HomePageWide.test.tsx`；ui-foundation 因 `global.css` `tokens.css` `viewTransition*` `*.node.test.ts`
    - UNCOVERED 收入鏈：`cardMotion{,.test}.ts`、`useCardMotion{,.test}.ts`、`HomeWideCard.tsx`、`HomePageWideMotion.test.tsx` → home；`playerCardMotion.node.test.ts` → ui-foundation。唔收入：`_mockups_/**`、`e2e/homeWide.mjs`、`package*.json`（同 P3 #4 O-2）

## Runs

| Command                                                                                                                                                                                | Result                                                                                                                              | Time |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---- |
| CI run 41901458217 @ `164e9e5`：changes / lint, unit & build / E2E（Playwright）                                                                                                       | 3 / 3 success；unit 177 檔 / 2184 pass；e2e 630 PASS「All E2E checks passed」（含「闊橫版主頁播放卡動畫」open + switch `ran:true`） | ~11m |
| `npm run build` + `vite preview :4199` + Playwright spot-check（e2e harness，`/opt/pw-browsers/chromium`，包住 `startViewTransition` 記 kind / ready / finished）scratchpad `spot.mjs` | 14 / 14 PASS，冇 pageerror / console error / 重複 view-transition-name                                                              | 30s  |

- AC-1（1300×800）：星期日 fill → 書架 ▶ 繼續收聽 → 一個 `open`（ready + finished），節目格 1300 → 832px，中途 pseudo 有 `player-panel` new + `home-tile-*` / `home-tabs` group；✕ → `close`；把手 → `fillWithHandle → split` 只一個 `open`（冇雙重過場）
- AC-2：卡喺度再 ▶ 另一套劇 → 一個 `switch`（ready + finished），落喺「少爺占系列」；舊內容前半段由 `HomePageWideMotion.test.tsx`「keeping the old content…」+ main agent 嘅 mid-flip frame 覆蓋
- AC-3：卡內撳指示點 ×2 + 拖掃今日節目、揀另一集（21 集掣）→ 0 個新過場；AC-4：卡頁頭 → `#/show/badgirl` `expand`；內頁把手 → 主頁 `back`，冇額外 open / switch，返到 `split`
- AC-5：`reducedMotion: 'reduce'` open + 換劇 300ms 內完成，`startViewTransition` 0 次、`html[data-view-transition]` 冇
- AC-6：844×390 同 390×844 主頁 stack（HomeStack）+ 底部 mini player、冇卡冇把手；▶ 繼續收聽後同 `#/today` 都冇把手；0 個 open / switch
- W-526 verified：`useCardMotion.test.ts`（A→B→C flush 前保持 frozen、一次 `startViewTransition`、落 C；open 後即 switch；foreign pending fallback；update 後再郁照動畫）喺 CI unit 綠；code 讀過 `waiting` ref 清除路徑（apply 入面）同 review 方案 A 一致

## Hard Gates

all pass（Coverage：review 量 `useCardMotion.ts` 94% → W-526 test 補 foreign-pending 分支；`cardMotion.ts` 100%；PWA gate n/a：冇掂 sw / manifest / build config；Security / Performance n/a）

## Findings

冇 🔴 / 🟡。

### Observation

- O-1 AC-1「資料載入後首次出卡」：harness 預先 seed probe store，主頁 mount 時已經係 `split`（冇「冇卡」狀態，0 個過場，屬正確）；試過延遲 audio host / 拎走今日錄音都造唔到「mount 後先出卡」嘅路徑，未有 L2。同一 render 期 `cardMotion(fill→split)` 路徑已由 AC-1 書架 / 把手兩個 trigger 驗過
- O-2 `_mockups_/**`、`e2e/homeWide.mjs`、`package*.json` 照舊唔收入鏈；`ledger-ignore` 加 `_mockups_/**` 仍喺 backlog；O-3 freeze 後 impact 仲有 home / ui-foundation REVERIFY：全部係 S3 行（舊 folder restructure + 今次改動），S1 行已 FROZEN，等下次 release S3 re-freeze

## Ledger / plans

- `freeze <chain> S1` × 7 @ `164e9e5`：drama 142、home 118（112 + 6）、mini-player 51、player-core 93、pwa-shell 29、show-today-page 94、ui-foundation 73（72 + 1）
- `plans/home.md`：加 AC-5、Core glob 加 `cardMotion*` `useCardMotion*`、vitest 加 3 個 test 檔、e2e 註明「闊橫版主頁播放卡動畫」；`plans/ui-foundation.md` 只改 scope 數；其他 plan 冇改

## 建議補測

- none（AC-3 / AC-5 / AC-6 有 unit 覆蓋；spot-check 嘅把手 open 只一次、卡內換集、expand / back 冇額外過場如要長期鎖，可加入 e2e「闊橫版主頁播放卡動畫」— backlog，非 gap）

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 1 / REVERIFY 7 / UNCOVERED 14"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: merge_main
next_agent: null
branch: "feature/motion/player-card"
context: "P4 #3b player card motion S1 pass @164e9e5: CI 41901458217 green (unit 2184, e2e 630 incl 闊橫版主頁播放卡動畫 open+switch ran); Playwright 1300x800 spot-check 14/14 (shelf open, handle single open, switch, no flip on dots/swipe/episode, expand/back unchanged, reduced-motion instant, 844x390 + 390x844 stack + mini player, no handle); W-526 verified via useCardMotion.test.ts; 7 chains frozen S1, home plan AC-5; QA files uncommitted"
```
