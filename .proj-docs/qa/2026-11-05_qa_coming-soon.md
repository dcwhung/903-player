# QA — coming-soon（P8 #6 即將上架 / 快將下架）— 2026-11-05 — S1

- Tier: T2（MINOR v1.28.0，跨 catalog / 主頁 / 劇集頁 / 收藏）| Commit: `5eb23cf`（code = `5f2e550`，之後淨係 docs）| Verdict: ❌ fail（W-533）
- Ledger（`impact --since ab58d0d` = merge-base origin/main）: SKIP 0 / REVERIFY 10（bookmark、card-zoom、catalog-data、drama、home、mini-player、player-core、pwa-shell、show-today-page、ui-foundation）/ UNCOVERED 47 code + 44 mockup 圖 → 新鏈 `coming-soon`
- P7 bookmark 鏈（S1 @ `8cfbd15`）同其餘 9 條鏈嘅 STALE 檔逐個對過 `git diff 8cfbd15..HEAD`：全部係 P8 改，所以冇 SKIP
- Plan：新寫 `.proj-docs/qa/plans/coming-soon.md`；REVERIFY 鏈沿用各自 plan

## Runs

| Command                                                                                                                                            | Result                                   | Time |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---- |
| CI [42072852107](https://github.com/dcwhung/903-player/actions/runs/42072852107) @ `5f2e550`（lint / unit / build / e2e，含 `e2e/comingSoon.mjs`） | success（引用）                          | —    |
| `npm run build -- --mode e2e` + `npx vite preview --port 4181`                                                                                     | ok                                       | 25s  |
| Playwright scratch（harness `newE2EContext` + fixture flag；390×844、844×390、1300×800 × 主頁 / 劇集頁 / 一覽表 / 集數 / 收藏 / 舊 URL + W-531）   | 61 PASS / 1 FAIL（W-533）/ 2 script 誤判 | 70s  |
| 補量 `DramaTile` 短篇數 span `clientWidth/scrollWidth`（有 / 冇續聽 × 3 viewport）                                                                 | 見 W-533                                 | 30s  |

10 條 REVERIFY 鏈 plan 嘅 unit 子集 + e2e section 全部喺同一 SHA 嘅 CI run 入面 → 引用，唔重跑。

## Hard Gates

- Tests / Coverage / Security ✅（CI 同 SHA 全綠；review 量 availability selector / catalog 100% lines；冇新依賴）；PWA n/a
- No blocking finding ❌：W-533

## Findings

### 🟡 W-533 有「繼續收聽」條時，主頁格右上角「N 個短篇 · 新短篇 X 上架」被截剩「3」/「3.」，上架資訊睇唔到亦讀唔到 → CUI-0021

- L1: `_mockups_/coming-soon/index.html` ①「三個位置都顯示」，主頁格 = H2「3 個短篇 · 新短篇 11/12 上架」；⑧ 左上角琥珀字同其他角落字「唔會撞」
- L2: fixture `e2e-soon` + 聽過初戀無限次第 2 集（同 `e2e/comingSoon.mjs`），時鐘 30/11 22:30；短篇數 span（`DramaTile.tsx:15`，`aria-hidden`）`clientWidth/scrollWidth`：844×390 有續聽 **16/147**、1300×800 有續聽 **28/220**（格闊 249px）、390×844 147/147；冇續聽 1300×800 220/220。截圖 scratchpad `shots/wide-home.png`、`shots/narrowLand-home.png` 右上角只見「3.」；格讀屏名「E2E 即將劇場，部分短篇 19/12（六）下架」冇上架資訊
- L3: `DramaShelf.module.css:189-211` `.topBar`：左上角（新 + 琥珀下架字）`flex-shrink: 0`，右上角 `.meta` `min-width: 0` + ellipsis；「⏳ 部分短篇 19/12 下架」食晒頂行。註釋話只係「窄格」先收尾，但 1300×800 都中；字尾一向 `aria-hidden`（S-700），所以呢個狀態視覺 + 讀屏都冇上架資訊
- 建議（用戶 / developer 揀）：(a) 字尾移去續聽條上面另一行；(b) 頂行放唔落只截「N 個短篇」、保留「新短篇 X 上架」；(c) 上架字加入 tile `aria-label`（順手解 S-700）

### 🟢 / Observation

- S-705 844×390 冇續聽時右下角字尾截走最尾 1 字（137/147px）；可仿窄欄下架字出短版（backlog）
- Observation：390×844 疊卡灰格 script 撳中上面嘅卡（`elementFromPoint` 唔喺灰格），focus / URL 冇郁；e2e 用 390×1400 + `DramaShelf.test.tsx` 已鎖。chip 虛線喺 `.soon::before`（`ArcPicker.module.css:135`），script 量 element `borderStyle` 誤判。兩個都唔計
- 待用戶確認（唔當 finding）：直版成套劇下架字接喺「繼續收聽」同一行後面（390×844：「初戀無限次 · 第 2 集 · ⏳ 19/12 下架」）

已驗 pass（3 viewport 一致）：H2 字尾、左上角琥珀字、新劇灰格排最尾 + `aria-disabled` + 撳冇反應、chips 未上架排最尾 + 撳唔揀中、一覽表「即將上架」組喺最底、集數兩批摺埋（讀屏「第 11 至 20 集，03/12（四）上架，未可以收聽」）、收藏「已下架」灰行 `aria-disabled` + 撳冇反應、舊 URL 返主頁 + Toast「呢套劇已下架」、W-531 書架次序 30/11 vs 01/12 一樣、`pageerror` 0。E1 由 CI e2e + unit 覆蓋。

## Freeze

- S1 freeze：bookmark、catalog-data、home、mini-player、player-core、pwa-shell、show-today-page、ui-foundation
- 唔 freeze：`coming-soon`（fail）、`drama` / `card-zoom`（W-533 修改會掂 `DramaShelf/DramaTile*.tsx`、`DramaShelf.module.css`）

## 建議補測

- W-533 修完：DramaShelf unit / e2e 加 1300×800 + 844×390「有續聽 + 快將下架 + 即將上架」格，斷言字尾睇得到（或讀屏名有上架日）

```handoff-receipt
agent: quality-assurance
task: S1 coming-soon (P8 #6) v1.28.0 @ 5eb23cf
stage: S1
status: fail
next_action: invoke_developer
findings: { critical: [], warning: [W-533], suggestion: [S-705] }
tickets: [CUI-0021]
context: >
  CI 42072852107 @ 5f2e550 cited. Home tile upcoming tail ellipsized to "3"/"3." with continue bar + leaving tag
  (844x390, 1300x800), aria-hidden so lost for SR too. Everything else passes incl. W-531. Frozen 8 chains;
  coming-soon / drama / card-zoom left open. Pending user decision (not a finding): portrait leaving text inline.
report: .proj-docs/qa/2026-11-05_qa_coming-soon.md
```

---

# Re-test 2 — S1 — `9dda550`（code = `a13ec07`）— ✅ pass

- 範圍：`a27d5a0..9dda550` — `f37aa6d`（W-533 / CUI-0021、S-700、S-705、全集 chip 下架字）、`a13ec07`（`useTightCount`）；其餘 docs
- Ledger（`impact --since ab58d0d`）：SKIP 2（home、pwa-shell frozen @5eb23cf）/ REVERIFY 8（bookmark、card-zoom、catalog-data、drama、mini-player、player-core、show-today-page、ui-foundation；STALE 檔全部係今次 fix 改嘅 `useDramaPage.ts` `useHomeDramaItems.ts` `SeriesListColumn.tsx` `DramaTile.tsx` `zh-HK.ts` 等）/ UNCOVERED → `coming-soon`
- 用戶決定（取代上面「待用戶確認」）：直版成套劇快將下架改喺「全集」chip 出「⏳ X」，「繼續收聽」行唔加字；格位唔夠「N 個短篇 ·」成段收埋、上架字優先（(b)+(c)）

| Command                                                                                                                                          | Result                                     | Time |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ---- |
| CI [42080750515](https://github.com/dcwhung/903-player/actions/runs/42080750515) @ `a13ec07`（lint / unit / build / e2e，含 `checkReleaseNote`） | success（引用）                            | —    |
| `npm run build -- --mode e2e` + `npx vite preview --port 4181`                                                                                   | ok                                         | 25s  |
| Playwright：主頁角落字 3 viewport × 有 / 冇續聽；全集 chip 3 viewport × 聽緊 / 未聽                                                              | 全部符合                                   | 60s  |
| 上次 scratch smoke 重跑（灰格 / chips / 一覽表 / 集數 / 收藏 / 舊 URL / W-531）                                                                  | 冇新 FAIL（淨係下面 4 個已知 script 誤判） | 70s  |

更正上次 Runs 行：實際係 49 PASS / 2 FAIL（W-533，844×390 同 1300×800）/ 4 script 誤判（灰格 1 + chip 虛線 3），唔係「61 / 1 / 2」；結論唔變。

## W-533 / CUI-0021 驗收（「E2E 即將劇場」格，時鐘 30/11 22:30）

| Viewport | 續聽 | 角落見到嘅字               | 短篇數                          | 上架字 cw/sw | 喺格內 |
| -------- | ---- | -------------------------- | ------------------------------- | ------------ | ------ |
| 390×844  | 有   | 3 個短篇 · 新短篇 後日上架 | 出齊 53/53                      | 80/80        | ✅     |
| 390×844  | 冇   | 3 個短篇 · 新短篇 後日上架 | 出齊                            | 80/80        | ✅     |
| 844×390  | 有   | ⏱ 後日上架                 | 成段收埋（`data-count-hidden`） | 58/58        | ✅     |
| 844×390  | 冇   | 3 個短篇 · ⏱ 後日上架      | 出齊                            | 58/58        | ✅     |
| 1300×800 | 有   | ⏱ 後日上架                 | 成段收埋                        | 87/87        | ✅     |
| 1300×800 | 冇   | 3 個短篇 · ⏱ 後日上架      | 出齊                            | 87/87        | ✅     |

- 「·」係 `.metaCount::after`，跟短篇數一齊收埋；冇半截短篇數、冇孤零零「·」（截圖 scratchpad `shots2/*-home.png`、`shots2/tile-*-nocont.png`）
- 讀屏名（3 viewport 一樣）：「E2E 即將劇場，部分短篇 19/12（六）下架，新短篇 02/12（三）上架」（S-700 ✅）
- 左上角下架字窄格短版「⏳ 19/12」完整（cw = sw）
- → **W-533 已修，CUI-0021 close**

## 全集 chip 下架字（`e2e-leaving`，成套劇 19/12 下架）

- 390×844 聽緊：「☰ 全集 ⏳ 19/12」，讀屏「全集，19/12（六）下架」；「繼續收聽：戀愛二分一 · 第 1 集」冇下架字 ✅
- 390×844 未聽：chips 上面「呢套劇 19/12（六）下架」取代標籤，chip 冇小標 ✅
- 844×390 / 1300×800：chip 小標收埋（讀屏名照有），唱片下面「呢套劇 19/12（六）下架」✅

## Findings

- 冇新 🔴 / 🟡。S-706（`useTightCount` 字變格唔變唔重量）review backlog 🟢，唔 block；S-707 / S-708 同樣 backlog

## Freeze

- S1 freeze @9dda550：`coming-soon`（新）、drama、card-zoom、bookmark、catalog-data、mini-player、player-core、show-today-page、ui-foundation；home、pwa-shell SKIP（frozen @5eb23cf）

## 建議補測

- none（`checkReleaseNote` e2e 已鎖三個 viewport；S-706 修嗰陣加 unit）

```handoff-receipt
agent: quality-assurance
task: S1 re-test 2 coming-soon (P8 #6) v1.28.0 @ 9dda550
stage: S1
status: pass
next_action: proceed
findings: { critical: [], warning: [], suggestion: [] }
tickets_closed: [CUI-0021]
context: >
  CI 42080750515 @ a13ec07 cited. W-533 fixed: release note whole in 3 viewports, arc count shown whole or
  hidden whole, no stray dot; SR label has release date. 全集 chip leaving tag per user decision. Frozen 9
  chains incl. coming-soon; home / pwa-shell SKIP. S-706..S-708 backlog only.
report: .proj-docs/qa/2026-11-05_qa_coming-soon.md
```

---

# Re-test 3 — S1 — `1bb06b6`（code = `62e0a85`）— ✅ pass

- 範圍：`8477b12..1bb06b6`：`e7b981a`（merge P7 `feature/bookmark/episode`：第三格 A / B / C 三態 + 最近收聽 tab，`plans/bookmark.md` AC-9）、`62e0a85`（用戶新決定：同日下架只喺左上角出；「繼續收聽」條位唔夠成段收埋下架字、集名優先）；其餘 review docs
- 喺獨立 worktree（`.claude/worktrees/qa-p8`，detached @ `1bb06b6`）做，commit 只 add 指定檔
- Ledger（`impact --since ab58d0d`）：SKIP 0 / REVERIFY 11（全部鏈：merge 帶入 P7 新改動，加 `62e0a85`）/ UNCOVERED 3（`useHideWhenTight.ts`、`icons/noticeIcons.tsx`、`icons/strokeIcon.tsx` → 入 `coming-soon`）；ledger 有兩邊 parent 嘅舊 freeze 行，今次逐條鏈用兩邊 scope 嘅聯集重新 freeze
- 用戶新決定已寫入 `plans/coming-soon.md`

| Command                                                                                                                                      | Result                                                                     | Time  |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----- |
| CI [42107452301](https://github.com/dcwhung/903-player/actions/runs/42107452301)（#95）@ `62e0a85`（lint / unit / build / e2e）              | success（引用）                                                            | —     |
| CI #93 [42106939629](https://github.com/dcwhung/903-player/actions/runs/42106939629) @ `34e4e54`                                             | failure：reviewer commit 帶錯 rename，`62e0a85` 已修；只記錄，唔當 finding | —     |
| `npm run build -- --mode e2e` + `npx vite preview --port 4187`                                                                               | ok                                                                         | 25s   |
| Playwright：(1) 第三格 A / B / C × 3 viewport；(2)(3)(4) 繼續收聽條同日 / 唔同日 × 3 viewport；(5) re-test 2 嘅 W-533、全集 chip、smoke 重跑 | 全部符合（下面 2 個 script 誤判之外）                                      | 4 min |

## (1) P7 tab 喺 P8 上面（390×844、844×390、1300×800 一致）

- A 有收藏 → 第三格「我的收藏」；C 冇收藏冇記錄 → 冇第三格 ✅
- B 冇收藏、12 集記錄（11 集 sample + 初戀無限次第 2 集）→ 第三格「最近收聽」，清單 10 行；逐行 `scrollIntoView` 後第 1–10 行（包括第 7–10 行）全部喺捲動區可視範圍入面，冇橫向溢出 ✅
- B 嘅 LR1：行見到「19/12 下架」，讀屏「開啟 E2E 即將劇場 初戀無限次 · 第 2 集，19/12（六）下架」✅

## (2)–(4) 主頁格下架字（時鐘 30/11 22:30）

| 情況                                           | 左上角                                 | 繼續收聽條（見到）                                              | 讀屏（繼續收聽）         |
| ---------------------------------------------- | -------------------------------------- | --------------------------------------------------------------- | ------------------------ |
| 同日：即將劇場 初戀無限次第 2 集（短篇 19/12） | 「部分短篇 19/12 下架」/ 窄格「19/12」 | 冇下架字                                                        | 冇下架日 ✅              |
| 同日：下架劇場 成套 19/12，第 2 集             | 「19/12 下架」/「19/12」               | 冇下架字                                                        | 冇下架日 ✅              |
| 唔同日：即將劇場 我心不死第 3 集（01/12）      | 「19/12」                              | 390×844「⏳ 明日下架」完整（67/67）；844×390、1300×800 成段收埋 | 「…，01/12（二）下架」✅ |

- 集名：390×844 靜止完整；窄格同闊橫版集名太長，係 main 已經有嘅 Marquee 捲動（`DramaTile` 繼續收聽一向用 `Marquee`），有冇下架字嘅情況闊度一樣（141px），即係收埋咗嘅下架字冇霸位 ✅
- 右上角：有續聽時見到「⏱ 後日上架」，短篇數成段收埋，冇「3·」或者單獨一粒「·」✅

## (5) 冇回歸

- W-533：3 viewport × 有 / 冇續聽，上架字 `clientWidth = scrollWidth`、喺格入面；讀屏名有「新短篇 02/12（三）上架」✅
- 全集 chip：直版聽緊「全集 ⏳ 19/12」，讀屏「全集，19/12（六）下架」；未聽改講「呢套劇 19/12（六）下架」；橫版 chip 小標收埋，唱片下面有字 ✅
- smoke（灰格、chips、一覽表、集數清單、收藏 tab、舊 URL + Toast、W-531）冇新 FAIL；`pageerror` 0
- script 誤判（同之前一樣，唔計）：390×844 疊卡灰格撳中上面嘅卡；chip 虛線喺 `::before`

## Findings

- 冇新 🔴 / 🟡 / 🟢

## Freeze

- S1 freeze @1bb06b6：全部 11 條鏈（coming-soon、bookmark、drama、card-zoom、catalog-data、home、mini-player、player-core、pwa-shell、show-today-page、ui-foundation）

```handoff-receipt
agent: quality-assurance
task: S1 re-test 3 coming-soon (P8 #6, merged P7 tabs + 62e0a85) v1.28.0 @ 1bb06b6
stage: S1
status: pass
next_action: proceed
findings: { critical: [], warning: [], suggestion: [] }
context: >
  CI 42107452301 @ 62e0a85 cited (run #93 red on 34e4e54 noted, fixed). P7 tab states A/B/C, LR1 and rows
  7-10 reachable in 3 viewports. Same-day leaving only in corner, different day both (strip hides when tight,
  name priority, SR keeps date). No "3·". W-533 / 全集 chip no regression. All 11 chains re-frozen at S1.
report: .proj-docs/qa/2026-11-05_qa_coming-soon.md
```
