import { act, renderHook } from '@testing-library/react';
import { MS_PER_MINUTE } from '../config/constants';
import { useNightWindow } from './useNightWindow';

/** 裝置本地時間 */
const localTime = (hour: number, minute: number, second = 0): Date =>
    new Date(2026, 10, 30, hour, minute, second);

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useNightWindow', () => {
    it('should be false in the daytime and true at night on mount', () => {
        vi.setSystemTime(localTime(14, 0));
        expect(renderHook(() => useNightWindow()).result.current).toBe(false);

        vi.setSystemTime(localTime(22, 30));
        expect(renderHook(() => useNightWindow()).result.current).toBe(true);
    });

    it('should switch on at 21:00 within the same minute boundary', () => {
        vi.setSystemTime(localTime(20, 59, 30));
        const { result } = renderHook(() => useNightWindow());
        expect(result.current).toBe(false);

        act(() => vi.advanceTimersByTime(29_000));
        expect(result.current).toBe(false);

        act(() => vi.advanceTimersByTime(1_000));
        expect(result.current).toBe(true);
    });

    it('should switch off at 05:00', () => {
        vi.setSystemTime(localTime(4, 59, 0));
        const { result } = renderHook(() => useNightWindow());
        expect(result.current).toBe(true);

        act(() => vi.advanceTimersByTime(MS_PER_MINUTE));
        expect(result.current).toBe(false);
    });

    it('should re-check when the page becomes visible again (timers frozen in background)', () => {
        vi.setSystemTime(localTime(20, 0));
        const { result } = renderHook(() => useNightWindow());
        // 背景時 timer 冇行，但系統時間已經過咗 21:00
        vi.setSystemTime(localTime(21, 30));

        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        expect(result.current).toBe(true);
    });

    it('should stop checking after unmount', () => {
        vi.setSystemTime(localTime(20, 59, 30));
        const { unmount } = renderHook(() => useNightWindow());
        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });
});
