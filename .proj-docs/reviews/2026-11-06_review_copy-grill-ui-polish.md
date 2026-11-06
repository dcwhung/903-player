# Code Review — 2026-11-06 — 文案 grill + UI 執位（v1.28.1）

- 審閱者：Code Reviewer（獨立，worktree `.claude/worktrees/review-polish`）
- 目標：`fix/ui/copy-grill-and-polish` @ `d3671e7`（base `origin/main` `d034254`）：`19d163b` fix(copy)、`d3671e7` fix(ui)
- SSoT：用戶 2026-11-06 確認嘅文案決定（B1、B2、C4、D4、S-716 / S-717 / S-718、全域日子 / 空格規則）；UI 執位 baseline = 用戶 production 截圖
- Design Origin：`baseline: current production screens (user screenshots)`（commit message 有；未開 PR，開 PR 時要放 description 第一行）
- Tier：T1（PATCH，文案 + CSS + 一處 render 改動）
- 總評：文案決定逐條落實，字典已經冇寫死「 · 」；UI 改動細而清楚。**但同一個 SHA 嘅 CI e2e 紅咗 1 項（W-539）**，係 D4 改字直接引致，未處理之前唔可以 merge

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                        |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | pass    | 改動檔 `eslint` 0 error（CSS 檔冇 config 嘅 warning 照舊）、`prettier --check` 全過；CI `npm run lint` ✅                                   |
| Type check    | pass    | `npx tsc -b` exit 0                                                                                                                         |
| Unit（相關）  | pass    | `npx vitest related --run <diff 入面 src 檔>` 1759 / 1759 passed（冇跑 full suite / e2e）；CI `npm test` ✅                                 |
| CI（同 SHA）  | ❌ fail | [run 42197672919](https://github.com/dcwhung/903-player/actions/runs/42197672919) @ `d3671e7`：lint / unit / build ✅，**E2E 1 check fail** |
| Coverage      | pass    | 新邏輯（`t()` 預設 sep、`liveStatus`、`onCommit`、`RemoveHintProvider`、C4 label）都有 unit / node test                                     |
| No Critical   | pass    | 0 個 🔴                                                                                                                                     |
| Security scan | n/a     | 冇新依賴                                                                                                                                    |

## 評分結果

| 維度     | 得分   | 滿分    | 備注  |
| -------- | ------ | ------- | ----- |
| 正確性   | 20     | 25      | W-539 |
| 安全性   | 20     | 20      |       |
| 可維護性 | 20     | 20      |       |
| 測試覆蓋 | 15     | 15      |       |
| 性能     | 10     | 10      |       |
| 代碼風格 | 10     | 10      |       |
| **總分** | **95** | **100** |       |

**結果：❌ fail**（分數夠，但同 SHA CI 紅 = hard gate fail）

## 決定逐條核對

| 代號         | 結果 | 覆核                                                                                                                                                                                                                                              |
| ------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1           | ✅   | `useRowSwipe(onRemove, onCommit)`：左滑過四成 / Delete / Backspace 都經 `remove()`，決定嗰刻叫 `showToast(t('bookmark.removed'))`；冇復原。`removeBookmark` 本身唔出 Toast，冇重複。HomeSaved test 有左滑 + Backspace                             |
| B2           | ✅   | 字「向左滑動或者撳刪除鍵移除收藏」；`aria-keyshortcuts="Delete Backspace"`；冇 `title`；`RemoveHintProvider` 一粒 `.srOnly` span + 每行 `aria-describedby`；已下架行同一粒掣，都有描述                                                            |
| C4           | ✅   | `bookmarkLabel`：「收藏 {節目名} 06/11 星期五」（`formatSpokenDate`）；節目頁 / 劇集清單嘅 ☆ 冇改                                                                                                                                                 |
| D4           | ✅   | `tileNewArc`「全新短篇 {when}」、讀屏 `tileNextArcSpoken` 同字；`tileNextEpisodesSpoken`「全新集數 …」；`leavingEpisodes`「部分集數」冇變；`drama.newArc`「有新上架短篇」                                                                         |
| S-716        | ✅   | `seriesSpokenName '{title}，{arc}'`，`useSavedView` 行讀屏名用佢；畫面 heading 照用 arc                                                                                                                                                           |
| S-717 / 718  | ✅   | 字典只剩 `common.separator` 有「·」（`zhHKCopy.test.ts` 鎖住）；`t()` 預設 `{sep}`；讀屏路徑（`arcLabels.rowLabel`、`EpisodeRow.rowLabel`、tile 繼續收聽、最近收聽）傳 `common.spokenSeparator`；`episodes.playing` 由 `common.status.playing` 砌 |
| 全域日子空格 | ✅   | 新字串冇違反（「06/11 星期五」、「全新短篇 02/12 上架」）                                                                                                                                                                                         |
| UI 1a / 1b   | ✅   | 最近收聽 / 收藏碟改 `Disc size="small"` + `--disc-small-size`；`.recentOpen` 左邊留 `--disc-small-ring`，panel padding 扣返；`fill` 變體同 `--saved-disc-*` 全刪，`src` grep 0 殘留                                                               |
| UI 2a        | ✅   | 今日節目表 / 集數清單共用 `--list-row-pad-start`（token，冇 magic number）                                                                                                                                                                        |
| UI 2b        | ✅   | `TodayStack art={theme.art}`；README 同步；TodayPage test 覆蓋                                                                                                                                                                                    |
| Toast        | ✅   | 冇改（決定）                                                                                                                                                                                                                                      |
| PWA / motion | ✅   | 版本 1.28.1（PATCH）；冇改 `sw.js` / 更新邏輯；冇新動畫（`slideAway` 照舊）                                                                                                                                                                       |
| i18n / 函數  | ✅   | 冇新寫死字串；新函數全部 ≤ 30 行                                                                                                                                                                                                                  |

## 🟡 Warning

### W-539 — D4「全新短篇」令 1600×800 主頁格左上角下架字收到淨日期，CI e2e 紅

- **L1**：E2 決定（`e2e/comingSoon.mjs:171` 註解 + `CORNER_CASES` 第 2 項，QA 喺 CUI-0022 / W-538 量過）：闊橫版 1600×800、有繼續收聽，左上角要出「19/12 下架」
- **L2**：CI run 42197672919 @ `d3671e7`：
  `FAIL  1600×800 主頁：左上角下架字「19/12 下架」（W-538，{"width":313,"tight":"/3","text":"19/12",…}）`；
  上一次同一 case 喺 `93a18a7`（run 42137879434）係 PASS（`tight` 第 2 步）
- **L3**：右上角字尾由「新短篇 後日上架」變「全新短篇 後日上架」多一個全形字，313px 頂行收完短篇數（第 2 步）都仲爭位，跌落第 3 步（淨日期）。收字邏輯本身冇錯，係 e2e 預期同新字闊度唔夾；即係 D4 同 E2 喺呢個闊度有衝突
- 影響：CI 紅，唔可以 merge；用戶喺 1600 闊見到嘅左上角字少咗「下架」
- 方案 A：喺 1600×800 量一次確認「⏳ 19/12 下架」+「全新短篇 後日上架」真係放唔落，就將 `CORNER_CASES[1].text` 改做 `'19/12'`，註解寫明係 D4 加字引致（E2 規則本身係「放唔落先淨日期」，所以呢個結果合規）。改動細，但 1600 闊嘅用戶會少咗「下架」兩隻字
- 方案 B：保留「19/12 下架」，喺 `useHideWhenTight` 頂行加一步（例如先收右上角「全新短篇」字頭、淨「後日上架」，再收「下架」）。要用戶決定次序，改動同測試多啲
- **推薦 A**：D4 同 E2 都係用戶決定，E2 本身已經講明放唔落就淨日期；如果用戶想 1600 闊都保留「下架」，先開票做 B。無論揀邊個，都要喺 commit message 講明同 D4 嘅關係

## 🟢 Suggestion / Observation

- S-722 `src/components/pages/home/DramaShelf/DramaTileParts.tsx:18` 註解例子仲係舊字「有新短篇；下個短篇 02/12 …」，應改「有新上架短篇；全新短篇 …」
- S-723 `TodayShowList.tsx` `UnavailableRow`：普通 div 俾讀屏直接讀「{time} · 未上架」，會讀到「·」（S-717 精神）；可以改用 `<Separator>`（aria-hidden）或者加讀屏版。舊有行為，唔屬今次決定範圍
- S-724 `removeHint.tsx` 嘅 `.srOnly` 同 `SpokenText` 嘅隱藏樣式各自寫一份；可以抽一個共用 visually-hidden class
- Observation（收藏 tab 橫版分欄唔齊頂）：`margin-bottom` → `padding-bottom` 嘅推論合理：CSS fragmentation 規定斷欄位嘅 margin 要截斷，Chromium 有做、WebKit 有時會將 margin 帶去下一欄頂；改成 `break-inside: avoid` 格入面嘅 padding 就唔會拆開。風險低：`.boxItem` 冇背景 / 邊框，solo 模式 0；每欄最尾多咗 `--saved-gap` 空位，以前 margin 都有，只係分欄平衡可能差幾 px。**但冇 L2**（Chromium 重現唔到、冇 WebKit 實測），所以未可以話修好咗；QA S1 要用 Playwright WebKit 或者用戶 iPhone 截圖確認。如果仍然唔齊，後備方案係 `.boxItem { display: inline-block; width: 100% }` 或者改用 JS 分欄 / grid

## ✅ 做得好嘅地方

- `t()` 預設 `{sep}` + `common.spokenSeparator`，畫面同讀屏共用同一句字典，`zhHKCopy.test.ts` 鎖住冇寫死「·」
- 共用隱藏提示用 context + `useId`，一粒 span 服務全部行，冇 N 粒重複描述
- 刪 `Disc fill` 變體同 5 個 `--saved-disc-*` token，碟只剩一套樣式，node test 鎖住

## 修訂代碼（W-539，方案 A）

```js
// e2e/comingSoon.mjs CORNER_CASES[1]
// 闊橫版三欄格約 313px、有繼續收聽：D4「全新短篇」加長咗右上角，收短篇數之後都放唔落短版：淨日期（W-539）
{
    viewport: { width: 1600, height: 800 },
    progress: LEAVING_PROGRESS,
    name: SOON_TILE_LABEL,
    text: '19/12',
},
```

## Handoff receipt

```
HANDOFF_RECEIPT
agent: code-reviewer
stage: review
status: fail
score: 95
hard_gates: lint=pass, type=pass, unit=pass, ci_same_sha=fail (run 42197672919 e2e 1 check), coverage=pass, no_critical=pass, security=n/a
findings: C=0, W=1 (W-539), S=3 (S-722, S-723, S-724), observation=1 (saved columns WebKit unverified)
next_action: invoke developer subagent fix W-539 (recommend option A after measuring 1600x800; confirm with user if "下架" must stay) -> re-push -> CI green -> re-review W-539 only
context: B1/B2/C4/D4/S-716/S-717/S-718 all match user decisions; UI fixes 1a/1b/2a/2b ok; saved-columns WebKit fix needs QA S1 on WebKit
report: .proj-docs/reviews/2026-11-06_review_copy-grill-ui-polish.md
```

## Re-review 1 — `c23d30a`（只驗 W-539）

- 改動：`e2e/comingSoon.mjs` `CORNER_CASES[1].text` → `'19/12'`，註解寫明 D4「全新短篇」加長、跟 E2 淨出日期（方案 A）；順手修埋 S-722（`DramaTileParts.tsx:18` 註解改新字）。冇改產品代碼，唔使 bump version
- CI：[run 42201282970](https://github.com/dcwhung/903-player/actions/runs/42201282970) @ `c23d30a`：lint / unit / build ✅、E2E ✅
- W-539：✅ 已修（E2 規則「放唔落先淨日期」，CI 字型下結果合規）
- S-725（🟢 backlog）：呢個 case 視乎字型：sandbox（WenQuanYi）放得落，出「19/12 下架」；CI 字型放唔落，出「19/12」。期望值寫死就會跟環境變。建議 e2e 固定一隻 CJK 字型，或者改做按實際闊度斷言（量到放得落就要出「下架」，放唔落先接受淨日期）
- 分數：100 / 100（W-539 已修）

```
HANDOFF_RECEIPT
agent: code-reviewer
stage: re-review
status: pass
score: 100
hard_gates: lint=pass, type=pass, unit=pass, ci_same_sha=pass (run 42201282970 @ c23d30a), coverage=pass, no_critical=pass, security=n/a
findings: C=0, W=0 (W-539 fixed), S=3 open (S-723, S-724, S-725), S-722 fixed, observation=1 (saved columns WebKit unverified -> QA S1)
next_action: proceed to QA S1 (include WebKit check for saved-tab landscape columns)
report: .proj-docs/reviews/2026-11-06_review_copy-grill-ui-polish.md
```
