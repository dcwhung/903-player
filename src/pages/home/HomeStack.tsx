import type { ReactNode } from 'react';
import { AppVersion } from '../../components/pages/home/AppVersion/AppVersion';
import { DramaShelf, type DramaShelfItem } from '../../components/pages/home/DramaShelf/DramaShelf';
import { HomeBanner } from '../../components/pages/home/HomeBanner/HomeBanner';
import { FittedBanner } from '../../components/pages/home/HomeLandscapeGrid/FittedBanner';
import { HomeTabs } from '../../components/pages/home/HomeTabs/HomeTabs';
import {
    MiniPlayer,
    type MiniPlayerProps,
} from '../../components/pages/home/MiniPlayer/MiniPlayer';
import { miniPlayerMode } from '../../components/pages/home/MiniPlayer/miniPlayerMode';
import { ShowGrid } from '../../components/pages/home/ShowGrid/ShowGrid';
import { APP_VERSION } from '../../config/appVersion';
import { SHORT_LANDSCAPE_QUERY } from '../../config/layout';
import type { HomeTab } from '../../hooks/useHomeTab';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { t } from '../../i18n/t';
import styles from './HomePage.module.css';
import page from '../shared/Page.module.css';

export interface HomeStackProps {
    tab: HomeTab;
    onTab: (tab: HomeTab) => void;
    showTiles: ReactNode[];
    dramaItems: readonly DramaShelfItem[];
    busy: boolean;
    miniPlayer: MiniPlayerProps | null;
    /** 有收藏先出 ★ tab */
    hasSaved: boolean;
    /** 我的收藏 tab 嘅內容（HomeSaved，揀中先 render） */
    saved: ReactNode;
}

/** 直版 / 手機打橫：橫額、tab、格仔上下排，底部浮住 mini player */
export const HomeStack = ({
    tab,
    onTab,
    showTiles,
    dramaItems,
    busy,
    miniPlayer,
    hasSaved,
    saved,
}: HomeStackProps) => {
    // 手機打橫：橫額變成節目 / 劇集格第一格（HomeLandscapeGrid 按卡數排）；其他情況釘喺頂
    const bannerInGrid = useMediaQuery(SHORT_LANDSCAPE_QUERY);
    const version = <AppVersion version={APP_VERSION} />;
    const renderBanner = bannerInGrid
        ? (count: number) => (
              <HomeBanner
                  corner={version}
                  art={<FittedBanner count={count} miniPlayer={miniPlayer !== null} />}
              />
          )
        : undefined;
    return (
        // 主頁任何高度都固定唔捲（page.locked）：橫額釘喺頂，節目格放唔落就分頁（手機打橫多過一屏就左右捲）
        <main
            className={`${page.page} ${page.locked} ${styles.home}`}
            data-mini-player={miniPlayer ? miniPlayerMode(miniPlayer.keys) : undefined}
        >
            {!bannerInGrid && <HomeBanner corner={version} />}
            <HomeTabs tab={tab} onChange={onTab} hasSaved={hasSaved} />
            {tab === 'shows' && (
                <ShowGrid
                    label={t('home.showsNav')}
                    busy={busy}
                    tiles={showTiles}
                    renderBanner={renderBanner}
                />
            )}
            {tab === 'dramas' && <DramaShelf items={dramaItems} renderBanner={renderBanner} />}
            {tab === 'saved' && saved}
            {miniPlayer && <MiniPlayer {...miniPlayer} />}
        </main>
    );
};
