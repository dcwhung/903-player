import type { ReactNode } from 'react';
import { AppVersion } from '../../components/pages/home/AppVersion/AppVersion';
import { DramaTile, type DramaShelfItem } from '../../components/pages/home/DramaShelf/DramaTile';
import { HomeBanner } from '../../components/pages/home/HomeBanner/HomeBanner';
import { CoverBanner } from '../../components/pages/home/HomeLandscapeGrid/CoverBanner';
import {
    DRAMA_TILE_RATIO,
    SHOW_TILE_RATIO,
} from '../../components/pages/home/HomeLandscapeGrid/fillShape';
import { HomeFillGrid } from '../../components/pages/home/HomeLandscapeGrid/HomeFillGrid';
import { HomePlayerHandle } from '../../components/pages/home/HomePlayerCard/HomePlayerHandle';
import { HomeTabs } from '../../components/pages/home/HomeTabs/HomeTabs';
import type { MiniPlayerProps } from '../../components/pages/home/MiniPlayer/MiniPlayer';
import { APP_VERSION } from '../../config/appVersion';
import { useClosedHomePlayerCard } from '../../hooks/homePlayerCardClosed';
import type { HomeTab } from '../../hooks/useHomeTab';
import { t } from '../../i18n/t';
import styles from './HomePage.module.css';
import type { HomeLayoutMode } from './homeLayoutMode';
import page from '../shared/Page.module.css';
import { useHomeCardToggle } from './useHomeCardToggle';
import { useCardMotion } from './useCardMotion';
import { HomeWideCard } from './HomeWideCard';

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

interface HomeWideProps extends WideGridProps {
    mode: Exclude<HomeLayoutMode, 'stack'>;
    onTab: (tab: HomeTab) => void;
    miniPlayer: MiniPlayerProps | null;
}

/**
 * 闊橫版主頁（WIDE_BANNER_QUERY）：冇橫額釘頂，tab 喺頂，下面填滿格；
 * 有 mini player 就右邊播放卡（split，底部冇 mini player），✕ 閂咗就全闊 + 右邊把手（fillWithHandle）。
 * 張卡出現 / 換節目嘅過場見 useCardMotion：過場影舊畫面期間照顯示舊版面（mode）同舊卡（frozen）
 */
export const HomeWide = ({ mode: latestMode, onTab, miniPlayer, ...grid }: HomeWideProps) => {
    const toggle = useHomeCardToggle(miniPlayer);
    const closed = useClosedHomePlayerCard();
    const { mode, frozen } = useCardMotion(latestMode, miniPlayer?.item);
    return (
        <main className={`${page.page} ${page.locked} ${styles.wide}`} data-layout={mode}>
            <div className={styles.gridColumn}>
                <HomeTabs tab={grid.tab} onChange={onTab} />
                <WideGrid {...grid} mode={mode} />
            </div>
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
