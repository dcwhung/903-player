import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation, useNavigate } from 'react-router-dom';
import { stubViewport } from '../../../tests/landscape';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { closeHomePlayerCard, openHomePlayerCard } from '../../hooks/homePlayerCardClosed';
import { dismissMiniPlayer, restoreMiniPlayer } from '../../hooks/miniPlayerDismissed';
import { themeFor } from '../../catalog/shows';
import { useAudioBusy } from '../../hooks/useAudioBusy';
import { t } from '../../i18n/t';
import { usePlayer } from '../../player/usePlayer';
import type { Track } from '../../types/track';
import { HomePage } from './HomePage';

/*
 * HomeView（SQUARE_QUERY）主頁永遠唔出左右兩欄（P10 v2.0.2 用戶反饋）：有 mini player 嘅嘢（或者 ✕ 閂咗嘅卡）
 * 就全闊格 + 右邊把手，冇就原本 fill；撳把手直接入嗰個節目 / 劇集嘅播放頁（同卡角 ↗ / mini player 一樣），
 * 唔再出返張卡。Duo 打開・橫唔變：照舊出張卡，閂咗卡撳把手出返張卡
 */
const DUO_OPEN_LANDSCAPE = { width: 876, height: 612 };
const HOME_VIEW = { width: 544, height: 544 };
const SHOW_CARD = '正在播放（今日節目）';
const BADGIRL = 'Bad Girl大過佬';
const HANDLE = /打開播放器$/;

const BADGIRL_TODAY = recording('badgirl', '2026-10-19', '1000');
const RECORDINGS = [recording('badgirl', '2026-10-16', '1000'), BADGIRL_TODAY];

/**
 * 入咗邊頁（pathname + history state 嘅 url）；busy = 節目 / 劇集頁會唔會因為有嘢佔住而唔自動播（useAudioBusy）
 */
const Landed = () => {
    const { pathname, state } = useLocation();
    const url = (state as { url?: string } | null)?.url ?? '';
    const busy = useAudioBusy();
    return (
        <p data-testid="landed" data-busy={busy}>
            {`${pathname} ${url}`.trim()}
        </p>
    );
};

/** 內頁：載入（預設播埋）之後返主頁 */
const PlayThenGoHome = ({ target, autoplay = true }: { target: Track; autoplay?: boolean }) => {
    const { load } = usePlayer();
    const navigate = useNavigate();
    return (
        <button
            type="button"
            onClick={async () => {
                await load(target, { autoplay });
                navigate('/');
            }}
        >
            play then home
        </button>
    );
};

const PAGE_ROUTES = [
    { path: '/show/:showId', element: <Landed /> },
    { path: '/drama/:dramaId', element: <Landed /> },
];

/** 第一次開 app：冇載入任何嘢，今日節目做 mini player（續聽） */
const firstLoad = () => {
    renderWithProviders(<HomePage />, { recordings: RECORDINGS, extraRoutes: PAGE_ROUTES });
};

const returnHome = async (autoplay = true) => {
    const { audio } = renderWithProviders(<HomePage />, {
        route: '/elsewhere',
        recordings: RECORDINGS,
        extraRoutes: [
            {
                path: '/elsewhere',
                element: <PlayThenGoHome target={BADGIRL_TODAY} autoplay={autoplay} />,
            },
            ...PAGE_ROUTES,
        ],
    });
    await userEvent.click(screen.getByRole('button', { name: 'play then home' }));
    await screen.findByRole('main');
    return audio;
};

const layout = () => screen.getByRole('main').getAttribute('data-layout');

const setUp = (viewport: { width: number; height: number }) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
    stubViewport(viewport);
};

const tearDown = () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    openHomePlayerCard();
    restoreMiniPlayer();
};

describe('HomePage on HomeView never splits off a player card', () => {
    beforeEach(() => setUp(HOME_VIEW));
    afterEach(tearDown);

    it('should show the full-width grid with a paused handle on first launch', async () => {
        firstLoad();

        expect(await screen.findByRole('button', { name: HANDLE })).toHaveAccessibleName(
            t('homeCard.reopen', { name: BADGIRL }),
        );
        expect(layout()).toBe('fillWithHandle');
        expect(screen.queryByRole('region', { name: SHOW_CARD })).not.toBeInTheDocument();
    });

    it('should keep the grid and handle when coming back from an inner page while playing', async () => {
        await returnHome();

        expect(layout()).toBe('fillWithHandle');
        expect(screen.queryByRole('region', { name: SHOW_CARD })).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: t('homeCard.reopenPlaying', { name: BADGIRL }) }),
        ).toBeInTheDocument();
    });

    it('should keep the banner inside the grid, with no stacked shelf, while playing', async () => {
        await returnHome();

        const shows = screen.getByRole('navigation', { name: t('home.showsNav') });
        expect(shows).not.toHaveAttribute('data-stacked');
        expect(shows).toContainElement(screen.getByRole('img', { name: t('home.bannerAlt') }));
    });

    // S-1150 改：喺主頁開始播（鎖屏 / 耳機掣、最近收聽續播）都唔再出張卡，把手轉「播放中」
    it('should stay on the grid when playback starts on home', async () => {
        const audio = await returnHome(false);
        expect(layout()).toBe('fillWithHandle');

        await act(() => audio.play());

        expect(layout()).toBe('fillWithHandle');
        expect(screen.queryByRole('region', { name: SHOW_CARD })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: HANDLE })).toHaveAccessibleName(
            t('homeCard.reopenPlaying', { name: BADGIRL }),
        );
    });

    it('should open the show page of the handle’s item, like the mini player', async () => {
        firstLoad();

        await userEvent.click(await screen.findByRole('button', { name: HANDLE }));

        expect(await screen.findByTestId('landed')).toHaveTextContent(
            `/show/badgirl ${BADGIRL_TODAY.url}`,
        );
    });

    it('should open the page while playing without stopping playback', async () => {
        const audio = await returnHome();

        await userEvent.click(screen.getByRole('button', { name: HANDLE }));

        expect(await screen.findByTestId('landed')).toHaveTextContent('/show/badgirl');
        expect(audio.paused).toBe(false);
    });

    // ✕ 閂咗（停咗播，HomeView 本身冇卡，例如由闊版縮落方形）：放返 mini player（同闊版把手一樣）再入嗰頁；
    // 入頁時 player 仍然載入住嗰集（busy），節目 / 劇集頁唔會自動播，停喺暫停
    it('should open the page of a card closed with ✕, paused and without autoplay', async () => {
        const audio = await returnHome();
        act(() => {
            audio.pause();
            dismissMiniPlayer();
            closeHomePlayerCard({
                theme: themeFor('badgirl'),
                showName: BADGIRL,
                item: { kind: 'show', id: 'badgirl', date: BADGIRL_TODAY.date },
            });
        });

        await userEvent.click(screen.getByRole('button', { name: HANDLE }));

        const landed = await screen.findByTestId('landed');
        expect(landed).toHaveTextContent(/^\/show\/badgirl$/);
        expect(landed).toHaveAttribute('data-busy', 'true');
        expect(audio.paused).toBe(true);
    });

    // 舊資料：閂咗但唔知係邊個，冇頁可以入，跟闊版做法放返 mini player（HomeView 照舊淨係把手）
    it('should fall back to restoring the mini player for a closed card with no item', async () => {
        firstLoad();
        dismissMiniPlayer();
        act(() => closeHomePlayerCard({ theme: themeFor('badgirl'), showName: BADGIRL }));

        await userEvent.click(await screen.findByRole('button', { name: HANDLE }));

        expect(layout()).toBe('fillWithHandle');
        expect(screen.queryByTestId('landed')).not.toBeInTheDocument();
    });

    // 撳把手由把手個框 zoom 入頁（utils/cardZoom 揾 data-zoom-key）
    it('should mark the handle as the zoom source key', async () => {
        firstLoad();

        expect(await screen.findByRole('button', { name: HANDLE })).toHaveAttribute(
            'data-zoom-key',
            'home-handle',
        );
    });

    it('should not offer the handle when nothing is on the mini player', () => {
        vi.setSystemTime(new Date('2026-10-25T08:00:00Z')); // 冇今日節目
        firstLoad();

        expect(layout()).toBe('fill');
        expect(screen.queryByRole('button', { name: HANDLE })).not.toBeInTheDocument();
    });
});

describe('HomePage on Duo open landscape keeps the player card', () => {
    beforeEach(() => setUp(DUO_OPEN_LANDSCAPE));
    afterEach(tearDown);

    it('should show the player card on first launch', async () => {
        firstLoad();

        expect(await screen.findByRole('region', { name: SHOW_CARD })).toBeInTheDocument();
        expect(layout()).toBe('split');
    });

    it('should still show the player card coming back from an inner page', async () => {
        await returnHome();

        expect(layout()).toBe('split');
        expect(screen.getByRole('region', { name: SHOW_CARD })).toBeInTheDocument();
    });

    it('should bring the card back from the handle after ✕, staying on home', async () => {
        await returnHome();
        await userEvent.click(screen.getByRole('button', { name: '關閉播放器' }));
        expect(layout()).toBe('fillWithHandle');

        await userEvent.click(screen.getByRole('button', { name: HANDLE }));

        expect(layout()).toBe('split');
        expect(screen.getByRole('region', { name: SHOW_CARD })).toBeInTheDocument();
        expect(screen.queryByTestId('landed')).not.toBeInTheDocument();
    });

    it('should not make the handle a zoom source', async () => {
        await returnHome();
        await userEvent.click(screen.getByRole('button', { name: '關閉播放器' }));

        expect(screen.getByRole('button', { name: HANDLE })).not.toHaveAttribute('data-zoom-key');
    });
});
