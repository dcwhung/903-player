import { isValidElement, type CSSProperties, type ReactNode } from 'react';
import { landscapeLayout, STRIP_VISIBLE_COLS, type GridCell } from './landscapeLayout';
import styles from './HomeLandscapeGrid.module.css';

interface HomeLandscapeGridProps {
    /** 卡（按次序），每張要有 key */
    tiles: ReactNode[];
    /** 左上角橫額格；收卡數（唔計橫額）揀點畫 */
    renderBanner: (count: number) => ReactNode;
    label: string;
    busy?: boolean;
}

/** 放位用 grid-column / grid-row（欄 / 行由 1 數起） */
const placement = ({ col, row, colSpan }: GridCell): CSSProperties => ({
    gridColumn: `${col} / span ${colSpan}`,
    gridRow: String(row),
});

/** 外層 div 用返卡本身嘅 key（冇就用位置） */
const keyOf = (tile: ReactNode, index: number) =>
    isValidElement(tile) && tile.key !== null ? tile.key : index;

/**
 * 手機打橫主頁（節目 / 廣播劇共用）：橫額 + 卡排成 landscapeLayout 嘅版面。
 * 8 張或以下一屏放晒；9 張起 2 行長 strip 左右捲，右邊露出下一欄少少提示仲有。
 * 卡（ShowTile / 劇集格）拉滿佢個格，唔鎖比例
 */
export const HomeLandscapeGrid = ({ tiles, renderBanner, label, busy }: HomeLandscapeGridProps) => {
    const layout = landscapeLayout(tiles.length);
    const vars = {
        '--grid-cols': layout.cols,
        '--grid-rows': layout.rows,
        '--strip-visible-cols': STRIP_VISIBLE_COLS,
    } as CSSProperties;
    return (
        <nav
            className={styles.scroller}
            aria-label={label}
            aria-busy={busy}
            data-scroll={layout.scroll}
        >
            <div className={styles.grid} style={vars}>
                <div className={styles.cell} style={placement(layout.banner)}>
                    {renderBanner(tiles.length)}
                </div>
                {tiles.map((tile, i) => (
                    <div
                        key={keyOf(tile, i)}
                        className={styles.cell}
                        style={placement(layout.cells[i] as GridCell)}
                    >
                        {tile}
                    </div>
                ))}
            </div>
        </nav>
    );
};
