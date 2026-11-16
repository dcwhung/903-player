# Code Review — 確認發佈「修改」寫埋改咗邊啲欄位（admin 0.5.0）

- 日期：2026-11-14
- 審閱者：Code Reviewer（獨立）
- 目標：`feature/admin-change-fields`，`git diff origin/main...HEAD`（`b35a80f` feature、`3d36e02` 修 W-742 / S-993 / S-994）
- Tier：T1（admin 純前端顯示，用 `GET /api/changes` 已有嘅 `detail.fields`，api 唔變）
- 總評：做法啱。標籤盡量重用編輯頁嘅 `fields.*`，短篇欄位按短篇名分組，認唔到嘅欄位顯示「其他」。第一輪有一項 🟡：短篇 `episodes` 標咗「集數」，但係呢個欄位只會喺集數冇變嘅時候報出嚟。`3d36e02` 已經修好，re-review 通過

## Hard Gates

全部 pass（re-review 喺 `3d36e02` 跑）。

- `npx eslint apps/admin/src/features/update apps/admin/src/i18n`：exit 0。`e2e/selectiveChecks.mjs` 由 main agent 跑 repo-wide `npm run lint` 覆蓋（e2e 屬 QA / CI）
- `npx tsc -b apps/admin`：exit 0
- `npx vitest run` 跑 `changeFields`、`Timeline`、`PublishPage`、`SelectionCard`、`writtenChinese`：5 files，25 tests pass
- Coverage `changeFields.ts`：statements / lines / functions 100%，branches 96.3%
- 冇新依賴。冇跑 full suite 同 e2e（Hard Rule #7）

第一輪 reviewer 將 lint、tsc、coverage 砌埋一條 command 跑，入面有 e2e 檔路徑，觸發 `reviewer-test-scope` hook，所以停低咗冇繞過。今輪分開幾條 command 跑，只用 `apps/admin/src` 路徑。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                               |
| -------- | ------- | ------- | ------------------------------------------------------------------ |
| 正確性   | 25      | 25      | W-742（第一輪 -5）已修；show / drama / arc 會報嘅 key 全部有 label |
| 安全性   | 20      | 20      | 只係顯示文字，React 會 escape                                      |
| 可維護性 | 20      | 20      | 重用 `fields.*`；dead entry（S-993）已刪                           |
| 測試覆蓋 | 15      | 15      | unit + 用真 `summarizeChanges` 嘅 contract test + e2e 斷言         |
| 性能     | 10      | 10      | 每個 item 喺 `entries` 做一次線性搜尋，數量細                      |
| 代碼風格 | 10      | 10      | S-994 已改做 `for…of`                                              |
| **總分** | **100** | **100** | 結果：pass（第一輪 95 / warn）                                     |

## 🔴 / 🟡

### W-742 🟡 `changeFields.episodes: '集數'`：短篇 `episodes` 改咗嘅時候，集數其實冇變（已修）

- L1：`packages/catalog/src/admin/seriesChanges.ts` `arcEditFields`：集數有變就將 `episodes` 加入 ignore，交由 newEpisodes item 處理。所以 `arcs.<id>.episodes` 只會喺集數不變、集名 list 改咗嘅時候出現。drama schema 寫明 `episodes` 係「集數或者集名 list」。用戶要求係睇到改咗咩
- L2：用 tsx 叫 `arcEditFields`：
    - `3` → `['一','二','三']`：得到 `['arcs.a.episodes']`
    - 改一個集名：得到 `['arcs.a.episodes']`
    - `3` → `4`：得到 `[]`
    - 即係 UI 會寫「戀愛二分一：集數」，但集數冇變過
- L3：用戶會以為集數變咗，再去查
- 方案 A（已採用）：短篇 `episodes` 用「各集標題」標籤
- 方案 B：開新 label「集名列表」
- Re-review：`3d36e02` 加咗 `ARC_KEY_ALIASES = { episodes: 'titles' }`（只套用喺短篇 key；頂層 `episodes` 屬 `ENTRY_HANDLED_KEYS`，永遠唔會報），刪走 `changeFields.episodes`。新 test `'戀愛二分一：各集標題'` pass。同一個短篇同時改咗 `titles` 同 `episodes`，會經 `unique` 合併成一個「各集標題」。✅

## Label 覆蓋度（brief Check 1）

- Show 頂層：name、fileTime、airDays、order、tile、disc、theme、summary、hosts、airTime，另加 `images`，全部有 label
- Drama 頂層：name、kind、order、arcUnit、tile、disc、audio、theme、addedAt、summary，全部有 label。enabled、removedAt、arcs、episodes 屬 handled，唔會報
- Arc：name、disc、tile、firstNo、titles、files、episodeRemovedAt、displayName、summary、cast，全部有 label；`episodes` 經 W-742 alias 處理。enabled、addedAt、episodeDates、removedAt 屬 handled。改 `id` 會當成另一個短篇，唔會報做 edit

## 🟢 Suggestion / Observation

- S-993（已修）：`CHANGE_FIELDS.folder` 同 `EDITOR_FIELDS.removedAt` 永遠唔會出現（`folder` 喺 `audio` 入面，`removedAt` 屬 handled）。`3d36e02` 已刪，連埋 `changeFields.folder` ✅
- S-994（已修）：`forEach` 入面嘅 `return void top.push(...)` 改做 `for…of` + if / else ✅
- S-995（Observation）：歷史頁用 `HistoryRow` 自己嘅 `ChangeLine`（`historyName`），唔係 `Timeline`，所以唔會顯示欄位。用戶要求只講確認發佈頁；main agent 會問用戶歷史頁要唔要，唔喺呢個 PR 做
- 書面語（Check 2）：新字串（橫圖、碟面、配色、排序、短篇單位、首集編號、錄音檔、單集下架日期、`{arc}：{fields}`、`{label}（{fields}）`）全部係書面語，`writtenChinese.test` pass
- Accessibility（Check 4）：`muted small` 係現有 pattern（`HistoryRow`、`ScheduleViews` 都有用）。文字係真 DOM text，冇 `aria-hidden`，screen reader 讀得到。`.timeline .what` 用 flex gap 分隔，同現有嘅 range span 一致。`--muted` 冇逐個 surface 量對比度

## ✅ 做得好嘅地方

- 標籤重用 `fields.*`，同編輯頁用字一致；`unique` 處理到同一個 label 重複出現
- `Timeline.test` 用真嘅 `summarizeChanges` 做 contract test，catalog 同 admin 兩邊嘅 key 格式對得上
- 短篇名搵唔到就退返用 key，唔會出空白

## Handoff receipt

```
HANDOFF_RECEIPT
agent: code-reviewer
target: feature/admin-change-fields @ 3d36e02 (admin 0.5.0)
status: pass
hard_gates: lint=pass type=pass tests=pass coverage=pass no_critical=pass security=n/a
score: 100 (round 1: 95 / warn)
findings: W-742 fixed; S-993 fixed; S-994 fixed; S-995 observation (user decision, not this PR)
next_action: proceed_to_qa
context: re-review of 3d36e02 only; report committed locally, not pushed (code CI running)
```
