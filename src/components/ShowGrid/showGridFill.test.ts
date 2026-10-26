import { fillRows } from './showGridPages';

/*
 * 直版填滿（T8）：iPhone 430px 闊，扣走左右留白 16px → 398px，兩欄（格距 12px）一欄 193px，
 * 最矮一行 = 193 × 9 / 16 ≈ 108.6px，最高 × 1.3 ≈ 141.1px。
 * H 係一頁可以用嘅高：冇 mini player 約 560px，有 mini player 約 454–494px
 */
const PHONE = { columnPx: 193, gapPx: 12, dotsPx: 24, tileRatio: 9 / 16, maxGrow: 1.3 };
const MIN_ROW_PX = 193 * (9 / 16);
const rowsOf = (count: number) => Math.ceil(count / 2);

describe('fillRows', () => {
    it('should grow 5 tiles (3 rows) by at most 30% and leave the rest at the bottom', () => {
        const { rows, rowPx } = fillRows({ ...PHONE, totalRows: rowsOf(5), availablePx: 600 });

        expect(rows).toBe(3);
        expect(rowPx).toBeCloseTo(MIN_ROW_PX * 1.3);
    });

    it('should put 8 tiles in 4 rows on one page, sharing the height out when it fits', () => {
        // 4 × 108.6 + 3 × 12 ≈ 470 ≤ 560：(560 − 36) ÷ 4 = 131
        const { rows, rowPx } = fillRows({ ...PHONE, totalRows: rowsOf(8), availablePx: 560 });

        expect(rows).toBe(4);
        expect(rowPx).toBeCloseTo(131);
    });

    it('should still fit 8 tiles on one page with the mini player shown (494px)', () => {
        const { rows, rowPx } = fillRows({ ...PHONE, totalRows: rowsOf(8), availablePx: 494 });

        expect(rows).toBe(4);
        expect(rowPx).toBeCloseTo((494 - 36) / 4);
    });

    it('should page 8 tiles once 4 rows no longer fit at 16:9, stretching the rows above the dots', () => {
        // 454 < 470：要分頁，扣走指示點 → 430px 放 3 行，(430 − 24) ÷ 3 ≈ 135.3
        const { rows, rowPx } = fillRows({ ...PHONE, totalRows: rowsOf(8), availablePx: 454 });

        expect(rows).toBe(3);
        expect(rowPx).toBeCloseTo(406 / 3);
    });

    it.each([
        [520, 4, (496 - 36) / 4],
        [800, 6, (800 - 60) / 6],
    ])('should lay 12 tiles out in %ipx as %i rows a page', (availablePx, expectedRows, rowPx) => {
        const layout = fillRows({ ...PHONE, totalRows: rowsOf(12), availablePx });

        expect(layout.rows).toBe(expectedRows);
        expect(layout.rowPx).toBeCloseTo(rowPx);
    });

    it('should never make a row shorter than 16:9 when it pages', () => {
        const { rowPx } = fillRows({ ...PHONE, totalRows: rowsOf(12), availablePx: 300 });

        expect(rowPx).toBeGreaterThanOrEqual(MIN_ROW_PX);
    });

    it('should fill the room with one row when not even one fits at 16:9 (the page narrows)', () => {
        const { rows, rowPx } = fillRows({ ...PHONE, totalRows: rowsOf(8), availablePx: 100 });

        expect(rows).toBe(1);
        expect(rowPx).toBe(100 - 24);
    });

    it('should keep every row on one page with no row height until measured', () => {
        expect(fillRows({ ...PHONE, columnPx: 0, totalRows: 4, availablePx: 0 })).toEqual({
            rows: 4,
        });
    });
});
