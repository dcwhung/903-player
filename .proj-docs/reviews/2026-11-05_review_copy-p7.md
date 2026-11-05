# Code Review — 2026-11-05 — P7 文案修改

- 審閱者：Code Reviewer（獨立，worktree `.claude/worktrees/review-p7`）
- 目標：`55c21c8..5af9931`：`3d10080` feat(i18n) P7 文案決定、`5af9931` fix(a11y) 讀屏日子統一
- SSoT：用戶 2026-11-05 確認嘅文案決定（全域規則 + P7 表：A1–A4、B3、B4、B7、C3）
- Tier：T1（文案 / 讀屏名，冇邏輯改動）
- 總評：決定逐條落實，刪 key 冇殘留，`zhHKCopy.test.ts` 鎖住重複字。冇 🔴 / 🟡

## Hard Gates

all pass：`npx tsc -b` exit 0（`MessageKey` 型別會捉晒舊 key 引用）；`npm run lint` exit 0；相關 unit（diff 入面 21 個 test 檔 + PlayerHandle、TodayShowList）23 files / 487 tests 全綠（冇跑 full suite / e2e）；冇新依賴。CI 見文末。

## 評分結果

| 維度     | 得分    | 滿分    | 備注 |
| -------- | ------- | ------- | ---- |
| 正確性   | 25      | 25      |      |
| 安全性   | 20      | 20      |      |
| 可維護性 | 20      | 20      |      |
| 測試覆蓋 | 15      | 15      |      |
| 性能     | 10      | 10      |      |
| 代碼風格 | 10      | 10      |      |
| **總分** | **100** | **100** |      |

**結果：✅ pass**

## 決定逐條核對

| 代號      | 結果 | 覆核                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1        | ✅   | 「已聽完」全刪（`bookmark.watched`、`drama.groupDone` → `common.status.watched`「已收聽」）；`zhHKCopy.test.ts` 鎖住冇「已聽完」。`未聽完`、`聽完 {done} / {total} 個`、`聽完 · {count} 集` 唔係「已聽完」，決定冇要求改                                                                                                                                                                                                                                                                                                                                         |
| A2        | ✅   | `PLAYBACK_STATUS_KEY.paused` → `common.status.resumeOf`（清單行暫停寫「聽到 x / y」）；播放器「現正播放」行仍用 `PLAYBACK_LINE_KEY.paused`（`episodes.pausedLine`），把手 `PlayerHandle` 用 `common.status.paused`「已暫停」；收藏 tab 行本身已經係「聽到 x / y」                                                                                                                                                                                                                                                                                                |
| A3 + 讀屏 | ✅   | 新 `formatSpokenDate` / `dates.spoken`「17/10 星期六」；收藏行、最近收聽、☆ 讀屏名、日子條 `DayCell`、轉集區名 / 轉集通知、mini player 指示點 / 開頁掣全部改用。`PlayerPanel.dateLabel` 只去 `DateStrip` 嘅 `hidden` span（`aria-labelledby`）同 `useStepAnnouncement`，畫面字冇變 ✅。其餘 `formatDateLabel` 都係畫面字（mini player 副標題、NowPlaying、鎖屏 metadata），屬顯示格式 ✅                                                                                                                                                                         |
| A4        | ✅   | `common.status.{playing,paused,watched,unwatched,resume,resumeOf}`；`episodeStatus`、`savedItems`、`TodayShowList`、`arcLabels`、`PlayerHandle`、`EpisodeRow` 改用。刪走嘅 17 個 key（`dates.watched`、`episodes.paused/resume/watched/unwatched`、`bookmark.playing/resume/resumeNoTotal/watched/unwatched`、`homeCard.pausedStatus`、`pageHandle.playingStatus`、`today.status*` 三個、`drama.groupPlaying/groupDone`）喺 `src` / `e2e` grep 都係 0 引用 ✅；e2e 改咗嘅字串（讀屏日子、「左右滑動」）同新文案一致，`homeWide.mjs` 「已暫停」係把手，符合 A2 ✅ |
| 重複鎖    | ✅   | `zhHKCopy.test.ts`：`common.status` 以外冇 key 嘅值同任何狀態字完全一樣                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| B3        | ✅   | `bookmark.seriesName: '{title}{sep}{arc}'`，`sep` = `common.separator`；`useSavedView` 唔再寫死模板字串                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| B4        | ✅   | `bookmark.toggleCurrent`「收藏本集」                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| B7        | ✅   | 第三個 tab `title` = `aria-label`（我的收藏 / 最近收聽），跟狀態換；HomeTabs test 有覆蓋                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| C3        | ✅   | `cardStack.label`、`episodes.switchHint`「左右滑動」；「向左掃」（`bookmark.removeHint`）維持；test 鎖住冇「掃動」                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## 🟢 Suggestion / Observation

- S-716 `src/pages/home/savedItems.ts:72-73`：B3 嘅名只用喺讀屏名（`bookmark.open/play/pause`，畫面段頭另外顯示短篇名），所以讀屏會讀到「·」。部分讀屏軟件會讀做「點」。P8 F2 已經定咗讀屏名「唔讀『·』」；建議下次 grill 時確認讀屏名嘅短篇劇名係咪改用「，」（例如 `seriesSpokenName`），今次照決定做，唔扣分
- S-717 `src/i18n/zh-HK.ts:76-233`：字典入面仍然有十幾句直接寫 `' · '`（`episodes.playing`、`today.timeWithStatus`、`drama.seriesLabel`…）。G2 決定針對 CSS `content` 同 code `join`，兩樣都已經冇；字典內嵌係咪都要改用 `{sep}`，可以喺 P8 一齊定
- S-718 `src/i18n/zh-HK.ts:81`：`episodes.playing` 仍然係「播放中 · {current} / {total}」整句，冇由 `common.status.playing` + `common.separator` 砌。`zhHKCopy` 只比完全相同嘅值，所以冇算重複；同 S-717 一齊處理就得

## ✅ 做得好嘅地方

- 刪 key 靠 `MessageKey` 型別 + grep 雙重確認，冇殘留
- `formatSpokenDate` 一個 helper 統一全 app 讀屏日子，畫面同讀屏分得清（`label` / `spokenLabel`）
- 文案規則寫入 `zh-HK.ts` 檔頭，之後有得跟

## CI

- `5af9931` → run [#100 / 42127264904](https://github.com/dcwhung/903-player/actions/runs/42127264904)：**success**（Detect code changes ✅、Lint, unit & build ✅、E2E (Playwright) ✅）
- 對照：`3d10080` run #98 success

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/bookmark/episode"
context: "P7 copy 5af9931 passes at 100 (CI run 100 green): A1-A4, B3, B4, B7 and C3 all applied, no deleted key still referenced. Only 🟢 S-716 to S-718 (screen readers reading the · separator, separators still written into dictionary strings). Integration branch is main."
```
