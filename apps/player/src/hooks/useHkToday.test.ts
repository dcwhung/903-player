/* S-704：頁面靜止（暫停緊、冇其他 state 變）過咗香港午夜，「今日」都要自己轉 */
import { act, renderHook } from '@testing-library/react';
import { useHkToday } from './useHkToday';

describe('useHkToday', () => {
    afterEach(() => vi.useRealTimers());

    it('should switch to the new Hong Kong date at midnight without any other render', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-30T15:59:00Z')); // 香港 30/11 23:59
        const { result } = renderHook(() => useHkToday());
        expect(result.current).toBe('2026-11-30');

        act(() => vi.advanceTimersByTime(59_000));
        expect(result.current).toBe('2026-11-30');

        act(() => vi.advanceTimersByTime(1_000)); // 香港 01/12 00:00
        expect(result.current).toBe('2026-12-01');

        act(() => vi.advanceTimersByTime(24 * 60 * 60 * 1000)); // 再過一日
        expect(result.current).toBe('2026-12-02');
    });

    it('should catch up when the page comes back to the foreground (timers frozen in background)', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-30T15:00:00Z'));
        const { result } = renderHook(() => useHkToday());
        expect(result.current).toBe('2026-11-30');

        vi.setSystemTime(new Date('2026-12-01T01:00:00Z')); // 背景期間 timer 冇行
        act(() => document.dispatchEvent(new Event('visibilitychange')));
        expect(result.current).toBe('2026-12-01');
    });
});
