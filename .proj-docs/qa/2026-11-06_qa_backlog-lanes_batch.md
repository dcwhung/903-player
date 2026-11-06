# QA — backlog lanes（batch）— 2026-11-06 — S1

- Tier: T1（PATCH v1.28.6）| Commit: `c7fa177`（code = `050e851`，之後淨係 review docs）| Verdict: ✅ pass
- Branch: `claude/amazing-volta-6qrm4p`；review `.proj-docs/reviews/2026-11-06_review_backlog-lanes_batch.md`（S-739..S-741 已入 backlog，唔再提）
- Ledger（`impact --since 9421cf1`）：SKIP 3（card-zoom、catalog-data、pwa-shell）/ REVERIFY 8（bookmark、coming-soon、drama、home、mini-player、player-core、show-today-page、ui-foundation）/ UNCOVERED 9（併入 plan，見下）/ IGNORED 5
- UNCOVERED → 鏈：`SavedRowText` / `SavedPlayButton` / `SavedOpenButton` / `savedRowState`(+test)、`useSavedView.test.tsx` → bookmark；`progressRevision.test.ts` → player-core（AC-4）；`DramaPageMidnight.test.tsx` → drama；`HomePageShelfAvailability.test.tsx` → home（plan 已加指令 / scope）

## Runs

| Command                                                                                                                                        | Result          | Time |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---- |
| CI [42310255309](https://github.com/dcwhung/903-player/actions/runs/42310255309) @ `050e851`（changes / lint + unit + build / e2e Playwright） | success（引用） | —    |
| `npx vitest run --coverage` `src/player/` + `useSavedView` / `HomeSaved` test + `SavedTab/` + `OnAirBadge/`                                    | 375/375；83/83  | 16s  |

- Unit / e2e 唔喺本地重跑：CI 同一個 SHA 跑咗全部 unit（超集，包晒 8 條 REVERIFY plan 嘅 unit 指令）同 `npm run e2e`
- Coverage：`AudioController.ts` lines 98.6%、`useSavedView.ts` 100%、`SavedRow*` / `SavedPlayButton` / `SavedOpenButton` / `savedRowState` / `OnAirLamp` 100%

## Lane A（test-only：S-703、S-738）

- 淨加 page-level test（`HomePageShelfAvailability`、`DramaPageMidnight`、`HomePageWide`），冇改 production code；CI unit 綠

## Lane B（S-710、S-709）

- 停低路徑：`pause`（`onPause` → `onStopped`）、`stop()`、`ended` 冇下一集（`onEnded` → `onStopped`）全部行 `persistStopped()`：先 `persist()` 再 bump `progressRevision`（`AudioController.ts:377`）
- 轉集（`switchTo` → `persist()` 後換 `recording`）同自動接下一集（`advance` → `persist()` 後 `load(next)`）由 `recording?.url` 觸發重讀；聽完由 `watchedRevision` 觸發 → 收藏 / 最近收聽照更新
- 播放 tick 唔 bump（`progressRevision.test.ts`）；`useRecentTracks` 只跟 `bookmarks` / `progressMap` / `index` 重計（`useSavedView.test.tsx`）

## Lane C（S-731、S-732）

- `--onair-lamp-*` token 值 = 舊寫死值（3px / 2px / 18% / `calc(10px * var(--ui-scale))`），`onAirBadge.node.test.ts` 鎖住
- `SavedRow` 拆件：developer 證據（computed style + 390 / 1366 截圖 + 8 種行狀態 DOM 一樣）喺 scratchpad `cmp/`，唔入 repo；CI e2e bookmark section 照綠

## Docs

- S-712、KI-001 / CUI-0016 用戶決定關閉（再出現先重開）；T0，唔使驗

## Hard Gates

all pass（PWA gate：n/a，唔掂 sw / manifest / build config / 更新邏輯；Security / Performance：n/a）

## Findings（冇 🔴 / 🟡）

- 冇新 finding；建議補測：none（三條 lane 都冇 edge case gap）

## Freeze

- S1 freeze @`c7fa177`：8 條 REVERIFY 鏈（加 UNCOVERED 9 個檔 + 更新咗嘅 bookmark / drama / home / player-core plan）；之後仍出 STALE 嘅係佢哋嘅 **S3** 行（舊 freeze），留待下次 S3 release refreeze

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: c7fa177 (code 050e851)
report: .proj-docs/qa/2026-11-06_qa_backlog-lanes_batch.md
findings: C=0, W=0, S=0, observation=0
tickets: none
next_action: main agent push branch (docs-only commit) then merge PR
context: CI 42310255309 @050e851 success (changes+lint+unit+build+e2e) cited, no local rerun; coverage changed files lines >=98.6%; Lane B pause/stop/ended/switch/advance paths checked; 9 UNCOVERED folded into bookmark/coming-soon/player-core/drama/home plans; 8 chains S1 frozen @c7fa177; not pushed (per instruction)
```
