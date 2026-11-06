# Code Review — 2026-11-06 — 我的收藏 tab 執位（v1.28.2）

- 審閱者：Code Reviewer（獨立，worktree `.claude/worktrees/review-saved`）
- 目標：`fix/ui/saved-tab-polish` @ `fd2b670`（base `origin/main` `3a7ff2f`）：`0166eec` fix(ui) v1.28.2、`fd2b670` fix(ui) 行圓角
- SSoT（L1）：用戶 2026-11-06 四項決定（捲動條、短提示位置、最近收聽到底、左滑紅底圓角 + 行保持 8px）；baseline = v1.28.1 production 截圖
- Design Origin：`baseline: v1.28.1 production screens (user screenshots)`（兩個 commit 都有；開 PR 時要放 description 第一行）
- Tier：T1（PATCH，CSS + 一個 hook 搬位 + version bump）
- 總評：四項決定逐條落實，改動細、每項有 node / unit test 鎖住；冇 🔴 / 🟡。iOS 捲動條嗰項喺 Chromium 驗唔到，要真機確認（S-727）

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                      |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | pass    | 改動檔 `eslint` exit 0、`prettier --check` 全過                                                                                                                           |
| Type check    | pass    | `npx tsc --noEmit -p .` exit 0                                                                                                                                            |
| Unit（相關）  | pass    | `npx vitest run` App.test、SavedTab/、Toast/、MiniPlayer/、hooks/、homeBottomSpace：38 files / 278 tests passed（冇跑 full suite / e2e）                                  |
| CI（同 SHA）  | ✅ pass | [run 42220721975](https://github.com/dcwhung/903-player/actions/runs/42220721975) @ `fd2b670`：lint / unit / build / E2E 全綠（`0166eec` 嘅 run 117 畀新 push cancel 咗） |
| Coverage      | pass    | 四項改動各有 test：`savedPolish`（isolation、圓角 token）、`toastOffset`、`homeBottomSpace`、`App.test`（冇 mini player 都寫 gap 變數）                                   |
| No Critical   | pass    | 0 個 🔴                                                                                                                                                                   |
| Security scan | n/a     | 冇新依賴                                                                                                                                                                  |

## 評分結果

| 維度     | 得分    | 滿分    | 備注 |
| -------- | ------- | ------- | ---- |
| 正確性   | 25      | 25      |      |
| 安全性   | 20      | 20      |      |
| 可維護性 | 20      | 20      |      |
| 測試覆蓋 | 15      | 15      |      |
| 性能     | 10      | 10      |      |
| 代碼風格 | 10      | 10      |      |
| **總分** | **100** | **100** |      |

**結果：✅ pass**

## 決定逐條核對

| #                      | 結果       | 覆核                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 捲動條唔畀 banner 遮 | ✅（推理） | `.scroll` / `.recentScroll` 加 `isolation: isolate`。推理成立：`.banner` relative、`.bannerArt` / `::after` absolute、`.bannerTitle` `z-index: 1`，捲動區唔係 stacking context 時佢哋喺外層 stacking context 排序，WebKit 會畫喺捲動區 overlay 指示條上面；令捲動區自己做 stacking context 係常見修法。風險低：捲動區入面冇元素需要彈出捲動區（冇 popover / 高 z-index；`.trash` 本身喺 `.row` `overflow: hidden` 入面），`isolation` 唔會強制 compositing，唔影響效能                      |
| 2 短提示位置           | ✅         | `--toast-offset-bottom: var(--mini-player-offset-bottom)`；有 mini player 嘅 `html:has(main[data-mini-player]) .toast` 冇改。`useViewportGap()` 由 MiniPlayer 搬去 App：hook 只寫 `--viewport-gap-bottom`，唯一消費者係 `--mini-player-offset-bottom`（mini player、Toast、主頁留位、ViewportDebug），有 mini player 時數值同之前一樣；只喺 App mount 一次，避開 hook 註明嘅「多個 mount 先 unmount 清走變數」問題；非 iOS standalone / 打橫 `viewportGap` 回 0，同以前 fallback `0px` 一樣 |
| 3 最近收聽到底         | ✅         | `main.home:not([data-mini-player]):has([data-saved-mode])` specificity (0,3,1) 高過 `main.home`；有 mini player 規則唔受影響；`main.wide` 冇 `.home`，闊橫版唔受影響                                                                                                                                                                                                                                                                                                                        |
| 4 紅底圓角 + 行 8px    | ✅         | 新 token `--radius-row: calc(8px * var(--ui-scale))` = 原本 `var(--space-2)` 嘅值（同樣跟 `--ui-scale`）；`.row` / `.trash` 共用。左滑移除 `translateX(-110%)` 時紅底右邊會停喺行入面，以前嗰度係直角，而家圓角，同截圖問題吻合                                                                                                                                                                                                                                                             |

其他：version 1.28.2（`package.json` + lock）；冇新動畫（reduced motion n/a）；冇新 magic number（8px 入咗 token）；註解同 `tokens.css` 說明已更新（舊「離頁底 40px」改咗）。

## 🔴 / 🟡

冇。

## 🟢 / Observation

- S-726 `0166eec` commit body 仲寫紅底用 `--radius-cell`，已畀 `fd2b670` 改成 `--radius-row`；開 PR 時 description 以最終做法為準
- S-727 `isolation` 修 iOS 捲動條：Chromium / CI 重現唔到（L2 欠），deploy 後要喺 iPhone 主畫面 app 對返截圖確認
- S-728 短提示新位置同時套用喺節目頁 / 劇集頁（冇 mini player），劇集 `ArcSheet` 打開時提示會疊得低啲；符合決定 2「冇 mini player」字面，`pointer-events: none` 唔擋撳，記低睇真機觀感

## ✅ 做得好嘅地方

- 搬 `useViewportGap` 去 App 前讀清楚 hook 嘅單一 mount 限制，順手更新註解，test 直接驗「冇 mini player 都寫變數」
- 行圓角開專用 token，冇順手改大，test 鎖住 8px

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "fix/ui/saved-tab-polish"
context: "四項用戶決定全部落實，C=0 W=0 S=3（S-726 至 S-728）；CI run 42220721975 ✅ success（lint、unit、build、E2E 全綠）；S-727 要 iPhone 真機確認捲動條"
```
