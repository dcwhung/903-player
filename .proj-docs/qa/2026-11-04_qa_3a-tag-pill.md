# QA — 2026-11-04 — 3a 播放卡頁頭今日 / 重溫標籤跟 --ui-scale 放大（v1.21.10）

- 測試員：Quality Assurance（獨立角色）
- 範圍：`fix/home-card/rewatch-pill-margin` @ `d996a7d`（base origin/main `b2041eb`）；冇轉 branch、冇改 source、冇 commit / merge / push
    - `5e3d3cc`：`HomePlayerCard.module.css` `.tag` → `padding: calc(var(--new-badge-pad-block) * var(--ui-scale)) var(--space-2)`、`line-height: calc(var(--new-badge-line) * var(--ui-scale))`（之前 `0 var(--space-1)` / `var(--new-badge-line)`）；新 `homePlayerCardTag.node.test.ts`（3 個 test）；version 1.21.9 → 1.21.10
    - `d996a7d`：plan 表格排版（docs only）
    - Review：98 pass（S-654、S-655 optional）
- 環境：Linux sandbox、Node 22、playwright Chromium（`deviceScaleFactor: 2`）；`npm run build` 後由已經行緊嘅 `vite preview --port 4317` serve 新 `dist/`；`newE2EPage`（固定時鐘、假錄音、mock 外網）
- 總結：✅ **pass**；冇新 ticket
    - Scoped unit（HomePlayerCard / NewBadge / MiniPlayer）**107 / 107**（11 files）
    - `npx eslint src/components/HomePlayerCard` exit 0；`npx prettier --check` exit 0；`npm run build`（`tsc -b && vite build`）exit 0
    - Playwright 3 個橫版尺寸 × 今日 / 重溫 + 2 個超長名 edge case = **8 / 8**：line-height ≥ font-size、padding-block > 0、頁頭冇橫向溢出、標籤垂直置中、節目名正常 `…`
    - 直版 390×844 mini player 標籤 **未變**（`0px 4px`、lh 16px、h 16px）；NewBadge `2px 8px` / lh 16px 未變
    - 全套 e2e **冇跑**：`e2e/run.mjs` 冇 section filter（冇 argv / env 揀 section），唔可以只跑 homeWide

---

## Hard Gates（`d996a7d`）

| Gate           | 結果    | 證據                                                                                                                                       |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Tests          | ✅ pass | scoped unit 107 / 107（按指示唔跑全套）；Playwright 視覺 check 9 / 9（8 橫版 + 1 直版）                                                    |
| Type check     | ✅ pass | `npm run build` 入面 `tsc -b` exit 0                                                                                                       |
| Lint           | ✅ pass | eslint exit 0；prettier exit 0（repo 冇 stylelint config，CSS 冇 linter）                                                                  |
| Build          | ✅ pass | `npm run build` exit 0（precache 80 entries）                                                                                              |
| Coverage       | ✅ pass | CSS-only 改動；`.tag` 3 條規則（token 化、跟 `--ui-scale`、scale 1 解析值 `2px 8px` / `16px`）有 node test；實際 render 由 Playwright 覆蓋 |
| Security       | ✅ pass | 冇新依賴（lock 只改 version）；冇 JS 改動                                                                                                  |
| Data integrity | ✅ pass | 冇 state / storage 改動                                                                                                                    |
| Performance    | ✅ pass | 只係 2 個 `calc()`，冇 layout 成本差異                                                                                                     |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                     |
| PWA Update     | ⚪ 冇跑 | CSS-only，冇郁 SW / update 邏輯；全套 e2e 唔可以 scope（見上），按指示略過                                                                 |

---

## 1. Unit + lint

`npx vitest run src/components/HomePlayerCard src/components/NewBadge src/components/MiniPlayer` → 11 files / 107 tests 全綠（4.3 s）。新 `homePlayerCardTag.node.test.ts` 3 / 3。

## 2. Playwright 視覺 check

腳本：scratchpad `qa.mjs`（由 `shot.mjs` 擴展）。每個 case 量 `[data-tag]` 嘅 computed font-size / line-height / padding / 高度，同頁頭 button 嘅 `scrollWidth - clientWidth`、標籤係咪喺頁頭入面、標籤中心同頁頭中心差幾多、節目名 `text-overflow` 同有冇截字、名右邊 ≤ 標籤左邊、標籤右邊 ≤ ⤢ 左邊、成頁橫向溢出；page error 數。

| Case                           | `--ui-scale` | font   | line-height | padding      | 標籤高 | 頁頭高 | 頁頭溢出 | 置中差 | 名截字 / `…` |
| ------------------------------ | ------------ | ------ | ----------- | ------------ | ------ | ------ | -------- | ------ | ------------ |
| 1300×800 今日                  | 1.5          | 16.5px | 24px        | 3px 12px     | 30     | 90     | 0        | 0      | 有 / ✅      |
| 1300×800 重溫（公子會）        | 1.5          | 16.5px | 24px        | 3px 12px     | 30     | 90     | 0        | 0      | 冇 / ✅      |
| 1180×820 今日                  | 1.5          | 16.5px | 24px        | 3px 12px     | 30     | 90     | 0        | 0      | 有 / ✅      |
| 1180×820 重溫                  | 1.5          | 16.5px | 24px        | 3px 12px     | 30     | 90     | 0        | 0      | 冇 / ✅      |
| 1180×700 今日                  | 1.3          | 14.3px | 20.8px      | 2.6px 10.4px | 25.98  | 77.97  | 0        | −0.01  | 有 / ✅      |
| 1180×700 重溫                  | 1.3          | 14.3px | 20.8px      | 2.6px 10.4px | 25.98  | 77.97  | 0        | −0.01  | 冇 / ✅      |
| 1180×700 重溫 + 超長名（edge） | 1.3          | 14.3px | 20.8px      | 2.6px 10.4px | 25.98  | 77.97  | 0        | −0.01  | 有 / ✅      |
| 1300×800 今日 + 超長名（edge） | 1.5          | 16.5px | 24px        | 3px 12px     | 30     | 90     | 0        | 0      | 有 / ✅      |

- 全部 line-height / font-size = 24 / 16.5、20.8 / 14.3 ≈ 1.45（修之前 1.5 倍時係 16px < 16.5px，即係 3a 嘅問題）
- 全部 case：標籤喺頁頭入面、名右 ≤ 標籤左、標籤右 ≤ ⤢ 左、成頁橫向溢出 0、page error 0
- 重溫 variant 用 homeWide.mjs `REWATCH_SHOW` 流程（開 `#/show/gongzi` → `ensurePlaying` → 撳「返回主頁」）
- 截圖目視：今日（奶油金）/ 重溫（藍）膠囊上下有留白、字冇頂邊，`在晴朗的一…` 正常截字

## 3. 直版 390×844（scope 外 pill 未變）

| 元素                       | font | line-height | padding | 高   |
| -------------------------- | ---- | ----------- | ------- | ---- |
| Mini player 重溫標籤       | 11px | 16px        | 0px 4px | 16px |
| NewBadge（主頁節目格 × 3） | —    | 16px        | 2px 8px | —    |

`git diff b2041eb -- src/components/{MiniPlayer,NewBadge,DramaShelf} src/styles` 空 → 其他 pill 同 token 冇改。

## 4. QA 補測（主動 edge case）

| #   | Edge case                                        | 方式                   | 結果 |
| --- | ------------------------------------------------ | ---------------------- | ---- |
| 1   | 超長節目名（35 字）喺最窄 1.3 倍（1180×700）重溫 | DOM 注入名 + 量 layout | ✅   |
| 2   | 超長節目名喺 1.5 倍（1300×800）今日              | 同上                   | ✅   |
| 3   | 1.3 倍分界（700 高 < 800）重溫 variant           | 實 flow                | ✅   |
| 4   | 直版 NewBadge 冇被連帶改（共用 `--new-badge-*`） | computed style         | ✅   |

### 建議補測（optional，由 developer 跟進；唔 block）

- e2e `homeWide.mjs` 加一個 check：闊橫版卡 `[data-tag]` computed `lineHeight ≥ fontSize` 同 `paddingTop > 0`（而家只有 node test 睇 CSS 原文，冇 runtime 斷言 `--ui-scale` 真係生效）

## 5. 問題 / Ticket

冇。Reviewer S-654 / S-655 維持 optional。

## 6. 下一步

- 可以 merge main；建議 release 前照常跑一次全套 `npm run e2e`（今次因冇 section filter 冇跑）

---

```
HANDOFF_RECEIPT
protocol: 2
from: quality-assurance
branch: fix/home-card/rewatch-pill-margin
commit: d996a7d
version: 1.21.10
status: pass
hard_gates: tests=pass(scoped 107/107 + visual 9/9), typecheck=pass, lint=pass, build=pass, coverage=pass, security=pass, data_integrity=pass, performance=pass, no_critical=pass, pwa_update=not_run(css-only, e2e not scopable)
critical: 0
tickets: none
next_action: merge_main
context: e2e/run.mjs not run (no section filter); suggest full e2e before release
```
