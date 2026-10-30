import { isValidElement, useRef, type CSSProperties, type ReactNode } from 'react';
import { t } from '../../i18n/t';
import { tileTransitionName, TRANSITION_NAME } from '../../utils/viewTransition';
import { PageDots } from '../PageDots/PageDots';
import { useGridPager } from '../ShowGrid/useGridPager';
import { lastCellSpan, pageCells, type FillShape } from './fillShape';
import styles from './HomeFillGrid.module.css';
import { useFillShape } from './useFillShape';

interface HomeFillGridProps {
    /** 卡（按次序），每張要有 key */
    tiles: ReactNode[];
    /** 第一格嘅橫額 */
    banner: ReactNode;
    /** 卡原圖闊 ÷ 高（fillShape 揀欄 × 行用） */
    tileRatio: number;
    label: string;
    busy?: boolean;
}

interface Cell {
    key: string;
    node: ReactNode;
    /** 過場名：同一張卡喺版面變咗（收埋 / 再出返播放卡）時由舊位移去新位 */
    transitionName: string;
}

const BANNER_KEY = 'banner';

const pagePosition = (index: number, total: number) => t('home.pagePosition', { index, total });

/** 橫額 + 卡，各自帶穩定嘅 key 同過場名 */
const toCells = (banner: ReactNode, tiles: ReactNode[]): Cell[] => [
    { key: BANNER_KEY, node: banner, transitionName: TRANSITION_NAME.banner },
    ...tiles.map((tile, i) => {
        const key = isValidElement(tile) && tile.key !== null ? tile.key : String(i);
        return { key, node: tile, transitionName: tileTransitionName(key) };
    }),
];

/** 一頁：最後一張卡喺最後一行唔夠格就拉闊補返 */
const FillPage = ({ cells, shape }: { cells: Cell[]; shape: FillShape }) => {
    const span = lastCellSpan(shape, cells.length);
    const vars = { '--fill-cols': shape.cols, '--fill-rows': shape.rows } as CSSProperties;
    return (
        <div className={styles.page} style={vars}>
            {cells.map((cell, i) => (
                <div
                    key={cell.key}
                    className={styles.cell}
                    style={{
                        viewTransitionName: cell.transitionName,
                        gridColumn: i === cells.length - 1 ? `span ${span}` : undefined,
                    }}
                >
                    {cell.node}
                </div>
            ))}
        </div>
    );
};

/**
 * 闊橫版主頁（節目 / 廣播劇共用）：橫額做第一格，卡跟住排，填滿剩低嘅闊同高（每格拉滿，唔鎖比例）。
 * 欄 × 行由 fillShape 按量到嘅大細揀；一頁放唔晒就分頁（左右掃，下面頁點），同直版節目格一樣
 */
export const HomeFillGrid = ({ tiles, banner, tileRatio, label, busy }: HomeFillGridProps) => {
    const navRef = useRef<HTMLElement>(null);
    const shape = useFillShape(navRef, tiles.length, tileRatio);
    const pages = pageCells(toCells(banner, tiles), shape);
    const { scrollerRef, index, onScroll, goTo } = useGridPager(pages.length);
    const pageLabels = pages.map((_, i) => t('home.page', { index: i + 1 }));
    return (
        <nav ref={navRef} className={styles.nav} aria-label={label} aria-busy={busy}>
            <div className={styles.scroller} ref={scrollerRef} onScroll={onScroll}>
                {pages.map((cells, i) => (
                    <FillPage key={pageLabels[i]} cells={cells} shape={shape} />
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
