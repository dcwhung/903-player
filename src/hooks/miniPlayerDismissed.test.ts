import { act, renderHook } from '@testing-library/react';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { usePlayer } from '../player/usePlayer';
import {
    dismissMiniPlayer,
    restoreMiniPlayer,
    useMiniPlayerDismissed,
    useRestoreMiniPlayerOnPlay,
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

    describe('useRestoreMiniPlayerOnPlay (mounted once at app level)', () => {
        const BADGIRL = recording('badgirl', '2026-10-19', '1000');

        const setup = () => {
            const { wrapper } = createHookWrapper([BADGIRL]);
            return renderHook(
                () => {
                    useRestoreMiniPlayerOnPlay();
                    return { player: usePlayer(), dismissed: useMiniPlayerDismissed() };
                },
                { wrapper },
            );
        };

        it('brings the mini player back once anything starts playing, from any page', async () => {
            const { result } = setup();
            act(() => dismissMiniPlayer());

            await act(() => result.current.player.load(BADGIRL, { autoplay: true }));
            act(() => result.current.player.pause());

            expect(result.current.dismissed).toBe(false);
        });

        it('leaves it closed while nothing new plays', () => {
            const { result } = setup();

            act(() => dismissMiniPlayer());

            expect(result.current.dismissed).toBe(true);
        });
    });
});
