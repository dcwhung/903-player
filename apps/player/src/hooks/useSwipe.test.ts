import { stepIndex } from './useSwipe';

describe('stepIndex', () => {
    it('should stop at either end by default', () => {
        expect(stepIndex(0, 3, 'previous')).toBe(0);
        expect(stepIndex(2, 3, 'next')).toBe(2);
        expect(stepIndex(1, 3, 'next')).toBe(2);
    });

    it('should wrap to the last show when going back from the first with wrap on', () => {
        expect(stepIndex(0, 3, 'previous', { wrap: true })).toBe(2);
    });

    it('should wrap to the first show when going forward from the last with wrap on', () => {
        expect(stepIndex(2, 3, 'next', { wrap: true })).toBe(0);
    });

    it('should step normally in the middle with wrap on', () => {
        expect(stepIndex(1, 3, 'next', { wrap: true })).toBe(2);
        expect(stepIndex(1, 3, 'previous', { wrap: true })).toBe(0);
    });

    it('should stay put with a single show even with wrap on', () => {
        expect(stepIndex(0, 1, 'next', { wrap: true })).toBe(0);
        expect(stepIndex(0, 1, 'previous', { wrap: true })).toBe(0);
    });
});
