# QA — mini-player（9d Lane 1 播放掣外圈）— 2026-11-19 — S1

- PR #282 `feature/mini-player/progress-ring` → `release/v2.1.0` | Tier: T1 | Code commit: `63c89d2c` | Verdict: ✅ pass
- Ledger（base `6eae3cec` = `git merge-base HEAD origin/main`）：SKIP 9 / REVERIFY 5（`mini-player`；`catalog-data` `show-today-page` `ui-foundation` `coming-soon` 只係共用檔，見下）/ UNCOVERED 42（`miniPlayerRing.{ts,node.test.ts}` + `_mockups_/sleep-timer/*` → 收入 `mini-player`）
- Plan：沿用 `.proj-docs/qa/plans/mini-player.md`（冇改；core glob `MiniPlayer/*` 已包新檔）；L1：`.proj-docs/plans/2026-11-19_plan_9d-sleep-timer.md` Lane 1、`_mockups_/sleep-timer/index.html` M7

## Runs

| Command                                                                                                               | Result                                                                               | Time |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---- |
| `npm test -- <plan 列明 5 個 path>`                                                                                   | 14 files / 162 tests 綠                                                              | 10s  |
| `npx vitest run --project @903-player/player src/components/pages/home/MiniPlayer/ --coverage.*`（4 個改咗嘅 ts/tsx） | stmts / branches / funcs / lines 100%                                                | 3s   |
| Playwright a11y + hit-test（scratchpad script，`vite preview --mode e2e`，port 4593，390×844 / 768×1024 / 844×390）   | 21/21 PASS，pageerror 0                                                              | ~60s |
| CI `ci.yml` run #563（44520351702）@ `63c89d2c`                                                                       | lint / tsc / unit / build ✅；E2E ❌ KI-002（install Chromium 時 apt 503，e2e 未跑） | —    |
| `E2E_PORT=4593 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（本地補 KI-002，code 同 `63c89d2c` 一樣）      | 1099 PASS / 0 FAIL（mini player 相關 51 行，plan 列明 sections 全綠）                | ~11m |
| e2e:visual（developer 跑，base vs working tree）                                                                      | 引用：48 / 180 diff，全部 `home-*`（mini player 卡）                                 | —    |

## Hard Gates

all pass（PWA gate：n/a，冇改 `sw.js` / build / manifest；Security / Performance：n/a）

## 驗收重點

1. 讀屏結構（AC：Lane 1「`role="progressbar"`、`aria-valuenow`、`aria-valuetext` 照留」）
    - 三個 viewport 嘅 `ariaSnapshot` 都係 `region "正在播放（今日節目）"` → `button "開啟 …節目頁"`、`button "播放"`、`progressbar "播放進度"`、指示點 group、`button "關閉播放器"`
    - `button` 同 `progressbar` 同一個 parent（`.toggleRing`），progressbar 入面 0 個 button；SVG `aria-hidden`
    - `getByRole('button', { name: '播放' }).click()` → 變「暫停」；7 秒後 `aria-valuetext` `0:00 / 10:00` → `0:06 / 10:00`、`aria-valuenow=1`、`stroke-dasharray="1.29 128.81"`（圈跟進度行）
    - 撳圈位置（掣左邊 3px）`elementFromPoint` 命中「播放」button；圈 box = 掣 box = 44×44
    - ⚠️ cloud 冇真 VoiceOver / TalkBack：以上係 Chromium accessibility tree 證據；**手動讀屏留待用戶真機**（iOS VoiceOver、Android TalkBack 各讀一次 mini player）
2. e2e:visual：developer 喺 `c6656e9b` 跑（48 / 180，12 viewport × `home-dramas` `home-paused` `home-saved` `home-shows`，冇其他頁）。`63c89d2c` 只係將幾何常數搬去 `miniPlayerRing.ts`（數值一樣）+ 加 node test，render 冇變，唔重跑
3. Mockup M7 對照：截圖（scratchpad `mini-390.png`）外圈由 12 點順時針、強調色、軌道淡色，掣實色圓底縮細唔貼卡邊

## Findings

冇（冇三層收斂嘅 🔴 / 🟡；冇 🟢）。CI：KI-002：run #563 嘅 E2E job 死喺 runner 裝 Chromium（基建），唔計 fail；e2e 證據用上面本地 run。**未 push**：要 main agent rerun 個 E2E job 綠咗先 push / merge

其他 REVERIFY 鏈（唔屬今次 S1）：`catalog-data`（`MiniPlayer.test.tsx`）、`show-today-page`（`MiniPlayerRow.tsx`）、`ui-foundation` / `coming-soon`（`tokens.css` 只加一個 token）：共用檔改咗令佢哋 STALE，行為已由本鏈驗；留 v2.1.0 S3 按各自 plan 處理（S3 包 S1）。已 SKIP：admin api bookmark card-zoom drama home player-core pwa-shell repo-tooling（frozen, untouched）

## 建議補測

- no edge case gap（外圈 dash 計算由 `MiniPlayer.test.tsx` 0 / 11% + `miniPlayerRing.node.test.ts` 幾何鎖住；非高風險邏輯）

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 9 / REVERIFY 5 / UNCOVERED 42"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "100%"
next_action: merge_develop
next_agent: null
branch: "feature/mini-player/progress-ring"
context: "S1 mini-player @63c89d2c pass: unit 162/162, changed-file coverage 100%, local e2e 1099 PASS (CI #563 E2E = KI-002 infra), a11y tree: button + progressbar siblings, 播放/暫停 operable; mini-player S1 frozen 94 files; merge target release/v2.1.0; manual VoiceOver/TalkBack left to user device"
blockers:
  - "CI run 44520351702 E2E job failed at Install Playwright Chromium (KI-002, apt 503) - rerun E2E job and wait green before push / merge; branch not pushed"
```
