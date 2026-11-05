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
