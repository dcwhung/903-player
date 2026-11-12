# Code Review — Phase 4 L1：banner + publish 警告 + R2 原圖代讀（api 0.8.0）

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立）
- 目標：`feature/api-phase4` @ `bac01a6`，`git diff origin/main...HEAD`（只限 `apps/api`）
- 對照：`.proj-docs/plans/2026-11-12_plan_phase4-5.md`「L1：api 0.8.0」段 1–5 項、「已確認決定」表（Banner / R2 原圖 / R2 檔名 / Contrast）
- Tier：T2（新 migration、新 endpoint、publish document 加欄位；admin L2 按呢個 contract 開發）
- 總評：L1 五項全部做齊，冇收斂嘅 🔴 / 🟡。Banner 用單行草稿表（`CHECK (id = 1)`），走同 entries 一樣嘅 draft → publish 流程。`documentFromEntries` 將 `banner` 設做必填 context，所以 publish、rollback、`/api/changes` 三個 caller 都要畀，compile 期已經擋住漏傳。`r2-source` 嘅白名單係由即場掃描砌出嚟，用 exact match，唔做字串拼接，所以 path traversal、讀錄音檔都行唔通。head 同 get 之間如果檔案被覆蓋，會再驗一次大小同 MIME。test 逐項對應 plan 第 5 項（auth、key 白名單、大小上限包括邊界值、banner publish validator）。下面只有 🟢，冇一項需要改 contract。

## Hard Gates

all pass。

- `npx eslint apps/api`：exit 0。`npx prettier --check` 改動檔：通過（`.sql` / `.toml` 冇 parser，略過）
- `npx tsc -b`（apps/api）：exit 0
- `npx vitest run --config vitest.config.ts`，跑 `banner` `r2Source` `publishWarnings` `publish` `assets` `adminRoutes` 6 個相關 test 檔：109 tests pass
- 冇跑 full suite 同 e2e（Hard Rule #7，由 QA / CI 負責）。Coverage n/a（workers pool 冇量度）；新增嘅 3 個模組都有專屬 test。Security：冇新依賴

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                                                            |
| -------- | ------- | ------- | ----------------------------------------------------------------------------------------------- |
| 正確性   | 25      | 25      | banner 必填 context；rollback / changes 都傳 D1 banner；`bannerChanged` URL 格式同 publish 一樣 |
| 安全性   | 20      | 20      | key 白名單用 exact match；20 MB 上限；MIME 檢查；`nosniff`；改嘢要 same-origin                  |
| 可維護性 | 20      | 20      | 常數有名（`R2_SOURCE_*`、`SLOTS`、`BANNER_ROW_ID`）；函數短；S-905 屬小重複                     |
| 測試覆蓋 | 15      | 15      | 413 有正好上限嘅邊界 test；banner 冇喺 assets 時 publish 422；rollback 保留 banner              |
| 性能     | 10      | 10      | 每次 `r2-source` 都即場掃描，README 有寫明成本，admin 用量細；S-901 可以再省                    |
| 代碼風格 | 10      | 10      | lint / prettier 通過；註解書面語                                                                |
| **總分** | **100** | **100** | 結果：pass（只有 🟢）                                                                           |

## 🔴 / 🟡

冇。

## 🟢 Suggestion / Observation（入 backlog，唔 block）

- S-900 `apps/api/src/content/sources.ts:103`、`:99`：`isScannedSource` 用 key 第一段（`split('/')[0]`）去搵劇。但 `audio.folder` 喺 schema 係任何 string，`GET /dramas/:id/sources` 又直接用成個 folder 做 prefix。如果 folder 係多層（例如 `a/b`），`sources` 會列出 key，但 `r2-source` 一律回 404，兩個 endpoint 唔一致。而家 admin 只揀頂層 folder（`listTopFolders`），所以實際唔會中。建議改做「有劇嘅 folder + `/` 係 key 嘅前綴」，或者 schema 寫明 folder 唔可以有 `/`。
- S-901 `apps/api/src/banner/routes.ts:31`：`storedSize` 為咗讀闊高，`get` 晒成個 WebP（最多 1 MB × 2）。WebP header 30 byte 內已經有尺寸，可以用 `bucket.get(key, { range: { length: 32 } })`，但要先確認 `parseWebp` 收部分 buffer 得唔得。
- S-902 `apps/api/src/banner/routes.ts:51`：R2 有個 object 但係 parse 唔到 WebP 時，錯誤訊息同「冇上載」一樣都係 `not uploaded`，admin 會誤會。可以分開寫 `is not a valid WebP`。
- S-903 `apps/api/src/catalog/routes.ts:101`（`publishChanges` → `apps/api/src/admin/changes.ts:151`）：發佈記錄嘅變更摘要只比較 shows / dramas。淨係換 banner 嗰次 publish，喺歷史列表會顯示「冇改動」。`/api/changes` 有 `bannerChanged`，但歷史冇。可以考慮喺 summary 加 banner flag；呢個係加欄位，L2 唔使改。
- S-904 `apps/api/src/content/sources.ts:116-119`：R2 記住嘅 Content-Type 只接受 `image/jpeg|png|webp`。用其他工具上載可能記咗 `image/jpg`（非標準寫法），會被 415。可以考慮將 `image/jpg` 當 jpeg 處理，或者只記低 log。
- S-905 `apps/api/src/banner/routes.ts:49`、`apps/api/src/catalog/publish.ts:81`：`name.split('.')[0] ?? ''`（由圖檔名攞 hash）重複出現，可以抽一個 `hashOfImageName` helper。
- Observation：`ASSET_UPLOAD_DIMENSIONS` 係所有 slot 共用嘅白名單，而 entries 嘅圖從來冇按 slot 檢查尺寸（main 已經係咁）。所以 banner 尺寸嘅圖都可以填入 disc / tile，靠 admin 揀 slot 時把關。呢個唔係今次引入嘅問題。

## ✅ 做得好嘅地方

- `DocumentContext.banner` 係必填，連 `null` 都要明確傳，所以 rollback、`/api/changes` 冇可能靜靜雞漏咗 banner。rollback 用 D1 banner 嘅語意有 test 鎖住。
- `streamSource` 喺 get 之後再驗一次；唔合格就 `body.cancel()`，唔會將未驗嘅內容傳出去。
- 警告唔阻 publish，`unchanged` 都照回 `warnings`；驗證唔過就回 `[]`。三種情況都有 test。

## 修訂代碼

冇（冇 🔴 / 🟡）。

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
branch: "feature/api-phase4"
context: "Phase 4 L1 api 0.8.0 @ bac01a6; C=0, W=0; S-900..S-905 backlog only (no contract change needed); integration branch is main; report committed locally, not pushed"
```
