# Code Review — 2026-11-22 — P2 admin reload / 發佈記錄（AU-024 / AU-025）

- 日期：2026-11-22
- 審閱者：Code Reviewer（subagent，獨立；冇寫過呢個 branch）
- 目標：`fix/admin/au-024-025_reload-history` head `1671185a`（base `origin/main` `82f25ed2`；`0735b67b` / `031e4a57` / `d87d6009` AU-024、`f74b5c9d` / `88a40849` AU-025、`6dcd43bf` / `1671185a` release）
- 來源：`.proj-docs/audits/2026-11-22_00-39_audit_full-codebase.md`（AU-024、AU-025，見 `1ba3e7b8`）
- Tier：T2（跨 `apps/admin` + `apps/api`，新 query 參數）
- Review Item ID：預分配 `W-875` – `W-879`、`S-1467` – `S-1476`；今次用 `S-1467` – `S-1468`；冇 🔴 / 🟡
- 總評：✅ pass（100/100）。reload token、`detail=1`、發佈記錄 busy / toast / 載入失敗都對準 audit；淨係得 🟢 / Observation

## Hard Gates

all pass：`npm run lint` exit 0（eslint + `prettier --check .`）；`npx tsc -b` exit 0；`npm run typecheck -w apps/api` exit 0；diff 相關 unit（`npm test -- <path>` 被 reviewer-test-scope hook 當 full suite 擋咗，改用 `npx vitest run <檔>`）：admin `AdminData` / `useResource` / `HistoryPage` / `writtenChinese` 4 files / 22 tests、api（workerd）`entriesDetail` + `entries` 2 files / 37 tests 全綠；冇新依賴；No Critical。冇重跑 e2e。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                                       |
| -------- | ------- | ------- | -------------------------------------------------------------------------- |
| 正確性   | 25      | 25      | token race、etag、欄位對齊、busy 解鎖都驗過                                |
| 安全性   | 20      | 20      | `detail=1` 同 `/api/entries` 一樣經 `apiRoutes` session（有 401 test）     |
| 可維護性 | 20      | 20      | S-1467 fallback 係 dead code（🟢，唔扣分）                                 |
| 測試覆蓋 | 15      | 15      | race（新舊先後 / reject）、query 數恆定、逐欄對單一 GET、busy / 失敗都有釘 |
| 性能     | 10      | 10      | N+1 → 3 條 query；S-1468 可再省一個 round trip                             |
| 代碼風格 | 10      | 10      | 冇新 CSS（重用 `.note.bad.stale-note`、`.revert-btn`）；i18n 書面語        |
| **總分** | **100** | **100** | AU-024 100 ／ AU-025 100                                                   |

**結果：✅ pass**

## 驗證重點（L2）

- **Reload token**（`apps/admin/src/data/useResource.ts:23-52`）：每次 `reload` 攞新 token，只有最新嗰次寫 `data` / `error` / `loading:false`。StrictMode 雙 effect：第一次變 stale、第二次寫入，結果正確；舊嘅遲 resolve、新嘅 reject → 新嘅寫 error、保留之前 data，舊結果唔會蓋；unmount 後 setState 係 no-op（React 18）。stale reload 照 `return data` 畀 caller，但 grep 過冇 caller 用 `reload()` 嘅回傳值，唔影響
- **etag**：`detailOf`（`apps/api/src/content/entries.ts:80-89`）同單一 GET header 都係 `etagOf(row.updated_at)`；`entriesDetail.test.ts` 逐個 entry 對 `response.headers.get('etag')`。就算 Cloudflare 壓縮時將 header 改做 `W/"…"`，`ifMatches` 會去 `W/`，body 嘅強 etag 一樣過 If-Match → 412 流程唔變
- **欄位對齊 `getEntry`**：`AdminData.tsx:25-31` 出 `definition` / `images` / `draft` / `updatedAt` / `kind` / `id` / `etag` / `publishedVersion`（null 唔出 key），同 `endpoints.ts` `getEntry` 一致；`name` / `enabled` 冇漏入 `LoadedEntry`
- **Plain list byte-identical**：`/api/entries`、`?detail=0`、`?detail=true` 三個都對 `PLAIN` 字串
- **Busy**：`useSingleAction` 用 ref 即時擋連撳 + `finally` 解鎖；rollback 錯誤喺 try 入面 catch，之後嘅 `reload` / `refresh` 唔會 reject（`useResource` 吞錯），所以唔會卡住亦冇 unhandled rejection
- **UI**：截圖（淺 / 深）確認載入失敗只出原因 +「重試」、冇「共 0 次」同空表；busy 時「還原」變暗；成功 toast「已還原至 #2」。`history.rolledBack`、`history.rollbackFailed` 書面語，`writtenChinese.test.ts` 綠

## 🟢 Suggestion / Observation

- **S-1467** `apps/admin/src/data/AdminData.tsx:25-31`（+ `AdminData.test.ts:73`、`types.ts` `EntryListItem` 嘅 optional 欄位）：舊 API fallback 係 dead code。admin 唔係分開 deploy：`apps/api/wrangler.toml:8-9` `[assets] directory = "../admin/dist"`，`deploy-api.yml` 同一次 `wrangler deploy` 連 admin 一齊出，Worker 版本回滾亦連 assets 一齊。建議刪 fallback 同佢嘅 test，`definition` / `images` / `etag` / `publishedVersion` 改 required；保留嘅話至少註明「同一 Worker deploy，正常唔會行到」
- **S-1468** `apps/api/src/content/entries.ts:92-100`：`loadPublishedLookup` 喺 `Promise.all([rows, facts])` 之後先讀，多一個 D1 round trip；`detail=1` 時可以放埋入同一個 `Promise.all`
- Observation：載入中（未有 data、未有 error）仍會短暫顯示「共 0 次」，係 base 已有行為，唔屬今次範圍

## ✅ 做得好嘅地方

- API test 用 Proxy 數 D1 query，釘死「同 entry 數量無關」，唔係淨係睇結果
- `useSingleAction` ref + state 雙重擋，連撳同 disabled 兩樣都有 test
- 載入失敗唔再扮「未有記錄」，再 reload 失敗時保留已載入嘅表

## Handoff receipt

```
HANDOFF_RECEIPT
agent: code-reviewer
task: review fix/admin/au-024-025_reload-history (AU-024, AU-025)
status: pass
score: 100
hard_gates: lint=pass, type=pass, api_typecheck=pass, tests=pass (admin 4 files/22, api 2 files/37), coverage=n/a (not measured; new paths all have targeted tests), no_critical=pass, security_scan=n/a (no new deps)
findings: C=0, W=0, S=2 (S-1467, S-1468)
next_action: proceed_to_qa
context: Only 🟢. Per CLAUDE.md "Parallel lane backlog", S-1467 / S-1468 should be cleared in this session (lane fix in PR or cleanup lane); admin version 0.10.1 collision handled by main agent at merge.
report: .proj-docs/reviews/2026-11-22_review_p2-admin-reload-history.md
```

## Round 2（main agent 覆核，head `2262bb46`）

**結果：✅ pass，100/100，冇新 item。** 上輪 2 條 🟢 已關：

| ID     | 處理                                                                                                                                                                                                                   | 結果 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| S-1467 | 刪走舊 API fallback 同佢嘅 test；`EntryListItem` 嘅 `definition` / `images` / `etag` 改 required，`publishedVersion` 仍 optional；`loadAllEntries` = `listEntriesDetail().map(loadedOf)`，欄位同之前逐個合併嘅結果一樣 | 已關 |
| S-1468 | `entries.ts` 先判斷 `detailed`，`loadPublishedLookup` 同 rows / facts 放埋同一個 `Promise.all`；冇 `detail=1` 時第三項係 `undefined`，走返原本 `summaryOf` 路徑（`.text()` test 照過）                                 | 已關 |

Developer gate（exit code 直接睇）：lint 0、`tsc -b` 0、api typecheck 0、`npm test` 539 檔 / 5736、api workerd 29 檔 / 468 + scripts 40、`e2e:admin` 65 / 0。
