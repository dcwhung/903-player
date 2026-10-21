import { fitFontSize } from './fitText';

const BASE = { basePx: 24, minPx: 14 };

describe('fitFontSize', () => {
    it('should keep the base size when the text fits', () => {
        expect(fitFontSize({ ...BASE, availablePx: 200, neededPx: 192 })).toBe(24);
    });

    it('should scale down in proportion, rounded down to a half pixel', () => {
        // 8 個中文字 24px = 192px，格得 179px → 22.375 → 22
        expect(fitFontSize({ ...BASE, availablePx: 179, neededPx: 192 })).toBe(22);
        expect(fitFontSize({ ...BASE, availablePx: 180, neededPx: 192 })).toBe(22.5);
    });

    it('should not go below the minimum size', () => {
        expect(fitFontSize({ ...BASE, availablePx: 50, neededPx: 192 })).toBe(14);
    });

    it('should keep the base size when nothing has been laid out yet', () => {
        expect(fitFontSize({ ...BASE, availablePx: 0, neededPx: 0 })).toBe(24);
    });
});
