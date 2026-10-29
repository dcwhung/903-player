# Code Review — 2026-10-29 — e2e 唔出外網（Google Fonts mock + 外部 request 攔截）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/keen-pascal-5iifg0`，commit `732d829` test(e2e): run e2e without network access（merge `a655d7a`）
    - 改動檔：`e2e/harness.mjs`、`e2e/run.mjs`、`src/e2eSrcConstants.test.ts`、`README.md`
- Design Origin：冇改 `*.tsx` / `*.css`，Design Fidelity n/a；app 本身（含 SW）冇改，PWA 檢查 n/a。
- Version：`package.json` 冇 bump（仍係 1.20.6）。純 test / 文件，app build 唔變，跟 2026-10-28 e2e hardening review 「test-only 唔 bump」先例，唔當 Warning。
- TDD：harness 改動本身係測試基建；unit test（`e2e offline mocks`）同實作同一個 commit。reviewer 用 probe script 實證攔截 / 記錄行為（見下），接受。
- Review Item ID：`grep -rhoE` 掃 `.proj-docs/` 證實最高 C-008、W-496、S-575。今次用 **W-497**、**S-576**。
- 總評：設計正確、範圍克制。route 優先次序啱（catch-all 最先註冊 = 最低優先），未知 host 係「abort + 記錄 + 最尾 FAIL」——唔會靜靜雞遮住 app bug；allow-list 係精確 origin，而且兩個 origin 嘅 `/**` handler 永遠 `fulfill`，冇任何 `continue()` / `fallback()` 可以漏出網。Service worker 發出嘅 request 一樣經 context route 同 `request` event（實證）。主要代價係字型：layout 斷言（標題完整顯示、日子條冇剪走）而家用 fallback 字型度量，唔再代表 production 嘅 Poppins / Noto Sans TC（W-497）。**94 分 ✅ pass**。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                            |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npm run lint`（`eslint . && prettier --check .`）exit 0，「All matched files use Prettier code style!」                                        |
| Type check    | ✅ pass | `npx tsc -b` exit 0                                                                                                                             |
| Tests         | ✅ pass | `npx vitest run src/e2eSrcConstants.test.ts` 9/9；reviewer 跑 `E2E_PORT=4193 npm run e2e`：**589 PASS / 0 FAIL**，最尾「冇 request 出外網」PASS |
| Coverage      | n/a     | 改動喺 e2e harness（唔入 coverage 範圍）；新 unit test 鎖 index.html ↔ mock host                                                                |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                          |
| Security scan | n/a     | 冇新依賴                                                                                                                                        |

---

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                         |
| -------- | ------ | ------- | ------------------------------------------------------------ |
| 正確性   | 25     | 25      | route 優先次序、SW、allow-list 全部實證                      |
| 安全性   | 20     | 20      |                                                              |
| 可維護性 | 20     | 20      | 所有 context 經 `newE2EContext`；註解清楚寫明優先次序理由    |
| 測試覆蓋 | 9      | 15      | W-497（文字度量斷言用 fallback 字型）、S-576（只掃 `href=`） |
| 性能     | 10     | 10      | predicate route 每個 request 行一次 `new URL`，可忽略        |
| 代碼風格 | 10     | 10      |                                                              |
| **總分** | **94** | **100** |                                                              |

**結果：✅ pass**

---

## 逐項判斷（main agent 指定）

### 1. Route 優先次序 — 正確

Playwright 係「後註冊先試」。`newE2EContext` 先註冊 predicate catch-all（`isExternal` → `abort('blockedbyclient')`），之後先註冊 fonts / audio / R2 嘅 `/**` route，所以 mock 咗嘅 host 永遠由自己嘅 handler 答，唔會跌落 catch-all。測試入面亦冇任何 `ctx.route` / `continue()` / `fallback()` / `unroute`（`grep` 證實），所以冇其他 route 會意外蓋過或者轉交。

reviewer probe（`newE2EContext` + `page.evaluate(fetch)`）：

| URL                                                       | 結果                  | 有冇記入 `externalRequests` |
| --------------------------------------------------------- | --------------------- | --------------------------- |
| `https://fonts.googleapis.com/css2?family=…&display=swap` | 200 `text/css`        | 冇                          |
| `https://fonts.gstatic.com/s/a.woff2`                     | 404                   | 冇                          |
| `https://audio.hkfm903.live/nope.mp3`                     | 404（audioResponder） | 冇                          |
| `https://example.com/`                                    | Failed to fetch       | 有                          |
| `http://audio.hkfm903.live/x`（http，唔同 origin）        | Failed to fetch       | 有                          |
| `https://sub.fonts.googleapis.com/x`（子網域）            | Failed to fetch       | 有                          |

### 2. Abort 未知 host 會唔會遮住 app bug — 唔會

abort 只係令 app 見到網絡錯誤（同真機離線一樣），但 `request` listener 照記低，`run.mjs` 最尾 `log(external.length === 0, …)` 會 FAIL 並列出 origin。即係「靜靜雞降級」嘅情況都會變成響亮嘅失敗。小代價：失敗只喺最尾一次過報，唔知係邊個 check 觸發——但 origin 名已足夠追查，唔扣分。另外 abort 比 `continue()` 好：唔會因為 CI 有網就「偶然通過」。

### 3. Allow-list 會唔會太闊 — 唔會

`MOCKED_ORIGINS` 用精確 origin（scheme + host + port）比較，子網域、http 版本都唔豁免（上表實證）。AUDIO_HOST 同 DRAMA_AUDIO_BASE 嘅 handler 每條路徑都 `fulfill`（未知檔 404），所以豁免記錄唔等於放行出網。`LOCAL_HOSTS` 豁免任何 port 嘅 localhost——理論上會放過打去本機其他 service 嘅 request，但 e2e 只有 preview server，可以接受。

### 4. 截圖 / layout 斷言用 system font 嘅價值 — 見 W-497

截圖用途（S-510）係兩個 branch 之間逐 pixel 比較，fallback 字型令佢更穩定，呢方面係加分。但 `run.mjs` 有幾個斷言直接靠字型度量：`checkFixedTodayPage` / `checkShowHeader` 嘅 `header h1` `scrollWidth <= clientWidth`（「頁頭標題完整顯示」）、`checkDayCellsFit`（日子條冇剪走）、mini player marquee overflow。呢個容器 `fc-match sans-serif` / `system-ui` 都係 **Inter**，同 Poppins（明顯較闊）唔同。

### 5. Service worker — 冇問題（實證）

Workbox 設定只有 `globPatterns` precache，冇 `runtimeCaching`，SW 本身唔會攞外部資源；外部 request 由頁面直接發。即使 SW 自己 `fetch` 外部 URL，Playwright 1.63 Chromium 一樣經 context route 同 context `request` event：reviewer 用一個本機 SW（`message` 時 `fetch('https://example.com/from-sw')` 同 fonts CSS）驗證，結果 `['ERR Failed to fetch', 'ok 200']`，`externalRequests = ['https://example.com/from-sw']`。唔需要 `serviceWorkers: 'block'`（block 咗反而會令 `run.mjs` 嘅「Service worker 已啟用」check 失效）。

### 6. 所有 context 都經 helper — 係

`grep newContext / newE2EContext / newE2EPage`：唯一 `browser.newContext` 喺 `harness.mjs` 入面；`run.mjs`（12 處）、`touch.mjs`、`arcSheet.mjs` / `dramaPages.mjs` / `miniPlayerRules.mjs`（經 `newE2EPage`）全部經 helper。`touch.mjs` 等 runner 喺最尾 check 之前行完，所以都計入。

---

## 問題清單

### 🟡 Warning

#### W-497 — 文字度量斷言而家量緊 fallback 字型，唔再代表 production

- 位置：`e2e/harness.mjs` `GOOGLE_FONTS_CSS` route（空 CSS）；受影響斷言：`e2e/run.mjs` `checkFixedTodayPage`（~L527）、`checkShowHeader`（~L605）、`checkDayCellsFit`（~L644）、narrow mini marquee（~L1006）
- 描述：fonts.googleapis.com 答空 CSS 之後，`--font-family: 'Poppins', 'Noto Sans TC', system-ui, sans-serif` 全部跌落 system-ui（呢個容器係 Inter）。「標題一行完整顯示」「日子條冇剪走」呢類斷言嘅意義係「用戶睇到嘅字放得落」，而 Poppins 比 Inter 闊，所以 production 會剪字但 e2e 照 PASS 嘅 false negative 有可能出現。README 有寫低 trade-off，但冇提呢幾個斷言受影響。
- 影響：e2e 對字型相關 layout regression 嘅保護變弱（之前有網嘅開發機至少會用真字型；冇網嘅容器本身就已經係 fallback，所以呢個 gap 部分係原有、而家變成全環境一致）。
- 方案 A（推薦）：將用到嘅字型（Poppins 400/500/600 latin subset；Noto Sans TC / Serif TC 可用 `pyftsubset` 只抽 e2e 頁面出現嘅字）放入 `e2e/fixtures/fonts/`，fonts.googleapis CSS route 答一段指去 `https://fonts.gstatic.com/e2e/<file>` 嘅 `@font-face`，gstatic route 由 fixture 答。完全離線、決定性、同 production 字型一致；`document.fonts.ready` 之後先量。代價：repo 多幾百 KB fixture（Noto CJK 全字會好大，一定要 subset）。
- 方案 B：只用 `@fontsource/poppins` 做 devDependency（Latin 部分），CJK 繼續 fallback。依賴細、覆蓋最闊嗰隻（Poppins，數字 / 英文標題）；CJK 寬度係方塊字，fallback 同 Noto 差異細，可以接受。代價：一個 devDependency + 要確認唔入 production bundle。
- 方案 C：唔改機制，喺 README / 受影響斷言旁邊寫明「用 fallback 字型度量」，並喺 QA 手動清單加「真機確認長節目名 / 窄螢幕標題」。成本最低，但保護唔會返嚟。
- 推薦：B（成本 / 覆蓋比最好）；如果之後有字型相關 bug 漏網，再升 A。

### 🟢 Suggestion

#### S-576 — index.html 外部 host 鎖只掃 `href="…"`

- 位置：`src/e2eSrcConstants.test.ts` `e2e offline mocks`
- 描述：regex 只抽 `href="https?://…"`。將來 index.html 加 `<script src="https://…">`、`<img src>`、單引號屬性、或 inline `<style>` 嘅 `url(https://…)`，test 唔會發現，要等跑完 6 分鐘 e2e 先喺最尾 check FAIL。
- 方案 A（推薦）：regex 改成抽所有 `https?://[^"'\s)]+`（排除註解可以唔理），再取 origin 比較。簡單、覆蓋 src / url()。
- 方案 B：用 `parse5`（vite 已間接依賴）parse，攞所有 `href` / `src` 屬性。準確但多一個 import。
- 推薦：A。

---

## ✅ 做得好嘅地方

- route 註冊次序有註解解釋「最先註冊 = 最低優先」，下一個人唔會無意中調亂。
- 「abort + 記錄 + 最尾斷言」三段式，比淨係 abort 或者淨係 `continue()` 都好：唔靠網、又唔會靜靜雞降級。
- `MOCKED_ORIGINS` 用精確 origin，唔係 hostname / 子字串比較；`isExternal` 正確略過 `data:` / `blob:`。
- unit test 用 set 相等：index.html 移除 Google Fonts 時都會提醒你清走 harness mock，唔只係單向。
- README 提供可重現嘅離線驗證方法（proxy 指去死 port）。

---

## 修正優先順序

| 優先 | ID    | 項目                                          | 阻唔阻 merge |
| ---- | ----- | --------------------------------------------- | ------------ |
| 1    | W-497 | 文字度量斷言用 production 字型（方案 B）      | 唔阻         |
| 2    | S-576 | index.html 外部 host 掃描包埋 `src` / `url()` | 唔阻         |

---

## 修訂後代碼（S-576 方案 A，示意）

```ts
// src/e2eSrcConstants.test.ts
describe('e2e offline mocks', () => {
    it('should mock every external host index.html references', async () => {
        const harness = await importE2E('harness.mjs');
        const mocked = [harness.GOOGLE_FONTS_CSS, harness.GOOGLE_FONTS_FILES];
        // href / src / url() 全部計：任何 http(s) 網址都會喺 e2e 出網
        const referenced = [...indexHtml.matchAll(/https?:\/\/[^"'\s)<>]+/g)].map(
            ([url]) => new URL(url).origin,
        );

        expect(referenced.length).toBeGreaterThan(0);
        expect(new Set(referenced)).toEqual(new Set(mocked));
    });
});
```

（注意：如果 index.html 有指去其他 host 嘅 `<meta>` / 註解網址，要先確認會唔會誤報；而家冇。）

---

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 94/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
  no_critical: pass
  security_scan: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "claude/keen-pascal-5iifg0"
blockers: []
context: "Review of 732d829 (merge a655d7a): e2e offline. Route priority correct (catch-all registered first = lowest; probe: fonts css 200 text/css, gstatic 404, audio 404 not recorded; example.com, http://audio host, sub.fonts.googleapis.com aborted + recorded). No continue()/fallback()/unroute anywhere in e2e. Allow-list is exact-origin and both allowed origins always fulfill, so nothing leaks. Abort + record + final run.mjs check fails loudly, does not mask app bugs. SW: workbox has no runtimeCaching; probe with a local SW fetching example.com showed SW fetches go through context routes and the context request event (PW 1.63 Chromium); serviceWorkers:'block' not needed (would break SW-enabled check). All contexts go through newE2EContext (only browser.newContext is in harness). W-497: text-metric assertions (header h1 fits, day cells not clipped, marquee) now measure fallback font (container system-ui = Inter) not Poppins/Noto -> possible false negatives; recommend @fontsource/poppins devDependency or subset font fixtures served via the gstatic route. S-576: index.html host lock only scans href=, broaden to src/url(). Gates: vitest e2eSrcConstants 9/9, tsc -b 0, npm run lint 0 (prettier clean), reviewer full e2e E2E_PORT=4193 589 PASS / 0 FAIL incl. no-external-request check. No version bump (test-only, precedent). Not pushed."
```
