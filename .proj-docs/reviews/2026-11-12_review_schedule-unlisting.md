# Code Review — schedule unlisting（api 0.7.0）

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立）
- 目標：`claude/charming-heisenberg-8z30x3` @ `ad1829d`，`git diff origin/main...HEAD`（59 files，+5592 / −765）
- Tier：T2（MINOR，catalog + api + admin 跨模組）
- Design Origin：`mockup: _mockups_/admin-schedule-unlist/index.html` ⑧ ⑨ + `titles.html` 方案 A + 用戶 2026-11-12 決定
- 總評：`planSchedule` / `expandSchedule` 結構清楚，`removeAfterDays` 向後兼容正確（舊 rule 輸出同 main 一樣），catalog / api / admin 測試覆蓋完整，TDD commit 次序清楚。發現 1 個收斂 🟡：「上架 N 日後」可以產生今日之前嘅下架日，儲存即時落架，而預覽完全唔顯示。

## Hard Gates

all pass。

- `npm run lint`：exit 0
- `npx tsc -b`：exit 0
- 相關 unit test：14 files / 192 tests pass，用 `npx vitest run <changed test files>`，包括 `expandSchedule.test.ts`
- api：`vitest run --config vitest.config.ts test/schedule.test.ts`，25 tests pass
- 冇跑 full suite（`npm test`）同 `npm test -w apps/api`：`reviewer-test-scope` hook 會 block，Hard Rule #7。full suite 由 QA S3 / CI 跑。
- Coverage：n/a（冇量度）。改動模組都有專屬 test，包括 `unlist.test.ts`、`scheduleModel` / `timelineModel` / `dateFieldModel` / `DateField` / `ScheduleTab` 嘅 test 同 api `schedule.test.ts`。
- Security：冇新依賴。

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                    |
| -------- | ------ | ------- | --------------------------------------- |
| 正確性   | 20     | 25      | W-715                                   |
| 安全性   | 20     | 20      | rule 形狀 + 數值上限照驗，422 唔係 500  |
| 可維護性 | 20     | 20      | 函數短、職責單一（🟢 見 S-836 / S-837） |
| 測試覆蓋 | 15     | 15      | failing test 先行，邊界案例齊           |
| 性能     | 10     | 10      | —                                       |
| 代碼風格 | 10     | 10      | lint / prettier 全過                    |
| **總分** | **95** | **100** | 結果：pass，W-715 建議喺 merge 前修     |

## 🟡 W-715 「上架 N 日後」可以排今日之前嘅下架日：儲存即時落架，預覽空白

- 位置：
    - `packages/catalog/src/schedule/expandSchedule.ts:205-207`：afterDays = listedAt + N，冇同今日比較
    - `apps/admin/src/features/dramas/useScheduleForm.ts:34-41`：`saveProblemOf` 只擋 conflicts
    - `apps/admin/src/features/dramas/timelineModel.ts:173-174`：`previewDays` 濾走 `< today`
- L1：
    - 用戶 2026-11-12 決定「DateField 最早 = 今日」，即係唔排過去嘅下架日。`date` / `periodic` 兩種方式都守住呢條（`SchedulePanels.tsx:242`），`afterDays` 繞過咗。
    - mockup ⑨ 預覽 =「今日起」嘅上下架批次。用戶要喺預覽睇到會發生乜。
- L2：重現 script 喺 scratchpad `repro/b.ts`（`npx tsx`）。ctx：第 1–10 集喺 2026-06-01 上架，today = 2026-11-12，揀「上架 N 日後」預設 90 日：
    ```
    previewDays: []
    unlistStrip: ["2026-08-30/off","TODAY"]
    saveProblem: undefined
    expandSchedule → episodeRemovedAt {"1-10":"2026-08-30"}
    ```
- L3：
    - afterDays 由每集自己嘅上架日計。早排上架嘅集數加 N 日可能已經過咗，`expandSchedule` 照寫入過去嘅日子。
    - 儲存之後全部集數即刻喺 player 消失。預覽寫「今天起沒有排程中的上架或下架」；編輯時間軸將 08/30 畫喺「今日」之前，色調係「排程下架」，冇任何提示。
- 方案 A（推薦）：admin `saveProblemOf` 加檢查。非 kept 嘅集數如果 `removedAt < ctx.today`，就 reject，出中文錯誤，例如「第 1–10 集的下架日期（30/8）早於今日」。server 冇「今日」概念，唔郁 catalog。成本細，同現有「撳儲存先彈錯誤」一致。
- 方案 B：容許過去嘅日子，但當「即時下架」處理：
    - `previewDays` 將 `< today` 嘅下架併入「今日」格
    - 時間軸加警告色
    - trade-off：要改 UI / 文案，而且同用戶「最早 = 今日」嘅意圖唔夾

## 🟢 Suggestion（入 backlog，唔 block）

- S-835：今日有兩個來源。`ArcSchedule.tsx:45` 用 `hkToday()` 做 `ctx.today`（已上架 / 預設開始日 `scheduleModel.ts:76-77`）；`ScheduleViews.tsx:98`、`DateCalendar.tsx:80` 用 `localToday()` 做 min / 今日。如果本機時區快過香港，預設開始日可以細過 DateField min。建議 `ctx` 帶埋 `marker`，或者預設日取 `latestOf(...)`。
- S-836：`ui/dateFieldModel.ts:33,40-42` 嘅 `12` 係 magic number，應該抽做 `MONTHS_PER_YEAR`。
- S-837：helper 重複咗：
    - `pad2`：`model/dates.ts:53` 同 `ui/dateFieldModel.ts:8`
    - `weekdayOf`：`ui/dateFieldModel.ts:47` 同 catalog `weekdayOf`
    - 集數範圍 key 解析：`timelineModel.ts:28,53-62` 同 `expandSchedule.ts:67,176-197`
- S-838：DateField 月曆喺兩種情況唔會收起：focus 喺文字欄撳 Esc，或者 Tab 離開 popover（`DateField.tsx:76`、`DateCalendar.tsx:100-105`）。另外 `usePopoverPlacement.ts:316-322` 只喺打開嗰刻量位置，resize / scroll 之後唔會重新計。
- S-839：`DateField.tsx:76` 嘅 `onOutside` 係 inline arrow，`useOutsidePointer` 每次 render 都重新 add / remove listener。建議用 `useCallback`，或者 hook 內部用 ref。
- S-840：`timelineModel.ts:109` / `ScheduleViews.tsx:104` 嘅 `draft` 用整體 dirty。只改咗下架時，上架段都會寫「即將排程上架（未儲存）」。
- S-841：文案「今日」同「今天」混用：`zh-HK.ts:359` 寫「今日」，`:405` `previewEmpty`、`:437`、`:469` 寫「今天」。建議統一。

## ✅ 做得好嘅地方

- `unlistOf` 集中處理 legacy `removeAfterDays`。`parseScheduleRule` 唔准 `unlist` 同 `removeAfterDays` 並存。api 有一個 test 讀 D1 舊 rule。
- `planSchedule` 會出 conflicts，唔會直接 throw；`expandSchedule` 再 reject。admin 預覽同 server 422 用同一套邏輯，而且 422 原文譯成中文。
- 動畫全部放喺 `prefers-reduced-motion: no-preference` 入面，用 `--motion-*` token。tabs / 月曆有完整鍵盤操作，用 roving tabindex。

## 修訂代碼（W-715，方案 A）

```ts
// apps/admin/src/features/dramas/useScheduleForm.ts
/** 儲存前驗證：server 422 原文；或者新排嘅下架日早過今日（W-715：afterDays 由舊上架日計會出過去日子） */
export const saveProblemOf = (rule: ScheduleRule, ctx: ScheduleContext): string | undefined => {
    try {
        expandSchedule(rule, ctx);
    } catch (error) {
        return scheduleErrorOf(error);
    }
    const kept = keptNos(ctx.unlisted); // timelineModel 現有 helper，改為 export
    const past = planSchedule(rule, ctx).episodes.find(
        (e) => e.removedAt !== undefined && e.removedAt < ctx.today && !kept.has(e.no),
    );
    // 新 message key validation.unlistBeforeToday（書面語），validationMessage 加對應 regex
    return past && `episode ${past.no} unlist date ${past.removedAt} is before today ${ctx.today}`;
};
```

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "claude/charming-heisenberg-8z30x3"
context: "schedule unlisting api 0.7.0 review 95/100; integration branch is main; W-715 (afterDays past unlist dates) recommended before merge; 7 S items to backlog"
```
