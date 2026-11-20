import { act, renderHook } from '@testing-library/react';
import { formatClock } from '../utils/clock';
import { useMinuteClock } from './useMinuteClock';

/** 裝置本地時間 */
const localTime = (hour: number, minute: number, second = 0): Date =>
    new Date(2026, 10, 30, hour, minute, second);

const setVisibility = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
    document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

describe('useMinuteClock', () => {
    it('should start at the current time', () => {
        vi.setSystemTime(localTime(22, 30, 15));
        const { result } = renderHook(() => useMinuteClock());
        expect(formatClock(result.current)).toBe('22:30');
    });

    it('should tick exactly on the next minute boundary', () => {
        vi.setSystemTime(localTime(22, 30, 45));
        const { result } = renderHook(() => useMinuteClock());

        act(() => vi.advanceTimersByTime(14_999));
        expect(formatClock(result.current)).toBe('22:30');

        act(() => vi.advanceTimersByTime(1));
        expect(formatClock(result.current)).toBe('22:31');
    });

    it('should keep ticking every minute after the first boundary', () => {
        vi.setSystemTime(localTime(23, 59, 30));
        const { result } = renderHook(() => useMinuteClock());

        act(() => vi.advanceTimersByTime(30_000));
        expect(formatClock(result.current)).toBe('00:00');

        act(() => vi.advanceTimersByTime(60_000));
        expect(formatClock(result.current)).toBe('00:01');
    });

    it('should catch up when the page becomes visible again', () => {
        vi.setSystemTime(localTime(22, 30));
        const { result } = renderHook(() => useMinuteClock());

        // 背景時 timer 可能冇行：淨係改系統時間，唔推 timer
        vi.setSystemTime(localTime(22, 45, 10));
        act(() => setVisibility('visible'));
        expect(formatClock(result.current)).toBe('22:45');
    });

    it('should stop its timer on unmount', () => {
        vi.setSystemTime(localTime(22, 30));
        const { unmount } = renderHook(() => useMinuteClock());
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });
});
