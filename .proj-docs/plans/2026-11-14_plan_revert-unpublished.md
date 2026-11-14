# 903-player：還原未發佈改動

## Context

用戶 2026-11-14：一日未發佈，節目 / 劇集 / 短篇嘅任何改動（圖、字、配色、上下架）都要可以還原返上次發佈嘅版本；而家喺確認發佈頁發現有問題都冇得撤回。
Mockup：`_mockups_/admin-revert/index.html`（用戶確認）。Branch：`feature/admin-revert-unpublished`。

## 已確認決定

| 項目       | 決定                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 還原去邊   | 最新一次 ok publish 嘅版本（發佈 / 部署記錄「使用中」）                                                                            |
| 包括       | 頂層 definition 欄位、圖（`tile` / `disc` 連 `images`）、配色、上下架（`enabled`、`removedAt`，包括未到期嘅排程下架）、短篇欄位    |
| 唔出還原   | 從未發佈過嘅新節目 / 新劇 / 新短篇；新集數                                                                                         |
| 確認發佈頁 | 時間線每行（`edit` / `unlist` item，劇本身或者某個短篇）最右「還原」；短篇名唔做 link；冇「全部還原」                              |
| 確認框     | 列出嗰行嘅每項改動，每項有剔格（預設全剔）；圖並排「已發佈 / 目前」，字顯示前後，下架顯示「恢復上架」；掣寫「還原 N 項」，冇剔就灰 |
| 編輯頁     | 喺原本編輯位：欄位標題旁「已修改」+「還原」；圖位鉛筆旁加圓形還原掣；文字欄下面細字「已發佈：…」；有未儲存改動時唔准還原           |
| 樣式       | 所有「還原」掣同「刪除」掣（現有 `ghost-danger`，一齊改）：淺紅底 `--danger-bg` + 紅字 `--danger-ink`                              |
| 還原之後   | 即刻寫入 D1，仍然未發佈；時間線 / 待辦 / 編輯頁即時更新；toast「已還原…」                                                          |
| 文字       | Admin 介面書面語（`.claude/CLAUDE.md`）                                                                                            |
| 版本       | api 0.11.0、admin 0.7.0（MINOR）                                                                                                   |

## Contract（Backend 讀 code 後可以調整細節，改咗要寫返「實作差異」）

### `apps/api`（0.11.0）

- `GET /api/entries/:kind/:id` 回應加 `published: { definition, images } | null`：最新 ok publish document 入面嗰個 entry（冇 publish / document 冇佢 = `null`）
- `POST /api/entries/:kind/:id/revert`，要 `If-Match`；body `{ items: { arc?: string; field: string }[] }`
    - `arc` = 短篇 key（`arcIdOf`：id，冇就用名）；冇 `arc` = entry 頂層
    - `field` = definition key（`tile` / `disc` 會連 `images` 入面嗰個檔一齊還原；`enabled` / `removedAt` = 上下架）
    - 頂層 / 短篇喺 published 冇嗰個 key = 刪走 D1 嗰個 key
    - 短篇喺 published 存在但 D1 刪咗：還原 = 加返（放返 published 嘅位置）
    - 冇 published / 嗰個短篇從未發佈 → 409；未知 field 或者 shape 唔啱 → 400；412 ETag 唔啱
    - 寫入照用現有 PUT 嘅驗證同 save 路徑；回應同 PUT 一樣（`updatedAt`、`draft`、`warnings` + ETag）
- 冇再用嘅 `images` key（還原後冇 slot 指去）可以清走；寫明喺實作差異
- 排程規則（`schedules` table）：決定要唔要跟住還原，寫明喺實作差異

### `apps/admin`（0.7.0）

- 確認發佈頁時間線：`edit` / `unlist` 行加「還原」→ 確認框（逐項剔）→ `POST …/revert` → reload changes / todos / entries
- 編輯頁（節目、劇集基本資料、短篇 tab）：同 published 唔同嘅欄位加「已修改」+「還原」；圖位圓形還原掣；文字「已發佈：…」
- `ghost-danger` 同還原掣：`--danger-bg` 底
- e2e mock API 支援 `published` 同 `revert`

## 實作次序（同一條 branch）

1. api（Backend Developer）
2. admin（Frontend Developer）
3. Code Review → QA S1 → 截圖畀用戶 → 開 PR → CI 綠就 merge（用戶已授權）

## 風險

- 🔴 圖：`images` 嘅檔名同 slot 對應（慣例名 `tile.webp` / `arcs/<id>/tile.webp`）唔可以搞亂其他 slot（同 `packages/catalog/src/admin/editChanges.ts` 一樣用 definition 指去嘅檔名）
- 🟡 Published document 讀唔到（壞 JSON）→ 當冇 published，唔出還原（fail closed）
- 🟡 改名（rename）之後 entry id 唔同：document 用舊 id 搵唔到 → `published: null`
