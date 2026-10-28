# QA 測試報告 — 2026-10-28 — e2e 加固（batch 2，純測試）

- 測試員：Quality Assurance（獨立角色）
- 範圍：`claude/keen-pascal-5iifg0` @ `9ce3867` 對上次 QA `b66d9e1`（v1.20.3）
    - `b610c73` test(e2e)：e2e 抄 src 嘅常數由 test 鎖住（S-528）
    - `5b22090` test(e2e)：全集表放手後等表定落嚟，唔再 sleep（S-529）
    - `d709cd1` test(e2e)：全集表快速甩、清單未到頂向下拉（Q-6）
    - `46b795d`（merge `ce96db0`）test(e2e)：v1.19.2–v1.20.3 主頁 mini player 重溫 / 星期日、短篇劇集頁黑碟、書架次序
    - `1f0b521` chore(docs)：prettier 格式化 `.claude/session-logs/2026-10-28_21-16.md`（main Deploy run #108 喺 `npm run lint` fail 嘅原因）
    - Review fixes：`6ffbd16` S-544（harness 共用）、`ff0bf49` W-484（快速甩量 app 收到嘅 `event.timeStamp`，送唔到甩先重做）、`85e9525` S-546（mini player 負面斷言先等正面錨點、「重溫」用 `data-tag`、劇集頁 check 唔 throw）、`9ce3867` S-545（常數鎖 test 搬去 `src/e2eSrcConstants.test.ts`，加鎖 `PROBE_STORAGE_KEY`）
- 前置：code review pass，92 分（`.proj-docs/reviews/2026-10-28_review_e2e_hardening.md`）
- Production 改動：**冇**。`src/` 只加咗 `src/e2eSrcConstants.test.ts`（vitest，唔入 bundle）；version 仍然 1.20.3
- 環境：
    - Linux sandbox（4 核）、Node 22、playwright 1.63.0，sandbox 預設 `PLAYWRIGHT_BROWSERS_PATH`
    - CI 等價：`git archive HEAD` → `scratchpad/qa2/ci/`，喺嗰度 `npm ci`（乾淨 node_modules，525 packages）再行 CI 嗰三步
    - Mutation：`git archive HEAD` → `scratchpad/qa2/mutSunday/`、`mutSeries/`、`mutConst/`（repo 外），冇改 repo 任何 source
- 總結：✅ **pass**
    - CI 三步（`npm run lint`、`npm test`、`npm run build`）喺乾淨 `npm ci` copy 全部 exit 0；`prettier --check .` 全綠（main #108 嘅 lint fail 已修）；**全套 vitest 149 個 file、1501 個 test 全綠**
    - `npm run e2e` × **5**（3 次靜機、2 次 4 核 CPU load）：每次 **588 PASS / 0 FAIL**，exit 0；`RETRY` 行 **0**
    - 3 組 mutation 全部令對應 check 變紅，其他照綠：新 check 有實際保護作用
    - 冇新 ticket

---

## Hard Gates

| Gate              | 結果    | 證據                                                                                                                                                               |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint（CI）        | ✅ pass | 乾淨 `npm ci` copy：`npm run lint` exit 0（`eslint .` + `prettier --check .`「All matched files use Prettier code style!」）                                       |
| Tests（CI，全套） | ✅ pass | 同一 copy：`npm test`（`vitest run`）**149 files / 1501 tests 全綠**，0 fail（90.5s）                                                                              |
| Tests（指定）     | ✅ pass | repo：`npx vitest run src/e2eSrcConstants.test.ts scripts` **6 files / 20 tests** 全綠                                                                             |
| Type check        | ✅ pass | `npx tsc -p tsconfig.app.json --noEmit` exit 0；`npx tsc -p tsconfig.node.json --noEmit` exit 0；`npx tsc -b` exit 0                                               |
| Build（CI）       | ✅ pass | 同一 copy：`npm run build` exit 0（PWA precache 80 entries）；5 次 `npm run e2e` 入面嘅 build 都 pass                                                              |
| E2E               | ✅ pass | `npm run e2e` × 5：**588 PASS / 0 FAIL**，exit 0，「All E2E checks passed」；2 次喺 4 核 load（loadavg 去到 7.2–7.6）                                              |
| Coverage          | ✅ n/a  | 冇 production 改動。新 e2e check 經 mutation 驗證會捉到 regression（見下）                                                                                         |
| Security          | ✅ pass | 冇新依賴；`npm ci` audit 報 6 個（5 low、1 moderate），冇 Critical / High                                                                                          |
| Data integrity    | ✅ n/a  | 冇改 app 讀寫；e2e 每個情境用獨立 context（localStorage 各自新開）                                                                                                 |
| Performance       | ✅ n/a  | 純測試；e2e 一次 374–378s（靜機）、399–403s（load）                                                                                                                |
| No Critical       | ✅ pass | 🔴 = 0                                                                                                                                                             |
| PWA Update        | ✅ n/a  | 版本冇 bump，build 出嚟嘅 app 唔變；v1.20.2 → v1.20.3 自動 reload 已喺 `2026-10-28_qa_v1.20.3.md` 驗過。主頁版本號 check（`v1.20.3`）喺 e2e 588 個入面 5 次都 PASS |

## 測試覆蓋概覽

| 類型               | 數量                                                | 結果                        |
| ------------------ | --------------------------------------------------- | --------------------------- |
| Unit（CI 全套）    | 1501 tests / 149 files                              | 全綠                        |
| Unit（指定）       | 20 tests / 6 files（常數鎖 8 個 + `scripts` 12 個） | 全綠                        |
| E2E（repo 自帶）   | 588 checks × 5 次（上次 563，今次多 25 個）         | 全綠                        |
| Mutation（e2e）    | 2 個 scratch build，各跑完整 `npm run e2e`          | 各 2 FAIL，全部係目標 check |
| Mutation（常數鎖） | 1 個 scratch copy                                   | 2 FAIL / 6 pass，啱晒目標   |

---

## CI 等價（scope 1）

main 嘅 `.github/workflows/deploy.yml` 行 `npm ci` → `npm run lint` → `npm test` → `npm run build`。QA 用 `git archive HEAD` 開乾淨 copy 照行：

| 步驟            | 結果                                                                                  |
| --------------- | ------------------------------------------------------------------------------------- |
| `npm ci`        | ✅ exit 0，added 525 packages                                                         |
| `npm run lint`  | ✅ exit 0；`prettier --check .` 全綠，包括 `.claude/session-logs/2026-10-28_21-16.md` |
| `npm test`      | ✅ exit 0，149 files / 1501 tests                                                     |
| `npm run build` | ✅ exit 0                                                                             |

即係 main Deploy run #108 fail 嘅 lint 步驟（未格式化嘅 session log）今次會過，後面兩步都綠。

## E2E 穩定性 + W-484（scope 2）

| Run | 條件                       | 結果    | 用時 | RETRY | 觸控·表頭甩（速度 / 放手間隔） | 觸控·清單甩       | 滑鼠·表頭甩  |
| --- | -------------------------- | ------- | ---- | ----- | ------------------------------ | ----------------- | ------------ |
| 1   | 靜機                       | 588 / 0 | 374s | 0     | 1.76 px/ms / 4.0ms             | 1.60 / 7.0ms      | 2.51 / 4.0ms |
| 2   | 靜機                       | 588 / 0 | 378s | 0     | 1.76 / 4.0ms                   | 1.56 / 8.0ms      | 2.41 / 4.0ms |
| 3   | 靜機                       | 588 / 0 | 376s | 0     | 1.89 / 4.0ms                   | 1.64 / 7.0ms      | 2.41 / 4.0ms |
| 4   | 4 × busy loop（1.2 → 7.2） | 588 / 0 | 399s | 0     | 1.89 / 4.0ms                   | **0.73 / 34.0ms** | 2.67 / 3.0ms |
| 5   | 4 × busy loop（7.2 → 7.6） | 588 / 0 | 403s | 0     | 1.81 / 4.0ms                   | **0.72 / 35.0ms** | 2.20 / 7.0ms |

- 15 次甩全部一次過算甩（門檻 0.6 px/ms），**冇一行 `RETRY`**，冇 FAIL；每次甩 123px（< 表高 658 × 0.25），表都 `closed`
- 機忙時觸控·清單嗰路（CDP touch 經清單）放手間隔由 7–8ms 升到 34–35ms，速度跌到 0.72–0.73，離門檻得 ~20% 餘量；W-484 嘅重做機制正好係為呢個情況而設（見觀察）
- 其他新 check 5 次都 PASS：清單未到頂向下拉（捲返 105px、transform 空、`dragging false`、放手仍開）、平日重溫次序 + 照播、星期日冇 mini player / 只出重溫、短篇劇集頁黑碟 = TodayEmpty 碟（底 `rgb(10, 10, 10)`、碟邊 `rgb(30, 30, 30) 0 0 0 10px`）、冇「由頭播放」、書架次序
- Load：`node -e "for(;;){}"` × 4，跑完已 kill（`pgrep` 確認冇殘留）

## 新 check 有冇用：mutation（scope 3）

兩個 app 端 mutation 喺 repo 外 scratch copy（`git archive HEAD`），各自跑完整 `npm run e2e`：

| Mutant      | 改動（只喺 scratch）                                                                                                             | 結果              | 紅咗嘅 check                                                                                                                                                                          | 對照（應該照綠）                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `mutSunday` | `src/hooks/useMiniPlayer.ts` `useListedRecordings`：今日冇節目就用最近一個錄音（返去「用最近一日」嘅舊行為）                     | 584 PASS / 2 FAIL | 「星期日冇節目：冇嘢載入，主頁冇 mini player（**1 個**）」；「播緊舊集返主頁，只得一個 mini player，讀屏名係『正在播放（重溫）』」                                                    | ✅ 平日 5 個 check（重溫 + 今日次序、照播 2s → 4s、「重溫」標籤）+ 平日對照「節目格一 render 完就已經有 mini player（1 個）」全綠 |
| `mutSeries` | `src/pages/SeriesDramaPage.tsx`：`art={status === 'unloaded' ? undefined : theme.art}` → `art={theme.art}`（第一次入都出劇集圖） | 586 PASS / 2 FAIL | 「唱片冇圖，係黑碟（**rgb(230, 204, 92)，圖 1 張**）」；「黑碟同今日節目未上架嘅碟一樣（底 `rgb(10, 10, 10)` / `rgb(230, 204, 92)`，碟邊 `rgb(30, 30, 30)` / `rgb(255, 245, 194)`）」 | ✅ TodayEmpty 參照（「今日節目未上架」）同「冇『由頭播放』掣」照綠                                                                |

- 兩個 mutant 都只紅目標 check，其他 584 / 586 個照綠，即係 check 針對規則本身，唔係靠其他嘢碰啱
- `mutSunday` 總數 586（少 2）：第二個 check 紅咗之後 `if (!shown) return` 跳過「照播」同「冇指示點」兩個 check。前提唔成立已經有 FAIL 報出，唔會靜靜雞 pass，可以接受

常數鎖（S-528 / S-545）另做一組（`mutConst`，只跑 vitest）：

| 改動（scratch `e2e/`）                                                                 | 結果                                                                                                     |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `harness.mjs` `PROBE_STORAGE_KEY` `v1` → `v2`；`arcSheet.mjs` `DRAG_INTENT_PX` 10 → 12 | ✅ `src/e2eSrcConstants.test.ts` 2 fail（正正係嗰兩個）/ 6 pass；S-545 新加嘅 `PROBE_STORAGE_KEY` 鎖有效 |

## 指定 test + tsc（scope 4）

| 項目                                                 | 結果                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npx vitest run src/e2eSrcConstants.test.ts scripts` | ✅ 6 files / 20 tests                                                                                   |
| `npx tsc -p tsconfig.app.json --noEmit`              | ✅ exit 0（`src/e2eSrcConstants.test.ts` 喺 app 範圍，`probeStore.ts` 嘅 `import.meta.glob` type 過到） |
| `npx tsc -p tsconfig.node.json --noEmit`             | ✅ exit 0（唔再拖 src 模組入 node config）                                                              |

## 主動補測（edge case）

今次係純測試加固，QA 嘅「補測」用 mutation 代替：3 組 mutation（星期日 fallback、劇集頁第一次入出圖、e2e 常數脫節）都係真實會發生嘅 regression 形狀，全部被捉到。另外 2 次 CPU load 跑量度咗 W-484 喺最差情況下嘅餘量（見上表）。冇發現盲點要補新 test。

## 失敗測試詳情

冇。5 次 e2e、CI 三步、指定 vitest、tsc 全部冇 fail。Mutation 嘅 FAIL 係預期（證明 check 有效），唔係 defect。

## 問題修正優先順序

| 優先 | 項目 | Ticket | 備註 |
| ---- | ---- | ------ | ---- |
| —    | 冇   | —      | —    |

## 觀察（唔開 ticket）

- **W-484 觸控·清單甩喺機忙時餘量細**：4 核 load 下放手間隔 34–35ms、速度 0.72–0.73（門檻 0.6），今次冇觸發重做；就算觸發，W-484 會量 app 收到嘅 `event.timeStamp` 再重做最多 2 次，夠快但冇閂先當 app 壞。CI（GitHub Actions）冇跑 e2e，所以唔影響 deploy。如果將來有 `RETRY` 行經常出現，可以考慮清單嗰路減少 move 步數
- `mutSunday` 顯示 check 數會因前提 fail 而減少（586），屬 S-546 設計（唔 throw、報 fail 繼續），唔係問題

## 測試建議

- 上次建議（`mouse1203.mjs` M1–M5 滑鼠捽書架冇 `dragstart` 搬入 repo e2e）仍未做，可以跟下一批 e2e
- 考慮喺 CI 加 e2e job（而家 main 只行 lint / test / build）；今次 e2e 5 次 588/588 穩定，load 下都冇 retry，有條件加

## 附錄：scripts / logs

- 目錄：`/tmp/claude-0/-home-user-903-player/a76b8fcc-b220-5855-8ff4-b41d3aaf29fe/scratchpad/qa2/`
- CI copy：`ci/`；logs `ci_npmci.log`、`ci_lint.log`、`ci_test.log`、`ci_build.log`
- E2E：`e2e_r1.log`–`e2e_r5.log`、`e2e_summary.txt`（r4、r5 = CPU load）
- Mutation：`mutSunday/`、`mutSeries/`、`mutConst/`；logs `e2e_mutSunday.log`、`e2e_mutSeries.log`

## Handoff receipt

```handoff-receipt
protocol: 2
status: pass
score: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "n/a (no production change; new e2e checks mutation-verified)"
  e2e: pass
  security: pass
  data_integrity: n/a
  performance: n/a
  no_critical: pass
  pwa_update: "n/a (no version bump; v1.20.3 banner check passes in e2e)"
next_action: merge_main
next_agent: main
branch: "claude/keen-pascal-5iifg0"
tickets: []
context: "QA e2e hardening batch 2 PASS @9ce3867 (test-only; no production src change; version 1.20.3). CI-equivalent on a clean git-archive copy: npm ci, npm run lint (eslint + prettier --check . all green, fixes main Deploy #108), npm test full vitest 149 files / 1501 tests, npm run build: all exit 0. npm run e2e x5 (3 calm, 2 under 4x busy-loop load, loadavg up to 7.6/4 cores): 588 PASS / 0 FAIL each, 0 RETRY lines; 15 fling measurements all valid first try (touch list path under load 0.72-0.73 px/ms, 34-35ms release gap vs 0.6 threshold). Mutations in scratch copies: Sunday fallback-to-latest in useMiniPlayer -> exactly the 2 Sunday checks FAIL, weekday control + anchor control pass; SeriesDramaPage art on first visit -> both blank-disc checks FAIL, TodayEmpty reference + no-restart pass; e2e constant drift (PROBE_STORAGE_KEY, DRAG_INTENT_PX) -> e2eSrcConstants.test.ts 2 FAIL. vitest src/e2eSrcConstants.test.ts + scripts 6 files / 20 tests, tsc app + node configs pass. No tickets."
```
