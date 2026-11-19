import { formatCountdown, spokenCountdown } from './sleepTimerFormat';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

describe('formatCountdown', () => {
    it('should show minutes and seconds', () => {
        expect(formatCountdown(23 * MINUTE + 14 * SECOND)).toBe('23:14');
        expect(formatCountdown(9 * MINUTE + 59 * SECOND)).toBe('9:59');
    });

    it('should round a part second up so the last second still reads 0:01', () => {
        expect(formatCountdown(23 * MINUTE + 13 * SECOND + 1)).toBe('23:14');
        expect(formatCountdown(400)).toBe('0:01');
    });

    it('should show a fresh 60 minute timer as 60:00, not 1:00:00', () => {
        expect(formatCountdown(60 * MINUTE)).toBe('60:00');
    });

    it('should add hours once an episode has more than an hour left', () => {
        expect(formatCountdown(118 * MINUTE + 30 * SECOND)).toBe('1:58:30');
    });

    it('should never show a negative time', () => {
        expect(formatCountdown(-5 * SECOND)).toBe('0:00');
    });
});

describe('spokenCountdown', () => {
    it('should read minutes and seconds', () => {
        expect(spokenCountdown(23 * MINUTE + 14 * SECOND)).toBe('23 分 14 秒');
        expect(spokenCountdown(118 * MINUTE + 30 * SECOND)).toBe('118 分 30 秒');
    });
});
