import {
    paginate,
    portraitColumns,
    rowsPerPage,
    shrunkGridWidth,
    spanningPage,
    spansFullRow,
} from './showGridPages';

// 291px 闊：一格約 123 × 69px，行距 12px，指示點 24px
const SIZES = { tilePx: 69, gapPx: 12, totalRows: 4, dotsPx: 24 };

describe('rowsPerPage', () => {
    it('should keep every row on one page when they all fit', () => {
        // 4 × 69 + 3 × 12 = 312
        expect(rowsPerPage({ ...SIZES, availablePx: 312 })).toBe(4);
    });

    it('should leave room for the dots when the rows do not all fit', () => {
        // 250 − 24 = 226 → 2 行（2 × 69 + 12 = 150；3 行要 231）
        expect(rowsPerPage({ ...SIZES, availablePx: 250 })).toBe(2);
        // 冇指示點 3 行放得落（231 ≤ 254），但要分頁就扣走指示點（230）→ 2 行
        expect(rowsPerPage({ ...SIZES, availablePx: 254 })).toBe(2);
    });

    it('should show at least one row on a page', () => {
        expect(rowsPerPage({ ...SIZES, availablePx: 40 })).toBe(1);
    });

    it('should keep one page until the tiles have been measured', () => {
        expect(rowsPerPage({ ...SIZES, tilePx: 0, availablePx: 0 })).toBe(4);
    });
});

describe('paginate', () => {
    it('should split items into pages of the given size, the last one holding the rest', () => {
        expect(paginate([1, 2, 3, 4, 5, 6, 7, 8], 6)).toEqual([
            [1, 2, 3, 4, 5, 6],
            [7, 8],
        ]);
    });

    it('should treat a size below one as one item per page', () => {
        expect(paginate(['a', 'b'], 0)).toEqual([['a'], ['b']]);
    });
});

describe('shrunkGridWidth', () => {
    it('should narrow the page so one row of tiles fills the height', () => {
        // 16:9 格：格高 ÷ 欄闊 = 0.5625；高 81px → 欄闊 144px → 2 × 144 + 12 + 2 × 16
        expect(
            shrunkGridWidth({
                heightPx: 81,
                tileRatio: 0.5625,
                columnGapPx: 12,
                gutterPx: 16,
                columns: 2,
            }),
        ).toBe(332);
    });

    it('should not go negative when there is no height left', () => {
        expect(
            shrunkGridWidth({
                heightPx: -5,
                tileRatio: 0.5625,
                columnGapPx: 12,
                gutterPx: 16,
                columns: 2,
            }),
        ).toBe(44);
    });

    it('should narrow a one-column page to a single tile plus the gutters, with no column gap', () => {
        // 1 欄：高 81px → 欄闊 144px + 2 × 16
        expect(
            shrunkGridWidth({
                heightPx: 81,
                tileRatio: 0.5625,
                columnGapPx: 12,
                gutterPx: 16,
                columns: 1,
            }),
        ).toBe(176);
    });
});

/*
 * 直版動態欄數（_mockups_/dynamic-show-grid，用戶揀咗方案）：格數 = 節目格 + 最尾今日節目格。
 * ≤ 2 格一欄；≥ 3 格兩欄（9 / 12 格都唔用 3 欄）；兩欄而格數單數，最尾一格（今日節目）橫跨成行
 */
describe('portraitColumns', () => {
    it.each([
        [1, 1],
        [2, 1],
        [3, 2],
        [4, 2],
        [5, 2],
        [7, 2],
        [8, 2],
        [9, 2],
        [12, 2],
    ])('should lay %i tiles out in %i column(s)', (count, columns) => {
        expect(portraitColumns(count)).toBe(columns);
    });
});

describe('spansFullRow', () => {
    /** 邊格橫跨成行（冇就 -1） */
    const spanningIndex = (count: number): number => {
        const columns = portraitColumns(count);
        return Array.from({ length: count }, (_, i) => i).findIndex((i) =>
            spansFullRow(i, count, columns),
        );
    };

    it.each([
        [1, -1],
        [2, -1],
        [3, 2],
        [4, -1],
        [5, 4],
        [7, 6],
        [8, -1],
        [9, 8],
        [12, -1],
    ])('should, with %i tiles, span the row at index %i (-1 = none)', (count, index) => {
        expect(spanningIndex(count)).toBe(index);
    });

    it('should never span in a single column, where every tile already fills the row', () => {
        expect(spansFullRow(0, 1, 1)).toBe(false);
    });
});

describe('spanningPage', () => {
    it('should find the page holding the spanning last tile', () => {
        // 9 格兩欄，每頁 4 格：4 / 4 / 1 → 第 3 頁（index 2）
        expect(spanningPage(9, 2, 4)).toBe(2);
        // 一頁放晒
        expect(spanningPage(5, 2, 6)).toBe(0);
    });

    it('should return -1 when no tile spans', () => {
        expect(spanningPage(8, 2, 4)).toBe(-1);
        expect(spanningPage(1, 1, 1)).toBe(-1);
        expect(spanningPage(0, 1, 0)).toBe(-1);
    });
});
