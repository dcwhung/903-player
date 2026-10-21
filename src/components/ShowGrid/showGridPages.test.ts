import { paginate, rowsPerPage, shrunkGridWidth } from './showGridPages';

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
            shrunkGridWidth({ heightPx: 81, tileRatio: 0.5625, columnGapPx: 12, gutterPx: 16 }),
        ).toBe(332);
    });

    it('should not go negative when there is no height left', () => {
        expect(
            shrunkGridWidth({ heightPx: -5, tileRatio: 0.5625, columnGapPx: 12, gutterPx: 16 }),
        ).toBe(44);
    });
});
