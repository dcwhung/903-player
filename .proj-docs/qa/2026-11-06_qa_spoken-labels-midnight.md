# QA — 讀屏「正在播放」+ 香港午夜換日（spoken-labels-midnight）— 2026-11-06 — S1

- Tier: T1（PATCH v1.28.5）| Commit: `ce12d03`（code = `01c2016`，之後淨係 review docs）| Verdict: ✅ pass
- Branch: `claude/amazing-volta-6qrm4p`；review `.proj-docs/reviews/2026-11-06_review_spoken-labels-midnight.md`（C=0 W=0，S-738 入 backlog，唔再提）
- 範圍：S-735 / S-736 / S-737（NowPlaying 讀屏標籤：主頁卡、ShowPage、DailyDramaPage；ArcPicker chip `dramaEpisodeSpokenLabel`）、S-704（`useHkToday` 香港午夜 timer + `visibilitychange` → `useTodaysEpisodes`）、S-701 / 714 / 715 / 719 清理、v1.28.5、`.proj-docs/backlog.md`
- Ledger（`impact --since dc35f44`）：SKIP 2 / REVERIFY 9（bookmark、card-zoom、catalog-data、coming-soon、drama、home、mini-player、player-core、show-today-page）/ UNCOVERED 2（`src/hooks/useHkToday.ts` + test → 併入 coming-soon，plan 已加 scope 同指令）/ IGNORED 3
- SKIP pwa-shell、ui-foundation frozen @`e04b66f`

## Runs

| Command                                                                                                                                           | Result                            | Time |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---- |
| CI [42304659635](https://github.com/dcwhung/903-player/actions/runs/42304659635) @ `01c2016`（changes / lint + unit + build / e2e Playwright）    | success（引用，e2e 唔喺本地重跑） | —    |
| `npx vitest run` 9 條 REVERIFY 鏈 plan 嘅 unit 指令（合併一次，100 個 path）+ `src/hooks/useHkToday.test.ts`                                      | 2327/2327                         | 59s  |
| `npx vitest run --coverage`（改咗嘅 8 個實作檔：`useHkToday`、`date`、`availability`、`dramas`、`NowPlaying`、`ArcPicker*`、`useTodaysEpisodes`） | lines 100%（branch 94%）          | 13s  |

## Hard Gates

all pass（PWA gate：n/a，唔掂 sw / manifest / build config / 更新邏輯；Security / Performance：n/a）

## Findings（冇 🔴 / 🟡）

- 冇新 finding；S-738 已喺 backlog（review 登記）

## 建議補測

- none（S-704 換日邏輯由 `useHkToday.test.ts` + `useTodaysEpisodes.test.ts` 鎖住；讀屏標籤由 `NowPlaying.test.tsx`、`ArcPicker.test.tsx`、`ShowPage.test.tsx`、`DramaPage.test.tsx` 鎖住）

## Freeze

- S1 freeze @`ce12d03`：上面 9 條 REVERIFY 鏈（coming-soon + `useHkToday.ts` / `.test.ts` + 更新咗嘅 plan）；之後仍出 STALE 嘅係佢哋嘅 **S3** 行（舊 freeze），留待下次 S3 release refreeze

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: ce12d03 (code 01c2016)
report: .proj-docs/qa/2026-11-06_qa_spoken-labels-midnight.md
findings: C=0, W=0, S=0, observation=0
tickets: none
next_action: main agent push branch (docs-only commit) then merge PR
context: CI 42304659635 @01c2016 success (lint+unit+build+e2e) cited; unit 2327/2327 (9 REVERIFY plans + useHkToday); changed files lines 100%; useHkToday folded into coming-soon plan; 9 chains S1 frozen @ce12d03; not pushed (per instruction)
```
