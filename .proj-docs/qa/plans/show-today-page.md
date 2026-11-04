# Test Plan — show-today-page

- Chain: 節目頁 / 今日節目頁：PlayerPanel（碟 + 弧形 slider）、DateStrip、EpisodeList、NowPlaying、TodayShowList
- AC:
    - AC-1 弧形 slider 拖 / 鍵盤 seek、由頭播放、轉集（e2e 390×844 主流程）
    - AC-2 觸控減少動畫：捽碟唔跟手指轉（.tickets/completed/0001-0200/CUI-0003.md）
    - AC-3 揀中最近一集、清單顯示已收聽 / 聽到（e2e 390×844 主流程）
- Scope files（72 個 + 1-hop importers 22 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/pages/*` `src/components/PlayerPanel/*` `src/components/Disc/*` `src/components/ArcSlider/*` `src/components/DateStrip/*` `src/components/EpisodeList/*` `src/components/NowPlaying/*` `src/components/TodayShowList/*` `src/components/TodayEmpty/*` `src/hooks/useEpisodePress*` `src/types/showPageState.ts` `src/utils/arc*` `src/utils/discScrub*` `src/utils/dragStart*`
    - 1-hop importers: `src/App.tsx` `src/components/HomePlayerCard/{CardEpisodes.tsx,CardHeader.tsx,HomePlayerCard.tsx}` `src/components/MiniPlayer/MiniPlayerRow.tsx` `src/components/ShowCardStack/{GhostCard.tsx,ShowCardStack.test.tsx,useCardDrag.ts}` `src/pages/{DailyDramaPage.tsx,DramaHeader.tsx,DramaPage.tsx,HomePage.test.tsx,HomeStack.tsx,HomeWide.tsx,SeriesDramaPage.tsx,SeriesListColumn.tsx,dramaItems.test.ts,dramaItems.ts,themeColorNavigation.test.tsx,useDramaPage.ts,useHomeCardEpisodes.ts,useHomeCardGauge.ts}`
- Commands:
    - npx vitest run src/components/ArcSlider/ src/components/DateStrip/ src/components/Disc/ src/components/EpisodeList/ src/components/NowPlaying/ src/components/PlayerPanel/ src/components/TodayEmpty/ src/components/TodayShowList/ src/hooks/useEpisodePress.test.ts src/pages/ShowPage.test.tsx src/pages/TodayPage.test.tsx src/pages/episodeItems.test.ts src/pages/todayItems.test.ts src/utils/arc.test.ts src/utils/discScrub.test.ts src/utils/dragStart.test.tsx （24 個 test 檔）
    - e2e: run.mjs '390×844 主流程'、'320×568 今日節目'、'節目頁 / 今日節目頁尺寸'
    - e2e: e2e/touch.mjs（真手指 touch）
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: 劇集頁（屬 drama）
