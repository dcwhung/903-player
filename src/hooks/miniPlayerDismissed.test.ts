import { act, renderHook } from '@testing-library/react';
import {
    dismissMiniPlayer,
    restoreMiniPlayer,
    useMiniPlayerDismissed,
} from './miniPlayerDismissed';

describe('miniPlayerDismissed', () => {
    afterEach(() => restoreMiniPlayer());

    it('starts shown', () => {
        const { result } = renderHook(() => useMiniPlayerDismissed());
        expect(result.current).toBe(false);
    });

    it('tells every listener when the mini player is closed and brought back', () => {
        const first = renderHook(() => useMiniPlayerDismissed());
        const second = renderHook(() => useMiniPlayerDismissed());

        act(() => dismissMiniPlayer());
        expect(first.result.current).toBe(true);
        expect(second.result.current).toBe(true);

        act(() => restoreMiniPlayer());
        expect(first.result.current).toBe(false);
    });

    it('remembers being closed for a later mount (back on the home page)', () => {
        act(() => dismissMiniPlayer());

        const { result } = renderHook(() => useMiniPlayerDismissed());

        expect(result.current).toBe(true);
    });
});
