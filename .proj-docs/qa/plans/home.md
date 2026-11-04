# Test Plan — home

- Chain: 主頁：直版節目格 / 分頁、疊卡、闊橫版 fill / split 格 + 右邊播放卡 + 把手、tabs、橫額
- AC:
    - AC-1 橫額高 = 節目格高（.tickets/completed/0001-0200/CUI-0001.md）
    - AC-2 闊橫版 fill / split、✕ 閂卡 → 把手 → 開返（.proj-docs/qa/2026-10-31_qa_v1.21.1.md）
    - AC-3 掃完第一下撳播放照播（.tickets/pending/0001-0200/CUI-0016.md 係 test flake，見 KI-001）
- Scope files（85 個 + 1-hop importers 19 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/pages/Home*` `src/pages/homeLayoutMode*` `src/pages/homeBottomSpace*` `src/pages/useHomeCard*` `src/pages/themeColorNavigation*` `src/components/Home*/*` `src/components/ShowGrid/*` `src/components/ShowTile/*` `src/components/ShowCardStack/*` `src/components/PageDots/*` `src/hooks/homePlayerCardClosed*` `src/hooks/useHomeArrival*` `src/hooks/useHomeTab*` `src/hooks/useGoHome*` `src/hooks/flagStore*` `src/hooks/swipe*` `src/hooks/useSwipe*` `src/assets/*`
    - 1-hop importers: `src/{App.tsx,e2eSrcConstants.test.ts}` `src/components/ArcSheet/{useListTouchDrag.ts,useSheetDragControls.ts,useSheetPointerDrag.ts}` `src/components/DateStrip/{dateStrip.ts,useDateStrip.ts}` `src/components/DramaShelf/{DramaShelf.tsx,useShelfFocus.ts}` `src/components/MiniPlayer/{MiniPlayer.tsx,MiniPlayerDots.tsx,useDismissGesture.ts}` `src/hooks/miniPlayerDismissed.ts` `src/pages/{DramaHeader.tsx,ShowPage.tsx,TodayPage.tsx,TodayPlayerColumn.tsx,todayItems.ts}` `src/styles/fillSpacing.node.test.ts`
- Commands:
    - npx vitest run src/components/HomeLandscapeGrid/ src/components/HomePlayerCard/ src/components/PageDots/ src/components/ShowCardStack/ src/components/ShowGrid/ src/components/ShowTile/ src/hooks/homePlayerCardClosed.test.ts src/hooks/swipe.test.ts src/hooks/useHomeArrival.test.tsx src/hooks/useSwipe.test.ts src/pages/HomePage.test.tsx src/pages/HomePageWide.test.tsx src/pages/homeBottomSpace.node.test.ts src/pages/homeLayoutMode.test.ts src/pages/themeColorNavigation.test.tsx （26 個 test 檔）
    - e2e: e2e/homeWide.mjs
    - e2e: e2e/touch.mjs（真手指 touch）
    - e2e: run.mjs '390×844 主流程'、'320×640 窄畫面'、'主頁頁頂橫額'
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: Mini player 本身（屬 mini-player）
