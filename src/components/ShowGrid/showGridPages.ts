/** 兩欄格 */
export const GRID_COLUMNS = 2;

interface RowsInput {
    /** 一頁節目格可以用嘅高度（已扣走頁內上下留白） */
    availablePx: number;
    /** 一格節目嘅高 */
    tilePx: number;
    /** 行距 */
    gapPx: number;
    /** 全部節目格排成幾多行 */
    totalRows: number;
    /** 要分頁時指示點嗰行嘅高 */
    dotsPx: number;
}

/** 一頁放得落幾多行：n 行要 n × 格高 + (n − 1) × 行距 */
const rowsThatFit = (heightPx: number, tilePx: number, gapPx: number): number =>
    Math.floor((heightPx + gapPx) / (tilePx + gapPx));

/**
 * 每頁幾多行：全部放得落就一頁（唔使指示點）；放唔落就扣走指示點嗰行再計，最少一行。
 * 未量到尺寸（格高 0，例如 jsdom / 第一次 render）當全部放得落
 */
export const rowsPerPage = ({
    availablePx,
    tilePx,
    gapPx,
    totalRows,
    dotsPx,
}: RowsInput): number => {
    if (tilePx <= 0 || rowsThatFit(availablePx, tilePx, gapPx) >= totalRows) return totalRows;
    return Math.max(1, rowsThatFit(availablePx - dotsPx, tilePx, gapPx));
};

interface ShrinkInput {
    /** 一行節目格可以用嘅高度（已扣走指示點） */
    heightPx: number;
    /** 格高 ÷ 欄闊（ShowTile 嘅比例） */
    tileRatio: number;
    columnGapPx: number;
    /** 一邊嘅左右留白 */
    gutterPx: number;
}

/**
 * 連一行都放唔落（例如橫向手機）：格要收窄到幾闊（連左右留白），令一格剛好填滿高度。
 * 收窄嘅係每頁闊度，格比例唔變
 */
export const shrunkGridWidth = ({
    heightPx,
    tileRatio,
    columnGapPx,
    gutterPx,
}: ShrinkInput): number =>
    GRID_COLUMNS * (Math.max(0, heightPx) / tileRatio) +
    (GRID_COLUMNS - 1) * columnGapPx +
    2 * gutterPx;

/** 按每頁格數切開；每頁最少一格 */
export const paginate = <T>(items: readonly T[], perPage: number): T[][] => {
    const size = Math.max(1, perPage);
    const pages: T[][] = [];
    for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
    return pages;
};
