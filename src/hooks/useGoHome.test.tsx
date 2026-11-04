import { act, renderHook } from '@testing-library/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { themeFor } from '../catalog/shows';
import { usePlayer } from '../player/usePlayer';
import type { InnerPage } from '../selectors/pageHandle';
import { unzoomHome, zoomKey, zoomState } from '../utils/cardZoom';
import { withViewTransition } from '../utils/viewTransition';
import { closeHomePlayerCard, openHomePlayerCard } from './homePlayerCardClosed';
import { dismissMiniPlayer, restoreMiniPlayer } from './miniPlayerDismissed';
import { useGoHome } from './useGoHome';

vi.mock('../utils/cardZoom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../utils/cardZoom')>()),
    unzoomHome: vi.fn((_: string | null, go: () => void) => go()),
}));
vi.mock('../utils/viewTransition', () => ({
    withViewTransition: vi.fn((go: () => void) => {
        go();
        return true;
    }),
}));

const KEY = zoomKey.show('gongzi');
const SHOW_PATH = '/show/gongzi';
const PAGE: InnerPage = { kind: 'show', showId: 'gongzi' };
const GONGZI = recording('gongzi', '2026-10-17');
const BADGIRL = recording('badgirl', '2026-10-17');

const stubWide = (wide: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: wide && query.includes('min-height: 562px'),
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );

const renderGoHome = () =>
    renderHook(
        () => ({
            goHome: useGoHome(PAGE),
            navigate: useNavigate(),
            path: useLocation().pathname,
            player: usePlayer(),
        }),
        { wrapper: createHookWrapper().wrapper },
    );

type Rendered = ReturnType<typeof renderGoHome>['result'];

/** 撳格仔 zoom 入節目頁：入頁嗰個 history entry 帶住來源 */
const zoomIn = (result: Rendered) =>
    act(() => void result.current.navigate(SHOW_PATH, { state: zoomState(KEY) }));

const load = (result: Rendered, track: typeof GONGZI) =>
    act(() => result.current.player.load(track, { autoplay: false }));

const WIDE_UNZOOM = (kind: string) => ({ kind, fallback: 'back' });

describe('useGoHome', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.mocked(unzoomHome).mockClear();
        vi.mocked(withViewTransition).mockClear();
        openHomePlayerCard();
        restoreMiniPlayer();
    });

    it('should shrink back into the tile the page was zoomed from on a narrow screen', () => {
        stubWide(false);
        const { result } = renderGoHome();
        zoomIn(result);

        act(() => result.current.goHome());

        expect(unzoomHome).toHaveBeenCalledWith(KEY, expect.any(Function));
        expect(withViewTransition).not.toHaveBeenCalled();
        expect(result.current.path).toBe('/');
    });

    it('should just go home when the page was opened another way (W-527)', () => {
        stubWide(false);
        const { result } = renderGoHome();
        zoomIn(result);
        // 系統返回手勢返主頁，再撳 mini player 入同一頁（冇 zoom 來源）
        act(() => void result.current.navigate(-1));
        act(() => void result.current.navigate(SHOW_PATH));

        act(() => result.current.goHome());

        expect(unzoomHome).toHaveBeenCalledExactlyOnceWith(null, expect.any(Function));
        expect(result.current.path).toBe('/');
    });

    describe('on a wide screen (_mockups_/card-zoom-wide)', () => {
        beforeEach(() => stubWide(true));

        it('should keep the back transition when the page was not zoomed into', async () => {
            const { result } = renderGoHome();
            await load(result, BADGIRL);
            act(() => void result.current.navigate(SHOW_PATH));

            act(() => result.current.goHome());

            expect(withViewTransition).toHaveBeenCalledWith(expect.any(Function), 'back');
            expect(unzoomHome).not.toHaveBeenCalled();
            expect(result.current.path).toBe('/');
        });

        it('should unzoom while the inner handle grows back into the card (①)', async () => {
            const { result } = renderGoHome();
            await load(result, BADGIRL);
            zoomIn(result);

            act(() => result.current.goHome());

            expect(unzoomHome).toHaveBeenCalledWith(
                KEY,
                expect.any(Function),
                WIDE_UNZOOM('unzoom-handle'),
            );
            expect(withViewTransition).not.toHaveBeenCalled();
            expect(result.current.path).toBe('/');
        });

        it('should shrink the page into the card it is playing (R2)', async () => {
            const { result } = renderGoHome();
            await load(result, GONGZI);
            zoomIn(result);

            act(() => result.current.goHome());

            expect(withViewTransition).toHaveBeenCalledWith(expect.any(Function), 'back');
            expect(unzoomHome).not.toHaveBeenCalled();
        });

        it('should only unzoom when the card stays closed (C1)', () => {
            act(() =>
                closeHomePlayerCard({
                    theme: themeFor('gongzi'),
                    showName: '公子會',
                    item: { kind: 'show', id: 'gongzi', date: '2026-10-17' },
                }),
            );
            const { result } = renderGoHome();
            zoomIn(result);

            act(() => result.current.goHome());

            expect(unzoomHome).toHaveBeenCalledWith(
                KEY,
                expect.any(Function),
                WIDE_UNZOOM('unzoom'),
            );
            expect(withViewTransition).not.toHaveBeenCalled();
        });

        it('should only unzoom when the home page will have nothing on the right', async () => {
            const { result } = renderGoHome();
            await load(result, BADGIRL);
            act(() => dismissMiniPlayer());
            zoomIn(result);

            act(() => result.current.goHome());

            expect(unzoomHome).toHaveBeenCalledWith(
                KEY,
                expect.any(Function),
                WIDE_UNZOOM('unzoom'),
            );
        });
    });
});
