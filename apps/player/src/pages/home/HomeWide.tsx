import type { ReactNode } from 'react';
import type { DramaShelfItem } from '../../components/pages/home/DramaShelf/DramaTile';
import { HomePlayerHandle } from '../../components/pages/home/HomePlayerCard/HomePlayerHandle';
import type { MiniPlayerProps } from '../../components/pages/home/MiniPlayer/MiniPlayer';
import { useClosedHomePlayerCard } from '../../hooks/homePlayerCardClosed';
import type { HomeTab } from '../../hooks/useHomeTab';
import type { ThirdTab } from '../../selectors/bookmarks';
import styles from './HomePage.module.css';
import type { HomeLayoutMode } from './homeLayoutMode';
import page from '../shared/Page.module.css';
import { useHomeCardToggle } from './useHomeCardToggle';
import { useCardMotion } from './useCardMotion';
import { useHeldWhile } from './useHeldWhile';
import { HomeWideCard } from './HomeWideCard';
import { HomeWideLeft, type WideGridProps } from './HomeWideLeft';

interface HomeWideProps extends WideGridProps {
    mode: Exclude<HomeLayoutMode, 'stack'>;
    /**
     * 新主頁（useWideHome shelf）：有播放卡（一欄）先用左欄頂固定闊版橫額 + 疊卡書架；
     * 冇播放卡 / 閂咗卡（兩欄或以上）用返原本填滿格（用戶 2026-11-18）。按 useCardMotion 嘅 mode 揀，
     * 過場影舊畫面期間照舊
     */
    shelf: boolean;
    /** 新主頁「節目」tab 嘅疊卡（showShelfItems） */
    showItems: readonly DramaShelfItem[];
    onTab: (tab: HomeTab) => void;
    miniPlayer: MiniPlayerProps | null;
    /** 第三個 tab：★ 我的收藏 / 最近收聽 / null 唔出（thirdTabOf） */
    third: ThirdTab | null;
    /** 第三個 tab 嘅內容（左欄，右邊播放卡照舊） */
    saved: ReactNode;
}

/**
 * 闊橫版主頁（WIDE_BANNER_QUERY）：冇橫額釘頂，tab 喺頂，下面填滿格；
 * 有 mini player 就右邊播放卡（split，底部冇 mini player），✕ 閂咗就全闊 + 右邊把手（fillWithHandle）。
 * 張卡出現 / 換節目嘅過場見 useCardMotion：過場影舊畫面期間照顯示舊版面（mode）、舊卡（frozen）同舊把手（holding）
 */
export const HomeWide = ({
    mode: latestMode,
    shelf,
    showItems,
    onTab,
    miniPlayer,
    third,
    saved,
    ...grid
}: HomeWideProps) => {
    const toggle = useHomeCardToggle(miniPlayer);
    const { mode, frozen, holding } = useCardMotion(latestMode, miniPlayer?.item);
    // 開始播就即刻清走閂咗嘅卡（useReopenHomePlayerCardOnPlay），但 O1 影舊畫面前把手要仲喺度先淡得走
    const closed = useHeldWhile(useClosedHomePlayerCard(), holding);
    const shelfColumn = shelf && mode === 'split';
    return (
        <main
            className={`${page.page} ${page.locked} ${styles.wide}`}
            data-layout={mode}
            data-shelf={shelf ? '' : undefined}
        >
            <HomeWideLeft
                onTab={onTab}
                third={third}
                {...grid}
                saved={saved}
                mode={mode}
                shelfColumn={shelfColumn}
                showItems={showItems}
            />
            {mode === 'split' && miniPlayer && (
                <HomeWideCard
                    miniPlayer={miniPlayer}
                    onClose={toggle.close}
                    focusOnMount={toggle.focus === 'card'}
                    frozen={frozen}
                />
            )}
            {mode === 'fillWithHandle' && closed && (
                <HomePlayerHandle
                    theme={closed.theme}
                    showName={closed.showName}
                    onOpen={toggle.open}
                    focusOnMount={toggle.focus === 'handle'}
                />
            )}
        </main>
    );
};
