import {
    daysBetween,
    formatDateLabel,
    formatDayMonth,
    formatWeekday,
    hkTimeHHMM,
    hkToday,
    weekdayOf,
} from './date';

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

describe('hkTimeHHMM', () => {
    it('formats Hong Kong time as HHMM like recording file names', () => {
        // UTC 19/10 01:05 = 香港 19/10 09:05
        expect(hkTimeHHMM(new Date('2026-10-19T01:05:00Z'))).toBe('0905');
    });

    it('uses 00 for the hour right after Hong Kong midnight', () => {
        // UTC 19/10 16:30 = 香港 20/10 00:30
        expect(hkTimeHHMM(new Date('2026-10-19T16:30:00Z'))).toBe('0030');
    });

    it('stays on 23 just before Hong Kong midnight', () => {
        expect(hkTimeHHMM(new Date('2026-10-19T15:59:00Z'))).toBe('2359');
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

describe('weekdayOf', () => {
    it('returns 0 for Sunday through 6 for Saturday', () => {
        expect(weekdayOf('2026-10-18')).toBe(0);
        expect(weekdayOf('2026-10-19')).toBe(1);
        expect(weekdayOf('2026-10-17')).toBe(6);
    });
});

describe('daysBetween', () => {
    it('counts calendar days between two ISO dates', () => {
        expect(daysBetween('2026-10-19', '2026-10-19')).toBe(0);
        expect(daysBetween('2026-10-19', '2026-10-21')).toBe(2);
        expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    });
});
