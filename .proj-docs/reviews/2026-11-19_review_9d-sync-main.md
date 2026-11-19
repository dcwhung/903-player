# Code Review — 9d 同步 main（v2.0.1、v2.0.2）入 release/v2.1.0

- 日期：2026-11-19
- 審閱者：Code Reviewer（subagent，獨立）
- 目標：PR #288 `chore/sync/main-into-release-v2.1.0` → `release/v2.1.0`，HEAD `2fd49c90`（merge `9250cdc6`，parents `dd537084` release / `9b59ed24` main；加 `2fd49c90` 刪 HomeView 播放卡選單規則）
- Tier：T2（merge 同步 + 刪一條死 CSS 規則）
- 總評：merge 冇丟任何一邊嘅改動；兩邊都改過嘅 4 個檔（`tokens.css`、`zh-HK.ts`、`squareDrama.mjs`、ledger）解法正確。Ledger 除咗交畀 QA 嘅 6 行冇少行。`2fd49c90` 刪嘅規則喺 v2.0.2 之後確實冇路徑用到。冇 🔴 / 🟡 / 🟢

## Hard Gates

all pass。

- Lint：改咗嘅 `SleepTimer/`、`zh-HK.ts` 用 `eslint` 0；`tokens.css`、`SleepTimer/`、`zh-HK.ts` 跑 `prettier --check` 過
- Type：`apps/player` 嘅 `tsconfig.app.json`、`tsconfig.node.json`、`tsconfig.scripts-test.json` 逐個 `tsc --noEmit -p` 都係 exit 0
- Tests（diff 相關）：`SleepTimer/`、`ListSheet/squareSheetSize`、`HomePageSquareHandle`、`homeLayoutMode`、`i18n` 共 11 檔，93 tests 全綠。另外將 `SleepTimerSheet.module.css` 換返 `9250cdc6` 版本，新 test「should keep no HomeView override…」會 fail（紅），換返新版又綠，證明條 test 鎖得住
- Coverage：`2fd49c90` 淨係刪 CSS，有 node test 鎖住；merge 冇新增邏輯
- Security：冇新依賴（`package-lock.json` 淨係改 main 嗰邊嘅 version）
- 引用 developer 證據：`npm test` 5371、TZ HK player 3217、full e2e 1137/0（@`9250cdc6`）、`e2e:visual` vs `origin/main` 174/234 diff 全部喺 9d 准許範圍（show-day / today-day 0）。本輪冇重跑 full suite / e2e（Hard Rule #7）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                     |
| -------- | ------- | ------- | ---------------------------------------- |
| 正確性   | 25      | 25      | 逐檔三方比對（見下）                     |
| 安全性   | 20      | 20      | 冇新依賴，淨係 UI                        |
| 可維護性 | 20      | 20      | 死規則刪咗，冇殘留 `--list-sheet-height` |
| 測試覆蓋 | 15      | 15      | 新 node test 證明到由紅轉綠              |
| 性能     | 10      | 10      |                                          |
| 代碼風格 | 10      | 10      |                                          |
| **總分** | **100** | **100** |                                          |

**結果：✅ pass**

## 核對紀錄（L2）

1. **Merge 冇丟嘢**（merge-base `6eae3cec`）：
    - main 單邊改咗嘅檔，喺 `9250cdc6` 嘅 blob 全部同 `9b59ed24` 一樣；release 單邊改咗嘅檔，全部同 `dd537084` 一樣；冇任何檔係兩邊都冇改、但 merge 改咗
    - `git diff 9b59ed24 9250cdc6 --stat` = 9d 檔（120 檔）；`git diff dd537084 9250cdc6 --stat` = #285 + #286（46 檔）。兩個數同預期一致
2. **兩邊都改過嘅檔**：
    - `tokens.css`：`main → merge` 嘅 diff 淨係多咗 9d 嘅 `--sleep-timer-*`（11 個）同 `--mini-progress-ring`。`--square-sheet-max-height` 用 main 版本；`--list-sheet-height` 照 main 刪走。`git grep` 確認成個 app 只係 `squareSheetSize.node.test.ts` 仲提到佢（用嚟斷言佢冇咗）
    - `zh-HK.ts`：`sleepTimer` block（release）同 `homeCard.reopenPlaying`（main）兩樣都喺度，兩邊改嘅位置唔重疊
    - `squareDrama.mjs`：main 嘅 `squareSheetSized` / `infoBannerSized` / `checkDaily` 全部保留，release 嘅 `:not([aria-label^="休眠"])` 都保留。main 新加嘅 e2e 冇第二個 `header` 入面 `aria-haspopup="dialog"` 嘅 selector 要加月亮過濾
3. **Ledger**（S-866）：比對 `dd537084` / `9b59ed24` / `9250cdc6` 每行嘅 chain + stage + path：
    - 兩邊 parent 有、merge 冇嘅，剛好係 coming-soon S1 同 ui-foundation S1 嘅 `zh-HK.ts`、`tokens.css`，加 drama S1 同 show-today-page S1 嘅 `squareDrama.mjs`，即係 6 行
    - merge 每一行都原封不動嚟自其中一個 parent，冇新造嘅行
    - `2fd49c90` 冇改 ledger。HEAD 上面 S1 / S2 sha 對唔上嘅，淨係 mini-player S1 嘅 `SleepTimerSheet.module.css` 同 `sleepTimerStyles.node.test.ts`，屬預期，QA 要重新驗
4. **`2fd49c90` 刪嘅規則真係冇用**：
    - `data-side='true'` 淨係嚟自 `SleepTimerEntry` 嘅 `placement === 'card'`，而呢個值只喺 `CardHeader` 出現 → `HomePlayerCard` → `HomeWideCard`
    - `HomeWideCard` 只喺 `HomeWide` 嘅 `mode === 'split'` 先 render
    - `HomePage` 傳 `handleOnly: useMediaQuery(SQUARE_QUERY)`，而 `homeLayoutMode` 喺 `handleOnly` 時永遠唔會返 `split`
    - 被刪規則用嘅 media query 同 `SQUARE_QUERY` 逐字一樣，所以呢條規則冇可能再生效
    - 預設嘅 `.overlay[data-side='true']`（闊版卡用嘅 `position: absolute`）照留

### Observation（唔扣分、唔使喺本 PR 做）

- O-1：v2.0.2 之後 HomeView 主頁淨係出把手，主頁本身冇月亮入口，亦冇 timer 進度條；要撳把手入播放頁先見到頁頭個月亮。Plan「入口」一行冇列 HomeView 主頁，所以冇違反 AC（冇 L1）。建議 main agent 喺 9d 收尾時同用戶提一句，問佢接唔接受

## ✅ 做得好嘅地方

- Conflict 解法完全冇手寫新內容：每一行都揀自其中一個 parent，ledger 都係用 script 合併
- `2fd49c90` 刪死規則嘅同時加咗反向 test 鎖住，唔會有人加返

## 修訂代碼

唔適用（冇 🔴 / 🟡）。
