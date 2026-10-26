import { landscapeLayout, type GridCell } from './landscapeLayout';

/** [欄, 行] 方便對答案；跨欄另外驗 */
const positions = (cells: readonly GridCell[]) => cells.map(({ col, row }) => [col, row]);

/** 8 張嘅位：橫額佔第 1 行頭兩欄，其餘由左至右、由上至下 */
const EIGHT = [
    [3, 1],
    [4, 1],
    [5, 1],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2],
];

describe('landscapeLayout', () => {
    it.each([
        // n, 欄, 行, 橫額跨幾欄, 卡嘅位
        [1, 2, 1, 1, [[2, 1]]],
        [
            2,
            3,
            1,
            1,
            [
                [2, 1],
                [3, 1],
            ],
        ],
        [
            3,
            3,
            2,
            3,
            [
                [1, 2],
                [2, 2],
                [3, 2],
            ],
        ],
        [
            4,
            3,
            2,
            2,
            [
                [3, 1],
                [1, 2],
                [2, 2],
                [3, 2],
            ],
        ],
        [
            5,
            3,
            2,
            1,
            [
                [2, 1],
                [3, 1],
                [1, 2],
                [2, 2],
                [3, 2],
            ],
        ],
        [
            6,
            4,
            2,
            2,
            [
                [3, 1],
                [4, 1],
                [1, 2],
                [2, 2],
                [3, 2],
                [4, 2],
            ],
        ],
        [
            7,
            4,
            2,
            1,
            [
                [2, 1],
                [3, 1],
                [4, 1],
                [1, 2],
                [2, 2],
                [3, 2],
                [4, 2],
            ],
        ],
        [8, 5, 2, 2, EIGHT],
    ])(
        'should fit %i card(s) on one screen in %i × %i with the banner over %i column(s)',
        (n, cols, rows, bannerSpan, cards) => {
            const layout = landscapeLayout(n);

            expect(layout).toMatchObject({ cols, rows, scroll: false });
            expect(layout.banner).toEqual({ col: 1, row: 1, colSpan: bannerSpan });
            expect(positions(layout.cells)).toEqual(cards);
            expect(layout.cells.every((cell) => cell.colSpan === 1)).toBe(true);
        },
    );

    it.each([
        [9, 6, [[6, 1]]],
        [
            10,
            6,
            [
                [6, 1],
                [6, 2],
            ],
        ],
        [
            11,
            7,
            [
                [6, 1],
                [6, 2],
                [7, 1],
            ],
        ],
        [
            12,
            7,
            [
                [6, 1],
                [6, 2],
                [7, 1],
                [7, 2],
            ],
        ],
        [
            13,
            8,
            [
                [6, 1],
                [6, 2],
                [7, 1],
                [7, 2],
                [8, 1],
            ],
        ],
        [
            14,
            8,
            [
                [6, 1],
                [6, 2],
                [7, 1],
                [7, 2],
                [8, 1],
                [8, 2],
            ],
        ],
        [
            15,
            9,
            [
                [6, 1],
                [6, 2],
                [7, 1],
                [7, 2],
                [8, 1],
                [8, 2],
                [9, 1],
            ],
        ],
    ])(
        'should scroll %i cards in a %i-column strip: first 8 like 8, the rest column by column',
        (n, cols, rest) => {
            const layout = landscapeLayout(n);

            expect(layout).toMatchObject({ cols, rows: 2, scroll: true });
            expect(layout.banner).toEqual({ col: 1, row: 1, colSpan: 2 });
            expect(positions(layout.cells)).toEqual([...EIGHT, ...rest]);
        },
    );

    it('should place every card in its own slot, never on the banner', () => {
        for (let n = 1; n <= 15; n += 1) {
            const { banner, cells } = landscapeLayout(n);
            const keys = cells.map(({ col, row }) => `${col}:${row}`);

            expect(cells).toHaveLength(n);
            expect(new Set(keys).size).toBe(n);
            const onBanner = cells.filter(
                ({ col, row }) =>
                    row === banner.row && col >= banner.col && col < banner.col + banner.colSpan,
            );
            expect(onBanner).toEqual([]);
        }
    });

    it('should leave the banner alone when there is nothing else to show', () => {
        expect(landscapeLayout(0)).toEqual({
            cols: 1,
            rows: 1,
            scroll: false,
            banner: { col: 1, row: 1, colSpan: 1 },
            cells: [],
        });
    });
});
