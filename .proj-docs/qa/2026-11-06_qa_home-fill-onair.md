# QA — 主頁填到底 + ON AIR（home-fill-onair）— 2026-11-06 — S1

- Tier: T1（PATCH v1.28.2 → v1.28.3，UI + 播放狀態顯示）| Commit: `ff1f6c7`（code = `5b1031a`，之後淨係 review docs）| Verdict: ✅ pass
- Branch: `fix/ui/home-fill-bottom`；review `.proj-docs/reviews/2026-11-06_review_home-fill-onair.md`（Re-review 2 = 95）；AC（L1）：用戶決定 A / B3 / C3 / D / F / G / ON AIR / O3（`_mockups_/home-fill-bottom/index.html`）→ 寫入 `plans/show-today-page.md` AC-4
- Ledger（`impact --since 561066c`）：SKIP 2（card-zoom、pwa-shell）/ REVERIFY 9（bookmark、catalog-data、coming-soon、drama、home、mini-player、player-core、show-today-page、ui-foundation）/ UNCOVERED 14 → 併入鏈：`OnAirBadge/*`、`EpisodeRowBody.tsx`、`wideRow.node.test.ts`、`TodayShowRowParts.tsx`、`landscapeColumns.node.test.ts` → show-today-page；`RecentPanel.test.tsx`、`SavedPlayingRow.test.tsx` → bookmark；`showGridCss.node.test.ts` → home；`e2e/hiddenPlayback.mjs` → player-core；`_mockups_/home-fill-bottom/index.html` = design origin（唔入鏈）；`node_modules` = QA worktree symlink；SKIP card-zoom frozen @`237af76`、pwa-shell frozen @`3033bac`

## Runs

| Command                                                                                                                                        | Result                                      | Time  |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----- |
| CI [42270100479](https://github.com/dcwhung/903-player/actions/runs/42270100479) @ `5b1031a`（changes / lint + unit + build / e2e Playwright） | success（引用，全部 e2e section 唔重跑）    | —     |
| `npx vitest run` 9 條 REVERIFY 鏈 plan 嘅 unit 指令（合併一次）+ `OnAirBadge/` + `landscapeColumns.node.test.ts`                               | 2426/2426                                   | 90s   |
| `npx vitest run --coverage`（24 個改咗嘅 src 檔）                                                                                              | lines 96.4%（最低 `useDramaPage.ts` 85.7%） | 40s   |
| `npm run build -- --mode e2e` + `vite preview` 4311；另一個 build 臨時畀 fixture 我心不死加長集名（唔 commit，已 checkout 返）preview 4312     | ok                                          | 50s   |
| Playwright Chromium（`/opt/pw-browsers/chromium`，DPR 2，深色）：scratchpad `qa-homefill.mjs`、`qa-hf-c3.mjs`、`qa-hf-tag.mjs`                 | 全部符合決定（見下），pageerror 0           | 4 min |

## 決定抽查（L2）

| 決定                               | 結果                                                                                                                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A 冇 mini player                   | 390×844 / 844×390 三個 tab：`main` padding-bottom 8px = `--mini-player-offset-bottom` ✅                                                                                         |
| B3 / C3                            | 節目格 h/w 0.312（≤ 16:9 × 1.5）✅；劇集格 focus 以下 `translateY(10.74) scale(.94)` = 以卡底縮，最尾卡底 828 ✅；reduce → transition 0s ✅                                      |
| D 未揀短篇                         | 芝See：播放 / 收藏本集 `aria-disabled=true`、opacity .45 ✅（撳唔郁由 CI e2e 鎖住）                                                                                              |
| F banner                           | `--saved-banner-tall` 直版 108.5 / 窄橫版 92.5 / 1366×768 133.3；banner 實高 108.5 / 92.5 ✅                                                                                     |
| ON AIR 播緊                        | 收藏 tab、今日節目、劇集頁（直 / 窄橫 / 闊）、主頁闊卡：紅 pill「播放中」+ 3px 紅條，冇 outline / box-shadow ✅；reduce → 條同 equaliser 冇動畫 ✅                               |
| ON AIR 暫停                        | 全部轉灰條（靜止）、冇 pill；收藏「聽到 1:01 / 10:00」、劇集頁「聽到 33:33 / 44:00」、主頁 1600×900 卡「聽到 0:02 / 10:00」（bug fix）✅；揀中底色保留 ✅                        |
| 狀態換行                           | 直版劇集頁：「聽到」第 1 行、「33:33 / 44:00」成段第 2 行；播緊 pill 第 1 行、時間第 2 行，冇斷開 ✅                                                                             |
| O3 闊橫版                          | 1300×800：清單欄 510 = 340×1.5、☆ 48 = 32×1.5；1024×600：442 = 340×1.3、☆ 41.6；暫停一行，時間離 ☆ 21 / 18px；播緊時間離 ☆ 73 / 64px ✅                                          |
| 手機打橫 / 直版                    | 844×390：☆ 40、清單 54%（455.75px）、暫停一行；直版 ☆ 40 ✅                                                                                                                      |
| Reviewer：窄欄 + 長集名 + 下架 tag | 1024×600（欄 442）/ 1180×820 / 1300×800，我心不死第 3 集（17 字集名）+「⏳ 明日下架」：tag 全部顯示（scrollWidth ≤ clientWidth）、同 ☆ / ▷ / 集名都冇重疊；播緊加 pill 都一樣 ✅ |

截圖：`/tmp/claude-0/-home-user-903-player/1d18003d-6219-52fc-9f87-d73f739428ec/scratchpad/shots-qa-homefill/`（31 張，唔 commit）

## Hard Gates

all pass（PWA gate：n/a，唔掂 sw / manifest / build config / 更新邏輯；`package.json` 淨係改 version）

## Findings（冇 🔴 / 🟡）

- Observation：今日節目清單揀中但暫停寫「06:00 · 未收聽」唔係「聽到 x / y」— 今日清單本身一直只分已收聽 / 未收聽，決定冇講要改（灰條、冇 pill 已符合）；如要一致可入 backlog
- Observation：窄欄長集名 + 下架 tag 時，「· ⏳ 明日下架」換去第 2 行，「·」喺行頭（唔係吊喺第 1 行尾），tag 完整

## 建議補測：none（CSS / 顯示邏輯，新 node test + e2e section 已鎖住；冇新高風險邏輯）

## Freeze

- S1 freeze @`ff1f6c7`：bookmark、catalog-data、coming-soon、drama、home、mini-player、player-core、show-today-page、ui-foundation（連同上面併入嘅新檔）；之後 `impact` 仍出 REVERIFY 嘅 player-core、show-today-page、ui-foundation 淨係 **S3** 行 STALE（舊 freeze），留待下次 S3 release refreeze

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: ff1f6c7 (code 5b1031a)
report: .proj-docs/qa/2026-11-06_qa_home-fill-onair.md
findings: C=0, W=0, S=0, observation=2 (Today list paused shows 未收聽 not 聽到; leaving tag wraps with leading separator)
tickets: none
next_action: main agent merge PR
context: CI 42270100479 @5b1031a cited; unit 2426/2426; coverage lines 96.4%; Chromium DPR2 spot-check A/B3/C3/D/F/ON AIR/O3 + reviewer narrow-column long-title leaving-tag all ok; 9 chains S1 frozen @ff1f6c7
```
