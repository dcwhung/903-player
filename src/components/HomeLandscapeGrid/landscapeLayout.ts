/** 格嘅位（第幾欄、第幾行，由 1 數起）同橫跨幾欄 */
export interface GridCell {
    col: number;
    row: number;
    colSpan: number;
}

export interface LandscapeLayout {
    cols: number;
    rows: number;
    /** 9 張起放唔晒一屏，變成左右捲嘅長 strip */
    scroll: boolean;
    /** 橫額永遠喺左上角 */
    banner: GridCell;
    /** 每張卡（唔計橫額）嘅位，按卡嘅次序 */
    cells: GridCell[];
}

interface ScreenShape {
    cols: number;
    rows: number;
    bannerSpan: number;
}

/**
 * 手機打橫一屏放得晒嘅版面（用戶喺 prototype T7 揀定）：卡數 → 欄 × 行、橫額跨幾欄。
 * 0 張（未有劇集）就淨係橫額
 */
const SCREEN_SHAPES: Readonly<Record<number, ScreenShape>> = {
    0: { cols: 1, rows: 1, bannerSpan: 1 },
    1: { cols: 2, rows: 1, bannerSpan: 1 },
    2: { cols: 3, rows: 1, bannerSpan: 1 },
    3: { cols: 3, rows: 2, bannerSpan: 3 },
    4: { cols: 3, rows: 2, bannerSpan: 2 },
    5: { cols: 3, rows: 2, bannerSpan: 1 },
    6: { cols: 4, rows: 2, bannerSpan: 2 },
    7: { cols: 4, rows: 2, bannerSpan: 1 },
    8: { cols: 5, rows: 2, bannerSpan: 2 },
};

/** 一屏最多幾張卡；再多就變 strip，頭 8 張照 8 張咁排 */
export const SCREEN_MAX_CARDS = 8;
const STRIP_SHAPE = SCREEN_SHAPES[SCREEN_MAX_CARDS] as ScreenShape;
/** strip 一屏見到幾多欄（同 8 張一樣）；HomeLandscapeGrid 用嚟計每欄闊度 */
export const STRIP_VISIBLE_COLS = STRIP_SHAPE.cols;
/** strip 每欄上下兩張 */
const STRIP_ROWS = 2;

const bannerOf = ({ bannerSpan }: ScreenShape): GridCell => ({
    col: 1,
    row: 1,
    colSpan: bannerSpan,
});

/** 由左至右、由上至下，跳過橫額佔咗嘅位 */
const rowMajorSlots = (shape: ScreenShape): GridCell[] => {
    const slots: GridCell[] = [];
    for (let row = 1; row <= shape.rows; row += 1) {
        for (let col = 1; col <= shape.cols; col += 1) {
            if (row === 1 && col <= shape.bannerSpan) continue;
            slots.push({ col, row, colSpan: 1 });
        }
    }
    return slots;
};

/** strip 第 9 張起：每欄先上後下（第 6 欄上、第 6 欄下、第 7 欄上…） */
const stripExtra = (index: number): GridCell => ({
    col: STRIP_SHAPE.cols + 1 + Math.floor(index / STRIP_ROWS),
    row: (index % STRIP_ROWS) + 1,
    colSpan: 1,
});

const stripLayout = (count: number): LandscapeLayout => {
    const extra = count - SCREEN_MAX_CARDS;
    const extraCells = Array.from({ length: extra }, (_, i) => stripExtra(i));
    return {
        cols: STRIP_SHAPE.cols + Math.ceil(extra / STRIP_ROWS),
        rows: STRIP_ROWS,
        scroll: true,
        banner: bannerOf(STRIP_SHAPE),
        cells: [...rowMajorSlots(STRIP_SHAPE), ...extraCells],
    };
};

/**
 * 手機打橫主頁（節目 / 廣播劇共用）：卡數（唔計橫額）→ 每格放喺邊。
 * 8 張或以下一屏放晒；9 張起一條 2 行長 strip，左右捲（見 HomeLandscapeGrid）
 */
export const landscapeLayout = (count: number): LandscapeLayout => {
    if (count > SCREEN_MAX_CARDS) return stripLayout(count);
    const shape = SCREEN_SHAPES[Math.max(0, count)] as ScreenShape;
    return {
        cols: shape.cols,
        rows: shape.rows,
        scroll: false,
        banner: bannerOf(shape),
        cells: rowMajorSlots(shape),
    };
};
