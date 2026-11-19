# Code Review — 2026-11-17 — P10 lane 1：iPhone Duo 裝置 query、四邊邊框、闔上・橫行手機打橫版面

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`feature/layout/iphone-duo` HEAD `1423a08`（PR → `release/v2.0.0`），`git diff origin/release/v2.0.0...HEAD`（24 檔，+671 / −51）
- Tier：T3（`vite.config.ts` 加 `css.postcss`；`sw.js` / manifest / 更新邏輯冇改）；Design Origin：`mockup: _mockups_/iphone-duo/index.html`（v7）
- Review Item ID：**W-782、W-783**、**S-1115 – S-1121**（冇 C）
- 總評：**✅ pass（90 / 100）**。「現有裝置零改變」我搵唔到漏洞；但 Duo 範圍入面有 2 條三層收斂 🟡（今日節目播放掣被擠扁、打開・橫把手離邊 8px）。按專案 backlog 規則，W 同 🟢 應喺呢個 PR 內清再 re-review

## Hard Gates

all pass

- Lint / format：24 個改咗嘅檔 `npx eslint` exit 0（CSS 冇對應 config，只係 warning）、`npx prettier --check` 通過；Type：`apps/player` `npx tsc -b` exit 0
- Unit（diff 相關，自己跑）：`npm test -- postcssDuoLandscape.test.ts deviceQueries.node.test.ts landscapeBreakpoint.node.test.ts HomePage.test.tsx` → 4 files / 115 tests 全綠
- Coverage：v8 報唔到 `scripts/postcssDuoLandscape.ts` 嘅數字（試咗三種 `--coverage.include` 都冇列出），所以冇百分比；讀 code 對 test：plugin 三條分支（複製 / 唔啱 query / 已複製）都有 case，`layout.ts` 淨係常數
- 冇重跑、引用 developer 喺 `1423a08` 嘅結果：player unit 2784 passed；`npm run e2e` 944 PASS / 0 FAIL（log 有 19 行 Duo 斷言）；`npm run e2e:visual` 對 origin/main 180 / 180 一樣
- Security：冇新依賴（`package.json` / lockfile 冇改，`postcss` 本身已經喺度）；版本冇 bump，符合 plan（全部 lane 綠咗先 bump 2.0.0）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                   |
| -------- | ------ | ------- | -------------------------------------- |
| 正確性   | 15     | 25      | W-782、W-783                           |
| 安全性   | 20     | 20      |                                        |
| 可維護性 | 20     | 20      | 隔離做法清楚，CSS 條件同常數有鎖定測試 |
| 測試覆蓋 | 15     | 15      | 缺口記喺 S-1118、S-1119（🟢，唔扣分）  |
| 性能     | 10     | 10      | CSS 多咗 14 個複製區塊，gzip 後影響細  |
| 代碼風格 | 10     | 10      |                                        |
| **總分** | **90** | **100** |                                        |

**結果：✅ pass**

## 🟡 Warning

### W-782 Duo 闔上・橫 / Seated 今日節目：頭兩行嘅播放 / 暫停 icon 被擠到 7.6px 闊

- 位置：`apps/player/src/components/pages/today/TodayShowList/TodayShowList.module.css`（`.item` 行尾 svg 冇 `flex-shrink: 0`）；由 `Page.module.css:257` 嘅 46% 左欄觸發
- **L1**：`_mockups_/iphone-duo/index.html:550-551`「今日節目清單頭兩行嘅播放掣縮細咗，係臨時 CSS 嘅副作用；**正式版每個掣保持 44px**」
- **L2**：用現有 `dist`（e2e mode）開 `#/today`，量每行行尾 svg：612×426 同 612×438 → `7.6x22`、`8.5x22`、`22x22`；對照 667×375、640×360 三行都係 `22x22`。截圖同 mockup 嗰張「臨時 hack」圖一樣樣
- **L3**：左欄得 241px，節目名放唔落就開跑馬燈（內容闊由 165 變 272）。`.text` 同 svg 都係 `flex-shrink: 1`，按比例一齊縮：22 × 94 / 272 ≈ 7.6。現有手機打橫夠闊，冇開跑馬燈，所以冇事；`e2e/duo.mjs` 冇斷言呢樣
- 方案 A（推薦）：`TodayShowList.module.css` 尾加一個 `DUO_COVER_LANDSCAPE_QUERY` 區塊 `.item > svg { flex-shrink: 0; }`，`duo.mjs` 加「每行行尾 icon 22px」斷言。Trade-off：只喺 Duo 生效，跟 plan 嘅隔離做法，現有裝置一定唔變
- 方案 B：直接喺現有規則加 `flex-shrink: 0`。Trade-off：連現有裝置遇到長名開跑馬燈嘅潛在問題都修埋，但改咗現有規則，要靠 `e2e:visual` 180 張證明冇變，唔合 plan 嘅做法

### W-783 Duo 打開・橫：右邊緣把手離畫面邊 8px，平嗰邊凌空

- 位置：`ThemeScope.module.css:42-44`（`.scope` padding）對 `PlayerHandle.module.css:5-10`（`.handleScope { position: absolute; right: 0 }`，對住 `main`）
- **L1**：`PlayerHandle.module.css:1-4`「右邊緣把手」（`_mockups_/inner-page-handle`，右邊平、左邊圓角，貼住畫面邊）；plan `:63`「閂咗卡用現有 `HomePlayerHandle`」
- **L2**：876×612 播公子會 → 返主頁 → 撳「關閉播放器」，`[data-home-handle]` 右邊離畫面 **8px**；對照 1000×562 係 **0**。截圖見到把手右邊同畫面邊之間露出一條底色
- **L3**：把手對住 `main` 定位，`main` 俾 `.scope` 嘅 8px padding 推咗入去；mini player / 短提示有另外補，把手冇。內頁把手（`InnerPageHandle`）用同一個 `.handleScope`，同一個原因（今次只量咗主頁嗰個）。打開・橫係闊橫版，主頁同內頁（lane 3 / 4 之後都仲用）都會見到
- 方案 A（推薦）：`PlayerHandle.module.css` 加 `DUO_OPEN_LANDSCAPE_QUERY` 區塊 `.handleScope { right: calc(-1 * var(--duo-edge-inset)); }`，`duo.mjs` 加「把手貼右邊」斷言。Trade-off：最細改動；要確認冇俾 `main` / `.scope` 嘅 overflow 剪走
- 方案 B：Duo 入面把手改成四邊圓角嘅浮動款。Trade-off：係新設計，mockup 冇，要用戶確認

## 🟢 Suggestion / Observation

- **S-1115**（🟢，已重現）`scripts/postcssDuoLandscape.ts:26-33`：`alreadyCloned` 淨係睇下一個 node 係咪 Duo 闔上・橫 `@media`。橫版區塊後面緊接一個人手寫嘅 Duo 區塊（中間冇註解）就會當「已複製」，成份唔複製，冇任何提示。`Page.module.css:242-257` 而家全靠中間嗰段註解先冇事；lane 2 – 5 仲會喺檔尾加 Duo 區塊。建議連內容一齊比（`next.toString()` 同複製品一樣先算），加一個「後面緊接人手 Duo 區塊都照複製」嘅 test
- **S-1116**（Observation，要用戶確認）mini player 底離畫面 16px（四種有 mini player 嘅姿勢），闔上・直 / 打開・直左右 20px，短提示底 16px。同 mockup 嗰幾張「建議」圖逐 pixel 一致，但同 mockup `:468-469` 文字「四邊統一 24px…mini player 底補返一樣闊」同 plan `:74`「四邊 ≥ 24px」對唔上。圖同字邊個啱請 main agent 問用戶
- **S-1117**（🟢）全集表 / 資料表：闔上・橫同打開・橫嘅左欄表離左邊、底邊 8px（露出一條頁面底色，`dialog` l 8 / b 8），mockup `new-cl-drama.webp` 係貼邊；闔上・直 / 打開・直嘅底部表就貼邊（0）。兩種姿勢唔一致，建議定一個做法（lane 5 都會郁呢度）
- **S-1118**（🟢）`e2e/duo.mjs`：只驗主頁左 / 右 / 頂；冇驗底邊、直向姿勢嘅 mini player、內頁邊框、Seated 今日節目、把手、行尾掣大細（W-782 / W-783 就係咁漏咗）
- **S-1119**（🟢）`tests/mediaQuery.ts` 係成批測試（包括「現有裝置一句都唔 match」）嘅判斷基準，但自己冇 test，亦冇同真瀏覽器對過。建議加幾個 case（正方形當 portrait、唔識嘅 feature 會 throw），並喺 `duo.mjs` 用 Chromium `matchMedia` 對一次 `layout.ts` 嘅常數。另外 `tests/landscape.ts:17` 任何帶 `prefers-reduced-motion` 嘅 query（包括 `no-preference`）都當係「要求減少」，而家 JS 只用 `reduce` 所以冇事
- **S-1120**（🟢）`tests/landscape.ts:38-48` `stubLandscape` 仲係逐字比對，代表一個真實 viewport 唔會出現嘅狀態（橫版但又唔係手機打橫、又唔係闊橫版），10 個 test 用緊。建議之後改用 `stubViewport`
- **S-1121**（Observation，冇實機驗證）`DUO_OPEN_PORTRAIT_QUERY`（闊 600–640、高 860–900）有機會撞到 7–8 吋 Android 平板直放：憑記憶 Nexus 7 / Fire HD 8 嘅 CSS 尺寸約 600×960、601×962，扣咗狀態列同導覽列大約 600×890。Lane 1 只係多 8px 邊，lane 5 就會變 3 欄主頁。凍結清單冇 600 闊嘅平板；plan「已知風險」只講咗電腦視窗同鍵盤，建議話畀用戶知

## 對四個重點嘅睇法

1. **現有裝置**：搵唔到會變嘅路徑。合併 query 只係多咗一個闊 600–639 嘅分支，同 ≥ 640 唔重疊（639.5px 呢類小數闊度兩邊都唔 match，照舊直版）；`.scope` padding 同 `--duo-edge-inset` 全部喺 Duo `@media` 入面；build 出嚟嘅 CSS 有齊 14 份複製品，每份緊跟原本嗰份，現有區塊次序冇變；repo 本來冇 PostCSS config，inline config 冇蓋走任何嘢；dev server 一樣行 plugin，vitest 讀 source CSS 唔受影響。剩低嘅風險係 S-1121（範圍本身撞到真裝置）
2. **闔上・橫**：冇搵到仲假設闊 ≥ 640 嘅 JS。`WIDE_BANNER_QUERY` 四個用家（`<source media>`、`useHomeSide`、`usePageHandle`、`useLayoutMode`）喺呢個範圍都係 false，同手機打橫一致；主頁格、節目頁、劇集頁、今日節目指示點睇過截圖都啱。問題係內容擠迫（W-782）
3. **邊框做法**：`container-type: size` 配 border-box padding，`100cqh` 跟住細 16px，唱片公式照計；狀態列色帶照舊鋪滿。冇補到嘅係把手（W-783）同表（S-1117）
4. **測試**：`stubViewport` 照真實尺寸計係好改動，`HomePage.test.tsx` 唔使再估字串；缺口見 S-1118 – S-1120

## ✅ 做得好嘅地方

- 現有三個斷點、現有 CSS 規則一行都冇改；闔上・橫 / Seated 主頁、節目頁同 mockup 對得上，46% 左欄令今日節目卡置中
- CSS 入面每句裝置 query 都要同 `layout.ts` 常數一字不差，凍結清單 18 個 viewport 逐個驗唔 match

## 審閱期間做過嘅嘢（要知會）

- 用現有 `apps/player/dist` 起咗 4 次 `vite preview`（port 4391，冇 build、冇跑 `e2e` / `e2e:visual`）影 Duo 五種姿勢。有一次截圖誤寫入 `apps/player/shots/`，已經搬走，`git status` 乾淨。截圖喺 `/tmp/claude-0/-home-user-903-player/63eae08b-389e-5f65-bc2e-058343366bd1/scratchpad/review-lane1/shots/`

```handoff-receipt
protocol: 1
status: pass
score: 90/100
stage: T3
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/layout/iphone-duo"
context: "P10 lane 1 pass 90; merge target release/v2.0.0 (no develop); fix in this PR + re-review before merge: W-782 (today row play icon squashed to 7.6px at 612x426/612x438), W-783 (edge handle 8px off right edge at 876x612), S-1115, S-1117..S-1120; S-1116 (mini player bottom 16px vs mockup text 24px) and S-1121 (range may match 7-8in Android tablets) need user decision; e2e/visual cited from developer run on 1423a08, not re-run; QA S1 chain ui-foundation; report committed locally, NOT pushed (code CI running)"
```

---

## Re-review — 2026-11-18 — `f01f02e`

- 範圍：只驗上一輪 W-782、W-783、S-1115 – S-1120 嘅修正，同用戶決定（plan `a11f905`：S-1116 揀 B、S-1117 貼邊、S-1121 接受）；`git show f01f02e`（15 檔，+235 / −58）
- Hard gates：all pass（引用 developer 喺 `f01f02e` 嘅結果，冇重跑）：lint、tsc、`npm test` 4955 passed、`npm run e2e` 952 PASS / 0 FAIL、`npm run e2e:visual` 對 origin/main 180 / 180 一樣；新 Duo 斷言冇修正時係紅
- 自己做過：用現有 `apps/player/dist` 起 `vite preview`（port 4391）量 Duo 姿勢（腳本同截圖喺 scratchpad `rr/`），冇 build、冇改 code
- 結果：**⚠️ warn（85 / 100）**。上一輪全部處理咗，但修正本身帶出 3 條三層收斂 🟡（W-784 – W-786）；正確性 25 → 10，其他維度不變

### 逐條

| ID     | 結果              | 證據                                                                                                                                                                                                                                                                                                                                                             |
| ------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-782  | ✅                | `TodayShowList` 只喺 `DUO_COVER_LANDSCAPE_QUERY` 加 `flex-shrink: 0`；e2e 闔上・橫 / Seated 每行 icon 22px（冇修正時紅）                                                                                                                                                                                                                                         |
| W-783  | ⚠️ 主頁啱、內頁壞 | 主頁把手離邊 0（e2e）；同一條規則令內頁把手出咗畫面 8px → W-785                                                                                                                                                                                                                                                                                                  |
| S-1115 | ✅                | 比埋內容；新 unit test 鎖住「後面緊接人手 Duo 區塊照複製」。`dist` CSS：14 個原本區塊，13 個緊跟一模一樣嘅複製品，1 個（`Page.module.css` 手機打橫）嘅複製品俾 minifier 同人手 46% 區塊合併（54% 喺前、46% 喺後，效果啱）；冇重複複製                                                                                                                            |
| S-1116 | ✅（揀 B）        | mini player 左右底 24px（e2e 四種有 mini player 嘅姿勢）、短提示跟 token；但 token 改動有副作用 → W-786                                                                                                                                                                                                                                                          |
| S-1117 | ⚠️ 部分           | 全集表左 / 底 0（e2e 兩個打橫姿勢）；資料表淨係補咗底，闔上・橫右邊仲離畫面 8px → W-784                                                                                                                                                                                                                                                                          |
| S-1118 | ✅                | e2e 加咗 mini player 底、今日節目 icon、主頁把手、全集表；冇驗嘅位（內頁把手、資料表、主頁底）就係 W-784 – W-786 漏網嘅地方                                                                                                                                                                                                                                      |
| S-1119 | ✅                | `testMediaQuery.node.test.ts` 鎖住邊界、正方形、逗號 / and、唔識寫法 throw；減少動態改為兩句完整字串比對，`no-preference` 同 `reduce` 相反，其他寫法交 `matchesQuery` throw（`motion.ts` 只用 `(prefers-reduced-motion: reduce)`）。冇加 Chromium `matchMedia` 對照，但 Duo e2e 喺真 viewport 見到版面變、`e2e:visual` 180 張證明現有裝置唔中，可以接受          |
| S-1120 | ✅                | `stubLandscape` = 844×390。被測 component 讀嘅 query：`LANDSCAPE_LAYOUT_QUERY`（新舊都 true）、`WIDE_BANNER_QUERY`（新舊都 false），淨係 `TodayPage` 嘅 `SHORT_LANDSCAPE_LAYOUT_QUERY` 由 false 變 true（指示點搬上頁頭），嗰個 test 冇斷言指示點位置，名講嘅「頁頭喺節目表上面、日子同位置喺卡下面」照樣成立。10 個 test 依然驗緊佢哋講嘅嘢，而且而家係真實狀態 |
| S-1121 | ✅                | plan「已知風險」已記錄用戶接受                                                                                                                                                                                                                                                                                                                                   |

### `.locked { overflow: visible }`（Duo 打橫）有冇其他嘢溢出

- 主頁、今日節目、節目頁、三個劇集頁 × 612×426 / 612×438 / 876×612：沿四邊邊框（離邊 3px）每 12px `elementFromPoint`，屬於 `main` 嘅只有全集表 overlay（本來就要貼邊），其他全部係 `.scope` 底色
- 打開資料表之後 `scrollingElement`、`#root`、`main` 嘅 `scrollTop` 都係 0；表本身 `.docked { overflow: clip }` 照舊，唔會撐大捲動範圍
- 剩低：卡疊 swipe、頁面過場呢類動態期間會多見 8px（之後俾 `#root` 剪），我冇逐格驗，唔列做問題

### 🟡 W-784 Duo 闔上・橫：資料表右邊離畫面 8px，同手機打橫唔一致

- 位置：`ItemInfoSheet.module.css:177-183`（Duo 區塊淨係改 `bottom`）
- 同 QA S1 嘅 **CUI-0025**（`5de5659`）係同一個問題，修一次、兩個 ID 一齊關；我交報告時 working tree 已經有未 commit 嘅修正（`right: -8px`，兩個打橫姿勢都套），打開・橫右邊會變 30，同現有闊橫版嘅把手預留位一樣，可以接受
- **L1**：plan `:15` 用戶決定「打橫嘅全集表 / 資料表：伸出邊框貼畫面邊」
- **L2**：`#/show/gongzi` 自動彈資料表：612×426 `dialog` 右 8 / 底 0；844×390 右 0 / 底 0（截圖 `rr/info-cover.png` 對 `rr/info-phone.png`，見到右邊一條底色）
- **L3**：闔上・橫行手機打橫版面，右欄右邊就係 `main` 右邊（冇把手預留位），所以要補右邊；打開・橫右欄有把手預留位（右 38 = 30 + 8），同現有闊橫版一樣唔貼邊，唔使改
- 方案 A（推薦）：另加 `DUO_COVER_LANDSCAPE_QUERY` 區塊 `.docked { right: calc(-1 * var(--duo-edge-inset)); }`，`duo.mjs` 加資料表右 / 底 0 斷言。Trade-off：多一個區塊，但同手機打橫完全一致
- 方案 B：問用戶右邊留 8px 得唔得。Trade-off：唔使改 code，但同決定字面唔一致

### 🟡 W-785 Duo 打開・橫：內頁把手出咗畫面 8px，「播放中」字俾剪走

- 位置：`PlayerHandle.module.css:91-99`（`.handleScope { right: -8px }` 對所有把手生效）
- **L1**：`PlayerHandle.module.css:1-4`「右邊緣把手」貼住畫面邊；呢段修正自己嘅註解「把手要貼返畫面右邊」
- **L2**：876×612 播公子會之後去 `#/show/sunnyday`、`#/drama/lancy`、`#/today`：`[data-page-handle]` 右邊 = **−8**（26px 闊得 18px 喺畫面入面），截圖 `rr/handle-showsunnyday.png` 見到「播放中」直字俾切；1180×820 係 0
- **L3**：內頁 `main` 係 `position: static`，`.handleScope` 嘅 containing block 係 `.scope`（`position: relative`），絕對定位對住佢嘅 padding box，`right: 0` 本身已經貼畫面邊；主頁 `main.wide` 係 `position: relative`，先會差 8px。上一輪 W-783 L3 話「內頁同一個原因」係我估錯，冇量
- 方案 A（推薦）：Duo 規則只套主頁把手（`PlayerHandle` 按 `variant` 加 class，或者 `.handleScope:has(> [data-home-handle])`），`duo.mjs` 加內頁把手右 0 斷言。Trade-off：改動細，兩種把手都貼邊
- 方案 B：Duo 打開・橫 `main.wide` 改 `position: static`，令兩種把手同一個 containing block。Trade-off：要再核對主頁其他絕對定位嘅嘢（播放卡過場），範圍大

### 🟡 W-786 Duo：主頁內容底多咗 8px，打開・橫播放卡底 32px（頂 / 右 24px）

- 位置：`tokens.css:747-749`（`--mini-player-offset-bottom` 改咗）；用家 `HomePage.module.css:19`（`main.home`）、`:51`（`main.wide`）
- **L1**：`_mockups_/iphone-duo/index.html:468-469`「Duo 四邊統一 24px…播放卡底同 mini player 底補返一樣闊」
- **L2**：876×612 主頁：播放卡頂 24、右 24、底 **32**；喺同一頁將 token 改返 `1423a08` 嘅寫法即刻變返 24。冇 mini player 時嘅主頁格底都係 32（24 + `.scope` 8）
- **L3**：token 原本係「離畫面底」嘅數，mini player / 短提示（`position: fixed`）用啱；但 `main` 已經俾 `.scope` 推入 8px，再用同一個 token 做 padding 就重複計。有 mini player 時格同 mini player 嘅距離冇變（兩邊一齊加 8）
- 方案 A（推薦）：Duo 區塊入面 `main.home`（冇 mini player）同 `main.wide` 嘅 `padding-bottom` 扣返 `--duo-edge-inset`（或者加一個「main 入面用」嘅 token），`duo.mjs` 加播放卡底 24 斷言。Trade-off：多一個 Duo 區塊，mini player 位置唔郁
- 方案 B：token 改返原本，mini player / 短提示喺自己嘅 Duo 區塊加 8px。Trade-off：要同時改有 mini player 時嘅主頁留位，改動面大啲

### 評分（re-review）

| 維度     | 得分   | 滿分    | 備注                |
| -------- | ------ | ------- | ------------------- |
| 正確性   | 10     | 25      | W-784、W-785、W-786 |
| 安全性   | 20     | 20      |                     |
| 可維護性 | 20     | 20      |                     |
| 測試覆蓋 | 15     | 15      |                     |
| 性能     | 10     | 10      |                     |
| 代碼風格 | 10     | 10      |                     |
| **總分** | **85** | **100** |                     |

**結果：⚠️ warn**：三條都係 Duo 範圍、現有裝置唔受影響（`e2e:visual` 180 / 180），喺呢個 PR 修完再 re-review（只驗 W-784 – W-786）

```handoff-receipt
protocol: 1
status: warn
score: 85/100
stage: T3
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: invoke_developer
next_agent: frontend-developer
branch: "feature/layout/iphone-duo"
context: "P10 lane 1 re-review of f01f02e: W-782, S-1115, S-1116, S-1118..S-1121 resolved; W-783 home handle fixed but rule also moves inner-page handle 8px off-screen (W-785, 876x612 show/drama/today right=-8); S-1117 info sheet still 8px off right at 612x426 (W-784); --mini-player-offset-bottom change double-counts .scope inset in main.home/main.wide padding, open-landscape card bottom 32 vs 24 (W-786). Fix in this PR + re-review W-784..W-786 only; gates cited from developer run on f01f02e; report committed locally, NOT pushed (code CI running)"
```

## Re-review 2（2026-11-18，`ffccc59` `19da287` `d796cf3`；只驗 W-784 – W-786）

- Tier：T3（Duo 範圍 CSS + lock test + e2e）；Hard gates：all pass（`npm test` 4956 passed + lint 喺 `d796cf3`；`npm run e2e` 966 PASS / 0 FAIL、`e2e:visual` 對 `origin/main` 180 / 180 喺 `19da287`，`d796cf3` 淨改 node test；log 由 developer 提供，我核對過內容）；我只重跑 `homeBottomSpace.node.test.ts`：8 passed
- `19da287` push 時 lock test 紅、`d796cf3` 修返；以最終狀態判斷

| ID               | 狀態        | 證據                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-784 / CUI-0025 | ✅ resolved | `ItemInfoSheet.module.css` Duo 打橫區塊加 `right: -inset`；e2e：闔上・橫 / Seated 資料表右 0 底 0，打開・橫右 30（= 把手預留位，同上輪接受嘅一樣）底 0                                                                                                                                                                                             |
| W-785            | ✅ resolved | `.handleScope:has([data-home-handle])`：`data-home-handle` 由 `PlayerHandle.tsx` 按 `variant` 常設喺 `.handleScope` 入面嘅 button（唔係只喺過場先有），內頁把手冇呢個 attribute；`:has()` app 已經用咗 17 處（例如 `Toast.module.css:26`），目標 iOS Safari 支援；e2e：打開・橫內頁把手離邊 0、主頁把手照舊 0（W-783 冇回歸）                      |
| W-786            | ✅ resolved | `HomePage.module.css` Duo 區塊 media 字串同 `tokens.css` `--duo-edge-inset` 定義嗰段一樣，非 Duo 唔會命中（`e2e:visual` 180 / 180 佐證）；三條 selector / 次序同 base 一樣，cascade 唔變；e2e：打開・橫播放卡底 24、四姿勢內容底到 mini player 12、短提示 24。Lock test 只放行 `[DUO_QUERY]`（完全相等）兼斷言三個值，原意「唔准按方向改規則」保留 |

- 冇新 🔴 / 🟡；冇新 🟢（re-review 唔再搵）

### 評分（re-review 2）

| 維度     | 得分    | 滿分    | 備注                |
| -------- | ------- | ------- | ------------------- |
| 正確性   | 25      | 25      | W-784 – W-786 已修  |
| 安全性   | 20      | 20      |                     |
| 可維護性 | 20      | 20      |                     |
| 測試覆蓋 | 15      | 15      | 每條修正有 e2e 斷言 |
| 性能     | 10      | 10      |                     |
| 代碼風格 | 10      | 10      |                     |
| **總分** | **100** | **100** |                     |

**結果：✅ pass**

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T3
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: proceed_to_qa
next_agent: quality-assurance
branch: "feature/layout/iphone-duo"
context: "P10 lane 1 re-review 2 of ffccc59/19da287/d796cf3: W-784 (=CUI-0025), W-785, W-786 resolved, no new findings. Gates cited from developer runs (unit+lint on d796cf3; e2e 966/0 and e2e:visual 180/180 on 19da287, d796cf3 node-test only). Report committed locally, NOT pushed"
```
