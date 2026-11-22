# Code Review — 2026-11-22 — P1 admin 草稿一致性（AU-020 / 021 / 022 / 023）

- 日期：2026-11-22
- 審閱者：Code Reviewer（subagent，獨立；冇寫過呢個 branch）
- 目標：`fix/admin/au-020-023_draft-consistency`（base `origin/main` `ea89600`；`0232191` AU-020、`8f73d93` AU-022、`831c33d` AU-021、`26d1e82` AU-023）
- 來源：`.proj-docs/audits/2026-11-22_00-39_audit_full-codebase.md`（AU-020 – AU-023）；用戶決定：AU-023 = 確認框 + `beforeunload`
- Tier：T2（跨 `apps/admin` + `apps/api`，router 換 data router）
- Review Item ID：今次用 `S-1430` – `S-1435`（repo 內最高 `W-857` / `S-1398`，今個 session 其他 review 用到 `W-859` / `S-1423`）；冇 🔴 / 🟡
- 總評：✅ pass（95/100）。四個 fix 都對準 audit 講嘅症狀，新 test 喺 `ea89600` 嘅 code 上面會 fail；淨係得 🟢 / Observation

## Hard Gates

all pass：`npm run lint` exit 0；`npx tsc -b` exit 0；diff 相關 unit（冇跑 full suite / e2e）admin 10 files / 77 tests、api `publishFingerprint` + `publish` + `selectivePublish` + `adminRoutes` 4 files / 88 tests 全綠；改咗嘅 admin 檔 lines 96.22% / branch 86.02%；冇新依賴；No Critical。

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                       |
| -------- | ------ | ------- | ---------------------------------------------------------- |
| 正確性   | 24     | 25      | S-1430（AU-018 餘下嘅 race）、S-1433                       |
| 安全性   | 20     | 20      | fingerprint 係 opaque 值，server 自己重計；412 前乜都冇寫  |
| 可維護性 | 19     | 20      | S-1431 重複嘅 strip                                        |
| 測試覆蓋 | 14     | 15      | S-1432 round-trip 未釘住有內容 / App 外觀嘅 selection      |
| 性能     | 10     | 10      | `GET /api/changes` 多一次 sha256，可以忽略                 |
| 代碼風格 | 8      | 10      | S-1434（data router 預設英文錯誤畫面）、version 未 bump    |
| **總分** | **95** | **100** | AU-020 97 ／ AU-021 95 ／ AU-022 97 ／ AU-023 94（各自計） |

**結果：✅ pass**

## Section A — AU-020 `rebaseDraft`（97）

- `mergeRecords(saved, local, next)` 逐個組合推過：本機改 → 留本機值；對方改 → 用 `next`；對方刪（本機冇掂）→ 跟住冇；本機刪 → 保持刪；兩邊改同一個 key → 本機值贏，`dirtyKeys` 照列；images 逐個 slot 一樣。`dirtyKeys` 之後只係用戶真正改過嘅 key（test `['summary']`）。
- 冇重試：`stored = base + patch`，`rebaseDraft(base, d, stored)` 之後再 `apply`，結果同 `apply(d)` 逐 key 相等（淨係 key 次序可能唔同，`changedKeys` 逐 key 比，冇影響）。兩個 `patchSaved` 並行（R2 自動裁切）亦推過，冇多咗 dirty key。
- **Rescan 行為改變**：`mergeRescan` 唯一 caller 係 `useRescan.ts:21`。用戶會見到嘅分別：清咗一個欄位（key 冇咗）之後撳 ⟳ 重新掃描，以前個欄位會靜靜返嚟、「有未儲存的變更」嗰項消失；而家保持清空、照列做未儲存。我認為係啱嘅，同「本機改過嘅欄位保留」嘅註解一致，舊行為先係 bug。
- 舊 code 驗證：還原 `useEntryEditor.ts` 去 `ea89600`，AU-020 三個 test 全 fail。

## Section B — AU-021 publish fingerprint（95）

- (a) 兩邊都係 `documentFor(rows, context, selected)` → `validateDocument(...).json`，輸入一樣（`entries` 有 `ORDER BY kind, id`；banner 喺 `bannerUrls` 只攞 `standard` / `long`，所以 `StoredBanner` 多咗 `updatedAt` 冇影響）；document 冇日期相關內容（`hkToday` 只用喺摘要），`generatedAt` 已經 null 走。我加咗一個臨時 test（跑完刪咗）：冇 selection、揀內容 + banner + 名稱與簡介、淨揀內容、淨揀 banner，`GET` 兩次相同、帶住 `POST` 都 200，4/4 pass。
- (b) 檢查用嘅 `validated.json` 就係 `commitPublish` 寫入 `publishes.document` 同 R2 嗰份；檢查同 commit 之間有 await，但另一邊嘅**儲存**插入嚟都唔會入到今次發佈。留畀 AU-018：見 S-1430。
- (c) 412 喺 `commitPublish` 之前 throw：冇 `publishes` 行、冇 R2 put、冇 purge、冇 deploy（test 驗咗行數同 R2 內容）。(d) 還原行 `rollback.ts` 自己條路，冇掂；repo 冇其他 script call `/api/publish`；冇 fingerprint 行為不變（test）。(e) fingerprint 約 70 bytes，64 KB 上限夠。
- (f) Admin：fingerprint 一定嚟自畫面顯示緊嗰份 `selected.data`；412 → `refresh()` + revision +1，重讀期間 `loading` 擋住「發佈」，讀完先撳得，送新 fingerprint；冇自動再發佈；URL 嘅 selection 保留。(g) e2e mock 嘅簡化 fingerprint 只驗 admin 流程，真 API 嘅對應由 `publishFingerprint.test.ts` 釘住。
- 舊 code 驗證：api 6/9、admin 4 個新 test fail。

## Section C — AU-022 刪除排程 / 配對（97）

- 兩個掣都係原生 `disabled`（滑鼠、鍵盤都觸發唔到），確認框只可以喺掣可用時開；`unsaved` 入面「改咗 ID 未儲存」唔受 `editor.reload()` 影響（`newId` 係獨立 state），所以用 `dirtyKeys` 做條件係夠嘅。
- `remove` 用 `refresh()` 唔用 `afterSave()`：啱，刪除唔應該帶用戶返待辦，但待辦 / nav 數字要更新。
- `schedule.deleteBody` 同 API 一致（`apps/api/src/content/schedule.ts:4`「DELETE 只刪規則，日子照留」）。
- 舊 code 驗證：`unsavedReload.test.tsx` 4 個 fail。

## Section D — AU-023 離開守衛 + data router（94）

- Router：冇 `basename`、冇 lazy route、冇 `ScrollRestoration`（之前都冇）；`<Routes>` 喺 splat route 入面，app 冇用 `..` 相對路徑，`Navigate` 兩條照行。分別只有兩樣：`navigate()` 變成 async（兩個 test 改 `findByText`、e2e 改等列表嗰行 link，都係更嚴格或者等價嘅斷言，唔係放鬆）；render error 會出 React Router 預設畫面（S-1434）。
- `useBlocker`：每個編輯頁一個 `LeaveGuard`（`DramaEditor` / `ShowEditor` 用 `key={id}`，唔會並存）；`proceed` / `reset` 齊；unmount 由 hook 自己清。`beforeunload` 只喺 dirty 掛、cleanup 對稱，StrictMode 雙重 effect 冇問題。
- 編輯頁自己嘅跳轉全部有 `ownNavigation`：改 ID 成功 / PUT 失敗（`useFollowRename`）、`afterSave({ draftSaved: true })`、新節目返列表、`DeleteEntry`；`useArcMemory` 嘅 hash 跳轉屬同一個編輯頁。POP 唔睇 marker。Marker 只係 `location.state`，app 內冇其他地方設定。AU-013 handoff（`renamedHandoff`）唔受影響：搬去新 ID 嗰次跳轉有 marker，新頁照樣 dirty、照樣有守衛。
- **`afterSave()` 冇 `draftSaved`**：我認為要問係啱嘅，唔應該豁免。改名 / 排程 / 配對只存咗一部分，豁免等於返待辦時靜靜掉咗其餘草稿，正正係 AU-023 要防嘅嘢；確認框畀用戶揀「留下」。
- **`useTextDraft`（App 外觀）**：AU-023 寫明係「編輯頁」（位置 `useEntryEditor.ts`），所以唔屬今次範圍；但係同一類損失，見 S-1435。

## 🟢 / Observation（唔 block）

- S-1430 🟢 `apps/api/src/catalog/routes.ts:82-91` + `publish.ts:321`：`base` 喺 `preparePublish` 讀，`commitPublish` 再讀一次 `latest`；中間有另一次**發佈**落地就捉唔到（AU-018）。方向：`base` 傳入 `commitPublish`，`latest?.row.id !== base` 就 412。
- S-1431 🟢 `apps/api/src/catalog/fingerprint.ts:22-23`：`contentOf` 同 `publish.ts:213-216` `sameContent` 入面嘅 strip 重複，抽一個共用 export；`parseFingerprint` 借用 `SelectionError` 名不副實。
- S-1432 🟢 `apps/api/test/publishFingerprint.test.ts`：round-trip 只有冇 selection 同 `{ content: [] }`；加一個揀內容 key + banner + 名稱與簡介嘅 case（我臨時跑過會 pass）。
- S-1433 Observation `apps/admin/src/features/update/PublishPage.tsx:115`：412 之後重讀摘要失敗時，`ChangedNotice` 仍然寫「以下已更新為最新的變更」而下面係舊摘要（再撳只會再 412，安全）。方向：`loadError` 時唔出或者換字眼。
- S-1434 Observation `apps/admin/src/main.tsx:22`：data router 冇 `errorElement`，render error 會出 React Router 預設英文「Unexpected Application Error!」。方向：加書面語 `errorElement`。
- S-1435 🟢 `apps/admin/src/features/appearance/useTextDraft.ts`：名稱與簡介草稿冇離開守衛；`LeaveGuard` 可以直接用（`dirty={form.dirty}`）。要唔要做由用戶 / main agent 決定。

## ✅ 做得好嘅地方

- Fingerprint 綁喺「會發佈嘅 document」而唔係摘要，server 喺同一份 `validated.json` 上面檢查同寫入。
- `ownNavigation` 由跳轉自己講明，唔靠 render 時機；POP 例外有 test。
- 每個 fix 都有喺舊 code fail 嘅 test；文字全部書面語（`writtenChinese.test.ts` 自動掃 `zh-HK.ts`），掣字短、對象喺 `aria-label` / 標題。

## 驗證唔到

- e2e（`npm run e2e:admin`）冇跑（屬 QA）；真瀏覽器 `beforeunload` 提示、data router 喺 production build 嘅行為只睇過 code 同 e2e script。
- PR description 嘅 `Design Origin:` 行（未有 PR）；diff 冇新 className / CSS，全部沿用 `ConfirmDialog`、`note warn`、`ghost-danger`。
- Version 未 bump（admin 0.9.4、api 0.13.1）：照之前 lane 做法由 main agent 喺 release commit bump（api 多咗 response 欄位同 request 欄位）。

## Round 2 — `514c731`（只驗上一輪嘅項目）

- Gates：`npm run lint` exit 0、`npx tsc -b` exit 0；admin 6 files / 51 tests、api `selectivePublish` + `publishFingerprint` + `publish` 3 files / 57 tests 全綠；冇跑 e2e。
- S-1431 ✅ 已關：`contentWithoutGeneratedAt` 由 `sameContent` 同 `publishFingerprint` 共用；`FingerprintError` 照回 400 同一個 body。
- S-1432 ✅ 已關：三個 round-trip case（內容 + banner + 名稱與簡介、淨 banner、換咗 selection → 412 冇寫入）。
- S-1433 ✅ 已關：重讀失敗時 `useSelectedChanges` 嘅 `data` 變 undefined，`canPublishOf` 回 false，冇舊摘要 + 舊 fingerprint 可以撳；重讀期間 `loading` 擋住。`onChanged().catch` 之後一定 `setState`，唔會卡喺 publishing。
- S-1434 ✅ 已關：`RouteError` 只出 `errorMessage(error)`（同 `app.loadFailed` 一樣係訊息，冇 stack）；要用戶撳先 reload，唔會自己 loop；出錯時成個 App 已經 unmount，守衛同 `beforeunload` 一齊清走。`routerRoutes.tsx` 只係多咗 `errorElement`，路由冇變。
- S-1435 ✅ 已關：`TextCard` 有 `LeaveGuard`；儲存 / 還原後重讀會 reset 草稿，呢頁自己冇跳轉，唔會被擋。圖示 / Banner 裁切唔加守衛我同意：scrim 擋住 app 內跳轉，淨返瀏覽器上一頁 / 重新整理，損失只係重揀一次裁切範圍。
- S-1430：冇喺呢個 branch 處理，帶去 AU-018 lane（`base` 傳入 `commitPublish` / 條件式 insert），唔算呢個 branch 嘅未完成項目。
- 新字串 `app.crashed`、`app.reload`、`publish.changedLoading`、`publish.changedFailed` 都係書面語，`writtenChinese.test.ts` 有掃到。
- 新 finding：S-1436 🟢 `apps/admin/src/features/update/PublishPage.tsx:125-127`：412 之後重讀如果回 422（揀咗嘅 key 啱啱冇咗），`StaleNotice` 同 `ChangedNotice`（failed）會一齊出，兩個「重新載入」掣行為唔同（睇 code，冇重現）。方向：`stale` 時唔出 `ChangedNotice`。
- 結果：✅ pass（96/100）。

```handoff-receipt
protocol: 1
status: pass
score: 96/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "96%"
next_action: merge_develop
next_agent: quality-assurance
branch: "fix/admin/au-020-023_draft-consistency"
context: "Round 2 at 514c731: S-1431..S-1435 closed; S-1430 carried to AU-018 lane; one new suggestion S-1436 (hide ChangedNotice when stale); integration branch is main; version bump pending for main agent; QA to run e2e:admin"
```
