# Code Review — 9b 閒置畫面修正：成組置中 + 名 / 副題跑馬燈

- 日期：2026-11-20
- 審閱者：Code Reviewer（subagent，獨立）
- 目標：PR #296 `fix/layout/ambient-centered-marquee` → `release/v2.2.0`，HEAD `bdf64363`；有效 diff = `6a397ada` + `0f898610`（`git diff 0f898610 bdf64363` 空，B 款已 revert），5 檔 +187 / −10
- Tier：T2（`.tsx` / `.css`、token、e2e section）
- 總評：改法啱：disc 格定闊 + 右格 `max-content` + `justify-content: center`，名 / 副題用共用 `Marquee` 加 `contain: inline-size`，右格闊度永遠 = 時間；減少動態 = …（Marquee 自己嘅 `@media (prefers-reduced-motion: reduce)`，符合 CLAUDE.md Motion）。唯一 🔴 係 PR description 嘅 `Design Origin:` 唔係五種合法 origin 之一（改 description 即可，唔使 re-run CI）

## Hard Gates

all pass（no_critical 除外）。

- Lint：改咗嘅 `.tsx` / `.mjs` `eslint` 0；5 檔 `prettier --check` 過（repo `lint` = eslint + prettier）
- Type：`apps/player` `tsc --noEmit -p .` exit 0
- Tests（diff 相關）：`vitest run AmbientScreen.test.tsx Marquee.test.tsx` 2 檔 / 25 tests 全綠（冇跑 full suite / e2e，Hard Rule #7）
- Coverage：`Ambient/**` lines 100%、branch 92.2%（未覆蓋 branch 喺冇改嘅 `AmbientDisc.tsx:51`、`AmbientScreen.tsx:54`）
- Security：冇新依賴

## 評分結果

| 維度     | 得分   | 滿分    | 備注                        |
| -------- | ------ | ------- | --------------------------- |
| 正確性   | 25     | 25      |                             |
| 安全性   | 20     | 20      | 冇外部輸入                  |
| 可維護性 | 5      | 20      | C-034 Design Origin 唔合法  |
| 測試覆蓋 | 15     | 15      | unit + e2e 量 pixel 留白    |
| 性能     | 10     | 10      | Marquee 已有 ResizeObserver |
| 代碼風格 | 10     | 10      |                             |
| **總分** | **85** | **100** |                             |

**結果：❌ fail**（有 🔴；C-034 只係改 PR description）

## 🔴 Critical

**C-034 `Design Origin:` 唔係合法 origin**（PR #296 body 第一行）

- L1：global-rules §Design-Source Binding Rule（Hard Rule）：動 `*.tsx` / `*.css` 要寫 `mockup:` / `baseline:` / `proposal:` / `library:` / `none-required` 其中一種，連路徑；Code Reviewer Design Fidelity「合法 origin（5 種之一）」→ 🔴。上一輪 C-033（PR #293）同一條
- L2：`gh api repos/dcwhung/903-player/pulls/296` body 第一行：`Design Origin: user feedback 2026-11-20 (ambient left/right padding; marquee for long names)`，冇 origin 類型、冇路徑。另外 mockup B 款（`_mockups_/home-view-ambient/index.html:276` `.b { grid-template-columns: 1fr 1fr; padding: 6% }`）就係今次刻意改走嘅版面，所以唔可以直接寫 `mockup:` 而唔記偏離
- 影響：Design Fidelity 冇正式基準；之後再改閒置畫面嘅人會以 mockup 嘅 `1fr 1fr` 為準，改返用戶唔要嘅版面
- 方案 A（推薦）：第一行改做 `Design Origin: baseline: apps/player/src/components/shared/player/Ambient/AmbientView.tsx (release/v2.2.0; delta per user feedback 2026-11-20: centered group, marquee name/subtitle)`。Trade-off：最貼實情（微調現有 UI），冇 code 改動
- 方案 B：`Design Origin: mockup: _mockups_/home-view-ambient/index.html#第 3 輪 B 款` + 一行寫明偏離（grid / padding 由用戶 2026-11-20 改）。Trade-off：保留 mockup 連結，但要讀者自己對偏離

## 🟡 Warning

冇。

## 🟢 Suggestion / Observation

- **S-1340**（🟢，建議本 PR 內清）`Ambient.module.css:68`（`.layout { font-variant-numeric: tabular-nums }`）同 `:116` 註解「等闊數字」：PR 同 `e2e/ambient.mjs` 註解都寫明 Poppins 冇等闊數字（決定 A 接受每分鐘移幾 px），呢兩行而家誤導；刪 `tabular-nums` 或者改註解做「Poppins 冇 tnum，時間闊度跟數字變（用戶 2026-11-20 方案 A）」。行本身唔喺 diff，但同今次決定直接矛盾
- **S-1341**（Observation，唔使改）去咗 `padding-inline`：左右留白 = 剩低空位 / 2（544 闊量到 31 / 33px，約 5.7cqw）。Poppins 未載完用 fallback 字時，時間可能闊啲、留白細啲；Marquee / grid 會跟字型載完重新量，唔會凸出，可接受
- **S-1342**（Observation，唔使改）e2e 留白檢查只喺 22:30 狀態跑，timer（22:31）只驗闊度 / 一行，PR 已寫明理由；決定 A 之下合理
- TDD：`6a397ada` 同一 commit 加 unit test 同實現，睇唔到紅燈記錄；唔 block
- Version：v2.2.0 未 release、喺 release branch 修，冇 bump 合理（plan S3 已 bump 到 2.2.0）

## ✅ 做得好嘅地方

- `contain: inline-size` 令長名 / 副題唔計入 `max-content`，右格闊 = 時間，一條 CSS 解決凸出同摺行兩個問題，冇加 JS 量度
- 重用 `Marquee`（同 mini player 一致：讀屏只讀一次、副本 `aria-hidden`、減少動態 = …）
- e2e 用截圖 pixel 量睇得見嘅左右留白（唔係量 box），連廣播劇長名都驗；visual diff 234/234 現有裝置零改變

## Handoff receipt

```handoff-receipt
protocol: 1
status: fail
score: 85/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "100% lines / 92.2% branch (Ambient/**)"
  no_critical: fail
  security: n/a
next_action: fix_and_rereview
next_agent: developer
branch: "fix/layout/ambient-centered-marquee"
context: "C-034 replace PR #296 body line 1 with a legal Design Origin (recommended baseline: apps/player/src/components/shared/player/Ambient/AmbientView.tsx + delta note); description only, no CI rerun. S-1340 remove misleading tabular-nums / 等闊數字 comment in Ambient.module.css (clean in this PR per parallel-lane backlog rule). Re-review only these."
```

## Re-review（2026-11-20，HEAD `08d2d028`）

只驗上一輪 C-034 / S-1340 嘅修正（`git show 08d2d028`，1 個 CSS 檔；PR body）。

| ID     | 結果    | 證據                                                                                                                                                                                                                                           |
| ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-034  | ✅ 已修 | `gh api .../pulls/296` body 第一行：`Design Origin: baseline: apps/player/src/components/shared/player/Ambient/AmbientView.tsx (release/v2.2.0; delta per user feedback 2026-11-20: ...)`，合法 origin + 路徑存在                              |
| S-1340 | ✅ 已修 | `.layout` 刪咗 `font-variant-numeric: tabular-nums`；`.clock` 註解改寫明 Poppins 冇等闊數字、方案 A。睡眠 timer 分秒（`.timer` 喺 `.layout` 入面）同樣係 Poppins 數字，之前 tnum 本身冇效（PR 量到 22:30 ≈ 245px / 22:31 ≈ 218px），冇視覺改變 |

- Gates：`Ambient.module.css` `prettier --check` 過；`vitest run AmbientScreen.test.tsx` 22 tests 全綠；冇 code 邏輯改動，lint / type 同上一輪
- 評分：可維護性 5 → 20，總分 **100 / 100**，冇 🔴 / 🟡，S-1341 / S-1342 係 Observation 唔使改

**結果：✅ pass**

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
  coverage: "100% lines / 92.2% branch (Ambient/**)"
  no_critical: pass
  security: n/a
next_action: proceed_to_qa
next_agent: quality-assurance
branch: "fix/layout/ambient-centered-marquee"
context: "Re-review of C-034 (PR body Design Origin now baseline:) and S-1340 (08d2d028 drops tabular-nums, comment rewritten): both fixed. No open findings; S-1341/S-1342 observations only."
```
