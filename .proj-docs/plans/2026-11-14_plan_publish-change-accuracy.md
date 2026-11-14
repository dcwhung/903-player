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
