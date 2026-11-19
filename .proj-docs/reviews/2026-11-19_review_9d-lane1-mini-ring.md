# Code Review — 9d lane 1 mini player 播放掣外圈

- 日期：2026-11-19
- 審閱者：Code Reviewer（獨立）
- 目標：PR #282 `feature/mini-player/progress-ring` → `release/v2.1.0`，commit `c6656e9b`（6 files，+162 / −40）
- Tier：T2（所有裝置 mini player 嘅 UI 改動）
- Design Origin：`mockup: _mockups_/sleep-timer/index.html`「Mini player：已揀方案（M7）」（用戶已確認）；plan `.proj-docs/plans/2026-11-19_plan_9d-sleep-timer.md` Lane 1
- 總評：外圈幾何、讀屏結構、`--ui-scale` 縮放都做得啱，同 M7 一致；冇 🔴 / 🟡，兩條 🟢

## Hard Gates

All pass：`eslint`（4 個 diff `.tsx`）exit 0；`prettier --check`（6 個 diff 檔）clean；`tsc -b --noEmit`（`apps/player`）exit 0；MiniPlayer folder 8 個 test 檔 103 / 103 綠（`npx vitest run <files>`，冇跑 full suite / e2e）；coverage：`MiniPlayerProgress` / `MiniPlayerRow` / `MiniPlayerCard` 全覆蓋（folder 97.14% stmts，未覆蓋只係冇改嘅 `useMiniPlayer.ts` / `miniPlayer.ts`）；冇新依賴。e2e:visual 跟 developer 結果（48 / 180，全部喺 mini player 卡），冇理由懷疑，冇重跑。CI `Lint, unit & build` @ `c6656e9b` 審閱時仍然 `in_progress`。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                     |
| -------- | ------- | ------- | -------------------------------------------------------- |
| 正確性   | 25      | 25      | 12 點順時針、`ratio()` 已夾 ≤ 1、0% 冇點（butt 端）      |
| 安全性   | 20      | 20      | 冇輸入 / storage                                         |
| 可維護性 | 20      | 20      | S-1160（幾何常數 / token 同步）                          |
| 測試覆蓋 | 15      | 15      | 外圈比例、0%、按鈕唔喺 progressbar 入面、舊底條冇咗      |
| 性能     | 10      | 10      | 每次更新只改一個 `stroke-dasharray` 字串，冇過場         |
| 代碼風格 | 10      | 10      | 全部 token（`--color-accent` / `--color-track`），冇 hex |
| **總分** | **100** | **100** |                                                          |

**結果：✅ pass**（兩條 🟢 屬 lane backlog，按 CLAUDE.md 要喺本 session 清：lane 喺 PR 內修，或者 main agent 處理）

## 🔴 / 🟡

冇。

## 🟢 Suggestion / Observation

- S-1160 `MiniPlayerProgress.tsx:18-30` + `tokens.css:445`：外圈粗幼喺 SVG（`RING_WIDTH = 3`、`VIEW_BOX_SIZE = 44`）同 CSS（`--mini-progress-ring: calc(3px …)`、`--touch-target: 44px`）各寫一次，只靠註解同步。Mutation：token 改 6px、`.toggle` 拎走 padding / `background-clip`，MiniPlayer 103 個 test 照綠。建議跟 `ArcSlider.constants.ts` 做法將幾何常數抽去 `miniPlayerRing.ts`（亦符合 ts.md「Module-scope Constants 必須從 TSX 抽離」），再喺 `miniPlayerDismiss.node.test.ts` 同款 node test 鎖 `--mini-progress-ring` = `calc(${RING_WIDTH}px * var(--ui-scale))`、`.toggle` 嘅 padding 用 `--mini-progress-ring`
- S-1161 PR #282 description 冇字面 `Design Origin:` 第一行（而家係尾段 Design origin 一行，寫咗 mockup 路徑但冇 `mockup:` 前綴）；同 S-1140 一樣唔當 🔴。Merge 前 main agent 喺 PR body 第一行補 `Design Origin: mockup: _mockups_/sleep-timer/index.html (M7)`
- Observation：inline `<svg>` 係跟 `progress` 計 `stroke-dasharray` 嘅動態圖，唔可以做靜態 asset，同 `ArcSlider/ArcTrack.tsx` 一樣，唔 flag
- Observation：冇 bump version，plan 定咗喺 S3（`chore/release/player-2.1.0`）`2.0.0 → 2.1.0`，同 v2.0.0 各 lane 做法一致
- Observation（畀 QA S1）：progressbar 疊喺按鈕上面、同一個 44px 框；`pointer-events: none` 令 tap 落到按鈕，但讀屏「觸控探索」（VoiceOver / TalkBack）摸到嘅係邊個冇喺呢度驗到。QA 手動摸一次播放掣，要讀到「暫停」掣同可以雙擊暫停；CI e2e 用 role 撳 `暫停` / `播放` 亦會證實 overlay 冇擋 pointer

## ✅ 做得好嘅地方

- progressbar 同按鈕做兄弟、SVG `aria-hidden` + `focusable="false"`，讀屏照有真按鈕同原本嘅 `aria-value*`；e2e `miniPlayerRules.mjs` 嘅 `progressbar` 讀法唔使改
- 44px 撳得到範圍同行高唔變，只用 `padding` + `background-clip: content-box` 縮實色圓底，元素位置 diff 只會係新外圈
- viewBox 用 44 單位，SVG 跟 `--touch-target` 一齊按 `--ui-scale` 放大，圈同 padding 留嘅位唔會錯開；避開舊 iOS `pathLength` 問題有寫原因

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "100%"
next_action: merge_develop
next_agent: null
branch: "feature/mini-player/progress-ring"
context: "9d lane 1 @c6656e9b (PR #282 -> release/v2.1.0): pass, no red/yellow. Ring geometry, a11y (progressbar sibling of button, svg aria-hidden) and --ui-scale scaling match M7. Lane backlog to clear in this PR this session: S-1160 (move ring geometry consts to miniPlayerRing.ts + node test locking --mini-progress-ring and .toggle padding to RING_WIDTH; mutation stayed 103/103 green) and S-1161 (main agent puts 'Design Origin: mockup: _mockups_/sleep-timer/index.html (M7)' as PR body first line). QA S1 mini-player: manual VoiceOver/TalkBack touch-explore on the toggle; cite CI e2e for c6656e9b (in_progress at review time). Merge into release/v2.1.0 only after QA S1 + CI green. Report committed locally, not pushed"
```
