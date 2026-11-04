# QA — 2026-11-04 UI batch（把手 polish + 彈性 tabs + preview 圖）— 2026-11-04 — S1 BATCH

- Tier: T1（v1.25.0，home + ui-foundation）｜Commit: code `6c8b3a6`，HEAD `d940b14`（只加 review 報告）｜Branch `fix/home-card/handle-polish`，base `origin/main` `2c17bfc`｜Verdict: ✅ pass
- Review 97 pass（`.proj-docs/reviews/2026-11-04_review_ui-batch_batch.md`，S-675..S-678 backlog），唔抄
- Ledger（`impact --since 2c17bfc`）：SKIP 0 / REVERIFY 8（全部 chain：home、ui-foundation 直接改；其他 6 條只因 1-hop `HomeWide.tsx` / `ShowPage.test.tsx`）/ UNCOVERED 20 / IGNORED 3
    - UNCOVERED 收入鏈：`HomeTabs.test.tsx` `homeTabs.node.test.ts` `useTabDirection.ts` `PlayerHandle.test.tsx` `useLeaveFallback.ts` `useFadeOut.test.ts` `useHeldWhile.ts` → home；`cssTime{,.test}.ts` → ui-foundation。唔收入：`_mockups_/**`、`design/previews/*`、`e2e/homeWide.mjs`、`package*.json`、`.prettierignore`（同 P4 #3b O-2）

## Runs

| Command                                                                                                                                                         | Result                                                                                                           | Time |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---- |
| CI run 41908755383 @ `6c8b3a6`：changes / lint, unit & build                                                                                                    | success；unit 182 檔 / 2222 pass                                                                                 | ~8m  |
| CI run 41908755383 E2E job                                                                                                                                      | cancelled（`d940b14` push 頂咗）；41909389011 @ `d940b14` docs-only → code jobs skipped                          | —    |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e` @ `d940b14`（code = `6c8b3a6`，因 CI e2e 冇綠，每 SHA 跑一次）                                         | 631 PASS / 0 FAIL「All E2E checks passed」（含「闊橫版內頁把手」、「闊橫版主頁播放卡動畫」✕ 後繼續收聽把手淡走） | ~12m |
| `vite preview :4199` + Playwright spot-check（e2e harness，scratchpad `spot.mjs`，包住 `startViewTransition` 記 kind / ready / 開始時把手數 / player-panel 數） | 30 / 31 PASS（1 個係 spot-check 預期錯，見 O-1），0 pageerror                                                    | ~3m  |
| Playwright `file://` 開 6 個改咗嘅 `design/previews/*.html`（scratchpad `prev.mjs`）                                                                            | 0 個 file request 失敗、0 張 broken `<img>`                                                                      | 10s  |

## Items

- **1 把手跟開卡淡走**（1300×800 星期日）：✕ → `fillWithHandle` + 把手 → 書架 ▶ 繼續收聽：一個 `open`（ready），`startViewTransition` 嗰刻把手仲喺 DOM（入舊 snapshot），finished 後 0、`split`；撳把手路徑只一個 `open`；reduced-motion 0 個過場、300ms 內冇把手
- **2 內頁把手 polish**（`#/drama/chisee`，播緊公子會）：
    - S-664：把手淡出中（token 拉長到 3000ms 先撳得切）撳返回主頁 → 一個 `back` ran=true，開始時 leaving 1，`player-panel` 名 1 個（冇重複），落 `split`
    - S-665：1300×800 → 390×844 / 844×390，100ms 內把手 0、右預留 45px → 0；淡出中轉直都即刻拆
    - S-666：淡出中加 `animation:none`（animationcancel）500ms 內拆；冇動畫開始過 → 後備 timer 拆（~354ms 連 click）
    - S-667：淡出中 `inert=true`、`aria-hidden="true"`、a11y tree 冇把手掣、撳唔到（留喺劇集頁）
    - S-668：離開之前已轉 reduce → 冇 `data-leaving`、即刻拆
- **3 S-661**：6 個改咗嘅 preview 喺瀏覽器開，0 個 file request 失敗
- **4 P5 #1 彈性 tabs（E2）**：1300×800 / 390×844 / 844×390：一粒 `[data-home-tab-pill]`；~65ms 時前邊已郁（+88..200px）、後邊 0；中途 385→703 / 175→319 / 402→731px，落喺揀中 tab（中心差 0）；兩個方向都係；第一次 render 同 `#/show/gongzi` 返主頁：冇 `data-direction`；aria-pressed 跟住轉，鍵盤 Enter / Space 換得到；reduced-motion 第一 frame 已經到位
- **5 Regression**：e2e「闊橫版內頁把手」6 / 6、「闊橫版主頁播放卡動畫」open + switch + 把手淡走綠；390×844 / 844×390：底部 mini player 有，主頁把手 0，劇集頁冇內頁把手；闊版 ✕：`fillWithHandle`、把手 1、冇 player region

## Hard Gates

all pass（Coverage：新 hook 各有 unit test（`useLeaveFallback` 經 `PlayerHandle.test.tsx` 5 個、`useFadeOut.test.ts`、`cssTime.test.ts`、`HomeTabs` 2 檔）；PWA gate n/a：冇改 sw / manifest / build config；Security / Performance n/a）

## Findings

冇 🔴 / 🟡。Observation：

- O-1 S-668 淡出**中途**先轉 reduce：Chromium（`emulateMedia`）冇發 `animationcancel`，靠後備 timer 喺 token 時長拆（真 token 240ms = 原本淡完嘅時間，唔會卡住）；spot-check 用 3000ms token 而 500ms 等，所以 test 本身預期錯。唔違反 AC（S-668 = 離開嗰刻決定）
- O-2 `_mockups_/**`、`design/previews/*`、`e2e/homeWide.mjs`、`package*.json` 照舊唔入鏈（`ledger-ignore` 仍喺 backlog）；O-3 freeze 後 home / ui-foundation 仲有 REVERIFY 係 S3 行，S1 行已 FROZEN，等 release S3

## Ledger / plans

- `freeze <chain> S1` × 8 @ `d940b14`：catalog-data 98、drama 143、home 126（119 + 7）、mini-player 52、player-core 94、pwa-shell 30、show-today-page 95、ui-foundation 76（74 + 2）
- `plans/home.md`：AC-5 加把手淡走、加 AC-6（S-664..668）、AC-7（彈性 tabs）、glob 加 `useHeldWhile*`、vitest 加 `HomeTabs/` `useFadeOut.test.ts`；`plans/ui-foundation.md`：glob + vitest 加 `cssTime*`

## 建議補測

- none（S-664 淡出中返回、S-665 轉出闊版如要長期鎖，可加入 e2e「闊橫版內頁把手」— backlog，非 gap）

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 0 / REVERIFY 8 / UNCOVERED 20"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: merge_main
next_agent: null
branch: "fix/home-card/handle-polish"
context: "UI batch S1 pass @6c8b3a6 (HEAD d940b14 docs-only): CI 41908755383 lint/unit 2222/build green, CI e2e cancelled so local npm run e2e 631/0; Playwright spot-check items 1/2/4/5 30/31 (1 test-expectation miss, O-1 Observation); design previews 0 failed requests; 8 chains frozen S1; home + ui-foundation plans updated; QA files uncommitted"
```
