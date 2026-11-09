# QA — R2 bucket rename（`DRAMA_AUDIO_BASE` → `903-radio-drama`）— 2026-11-09 — S1

- Tier: T1（host 常數 + test fixture；player 1.31.0 → 1.31.1 PATCH）| Code commit: `eb781cd`；`ac0c6db` 淨 review docs | Verdict: ✅ pass
- L1：用戶要求（音檔搬去 bucket `903-radio-drama`，public dev URL `pub-1f26dbd9526e41b89de51bd33054d825.r2.dev`）；review `.proj-docs/reviews/2026-11-09_review_r2-bucket-rename.md`（pass 100）
- Ledger（`impact --since 86f0410` = `git merge-base HEAD origin/main`）：SKIP 8 / REVERIFY 5（catalog-data、coming-soon、drama、player-core、repo-tooling）/ UNCOVERED 1（`apps/player/scripts/arcCover/review/fetch_sources.py`）/ IGNORED 2
- 5 條 REVERIFY 鏈嘅 diff 全部係同一個 host 字串（或 `version` 行）：`constants.ts`、`dramaFromFolder.mjs`、`harness.mjs`、6 個 test fixture、`package.json` / `package-lock.json`；`git grep e141dd7a`（排除 `.md`）= 0 行
- Plan 沿用：`.proj-docs/qa/plans/{catalog-data,coming-soon,drama,player-core,repo-tooling}.md`（冇改）
- Freeze 後 `impact` 仲列 `catalog-data` REVERIFY：只因佢 S3 行嘅 `audioProbe.test.ts`（舊 release hash），S1 已 FROZEN；下次 S3 release 重新 freeze

## Runs

| Command                                                                                | Result                                                                                                      | Time   |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| CI run 42721655093 @ `eb781cd`（ci.yml，引用，冇重跑）                                 | 全 success：Lint, unit & build（unit 257 files / 3027 pass，build 綠）；E2E 779 PASS / 0 FAIL（PWA 換版綠） | 15 min |
| main agent：HEAD 470 個上架集數 URL（`allDramas()` / `catalogEpisodesOf`）             | 新 host 470 × 200，Content-Length 每個同舊 host 一樣（c18 9 個 placeholder 冇 host，唔計）                  | —      |
| main agent：HEAD 封面（33 個劇 / 短篇 folder）                                         | 舊 host 搵到 21 張 → 新 host 21 × 200                                                                       | —      |
| main agent：相關 unit                                                                  | 33 files / 756 pass                                                                                         | —      |
| `python -m unittest tests.test_fetch_sources`（arcCover，venv 裝 `requirements.lock`） | 16 / 16 OK（包括 `R2_BASE` == `packages/catalog` `DRAMA_AUDIO_BASE` 嘅鎖）                                  | <1 s   |

- 各 plan 嘅 e2e section（'先驗 probe 同 audio host'、廣播劇、即將上架 / 快將下架、舊版進度 / 收藏升級、390×844 主流程）全部喺 CI 779 PASS 入面
- coming-soon plan 嘅手動 viewport 矩陣冇做：diff 冇 UI / layout 改動，只係 harness host 字串 + version，唔屬呢條鏈嘅行為
- repo-tooling plan 嘅 dist hash 比較只限「冇 bump version」；今次有 bump → 以 CI lint / unit / build / e2e 綠代替

## Hard Gates

all pass（Tests：CI unit + e2e 綠 + arcCover 16/16；Coverage：n/a，只改常數 / fixture；Security：n/a；PWA：`sw.js` / manifest 冇改，SW runtimeCaching 只管 catalog（review 已核），CI PWA 換版 section 綠；Performance：n/a）

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- UNCOVERED `fetch_sources.py`：arcCover 唔屬任何鏈（backlog S-762 open），今次用佢自己嘅 Python test 驗咗，冇 freeze；S-762 決定開鏈或 ignore 之前每次改都會再出
- S-784 closed：21 張封面 + 470 集喺新 host 齊 → 4 個 Slurper skipped object 唔係 app 用到嘅檔（backlog 已移去 Closed）
- 用戶接受風險 B（未遷移嘅 v1 URL-keyed 劇集進度對唔返新 host）— 唔係 finding

## 建議補測

- none（host 一致性已有三把鎖：`e2eSrcConstants.test.ts`、`dramaFromFolder.test.ts`、`test_fetch_sources.py`）

```handoff-receipt
status: pass
stage: S1
chain: catalog-data, coming-soon, drama, player-core, repo-tooling (+ fetch_sources.py verified, uncovered)
commit: eb781cd
next_action: main_agent_push_then_merge
context: "S1 pass @eb781cd; CI 42721655093 all green (unit 3027, e2e 779/0, PWA update green); 470 episodes + 21 covers 200 on new host (main agent); arcCover test_fetch_sources 16/16; 5 chains S1 re-frozen; S-784 closed. Report/backlog/ledger committed locally, not pushed"
```
