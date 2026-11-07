# Test Plan — catalog-data

- Paths（2026-11-07 Phase 0a monorepo 起）：code / test / script / schema path 一律相對 `apps/player/`（ledger 寫全 path）；`.proj-docs/`、`.tickets/`、`_mockups_/`、`design/` 仍喺 repo root。指令喺 repo root 跑（`npm test -- <path>` 轉發去 `apps/player`）
- Chain: 節目資料：shows registry / JSON、錄音列表 RecordingsProvider、audio probe、catalog reader / schema、日期 utils
- AC:
    - AC-1 probe 只加原站真係有嘅新一集，唔理未知節目（e2e「先驗 probe 同 audio host」）
    - AC-2 show.json 符合 schema（`schemas/show.schema.json`、src/catalog/core/jsonSchemas.node.test.ts）
    - AC-3 catalog 工具（.proj-docs/qa/2026-10-29_qa_catalog-tools.md）
- Scope files（56 個 + 1-hop importers 41 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/data/*` `src/services/*` `src/selectors/recordings*` `src/catalog/shows/index.ts` `src/catalog/shows/lib/*` `src/catalog/shows/library/*/*` `src/catalog/core/*` `src/types/recording.ts` `src/types/weekday.ts` `src/config/constants.ts` `src/utils/date*` `src/hooks/useRefreshedOn*` `src/hooks/useNewShowIds*` `schemas/show.schema.json`
    - 1-hop importers: `src/{App.tsx,e2eSrcConstants.test.ts}` `src/components/shared/player/DateStrip/{DateStrip.test.tsx,DayCell.tsx,dateStrip.ts}` `src/components/pages/home/MiniPlayer/MiniPlayer.test.tsx` `src/components/pages/today/ShowCardStack/ShowCardStack.test.tsx` `src/components/shared/common/ThemeScope/ThemeScope.test.tsx` `src/catalog/dramas/lib/{bundledSource.ts,registry.ts,schema.ts,source.ts}` `src/hooks/{useDramaContinue.ts,useDramaNewLabels.ts,useMiniPlayer.test.ts,useMiniPlayer.ts,useStartDrama.ts,useStartPlayback.ts}` `src/pages/drama/{DailyDramaPage.tsx,useDramaPage.ts}` `src/pages/home/{HomePage.test.tsx,HomePage.tsx,useHomeCardEpisodes.ts,useHomeCardGauge.ts,useHomeDramaItems.ts}` `src/pages/shared/{LoadState.tsx,dramaItems.ts,episodeItems.ts,themeColorNavigation.test.tsx}` `src/pages/show/{ShowPage.test.tsx,ShowPage.tsx,useShowPage.ts}` `src/pages/today/{TodayPage.test.tsx,TodayPlayerColumn.tsx,todayItems.test.ts,todayItems.ts,useTodayPage.ts}` `src/player/useMediaSession.ts` `src/selectors/{arcProgress.ts,dramas.ts,miniPlayer.ts}`
- Commands:
    - npm test -- src/catalog/core/ src/data/ src/hooks/useRefreshedOn.test.ts src/selectors/recordings.test.ts src/services/audioProbe.test.ts src/services/probeStore.test.ts src/catalog/shows/ src/utils/date.test.ts （16 個 test 檔）
    - e2e: run.mjs '先驗 probe 同 audio host'
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: scripts/dramaFromFolder.mjs（CLI，屬 drama 鏈）；`src/services/storageMigration*`、`src/catalog/core/episodeId*`（屬 player-core）
