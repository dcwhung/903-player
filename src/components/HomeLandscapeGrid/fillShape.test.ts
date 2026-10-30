import {
    DRAMA_TILE_RATIO,
    fallbackShape,
    fillShape,
    lastCellSpan,
    pageCells,
    SHOW_TILE_RATIO,
    type FillBox,
    type FillShape,
} from './fillShape';

/** mockup（_mockups_/landscape-home-split/index.html）用嘅格距同最矮格 */
const MOCKUP = { gapPx: 14, minCellPx: 120 };

const shapeOf = (box: FillBox, count: number, tileRatio: number) =>
    fillShape(box, { ...MOCKUP, count, tileRatio });

/** 欄 × 行 × 頁，方便對答案 */
const dims = (shape: FillShape | null) => shape && [shape.cols, shape.rows, shape.pages];

/** 1012 × 562 冇 mini player：扣走頁邊、tab 之後嘅格仔範圍 */
const PHONE_TALL_FULL = { width: 968, height: 452 };
/** 1012 × 562 有 mini player：左欄 */
const PHONE_TALL_SPLIT = { width: 603.68, height: 452 };
const TALL_NARROW = { width: 400, height: 900 };
const IPAD_FULL = { width: 1322, height: 914 };

const SHOWS = 8;
const DRAMAS = 5;

describe('fillShape', () => {
    it.each([
        // 闊 × 高, 卡數, 比例, [欄, 行, 頁]（mockup bestShape 嘅答案）
        ['1012×562 shows full', PHONE_TALL_FULL, SHOWS, SHOW_TILE_RATIO, [3, 3, 1]],
        ['1012×562 dramas full', PHONE_TALL_FULL, DRAMAS, DRAMA_TILE_RATIO, [3, 2, 1]],
        ['1012×562 dramas split', PHONE_TALL_SPLIT, DRAMAS, DRAMA_TILE_RATIO, [2, 3, 1]],
        ['1180×820 shows split', { width: 711.2, height: 710 }, SHOWS, SHOW_TILE_RATIO, [2, 5, 1]],
        ['1366×1024 dramas full', IPAD_FULL, DRAMAS, DRAMA_TILE_RATIO, [2, 3, 1]],
        ['3 shows tall narrow', { width: 300, height: 800 }, 3, SHOW_TILE_RATIO, [1, 4, 1]],
    ])('should pick the mockup shape for %s', (_, box, count, ratio, expected) => {
        expect(dims(shapeOf(box, count, ratio))).toEqual(expected);
    });

    it.each([
        [1, PHONE_TALL_FULL, [2, 1, 1]],
        [2, PHONE_TALL_FULL, [2, 2, 1]],
        [3, PHONE_TALL_FULL, [2, 2, 1]],
        [4, PHONE_TALL_FULL, [3, 2, 1]],
        [5, PHONE_TALL_FULL, [3, 2, 1]],
        [1, TALL_NARROW, [1, 2, 1]],
        [3, TALL_NARROW, [1, 4, 1]],
        [4, TALL_NARROW, [1, 5, 1]],
        [5, IPAD_FULL, [2, 3, 1]],
    ])('should fill the box with %i dramas plus the banner', (count, box, expected) => {
        expect(dims(shapeOf(box, count, DRAMA_TILE_RATIO))).toEqual(expected);
    });

    it('should never leave a whole row empty', () => {
        for (let count = 0; count <= 20; count += 1) {
            const shape = shapeOf(PHONE_TALL_FULL, count, SHOW_TILE_RATIO) as FillShape;
            const empty = shape.pages * shape.rows * shape.cols - (count + 1);
            expect(empty).toBeLessThan(shape.cols);
        }
    });

    it('should keep everything on one page whenever one page fits', () => {
        for (let count = 0; count <= 8; count += 1) {
            expect(shapeOf(PHONE_TALL_FULL, count, SHOW_TILE_RATIO)?.pages).toBe(1);
        }
    });

    it('should keep a single page even when paging would crop less', () => {
        // 窄矮嘅 box：一頁 4 欄格好窄（裁好多），兩頁 2 欄分數低啲，但一頁放得晒就一定一頁
        const shape = shapeOf({ width: 300, height: 130 }, 3, SHOW_TILE_RATIO);
        expect(dims(shape)).toEqual([4, 1, 1]);
    });

    it('should page when too many cards fit on one screen', () => {
        expect(dims(shapeOf(PHONE_TALL_FULL, 20, SHOW_TILE_RATIO))).toEqual([4, 3, 2]);
    });

    it('should not make cells shorter than the minimum', () => {
        expect(shapeOf({ width: 300, height: 100 }, 3, SHOW_TILE_RATIO)).toBeNull();
    });

    it('should count the page dots against the height of a paged grid', () => {
        // 夠高放三行；扣走頁點之後放唔落三行，就唔揀三行分頁
        const box = { width: 968, height: 3 * 120 + 2 * 14 };
        const shape = fillShape(box, { ...MOCKUP, count: 20, tileRatio: 1, dotsPx: 30 });
        expect(shape?.rows).toBeLessThan(3);
    });
});

describe('fallbackShape', () => {
    it.each([
        [1, [1, 1]],
        [2, [2, 1]],
        [9, [3, 3]],
        [10, [4, 3]],
    ])('should lay %i cells out on one page with no empty row', (total, [cols, rows]) => {
        expect(fallbackShape(total)).toEqual({ cols, rows, pages: 1 });
    });
});

describe('pageCells', () => {
    it('should split the banner and cards into pages of rows × cols', () => {
        const pages = pageCells(['b', 1, 2, 3, 4, 5, 6], { cols: 2, rows: 2, pages: 2 });
        expect(pages).toEqual([
            ['b', 1, 2, 3],
            [4, 5, 6],
        ]);
    });
});

describe('lastCellSpan', () => {
    it('should stretch the last card over the short last row', () => {
        expect(lastCellSpan({ cols: 3, rows: 2, pages: 1 }, 4)).toBe(3);
        expect(lastCellSpan({ cols: 3, rows: 2, pages: 1 }, 5)).toBe(2);
    });

    it('should not stretch a card in a full row', () => {
        expect(lastCellSpan({ cols: 3, rows: 2, pages: 1 }, 6)).toBe(1);
    });
});
