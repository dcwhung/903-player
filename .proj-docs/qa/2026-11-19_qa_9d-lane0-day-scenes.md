# QA — repo-tooling（9d lane 0：e2e:visual 日間情境 + 時區）— 2026-11-19 — S1

- Tier: T1 | PR #283（`test/visual/day-scenes` → `release/v2.1.0`）| Commit: `77e1c65b`（code）| Verdict: ✅ pass
- Plan: `.proj-docs/qa/plans/repo-tooling.md`（加 AC-11、scope 加 `visualScenes.d.mts` / `e2eVisualScenes.node.test.ts`、Commands 加 AC-11）
- Ledger（`impact --since $(git merge-base HEAD origin/main)`）: SKIP 13 / REVERIFY 1（repo-tooling）/ UNCOVERED 42（2 個歸 repo-tooling；40 個 `_mockups_/sleep-timer/*` 見 Observation）
- Freeze: `repo-tooling S1` 48 檔（原有 46 行 + 2 個新檔，同 freeze 前比冇少行）；`repo-tooling S3` 嘅 `visualModel.{mjs,d.mts}` / `visualScenes.mjs` 行 STALE，留待 v2.1.0 S3

## Runs

| Command                                                                                                   | Result                                                    | Time   |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| `npm test -- apps/player/src/e2e`                                                                         | 4 files / 57 tests 全綠                                   | 1.5s   |
| `npm run build -- --mode e2e` + `VISUAL_BASE=HEAD VISUAL_PORT=4683 PW_CHROMIUM_PATH=… npm run e2e:visual` | `PASS 比對咗 234 張：全部一樣`，exit 0                    | 5m31s  |
| `E2E_PORT=4693 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（本地，補 CI e2e，見下）           | 1097 PASS / 0 FAIL，`All E2E checks passed`               | 16m18s |
| CI run 44520226764（`77e1c65b`）`Lint, unit & build`                                                      | success（lint、`tsc -b`、`npm test`、build、build:admin） | 引用   |
| CI run 44520226764 `E2E (Playwright)`                                                                     | failure：`Install Playwright Chromium` apt 503            | 引用   |

- 234 = 13 情境 × 18 viewport（10 個夜間 + `home-paused-day` / `show-day` / `today-day`）；自己比自己全部一樣 = 加咗日間情境同 `timezoneId` 之後工具穩定
- `npm run e2e` 嘅 section 冇 import `visualModel.mjs` / `visualScenes.mjs`（`duo.mjs` / `squareDrama.mjs` / `remoteCatalog.mjs` 只喺註解提到），改動唔影響 e2e；本地跑一次補返 CI 冇跑到嘅 e2e

## Hard Gates

all pass（Coverage：改咗嘅係 e2e 工具 `.mjs`，唔入 coverage；新加嘅 `dayScenes()` / 情境清單由 `e2eVisualScenes.node.test.ts` 覆蓋，包括 throw 分支）

## Findings

### 🟢 / Observation

- Observation：CI e2e job 喺 `Install Playwright Chromium` 失敗（`security.ubuntu.com` `fonts-wqy-zenhei` 等 `503 Service Unavailable`，`Failed to install browsers`），屬 GitHub runner apt mirror 暫時故障，同 code 無關；未跑到 production smoke / `npm run e2e` / `e2e:admin`。按指示冇重跑 CI
- Observation：`impact` 出 40 個 `_mockups_/sleep-timer/*` UNCOVERED，來自 `release/v2.1.0` 上嘅 plan commit `2c83be7a`，唔屬呢個 PR；跟現有做法，會喺 9d 功能鏈 S1 freeze 時一齊入 ledger（同 `_mockups_/admin*` 一樣）

## 建議補測

- none（`dayScenes()` 同情境清單已有 unit test；工具穩定性由 234/234 證）

## 跟進

- CI run 44520226764 e2e job 未綠（基建問題）：Main agent 要 rerun failed jobs，綠咗先 push `cfbc8a3c` + 呢個 QA commit；push / merge 前要 code SHA 有一個 e2e 綠嘅 run
