# Code Review — 2026-11-18 — P10 lane 4：Duo 打開・橫內頁兩欄對齊摺位

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`feature/layout/iphone-duo` commit `b1ba0e7`，PR → `release/v2.0.0`；3 檔 +66
- Tier：T2；Design Origin：`mockup: _mockups_/iphone-duo/index.html`（打開・橫 方案 A，`new-ol-*.webp`）
- Review Item ID：**S-1127 – S-1128**（冇 C / W）
- 總評：**✅ pass（100 / 100）**。876×612 三頁分隔線喺 x = 438，現有裝置零改變；兩條 🟢 建議喺同一個 PR 清

## Hard Gates

all pass（lint、`npm test` 4993、`npm run e2e` 992 / 0（三頁摺位 check 見 log 768–770）、`npm run e2e:visual` 180 / 180 引用 developer 喺 `b1ba0e7` 嘅 log；自己跑 diff 相關 unit：`duoHinge` + `deviceQueries` + `landscapeBreakpoint` 54 / 54；`eslint`、`prettier --check` 改動檔通過）。Coverage：純 CSS，lock test 鎖住宣告；version bump n/a（plan：S3 後先 bump 2.0.0）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                 |
| -------- | ------- | ------- | -------------------- |
| 正確性   | 25      | 25      | S-1127（🟢，唔扣分） |
| 安全性   | 20      | 20      |                      |
| 可維護性 | 20      | 20      |                      |
| 測試覆蓋 | 15      | 15      | S-1128（🟢，唔扣分） |
| 性能     | 10      | 10      |                      |
| 代碼風格 | 10      | 10      |                      |
| **總分** | **100** | **100** |                      |

**結果：✅ pass**

## 逐項核對（委託清單）

- **欄闊計算**：`.scope` padding 8 + `.fixed` padding-left `env(safe-area-inset-left)`（=0）+ 第一欄 `50vw − 8` = 438；`.listColumn` 右邊框喺佢自己個 box 入面，所以分隔線 = 438。右欄 = 860 − 430 − gap 20 − 把手 30 = 380px
- **唱片**：`--player-disc-width = min(380 × 0.88, 380 − 2 × 52) = 276`，高度唔係限制；夾喺 `--landscape-disc-min` 120 之上，ⓘ 兩邊 `--gauge-info-room` 照留（截圖 `ol-show.png` 進度圈 517–779，喺 458–838 入面）
- **今日節目卡**：`min(100%, 276 + 2×16 + 2×24 = 356)` → 356（窄過欄闊 380）；截圖卡 486–810，置中，冇貼邊
- **全集表 / 資料表**：ArcSheet docked 喺 `.listBody`（左欄），右邊停喺分隔線前（437），左 / 底伸出邊框 OK（`ol-drama.png`）；ItemInfoSheet docked 喺右欄，右邊保留把手位係 lane 1 嘅既定做法，唔受呢個 diff 影響
- **載入中 / 搵唔到**：`.playerColumn:not(:has(~ .listColumn))` 用 `grid-column: 1 / -1`，跨兩條 track，固定第一欄闊唔影響
- **vw 陷阱**：`html` / `body` / `#root` overflow hidden，iOS 冇 classic scrollbar，`50vw` = 畫面闊；`--duo-edge-inset` 已扣；query 範圍外（iPad、手機打橫）唔 match（`deviceQueries` lock + visual 180 / 180）
- **e2e locator**：`document.querySelector('ul, ol')` 向上搵 `border-right-style: solid`；搵錯會變 `null` → FAIL（唔會假 PASS），但仍然靠 DOM 次序（見 S-1128）

## 🟢 Suggestion / Observation

- **S-1127** `Page.module.css` Duo 打開・橫 `.fixed`：欄闊冇扣 `.fixed` 嘅 `padding-left: env(safe-area-inset-left)`；真機如果報左安全區 L，分隔線會去到 438 + L。L1：plan 第 73 行寫明 `calc(50vw − 左 padding)`，mockup Q8「靠安全區，真機有報就自動避開」；L2：reviewer hook 唔畀起瀏覽器，未實測（Simulator 冇安全區數值）；L3：grid 計法推斷。改做 `calc(50vw - var(--duo-edge-inset) - env(safe-area-inset-left))`（env = 0 時結果一樣，lock test 同步改），建議同一個 PR 修
- **S-1128** `e2e/duo.mjs` `checkOpenLandscapeHinge`：locator 靠「第一個 `ul, ol` 喺左欄」；播放器欄係 DOM 第一個，日後右欄加 list（指示點、ⓘ 表）就會 FAIL。建議直接搵 `main > [class*="listColumn"]`（或者加 `data-list-column`）量右邊

## ✅ 做得好嘅地方

- 改動收窄到一個 query 區塊，同 `DUO_OPEN_LANDSCAPE_QUERY` 一字不差，現有裝置 visual 180 / 180
- 註解寫清楚點解唔用 50%（右邊把手預留位），lock test 鎖住唔好改返百分比
- e2e 三條路由都量，連播放掣喺右半一齊驗

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: n/a
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/layout/iphone-duo"
context: "P10 lane 4 @b1ba0e7: Duo open-landscape show/today/drama divider at x=438 (e2e 3/3, visual 180/180); only S-1127 (subtract env(safe-area-inset-left) from column 1) and S-1128 (stable list-column e2e locator) to clear in-session in this PR; merge target is release/v2.0.0 (no develop); report committed locally, not pushed"
```
