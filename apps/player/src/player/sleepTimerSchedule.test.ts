import {
    formatScheduleTime,
    minuteOfDay,
    occurrenceAt,
    roundScheduleInstant,
    SCHEDULE_WINDOW_MS,
} from './sleepTimerSchedule';

/** 裝置本地時間（排程跟本地鐘，唔可以寫死 +08:00） */
const at = (day: number, hour: number, minute: number, second = 0) =>
    new Date(2026, 10, day, hour, minute, second).getTime();
const HOUR_MS = 3_600_000;

describe('roundScheduleInstant', () => {
    it.each([
        ['23:11', at(30, 23, 11), at(30, 23, 10)],
        ['23:12', at(30, 23, 12), at(30, 23, 10)],
        ['23:12:30', at(30, 23, 12, 30), at(30, 23, 10)],
        ['23:13', at(30, 23, 13), at(30, 23, 15)],
        ['23:15', at(30, 23, 15), at(30, 23, 15)],
        ['23:15:59', at(30, 23, 15, 59), at(30, 23, 15)],
        ['00:02', at(30, 0, 2), at(30, 0, 0)],
    ])('should round %s to the nearest 5 minutes', (_, now, expected) => {
        expect(roundScheduleInstant(now)).toBe(expected);
    });

    it('should roll 23:58 over to 00:00 the next day', () => {
        const rounded = roundScheduleInstant(at(29, 23, 58));
        expect(rounded).toBe(at(30, 0, 0));
        expect(minuteOfDay(rounded)).toBe(0);
    });
});

describe('formatScheduleTime', () => {
    it('should show HH:MM', () => {
        expect(formatScheduleTime(22 * 60 + 30)).toBe('22:30');
        expect(formatScheduleTime(5)).toBe('00:05');
    });
});

describe('occurrenceAt', () => {
    const SCHEDULE_2230 = 22 * 60 + 30;

    it('should not be active before the scheduled time', () => {
        expect(occurrenceAt(SCHEDULE_2230, at(30, 22, 29))).toBeNull();
    });

    it('should open at the scheduled time for 3 hours, across midnight', () => {
        expect(occurrenceAt(SCHEDULE_2230, at(30, 22, 30))).toEqual({
            start: at(30, 22, 30),
            end: at(30, 22, 30) + SCHEDULE_WINDOW_MS,
        });
        expect(occurrenceAt(SCHEDULE_2230, at(31, 1, 29))?.start).toBe(at(30, 22, 30));
        expect(occurrenceAt(SCHEDULE_2230, at(31, 1, 30))).toBeNull();
        expect(SCHEDULE_WINDOW_MS).toBe(3 * HOUR_MS);
    });

    it('should close at 05:00 when that comes before the 3 hours', () => {
        const at0300 = 3 * 60;
        expect(occurrenceAt(at0300, at(30, 4, 59))?.end).toBe(at(30, 5, 0));
        expect(occurrenceAt(at0300, at(30, 5, 0))).toBeNull();
        expect(occurrenceAt(4 * 60 + 30, at(30, 4, 45))?.end).toBe(at(30, 5, 0));
    });

    it('should handle a schedule just after midnight', () => {
        const at0030 = 30;
        expect(occurrenceAt(at0030, at(29, 23, 0))).toBeNull();
        expect(occurrenceAt(at0030, at(30, 0, 30))?.start).toBe(at(30, 0, 30));
        expect(occurrenceAt(at0030, at(30, 3, 29))?.end).toBe(at(30, 3, 30));
        expect(occurrenceAt(at0030, at(30, 3, 30))).toBeNull();
    });

    it('should give a daytime schedule the full 3 hours (05:00 is the next morning)', () => {
        expect(occurrenceAt(14 * 60, at(30, 16, 59))?.end).toBe(at(30, 17, 0));
    });

    it('should not reach back to an occurrence that already ended last night', () => {
        expect(occurrenceAt(4 * 60, at(30, 3, 0))).toBeNull();
    });
});
