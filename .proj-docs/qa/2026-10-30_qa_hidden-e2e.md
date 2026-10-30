# QA 測試報告 — 2026-10-30 — 背景播放 e2e（`e2e/hiddenPlayback.mjs`，v1.20.12 test-only）

- 測試員：Quality Assurance（獨立角色）
- 範圍：`claude/keen-pascal-5iifg0` @ `8d80a1f`（`package.json` 1.20.12），由 main `801f25f`（v1.20.11，PR #147；CUI-0011 規則喺 main revert 咗，CUI-0011 / CUI-0014 已取消）重開
    - `a199645` test(e2e)：新 `e2e/hiddenPlayback.mjs`（8 個 check：背景接住播唔 reload、轉背景即刻存進度、背景換集後下一集卡死唔 reload → 報卡住 → 返前景重試一次 `left=3`）；`harness.mjs` 抽出 `serveWav`；`dramaPages.mjs` export；`src/e2eSrcConstants.test.ts` 鎖 hiddenPlayback 手抄常數；version 1.20.12
    - `8d80a1f` S-627 / S-628：拎走卡住 check 嘅固定 sleep
    - Review：[hidden-e2e](../reviews/2026-10-30_review_hidden-e2e.md)（97 pass；S-629 revert 後唔適用）
- 環境：Linux sandbox（4 核）、Node 22.22.0、playwright（Chromium）。Mutation / PWA 用 `git archive` 喺 scratchpad 另外 build，冇改 repo source / test
- 總結：✅ **pass**
    - `E2E_PORT=4199 npm run e2e` 連跑 **3 次，全部 598 PASS / 0 FAIL**，8 個背景 check 次次 PASS；第 2 次喺 4 核全部跑滿嘅 CPU 負載下（load avg 結尾 5.34）
    - Mutation 2 個（同 coordinator 嗰兩個唔同）都令對應 check FAIL
    - `npx vitest run src/e2eSrcConstants.test.ts` **15 / 15**；`npx eslint e2e`、`npx tsc -b`、`npx prettier --check .` exit 0
    - PWA：e2e 10 個版本號 check 都係 `v1.20.12`；v1.20.11（`801f25f` build）→ v1.20.12 自動更新 **4/4**
    - 冇新 ticket

---

## Hard Gates

| Gate           | 結果    | 證據                                                                                                                                                          |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests          | ✅ pass | e2e 3 × 598 / 0；`src/e2eSrcConstants.test.ts` 15 / 15                                                                                                        |
| Type check     | ✅ pass | `npx tsc -b` exit 0                                                                                                                                           |
| Lint           | ✅ pass | `npx eslint e2e` exit 0；`npx prettier --check .`「All matched files use Prettier code style!」                                                               |
| Build          | ✅ pass | `npm run build`（每次 e2e 第一步）exit 0；`dist/index.html` 有 `v1.20.12`                                                                                     |
| Coverage       | ✅ n/a  | 只改 e2e / test；app 源碼同 main 一樣（`git diff 801f25f..HEAD -- src` 只有 `src/e2eSrcConstants.test.ts`）                                                   |
| Security       | ✅ pass | 冇依賴改動（`package.json` / lock 只改 version）                                                                                                              |
| Data integrity | ✅ pass | 新 check「轉背景即刻存進度」3 次都 PASS（位置 1.0 s，存咗 1.0 s）                                                                                             |
| Performance    | ✅ pass | 背景卡住 check 用事件等（報卡住 / retry log），冇固定 sleep；e2e 每次約 6 分鐘                                                                                |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                                        |
| PWA Update     | ✅ pass | vN `v1.20.11`（`801f25f` build）→ vN+1 `v1.20.12`（HEAD build）：tab 受 SW control → 換 dist → `update()` → 自動 reload 顯示 `v1.20.12`，冇 page error（4/4） |

## 1. e2e 連跑 3 次

| Run | 條件                                               | load avg（開跑 → 結尾） | 結果    | 8 個背景 check |
| --- | -------------------------------------------------- | ----------------------- | ------- | -------------- |
| 1   | 正常                                               | 0.96 →（正常）          | 598 / 0 | 8 / 8          |
| 2   | 4 核各一條 busy loop（開跑前 20 s 開始，跑完先停） | 1.54 → **5.34**         | 598 / 0 | 8 / 8          |
| 3   | 正常（busy loop 已停；1 分鐘 load 仲喺回落）       | 4.16 →（回落中）        | 598 / 0 | 8 / 8          |

每次背景 check 嘅輸出都一樣：

```text
PASS  背景接住播：第一集開播出聲
PASS  背景接住播：轉背景即刻存進度（位置 1.0s，存咗 1.0s）
PASS  背景接住播：背景播完自動播下一集出聲、冇 reload（換集 true，retry 0，鎖屏 playing）
PASS  背景卡住：第一集開播出聲
PASS  背景卡住：背景播完換咗去下一集
PASS  背景卡住：等夠 12s 鎖屏報卡住（顯示 Play）
PASS  背景卡住：背景過咗所有 deadline 都唔 reload（retry 0）
PASS  背景卡住：返前景即刻重試一次（left=3 true，retry 1）
```

冇 `INFO` 被食 tap 行（CUI-0010 診斷），冇 page error。

## 2. Mutation（scratch copy，只跑背景 check）

用 scratch mini runner（`qa1213/hiddenOnly.mjs`：`vite preview` 一個 `git archive HEAD` 嘅 build，淨係行 `runHiddenPlaybackChecks`）。Coordinator 已經做過「`isHidden` → false」同「轉背景唔存進度」，今次揀另外兩個：

| #    | 改動                                                                   | 結果                                                        |
| ---- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| base | 冇改                                                                   | 8 / 0                                                       |
| M1   | `AudioController.onVisibilityChange` 亮屏唔叫 `stall.retryIfOverdue()` | ❌ 1 紅：「返前景即刻重試一次（left=3 false，retry 0）」✅  |
| M2   | `StallWatchdog.onDeadline` 拆走 hidden 分支（背景到期照 reload）       | ❌ 1 紅：「背景過咗所有 deadline 都唔 reload（retry 1）」✅ |

觀察（🟢，唔開 ticket）：M2 時最後一個 check「返前景即刻重試一次」仍然 PASS，因為背景嗰次錯誤 reload 已經寫咗 `retry … left=3`，而 check 只數 `left=3` 同總數 = 1。有第 7 個 check 擋住所以冇漏網；如果想第 8 個 check 獨立有咬力，可以要求嗰行 `vis=v`（亮屏後先發）。

## 3. 靜態檢查同常數鎖

| 步驟                                         | 結果                                                  |
| -------------------------------------------- | ----------------------------------------------------- |
| `npx vitest run src/e2eSrcConstants.test.ts` | 1 file / 15 tests 綠（新增 5 個 hiddenPlayback 常數） |
| `npx eslint e2e`                             | exit 0                                                |
| `npx tsc -b`                                 | exit 0                                                |
| `npx prettier --check .`                     | exit 0                                                |

## 4. PWA

| #   | 步驟                                        | 結果                           |
| --- | ------------------------------------------- | ------------------------------ |
| 1   | serve `801f25f`（main）dist，開 tab         | ✅ 顯示 `v1.20.11`             |
| 2   | reload，SW 已 control                       | ✅                             |
| 3   | 換 serve HEAD dist，`registration.update()` | ✅ 自動 reload 顯示 `v1.20.12` |
| 4   | page error                                  | ✅ 0                           |

---

## 失敗測試詳情

冇。

## 問題修正優先順序

| 優先 | ID       | 嚴重度 | 描述                                                              | 時機                        |
| ---- | -------- | ------ | ----------------------------------------------------------------- | --------------------------- |
| 1    | 觀察     | 🟢     | 「返前景即刻重試一次」可以要求 retry 行係 `vis=v`，令佢獨立有咬力 | 下次掂 `hiddenPlayback.mjs` |
| 2    | CUI-0015 | （舊） | 橫向劇集卡重疊（另一張 ticket，唔喺今次範圍）                     | —                           |

## 測試建議（下一步）

1. 可以 merge；e2e 總數由 590 變 598
2. 背景 e2e 只瞞到 app JS（Chromium 唔會節流 timer），iOS 凍結 JS 嘅時序仍然要靠 `AudioController.test.ts` 同實機

---

## Handoff receipt

```handoff-receipt
protocol: 2
status: pass
score: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "n/a (e2e/test-only; src unchanged apart from e2eSrcConstants.test.ts)"
  e2e: "pass (3 x 598/0, run 2 under full 4-core CPU load)"
  security: pass
  data_integrity: pass
  performance: pass
  no_critical: pass
  pwa_update: "pass (v1.20.11 801f25f -> v1.20.12 HEAD, 4/4)"
next_action: merge_main
next_agent: main
branch: "claude/keen-pascal-5iifg0"
tickets: []
context: "Hidden playback e2e QA PASS @8d80a1f (v1.20.12, test-only). e2e 3 runs all 598/0 with all 8 hiddenPlayback checks PASS (run 2 with 4 busy loops, load avg up to 5.34). Mutations in scratch builds via hidden-only runner: M1 no retryIfOverdue on wake -> 'returns to foreground retries once' FAIL; M2 hidden onDeadline branch removed (reload while hidden) -> 'no reload past all deadlines while hidden' FAIL. Minor observation: under M2 the last check still passes because the hidden retry already wrote left=3; requiring vis=v would make it independent (not ticketed). e2eSrcConstants 15/15, eslint e2e/tsc/prettier clean, UI v1.20.12 (10 e2e checks), PWA 1.20.11->1.20.12 4/4. No tickets."
```
