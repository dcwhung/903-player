# 903-player：變更摘要準確度（假「圖片」改動、配色比較、排序）

## Context

用戶 2026-11-14：確認發佈頁見到「修改 · 劇集 · 圖片」（蘭茜夫人劇場、森美小儀系列），但兩套劇都冇改過圖，亦冇「還原」掣。要求完整檢查圖片、基本資料、配色嘅修改同還原流程。Branch：`fix/publish-change-accuracy`。

## 問題同決定

| #   | 問題                                                                                            | 位置                                                          | 決定                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 冇揀 / 未完成嘅新短篇由 definition 拎走，但佢嘅圖留喺 `images`                                  | `apps/api/src/catalog/selectDocument.ts` `selectArcs`         | 拎走短篇時連佢嘅圖一齊拎走（同一個檔仲有其他 slot 指去就留）                                                                           |
| 2   | 冇揀嘅短篇換返上次發佈版本，但 `images` 用 D1 而家嘅                                            | 同上                                                          | 換返上次版本嘅短篇，佢 slot 指去嘅檔用上次發佈嘅 `images` 值                                                                           |
| 3   | 以前選擇性發佈已經將冇用嘅圖寫入 production catalog                                             | 已發佈資料                                                    | 由 #4 處理（唔報），下次發佈自然清走                                                                                                   |
| 4   | 對唔到任何 slot 嘅圖報做「圖片」（播放器睇唔到、冇得還原）                                      | `packages/catalog/src/admin/editChanges.ts` `imageEditFields` | 前後兩個版本都冇 slot 指去嘅檔唔報                                                                                                     |
| 5   | 編輯頁「已修改」用 key 次序敏感嘅 `JSON.stringify`；變更摘要用 `sameJson`（忽略 key 次序）      | `apps/admin/src/features/revert/revertScope.ts`               | 改用 catalog `sameJson`                                                                                                                |
| 6   | 拖曳排序寫晒上架 entry 嘅 `definition.order` → 每個 entry 一行「修改 · 排序」，逐個還原會撞次序 | `apps/api/src/admin/order.ts`、summary                        | **A**（用戶揀）：排序當整體改動；確認發佈頁一行「節目排序已更改」/「廣播劇排序已更改」，「還原」一次過還原成個列表；編輯頁唔出排序還原 |

## Contract（細節由 developer 讀 code 定，改咗寫返「實作差異」）

### `packages/catalog`

- `ChangeKind` 加 `'reorder'`；item `{ kind: 'reorder', when: 'now', detail: { list: 'shows' | 'dramas' } }`（冇 `entry`）
- `summarizeChanges`：`order` 加入 entry 頂層 handled keys（唔再出 edit）；上架 entry 嘅相對次序（按 `order`，同 player 一樣嘅排法）前後唔同 → 每個 list 一個 `reorder` item，排喺 `now` 組最頂
- `imageEditFields`：前後都冇 slot 指去嘅檔唔報（#4）
- export `sameJson`（#5 admin 用）

### `apps/api`（0.12.0）

- `selectArcs`（#1、#2）；確認發佈頁預覽同真發佈共用，結果要一致
- `POST /api/order/:kind/revert`：將 D1 每個 entry 嘅 `definition.order` 換返最新 ok publish 嘅值（published 冇 `order` = 刪 key；published 冇呢個 entry = 唔郁）；用同 `order.ts` 一樣嘅 `json_set` 原地改，唔郁其他欄位；冇 published → 409 `notPublished`；回應 200 `{ updated: number }`
- `POST /api/entries/:kind/:id/revert` 拒絕 `field: 'order'`（400）

### `apps/admin`（0.8.0）

- `revertScope.ts` 用 `sameJson`（#5）；`order` 唔出喺「其他已修改」
- 時間線：`reorder` item 係 `now` 組最頂一張卡「節目排序已更改」/「廣播劇排序已更改」+「還原」→ 確認框（一項「排序」）→ `POST /api/order/:kind/revert` → refresh
- 發佈 / 部署記錄頁識 `reorder` item
- i18n 書面語

## 測試（用戶今次嘅情況做例子）

- 揀少咗新短篇（從未發佈）→ 冇「圖片」改動；document 冇嗰個短篇嘅圖
- 冇揀嘅短篇換返上次版本 → 用上次嘅圖
- 上次 catalog 有冇用嘅圖、今次冇 → 唔報
- 配色 key 次序唔同 → 編輯頁唔出「已修改」
- 拖曳排序 → 一個 `reorder` item；還原後次序同上次發佈一樣
- 確認發佈頁預覽同真發佈一致

## 版本

api 0.12.0、admin 0.8.0（MINOR：新 change kind + 新 endpoint）

## 實作次序

1. catalog + api（Backend Developer）
2. admin（Frontend Developer）
3. Code Review → QA S1 → 截圖畀用戶 → PR → CI 綠就 merge（用戶已授權）

## 實作差異（catalog + api，Backend Developer 2026-11-14）

- **`reorder` 位置**：`now` 組最頂，但排喺 `rollback` item 之後（還原記錄嗰行照舊第一）；兩個列表都有就 `shows` 先、`dramas` 後
- **相對次序**：淨係比較前後**都上架**嘅 entry（`isEntryListed`，由 `changes.ts` 搬去 `rawDefinition.ts` 共用），排法 = `compareOrderThenId`（order 唔係數字當冇寫）；新加 / 拎走 / 落架嘅 entry、淨係重新編號、第一次發佈（prev = null）都唔出 `reorder`
- **`images` 欄位**：#4 之後冇 slot 指去嘅檔一律唔報，所以 `summarizeChanges` 唔會再出 `fields: ['images']`；admin 照留 `images` 嘅 label（舊發佈記錄仲有）
- **#2 共用檔**：換返上次版本嘅短篇，佢指去嘅檔如果同時有今次照發佈嘅 slot 指去（例如共用劇集 `tile.webp`），用 D1（今次）嘅值，唔用上次嘅：其他已儲存改動照發佈優先
- **`POST /api/order/:kind/revert` 範圍**：D1 呢個 kind 嘅**全部** entry（包括下架 / draft），只要 published document 有佢；回應 `{ updated }` = 真係改咗嘅行數（值冇變唔計、唔郁 `updated_at`）。`updated_at` 規則（S-799）抽咗做 `order.ts` `bumpedUpdatedAt(param)` 共用
- **Entry revert `order`**：頂層 `field: 'order'` 一律 400（message 指去 `POST /api/order/:kind/revert`）；短篇 field 唔受影響（短篇冇 `order`）
- **Admin 最少改動（等 Frontend 接）**：`timelineEntries.ts` `TONES.reorder = 'edit'`、`zh-HK.ts` `kind.reorder: '排序'`，令 `tsc` 過；`publishStats` 唔計 `reorder`、時間線 / 記錄頁未有專用卡，由 admin 部分處理
- **`sameJson`** 由 `packages/catalog` admin index 匯出（root index `export * from './admin'` 一齊有）

## 實作差異（admin 0.8.0，Frontend Developer 2026-11-14）

- **類型 tag**：`kind.reorder` 由 backend 暫定嘅「排序」改做「修改」（橙色 `edit` tone）：卡標題已經寫「節目排序已更改」，tag 再寫「排序」重複；記錄頁「類型」欄一樣寫「修改」
- **卡**：`ReorderCard.tsx`，卡頭用 App 外觀卡嘅方格 icon（`ArrowUpDown`）+ tag + 標題，「還原」喺卡頭最右（冇下面嘅行）；卡 key / `data-revert-anchor` = `reorder:<list>`（唔跟 index），還原後卡冇咗 focus 去 `h1`
- **確認框**：名 =「排序」（`changeFields.order`），所以標題「還原排序？」、toast「已還原排序」；一行冇前後值（同「恢復上架」一樣嘅 single row），剔走就「還原 0 項」灰
- **`RevertFlow`**：`entry` prop 改做 `perform(items)`（`entryReverter(entry)` / `revertOrder(list)`，`api/revertEndpoints.ts`）；`useRevertAction.run(perform, name, close)`，412 / 409 / toast / focus 照舊共用
- **統計**：`publishStats.edits` 計埋 `reorder`；`canPublish` 本身用 `items.length`、更新頁「下一步」用 `others`（api 一定放 reorder 入 `others`），兩樣唔使改
- **#5**：`revertScope.ts` `NOT_REVERTABLE` 加 `order`，所以編輯頁任何地方（包括「其他已修改」）同確認發佈頁舊格式 `edit` 行都唔出排序還原
- **記錄頁**：`historyName` / `itemName` 識 `reorder`；`itemStatusOf` 回 `undefined`（唔再錯出「已上架」）；冇縮圖
- **e2e**：`apps/admin/e2e/mockReorder.mjs`（`createState({ reorder: true })`：節目排序未發佈 + 記錄 #4 廣播劇排序；`POST /api/order/:kind/revert`，冇任何發佈記錄 = 409）、`reorderChecks.mjs` 三個 check；截圖（deviceScaleFactor 2，淺 / 深色）放 `.proj-docs/qa/screenshots/2026-11-14_publish-change-accuracy/`
