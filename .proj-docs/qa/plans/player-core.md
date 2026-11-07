# Test Plan — player-core

- Chain: 播放核心：AudioController、PlayerProvider / usePlayer、stall watchdog、進度儲存、Media Session、續播 / 已收聽
- AC:
    - AC-1 極慢網 / metadata 未到唔亂 reload（.tickets/completed/0001-0200/CUI-0011.md、CUI-0014.md）
    - AC-2 鎖屏慢載中途亮屏唔誤判 stall（CUI-0012.md；S-551，.proj-docs/qa/2026-10-29_qa_s551-lockscreen-stall.md）
    - AC-3 暫停存進度、聽完標已收聽、重播 > 10 秒清已收聽（e2e 390×844 主流程）
    - AC-4 停低（暫停 / 停 / 播完）存完進度先 bump `progressRevision`；收藏 tab 最近收聽跟佢 + 轉集 url 重讀，唔靠 isPlaying edge（S-710，`src/player/progressRevision.test.ts`）
    - AC-5 v1 → v2 storage migration：進度 / 收藏由 URL key 搬去 episode ID，idempotent、v2 已有唔覆蓋、v1 原封不動、v2 寫唔到下次再搬（`.proj-docs/plans/2026-11-06_plan_backend-admin.md`「Phase −1」+「實作決定」；W-698）
- Scope files（37 個 + 1-hop importers 56 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/player/*` `src/services/progressStore*` `src/utils/bufferedEnd*` `src/utils/playbackState*` `src/utils/time*` `src/hooks/useAudioBusy*` `src/hooks/useStartPlayback*` `src/hooks/useOnPlayStart*` `src/hooks/useStandbyStart*` `src/hooks/lostRelease*` `src/types/track.ts` `src/services/storageMigration*` `src/catalog/core/episodeId*` `e2e/hiddenPlayback.mjs` `e2e/storageMigration.mjs`（e2e section）
    - 1-hop importers: `src/{App.tsx,main.tsx}` `src/components/pages/home/AppVersion/AppVersion.tsx` `src/components/pages/drama/ArcSheet/{arcLabels.ts,useSheetPointerDrag.ts}` `src/components/shared/player/EpisodeList/{episodeStatus.test.ts,episodeStatus.ts}` `src/components/pages/home/HomePlayerCard/HomePlayerCard.tsx` `src/components/pages/home/MiniPlayer/useDismissGesture.ts` `src/components/shared/player/NowPlaying/NowPlaying.tsx` `src/components/shared/player/PlayerPanel/{PlayerGauge.test.tsx,PlayerGauge.tsx,PlayerPanel.test.tsx,PlayerPanel.tsx,useGaugeGestures.ts}` `src/hooks/{homePlayerCardClosed.test.ts,homePlayerCardClosed.ts,miniPlayerDismissed.test.ts,miniPlayerDismissed.ts,useDramaContinue.ts,useDramaNewLabels.test.ts,useDramaNewLabels.ts,useEpisodePress.ts,useHomeArrival.test.tsx,useHomeArrival.ts,useMiniPlayer.test.ts,useMiniPlayer.ts,useNewShowIds.ts,useStartDrama.test.ts,useStartDrama.ts}` `src/pages/drama/{DailyDramaPage.tsx,DramaPage.test.tsx,SeriesDramaPage.tsx,SeriesListColumn.tsx,useDramaPage.ts}` `src/pages/home/{HomePage.test.tsx,HomePage.tsx,HomePageWide.test.tsx,useHomeCardEpisodes.ts,useHomeCardGauge.ts,useHomeDramaItems.ts}` `src/pages/show/{ShowPage.test.tsx,ShowPage.tsx,useShowPage.ts}` `src/pages/today/{TodayPage.test.tsx,TodayPlayerColumn.tsx,todayItems.ts,useTodayPage.ts}` `src/pages/shared/episodeItems.ts` `src/selectors/{arcProgress.test.ts,arcProgress.ts,dramaShelf.test.ts,dramaShelf.ts,dramas.test.ts,dramas.ts,miniPlayer.ts}`
- Commands:
    - npx vitest run src/hooks/useAudioBusy.test.ts src/hooks/useStartPlayback.test.ts src/player/ src/services/progressStore.test.ts src/utils/bufferedEnd.test.ts src/utils/playbackState.test.ts src/utils/time.test.ts src/services/storageMigration.test.ts src/catalog/core/episodeId.test.ts （18 個 test 檔）
    - e2e: e2e/hiddenPlayback.mjs（背景播放）
    - e2e: e2e/storageMigration.mjs（'舊版進度 / 收藏升級'）
    - e2e: run.mjs '390×844 主流程'（seek / 進度 / 已收聽）
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: UI 掣嘅 layout（屬 show-today-page / mini-player）
