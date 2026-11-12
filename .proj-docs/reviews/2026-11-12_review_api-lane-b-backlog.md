# Code Review — api lane B backlog（api 0.7.2）

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立）
- 目標：`fix/api-lane-b-backlog`，`git diff 450e5d4..HEAD`（`652b568` `d0f60e5` `ceb93d0`，base = `origin/main` `450e5d4`）
- 處理嘅 backlog ID：S-849、S-825、S-794、S-778
- Tier：T2（只改 `apps/api`；auth `next` 驗證收緊，行為改動 → api 0.7.1 → 0.7.2）
- 總評：四項都做得乾淨，冇收斂嘅 🔴 / 🟡。`safeNext` 只睇 `?` / `#` 之前嘅 path，逐個 segment 將 `%2e`（大細楷）換做 `.` 再比對 `.` / `..`，同 WHATWG URL 嘅 dot-segment 判斷一致；Hono `c.req.query` 已經 decode 過一次，雙重 encode（`%252e`）落到 `safeNext` 時係 `%2e`，一樣攔到。S-849 嘅 3 個 test 直接鎖住 `publishedFacts` SQL 嘅三個條件（main agent 已做 mutation check）。webp 純 refactor，offset 數值全部同舊值一樣。

## Hard Gates

all pass。

- `npx eslint` + `npx prettier --check`（6 個改動檔）：exit 0；main agent 另外喺 branch head 跑咗 root `npm run lint`：pass
- `npx tsc -b`（`apps/api`）：exit 0
- api：`npx vitest run --config vitest.config.ts test/auth.test.ts test/entries.test.ts test/webp.test.ts`，3 files / 73 tests pass
- 冇跑 full suite 同 e2e（Hard Rule #7，由 QA / CI 負責）。Coverage n/a（冇量度），改動模組都有專屬 test。Security：冇新依賴。
- Version：api `0.7.1` → `0.7.2`，`package-lock.json` 嘅 `apps/api` version 行跟住改，一致。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                                    |
| -------- | ------- | ------- | ----------------------------------------------------------------------- |
| 正確性   | 25      | 25      | dot-segment 判斷同 WHATWG 一致；webp offset 數值不變                    |
| 安全性   | 20      | 20      | `/x/../auth/…`、`%2e%2e` 繞過 `/auth` 檢查已封；query / hash 唔誤殺     |
| 可維護性 | 20      | 20      | `pathOf` 抽出共用；webp 常數由 `FOURCC_BYTES` / `SIZE_FIELD_BYTES` 推導 |
| 測試覆蓋 | 15      | 15      | 7 個 dot-segment 反例 + 4 個正例；publishedFacts 3 個 SQL 條件有 test   |
| 性能     | 10      | 10      | 每次 login 多一次 split，可忽略                                         |
| 代碼風格 | 10      | 10      | lint / prettier 全過                                                    |
| **總分** | **100** | **100** | 結果：pass                                                              |

## 各項檢查

- S-849 `apps/api/test/entries.test.ts:97-144`：failed publish、舊 ok publish JSON 壞、每日播 `drama:<劇>:<日子>` 三種情況。對照 `apps/api/src/catalog/store.ts:120-146`：`status = 'ok'`、兩個 `json_valid`、`tail` 冇第二個 `:` 時 `arc` 係 `NULL`，三個條件都有 test 對應。壞 JSON 嗰份同時壞咗 `document` 同 `episode_ids`；reviewer 逐個刪走兩個 `json_valid` 再跑（跑完已還原），兩次都係 `json_each` 拋錯 → test 紅，所以一個 case 已經鎖住兩個條件。
- S-825 `apps/api/src/auth/next.ts:20-42`：dot-segment 檢查放喺 `isAuthPath` 之前，`/shows/..`（normalise 做 `/`）都拒絕，fallback 一樣係 `/`，偏保守但冇害。`a..b`、`.hidden` 呢類非完整 segment 保留，有 test。
- S-794 `apps/api/src/assets/webp.ts:19-57`：`RIFF_HEADER_BYTES = 12`、`CHUNK_HEADER_BYTES = 8`、`RIFF_SIZE_EXCLUDED_BYTES = 8`、`WEBP_MAGIC_OFFSET = 8` 推導結果同舊 literal 一樣；`webp.test.ts` 冇改，全綠。
- S-778 `apps/api/README.md:24`：`wrangler.toml` 冇 `keep_vars`，所以「`wrangler deploy` 會用 `[vars]` 蓋走 dashboard var」講法正確；列出嘅 `ADMIN_EMAILS`、`PLAYER_ORIGINS` 都喺 `[vars]`。

## 🟢 Suggestion / Observation（入 backlog，唔 block）

- S-856 `apps/api/src/assets/webp.ts:43`：`VP8_HEIGHT_OFFSET = VP8_WIDTH_OFFSET + 2` 仲有一個 literal `2`（有註解「16-bit = 2 bytes」）。可以加 `UINT16_BYTES`，同 `uint16` / `uint32` helper 一齊用，S-794 就做得齊。
- Observation（lane 範圍外，唔改）：`apps/admin/src/app/loginHref.ts:23-28` 嘅前端 `isSafeNext` 冇 dot-segment 檢查，`/auth` 判斷用 `startsWith('/auth/')`，同 api `safeNext` 唔一致。admin 嘅 `next` 嚟自 `location.pathname`，瀏覽器已經 normalise 過，而且 api 係最終把關，所以冇實際影響；如果想兩邊規則一致，可以另開 admin follow-up。
- ID 分配：本報告賦號前掃咗 `.proj-docs/` 同所有 local / remote branch，最高係 C-014、W-717、S-851（`origin/claude/peaceful-hamilton-35etnm`）。其他 parallel session 可能同時賦號，merge 時如果撞號，以先 merge 入 `main` 嗰份為準，後嗰份重新編號。

## ✅ 做得好嘅地方

- `pathOf` 抽出嚟，`isAuthPath` 同 `hasDotSegment` 共用同一個「path 範圍」定義，唔會兩邊各自 split 出唔同結果。
- S-849 test 直接 insert `publishes` row，唔經 publish API，三個 SQL 條件逐個鎖住，test 名講清楚意圖。

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "fix/api-lane-b-backlog"
context: "Handled S-849, S-825, S-794, S-778. C=0, W=0. New S-856 (webp.ts:43 literal 2). Observation: apps/admin loginHref isSafeNext lacks dot-segment check (out of lane scope, no practical impact). IDs allocated after scanning all refs (max C-014/W-717/S-851); parallel sessions may collide. Integration branch is main. Report committed locally only, not pushed (code CI running)."
```

> ID 重編（2026-11-12 merge 時）：parallel lane 撞號，以先 merge 入 `main` 嘅 Lane D 為準，本報告嘅新 S-ID 已改做 backlog 現行編號。
