import { DEBUG_TAP_COUNT, DEBUG_TAP_WINDOW_MS, recordTap } from './tapGesture';

/** 由 0ms 開始，每隔 stepMs 撳一下，返回最後狀態同邊一下觸發咗 */
const tapAt = (times: number[]) => {
    let taps: number[] = [];
    const fired: number[] = [];
    times.forEach((now, i) => {
        const next = recordTap(taps, now);
        taps = next.taps;
        if (next.fired) fired.push(i + 1);
    });
    return { taps, fired };
};

describe('recordTap', () => {
    it('should fire on the 5th tap within the window', () => {
        expect(DEBUG_TAP_COUNT).toBe(5);
        expect(tapAt([0, 300, 600, 900, 1200]).fired).toEqual([5]);
    });

    it('should do nothing for a single tap', () => {
        expect(recordTap([], 0)).toEqual({ taps: [0], fired: false });
    });

    it('should not fire when the 5 taps spread over more than the window', () => {
        const step = DEBUG_TAP_WINDOW_MS / 4 + 1;

        expect(tapAt([0, step, 2 * step, 3 * step, 4 * step]).fired).toEqual([]);
    });

    it('should drop taps older than the window, so a slow start still counts the latest 5', () => {
        // 第一下太耐之前：之後連撳 5 下先觸發
        expect(tapAt([0, 2500, 2700, 2900, 3100, 3300]).fired).toEqual([6]);
    });

    it('should start counting again after firing', () => {
        const { taps, fired } = tapAt([0, 100, 200, 300, 400, 500, 600]);

        expect(fired).toEqual([5]);
        expect(taps).toEqual([500, 600]);
    });
});
