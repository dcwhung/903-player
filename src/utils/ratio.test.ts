import { PERCENT, ratio, toPercent } from './ratio';

describe('ratio', () => {
    it('divides position by duration, capped at 1', () => {
        expect(ratio(30, 120)).toBe(0.25);
        expect(ratio(200, 120)).toBe(1);
    });

    it('is 0 while the duration is unknown', () => {
        expect(ratio(30, 0)).toBe(0);
        expect(ratio(30, Number.NaN)).toBe(0);
    });
});

describe('toPercent', () => {
    it('rounds a 0–1 ratio to a whole percent', () => {
        expect(toPercent(0.114)).toBe(11);
        expect(PERCENT).toBe(100);
    });
});
