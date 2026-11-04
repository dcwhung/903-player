# QA — P3 #4 內頁把手（闊橫版）— 2026-11-04 — S1

- Tier: T1（MINOR 1.23.x，新共用 `PlayerHandle` + 內頁把手）｜Commit: `2aa8eb2`（`feature/home-card/inner-page-handle`，base `origin/main` `f9eeaa4`）｜Verdict: ✅ pass
- 引用 developer：tsc / eslint / prettier clean；vitest 1130 @ `402125b`，W-525 後 related 290；full e2e exit 0 @ `402125b`。`402125b..2aa8eb2` app code 只改 `3c990b7`（今日頁 identity）→ 引用同一 SHA 嘅 CI + 一個針對 W-525 / e2e 未覆蓋路徑嘅 spot-check，冇本機重跑 vitest / full e2e
- Ledger（`impact --since f9eeaa4`）：SKIP 1（pwa-shell）/ REVERIFY 7（catalog-data drama home mini-player player-core show-today-page ui-foundation）/ UNCOVERED 18 / IGNORED 1
    - UNCOVERED 收入鏈：`PlayerHandle/*`（3）、`InnerPageHandle.tsx`、`selectors/pageHandle{,.test}.ts`、`hooks/usePageHandle.ts`、`hooks/useFadeOut.ts` → home；`types/playerItem.ts`、`tests/animationEvent.ts` → ui-foundation（glob 已涵蓋）
    - 唔收入：`_mockups_/**`、`e2e/homeWide.mjs`、`package*.json`、`vite.config.ts`（見 O-2）

## Runs

| Command                                                                                                                | Result                                                                                                     | Time |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---- |
| CI run 41889317426 @ `2aa8eb2`：changes / lint, unit & build / E2E（Playwright）                                       | 3 / 3 success；unit 173 檔 / 2150 pass；e2e 628 PASS「All E2E checks passed」（含「闊橫版內頁把手」6 / 6） | ~11m |
| `npm run build` + `vite preview :4199` + Playwright spot-check（e2e harness，`PW_CHROMIUM_PATH`）scratchpad `spot.mjs` | 14 / 14 PASS，冇 pageerror / console error（harness 刻意 404 嘅 resource 除外）                            | 25s  |

- AC-1（W-525）：星期日 2026-10-18 1300×800 `#/today` 列備用日 17/10、自動播公子會 17/10 → `[data-page-handle]` 0 個；show / drama 自己嘅嘢由 CI「闊橫版內頁把手」覆蓋
- AC-2：平日播公子會 17/10 → `#/today`（列 19/10）出「播放中：公子會，返回主頁」，字「播放中 / 公子會」；內容右 1255 ≤ 把手左 1261（main padding-right 45px）
- AC-3：主頁卡暫停再入今日頁 →「已暫停：公子會，返回主頁」；✕ 閂卡後入 `#/drama/chisee` →「已暫停」，撳把手返主頁 `fillWithHandle`、主頁把手 1 個、卡 0 張
- AC-4：`reducedMotion: 'reduce'` 喺 badgirl 節目頁撳播放 → 把手 167ms 內拆走、padding-right 0（CI 有 non-reduced 版本）
- AC-5：撳把手返主頁 `split` + 公子會卡；成個流程冇 view-transition abort / console error（`viewTransitionNames.node.test.ts` 鎖名，CI unit 綠）；AC-6：390×844 同 844×390 今日頁冇內頁把手；主頁把手由 CI homeWide 3 個舊 section 覆蓋

## Hard Gates

all pass（Coverage：新邏輯 `pageHandle.test.ts`（含 W-525 兩條）、`playerHandle.node.test.ts`、ShowPage / TodayPage / DramaPage case；PWA gate n/a：`vite.config.ts` 只改 vitest `setupFiles`，build 輸出 / sw / manifest 冇掂；Security / Performance n/a）

## Findings

冇 🔴 / 🟡。W-525 verified：L2 spot-check A 星期日今日頁 0 個把手 + CI `TodayPage.test.tsx`「fallback day … (W-525)」綠。

### Observation

- O-1 Sandbox 冇 Noto，WenQuanYi 直寫 CJK 壓扁（環境限定，見 brief；同 P2 #5 O-1）
- O-2 `_mockups_/**`、`e2e/homeWide.mjs`、`package*.json`、`vite.config.ts` 照舊唔收入鏈（P2 #5 O-2 / O-3）；`ledger-ignore` 加 `_mockups_/**` 仍喺 backlog
- O-3 freeze 後 `impact --since f9eeaa4` 仲有 6 REVERIFY：全部係 S3 行（舊 folder restructure / plan hash），S1 行已 FROZEN；等下次 release S3 re-freeze。刪咗嘅 `homePlayerHandle.node.test.ts` 顯示 UNCOVERED（已唔存在，home S1 行已除）

## Ledger / plans

- `freeze <chain> S1` × 7 @ `2aa8eb2`：catalog-data 98、drama 143、home 113（106 − 刪咗 1 + 新 8）、mini-player 52、player-core 94、show-today-page 95、ui-foundation 73（71 + 2）
- `plans/home.md`：加 AC-4、Core glob 加 5 組新 path、vitest 指令加 `PlayerHandle/` 同 `pageHandle.test.ts`、e2e 註明 '闊橫版內頁把手'（scope 擴大屬 impact UNCOVERED，§3 (a)）；其他 plan 冇改

## 建議補測

- none（W-525 已補 selector + TodayPage case；spot-check 嘅 today 頁 / 已暫停 / reduced-motion 路徑如要長期鎖，可考慮加入 e2e「闊橫版內頁把手」— backlog，非 gap）

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 1 / REVERIFY 7 / UNCOVERED 18"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: merge_main
next_agent: null
branch: "feature/home-card/inner-page-handle"
context: "P3 #4 inner-page handle S1 pass @2aa8eb2: CI 41889317426 green (unit 2150, e2e 628 incl 闊橫版內頁把手); Playwright 1300x800 spot-check 14/14 (W-525 Sunday today page no handle, today 播放中/已暫停, ✕ then inner 已暫停 + home handle kept, reduced-motion, portrait/short landscape); 7 chains frozen S1, home plan extended; QA files uncommitted"
```
