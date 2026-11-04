# Batch Review — 2026-11-04 — UI batch (handle polish + elastic tabs)

- 審閱者：Code Reviewer（獨立）
- 目標：`fix/home-card/handle-polish` @ 6c8b3a6 vs `origin/main` @ 2c17bfc（v1.24.1 → 1.25.0）
- Tier：T2（UI 動畫 / a11y / view transition），item 3、5 屬 T0
- 總評：5 個 item 全部冇三層收斂嘅 🔴 / 🟡；只有 4 條 🟢 入 backlog

## 整體 verdict

- 涵蓋 commit：6a38b3e 4142baa 47c1f01 63e4e53 d4e764d 468b609 c49e371 0884628 080a9fa 5078d0c 5e611f0 f3edbde 399cb2c 6c8b3a6
- Hard gates：all pass
    - Lint：`npx eslint .` exit 0；Prettier（改咗嘅 src / e2e / tests）全部合規
    - Type：`npx tsc --noEmit` exit 0
    - Tests（只跑相關嘅，Hard Rule 7）：HomeTabs、shared/player、useFadeOut、HomePageWideMotion、useCardMotion、ShowPage、viewTransitionNames、cssTime，10 個檔 101 個 test 全部 pass；pages/home + pages/show 加埋都綠
    - Coverage：useFadeOut / useHeldWhile / useCardMotion / useLeaveFallback / HomeTabs / useTabDirection / cssTime / usePageHandle 嘅 line coverage 100%，branch 98.8%（PlayerHandle.tsx L41 嘅 `focusOnMount ??` 分支冇行到）
    - No Critical：0；Security scan：n/a（冇新增依賴）
    - 引用（唔重跑）：item 1 full npm test 2188 + e2e 631；lane 2 full vitest 2207；P5 full 2199 + e2e 630；merge 之後 tsc clean + 902 targeted pass；main agent visual check
- 整體 score：97/100
- Status：pass

## Section A — Item 1：卡隨播放打開時把手淡走（6a38b3e、4142baa）

- 改動：`useHeldWhile` 新 hook；`useCardMotion` 多回傳 `holding = deferred`；HomeWide 用 `useHeldWhile(useClosedHomePlayerCard(), holding)`
- RCA 驗證：`useReopenHomePlayerCardOnPlay` 喺同一次 render 清咗 closed store，而 `deferred` 都喺同一次 render 變 true。`held` 喺上一次冇 hold 嘅 render 已經記低 `true`，所以舊 snapshot 照有把手；`apply()` 之後 `deferred=false`，即刻跟返 `false`。邏輯啱
- 減少動態：`withViewTransition` 回 false → 即刻 `apply()`，`holding` 只維持一次 render，唔會卡住
- 同 S-664 嘅互動：S-664 只改 `[data-page-handle]`（`back`），item 1 係 `[data-home-handle]`（`open`），selector 冇重疊
- 測試：HomePageWideMotion 新 case 驗 `['close','open']`、舊版面 / 新版面、把手先在後冇；e2e `checkResumeFromHandle`
- Version：1.24.2 patch 啱
- 評分：100/100 — pass

## Section B — Item 2：S-664 ~ S-668 跟進（47c1f01 63e4e53 d4e764d 468b609 c49e371）

- S-664：三條 `back` 規則都加咗 `:not([data-leaving])`；淡出緊嘅把手冇名，`main[data-player-page]` 保留 `player-panel`，同一刻只有一個 `player-panel`，冇重複名（viewTransitionNames node test 已更新）
- S-665：`usePageHandle` 回 `{ view, wide }`，`useFadeOut(..., { fade: wide })`；淡出途中轉直亦會即刻 `cleared()`（有 rotate stub test）
- S-666：`useLeaveFallback` 用 `animationcancel`（只認 target === 把手）加 `cssMs(--duration-page-handle-fade)` 後備 timer；`onLeft` 用 `useCallback` 固定，effect 唔會重掛
- S-668：`nextState` 喺 `last → null` 嗰刻先叫 `prefersReducedMotion()`，`fading` 一旦定咗就唔再改，符合 CLAUDE.md §Motion
- S-666 timer 同 S-668 決定嘅互動：開始離開時 reduce → 即刻拆，冇 timer；淡出途中先轉 reduce → CSS `animation: none` → `animationcancel` → 拆；兩樣都冇咁就 240ms timer。`onLeft` 叫幾多次都只係設返同一個 state，叫多次都冇問題。淡出途中值返嚟：`nextState` 回 `{last:value,fading:false}`；就算過期嘅 cancel listener 喺 effect cleanup 前觸發，`shown = value ?? …` 都照顯示，冇害
- S-667：`inert={leaving}`（React 19 支援 boolean）+ `aria-hidden` + `onClick` 雙重擋
- 未解決（brief 已提出）：把手有 focus 時 inert 令 focus 跌去 body。冇 L1（brief / AC / Hard Rule 都冇要求），亦都唔係 regression：改之前 240ms 後 unmount 都一樣會跌去 body。要觸發，鍵盤用戶要 focus 住把手，同時用其他方法令呢頁自己嘅嘢開始播（例如 media key）→ 評 🟢 S-675
- 評分：98/100 — pass

## Section C — Item 3：S-661 design/previews 圖片路徑（0884628）

- T0：只改 docs。抽查 13 個新路徑，12 個存在；餘下 1 個係 `${slug}` template，arcs/* 底下嘅 slug 都存在。剩低嘅 `src/assets/banner.webp` 都存在
- 評分：n/a（T0 light review）— pass

## Section D — Item 4：P5 #1 elastic home tabs E2（080a9fa、5078d0c、5e611f0）

- Design Origin：`mockup: _mockups_/elastic-tabs/index.html`（用戶喺 published preview 揀 E2）。實作嘅結構同 mockup 一致：前邊即刻郁、後邊遲 `move × trail-ratio`、label 色用一半時間轉，只喺 `no-preference` 底下先有 transition
- Tokens：`--home-tab-far / -trail-ratio / -trail-delay / -label-fade` 全部由 `--view-transition-move`、`--ease-view-transition` 推出，冇 magic number；pill 用 `--color-accent`、`--radius-full`
- 減少動態：3 個 `transition:` 全部喺 `@media (prefers-reduced-motion: no-preference)` 入面（有 node test 鎖住）→ 直接切換
- 同 view transition 嘅互動：換 tab（`setTab`）唔開 view transition；`home-tabs` 名喺 `.gridColumn > :first-child`，唔喺 pill，冇新嘅 view-transition-name。第一次 mount（包括返主頁、轉直 / 橫）冇 `data-direction` → 唔會滑入
- `useTabDirection`：render 期間 setState，`data-tab` 同 `data-direction` 喺同一次 style 更新入面一齊變，transition 用新值，正確
- a11y：pill `aria-hidden`、`pointer-events: none`；掣保留 `aria-pressed`
- Size：HomeTabs.tsx 49 行，component 函數 ≤ 30 行
- 評分：96/100 — pass

## Section E — Item 5：Chores（f3edbde、399cb2c、6c8b3a6）

- CLAUDE.md §Motion 同 app 現有做法一致；`.claude/worktrees/` 已加入 ignore；1.25.0 MINOR 啱（新 feature），package-lock 同步咗
- 評分：n/a（T0）— pass

## 🟢 Suggestion / Observation（backlog，唔扣分）

- S-675 `PlayerHandle.tsx` inert：淡出緊嘅把手有 focus 時，focus 跌去 body；可以考慮喺 leave 開始時將 focus 移去頁面 `main` / h1
- S-676 `cssTime.ts`：token 如果將來改用 `calc()` / `var()`，`cssMs` 會回 0，把手即刻拆走（唔會卡住，但會冇咗淡出）；建議加個 node test 鎖住 `--duration-page-handle-fade` 要係字面時長
- S-677 `useLeaveFallback.ts`：後備 timer 嘅時長同動畫一樣，同 `animationend` 差唔多同時到；冇害，但可以加一 frame 緩衝，免得舊機慢時剪咗最後一 frame
- S-678 `homeTabs.node.test.ts`：直接 string match CSS declaration，Prettier 一換行就會斷；行為已經有 e2e + visual check 覆蓋，可以接受

## ✅ 做得好嘅地方

- `useFadeOut` 改用 state machine（`nextState` 純函數），S-665 / S-668 兩條規則都寫喺同一個地方，容易 reason
- 由 `:root` token 讀 timer 時長，唔重複寫毫秒數；`animationcancel` 只認把手自己嘅事件
- Elastic tabs 所有時間都由 `--view-transition-move` 推出，同 CLAUDE.md §Motion 一致

## Handoff receipt

見 SubagentHandback 回傳嘅 HANDOFF_RECEIPT block（單一 batch receipt）。
