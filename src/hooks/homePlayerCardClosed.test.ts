import { act, renderHook } from '@testing-library/react';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { usePlayer } from '../player/usePlayer';
import {
    closeHomePlayerCard,
    openHomePlayerCard,
    useHomePlayerCardClosed,
    useReopenHomePlayerCardOnPlay,
} from './homePlayerCardClosed';

describe('homePlayerCardClosed', () => {
    afterEach(() => openHomePlayerCard());

    it('should start open', () => {
        const { result } = renderHook(() => useHomePlayerCardClosed());
        expect(result.current).toBe(false);
    });

    it('should tell every listener when the card is closed and opened again', () => {
        const first = renderHook(() => useHomePlayerCardClosed());
        const second = renderHook(() => useHomePlayerCardClosed());

        act(() => closeHomePlayerCard());
        expect(first.result.current).toBe(true);
        expect(second.result.current).toBe(true);

        act(() => openHomePlayerCard());
        expect(first.result.current).toBe(false);
    });

    it('should remember being closed for a later mount (back on the home page)', () => {
        act(() => closeHomePlayerCard());

        const { result } = renderHook(() => useHomePlayerCardClosed());

        expect(result.current).toBe(true);
    });

    describe('useReopenHomePlayerCardOnPlay (mounted once at app level)', () => {
        const BADGIRL = recording('badgirl', '2026-10-19', '1000');

        const setup = () => {
            const { wrapper } = createHookWrapper([BADGIRL]);
            return renderHook(
                () => {
                    useReopenHomePlayerCardOnPlay();
                    return { player: usePlayer(), closed: useHomePlayerCardClosed() };
                },
                { wrapper },
            );
        };

        it('should open the card again once anything starts playing', async () => {
            const { result } = setup();
            act(() => closeHomePlayerCard());

            await act(() => result.current.player.load(BADGIRL, { autoplay: true }));

            expect(result.current.closed).toBe(false);
        });

        it('should keep it closed while nothing new plays', () => {
            const { result } = setup();

            act(() => closeHomePlayerCard());

            expect(result.current.closed).toBe(true);
        });

        it('should keep it closed when closed while already playing', async () => {
            const { result } = setup();
            await act(() => result.current.player.load(BADGIRL, { autoplay: true }));

            act(() => closeHomePlayerCard());

            expect(result.current.closed).toBe(true);
        });
    });
});
