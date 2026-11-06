# QA — 收藏 tab 執位（saved-tab-polish）— 2026-11-06 — S1

- Tier: T1（PATCH v1.28.2，CSS + `useViewportGap` 搬去 App）| Commit: `3033bac`（code = `fd2b670`，之後淨係 review docs）| Verdict: ✅ pass
- Branch: `fix/ui/saved-tab-polish`；review `.proj-docs/reviews/2026-11-06_review_saved-tab-polish.md`（100）；AC（L1）：用戶 2026-11-06 決定 1–4（baseline v1.28.1 截圖）→ 已寫入 `plans/bookmark.md` AC-12
- Ledger（`impact --since 3a7ff2f`）：SKIP 1（card-zoom）/ REVERIFY 10（bookmark、catalog-data、coming-soon、drama、home、mini-player、player-core、pwa-shell、show-today-page、ui-foundation）/ UNCOVERED 2（`Toast/toastOffset.node.test.ts` → 併入 bookmark；`src/App.test.tsx` → 併入 pwa-shell）+ `node_modules`（QA worktree symlink，唔係 repo 檔）；SKIP card-zoom frozen @`4a0d02a`

## Runs

| Command                                                                                                                                         | Result                                         | Time  |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----- |
| CI [42220721975](https://github.com/dcwhung/903-player/actions/runs/42220721975) @ `fd2b670`（changes / lint + unit + build / e2e Playwright）  | success（引用，全部 e2e section 唔重跑）       | —     |
| `npx vitest run` 10 條 REVERIFY 鏈 plan 嘅 unit 指令（合併一次）+ `src/App.test.tsx`                                                            | 2456/2456                                      | 97s   |
| `npx vitest run --coverage`（`App.tsx`、`MiniPlayer.tsx`、`useViewportGap.ts`）                                                                 | lines 100%（branch 83%）                       | 10s   |
| `npm run build -- --mode e2e`：branch + `origin/main`（v1.28.1 baseline）各一次，`vite preview` 4291 / 4292                                     | ok                                             | 25s   |
| Playwright Chromium（`/opt/pw-browsers/chromium`，DPR 2，深色）：scratchpad `qa-saved.mjs`、`drama-toast.mjs`；冇 mini player = 29/11（日）時鐘 | 全部符合決定（見下）                           | 3 min |
| `npx playwright install webkit`（試一次）                                                                                                       | ❌ `Download failure, code=1` → 見 Observation | 20s   |

## 決定抽查（branch vs v1.28.1；headless offset = 8px）

| 決定                      | 結果（L2）                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 捲動條唔畀 banner 遮    | 收藏 `.scroll`、`.recentScroll` computed `isolation: isolate`（v1.28.1 = `auto`）✅；Chromium 重現唔到原 bug → Observation                                            |
| 2 短提示（冇 mini）       | 離 viewport 底：主頁（左滑移除）8 / 節目頁 8 / 劇集頁（收藏本集、清單 ☆ 兩個入口）8 = offset ✅（v1.28.1 三頁都係 40）                                                |
| 2 短提示（有 mini）       | 主頁 30/11：離底 104、離 mini player 頂 12，同 v1.28.1 一樣 ✅                                                                                                        |
| 3 最近收聽到底（冇 mini） | 390×844 / 844×390 / 1000×460：`main` padding-bottom 8px、最近收聽 panel 離底 8 ✅（v1.28.1 = 12）；收藏區高 422.7 / 304 / 374（v1.28.1 418.7 / 300 / 370，+4 跟住伸） |
| 3 有 mini player          | 三個尺寸 padding-bottom 104、panel 離 mini player 12、收藏區高 326.7 / 208 / 278，同 v1.28.1 逐個數一樣 ✅                                                            |
| 4 左滑拖到盡              | 拖 100% / 130%（未放手）：行 `8px`、紅底 `8px`；130% 時紅底右邊兩角圓（v1.28.1 紅底 `0px`，130% 見直角）✅（`*_swipe_1.3.png`）                                       |

截圖：`/tmp/claude-0/-home-user-903-player/1d18003d-6219-52fc-9f87-d73f739428ec/scratchpad/shots-qa-saved/`（`branch_*` / `base_*`，24 張，唔 commit）

## Hard Gates

all pass（PWA gate：n/a，`App.tsx` 只加 `useViewportGap()`，唔掂 sw / manifest / build / 更新邏輯；Coverage 見 Runs）

## Findings（冇 🔴 / 🟡）

- Observation：決定 1（iOS 捲動條）喺 WebKit 未驗 — sandbox 下載唔到 WebKit；Chromium 本身重現唔到。建議用戶喺 iPhone 收藏 tab 捲一下望捲動條頂（唔 block）

## 建議補測

- none（CSS / hook 搬位，新 node test + `App.test.tsx` 已鎖住；冇高風險邏輯）

## Freeze

- S1 freeze @`3033bac`：bookmark（+ `toastOffset.node.test.ts`）、catalog-data、coming-soon、drama、home、mini-player、player-core、pwa-shell（+ `App.test.tsx`）、show-today-page、ui-foundation；之後仍出 REVERIFY 嘅鏈係佢哋嘅 **S3** 行 STALE（舊 freeze），留待下次 S3 release refreeze

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: 3033bac (code fd2b670)
report: .proj-docs/qa/2026-11-06_qa_saved-tab-polish.md
findings: C=0, W=0, S=0, observation=1 (iOS scrollbar unverified in WebKit: download failed)
tickets: none
next_action: main agent merge PR (optional: user checks saved-tab scrollbar on iPhone)
context: CI 42220721975 @fd2b670 cited; unit 2456/2456; Chromium DPR2 branch vs v1.28.1: toast 8px (home/show/drama) no-mini, unchanged with mini; recent panel to bottom 3 viewports; swipe red bg 8px corners; 10 chains S1 frozen @3033bac
```
