# Code Review — 2026-11-04 — 主頁格仔 card zoom（P6 #2 Z3）

- 審閱者：Code Reviewer（獨立）
- 目標：`feature/motion/card-zoom`，`git diff origin/main...HEAD`（`2be1436` mockup、`c7d5e41` feat，v1.25.0 → v1.26.0）
- Tier：T2（新過場 + `withViewTransition` 加 hook）
- Design Origin：`mockup: _mockups_/card-zoom/index.html (Z3)`（commit message 第一段有，路徑存在）
- 總評：實作乾淨，同 mockup Z3 時間 / opacity 一致，減少動態跟統一做法，現有五款過場冇被郁到。一個 🟡：zoom 來源記錄喺系統返回手勢之後唔會清，之後由 mini player 入同一頁再撳返回會錯誤 unzoom。

## Hard Gates

all pass —— lint（eslint 改動檔 0 error、prettier 全 pass）、`tsc -b` exit 0、相關 unit 10 個檔 115 test 全綠、`cardZoom.ts` coverage 96.87% stmt / 89.65% branch（`zoomInset` / `useGoHome` / `useZoomNavigate` 100%）、冇新依賴。

## 評分結果

| 維度 | 得分 | 滿分 | 備注 |
|------|------|------|------|
| 正確性 | 20 | 25 | W-527 |
| 安全性 | 20 | 20 | |
| 可維護性 | 20 | 20 | |
| 測試覆蓋 | 15 | 15 | |
| 性能 | 10 | 10 | |
| 代碼風格 | 10 | 10 | |
| **總分** | **95** | **100** | |

**結果：✅ pass**（hard gates 全 pass、≥ 90、冇 🔴；W-527 建議 merge 前修）

## 🟡 W-527 系統返回手勢之後 zoom 來源唔清，mini player 入同一頁再撳返回會 unzoom 入格仔

- 位置：`src/utils/cardZoom.ts:65`（`zoomInto` 寫 `source`）、`src/utils/cardZoom.ts:86-87`（只有 `unzoomHome` 清）、`src/hooks/useGoHome.ts:19-20`（闊橫版行 `back`，都唔清）
- L1：用戶確認需求「返回時唔知來源 → 即刻切頁」；系統返回手勢冇過場，應該等於來源作廢。
- L2：用 `tsx` + jsdom 直接行 `cardZoom.ts` 重現（scratchpad `repro/stale.mts`）：`zoomInto('show:gongzi','/show/gongzi')` 行完 → 唔叫 `unzoomHome`（模擬系統返回）→ 之後 `unzoomHome('/show/gongzi')` 結果 `startViewTransition calls = 2, kind = unzoom`。mini player `onOpen` 轉去 `/show/${showId}`（`src/hooks/useMiniPlayer.ts:180`），同一個 path。
- L3 影響：常見流程「撳 公子會 格（順便開播）→ 系統返回 → 撳底部 mini player（公子會）→ 撳返回」會由成頁縮入上面嘅格仔，唔係即刻切頁；闊橫版入頁再返回之後轉直版都一樣。另外 `zoomInto` 喺冇開過場（格仔唔喺畫面 / pending / 減少動態）時都寫咗 `source`。
- 方案 A（推薦）：來源綁 history entry —— `zoomInto` 用 `navigate(path, { state: { zoomFrom: key } })`，`useGoHome` 由 `location.state` 攞 key 傳畀 `unzoomHome`；系統返回 / mini player 入頁自然冇 state。代價：`useShowPage.ts:59` 會 `replace` 清 state，要確認唔會食咗（或者改用 `location.key` 對）。
- 方案 B：保留 module 變數，但記埋入頁嗰刻嘅 `location.key`（或 `history.state.idx`），`unzoomHome` 要 path + key 都對先 zoom；另外 HomePage mount（返到主頁）時清 `source`。改動細，但多一個全域狀態要同步。
- 補 test：`cardZoom.test.ts` 加「入頁後經其他途徑返主頁再入同一頁 → 直接轉」。

## 🟢 / Observation

- S-679 `src/utils/zoomInset.ts:27-35`：只同 viewport 比，唔理 overflow 容器。直版 `ShowGrid` 收窄（`maxWidth`）而格仔喺第 2 頁、返主頁 pager 重設第 1 頁（`useGridPager.ts` index 初始 0）時，格仔可能喺 viewport 內但被 scroller 剪走，unzoom 會縮入睇唔到嘅位、`zoom-tile` snapshot 喺留白位淡入（L3，未喺瀏覽器重現）。可考慮同 `tile.closest('[data-fill-page], nav')` 嘅框取交集。
- S-680 `src/styles/global.css:77`：unzoom 格仔淡入用共用 new-only（delay 200ms、260ms → 200–460ms），mockup 倒播係 260–520ms；差 60ms，肉眼難分，記錄做 known deviation 就得。
- S-681 闊橫版：click 入面 `startShow` 令播放卡由冇變有時，`useCardMotion` 因 pending 直接 `apply()`，舊 snapshot 已經係 split 版面；`HomeFillGrid` 重新分頁可能令被標嗰格 remount，`measured()` 量到 detached 元素就 fallback 舊框（`cardZoom.ts:74-77`）。Developer 偏離 1 嘅取捨合理（iOS autoplay），但闊橫版未截圖，建議 QA S1 慢鏡睇「冇播放卡 → 撳格」一次。

## Developer 自報偏離判斷

1. 開播留喺 click 同步做：合理（iOS user gesture），pending 擋第二個過場 + update 開頭再量框有效；剩餘風險見 S-681。
2. unzoom 搵唔到 / 唔喺畫面 → `skipTransition()`：合理，`onEnd` 照清標記；有 test。
3. root `mix-blend-mode: normal`、unzoom old root `z-index: 1`：合理，同 Z3 視覺一致（main agent 截圖證實）。
4. 來源對 path、用一次清：方向啱但唔夠 —— 見 W-527。

## ✅ 做得好嘅地方

- `withViewTransition` 加 `afterUpdate` / `onEnd` hook，所有出口（不支援、減少動態、pending 拒絕、throw、finished）都保證 `onEnd` 叫一次，有 test 釘住。
- `generation` 防舊過場清走新標記；`* { view-transition-name: none !important }` 只喺 zoom / unzoom 生效，完全唔掂 expand / back / open / close / switch。
- 新數值全部做 token，CSS 動畫放喺 `prefers-reduced-motion: no-preference`，`prefersReducedMotion()` 喺開始嗰刻先讀。

## 修訂代碼（W-527 方案 B 示意）

```ts
// src/utils/cardZoom.ts
let source: { key: string; path: string; entry: string } | null = null;
export const zoomInto = (key: string, path: string, entry: () => string, update: () => void) => { /* 轉頁後記 entry() */ };
export const unzoomHome = (pathname: string, entry: string, update: () => void): void => {
    const key = source?.path === pathname && source.entry === entry ? source.key : null; // 系統返回 / mini player 入頁 entry 唔同
    source = null;
    // …其餘不變
};
```

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "96.87%"
next_action: merge_develop
next_agent: null
branch: "feature/motion/card-zoom"
context: "Card zoom Z3 pass 95/100; W-527 stale zoom source after system back (mini player re-entry unzooms) recommended fix before merge; S-679..S-681 backlog; wide layout not yet screenshotted"
```
