# Code Review — 2026-11-22 — P2 publish 序列化（AU-018）

- 日期：2026-11-22
- 審閱者：Code Reviewer（subagent，獨立；冇寫過呢個 branch）
- 目標：`fix/api/au-018_publish-serialisation`（base `origin/main` `82f25ed2`；`b8d036be` fix、`1f1ed9ec` release admin 0.10.1 / api 0.14.1）
- 來源：`.proj-docs/audits/2026-11-22_00-39_audit_full-codebase.md`（AU-018）；帶過嚟嘅 S-1430（`2026-11-22_review_p1-admin-draft-consistency.md`）
- Tier：T2（`apps/api` publish / rollback 寫入路徑 + `apps/admin` 錯誤文字）
- Review Item ID：預分配 `W-870` – `W-874`、`S-1457` – `S-1466`；今次用 `W-870`、`S-1457` – `S-1460`；冇 🔴
- 總評：⚠️ warn（95/100）。publish 撞 publish 嘅序列化正確，S-1430 已關；但 publish 喺還原中途落地時，還原回 409 兼 revert D1，而線上 catalog 已經係還原後嘅內容（W-870，已重現）

## Hard Gates

all pass：`npm run lint` exit 0；`npx tsc -b` exit 0；`npm run typecheck -w apps/api` exit 0；diff 相關 unit（冇跑 full suite / e2e；`npm run test -w apps/api` 被 reviewer-test-scope hook 擋，改跑相關檔）api `publishSerialisation` + `publish` + `publishFingerprint` + `selectivePublish` + `publishWarnings` + `adminRoutes` + `latestEpisodeIds` + `disabledEntries` 8 files / 136 tests、admin `errorMessage` + `writtenChinese` 2 files / 6 tests 全綠；冇新依賴；No Critical。

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                             |
| -------- | ------ | ------- | ---------------------------------------------------------------- |
| 正確性   | 20     | 25      | W-870 publish 撞還原：D1 entries 同線上 catalog 唔夾             |
| 安全性   | 20     | 20      | 冇新輸入面；409 body 冇內部資料                                  |
| 可維護性 | 20     | 20      | 條件集中喺 `commitPublish` / `insertPublish`，註解清楚           |
| 測試覆蓋 | 15     | 15      | 12 個新 test，7 個喺 base fail（我自己驗過）；W-870 嘅 test 見下 |
| 性能     | 10     | 10      | 每次 commit 多一次 R2 `head`（同 `latestPublish` 並行），可忽略  |
| 代碼風格 | 10     | 10      | version bump、CHANGELOG、README 齊                               |
| **總分** | **95** | **100** |                                                                  |

**結果：⚠️ warn**（分數 ≥ 90，但有收斂 🟡，按 `sw-post-review-handoff` 交 developer 喺本 PR 修；CLAUDE.md lane backlog 規則要同 session 清）

## 逐項核對（開發者設計）

- **D1 條件 insert**：`INSERT … SELECT … WHERE (SELECT id FROM publishes WHERE status='ok' ORDER BY id DESC LIMIT 1) IS ?` 係單一 statement，SQLite / D1 寫入序列化，判斷同寫入冇空隙。第一次發佈 `base = null` → `NULL IS NULL` 為真；第二個 `null` base → `1 IS NULL` 為假，回 null（test 釘住）。`failed` 行唔計入（test）。冇 row = 冇寫、唔 throw，null 只代表條件唔啱。
- **publish × publish**：A insert 後 C 完整跑完（A-insert / C-full / A-R2）→ A 用舊 etag put 回 null → 刪 A 行 → 409；R2 = C、D1 最新 ok = C（test）。另外推過：(a) C 先 insert、A 後 insert → A 條件 insert 失敗；(b) 兩個都 insert 成功（C 嘅 base = 未上 R2 嘅 A）、兩個 put 用同一個 etag → 只有一個寫到，輸嗰個刪自己行，兩種結果 D1 同 R2 都夾；(c) `Promise.all` 入面 `head` 早過 `latestPublish` 讀 → etag 只會更舊，put 只會更易輸，唔會錯寫。冇 object 時 `If-None-Match: *` 同樣成立（test）。ABA（etag 變返舊值）要 byte 一樣嘅 catalog，`generatedAt` 每次唔同，實際唔會發生。
- **Crash / wedge**：冇獨立鎖。insert 後 Worker 死咗 → 行留低（`ok`），下次 publish base = 嗰行，條件 insert 過，etag 照對，`isLive` 唔等 → 唔會誤判 `unchanged`（test）。R2 put throw → 刪行，唔擋之後 publish（test）。刪唔到 → 標 failed（S-786 路徑照舊）。
- **`onlyIf` 用法**：`R2PutOptions.onlyIf?: R2Conditional | Headers`、`put(): Promise<R2Object | null>`（`@cloudflare/workers-types`），`etagMatches` 用 `R2Object.etag`（冇引號，啱）。
- **rollback revert 會唔會冚走 editor 儲存**：`revert` 用 `expected: change.updatedAt` 樂觀鎖，期間 editor PUT 過嘅行唔會被寫返（同 AU-020 / AU-021 嘅 412 做法一致，editor 自己 412 rebase）。冇 clobber；問題喺另一邊，見 W-870。
- **409 vs 412**：409 + `reason` 同 ID 守衛 409（有 `missing`）分得開；admin `errorOf` 冇 `missing` 就係 `ApiError`，唔會誤當 blocked。用 409 可以接受；UX 見 S-1458。
- **Base 上 fail**：將 `apps/api/src` checkout 返 `82f25ed2` 跑 `publishSerialisation.test.ts`：7 failed / 5 passed，同開發者講嘅一樣（跑完已還原）。
- **書面語**：`publish.conflict`「另一次發佈或還原剛剛完成或仍在進行，此操作未有執行。請重新載入後再試。」，`writtenChinese.test.ts` 過。

## 🟡 Warning

### W-870 publish 喺還原中途落地：還原回 409 兼 revert D1，但線上已經係還原後嘅內容

- 位置：`apps/api/src/catalog/rollback.ts:203-211`（`apply` → `commitPublish` → catch `revert`）；test `apps/api/test/publishSerialisation.test.ts:244-262`
- L1：AU-018「publish 撞 rollback 時 R2 同 D1 唔夾」；`rollback.ts:186-188` 自己嘅合約「D1 寫返舊值…D1 同已上線 catalog 唔會唔夾」；409 文字話「此操作未有執行」
- L2：臨時 test（跑完已刪）照 `:244` 嘅情境（#1 golden 上架、#2 下架、還原 #1 卡喺 R2 put、期間 `POST /api/publish`）再讀 R2：publish 200、還原 409、**R2 `golden.enabled = true`，D1 `golden.enabled = false`**。原因：還原已經 `apply` 咗 D1，中途嗰個 publish 由 D1 砌 document，帶埋還原嘅改動上線；還原輸咗之後 `revert` 將 D1 寫返舊值。現有 test 只比 hash（`expectInStep`）同 D1，冇睇 R2 內容，所以反而將呢個唔夾嘅結果當正確釘住
- L3：影響 = admin 見到「未有執行」，但 player 已經係還原後狀態；D1 顯示下架，下次任何發佈會靜靜將佢再下架。經 admin 觸發要另一個人嘅確認頁 GET 同發佈都落喺還原 `apply` → insert 之間（fingerprint 會擋大部分），機率低；冇 fingerprint 嘅 caller 冇保護
- 方案 A（推薦）：`PublishConflictError` 時唔好盲 revert。讀返贏咗嗰次（最新 ok publish）嘅 `snapshotDefinitions(document)`，只 revert 線上 definition ≠ 我哋 apply 值嘅 entry；線上已經係還原值嘅保持（D1 = 線上）。409 照回（還原本身冇落地做 `rollbackOf` 行）。Trade-off：多讀一次 document，邏輯稍複雜，但 D1 一定跟線上
- 方案 B：還原唔先寫 D1，commit 成功之後先 `apply`。Trade-off：apply 失敗（entry 期間被改）時線上已經係還原內容，風險轉移，唔建議
- 連帶：`:257` 改為斷言 D1 同 R2 嗰份 golden 一致（唔係固定 `false`）；`apps/api/CHANGELOG.md:15`、`apps/api/README.md:165`「還原會將 D1 寫返舊值」跟住改

## 🟢 Suggestion / Observation

- S-1457 `apps/api/src/catalog/publish.ts:262-263`：冇 object 時用 `Headers({ 'If-None-Match': '*' })`，只喺 miniflare 驗過；production 已經有 `catalog.json`，呢條路只會喺新 bucket 行。建議喺 README 記低未喺真 R2 驗過，或者 preview bucket 試一次
- S-1458 `apps/admin/src/features/update/usePublish.ts:32-37`：發佈頁撞 `publishConflict` 落 `failed`，要用戶自己重新載入，舊摘要 / fingerprint 留喺度；可以同 412 一樣當 `changed` 行 `onChanged()` 重讀摘要（再撳亦只會 412，冇壞影響）
- S-1459 Observation：insert 後 Worker 死咗留低嘅 `ok` 行（從未上 R2）照樣出現喺上下架記錄、可以還原，亦令下次 ID 守衛要保留佢嘅 episode ID；行為保守、唔擋發佈，README 已講，唔使改
- S-1460 `apps/admin/src/features/history/HistoryPage.tsx:77-80`：還原失敗後頁面已經自動重讀，`publish.conflict` 嘅「請重新載入後再試」喺記錄頁略多餘；可另開還原用字串（例如「請稍後再試」）

## ✅ 做得好嘅地方

- 冇鎖、冇 TTL、冇 migration：三重條件（base 檢查、條件 insert、R2 etag）都係「輸咗乜都冇寫」，crash 唔會卡死之後嘅發佈。
- `heldPut` 將 R2 put 卡住嚟砌真 interleaving，唔係 mock 結果；7 個 test 喺 base 真係紅。
- `unchanged` 加 R2 hash 對照，順手堵咗「行有、R2 冇」之後永遠 unchanged 嘅舊洞。

## 修訂代碼（W-870 方向，未落 code）

```ts
// rollback.ts：輸咗先 revert「線上唔係還原值」嘅 entry
} catch (error) {
    if (error instanceof PublishConflictError) {
        const winner = await latestPublish(env.DB); // 贏咗嗰次
        const shipped = winner ? snapshotDefinitions(winner.document) : new Map();
        // 線上 definition 已經 = 我哋 apply 嘅值 → D1 保持，同線上一致
        const keep = changes.map(
            (c) => shipped.get(keyOf(c.entry.kind, c.entry.id)) === c.definition,
        );
        await revert(env.DB, changes, applied.map((ok, i) => ok && !keep[i]));
    } else await revert(env.DB, changes, applied);
    throw error;
}
```

（`snapshotDefinitions` 嘅回傳型別同比較方式要跟 `planChanges` 用嘅 `restoredDefinition` 對齊；以上只示意。）

```handoff-receipt
protocol: 1
status: warn
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "n/a (diff-related api 8 files / 136 tests, admin 2 files / 6 tests green; new paths covered by publishSerialisation.test.ts)"
next_action: invoke_developer
next_agent: backend-developer
branch: "fix/api/au-018_publish-serialisation"
context: "W-870: a publish landing during a restore ships the restored state, then the restore 409s and reverts D1 (reproduced: R2 golden enabled=true, D1 false); fix rollback.ts conflict path + correct test :244-262 + CHANGELOG/README wording, then re-review. S-1430 closed. Suggestions S-1457..S-1460 to clear in-PR or by main agent this session. Integration branch is main; QA e2e:admin after re-review."
```
