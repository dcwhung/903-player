# Test Plan — show-today-page

- Paths（2026-11-07 Phase 0a monorepo 起）：code / test / script / schema path 一律相對 `apps/player/`（ledger 寫全 path）；`.proj-docs/`、`.tickets/`、`_mockups_/`、`design/` 仍喺 repo root。指令喺 repo root 跑（`npm test -- <path>` 轉發去 `apps/player`）
- Chain: 節目頁 / 今日節目頁：PlayerPanel（碟 + 弧形 slider）、DateStrip、EpisodeList、NowPlaying、TodayShowList
- AC:
    - AC-1 弧形 slider 拖 / 鍵盤 seek、由頭播放、轉集（e2e 390×844 主流程）
    - AC-2 觸控減少動畫：捽碟唔跟手指轉（.tickets/completed/0001-0200/CUI-0003.md）
    - AC-3 揀中最近一集、清單顯示已收聽 / 聽到（e2e 390×844 主流程）
    - AC-4 ON AIR（v1.28.3，`_mockups_/home-fill-bottom`；用戶決定）：播緊 = 紅 pill「播放中」+ 3px 紅條（動畫只喺 no-preference）；暫停 / 揀中 / 連線中 = 灰條、冇 pill；狀態換行時間成段落第 2 行；闊橫版清單 max(34%, 340px×s)、☆ 32px×s
- Scope files（72 個 + 1-hop importers 22 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/pages/{drama,home,shared,show,today}/*` `src/components/shared/player/PlayerPanel/*` `src/components/shared/common/Disc/*` `src/components/shared/common/ArcSlider/*` `src/components/shared/player/DateStrip/*` `src/components/shared/player/EpisodeList/*` `src/components/shared/player/NowPlaying/*` `src/components/shared/common/OnAirBadge/*` `src/components/pages/today/TodayShowList/*` `src/components/pages/today/TodayEmpty/*` `src/hooks/useEpisodePress*` `src/types/showPageState.ts` `src/utils/arc*` `src/utils/discScrub*` `src/utils/dragStart*`
    - 1-hop importers: `src/App.tsx` `src/components/pages/home/HomePlayerCard/{CardEpisodes.tsx,CardHeader.tsx,HomePlayerCard.tsx}` `src/components/pages/home/MiniPlayer/MiniPlayerRow.tsx` `src/components/pages/today/ShowCardStack/{GhostCard.tsx,ShowCardStack.test.tsx,useCardDrag.ts}` `src/pages/drama/{DailyDramaPage.tsx,DramaHeader.tsx,DramaPage.tsx,SeriesDramaPage.tsx,SeriesListColumn.tsx,useDramaPage.ts}` `src/pages/home/{HomePage.test.tsx,HomeStack.tsx,HomeWide.tsx,useHomeCardEpisodes.ts,useHomeCardGauge.ts}` `src/pages/shared/{dramaItems.test.ts,dramaItems.ts,themeColorNavigation.test.tsx}`
- Commands:
    - npm test -- src/components/shared/common/ArcSlider/ src/components/shared/player/DateStrip/ src/components/shared/common/Disc/ src/components/shared/player/EpisodeList/ src/components/shared/player/NowPlaying/ src/components/shared/common/OnAirBadge/ src/components/shared/player/PlayerPanel/ src/components/pages/today/TodayEmpty/ src/components/pages/today/TodayShowList/ src/hooks/useEpisodePress.test.ts src/pages/show/ShowPage.test.tsx src/pages/today/TodayPage.test.tsx src/pages/shared/episodeItems.test.ts src/pages/today/todayItems.test.ts src/utils/arc.test.ts src/utils/discScrub.test.ts src/utils/dragStart.test.tsx （28 個 test 檔）
    - e2e: run.mjs '390×844 主流程'、'320×568 今日節目'、'節目頁 / 今日節目頁尺寸'
    - e2e: e2e/touch.mjs（真手指 touch）
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: 劇集頁（屬 drama）
