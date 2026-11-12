# Code Review — admin 回饋修正批次（13 項），api 0.6.2 → 0.6.3

- 日期：2026-11-12
- 審閱者：Code Reviewer（subagent）
- 目標：branch `claude/charming-heisenberg-8z30x3`，`a2b2c0a..3fef4de`（另加 `ace1ff5` / `3fef4de`：碟面裁切預覽改用圓框；docs / mockup commit、`b974b80`、`5c2b9db` 唔審 code）
- Tier：T2（admin UI + api 驗證邏輯）
- 總評：13 項同 `8033117` regression fix 全部對到 SSoT，測試齊。但 9(b) 嘅 `mayRelax` 放寬咗太多：**已發佈**嘅 entry 轉下架、圖唔齊，都會被存做 draft，publish 唔包佢（W-714，blocking）。**Re-review：W-714 已 resolved（`6306589` / `645f593`），結果改做 pass**

## Hard Gates

all pass：`npm run lint`（eslint + prettier）、`tsc -b`（admin / api）、相關 unit（admin `vitest related` 165 + node style test 7；api workerd `disabledEntries` / `adminRoutes` / `drafts` / `entries` / `schedule` 87）。Coverage 冇量度，新分支都有對應 test，填 n/a。冇新依賴，Security 填 n/a。Review 期間 head `4d83f96` 嘅 CI run 43112989807 仲係 `in_progress`。追加嘅 `ace1ff5` / `3fef4de`：`ImagePreviewDialog.test.tsx` + `mediaSlot` + `ImageSlot` 9 個 test 過；`tsc -b`、eslint、prettier 都過

## 追加：碟面裁切預覽圓框（`ace1ff5` 紅燈 → `3fef4de`）

冇 finding。紅燈 test 先 commit，之後先 commit 實作。碟面（`slot === 'disc'`）嘅「裁切後」格用 `.frame.bare`，透明邊框同底色；`.out.disc` 加 `2px solid var(--media-border)`，同 `.img-slot` 等現有規則一樣用 token；Banner 冇變。`bare` 用 `border-color: transparent`，冇改 border 寬度，所以兩格大小一致，並排對齊唔受影響

## 評分結果

| 維度     | 得分   | 滿分    | 備注                               |
| -------- | ------ | ------- | ---------------------------------- |
| 正確性   | 20     | 25      | W-714（第一輪；re-review 回復 25） |
| 安全性   | 20     | 20      |                                    |
| 可維護性 | 20     | 20      |                                    |
| 測試覆蓋 | 15     | 15      | 已發佈 entry 嘅情況歸入 W-714      |
| 性能     | 10     | 10      |                                    |
| 代碼風格 | 10     | 10      |                                    |
| **總分** | **95** | **100** |                                    |

**結果（第一輪）：⚠️ warn（W-714 blocking）→ Re-review 之後：✅ pass（W-714 resolved，正確性回復 25，總分 100）**

## 🟡 W-714 — 已發佈 entry 轉下架、圖唔齊，會被存做 draft，喺 catalog 消失 / 令 publish 卡住（blocking）

- 位置：`apps/api/src/content/entries.ts` `mayRelax`（`entry.definition.enabled === false` 嗰半）；`checkedEntry` 嘅 warnings
- L1：SSoT 9(b) 只講「**新**節目未有圖都儲存到」，而 commit 自己嘅註解都寫「admin 新建節目 / 劇」。另外同一個檔嘅 DELETE 守則係「published entries cannot be deleted; set enabled: false instead」，即係已發佈嘅 entry 下架之後要繼續留喺 document 做「下架」狀態。實作冇分新舊，所有 `enabled: false` 嘅 entry 都放寬
- L2：用臨時 workerd test 重現咗（seed 加多一個節目同一套劇，令 document 唔會變空；test 跑完已刪）：
    - (i) 已發佈節目轉下架、圖齊 → `200 {"draft":false}`，**正常**
    - (ii-a) 已發佈節目 `badgirl` 轉下架、`images` 冇咗 `disc.webp` → `200 {"draft":true,"warnings":{"missingEpisodeIds":[]}}`；之後 publish 照 `200`，document 嘅 `shows` 只剩 `['other']`。節目冇 ID 守衛，**就咁喺 catalog 消失**，冇任何警告
    - (ii-b) 已發佈劇 `golden` 轉下架，同時加一個 `disc: season-2.webp` 但未上載嘅短篇 → `200 {"draft":true,"warnings":{"missingEpisodeIds":[]}}`；之後 publish `409 episode IDs would disappear`（`drama:golden:season-1:1..3`）。**成個 catalog publish 都卡住**，而儲存嗰陣嘅 warning 係空
    - 對照組：base 行為（同一個改動但 `enabled: true`）→ `422 arcs[1].disc: no file season-2.webp`，即係改之前呢兩個情況都會喺儲存嗰陣擋咗
- L3：而家 admin UI 係「上載即存」，正常操作好難整出「已發佈 + 圖唔齊」，暫時要直接打 API 或者用舊 client 先觸發到，所以評 🟡 唔評 🔴。不過 server 先係最後守門，而 warning 係用寬鬆驗證計出嚟嘅 `ids` 計，所以 draft 嘅情況永遠報空
- (iii) 判斷：應該限制做「從未發佈」先可以寬鬆驗證。`isPublished()` 已經喺同一個檔（DELETE 用緊），可以直接重用
- 方案 A（推薦）：`mayRelax` 改成 `(wasDraft && kind === 'dramas') || (enabled === false && !(await isPublished(db, kind, id)))`。已發佈嘅照舊完整驗證，唔過就 422，同 base 一致。要加 workerd test 覆蓋 (i) / (ii-a) / (ii-b)。代價：多一次 `latestPublish` 讀取，但只會喺完整驗證失敗之後先讀
- 方案 B：照放寬，但 `draft === true` 而 entry 已發佈嗰陣，warnings 改報呢個劇喺最新 publish 嘅**全部** episode ID；節目就加 `warnings.droppedFromCatalog`。代價：只係提示，publish 時節目仍然會靜靜雞消失，要靠 admin 留意

修訂代碼（方案 A，示意）：

```ts
/** 寬鬆驗證：掃描 draft 劇；或者下架而且從未發佈過（admin 新建、圖未齊）。已發佈嘅一定要完整驗證 */
const mayRelax = async (db: D1Database, entry: EntryInput, wasDraft: boolean) =>
    (wasDraft && entry.kind === 'dramas') ||
    (entry.definition.enabled === false && !(await isPublished(db, entry.kind, entry.id)));
// checkedEntry：if (!(await mayRelax(c.env.DB, entry, wasDraft))) return validationFailed(c, error);
// （isPublished 要移去 checkedEntry 上面，或者抽去 catalog/store）
```

## Re-review — W-714 ✅ resolved（`6306589` 紅燈 → `645f593`）

- 改動：方案 A。`mayRelax` 改做 async，條件係 `(wasDraft && kind === 'dramas') || (enabled === false && !(await isPublished(db, kind, id)))`。新增 / 從未發佈嘅下架 entry 照舊可以存做 draft（9(b) 冇 regress，原本嘅 8 個 case 都過）
- `isPublished` 定義喺 `mayRelax` 後面，但只喺 request 時先 call，module 已經載入咗，冇 TDZ 問題；`isPublished` 只會喺完整驗證失敗之後先讀 DB
- 驗證：`disabledEntries` / `drafts` / `entries` / `schedule` 加臨時 probe，5 個檔 58 個 test 過；`tsc -b`、eslint、prettier 都過
- (ii-b) 用臨時 workerd probe 再試（已刪）：已發佈劇轉下架、加一個未上載碟面嘅短篇 → `422 arcs[1].disc: no file season-2.webp`，之後 publish `200`，同 base 一致
- 新 test 只覆蓋節目；劇嘅情況（ID 守衛相關）未有 regression test → S-831

## 🟢 Suggestion / Observation（backlog，唔 block）

- S-831 `apps/api/test/disabledEntries.test.ts`：加一個 W-714 劇 case，即係 (ii-b)「已發佈劇轉下架 + 未上載碟面嘅新短篇 → 422、`draft` 仍然係 0、publish 唔會 409」，鎖住 ID 守衛相關嘅情況。順手刪走 `mayRelax` 上面舊嗰段 JSDoc（而家有兩段，舊嗰段仲寫「或者下架嘅 entry」，同新條件唔夾）

- S-828 `apps/admin/src/model/paths.ts`、`todoModel.ts` `rowTarget`：路徑冇 `encodeURIComponent`。劇 ID 受 `ID_PATTERN`、短篇 ID 受 `ARC_ID_PATTERN`（API 驗證）限制，而家冇問題；如果想防禦性啲可以加 encode。`todoHref` 已經用 `URLSearchParams` encode 咗 query
- S-829 `apps/admin/e2e/run.mjs` `boxOf(locator, x, height)`：`x` 冇用到，但 call site 傳 `0`，容易令人以為會改 x。建議刪走呢個參數，或者改用 `{ height }` option
- S-830 `apps/admin/src/model/dates.ts` `shortDate`：排程跨年嘅日子（例如 `3/1 六`）冇年份，只係靠星期幾分辨；`stampOf` 跨年已經正確顯示 `31/12/2025`。SSoT 12 只要求「日/月」，所以只記錄
- Observation：`validationMessage` 嘅 regex 有錨定（`^…$`），`[^:]+` / `\S+` 唔會跨欄位；檔名有空格或者係巢狀欄位（`theme.bg`）就回 `null`，改出一般訊息加原文，fallback 安全。檢查過，冇問題
- Observation：`ArcSchedule` 傳 `saved !== null`；`ScheduleTab` 一定傳 `?? null`，冇 `undefined` 誤判做有排程嘅情況

## ✅ 做得好嘅地方

- 每一項都係 TDD（failing test commit 喺 fix 之前），e2e 新加嘅 6 個 check 有量位置、量顏色（light / dark），唔係淨係影 screenshot
- 第 5 項 root cause 喺 `stripOf` 修，`arcTabNote` 同 `ArcSchedule` 共用同一個判斷；`8033117` 嘅 regression 都即時補咗 test

## Handoff receipt

```
HANDOFF_RECEIPT
agent: code-reviewer
scope: admin-feedback-0.6.3 (a2b2c0a..645f593; re-review 564f638..645f593)
status: pass
score: 100
hard_gates: { lint: pass, type: pass, tests: pass, coverage: n/a, no_critical: pass, security: n/a }
blocking: []
resolved: [W-714]
backlog: [S-828, S-829, S-830, S-831]
next_action: proceed to QA / merge (backlog items non-blocking)
context: W-714 reproduced in workerd — published show disabled + missing image → draft → dropped from catalog; published drama → publish 409. CI run 43112989807 for 4d83f96 was in_progress at first review. Re-review: W-714 fixed by 6306589/645f593 (Option A); (ii-b) drama case now 422 via probe; suggest S-831 regression test.
report: .proj-docs/reviews/2026-11-12_review_admin-feedback-0.6.3.md (committed, not pushed)
```

---

## 追加 review（視覺回饋 4 輪）

- 日期：2026-11-12；審閱者：code-reviewer；範圍：`2b14aeb..3745863`（`1904855` 淨 mockup，冇 review code）；Tier：T2
- SSoT：用戶睇截圖確認嘅 7 項（收合 nav icon、chip / switch hover 同 disabled、虛線媒體框、「刪除」+ `Trash2`、action icon、login 款 3、e2e 真封面 fixtures）
- Hard Gates：all pass（`eslint apps/admin`、`tsc -b`、`prettier --check apps/admin _mockups_/admin-login`、diff 相關 unit 25 檔 81 test、`vite build`）。CI run `43126936714`（`3745863`）review 時仲 `in_progress`
- 評分：100 / 100（正確性 25、安全性 20、可維護性 20、測試 15、性能 10、風格 10）。冇 🔴 / 🟡。**結果：✅ pass**

### 重點檢查結果

- **Specificity**：`.shell.mini .nav .logo-mini`（0,3,0）贏 `.shell.mini .nav a`（0,2,1）同 `.nav a:hover`；`.logo-mini` 只喺 mini 先 render（`Nav.tsx:65`）。`.presets` / `.switch` 揀咗嘅 rule 只會 match 自己 container，`.theme-switch` 係另一個 class，唔受影響。disabled rule 同揀咗 rule 一樣 specificity、放喺後面，所以 disabled 贏。`.flow-bar a, .scan-bar a, .note a` 加咗 inline-flex：而家 `.note` 入面得兩個 link（`UnpublishedNote`、`EditorNotices` 重新登入）
- **Token**：6 個新 token（`--gsi-*` ×4、`--login-scrim`、`--shadow-float`）喺淺色、`@media` 深色、`[data-theme='dark']` 三段都有（`tokens.css:69-75 / 133-139 / 173-179`）。量咗對比：disabled chip `--muted`/`--surface-2` 淺色 4.97、深色 5.68；`--media-border`/`--surface` 淺色 3.32、深色 3.72；`.gsi` focus ring `--primary` 對深色卡 3.38、對 `--gsi-bg` 4.11，全部 ≥ 3:1
- **Login a11y**：得一個 `h1`（「管理介面登入」）；卡入面 banner `img` 有 alt；背景 `.login-bg` 同 G logo 都有 `aria-hidden`；`.gsi:focus-visible` 有 outline；`?next=` 照用 `loginHref(location)`。AuthGate 重試畫面都係 `main.login`，冇 `.login-bg` 都正常，底色照用 `--bg`
- **Roboto**：只係 Google Fonts CSS 多咗 Roboto 500 嘅 `@font-face`（幾 KB CSS）。woff2 要有字用到先下載，即係淨係登入頁「Google」嗰幾個拉丁字母；字體照樣 preload + `display=swap`，唔會阻 render，其他頁唔受影響
- **Fixtures**：`vite build` 後 `dist/` 只有 `_headers assets banner.webp icon-192.png index.html`，冇 fixtures。圖係 `mockApi.mjs` 用 `page.route` + `route.fulfill({ path })` 出

### 🟢 Suggestion / Observation（backlog，唔 block）

- S-832 冇用嘅 CSS / prop：`LoginScreen` 唔再用 `<Brand big />`，所以 `Brand` 嘅 `big` prop（`app/Brand.tsx:9`）同 `.brand-banner.big`（`mockup.css:1421`）冇人用。另外 `app.css:231` 嘅 `.login { min-height: 100dvh }` 同 `theme.css` 新嘅 `.login` 重複。三樣都可以刪
- S-833 `app/LoginScreen.tsx` `GoogleLogo` 係 inline `<svg>`（約 20 行），同 sw-coding-style-ts §4 唔夾；不過 SSoT 6 寫明「inline 四色 G」，而且 `RotateNotice` 本身都係咁寫，所以唔 block。想兩邊都啱，可以搬去 `src/assets/svg/logos/google-g.svg`，再用 Vite 預設嘅 URL import 做 `<img alt="">`，唔使加 svgr
- S-834 `e2e/mockApi.mjs:8`：`new URL('./fixtures/', import.meta.url).pathname` 遇到有空格或者非 ASCII 嘅 checkout 路徑會變 `%20` 咁樣，`readdirSync` 就會失敗。建議改用 `fileURLToPath`。CI 路徑而家冇問題
- Observation：`.presets` / `.arc-tabs` 嘅 disabled 樣式而家 production 冇地方用到（e2e 要用 `el.disabled = true` 先觸發），只有 `Switch` 有 `disabled` prop。SSoT 2 要求有呢個樣式，所以保留。另外揀咗又 disabled 時睇唔到揀咗邊個，但只有讀屏會讀 `aria-pressed` / `aria-selected`，暫時可以接受
- Observation：`ScheduleSaveBar` 改咗 `export`，只係畀 test 用，冇其他 caller

### ✅ 做得好嘅地方

- 4 輪都係先 failing test 再 fix；chip 對比、媒體框、nav icon 有 node CSS test 鎖住，e2e 喺淺色同深色都量咗對比
- 箭咀字元（`←→▾▴`）全部改做 lucide icon，e2e 會檢查有冇字元殘留；icon 一律加 `aria-hidden`，「刪除」另外有 `aria-label`

### Handoff receipt（追加）

```
HANDOFF_RECEIPT
agent: code-reviewer
scope: admin-feedback-0.6.3 visual follow-up (2b14aeb..3745863; 1904855 mockup-only)
status: pass
score: 100
hard_gates: { lint: pass, type: pass, tests: pass, coverage: n/a, no_critical: pass, security: n/a }
blocking: []
backlog: [S-832, S-833, S-834]
next_action: proceed to QA / merge after CI 43126936714 (3745863) is green
context: specificity, tokens (3 theme blocks), login a11y, Roboto cost, dist fixtures all checked; only dead CSS/prop, inline G svg (SSoT says inline), fileURLToPath nit
report: .proj-docs/reviews/2026-11-12_review_admin-feedback-0.6.3.md (committed, not pushed)
```
