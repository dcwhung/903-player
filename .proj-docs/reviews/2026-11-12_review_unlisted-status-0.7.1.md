# Code Review — 未上架 status + arc memory（api 0.7.1）

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立）
- 目標：`claude/charming-heisenberg-8z30x3` @ `c97ff2f`，`git diff origin/main...HEAD`（`860dd38` `7902bb4` `c8dee91` `104f8ef` `f27b1c3` `c97ff2f`，加 deploy 報告 docs commit `a6a5117`，只略讀）
- Tier：T2（api + admin 跨模組，新 response 欄位）
- 總評：`published.ts` 結構清楚，每個 request 只讀一次最新 publish。DELETE 守衛對劇集嘅語意同 main 一樣（`drama:<id>:` 前綴 ⇔ split 第二段，ID 冇冒號）。舊 API 冇欄位時 fallback 做「已下架」，有 test 覆蓋。`useArcMemory` 喺 render 期間同步 hash，寫法正確。有 2 個收斂 🟡：(1) 節目嘅「曾上架」用 document 有冇呢個節目嚟判斷，新節目預設下架都會當咗上過架；(2) 短篇 → 排程 → 短篇，hash 冇變，唔會再捲去記住嘅短篇。

## Hard Gates

all pass。

- `npm run lint`（eslint + `prettier --check .`）：exit 0
- `npx tsc -b`：exit 0
- api：`npx vitest run --config vitest.config.ts test/entries.test.ts`，21 tests pass
- admin：9 個改動 test 檔（`status` `arcMemory` `DramaEditor` `DramaList` `ShowList` `arcLines` `legendModel` `ShowEditor` `stateStyles.node`），70 tests pass
- 冇跑 full suite 同 e2e（Hard Rule #7，由 QA / CI 負責）。Coverage n/a（冇量度），改動模組都有專屬 test。Security：冇新依賴。

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                             |
| -------- | ------ | ------- | ---------------------------------------------------------------- |
| 正確性   | 15     | 25      | W-716、W-717                                                     |
| 安全性   | 20     | 20      | DELETE 守衛：劇集語意不變；節目只有 document 壞咗先唔同（S-844） |
| 可維護性 | 20     | 20      | 常數（`EPISODE_ID_PARTS`、`ARC_TABS`）、函數短                   |
| 測試覆蓋 | 15     | 15      | 劇 / 短篇「下架後再發佈」有 api test；三態 status 有 test        |
| 性能     | 10     | 10      | 每個 request 一次 `latestPublish`，同 list 並行                  |
| 代碼風格 | 10     | 10      | lint / prettier 全過；i18n 書面語；pill 冇 hover 規則            |
| **總分** | **90** | **100** | 結果：pass，W-716 / W-717 建議 merge 前修                        |

## 🟡 W-716 新節目下架從未上架，有任何一次發佈之後就變咗紅色「已下架」

- 位置：
    - `apps/api/src/content/published.ts:31`、`:51`：`showsOf` 只要 document 入面有呢個節目 ID，就當上過架
    - `apps/api/src/content/entries.ts:57`：`published: isInIndex(...)`
- L1：
    - 已批准需求 1：「下架而且從未發佈 → 灰色未上架」。
    - `apps/admin/src/features/shows/showModel.ts:44`：新節目預設 `enabled: false`（「填好資料、上載圖先上架」）。
    - `apps/api/src/catalog/publish.ts:89-110`：`documentFromEntries` 會包所有非 draft 嘅 row，包括下架節目。
- L2：臨時 test（跑完已刪）。`putEntry('shows','newshow',{...SHOW, enabled:false})`，然後 `POST /api/publish`，然後 `GET /api/entries`：
    ```
    × a show created disabled and never enabled stays published:false after a publish
    - "published": false,
    + "published": true,
    ```
- L3：
    - 劇集嘅鎖只會鎖上架緊嘅集數（`listedEpisodeIds`），所以從未上架嘅劇保持 `false`。
    - 節目冇鎖，用「喺 document」代替「上過架」。
    - 結果：admin 開新節目之後，只要有人發佈任何內容，呢個節目（仲未填好資料）就由灰變紅，同劇集嘅行為唔一致。
- 方案 A（推薦）：狀態 flag 同 DELETE 守衛分開。
    - 狀態：一條 D1 query，用 `json_each(document,'$.shows')` 掃所有 `status='ok'` 嘅 publish，揀 `definition.enabled` 唔係 false 嘅節目 ID。語意同 `wasEverPublished` 一樣，唔使 migration，仍然係每個 request 一次。
    - 守衛：照舊用最新 document 有冇呢個節目（保守做法，唔放寬刪除）。
- 方案 B：只睇最新 document 入面 `enabled !== false` 嘅節目，成本最細。
    - trade-off：上過架嘅節目下架之後再發佈，會錯當「未上架」。
    - 唔可以共用落 DELETE 守衛，否則會放寬刪除。

## 🟡 W-717 短篇 → 排程 → 短篇：記住嘅短篇有展開，但唔會捲去嗰行

- 位置：
    - `apps/admin/src/features/dramas/useHashTarget.ts:12`：effect deps 只有 `[ready, hash]`
    - `apps/admin/src/features/dramas/DramaEditor.tsx:34-36`
- L1：已批准需求 2：「短篇 opens it expanded and scrolled into view」。
- L2：臨時 test（沿用 `arcMemory.test.tsx` 嘅 setup，跑完已刪）。步驟：喺 `/dramas/lancy/arcs` 展開森美幻想劇，撳排程（`#fantasy`），清空 scroll 記錄，再撳短篇（3）。結果：location = `/dramas/lancy/arcs#fantasy`，編輯欄位 = 森美幻想劇，但係：
    ```
    AssertionError: expected [] to include 'fantasy'
    ```
- L3：
    - 喺短篇 tab 展開會寫入記憶，所以排程 tab 嘅 link 同短篇 tab 嘅 link 都帶同一個 `#fantasy`。
    - 轉返短篇時，path 變咗但 hash 冇變。`DramaEditor`（key = 劇 ID）冇 remount，所以 `useHashTarget` 嘅 effect 唔會再跑。
    - 現有 unit test 同 e2e `arcMemoryBackCheck` 都係由排程 chip 改 hash 先返短篇，hash 有變，所以冇覆蓋呢條路徑。短篇數目多、嗰行喺畫面以外時，用戶睇唔到。
- 方案 A（推薦）：`useHashTarget` 嘅 deps 加 `pathname`（或者 `location.key`），每次轉 tab 都會捲。一行改動，再加一個 unit test（即係上面嗰個 L2 case）。
- 方案 B：`ArcsTab` mount 時如果有 `openArc`，自己 `scrollIntoView`（用 `scrollBehavior()`）。
    - trade-off：同 `useHashTarget` 重複做同一件事，深連結會捲兩次。

## 🟢 Suggestion / Observation（入 backlog，唔 block）

- S-844 `apps/api/src/content/published.ts:44`：document parse 失敗時，`showsOf` 回空 set，DELETE 守衛變成放行。main 嘅做法係 throw → 500，即係拒絕刪除。document 一定係 server `JSON.stringify` 出嚟，實際重現唔到；建議守衛 fail-closed。
- S-845 `apps/api/src/content/entries.ts:63-66`：`GET /entries` 而家每次都讀成份 catalog `document`，只係為咗節目 ID。可以只 select 需要嘅欄位，或者用 `json_each`（見 W-716 方案 A）。
- S-846 `apps/admin/src/features/dramas/ScheduleTab.tsx:46`：揀 chip 只寫入記憶，冇寫入 URL hash，重新整理會揀返舊嘅 `#arc`。`arcMemory.test.tsx` 註解寫「重新整理 / 分享都係同一個」，只啱短篇 tab 嗰邊。
- S-847 `apps/admin/src/i18n/zh-HK.ts:158-159`：draft 分組（「未上架（n）· 處理待辦後才可排序」）同新嘅下架分組（「未上架 / 已下架」）都用「未上架」，同一頁有兩個分隔線意思唔同。可以考慮 draft 分組改寫「待處理」。
- Observation：「曾上架」以最新一次 ok publish 為準（按 spec）。還原到一份未有某短篇嘅舊 document 之後，曾經上過架嘅短篇會顯示「未上架」。`wasEverPublished`（改 ID 守衛）就係睇所有 publish，兩者語意唔同，可以喺 spec 寫明。

## ✅ 做得好嘅地方

- 舊 API 冇 `published` 欄位（`undefined`）時，一律當「已下架」，向後兼容有 test 鎖住。admin 改動唔需要 API 先部署。
- `useArcMemory` 用 render 期間 setState 同步 hash，冇 effect 閃爍。`key = 劇 ID`，換劇自然重新嚟過。非短篇 hash（`#images`）唔會入 tab link。

## 修訂代碼（W-717 方案 A）

```ts
export const useHashTarget = (ready: boolean): string => {
    const { hash: raw, pathname } = useLocation();
    const hash = decodeURIComponent(raw.slice(1));
    useEffect(() => {
        if (!ready || hash === '') return;
        const target = document.getElementById(hash);
        target?.scrollIntoView?.({ behavior: scrollBehavior(), block: 'center' });
    }, [ready, hash, pathname]); // W-717：hash 一樣都要再捲
    return hash;
};
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 90/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "claude/charming-heisenberg-8z30x3"
context: "C=0, W-716 (published.ts:31/51, entries.ts:57), W-717 (useHashTarget.ts:12, DramaEditor.tsx:34-36), S-844..S-847; integration branch is main; recommend fixing both W before merge"
```
