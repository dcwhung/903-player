import { act, renderHook } from '@testing-library/react';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { NEUTRAL_THEME } from '../config/showThemes';
import { usePlayer } from '../player/usePlayer';
import {
    closeHomePlayerCard,
    openHomePlayerCard,
    useClosedHomePlayerCard,
    useReopenHomePlayerCardOnPlay,
} from './homePlayerCardClosed';

/** 啱啱撳 ✕ 嗰個節目：把手要照顯示佢 */
const CLOSED = { theme: NEUTRAL_THEME, showName: 'Bad Girl大過佬' };

describe('homePlayerCardClosed', () => {
    afterEach(() => openHomePlayerCard());

    it('should start open', () => {
        const { result } = renderHook(() => useClosedHomePlayerCard());
        expect(result.current).toBeNull();
    });

    it('should tell every listener when the card is closed and opened again', () => {
        const first = renderHook(() => useClosedHomePlayerCard());
        const second = renderHook(() => useClosedHomePlayerCard());

        act(() => closeHomePlayerCard(CLOSED));
        expect(first.result.current).toEqual(CLOSED);
        expect(second.result.current).toEqual(CLOSED);

        act(() => openHomePlayerCard());
        expect(first.result.current).toBeNull();
    });

    it('should remember being closed for a later mount (back on the home page)', () => {
        act(() => closeHomePlayerCard(CLOSED));

        const { result } = renderHook(() => useClosedHomePlayerCard());

        expect(result.current).toEqual(CLOSED);
    });

    describe('useReopenHomePlayerCardOnPlay (mounted once at app level)', () => {
        const BADGIRL = recording('badgirl', '2026-10-19', '1000');

        const setup = () => {
            const { wrapper } = createHookWrapper([BADGIRL]);
            return renderHook(
                () => {
                    useReopenHomePlayerCardOnPlay();
                    return { player: usePlayer(), closed: useClosedHomePlayerCard() };
                },
                { wrapper },
            );
        };

        it('should open the card again once anything starts playing', async () => {
            const { result } = setup();
            act(() => closeHomePlayerCard(CLOSED));

            await act(() => result.current.player.load(BADGIRL, { autoplay: true }));

            expect(result.current.closed).toBeNull();
        });

        it('should keep it closed while nothing new plays', () => {
            const { result } = setup();

            act(() => closeHomePlayerCard(CLOSED));

            expect(result.current.closed).toEqual(CLOSED);
        });

        it('should keep it closed when closed while already playing', async () => {
            const { result } = setup();
            await act(() => result.current.player.load(BADGIRL, { autoplay: true }));

            act(() => closeHomePlayerCard(CLOSED));

            expect(result.current.closed).toEqual(CLOSED);
        });
    });
});
