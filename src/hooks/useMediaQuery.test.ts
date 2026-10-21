import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

const QUERY = '(orientation: landscape)';

/** 假 matchMedia：記低 listener，可以人手轉狀態 */
const fakeMatchMedia = (initial: boolean) => {
    let matches = initial;
    const listeners = new Set<() => void>();
    const list = {
        get matches() {
            return matches;
        },
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    };
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => list),
    );
    return {
        listeners,
        set: (next: boolean) => {
            matches = next;
            listeners.forEach((listener) => listener());
        },
    };
};

describe('useMediaQuery', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should report whether the query matches now', () => {
        fakeMatchMedia(true);

        const { result } = renderHook(() => useMediaQuery(QUERY));

        expect(result.current).toBe(true);
    });

    it('should update when the media query result changes', () => {
        const media = fakeMatchMedia(false);
        const { result } = renderHook(() => useMediaQuery(QUERY));

        act(() => media.set(true));

        expect(result.current).toBe(true);
    });

    it('should stop listening after unmount', () => {
        const media = fakeMatchMedia(false);
        const { unmount } = renderHook(() => useMediaQuery(QUERY));

        unmount();

        expect(media.listeners.size).toBe(0);
    });

    it('should treat a missing matchMedia as not matching', () => {
        vi.stubGlobal('matchMedia', undefined);

        const { result } = renderHook(() => useMediaQuery(QUERY));

        expect(result.current).toBe(false);
    });
});
