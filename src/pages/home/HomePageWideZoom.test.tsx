import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import { stubWideLandscape } from '../../../tests/landscape';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../../catalog/dramas';
import { openHomePlayerCard } from '../../hooks/homePlayerCardClosed';
import { restoreMiniPlayer } from '../../hooks/miniPlayerDismissed';
import { usePlayer } from '../../player/usePlayer';
import type { Track } from '../../types/track';
import { unzoomHome, zoomInto, zoomKey } from '../../utils/cardZoom';
import { withViewTransition } from '../../utils/viewTransition';
import { DramaPage } from '../drama/DramaPage';
import { HomePage } from './HomePage';

// 包住 zoomInto / withViewTransition：記低用咗邊款過場，照行 update（jsdom 冇 View Transition）
vi.mock('../../utils/cardZoom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../utils/cardZoom')>()),
    zoomInto: vi.fn((_key: string, update: (zoomed: boolean) => void) => update(true)),
    unzoomHome: vi.fn((_key: string | null, update: () => void) => update()),
}));
vi.mock('../../utils/viewTransition', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../utils/viewTransition')>();
    return { ...actual, withViewTransition: vi.fn(actual.withViewTransition) };
});

/** 今日（19/10）冇節目：冇嘢載入就冇卡（②） */
const GONGZI = recording('gongzi', '2026-10-17', '1600');
const BADGIRL = recording('badgirl', '2026-10-17', '1000');
const RECORDINGS = [GONGZI, BADGIRL];
const CHISEE = seriesEpisodesOf('chisee')[0] as Track;
const CLOSE = '關閉播放器';

/** 喺其他頁載入咗（暫停緊）track，再返主頁 */
const LoadThenGoHome = ({ track }: { track: Track }) => {
    const { load } = usePlayer();
    const navigate = useNavigate();
    return (
        <button
            type="button"
            onClick={async () => {
                await load(track, { autoplay: false });
                navigate('/');
            }}
        >
            load then home
        </button>
    );
};

/** 劇集頁（返主頁用真嘅 useGoHome） */
const DRAMA_ROUTE = { path: '/drama/:dramaId', element: <DramaPage /> };

const renderHome = async (loaded?: Track) => {
    renderWithProviders(<HomePage />, {
        route: loaded ? '/elsewhere' : '/',
        recordings: RECORDINGS,
        extraRoutes: loaded
            ? [{ path: '/elsewhere', element: <LoadThenGoHome track={loaded} /> }, DRAMA_ROUTE]
            : [DRAMA_ROUTE],
    });
    if (loaded) await userEvent.click(screen.getByRole('button', { name: 'load then home' }));
    await screen.findByRole('main');
};

const tile = (name: string) =>
    within(screen.getByRole('navigation', { name: '節目' })).getByRole('button', { name });

const location = () => screen.getByTestId('location');

describe('wide home tiles pick their transition (_mockups_/card-zoom-wide)', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
        stubWideLandscape();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.mocked(zoomInto).mockClear();
        vi.mocked(unzoomHome).mockClear();
        vi.mocked(withViewTransition).mockClear();
        openHomePlayerCard();
        restoreMiniPlayer();
    });

    it('should expand the card when the tile is the show on the card', async () => {
        await renderHome(GONGZI);

        await userEvent.click(tile('公子會'));

        expect(withViewTransition).toHaveBeenCalledWith(expect.any(Function), 'expand');
        expect(zoomInto).not.toHaveBeenCalled();
        expect(location()).toHaveTextContent('/show/gongzi');
    });

    it('should pair the card with the inner handle when another show is on the card (①)', async () => {
        await renderHome(BADGIRL);

        await userEvent.click(tile('公子會'));

        expect(zoomInto).toHaveBeenCalledWith(
            zoomKey.show('gongzi'),
            expect.any(Function),
            'zoom-handle',
        );
        expect(location()).toHaveTextContent('/show/gongzi');
    });

    it('should just zoom when there is no card and the tile starts playing (②)', async () => {
        await renderHome();

        await userEvent.click(tile('公子會'));

        expect(zoomInto).toHaveBeenCalledWith(zoomKey.show('gongzi'), expect.any(Function), 'zoom');
        expect(withViewTransition).not.toHaveBeenCalledWith(expect.any(Function), 'expand');
    });

    it('should just zoom when the card is closed and the tile starts playing (③)', async () => {
        await renderHome(BADGIRL);
        await userEvent.click(screen.getByRole('button', { name: CLOSE }));

        await userEvent.click(tile('公子會'));

        expect(zoomInto).toHaveBeenCalledWith(zoomKey.show('gongzi'), expect.any(Function), 'zoom');
    });

    it('should zoom the today tile without pairing when nothing will sit on the today page handle', async () => {
        await renderHome();

        await userEvent.click(tile('今日節目'));

        expect(zoomInto).toHaveBeenCalledWith(zoomKey.today, expect.any(Function), 'zoom');
    });

    it('should pair the card with the handle when a drama tile opens over a show card', async () => {
        await renderHome(BADGIRL);
        await userEvent.click(screen.getByRole('button', { name: '廣播劇' }));

        await userEvent.click(screen.getByRole('button', { name: /^芝See菇Bi Family/ }));

        expect(zoomInto).toHaveBeenCalledWith(
            zoomKey.drama('chisee'),
            expect.any(Function),
            'zoom-handle',
        );
    });

    it('should expand the card when the drama tile is the drama on the card', async () => {
        await renderHome(CHISEE);
        await userEvent.click(screen.getByRole('button', { name: '廣播劇' }));

        await userEvent.click(screen.getByRole('button', { name: /^芝See菇Bi Family/ }));

        expect(withViewTransition).toHaveBeenCalledWith(expect.any(Function), 'expand');
        expect(zoomInto).not.toHaveBeenCalled();
        expect(location()).toHaveTextContent('/drama/chisee');
    });

    it('should pair the handles when the closed-card tile starts nothing (S-682)', async () => {
        await renderHome(BADGIRL);
        await userEvent.click(screen.getByRole('button', { name: CLOSE }));

        // 雲妮鍾情冇錄音：startShow 乜都冇播，內頁照出閂咗嘅卡嘅把手
        await userEvent.click(tile('雲妮鍾情'));

        expect(zoomInto).toHaveBeenCalledWith(
            zoomKey.show('wanni'),
            expect.any(Function),
            'zoom-handle',
        );
    });

    it('should pair the home handle with the inner handle both ways and stay closed for a series drama tile (S-685)', async () => {
        await renderHome(BADGIRL);
        await userEvent.click(screen.getByRole('button', { name: CLOSE }));
        await userEvent.click(screen.getByRole('button', { name: '廣播劇' }));

        await userEvent.click(screen.getByRole('button', { name: /^芝See菇Bi Family/ }));

        expect(zoomInto).toHaveBeenCalledWith(
            zoomKey.drama('chisee'),
            expect.any(Function),
            'zoom-handle',
        );
        expect(location()).toHaveTextContent('/drama/chisee');
        expect(document.querySelector('[data-page-handle]')).not.toBeNull();

        await userEvent.click(
            screen.getAllByRole('button', { name: '返回主頁' })[0] as HTMLElement,
        );

        expect(unzoomHome).toHaveBeenCalledWith(zoomKey.drama('chisee'), expect.any(Function), {
            kind: 'unzoom-handle',
            fallback: 'back',
        });
        expect(location()).toHaveTextContent(/^\/$/);
        expect(document.querySelector('[data-home-handle]')).not.toBeNull();
        expect(document.querySelector('[data-home-card]')).toBeNull();
    });
});
