# Code Review — admin 回饋修正批次（13 項），api 0.6.2 → 0.6.3

- 日期：2026-11-12
- 審閱者：Code Reviewer（subagent）
- 目標：branch `claude/charming-heisenberg-8z30x3`，`a2b2c0a..4d83f96`（docs / mockup commit、`b974b80`、`5c2b9db` 唔審 code）
- Tier：T2（admin UI + api 驗證邏輯）
- 總評：13 項同 `8033117` regression fix 全部對到 SSoT，測試齊。但 9(b) 嘅 `mayRelax` 放寬咗太多：**已發佈**嘅 entry 轉下架、圖唔齊，都會被存做 draft，publish 唔包佢（W-714，blocking）

## Hard Gates

all pass：`npm run lint`（eslint + prettier）、`tsc -b`（admin / api）、相關 unit（admin `vitest related` 165 + node style test 7；api workerd `disabledEntries` / `adminRoutes` / `drafts` / `entries` / `schedule` 87）。Coverage 冇量度，新分支都有對應 test，填 n/a。冇新依賴，Security 填 n/a。Review 期間 head `4d83f96` 嘅 CI run 43112989807 仲係 `in_progress`

## 評分結果

| 維度     | 得分   | 滿分    | 備注                          |
| -------- | ------ | ------- | ----------------------------- |
| 正確性   | 20     | 25      | W-714                         |
| 安全性   | 20     | 20      |                               |
| 可維護性 | 20     | 20      |                               |
| 測試覆蓋 | 15     | 15      | 已發佈 entry 嘅情況歸入 W-714 |
| 性能     | 10     | 10      |                               |
| 代碼風格 | 10     | 10      |                               |
| **總分** | **95** | **100** |                               |

**結果：⚠️ warn（分數有 95，但 W-714 按 dispatch 指示當 blocking，要修好先 merge）**

## 🟡 W-714 — 已發佈 entry 轉下架、圖唔齊，會被存做 draft，喺 catalog 消失 / 令 publish 卡住（blocking）

- 位置：`apps/api/src/content/entries.ts` `mayRelax`（`entry.definition.enabled === false` 嗰半）；`checkedEntry` 嘅 warnings
- L1：SSoT 9(b) 只講「**新**節目未有圖都儲存到」，而 commit 自己嘅註解都寫「admin 新建節目 / 劇」。另外同一個檔嘅 DELETE 守則係「published entries cannot be deleted; set enabled: false instead」，即係已發佈嘅 entry 下架之後要繼續留喺 document 做「下架」狀態。實作冇分新舊，所有 `enabled: false` 嘅 entry 都放寬
- L2：用臨時 workerd test 重現咗（seed 加多一個節目同一套劇，令 document 唔會變空；test 跑完已刪）：
    - (i) 已發佈節目轉下架、圖齊 → `200 {"draft":false}`，**正常**
    - (ii-a) 已發佈節目 `badgirl` 轉下架、`images` 冇咗 `disc.webp` → `200 {"draft":true,"warnings":{"missingEpisodeIds":[]}}`；之後 publish 照 `200`，document 嘅 `shows` 只剩 `['other']`。節目冇 ID 守衛，**就咁喺 catalog 消失**，冇任何警告
    - (ii-b) 已發佈劇 `golden` 轉下架，同時加一個 `disc: season-2.webp` 但未上載嘅短篇 → `200 {"draft":true,"warnings":{"missingEpisodeIds":[]}}`；之後 publish `409 episode IDs would disappear`（`drama:golden:season-1:1..3`）。**成個 catalog publish 都卡住**，而儲存嗰陣嘅 warning 係空
    - 對照組：base 行為（同一個改動但 `enabled: true`）→ `422 arcs[1].disc: no file season-2.webp`，即係改之前呢兩個情況都會喺儲存嗰陣擋咗
- L3：而家 admin UI 係「上載即存」，正常操作好難整出「已發佈 + 圖唔齊」，暫時要直接打 API 或者用舊 client 先觸發到，所以評 🟡 唔評 🔴。不過 server 先係最後守門，而 warning 係用寬鬆驗證計出嚟嘅 `ids` 計，所以 draft 嘅情況永遠報空
- (iii) 判斷：應該限制做「從未發佈」先可以寬鬆驗證。`isPublished()` 已經喺同一個檔（DELETE 用緊），可以直接重用
- 方案 A（推薦）：`mayRelax` 改成 `(wasDraft && kind === 'dramas') || (enabled === false && !(await isPublished(db, kind, id)))`。已發佈嘅照舊完整驗證，唔過就 422，同 base 一致。要加 workerd test 覆蓋 (i) / (ii-a) / (ii-b)。代價：多一次 `latestPublish` 讀取，但只會喺完整驗證失敗之後先讀
- 方案 B：照放寬，但 `draft === true` 而 entry 已發佈嗰陣，warnings 改報呢個劇喺最新 publish 嘅**全部** episode ID；節目就加 `warnings.droppedFromCatalog`。代價：只係提示，publish 時節目仍然會靜靜雞消失，要靠 admin 留意

修訂代碼（方案 A，示意）：

```ts
/** 寬鬆驗證：掃描 draft 劇；或者下架而且從未發佈過（admin 新建、圖未齊）。已發佈嘅一定要完整驗證 */
const mayRelax = async (db: D1Database, entry: EntryInput, wasDraft: boolean) =>
    (wasDraft && entry.kind === 'dramas') ||
    (entry.definition.enabled === false && !(await isPublished(db, entry.kind, entry.id)));
// checkedEntry：if (!(await mayRelax(c.env.DB, entry, wasDraft))) return validationFailed(c, error);
// （isPublished 要移去 checkedEntry 上面，或者抽去 catalog/store）
```

## 🟢 Suggestion / Observation（backlog，唔 block）

- S-828 `apps/admin/src/model/paths.ts`、`todoModel.ts` `rowTarget`：路徑冇 `encodeURIComponent`。劇 ID 受 `ID_PATTERN`、短篇 ID 受 `ARC_ID_PATTERN`（API 驗證）限制，而家冇問題；如果想防禦性啲可以加 encode。`todoHref` 已經用 `URLSearchParams` encode 咗 query
- S-829 `apps/admin/e2e/run.mjs` `boxOf(locator, x, height)`：`x` 冇用到，但 call site 傳 `0`，容易令人以為會改 x。建議刪走呢個參數，或者改用 `{ height }` option
- S-830 `apps/admin/src/model/dates.ts` `shortDate`：排程跨年嘅日子（例如 `3/1 六`）冇年份，只係靠星期幾分辨；`stampOf` 跨年已經正確顯示 `31/12/2025`。SSoT 12 只要求「日/月」，所以只記錄
- Observation：`validationMessage` 嘅 regex 有錨定（`^…$`），`[^:]+` / `\S+` 唔會跨欄位；檔名有空格或者係巢狀欄位（`theme.bg`）就回 `null`，改出一般訊息加原文，fallback 安全。檢查過，冇問題
- Observation：`ArcSchedule` 傳 `saved !== null`；`ScheduleTab` 一定傳 `?? null`，冇 `undefined` 誤判做有排程嘅情況

## ✅ 做得好嘅地方

- 每一項都係 TDD（failing test commit 喺 fix 之前），e2e 新加嘅 6 個 check 有量位置、量顏色（light / dark），唔係淨係影 screenshot
- 第 5 項 root cause 喺 `stripOf` 修，`arcTabNote` 同 `ArcSchedule` 共用同一個判斷；`8033117` 嘅 regression 都即時補咗 test

## Handoff receipt

```
HANDOFF_RECEIPT
agent: code-reviewer
scope: admin-feedback-0.6.3 (a2b2c0a..4d83f96)
status: warn
score: 95
hard_gates: { lint: pass, type: pass, tests: pass, coverage: n/a, no_critical: pass, security: n/a }
blocking: [W-714]
backlog: [S-828, S-829, S-830]
next_action: invoke developer subagent to fix W-714 (Option A), then re-review W-714 diff only
context: W-714 reproduced in workerd — published show disabled + missing image → draft → dropped from catalog; published drama → publish 409. CI run 43112989807 for 4d83f96 was in_progress at review time.
report: .proj-docs/reviews/2026-11-12_review_admin-feedback-0.6.3.md (committed, not pushed)
```
