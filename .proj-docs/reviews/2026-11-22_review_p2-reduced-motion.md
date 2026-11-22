# Code Review — P2 減少動態 CSS（審計 2026-11-22 跟進，Lane J）

- **日期**：2026-11-22
- **審閱者**：Code Reviewer（獨立，冇寫過呢段 code）
- **目標**：branch `fix/player/reduced-motion-css`，base `204cbfde`
    - `0fa3a45c`：`MiniPlayer.module.css`、`global.css` reduce block 補 selector；新 helper `motionLeftOnWhenReduced` + test
    - `c7c05de3`：player 2.2.2 version bump（`package.json` + lockfile）
- **Tier**：T1（PATCH，player CSS + 測試 helper）
- **總評**：✅ pass。修正正確兼最小；冇 🔴 / 🟡，得 3 條 🟢（helper 嘅已知盲點），冇用 C 號。

## Hard Gates

all pass（本輪重跑，直接睇 exit code）：

- `npm run lint`：exit 0（包括 `prettier --check .`）
- `npx tsc -b`：exit 0
- `npm test -- apps/player/src/styles apps/player/src/components/pages/home/MiniPlayer`：exit 0，28 files / 262 tests
- Coverage：新 helper 有 5 個單元 test + 2 個實檔 test；冇新依賴

Developer 報嘅 full suite / e2e / `e2e:visual` 冇重跑（Hard Rule #7，留畀 QA / CI）。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                             |
| -------- | ------- | ------- | ------------------------------------------------ |
| 正確性   | 25      | 25      | specificity 分析啱，兩處都係補 selector 唔加權重 |
| 安全性   | 20      | 20      | 純 CSS / 測試                                    |
| 可維護性 | 20      | 20      | 註解講清點解要逐條 selector 熄                   |
| 測試覆蓋 | 15      | 15      | base 版本 helper 會報錯（L2 見下），即係真係鎖到 |
| 性能     | 10      | 10      |                                                  |
| 代碼風格 | 10      | 10      |                                                  |
| **總分** | **100** | **100** | 🟢 唔扣分                                        |

**結果：✅ pass**

## 修正驗證

- **L1**：`.claude/CLAUDE.md` §Motion（減少動態 = 唔播動畫、直接切換）
- **L2**：用 helper 讀 `204cbfde` 嘅原檔：`MiniPlayer.module.css` 報 `.player[data-pressing='true'] { transition }`；`global.css` 報 `::view-transition-old(*):only-child { animation }` 同 `::view-transition-new(*):only-child { animation }`。HEAD 兩個都係 `[]`
- **L3**：`.player[data-pressing='true']`（0,2,0）贏 reduce block 嘅 `.player`（0,1,0）；`::view-transition-*(*)` 嘅 `*` 參數 specificity 係 0，加 `:only-child` 變 (0,1,0)，贏 reduce block 嘅 `(*)`。補返完全一樣嘅 selector，同 specificity、後寫，一定贏；冇用 `!important`
- MiniPlayer 其他有 transition 嘅 selector：`.player[data-dragging='true']`、`… ~ .behind .dismiss` 本身已經係 `none`；`data-lifted` / `data-armed` 冇自己嘅 transition。關閉滑走由 `dismissSession.ts:98` 用 `prefersReducedMotion() ? 0 : DISMISS_SLIDE_MS` 計時，唔等 `transitionend`，唔會卡住
- `global.css` 其他過場動畫（open / switch / zoom 系列）全部喺 `@media (prefers-reduced-motion: no-preference)` 入面；`::view-transition-group(*)` 嘅 longhand 同 reduce block 同 specificity、reduce 後寫，冇問題
- Version bump 2.2.1 → 2.2.2，lockfile 同步

## Repo-wide 掃描（helper 套落 `apps/player/src/**/*.css` 全部檔）

- 只有 `ShowCardStack.module.css` 有輸出：`.stack[data-phase='settling'] .card`、`.stack[data-phase^='fly'] .card`、`… .depth1 .title` 兩條 `{ transition }`
- 實際 cascade 冇問題（同意 developer）：reduce block（第 185 行）用 `.stack[data-phase] .card`（0,3,0）同 `.stack[data-phase] .depth1 .title`（0,4,0），同被蓋嘅規則 specificity 一樣、寫喺後面、selector 一定 match，所以贏。係 helper 要求「selector 完全一樣」造成嘅 false positive（見 S-1449）
- 其他檔冇同類 specificity 問題；longhand（`Ambient` 嘅 `transition-*`、`OnAirBadge` 嘅 `animation-delay`）都喺 `no-preference` 入面，`Disc` 嘅 `animation-play-state` 唔會自己開動畫

## 🟢 Suggestion

- **S-1447** `apps/player/tests/cssRule.ts:206-210` — 唔睇先後：reduce block 寫喺動畫規則**前面**（同 selector、同 specificity，動畫贏）都當熄咗，返 `[]`（臨時 probe 證實）。docstring 第 199 行話「後寫嘅 reduce block 先一定贏」但冇驗。修：記低每條規則喺 `walkRules` 嘅次序，只喺 reduce 規則排喺動畫規則之後先算熄；加一個「reduce 寫喺前面要報」嘅 test
- **S-1448** `apps/player/tests/cssRule.ts:183` — `MOTION_PROPS` 只認 shorthand，`animation-name` / `transition-property` 等 longhand 開嘅動畫唔會報（false negative）；reduce 邊用 `transition: none 0s` 又會誤報。而家 repo 冇實例。修：改做 `prop.startsWith('transition') || prop.startsWith('animation')`（排除 `animation-play-state` 等唔會自己開動畫嘅），或者喺 docstring 寫明只睇 shorthand
- **S-1449** `apps/player/tests/cssRule.ts:199-210` — selector 要完全一樣先當熄：`ShowCardStack` 呢類「同 specificity、較闊 selector、後寫」嘅正確寫法會誤報；包喺其他 `@media` 入面嘅 reduce block、`@media (prefers-reduced-motion)`（boolean）同樣誤報。方向係保守（只會多報），但如果日後想 repo-wide 鎖，要先揀一樣：helper docstring 寫明只啱逐檔 opt-in，或者 `ShowCardStack` reduce block 逐條寫返完全一樣嘅 selector 再加 repo-wide test

## ✅ 做得好嘅地方

- 改動最小：補 selector 而唔係加 `!important` 或者提高權重，註解講清原因
- 新 test 喺 base 版本會 fail，真係鎖住今次嘅 bug；helper 單元 test 蓋埋 no-preference / 其他 media 兩個 context

## Handoff

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
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: invoke_qa
next_agent: quality-assurance
branch: "fix/player/reduced-motion-css"
context: "Pass at c7c05de3: MiniPlayer long-press and view-transition :only-child fades now switched off under reduced motion; helper verified to flag the bug on 204cbfde. ShowCardStack confirmed fine (helper false positive only). Open non-blocking (clear this session): S-1447 (helper ignores source order), S-1448 (longhands not checked), S-1449 (exact-selector false positives block a repo-wide lock). Report committed, not pushed. Next QA S1 (mini-player, ui-foundation)."
```
