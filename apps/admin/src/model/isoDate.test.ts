import { isoPartsOf, pad2 } from './isoDate';

describe('isoDate', () => {
    it('should pad to two digits', () => {
        expect(pad2(5)).toBe('05');
        expect(pad2(12)).toBe('12');
    });

    it('should split an ISO date into numbers', () => {
        expect(isoPartsOf('2026-01-03')).toEqual({ year: 2026, month: 1, day: 3 });
    });
});
