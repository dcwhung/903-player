# Code Review — 9b Lane 2：HomeView 閒置畫面 UI

- 日期：2026-11-20
- 審閱者：Code Reviewer（subagent，獨立）
- 目標：PR #293 `feature/layout/home-view-ambient-ui` → `release/v2.2.0`，HEAD `14451205`（`git diff origin/release/v2.2.0...HEAD`，13 檔，+1067）
- Tier：T2（新 UI：`.tsx` / `.css`、tokens、i18n、e2e section）
- 總評：plan Lane 2 範圍齊，叫醒流程（鎖住 shown → pointerdown 食咗 → 等 click）設計正確，7 個 developer 偏離全部接受。一條 🔴 係 PR description 冇 `Design Origin:`（改 description 即可）；兩條 🟡：自動出現時成個畫面有 focus ring 框、叫醒後備路徑冇 unit test

## Hard Gates

all pass。

- Lint：改咗嘅 `.ts` / `.tsx` / `.mjs` `eslint` 0；13 檔 `prettier --check` 過
- Type：`apps/player` `tsc --noEmit -p tsconfig.app.json` exit 0
- Tests（diff 相關）：`vitest run --project @903-player/player .../Ambient` 1 檔 / 16 tests 全綠（冇跑 full suite / e2e，Hard Rule #7；e2e probe 畀 hook 擋咗，冇跑）
- Coverage：`Ambient/**` lines 100%、branch 94.3%（`AmbientDisc.tsx:51` 0% 圈頭分支）
- Security：冇新依賴

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                   |
| -------- | ------ | ------- | -------------------------------------- |
| 正確性   | 20     | 25      | W-850 focus ring 框                    |
| 安全性   | 20     | 20      | 冇外部輸入                             |
| 可維護性 | 5      | 20      | C-033 冇 Design Origin                 |
| 測試覆蓋 | 10     | 15      | W-851 叫醒後備路徑 / 焦點返原位冇 test |
| 性能     | 10     | 10      | 時鐘每分鐘一次、timer 只喺開緊時逐秒   |
| 代碼風格 | 10     | 10      |                                        |
| **總分** | **75** | **100** |                                        |

**結果：❌ fail**（有 🔴；C-033 只係改 PR description）

## 🔴 Critical

**C-033 PR description 冇 `Design Origin:`**（PR #293 body 第一行）

- L1：Code Reviewer 規範 Design Fidelity「diff 有 `*.tsx` / `*.css` → PR description 第一行要有 `Design Origin:`，冇 → 🔴」；本 repo 慣例 #285 / #287 / #288 / #289 / #290 第一行都有
- L2：`gh api repos/dcwhung/903-player/pulls/293` body 第一行係 `## Summary`
- 影響：Design Fidelity 冇正式 origin 可以對；QA / release PR 追唔到
- 方案 A（推薦）：PR body 第一行加 `Design Origin: mockup: _mockups_/home-view-ambient/index.html（第 3 輪 B 款，時間 600；用戶 2026-11-20 確認）`。方案 B：引 preview artifact link 代替路徑。冇 code 改動，唔使 re-run CI

## 🟡 Warning

**W-850 自動出現時成個畫面有一圈 focus ring 框**（`Ambient/useInertBackground.ts:23`、`Ambient/Ambient.module.css:163-166`）

- L1：mockup B 款（`_mockups_/home-view-ambient/index.html` `.frame.b`）冇外框；C-025 用戶決定「只接受鍵盤操作先見 focus ring」，script 自動 focus 唔應該出 ring
- L2：developer worktree 嘅 e2e 截圖 `e2e/screenshots/ambient-playing.png`：x=0–1、y=0–1 係 `(242,242,242)`，x≥2 先係底色 `(17,17,17)`，四邊都有 2px 框；`ambient-paused.png`（之前用滑鼠撳過掣）冇。即係之前冇 pointer 操作（自動播放、鍵盤 / 遙控）時，Chromium 當 script `focus()` 係 `:focus-visible`，全屏透明掣嘅內框變成畫面外框。顏色仲係底下頁嘅 `--color-accent`（掣喺 `ThemeScope` 外面），唔係節目色
- 影響：HomeView 掛牆 / 擺枱時最常見嘅情況（開咗播、冇再掂）會成日見到一圈白框
- 方案 A（推薦）：出現時 focus 覆蓋層本身（`tabIndex={-1}`、`.overlay:focus { outline: none }`），叫醒掣照可以 Tab 到；讀屏開 dialog 會讀「閒置畫面」。Trade-off：要改 `useInertBackground` 參數同 unit test 斷言
- 方案 B：`.wake:focus-visible` 唔出 outline（任何鍵即叫醒，ring 冇用途）。Trade-off：最少改動，但鍵盤 Tab 到叫醒掣都冇視覺提示
- 加 e2e：`checkShowAndWake` 截圖前斷言 `:focus-visible` 冇 match / 邊位 pixel 係底色

**W-851 叫醒嘅後備路徑同焦點返原位冇 unit test**（`Ambient/AmbientScreen.test.tsx:164-220`；實作 `Ambient/useAmbientPresence.ts:73-81`、`Ambient/useInertBackground.ts:154-157`）

- L1：checklist「缺少或不足嘅測試覆蓋」；developer 偏離 #3 / #4（任何鍵、滾輪、pointercancel、pointerup 後 `WAKE_CLICK_GRACE_MS` 收起）係呢個 PR 嘅核心修正，冇 test 鎖住
- L2：`grep -nE "wheel|pointerCancel|GRACE|advanceTimersByTime" AmbientScreen.test.tsx` 冇結果；lines 100% 係因為 `onPointerCancel` / `onWheel` 直接係 `done` 嘅 reference，冇獨立 function；焦點只驗出現時（`:161`），冇驗叫醒後返原位
- 方案 A（推薦）：加 4 個 case：pointerdown → pointerup 冇 click → `WAKE_CLICK_GRACE_MS` 後 leaving；pointercancel 收起；wheel 收起；非 Escape 鍵（例如 `a`）收起且 `preventDefault`；叫醒後 `document.activeElement` 返去閒置前嗰粒掣。方案 B：export 常數喺 test 用 `vi.advanceTimersByTime(WAKE_CLICK_GRACE_MS)`，其餘合併成 `it.each`

## 🟢 Suggestion / Observation

- **S-1300**（🟢，建議本 PR 內清）`Ambient/AmbientScreen.tsx:43,62`：`SquareAmbient` 冇出覆蓋層時都 `usePlayer()`，每次 `timeupdate` re-render 兼計 `ambientView`。將 `ambientView` + render 搬去 `present` 先 mount 嘅子 component（`SquareAmbient` 淨係攞 `recording !== null`）
- **S-1301**（Observation，唔使改）`Ambient/useAmbientPresence.ts:113`：render 期間 `useMemo` 讀 DOM（`hasOpenModalDialog`）；結果只喺 `idle` 轉變時讀一次，行為啱，唔入 backlog
- **S-1302**（Observation，唔使改）閒置畫面出緊時 `#root` inert，入面 `Toast` 嘅 aria-live（例如睡眠 timer 到時暫停嘅提示）讀屏唔會讀；用戶要叫醒先見到，可接受
- TDD：單一 commit 同時加 test 同實現，睇唔到紅燈記錄；唔 block

## Developer 偏離判斷

| #   | 偏離                                          | 判斷                                                                                                                                                   |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | inert 全部 body 子元素                        | 接受：只拆自己加嘅、先記低焦點再 inert；正方形冇 docked sheet（`LANDSCAPE_QUERY` min-width 640），capture 嘅 outside-press 唔會被觸發                  |
| 2   | modal 只喺閒置嗰刻睇；出咗之後鎖住            | 接受：出咗之後冇 input 就開唔到 modal；`visibilitychange` 返嚟保留閒置畫面合理                                                                         |
| 3   | 任何鍵 / 滾輪叫醒                             | 接受：React `stopPropagation` 喺 body 擋住 document bubble listener；Space keyup 落返原位掣唔會 activate（keydown 唔喺嗰粒）。test 見 W-851            |
| 4   | 鎖 shown + 食 pointerdown + 等 click / 500 ms | 接受：touch / 滑鼠 click 都落喺全屏 `<button>`（iOS 會出 click）；`touch-action: none` 冇 double-tap 延遲；第二下（淡出緊）落頁面係設計。test 見 W-851 |
| 5   | 淡出用 `useLeaveFallback`、減少動態即收       | 接受：`prefersReducedMotion()` 喺叫醒嗰刻先讀，符合 CLAUDE.md Motion                                                                                   |
| 6   | 圓頭 / 0% butt、暫停灰圈、`0.78`              | 接受：截圖確認 Disc large 外圈喺進度圈入面                                                                                                             |
| 7   | 掛喺 HashRouter 外面                          | 接受：唔用 router，同 `Toast` 一樣                                                                                                                     |

其他：wake lock = 方形 + 有嘢載住 + 冇撥走 ✓；非方形只得 `useMediaQuery` ✓；`role="dialog" aria-modal` + label「閒置畫面」+ 掣「返回」✓；最長名（7–8 字）喺 544 闊會摺行但高度夠 ✓；`--ambient-*` token、`WAKE_CLICK_GRACE_MS` 具名 ✓；version bump 按 plan 喺 S3 做 ✓

## ✅ 做得好嘅地方

- 搵到真 Chromium 觸控「第一下穿透落暫停掣」嘅根因（useIdle capture 先 flush），用鎖 shown + 等 click 解決，e2e 用真 tap 鎖住
- inert 只拆自己加嘅、焦點先記低再 inert，次序啱
- 冇方形螢幕時零 listener，現有裝置零改變（visual 234/234）

## Handoff receipt

```handoff-receipt
protocol: 1
status: fail
score: 75/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "100% lines / 94.3% branch"
  no_critical: fail
  security: n/a
next_action: fix_and_rereview
next_agent: developer
branch: "feature/layout/home-view-ambient-ui"
context: "C-033 add Design Origin line to PR #293 body (no code). W-850 overlay auto-focus shows full-screen focus ring (focus overlay tabIndex=-1 instead). W-851 add unit tests for grace timeout, pointercancel, wheel, any key, focus return. S-1300 gate usePlayer/ambientView to shown subtree. Re-review only these."
```
