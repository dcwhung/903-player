# Test Plan — mini-player

- Chain: Mini player：主頁 / 內頁底部播放條、重溫規則、掃走 / 關閉、跑馬燈
- AC:
    - AC-1 細碟只喺真係出聲時轉（.tickets/completed/0001-0200/CUI-0005.md）
    - AC-2 平日重溫 + 今日節目、星期日冇節目（e2e Mini player 重溫規則）
    - AC-3 位置 / 同 viewport 距離 / 窄畫面（e2e 對應 sections）
- Scope files（33 個 + 1-hop importers 18 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/components/MiniPlayer/*` `src/hooks/useMiniPlayer*` `src/hooks/miniPlayerDismissed*` `src/selectors/miniPlayer*` `src/components/Marquee/*`
    - 1-hop importers: `src/App.tsx` `src/components/ArcSheet/ArcRow.tsx` `src/components/DramaShelf/DramaTile.tsx` `src/components/EpisodeList/EpisodeRow.tsx` `src/components/HomePlayerCard/CardHeader.tsx` `src/components/NowPlaying/NowPlaying.tsx` `src/components/PageHeader/PageHeader.tsx` `src/components/PlayerPanel/PlayerCard.tsx` `src/components/TodayShowList/TodayShowList.tsx` `src/hooks/useAudioBusy.ts` `src/pages/{DramaPage.test.tsx,HomePage.test.tsx,HomePage.tsx,HomePageWide.test.tsx,HomeStack.tsx,HomeWide.tsx,useHomeCardGauge.ts,useHomeCardToggle.ts}`
- Commands:
    - npx vitest run src/components/Marquee/ src/components/MiniPlayer/ src/hooks/miniPlayerDismissed.test.ts src/hooks/useMiniPlayer.test.ts src/selectors/miniPlayer.test.ts （13 個 test 檔）
    - e2e: e2e/miniPlayerRules.mjs
    - e2e: run.mjs 'Mini player 位置'、'Mini player 同 viewport 距離'、'窄畫面 mini player'、'主頁 mini player 循環掃'
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: 闊橫版右邊播放卡（屬 home）
