# Batch QA — 2026-10-27 — size-limits（AU-001 – AU-009 + W-467）

- **日期**：2026-10-27
- **測試員**：Quality Assurance（Senior QA，冇參與編寫）
- **流程**：Protocol 2 · `/test` · Batch（5 lane）
- **範圍**：`refactor/size-limits/integration` HEAD `776ce99`，base `main@d7cc63b`（39 檔，+1798 / −907）
- **環境**：Linux · Node（本機）· vitest + jsdom · Playwright（preload 指去 `/opt/pw-browsers/chromium`）· `vite preview` port 4176
- **背景**：Reviewer batch 93/100 pass（`.proj-docs/reviews/2026-10-27_review_size-limits_batch.md`）；audit `.proj-docs/audits/2026-10-27_20-30_audit_size-limits.md`
- **總結**：**✅ pass**。全套 unit 1414 / 1414、e2e 546 PASS / 0 FAIL（同 main baseline 一樣），靜態 gate 全過，尺寸規則 0 超限，W-467 修正後 `src/` 零 import 循環。冇 🔴，冇需要 block 嘅問題；有兩項 🟡 測試盲點（屬 main 已有，唔係今次引入），建議 follow-up 補測。

## 整體 verdict

- 涵蓋 fix：
    - Lane A · AU-001 / AU-002 — `5d38c55`、`1c29a5a`（merge `292d64a`）
    - Lane B · AU-003 — `d37103a`、`fb75ba3`（merge `2207a8f`）
    - Lane C · AU-004 — `b10c577`（merge `df11dc5`）
    - Lane D · AU-005 — `f652e97`、`534ea68`（merge `e9f90fb`）+ W-467 `776ce99`
    - Lane E · AU-006 – AU-009 — `50a4528`、`4309bd0`、`2b64db9`、`5d610a5`（merge `0aa9f57`）
- Edge case gap：2（Lane A 1、Lane E 1；兩項都係 main 已存在嘅盲點）
- Regression：✅ pass（unit 全綠、e2e 546 / 0 同 baseline 一致）
- Status：**✅ pass**

### Hard Gates

| Gate           | 結果    | 證據                                                                                                                                                                                   |
| -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests（unit）  | ✅ pass | `npx vitest run` → **144 檔 / 1414 test 全過，0 失敗**（59.4 s）                                                                                                                       |
| Tests（e2e）   | ✅ pass | `npm run build && E2E_PORT=4176 node --import …/pw-preload.mjs e2e/run.mjs` → **546 PASS / 0 FAIL**，「All E2E checks passed」、「冇 JS error」；同 main@d7cc63b baseline 546 / 0 一致 |
| Coverage       | ✅ pass | `npm run coverage`：Stmts 97.96% · Branch 93.83% · Funcs 98.13% · Lines 98.85%（≥ 80%）                                                                                                |
| Lint           | ✅ pass | `npx eslint .` exit 0（reviewer 時遇到嘅 `.claude/worktrees` parsing error 已經冇咗，唔使再加 ignore）                                                                                 |
| Prettier       | ✅ pass | `npx prettier --check .` → All matched files use Prettier code style                                                                                                                   |
| Type check     | ✅ pass | `npx tsc -b --noEmit` exit 0                                                                                                                                                           |
| 尺寸規則       | ✅ pass | `node node_modules/.audit-tmp/measure.cjs .` → functions measured 1186，**over limit 0**                                                                                               |
| Import 循環    | ✅ pass | 自寫 DFS 掃 `src/`（非 test 檔嘅相對 import / re-export）→ **cycles: 0**                                                                                                               |
| Build          | ✅ pass | `npm run build` exit 0；PWA v2.0.0 generateSW，precache 80 entries，生成 `dist/sw.js`、`dist/workbox-*.js`、`dist/manifest.webmanifest`                                                |
| 版本號注入     | ✅ pass | bundle 有 `` `1.18.3` ``（`__APP_VERSION__` define）；e2e 多個 viewport 驗證「版本號 v1.18.3 喺橫額右下角」                                                                            |
| PWA Update     | ✅ pass | 今次冇改 `vite.config.ts` / SW 註冊 / `public/`；e2e「Service worker 已啟用：…/sw.js」。vN → vN+1 自動 reload 嘅實機驗證留返 DevOps release bump 版本時照常做                          |
| Security       | n/a     | 冇新依賴、`package.json` / lock 冇改，冇新輸入面                                                                                                                                       |
| Data integrity | n/a     | 純結構 refactor，冇改 storage schema / selector 邏輯                                                                                                                                   |
| Performance    | ✅ pass | 冇新 effect / re-render 來源（reviewer 已核對 hook 次序同依賴）；bundle `index-*.js` 402.57 kB（gzip 132.33 kB），CSS 52.83 kB 同 reviewer 記錄一致                                    |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                                                                 |

### 改動檔 coverage（未達 100% 嘅檔）

| 檔案                           | Stmts | Branch | Funcs | Lines | 未覆蓋                            |
| ------------------------------ | ----- | ------ | ----- | ----- | --------------------------------- |
| `pages/DailyDramaPage.tsx`     | 100   | 69.23  | 100   | 100   | 25、32、43-48（橫版 / 冇集數）    |
| `pages/SeriesDramaPage.tsx`    | 95.83 | 91.3   | 100   | 100   | 29、60                            |
| `pages/useDramaPage.ts`        | 99    | 88.88  | 100   | 100   | 150、197-215、237                 |
| `pages/TodayPage.tsx`          | 100   | 94.11  | 100   | 100   | 43                                |
| `components/…/useDateStrip.ts` | 95    | 85.71  | 100   | 100   | 67-76（守衛分支）                 |
| `components/…/useFitText.ts`   | 94.73 | 50     | 100   | 100   | 14-22（`ResizeObserver` / fonts） |
| `components/…/useDiscTurn.ts`  | 100   | 83.33  | 100   | 100   | 9                                 |
| `components/…/useCardDrag.ts`  | 97.46 | 94     | 93.75 | 98.43 | 169（`onDragStart`）              |
| `hooks/useMiniPlayer.ts`       | 100   | 94.64  | 96.15 | 100   | 28、99、148                       |
| `components/…/ShowGrid.tsx`    | 100   | 90     | 100   | 100   | 50                                |
| `components/…/EpisodeRow.tsx`  | 100   | 93.75  | 100   | 100   | 67                                |
| `components/…/PlayerGauge.tsx` | 95.83 | 100    | 87.5  | 100   | —                                 |

其餘改動檔（`ArcRow`、`ArcSheet`、`arcLabels`、`useSheetBehaviour`、`EpisodeList`、`useScrollToCurrent`、`MiniPlayer*`、`dismissView`、`fitText`、`useGridPager`、`useEpisodePress`、`SeriesListColumn`、`TodayPlayerColumn` 等）全部 100%。

---

## Section A — Lane A · AU-001 / AU-002 劇集頁（`DramaPage` 拆頁 + page hooks）

- **Verdict**：✅ pass
- **證據**：`DramaPage.test.tsx`（30+ case）、`DailyDramaPage.test.tsx`（2 case）、新 `useEpisodePress.test.ts`（4 case）全綠。

| 場景                          | 結果 | 證據                                                                                                  |
| ----------------------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| Series 直版                   | ✅   | `series drama` 組 6 case（續播、短篇 chip、轉短篇唔斷播、撳集播）                                     |
| Series 橫版 + docked ArcSheet | ✅   | `landscape` 組 4 case（第 26 / 26 集、已暫停、短篇 / 位置 / 集名、全集喺清單欄打開而唱片仍可用）      |
| 第一次入 / 第二次入           | ✅   | `first visit to a series drama` 組 8 case（自動開全集、唔播、再入再開、揀咗未播再入保持、聽過就唔開） |
| 撳集 / 撳播緊嗰集暫停         | ✅   | `useEpisodePress`：揀集播、撳播緊嗰集暫停、撳 current 但未播就播、播緊時撳另一集轉集                  |
| 有其他嘢播緊                  | ✅   | `while something else plays` 4 case（唔干擾、撳播先取代、chip 唔誤標播緊、橫版提示）                  |
| Daily 直版                    | ✅   | `DailyDramaPage.test.tsx`：自動播今日、新到舊排、重溫 tag、日子條只列有集數嘅日子                     |
| Daily 橫版 / 冇集數           | ⚠️   | 冇 unit test、亦冇 e2e（見 🟡 Q-1）                                                                   |
| 未知 id / disabled 劇集       | ✅   | `treats the disabled 18 樓 C 座 as not found`、`says the drama cannot be found for an unknown id`     |

- **Edge case 評估**：高風險位（hook 次序、`dockedSheet={landscape && arcSheet}`、`isPlaying` vs `isPlayingCurrent` 由 caller 傳入）已有 test 鎖住；`useEpisodePress` 新 test 正好覆蓋「撳播緊嗰集暫停」呢個最易出錯嘅分支。
- **補測建議**：`DailyDramaPage` 橫版（`NowPlaying` + 頁頭移去清單欄）同「冇集數」`StatusMessage`（branch 69.23%）。目前每日劇集未啟用（18 樓 C 座 disabled），所以唔影響現行用戶，列 🟡。

## Section B — Lane B · AU-003 全集表（`ArcSheet` 拆 `ArcRow` / `useSheetBehaviour` / `arcLabels`）

- **Verdict**：✅ pass
- **證據**：`ArcSheet.test.tsx`（30+ case）、新 `arcLabels.test.ts`、`sheetDrag.test.ts` 全綠；改動檔 coverage 100%。

| 場景           | 結果 | 證據                                                                                                                                                    |
| -------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Row 狀態 label | ✅   | `arcLabels.test.ts`（播緊 / 未完 / 已完、按鈕 aria-label）；`ArcSheet.test.tsx` 分組次序、進度、watched / total pill、play / pause 掣                   |
| Focus          | ✅   | `moves focus into the sheet when it opens`                                                                                                              |
| 向下拉閂       | ✅   | 拉過四分一閂、跟手、短拉彈返、向上唔郁、quick flick、cancel 彈返、多指 / lost capture、reduced motion 即閂、docked（橫版）都可以拉閂、Escape 唔會閂兩次 |
| 閂嘅其他途徑   | ✅   | 掣、backdrop、Escape                                                                                                                                    |

- **Edge case 評估**：✅ no edge case gap。手勢邊界（pointercancel、第二隻手指、mouse 喺外面放手、slide-away 期間撳）覆蓋完整。

## Section C — Lane C · AU-004 集數清單（`EpisodeList` 拆 `EpisodeRow` / `useScrollToCurrent` / types）

- **Verdict**：✅ pass
- **證據**：`EpisodeList.test.tsx`（22 case）、`episodeStatus.test.ts`、`watchedRow.node.test.ts` 全綠；e2e「撳集數轉集」、「揀中集數喺畫面內」、各 viewport「集數 panel 自己捲（scrollTop 0 → 400）」全 PASS。

| 場景                                  | 結果 | 證據                                                                                               |
| ------------------------------------- | ---- | -------------------------------------------------------------------------------------------------- |
| Scroll-to-current `nearest`（節目頁） | ✅   | `scrolls the current episode into view inside the list panel`、reduced motion 改 jump              |
| `top` + 露半行（劇集頁）              | ✅   | `jumps on entry so the playing episode sits at the top, with half of the one before showing`       |
| 同清單下一集 smooth / 換短篇 jump     | ✅   | `scrolls smoothly…`、`jumps again when a different 短篇 replaces the list`                         |
| 唔喺畫面嘅短篇唔郁 / 新清單由頂開始   | ✅   | `stays put…`、`starts a fresh list from the top…`、`keeps the first episode flush at the top`      |
| 轉畫面重新捲                          | ✅   | `jumps back to the playing episode after the screen is rotated`；節目頁 `leaves show pages alone…` |
| 新集加喺頂唔拉返                      | ✅   | `does not pull a show page back to the current episode when a new one is added on top`             |

- **Edge case 評估**：✅ no edge case gap。`EpisodeRow` 第 67 行未覆蓋分支屬 unavailable row 嘅次要組合，已有 `unavailable` 組 3 case 覆蓋主路徑。

## Section D — Lane D · AU-005 Mini player（拆 `MiniPlayerCard` / `Dots` / `DismissButton` / `dismissView`）+ W-467

- **Verdict**：✅ pass
- **證據**：`MiniPlayer.test.tsx`（45+ case）、新 `dismissView.test.ts`、`miniPlayerDismiss*.test.ts`、`miniPlayerMode.test.ts`、`miniPlayerSingle` / `miniPlayerWidth` node test 全綠；e2e「mini player 第一個向右掃循環去最後一個」、「最後一個向左掃循環返第一個」、「掃完仲喺主頁」、位置 / viewport gap / narrow layout 全 PASS。

| 場景                 | 結果 | 證據                                                                                                                                                                                                                                |
| -------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 左右掃轉節目         | ✅   | unit：右掃上一個、首尾 wrap、單一節目唔郁、掃完唔開節目頁、keyboard click 照過；e2e 循環 3 項                                                                                                                                       |
| 長按左滑關閉         | ✅   | 250 ms 先 lift、移動咗唔 lift、過半闊閂、兩段觸控都閂、部分拖停喺關閉掣、idle / 外面撳 / Escape 收返、data-closing、閂一次                                                                                                          |
| Dots                 | ✅   | 多音頻有 dots 同觸控區、單一音頻冇 wrapper、重溫 / 今日 tag、position label                                                                                                                                                         |
| sr-only 關閉掣       | ✅   | `offers screen reader and keyboard users a plain close button`                                                                                                                                                                      |
| W-467 type re-export | ✅   | `MiniPlayer.tsx` `export type { MiniPlayerProps } from './miniPlayerTypes'`；`useMiniPlayer.ts` 同 `MiniPlayer.test.tsx` 照舊由 `MiniPlayer` import，`tsc -b` 過；`Card` / `Dots` 改由 `miniPlayerTypes` import；全 `src/` cycles 0 |

- **Edge case 評估**：✅ no edge case gap。W-467 只搬 type（runtime 0 改變），build 後 bundle 唔受影響。

## Section E — Lane E · AU-006 – AU-009 今日節目頁、主頁分頁、gauge、hooks trim

- **Verdict**：✅ pass
- **證據**：`TodayPage.test.tsx`（20 case）、`ShowGrid.test.tsx` + 新 `useGridPager.test.ts`（5 case）、`PlayerGauge.test.tsx`（25+ case）、`DateStrip.test.tsx`、`fitText.test.ts`（新增 applyFit 6 case）、`ShowCardStack.test.tsx`、`useDiscTurn.test.ts` 全綠；e2e 今日頁、主頁分頁、日子條全 PASS。

| 場景                    | 結果 | 證據                                                                                                                                                                                              |
| ----------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 今日節目頁              | ✅   | 播出次序、自動播第一個、撳播緊 row 暫停、掃卡轉節目 + theme、dots 方向鍵、fallback 最近有錄音嘅日子、全日灰色、07:00 未 probe、空狀態；e2e fixed today page / card share                          |
| 主頁分頁 grid           | ✅   | `useGridPager`：起始第一頁、scrollLeft round、冇闊度保持、`goTo`、頁數縮細 clamp；e2e「節目格分頁，有頁數指示點」、「第一頁節目格冇剪走、冇畀 mini player 遮住」（320×568、291×494）              |
| Player gauge 掣         | ✅   | `ignores what the player plays and starts its own page from play or restart`；轉碟 seek / flick / cancel / ring lock 全組                                                                         |
| Date strip 鍵盤 / click | ✅   | `steps to the newer day with ← and the older day with → when the strip is focused`（焦點唔喺條上唔處理）、`plays a day that is tapped`、swipe 後吞 click；e2e 拖日子條跟手、拖完正中、29 格冇剪走 |
| Fit text                | ✅   | `fitText.test.ts` 10 case（fits、比例縮、下限、未 layout、再細一步、讀唔到 CSS size）                                                                                                             |
| Card drag click capture | ✅   | `should swallow the click that follows a drag over an inner button`、`should let plain and keyboard clicks through`                                                                               |

- **Edge case 評估**：純函數部分（`applyFit`、`useGridPager`）新 test 質素好。`useFitText` 嘅 `ResizeObserver` / `document.fonts.ready` 重新量分支（branch 50%）喺 jsdom 冇 cover（見 🟡 Q-2）；e2e 用真 Chromium 跑過頁頭顯示，但冇專門驗證「轉向後重新 fit」。
- **補測建議**：stub `ResizeObserver` / `document.fonts` 驗 `useFitText` 會喺 resize / 字型載完後重新 `applyFit`，以及 unmount 後 `active=false` 唔再改 style。

---

## 跨 fix 互動評估

- **同檔衝突**：五條 lane 改動檔互不重疊；`useMiniPlayer.ts`（Lane D）同 `useDramaPage.ts` / `useShowPage.ts`（Lane A）喺唔同目錄，冇共用新 helper。
- **Symbol collision**：新 symbol（`useEpisodePress`、`useGridPager`、`dismissView`、`arcLabels`、`MiniPlayerProps` 新位置）冇重名；`tsc -b` 同 ESLint 全過。
- **Import 循環**：W-467 之前 Lane D 有 type-only 循環；`776ce99` 之後全 `src/` 0 循環，恢復 main 嘅零循環狀態。
- **CSS 次序**：reviewer 已核對 CSS rule 集合相同、只係 module 次序變；今次 build CSS 仍係 52.83 kB，e2e 版面 / 剪裁檢查全過。
- **整體尺寸**：1186 個 function 0 超限；coverage 整體 97.96%，冇因拆檔而下降到 threshold 以下。

## Regression 結論

- Unit 1414 / 1414、e2e 546 / 0，同 main baseline 及 W-467 前嘅 integration 結果一致，**外部行為 0 改變**嘅預期成立。
- 視覺：已知 `home-291x494.png` 跑馬燈相位差 1 device px，reviewer 判定為 frame 時序噪音（30 px/s × 16.67 ms × DPR 2），用戶已接受；今次唔重做比對。

## 發現問題

### 🔴 Critical

冇。

### 🟡 Warning（唔 block，建議 follow-up 補測）

| ID  | Lane | 問題                                                                                                                        | 建議                                                                              | Ticket                              |
| --- | ---- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| Q-1 | A    | `DailyDramaPage` 橫版（`NowPlaying`、頁頭移去清單欄）同「冇集數」狀態冇 unit test，e2e 亦冇劇集頁 scenario（branch 69.23%） | 加 `stubLandscape` case + 冇 current episode case；e2e 可加一個 series 劇集頁流程 | 不需要（main 已有盲點、功能未啟用） |
| Q-2 | E    | `useFitText` 嘅 `ResizeObserver` / `document.fonts.ready` / unmount 分支冇 test（branch 50%）                               | stub 兩個 API 驗 re-fit 同 cleanup                                                | 不需要                              |

### 🟢 Suggestion

- reviewer 嘅 S-509（`useStripInput` 改名）、S-510（e2e 截圖 `animations: 'disabled'`，可消除跑馬燈相位噪音）、S-511（`TodayPlayerColumn` 用 `Pick` 收窄）仍未做，維持唔 block。
- e2e 目前完全冇劇集頁 / 全集表流程；長遠建議加一條「入 series 劇集 → 開全集 → 揀短篇 → 播 → 向下拉閂」嘅 smoke。

## 問題修正優先順序

| 優先 | ID           | Lane | Block release | Ticket |
| ---- | ------------ | ---- | ------------- | ------ |
| 1    | Q-1          | A    | 否            | —      |
| 2    | Q-2          | E    | 否            | —      |
| 3    | S-510        | e2e  | 否            | —      |
| 4    | S-509、S-511 | E    | 否            | —      |

冇 🔴，所以唔需要建 CUI ticket。

## 測試建議（下一步）

1. DevOps release 時 bump 版本，照常做 PWA vN → vN+1 自動 reload 驗證。
2. Follow-up 交 developer subagent 補 Q-1、Q-2 test（QA 唔 commit）。
3. 考慮落實 S-510，令之後 refactor 嘅 visual gate 唔再受無限動畫影響。

## Handoff receipt

```handoff-receipt
protocol: 2
agent: quality-assurance
mode: batch
scope: refactor/size-limits/integration@776ce99 (base main@d7cc63b) — AU-001..AU-009 lanes A–E + W-467
status: pass
next_action: merge_main
next_agent: devops-engineer
hard_gates:
  tests_unit: pass (144 files / 1414 tests / 0 failed)
  tests_e2e: pass (546 PASS / 0 FAIL, matches main baseline)
  coverage: pass (stmts 97.96 / branch 93.83 / funcs 98.13 / lines 98.85)
  lint: pass
  prettier: pass
  typecheck: pass
  size_limits: pass (1186 measured, 0 over)
  import_cycles: pass (0)
  build: pass (dist/sw.js generated, v1.18.3 injected)
  pwa_update: pass (no PWA config change; vN->vN+1 to be verified on release bump)
  security: n/a
  data_integrity: n/a
  no_critical: pass (0)
per_fix:
  A: pass
  B: pass
  C: pass
  D: pass (W-467 resolved)
  E: pass
tickets: []
follow_up: [Q-1 DailyDramaPage landscape/empty tests, Q-2 useFitText observer tests, S-509, S-510, S-511]
report: .proj-docs/qa/2026-10-27_qa_size-limits_batch.md
context: "純結構 refactor，外部行為 0 改變已由 unit 1414/1414 + e2e 546/0 確認；home-291x494 1 device px 跑馬燈相位差屬已接受噪音；release 前需 bump 版本（現 1.18.3）"
```
