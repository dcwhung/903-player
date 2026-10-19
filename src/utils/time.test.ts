import { formatDuration } from './time';

describe('formatDuration', () => {
    it.each([
        [0, '0:00'],
        [9, '0:09'],
        [2892, '48:12'],
        [6836, '1:53:56'],
        [3600, '1:00:00'],
    ])('formats %d seconds as %s', (seconds, expected) => {
        expect(formatDuration(seconds)).toBe(expected);
    });

    it('treats invalid values as zero', () => {
        expect(formatDuration(Number.NaN)).toBe('0:00');
        expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0:00');
        expect(formatDuration(-5)).toBe('0:00');
    });
});
