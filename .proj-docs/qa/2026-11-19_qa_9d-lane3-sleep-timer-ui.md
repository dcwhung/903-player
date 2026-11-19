# QA — 9d Lane 3 睡眠 timer UI + 每晚自動 — 2026-11-19 — S1

- PR #287 `feature/player/sleep-timer-ui` → `release/v2.1.0` | Tier: T2 | Code commit: `7c4a3228`（worktree HEAD `a41611dc` = re-review 報告）| Verdict: ✅ pass
- Ledger（base `6eae3cec` = `git merge-base HEAD origin/main`）：SKIP 4（admin api bookmark card-zoom）/ REVERIFY 10（`player-core` `mini-player` `show-today-page` `drama` `home` + `catalog-data` `coming-soon` `pwa-shell` `repo-tooling` `ui-foundation`）/ UNCOVERED 25 → 收入鏈：`src/player/{SleepTimerScheduler,sleepTimerSchedule,useSleepTimerSchedule}*` → `player-core`（core glob 已包）；`SleepTimer/*` + `tests/sleepTimer.tsx` + `e2e/sleepTimer.mjs` → `mini-player`（新 AC-4，同 `_mockups_/sleep-timer/*` 一齊）；`src/e2eTimezone.test.ts` → `repo-tooling`
- Plan：沿用各鏈 plan；改 `mini-player.md`（AC-4 + scope）、`player-core.md`（AC-6 加每晚排程邏輯）、`repo-tooling.md`（harness 時區）。L1：`.proj-docs/plans/2026-11-19_plan_9d-sleep-timer.md`「用戶決定」各表

## Runs

| Command                                                                                                      | Result                                                                                                                                         | Time  |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `npx vitest run --coverage --project @903-player/player`（一次過包晒 10 條鏈 plan 列明嘅 player unit path）  | 302 files / 3173 tests 綠；改咗嘅 23 個 src 檔 lines ≥ 83%（`useSleepTimerSchedule.ts` 83%，其餘 91–100%）                                     | 105s  |
| CI `ci.yml` run #587（44604251519）@ `7c4a3228`                                                              | lint / unit / build ✅；E2E ✅（player 1127 PASS / 0 FAIL，`睡眠 timer：…` 30 行全 PASS；admin e2e 綠）                                        | ~29m  |
| `npm run build -- --mode e2e` + `VISUAL_PORT=4983 … npm run e2e:visual`（base `6eae3cec` main）              | 174 / 234 diff：夜間 10 情境 × 18（月亮）+ `home-paused-day` 12（Lane 1 外圈，已接受）；`show-day` / `today-day` 0 diff                        | 8m54s |
| `node e2e/visualDiff.mjs --base c4780e97 --keep-worktree`（PR base = `release/v2.1.0`，只睇今次 lane）       | 180 / 234 diff = 夜間 10 情境 × 18；三個 `*-day` + `home-idle` 54 張 0 diff                                                                    | ~9m   |
| developer `geo.mjs`（port 改 4983 / 4984）同一個 base worktree 逐元素 multiset 比對                          | 234 張 0 error；`*-day` 0 元素變；新增只有 `button「休眠」`+`svg` ×162；郁咗只有 mini player 開頁掣（48）、標題（3）、日期（2）、「今日」（3） | —     |
| Playwright `ariaSnapshot`（scratchpad probe，`vite preview --mode e2e` port 4973，22:30 HK，390×844 節目頁） | 見驗收重點 3；pageerror 0                                                                                                                      | ~30s  |

## Hard Gates

all pass（PWA gate n/a：冇改 `sw.js` / manifest / 更新邏輯；Security / Performance n/a：冇 auth / API；storage 只係本機排程）

## 驗收重點

1. 日間零改變：見上表兩次 e2e:visual + geo。22:30 diff 只喺月亮掣 / icon 同 mini player 開頁掣 / 標題 / 日期縮窄（plan Lane 3「接受 diff」）；對 main 嘅 `home-paused-day` 係 Lane 1 外圈（PR #282 已接受），對 release base 0 diff
2. 需求 ↔ 證據（L2 全部跑過）：
    - 四捨五入 5 分鐘（23:11/23:12 → 23:10、23:13 → 23:15、23:58 → 00:00）：`sleepTimerSchedule.test.ts`
    - 到時播緊即開 / 之後先播由開始計 / 3 個鐘或 05:00 截止 / 每晚一次 / 唔覆蓋手動 timer / 跨午夜 / reload 記得已觸發 / 播完呢集遇直播唔生效：`SleepTimerScheduler.test.ts` 11 個 case；e2e「第二晚 22:30 播緊自動開 30 分鐘，出 toast」
    - W-820 夜間限定：`04:58 → 05:00` 唔記、`05:32` 唔蓋舊排程、`20:58 → 21:00` 照記、日間 start 唔開窗口（scheduler + schedule test）；e2e「日間（14:00）節目頁冇月亮掣」
    - S-1200 多分頁：改 / 取消都跟 storage event、唔寫返舊值（2 個 case）；storage 壞 / 拋錯照行
    - 「停用」兩種行為：開緊 = 只停今晚、排程保留（unit + e2e「22:30 開始」虛線框）；未開再撳 = 取消排程（`SleepTimerEntry.test.tsx`）
    - 共用時鐘同一秒跳：`useSleepTimer.test.tsx`「share one clock」；toast 文字：`useSleepTimerAutoToast.test.tsx`
3. 讀屏（Chromium accessibility tree）：月亮未開「休眠」、開咗「休眠，剩餘 15 分 0 秒」；`dialog "休眠"` → `heading "休眠"` + `button "15 分鐘"` / `"30 分鐘"` / `"60 分鐘"` / `"播完呢集 剩餘時間：10:00"` / `"停用"`；未開 =「停用」`aria-pressed=true`，開緊 = 揀中嗰粒 `true`、其餘 `false`；停今晚後排程掣讀「15 分鐘，每晚 22:30」（S-1202）。冇嘢播 / 直播嘅「播完呢集」`aria-disabled=true` 由 unit 證（`SleepTimerEntry.test.tsx:260`）。⚠️ 真機 VoiceOver / TalkBack 留用戶

## Findings

冇（冇三層收斂嘅 🔴 / 🟡；冇 🟢 / Observation）

## 建議補測

- no edge case gap（每晚排程嘅邊界、W-820、多分頁、storage 失敗已有 unit 鎖住）

Freeze：10 條鏈 S1 用 ledger 原有成條 chain + stage 檔 + 新檔重新 freeze（player-core 115→120、mini-player 94→113、repo-tooling 48→49，其餘行數不變；同 freeze 前逐行（chain + stage + path）比對冇少行）。`impact` 之後仍列 REVERIFY 係因為 S3 行 STALE，留 v2.1.0 S3

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 4 / REVERIFY 10 / UNCOVERED 25"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: ">=83% lines on changed files"
next_action: merge_develop
next_agent: null
branch: "feature/player/sleep-timer-ui"
context: "S1 9d lane 3 @7c4a3228 pass: unit 3173/3173, CI #587 green incl. e2e (sleep timer 30/30), e2e:visual day scenes 0 diff, night diff only moon + mini player title/date; 10 chains S1 frozen; merge target release/v2.1.0; real-device VoiceOver/TalkBack left to user"
blockers: []
```
