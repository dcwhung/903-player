# Code Review — 2026-11-10 — Backend Phase 2b-2：圖片上載 + prebuild snapshot（api v0.3.0、player v1.32.0）

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/funny-pasteur-29wbrn` `100fbb9..0fae3e7`（`3b855b3` PUT /api/assets、`df0fd26` S-786、`306011d` S-787、`64d7b0e` api 0.3.0、`6e84789` localizeDocument、`e9b8c25` bundled snapshot、`eb2a488` catalogSnapshot plugin、`f2ce3f2` player 1.32.0、`0fae3e7` backlog）
- SSoT（L1）：`.proj-docs/plans/2026-11-10_plan_phase2b-backend.md` §2b-2（用戶批准）、`.claude/CLAUDE.md`
- Tier：T3（新 mutating endpoint、D1 migration、build pipeline 改動、PWA precache 內容改變）
- 總評：上載守門齊（same-origin + session 喺 `/api/*` 最前；1 MB `bodyLimit` 喺讀 body 之前；415 / 413 / 422；白名單只有 600×600、1216×684；R2 先、D1 後；`ON CONFLICT DO NOTHING`）。WebP parser 每個讀取前都驗長度。S-786 / S-787 照 plan 改好。Snapshot 用同一套 validator 同 episode options，圖驗 sha256，先寫暫存再 rename，任何失敗都只係 warn，test / e2e 永遠用 library。冇 🔴 / 🟡

## Hard Gates

all pass

- Lint：改動嘅 `.ts` / `.mjs` 跑 `npx eslint` exit 0；改動檔跑 `npx prettier --check` 全過（`.gitignore` / `.sql` 冇 parser，唔計）；新 source 函數全部 ≤ 30 行（`max-lines-per-function` 掃過 `assets/*`、`publish.ts`、`catalogSnapshot.ts`、`source.ts`、`localize.ts`）
- Type：`npx tsc -b`（root 同 `apps/api`）exit 0
- Tests（只跑相關）：`npm test -- apps/api/test/{assets,webp,publish,scan,schedule} apps/player/scripts/catalogSnapshot apps/player/src/catalog/snapshot apps/player/src/catalog/dramas/lib/episodeOptions packages/catalog/src/document` → 11 檔 162 pass；`bundledSource` 嘅 consumer（`e2eFixtures`、`bundledSource`、`catalogJson`、`runtimeImportOrder`、`runtime`）→ 5 檔 27 pass。冇跑 full suite / e2e（CI `0fae3e7` 跑緊）
- Coverage：`catalogSnapshot.ts` lines 98.9% / branch 87.5%；`source.ts` 100% / 83.3%。Worker 量唔到 v8 coverage：上載 9 case（201 / 200 existed / >256 KB / 415 / 413 / 422 壞檔 / 422 尺寸 / R2 失敗唔 insert / 401 + 403）、parser 7 case（三種 chunk、scale bit、假 magic、截短、未知 chunk / 壞 signature）逐條對過 code path
- Security：冇新依賴（lockfile 只改兩個 workspace version）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                      |
| -------- | ------- | ------- | --------------------------------------------------------- |
| 正確性   | 25      | 25      | S-786 雙重失敗、S-787、snapshot fallback 全部有 test      |
| 安全性   | 20      | 20      | 守門、body limit 先於讀 body、parser 有界、hash integrity |
| 可維護性 | 20      | 20      | 函數短、常數有名（S-791 只係零星 offset）                 |
| 測試覆蓋 | 15      | 15      | plan「驗證」列嘅 unit case 全部有                         |
| 性能     | 10      | 10      | S-789、S-790（唔扣分）                                    |
| 代碼風格 | 10      | 10      | lint / prettier 過                                        |
| **總分** | **100** | **100** |                                                           |

**結果：✅ pass**

## Developer 報嘅偏差（逐條判斷）

| #   | 偏差                                                                       | 判斷                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | snapshot 寫去 `snapshot/data/`（+ `data.tmp/`），gitignore 呢兩個          | 接受。plan 要 ignore 成個 `snapshot/`，但 tracked 嘅 `source.ts` 一定要喺 glob 隔籬；兩個 folder 同層，`rename` 喺同一個 filesystem，atomic 成立                                                     |
| 2   | `runnerImport` 喺 buildStart 載 `@903-player/catalog`；test 注入           | 接受。config load 唔使 import workspace TS；plugin 失敗都喺 `snapshotOnce` 嘅 try 入面（載唔到 package 都係 warn + library）                                                                         |
| 3   | `episodeOptionsFor(BASE_PATH)`                                             | 接受。test 鎖住 `episodeOptionsFor(BASE_URL)` 等於 `PLAYER_EPISODE_OPTIONS`；`vite.config` 嘅 `base` 同傳入值都係 `BASE_PATH`，build 驗證同 runtime 一致                                             |
| 4   | 每次 `command==='build'` 都清舊 snapshot；三個條件齊先 fetch；dev 唔郁     | 接受，比 plan 更穩（e2e / 冇 URL build 都唔會用殘留）。dev server 會讀本機殘留 → S-793（Observation）                                                                                                |
| 5   | `LIBRARY_ONLY_MODES`（test / e2e）；snapshot 壞 → warn + library           | 接受。`source.test.ts` 鎖住 unit test 入面 `snapshotDocument === undefined`，所以 `catalogJson` / 每劇 test 繼續測 library；e2e 有兩重保險（build 清 data + mode 判斷）                              |
| 6   | Plugin test 用真 temp dir + mock fetch                                     | 接受。rename / rm / leftover 都係真 fs 行為先測得到                                                                                                                                                  |
| 7   | `GET /api/publishes` 加 `status`；`current` = 最新 ok；雙重失敗 rethrow R2 | 接受。`discardPublish` 嘅 `.catch` 只吞 mark 嘅錯，原本 R2 error 照 throw；test 驗 failed 行唔計 unchanged、ID 守衛同 `current`                                                                      |
| 8   | 圖 glob 用 `?no-inline`                                                    | 接受。`parseCatalogDocument` 要圖 URL，`?url` 會將 < 4 KB 圖變 data URI 令成份 snapshot 驗唔過；developer 報 742-byte 圖已入 `dist/assets` + precache                                                |
| Obs | Library glob eager，用 snapshot 時 library 圖照入 bundle / precache        | 同意，記 S-789。D1 圖現時同 library 一樣（`importLibrary.mjs` 同 hash），Rollup 對相同內容去重；admin 換圖之後兩份都會 precache，加上 library JSON 照 inline，影響隨 D1 同 repo 分歧而增加，暫時唔大 |

## 其他重點核對

- `assetRoutes` 掛喺 `contentRoutes` 前：`contentRoutes` 嘅 256 KB `'*'` middleware 唔會擋圖，test「>256 KB → 201」有 L2
- `hasAsset` 喺 parse 之後：已存在但唔合白名單嘅舊圖（6 張 1216×608）再上載會 422，唔會 200；符合「上載只收白名單」
- Migration `0003`：`ADD COLUMN … NOT NULL DEFAULT 'ok' CHECK (…)`，SQLite 容許（default 非 NULL），舊行全部 `ok`；test 環境 apply migration 後 publish test 全過
- `withTimeout` 用 `Promise.race`，遲咗嘅 reject 已有 handler，冇 unhandled rejection
- PWA：`globPatterns` 已包 `webp` / `jpg`，SW 策略冇改；player 1.31.2 → 1.32.0、api 0.2.0 → 0.3.0 同 plan 一致，lockfile 同步
- TDD：test 同實作喺同一個 commit，history 睇唔到 red-first；請 developer 喺 PR description 補一句 TDD 執行說明（唔扣分）

## 🟢 / Observation（入 backlog）

- S-789 `apps/player/src/catalog/{dramas,shows}/lib/bundledSource.ts`：library glob eager，有 snapshot 時 library JSON + 圖照入 bundle / precache；可改由 plugin 提供 virtual module，build 時二揀一
- S-790 `apps/player/scripts/catalogSnapshot.ts` `runPool`：一張圖失敗後其他 worker 繼續下載餘下嘅圖（每張最多 15 s）；`rm(tmp)` 同未完嘅 `writeFile` 競爭，可能留低 `data.tmp/`（下次 build 會清，唔影響結果）；加 abort flag
- S-791 `apps/api/src/assets/webp.ts`：`fourcc(bytes, 8)`、`uint32(bytes, 4)`、`FIRST_CHUNK + 4`、fourcc 長度 `4` 未命名，其他 offset 都有常數
- S-792 `apps/api/src/assets/webp.ts`：只驗 header（plan 範圍）；淨係得 VP8X chunk、冇 VP8 / VP8L 圖像資料，或者 VP8 非 keyframe，都會通過；Phase 3 admin 上載前可用 `createImageBitmap` decode 一次
- S-793 `apps/player/src/catalog/snapshot/source.ts`：`vite` dev（mode `development`）會用本機上次 production build 留低嘅 `data/`，改 library 喺 dev 睇唔到；README「唔會用本機殘留」只講 build
- S-794 `apps/api/src/catalog/routes.ts` rollback：可以還原去 `failed` 行（嗰份從未上過 R2）；結果無害（照行 validator + ID 守衛），ops 頁 Phase 3 可隱藏或 API 回 409

## ✅ 做得好嘅地方

- 上載驗證次序（content-type → body limit → parse → 白名單 → hash → R2 → D1）乾淨，每步都有獨立 test
- Snapshot「永不 fail build」做得徹底：載 package、fetch、validate、hash、寫檔全部喺同一個 try，失敗清暫存
- `snapshotDocument` 喺 test mode 鎖死做 `undefined`，避免本機 build 殘留污染 unit test

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T3
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: "pass (11 files / 162 + bundledSource consumers 5 files / 27, related only)"
  coverage: "catalogSnapshot.ts 98.9% lines, source.ts 100%; Worker routes / webp parser branch-checked by test names"
  no_critical: pass
  security_scan: "n/a (no new dependencies)"
next_action: invoke_qa
next_agent: quality-assurance
branch: "claude/funny-pasteur-29wbrn"
context: "Phase 2b-2 pass 100: 0 Critical / 0 Warning; deviations 1-8 + eager-glob observation accepted; S-789..S-794 to backlog. QA S1 chains api, catalog-data, pwa-shell, repo-tooling after CI on 0fae3e7 green. TDD: tests in same commits as code, ask developer for red-first note in PR. Report committed locally, not pushed (code CI on 0fae3e7 running)."
```
