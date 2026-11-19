# Code Review — 9d lane 0 e2e:visual 日間情境

- 日期：2026-11-19
- 審閱者：Code Reviewer（獨立）
- 目標：PR #283 `test/visual/day-scenes` → `release/v2.1.0`，commit `77e1c65b`（6 files，+126 / −1）
- Tier：T1（淨改 e2e:visual 工具 + 一個 node unit test，冇改 app）
- 依據：`.proj-docs/plans/2026-11-19_plan_9d-sleep-timer.md` Lane 0；`.claude/CLAUDE.md`「現有裝置零改變」（viewport 清單凍結，只可以加情境）
- 總評：同 plan Lane 0 逐條對得上（3 個 `-day` 情境、`now` = `2026-11-30T14:00:00+08:00`、context `timezoneId: 'Asia/Hong_Kong'`），`VISUAL_VIEWPORTS` 冇郁；冇 🔴 / 🟡，一條 🟢 要交 lane 3

## Hard Gates

All pass（獨立 worktree，`npm ci` 喺 repo 根跑）：

- Lint：改咗嘅 6 個檔 `eslint` 0 error（兩個 `.d.mts` 係 eslint config 本身唔包，同現有 `.d.mts` 一樣）、`prettier --check` 過
- Type：`apps/player` `tsc -b --noEmit` exit 0
- Tests：diff 相關 `e2eVisualScenes.node.test.ts` + `e2eVisualModel.node.test.ts` 2 files / 31 tests 綠；developer 報 `VISUAL_BASE=HEAD npm run e2e:visual` 234/234 PASS（e2e 屬 QA / CI，reviewer 冇重跑）
- Coverage：新邏輯得 `dayScenes`（正常複製 + 搵唔到 throw）同 `VISUAL_SCENES` 組合（id 唔重複、日間版 seed / run 同原本同一個 reference）全部有 test
- Security：冇新依賴

### Admin unit 失敗（developer 報 282 個 `useContext` null）

喺兩個乾淨 worktree 各自 `npm ci` 之後跑 `npx vitest run --project @903-player/admin`：

| Ref                                  | 結果                       |
| ------------------------------------ | -------------------------- |
| `origin/release/v2.1.0`（2c83be7a）  | 138 files / 807 tests 全綠 |
| `test/visual/day-scenes`（77e1c65b） | 138 files / 807 tests 全綠 |

結論：唔係 pre-existing，亦唔係呢個 PR 引起；係 developer worktree 嘅環境問題（`useContext` null 通常係有兩份 React，未驗證係咪 node_modules 唔齊 / symlink 引起）。呢個 PR 冇掂 `apps/admin`。

CI：`CI` run 44520226764（head `77e1c65b`）review 時「Lint, unit & build」仲跑緊，結果由 main agent merge 前確認。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                          |
| -------- | ------- | ------- | ------------------------------------------------------------- |
| 正確性   | 25      | 25      | base / head 都用 head 嘅 `capture()`，時區兩邊一致            |
| 安全性   | 20      | 20      | 淨係 test 工具                                                |
| 可維護性 | 20      | 20      | 日間版由 `dayScenes` 複製，唔重寫 seed / run                  |
| 測試覆蓋 | 15      | 15      |                                                               |
| 性能     | 10      | 10      | 多 3 個情境 × 現有 viewport，屬 plan 預期                     |
| 代碼風格 | 10      | 10      | 常數抽晒（`VISUAL_TIMEZONE`、`VISUAL_DAY_NOW`、`DAY_SUFFIX`） |
| **總分** | **100** | **100** |                                                               |

**結果：✅ pass**

## 🟢 Suggestion / Observation

- **S-1149**（交 lane 3）`apps/player/e2e/harness.mjs` `newE2EContext`：主 e2e（`run.mjs`）嘅 context 冇固定時區；CI 係 UTC，`E2E_NOW` 22:30 +08:00 喺瀏覽器本地變 14:30。Lane 3 月亮掣跟裝置本地 21:00–05:00 出，佢嘅 e2e 喺 CI 會見唔到掣、喺 HK 時區本機又見到。建議 lane 3 喺 `newE2EContext` 預設 `timezoneId: VISUAL_TIMEZONE`（或者搬去 harness 共用），`visualDiff.mjs` 就唔使自己再傳
- Observation：`it('時區固定香港')` 只係 `toBe` 自己個常數，價值低；`visualDiff.mjs` 有冇真係傳 `timezoneId` 冇 unit 鎖（`capture()` 要 browser），靠 e2e:visual 本身。唔使改

## ✅ 做得好嘅地方

- 日間情境用 `dayScenes` 由同一個 seed / run 複製，test 用 reference 相等鎖住「行為同夜間版一樣」
- 註解寫清點解要固定時區（CI 係 UTC）同點解揀 14:00

## Handoff receipt

`status=pass`，score 100，`next_action=merge_develop`（target `release/v2.1.0`；按 plan 先過 QA S1 `repo-tooling` 同 CI 綠先 merge）。S-1149 交 lane 3 喺同一個 session 清。
