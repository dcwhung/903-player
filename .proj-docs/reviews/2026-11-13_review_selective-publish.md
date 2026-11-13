# Code Review — 選擇發佈（api 0.10.0 / admin 0.3.0）

- 日期：2026-11-13
- 審閱者：Code Reviewer（獨立）
- 目標：`feature/selective-publish` @ `b0e1243`，`git diff $(git merge-base HEAD origin/main)..HEAD`（6 commit、57 檔）
- SSoT：`.proj-docs/plans/2026-11-13_plan_selective-publish.md`（含「實作差異」）；Design Origin：`mockup: _mockups_/admin-selective-publish/index.html`
- Tier：T2（新功能，跨 api / admin）
- 總評：核心正確性穩陣。`planSelection` 只放行 `selectable` 而且揀咗嘅行，`incomplete` / draft 就算 client 揀咗都會自動剔走（`skipped`）；冇揀嘅新劇 / 新短篇換返上次 ok publish 嘅版本（短篇用 `name` 對），冇先剔走，所以已鎖 episode ID 唔會觸發 409，同一套劇其他短篇唔受影響。`always` 行（新集數）喺所屬劇 / 短篇被剔走時唔 resolve；`resolveDoneFindings` 只標今次真係發佈咗嘅行。冇揀嘅 branding 兩部分各自用返上次值，部署觸發照用 before / after 比較，所以冇揀 branding 唔會重新部署。冇 body = 舊行為。Admin 只記剔走咗嘅項目（Q1），URL `?selection=` 令 reload 照用；422 會顯示過時提示；Q4 有做；介面文字大致係書面語。得一個收斂 🟡：`GET /api/changes ?selection=` 嘅 App 外觀旗冇 test。

## Hard Gates

all pass。

- lint：改動檔 `npx eslint` exit 0；`npx prettier --check <改動檔>` 全部過
- type：`npx tsc -b`（apps/api、apps/admin）exit 0
- unit（diff 相關）：api `selectivePublish` / `adminRoutes` / `adminScan` / `publish` / `banner` / `branding` / `deploy` / `drafts` / `publishWarnings` / `disabledEntries` 10 files / 196 tests pass；admin `src/features/update`、`src/api/publishEndpoints`、`src/i18n`、`src/styles`、DramaEditor / ShowEditor、`src/app` 32 files / 143 tests pass；冇跑 e2e（留 QA / CI）
- coverage：新 module（`selection.ts`、`selectDocument.ts`、`selectivePublish.ts`、`todoSelection.ts`、`selectionModel.ts`、各 component）都有 test 行到主要分支（缺口見 W-740）
- security：冇新依賴；version 已 bump（api 0.10.0、admin 0.3.0）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                   |
| -------- | ------ | ------- | -------------------------------------- |
| 正確性   | 25     | 25      | L2 probe 驗過 appearance 旗、400 / 422 |
| 安全性   | 20     | 20      | 只限已登入 admin；S-980 屬加固         |
| 可維護性 | 20     | 20      | 🟢 記錄，不扣分                        |
| 測試覆蓋 | 10     | 15      | W-740                                  |
| 性能     | 10     | 10      |                                        |
| 代碼風格 | 10     | 10      |                                        |
| **總分** | **95** | **100** |                                        |

**結果：✅ pass**（hard gates 全過、≥ 90、冇 Critical；按用戶規則，下面所有 W / S 都要今個 session 修完再 re-review）

## 🟡 Warning

### W-740 `GET /api/changes ?selection=` 嘅 `bannerChanged` / `brandingChanged` 跟選擇計，冇 test 鎖住

- 位置：`apps/api/src/admin/changes.ts:114-115`；test `apps/api/test/selectivePublish.test.ts:224-256`
- L1：plan「Branding 部署觸發照用『今次發佈嘅 branding 同上次唔同』判斷」+「確認發佈頁 … App 外觀須重新部署提示」；確認發佈頁嘅重新部署提示（`SelectionCard.tsx:181`）同「發佈」掣（`PublishPage.tsx:27-34`）都靠呢兩個旗
- L2：而家冇 test 用 `?selection=` 去斷言呢兩個旗；臨時 probe（跑完已刪）：改咗 text + banner，`?selection={}` → `brandingChanged=false, bannerChanged=false, unchanged=true`；揀晒 → `true, true, false`。行為係啱嘅，只係冇 test 鎖住。POST 方面淨係 `icon` 揀、`text` 唔揀（兩部分都同上次唔同）嘅情況都冇 test
- L3：之後有人改 `picked` 計法（例如漏咗 `&& picked.x`），測試唔會發現，確認發佈頁就會喺冇揀 branding 時都顯示「須重新部署」
- 方案 A（推薦）：喺 `GET /api/changes selection data` 加一個 `it`：改 text + banner → `?selection={}` 兩個旗都係 false 而且 `unchanged: true`；`{ branding: { text: true } }` → 淨係 `brandingChanged`；`{ banner: true }` → 淨係 `bannerChanged`。另外喺 appearance describe 加 icon 揀、text 唔揀嘅 case，斷言 `catalog().branding` 嘅 icon 係新值、text 係上次值
- 方案 B：淨係喺 admin `PublishPage.test.tsx` mock 個 response 去測 UI——鎖唔住 server 計法，唔建議

## 🟢 Suggestion / Observation

- S-980 `apps/api/src/catalog/selection.ts:57-65`、`selectivePublish.ts:264-272`：`content` 限咗 500 個，但每個 key 冇長度上限，body 亦冇 `bodyLimit`；422 會原封不動送返 `keys`（probe：一個 100 KB 嘅 key → 422，回應 100 046 bytes）。修法：key 用 `/^[a-zA-Z]+\/[a-z0-9-]+(\/[a-z0-9-]+)?$/` 驗（或者限 ≤ 200 字元），唔合格就 400；`POST /publish` 加 `bodyLimit`（跟 `content/routes.ts`，例如 64 KB）；回應最多送返頭 20 個未知 key
- S-981 `package-lock.json:28,57`：workspace 版本仲係 admin `0.1.0` / api `0.9.0`（api 0.9.0 嗰次有同步 lock）。修法：`npm install --package-lock-only`，然後 commit lock（admin 喺 main 已經落後咗，順手一齊對返）
- S-982 `apps/admin/src/i18n/zh-HK.ts:149,154`：「今次發佈」同同一頁嘅 `statsLabel`「本次發佈」（`:106`）、`bannerOnly`「本次…」唔一致，而且「今次」偏口語。修法：改做「本次發佈」、「不會在本次發佈」，mockup `:1320,1335` 同步改；相關 test / e2e 嘅字串一齊改
- S-983 `apps/admin/src/styles/mockup.css:899-901`：`table.matrix tr.done` 已經冇人用（`TodoMatrix.tsx` 唔再加 `done`）。修法：刪咗佢
- S-984 `SelectionCard.tsx:136-142`、`AppearanceSection.tsx:158-162`：同 mockup 有細微出入——mockup ② 新內容項目有集數（「…戀愛後二分一（20 集）」，`:1322`），① App 外觀 meta 有寫改咗乜（「簡介已更改 · 發佈後會…」，`:1229`），實作兩樣都冇；另外 meta「將自動」同 mockup「會自動」唔同。修法：項目後面加集數（`episodesOf` / `countOf` 已經有）；meta 跟 mockup 用「會」；「簡介已更改」如果要做，就要 API 回傳改咗嘅細項，唔做嘅話喺 plan「實作差異」寫明
- S-985 `zh-HK.ts:90` `update.incompleteLabel` 同 `:155` `publish.incompleteItem` 字串完全一樣；`PublishCell.tsx:41-44` 喺 `missing` 係空嘅時候（draft 劇冇必須格）會讀出「名（尚未設定）」。修法：抽一個 `incompleteText(row)` helper 放 `todoModel.ts`（`missing` 係空就淨係出名），兩處共用，刪走其中一個 key
- S-986 `apps/admin/src/features/update/selectionModel.ts:63`：`isRecord` 同 `src/model/raw.ts:7` 重複。修法：import 返 `raw.ts` 嗰個
- S-987 `UpdatePage.tsx:52-53`、`SelectionFooter.tsx:119`：`changes` 未載入完（`appearance` 係 undefined）時撳「下一步」，URL selection 嘅 branding / banner 會係 `false`，預設勾嘅 App 外觀就會靜靜雞唔發佈。修法：`changes.data` 未有就 disable「下一步」（或者顯示 `app.loading`），補一個 UpdatePage test
- Observation（唔屬今次 diff）：admin e2e `schedule 編輯 … panels not side by side`（`apps/admin/e2e/run.mjs:504-506`）fail 一次、再跑就過。今次 diff 冇改 schedule 頁同嗰個 check，我冇重現（L2 缺）。Check 喺填完 spinbutton 之後即刻量 `boundingBox`，而且容差只有 1 px，時間軸仲未 render 完就可能量錯。建議 QA 記入 `.proj-docs/qa/known-issues.md`；要修就量之前先等 `assertTodayCells` / 時間軸格出齊，或者用 `expect.poll`

## ✅ 做得好嘅地方

- 「冇揀 = 同上次發佈一樣」（換返上次版本，唔係硬剔走）保住咗 ID 守衛，`excludedDramas` / `excludedArcs` 同 `publishedRows` 用同一份 plan，resolve 同發佈一致
- `GET /api/changes` 同 `POST /api/publish` 共用 `documentFor` / `checkedPlan`，預覽同實際發佈唔會走樣；`others` 用 `EMPTY_SELECTION` 計，定義清楚
- Admin 只記剔走（Q1）+ URL selection + 422 過時處理，有齊 unit test 同 e2e（`selectiveChecks.mjs`）

## 修訂代碼（W-740 test 草稿）

```ts
it('should follow ?selection for bannerChanged / brandingChanged', async () => {
    await putText('903 Player');
    await putBanner();
    const flags = async (selection: unknown) => {
        const body = await json(
            await adminGet(
                `/api/changes?selection=${encodeURIComponent(JSON.stringify(selection))}`,
            ),
        );
        return [body.brandingChanged, body.bannerChanged, body.unchanged];
    };
    expect(await flags({})).toEqual([false, false, true]); // 冇揀：唔使重新部署
    expect(await flags({ branding: { text: true } })).toEqual([true, false, false]);
    expect(await flags({ banner: true })).toEqual([false, true, false]);
});
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: invoke_developer
next_agent: backend-developer, frontend-developer
branch: "feature/selective-publish"
context: "User rule (parallel lane backlog): fix W-740 + S-980..S-987 this session, one commit each (fix: <ID> | ...), then re-review, then QA S1. Backend: W-740, S-980, S-981. Frontend: S-982..S-987. e2e schedule flake = Observation for QA known-issues."
blockers: []
```

---

# Re-review — 2026-11-13 @ `63f6297`

- 範圍：`c97d1a3..HEAD` 10 個修正 commit（W-740、S-980–S-987 各一個 + `63f6297` e2e flake），28 檔；只驗上一輪項目嘅修正同佢哋嘅 diff
- Hard gates：all pass
    - lint：改動檔 `npx eslint` exit 0；`npx prettier --check <改動檔>` 過
    - type：`npx tsc -b apps/admin apps/api` exit 0
    - unit：api `selectivePublish` / `publish` / `branding` 3 files / 77 tests pass；admin `src/features/update`、`src/i18n`（含 `writtenChinese.test.ts`）、`src/styles` 18 files / 89 tests pass；冇跑 e2e（留 QA / CI）
    - security：冇新依賴

## 逐項驗收

| ID    | 結果 | 驗證                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-740 | ✅   | `GET /api/changes ?selection=` 三個 case（`{}` / 淨 text / 淨 banner）鎖住 `brandingChanged` / `bannerChanged` / `unchanged`；POST 加咗 icon 揀、text 唔揀 → icon 新值、text 上次值。`putIcon` 直寫 D1 繞過 PNG 驗證，註解有寫原因，可接受                                                                                                                                                                                                                                       |
| S-980 | ✅   | 接受較寬鬆驗證：`todoKey` = `kind/劇 ID[/短篇 ID]`，劇 ID 合 `ID_PATTERN`、短篇 ID 由 scan / `ARC_ID_PATTERN` 產生，冇空白冇 `/`，所以 `^[a-zA-Z]+(?:\/[^/\s]+){1,2}$` + ≤ 200 字元唔會誤擋現有 key，又擋到超長 / 空段 / 多段（4 個新 400 case）。`bodyLimit` 64 KB → 413（跟 `content/routes.ts` 同一寫法、同一 status 常數），422 `keys.slice(0, 20)`，各有 test。常數抽去 `selectionLimits.ts`、`publishBodyLimit` 放 `selectivePublish.ts` 冇問題；README / CHANGELOG 已同步 |
| S-981 | ✅   | 三行版本號同 `package.json` 一致；喺本地跑 `npm install --package-lock-only`（跑完還原）淨係多 `"peer": true` metadata，唔影響 `npm ci`，唔 commit 合理                                                                                                                                                                                                                                                                                                                          |
| S-982 | ✅   | 「本次發佈」/「不會在本次發佈」：i18n、mockup `:1320,1335`、CHANGELOG、test、e2e 一齊改；`src` 入面剩低嘅「今次」淨係註解，唔係介面文字                                                                                                                                                                                                                                                                                                                                          |
| S-983 | ✅   | `table.matrix tr.done` 已刪，`grep` 冇其他用處                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| S-984 | ✅   | 集數：`episodesOf` 搬去 `todoModel.ts`，TodoMatrix 同 SelectionCard 共用；entries 未載入就唔顯示集數；test + e2e 斷言「（20 集）」。meta 改「會自動」。「簡介已更改」唔做：API `appearance` 只有三個 boolean，要做就要改 API；plan「實作差異」已寫明，接受                                                                                                                                                                                                                       |
| S-985 | ✅   | `incompleteText(name, row)` 共用，`missing` 空就淨係出名（test 有 draft case）；`publish.incompleteItem` 已刪                                                                                                                                                                                                                                                                                                                                                                    |
| S-986 | ✅   | import `model/raw` 嘅 `isRecord`                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S-987 | ✅   | `changes.data` 未有 → 「下一步」灰 +「載入中…」，有 test。⚠️ 失敗狀態見 S-988                                                                                                                                                                                                                                                                                                                                                                                                    |
| e2e   | ✅   | 量 panel 之前先等兩條時間軸嘅 `.today-cell`，再 poll 到連續兩次一樣 + 合條件（容差 2 px、5 s 超時、常數有名）；邏輯啱，L2 要等 QA / CI 多跑幾次先確認                                                                                                                                                                                                                                                                                                                            |

## 評分結果（Re-review）

| 維度     | 得分    | 滿分    | 備注                       |
| -------- | ------- | ------- | -------------------------- |
| 正確性   | 25      | 25      | S-988 屬 🟢（冇 L1），唔扣 |
| 安全性   | 20      | 20      | S-980 加固完成             |
| 可維護性 | 20      | 20      |                            |
| 測試覆蓋 | 15      | 15      | W-740 已補                 |
| 性能     | 10      | 10      |                            |
| 代碼風格 | 10      | 10      |                            |
| **總分** | **100** | **100** |                            |

**結果：✅ pass**（hard gates 全過、冇 🔴 / 🟡）

## 新 🟢

- S-988 `UpdatePage.tsx:85`、`SelectionFooter.tsx:24`：`loading={changes.data === undefined}` 喺 `GET /api/changes` **失敗**時都係 true——頁底永遠顯示「載入中…」、「下一步」灰，頁面冇任何錯誤訊息（L2：臨時 test 用 `error: new Error('boom')`、`data: undefined` render → `disabled=true`、「載入中…」1 個、錯誤文字 0 個；跑完已刪）。之前撳得落去會喺確認發佈頁見到錯誤，而家用戶唔知要重新整理。冇 AC 講明（L1 缺），所以係 🟢；按用戶規則今個 session 修。修法：`SelectionFooter` 加 `error?: string`（`changes.error?.message`），有 error 時 `summaryOf` 回 `t('app.loadFailed', { error })`、掣照灰（App 外觀仍然未知，唔可以放行）；補一個 UpdatePage test（changes 失敗 → 見到「載入失敗…」、掣 disabled）

## Handoff receipt（Re-review）

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: invoke_developer
next_agent: frontend-developer
branch: "feature/selective-publish"
context: "Re-review @63f6297: W-740 + S-980..S-987 + e2e flake all verified fixed. New S-988 (🟢, user rule: fix this session, one commit `fix: S-988 | ...`): show app.loadFailed in SelectionFooter when GET /api/changes fails (keep 下一步 disabled) + UpdatePage test; reviewer re-checks only that diff, then QA S1. e2e flake fix needs CI/QA runs to confirm."
blockers: []
```

## Re-review 2（S-988）

- 日期：2026-11-13　審閱者：Code Reviewer　目標：`31a766d`（`fix: S-988 | ...`）　Tier：T2（只驗呢個 diff）
- Hard gates：all pass（lint、`tsc -b apps/admin`、`npx vitest run apps/admin/src/features/update/UpdatePage.test.tsx` 6/6；developer 本地 `npm test -- apps/admin` 585 綠）
- S-988 ✅ 已修：`SelectionFooter` 加 `error?: string`，`summaryOf` 有 error 先回 `t('app.loadFailed', { error })`（沿用現有書面語 key「載入失敗：{error}」，冇新介面文字），`canGo` 加 `error === undefined`；`UpdatePage` 傳 `changes.error?.message`。新 test 斷言「載入失敗：HTTP 500」、冇「載入中…」、「下一步：確認發佈」disabled（L2：還原 `UpdatePage.tsx` 去 `31a766d~1` → 呢個 test fail、其餘 5 個過；restore 後 6/6）
- Regression 檢查：`useResource` reload 失敗時會保留舊 `data` 同時設 `error`（例如 IconCard / TextCard / BannerCard 儲存後 `changes.reload()` 失敗）→ 而家頁底顯示錯誤、掣灰，直至下次成功載入。舊 data 未必反映啱啱儲存嘅 App 外觀，同 S-987「外觀未知就唔放行」一致，屬預期行為，唔算 regression；冇新 item

| 維度     | 得分    | 滿分    |
| -------- | ------- | ------- |
| 正確性   | 25      | 25      |
| 安全性   | 20      | 20      |
| 可維護性 | 20      | 20      |
| 測試覆蓋 | 15      | 15      |
| 性能     | 10      | 10      |
| 代碼風格 | 10      | 10      |
| **總分** | **100** | **100** |

**結果：✅ pass**（冇 🔴 / 🟡 / 新 🟢）

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: invoke_qa
next_agent: quality-assurance
branch: "feature/selective-publish"
context: "Re-review 2 @31a766d: S-988 verified fixed (footer shows app.loadFailed, 下一步 disabled; new test fails without fix). No new items. Proceed to QA S1. Report committed locally, not pushed (code CI running)."
blockers: []
```

## Re-review 3（未完成勾選框）

- 日期：2026-11-13　審閱者：Code Reviewer　目標：`74c0451`（`fix: hide the publish checkbox on incomplete rows, show 未完成 only`）　Tier：T2（只驗呢個 diff）
- 用戶要求：新內容表 `publish: 'incomplete'` 嘅行唔再出勾選框，最後一欄「發佈」淨係顯示「未完成」
- Hard gates：all pass（`npx eslint` 改咗嘅 src / test、`npx prettier --check` 改咗嘅 css / mockup / tsx、`npx tsc -b apps/admin`、`npx vitest run TodoMatrix.test.tsx todoModel.test.ts` 18/18；developer 本地 `npm test -- apps/admin` 585 綠、`npm run e2e:admin` 綠）
- 實作 ✅：`PublishCell` incomplete 分支改做 `<span className="lock" title={incompleteText(title, row)}>未完成</span>`，冇 `<label>` / `<input>`；unit test 斷言行內 `queryByRole('checkbox')` 冇、title 文字啱；「只有 selectable 行有勾選框」由 2 改 1；e2e `selectiveChecks.mjs` 改為搵 `row` → `getByTitle` → `getByText('未完成')`，並斷言行內冇 checkbox
- 仲有冇嘢靠灰色勾選框：grep `apps/admin/src`、`apps/admin/e2e`（`isDisabled` / `toBeDisabled` / `pick:disabled` / `尚未設定` / `.lock`）→ 淨係 `SelectionCard`（確認發佈頁）用 `incompleteText`，同勾選框無關；mockup script 由 `.pick:not(:disabled)` 改 `.pick`，冇 disabled 之後等價。CSS `td.pick-cell label` 仲畀 selectable 用，唔係 dead code
- 介面文字：冇新 string（`update.incomplete`「未完成」、`update.incompleteLabel`「{name}（尚未設定{missing}）」都係現有書面語 key）；mockup 介面文字冇改字
- 行為變化（Observation，唔開 item）：以前撳「未完成」格會撞正 `<label>`（`rowClick` 嘅 INTERACTIVE），唔跳頁；而家係普通 `span`，撳落去會成行跳去編輯頁。同 `TodoMatrix` 註解「成行撳入嗰項嘅編輯頁」一致，對未完成行仲方便啲（直接去補設定），屬預期
- Accessibility（用戶問）：`title` 喺冇 focus 嘅 `span` 上，鍵盤 / 觸控用戶睇唔到 tooltip，screen reader（例如 NVDA browse mode）多數唔讀；而行入面「設定」格嘅 accessible name 只係「大衛營：排期」（link），冇講明「尚未設定」，要靠推斷。不過確認發佈頁 `SelectionCard` 會完整讀出「以下項目尚未完成，不會在本次發佈：…大衛營（尚未設定排期）。」，頁底亦有「N 項未完成（不會發佈）」，資訊冇完全消失 → 冇 L1（冇 AC / SSoT 要求呢格要讀出缺咩），唔 block，記 🟢 S-989
- 🟢 S-989 `apps/admin/src/features/update/PublishCell.tsx:36`：缺咩設定只喺 `title`，screen reader / 鍵盤讀唔到。最小修正：喺 `.lock` 入面加 `<span className="sr-only">：{incompleteText(title, row)}</span>`（`.sr-only` 已喺 `app.css`，冇新介面文字；unit test `toHaveTextContent('未完成')` 同 e2e `getByText('未完成')` 係子字串 match，照過）；或者接受現狀，靠確認發佈頁嘅清單
- 🟢 S-990 文件過時：`apps/admin/CHANGELOG.md` 0.3.0（未 release）仲寫「`incomplete` 灰色勾選框 +「未完成」」；`apps/admin/src/styles/selective.css:3` header 註解仲寫「未完成灰色勾選框」→ 改做「`incomplete` 只顯示「未完成」（tooltip 列出未設定項目）」
- Version：0.3.0 未 merge / 未 release，同一個 release 入面嘅改動，唔使再 bump

| 維度     | 得分    | 滿分    |
| -------- | ------- | ------- |
| 正確性   | 25      | 25      |
| 安全性   | 20      | 20      |
| 可維護性 | 20      | 20      |
| 測試覆蓋 | 15      | 15      |
| 性能     | 10      | 10      |
| 代碼風格 | 10      | 10      |
| **總分** | **100** | **100** |

**結果：✅ pass**（冇 🔴 / 🟡；🟢 S-989、S-990 按 project 規則要喺今個 session 清：lane 喺 PR 內修，或者用戶決定 S-989 唔做）

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: invoke_qa
next_agent: quality-assurance
branch: "feature/selective-publish"
context: "Re-review 3 @74c0451: incomplete rows show 未完成 only, no checkbox; nothing else relies on the disabled checkbox; no new UI strings. Suggestions S-989 (sr-only missing-settings text) and S-990 (stale CHANGELOG 0.3.0 + selective.css header) must be cleared this session. Report committed locally, not pushed (code CI running)."
blockers: []
```

## Re-review 4（S-989 / S-990）

- 日期：2026-11-13　審閱者：Code Reviewer　目標：`185f41a`（`fix: S-989 S-990 | ...`）　Tier：T2（只驗呢個 diff）
- Hard gates：all pass（`npx eslint` / `npx prettier --check` 改咗嘅檔、`npx tsc -b apps/admin`、`npx vitest run TodoMatrix.test.tsx writtenChinese.test.ts` 10/10；developer 本地 admin unit 585 綠、`e2e:admin` 綠）
- S-989 ✅ 已修：`.lock` 入面加 `<span className="sr-only">：{incompleteText(title, row)}</span>`，screen reader 讀「未完成：天使之戀系列（尚未設定ID、圖片、排期）」；冇新 i18n key（只加全形「：」，非口語字），`.sr-only` 沿用 `app.css`。Test 改為斷言完整文字（L2：還原 `PublishCell.tsx` 去 `74c0451` → 呢個 test fail、其餘 8 個過；restore 後 9/9）。e2e `getByTitle(...).getByText('未完成')` 係子字串 match，照過；repo 內冇其他 exact match「未完成」嘅 selector
- S-990 ✅ 已修：`CHANGELOG.md` 0.3.0 改做「`incomplete` 只顯示「未完成」（冇勾選框，tooltip 列出未設定項目）」；`selective.css` header 改做「未完成（淨係文字，冇勾選框）」
- 冇新 item

| 維度     | 得分    | 滿分    |
| -------- | ------- | ------- |
| 正確性   | 25      | 25      |
| 安全性   | 20      | 20      |
| 可維護性 | 20      | 20      |
| 測試覆蓋 | 15      | 15      |
| 性能     | 10      | 10      |
| 代碼風格 | 10      | 10      |
| **總分** | **100** | **100** |

**結果：✅ pass**（冇 🔴 / 🟡 / 新 🟢；今個 session 嘅 review item 已清晒）

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: invoke_qa
next_agent: quality-assurance
branch: "feature/selective-publish"
context: "Re-review 4 @185f41a: S-989 (sr-only missing-settings text, test fails without fix) and S-990 (CHANGELOG 0.3.0 + selective.css header) verified fixed. No new items. Report committed locally, not pushed (code CI running)."
blockers: []
```

## Re-review 5（未完成紅字）

- 日期：2026-11-13　審閱者：Code Reviewer　目標：`06d8578`（`fix: show 未完成 in red (--danger-ink) on the update page`）　Tier：T2（只驗呢個 diff）
- 用戶要求：「未完成用紅字顯示」；`.lock` 由 `color: var(--muted)` 改 `font-weight: 600; color: var(--danger-ink)`（`selective.css` + mockup）
- Hard gates：all pass（`npx prettier --check` 兩個檔、`npx vitest run colorTokens.node.test.ts` 4/4（`selective.css` 冇 hardcode hex）；淨改 CSS，lint / tsc 唔受影響；developer 本地 `e2e:admin` 綠）
- Token ✅：用現有 `--danger-ink`（同 `theme.css` / `phase4.css` 錯誤字一致），冇新 token、冇 hex；`tokens.css` 淺色 `#b3262d`、深色兩段（`prefers-color-scheme` + `[data-theme='dark']`）都係 `#f6a9a2`，mockup 三段 token 值一樣
- AA 對比 ✅（12px / 600 屬一般字，要 ≥ 4.5:1；`.card` 底 = `--surface`，hover 行 = `--surface-2`）：淺色 `#b3262d` 對 `#ffffff` 6.50:1、對 `#f1f5f9` 5.93:1；深色 `#f6a9a2` 對 `#1b2635` 8.08:1、對 `#223043` 7.07:1。睇過 `update-selective-dark.png`：「未完成」紅字清楚，同「設定」紅掣一致
- `.lock` 影響範圍 ✅：admin 用 `.pick-cell .lock`，`className="lock"` 淨係 `PublishCell` 一處；`.box.locked` / `.handle.locked` 係另一個 class，唔中。Mockup 嘅 `.lock` 雖然係全域 selector，但成份 mockup 淨係一個 `class="lock"`
- 冇新 item

| 維度     | 得分    | 滿分    |
| -------- | ------- | ------- |
| 正確性   | 25      | 25      |
| 安全性   | 20      | 20      |
| 可維護性 | 20      | 20      |
| 測試覆蓋 | 15      | 15      |
| 性能     | 10      | 10      |
| 代碼風格 | 10      | 10      |
| **總分** | **100** | **100** |

**結果：✅ pass**（冇 🔴 / 🟡 / 新 🟢）

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: n/a
  tests: pass
  coverage: n/a
  no_critical: pass
  security_scan: n/a
next_action: invoke_qa
next_agent: quality-assurance
branch: "feature/selective-publish"
context: "Re-review 5 @06d8578: .lock uses existing --danger-ink token; AA contrast light 6.50/5.93, dark 8.08/7.07 (surface/hover); .lock scoped to PublishCell only. No new items. Report committed locally, not pushed (code CI running)."
blockers: []
```
