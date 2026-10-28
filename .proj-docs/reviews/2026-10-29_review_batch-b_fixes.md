# Code Review — 2026-10-29 — Batch B 小修正（S-481 書架排序 memo、S-483 pressRef 清理、S-506 未載入完唔標重溫、S-510 e2e 截圖停動畫、README e2e 設定）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/keen-pascal-5iifg0`，batch B 由 `5f018cc` 開 branch，head `6e43b61`，merge 入 `28211a9`；範圍 = `git diff 5f018cc..6e43b61`（10 個檔，+169 / −29）
- Commits：
    - `5f3402c` perf：主頁劇集書架次序按 `progressMap` memo（S-481）
    - `eaa0835` fix：滑鼠拖出卡外 / context menu 都清 `pressRef`（S-483）
    - `505b5dc` fix：recordings 未 ready 唔將載入緊嘅節目標做重溫（S-506）
    - `a2532cc` test：e2e 截圖停 CSS 動畫（S-510）
    - `6e43b61` docs：README 寫低 e2e 設定
- Item 來源：S-481、S-483 → `2026-10-26_review_v1.10.0_batch.md`；S-506 → `2026-10-27_review_v1.12.0.md`；S-510 → `2026-10-27_review_size-limits_batch.md`
- Design Origin：`none-required` 有效。diff 冇 component `.tsx` / `.css` 改動（兩個 `.tsx` 都係 test），冇新 className、冇 layout 改動
- Review Item ID：batch A 用到 S-548，W 最高 W-484（W-485 未用過，`grep` 證實），今次由 **W-485**、**S-549** 開始（用到 W-485、S-549）
- 總評：hard gates 全部 pass，冇 🔴 Critical，1 個 🟡 Warning，1 個 🟢 Suggestion。
    - **S-506 嘅 trade-off 唔使接受**：用 `status === 'ready'` 做閘有兩個缺口（reviewer 喺 scratchpad 寫測試重現咗），而用「載入緊嗰集嘅日子係咪今日」決定係咪重溫，兩個情況都啱，而且唔使睇載入狀態。見 W-485，建議 release 前改（兩行，已喺 scratchpad 驗證 363 個相關 test 全綠）。
    - **S-483 冇整壞 CUI-0004 滑鼠捽書架，亦冇整壞鍵盤 focus**：逐個 event 次序核對過（見「重點驗證」），`DramaShelf` 66 個 test 全綠，3 個 mutation 都會令新 test fail。
    - **README 準確**：Playwright `~1.63.0`（lockfile 1.63.0）、`PLAYWRIGHT_BROWSERS_PATH`、`E2E_PORT`（`e2e/run.mjs:17–28`，`5f018cc` 已經有）全部屬實。另外發現一個舊有缺口：port 俾人佔咗時，e2e 會靜靜雞測人哋嘅 build（S-549）。
    - 5 個 mutation 全部令相關 test fail。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                                                                                 |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint .` exit 0。今次 diff 10 個檔 `npx prettier --check` 全部 pass（`.claude/worktrees/*` 係其他 agent 嘅 worktree，冇計）                                                                                                                                                                    |
| Type check    | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                                                                                                                                                  |
| Tests         | ✅ pass | `npx vitest run src/hooks src/components/DramaShelf src/pages`：29 個檔、327 個 test 全綠（冇跑 full suite；**冇跑 e2e**，port 4173 由其他 agent 用緊）                                                                                                                                              |
| Coverage      | ✅ pass | 改動嘅三個 source 檔：`useShelfFocus.ts` 99% lines / 100% branch；`useMiniPlayer.ts` 100% lines / 95% branch；`useHomeDramaItems.ts` 95% lines（未覆蓋嘅第 58 行係 S-538 嘅 `onOpen` 分支，唔係今次改動）。新加嘅分支（`status` 閘、`pointerType` 判斷、`onContextMenu`、`useMemo`）全部有 test 鎖住 |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                                                                               |
| Security scan | ✅ n/a  | 冇新增 / 升級依賴（`package.json` / lockfile 冇改）                                                                                                                                                                                                                                                  |

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                              |
| -------- | ------ | ------- | ----------------------------------------------------------------- |
| 正確性   | 20     | 25      | W-485（S-506 用錯咗判斷依據，未完全修好，仲反過嚟標錯另一種情況） |
| 安全性   | 20     | 20      |                                                                   |
| 可維護性 | 19     | 20      | S-549（README 冇講 port 撞咗會測錯 build）                        |
| 測試覆蓋 | 15     | 15      | 每個 fix 都有新 test，5 / 5 mutation 中                           |
| 性能     | 10     | 10      | S-481 播放中唔再每次 render 都重新排                              |
| 代碼風格 | 10     | 10      | ESLint / Prettier（diff 範圍）全過                                |
| **總分** | **94** | **100** |                                                                   |

**結果：✅ pass**（≥ 90、冇 Critical、hard gates 全 pass）

| Commit    | Item       | 分數 | Status                               |
| --------- | ---------- | ---- | ------------------------------------ |
| `5f3402c` | S-481      | 100  | ✅ pass                              |
| `eaa0835` | S-483      | 100  | ✅ pass                              |
| `505b5dc` | S-506      | 95   | ✅ pass（W-485 建議 release 前跟進） |
| `a2532cc` | S-510      | 100  | ✅ pass（e2e 由 QA 重跑確認）        |
| `6e43b61` | README e2e | 99   | ✅ pass（S-549）                     |

---

## Section A — S-481 書架次序 memo（`5f3402c`）

- 改動：`useShelfDramas` 將 `dramaShelfOrder(enabledDramas(), dramaEpisodesOf, progressMap)` 包落 `useMemo(..., [progressMap])`；新增 `src/pages/useHomeDramaItems.test.tsx`（`vi.mock` 包住真嘅 `dramaShelfOrder` 數叫咗幾多次，兩次無關 rerender 之後 0 次）
- 驗證：
    - deps 齊：`enabledDramas` 係 `registry.ts:151` 嘅 `() => enabled`（module 常數），`dramaEpisodesOf` 係固定函數；`progressMap` 由 `useRefreshedOn` 出，`keys`（`watchedRevision`、`recording`）唔變就回傳同一個 `cache.value`，所以 memo 唔會食咗應有嘅重新排序（轉集 / 聽完 → `progressMap` 換新 reference → 重新排）✅
    - Mutation M2：deps 改 `undefined`（每次 render 都計）→ 新 test fail ✅
- 備注（唔開 item）：`useDramaItems` 仍然每次 render 都 `map` 出新 item 同新 closure，所以 `DramaShelf` 照樣 re-render；S-481 原本只講排序成本，今次範圍啱。之後真係見到書架 re-render 慢先再考慮
- 分數：100

## Section B — S-483 pressRef 清理（`eaa0835`）

- 改動：`useTileProps` 加 `onContextMenu` 清 `pressRef`；加 `onPointerLeave`，**只限 `pointerType === 'mouse'`** 先清；3 個新 test（滑鼠拖出卡外之後 Tab 照捲、長撳出 context menu 之後 Tab 照捲、touch 撳暗卡時 pointerleave 喺 click 之前都只係 focus 唔 open）
- 驗證（event 次序逐個核對）：
    - **Touch / pen**：`pointerdown → pointerup → pointerout / pointerleave → mousedown → focus → mouseup → click`。如果喺 pointerleave 清，之後嘅 `focus` 會以為係鍵盤（捲），`click` 會用而家嘅 focus 做 `focusAtPress` → 撳暗卡會變 open。只限滑鼠嘅判斷係必要嘅，第 3 個 test 鎖住；Mutation M4（拎走判斷）→ 呢個 test fail ✅
    - **滑鼠普通撳**：`pointerdown（pressRef = focus）→ mousedown → focus（pressRef 非 null，唔捲）→ mouseup → click`，滑鼠全程喺卡入面，冇 pointerleave，行為同之前一樣 ✅
    - **滑鼠捽書架（CUI-0004，`useShelfScrub`）**：過咗 slop 之後 `setPointerCapture` 落書架，按 spec 之後嘅 boundary event 當 pointer 喺書架上，所以撳嗰張卡會收到 pointerleave → `pressRef` 提早清。捽緊期間冇嘢讀 `pressRef`（只有 `onFocus` 讀，而 DOM focus 冇郁），放手 `finish` 本來都會清（`ended.scrubbing`），跟住嗰下 click 由 `useClickSuppression` 食咗。所以提早清冇任何後果 ✅
    - **滑鼠拖出卡再拖返入同一張先放手（未過 slop）**：click 照落喺呢張卡，`pressRef` 已經係 null，`focusAtPress` 用 `focus`。由撳落到 click 之間 focus 唔會變（mousedown 引起嘅 DOM focus 因為 `pressRef` 非 null 冇 `focusTile`；未過 slop 冇 `setFocus`），所以值同之前一樣 ✅
    - **鍵盤**：`pressRef` 一直係 null → `onFocus` 捲；Enter 嘅 click `detail === 0` → open。今次只係多咗清嘅位置，冇改 `onFocus` / `onClick` ✅
    - **右掣**：`pointerdown（button 2）` 都會設 `pressRef`，跟住 `contextmenu` 清。鍵盤觸發嘅 context menu（Shift+F10）清一個本身已經係 null 嘅值，冇影響 ✅
    - Mutation M3（拎走 `onContextMenu`）、M5（`onPointerLeave` 乜都唔做）各令一個新 test fail ✅
- 殘留（唔開 item）：會 hover 嘅 pen（Apple Pencil hover / Wacom）拖出卡外而又冇 pointercancel 嘅話仲會留住，同之前一樣。實際上 pen 拖動多數變捲動出 pointercancel，影響好細
- 分數：100

## Section C — S-506 未載入完唔標重溫（`505b5dc`）

- 改動：`useListedRecordings` 嘅 `rewatchUrl` 加條件 `status === 'ready'`；新 test：storage 空、probe 未返嗰陣載入今日節目 → `tags: ['today']`、region「正在播放（今日節目）」，probe 返咗之後清單變兩個
- 驗證：
    - `status` 點計（`RecordingsProvider.tsx:56`）：`!hasFinishedFirstRun && recordings.length === 0 ? 'loading' : 'ready'`。即係**只要有一條錄音（storage 有，或者 probe 搵到第一條）就 ready**，唔係「今日嘅清單載入完」
    - Mutation M1（拎走 `status` 閘）→ 新 test fail ✅
    - **Reviewer 喺 scratchpad copy（`git archive 28211a9`）加 probe test 重現兩個缺口**：
        - P1：storage 只有舊集（例如 17/10 公子會），probe 未返，載入今日嘅 Bad Girl大過佬 → 實測 `tags: ['rewatch']`、region「正在播放（重溫）」。`status` 已經係 ready，所以 S-506 描述嗰種閃「重溫」**照樣出現**；而「返嚟嘅用戶 storage 有舊嘢」比「storage 完全空」常見得多
        - P2：storage 空，probe 未返，載入舊集 → 實測 `tags: [undefined]`、region「正在播放（今日節目）」。即係 lead 指出嗰個 trade-off：舊集冇標籤，region 仲話係今日節目
- 結論同建議見 **W-485**
- 分數：95（W-485）

## Section D — S-510 e2e 截圖停動畫（`a2532cc`）

- 改動：`harness.mjs` 加 `SHOT = { animations: 'disabled' }`；`run.mjs` 同 `touch.mjs` 每個 `screenshot()` 都 spread `...SHOT`
- 驗證：
    - 覆蓋齊：`grep -rn "screenshot(" e2e/` 每一處（包括四個多行寫法）都有 `...SHOT`；`arcSheet.mjs` / `dramaPages.mjs` / `miniPlayerRules.mjs` 冇截圖 ✅
    - 只影響截圖：Playwright 喺截圖期間將無限動畫回到起點、有限動畫快轉到尾，截完再播返。app 入面淨係 `hideSplash.ts` 聽 `transitionend`（快轉只會令 splash 早啲移走），冇其他 `animationend` / `animationiteration` listener，所以唔會改到之後嘅斷言 ✅
    - 位置合理：所有斷言（例如窄版跑馬燈 `fit.shift < 0`）都喺截圖之前做，唔會因為截完動畫由頭播而讀到 0
    - ⚪ **冇由 reviewer 重跑 e2e**（port 4173 由其他 agent 用緊）。要 QA 跑一次 `npm run e2e` 確認全 PASS，再同 `5f018cc` 嘅截圖比對，睇跑馬燈 / 唱片相位係咪真係固定咗
- 分數：100

## Section E — README e2e 設定（`6e43b61`）

- 改動：`README.md` 加「端對端測試（e2e）」一節
- 驗證：
    - 「Playwright 鎖咗 `~1.63.0`」：`package.json:36` `"playwright": "~1.63.0"`、lockfile `1.63.0`、`node_modules` 1.63.0 ✅（`~` 准 patch 升級，「鎖咗」講法略寬，但 lockfile 確實鎖死，可以接受）
    - `npm run e2e` 先 build 再 `node e2e/run.mjs`：`package.json:15` `"npm run build && node e2e/run.mjs"` ✅；`run.mjs:52` 用 `vite preview --port <PORT> --strictPort` 起 server ✅；截圖去 `e2e/screenshots/`（`run.mjs` `OUT`），`.gitignore:7` 有排除 ✅
    - `PLAYWRIGHT_BROWSERS_PATH`：Playwright 官方環境變數，`install` 同 launch 都會用；呢個容器本身就設咗 `/opt/pw-browsers` ✅
    - `E2E_PORT`：**真係存在**，`e2e/run.mjs:17–28` `parsePort(process.env.E2E_PORT)`，有驗證範圍（1–65535 整數，否則 exit 1），`5f018cc` 已經有（唔係今次加）。`E2E_PORT=4174 npm run e2e` 會經 npm 傳落 `node e2e/run.mjs` ✅
- 發現：port 冇改又撞咗嘅後果 README 冇講，而且後果比「起唔到」嚴重，見 S-549
- 分數：99（S-549）

---

## 重點驗證

| 項目                                  | 結論          | 證據                                                                                                                                                                                                                                |
| ------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-506 trade-off（lead 提出）          | ❌ 唔使接受   | 見 W-485：用日子判斷兩邊都啱。scratchpad 改兩行後 `vitest run src/hooks src/components/MiniPlayer src/pages` 363 / 363 綠，包括原有 S-506 test 同 P1、P2 兩個 probe                                                                 |
| S-506 `status` 閘覆蓋範圍             | ⚠️ 唔夠       | P1 重現：storage 有舊集就已經 ready，今日節目照閃「重溫」                                                                                                                                                                           |
| S-483 vs CUI-0004 滑鼠捽              | ✅ 冇整壞     | pointer capture 之後提早清 `pressRef` 冇人讀；`finish` 本來都會清；click 由 `useClickSuppression` 食。`DramaShelf` 66 個 test 綠                                                                                                    |
| S-483 vs 鍵盤 focus                   | ✅ 冇整壞     | `onFocus` / `onClick` 冇改；新 test `expectTabStillScrolls` 證實清咗之後 Tab 會捲                                                                                                                                                   |
| S-483 只限滑鼠                        | ✅ 必要       | touch 嘅 pointerleave 喺 compat mousedown / focus / click 之前；M4 證實拎走判斷就會撳暗卡變 open                                                                                                                                    |
| README `E2E_PORT`                     | ✅ 存在       | `e2e/run.mjs:17–28`                                                                                                                                                                                                                 |
| Mutation（reviewer，scratchpad copy） | ✅ 5 / 5      | M1 S-506 拎走 `status` 閘 → 1 fail；M2 S-481 memo 冇 deps → 1 fail；M3 S-483 拎走 `onContextMenu` → 1 fail；M4 S-483 唔分 pointerType → 1 fail；M5 S-483 `onPointerLeave` 乜都唔做 → 1 fail                                         |
| Busy port 行為（S-549）               | ⚠️ 舊有       | Reviewer 喺 scratchpad 用 port 4987（唔係 4173）起一個 `http.server`，再 `vite preview --port 4987 --strictPort` → exit 1。`startPreview` 冇睇 server 有冇 exit，只係 poll `fetch(BASE)`，有人答就當起好                            |
| Version                               | ⚪ 待 release | 5 個 commit 冇 bump（仍係 1.20.3）。同 batch A 及 `2026-10-27_review_size-limits_batch.md` 先例一樣，release 時統一 bump。batch A + B 都係 refactor / fix / test / docs → PATCH `1.20.3 → 1.20.4`。**release commit 必須記得 bump** |
| TDD                                   | ⚪ 同 commit  | 每個 fix 嘅 test 同實作喺同一個 commit，睇唔到先 fail 嘅記錄；mutation 5 / 5 證實 test 真係鎖住行為                                                                                                                                 |

Mutation、P1 / P2 probe、W-485 方案 A 試改同 busy port 試驗全部喺 repo 外 scratchpad 做，冇改 repo source，冇跑 e2e，冇用 port 4173。

---

## 問題清單

### 🔴 Critical

冇。

### 🟡 Warning

#### W-485 — S-506 用「清單載入完未」決定係咪重溫：唔夠準，仲反過嚟標錯舊集

- 位置：`src/hooks/useMiniPlayer.ts:42–43` `useListedRecordings`
- 描述：`rewatchUrl = prepended && status === 'ready' ? list[0]?.url : undefined`。問題有兩個：
    1. `status` 只要有**任何一條**錄音就係 ready（`RecordingsProvider.tsx:56`），唔代表今日嘅錄音載入完。storage 有舊集、probe 未搵到今日嗰集時，今日節目照樣標「重溫」（P1 重現）。即係 S-506 想修嘅情況，喺最常見嘅「返嚟嘅用戶」底下冇修到
    2. storage 空嗰段時間，真係播緊舊集都唔標重溫，region 讀「正在播放（今日節目）」（P2 重現），讀屏會講錯
- 影響：而家 app 由主頁開始，player 開頭冇嘢，暫時未有路徑可以喺錄音未入清單之前載入節目，所以兩個都係潛在問題，未影響用戶。但 S-506 本身就係為「以後加重開續播」呢類情況做預防，用錯判斷依據，到時就會出事
- 關於 lead 問「新 trade-off 係咪好過舊嘅閃一下」：兩個都係講錯嘢（舊：今日節目講成重溫；新：舊集講成今日），程度差唔多。中性做法（載入緊時 region 唔講「今日」，例如只講「正在播放」）可以避免講錯，但要多一個分支同 i18n key，舊集都仲係冇「重溫」標籤，亦都解決唔到第 1 點。其實根本唔使揀：清單（`showsOnDate(recordings, today)`）只會有今日日子嘅錄音，所以排咗喺最前嗰集係咪重溫，**睇佢個日子係咪今日就知**，同載入狀態冇關
- 方案 A（推薦）：用日子判斷，唔再讀 `status`

    ```ts
    const first = list.length > listed.length ? list[0] : undefined;
    const rewatchUrl = first && first.date !== today ? first.url : undefined;
    ```

    - 今日節目未入清單 → 排最前、標「今日」、region「正在播放（今日節目）」，全部啱
    - 舊集 → 即刻標「重溫」、region「正在播放（重溫）」，唔使等載入
    - 清單載入完之後，同一集嘅 `rewatchUrl` 唔會變，`chosen` 唔會無故重設
    - 過咗香港午夜：昨日嗰集日子唔再係今日 → 重溫，同而家 ready 之後嘅行為一樣
    - 代價：兩行，要更新 JSDoc 同 S-506 test 嘅描述；加 P1、P2 兩個 test。Reviewer 已經喺 scratchpad 試過，363 個相關 test 全綠

- 方案 B：保留 `status` 閘，加中性 region（載入緊用「正在播放」）。代價：多一個分支同 i18n key；P1（storage 有舊集）照閃重溫；舊集載入緊時仍然冇「重溫」標籤
- 方案 C：改用 `isSearching`（第一輪 probe 完先決定）。代價：補到 P1，但第一輪 probe 逐個 slot 試，可以好耐，期間真正嘅重溫舊集會一直冇標籤，P2 嘅錯會拉長
- 推薦：**A**。唔 block 今次 merge（未有觸發路徑），但建議 release 前做埋，一個 commit `fix: W-485 | ...`

### 🟢 Suggestion

#### S-549 — port 俾人佔咗，e2e 會靜靜雞測人哋嘅 build（README 冇講）

- 位置：`e2e/run.mjs:47–65` `startPreview`；`README.md` 「端對端測試（e2e）」
- 描述：`vite preview --strictPort` 撞 port 會 exit 1（reviewer 喺 port 4987 試過），但 `startPreview` 冇睇 server 有冇 exit，只係 poll `fetch(BASE)`。如果佔住 port 嘅係另一個 worktree 嘅 `vite preview`（同一個 `/903-player/` base），`fetch` 會 ok，成套 e2e 就去測人哋嘅 build，仲可能全 PASS。版本號檢查都捉唔到，因為同一時間各 worktree 多數係同一個版本。README 寫「用 `E2E_PORT` 避開撞 port」，但冇講唔改嘅後果係測錯嘢，唔係起唔到。`run.mjs:17` 註解「strictPort 會令人誤測別人嘅 build」意思都有啲含糊
- 方案 A（推薦）：起 vite 之前先試 listen 一次個 port（`node:net`），listen 唔到就 throw「port N 俾人用緊，用 E2E_PORT 揀第二個」。代價：十行以內，要 QA 喺有人佔 port 時試一次。淨係喺 poll 入面睇 `server.exitCode` 唔夠：第一次 poll 嗰陣 vite 多數未 exit，`fetch` 已經由另一個 server 答咗
- 方案 B：只改 README，加一句「port 撞咗唔會報錯，會測到另一個 worktree 嘅 build」。代價：靠人記得，問題仲在
- 推薦：**A**，順手更正 `run.mjs:17` 註解

---

## ✅ 做得好嘅地方

- **S-483 冇盲跟原建議**：原 S-483 話「最簡單係喺 `onPointerLeave` 都清」，開發者發現 touch 嘅 pointerleave 喺 compat click 之前，照做就會令撳暗卡變 open，於是只限滑鼠，仲寫咗 test 鎖住呢個陷阱（M4 證實有效）。註解講清楚點解。
- **S-481 test 測行為唔測實作**：用 `vi.mock` 包住真函數數叫幾多次，唔使 mock 成個 selector，次序結果亦一齊斷言。
- **S-510 做到盡**：唔止原本提到嘅 `run.mjs:1476`，`run.mjs` 同 `touch.mjs` 每個截圖都加咗，用一個共用常數，註解講明只影響截圖。
- **README 每句都對得上代碼**：版本、指令、環境變數、截圖位置逐項核對都啱。
- **一個 item 一個 commit**，commit message 有寫 item ID。

## 修正優先順序

| 優先 | ID    | 工作量 | 說明                                                                         |
| ---- | ----- | ------ | ---------------------------------------------------------------------------- |
| 1    | W-485 | 細     | `rewatchUrl` 改用日子判斷，拎走 `status`；加 P1 / P2 test；建議 release 前做 |
| 2    | S-549 | 細     | 起 preview 前先檢查 port 冇人用，有就 throw；更正 `run.mjs:17` 註解          |

## 修訂後代碼（示意，未套用）

W-485 方案 A（`src/hooks/useMiniPlayer.ts`）：

```ts
/**
 * 今日節目（今日冇節目就冇，唔用最近一日）；載入緊清單冇嘅節目錄音就排最前，
 * 所以今日冇節目但聽緊嘢就只出聽緊嗰個。
 * 排最前嗰集係咪重溫睇日子：清單只有今日嘅錄音，今日嗰集未入清單（未載入完 / probe 未搵到）
 * 都唔係重溫；唔睇載入狀態，因為 status 有一條錄音就 ready，唔代表今日嘅載入完（S-506、W-485）
 */
const useListedRecordings = (loaded: Track | null) => {
    const { recordings } = useRecordings();
    const today = hkToday();
    const listed = useMemo(() => showsOnDate(recordings, today), [recordings, today]);
    const list = useMemo(() => miniPlayerRecordings(listed, loaded), [listed, loaded]);
    // 排咗喺最前（清單冇）嗰集
    const first = list.length > listed.length ? list[0] : undefined;
    const rewatchUrl = first && first.date !== today ? first.url : undefined;
    return { today, list, rewatchUrl };
};
```

W-485 要加嘅 test（`src/hooks/useMiniPlayer.test.ts`，reviewer 喺 scratchpad 用過嘅寫法）：

```ts
const pending = () => new Promise<Recording[]>(() => {});

it('tags a today show 今日 when storage only has older episodes and the probe is pending', async () => {
    const { result } = setup([recording('gongzi', '2026-10-17')], pending);
    await act(() => result.current.player.load(BADGIRL, { autoplay: true }));
    expect(result.current.mini).toMatchObject({ tags: ['today'], region: '正在播放（今日節目）' });
});

it('tags an older episode 重溫 even while the recordings are still loading', async () => {
    const old = recording('gongzi', '2026-10-17');
    const { result } = setup([], pending);
    await act(() => result.current.player.load(old, { autoplay: true }));
    expect(result.current.mini).toMatchObject({ tags: ['rewatch'], region: '正在播放（重溫）' });
});
```

S-549 方案 A（`e2e/run.mjs`）：

```js
import { createServer } from 'node:net';

/** strictPort 撞 port 會 exit，但 poll fetch(BASE) 會由佔住 port 嗰個 server（例如其他 worktree 嘅 build）答，所以起之前先試 */
const assertPortFree = (port) =>
    new Promise((resolve, reject) => {
        const probe = createServer()
            .once('error', () =>
                reject(new Error(`port ${port} 俾人用緊：用 E2E_PORT 揀第二個 port`)),
            )
            .once('listening', () => probe.close(resolve))
            .listen(port, 'localhost');
    });

const startPreview = async () => {
    await assertPortFree(PORT);
    // ……其餘照舊
};
```

（試完到 vite bind 之間仲有極短嘅空檔，但已經捉到「另一個 worktree 一早起咗 preview」呢個實際情況。）

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 94/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "claude/keen-pascal-5iifg0"
context: "Batch B pass 94 (5f3402c S-481 100, eaa0835 S-483 100, 505b5dc S-506 95, a2532cc S-510 100, 6e43b61 README 99; merged in 28211a9). eslint/tsc exit 0; vitest src/hooks+DramaShelf+pages 327/327; prettier clean on 10 diff files; 5/5 mutations fail tests. W-485: S-506 gate status==='ready' is the wrong signal — status is ready as soon as ANY recording exists, so with older episodes in storage and probe pending a today show is still tagged rewatch (P1 reproduced), and with empty storage an old episode is untagged with region 正在播放（今日節目） (P2 reproduced). Recommended fix (verified in scratchpad, 363/363 related tests green incl. P1/P2): rewatchUrl = first && first.date !== today ? first.url : undefined, drop status; neutral-region alternative not needed. Do before release. S-483 verified safe for CUI-0004 mouse scrub (capture->leave clears early but nothing reads pressRef; finish clears; click suppressed) and keyboard focus; mouse-only pointerleave is required (touch leave precedes compat click). README accurate: playwright ~1.63.0 (lock 1.63.0), PLAYWRIGHT_BROWSERS_PATH, E2E_PORT exists at e2e/run.mjs:17-28. S-549: startPreview ignores vite exit on busy port (strictPort exit 1 reproduced on port 4987) and polls fetch(BASE), so a run can silently test another worktree's build; pre-check the port with node:net before spawning. Version not bumped: release must bump 1.20.3 -> 1.20.4. Design Origin none-required valid (no component tsx/css). QA: run npm run e2e (reviewer did not; port 4173 busy) and confirm screenshots stable (marquee/disc phase) vs 5f018cc; manual: mouse drag off shelf card then Tab scrolls; long-press/right-click card then Tab scrolls; touch tap dimmed card only focuses; mouse scrub still works."
```
