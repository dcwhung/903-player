import { formatDateLabel, formatDayMonth, formatWeekday, hkToday } from './date';

describe('hkToday', () => {
    it('uses Hong Kong date even when UTC is still the previous day', () => {
        // UTC 18/10 20:00 = 香港 19/10 04:00
        expect(hkToday(new Date('2026-10-18T20:00:00Z'))).toBe('2026-10-19');
    });

    it('stays on the same day before Hong Kong midnight', () => {
        // UTC 19/10 15:59 = 香港 19/10 23:59
        expect(hkToday(new Date('2026-10-19T15:59:00Z'))).toBe('2026-10-19');
    });
});

describe('formatDateLabel', () => {
    it('formats as DD/MM with Chinese weekday', () => {
        expect(formatDateLabel('2026-10-17')).toBe('17/10（六）');
        expect(formatDateLabel('2026-10-19')).toBe('19/10（一）');
        expect(formatDateLabel('2026-10-25')).toBe('25/10（日）');
    });
});

describe('formatDayMonth / formatWeekday', () => {
    it('splits the label into day/month and weekday', () => {
        expect(formatDayMonth('2026-10-05')).toBe('05/10');
        expect(formatWeekday('2026-10-19')).toBe('星期一');
    });
});
