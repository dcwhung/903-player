# 903-player：選擇發佈（更新頁 App 外觀 section + 新內容勾選）

## Context

用戶 2026-11-13 改 App 外觀之後發佈唔到：「更新」頁有「必須處理」待辦（例如新短篇未排期）就擋住「下一步：確認發佈」，淨改 App 外觀 / Banner 都要等晒待辦。API `POST /api/publish` 本身唔擋。
Mockup：`_mockups_/admin-selective-publish/index.html`（Q1–Q4 用戶確認）。Branch：`feature/selective-publish`。

## 已確認決定

| 項目        | 決定                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| App 外觀    | 更新頁加「App 外觀」section：只列有改動（同上次發佈唔同）嘅項目（App 圖示、名稱與簡介、首頁 Banner）；全部冇改就成個 section 唔出 |
| 勾選欄      | 兩張表（App 外觀、新內容）最後一欄「發佈」勾選框                                                                                  |
| Q1 預設     | 設定好晒（冇「必須處理」）嘅新內容同有改動嘅 App 外觀項目**預設勾選**                                                             |
| 未完成      | 有「必須處理」嘅新內容唔可以勾（寫「未完成」），亦**唔再阻發佈**                                                                  |
| Q2 未勾     | 冇勾 / 未完成嘅新內容**完全唔入今次 catalog**（播放器見唔到），admin（D1）設定照留，下次再揀                                      |
| Q2 App 外觀 | 冇勾嘅 App 外觀項目用返上次發佈嘅值（D1 草稿照留）                                                                                |
| Q3 其他改動 | 改節目 / 劇資料、配色、上下架等其他已儲存改動照舊全部一齊發佈（唔做逐項勾選），喺確認發佈頁列出                                   |
| Q4 冇揀     | 一項都冇揀（而又冇其他改動）→「下一步」灰色，提示「未選擇任何內容」                                                               |
| 確認發佈頁  | 列出今次發佈項目 + 「以下項目尚未完成，不會在今次發佈：…」+ App 外觀須重新部署提示                                                |
| 文字        | Admin 介面書面語（`.claude/CLAUDE.md`「Admin 介面文字」）；mockup section 之間唔出說明字                                          |
| 版本        | api 0.10.0、admin 0.3.0（MINOR）                                                                                                  |

## Contract（細節由 Backend 讀 code 後定，改咗要寫返入「實作差異」）

### `apps/api`（0.10.0）

- `POST /api/publish` body 加選填 `selection`：
    - `content`：今次要發佈嘅新內容（以待辦行嘅 key 表示，例如 `kind/id` 或 `dramas/<id>/arcs/<arcId>`）
    - `branding: { icon?: boolean, text?: boolean }`、`banner?: boolean`
    - 冇 `selection` = 舊行為（全部發佈），保持兼容
- 冇揀嘅新內容：由 publish document 剔走（新劇 / 新節目成個 entry；新短篇 = 喺劇集 definition 剔走嗰個 arc），D1 唔郁；ID 守衛照用（剔走後 document 嘅 episode ID 唔可以少過上次 publish）
- 冇揀嘅 branding / banner：用上次 ok publish 嘅值
- 有「必須處理」嘅行就算 client 揀咗都唔准入（server 再驗，422 或者自動剔走——Backend 決定並寫明）
- `resolveDoneFindings` 只標今次真係發佈咗嘅行
- Branding 部署觸發照用「今次發佈嘅 branding 同上次唔同」判斷
- `GET /api/changes`（或者新 endpoint）回返更新頁要用嘅資料：有改動嘅 App 外觀項目、每行新內容可唔可以揀

### `apps/admin`（0.3.0）

- 更新頁（處理待辦）：App 外觀 section + 新內容表加「發佈」欄（mockup ①）；底部「已選擇 N 項發佈 · M 項未完成（不會發佈）」；「下一步」唔再因為必須處理而灰
- 選擇帶去確認發佈頁（mockup ②）再 `POST /api/publish { selection }`
- 確認發佈頁列出今次項目、未完成項目、其他改動、重新部署提示

## 實作次序（同一條 branch）

1. api（Backend Developer）
2. admin（Frontend Developer）
3. Code Review → QA S1 → 截圖畀用戶 → 用戶話先開 PR

## 實作差異（api 0.10.0，Backend）

| 項目                 | Plan                                                  | 實作                                                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `selection` shape    | `content`、`branding: { icon?, text? }`、`banner?`    | 一樣；全部選填，冇寫 = 冇揀（`content: []`、旗 `false`）；未知欄位 400                                                                                                                                            |
| 待辦行 key           | `kind/id` 或者 `dramas/<id>/arcs/<arcId>`             | `GET /api/todos` 每行加 `key` = `<kind>/<劇 ID>[/<短篇 ID>]`（例如 `newArc/golden/season-2`），同合併行用同一個 key；另加 `publish: selectable / incomplete / always`                                             |
| 「必須處理」嘅行被揀 | 422 或者自動剔走                                      | **自動剔走**，回應 `selection.skipped: [{ key, reason: 'incomplete' }]`；draft 劇嘅行都當 `incomplete`。未知 key 先 422（乜都唔寫）                                                                               |
| 冇揀嘅新內容         | 新劇成個 entry 剔走；新短篇喺 definition 剔走嗰個 arc | 「完全唔入今次 catalog」做成「同上次發佈一樣」：上次 ok publish 有嗰套劇 / 嗰個短篇（例如以前以下架狀態發佈過）就換返上次版本（短篇用 `name` 對），冇先剔走。咁樣鎖咗嘅 episode ID 唔會因為冇揀而觸發 ID 守衛 409 |
| 新節目               | 成個 entry 剔走                                       | 待辦表冇節目行（findings 只有劇集），節目改動一律屬「其他改動」                                                                                                                                                   |
| 新集數 / 資料夾唔見  | —                                                     | `publish: 'always'`：唔可以剔走，跟其他改動發佈（新集數嘅新劇 / 新短篇冇發佈就唔 resolve）；資料夾唔見唔再阻發佈                                                                                                  |
| 更新頁資料           | `GET /api/changes`（或者新 endpoint）                 | `GET /api/changes` 加 `appearance: { icon, text, banner }`、`others`、`unchanged`；選填 `?selection=`（URL-encoded JSON）令 changes / validation / warnings / unchanged 跟 selection 計                           |
| 其他改動（Q3）       | 確認發佈頁列出                                        | `others` = 乜都唔揀時嘅 `summarizeChanges`（唔計 selectable / incomplete 新內容同 App 外觀），item shape 同 `changes.items` 一樣                                                                                  |
| `packages/catalog`   | —                                                     | 冇改                                                                                                                                                                                                              |

## 風險

- 🔴 剔走新短篇時唔可以影響同一套劇其他已發佈短篇 / 集數（ID 守衛 + test）
- 🟡 「其他改動」同「新內容」嘅界線：新內容 = 待辦表入面嘅行；其他 = D1 同上次 publish 嘅其餘差異
- 🟡 舊 admin（未更新）冇 `selection` → 全部發佈，同而家一樣
