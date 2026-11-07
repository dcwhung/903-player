# P9 QR 跨機同步 — 匯入規則（grill 結論）

**日期**：2026-11-07
**範圍**：P9 #11（QR 進度轉移，無 server）嘅匯入 logic；只係決定，未有 production code
**Preview**：`feature/transfer/qr-sync` `f04d144`（第四版，`_mockups_/qr-transfer/index.html`）
**相關**：`plans/2026-11-04_plan_requirements-priority.md`（P9 #11）、branch `claude/clever-pasteur-9flnr7` 嘅 `plans/2026-11-06_plan_backend-admin.md`「Phase −1」

## 前提

- P9 喺 **Phase −1（v1.29.0）之後**先實作：進度 / 收藏 key 由音檔 URL 改為 episode ID，storage 搬去 `903player:progress:v2` / `903player:bookmarks:v2`
- Episode ID 格式（已確認）：

| 類型             | ID                             |
| ---------------- | ------------------------------ |
| 廣播劇（有短篇） | `drama:<dramaId>:<arcId>:<no>` |
| 廣播劇（每日播） | `drama:<dramaId>:<YYYY-MM-DD>` |
| 電台節目錄音     | `show:<showId>:<YYYY-MM-DD>`   |

- 所以 QR payload 一律用 episode ID 做 key，**冇 URL-keyed 格式**；preview v4 ⑤ 嘅短 ref（`s<節目>.<日數>`、`r<劇>.<短篇 index>.<集數>`）作廢
- Preview v4 已定、沿用：QR = M + 細 logo；QR 最多最近 50 集 + 全部收藏，分享連結有齊；連結 24 小時過期；資料只放 `#` 後面，讀完 `history.replaceState` 清走；匯入確認 = 並排圖示；「覆蓋」要再確認；本機全新淨出「匯入」；匯入完跳去第三個 tab；任何一步解唔到 = 「連結唔啱用」、唔寫 storage

## 決定表

| #   | 題目                       | 決定                                                                                                                                                                  | 原因                                                                        | 影響                                                                                  |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Q1  | iOS PWA / Safari 分開儲存  | **App 內加掃 QR（相機）**：匯入入口喺 app 入面，用 `getUserMedia` + QR 解碼 library                                                                                   | 系統相機掃 QR 一定喺 Safari 開，記錄會入咗 Safari 而唔係主畫面 app          | 新相機畫面 + 權限 UI（要出 preview v5）；多一個解碼 library                           |
| Q2  | 其他入口                   | **保留「貼上連結」次要掣 + iOS Safari 提示**：iOS 非 standalone 開到 `#import=` 照匯入得，但頂部提示「主畫面 app 記錄分開，請喺 app 入面掃 / 貼上」                   | Laptop 冇相機 / 唔想開相機權限；別人傳連結都要有路                          | 匯入入口 = 「掃 QR」主掣 +「貼上連結」次要掣                                          |
| Q3  | Payload 點表示一集         | **原樣 episode ID + `deflate-raw`**                                                                                                                                   | 唔使 catalog 對照、唔靠 arc 次序；新舊 catalog 都解得返；deflate 壓重複前綴 | 實作前要重量 QR 版本（preview 量嘅 v22–v23 係用短 ref）                               |
| Q4  | 進度衝突                   | **較新者整條勝**：位置 + `watched` 一齊跟 `updatedAt` 較新嗰邊                                                                                                        | 尊重最後動作（例如聽完之後 `resetWatched` 重聽）                            | 取代 preview v4 嘅「任何一邊聽完當聽完」                                              |
| Q5  | 收藏刪除                   | **記 tombstone（刪除時間）**：較新動作勝（加 vs 刪比時間）                                                                                                            | 「兩邊加埋」會令 A 機刪咗嘅收藏由 B 機合併返嚟復活                          | `bookmarks:v2` 要多一個刪除紀錄；payload 帶 tombstone                                 |
| Q6  | Tombstone 由邊個加、留幾耐 | **P9 自己加，保留 30 日**：`bookmarks:v2` 加 optional `removed[]`（`id` + `removedAt`），舊資料冇就當空，唔 bump store version；寫入時順手清走超過 30 日嘅            | Phase −1 唔使改 plan；連結 24 小時過期，但兩部機可能隔好耐先同步            | 超過 30 日先同步嘅刪除會失效（收藏可能復活），可接受                                  |
| Q7  | 截短 QR + 覆蓋             | **允許，但覆蓋確認寫明**：payload 帶 `truncated` + 完整總數；覆蓋紅字加「呢個 QR 只有最近 50 集（共 N 集），要完整請用分享連結」                                      | 用戶清楚知道後果就由佢揀                                                    | 覆蓋確認文案多一句（只喺 truncated 時出）                                             |
| Q8  | Undo                       | **Toast 復原 + 保留一份備份**：匯入前快照本機 progress / bookmarks，存入備份 key（只留最後一次）；匯入完 Toast「已匯入 · 復原」；備份 24 小時後清                     | 覆蓋 / 合併錯咗都救得返，reload 之後都仲有                                  | 新 storage key；復原 = 用快照整份寫返（快照之後嘅新收聽會冇咗，Toast 時間短，可接受） |
| Q9  | 格式版本對唔上             | **即刻檢查更新再試**：出「呢條連結需要新版本，更新緊…」→ `registration.update()`；有新版就行現有 `SKIP_WAITING` → reload，hash 留住等新版讀；冇新版先講「連結唔啱用」 | PWA 已有自動更新機制，用戶唔使自己諗                                        | 匯入 parser 要分「版本太新」同「壞連結」兩種錯；reload guard 照現有防 loop 做法       |
| Q10 | Catalog 搵唔到嘅 ID        | **照存，只驗格式**：ID 符合上面三種格式就寫入；之後 catalog 有返就自然出現；唔符合格式嘅成條唔要；確認畫面計數照計                                                    | Store 係 ID-keyed，唔使 catalog 都存得；B 機 catalog 可能較舊 / 已下架      | 需要共用 ID 格式 validator（Phase −1 應該已有，冇就 P9 加）                           |
| Q11 | 收藏 payload 內容          | **ID + addedAt**，匯入時由 catalog / probe 砌返 Bookmark；節目錄音搵唔到開咪時間就暫存缺欄位嘅紀錄，等 probe 有返先顯示                                               | QR 最細                                                                     | 要同 Phase −1 嘅 `bookmarks:v2` schema 對齊（缺欄位紀錄點存，見未決問題）             |

### 預設技術決定（冇逐條問，按建議寫；用戶可以推翻）

| 項目         | 預設                                                                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 時間         | Payload 存「匯出時刻 `t`」+ 每條「幾耐前（分鐘）」；匯入時 `updatedAt = 匯入時刻 − 傳送時間 − 幾耐前`。傳送時間 = `匯入時刻 − t`，只喺 0–24 小時之內先信；超出（兩部機時鐘差太遠）就當 0。咁樣每條記錄嘅相對時間唔受時鐘差影響 |
| 打和         | 同一集兩邊 `updatedAt` 一樣 → 本機勝                                                                                                                                                                                           |
| 最近 50 集   | 按 `updatedAt` 由新到舊揀，聽完 / 未聽完一樣計                                                                                                                                                                                 |
| Idempotent   | 同一條連結匯入兩次，結果同一次一樣（合併規則係純函數，冇累加）                                                                                                                                                                 |
| 覆蓋         | 本機 progress + bookmarks（連 tombstone）整份換成 payload 嘅；payload 冇嘅集 = 本機冇                                                                                                                                          |
| 確認畫面計數 | 合併後數字即場由合併函數計（dry run），唔另外估                                                                                                                                                                                |
| 收藏次序     | 合併後跟 `addedAt`；同一集兩邊都有 → 取較早嗰個 `addedAt`                                                                                                                                                                      |

## Payload v1 草案

```text
https://…/903-player/#import=1.<base64url(deflate-raw(JSON))>
```

```json
{
    "v": 1,
    "t": 29870000,
    "p": [["show:ultra:2026-11-05", 12, 3600, 1800]],
    "b": [["drama:lancy:half:3", 4320]],
    "x": [["drama:lancy:half:1", 600]],
    "n": { "p": 300, "trunc": true }
}
```

| 欄位 | 意思                                                                              |
| ---- | --------------------------------------------------------------------------------- |
| `v`  | 格式版本（同 `#import=` 後面嘅前綴一致；前綴喺壓縮外面，舊 app 唔使解壓都知太新） |
| `t`  | 匯出時刻（epoch 分鐘）；超過 24 小時當過期                                        |
| `p`  | 進度：`[id, 幾耐前(分), 長度(秒), 位置(秒；-1 = 聽完)]`                           |
| `b`  | 收藏：`[id, 幾耐前加入(分)]`                                                      |
| `x`  | 收藏 tombstone：`[id, 幾耐前刪除(分)]`（30 日內）                                 |
| `n`  | 完整總數 + 有冇截短（QR 用；分享連結 `trunc` = false）                            |

- 流程：`TextEncoder` → `CompressionStream('deflate-raw')` → base64url；冇 `CompressionStream` 就唔出同步掣（同 preview）
- 解碼任何一步失敗（base64 / 解壓 / JSON / schema / ID 格式）→「連結唔啱用」，唔寫 storage；前綴版本 > 支援版本 → 行 Q9 更新流程

## 合併規則（總結）

| 資料      | 合併                                                                               | 覆蓋             |
| --------- | ---------------------------------------------------------------------------------- | ---------------- |
| 進度      | 每集：`updatedAt` 較新嗰邊整條勝（位置 + `watched`）；打和本機勝；一邊冇就取有嗰邊 | 整份換成 payload |
| 收藏      | 每集：比「最後加入」同「最後刪除」時間，較新動作勝；兩邊都有 → `addedAt` 取較早    | 整份換成 payload |
| Tombstone | 兩邊加埋，同一集取較新 `removedAt`；寫入時清走超過 30 日                           | 整份換成 payload |
| 匯入前    | 快照本機 progress / bookmarks 入備份 key（Q8）                                     | 同左             |

## 未決問題（實作前再問 / 再量）

| #   | 問題                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | App 內掃 QR library：iOS Safari 冇 `BarcodeDetector`，要 JS 解碼（候選 `jsQR`、`qr-scanner`，都係 MIT）；揀邊個、`import()` lazy load、`npm audit` + license 檢查                                                                                    |
| U2  | **Preview v5 已出**（`_mockups_/qr-transfer/index.html` ⑥ ⑦，branch `claude/quirky-heisenberg-hljtnz`）：四種組合 A → B 流程 + 例外情況；等用戶確認，包括 U8                                                                                         |
| U3  | **已量（v5，jsQR）**：50 集 + 0–10 個收藏 = v24、20 個 = v25，2x / 3x 螢幕 260 / 300 px 都解到；30 個 = v26（2x 要 340 px）、40–50 個 = v27（2x 去到 420 px 都唔穩）→ 等用戶揀：QR 預算定死 v25（收藏優先、集數放到滿）/ 收藏設上限 / 改 ID 分組字典 |
| U4  | iOS Safari（非主畫面）匯入咗嘅資料可能被 ITP 7 日清走：Q2 提示文案要唔要講明                                                                                                                                                                         |
| U5  | `bookmarks:v2` 實際 schema（Phase −1 定）：tombstone `removed[]` 同「缺開咪時間」嘅收藏點存，要同 Phase −1 對齊                                                                                                                                      |
| U6  | 備份 key 名同格式（建議 `903player:import-backup:v1`，`{ savedAt, progress, bookmarks }`）；同埋 Toast 顯示幾耐                                                                                                                                      |
| U7  | Q9 自動更新：hash 留住等新版讀，要確認 reload 之後 `#import=` 仲喺度、唔會同現有防 loop guard 撞                                                                                                                                                     |
| U8  | 全新 B 機冇記錄時第三格唔出（v4），冇入口匯入：preview v5 提供 E1（第三格出 ⇅，撳彈「由另一部機匯入」卡）同 E2（第三格係「未有收聽記錄」空白頁，入面有掃描 / 貼上），等用戶揀                                                                        |

## 下一步

1. Phase −1（v1.29.0）merge 之後先開工
2. 用戶確認 preview v5（U2）、揀 U8 入口同 U3 容量做法
3. U1 實測後定掃描 library
4. `/feature`：`feature/transfer/qr-sync`，MINOR
