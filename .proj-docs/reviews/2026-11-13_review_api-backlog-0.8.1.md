# Code Review — Phase 4 L1 review backlog S-900..S-905（api 0.8.1）

- 日期：2026-11-13
- 審閱者：Code Reviewer（獨立）
- 目標：`fix/api-backlog-0.8.1` @ `80349d8`，`git diff $(git merge-base HEAD origin/main)..HEAD`（base `df90c05`，只限 `apps/api`）
- 對照：`.proj-docs/reviews/2026-11-12_review_api-phase4-0.8.0.md` 嘅 S-900..S-905
- Tier：T1（backlog 清理；`GET /api/publishes` 加一個欄位，其他 contract 唔變）
- 總評：六項都有處理，而且每項都有 test。S-900 改用「`audio.folder` + `/` 係 key 前綴」，同 `/sources` 用同一個 prefix，白名單照舊係掃描結果 exact match，冇開到任意 key。S-901 新增 `parseWebpHeader`，只 range get 頭 30 bytes；佢同 `parseWebp` 共用 `checkMagic` / `firstReader` / `readChunk`，冇抄一份 parser。S-902 用 `MISSING` / `INVALID` 兩個值分開報錯。S-903 嘅 `bannerChanged` 係加欄位（`PublishChangeSummary extends ChangeSummary`）。S-904 / S-905 改動細，冇問題。API contract 只有加欄位，README / CHANGELOG 同 code 對得上。有一項 🟡：S-900 「folder 互相包住」嗰個 test 驗唔到新加嘅「逐套掃」loop（mutation 改做只掃第一套，test 照綠）。

## Hard Gates

all pass。

- 喺 repo root 跑 `npm run lint`（`eslint .` + `prettier --check .`）：exit 0
- `npx tsc -b`（apps/api）：exit 0
- `npx vitest run --config vitest.config.ts`，跑 `banner` `webp` `imageName` `r2Source` `publish` `adminRoutes` `auth` `assets` `publishWarnings` `health` 10 個相關 test 檔：169 tests pass
- 冇跑 full suite 同 e2e（Hard Rule #7，由 QA / CI 負責）。Coverage n/a（workers pool 冇量度）；新模組 `imageName.ts` 同新 export `parseWebpHeader` 都有專屬 test。Security：冇新依賴

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                                                      |
| -------- | ------ | ------- | ----------------------------------------------------------------------------------------- |
| 正確性   | 25     | 25      | 前綴配對 + exact match 白名單；header 截短照 throw；`bannerChanged` 第一次 publish 都啱   |
| 安全性   | 20     | 20      | 白名單仍然來自即場掃描；`image/jpg` 只係 alias，回應 Content-Type 照跟副檔名 + `nosniff`  |
| 可維護性 | 20     | 20      | parser 抽 `checkMagic` / `firstReader` 共用；常數有名（`WEBP_HEADER_BYTES`、`*_ALIASES`） |
| 測試覆蓋 | 10     | 15      | W-732：「folder 互相包住」test 驗唔到逐套掃 loop                                          |
| 性能     | 10     | 10      | banner PUT 由最多 2 × 1 MB 減到 2 × 30 bytes；r2-source 只係 folder 互相包住先會多掃一套  |
| 代碼風格 | 10     | 10      | lint / prettier 通過；註解書面語                                                          |
| **總分** | **95** | **100** | 結果：pass（1 個 🟡，同一個 PR 修）                                                       |

## 🔴 / 🟡

### W-732 🟡 `apps/api/test/r2Source.test.ts:186`（對應 `apps/api/src/content/sources.ts:115`）：「folder 互相包住」test 驗唔到逐套掃

- L1：Review 檢查清單 🟡「缺少或不足嘅測試覆蓋」；test 名寫明 `should find the key under whichever drama folder scans it`，但係實際驗唔到呢樣嘢
- L2：將 `sources.ts:115` 改做只掃第一套劇（`(await dramasCoveringKey(env.DB, key)).slice(0, 1)`），`r2Source.test.ts` 19 個 test 照全綠。原因：test 用嘅 key `${FOLDER}/外傳/Cover Photo.jpg`，喺外層劇 `FOLDER` 嘅掃描入面本身已經係短篇「外傳」嘅 `coverPhoto`，所以邊套劇先掃都會中。另外將 `sources.ts` 還原做 `df90c05` 版本（只改 S-904），呢個 test 一樣過，淨係 S-900 多層 folder 嗰個 test 會 fail
- L3：只有內層劇嘅掃描先會列出、外層掃唔到嘅 key（例如 `${FOLDER}/外傳/Season 1/cd cover.png`，喺外層係第 3 層）先需要呢個 loop。將來如果有人改返做 `.find` 或者只取第一套，冇 test 會擋住，admin 就會靜靜雞 404
- 方案 A（推薦）：test 改用只有內層劇先掃到嘅 key：`put(\`${inner}/Season 1/cd cover.png\`, PHOTO_BYTES, 'image/png')`，再 call `source()`驗 200。如果`listStoredEntries` 嘅次序令內層劇排先，就要確保外層劇排先（或者兩個次序都 seed 一次），咁 test 先真係會經過「第一套唔中、第二套中」嗰條路
- 方案 B：將「搵候選劇」同「逐套驗」拆開，用 pure function 做 unit test（例如 export `dramasCoveringKey` 驗佢回幾套）。好處係唔使靠 R2 fixture，但係驗唔到「掃到就停」嘅 integration 行為

## 🟢 Suggestion / Observation（同一個 PR 處理；唔扣分）

- S-945 `apps/api/package.json:4`、`apps/api/CHANGELOG.md:5`：`GET /api/publishes` 加咗 `bannerChanged`，CHANGELOG 亦列喺 `### Added`。按 `sw-git-flow` §版本號規範，新功能（向後兼容）應該係 MINOR（0.9.0），但係 0.7.1（`860dd38` 加欄位）用過 PATCH，repo 有先例，所以只係 🟢。建議：bump 去 `0.9.0`（同步改 `package-lock.json`、CHANGELOG 標題、commit），或者保留 0.8.1，但喺 CHANGELOG 0.8.1 段頭寫明「加欄位當 PATCH，跟 0.7.1 慣例」
- S-946 `apps/api/src/admin/changes.ts:144-146` 同 `:111`：`publishedBannerChanged` 同 `bannerChanged` 都係自己做 `JSON.stringify(a) !== JSON.stringify(b)` 比 banner。建議抽 `const sameBanner = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)`，兩邊都用佢，咁將來改比較方式（例如 key 次序）只需要改一個地方
- S-947 `apps/api/src/content/sources.ts:100-111`：`dramasCoveringKey` 先 `map` 再用 type guard `filter`，可以用一個 `flatMap` 寫得短啲（`const folder = r2FolderOf(d); return folder !== undefined && key.startsWith(…) ? [{ folder, definition: d }] : []`）。另外建議按 `folder.length` 由長到短排：最深嗰套劇一定掃得到自己嘅 key，咁 folder 互相包住時通常掃一次就中
- S-948 `apps/api/src/assets/webp.ts:196`：`parseWebpHeader` 為咗 call `readChunk` 砌咗個 `Chunk`，但 `next: PAYLOAD + declared` 從來冇人用。建議改做直接 call `firstReader(kind)`，用 `payload.length < reader.minPayload` 檢查之後 `reader.read(payload)`；或者將 `readChunk` 嘅參數收窄做 `Pick<Chunk, 'kind' | 'payload'>`，咁就唔使砌假 `next`
- Observation `apps/api/src/banner/routes.ts:39`：R2 object 短過 30 bytes 時，range get 喺 miniflare 會截短回傳（test 用 23 bytes 嘅 HTML 通過）。Production R2 binding 遇到 length 超出 object 大小，係咪一樣截短而唔係 throw，我未喺真 R2 驗過（L2 未收斂）。真正嘅 banner 一定大過 30 bytes，所以影響得「R2 被人手放咗細檔」呢個情況。可以喺 staging 用一個細檔試一次 `PUT /api/banner`
- Observation `apps/admin/src/api/types.ts:89`：admin 嘅 `changes: ChangeSummary` 未有 `bannerChanged`（今次 scope 只限 apps/api，加欄位唔會整壞 admin）。admin 歷史頁要顯示「換咗 banner」時要跟住加

## ✅ 做得好嘅地方

- `parseWebp` 拆做 `checkMagic` / `firstReader` 之後，兩個 parser 用同一套 magic 同 reader 檢查，冇抄 code；`WEBP_HEADER_BYTES` 由各格式嘅 `minPayload` 計出嚟，唔係 magic number。
- S-901 test 用 `vi.spyOn(env.CATALOG, 'get')` 驗兩次 get 都係 range 30 bytes，鎖住「唔再讀成個檔」呢個行為。
- S-903 test 一次過驗三次 publish（換 banner、刪 banner、第一次冇 banner），`items` 係空但 `bannerChanged` 分得出。

## 修訂代碼

W-732（`apps/api/test/r2Source.test.ts:186`，示意；`drama(3)` / `putEntry` / `put` / `source` 沿用檔內 helper）：

```ts
it('should find the key under whichever drama folder scans it (nested drama folders)', async () => {
    const inner = `${FOLDER}/外傳`;
    await putEntry('dramas', 'side', {
        ...drama(3),
        audio: { host: 'r2', folder: inner, file: '{no2}.m4a' },
    });
    // 外層劇 FOLDER 只掃到 <FOLDER>/<短篇>/<檔>；呢個 key 喺外層係第 3 層，只有內層劇掃得到
    const deep = `${inner}/Season 1/cd cover.png`;
    await put(deep, PHOTO_BYTES, 'image/png');
    const response = await source(deep);
    expect(response.status).toBe(200);
    await response.arrayBuffer();
    const outer = await source(DRAMA_PHOTO);
    expect(outer.status).toBe(200);
    await outer.arrayBuffer();
});
```

（已經喺本地試過：用上面嘅 test，原本 code 19 個全綠；`sources.ts:115` 改做 `.slice(0, 1)` 之後呢個 test fail。即係現有 fixture 次序下外層劇排先，test 真係會行「第一套唔中、第二套中」嗰條路。試完已經還原。）

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "fix/api-backlog-0.8.1"
context: "api 0.8.1 backlog S-900..S-905 @ 80349d8; C=0, W=1 (W-732 nested-folder test does not exercise multi-drama loop), S-945..S-948 + 2 observations; contract additive only, README/CHANGELOG match; main agent fixes all in same PR; integration branch is main; report committed locally, not pushed"
```
