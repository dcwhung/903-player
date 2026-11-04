# Test Plan — catalog-data

- Chain: 節目資料：shows registry / JSON、錄音列表 RecordingsProvider、audio probe、catalog reader / schema、日期 utils
- AC:
    - AC-1 probe 只加原站真係有嘅新一集，唔理未知節目（e2e「先驗 probe 同 audio host」）
    - AC-2 show.json 符合 schema（schemas/、src/catalog/jsonSchemas.node.test.ts）
    - AC-3 catalog 工具（.proj-docs/qa/2026-10-29_qa_catalog-tools.md）
- Scope files（56 個 + 1-hop importers 41 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/data/*` `src/services/*` `src/selectors/recordings*` `src/shows/*` `src/shows/*/*` `src/catalog/*` `src/types/recording.ts` `src/types/weekday.ts` `src/config/constants.ts` `src/utils/date*` `src/hooks/useRefreshedOn*` `src/hooks/useNewShowIds*`
    - 1-hop importers: `src/{App.tsx,e2eSrcConstants.test.ts}` `src/components/DateStrip/{DateStrip.test.tsx,DayCell.tsx,dateStrip.ts}` `src/components/MiniPlayer/MiniPlayer.test.tsx` `src/components/ShowCardStack/ShowCardStack.test.tsx` `src/components/ThemeScope/ThemeScope.test.tsx` `src/dramas/{bundledSource.ts,registry.ts,schema.ts,source.ts}` `src/hooks/{useDramaContinue.ts,useDramaNewLabels.ts,useMiniPlayer.test.ts,useMiniPlayer.ts,useStartDrama.ts,useStartPlayback.ts}` `src/pages/{DailyDramaPage.tsx,HomePage.test.tsx,HomePage.tsx,LoadState.tsx,ShowPage.test.tsx,ShowPage.tsx,TodayPage.test.tsx,TodayPlayerColumn.tsx,dramaItems.ts,episodeItems.ts,themeColorNavigation.test.tsx,todayItems.test.ts,todayItems.ts,useDramaPage.ts,useHomeCardEpisodes.ts,useHomeCardGauge.ts,useHomeDramaItems.ts,useShowPage.ts,useTodayPage.ts}` `src/player/useMediaSession.ts` `src/selectors/{arcProgress.ts,dramas.ts,miniPlayer.ts}`
- Commands:
    - npx vitest run src/catalog/ src/data/ src/hooks/useRefreshedOn.test.ts src/selectors/recordings.test.ts src/services/audioProbe.test.ts src/services/probeStore.test.ts src/shows/ src/utils/date.test.ts （16 個 test 檔）
    - e2e: run.mjs '先驗 probe 同 audio host'
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: scripts/dramaFromFolder.mjs（CLI，唔屬 src）
