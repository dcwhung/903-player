import { cssMs } from './cssTime';

describe('cssMs', () => {
    it('should read milliseconds and seconds', () => {
        expect(cssMs('240ms')).toBe(240);
        expect(cssMs(' 0.24s ')).toBe(240);
    });

    it('should treat anything else as zero', () => {
        expect(cssMs('')).toBe(0);
        expect(cssMs('var(--x)')).toBe(0);
        expect(cssMs('240')).toBe(0);
    });
});
