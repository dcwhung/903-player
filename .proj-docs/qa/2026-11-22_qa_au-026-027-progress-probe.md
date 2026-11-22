# QA — AU-026 / AU-027 進度同 probe 結果唔再亂寫 / 亂清（player 2.2.1）— 2026-11-22 — S1

- Tier: T1（PATCH：player 2.2.0 → 2.2.1，淨改 `apps/player/src` 播放進度同 probe store，冇 UI / CSS）| Commit: `d8bac91c`（branch `fix/player/au-026-027_progress-probe-store`，未 push）| Verdict: ✅ pass
- Stage 規則：validation gate §2「T1 PATCH → S1」；先例 v2.0.1 / v2.0.2（PATCH + bump player version → S1，S3 行留俾下次 release S3）、AU-017（api 0.13.2）。S3 冇做：`impact --since 0f42de77` 另有 `admin` / `api` / `drama` 屬其他已 merge 嘅 PR，唔係今次範圍
- Ledger（`impact --since dbb310a` = merge-base `origin/main`）：SKIP 10 / REVERIFY 5（`catalog-data` `coming-soon` `player-core` `repo-tooling` `ui-foundation`）/ UNCOVERED 2（`player/persistGate.test.ts` → player-core；`services/probeStoreFallback.test.ts` → catalog-data，兩個都喺 plan 現有 glob）/ IGNORED 2
- Plan：`player-core.md` 加 AC-7、`catalog-data.md` 加 AC-12（+ 指令加 `probeStoreFallback.test.ts`）；其餘沿用。Review：`.proj-docs/reviews/2026-11-22_review_p1-player-progress-probe.md`（三輪，W-859、S-1421–S-1424 已關）

## Runs（本機 @ `d8bac91c`，各跑一次）

| Command                                                                                     | Result                                                                                | Time   |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| `npm run lint`                                                                              | exit 0                                                                                | 74 s   |
| `npx tsc -b`                                                                                | exit 0                                                                                | 26 s   |
| `npm test`（root，全部 projects）                                                           | 531 files / 5647 tests 綠                                                             | 263 s  |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`                                    | 1184 PASS / 0 FAIL，「All E2E checks passed」；版本號 `v2.2.1` 10 個 check            | 1145 s |
| `PW_CHROMIUM_PATH=… npm run e2e:visual`（base `dbb310a`）                                   | 「比對咗 234 張：全部一樣」exit 0（WARN 只係 lockfile version）                       | 420 s  |
| 改咗嘅檔 coverage（`src/player` `src/services` `src/catalog/runtime` `src/data`，693 test） | `AudioController.ts` lines 98.67%、`probeStore.ts` 100%、`runtime.ts` 100%            | 18 s   |
| 新 test 對 `origin/main` 嘅 `AudioController.ts` / `probeStore.ts`（scratch copy）          | 40 個入面 19 紅（persistGate 14、probeStoreFallback 5），對照組 21 綠；本 branch 全綠 | 6 s    |
| 手動：e2e build + vite preview + 真 Chromium（scratchpad script，autoplay 擋住 / 冇擋各一） | 見 Scenarios「瀏覽器」                                                                | 2 min  |

## Scenarios（unit = `src/player/persistGate.test.ts` / `src/services/probeStoreFallback.test.ts`；瀏覽器 = 上面手動）

- 載入冇播就 hide → 冇記錄：unit「should write nothing when the page hides / the tab goes to the background after a load without play」「…when the browser blocks autoplay」；瀏覽器：節目頁載入 28/11（0:00 / 10:00、autoplay 被擋）→ `pagehide` → `903player:progress:v2` = `null`
- 冇播就轉集 → 第一集冇記錄：unit「…for the first episode when another one is picked」「…when the player is closed without playing」；瀏覽器：再撳 21/11 聽 3 秒暫停 → storage 得 `show:gongzi:2026-11-21` 一個 key
- 有進度、開咗就走 → byte 一樣：unit「should leave an existing record untouched when it is resumed but not played」「…play is pressed, never moves and is paused」；瀏覽器：28/11 有 1:00 記錄 → reload（續播位置套用、冇播）→ 等 → `pagehide` → 返主頁 → `pagehide` → 再 reload，成個 storage 字串三次都同 baseline 一樣
- 正常收聽照存：unit「should save when the page hides after playing」「should save a short listen…」「should update the record when a resumed episode is played on」；e2e「暫停時存低進度：30.7s」「背景接住播：轉背景即刻存進度」「聽到尾嘅 28/11 顯示已收聽」
- 暫停中 seek 照存：unit「should save the new position when the user seeks while paused」「should save a seek made before the metadata arrived」；瀏覽器：暫停中進度條 → 1:00 → `pagehide` 後 position 60
- 第一個 timeupdate 同 pause / hide 一齊嚟（鎖屏）：unit「…when no playing timeupdate fired (locked screen)」P1–P4 + 「should mark the episode watched when it plays to the end」
- Reload / stall 期間唔寫 0：unit「…while the resume position is not applied yet」7 個（failed source reload、stall watchdog reload、0 嘅 timeupdate）
- 最近收聽 / 繼續收聽 / 劇集頁自動開：selector 同 hook 冇改，只讀 storage 記錄（`selectors/continueListening.test.ts`、`pages/home/savedItems.test.ts`）；記錄有冇由上面證；瀏覽器：冇播嘅 28/11 冇入記錄、主頁 mini player 照顯示「重溫 28/11 · 0:00 / 10:00」；e2e 收藏「最近收聽 tab」、HomeView「第一次開 app 有續聽」、闊橫版「繼續收聽」全綠
- 內建 catalog fallback 保留 remote-only 節目、唔交出嚟：unit「should keep the recordings of a remote-only show in storage」「…not store them twice…」「should not expose them to any reader…」「should show them again once a later session knows the show」；瀏覽器（harness 預設 catalog.json 404）：seed 唔識嘅節目一集 + 一個壞格式 → probe 寫完 found 仲有嗰一集（壞嗰個冇咗）、頁面冇出現
- Catalog 齊全照清：unit「should drop the recordings of a show the remote catalog no longer has」「…when no remote catalog is configured」；`runtime.test.ts`「isCatalogComplete」9 個；瀏覽器（答返完整 catalog.json）：同一個 seed → 寫完冇咗嗰集
- 壞格式照掉：unit「should still drop malformed or foreign-origin entries of an unknown show」+ 「…when the stored state cannot be read back」3 個

## Hard Gates / Findings

- Hard Gates all pass（PWA gate no：冇掂 `sw.js` / manifest / build，e2e「PWA 換版」check 照綠；Security / Data：storage 寫入路徑由上面 unit + 瀏覽器證；Performance n/a）。Known issues：冇出現
- Findings：冇三層收斂嘅 🔴 / 🟡
- Observation（唔 block）：同一次載入聽過 / seek 過之後，每次 `pagehide` 都會用同一個 position 再存一次，`updatedAt` 推後幾百 ms（瀏覽器：暫停存 `…008039` → reload 嗰下 `…008347`，position 一樣）；AC 只管「冇播過 / 冇掂過」，呢個係聽過嘅集，次序冇變

## Freeze

S1 @ `d8bac91c`，每條都畀晒成條 chain + stage 嘅檔：`player-core` 120 → 121、`catalog-data` 149 → 150、`ui-foundation` 130、`coming-soon` 163、`repo-tooling` 49；ledger 4317 → 4319 行。同 branch base `dbb310a` 比 chain + stage + path：少 0、多 2（兩個新 test）；S3 行冇郁（8 組 STALE 留俾下次 release S3）。`origin/main` 已去到 `9ab781b`（#307），佢多咗 `repo-tooling` S1 `scripts/ci/detect-code-changes.{sh,test.mjs}` 兩行，呢個 branch 未 merge，由 main agent merge 時用 `ledger-merge.mjs` 對返

## 未驗 / 建議補測

- 未驗：真 iOS 鎖屏 / 真機背景（鎖屏次序只由 `FakeAudio` 同 e2e `hiddenPlayback` 模擬）；未 push，冇 CI run
- 建議補測：none — no edge case gap

```handoff-receipt
protocol: 1
status: pass
stage: S1
chain: player-core, catalog-data, ui-foundation, coming-soon, repo-tooling
commit: d8bac91c
ci_run: n/a
next_action: merge_ready
branch: "fix/player/au-026-027_progress-probe-store"
context: "AU-026 / AU-027 S1 pass at d8bac91c (player 2.2.1): lint / tsc green, npm test 5647, player e2e 1184 PASS / 0 FAIL, e2e:visual 234/234 identical vs dbb310a; new tests 19 red on origin/main sources; real-browser checks of load-without-play, resume-and-leave byte-identical, paused seek, catalog fallback keep / complete prune; 5 chains frozen S1 (+2 new test rows), no rows lost vs dbb310a, S3 rows left stale for next release S3; origin/main now 9ab781b (#307) not merged here, ledger to be reconciled by main agent; not pushed, no CI run; not verified: real iOS lock screen"
```
