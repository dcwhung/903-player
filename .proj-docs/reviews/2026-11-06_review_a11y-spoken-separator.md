# Code Review — 讀屏分隔符 / 共用 VisuallyHidden（S-723 / S-724 / S-725）

- 日期：2026-11-06
- 審閱者：Code Reviewer（agent）
- 目標：branch `claude/amazing-volta-6qrm4p`，`origin/main` `b57eadd` → `f2ddac6`（5 commits，v1.28.3 → v1.28.4）
- Tier：T2（產品代碼 a11y 改動 + e2e 斷言改寫）
- 總評：三個 backlog 項目全部落實，做法同 S-717 / S-718 一致（同一句字典、讀屏傳 `sep = common.spokenSeparator`）。冇 🔴 / 🟡。仲有三處 `NowPlaying` 未傳讀屏版（舊有，唔係今次引入），記入 backlog

## Hard Gates

all pass：`npm run lint`（eslint + `prettier --check .`）exit 0；`tsc -b` exit 0；相關 unit 17 個檔 150 個 test 全綠（VisuallyHidden、SpokenText、Marquee、NowPlaying、TodayShowList、AppVersion、SavedTab、TodayPage、DramaPage、i18n）；冇新增依賴（security n/a）。e2e 冇跑（屬 QA / CI）；CI run 42296770271 @ `f2ddac6` review 時仲跑緊

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                    |
| -------- | ------- | ------- | ------------------------------------------------------- |
| 正確性   | 25      | 25      | 讀屏字同畫面字逐句對返字典，`aria-hidden` 位置啱        |
| 安全性   | 20      | 20      | 冇涉及                                                  |
| 可維護性 | 20      | 20      | 隱藏樣式剩一份；`FirstLine` 抽出嚟，`NowPlaying` 冇變長 |
| 測試覆蓋 | 15      | 15      | 元件 unit red-first；頁面斷言後補（已知，可接受）       |
| 性能     | 10      | 10      | 多一粒 span，冇影響                                     |
| 代碼風格 | 10      | 10      | lint / prettier 全過                                    |
| **總分** | **100** | **100** |                                                         |

**結果：✅ pass**

## 逐項核對（L1）

- S-723（`2026-11-06_review_copy-grill-ui-polish.md`）：`UnavailableRow` 畫面「15:10 · 未上架」`aria-hidden`，讀屏「15:10，未上架」，用 `SpokenText` + `today.timeWithStatus` 同一句字典 ✅。可播放嗰啲行喺 `<button aria-label>` 入面，本身唔會讀到「·」，唔使改
- `NowPlaying` `spokenLabel`：今日頁用 `formatSpokenDate`（E1：讀屏一律「30/11 星期一」）+ `spokenSeparator`；連線中唔用讀屏版（連線中句冇「·」）✅。`Marquee` `hidden` 只加 `aria-hidden`，冇改捲動 / 量度 ✅。`SeriesDramaPage` 同類句一併修，合理延伸
- S-724：`VisuallyHidden.module.css` 係 `SpokenText.module.css` 嘅 rename（樣式逐字一樣），`SavedTab` / `AppVersion` 刪走嘅 `.srOnly` 同佢 6 條 property 完全相同；`removeHint` 嘅 `id` 照傳，`aria-describedby` 唔受影響 ✅。`MiniPlayer` `.srOnly` 有 `:focus-visible` 顯示返出嚟，唔係同一個模式，留低啱
- S-725：`e2e/comingSoon.mjs` 改為「顯示緊嗰步放得落、鬆一步放唔落」，`fits` 計法同 `useHideWhenTight` 嘅 `fitsWithoutOverflow` / `fitsInParent` 一樣，selector（`data-corner-notes` / `data-corner`）同 hook 掛嘅元素對得上；量完即刻還原 `data-tight`，第二次量仍然要一樣，loop 檢查冇失 ✅。比舊斷言更嚴：收多咗一步都會 fail
- Version bump 1.28.4，`package-lock.json` 同步 ✅

## Design Origin

`none-required` 可以接受：diff 入面嘅新 class `.hidden` 只係搬返舊 `.srOnly`（git 認做 rename，樣式一字不改），冇新 layout、冇可見改動。PR description 要寫明「`VisuallyHidden` `.hidden` = moved `.srOnly`, no visual change」，免得下一個 reviewer 當新 className

## 🔴 / 🟡

冇。

## 🟢 / Observation

- S-735 同類未修：主頁播放卡（`useHomeCardGauge` → `dramaEpisodeLabel` 有「·」、`formatDateLabel` 讀「（三）」）、`ShowPage.tsx:64`、`DailyDramaPage.tsx:54` 嘅 `NowPlaying` 仲係讀畫面字；舊有行為，建議開 ticket 一次過傳 `spokenLabel`
- S-736 `NowPlaying` `FirstLine`：「已暫停」/「繼續收聽」狀態 + `spokenLabel` 未有 unit test（現時只測 `playing`）
- S-737 `e2e/comingSoon.mjs` 抄咗一份 `fits` 計法（`evaluate` 入面 import 唔到）；建議喺 `useHideWhenTight.ts` 註解指返呢度，改一邊記得改另一邊
- Observation：`TodayPage.test` / `DramaPage.test` 頁面斷言喺實作之後先加（已知）；元件層有 red-first，接受
- Observation：CI run 42296770271 @ `f2ddac6` review 時 in_progress，merge 前要綠

## ✅ 做得好嘅地方

- 讀屏版同畫面版用同一條字典 key，只換 `sep` / `date`，唔會兩句走樣
- e2e 由「寫死邊個 viewport 出邊款字」改成驗 invariant，字型唔同都穩定
- `MiniPlayer` 例外有理由留低，冇硬塞入共用元件

## Handoff receipt

```
HANDOFF_RECEIPT
agent: code-reviewer
stage: review
status: pass
score: 100
hard_gates: lint=pass, type=pass, unit=pass (17 files / 150 tests, diff-related), coverage=pass, no_critical=pass, security=n/a (no new deps), ci_same_sha=pending (run 42296770271 @ f2ddac6 in_progress)
findings: C=0, W=0, S=3 (S-735, S-736, S-737), observation=2 (page-level tests after impl; CI pending)
next_action: wait CI run 42296770271 green -> open PR (Design Origin: none-required, note .hidden is moved .srOnly) -> QA S1 (chains: today page / drama / ui-foundation a11y)
context: S-723 / S-724 / S-725 all fixed and match zh-HK.ts spoken-separator rule; S-735 backlog = remaining NowPlaying callers (home card, ShowPage, DailyDramaPage) still read screen label
report: .proj-docs/reviews/2026-11-06_review_a11y-spoken-separator.md
```
