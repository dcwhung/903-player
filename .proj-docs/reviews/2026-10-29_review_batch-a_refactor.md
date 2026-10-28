# Code Review — 2026-10-29 — Batch A 純 refactor（S-543 共用擋拖、S-486 bannerEdges 命名、S-509 stripInputHandlers、S-511 TodayView Pick）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/keen-pascal-5iifg0`（head `953f501`）對 `5f018cc`（= `origin/main`，PR #138 merge）
- Commits：
    - `f623f4d` refactor(gesture)：共用「唔畀拖圖片」CSS class + dragstart handler（S-543）
    - `bc59443` refactor(banner)：`bannerEdges.ts` 縮寫改全寫（S-486）
    - `ff73ca9` refactor(date-strip)：`useStripInput` → `stripInputHandlers`（S-509）
    - `953f501` refactor(today)：`TodayPlayerColumn` props 用 `Pick<TodayView>` 收窄（S-511）
- Item 來源：S-486 → `2026-10-26_review_v1.10.0_batch.md`；S-509、S-511 → `2026-10-27_review_size-limits_batch.md`；S-543 → `2026-10-28_review_v1.20.3.md`
- Design Origin：見下面「Design-Source Binding」— `.tsx` 有加 className，PR description 要有 `Design Origin: baseline: …` 一行（建議寫法已列出）
- Review Item ID：現有最高 W-484（`ff0bf49`）、S-546（`85e9525`），今次由 **W-485**、**S-547** 開始（用到 S-547、S-548；冇 W）
- 總評：hard gates 全部 pass，冇 🔴 Critical，冇 🟡 Warning，2 個 🟢 Suggestion（都係 follow-up，唔阻 merge）。
    - **S-543 行為等價經 reviewer 自己 build 證實**：兩邊各自喺 scratchpad `git archive` 出嚟 `npm run build`，dist CSS 將 hash 正規化之後 diff，唯一分別係 `-webkit-user-drag: none` 由 `.art` / `.stack img` 搬去 `.noImageDrag, .noImageDragWithin img`（lightningcss 仲將兩條合成一條），每個元素生效嘅宣告一樣，specificity 一樣，兩邊都冇 build warning。
    - **唔用 `composes:` 嘅理由經 reviewer 重現**：喺 copy 改返 `composes:` 再 build，確實出 PostCSS「did not pass the `from` option」警告，而且 dist 有兩份一模一樣嘅規則。改用多加一個 className 係合理偏離，而且符合用戶批准嘅「shared CSS class + shared JS handler」。
    - S-486 / S-509 / S-511 全部係純改名 / 收窄型別，逐行核對冇邏輯改動；S-511 補返原建議漏咗嘅 `start`，啱。
    - 7 個 mutation 全部令相關測試 fail（見下表）。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                                                            |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint .` exit 0。`npx prettier --check .` exit 1，但 22 個 warn **全部**喺 `.claude/worktrees/agent-*/`（其他 agent 嘅 worktree，`.git/info/exclude` 已排除，唔係 repo 內容）；今次 diff 16 個檔 `prettier --check` 全部 pass                                             |
| Type check    | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                                                                                                                             |
| Tests         | ✅ pass | `npx vitest run src/components/ShowCardStack src/components/DramaShelf src/components/PlayerPanel src/components/DateStrip src/components/HomeLandscapeGrid src/pages src/utils src/styles scripts`：540 個 test 全綠（冇跑 full suite；冇跑 e2e，port 4173 由其他 agent 用緊） |
| Coverage      | ✅ pass | 新 code（`preventDragStart`、兩個 gesture class、兩處 className）全部有測試，而且 mutation 證實會 fail；S-486 / S-509 / S-511 冇新分支，原有 `bannerEdges` / `DateStrip` / `TodayPage` 測試照覆蓋                                                                               |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                                                          |
| Security scan | ✅ n/a  | 冇新增 / 升級依賴（`package.json` / lockfile 冇改）                                                                                                                                                                                                                             |

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                  |
| -------- | ------ | ------- | ----------------------------------------------------- |
| 正確性   | 24     | 25      | S-548（舊有缺口，唔係今次引入）                       |
| 安全性   | 20     | 20      |                                                       |
| 可維護性 | 19     | 20      | S-547                                                 |
| 測試覆蓋 | 15     | 15      | 新測試 + mutation 全部有效                            |
| 性能     | 10     | 10      | dist CSS 仲少咗一條規則；handler 由 inline 變模組常數 |
| 代碼風格 | 10     | 10      | ESLint / Prettier（diff 範圍）全過                    |
| **總分** | **98** | **100** |                                                       |

**結果：✅ pass**（≥ 90、冇 Critical、hard gates 全 pass）

| Commit    | Item  | 分數 | Status  |
| --------- | ----- | ---- | ------- |
| `f623f4d` | S-543 | 98   | ✅ pass |
| `bc59443` | S-486 | 100  | ✅ pass |
| `ff73ca9` | S-509 | 100  | ✅ pass |
| `953f501` | S-511 | 100  | ✅ pass |

---

## 重點驗證

| 項目                                           | 結論          | 證據                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-543 dist CSS 等價（reviewer 自己 build）     | ✅            | `5f018cc` / `953f501` 各自 `git archive` 去 scratchpad（symlink `node_modules`）跑 `npm run build`，兩邊 exit 0、log 冇 `warn`。正規化 hash 後 diff 只有三行：before `.art{…;-webkit-user-drag:none;…}` + `.stack img{-webkit-user-drag:none}`；after `.art{…}`（少咗 user-drag，其餘宣告一字不差）+ `.noImageDrag,.noImageDragWithin img{-webkit-user-drag:none}`。bundle JS 入面 `DramaTile` 係 `` `${xm.art} ${Sm.noImageDrag}` ``、`ShowCardStack` 係 `` `${fv.stack} ${Sm.noImageDragWithin}` ``，class 真係有落到元素 |
| Specificity / 次序                             | ✅ 冇改變     | `.art`（0,1,0）→ `.noImageDrag`（0,1,0）；`.stack img`（0,1,1）→ `.noImageDragWithin img`（0,1,1）。成個 `src/` 冇其他 `-webkit-user-drag` 宣告（`grep` 證實），所以新規則喺 bundle 入面排喺邊都唔會被蓋，次序變咗都唔影響。`-webkit-user-drag` 唔繼承，`.noImageDragWithin` 加喺同一個 `.stack` 元素上，涵蓋嘅 `img` 範圍同之前一樣。`styles.stack` 全 repo 只有 `ShowCardStack.tsx` 一處用，冇其他元素會因為冇加新 class 而失咗規則                                                                                       |
| `composes:` vs 多加 className                  | ✅ 合理       | Reviewer 喺 copy 將兩處改返 `composes: noImageDrag(Within) from '../../styles/gesture.module.css'` 再 `vite build`：出 PostCSS「A PostCSS plugin did not pass the `from` option…」警告，dist 有兩條一模一樣嘅 `._noImageDrag…,._noImageDragWithin… img{…}`。開發者講法屬實。多加 className 嘅代價只係 `.tsx` 多一個 import + template string，好處係零重複、零警告，而且 `toHaveClass` 可以直接鎖住有冇加。`gesture.module.css` header 註解有寫低唔用 `composes` 嘅原因，之後嘅人唔會「改返」                               |
| S-543 JS handler                               | ✅            | `preventDragStart` 簽名 `(event: DragEvent<HTMLElement>) => void`，同兩處原本 inline 寫法一樣（原本隱含回傳 `undefined`，React 唔睇回傳值）。由 render 內 inline arrow 變模組常數，identity 穩定，冇 deps 問題                                                                                                                                                                                                                                                                                                              |
| S-543 範圍                                     | ✅            | 只搬 `-webkit-user-drag`；`.art` 嘅 `-webkit-touch-callout` / `user-select` 照留，`DramaTile` 嘅 `draggable={false}` 照留 — 純 refactor 唔加新行為，啱。原 S-543 方案 A 提過嘅「三屬性一齊共用」同 `ShowCardStack` 冇 callout，屬行為改動，見 S-548                                                                                                                                                                                                                                                                         |
| S-486 bannerEdges                              | ✅            | `w`/`h` → `width`/`height`（`readBannerEdges` 解構 + `edgesOf` 參數）、`seg` → `segment`、`RGBA` → `BYTES_PER_PIXEL`。`side` 用 shorthand `height`（= 圖高，之前 `height: h`）；`edge` 係 `{ width, height: TOP_BOTTOM_ROWS }`，同之前一樣。冇 shadowing（`segmentAverages` 入面嘅 `width` / `height` 係另一個 scope 嘅 band 尺寸，同之前一樣）                                                                                                                                                                             |
| S-509 stripInputHandlers                       | ✅            | 函數體一字不改，只改名 + 重排參數換行；JSDoc 補咗「純 handler 工廠，入面冇 hook / state」。全 repo 冇其他 `useStripInput` 引用                                                                                                                                                                                                                                                                                                                                                                                              |
| S-511 Pick                                     | ✅            | Pick 9 個欄位同 `TodayPlayerColumn` 解構嘅 9 個**完全一致**（`start` 有用：`art={start ? undefined : theme.art}`、`onStart`、`standby`），原建議漏咗 `start`，開發者補返並喺 commit body 寫明。`TodayView` 匯出位置喺 hook 下面，同 `SeriesDramaView` 做法一致。`TodayPage` 傳成個 hook 結果，structural typing 照過（`tsc -b` exit 0）                                                                                                                                                                                     |
| Mutation（reviewer，scratchpad copy）          | ✅ 7 / 7      | M1 拎走 `ShowCardStack` 嘅 `noImageDragWithin` → 1 fail；M2 拎走 `DramaTile` 嘅 `noImageDrag` → 1 fail；M3 `preventDragStart` 唔 `preventDefault` → 3 fail（`dragStart.test`、`ShowCardStack` 新測試、`PlayerPanel` 捽碟）；M4 `useCardDrag` 冇 `onDragStart` → 1 fail；M5 `useDiscScrub` 冇 `onDragStart` → 1 fail；M6 刪 `.noImageDragWithin img` 宣告 → 1 fail；M7 刪 `.noImageDrag` 宣告 → 1 fail                                                                                                                       |
| 測試改寫（`scripts/dramaShelfArtCss.test.ts`） | ✅            | 由自寫 regex 改用 `tests/cssRule.ts` 嘅 `cssDeclarations`（postcss parse），同其他 CSS node test 一致；分開鎖 `.noImageDrag`、`.noImageDragWithin img`、`.art` callout。「`DramaTile` 有冇加 class」交由 `DramaShelf.test.tsx` 鎖（vitest `classNameStrategy: 'non-scoped'`，所以 `toHaveClass('noImageDrag')` 有效）                                                                                                                                                                                                       |
| Version                                        | ⚪ 待 release | 4 個 commit 冇 bump（仍係 1.20.3）。同 `2026-10-27_review_size-limits_batch.md` 先例一樣：batch 喺 release 時統一 bump，純 refactor → PATCH `1.20.3 → 1.20.4`。**release commit 必須記得 bump**，唔當 Warning                                                                                                                                                                                                                                                                                                               |
| TDD                                            | ⚪ n/a        | 純 refactor：行為唔變，新測試鎖住搬咗去邊（class / 共用 handler），mutation 證明有效                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Mutation 同 `composes:` 重現全部喺 repo 外 scratchpad copy（`git archive`）做，冇改 repo source，冇 build 落 repo 嘅 `dist/`。

## Design-Source Binding

`ShowCardStack.tsx`、`DramaTile.tsx` 有新 className（`gesture.noImageDragWithin`、`gesture.noImageDrag`），所以**唔可以**寫 `none-required`。冇新 layout、冇視覺改變（dist CSS 每個元素生效宣告一樣），正確 origin 係 baseline。PR description 第一行建議：

```
Design Origin: baseline: main@5f018cc（只加 gesture.module.css 共用 class 取代 .art / .stack img 嘅 -webkit-user-drag；dist CSS 每個元素生效宣告一致，冇視覺改變）
```

開 PR 時冇呢行 = 🔴 Critical（Design Fidelity 規則），main agent 開 PR 時要加。

Design Fidelity 其他項：冇 hardcoded 色 / 字體 / SVG；冇 rename 現有 className；冇新 component folder；naming 冇縮寫（`noImageDrag`、`noImageDragWithin`、`preventDragStart`、`BYTES_PER_PIXEL`）。

---

## 問題清單

### 🔴 Critical

冇。

### 🟡 Warning

冇。

### 🟢 Suggestion

#### S-547 — 「幾時用邊樣」未寫低：三處依然係三種組合

- 位置：`src/styles/gesture.module.css` header 註解；`src/utils/dragStart.ts` JSDoc
- 描述：今次將零件統一咗（一個 class 對、一個 handler），但組合仍然各有不同：`DramaTile` = `draggable={false}` + `noImageDrag`（冇 JS）；`ShowCardStack` = `noImageDragWithin` + `preventDragStart`；`PlayerPanel` 捽碟（例如橫版固定版面、唔喺卡疊入面嗰陣）= 只有 `preventDragStart`。每種都有理由，但新加可以拖 / 捽嘅元件時，讀者要自己推「我應該揀邊個組合」，S-543 想解決嘅「每次重新發現一次」只解決咗一半。`gesture.module.css` header 寫「滑鼠拖卡 / 捽碟時……要靠 -webkit-user-drag 擋」，但捽碟喺卡疊以外其實冇加 class，句子同現狀有少少出入
- 方案 A：喺 `gesture.module.css` header 加三行「用法」：手勢容器（有 pointer 手勢）→ `onDragStart={preventDragStart}` + `noImageDragWithin`；單張可撳圖片（冇 JS 手勢）→ `draggable={false}` + `noImageDrag`；並更正「捽碟」嗰句。代價：純註解，幾分鐘
- 方案 B：再抽一個 `gestureSurfaceProps`（`{ className, onDragStart }`）畀手勢容器 spread。代價：多一層抽象，而 `useCardDrag` / `useDiscScrub` 已經各自回傳 handler 物件，夾埋會複雜
- 推薦：**A**

#### S-548 — `ShowCardStack` 卡入面圖片冇 `-webkit-touch-callout: none`（舊有缺口）

- 位置：`src/components/ShowCardStack/ShowCardStack.module.css` `.stack`（有 `user-select: none`，冇 callout）
- 描述：原 S-543 描述已經提過：`DramaShelf .art` 同 `MiniPlayer` 都有 `-webkit-touch-callout: none`，卡疊冇。卡疊有長按手勢，iOS 長按卡入面嘅節目圖 / 唱片有機會彈圖片選單。今次係純 refactor，正確地冇郁，但缺口仍在
- 方案 A：喺 `gesture.module.css` 加 `.noImageCalloutWithin img { -webkit-touch-callout: none }`（或者直接併入 `noImageDragWithin`，改名做 `noImageGrabWithin` 之類），`ShowCardStack` 用；配 CSS node test。代價：屬行為改動，要開 fix ticket，iPhone 真機長按驗證
- 方案 B：直接喺 `.stack` 加 `-webkit-touch-callout: none`（會繼承落所有子元素）。代價：範圍大過「圖片」，要確認卡入面冇需要原生 callout 嘅連結
- 推薦：**A**（另開 ticket，先真機確認有冇彈選單）

---

## ✅ 做得好嘅地方

- **偏離計劃有證據**：唔用 `composes:` 唔係憑感覺，有 before / after build log 同 dist 比對，而且原因寫咗喺 commit body 同 CSS header，reviewer 照做一次結果一樣。
- **純 refactor 守得住範圍**：S-543 只搬 `-webkit-user-drag`，冇順手加 callout / user-select；`draggable={false}` 照留。
- **測試換咗工具仲加強咗**：`dramaShelfArtCss.test.ts` 改用 postcss parse（`cssDeclarations`），唔再靠 regex；「CSS 有冇宣告」同「元件有冇加 class」分兩層鎖，mutation 7 / 7 中。
- **S-511 冇盲跟建議**：發現原建議清單漏咗 `start`，補返並喺 commit body 寫明。
- **一個 item 一個 commit**，commit body 交代改咩同點解。

## 修正優先順序

| 優先 | ID    | 工作量 | 說明                                                                  |
| ---- | ----- | ------ | --------------------------------------------------------------------- |
| 1    | S-547 | 細     | `gesture.module.css` header 寫低三種組合嘅用法，更正「捽碟」句        |
| 2    | S-548 | 中     | 卡疊圖片加 `-webkit-touch-callout: none`（另開 fix ticket，真機驗證） |

## 修訂後代碼（S-547 方案 A 示意，未套用）

```css
/*
 * 共用手勢樣式：組件 import 呢個 module，將 class 同自己嘅 class 一齊加落元素。
 * 唔用 CSS Modules 嘅 composes：Vite build 會喺每個 composes 嘅檔各抄一份規則，仲會出 PostCSS 警告。
 * Safari 唔理 <img draggable="false">，滑鼠拖圖片會變成原生拖放，要靠 -webkit-user-drag 擋。
 *
 * 用法（S-547）：
 * - 有 pointer 手勢嘅容器（卡疊、捽碟）：onDragStart={preventDragStart}（src/utils/dragStart.ts）
 *   + 容器加 noImageDragWithin
 * - 冇 JS 手勢、但會被滑鼠捽過嘅單張圖片（書架劇集格）：<img draggable={false}> + noImageDrag
 */
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 98/100
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
context: "Batch A pure refactor pass 98 (f623f4d S-543, bc59443 S-486, ff73ca9 S-509, 953f501 S-511). Reviewer rebuilt 5f018cc and 953f501 in scratchpad: normalized dist CSS diff = -webkit-user-drag moved from .art / .stack img to merged .noImageDrag,.noImageDragWithin img; same specificity (0,1,0)/(0,1,1), no other user-drag rules, no build warnings; bundle JS applies the classes. composes: reproduced -> PostCSS 'from option' warning + duplicated rule, so extra-className deviation is justified. 7/7 mutations fail tests. S-486/S-509/S-511 pure renames / type narrowing; Pick fields match destructuring exactly (start included). prettier --check . warnings all in .claude/worktrees (excluded), diff files clean. No version bump: release commit must bump 1.20.3 -> 1.20.4 (PATCH). PR description first line must be 'Design Origin: baseline: main@5f018cc (...)' (className added in .tsx; none-required not allowed). S-547: document which gesture combo to use in gesture.module.css header. S-548: ShowCardStack images lack -webkit-touch-callout (pre-existing; separate fix ticket + iPhone check). QA: no visual change expected; mouse-drag card stack / drama shelf / disc scrub smoke, Safari drag if available."
```
