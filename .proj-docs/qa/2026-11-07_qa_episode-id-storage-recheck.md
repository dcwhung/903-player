# QA — v1.29.0 Phase −1 episode ID storage migration（recheck）— 2026-11-07 — S1

- Tier: T2 | Commit: `f7e55aa`（CUI-0023 fix；之前 fail 報告 `qa/2026-11-07_qa_episode-id-storage.md` @ `b527d56`）| Verdict: ✅ pass
- Branch `feature/storage/episode-id`，base `fbb49e1`；L1：`plans/2026-11-06_plan_backend-admin.md`「Phase −1」+「實作決定」
- Ledger（`impact --since fbb49e1`，freeze 前）：SKIP 0 / REVERIFY 11 / UNCOVERED 8 → 已分配入鏈（見 Freeze）/ IGNORED 4
- `b527d56..f7e55aa` 淨改 `todayItems.test.ts`、`useStartDrama.test.ts` fixture（`.url` → `.id`），產品 code 冇變

## Runs

| Command                                                                                            | Result                                                                   | Time |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---- |
| CI [42323853076](https://github.com/dcwhung/903-player/actions/runs/42323853076) @ `f7e55aa`       | ✅ success（lint、unit 2780 / 2780、build、e2e 765 PASS / 0 FAIL；引用） | 14m  |
| `npx vitest run src/pages/today/todayItems.test.ts src/hooks/useStartDrama.test.ts`（CUI-0023 L2） | 16 / 16                                                                  | 2s   |
| 本地 e2e @ `b527d56`（之前報告，產品 code 同 `f7e55aa` 一樣）                                      | 765 PASS / 0 FAIL                                                        | —    |

- 重點驗收（CI e2e @ `f7e55aa`）：
    1. `舊版進度 / 收藏升級` 10 / 10：v1 進度 + 收藏升級後仍在；再開 app 冇重複（2 條）；v1 原封不動
    2. 新進度 / 收藏用 ID 入 v2；續播、已收聽、收藏 tab（bookmark / player-core / drama / home e2e）全綠
    3. W-698 ✅（之前報告已核實；`storageMigration.ts` 冇再改）
    4. bookmark / comingSoon / hiddenPlayback / homeWide / dramaPages e2e 全綠
- Coverage：storageMigration / episodeId / bookmarkStore / progressStore lines 99.4%、branch 96.5%（之前報告，檔案冇變）

## Hard Gates

all pass（PWA gate n/a：`main.tsx` 淨加 migration call，冇掂 SW 註冊；Security / Performance n/a）

## Findings

- 冇新 finding。CUI-0023（W-699）✅ 核實：兩個 test 檔改用 `.id`，本地 16 / 16、CI unit 2780 / 2780 → ticket 移去 completed

## 建議補測

- none

## Freeze

- UNCOVERED 分配（plan 已更新）：`storageMigration.*`、`episodeId.*`、`e2e/storageMigration.mjs` → player-core（加 AC-5）；`scripts/dramaFromFolder.*` → drama（加 AC-4）；`schemas/show.schema.json` → catalog-data
- S1 freeze @`f7e55aa`：11 條鏈全部（檔案清單 = ledger 原有 S1 行 + 上面新檔）。之後 `impact` 仍出 REVERIFY 嘅 catalog-data、drama、mini-player、player-core、pwa-shell、ui-foundation 係佢哋舊 **S3** 行 STALE，留待 v1.29.0 S3 release refreeze

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: f7e55aa
ci_run: 42323853076 (f7e55aa, success: lint + unit 2780/2780 + build + e2e 765/0)
tickets_verified: [CUI-0023 (W-699) -> completed]
frozen: [bookmark, card-zoom, catalog-data, coming-soon, drama, home, mini-player, player-core, pwa-shell, show-today-page, ui-foundation] S1 @f7e55aa
next_action: proceed_to_merge
context: "CUI-0023 fixed; CI green on f7e55aa. 8 UNCOVERED files assigned to player-core / drama / catalog-data plans. S3 rows of 8 chains stale until release S3."
```
