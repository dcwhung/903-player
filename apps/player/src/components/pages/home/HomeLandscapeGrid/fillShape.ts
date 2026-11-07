/**
 * 闊橫版主頁（WIDE_BANNER_QUERY）填滿格：揀欄 × 行（mockup _mockups_/landscape-home-split/ 嘅 bestShape，用戶揀定）。
 * 每格比例盡量貼近原圖（裁得最少；橫額同卡一樣計，唔優先），一頁放唔晒就分頁（左右掃），
 * 分頁同最後一頁留空格都扣分；最後一行唔夠格由最後一張卡拉闊補返（lastCellSpan）
 */

/** 原圖比例：節目 tile 1216 × 684、劇集 tile 2:1、橫額 banner.webp 1200 × 517 */
export const SHOW_TILE_RATIO = 1216 / 684;
export const DRAMA_TILE_RATIO = 2;
export const BANNER_RATIO = 1200 / 517;

/** 橫額裁圖嘅權重：同卡一樣計，唔優先 */
const BANNER_WEIGHT = 1;
/** 每多一頁嘅代價：寧願裁少少都唔好分太多頁 */
const PAGE_COST = 0.4;
/** 最後一頁留空格嘅代價（按空格佔一頁幾多計）：要用盡畫面 */
const EMPTY_COST = 1.5;
const MAX_ROWS = 5;
const MAX_COLS = 6;
/** 最少要有橫額以外一格 */
const MIN_CELLS = 2;

export interface FillBox {
    width: number;
    height: number;
}

export interface FillOptions {
    /** 卡數（唔計橫額） */
    count: number;
    /** 卡原圖闊 ÷ 高 */
    tileRatio: number;
    gapPx: number;
    /** 每格最少幾高（再矮字同掣放唔落） */
    minCellPx: number;
    /** 分頁時下面頁點佔幾高；一頁放晒就唔使扣 */
    dotsPx?: number;
}

export interface FillShape {
    cols: number;
    rows: number;
    pages: number;
}

interface Candidate extends FillShape {
    score: number;
}

/** 裁圖：格比例同卡、橫額原圖差幾遠（log 比例，放大縮細一樣計） */
const cropCost = (cellRatio: number, tileRatio: number) =>
    Math.abs(Math.log(cellRatio / tileRatio)) +
    BANNER_WEIGHT * Math.abs(Math.log(cellRatio / BANNER_RATIO));

/** 一個欄 × 行嘅分數；格太矮、太少格或者最後一頁有成行空就唔要（null） */
const candidate = (box: FillBox, options: FillOptions, cols: number, rows: number) => {
    const { count, gapPx, minCellPx, dotsPx = 0 } = options;
    const perPage = cols * rows;
    const total = count + 1;
    const pages = Math.ceil(total / perPage);
    const height = pages > 1 ? box.height - dotsPx : box.height;
    const cellH = (height - gapPx * (rows - 1)) / rows;
    const cellW = (box.width - gapPx * (cols - 1)) / cols;
    const empty = pages * perPage - total;
    if (cellH < minCellPx || perPage < MIN_CELLS || empty >= cols) return null;
    const score =
        cropCost(cellW / cellH, options.tileRatio) +
        PAGE_COST * (pages - 1) +
        EMPTY_COST * (empty / perPage);
    return { cols, rows, pages, score };
};

/** 一頁放得晒嘅一定贏分頁嘅（卡少唔使掃）；同一類先比分數 */
const beats = (next: Candidate, best: Candidate | null) => {
    if (!best) return true;
    const nextSingle = next.pages === 1;
    if (nextSingle !== (best.pages === 1)) return nextSingle;
    return next.score < best.score;
};

/** box 放唔落任何一款（太矮、未量到）就係 null，用 fallbackShape */
export const fillShape = (box: FillBox, options: FillOptions): FillShape | null => {
    let best: Candidate | null = null;
    for (let rows = 1; rows <= MAX_ROWS; rows += 1) {
        for (let cols = 1; cols <= MAX_COLS; cols += 1) {
            const next = candidate(box, options, cols, rows);
            if (next && beats(next, best)) best = next;
        }
    }
    return best && { cols: best.cols, rows: best.rows, pages: best.pages };
};

/** 未量到尺寸（第一次 render、jsdom）：差唔多正方嘅一頁，唔會有成行空 */
export const fallbackShape = (total: number): FillShape => {
    const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
    return { cols, rows: Math.max(1, Math.ceil(total / cols)), pages: 1 };
};

/** 橫額 + 卡按次序分頁，每頁 rows × cols 格 */
export const pageCells = <T>(cells: readonly T[], { cols, rows }: FillShape): T[][] => {
    const perPage = cols * rows;
    return Array.from({ length: Math.ceil(cells.length / perPage) }, (_, page) =>
        cells.slice(page * perPage, (page + 1) * perPage),
    );
};

/** 一頁最後一張卡跨幾欄：最後一行唔夠格就拉闊補返，唔留空位 */
export const lastCellSpan = ({ cols, rows }: FillShape, cellsOnPage: number): number => {
    const spare = cols * rows - cellsOnPage;
    return spare > 0 ? Math.min(spare + 1, cols) : 1;
};
