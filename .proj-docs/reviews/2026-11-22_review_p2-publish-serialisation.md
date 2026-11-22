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

---

# Round 2 — 2026-11-22（re-review `49997dc2..eaf6f1bf`）

- 目標：`eaf6f1bf` fix(api): keep D1 in step with the live catalog when a restore loses (W-870)
- 範圍：只驗上一輪 W-870 同 S-1457 – S-1460 嘅修正；新 ID 用 `W-871`
- 總評：⚠️ warn（95/100）。W-870 主路徑已關（test 喺修正前真係紅）；但贏咗嗰次係**選擇發佈**而且剔走咗同一套劇嘅未完成短篇時，`JSON.stringify` 比較整個 definition 對唔上，照樣全部 revert，重現到「線上上架、D1 下架」（W-871）

## Hard Gates（Round 2）

all pass：`npm run lint` exit 0；`npx tsc -b` exit 0；`npm run typecheck -w apps/api` exit 0；`npm test -- …` 同冇列檔嘅 `npx vitest run` 被 reviewer-test-scope hook 擋，改為逐檔跑：admin `src/api/*.test.ts` + `src/features/update/*.test.ts(x)` + `i18n/writtenChinese.test.ts` 25 files / 161 tests、api `publishSerialisation` + `publish` + `revert` + `revertEdgeCases` + `selectivePublish` 5 files / 101 tests 全綠（exit 0）。RED 驗證：將 `rollback.ts` 暫時換返 `49997dc2` 版本，新 test「keep in D1 what the winning publish already shipped」失敗；換返之後 working tree 乾淨。

## 評分結果（Round 2）

| 維度     | 得分   | 滿分    | 備注                                                |
| -------- | ------ | ------- | --------------------------------------------------- |
| 正確性   | 20     | 25      | W-871 選擇發佈贏咗、剔走短篇時，還原照樣全部 revert |
| 安全性   | 20     | 20      | 冇新輸入面                                          |
| 可維護性 | 20     | 20      | `notShipped` / `revertAfterFailure` 職責清楚        |
| 測試覆蓋 | 15     | 15      | 兩個次序（apply 前 / 後落地）都有 test，RED 已驗    |
| 性能     | 10     | 10      | 只喺 409 多讀一次最新 document                      |
| 代碼風格 | 10     | 10      | lint / prettier 過                                  |
| **總分** | **95** | **100** |                                                     |

**結果：⚠️ warn**

## 上一輪項目

- W-870 ✅ 關：全量發佈贏咗嗰個路徑 D1 = R2（test 斷言 `storedGolden` = `liveGolden`）；反方向（publish 喺 apply 前落地）全部寫返舊值。比較穩定：贏咗嗰次 document = `JSON.stringify(value)`，definition 係 D1 字串 `JSON.parse` 原樣放入（`publish.ts:156,206`），`Change.definition` 本身係 `JSON.stringify` 輸出，來回 key 次序同字元都唔變。Fallback：`latestPublish` / `JSON.parse` throw → `.catch` 全部 revert；冇 publish → 空 map → 全部 revert，同修正前一樣。並發編輯：`revert` 仍然用 `expected: change.updatedAt`，期間有人儲存就唔寫，唔會蓋走。開發者自己問嘅情況（選擇發佈將成個 entry 換返上次版本）：線上 = 上次版本 ≠ 我哋 → revert，D1 = 還原前狀態，同撞之前一樣，冇問題；「只換走部分短篇」見 W-871
- S-1457 ✅ 關：README `:165` 記低 `If-None-Match: *` 只喺 miniflare 驗過
- S-1458 ✅ 關：`errorOf` 409 + `reason: 'publishConflict'` → `PublishConflictError`（排喺 `missing` 判斷之後，唔會搶走 ID 守衛 409）；`failureOf` 同 412 一樣行 `changed`；`PublishPage.test.tsx` 斷言重讀摘要（`reads() === 2`）、冇「發佈失敗」；`publish.conflict` key 已刪、冇殘留引用
- S-1460 ✅ 關：`history.rollbackConflict` 書面語（`writtenChinese.test.ts` 過）。耦合可以接受：產生 `publishConflict` 嘅只有發佈同還原；發佈頁喺 `failureOf` 已經先攔截，唔經 `errorMessage`，所以而家只有記錄頁會見到呢句。日後新發佈入口如果直接用 `errorMessage` 會出「本次還原」字眼，到時再分開（Observation）
- S-1459 — 接受，冇改

## 🟡 W-871 贏咗嗰次係選擇發佈、剔走咗同一套劇嘅短篇：還原照樣全部 revert，線上上架、D1 下架

- 位置：`apps/api/src/catalog/rollback.ts:172-179`（`notShipped` 用 `JSON.stringify(live) !== definition` 比較整個 definition）
- L1：今次 diff 自己寫低嘅合約 —— `apps/api/README.md:165`、`apps/api/CHANGELOG.md:16`「已經帶埋還原嘅上架狀態上線嘅 entry 保持（唔會出現線上上架、D1 下架）」；`rollback.ts:10`「D1 一定跟線上」
- L2：臨時 test（跑完已刪）：#1 golden 上架、#2 下架；D1 golden 加一個未確認 ID 嘅新短篇（`newArc` finding → `incomplete`）；還原 #1 嘅第一個 D1 batch 完成之後、`commitPublish` 之前，`POST /api/publish { selection: { content: [] } }` → 200；還原 → 409。結果：**R2 golden `enabled: true`（已帶還原上架狀態）、冇新短篇；D1 golden `enabled: false`**。原因：選擇發佈用 `selectArcs` 剔走未完成短篇，線上 definition 同我哋 apply 嘅值只差嗰個短篇，整段比較對唔上 → 當「未上線」→ revert
- L3：要兩個 admin 同時還原 + 選擇發佈，而且被還原嘅劇有未完成新短篇，機率低；但後果同 W-870 一樣：D1 顯示下架、下次任何發佈靜靜將佢再下架
- 方案 A（推薦）：只比較還原會改嘅欄位。抽 helper 取 entry `enabled` + 每個短篇（用 id）嘅 `enabled`，只比較兩邊都有嘅短篇（線上冇嘅係選擇發佈剔走，同還原無關）。Trade-off：多一個小 helper；同 `restoredDefinition` 只改 `enabled` 嘅範圍對齊，選擇發佈點剔都唔影響判斷
- 方案 B：比較線上同還原前 D1（`entry.definition`），線上 = 舊值先 revert。Trade-off：選擇發佈換返「上次版本」時線上 ≠ 舊值亦 ≠ 我哋，會錯誤保持還原值（D1 上架、線上下架），反方向出錯，唔建議
- 連帶：`publishSerialisation.test.ts` 加「選擇發佈剔走短篇」case（上面 L2 情境，用現有 D1 batch proxy，改為 batch 完成之後先跑 publish）

```ts
// rollback.ts — W-871 方向（示意）
const enabledOf = (definition: Json) => ({
    enabled: definition.enabled,
    arcs: new Map(
        arcsOf(definition)
            .filter(isRecord)
            .map((arc) => [arc.id, arc.enabled]),
    ),
});

/** 線上已經係我哋寫嘅上架狀態（只睇兩邊都有嘅短篇；選擇發佈剔走嘅唔計） */
const shippedOurs = (live: Json | undefined, ours: Json): boolean => {
    if (!live) return false;
    const [shipped, wrote] = [enabledOf(live), enabledOf(ours)];
    return (
        shipped.enabled === wrote.enabled &&
        [...shipped.arcs].every(([id, on]) => !wrote.arcs.has(id) || wrote.arcs.get(id) === on)
    );
};
```

## 🟢 Observation（唔扣分、唔落 backlog）

- 同一組臨時 test 用 `heldPut` 次序（還原已插 publishes 行、卡喺 R2 put）時，選擇發佈嘅「上次發佈」係還原嗰行（之後刪走、從未上線），被剔走嘅未完成短篇以 `enabled: false` 入咗線上 catalog。episode ID 冇被鎖（停用短篇唔計），player 唔顯示；屬「publishes 行先於 R2 寫入」嘅既有設計，唔係今次 diff 引入。由 main agent 判斷要唔要另開 ticket
- `notShipped` 讀最新 publish 同 `revert` 之間再有第三次 publish 落地，判斷會過時；窗口極窄，同修正前一樣，唔使改

## ✅ 做得好嘅地方（Round 2）

- Test 改為斷言 D1 = R2 內容，唔再釘死錯誤結果；兩個次序都覆蓋，用 D1 batch proxy 控制 interleaving。
- Fallback 保守：讀唔到贏咗嗰次就回到舊行為，唔會因為收拾失敗而掩蓋原本嘅 409。
- Admin 端將 409 publishConflict 收入現有 412 重讀摘要流程，冇新增 UI 狀態。

```handoff-receipt
protocol: 1
status: warn
score: 95/100
stage: T2
round: 2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "n/a (diff-related admin 25 files / 161 tests, api 5 files / 101 tests green; W-870 test RED-verified against 49997dc2)"
next_action: invoke_developer
next_agent: backend-developer
branch: "fix/api/au-018_publish-serialisation"
context: "W-870, S-1457, S-1458, S-1460 closed; S-1459 accepted. New W-871: when the winner is a selective publish that drops an incomplete arc of the restored drama, notShipped compares whole definitions, mismatches, and reverts everything (reproduced: R2 golden enabled=true, D1 false). Fix: compare only enabled fields (entry + arcs on both sides) + add the selective-publish test, then re-review. Observation (winner inherits the losing restore's unshipped row as previous publish) is pre-existing; main agent to decide whether to ticket."
```

# Round 3 — 2026-11-22（re-review `059127d3..95cb5dbf`）

- 目標：`95cb5dbf` fix(api): compare only enabled fields when a restore loses to a publish (W-871)
- 範圍：只驗 W-871 嘅修正（`rollback.ts` `enabledOf` / `shippedOurs`、新 test、CHANGELOG）；冇新 ID
- 總評：✅ pass（100/100）。W-871 已關，冇新 🔴 / 🟡

## Hard Gates（Round 3）

all pass：`npm run lint` exit 0；`npx tsc -b` exit 0；`npm run typecheck -w apps/api` exit 0；api `publishSerialisation` + `publish` + `revert` + `revertEdgeCases` + `selectivePublish` 5 files / 102 tests 全綠（exit 0，`apps/api` 入面 `npx vitest run <5 個檔>`，冇跑 full suite）。RED 驗證：將 `rollback.ts` 暫時換返 `059127d3` 版本，新 test「winner is a selective publish that dropped an arc (W-871)」失敗（`expected false to be true`），其餘 13 個過；換返之後 working tree 乾淨。

## 評分結果（Round 3）

| 維度     | 得分    | 滿分    | 備注                                                  |
| -------- | ------- | ------- | ----------------------------------------------------- |
| 正確性   | 25      | 25      | W-871 關；raw 比較喺兩個 interleaving 都判斷正確      |
| 安全性   | 20      | 20      | 冇新輸入面                                            |
| 可維護性 | 20      | 20      | `enabledOf` 範圍同 `restoredDefinition` 一致          |
| 測試覆蓋 | 15      | 15      | 選擇發佈 case（apply 後落地）RED 已驗；W-870 次序保留 |
| 性能     | 10      | 10      | 只喺 409 路徑                                         |
| 代碼風格 | 10      | 10      | lint / prettier 過                                    |
| **總分** | **100** | **100** |                                                       |

**結果：✅ pass**

## 上一輪項目

- W-871 ✅ 關：`notShipped` 改為 `shippedOurs` —— entry `enabled` + 兩邊都有嘅短篇（用 id 對）嘅 `enabled`；線上冇 entry → revert；線上冇嘅短篇唔計。新 test 斷言 R2 golden `enabled: true`、只有 `season-1`，D1 `enabled` = 線上、未完成短篇（下架）留喺 D1，publishes 行 = [1, 2, 3]，`expectInStep` 過
- Raw 值比較（冇 key 唔當預設）唔會令「D1 跟線上」出錯：
    - 贏咗嗰次用一個 `SELECT`（`store.ts:63`）讀 D1，而 apply 係一個 D1 batch（transaction），所以佢見到嘅係**全部舊值或者全部新值**；冇被剔走嘅 entry / 短篇，definition 係 D1 字串原樣 `JSON.parse` 入 document（`publish.ts:156`）
    - 讀到新值 → 線上同我哋寫嘅 raw 值完全一樣 → 保持（D1 = 線上）
    - 讀到舊值 → `restoredDefinition` 只改 `enabled`（改值、刪 key、或新短篇設 `false`），`planChanges` 只收有變嘅 entry，所以至少一個 `enabled` 欄位（包括「有 key ↔ 冇 key」）raw 值唔同 → revert，寫返嘅正正係贏咗嗰次讀到嘅舊 definition（D1 = 線上）
    - 「一邊冇 key、一邊明寫 `true`」只會喺線上值唔係由 D1 抄過嚟時出現（選擇發佈換返上次發佈版本），見下面 Observation；正常路徑唔會
- Fallback 冇變：`revertAfterFailure` 仍然 `notShipped(...).catch(() => 全部 true)`；非 `PublishConflictError` 全部 revert；`rejected` 照舊全部 revert
- 樂觀鎖冇變：`revert` 仍然 `expected: change.updatedAt`、`nextUpdatedAt` bump，期間有人儲存就唔寫
- 文字：CHANGELOG `:17`「只比較還原會改嘅欄位（entry 同兩邊都有嘅短篇嘅 `enabled`）」同 code 一致；`rollback.ts:10`「只比較 enabled，選擇發佈剔走短篇都唔影響」屬實（剔走 = 線上冇嗰個短篇 → 唔計）

## 🟢 Observation（唔扣分、唔落 backlog）

- 選擇發佈將**已發佈過**嘅短篇 / 劇換返上次發佈版本（`selectArcs` 用 name 對、`excludedDramas`）時，線上嗰部分唔係由 D1 抄，`shippedOurs` 可能判做未上線而成個 entry revert。要觸發，被剔走嘅短篇要同時喺還原目標 snapshot 同最新 publish 都出現過，但仲有未處理嘅 `newArc` / `newDrama` finding（正常發佈之後 finding 已經 resolve），喺正常流程達唔到；而且被剔走嘅部分本身就係選擇發佈刻意留住「D1 ≠ 線上」，唔屬今次合約範圍。L3 推論，冇重現，唔使改
- 贏咗嗰次喺 apply **之前**讀 D1、又剔走咗一個未發佈過嘅短篇，而我哋淨係改咗嗰個短篇（設 `enabled: false`）時，會判做「已上線」而保持：D1 嗰個短篇變下架，但佢本身唔喺線上，D1 同線上冇唔夾。要 admin 手動上架一個未完成短篇先會出現，影響只係未發佈短篇保持下架。唔使改

## ✅ 做得好嘅地方（Round 3）

- 比較範圍同 `restoredDefinition` 改動範圍完全對齊，註解寫明理由。
- `aroundApply('before' | 'after')` 一個 helper 覆蓋兩個 interleaving，W-870 / W-871 test 共用。
- 新 test 連未完成短篇留喺 D1 都斷言埋，唔只係睇 `enabled`。

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
round: 3
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "n/a (diff-related api 5 files / 102 tests green; W-871 test RED-verified against 059127d3)"
next_action: proceed_to_qa
next_agent: quality-assurance
branch: "fix/api/au-018_publish-serialisation"
context: "W-871 closed: shippedOurs compares entry enabled + enabled of arcs present on both sides; raw-value comparison is sound because the winner reads D1 in one SELECT and the apply is one batch, so it sees all-old or all-new verbatim values. Fallback (.catch -> full revert) and updated_at optimistic lock intact; CHANGELOG / rollback.ts:10 wording accurate. Two L3 observations (selective publish swapping in previously published arcs; pre-apply read with only a dropped arc changed) not reachable in normal flow and do not break the D1-follows-live contract; no backlog. No new IDs."
```
