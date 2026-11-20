import { ambientNightState, crossedDawn, type AmbientNightInput } from './ambientNight';

const MINUTE_MS = 60_000;
/** 裝置本地時間（測試跑喺 TZ=Asia/Hong_Kong 都好 UTC 都得：全部用本地時間砌） */
const at = (hour: number, minute = 0, day = 30) => new Date(2026, 10, day, hour, minute).getTime();

const START = at(22, 30);
const input = (overrides: Partial<AmbientNightInput> = {}): AmbientNightInput => ({
    timer: null,
    expiry: null,
    now: START,
    ...overrides,
});
const timerAt = (fraction: number, startedAt = START) => ({ startedAt, fraction });

describe('crossedDawn', () => {
    it('should be false when no 05:00 lies between the two instants', () => {
        expect(crossedDawn(at(22, 30), at(23, 30))).toBe(false);
    });

    it('should be true when 05:00 of the next day has passed', () => {
        expect(crossedDawn(at(22, 30), at(5, 0, 31))).toBe(true);
    });

    it('should be true when started after midnight and 05:00 the same day has passed', () => {
        expect(crossedDawn(at(4, 40), at(5, 1))).toBe(true);
    });

    it('should be false when started at exactly 05:00 (that dawn is not after the start)', () => {
        expect(crossedDawn(at(5, 0), at(5, 30))).toBe(false);
    });

    it('should be false one minute before 05:00', () => {
        expect(crossedDawn(at(4, 40), at(4, 59))).toBe(false);
    });
});

describe('ambientNightState', () => {
    it('should be day when there is no timer and nothing expired', () => {
        expect(ambientNightState(input())).toBe('day');
    });

    it('should be day while less than a third of the timer has elapsed', () => {
        expect(ambientNightState(input({ timer: timerAt(0.7) }))).toBe('day');
    });

    it('should be night once a third of the timer has elapsed (fraction exactly 2/3)', () => {
        expect(ambientNightState(input({ timer: timerAt(2 / 3) }))).toBe('night');
    });

    it('should be night for the rest of the timer', () => {
        expect(ambientNightState(input({ timer: timerAt(0.1) }))).toBe('night');
    });

    it('should be night when the timer expired and paused playback (until woken)', () => {
        expect(ambientNightState(input({ expiry: { startedAt: START } }))).toBe('night');
    });

    it('should darken outside the night window too (darkening only depends on the timer)', () => {
        const started = at(20, 30);
        expect(ambientNightState(input({ timer: timerAt(0.5, started), now: at(20, 50) }))).toBe(
            'night',
        );
    });

    it('should brighten once 05:00 passes after the timer started', () => {
        const started = at(4, 40);
        expect(ambientNightState(input({ timer: timerAt(0.3, started), now: at(5, 0) }))).toBe(
            'day',
        );
    });

    it('should stay day after 05:00 even if that timer later expires', () => {
        expect(ambientNightState(input({ expiry: { startedAt: at(4, 40) }, now: at(5, 10) }))).toBe(
            'day',
        );
    });

    it('should brighten an expired-by-timer night when 05:00 passes', () => {
        expect(ambientNightState(input({ expiry: { startedAt: at(1, 0) }, now: at(5, 0) }))).toBe(
            'day',
        );
    });

    it('should darken a timer started after 05:00 once a third has elapsed', () => {
        const started = at(5, 10);
        expect(ambientNightState(input({ timer: timerAt(0.6, started), now: at(5, 25) }))).toBe(
            'night',
        );
    });

    it('should prefer the running timer over an older expiry', () => {
        expect(
            ambientNightState(input({ timer: timerAt(0.9), expiry: { startedAt: START } })),
        ).toBe('day');
    });

    it('should use the episode timer fraction the same way (its own total)', () => {
        // 「播完呢集」：fraction 由 controller 按呢集剩餘 / 揀嗰刻剩餘計，呢度一視同仁
        expect(ambientNightState(input({ timer: timerAt(0.66) }))).toBe('night');
        expect(ambientNightState(input({ timer: timerAt(0.67) }))).toBe('day');
    });

    it('should stay night at the very end of the timer (fraction 0)', () => {
        expect(ambientNightState(input({ timer: timerAt(0), now: START + 30 * MINUTE_MS }))).toBe(
            'night',
        );
    });
});
