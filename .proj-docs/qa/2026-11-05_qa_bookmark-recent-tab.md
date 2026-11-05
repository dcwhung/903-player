# QA — P7 跟進：第三個 tab「冇收藏有收聽記錄」（bookmark-recent-tab）— 2026-11-05 — S1

- Tier: T2（P7 跟進，未發佈 v1.27.0 內；跨 home / bookmark）｜Commit: code `4327328`（HEAD `9587c7f` = re-review 報告，`4327328..9587c7f` 淨係 docs，CI 結果適用；`8cfbd15..9587c7f`：`e286912` 功能 + `4327328` W-535 修正）｜Verdict: ✅ pass
- Ledger（`impact --since $(git merge-base HEAD origin/main)`）：SKIP 0 / REVERIFY 10（bookmark + 其他 9 條；S1 stale 因為 `HomePage.tsx` `HomeStack.tsx` `HomeWide.tsx` `HomePage.test.tsx` `HomeTabs/*` `useHomeTab.ts` `useLeaveFallback.ts` `icons.tsx` `zh-HK.ts` `tokens.css` 改咗）/ UNCOVERED 6（新 `useModeSwap.ts` `recentTab.node.test.ts` 收入 bookmark；`e2e/*.mjs`、`package*.json` 照舊唔收入）
- SSoT：`origin/feature/transfer/qr-sync:_mockups_/qr-transfer/index.html` ① ②（plan AC-9）

## Runs

| Command                                                                                                  | Result                                                             | Time |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---- |
| CI #89 [42097862989](https://github.com/dcwhung/903-player/actions/runs/42097862989) @ `4327328`（引用） | lint / unit 200 files 2434 tests / build / e2e 700 PASS 全 success | 引用 |
| `npx vitest run` 改動相關 11 檔 + `--coverage`（只計 11 個改動 src）                                     | 175 / 175；lines 99.15%（最低 `useHomeTab.ts` 94.4%）              | ~40s |
| `npm run build` + `vite preview --port 4184` + Playwright 手動腳本（3 版面 × 正常 / reduced motion）     | 90 / 90 PASS，pageerror 0                                          | ~2m  |

## AC 對照（AC-9，手動腳本 + CI e2e）

- A / B / C：C（冇 storage）3 個版面都冇第三格（0 粒掣）；B 讀屏名「最近收聽」+ `history` icon，撳入去成個 tab 區係 region「最近收聽」、10 行、冇收藏 box；B→A 之後讀屏名「我的收藏」+ `star`
- 欄數：手機 1、窄橫版 844×390 2、闊橫版 1300×800 2；窄橫版截圖係直排（第一欄 19/10 → 17/10 → 16/10，第二欄接落去）
- 捲動：3 個版面第 7–10 行 `scrollIntoView` 之後 `elementFromPoint` 撳得中（W-535 冇回歸）；CI `rowsReachable` 同樣綠
- 對齊：每欄名 `text-align: left`、名 left 位一致、☆ 距右邊一致（每欄 1 個值）；CI 長名 ☆ 對齊綠
- A↔B 過場：B→A（撳 ☆）tab 留喺第三格、`star`、1 個 box；`data-leaving` 約 220ms 清走，淡入完 opacity 1；A→B（左滑移除最後收藏）變返「最近收聽」、`aria-pressed=true`（唔跳返節目）、`history`、冇殘留 `data-leaving`
- 減少動態：`reducedMotion: 'reduce'` 撳 ☆ 即刻 `data-leaving` 0（直接換），其餘斷言同上
- 撳行入頁唔播：B 撳「開啟 在晴朗的一天出發 19/10（一）」→ `#/show/sunnyday`，mediaSession `paused`
- 唔做同步掣：bundle 冇「同步至另一部機」

## Hard Gates

all pass（Coverage 見上表；PWA gate n/a，冇改 sw / manifest / build / 更新邏輯）；KI-001 冇出現

## Findings

- 冇 🔴 / 🟡；冇新 🟢 / Observation（review 嘅 S-709 / S-710 / S-712 已經喺 backlog，唔重複）

## Ledger / plans

- `plans/bookmark.md`：加 AC-9（qr-transfer ① ②），AC-2 改做「收藏同收聽記錄都冇先跳返節目」；scope 加 `useModeSwap` `recentTab.node.test.ts` `HomeWide.tsx` `useLeaveFallback.ts`；e2e 加 3 個版面 × 2 個最近收聽 section；out of scope 加 QR 同步掣
- `freeze <chain> S1` @ `9587c7f`：bookmark + card-zoom catalog-data drama home mini-player player-core pwa-shell show-today-page ui-foundation（plan 列明嘅 unit / e2e 都喺 CI #89 同一份 code 綠）

## 建議補測

- none（AC-9 嘅 C 狀態同 B→A 過場而家淨係手動腳本驗；如果之後再改第三格邏輯，可以考慮搬入 `e2e/bookmark.mjs`，backlog）

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 0 / REVERIFY 10 / UNCOVERED 6 (base merge-base origin/main); froze S1 bookmark + 9 chains @9587c7f; all S1 FROZEN (old S3 rows wait for release)"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
findings: []
next_action: merge_main
next_agent: null
tickets: []
branch: "feature/bookmark/episode"
context: "recent-only third tab S1 pass @4327328 (HEAD 9587c7f docs only). CI #89 42097862989 success cited (unit 2434, e2e 700). Manual Playwright 90/90: A/B/C states x3 layouts, A<->B swap not stuck, reduced motion direct swap, rows 7-10 reachable, left align + star column, recent row opens page without playing, no sync button. Coverage of 11 changed src 99.15% lines. bookmark plan +AC-9. QA files uncommitted (QA does no git ops)"
```
