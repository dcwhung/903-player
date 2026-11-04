# Test Plan — player-core

- Chain: 播放核心：AudioController、PlayerProvider / usePlayer、stall watchdog、進度儲存、Media Session、續播 / 已收聽
- AC:
    - AC-1 極慢網 / metadata 未到唔亂 reload（.tickets/completed/0001-0200/CUI-0011.md、CUI-0014.md）
    - AC-2 鎖屏慢載中途亮屏唔誤判 stall（CUI-0012.md；S-551，.proj-docs/qa/2026-10-29_qa_s551-lockscreen-stall.md）
    - AC-3 暫停存進度、聽完標已收聽、重播 > 10 秒清已收聽（e2e 390×844 主流程）
- Scope files（37 個 + 1-hop importers 56 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/player/*` `src/services/progressStore*` `src/utils/bufferedEnd*` `src/utils/playbackState*` `src/utils/time*` `src/hooks/useAudioBusy*` `src/hooks/useStartPlayback*` `src/hooks/useOnPlayStart*` `src/hooks/useStandbyStart*` `src/hooks/lostRelease*` `src/types/track.ts`
    - 1-hop importers: `src/{App.tsx,main.tsx}` `src/components/AppVersion/AppVersion.tsx` `src/components/ArcSheet/{arcLabels.ts,useSheetPointerDrag.ts}` `src/components/EpisodeList/{episodeStatus.test.ts,episodeStatus.ts}` `src/components/HomePlayerCard/HomePlayerCard.tsx` `src/components/MiniPlayer/useDismissGesture.ts` `src/components/NowPlaying/NowPlaying.tsx` `src/components/PlayerPanel/{PlayerGauge.test.tsx,PlayerGauge.tsx,PlayerPanel.test.tsx,PlayerPanel.tsx,useGaugeGestures.ts}` `src/hooks/{homePlayerCardClosed.test.ts,homePlayerCardClosed.ts,miniPlayerDismissed.test.ts,miniPlayerDismissed.ts,useDramaContinue.ts,useDramaNewLabels.test.ts,useDramaNewLabels.ts,useEpisodePress.ts,useHomeArrival.test.tsx,useHomeArrival.ts,useMiniPlayer.test.ts,useMiniPlayer.ts,useNewShowIds.ts,useStartDrama.test.ts,useStartDrama.ts}` `src/pages/{DailyDramaPage.tsx,DramaPage.test.tsx,HomePage.test.tsx,HomePage.tsx,HomePageWide.test.tsx,SeriesDramaPage.tsx,SeriesListColumn.tsx,ShowPage.test.tsx,ShowPage.tsx,TodayPage.test.tsx,TodayPlayerColumn.tsx,episodeItems.ts,todayItems.ts,useDramaPage.ts,useHomeCardEpisodes.ts,useHomeCardGauge.ts,useHomeDramaItems.ts,useShowPage.ts,useTodayPage.ts}` `src/selectors/{arcProgress.test.ts,arcProgress.ts,dramaShelf.test.ts,dramaShelf.ts,dramas.test.ts,dramas.ts,miniPlayer.ts}`
- Commands:
    - npx vitest run src/hooks/useAudioBusy.test.ts src/hooks/useStartPlayback.test.ts src/player/ src/services/progressStore.test.ts src/utils/bufferedEnd.test.ts src/utils/playbackState.test.ts src/utils/time.test.ts （16 個 test 檔）
    - e2e: e2e/hiddenPlayback.mjs（背景播放）
    - e2e: run.mjs '390×844 主流程'（seek / 進度 / 已收聽）
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: UI 掣嘅 layout（屬 show-today-page / mini-player）
