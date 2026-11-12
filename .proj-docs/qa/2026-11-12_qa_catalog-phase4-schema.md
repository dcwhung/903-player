# QA — Phase 4 L0 `packages/catalog` schema — 2026-11-12 — S1

- Tier: T2（新 schema 欄位 + 共用常數，跨 catalog / api / admin）| Commit: `ad5725c` | Verdict: ✅ pass
- Ledger（base `bffa7ea` = merge-base origin/main）: SKIP 10 / REVERIFY 4（`catalog-data` `drama` `api` `admin`）/ UNCOVERED 4（`packages/catalog/src/{assets/dimensions,theme/contrast}{,.test}.ts` → 併入 `catalog-data`）
- Plan：`plans/catalog-data.md` 加 AC-7 + scope + 指令；`plans/drama.md` 加 AC-10（scan 封面角色）；`plans/api.md` 1-hop 加 `assets/dimensions.ts`；`plans/admin.md` 沿用
- Freeze 後 `impact` 仍列 `catalog-data` / `drama` REVERIFY：淨係 2026-11-04 baseline 嘅 S3 行（舊 `src/…` path 早已 deleted + plan hash），S1 行全部 FROZEN；S3 留畀 release QA
- Review：`.proj-docs/reviews/2026-11-12_review_catalog-phase4-schema.md`（100/100，S-891–S-893 唔重複）

## Runs

| Command                                                                                                               | Result                          | Time   |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------ |
| `npm test -- <catalog-data + drama plan filters> packages/catalog/src/assets packages/catalog/src/theme`              | 88 files / 1346 tests pass      | 30 s   |
| `npm test -- apps/api packages/catalog/src/schedule`                                                                  | 16 files / 309 tests pass       | 10 s   |
| `npm run test -w apps/api`                                                                                            | 13 + 1 files / 217 + 12 pass    | 11 s   |
| `npm run test -w apps/admin`                                                                                          | 77 files / 369 tests pass       | 30 s   |
| `npx tsc -b`                                                                                                          | exit 0                          | 12 s   |
| `npx vitest run --project @903-player/catalog <assets theme document scan> --coverage.enabled --coverage.provider=v8` | 208 pass；coverage 見 Gates     | 5 s    |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`                                                              | 782 PASS / 0 FAIL（全 section） | 10.4 m |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e:admin`                                                        | 39 PASS / 0 FAIL                | 51 s   |

- Player e2e 理由：`document.ts`（`parseCatalogDocument`）入 player bundle，plan 列「Remote catalog」section（冇單 section runner，所以全跑一次）；admin e2e：`SLOT_SIZES` 改 import（PNG → WebP slot）
- 冇跑：api `wrangler dev` smoke / drama CLI smoke（L0 淨係常數搬家 + scan 加選填欄位，上載白名單同 CLI 輸出唔變；`assets.test.ts`「422 listing the allowed sizes」仍係 `['600×600', '1216×684']`）
- 跑完冇殘留 `vite preview`；code 未 push，冇 CI run 可引用

## 驗證要點（L2）

- Scratchpad probe（臨時 test，跑完刪）：`banner` 淨 `standard` / `null` / 多 key / `http:` / `//evil` → runtime 拒絕 + ajv `catalog.schema.json` 亦 false；`https://…` + `/b.webp` 兩邊都過 → parser ↔ schema 一致
- `contrastRatio('#000000','#FFFFFF') = 21`、同色 = 1；`ASSET_DIMENSIONS` 4 個 slot 數字同 spec 一樣、`Object.isFrozen`
- `scanListing`：`CD Cover.JPG` + `cd cover.png` → `cdCover = 'CD Cover.JPG'`（byte 次序第一）、`Cover Photo.webp` → `coverPhoto`；`cover photo.txt`、`cd cover/` folder 唔配對；短篇層各自配對；全部圖仍喺 `covers`

## Hard Gates

all pass。Coverage（改動 source，lines / branches）：`document.ts` 100 / 94.9、`listing.ts` 100 / 94.4、`contrast.ts` 100 / 85、`dimensions.ts` 100（skipFull）；api `config.ts` / `routes.ts`、admin `imageUpload.ts` 淨改 import，由現有 `assets.test.ts` / `ImageSlot.test.tsx` 覆蓋

## Findings

- 冇 🔴 / 🟡 / 🟢
- 範圍外（唔係 finding）：`localizeDocument` 用 `...doc` 原樣帶 `banner` remote URL；snapshot 下載 banner 屬 L3 plan §2

## 建議補測

- none（banner 缺一張 / 多 key、slot 常數、封面檔名大細楷 / folder / 非圖、contrast 已知值 + 認唔到色已有 test）

```handoff-receipt
from: quality-assurance
stage: S1
status: pass
chains: catalog-data S1 (re-frozen, +4 new assets/theme files, plan AC-7); drama S1 (re-frozen, plan AC-10); api S1 (re-frozen, +packages/catalog/src/assets/dimensions.ts 1-hop); admin S1 (re-frozen, plan unchanged)
tickets: none
ci: none (code not pushed); local player e2e 782/782 + admin e2e 39/39 @ ad5725c
next_action: main agent push code + docs together; CI on push to confirm; then PR / merge per parallel-lane rules
context: T2, 0 findings; no new IDs used (C-015–C-016, W-719–W-720, S-894–S-899 still free)
```
