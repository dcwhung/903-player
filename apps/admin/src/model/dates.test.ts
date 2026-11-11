import { clockTime, longDate, shortDate, stampOf } from './dates';

describe('dates', () => {
    it('should format a short date with the weekday like the mockup', () => {
        expect(shortDate('2026-11-16')).toBe('11/16 一');
        expect(shortDate('2026-11-22')).toBe('11/22 日');
    });

    it('should format a long date', () => {
        expect(longDate('2026-11-03')).toBe('11 月 3 日');
    });

    it('should show HK clock time for an ISO timestamp', () => {
        expect(clockTime('2026-11-10T01:41:00.000Z')).toBe('09:41');
    });

    it('should stamp today as 今天 and other days as M/D', () => {
        const now = new Date('2026-11-10T04:00:00.000Z');
        expect(stampOf('2026-11-10T02:02:00.000Z', now)).toBe('今天 10:02');
        expect(stampOf('2026-11-09T14:40:00.000Z', now)).toBe('11/9 22:40');
    });
});
