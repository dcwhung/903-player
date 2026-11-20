# 9b 開發 plan：HomeView 閒置畫面（ambient）（v2.2.0）

## 進度（2026-11-20）

| 步驟    | 狀態                                  |
| ------- | ------------------------------------- |
| Preview | ✅ 第 3 版（用戶已揀款式）            |
| Plan    | ⏳ 待用戶 confirm（下面「待決」3 條） |
| Lane 1  | 待開始：閒置偵測 + 畫面資料（純邏輯） |
| Lane 2  | 待開始：閒置畫面 UI + 叫醒 + e2e      |
| S3      | 待開始：QA S3 + player 2.1.0 → 2.2.0  |

- Preview：https://claude.ai/artifact/JDZSeM7TdcTY2wCY5kQmEc（`_mockups_/home-view-ambient/`，branch `docs/mockup/home-view-ambient`）
- 需求來源：`.proj-docs/plans/2026-11-04_plan_requirements-priority.md` 9b

## Context

用戶 2026-11-19 決定 9b / 9c / 9d 逐項出 MINOR：9d = 2.1.0（已發佈）、**9b = 2.2.0**、9c = 2.3.0（依賴 9d + 9b）。

**硬性限制**：現有普通手機直／橫、平板直／橫、電腦橫版、Duo 嘅顯示零改變；HomeView 只加閒置畫面，原有頁面唔變。每個 PR 跑 `npm run e2e:visual`（凍結清單冇方形 viewport，應該零 diff）。

## 用戶決定（2026-11-19 / 2026-11-20）

| 項目       | 決定                                                                                  |
| ---------- | ------------------------------------------------------------------------------------- |
| 範圍       | 只限 HomeView 方形螢幕（`SQUARE_QUERY`）                                              |
| 幾時轉     | 30 秒冇操作；同睡眠 timer 開唔開無關，日夜都轉                                        |
| 邊啲頁     | 任何頁（主頁、節目頁、今日節目、廣播劇頁）                                            |
| 款式       | B 唱片 + 時間：左邊唱片（播緊轉）+ 播放進度圈；右邊時間、日期、節目名、集數日期、狀態 |
| 時間       | Poppins Bold（700）、24 小時                                                          |
| 底色       | 跟播緊節目 / 廣播劇色調（`themeVars`）                                                |
| 暫停       | 顯示暫停咗嗰集：暫停符號 +「已暫停」、唱片停轉變暗                                    |
| 睡眠 timer | 開緊：頂邊全闊細條 + 右上月亮同剩餘分秒（同 9d）                                      |
| 冇播嘢     | N3：唔轉，保持原本畫面                                                                |
| 叫醒       | 掂任何位置返閒置前嗰頁；第一下只叫醒，唔觸發底下嘅掣；返去之後再閒置 30 秒又轉        |

## 技術設計

| 部分          | 做法                                                                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 掛喺邊        | `App.tsx` 喺 `PlayerProvider` 入面、`<Toast />` 隔籬加 `<AmbientScreen />`；`createPortal` 去 `document.body`；`useMediaQuery(SQUARE_QUERY)` false 就乜都唔 render、唔註冊 listener                  |
| 閒置偵測      | 新 hook `useIdle(timeoutMs)`：`pointerdown` / `keydown` / `wheel` / `touchstart`（capture、passive）reset；`visibilitychange` 返嚟都 reset；常數 `AMBIENT_IDLE_MS = 30_000` 入 `config/constants.ts` |
| 唔轉嘅情況    | 冇 recording、mini player 已撥走（`useHasMiniPlayer` / `useMiniPlayerDismissed`）、有 `[role="dialog"][aria-modal="true"]` 開緊（休眠選單、清單 sheet 等）                                           |
| 畫面資料      | 純函數 `ambientView(track, state, now)`：名、色調、唱片圖、副題（節目 = `formatDateLabel`；劇集 = `dramaEpisodeLabel`）、狀態、進度；名 / 色調抽返 `pageHandle.ts` 嘅 `trackView` 共用               |
| 唱片 / 進度圈 | 重用 `Disc`（`spinning={isAudible}`、直播 `upright`）；進度圈跟 `MiniPlayerProgress` 嘅 SVG 做法（12 點開始），直播（冇長度）唔出圈                                                                  |
| 時鐘          | 裝置本地時間（同 9d 夜間時段一致），每分鐘對齊跳一次；日期新 i18n key「{month}月{day}日 星期{weekday}」                                                                                              |
| 睡眠 timer    | `useSleepTimer()` + `SleepTimerBar kind="page"` + `MoonIcon` + `formatCountdown`（淨係顯示，唔係掣）                                                                                                 |
| 叫醒          | 覆蓋層自己食咗第一下 `pointerdown`（`preventDefault` + `stopPropagation`），收起；底下頁面喺閒置期間加 `inert`，讀屏 / Tab 唔會掂到                                                                  |
| 過場          | 淡入淡出用 `--view-transition-*` token；`prefers-reduced-motion: reduce` 直接切換，唔等 `animationend`                                                                                               |
| 讀屏          | 覆蓋層 `role="dialog" aria-modal="true" aria-label="閒置畫面"`；時間 / 節目做一段文字；叫醒掣讀屏名「返回」                                                                                          |

## Lane

| Lane | 內容                                                                                   | 測試                                                                                      |
| ---- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | `useIdle`、`ambientView`、日期 / 時鐘格式、`trackView` 抽出共用、常數、i18n            | unit：閒置計時 / reset / visibility、各種 track（節目、短篇、每日劇集、直播）、時鐘跳分鐘 |
| 2    | `AmbientScreen`（B 款 UI、色調、唱片、進度圈、timer）、叫醒、`inert`、唔轉嘅情況、過場 | unit（RTL）+ 新 e2e section `e2e/ambient.mjs`（544×544，`clock.fastForward` 過 30 秒）    |

Lane 2 依賴 Lane 1，順序做；各自 Code Reviewer → QA S1 → CI 綠 → merge `release/v2.2.0`。之後 QA S3 + bump，`release/v2.2.0` → `main`。開發期間定期 merge `main`（C-1250 教訓）。

## 待決（寫 code 前要用戶答）

| #   | 問題                                                                                                      | 建議                                |
| --- | --------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | 閒置時要唔要用 Screen Wake Lock 保持屏幕唔熄？（唔用 = 跟系統自動鎖屏時間，可能未見到閒置畫面已經熄 mon） | 播緊 / 暫停有嘢載住時要；冇播嘢唔要 |
| 2   | Mini player 撥走咗（停咗播）算唔算「冇播嘢」？                                                            | 算，唔轉                            |
| 3   | 直播（冇長度）：唱片唔轉圈、唔出進度圈，副題顯示「直播」？                                                | 係                                  |
