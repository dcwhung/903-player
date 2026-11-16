# Code Review — Phase 4 L0：`packages/catalog` schema + 共用常數

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立）
- 目標：`feature/catalog-phase4-schema` @ `ad5725c`，`git diff $(git merge-base HEAD origin/main)..HEAD`（15 檔，+523 / −37）
- Spec：`.proj-docs/plans/2026-11-12_plan_phase4-5.md`「L0：`packages/catalog` schema」+ 決定表 Contrast 行
- Tier：T2（package 新 API，api / admin import 改動但行為不變）
- 總評：四項都跟 spec。banner validator 同 JSON schema 規則一致（兩張都要、唔准多 key、URL 規則同 images manifest 共用 `imageUrl` definition），parity test 有 8 個負例。S-805 搬常數後，api 白名單同 `allowed` 次序、`ASSET_MAX_BYTES`、admin `SLOT_SIZES` 數值都冇變。冇收斂嘅 🔴 / 🟡。

## Hard Gates

all pass。

- lint：`npx eslint <15 個改動檔>` 0 error（淨係 `catalog.schema.json` 冇 config 嘅 ignore warning）；`npx prettier --check <改動檔>` 全過
- type：`tsc --noEmit`（catalog）、`tsc -b`（api、admin）exit 0
- unit（只跑 diff 相關）：catalog 5 檔（`listing` `contrast` `dimensions` `document` `catalogSchema.node`）151 pass；api `test/assets.test.ts` 9 pass（包括 422 `allowed` = `['600×600','1216×684']`）；admin `ImageSlot.test.tsx` + `imageCrop.test.ts` 14 pass
- 冇跑 full suite 同 e2e（Hard Rule #7）。Coverage n/a（冇量度），每個新 module 都有專屬 test。Security：冇新依賴。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                 |
| -------- | ------- | ------- | ---------------------------------------------------- |
| 正確性   | 25      | 25      | banner / cover role / contrast 跟 spec；api 行為不變 |
| 安全性   | 20      | 20      | banner URL 用返 `isCatalogImageUrl`，拒 http / 相對  |
| 可維護性 | 20      | 20      | 常數一份（S-805）；S-892 / S-893 只係建議            |
| 測試覆蓋 | 15      | 15      | contrast 對住 WCAG 已知數字；schema parity 正負例齊  |
| 性能     | 10      | 10      | `coverRolesOf` 一次 pass；contrast 8 對色            |
| 代碼風格 | 10      | 10      | lint / prettier 全過；命名常數齊（sRGB 係數、FLARE） |
| **總分** | **100** | **100** | **結果：✅ pass**                                    |

## 行為不變驗證（S-805）

- api `routes.ts`：`ASSET_UPLOAD_DIMENSIONS = [disc, tile]` 數值同次序同舊 `ASSET_DIMENSIONS` array 一樣；`ASSET_MAX_BYTES` 仍然係 `1024 * 1024`。`assets.test.ts:81` 鎖住 `allowed` 字串。
- admin `imageUpload.ts`：`SLOT_SIZES` 數值不變；`Size` 變成 readonly，`tsc -b` 過，即係冇 consumer 改寫尺寸。
- `ArcScan` 加 optional 欄位：`series.ts:160` 嘅 `summaryOf` 逐個欄位抄，`merge.ts:213` spread 嘅係 `DraftArc` 唔係 `ArcScan`，所以 D1 draft JSON 同 rescan diff 唔會多咗欄位。admin scan response 只係多咗兩個 optional 欄位。

## 🟢 Suggestion / Observation（入 backlog，唔 block）

- S-891 `packages/catalog/src/theme/contrast.ts:77`：`pairsOf` 冇 export，`checkThemeContrast` 只回唔合格嘅對。L2 theme 編輯器要「每對色顯示比例同合格與否」（plan L2 第 2 點），到時 admin 要自己再抄一次配對規則。建議 export 一個回晒全部對（連 `ratio`、`passes`）嘅 function，`checkThemeContrast` 喺上面 filter。
- S-892 `packages/catalog/src/theme/contrast.ts:13`：`HEX_COLOUR_PATTERN` 同 `core/reader.ts:25` 重複（一個有 capture group，一個冇）。可以共用一個 pattern，或者由 `themeSchema` export。
- S-893 `apps/admin/src/ui/imageUpload.ts:2`、`apps/admin/src/i18n/zh-HK.ts:270`：tile slot 喺 admin 叫「Banner」（1216×684），同 Phase 4 首頁 banner（1200×517 / 2000×400）撞名。L2 加 banner 頁之前建議改 tile 嘅 label / 註解，費事用戶同開發者混淆。
- Observation：api / admin 改咗 code 但冇 bump version。plan lane 表 L0 版本欄寫「—（package）」，而且係純 refactor、行為不變，所以符合 plan；api 0.8.0 喺 L1 bump。
- Observation：contrast 用 sRGB 閾值 0.04045（WCAG 2.x 舊版寫 0.03928）。8-bit 色值兩個閾值之間冇任何值，結果一樣。

## ✅ 做得好嘅地方

- `readImageUrl` 抽出嚟，images manifest 同 banner 用同一條規則；JSON schema 亦都抽咗 `imageUrl` definition，兩邊 parity test 一齊鎖住。
- `coverRolesOf` 靠 images 已經按 byte 排好，揀「第一個」嘅行為穩定，有 test 覆蓋；非圖片副檔名同相似檔名（`cd cover 2.jpg`、`cdcover.jpg`）都唔會配對。
- `checkThemeContrast` 認唔到嘅色回 `ratio: null` 唔 throw，符合「只警告」決定。

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
branch: "feature/catalog-phase4-schema"
context: "C=0, W=0, S-891 (contrast.ts:77 export all pairs for L2), S-892 (hex pattern dup), S-893 (admin tile labelled Banner); integration branch is main; api/admin behaviour unchanged (verified)"
```
