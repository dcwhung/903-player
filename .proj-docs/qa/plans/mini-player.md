# Test Plan — mini-player

- Paths（2026-11-07 Phase 0a monorepo 起）：code / test / script / schema path 一律相對 `apps/player/`（ledger 寫全 path）；`.proj-docs/`、`.tickets/`、`_mockups_/`、`design/` 仍喺 repo root。指令喺 repo root 跑（root `vitest.config.ts` projects，`npm test -- <path>` 係子字串 filter）
- Chain: Mini player：主頁 / 內頁底部播放條、重溫規則、掃走 / 關閉、跑馬燈
- AC:
    - AC-1 細碟只喺真係出聲時轉（.tickets/completed/0001-0200/CUI-0005.md）
    - AC-2 平日重溫 + 今日節目、星期日冇節目（e2e Mini player 重溫規則）
    - AC-3 位置 / 同 viewport 距離 / 窄畫面（e2e 對應 sections）
- Scope files（33 個 + 1-hop importers 18 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/components/pages/home/MiniPlayer/*` `src/hooks/useMiniPlayer*` `src/hooks/miniPlayerDismissed*` `src/selectors/miniPlayer*` `src/components/shared/common/Marquee/*`
    - 1-hop importers: `src/App.tsx` `src/components/pages/drama/ArcSheet/ArcRow.tsx` `src/components/pages/home/DramaShelf/DramaTile.tsx` `src/components/shared/player/EpisodeList/EpisodeRow.tsx` `src/components/pages/home/HomePlayerCard/CardHeader.tsx` `src/components/shared/player/NowPlaying/NowPlaying.tsx` `src/components/shared/common/PageHeader/PageHeader.tsx` `src/components/shared/player/PlayerPanel/PlayerCard.tsx` `src/components/pages/today/TodayShowList/TodayShowList.tsx` `src/hooks/useAudioBusy.ts` `src/pages/drama/DramaPage.test.tsx` `src/pages/home/{HomePage.test.tsx,HomePage.tsx,HomePageWide.test.tsx,HomeStack.tsx,HomeWide.tsx,useHomeCardGauge.ts,useHomeCardToggle.ts}`
- Commands:
    - npm test -- src/components/shared/common/Marquee/ src/components/pages/home/MiniPlayer/ src/hooks/miniPlayerDismissed.test.ts src/hooks/useMiniPlayer.test.ts src/selectors/miniPlayer.test.ts （13 個 test 檔）
    - e2e: e2e/miniPlayerRules.mjs
    - e2e: run.mjs 'Mini player 位置'、'Mini player 同 viewport 距離'、'窄畫面 mini player'、'主頁 mini player 循環掃'
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no
- Out of scope: 闊橫版右邊播放卡（屬 home）
