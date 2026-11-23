# Test Plan — mini-player

- Paths（2026-11-07 Phase 0a monorepo 起）：code / test / script / schema path 一律相對 `apps/player/`（ledger 寫全 path）；`.proj-docs/`、`.tickets/`、`_mockups_/`、`_design_/` 仍喺 repo root。指令喺 repo root 跑（root `vitest.config.ts` projects，`npm test -- <path>` 係子字串 filter）
- Chain: Mini player：主頁 / 內頁底部播放條、重溫規則、掃走 / 關閉、跑馬燈
- AC:
    - AC-1 細碟只喺真係出聲時轉（.tickets/completed/0001-0200/CUI-0005.md）
    - AC-2 平日重溫 + 今日節目、星期日冇節目（e2e Mini player 重溫規則）
    - AC-3 位置 / 同 viewport 距離 / 窄畫面（e2e 對應 sections）
    - AC-4 睡眠 timer UI（9d Lane 3，`.proj-docs/plans/2026-11-19_plan_9d-sleep-timer.md`「用戶決定」各表、`_mockups_/sleep-timer/`）：21:00–05:00 先出月亮掣（內頁頁頭 / HomeView / 闊版播放卡 / mini player）、讀屏名「休眠」/「休眠，剩餘 N 分 N 秒」、選單 D 款 + aria-pressed / aria-disabled、頁頂 / 卡頂進度條、每晚自動（四捨五入 5 分鐘、3 個鐘窗口、每晚一次、夜間限定 W-820、多分頁 S-1200）+ toast、「停用」兩種行為、共用時鐘；日間零改變（e2e:visual `*-day` 0 diff）
- Scope files（33 個 + 1-hop importers 18 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/components/pages/home/MiniPlayer/*` `src/hooks/useMiniPlayer*` `src/hooks/miniPlayerDismissed*` `src/selectors/miniPlayer*` `src/components/shared/common/Marquee/*` `src/components/shared/player/SleepTimer/*` `tests/sleepTimer.tsx` `e2e/sleepTimer.mjs`（e2e section） `_mockups_/sleep-timer/*`（repo root）
    - 1-hop importers: `src/App.tsx` `src/components/pages/drama/ArcSheet/ArcRow.tsx` `src/components/pages/home/DramaShelf/DramaTile.tsx` `src/components/shared/player/EpisodeList/EpisodeRow.tsx` `src/components/pages/home/HomePlayerCard/CardHeader.tsx` `src/components/shared/player/NowPlaying/NowPlaying.tsx` `src/components/shared/common/PageHeader/PageHeader.tsx` `src/components/shared/player/PlayerPanel/PlayerCard.tsx` `src/components/pages/today/TodayShowList/TodayShowList.tsx` `src/hooks/useAudioBusy.ts` `src/pages/drama/DramaPage.test.tsx` `src/pages/home/{HomePage.test.tsx,HomePage.tsx,HomePageWide.test.tsx,HomeStack.tsx,HomeWide.tsx,useHomeCardGauge.ts,useHomeCardToggle.ts}`
- Commands:
    - npm test -- src/components/shared/common/Marquee/ src/components/pages/home/MiniPlayer/ src/hooks/miniPlayerDismissed.test.ts src/hooks/useMiniPlayer.test.ts src/selectors/miniPlayer.test.ts （13 個 test 檔）
    - AC-4：`npm test -- src/components/shared/player/SleepTimer/`；e2e `e2e/sleepTimer.mjs`（'睡眠 timer：…' 8 個 section，CI 同 SHA 綠就引用）；`npm run e2e:visual`（`--base` = PR base，`*-day` 0 diff、22:30 只准月亮 / mini player 標題日期）；讀屏 Playwright `ariaSnapshot`（真機留用戶）
    - e2e: e2e/miniPlayerRules.mjs
    - e2e: run.mjs 'Mini player 位置'、'Mini player 同 viewport 距離'、'窄畫面 mini player'、'主頁 mini player 循環掃'
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: 闊橫版右邊播放卡（屬 home）
