import { MS_PER_MINUTE } from '../config/constants';
import { formatClock, formatClockDate, msToNextMinute } from './clock';

/** 裝置本地時間（唔係香港時區） */
const localTime = (month: number, day: number, hour: number, minute: number, second = 0): Date =>
    new Date(2026, month - 1, day, hour, minute, second);

describe('formatClock', () => {
    it('should format device-local time as zero-padded 24-hour HH:MM', () => {
        expect(formatClock(localTime(11, 30, 22, 30))).toBe('22:30');
        expect(formatClock(localTime(11, 30, 7, 5))).toBe('07:05');
    });

    it('should show midnight as 00:00', () => {
        expect(formatClock(localTime(12, 1, 0, 0))).toBe('00:00');
    });
});

describe('formatClockDate', () => {
    it('should format the device-local date with the full weekday', () => {
        expect(formatClockDate(localTime(11, 30, 22, 30))).toBe('11月30日 星期一');
    });

    it('should not zero-pad month or day', () => {
        expect(formatClockDate(localTime(1, 4, 9, 0))).toBe('1月4日 星期日');
        expect(formatClockDate(localTime(11, 29, 23, 59))).toBe('11月29日 星期日');
    });
});

describe('msToNextMinute', () => {
    it('should count the milliseconds left until the next minute boundary', () => {
        const start = localTime(11, 30, 22, 30, 15).getTime();
        expect(msToNextMinute(start)).toBe(45_000);
        expect(msToNextMinute(start + 500)).toBe(44_500);
    });

    it('should wait a full minute when exactly on a boundary', () => {
        expect(msToNextMinute(localTime(11, 30, 22, 30).getTime())).toBe(MS_PER_MINUTE);
    });
});
