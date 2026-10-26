import { useLayoutEffect, useRef, useState } from 'react';
import { cssPx } from '../../utils/cssLength';
import { fillRows, GRID_COLUMNS, shrunkGridWidth } from './showGridPages';

/** 指示點嗰行嘅高（PageDots 每粒撳得到範圍），由 CSS token 讀 */
const DOTS_HEIGHT_VAR = '--touch-target-min';
/** 節目格最矮嘅比例（ShowTile 嘅 16:9）同一行最多高幾多倍（T8），由 CSS token 讀 */
const TILE_ASPECT_W_VAR = '--tile-aspect-w';
const TILE_ASPECT_H_VAR = '--tile-aspect-h';
const MAX_GROW_VAR = '--show-tile-max-grow';

const px = (value: string): number => parseFloat(value) || 0;

interface GridLayout {
    rows: number;
    /** 每行幾高（直版填滿）；未量到就冇，格照用 CSS 嘅 16:9 */
    rowPx?: number;
    /** 連一行都放唔落時收窄每頁；放得落就冇 */
    maxWidthPx?: number;
}

/** 量第一頁嘅格：上下 / 左右留白、行距欄距；格最矮比例同最多高幾多由 token 讀（格高跟住計，唔量） */
const measureGrid = (viewport: HTMLElement, grid: HTMLElement) => {
    const style = getComputedStyle(grid);
    const tokens = getComputedStyle(viewport);
    const aspectW = px(tokens.getPropertyValue(TILE_ASPECT_W_VAR));
    return {
        paddingPx: px(style.paddingTop) + px(style.paddingBottom),
        gapPx: px(style.rowGap),
        columnGapPx: px(style.columnGap),
        gutterPx: px(style.paddingLeft),
        tileRatio: aspectW > 0 ? px(tokens.getPropertyValue(TILE_ASPECT_H_VAR)) / aspectW : 0,
        maxGrow: px(tokens.getPropertyValue(MAX_GROW_VAR)),
        dotsPx: cssPx(tokens.getPropertyValue(DOTS_HEIGHT_VAR)),
    };
};

/** 唔收窄（成個分頁容器咁闊）時：每頁幾多行、每行幾高、使唔使收窄 */
const layoutFor = (viewport: HTMLElement, grid: HTMLElement, totalRows: number): GridLayout => {
    const { paddingPx, columnGapPx, gutterPx, tileRatio, ...sizes } = measureGrid(viewport, grid);
    const columnPx = (viewport.clientWidth - 2 * gutterPx - columnGapPx) / GRID_COLUMNS;
    const availablePx = viewport.clientHeight - paddingPx;
    const fill = fillRows({ ...sizes, availablePx, columnPx, tileRatio, totalRows });
    // 要分頁就扣走指示點；一格放得落就唔使收窄
    const roomPx = availablePx - (fill.rows < totalRows ? sizes.dotsPx : 0);
    if (fill.rowPx === undefined || columnPx * tileRatio <= roomPx) return fill;
    return {
        ...fill,
        maxWidthPx: shrunkGridWidth({ heightPx: roomPx, tileRatio, columnGapPx, gutterPx }),
    };
};

const sameLayout = (a: GridLayout, b: GridLayout): boolean =>
    a.rows === b.rows && a.rowPx === b.rowPx && a.maxWidthPx === b.maxWidthPx;

/**
 * 量分頁容器（viewport）有幾高、第一頁嘅格（grid）嘅留白同行距，計每頁幾多行、每行幾高（fillRows）。
 * 格高按容器闊度同 16:9 推算（唔係直接量格：填滿時格高跟行高，量返嚟會兜圈），
 * 收窄咗再量都係同一個答案，唔會來回跳。
 * 容器尺寸變咗（ResizeObserver，例如轉向、iOS 工具列）就重新計；
 * 冇 ResizeObserver（jsdom）就只計一次，量唔到（0）就全部一頁。
 * paged = false（橫版：節目格排成幾欄 × 兩行填滿）就唔量、唔分頁
 */
export const useRowsPerPage = (count: number, paged = true) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const totalRows = Math.ceil(count / GRID_COLUMNS);
    const [layout, setLayout] = useState<GridLayout>({ rows: totalRows });

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const grid = gridRef.current;
        if (!paged || !viewport || !grid) return;
        const measure = () => {
            const next = layoutFor(viewport, grid, totalRows);
            setLayout((prev) => (sameLayout(prev, next) ? prev : next));
        };
        measure();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        observer?.observe(viewport);
        return () => observer?.disconnect();
    }, [totalRows, paged]);

    // 唔分頁（橫版）：全部一頁、唔收窄；轉返直版再量
    return { viewportRef, gridRef, ...(paged ? layout : { rows: totalRows }) };
};
