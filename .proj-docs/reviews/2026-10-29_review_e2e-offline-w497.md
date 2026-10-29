# Code Review — 2026-10-29 — Re-review W-497 / S-576（e2e 本機供應 Poppins）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/keen-pascal-5iifg0`，commit `860d3e1` test(e2e): serve Poppins locally so text-metric checks use the real font（merge `a936851`）
    - 改動檔：`e2e/harness.mjs`、`e2e/run.mjs`、`src/e2eSrcConstants.test.ts`、`README.md`、`package.json`、`package-lock.json`
- 上一份：[2026-10-29_review_e2e-offline.md](2026-10-29_review_e2e-offline.md)（W-497、S-576）
- Design Origin：冇改 `*.tsx` / `*.css`，Design Fidelity n/a；app 本身冇改（`git diff 0d6d6e1 860d3e1 -- src/ public/ index.html vite.config.*` 只有 `src/e2eSrcConstants.test.ts`），PWA 檢查 n/a。
- Version：冇 bump（仍係 1.20.6）。commit message 寫明「fixes bug introduced by 732d829 (same session, previous command)」，符合 sw-git-flow 例外；而且係 test-only，app build 唔變。唔當 Warning。
- TDD：harness 係測試基建；新 e2e check `checkPoppinsLoaded` 本身就係紅綠指標（舊 harness 答空 CSS 一定 FAIL）。reviewer 用 probe 實證（見下），接受。
- Review Item ID：`grep -rhoE` 掃 `.proj-docs/` 證實最高 W-497、S-576。今次新 ID：**S-577**。
- 總評：W-497 真係 close 咗：harness 照 css2 網址答 Poppins 400/500/600 `@font-face`，字型檔由 `@fontsource/poppins` 本機答，reviewer probe 證實 `header h1` 用 Poppins 600 渲染、三個字重 latin face 全部 `loaded`、所有 font request 200 冇出網。gstatic route 嘅檔案供應係 path-traversal safe（白名單 regex 錨定全名 + URL 正規化）。依賴係 OFL-1.1 devDependency、2.8 MB、唔入 production bundle、`npm audit --omit=dev` 0。S-576 regex 掃晒所有 http(s) 網址。唯一小問題：css2 字重解析遇到 index.html 未來可能用嘅語法（`ital,wght@`、`100..900` 範圍、冇對應 CSS 檔嘅字重）會令 node 進程 crash 或者靜靜雞少答字重（S-577）。**99 分 ✅ pass**。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint          | ✅ pass | `npm run lint`（`eslint . && prettier --check .`）exit 0，「All matched files use Prettier code style!」                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Type check    | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Tests         | ✅ pass | `npx vitest run src/e2eSrcConstants.test.ts` 9/9；reviewer 跑 `E2E_PORT=4197 npm run e2e`：**590 PASS / 0 FAIL**（含「Poppins 400 / 500 / 600 都載入咗」同「冇 request 出外網」）。另一次離線跑（`HTTPS_PROXY=http://127.0.0.1:9`，同時開住 probe + 另一個 vite preview）589 / 1：FAIL 係 `arcSheet.mjs`「390×844 觸控全集表（清單）：全集表打開咗，喺原位（transform「(冇表)」）」——甩閂之後重開未完成就量，係手勢 timing 喺 CPU 爭用下嘅 flake，同字型無關，冇負載重跑即過；離線嗰次「Poppins 載入」同「冇 request 出外網」都 PASS |
| Coverage      | n/a     | 改動喺 e2e harness（唔入 coverage 範圍）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Security scan | ✅ pass | `npm audit --omit=dev`：0 vulnerabilities。`npm audit`：6（5 low、1 moderate），全部係原有（fast-uri、serialize-javascript、deepmerge ← vite-plugin-pwa / workbox-build），`@fontsource/poppins` 冇任何 advisory、冇依賴                                                                                                                                                                                                                                                                                                             |

---

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                      |
| -------- | ------ | ------- | --------------------------------------------------------- |
| 正確性   | 24     | 25      | S-577：css2 字重解析唔識新語法，未知字重會 crash 成個 run |
| 安全性   | 20     | 20      | 白名單檔名、URL 正規化，traversal probe 全 404            |
| 可維護性 | 20     | 20      | 常數 / helper 命名清楚，註解寫明 subset 同 CJK 取捨       |
| 測試覆蓋 | 15     | 15      | 新增 `checkPoppinsLoaded`；S-576 已 close                 |
| 性能     | 10     | 10      | 每個 css request 同步讀 3 個細 CSS 檔，可忽略             |
| 代碼風格 | 10     | 10      |                                                           |
| **總分** | **99** | **100** |                                                           |

**結果：✅ pass**

---

## 逐項判斷（main agent 指定）

### 1. W-497 係咪真係 close 咗 — 係（實證）

reviewer probe（`newE2EContext`、320×640 @2x、`#/show/badgirl`，等 `header h1` 出現 + 800 ms）：

| 項目                                             | 結果                                                                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document.fonts`                                 | Poppins 400 / 500 / 600 各兩個 face：latin（`U+0-FF…`）**loaded**、latin-ext（`U+100-2BA…`）unloaded（冇用到 latin-ext 字，`unicode-range` 正常延遲載入） |
| `header h1` computed                             | `Poppins, "Noto Sans TC", system-ui, sans-serif`，600，24px                                                                                               |
| font request                                     | `fonts.googleapis.com/css2?…` 200；`fonts.gstatic.com/e2e/poppins-latin-{400,500,600}-normal.woff2` 全部 200                                              |
| 寬度差（canvas，600 24px，`Bad Girl 12/05 Mon`） | Poppins 224.4px vs system-ui（Inter）219.7px vs sans-serif 216.1px —— Poppins 闊約 2–4%，正係 W-497 擔心嘅 false negative 範圍                            |

- 文字度量斷言（`checkShowHeader` / `checkFixedTodayPage` 嘅 `scrollWidth <= clientWidth`、`checkDayCellsFit`、marquee overflow）而家量 Poppins。佢哋冇 `await document.fonts.ready`，但每次 `goto` 都等啟動畫面（≥ 2 秒）消失先交返，本機 route 幾 ms 就答，swap 喺量度之前完成（probe 證實）；`useFitText` 字型載完會重新量，所以就算 race 都只係短暫。可接受，唔開 item。
- 額外得益：之前 e2e 永遠冇 web font，`useFitText`「字型載完重新量」嗰條路徑喺 e2e 從來冇行過；而家會行。
- `checkPoppinsLoaded`：`document.fonts.load()` 冇 `@font-face` 會回傳 `[]`、字型檔 404 會係 `error`，兩樣都會 FAIL；配合 `check()` 確認。只喺 390×844 主頁跑一次已足夠證明 harness 生效（所有 context 同一個 responder）。
- CJK fallback 理據成立：中文字（包括全形括號）喺 Noto Sans TC 同 WenQuanYi Zen Hei（呢個容器 `fc-match sans-serif:lang=zh-tw`）都係 1em 全形 advance，水平度量差異可忽略；Poppins 冇 CJK glyph，混合標題（例如「Bad Girl大過佬」）嘅拉丁部分已經用真 Poppins。剩低嘅差異係垂直 metrics（ascent / descent），而相關斷言全部係橫向，唔受影響。Noto Sans TC 全字十幾 MB，唔值得。

### 2. License / size — OK

- `@fontsource/poppins@5.3.0`，`license: OFL-1.1`（lockfile 都有記錄），`"dev": true`，有 `integrity`，冇 transitive 依賴。
- OFL-1.1 容許隨軟件使用 / 再分發，只限制單獨賣字型同改名；devDependency 唔隨 app 分發，冇義務問題。
- 安裝大小 2.8 MB（108 個檔，大部分係唔用嘅 subset / 字重）；e2e 只讀 6 個 woff2（latin 7.9 KB 一個）。`~5.3.0` 只收 patch，穩陣。
- `grep -rl "fontsource\|poppins-latin" dist` 冇結果：唔入 production bundle（`src/` 冇 import）。

### 3. gstatic route 檔案供應 — path-traversal safe（實證）

`fontFilesResponder` 用 `new URL(...).pathname`（瀏覽器同 WHATWG URL 已經解咗 `..`），再要求 `startsWith('/e2e/')` **同埋** 剩低部分完整符合 `^poppins-(latin|latin-ext)-\d+-normal\.woff2$`（冇 `/`、冇 `%`、冇 `.`），之後先 `new URL('files/<file>', FONTSOURCE_POPPINS)`。檔名字元集冇任何可以跳出目錄嘅組合；`readFileSync` 失敗（例如唔存在嘅字重）回 404。

| probe 路徑                                       | 結果                                                     |
| ------------------------------------------------ | -------------------------------------------------------- |
| `/e2e/poppins-latin-400-normal.woff2`            | 200 `font/woff2` 7884 bytes，CORS fetch 成功（ACAO `*`） |
| `/e2e/../../package.json`                        | 404                                                      |
| `/e2e/..%2F..%2Fpackage.json`                    | 404                                                      |
| `/e2e/%2e%2e/400.css`                            | 404                                                      |
| `/e2e/poppins-latin-400-normal.woff`（非 woff2） | 404                                                      |
| `/e2e/poppins-latin-999-normal.woff2`            | 404（readFileSync catch）                                |
| `/e2e/poppins-devanagari-400-normal.woff2`       | 404（subset 唔喺白名單）                                 |
| `/s/poppins/v1/x.woff2`（真 gstatic 形狀）       | 404                                                      |

### 4. CI（`.github/workflows/deploy.yml`）— 唔受影響

- `npm ci`：lockfile 有新 entry（resolved + integrity），同 `package.json` 一致（`npm ls @fontsource/poppins` → 5.3.0），`npm ci` 唔會因為 out-of-sync 失敗。多下載約 1 MB tarball。
- `npm run lint`：e2e 檔已過 eslint / prettier。
- `npm test`：`src/e2eSrcConstants.test.ts` import `harness.mjs`；harness 喺 import 時只係 `new URL(...)`，冇讀檔，所以就算冇 node_modules 入面嘅字型都唔會喺 unit test 爆。
- `npm run build`：`src/` 冇 import，bundle 唔變。CI 唔跑 e2e。

### 5. S-576 — close 咗

regex 改為 `/https?:\/\/[^\s"'`<>()]+/g`，會捉 `src=`、單引號屬性、`url(...)`、inline script 字串。index.html 而家只有 fonts 兩個 host，set 相等通過。（上一份 review 已提：將來 inline SVG 有 `http://www.w3.org/2000/svg` namespace 會誤報，到時加排除即可，唔開 item。）

---

## 問題清單

### 🟢 Suggestion

#### S-577 — css2 字重解析唔識其他 Google Fonts 語法；未知字重令成個 e2e 進程 crash

- 位置：`e2e/harness.mjs` `requestedPoppinsWeights`、`poppinsFaces`、`fontsCssResponder`
- 描述：`/wght@([\d;]+)/` 只識 `wght@400;500;600`。reviewer probe：
    - `family=Poppins:wght@450`（fontsource 冇 `450.css`）→ `readFileSync` 喺 route handler 同步 throw，**成個 node 進程 uncaught ENOENT crash**（唔係一條 FAIL，而係 run 中途死，訊息係 node_modules 路徑，唔易睇出係 index.html 改咗字重）。
    - `family=Poppins:ital,wght@0,400;1,400` → regex 抽到 `0` → 讀 `0.css` → 同樣 crash。
    - `family=Poppins:wght@100..900`（variable 範圍）→ 只抽到 `100` → 靜靜雞只答 100，`checkPoppinsLoaded` 嘅 400/500/600 會 FAIL，但原因唔明顯。
    - 另外 `run.mjs` `POPPINS_WEIGHTS = [400, 500, 600]` 同 index.html 嘅字重係兩份手抄，index.html 加 700 時 check 唔會驗 700。
- 影響：而家 index.html 冇用呢啲語法，所以唔係 bug；係將來改字型時嘅維護陷阱（錯誤訊息唔指向原因）。
- 方案 A（推薦）：喺 `src/e2eSrcConstants.test.ts` 加一條 unit test：從 index.html 嘅 css2 網址抽 Poppins 字重，斷言 (1) 全部係 `wght@` 純數字清單、(2) 每個字重喺 `node_modules/@fontsource/poppins/<w>.css` 存在、(3) 等於 `run.mjs` 嘅 `POPPINS_WEIGHTS`（或者 harness export 一個 `requestedPoppinsWeights` 畀 run.mjs 用，消除手抄）。改 index.html 時 1 秒內喺 unit test 報錯，CI 都會捉到。代價：test 依賴 node_modules 結構（devDependency，CI `npm ci` 有裝）。
- 方案 B：`fontsCssResponder` 包 try/catch，失敗時 `route.fulfill({ status: 500 })` 並 `console.error` 寫明「index.html Poppins 字重 X 冇本機檔」，令 `checkPoppinsLoaded` FAIL 而唔係 crash。改動細，但仍然要跑完 e2e 先知。
- 推薦：A（可以加埋 B 做防線）。

---

## ✅ 做得好嘅地方

- 跟上一份 review 推薦嘅方案 B，範圍準確：只供應 latin / latin-ext、照用 fontsource 嘅 `unicode-range` 同 `font-display: swap`，行為同 Google Fonts 一致（latin-ext 按需載入，probe 見到 unloaded 係正確）。
- 用 `/e2e/` 假前綴，唔會同真 gstatic 路徑混淆；未知路徑仍然 404，唔會放鬆離線保證。
- 記得加 `Access-Control-Allow-Origin`：字型係 CORS request，冇呢個 header 會被瀏覽器拒用而唔報錯——好容易漏。
- `checkPoppinsLoaded` 令「harness 真係有效」變成可驗證嘅斷言，唔係靠信。
- README / 註解清楚寫低 CJK 取捨同理由。

---

## 修正優先順序

| 優先 | ID    | 項目                                                  | 阻唔阻 merge |
| ---- | ----- | ----------------------------------------------------- | ------------ |
| 1    | S-577 | css2 Poppins 字重鎖 unit test（+ responder 防 crash） | 唔阻         |

---

## 修訂後代碼（S-577 方案 A + B，示意）

```js
// e2e/harness.mjs
/** css2 網址嘅 family=Poppins:wght@400;500;600 → [400, 500, 600]；冇 Poppins 就 []（export 畀 unit test / run.mjs 用） */
export const requestedPoppinsWeights = (url) => /* 同而家一樣 */;

const fontsCssResponder = (route) => {
    try {
        const body = requestedPoppinsWeights(route.request().url()).flatMap(poppinsFaces).join('\n');
        return route.fulfill({ status: 200, contentType: 'text/css', body });
    } catch (error) {
        // 唔好令成個 run crash：答 500，checkPoppinsLoaded 會 FAIL 並指返呢度
        console.error(`e2e 冇本機 Poppins 字重（index.html css2 網址改咗？）：${error.message}`);
        return route.fulfill({ status: 500, contentType: 'text/css', body: '' });
    }
};
```

```ts
// src/e2eSrcConstants.test.ts
it('should serve every Poppins weight index.html requests', async () => {
    const harness = await importE2E('harness.mjs');
    const css2 = [...indexHtml.matchAll(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/g)];
    const weights = css2.flatMap(([url]) =>
        harness.requestedPoppinsWeights(url.replaceAll('&amp;', '&')),
    );
    expect(weights.length).toBeGreaterThan(0);
    for (const w of weights) {
        expect(existsSync(`node_modules/@fontsource/poppins/${w}.css`)).toBe(true);
    }
});
```

---

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 99/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
  no_critical: pass
  security_scan: pass
next_action: merge_develop
next_agent: quality-assurance
branch: "claude/keen-pascal-5iifg0"
blockers: []
context: "Re-review of 860d3e1 (merge a936851). W-497 closed: probe on #/show/badgirl 320x640 shows header h1 computed Poppins 600, Poppins 400/500/600 latin faces loaded, latin-ext unloaded (unicode-range, correct), css2 + 3 gstatic /e2e/ woff2 all 200, no external requests; Poppins 224.4px vs Inter 219.7px for same string. Text-metric checks run after splash (>=2s) so swap is done; useFitText refits on font load. CJK fallback rationale sound (1em full-width advance in Noto and WenQuanYi; checks are horizontal). @fontsource/poppins 5.3.0 OFL-1.1, dev:true, integrity present, no deps, 2.8MB installed, not in dist. gstatic responder traversal-safe: anchored filename whitelist after URL normalisation; probes ../, %2F, %2e%2e, .woff, devanagari, 999 all 404. CI: npm ci lockfile in sync, harness import does no fs reads, build unaffected. S-576 closed. New S-577 (non-blocking): requestedPoppinsWeights only understands wght@n;n; unknown weight (450) or ital,wght@ syntax makes readFileSync throw inside the route handler and crashes the node process; 100..900 silently serves only 100; POPPINS_WEIGHTS hand-copied in run.mjs. Recommend unit test locking index.html Poppins weights to fontsource files + try/catch in fontsCssResponder. Gates: vitest e2eSrcConstants 9/9, tsc -b 0, lint 0, npm audit --omit=dev 0, npm audit 6 pre-existing (none from new pkg), full e2e 590 PASS / 0 FAIL (an earlier offline run under concurrent reviewer load had 1 unrelated arcSheet touch-timing flake: 'transform (冇表)' after fling, passed on rerun; Poppins-loaded and no-external-request checks passed in both). No version bump (same-session fix exception). Not pushed."
```
