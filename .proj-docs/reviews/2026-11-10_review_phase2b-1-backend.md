# Code Review — 2026-11-10 — Backend Phase 2b-1：內容 API + R2 掃描 + 排程（api v0.2.0、player v1.31.2）

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/funny-pasteur-29wbrn` `a46093f..c1f0baa`（`66f4808` scan 抽核心、`0418dc4` expandSchedule、`35c56c9` S-767/768/770/772/773/780、`aae0f8c` content CRUD / scan / schedule、`c1f0baa` docs + bump）
- SSoT（L1）：`.proj-docs/plans/2026-11-10_plan_phase2b-backend.md` §2b-1（用戶批准）、`.claude/CLAUDE.md`
- Tier：T3（新 mutating endpoint、D1 migration、新 R2 binding、auth 改動）
- 總評：守門完整（`/api/*` 全部經 `requireSameOrigin` + `requireSession`，S-768 whitelist 即時失效）、SQL 全 parameterized、AUDIO 只 `list`、body 256 KB、episode ID 冇路徑可以被改。3 條 🟡：排程寫入喺同一 ms 並發時唔 atomic、超大日數令 API 500、scan 合併靜靜雞跌咗短篇嘅上下架欄位

## Hard Gates

all pass

- Lint：`npx eslint apps/api/src apps/api/test packages/catalog/src/{scan,schedule} apps/player/scripts` exit 0；新 source 函數全部 ≤ 30 行（`max-lines-per-function` 掃過）
- Type：`npx tsc -b` exit 0
- Tests（只跑相關）：`npm test -- packages/catalog/src/scan packages/catalog/src/schedule apps/api apps/player/scripts/dramaFromFolder apps/player/src/e2eSrcConstants` → 16 檔 254 pass。冇跑 full suite / e2e（CI `c1f0baa` 跑緊）
- Coverage：`scan/**` + `schedule/**` lines 98.85% / branch 88.3%（`expandSchedule.ts` 95.7%、`merge.ts` 97.9%）；Worker 量唔到 v8 coverage，逐條 route 對過 test（entries 20、scan 7、schedule 9、publish / auth 新 case 6）
- Security：新 devDep `tsx` 4.23.15（MIT，lockfile `license` 已核）；`npm audit` 17（low 3 / moderate 14 / high 0 / critical 0），冇一個嚟自 `tsx` / `esbuild`

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                    |
| -------- | ------ | ------- | --------------------------------------- |
| 正確性   | 10     | 25      | W-703、W-704、W-705                     |
| 安全性   | 20     | 20      | 守門、CSRF、parameterized SQL、只 list  |
| 可維護性 | 20     | 20      | 函數短、常數有名、CLI 變薄              |
| 測試覆蓋 | 15     | 15      | 412 / 422 / 409 / 413、S-767 失敗路徑齊 |
| 性能     | 10     | 10      | 見 S-788（唔扣分）                      |
| 代碼風格 | 10     | 10      | lint / prettier 過                      |
| **總分** | **85** | **100** |                                         |

**結果：⚠️ warn**

## 🟡 W-703 `content/schedule.ts:151-162` + `store.ts:198-215` 排程規則喺同一 ms 並發寫入時唔 atomic

- L1：plan §4「D1 `batch()` 一次過寫 `schedules` + `entries`（atomic）」；`store.ts:194-196`、`schedule.ts:4`「樂觀鎖失敗兩樣都唔寫」
- L2：store 層 test（臨時檔，已刪）：winner 用 `nextUpdatedAt(old, now)` 更新 entry；loser 用同一個 If-Match、同一 ms 計出同一個 `updatedAt` 跑 batch → `entry changes=0`（回 412），但 `schedules` 已經寫入 loser 嘅 rule。原因：`upsertScheduleStatement` 只睇「entry 嘅 `updated_at` = 新值」，兩邊新值一樣
- L3 影響：雙擊 / client retry 就會中；`schedules.rule` 同 definition 嘅日子唔夾，Phase 3 admin 之後由錯規則再展開。Episode ID 唔受影響
- 方案 A（推薦）：upsert 加 `AND changes() = 1`（同一 batch transaction 入面 = 上一句 UPDATE 嘅 changes），一行改動，保證「entry 冇寫就唔寫規則」
- 方案 B：`updated_at` 加隨機後綴（或者另開 version column），令兩個 writer 冇可能撞同一個值；改動大啲但 ETag 亦唔會撞
- 補 test：跟上面 L2 嘅寫法（winner 先寫 X，loser 用同一個 X）

## 🟡 W-704 `schedule/expandSchedule.ts:180-198` 超大 `every.days` / `removeAfterDays` → `RangeError`，API 回 500

- L1：plan §4 PUT ③「唔過 → 422」；`rule.ts:2`「數值範圍喺 expandSchedule 展開時驗」
- L2：`expandSchedule({ kind: 'periodic', …, every: { days: 100000000 } }, { firstNo: 1, count: 3 })` 同 `removeAfterDays: 1e9` 都拋 `RangeError: Invalid time value`（唔係 `ScheduleError`）；`schedule.ts:107-108` 只接 `ScheduleError`，其他照拋，app 冇 `onError` → 500
- 方案 A（推薦）：`checkPositiveInteger` 加上限（例如 `MAX_SCHEDULE_DAYS = 3660` 具名常數），`every.days` / `removeAfterDays` 共用
- 方案 B：`addDays` 結果過 `isCalendarDate`，唔合就 `ScheduleError`；唔使揀上限但錯誤訊息冇咁直接

## 🟡 W-705 `scan/merge.ts:18,264-272` scan 合併跌咗短篇嘅 `episodeDates` / `episodeRemovedAt` / `removedAt`，issues 冇提

- L1：plan「episode ID、storage key、上下架結果唔准無聲改變」；`merge.ts:2-3`「人手欄位照留…唔好靜靜雞改」
- L2：現有 arc 有 `episodeDates`、`episodeRemovedAt`、`removedAt`，folder 冇變 → `generateDraft` 出 `{"id":"a","name":"甲","addedAt":"2026-11-01","episodes":3}`，`issues = []`
- L3 影響：2b-1 新加嘅排程 PUT 正正寫呢三個欄位；admin 跟 plan 流程「scan → 覆核 → PUT draft」就會靜靜雞清走排程 / 下架日（`diff` 有列，但 issues 冇 warn，PUT warnings 只睇 ID）。舊 CLI 同樣行為（parity），但 2b-1 先有寫入呢啲欄位嘅路
- 方案 A（推薦）：`HAND_WRITTEN_ARC_KEYS` 加 `removedAt` / `episodeDates` / `episodeRemovedAt`；6 套 library 劇冇 arc 層呢啲欄位，parity 唔受影響。集數變咗而 key 超出範圍嘅交俾 PUT validator 422
- 方案 B：保留現行，但欄位會被清走時出 `warn` issue；admin 仍要手動補返

## 🟢 / Observation（入 backlog，唔 block）

- S-785 `scan/names.ts` `findSuspicious`、`merge.ts:128` 訊息講「--verify」/「本機 folder」，API scan issues 照出（偏離 10）；Phase 3 admin UI 前改中性字眼或者加 `source` 參數
- S-786 `publish.ts:163-170` S-767 失敗路徑：R2 put 失敗之後 `deletePublish` 再失敗 → 留低冇寫入 R2 嘅行，下次同內容 publish 會被 S-780 判 `unchanged`，R2 永遠唔更新。`unchanged` 判斷可以加對 R2 `head` 嘅 `customMetadata.hash`
- S-787 `content/schedule.ts:55`、`scan.ts:199` id 唔合規回 404，`/entries` 回 400；統一用 `badTarget`
- S-788 `PUT /entries` warnings / `DELETE` 每次讀成份 publish `document`（只係要 ID / show id）；加淨讀 `episode_ids` 嘅 query

## Developer 聲明嘅偏離

1. ✅ `FolderListing.name`（R2 = `audio.folder`，scan 名檢查要用）、第二層 folder「名/」、隱藏第一層 folder 略過：同舊 CLI 一致
2. ✅ Code point 比較 = UTF-8 byte 次序（Unicode 性質），Worker 冇 `Buffer`；註解講清楚 UTF-16 陷阱
3. ✅ 劇集照 plan 字面睇 episode ID；節目睇 document 更嚴。Observation：已 publish 但 0 集（未上架）嘅劇可以刪，下次 publish 冇 ID 消失，可接受
4. ✅ 412：plan「唔對 → 412」字面；DELETE If-Match 可選，plan 冇要求；壞 kind / id 400
5. ✅ 形狀合理；422 只出第一個錯同 validator 行為一致
6. ✅ 第一批 = start 或之後第一個合規星期幾（`addedAt` 跟實際第一批）；單集 key「3」= `availabilitySchema` 格式；1000 係具名常數
7. ✅ 規則係嗰個短篇日子嘅 SSoT，覆寫合理；但同 W-705 一齊睇
8. ⚠️ 順序寫入啱，並發同一 ms 會撞 → W-703
9. ✅ `INIT_CWD` 由 npm / npx 設；直接 `tsx` 跑冇呢個 env，cwd 不變
10. ⚠️ 接受做 parity，記 S-785
11. ✅ `latestPublish` 係 `latestEpisodeIds` 超集；export 冇破壞 public API

## ✅ 做得好嘅地方

- Same-origin + session 喺 router 層一次過蓋晒新 route；`bodyLimit` 有 413 test；R2 listing 跟 cursor、略過 folder marker
- 樂觀鎖用 SQL `WHERE updated_at = ?` 同 `ON CONFLICT DO NOTHING`，唔靠 read-then-write
- `expandSchedule` 最後再過 `availabilitySchema` 同一套 validator，PUT 再驗成份 definition，雙重防線

## 修訂代碼（W-703 方案 A、W-704 方案 A、W-705 方案 A）

```ts
// store.ts upsertScheduleStatement：上一句 UPDATE 冇寫（樂觀鎖輸咗）就唔寫規則（W-703）
`INSERT INTO schedules (drama_id, arc_id, rule, updated_at)
 SELECT ?, ?, ?, ? WHERE changes() = 1 AND EXISTS
   (SELECT 1 FROM entries WHERE kind = 'dramas' AND id = ? AND updated_at = ?)
 ON CONFLICT …`;

// expandSchedule.ts：日數上限，防 addDays 出界（W-704）
const MAX_SCHEDULE_DAYS = 3660;
const checkDays = (value: number, path: string): void => {
    checkPositiveInteger(value, path);
    if (value > MAX_SCHEDULE_DAYS) fail(`${path} must be at most ${MAX_SCHEDULE_DAYS}`);
};

// merge.ts：上下架欄位都係人手 / 排程寫嘅，照留（W-705）
const HAND_WRITTEN_ARC_KEYS = [
    'disc',
    'tile',
    'addedAt',
    'removedAt',
    'episodeDates',
    'episodeRemovedAt',
];
```

```handoff-receipt
protocol: 1
status: warn
score: 85/100
stage: T3
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: "pass (16 files / 254, related only)"
  coverage: "scan+schedule 98.85% lines; Worker routes branch-checked by test names"
  no_critical: pass
  security_scan: "pass (tsx MIT; audit 17 pre-existing, 0 high/critical)"
next_action: invoke_developer
next_agent: developer
branch: "claude/funny-pasteur-29wbrn"
context: "Phase 2b-1 warn 85: W-703 schedule upsert not atomic on same-ms concurrent PUT (add changes()=1), W-704 huge every.days/removeAfterDays -> RangeError 500 (cap days), W-705 scan merge drops arc removedAt/episodeDates/episodeRemovedAt silently (keep keys). One commit per item `fix: W-70x | …`, then re-review. Deviations 1-11 accepted (8 -> W-703, 10 -> S-785). S-785..S-788 to backlog. Report committed locally, not pushed (code CI on c1f0baa running)."
```
