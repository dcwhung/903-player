# Code Review — Admin backlog Lane A（admin 0.0.1）

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立）
- 目標：`refactor/admin/lane-a_backlog-cleanup` @ `f0d1f23`，`git diff origin/main..HEAD`（19 commits，42 files，+553 / −153；只改 `apps/admin/**`，另加 `package-lock.json` 一行 admin version）
- Tier：T1（PATCH，admin 單一 workspace；backlog 清理）
- 處理咗嘅 backlog：S-828、S-829、S-830、S-832、S-833、S-834、S-836、S-837、S-838、S-839、S-840、S-843、S-848
- 總評：13 項全部落實，同原本 review / QA 嘅描述一致。每項行為改動都有 red test commit 先行，fix commit 喺後面；改到舊行為嘅 test（ScheduleTab、W-715 e2e 字串）都有寫明係 S-840 / S-843 要求嘅新行為。冇收斂嘅 🔴 / 🟡，只有 5 條 🟢。

## Hard Gates

all pass。

- ESLint（改動嘅 ts / tsx / mjs）：exit 0；`prettier --check`（改動檔 + `apps/admin/package.json`）：exit 0
- `apps/admin`：`npx tsc -b --noEmit` exit 0
- 相關 unit test：`npx vitest related <17 個改動 source> --run --project @903-player/admin`，273 tests pass
- 冇跑 full suite 同 e2e（Hard Rule #7）。main agent 報告：root `npm run lint`、`npm test`（357 files / 3803 tests）pass；admin e2e 39 PASS，DateField refactor 之後嗰次 rerun 仲跑緊，由 QA / CI 確認
- Coverage：n/a（冇量度）。每個改動模組都有專屬 test，新增嘅 `isoDate.ts`、`episodeRangeKey.ts` 都有自己嘅 test
- Security：冇新增依賴。`google-g.svg` 係靜態 asset（Vite 會 inline 做 data URI）；`_headers` 只有 `frame-ancestors`，冇 `img-src`，所以唔受 CSP 影響
- Version bump：`apps/admin` 0.0.0 → 0.0.1，`package-lock.json` 同步

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                       |
| -------- | ------- | ------- | ---------------------------------------------------------- |
| 正確性   | 25      | 25      | 範圍合併、listingDirty、shortDate 年份都有邊界 test        |
| 安全性   | 20      | 20      | 路徑 encode；冇新依賴                                      |
| 可維護性 | 20      | 20      | 抽咗共用 helper，`useCalendarPopover` 職責清楚（🟢 S-858） |
| 測試覆蓋 | 15      | 15      | red → green 次序清楚；2026 時鐘固定咗，2027 年唔會壞       |
| 性能     | 10      | 10      | 🟢 S-859 只係 observation                                  |
| 代碼風格 | 10      | 10      | lint / prettier 全過                                       |
| **總分** | **100** | **100** | **結果：✅ pass**                                          |

## 🔴 / 🟡

冇。

## 🟢 Suggestion / Observation（入 backlog，唔 block）

- S-857 `features/lists/DramaRow.tsx:37` 仲係 ``navigate(`/dramas/${entry.id}`)``，冇用新嘅 `dramaEditorPath`。`model/paths.ts` 開頭寫「列表、待辦共用」、「ID 一律 encodeURIComponent」，但列表冇跟。`DramaTabs.tsx:37`、`useDramaEditor.ts:22` 都係直接砌 raw ID：`pathname.replace` 用 decode 咗嘅 ID，比對 encode 咗嘅 pathname。S-828 原本只講 `paths.ts` / `rowTarget`，而 ID pattern 而家限制咗字元，所以唔 block
- S-858 `model/isoDate.ts` 嘅 `isoPartsOf` 同 `@903-player/catalog` 已經 export 嘅 `splitIsoDate`（`packages/catalog/src/date.ts:21`）重複。S-837 本身就係為咗收埋重複 helper。兩者只差預設值（0 / 1 / 1 對 NaN），可以考慮直接用 `splitIsoDate`
- S-859 `ui/usePopoverPlacement.ts`：每個 capture scroll event 都同步做 `getBoundingClientRect`，仲行晒祖先 `getComputedStyle`（`visibleSpanOf`），冇用 rAF 節流；喺臨界位置捲動時 up / down 亦冇 hysteresis，可能會閃。只喺月曆打開時先有 listener，影響細
- S-860 `ui/DateField.tsx` `leftField`：`relatedTarget === null` 當冇離開（設計上係為咗 PageUp / PageDown 換月）。代價係由頁面最後一個可 focus 元素 Tab 去瀏覽器 chrome 時，月曆唔會收起。已經寫咗 comment 交代 trade-off
- S-861 `ui/DateField.test.tsx:232`（同舊有嘅 `:208`）用 `Object.defineProperty(window, 'innerHeight', …)`，但冇還原，`vi.restoreAllMocks()` 唔會處理，會漏去同一個檔之後嘅 test。而家冇 test 受影響

## ✅ 做得好嘅地方

- S-843 範圍合併條件寫得嚴謹：要「連續集數 + 同一個下架日 + 唔係 kept」先合併；single / range / 中途換日期三種情況都有 test；regex `episodes? (\d+)(?:-(\d+))?` 同兩種 i18n key 對得上
- S-840 `listingDirty` 嘅做法係用已儲存嘅 unlist 替換之後再比較，冇另外寫一套比對邏輯；未儲存過（`saved = null`）時，`'null' !== null`，所以一樣係 true，同 comment 講嘅一致
- S-848 有 red evidence（32 s → 0.4 s），preflight 同 `waitForServer` 都認到 `bad port`，唔會等到 timeout

## Design / PR 提醒（main agent 開 PR 時）

- diff 有 `*.tsx` / `*.css`，PR description 第一行要有 `Design Origin:`。今次冇新 layout：G logo 尺寸照舊 20px，只係刪死 CSS，建議用 `none-required`，或者用 `baseline` 指返 SSoT 6 login 畫面

## Handoff receipt

```HANDOFF_RECEIPT
agent: code-reviewer
task: /review admin backlog Lane A (refactor/admin/lane-a_backlog-cleanup @ f0d1f23)
status: pass
score: 100
hard_gates:
    lint: pass
    type_check: pass
    tests: pass (vitest related, 273 admin tests)
    coverage: n/a
    no_critical: pass
    security_scan: pass (no new deps)
critical: []
warnings: []
backlog: [S-857, S-858, S-859, S-860, S-861]
handled: [S-828, S-829, S-830, S-832, S-833, S-834, S-836, S-837, S-838, S-839, S-840, S-843, S-848]
next_action: proceed to QA (S1 admin chain) / merge after admin e2e rerun + CI green
context: All 13 Lane A items verified against their source reports; red-before-green order confirmed. Only 🟢 left. PR needs a Design Origin line. Report committed locally, not pushed.
report: .proj-docs/reviews/2026-11-12_review_admin-lane-a.md (committed, not pushed)
```

> ID 重編（2026-11-12 merge 時）：parallel lane 撞號，以先 merge 入 `main` 嘅 Lane D 為準，本報告嘅新 S-ID 已改做 backlog 現行編號。
