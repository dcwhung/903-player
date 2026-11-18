/*
 * 直版動態欄數（_mockups_/dynamic-show-grid，用戶揀咗方案）：格數 = 節目格 + 最尾今日節目格。
 * 格少（≤ 2）一欄，每格成個內容咁闊；多啲就兩欄（9 / 12 格都唔用 3 欄，格太細）。
 * 例外：Duo 打開・直（P10 lane 5a）畫面闊，最多 3 欄（DUO_OPEN_PORTRAIT_MAX_COLUMNS）。
 * 闊橫版（LANDSCAPE_QUERY）唔用呢度，CSS 排 4 欄 × 2 行
 */
/** 手機直版最多兩欄（橫跨格嘅 CSS 後備比例跟呢個數，showGridCss.node.test.ts 鎖住）；Duo 打開・直例外 */
export const PORTRAIT_MAX_COLUMNS = 2;
/** Duo 打開・直（DUO_OPEN_PORTRAIT_QUERY，P10 lane 5）最多幾多欄 */
export const DUO_OPEN_PORTRAIT_MAX_COLUMNS = 3;
/** 幾多格先轉兩欄 */
const PORTRAIT_MULTI_COLUMN_MIN_TILES = 3;

/**
 * 直版幾多欄：≤ 2 格一欄，≥ 3 格兩欄。
 * maxColumns：Duo 打開・直（P10 lane 5，DUO_OPEN_PORTRAIT_QUERY）畫面闊，最多 3 欄
 */
export const portraitColumns = (count: number, maxColumns = PORTRAIT_MAX_COLUMNS): number =>
    count >= PORTRAIT_MULTI_COLUMN_MIN_TILES ? maxColumns : 1;

/**
 * 最尾一格（今日節目，spansFullRow 先用到）橫跨幾多欄：填返佢嗰行剩低嘅欄。
 * 兩欄單數格就係成行（同以前一樣）；三欄 8 格係兩欄，唔會擠去自己一行
 */
export const spanLastColumns = (count: number, columns: number): number =>
    columns - ((count - 1) % columns);

/**
 * 第 index 格（由 0 計）使唔使橫跨：多過一欄而格數唔夠排滿尾行，最尾一格（今日節目）就橫跨
 *（兩欄 = 成行咁闊；Duo 打開・直 3 欄只填返嗰行剩低嘅欄，見 spanLastColumns）。
 * 每頁格數係 行數 × 欄數，所以分頁時呢格喺邊頁，都係嗰頁最尾、自己一行
 */
export const spansFullRow = (index: number, count: number, columns: number): boolean =>
    columns > 1 && count % columns !== 0 && index === count - 1;

/** 橫跨成行嗰格（最尾一格）喺第幾頁（由 0 計）；冇格橫跨就 -1 */
export const spanningPage = (count: number, columns: number, perPage: number): number => {
    const last = count - 1;
    return spansFullRow(last, count, columns) ? Math.floor(last / Math.max(1, perPage)) : -1;
};

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

interface FillInput {
    /** 一頁節目格可以用嘅高度（已扣走頁內上下留白） */
    availablePx: number;
    /** 一欄闊 */
    columnPx: number;
    gapPx: number;
    totalRows: number;
    dotsPx: number;
    /** 最矮嘅格高 ÷ 欄闊（16:9 → 9 / 16） */
    tileRatio: number;
    /** 一行最高係最矮嘅幾多倍 */
    maxGrow: number;
}

export interface FillRows {
    rows: number;
    /** 每行實際幾高；未量到尺寸就冇（格照用 CSS 嘅 16:9） */
    rowPx?: number;
}

/**
 * 直版填滿（T8）：按最矮一行（欄闊 × 16:9）計每頁幾多行（放唔晒先分頁，見 rowsPerPage），
 * 再將剩低高度平分畀每行，但最多高過 16:9 maxGrow 倍；再多嘅高度：要分頁就由 ShowGrid CSS
 * （.grid[data-fill][data-paged] align-content: space-between）平分做行距，最尾一行貼住頁底；
 * 一頁放得晒就置頂，剩低留喺最底（dynamic-show-grid）。
 * 連一行都放唔落（每頁會收窄，見 shrunkGridWidth）就一行填滿
 */
export const fillRows = ({ columnPx, tileRatio, maxGrow, ...input }: FillInput): FillRows => {
    const tilePx = columnPx * tileRatio;
    const rows = rowsPerPage({ ...input, tilePx });
    if (tilePx <= 0) return { rows };
    const roomPx = input.availablePx - (rows < input.totalRows ? input.dotsPx : 0);
    const sharedPx = (roomPx - input.gapPx * (rows - 1)) / rows;
    // S-495：極矮（連指示點都放唔落）就唔填滿，同未量到一樣用 CSS 16:9，唔會出負數 / 0 行高
    if (sharedPx <= 0) return { rows };
    return { rows, rowPx: Math.min(sharedPx, tilePx * maxGrow) };
};

interface ShrinkInput {
    /** 一行節目格可以用嘅高度（已扣走指示點） */
    heightPx: number;
    /** 格高 ÷ 欄闊（ShowTile 嘅比例） */
    tileRatio: number;
    columnGapPx: number;
    /** 一邊嘅左右留白 */
    gutterPx: number;
    /** 幾多欄（portraitColumns） */
    columns: number;
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
    columns,
}: ShrinkInput): number =>
    columns * (Math.max(0, heightPx) / tileRatio) + (columns - 1) * columnGapPx + 2 * gutterPx;

/** 按每頁格數切開；每頁最少一格 */
export const paginate = <T>(items: readonly T[], perPage: number): T[][] => {
    const size = Math.max(1, perPage);
    const pages: T[][] = [];
    for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
    return pages;
};
