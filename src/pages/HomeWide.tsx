import { useState, type ReactNode } from 'react';
import { AppVersion } from '../components/AppVersion/AppVersion';
import { DramaTile, type DramaShelfItem } from '../components/DramaShelf/DramaTile';
import { HomeBanner } from '../components/HomeBanner/HomeBanner';
import { CoverBanner } from '../components/HomeLandscapeGrid/CoverBanner';
import { DRAMA_TILE_RATIO, SHOW_TILE_RATIO } from '../components/HomeLandscapeGrid/fillShape';
import { HomeFillGrid } from '../components/HomeLandscapeGrid/HomeFillGrid';
import { HomePlayerCard } from '../components/HomePlayerCard/HomePlayerCard';
import { HomePlayerHandle } from '../components/HomePlayerCard/HomePlayerHandle';
import { HomeTabs } from '../components/HomeTabs/HomeTabs';
import type { MiniPlayerProps } from '../components/MiniPlayer/MiniPlayer';
import { APP_VERSION } from '../config/appVersion';
import { TALL_CARD_QUERY } from '../config/layout';
import { closeHomePlayerCard, openHomePlayerCard } from '../hooks/homePlayerCardClosed';
import type { HomeTab } from '../hooks/useHomeTab';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { t } from '../i18n/t';
import { withViewTransition } from '../utils/viewTransition';
import styles from './HomePage.module.css';
import type { HomeLayoutMode } from './homeLayoutMode';
import page from './Page.module.css';
import { useHomeCardGauge } from './useHomeCardGauge';
import { useHomeNextEpisodes } from './useHomeNextEpisodes';

interface WideGridProps {
    tab: HomeTab;
    showTiles: ReactNode[];
    dramaItems: readonly DramaShelfItem[];
    busy: boolean;
}

interface WideGridLayoutProps extends WideGridProps {
    /** 版面模式一變（收埋 / 再出返播放卡）格仔範圍就變闊 / 收窄，要同步重新量 */
    mode: Exclude<HomeLayoutMode, 'stack'>;
}

/** 填滿格：橫額（標準版圖 + 版本號）做第一格，跟住係而家 tab 嘅卡；換 tab 由第一頁開始 */
const WideGrid = ({ tab, showTiles, dramaItems, busy, mode }: WideGridLayoutProps) => {
    const banner = (
        <HomeBanner corner={<AppVersion version={APP_VERSION} />} art={<CoverBanner />} fill />
    );
    return tab === 'shows' ? (
        <HomeFillGrid
            key={tab}
            label={t('home.showsNav')}
            busy={busy}
            layoutKey={mode}
            tiles={showTiles}
            banner={banner}
            tileRatio={SHOW_TILE_RATIO}
        />
    ) : (
        <HomeFillGrid
            key={tab}
            label={t('home.dramasNav')}
            layoutKey={mode}
            tiles={dramaItems.map((item) => (
                <DramaTile key={item.id} item={item} />
            ))}
            banner={banner}
            tileRatio={DRAMA_TILE_RATIO}
        />
    );
};

/**
 * 右邊播放卡：mini player 嘅節目 / 劇集，唱片格跟 useHomeCardGauge；高畫面多「下一集」。
 * 入頁、收埋都用過場（View Transitions，減少動畫就即刻轉）
 */
const SplitCard = ({ miniPlayer, onClose, focusOnMount }: SplitCardProps) => {
    const tall = useMediaQuery(TALL_CARD_QUERY);
    const gauge = useHomeCardGauge(miniPlayer);
    const next = useHomeNextEpisodes(miniPlayer.keys[miniPlayer.index]);
    const expand = () => withViewTransition(miniPlayer.onOpen, 'expand');
    return (
        <div className={styles.cardColumn}>
            <HomePlayerCard
                {...miniPlayer}
                gauge={gauge}
                next={tall ? { ...next, onAll: expand } : undefined}
                onExpand={expand}
                onClose={onClose}
                focusOnMount={focusOnMount}
            />
        </div>
    );
};

interface SplitCardProps {
    miniPlayer: MiniPlayerProps;
    onClose: () => void;
    focusOnMount: boolean;
}

/** 用戶撳 ✕ / 把手之後焦點去邊（自動因播放再出返唔郁焦點）：記低最後一個用戶動作 */
const useCardToggle = () => {
    const [focus, setFocus] = useState<'card' | 'handle' | null>(null);
    return {
        focus,
        close: () => {
            setFocus('handle');
            withViewTransition(closeHomePlayerCard, 'close');
        },
        open: () => {
            setFocus('card');
            withViewTransition(openHomePlayerCard, 'open');
        },
    };
};

interface HomeWideProps extends WideGridProps {
    mode: Exclude<HomeLayoutMode, 'stack'>;
    onTab: (tab: HomeTab) => void;
    miniPlayer: MiniPlayerProps | null;
}

/**
 * 闊橫版主頁（WIDE_BANNER_QUERY）：冇橫額釘頂，tab 喺頂，下面填滿格；
 * 有 mini player 就右邊播放卡（split，底部冇 mini player），收埋咗就全闊 + 右邊把手（fillWithHandle）
 */
export const HomeWide = ({ mode, onTab, miniPlayer, ...grid }: HomeWideProps) => {
    const toggle = useCardToggle();
    return (
        <main className={`${page.page} ${page.locked} ${styles.wide}`} data-layout={mode}>
            <div className={styles.gridColumn}>
                <HomeTabs tab={grid.tab} onChange={onTab} />
                <WideGrid {...grid} mode={mode} />
            </div>
            {mode === 'split' && miniPlayer && (
                <SplitCard
                    miniPlayer={miniPlayer}
                    onClose={toggle.close}
                    focusOnMount={toggle.focus === 'card'}
                />
            )}
            {mode === 'fillWithHandle' && miniPlayer && (
                <HomePlayerHandle
                    theme={miniPlayer.theme}
                    showName={miniPlayer.showName}
                    onOpen={toggle.open}
                    focusOnMount={toggle.focus === 'handle'}
                />
            )}
        </main>
    );
};
