import { useRef, useState, type ReactNode } from 'react';
import { LANDSCAPE_QUERY } from '../../config/layout';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { t } from '../../i18n/t';
import { scrollBehavior } from '../../utils/motion';
import { HomeLandscapeGrid } from '../HomeLandscapeGrid/HomeLandscapeGrid';
import { PageDots } from '../PageDots/PageDots';
import styles from './ShowGrid.module.css';
import { GRID_COLUMNS, paginate } from './showGridPages';
import { useRowsPerPage } from './useRowsPerPage';

interface ShowGridProps {
    /** 節目格（按次序），每個要有 key */
    tiles: ReactNode[];
    label: string;
    busy: boolean;
    /** 手機打橫先畀：橫額入格，同節目一齊排（HomeLandscapeGrid）；收節目格數揀點畫 */
    renderBanner?: (count: number) => ReactNode;
}

const pagePosition = (index: number, total: number) => t('home.pagePosition', { index, total });

/**
 * 直版 / 闊橫版節目格（兩欄）：填滿橫額同 mini player 之間嘅高度。
 * 全部放得落就一頁；矮螢幕放唔落就按高度分頁，左右掃（scroll-snap）或者撳指示點轉頁。
 * 橫版（LANDSCAPE_QUERY，例如 iPad）唔分頁：CSS 排成 4 欄 × 兩行填滿
 */
const PagedShowGrid = ({ tiles, label, busy }: ShowGridProps) => {
    // 橫版一頁放晒（ShowGrid.module.css 排成幾欄 × 兩行填滿），唔使量高度分頁
    const landscape = useMediaQuery(LANDSCAPE_QUERY);
    const { viewportRef, gridRef, rows, maxWidthPx } = useRowsPerPage(tiles.length, !landscape);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const pages = paginate(tiles, rows * GRID_COLUMNS);
    const [index, setIndex] = useState(0);
    const lastPage = pages.length - 1;

    const onScroll = () => {
        const scroller = scrollerRef.current;
        if (!scroller || scroller.clientWidth === 0) return;
        setIndex(Math.round(scroller.scrollLeft / scroller.clientWidth));
    };
    const goTo = (page: number) => {
        const scroller = scrollerRef.current;
        scroller?.scrollTo({ left: page * scroller.clientWidth, behavior: scrollBehavior() });
        setIndex(page);
    };

    const pageLabels = pages.map((_, i) => t('home.page', { index: i + 1 }));
    return (
        <nav className={styles.pager} aria-label={label} aria-busy={busy} ref={viewportRef}>
            {/* 連一行都放唔落（橫向手機）就收窄每頁，格縮細到剛好一行 */}
            <div
                className={styles.scroller}
                ref={scrollerRef}
                style={maxWidthPx === undefined ? undefined : { maxWidth: maxWidthPx }}
                onScroll={onScroll}
            >
                {pages.map((page, i) => (
                    <div
                        key={pageLabels[i]}
                        className={styles.grid}
                        ref={i === 0 ? gridRef : undefined}
                    >
                        {page}
                    </div>
                ))}
            </div>
            <PageDots
                keys={pageLabels}
                labels={pageLabels}
                // 轉向 / 放大令頁數變少：瀏覽器會將 scrollLeft 收返入範圍（再觸發 onScroll），之前先當最後一頁
                index={Math.min(index, lastPage)}
                onSelect={goTo}
                positionLabel={pagePosition}
            />
        </nav>
    );
};

/**
 * 主頁「節目」tab：手機打橫（有 renderBanner）用同廣播劇共用嘅 HomeLandscapeGrid，
 * 幾多個節目都放得晒（多過 8 格就左右捲）；其他情況用分頁節目格
 */
export const ShowGrid = ({ renderBanner, ...props }: ShowGridProps) =>
    renderBanner ? (
        <HomeLandscapeGrid {...props} renderBanner={renderBanner} />
    ) : (
        <PagedShowGrid {...props} />
    );
