# Code Review — 2026-11-16 — 手機打橫開 sheet 成頁彈上彈落

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/admin-player-fixes-6fzdtw`，`9a0ca6f..3c4f3bd`（`cf918e4` fix + `3c4f3bd` bump player 1.37.2）
- Tier **T1**（2 個 CSS 屬性 + 1 個 hook 兩行改動 + 測試）；Design Origin：`baseline`（冇新 layout，只改 overflow / focus 行為）
- Review Item ID：**W-779**、**S-1095**（冇 C）
- 總評：**⚠️ warn（95 / 100）**。改動本身細、準、兩個 root cause 各自有 unit + e2e 鎖住，新 e2e 三段喺 CI 全綠（scrollTop 0、可捲範圍 +0px）。但 HEAD 嘅 CI e2e 紅（W-779，舊問題，唔係呢個 diff 引入），未綠唔可以 merge。

## Hard Gates

all pass —— `npx tsc -b --noEmit`（apps/player）exit 0；`npm run lint`（eslint + `prettier --check .`）exit 0；`npm test -- Sheet sheetMotion ItemInfo ArcSheet`：11 files / 124 tests 綠；`vitest related useSheetBehaviour.ts`：18 files / 260 tests 綠；改動 hook 兩個 focus 分支都有新 test 行到；冇新依賴。E2E 冇跑（Hard Rule #7），用 CI run 43943116535。Version 1.37.1 → 1.37.2（patch，`package-lock.json` 同步）。

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                        |
| -------- | ------ | ------- | ------------------------------------------- |
| 正確性   | 25     | 25      | 兩個 root cause 都有 L2 證據同對應修正      |
| 安全性   | 20     | 20      | 純 CSS / focus 行為                         |
| 可維護性 | 20     | 20      | S-1095（🟢）                                |
| 測試覆蓋 | 10     | 15      | W-779（CI e2e 紅，同 Developer 報告唔一致） |
| 性能     | 10     | 10      |                                             |
| 代碼風格 | 10     | 10      |                                             |
| **總分** | **95** | **100** |                                             |

**結果：⚠️ warn**（分數夠 pass，但 W-779 令 branch 未可以 merge）

## 🟡 W-779 — CI e2e 紅：`劇集資料：✕ 喺 banner 右上角`

- **L1**：`.claude/CLAUDE.md` §Ledger merge conflict「等 CI 綠先 merge」；Developer 報「full player e2e 925 PASS」同 CI 唔一致
- **L2**：CI run 43943116535（`3c4f3bd`）E2E job `1 E2E check(s) failed`，失敗項係 `apps/player/e2e/itemInfo.mjs:320` `checkArcPick` → `checkBanner(env, sheet, '劇集資料')`；base `9a0ca6f` 嘅 run 43939870371 同一項 FAIL（main push 唔跑 e2e，所以 #259 merge 落 main 冇見到）。同一個 check 喺減少動態版本 PASS
- **L3**：`checkArcPick` 用非減少動態，`isShown` 之後即刻分開攞 banner 同 ✕ 嘅 `boundingBox()`；#259 加咗 sheet slide-in 之後兩次量度落喺動畫唔同時間點，`close.y >= b.y` 唔一定成立 → 時序 flake（本地 Chromium 快啲所以過）
- 位置：`apps/player/e2e/itemInfo.mjs:301-321`（`checkBanner` 92-116）
- 方案 A（推薦）：`checkArcPick` 喺 `checkBanner` 前等表 settle（例如等 `getAnimations()` 完 / `waitForTimeout(SETTLE_MS)`，同其他 section 一致）。Trade-off：慢 ~0.6 s，但同現有 `SETTLE_MS` 慣例一致
- 方案 B：`checkBanner` 一次過喺 `evaluate` 入面同時量 banner 同 ✕（同一 frame）。Trade-off：改共用 helper，影響 5 個 call site，但以後唔使逐個等

## 🟢 Suggestion / Observation

- S-1095 `ArcSheet.module.css:59-63`：新 `clip` 註解同上面 `.docked` 原有註解係兩段相連 block comment，可以併入同一段（ItemInfoSheet 已經咁做）
- Observation（唔落 backlog）：`.docked` `overflow: clip` 令 ArcSheet docked（`inset: 0`）嘅 `--shadow-floating` 全部被裁、ItemInfoSheet 左右陰影都貼欄邊被裁 —— Developer 已講明 trade-off，`overflow-clip-margin` Safari 未支援，唔建議改
- Observation：焦點還原用 `preventScroll`，opener（ⓘ / 全集）都喺固定頁頭 / 欄頂，唔會出現焦點喺畫面外嘅情況

## ✅ 做得好嘅地方

- Root cause 拆得清楚（focus 捲祖先 vs 滑緊嘅表撐大捲動範圍），各自一個最細修正，冇用 `scrollTo(0,0)` 之類嘅補鑊
- e2e `watchPageScroll` 喺動畫期間用 scroll 事件 + 輪詢量所有祖先，連「閂返」都量；CI 實測 scrollTop 0 / +0px
- `sheetMotion.node.test.ts` 用 CSS 原文鎖住兩個 `.docked` 嘅 `overflow: clip`，日後有人改返 `hidden` 會即刻紅
