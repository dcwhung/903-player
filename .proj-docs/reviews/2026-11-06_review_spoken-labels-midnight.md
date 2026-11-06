# Code Review — 讀屏「現正播放」/ 香港午夜轉日 / backlog 清理（S-735–737、S-704、S-701、S-714、S-715、S-719）

- 日期：2026-11-06
- 審閱者：Code Reviewer（agent）
- 目標：branch `claude/amazing-volta-6qrm4p`，`origin/main` `dc35f44` → `01c2016`（4 commits，v1.28.4 → v1.28.5）
- Tier：T2（產品代碼：讀屏字、午夜 timer hook、細清理）
- 總評：九個 backlog 項目全部對返原 finding 落實；讀屏版沿用同一條字典 key 只換 `sep` / `date`，同 `zh-HK.ts` 檔頭規則一致。午夜 timer 做法正確，有前台補救。冇 🔴 / 🟡；一個 🟢（主頁播放卡讀屏字冇斷言）

## Hard Gates

all pass：`npx eslint .` exit 0；`tsc -b --noEmit` exit 0；改動檔 `prettier --check` 全過；`npx vitest related --run <changed src>` 88 個檔 1411 個 test 全綠；coverage（改動檔 + 相關 test）：`dramas.ts` / `date.ts` / `availability.ts` / `SeriesDramaPage.tsx` lines 100%，`useHkToday` / `NowPlaying` / `ArcPickerNotices` / `useHomeCardGauge` 100%；冇新增依賴（security n/a）。e2e 冇跑（屬 QA / CI；`e2e/comingSoon.mjs` 淨改註解）；CI @ `01c2016` review 時仲跑緊

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                       |
| -------- | ------- | ------- | ---------------------------------------------------------- |
| 正確性   | 25      | 25      | 讀屏句逐句對字典；午夜 ms 計法 + 提早觸發會自我修正        |
| 安全性   | 20      | 20      | 冇涉及                                                     |
| 可維護性 | 20      | 20      | `ResumeWithLeaving` 改用 Pick；S-737 兩邊互指註解          |
| 測試覆蓋 | 15      | 15      | selector / hook / ArcPicker red-first；S-736 純補 coverage |
| 性能     | 10      | 10      | 每頁一個 timer；`arcPickerLabel` 多叫一次，可忽略          |
| 代碼風格 | 10      | 10      | lint / prettier 全過                                       |
| **總分** | **100** | **100** |                                                            |

**結果：✅ pass**

## 逐項核對（L1）

- S-735（`2026-11-06_review_a11y-spoken-separator.md`）：主頁播放卡（`trackSpokenLabel` → `dramaEpisodeSpokenLabel` / `formatSpokenDate`）、`ShowPage`、`DailyDramaPage` 嘅 `NowPlaying` 全部傳讀屏版 ✅。`dramaEpisodeSpokenLabel`：短篇用 `spokenSeparator`，每日劇讀「23/10 星期五」、重溫用 `drama.dailyRerunLabel` + `，` ✅（E1 / S-717）。搵唔到集時 fallback `mini.subtitle`，讀屏版 = 畫面版，`NowPlaying` 新加嘅「相同就唔出兩份」會直接讀畫面字 ✅
- S-735 延伸（ArcPicker）：`arcPickerLabel` 加 `sep`，`unloaded` / `connecting` 兩條分支冇「·」，讀屏版同畫面字一樣，`PickerLabel` 唔會出兩份 ✅；`notice.replace` 時仍然只出下架句 ✅。同一 bug 類別，合理延伸
- S-736：`paused` / `resume` 兩個狀態 + 連線中唔出讀屏版都有 test ✅（behaviour 已存在，green-first 屬補 coverage，可接受）
- S-737：`useHideWhenTight.ts` ↔ `e2e/comingSoon.mjs` 互相指住，寫明 evaluate 入面 import 唔到 ✅
- S-704（`2026-11-05_review_coming-soon.md`）：`useHkToday` 用 `msUntilNextHkMidnight` 排 timer，到點 `setToday` 再排下一個；`visibilitychange` 補救 iOS 背景凍 timer ✅。timer 提早幾 ms 觸發都只會再排一個短 timer，自我修正；24 h < `setTimeout` 上限。`msUntilNextHkMidnight` = 下一個香港日子 UTC 00:00 − 8 h − now，三個邊界（差 1 分鐘、啱啱午夜、跨年）有 test ✅。cleanup 清 timer 同 listener ✅
- S-701：key = `${addedAt}:${arc}` ✅，test 鎖「同名同日一次、唔同日各一次」
- S-714：`leavingOf` 刪 `tag`，`dayWhen` import 一併刪 ✅；S-715：`Pick<NonNullable<DramaShelfItem['resume']>, 'leaving'>`，generic `R extends` 照用 ✅；S-719：JSDoc 移返落 `pageAvailability` ✅
- `DailyDramaPage` inline `dateLabel`：只係為 max-lines，行為一樣 ✅
- Version bump 1.28.5，`package-lock.json` 同步 ✅；`.proj-docs/backlog.md` 新登記冊 + index link ✅

## Design Origin

`none-required` 可以接受：冇新 className / layout，新增嘅只係 `SpokenText`（現有元件）包住嘅讀屏字，畫面字 `aria-hidden`，視覺冇變。

## 🔴 / 🟡

冇。

## 🟢 / Observation

- S-738 `src/pages/home/useHomeCardGauge.ts:43-46`：`trackSpokenLabel` 有行到（coverage 100%），但 `HomePageWide*.test.tsx` 冇斷言主頁播放卡嘅讀屏字（grep「現正播放」/「星期」冇結果）；將來改壞唔會紅。下次改主頁播放卡時補一條「現正播放：Ｘ…，第 N 集，…」斷言
- Observation：`useHkToday` 只靠 timer + `visibilitychange`；桌面機休眠但頁面仍 visible 嘅情況（timer 延遲）未驗證，屬 L3 推斷，真機有問題先理
- Observation：CI @ `01c2016` review 時 in_progress，merge 前要綠

## ✅ 做得好嘅地方

- 讀屏版同畫面版共用字典 key，`NowPlaying` / `PickerLabel` 統一「相同就唔出兩份」，冇重複 DOM
- 午夜 hook 抽成獨立 `useHkToday` + 純函數 `msUntilNextHkMidnight`，兩層都有 red-first test
- 舊 `useTodaysEpisodes` test 改成「唔 rerender 都會轉」，直接鎖住 S-704 嘅真正要求

## Handoff receipt

```
HANDOFF_RECEIPT
agent: code-reviewer
stage: review
status: pass
score: 100
hard_gates: lint=pass, type=pass, unit=pass (88 files / 1411 tests, vitest related), coverage=pass, no_critical=pass, security=n/a (no new deps), ci_same_sha=pending (01c2016 in_progress)
findings: C=0, W=0, S=1 (S-738), observation=2 (sleep-while-visible unverified; CI pending)
next_action: wait CI @ 01c2016 green -> push review commit (docs-only) -> open PR (Design Origin: none-required, screen-reader text only) -> QA S1 (chains: home, drama, show-today-page, coming-soon)
context: S-735/736/737, S-704, S-701, S-714, S-715, S-719 all fixed per original findings; S-738 added to backlog Open (home card spoken label has no assertion)
report: .proj-docs/reviews/2026-11-06_review_spoken-labels-midnight.md
```
