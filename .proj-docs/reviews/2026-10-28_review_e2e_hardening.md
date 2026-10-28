# Code Review — 2026-10-28 — e2e 加固（S-528、S-529、Q-6、v1.19.2–v1.20.3 新規則 e2e）+ session log 格式化

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/keen-pascal-5iifg0`（head `1f0b521`）對 `b66d9e1`，範圍 `e2e/`、`scripts/`、`.claude/session-logs/2026-10-28_21-16.md`
- Commits：
    - `b610c73` test(e2e)：e2e 抄 src 嘅常數由 `scripts/e2eSrcConstants.test.ts` 鎖住（S-528）
    - `5b22090` test(e2e)：全集表放手後等表定落嚟，唔再固定 sleep（S-529）
    - `d709cd1` test(e2e)：全集表快速甩、清單未到頂向下拉（Q-6）
    - `46b795d` test(e2e)：v1.19.2–v1.20.3 主頁 mini player 重溫 / 冇節目日、短篇劇集頁黑碟、書架次序
    - `ce96db0` merge：lane A
    - `1f0b521` chore(docs)：prettier 格式化另一個 session 嘅 log（main Deploy run #108 喺 `npm run lint` fail）
- Design Origin：冇 `src` 改動，Design Fidelity / PWA 檢查唔適用
- Version：冇 bump。純 e2e / test / doc，build 出嚟嘅 app 唔變；跟 `2026-10-27_review_cleanup_batch.md` 先例（跟下一個 release），唔當 Warning
- Batch 大細：4 個 item + 1 個格式化 commit = 5，冇超 cap
- Review Item ID：現有最高 W-483、S-543，今次由 **W-484**、**S-544** 開始（用到 W-484、S-544、S-545、S-546）
- 總評：hard gates 全部 pass，冇 🔴 Critical，1 個 🟡 Warning（W-484：Q-6 快速甩嘅 check 要「最後一下 touchMove + 放手」兩個 CDP 來回加埋 ≤ 100ms，同開發者自己量到嘅機忙 30–50ms 一下貼邊），3 個 🟢 Suggestion。
    - S-528 / S-529 跟足上次 review 推薦（兩個方案都做埋），waitSettled 冇 race：`settle()` 同一個 loop 入面同步拎走 `data-dragging`、加 `data-closing`、改 transform。
    - 新 e2e 每個情境用獨立 context（localStorage / 時鐘各自新開），唔受 `run.mjs` 主流程影響。
    - `1f0b521` 純格式化：表格對齊、list 前加空行，去走空白同 `-` 之後內容逐行相同。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                 |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint .` exit 0；`npx prettier --check .` 全部 pass（包括 `.claude/session-logs/2026-10-28_21-16.md`，上次 review 記低嘅 main 問題已解決）                                                     |
| Type check    | ✅ pass | `npx tsc -p tsconfig.node.json --noEmit` exit 0（`scripts/e2eSrcConstants.test.ts` 經 import 帶入 4 個 src 模組，冇 DOM / `import.meta.glob`，過到）；`npx tsc -p tsconfig.app.json --noEmit` exit 0 |
| Tests         | ✅ pass | `npx vitest run scripts`：6 個檔、19 個 test 全綠。`npm run e2e` reviewer 自己跑一次：**587 PASS / 0 FAIL**（6m17s，包 build），新 check 全部 PASS                                                   |
| Coverage      | ✅ pass | 冇 production 改動；新 e2e 覆蓋 v1.19.2–v1.20.3 規則，常數鎖 test 經 reviewer mutation 驗證（見下）                                                                                                  |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                               |
| Security scan | ✅ n/a  | 冇新依賴                                                                                                                                                                                             |

## 評分結果

| 維度     | 得分   | 滿分    | 備注                               |
| -------- | ------ | ------- | ---------------------------------- |
| 正確性   | 25     | 25      |                                    |
| 安全性   | 20     | 20      |                                    |
| 可維護性 | 19     | 20      | S-544                              |
| 測試覆蓋 | 8      | 15      | W-484（-5）、S-545、S-546（各 -1） |
| 性能     | 10     | 10      |                                    |
| 代碼風格 | 10     | 10      |                                    |
| **總分** | **92** | **100** |                                    |

**結果：✅ pass**（≥ 90、冇 Critical、hard gates 全 pass；W-484 建議下次掂 `e2e/arcSheet.mjs` 時處理，或者一見 flake 即做）

---

## 重點驗證

| 項目                              | 結論         | 證據                                                                                                                                                                                                                                                                                                   |
| --------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S-528 常數鎖                      | ✅           | `harness.mjs` 嘅 `AUDIO_HOST` / `DRAMA_AUDIO_BASE`、`arcSheet.mjs` 5 個 export 逐個 `toBe` src。**Mutation**（scratchpad `git archive` copy）：`DRAG_INTENT_PX` 改 12、`DRAMA_AUDIO_BASE` 改網址 → 2 fail / 5 pass。用 `new URL(..., import.meta.url)` 動態 import，TS 唔解析 `.mjs`，唔使 `.d.ts`，好 |
| S-528 拖 src 入 node tsconfig     | ✅（有代價） | 只帶入 `swipe.ts`、`sheetDrag.ts`、`cardStack.ts`、`constants.ts`，全部純計算 / 常數。代價：將來呢 4 個檔加 DOM type 或者 `import.meta.glob`，錯會喺 `tsconfig.node.json` 報，唔直觀；`PROBE_STORAGE_KEY` 因此冇鎖到 → S-545                                                                           |
| S-528 方案 B：R2 404 搬入 harness | ✅           | `newE2EContext` 統一 route `DRAMA_AUDIO_BASE/**` → 404，`arcSheet.mjs` 自己嗰個 route 拎走；所有 context（包括新 `dramaPages.mjs`）都唔會出外網                                                                                                                                                        |
| S-529 等條件                      | ✅           | `waitSettled` 等「表 detach」或者「transform 空 + 冇 dragging / closing」。`useSheetDragControls.ts` `settle()` 同步拎走 `data-dragging`、閂就同時加 `data-closing` 同 `translateY(100%)`，所以唔會喺中間狀態誤判 `'open'`；判斷係放手嗰下已經定，彈返之後唔會再閂。等唔到回 `'stuck'`，斷言會報出嚟   |
| Q-6 清單未到頂                    | ✅           | `scrollTop = 200` 再拉 120px（未到頂），斷言 transform 空、冇 `data-dragging`、清單捲返 ≥ 60px、放手仍然開住。reviewer e2e：捲返 105px，`dragging false`                                                                                                                                               |
| Q-6 快速甩                        | ⚠️ → W-484   | 斷言啱（距離 = 門檻 × 0.75，淨係靠速度閂；reviewer e2e 甩 123px / 表高 658，觸控兩路 + 滑鼠都 `closed`），但時間窗口貼邊，見 W-484                                                                                                                                                                     |
| mini player 重溫（平日）          | ✅           | 獨立 context（`E2E_NOW` 星期一），入公子會頁自動播 17/10 → 返主頁：region 名、`mediaSession` = playing 兼已播秒數真係行（2s → 4s）、次序 = 重溫 + 今日三個、第一項標「重溫」                                                                                                                           |
| mini player 冇節目日（星期日）    | ✅           | `now` = 18/10 星期日；冇嘢載入 → 0 個 mini region；播舊集返主頁 → 只得一個 region「正在播放（重溫）」、冇指示點。負面斷言用固定 1s 等 → S-546                                                                                                                                                          |
| 黑碟 / 冇由頭播放                 | ✅           | 獨立量 TodayEmpty（星期二 20/10 未上架）嘅碟做參照，再比短篇劇集頁：底色 `rgb(10, 10, 10)`、box-shadow 完全一樣、0 張圖；冇「由頭播放」、得一個「播放」。寫死 `BLANK_DISC_BG` 加參照比較，兩重對照好                                                                                                   |
| 書架次序                          | ✅           | 寫死 5 個劇名做獨立 oracle，`tileName` 去走「，有新短篇」等後綴                                                                                                                                                                                                                                        |
| 時鐘相依                          | ✅           | `now` 只改起點，`clock.install` 照行真實時間；所有日期相依常數（`E2E_SUNDAY`、`E2E_TUESDAY_NOT_UPLOADED`、`TODAY_SHOWS`）都有註解講明對應 `sampleData.mjs` 邊日。2026-10-18 = 星期日、10-20 = 星期二，核對無誤                                                                                         |
| 讀 `aria-valuetext` 計已播秒數    | ✅ 低風險    | `aria-valuenow` 係百分比（2s 行唔到 1%），所以讀「m:ss / 10:00」。2s 間隔、秒級精度，要已播 ≥ 1s 先過；解析失敗回 `NaN` → `after > before` 係 false，只會 false fail、唔會 false pass。音檔 600s，唔會出 h:mm:ss                                                                                       |
| 函數長度 ≤ 30 行                  | ✅           | 最長 `checkRewatchWithToday` 30 行（啱啱好）、`checkNoShowDay` 29、`checkSeriesFirstVisit` 28；其餘都短                                                                                                                                                                                                |
| Check 數                          | ✅           | arcSheet +9（3 甩 + 2 清單 + 4 次 `openSheet`）、mini player +10、劇集 +5 = 24；563 → 587，同 reviewer e2e 一致                                                                                                                                                                                        |
| `1f0b521` 只係格式化              | ✅           | 前後兩版去走空白 / `-` 之後逐行 `diff` 相同；冇改字                                                                                                                                                                                                                                                    |
| TDD                               | ⚪ 唔適用    | 全部係補測試（現有行為）；開發者報每個新 check 做過 mutation，reviewer 獨立 mutation 咗常數鎖 test                                                                                                                                                                                                     |

---

## 問題清單

### 🔴 Critical

冇。

### 🟡 Warning

#### W-484 — Q-6 快速甩要兩個 CDP 來回 ≤ 100ms，機忙時貼邊

- 位置：`e2e/arcSheet.mjs` `FLING_STEPS` / `FLING` / `checkFling`（約 41–45、94、158–170 行）；`src/components/ShowCardStack/cardStack.ts` `pushSample` / `velocityOf`
- 描述：速度 = 放手時 `VELOCITY_WINDOW_MS`（100ms）窗口內第一個同最後一個樣本嘅差。放手位置同最後一下 touchMove 一樣，所以窗口入面一定要有**倒數第二個** move 樣本，速度先唔係 0。即係要「第 2 下 touchMove + touchEnd」兩個 CDP 來回加埋 ≤ ~100ms，平均每下 ≤ 50ms。commit 註解自己量到機忙時每下 30–50ms，即係上限啱啱等於觀察到嘅最壞值。
    - 加大每格距離幫唔到：每格 ~61.5px 時速度門檻對應每下 ≤ 51ms，同窗口限制差唔多；窗口限制同格數、距離無關。
    - 兩格已經係最好嘅格數（一格嘅話窗口要包到 touchStart）。
    - 上次 review（`3cdacd0`）已經證實 CDP `timestamp` 去唔到 `event.timeStamp`，所以唔可以用 CDP 指定時間。
- 影響：機好忙（例如同 build / 其他 e2e 一齊跑、慢 CI runner）時偶然 `open`，QA 可能誤會甩閂 regression。今次 3 + 1 次全過，機率唔高
- 方案 A：甩嗰下喺 page 入面一次過 dispatch（header 用 `PointerEvent`，清單用 `TouchEvent`），每下之間 busy-wait 固定 16ms，`event.timeStamp` 由頁面自己控制，完全唔受 CDP 來回影響。代價：唔再行真瀏覽器 input pipeline（但「真 input」已經有慢拉 / 閂嘅 check 覆蓋）；合成 `TouchEvent` 要 `Touch` constructor，Chromium 有
- 方案 B：保留 CDP，喺 page 加 capture listener 記低真正收到嘅 `event.timeStamp`；如果倒數第二個 move 同放手相隔 > `VELOCITY_WINDOW_MS`（即係手勢本身唔算甩），就重做（最多 2 次），log 入面寫埋實際間隔。代價：多少少 code；fail 時訊息可以分辨「app 真係壞」定「機太慢」
- 推薦：**B**，保留真 input 路徑，fail 訊息有診斷價值，同 CUI-0003 量 `event.timeStamp` 嘅做法一致

### 🟢 Suggestion

#### S-544 — `openPage`、`PHONE`、「waitFor → true / false」喺幾個 e2e 模組重複

- 位置：`e2e/dramaPages.mjs` `openPage`、`e2e/miniPlayerRules.mjs` `openPage`（逐字一樣）；`PHONE` 喺 `arcSheet.mjs`、`dramaPages.mjs`、`miniPlayerRules.mjs`；`.waitFor(...).then(() => true).catch(() => false)` 喺 `arcSheet.mjs` `openSheet`、`dramaPages.mjs` `todayEmptyDisc`、`miniPlayerRules.mjs` 兩處
- 描述：三個模組各自抄，將來改 viewport 或者 pageerror 處理要改幾處
- 方案 A：`harness.mjs` 加 `PHONE`、`newE2EPage(browser, errors, contextOptions, { now })`、`isShown(locator, timeout)`，三個模組共用。代價：細 refactor，要重跑 e2e
- 方案 B：只抽 `openPage`（逐字重複嗰個），其餘維持。代價：重複少咗但未清
- 推薦：**A**，可以同 W-484 一齊做

#### S-545 — `PROBE_STORAGE_KEY` 冇鎖到；常數鎖 test 放錯 tsconfig 範圍

- 位置：`scripts/e2eSrcConstants.test.ts`；`e2e/harness.mjs` `PROBE_STORAGE_KEY`；`src/services/probeStore.ts`
- 描述：測試放 `scripts/`（`tsconfig.node.json`），import `probeStore.ts` 會帶入 `import.meta.glob`（node tsconfig 冇 `vite/client` type），所以最重要嘅 seed key 冇鎖。佢脫節 e2e 會大面積 fail（錄音清單全空），唔會靜靜雞過，所以只係 Suggestion；但而家「src 純計算模組被拖入 node program」亦係一個隱性耦合
- 方案 A：搬去 app tsconfig 範圍（例如 `tests/e2eSrcConstants.test.ts`，頂部 `// @vitest-environment node`），`vite/client` type 有齊，可以 import `PROBE_STORAGE_KEY` 一齊鎖，亦唔再將 src 拖入 node tsconfig。代價：要確認 `tests/` 喺 vitest `include`（而家只 include `src/**` 同 `scripts/**`，要加一條）或者放 `src/` 底下
- 方案 B：維持 `scripts/`，用正則讀 `probeStore.ts` 原始碼抽 `PROBE_STORAGE_KEY` 字串比較。代價：靠正則，改寫法會失效
- 推薦：**A**

#### S-546 — 幾個斷言對 markup / 時間比較敏感

- 位置：`e2e/miniPlayerRules.mjs` `MINI_ABSENT_SETTLE_MS`（星期日「冇 mini player」）、`text.startsWith(\`${REWATCH_SHOW.name}重溫\`)`；`e2e/dramaPages.mjs` `checkSeriesFirstVisit`嘅`sheet.waitFor`/`discLook`
- 描述：
    1. 「冇 mini player」係負面斷言，靠固定等 1s：如果將來 mini player 遲過 1s 先出，會 false pass。最好先等一個正面錨點（例如主頁今日節目區 render 完）再數。
    2. 用 `textContent` 串埋判斷「公子會重溫」，將來加一個 visually-hidden 字或者改元素次序就會 false fail；可以改為斷言標籤元素本身（例如 `getByText('重溫', { exact: true })` 喺第一項入面）。
    3. `checkSeriesFirstVisit` 嘅 `waitFor` / `discLook` 失敗會 throw，成個 e2e 中斷，同其他 check「log fail 再繼續」唔一致。
- 方案 A：三點照上面改。代價：細改動
- 方案 B：只改 1（唯一會 false pass 嘅），其餘維持。代價：最少改動
- 推薦：**A**，唔急，下次掂呢兩個檔時一齊做

---

## ✅ 做得好嘅地方

- **跟足上次 review**：S-528 方案 A、B 都做埋；S-529 用 element handle + `isConnected` 一次過處理閂 / 彈返，比上次示意嘅兩個 helper 更簡潔。
- **常數由來源推算**：`HOLD_BEFORE_RELEASE_MS = VELOCITY_WINDOW_MS * 2`、`FOLLOW_TOLERANCE_PX = DRAG_INTENT_PX + 6`，加上常數鎖 test，改 src 門檻 e2e 會跟住變或者即刻報錯。
- **註解交代時序數學**：`FLING_STEPS` 註解寫明點解四格唔得、兩格點計，W-484 就係睇住呢段註解推出嚟。
- **獨立 oracle**：書架次序、今日節目、黑碟色全部刻意寫死，再加 TodayEmpty 實測參照，唔會「同 app 用同一份錯資料所以過」。
- **隔離做得好**：每個新情境自己開 context、自己設 `now`、自己 close；R2 404 搬入 harness 之後新模組唔使記住 route。
- **`fling` 唔量度**：註解講明 `evaluate` 會拖慢最後一格同放手之間，避開咗一個隱藏時間成本。
- **Deploy 修復範圍準**：`1f0b521` 只格式化出事嘅 log，冇順手郁其他檔。

## 修正優先順序

| 優先 | ID    | 工作量 | 說明                                                                    |
| ---- | ----- | ------ | ----------------------------------------------------------------------- |
| 1    | W-484 | 細     | 甩 check 記錄真實 `event.timeStamp`，手勢唔算甩就重做（最多 2 次）      |
| 2    | S-546 | 細     | 星期日負面斷言先等正面錨點；「重溫」標籤直接斷言；劇集頁 check 唔 throw |
| 3    | S-545 | 細     | 常數鎖 test 搬去 app tsconfig 範圍，加鎖 `PROBE_STORAGE_KEY`            |
| 4    | S-544 | 細     | `harness.mjs` 共用 `PHONE` / `newE2EPage` / `isShown`                   |

全部唔 block merge。

## 修訂後代碼（W-484 方案 B + S-545 方案 A 示意，未套用）

```js
// e2e/arcSheet.mjs — W-484：記低真正送到 app 嘅 event.timeStamp
const FLING_ATTEMPTS = 3;

/** 喺表上面記 move / 放手嘅 event.timeStamp（capture，app handler 之前） */
const recordInputTimes = (sheet) =>
    sheet.evaluate((el) => {
        const times = [];
        const record = (event) => times.push(event.timeStamp);
        for (const type of ['pointermove', 'pointerup', 'touchmove', 'touchend']) {
            el.addEventListener(type, record, { capture: true });
        }
        el.__flingTimes = times;
    });

/** 倒數第二個 move 同放手相隔幾耐（ms）；> VELOCITY_WINDOW_MS 即係手勢本身唔算甩 */
const releaseGapMs = (sheet) =>
    sheet.evaluate((el) => {
        const t = el.__flingTimes ?? [];
        return t.length >= 3 ? t[t.length - 1] - t[t.length - 3] : Infinity;
    });

/** 甩：手勢真係送得夠快先算數，機太慢就重做 */
const checkFling = async (env, grip, label) => {
    const { p, log, input } = env;
    let result = { settled: 'stuck', gap: Infinity };
    for (let attempt = 1; attempt <= FLING_ATTEMPTS; attempt += 1) {
        if (!(await openSheet(env, label))) return;
        const sheet = await sheetOf(p).elementHandle();
        await recordInputTimes(sheet);
        const height = (await sheet.boundingBox()).height;
        const dy = Math.round(height * SHEET_DISMISS_RATIO * FLING_RATIO);
        const { settled } = await dragDown(p, input, await GRIPS[grip](p), dy, FLING);
        result = { settled, gap: settled === 'closed' ? 0 : await releaseGapMs(sheet) };
        if (result.gap <= VELOCITY_WINDOW_MS) break;
    }
    log(
        result.settled === 'closed',
        `${label}：快速甩放手，全集表照閂（${result.settled}，間隔 ${result.gap}ms）`,
    );
};
// 注意：滑鼠 up() 會先 mouse.move 去同一點，多一個 pointermove，要改為搵「y 唔同」嘅倒數第二個 move；
// 閂咗之後 sheet 已 detach，所以 closed 時唔再讀 gap；openSheet 每次重試都會 log 一次，
// check 數會因重試而變，要喺 run.mjs 總數斷言（如有）考慮
```

```ts
// src/e2eSrcConstants.test.ts（S-545 方案 A：app tsconfig 範圍，vitest include 已涵蓋 src/**）
// @vitest-environment node
import { PROBE_STORAGE_KEY } from './services/probeStore';
// …其餘 import 同而家一樣，路徑改為 './hooks/swipe' 等

it('should keep harness.mjs PROBE_STORAGE_KEY equal to src', async () => {
    const harness = await importE2E('harness.mjs');

    expect(harness.PROBE_STORAGE_KEY).toBe(PROBE_STORAGE_KEY);
});
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 92/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "no production change; new e2e covers v1.19.2-v1.20.3 rules; constants lock test mutation-verified by reviewer"
  no_critical: pass
  security_scan: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "claude/keen-pascal-5iifg0"
context: "e2e hardening pass 92. Gates: vitest scripts 19/19, tsc node + app 0, eslint 0, prettier --check . clean, reviewer npm run e2e 587/0. S-528: e2eSrcConstants.test.ts locks AUDIO_HOST, DRAMA_AUDIO_BASE + 5 arcSheet constants (reviewer mutation: 2 fail); R2 404 moved into newE2EContext. S-529: waitSettled has no race (settle() sets data-closing/removes data-dragging synchronously). Q-6 list-not-at-top and fling covered. New-rule e2e (mini player rewatch weekday + Sunday, series first-visit black disc vs TodayEmpty, no 由頭播放, shelf order) each in own context/clock. 1f0b521 formatting only (content identical modulo whitespace/dashes). W-484: fling needs move2+touchEnd CDP round trips <= VELOCITY_WINDOW_MS (100ms) total, i.e. <=50ms each, equal to dev's observed busy-machine worst case; recommend recording real event.timeStamp and retrying when the delivered gesture was not a fling. S-544: share PHONE/openPage/isShown in harness. S-545: move constants test to app tsconfig scope and lock PROBE_STORAGE_KEY. S-546: Sunday negative check uses fixed 1s sleep, textContent startsWith fragile, checkSeriesFirstVisit throws instead of logging. No version bump (test-only, precedent). Not pushed."
```
