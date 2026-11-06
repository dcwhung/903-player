# Test Plan — drama

- Chain: 廣播劇：dramas registry / JSON、書架 DramaShelf、劇集頁（每日 / 系列）、ArcPicker / ArcSheet 全集表、NEW 標記
- AC:
    - AC-1 書架 focus / 拖拉（.tickets/completed/0001-0200/CUI-0002.md、CUI-0004.md）
    - AC-2 短篇未載入黑碟用劇集色；揀 chip 播揀咗嗰個（CUI-0006.md、CUI-0007.md）
    - AC-3 橫版劇集頁 card 一眼睇晒（CUI-0015.md）；全集表向下拉閂（CUI-0010.md）
- Scope files（122 個 + 1-hop importers 20 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/catalog/dramas/index.ts` `src/catalog/dramas/lib/*` `src/catalog/dramas/library/*/**` `src/pages/drama/Drama*` `src/pages/drama/DailyDrama*` `src/pages/drama/SeriesDrama*` `src/pages/drama/SeriesList*` `src/pages/shared/dramaItems*` `src/pages/drama/useDramaPage*` `src/pages/home/useHomeDramaItems*` `src/components/pages/home/DramaShelf/*` `src/components/pages/drama/ArcPicker/*` `src/components/pages/drama/ArcSheet/*` `src/components/shared/common/NewBadge/*` `src/hooks/useDrama*` `src/hooks/useStartDrama*` `src/selectors/drama*` `src/selectors/arcProgress*` `src/types/drama.ts`
    - 1-hop importers: `src/{App.tsx,e2eSrcConstants.test.ts}` `src/catalog/core/jsonSchemas.node.test.ts` `src/components/pages/home/ShowTile/ShowTile.tsx` `src/components/shared/common/ThemeScope/ThemeScope.test.tsx` `src/hooks/{useHomeArrival.test.tsx,useMiniPlayer.test.ts,useMiniPlayer.ts}` `src/pages/home/{HomePage.test.tsx,HomePage.tsx,HomePageWide.test.tsx,HomeStack.tsx,HomeWide.tsx,useHomeCardEpisodes.ts,useHomeCardGauge.ts}` `src/player/{nextTrack.test.ts,nextTrack.ts,useMediaSession.test.tsx,useMediaSession.ts}` `src/selectors/miniPlayer.test.ts`
- Commands:
    - npx vitest run src/components/pages/drama/ArcPicker/ src/components/pages/drama/ArcSheet/ src/components/pages/home/DramaShelf/ src/components/shared/common/NewBadge/ src/catalog/dramas/ src/hooks/useDramaNewLabels.test.ts src/hooks/useStartDrama.test.ts src/pages/drama/DailyDramaPage.test.tsx src/pages/drama/DramaPage.test.tsx src/pages/drama/DramaPageMidnight.test.tsx src/pages/shared/dramaItems.test.ts src/pages/home/useHomeDramaItems.test.tsx src/selectors/arcProgress.test.ts src/selectors/dramaShelf.test.ts src/selectors/dramas.test.ts （32 個 test 檔）
    - e2e: e2e/dramaPages.mjs（廣播劇）
    - e2e: e2e/arcSheet.mjs（'全集表向下拉閂'）
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: scripts/arcCover/（封面生成工具）
