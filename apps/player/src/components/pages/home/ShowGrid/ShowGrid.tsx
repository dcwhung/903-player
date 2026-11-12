import type { CSSProperties, ReactNode } from 'react';
import { LANDSCAPE_QUERY } from '../../../../config/layout';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { t } from '../../../../i18n/t';
import { HomeLandscapeGrid } from '../HomeLandscapeGrid/HomeLandscapeGrid';
import { PageDots } from '../../../shared/common/PageDots/PageDots';
import styles from './ShowGrid.module.css';
import { paginate, portraitColumns, spanningPage } from './showGridPages';
import { useGridPager } from './useGridPager';
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

/** 直版填滿（T8）：每行用量到嘅高（16:9 到最多高 50%）；未量到就照用 CSS 16:9 */
const fillStyle = (rows: number, rowPx?: number): CSSProperties =>
    rowPx === undefined ? {} : { gridTemplateRows: `repeat(${rows}, ${rowPx}px)` };

/** 直版欄數（dynamic-show-grid）：inline 蓋過 CSS 嘅兩欄；橫版唔畀，由 CSS 排 4 欄 */
const columnsStyle = (columns: number): CSSProperties => ({
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
});

/** data attribute 開關：true → ''（有 attribute），false → 冇 */
const flag = (on: boolean): '' | undefined => (on ? '' : undefined);

/**
 * 按格數同畫面計分頁：直版按格數揀欄數（portraitColumns：≤ 2 格一欄，否則兩欄），
 * 單數格最尾一格（今日節目）喺佢嗰頁橫跨成行；橫版（LANDSCAPE_QUERY）唔分頁、唔加直版欄數 / 橫跨。
 * gridProps(i)：第 i 頁 grid 嘅 data attribute 同 inline style
 */
const useShowGridPages = (tiles: ReactNode[]) => {
    // 橫版一頁放晒（ShowGrid.module.css 排成幾欄 × 兩行填滿），唔使量高度分頁
    const landscape = useMediaQuery(LANDSCAPE_QUERY);
    const count = tiles.length;
    const columns = portraitColumns(count);
    const { rows, rowPx, ...refs } = useRowsPerPage(count, columns, !landscape);
    const perPage = rows * columns;
    const pages = paginate(tiles, perPage);
    const paged = pages.length > 1;
    // 橫跨嗰格喺邊頁（冇就 -1）：直版先有，唔好漏入闊橫版嘅 4 欄
    const spanPage = landscape ? -1 : spanningPage(count, columns, perPage);
    const style = landscape ? undefined : { ...columnsStyle(columns), ...fillStyle(rows, rowPx) };
    const gridProps = (i: number) => ({
        'data-fill': flag(rowPx !== undefined),
        'data-paged': flag(paged),
        'data-span-last': flag(i === spanPage),
        style,
    });
    return { ...refs, pages, gridProps };
};

/**
 * 直版 / 闊橫版節目格：填滿橫額同 mini player 之間嘅高度。
 * 全部（16:9 最矮）放得落就一頁，每行拉高分剩低嘅高度（最多高 50%），置頂、剩低留喺最底；
 * 矮螢幕放唔落就按高度分頁（行距 space-between），左右掃（scroll-snap）或者撳指示點轉頁。
 * 橫版（LANDSCAPE_QUERY，例如 iPad）唔分頁：CSS 排成 4 欄 × 兩行填滿
 */
const PagedShowGrid = ({ tiles, label, busy }: ShowGridProps) => {
    const { viewportRef, gridRef, maxWidthPx, pages, gridProps } = useShowGridPages(tiles);
    const { scrollerRef, index, onScroll, goTo } = useGridPager(pages.length);

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
                        {...gridProps(i)}
                    >
                        {page}
                    </div>
                ))}
            </div>
            <PageDots
                keys={pageLabels}
                labels={pageLabels}
                index={index}
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
