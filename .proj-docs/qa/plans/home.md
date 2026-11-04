# Test Plan — home

- Chain: 主頁：直版節目格 / 分頁、疊卡、闊橫版 fill / split 格 + 右邊播放卡 + 把手、tabs、橫額
- AC:
    - AC-1 橫額高 = 節目格高（.tickets/completed/0001-0200/CUI-0001.md）
    - AC-2 闊橫版 fill / split、✕ 閂卡 → 把手 → 開返（.proj-docs/qa/2026-10-31_qa_v1.21.1.md）
    - AC-3 掃完第一下撳播放照播（.tickets/pending/0001-0200/CUI-0016.md 係 test flake，見 KI-001）
    - AC-4 闊橫版內頁右邊把手（P3 #4，mockup `_mockups_/inner-page-handle/index.html`）：自己嘅嘢冇把手、其他播放中 / 已暫停、撳 = 返回主頁
- Scope files（85 個 + 1-hop importers 19 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/pages/home/Home*` `src/pages/home/homeLayoutMode*` `src/pages/home/homeBottomSpace*` `src/pages/home/useHomeCard*` `src/pages/shared/themeColorNavigation*` `src/components/pages/home/Home*/*` `src/components/pages/home/ShowGrid/*` `src/components/pages/home/ShowTile/*` `src/components/pages/today/ShowCardStack/*` `src/components/shared/common/PageDots/*` `src/hooks/homePlayerCardClosed*` `src/hooks/useHomeArrival*` `src/hooks/useHomeTab*` `src/hooks/useGoHome*` `src/hooks/flagStore*` `src/hooks/swipe*` `src/hooks/useSwipe*` `src/assets/*` `src/components/shared/player/PlayerHandle/*` `src/components/shared/player/InnerPageHandle/*` `src/selectors/pageHandle*` `src/hooks/usePageHandle*` `src/hooks/useFadeOut*`
    - 1-hop importers: `src/{App.tsx,e2eSrcConstants.test.ts}` `src/components/pages/drama/ArcSheet/{useListTouchDrag.ts,useSheetDragControls.ts,useSheetPointerDrag.ts}` `src/components/shared/player/DateStrip/{dateStrip.ts,useDateStrip.ts}` `src/components/pages/home/DramaShelf/{DramaShelf.tsx,useShelfFocus.ts}` `src/components/pages/home/MiniPlayer/{MiniPlayer.tsx,MiniPlayerDots.tsx,useDismissGesture.ts}` `src/hooks/miniPlayerDismissed.ts` `src/pages/drama/DramaHeader.tsx` `src/pages/show/ShowPage.tsx` `src/pages/today/{TodayPage.tsx,TodayPlayerColumn.tsx,todayItems.ts}` `src/styles/fillSpacing.node.test.ts`
- Commands:
    - npx vitest run src/components/pages/home/HomeLandscapeGrid/ src/components/pages/home/HomePlayerCard/ src/components/shared/common/PageDots/ src/components/pages/today/ShowCardStack/ src/components/pages/home/ShowGrid/ src/components/pages/home/ShowTile/ src/hooks/homePlayerCardClosed.test.ts src/hooks/swipe.test.ts src/hooks/useHomeArrival.test.tsx src/hooks/useSwipe.test.ts src/pages/home/HomePage.test.tsx src/pages/home/HomePageWide.test.tsx src/pages/home/homeBottomSpace.node.test.ts src/pages/home/homeLayoutMode.test.ts src/pages/shared/themeColorNavigation.test.tsx src/components/shared/player/PlayerHandle/ src/selectors/pageHandle.test.ts
    - e2e: e2e/homeWide.mjs（含 '闊橫版內頁把手'）
    - e2e: e2e/touch.mjs（真手指 touch）
    - e2e: run.mjs '390×844 主流程'、'320×640 窄畫面'、'主頁頁頂橫額'
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: Mini player 本身（屬 mini-player）
