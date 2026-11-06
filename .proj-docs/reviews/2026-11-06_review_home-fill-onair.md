# Code Review — 2026-11-06 — 主頁填到底 + 播放器空狀態 + ON AIR（v1.28.3）

- 審閱者：Code Reviewer（獨立，worktree `.claude/worktrees/review-homefill`）
- 目標：`fix/ui/home-fill-bottom` @ `58426ce`（base `origin/main` `561066c`，v1.28.2 → v1.28.3）：`683298d` mockup、`501171c` 填到底（A + B3 + C3）、`c5212f5` 空播放卡 + 收藏播緊行、`db27678` banner 高半行 + 最近收聽行先排、`71e44e6` ON AIR pill + 左邊條、`58426ce` 闊橫版卡清單暫停狀態
- SSoT（L1）：用戶決定 A、B3、C3（`_mockups_/home-fill-bottom/index.html`）、D、E（已畀 ON AIR 取代）、F、G、ON AIR（preview `WVJYMHWbvmmYbrkie7Pp3m`）、闊橫版卡清單暫停 bug
- Design Origin：`683298d` / `c5212f5` `baseline: v1.28.2 production screens`；`501171c` `mockup: _mockups_/home-fill-bottom/index.html`（檔案存在）；`71e44e6` / `58426ce` `mockup: ON AIR combo preview`；**`db27678` 冇**（W-696）
- Tier：T1（PATCH，CSS / 小組件 / 一個 fallback 修正 + version bump）
- 總評：每項決定都有對應改動同 node / unit test 鎖住；bug 根因（`liveState` 預設 `'playing'`）喺 `toPlayableItem` 一個位修，所有清單受惠。冇 🔴；一個 🟡（commit 漏 Design Origin，開 PR 時補）

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                                                                     |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | pass    | 改動檔 `eslint` exit 0（0 error；CSS 檔 ignored warning）、`prettier --check` 全過                                                                                                                                                                                                       |
| Type check    | pass    | `npx tsc -b` exit 0                                                                                                                                                                                                                                                                      |
| Unit（相關）  | pass    | `npx vitest related <43 個改動 ts/tsx>`：40 files / 459 tests passed；7 個改動 `*.node.test.ts`（CSS 原文）`npx vitest run`：45 tests passed（冇跑 full suite / e2e）                                                                                                                    |
| CI（同 SHA）  | ✅ pass | [run 42253711967](https://github.com/dcwhung/903-player/actions/runs/42253711967) @ `58426ce`：lint / unit / build / E2E（Playwright）全綠；1600×800 左上角 19/12（S-725）喺 CI 都過                                                                                                     |
| Coverage      | pass    | 每項決定有 test：`homeBottomSpace`（A）、`showGridCss` / `showGridFill`（B3）、`dramaShelfCss`（C3）、`PlayerGauge` / `BookmarkButton` / `DramaPage`（D）、`savedPolish`（F）、`recentTab` / `RecentPanel`（G）、`onAirBadge` / 各清單（ON AIR）、`HomePageWide` + `episodeItems`（bug） |
| No Critical   | pass    | 0 個 🔴                                                                                                                                                                                                                                                                                  |
| Security scan | n/a     | 冇新依賴                                                                                                                                                                                                                                                                                 |

## 評分結果

| 維度     | 得分   | 滿分    | 備注                          |
| -------- | ------ | ------- | ----------------------------- |
| 正確性   | 25     | 25      |                               |
| 安全性   | 20     | 20      |                               |
| 可維護性 | 15     | 20      | W-696 commit 漏 Design Origin |
| 測試覆蓋 | 15     | 15      |                               |
| 性能     | 10     | 10      |                               |
| 代碼風格 | 10     | 10      |                               |
| **總分** | **95** | **100** |                               |

**結果：✅ pass**

## 決定逐條核對

| #      | 結果 | 覆核                                                                                                                                                                                                                                                                                                                          |
| ------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | ✅   | `main.home` / `main.wide` `padding-bottom: var(--mini-player-offset-bottom)`；舊嘅收藏 tab `:has([data-saved-mode])` 特例刪走（已併入通用規則）；有 mini player 規則冇郁                                                                                                                                                      |
| B3     | ✅   | `--show-tile-max-grow: 1.5`；`.grid[data-fill] { align-content: space-between }`。`useRowsPerPage` 量 `rowGap` 係 CSS gap 屬性，唔包 align-content 分出嚟嘅距離，唔會兜圈（註解講明）                                                                                                                                         |
| C3     | ✅   | focus 下面嘅卡 `translateY(card × (1 − rest-scale)) scale(rest-scale)`；三種狀態同一組 transform function，過渡順；`--drama-shelf-card` 有 `0px` fallback；reduced motion 沿用現有 `@media (prefers-reduced-motion: reduce)` 即刻切換                                                                                         |
| D      | ✅   | `empty = status === 'unloaded' && !arcPicked`；play / ★ `aria-disabled`、`onClick` 早退、冇 toast；Tab / 讀屏照行到；淡色用現有 `--unavailable-opacity`。未載入時冇「由頭播放」掣（`onStart` 分支 `restart: undefined`），唔使另外 disable                                                                                    |
| E      | ✅   | `--saved-box-playing-bg` 同主題色字已刪（test 鎖住冇殘留），由 ON AIR 取代                                                                                                                                                                                                                                                    |
| F      | ✅   | `--saved-row-pad-bottom` / `--saved-row-height` / `--saved-banner-tall`；`.card` padding 同 token 共用；solo `min-height` / `max-height` 都用 tall                                                                                                                                                                            |
| G      | ✅   | `ul[data-cols='2']` 兩欄 grid，DOM 次序 = 畫面次序（左右左右、單數左欄多一個由 grid 自然做到）；分隔線改畫行頂，第 2 格唔畫，冇雙線                                                                                                                                                                                           |
| ON AIR | ✅   | `--color-on-air: #c8102e`、白字 5.88:1；equaliser `aria-hidden`；動畫同 glow 只喺 `no-preference`，靜止高度喺 query 外（減少動態唔卡、唔等 `animationend`）；`--onair-pulse` 由 `--view-transition-move` 推；暫停 / 未開始 = 灰靜止條 + 揀中框保留 +「聽到 x / y」；冇外圈；行掣 `aria-label` 講一次「播放中」；連線中冇 pill |
| Bug    | ✅   | `toPlayableItem`：`ctx.liveState ?? playbackStateOf({ isPlaying, position: live.currentTime })`；節目頁 / 劇集頁有傳 `liveState` 唔受影響；`HomePageWide` test 重現用戶報告（暫停後冇「播放中」、`聽到 0:26 / 1:53:59`、灰條）                                                                                                |

其他：i18n 冇新寫死字（pill 用 `common.status.playing`、時間用 `player.progressText`，`MessageKey` 型別過 tsc）；version 1.28.3（`package.json` + lock，`c5212f5`），後面三個 commit 屬同一個未 merge 嘅 PATCH；PWA 版本 / update 流程冇郁（n/a）；新函數都 ≤ 30 行（`liveStatus`、`RowBody`、`RowLamp`、`useStandby` 18 行）。

## 🔴 / 🟡

### W-696 `db27678` commit 冇 `Design Origin:` 行

- 位置：`db27678` fix(ui): taller saved banners and row-major recent list columns（改 `SavedTab.module.css`、`RecentPanel.tsx`、`tokens.css`）
- L1：Reviewer Design Fidelity 規則（UI 改動要有 Design Origin）；本 repo 慣例每個 UI commit 都寫（同 branch 其餘 5 個都有）
- L2：`git log -1 --format=%B db27678` 冇 `Design Origin:`；其餘 commit 有
- L3：改動有用戶決定 F / G 做依據，內容冇問題，只係追溯斷咗
- 方案 A（推薦）：開 PR 時 description 第一行寫 Design Origin，並逐個 commit 列 origin，`db27678` 寫 `baseline: v1.28.2 production screens (user decisions F, G)`。唔使改 history
- 方案 B：rebase reword 補返 commit message。要 force push，branch 已推，唔建議

## 🟢 / Observation

- S-729 `db27678` 嘅 CI run 123 紅（舊 recent-list 欄數 assertion），`71e44e6` 先修；中間 commit 唔綠，bisect 時留意
- S-730 收藏 tab（`savedRowStatus`）同今日節目清單（`todayItems.statusOf`）未知時長（連線中）時都當播緊，會出 pill；同改之前寫「播放中」一樣，唔係 regression，但同 EpisodeRow「連線中冇 pill」唔一致（L2 欠，淨係睇 code），睇真機再決定要唔要跟
- S-731 左邊條幾何（3px 闊、上下 18%、收藏行字右移 10px）寫喺組件 CSS，冇入 token；暫時得一個來源，日後再用多一處就抽
- S-732 `SavedRow` 由 33 行變 36 行（JSX 為主），之後再加嘢要拆
- S-733 TDD：bug fix 嘅 test 同修正喺同一個 commit，睇唔到先紅後綠；commit body 有講重現步驟

## ✅ 做得好嘅地方

- bug 喺共用 `toPlayableItem` 修根因，唔係喺闊橫版卡補一個 `liveState`，其他未傳嘅 caller 都一齊安全
- CSS 決定全部有 node test 讀原文鎖住（包括 reduced-motion query 入面只有邊幾個 selector）
- 減少動態處理跟 CLAUDE.md：靜止樣喺 query 外，即時生效，冇 JS cache

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "fix/ui/home-fill-bottom"
context: "A / B3 / C3 / D / F / G / ON AIR / 闊橫版卡暫停 bug 全部落實，C=0 W=1 S=5（W-696、S-729 至 S-733）；CI run 42253711967 @ 58426ce ✅ success（lint、unit、build、E2E 全綠）；W-696 開 PR 時 description 補 Design Origin（含 db27678 嘅 F / G），唔使改 code"
```

---

## Re-review 1 — `af31a04`、`5693f1b`、`1daf44c`（@ `1daf44c`）

- 範圍：上次 review（`5c3f464`）之後新加嘅三個 commit：`af31a04` 時間唔喺中間斷行、`5693f1b` 連線中冇 ON AIR pill（S-730）、`1daf44c` 闊橫版清單（O3）
- SSoT（L1）：S-730；用戶決定 O3（preview `J4fzPZRCtP5DC3pVGdmqWZ`）：清單欄 `max(34%, 340px × s)`；淨係闊橫版 ☆ 32px × s、☆ / ▷ 4px × s、狀態欄最少 8.75em、短篇集名欄可以縮；手機打橫 / 直版唔郁；主頁闊橫版卡狀態最少 6.4em
- Design Origin：三個 commit 都有（`baseline`、`mockup: ON AIR`、`mockup: wide list preview O3`）
- 總評：code 層面三項都做齊，unit / node test 全綠；但 **head `1daf44c` 嘅 CI E2E 紅**，失敗嗰項正正係 O3 要保證嘅「暫停行一行」，所以今輪 ❌ fail

### Hard Gates（Re-review 1）

| Gate         | 結果    | 證據                                                                                                                                                                                                                               |
| ------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint         | pass    | 改動檔 `eslint` 0 error、`prettier --check` 全過                                                                                                                                                                                   |
| Type check   | pass    | `npx tsc -b` exit 0                                                                                                                                                                                                                |
| Unit（相關） | pass    | `npx vitest related` 8 個改動源檔：25 files / 348 tests；`wideRow` / `watchedRow` / `landscapeColumns` node test + `episodeItems`：4 files / 26 tests（冇跑 full suite / e2e）                                                     |
| CI（同 SHA） | ❌ fail | [run 42263345650](https://github.com/dcwhung/903-player/actions/runs/42263345650) @ `1daf44c`：lint / unit / build 綠，**E2E 紅（1 項）**，見 W-697。唔係 S-725（嗰項只喺 sandbox 紅，今次 CI 冇報）；`5693f1b` run 42257609162 ✅ |
| No Critical  | pass    | 0 個 🔴                                                                                                                                                                                                                            |

### 評分（Re-review 1）

| 維度     | 得分   | 滿分    | 備注                         |
| -------- | ------ | ------- | ---------------------------- |
| 正確性   | 20     | 25      | W-697 CI 證實暫停行唔係一行  |
| 安全性   | 20     | 20      |                              |
| 可維護性 | 15     | 20      | W-696 仍未處理（開 PR 時補） |
| 測試覆蓋 | 15     | 15      |                              |
| 性能     | 10     | 10      |                              |
| 代碼風格 | 10     | 10      |                              |
| **總分** | **90** | **100** |                              |

**結果：❌ fail**（CI E2E 呢個 hard gate 未過；分數只供參考）

### 上輪項目

- S-730 ✅ 已處理：`savedRowStatus` 未知時長回「連線中…」、`onAir: false`（灰條、冇 pill），⏸ 照跟 `isPlaying`；Today 加 `ShowStatus 'connecting'`（「06:00 · 連線中…」、灰條、暫停掣），`useTodayPage` 用 `hasKnownDuration(player.duration)`。同 EpisodeRow 一致，test 有鎖
- W-696 ⏳ 未處理：要開 PR 時喺 description 補（唔使改 code）

### 🔴 / 🟡

#### W-697 闊橫版 1300×800 暫停揀中行「聽到 33:32 / 44:00」喺 CI 排咗 3 行

- 位置：`EpisodeList.module.css` 闊橫版 media query（`.body { min-width: var(--episode-status-min) }`）+ `.timed` / `.timedLine` 換行；e2e `checkWideRowStatus`（`e2e/dramaPages.mjs`）
- L1：用戶決定 O3：闊橫版暫停狀態要一行（commit `1daf44c` 寫明目標同 e2e 斷言）
- L2：CI run 42263345650 log：`FAIL 闊橫版短篇劇集頁清單行（1300×800）：暫停揀中行「聽到 33:32 / 44:00」一行（3 行）`；同一個 run，播緊嗰行 `PASS`（2 行，時間離 ☆ 62px）
- L3：字同時間啱，係行數唔啱。可能係 CI 字型（CJK / 數字）闊過 sandbox，8.75em 唔夠；亦都可能係 e2e 數行嘅方法（`Range.getClientRects()` 會數埋 `.timeSep` inline-block、`.lead` 嘅 margin）數多咗。兩樣都要喺 CI 嘅 screenshot artifact（`e2e-screenshots`，artifact 13526787044）睇清楚先定得
- 方案 A（推薦）：下載 CI screenshot 睇實際排版。真係斷行就加大 `--episode-status-min`，或者喺闊橫版畀 `.timed` `white-space: nowrap`，等成句真係唔換行，唔再靠估 em
- 方案 B：如果畫面其實係一行，就改 e2e 用 `.timed` 嘅高度同 line-height 比較嚟數行，唔用 range rect；同時喺 test 註解講明點解咁做
- 注意：本 reviewer 冇跑 e2e（Hard Rule #7）。sandbox 字型同 CI 唔同，sandbox 綠都唔算，要 CI 綠先算

### 🟢 / Observation

- S-734 `HomePlayerCard` `--episode-status-min: calc(var(--font-size-xs) * 6.4)`、集名欄 `min-width: calc(var(--font-size-md) * 3.6)` 嘅倍數直接寫喺組件 CSS（8.75 就入咗 token）；有註解講明，日後再用就抽 token

### ✅ 做得好（Re-review 1）

- `splitTime` 由翻譯字串反拆，文案一改對唔上就唔拆，退返原本整句，唔會整爛畫面
- 分隔符跟時間行，換行時由 `clip-path` 剪走，第一行尾同第二行頭都唔會吊住「·」
- 闊橫版改動全部限喺 media query 入面，手機打橫同直版有 node test 鎖住唔郁

### Handoff receipt（Re-review 1）

```handoff-receipt
protocol: 1
status: fail
score: 90/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: fail
  coverage: n/a
next_action: invoke_developer
next_agent: frontend-developer
branch: "fix/ui/home-fill-bottom"
context: "Re-review 1 @ 1daf44c：S-730 已處理；W-697 新：CI run 42263345650 E2E 紅，1300×800 暫停行「聽到 33:32 / 44:00」3 行（O3 要一行），先睇 CI screenshot 定係排版定係 e2e 數行嘅問題；W-696 仍要開 PR 時補 Design Origin；S-734 只記錄"
blockers:
  - "W-697：CI E2E 闊橫版暫停狀態一行斷言失敗（run 42263345650）"
```

---

## Re-review 2 — `5b1031a`（W-697 + S-734，@ `5b1031a`）

- 範圍：淨係 `ac049d4` 之後嘅 `5b1031a`；只驗 W-697 同 S-734 嘅修正，唔再搵新 🟢
- Design Origin：`mockup: wide list preview … (O3)` ✅

### Hard Gates（Re-review 2）

| Gate         | 結果    | 證據                                                                                                                                                                                                                                         |
| ------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint         | pass    | 改動檔 `eslint` 0 error、`prettier --check` 全過                                                                                                                                                                                             |
| Type check   | pass    | `npx tsc -b` exit 0                                                                                                                                                                                                                          |
| Unit（相關） | pass    | `npx vitest related` CardEpisodes / EpisodeList / episodeListTypes：13 files / 231 tests；`wideRow` / `landscapeColumns` node test + `EpisodeList.test`：3 files / 40 tests（冇跑 full suite / e2e）                                         |
| CI（同 SHA） | ✅ pass | [run 42270100479](https://github.com/dcwhung/903-player/actions/runs/42270100479) @ `5b1031a`：lint / unit / build / E2E 全綠；log：`PASS … 暫停揀中行「聽到 33:32 / 44:00」一行（1 行）`、`PASS … 播緊時間唔溢出入 ☆ 位（2 行，離 ☆ 71px）` |
| No Critical  | pass    | 0 個 🔴                                                                                                                                                                                                                                      |

### 評分（Re-review 2）

| 維度     | 得分   | 滿分    | 備注                         |
| -------- | ------ | ------- | ---------------------------- |
| 正確性   | 25     | 25      | W-697 已修                   |
| 安全性   | 20     | 20      |                              |
| 可維護性 | 15     | 20      | W-696 仍未處理（開 PR 時補） |
| 測試覆蓋 | 15     | 15      |                              |
| 性能     | 10     | 10      |                              |
| 代碼風格 | 10     | 10      |                              |
| **總分** | **95** | **100** |                              |

**結果：✅ pass**

### 上輪項目

- W-697 ✅ 已修，排版同 e2e 兩邊都改咗：
    - 排版：闊橫版內頁 `.body` 改做 `container-type: normal` + `min-width: min-content`，`.timedLine` `nowrap`，狀態欄跟實際字型撐闊，唔夠位由集名欄讓（最少 `--episode-label-title-min`）。規則搬咗去檔尾，蓋得到同 specificity 嘅基本規則（之前基本 `.timedLine` 後寫，闊橫版嗰條冇生效）
    - 主頁播放卡：用 `variant="card"`（`data-variant`），狀態照舊可以換行，時間成段落第二行；有快將下架嘅行先保留 LE1 container（`.body:has(.leaving)`，最少 `--episode-time-min`）
    - e2e：行數改做「狀態字塊高 ÷ 時間（nowrap）高」，唔再用 Range 行盒（之前會多數一行）
- S-734 ✅ 已處理：3.6 / 6.4 倍數入咗 token（`--episode-label-title-min`、`--episode-time-min`）；`--episode-status-min` 同 HomePlayerCard 覆寫已刪
- W-696 ⏳ 未處理：開 PR 時喺 description 補

### 快將下架標籤 vs 用戶決定 E2（「放得落就寫『下架』」）

可以接受，唔開 finding：

- 闊橫版內頁冇咗 container，`@container episode-body (max-width: 120px)` 唔再生效，所以永遠寫全「⏳ 05/12 下架」
- 但 `.body` 而家係 `min-width: min-content`，`.leaving` 係 `nowrap` 嘅一粒 flex item：成粒最少都放得落，唔夠位由集名欄縮（最少約 3.6 個字），唔會溢出蓋住 ☆ / ▷
- 換句話講，闊橫版內頁「永遠放得落」，寫全符合 E2；短標籤「⏳ 05/12」本來就係放唔落時嘅後備，主頁播放卡（`card`）同手機打橫 / 直版仍然有
- 呢點係由 CSS 推理（L3），CI 冇專門驗「最窄 340px × s 欄 + 長集名 + 快將下架」；QA S1 截圖時可以順手睇一眼

### Handoff receipt（Re-review 2）

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "fix/ui/home-fill-bottom"
context: "Re-review 2 @ 5b1031a：W-697 已修（min-content 狀態欄 + card variant + e2e 量高），S-734 已入 token；CI run 42270100479 ✅ 全綠（E2E 暫停行 1 行）；E2 闊橫版內頁永遠寫全「下架」可接受（min-content 保證放得落）；W-696 仍要開 PR 時 description 補 Design Origin"
```
