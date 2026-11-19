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
import { HomeTabs } from '../../components/pages/home/HomeTabs/HomeTabs';
import { APP_VERSION } from '../../config/appVersion';
import type { HomeTab } from '../../hooks/useHomeTab';
import type { ThirdTab } from '../../selectors/bookmarks';
import { t } from '../../i18n/t';
import styles from './HomePage.module.css';
import type { HomeLayoutMode } from './homeLayoutMode';
import { ShelfGrid } from './ShelfGrid';

export interface WideGridProps {
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

interface LeftContentProps extends WideGridLayoutProps {
    saved: ReactNode;
    /** 新主頁有播放卡：一欄疊卡（ShelfGrid）；其他用填滿格 */
    shelfColumn: boolean;
    showItems: readonly DramaShelfItem[];
}

/** 左欄 tab 下面：我的收藏、新主頁疊卡，或者原本填滿格 */
const LeftContent = ({ saved, shelfColumn, showItems, ...grid }: LeftContentProps) => {
    if (grid.tab === 'saved') return saved;
    return shelfColumn ? <ShelfGrid {...grid} showItems={showItems} /> : <WideGrid {...grid} />;
};

interface HomeWideLeftProps extends LeftContentProps {
    onTab: (tab: HomeTab) => void;
    /** 第三個 tab：★ 我的收藏 / 最近收聽 / null 唔出（thirdTabOf） */
    third: ThirdTab | null;
}

/** 闊版主頁左欄：（新主頁有播放卡先有）固定闊版橫額、分類掣、tab 內容 */
export const HomeWideLeft = ({ onTab, third, ...content }: HomeWideLeftProps) => (
    <div className={styles.gridColumn}>
        {content.shelfColumn && <HomeBanner wide corner={<AppVersion version={APP_VERSION} />} />}
        <HomeTabs tab={content.tab} onChange={onTab} third={third} />
        <LeftContent {...content} />
    </div>
);
