import { useLayoutEffect, useRef, useState } from 'react';
import { GRID_COLUMNS, rowsPerPage, shrunkGridWidth } from './showGridPages';

/** 指示點嗰行嘅高（PageDots 每粒撳得到範圍），由 CSS token 讀 */
const DOTS_HEIGHT_VAR = '--touch-target-min';

const px = (value: string): number => parseFloat(value) || 0;

interface GridLayout {
    rows: number;
    /** 連一行都放唔落時收窄每頁；放得落就冇 */
    maxWidthPx?: number;
}

/** 量第一頁嘅格：上下 / 左右留白、行距欄距、格高 ÷ 欄闊（同頁闊冇關，收窄咗都一樣） */
const measureGrid = (grid: HTMLElement) => {
    const style = getComputedStyle(grid);
    const gutterPx = px(style.paddingLeft);
    const columnGapPx = px(style.columnGap);
    const columnPx = (grid.clientWidth - 2 * gutterPx - columnGapPx) / GRID_COLUMNS;
    const tilePx = grid.firstElementChild?.getBoundingClientRect().height ?? 0;
    return {
        paddingPx: px(style.paddingTop) + px(style.paddingBottom),
        gapPx: px(style.rowGap),
        columnGapPx,
        gutterPx,
        tileRatio: columnPx > 0 ? tilePx / columnPx : 0,
    };
};

/** 唔收窄（成個分頁容器咁闊）時：每頁幾多行、使唔使收窄 */
const layoutFor = (viewport: HTMLElement, grid: HTMLElement, totalRows: number): GridLayout => {
    const { paddingPx, gapPx, columnGapPx, gutterPx, tileRatio } = measureGrid(grid);
    const fullColumnPx = (viewport.clientWidth - 2 * gutterPx - columnGapPx) / GRID_COLUMNS;
    const tilePx = tileRatio * fullColumnPx;
    const availablePx = viewport.clientHeight - paddingPx;
    const dotsPx = px(getComputedStyle(viewport).getPropertyValue(DOTS_HEIGHT_VAR));
    const rows = rowsPerPage({ availablePx, tilePx, gapPx, totalRows, dotsPx });
    // 要分頁就扣走指示點；一格放得落就唔使收窄
    const roomPx = availablePx - (rows < totalRows ? dotsPx : 0);
    if (tilePx <= 0 || tilePx <= roomPx) return { rows };
    return {
        rows,
        maxWidthPx: shrunkGridWidth({ heightPx: roomPx, tileRatio, columnGapPx, gutterPx }),
    };
};

/**
 * 量分頁容器（viewport）有幾高、第一頁嘅格（grid）一格幾高同行距，計每頁幾多行。
 * 格高按容器闊度推算（唔係直接用量到嘅高），收窄咗再量都係同一個答案，唔會來回跳。
 * 容器尺寸變咗（ResizeObserver，例如轉向、iOS 工具列）就重新計；
 * 冇 ResizeObserver（jsdom）就只計一次，量唔到（0）就全部一頁
 */
export const useRowsPerPage = (count: number) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const totalRows = Math.ceil(count / GRID_COLUMNS);
    const [layout, setLayout] = useState<GridLayout>({ rows: totalRows });

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const grid = gridRef.current;
        if (!viewport || !grid) return;
        const measure = () => {
            const next = layoutFor(viewport, grid, totalRows);
            setLayout((prev) =>
                prev.rows === next.rows && prev.maxWidthPx === next.maxWidthPx ? prev : next,
            );
        };
        measure();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        observer?.observe(viewport);
        return () => observer?.disconnect();
    }, [totalRows]);

    return { viewportRef, gridRef, ...layout };
};
