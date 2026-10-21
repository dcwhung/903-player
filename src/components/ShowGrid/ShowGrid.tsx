import { useRef, useState, type ReactNode } from 'react';
import { t } from '../../i18n/t';
import { scrollBehavior } from '../../utils/motion';
import { PageDots } from '../PageDots/PageDots';
import styles from './ShowGrid.module.css';
import { GRID_COLUMNS, paginate } from './showGridPages';
import { useRowsPerPage } from './useRowsPerPage';

interface ShowGridProps {
    /** 節目格（按次序），每個要有 key */
    tiles: ReactNode[];
    label: string;
    busy: boolean;
}

const pagePosition = (index: number, total: number) => t('home.pagePosition', { index, total });

/**
 * 主頁節目格（兩欄）：填滿橫額同 mini player 之間嘅高度。
 * 全部放得落就一頁；矮螢幕放唔落就按高度分頁，左右掃（scroll-snap）或者撳指示點轉頁
 */
export const ShowGrid = ({ tiles, label, busy }: ShowGridProps) => {
    const { viewportRef, gridRef, rows, maxWidthPx } = useRowsPerPage(tiles.length);
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
