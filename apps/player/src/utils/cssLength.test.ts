import { cssPx } from './cssLength';

describe('cssPx', () => {
    it('should read a plain pixel value', () => {
        expect(cssPx('24px')).toBe(24);
    });

    it('should work out a token scaled by --ui-scale', () => {
        // custom property 嘅 computed value 只係代入咗 var()，calc 唔會計好
        expect(cssPx('calc(24px * 1.5)')).toBe(36);
        expect(cssPx(' calc(8px*1) ')).toBe(8);
    });

    it('should treat anything else as zero', () => {
        expect(cssPx('')).toBe(0);
        expect(cssPx('calc(100% - 4px)')).toBe(0);
    });
});
