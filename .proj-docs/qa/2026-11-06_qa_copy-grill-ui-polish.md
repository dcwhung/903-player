# QA — 文案 grill + UI 執位（copy-grill-ui-polish）— 2026-11-06 — S1

- Tier: T1（PATCH v1.28.1，文案 / 讀屏 + CSS 執位）| Commit: `ec10824`（code = `c23d30a`，之後淨係 review docs）| Verdict: ✅ pass
- Branch: `fix/ui/copy-grill-and-polish`；review `.proj-docs/reviews/2026-11-06_review_copy-grill-ui-polish.md`（Re-review 1 = 100）
- AC（L1）：用戶 2026-11-06 確認嘅 B1、B2、C4、D4、S-716 / S-717 / S-718；UI baseline = 用戶 production 截圖；已寫入 `plans/bookmark.md` AC-11
- Ledger（`impact --since d034254`）：SKIP 2（card-zoom、pwa-shell）/ REVERIFY 9（bookmark、catalog-data、coming-soon、drama、home、mini-player、player-core、show-today-page、ui-foundation）/ UNCOVERED 2（`SavedTab/removeHint.tsx`、`SavedTab/savedPolish.node.test.ts` → 併入 bookmark）+ `node_modules`（QA worktree 嘅 symlink，唔係 repo 檔）
- SKIP card-zoom frozen @`4a0d02a`；SKIP pwa-shell frozen @`4a0d02a`

## Runs

| Command                                                                                                                                        | Result                                                                 | Time  |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----- |
| CI [42201282970](https://github.com/dcwhung/903-player/actions/runs/42201282970) @ `c23d30a`（changes / lint + unit + build / e2e Playwright） | success（引用，unit + 全部 e2e section 唔重跑）                        | —     |
| `npm run build -- --mode e2e` + `npx vite preview --port 4191`                                                                                 | ok                                                                     | 30s   |
| Playwright Chromium（`/opt/pw-browsers/chromium`，DPR 2）手動抽查：scratchpad `qa/check.mjs`、`qa/pad.mjs`                                     | 全部符合決定                                                           | 3 min |
| `npx playwright install webkit`（試一次）                                                                                                      | ❌ `Failed to download WebKit 26.6`（download code=1）→ 見 Observation | 20s   |

## 決定抽查

| 決定                  | 結果（L2）                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1                    | 390×844 收藏 tab：Delete、Backspace、左滑過四成三種移除都出「已移除收藏」，畫面冇復原掣 ✅                                                                            |
| B2                    | 6 行（連 2 行已下架）全部 `aria-keyshortcuts="Delete Backspace"`、冇 `title`、`aria-describedby` → 「向左滑動或者撳刪除鍵移除收藏」（1×1 隱藏）✅                     |
| C4                    | 今日 ☆：「收藏 在晴朗的一天出發 30/11 星期一」「收藏 Bad Girl大過佬 30/11 星期一」…（390、1300 一樣）✅                                                               |
| D4                    | 劇集格讀屏「E2E 即將劇場，全新短篇 02/12 星期三 上架；部分短篇 19/12 星期六 下架」；畫面「全新短篇 後日上架」「部分短篇 19/12 下架」✅（1600×800 角落由 CI e2e 覆蓋） |
| S-716 / 717 / 718     | 收藏 / 節目 / 劇集頁 `aria-label` 冇「·」；收藏行讀屏「E2E 即將劇場，我心不死 第 1 集，已下架」✅；字典由 `zhHKCopy.test.ts`（CI）鎖住                                |
| 碟（收藏 / 最近收聽） | 844×390、1300×800、390×844：細碟 `box-shadow 0 0 0 3px`（同清單細碟一樣闊），左邊離剪裁邊 = 3px = 外圈，冇剪走 ✅（`chromium-recent-844x390.png`）                    |
| 清單行左 padding      | 今日 / 節目 / 劇集頁集數行 = `10px × --ui-scale`（390：10px、1300：15px）一致 ✅                                                                                      |
| 今日播放卡            | 未開始（入頁）同播緊其他節目時，大碟都係節目碟面 `<img>`、冇 `blank` ✅（`chromium-today-playing-other-390x844.png`）                                                 |
| Toast 位置            | `Toast/`、`MiniPlayer/` 0 改動；節目頁 / 今日頁同一位置（y=759），主頁有 mini player 時浮喺佢上面（y=695，舊有規則）✅                                                |
| 收藏橫版分欄          | Chromium 1000×460、844×390、1180×820、1024×768（5 個 box）：各欄第一個 box 頂 spread = 0 ✅；WebKit 未驗                                                              |

截圖：`/tmp/claude-0/-home-user-903-player/1d18003d-6219-52fc-9f87-d73f739428ec/scratchpad/shots-qa-polish/`（唔 commit）

## Hard Gates

all pass（PWA gate：n/a，唔掂 sw / manifest / build / 更新邏輯；Coverage：CI unit 綠，新檔 `removeHint.tsx` 由 `HomeSaved.test.tsx` 覆蓋）

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation

- Observation：收藏橫版分欄喺 WebKit（iOS Safari 原本出事嘅引擎）未驗 — sandbox 下載唔到 WebKit binary；Chromium 本身重現唔到舊 bug。建議用戶喺 iPhone / iPad 橫版（≥ 2 個 box）望一眼（唔 block）
- 🟢 今日頁讀屏仍讀到「·」：未上架行「15:10 · 未上架」（= S-723，已登記）同 1300×800「現正播放：30/11（一） · 第 1 / 3 個節目」（純文字，舊有，唔屬今次決定）→ backlog

## 建議補測

- none（文案 / CSS，CI unit + e2e 已覆蓋；冇高風險邏輯）

## Freeze

- S1 freeze @`ec10824`：bookmark（+ `removeHint.tsx`、`savedPolish.node.test.ts`）、catalog-data、coming-soon、drama、home、mini-player、player-core、show-today-page、ui-foundation
- freeze 後 `impact`：S1 全部 FROZEN；catalog-data / drama / player-core / ui-foundation 仍出 REVERIFY 係因為佢哋嘅 **S3** 行（舊 path、v1.20 前 freeze）早已 STALE，留待下次 S3 release refreeze，唔關今次

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: ec10824 (code c23d30a)
report: .proj-docs/qa/2026-11-06_qa_copy-grill-ui-polish.md
findings: C=0, W=0, S=1 (S-723 known), observation=1 (saved columns WebKit unverified: download failed)
tickets: none
next_action: main agent merge PR (optional: user eyeballs saved-tab landscape on iOS Safari)
context: CI 42201282970 @c23d30a cited; Chromium manual checks B1/B2/C4/D4/S-716-718/discs/padding/today cover/toast/columns all pass; 9 chains S1 frozen @ec10824
```
