# Code Review — 2026-11-04 — P4 #3b player card motion

- 審閱者：Code Reviewer（獨立）
- 目標：`feature/motion/player-card`（1bf8ccd mockup、e4968d9 feat、28d7c06 bump 1.24.0），base `origin/main` @ 99ed676
- Tier：T2 /feature（前端 UI，Design Origin `mockup: _mockups_/player-card-motion/index.html`，用戶揀咗 O1 open / S3 switch）
- 總評：設計好清楚。`cardMotion` 係純函數，`useCardMotion` 用 render 期間 setState 加 layout effect，喺瀏覽器影舊畫面之前保持舊版面同舊卡，nested 過場用 `isViewTransitionUpdating()` 直接跟住。有一個重入（re-entrancy）漏洞：自己嘅過場未 update 之前張卡再變，fallback 會即刻轉新畫面，舊 snapshot 就影唔到舊卡（W-526）

## Hard Gates

全部 pass：`npx tsc -b --noEmit` 0、`npx eslint src/pages/home src/utils src/styles` 0、改過嘅檔 `prettier --check` 通過、跟 diff 有關嘅 unit 測試 `npx vitest run src/pages/home/HomePageWideMotion.test.tsx src/pages/home/cardMotion.test.ts src/pages/home/HomePageWide.test.tsx src/styles/playerCardMotion.node.test.ts src/styles/viewTransitionNames.node.test.ts src/utils/viewTransition.test.ts` 6 個檔、74 個測試全部通過。Coverage（同一批測試）：`useCardMotion.ts` 94% stmt / 94% branch（第 34 行 `!started` fallback 冇測試行到），`cardMotion.ts` 100%，`HomeWideCard.tsx` 91%，`viewTransition.ts` 100%。E2E 引用 developer 嘅結果（630 PASS，包括新 section），按 Hard Rule 7 冇重跑。冇新增依賴。

## 評分結果

| 維度     | 得分   | 滿分    | 備注  |
| -------- | ------ | ------- | ----- |
| 正確性   | 20     | 25      | W-526 |
| 安全性   | 20     | 20      |       |
| 可維護性 | 20     | 20      |       |
| 測試覆蓋 | 15     | 15      |       |
| 性能     | 10     | 10      |       |
| 代碼風格 | 10     | 10      |       |
| **總分** | **95** | **100** |       |

**結果：✅ pass**（W-526 只改幾行，建議 merge 之前修）

## 🟡 W-526 — 自己嘅過場未 update 之前張卡再變：fallback 即刻轉新畫面，舊 snapshot 冇咗舊卡

- 位置：`src/pages/home/useCardMotion.ts:30-34`（layout effect 入面 `if (!started) setShown(latest.current)`）
- L1：同 mockup S3 / O1 嘅驗收條件同 hook 自己嘅 docstring 矛盾。S3 要求「舊 snapshot 保留舊內容」，O1 要求「張卡只喺新畫面有（`:only-child` slide）」。第 31 行註解寫明「等影舊畫面期間版面 / 節目再變都唔會轉去過時嘅」，即係假設 pending 嗰個 update 會攞 `latest.current`。但係 deps 一變 effect 會再行，`withViewTransition` 因為 `pending` 係**自己**嗰個而 return `false`，跟住就行 fallback 即刻 `setShown`
- L2：臨時 probe（`renderHook(useCardMotion)` + stub `startViewTransition`，跑完已刪）。'split' A → B：`{frozen:true}`，kinds `['switch']`。之後 flush 之前再 → C：`{frozen:false}`。張卡喺瀏覽器影舊畫面之前已經 re-render 做 C，所以舊 snapshot 係 C，反轉前後兩半都係 C。如果係 open（fill → split），咁舊畫面已經有卡，`:only-child` 唔中，slide 入變成預設 cross-fade
- L3：喺真 UI 要兩次 face 變化撞喺同一個 frame 先會出（例如 player 狀態連續兩個 commit）。developer 嘅 e2e 未見到，所以係 robustness 問題，唔係常見路徑
- 方案 A（推薦）：用 ref 記住「自己有個過場等緊」。等緊期間 effect 只更新 `latest.current`，唔再叫 `withViewTransition`；update 行嘅時候先清。改動細，同現有 `latest` 設計一致
- 方案 B：`withViewTransition` 回傳 `'ignored-own' | 'ignored-other' | true`，或者 export `isViewTransitionPending()`。但係 util 分唔到邊個過場係邊個 caller 開，要多加 owner token，API 會變複雜
- 測試：補一個 hook 測試（A→B→C 喺 flush 之前，要保持 `frozen:true`，flush 之後係 C，`startViewTransition` 只叫一次），順手覆蓋第 34 行嘅 foreign-pending fallback（例如先開一個 `expand` 過場，再 switch）

## 🟢 / Observation（入 backlog，唔扣分）

- S-671 `HomeWideCard.tsx` memo：frozen 期間 `SplitCard` 入面 `usePlayer()` / `useRecordings()` 照 re-render，舊卡嘅 gauge / 集數狀態可能早一個 frame 跟新 player（例如舊節目由「播放中」變「繼續收聽」）。probe（未載入嘅 Bad Girl → 少爺占）睇到文字冇變；載入咗嘅舊節目就未驗證。即係 developer 自己講嘅 1-frame 問題，可以接受
- S-672 `useCardMotion.ts:25` render 入面讀 module global `isViewTransitionUpdating()`。因為 `HashRouter useTransitions={false}`、冇 startTransition，而 flushSync 係同步，所以安全。將來要用 concurrent API 就要重新諗；建議喺註解寫低呢個前提
- S-673 `HomeWideCard` comparator frozen 期間連 `onClose` / `focusOnMount` 都沿用舊值。frozen 只得一個 frame，影響極微
- S-674 Developer 偏離項：show → show 唔反轉、✕ 跟卡郁、第一次 render 已經有卡就冇入場、fillWithHandle → split 把手喺 capture 之前消失、drama → show 都反轉。全部符合 O1 / S3 同 cardMotion 測試矩陣，接受。最後兩項建議下次問用戶確認

## View-transition 撞名 / reduced motion / PWA

- open / switch：`[data-home-card]` 用 `none !important`，壓過 inline `viewTransitionName`。名搬去 `[data-theme-scope]:has(> [data-home-card])`，把手只喺 close 先有名，所以新舊畫面各自得一個 `player-panel`（S-633 OK）。由把手開返，舊畫面嘅把手冇名，`:only-child` 中，slide 入
- expand / back 唔受影響，照舊用卡本身個名。nested（把手開返 'open'、內頁 'back'）喺 update 入面 render，`updating=true` 直接跟，測試 kinds `['close','open']` 證實冇第二個過場
- Reduced motion：JS 唔開過場（測試有覆蓋），CSS 規則全部喺 `prefers-reduced-motion: no-preference` 入面
- Tokens：`--card-open-offset` / `--card-flip-half` / `--card-flip-angle` / `--card-flip-perspective`，冇 magic number
- PWA：冇改 SW / manifest / 版本組件；version bump 到 1.24.0
- Unmount（轉 stack / 入頁）喺過場中途：update 嘅 `setShown` 會落去已 unmount 嘅 component，係 no-op，`pending` 由 util 清。StrictMode 只會喺 mount 嗰陣重複行 effect，而 mount 時 `deferred=false`，所以唔會開兩次過場
- 函數長度：`useCardMotion` 大約 17 行，`HomeWide` 大約 30 行，冇超過上限

## ✅ 做得好嘅地方

- `cardMotion` 係純函數，測試矩陣齊（open / null / switch / 唔反轉）
- `withViewTransition` 回傳 boolean，令「畀人 ignore」嘅情況可以 fallback，唔會靜靜雞冇咗 update
- e2e probe 包住真 `startViewTransition` 記低 `ready`，證明冇被瀏覽器跳過（S-633）

## 修訂代碼（W-526，方案 A）

```ts
// src/pages/home/useCardMotion.ts
const waiting = useRef(false); // 自己開咗、update 未行嘅過場
useLayoutEffect(() => {
    latest.current = { mode: next.mode, kind: next.kind, id: next.id };
    // 自己嘅過場等緊影舊畫面：佢 update 會用 latest，唔好即刻轉（W-526）
    if (!deferred || !motion || waiting.current) return;
    waiting.current = true;
    const apply = () => {
        waiting.current = false;
        setShown(latest.current);
    };
    // 另一個過場未 update（例如啱啱撳咗 ⤢）：唔做動畫，直接轉
    if (!withViewTransition(apply, motion)) apply();
}, [deferred, motion, next.mode, next.kind, next.id]);
```

## Handoff receipt

見 reviewer 回傳嘅 HANDOFF_RECEIPT block。
