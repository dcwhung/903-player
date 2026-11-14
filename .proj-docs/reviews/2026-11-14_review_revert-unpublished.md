# Code Review — 還原未發佈改動（api 0.11.0 / admin 0.7.0）

- 日期：2026-11-14
- 審閱者：Code Reviewer（subagent）
- 目標：`feature/admin-revert-unpublished`（`git diff origin/main...HEAD`；074b203、52ea09d、172dbf3、246fb9a、e407ce1）
- Plan：`.proj-docs/plans/2026-11-14_plan_revert-unpublished.md`；Design Origin：`mockup: _mockups_/admin-revert/index.html`
- Tier：T2（新 endpoint + admin UI）
- 總評：設計清楚，PUT / revert 共用 `writeEntry`，S-804 守衛、樂觀鎖、驗證全部沿用；圖 slot 對應同 `editChanges.ts` 用同一個 function。兩個 🟡 都係 API 「未知 field」判斷用錯方法，修正細。

## Hard Gates

all pass — `npx eslint apps/api apps/admin/src packages/catalog/src` exit 0；`npx tsc -b` exit 0；`npx vitest related <47 個改咗嘅 source> --run` 219 files / 2233 tests 全綠；新檔 coverage：lines 99.39%、statements 97.2%、branches 86.06%。冇跑 e2e。

## 評分結果

| 維度     | 得分   | 滿分    | 備注                             |
| -------- | ------ | ------- | -------------------------------- |
| 正確性   | 20     | 25      | W-745                            |
| 安全性   | 15     | 20      | W-746（輸入驗證）                |
| 可維護性 | 20     | 20      | 純邏輯 / route / UI 分得清       |
| 測試覆蓋 | 15     | 15      | api 22 個 case、admin 4 個測試檔 |
| 性能     | 10     | 10      | S-1006 只係 Observation          |
| 代碼風格 | 10     | 10      | lint / prettier 過               |
| **總分** | **90** | **100** |                                  |

**結果：✅ pass**。W-745、W-746 要跟 `.claude/CLAUDE.md`「Parallel lane backlog」喺呢個 PR 修，re-review 確認。

## 🟡 Warning

### W-745 圖 slot 用慣例檔名、兩邊 definition 都冇 `tile` / `disc` key 時，還原圖會回 400

- 位置：`apps/api/src/content/revert.ts` `revertTop`（`field in source || field in this.definition`）、`revertArc`（`known`）
- L1：plan contract 寫「`tile` / `disc` 會連 `images` 入面嗰個檔一齊還原」，實作差異寫「同 `editChanges.ts` 一樣，冇寫就用慣例名」。admin `revertScope.fieldChanged` 會比較 images，冇 key 都會出「還原」；api 就只認 definition 有冇嗰個 key，兩邊不一致
- L2：臨時 probe（跑完已刪）：published / current 都係 `arcs: [{ id: 's1', … }]`（冇 `tile`），`images['arcs/s1/tile.webp']` 唔同 → `applyRevert(…, [{ arc: 's1', field: 'tile' }])` 同 `[{ field: 'tile' }]` 都 throw `RevertError 400`
- L3：admin 上載（`withImageFile`）一定會寫 key，所以要由 repo 匯入嘅舊資料、而且係喺 admin 以外改圖先會撞到；不過用戶撳「還原」會見到「還原失敗」
- 方案 A（推薦）：`known` 加 `slotOf(field) !== undefined`（頂層同短篇都加），再加一個「冇 key、淨係改咗圖」嘅測試。改動少，兩邊一致
- 方案 B：admin 只喺有 key 先出圖嘅還原掣。治標，而且同 `editChanges` 嘅慣例名規則唔一致

### W-746 `field` 係 `Object.prototype` 嘅名（`constructor`、`toString`、`__proto__`）時，回 500 或者 200 但乜都冇改

- 位置：`revert.ts` `revertTop`、`revertArc`、`copyKey`（用 `in` 會睇埋 prototype chain）
- L1：plan / README contract 寫「未知 field 或者 shape 唔啱 → 400」
- L2：probe：`{ field: 'constructor' }`、`{ arc: 's1', field: 'toString' }` throw `DataCloneError`（`structuredClone(function)`），route 唔 catch，結果係 500；`{ field: '__proto__' }` 冇 throw，回 200 但冇還原任何嘢
- L3：要登入咗嘅 admin 先送得到，而且冇污染到全域 prototype；不過違反咗 contract，亦會喺 log 留低 500
- 方案 A（推薦）：三處都改用 `Object.hasOwn(obj, key)`，再加 `it.each` 400 case
- 方案 B：`revertItemsOf` 直接拒絕 `__proto__` / `constructor` / `prototype`。不過黑名單永遠列唔齊

## 🟢 Observation（入 backlog / 交 main agent 決定）

- S-1006 `published.ts` `loadPublishedEntry`：每次 `GET /api/entries/:kind/:id` 都讀同 parse 成份最新 publish document；`AdminData` 會逐個 entry `getEntry`，所以每次 refresh 要讀 N 次 document。entry 多咗之後可以考慮 cache 或者喺 list endpoint 一次過回
- S-1007 `useModalKeys` 嘅還原 focus：還原成功之後觸發掣會 unmount（欄位冇再改過），focus 會跌返去 `body`。可以考慮 focus 返卡片或者標題
- S-1008 短篇編輯頁「其他已修改」（`ARC_PLACED` 以外）會包括 `episodes` / `episodeDates`，可以由編輯頁還原新集數；但時間線跟 plan「唔出還原：新集數」。要用戶決定係咪刻意咁做
- S-1009 `published.ts` `imageNamesOf`：URL 唔係 `/catalog/v1/img/` 格式嘅圖會被略過，咁還原 `tile` / `disc` 時 `restoreImage` 會刪走 D1 嗰個 key（應該 fail closed：唔郁）。而家 publish 一定用呢個格式，所以只係防禦性問題
- S-1010 Design Fidelity：mockup 嘅 `.field-head`、`.circle-btn.revert`、`.modified` 喺實作分別對應現有嘅 `.label-line`、新 `.slot-revert`、`<Pill tone="warn">`（沿用現有元件，合理）；新元素（`.revert-btn`、`.dialog-revert`、`.diff-row`、`.published-hint`、`.img-box`、`.txt-box`、`.col-label`）同 mockup 一致。plan 未有 admin 嘅「實作差異」記錄呢個對應，建議補返
- S-1011 短篇從未發佈嘅 409 冇 `reason`，admin 會顯示「此項目尚未發佈」，用字唔夠準。可以加 `reason: 'arcNotPublished'`

## 其他 Focus 核對（冇問題）

- 409 / 400 / 412 次序：target → body 400 → 404 → If-Match 412（冇帶都係 412）→ notPublished 409 → 還原 400 / 409 → `writeEntry`（S-804 409、422、樂觀鎖 412）；同 route 註解一致
- auth / CSRF：掛喺 `contentRoutes`，同其他 mutating route 一樣經 same-origin + session 守門，亦受 body limit
- 舊圖 key 清理：只刪「還原前有 slot 指去、還原後冇」嘅 key；短篇放返嘅位置（published 前面最近、D1 仲有嘅短篇之後）有測試覆蓋
- 還原後嘅下一次 publish 有測試；冇 asset GC，所以已發佈嘅 hash 仲喺度
- admin：只有 `edit` / `unlist` 行出「還原」；`disabled` → `enabled`、`removedAt` → `removedAt`、短篇刪咗 → `'*'`，劇本身刪咗就唔出；If-Match 用 entry etag，412 會 toast 再重讀；`useRevertRefresh` 會重讀 admin 資料同已選嘅變更；有未儲存改動時掣會灰咗，`title` 寫明原因
- a11y：`RevertLabel` 嘅 `htmlFor` / `id` 正確，icon 掣有 `aria-label`，dialog 有 `aria-modal`、`aria-labelledby`，focus trap 沿用 `useModalKeys`
- 樣式只用 token（`--danger-bg` / `--danger-ink`），冇新動畫，所以 Motion 規則唔適用；新增文字全部書面語（`writtenChinese.test.ts` 通過）
- 檔案長度：冇新嘅 TS 檔超過 150 行。`entries.ts` 本身已經超（283 → 297），新邏輯另外放 `revert.ts` / `revertRoute.ts`，可以接受。`revert.css` 211 行同其他 CSS 檔慣例一致。所有函數都 ≤ 50 行

## ✅ 做得好嘅地方

- `writeEntry` 抽出嚟之後，PUT 同 revert 一定行同一條驗證 / 守衛 / 鎖路徑，唔會走漏
- catalog 匯出 `entryImageFile` / `arcImageFile`，api、admin、`editChanges` 三邊用同一套 slot → 檔名規則
- `publishedVersion` 改名，避免同列表嘅 `published: boolean` 撞名，而且有測試鎖住

## 修訂代碼（W-745 / W-746）

```ts
// revert.ts
const has = (obj: Json, key: string) => Object.hasOwn(obj, key); // W-746：唔睇 prototype
const copyKey = (target: Json, source: Json, key: string) => {
    if (has(source, key)) target[key] = structuredClone(source[key]);
    else delete target[key];
};
// revertTop
if (TOP_LEVEL_BLOCKED.has(field)) throw new RevertError(400, `unknown field ${field}`);
const known = slotOf(field) !== undefined || has(source, field) || has(this.definition, field); // W-745
if (!known) throw new RevertError(400, `unknown field ${field}`);
// revertArc
const known =
    field === WHOLE_ARC ||
    slotOf(field) !== undefined || // W-745：慣例檔名冇 key 都還原得
    has(source, field) ||
    (isRecord(target) && has(target, field));
```

## Re-review（2026-11-14，`3efc8a2`、`ff6ad1f`、`9c20e3b`）

範圍：只驗上一輪 W-745、W-746 同 S-1006 至 S-1011 嘅修正，加埋用戶要求嘅剔格位置改動（`3efc8a2`）。

Hard gates：all pass。`npx eslint apps/api apps/admin/src packages/catalog/src` exit 0；`npx tsc -b` exit 0；`npx vitest related <15 個改咗嘅 source> --run` 100 files / 832 tests 全綠；改動檔 coverage：lines 99.16%、statements 97.45%。冇跑 e2e。

| ID     | 結果 | 驗證                                                                                                                                                                                             |
| ------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W-745  | ✅   | `revertTop` / `checkArcField` 嘅 `known` 加咗 `slotOf(field) !== undefined`；`revertEdgeCases.test.ts` 覆蓋頂層同短篇「冇 key、淨係改咗圖」                                                      |
| W-746  | ✅   | `revertParts.has` = `Object.hasOwn`，`copyKey` 同兩個 `known` 都用佢；測試覆蓋 `constructor` / `toString` / `__proto__` / `hasOwnProperty` → 400                                                 |
| S-1006 | ✅   | `publishedVersion.ts` 用 `id:hash` 做 key 嚟 memo；`hash` 係 document 嘅 sha256（`0001_init.sql`），key 一樣即係內容一樣。cache 住嘅 definition 唔會被改（`copyKey` / 插入都 `structuredClone`） |
| S-1007 | ✅   | `revertFocus.ts`：focus 依次搵欄位控制 → 卡（`data-revert-anchor`）→ h1；只會喺 focus 已經跌咗時先搬                                                                                             |
| S-1008 | ✅   | admin `NOT_REVERTABLE` 同 api `EPISODE_FIELDS` 一致（400）；短篇 `'*'` 照舊會還原成個短篇，已寫入 plan                                                                                           |
| S-1009 | ✅   | `unresolvedImages` 喺 `restoreImage` 同清理階段都唔郁；GET 唔會洩露（有測試）                                                                                                                    |
| S-1010 | ✅   | plan 已補 admin 嘅「實作差異」                                                                                                                                                                   |
| S-1011 | ✅   | 409 帶 `reason: 'arcNotPublished'`，admin 顯示「此短篇尚未發佈，無法還原」（書面語）                                                                                                             |
| 剔格   | ✅   | `3efc8a2`：mockup、`DiffRow`、`revert.css`（包括窄版）一齊改；`aria-label` 冇變                                                                                                                  |

流程備註（唔扣分）：`ff6ad1f` / `9c20e3b` 每個 commit 包咗幾個 review item，唔符合「一個 review item = 一個 commit」嘅 Fix Convention；之後嘅 lane 要跟返。

**Re-review 結果：✅ pass，100/100**：上一輪兩個 🟡 已經修好，S-1006 至 S-1011 全部處理完，冇剩低 backlog。
