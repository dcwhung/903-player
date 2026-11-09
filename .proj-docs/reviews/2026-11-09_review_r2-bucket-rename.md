# Code Review — 2026-11-09 — 廣播劇音檔搬去 R2 bucket `903-radio-drama`（player v1.31.1）

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/funny-pasteur-29wbrn` `eb781cd`（base `origin/main` `86f0410`），12 檔 +14 / -14
- SSoT（L1）：`.proj-docs/plans/2026-11-08_plan_phase2a-backend.md` §「音檔 bucket 改名 `903-radio-drama`」（獨立 PATCH PR、換 `DRAMA_AUDIO_BASE`、舊 bucket 留幾個星期）
- Tier：T1（常數 + test fixture 換 host，冇邏輯改動）
- 總評：換得乾淨。repo 內（唔計 `.proj-docs`、session log）已經冇舊 host `pub-e141dd7a…` 或舊 bucket 名；4 處 `DRAMA_AUDIO_BASE` 副本全部同步，而且各有 test 鎖住一致性。冇 🔴 / 🟡

## Hard Gates

all pass

- Lint：main agent 已跑 prettier + eslint（改動檔）clean，冇重跑
- Type：n/a（只改字串常數，冇 type 改動）
- Tests：main agent 已跑相關 33 檔 756 pass（`e2eSrcConstants`、`storageMigration`、`dramaFromFolder`、`packages/catalog`、每劇 `drama.test.ts`），冇重跑。`arcCover/tests/test_fetch_sources.py` 本機缺 `cv2` import 唔到；手動核對佢鎖嘅條件：`fetch_sources.py` `R2_BASE` == `constants.ts` `DRAMA_AUDIO_BASE`（MATCH）。冇跑 full suite / e2e
- Coverage：n/a（冇新邏輯）
- Security：n/a（冇新依賴）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                          |
| -------- | ------- | ------- | ------------------------------------------------------------- |
| 正確性   | 25      | 25      | 4 處副本同步；URL 由 base 推導，catalog.json 唔使重新 publish |
| 安全性   | 20      | 20      | 新 host 同樣係 public r2.dev；冇 CSP 要改                     |
| 可維護性 | 20      | 20      | 副本之間有 test 鎖住，唔會漏改                                |
| 測試覆蓋 | 15      | 15      | sample URL pin + 一致性 test 全部換新 host                    |
| 性能     | 10      | 10      | 冇影響                                                        |
| 代碼風格 | 10      | 10      | lint / prettier 過                                            |
| **總分** | **100** | **100** |                                                               |

**結果：✅ pass**

## 依賴音檔 host 嘅地方（逐項核對）

- 舊 host / 舊 bucket 名：`git grep 'e141dd7a\|radio-drama'` 淨係剩 `.proj-docs`、`.claude/session-logs`（歷史）同 `constants.ts` 新註解；README L25 `radio-drama-preview.html` 係 preview 檔名，無關
- SW：`vite.config.ts` workbox `globPatterns` 只 precache app 自己檔案；`runtimeCaching` 只有 `catalogRuntimeCaching(catalogUrl)`（catalog.json + 圖，regex 由頭錨定）。音檔唔經 SW cache，冇 host pattern 要改
- CSP：`index.html` 冇 `Content-Security-Policy` meta，`public/` 冇 `_headers`；冇 allowlist 要加
- `apps/api`：只用 R2 binding `CATALOG`（`903-player-catalog`），冇引用音檔 bucket / host
- e2e mock：`harness.mjs` `DRAMA_AUDIO_BASE` 已換；`comingSoon` / `dramaPages` / `hiddenPlayback` 全部 import 同一個常數 route，`e2eSrcConstants.test.ts` 鎖住同 catalog 一致
- 本機儲存：progress v2 / bookmarks v2 用 episode ID；`probeStore` 淨係節目錄音；`playbackLog` 只記檔名。受 host 影響嘅只有 v1 URL-keyed progress 遷移（用戶已接受風險，決定 B，唔計 finding）
- Version / commit：1.31.0 → 1.31.1 PATCH 合理（基建搬遷、冇功能改動）；`package-lock.json` 同步；`chore(catalog): …` 格式啱，body 有寫 Slurper 結果、rollback 安排同接受風險

## 🔴 / 🟡

冇。

## 🟢 / Observation（入 backlog，唔 block）

- S-783 `.proj-docs/plans/2026-11-08_plan_phase2a-backend.md:145,153` 仲寫音檔 bucket `radio-drama`、「`rclone copy` + 換 `DRAMA_AUDIO_BASE`（3 處）」；實際係 Super Slurper、4 處（catalog、`dramaFromFolder.mjs`、e2e harness、`fetch_sources.py`）。建議喺 plan 標完成並更正
- S-784 Slurper「537 found / 533 migrated / 4 skipped」：main agent 驗咗 470 個集數 URL，但未記錄 4 個 skipped 係乜。如果係 R2 上嘅封面（`fetch_sources.py` 會下載），刪舊 bucket 前要確認新 bucket 有齊；集數播放唔受影響

## ✅ 做得好嘅地方

- 4 個 `DRAMA_AUDIO_BASE` 副本各有 test 對 catalog 常數，今次一次過換齊、冇漏
- 舊 bucket 保留做 rollback；回退只係一行常數 + PATCH

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T1
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
branch: "claude/funny-pasteur-29wbrn"
context: "eb781cd pass 100: no old host / bucket name left outside history docs; SW (catalog-only runtimeCaching), CSP (none), apps/api (catalog bucket only), e2e mocks all OK. Observations S-783 (plan wording), S-784 (4 Slurper-skipped objects unidentified, check before deleting old bucket). Report committed, not pushed (code CI running) — main agent pushes after CI green."
```
