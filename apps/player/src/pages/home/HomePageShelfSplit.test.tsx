import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import { stubViewport, stubWideLandscape } from '../../../tests/landscape';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { openHomePlayerCard } from '../../hooks/homePlayerCardClosed';
import { restoreMiniPlayer } from '../../hooks/miniPlayerDismissed';
import { usePlayer } from '../../player/usePlayer';
import type { Track } from '../../types/track';
import { t } from '../../i18n/t';
import bannerWide from '../../assets/banner-wide.webp';
import { HomePage } from './HomePage';

/*
 * 新主頁（P10 lane 3，_mockups_/iphone-duo 打開・橫、_mockups_/home-view 主頁）：
 * 左欄頂固定闊版橫額 + 分類掣 + 疊卡 scroller，右欄播放卡；冇播放卡就橫額同分類掣拉到全闊、卡改兩欄。
 * Duo 打開・橫（876×612）同 HomeView（544×544）用同一套；現有闊橫版（1180×820）唔變
 */
const DUO_OPEN_LANDSCAPE = { width: 876, height: 612 };
const HOME_VIEW = { width: 544, height: 544 };
const BANNER_ALT = t('home.bannerAlt');
const SHOW_CARD = '正在播放（今日節目）';

const BADGIRL_TODAY = recording('badgirl', '2026-10-19', '1000');
const RECORDINGS = [recording('badgirl', '2026-10-16', '1000'), BADGIRL_TODAY];

const PlayThenGoHome = ({ target }: { target: Track }) => {
    const { load } = usePlayer();
    const navigate = useNavigate();
    return (
        <button
            type="button"
            onClick={async () => {
                await load(target, { autoplay: true });
                navigate('/');
            }}
        >
            play then home
        </button>
    );
};

const arriveHomeWith = async (target: Track) => {
    renderWithProviders(<HomePage />, {
        route: '/elsewhere',
        recordings: RECORDINGS,
        extraRoutes: [{ path: '/elsewhere', element: <PlayThenGoHome target={target} /> }],
    });
    await userEvent.click(screen.getByRole('button', { name: 'play then home' }));
    await screen.findByRole('main');
};

const shelf = () => screen.getByRole('navigation', { name: t('home.showsNav') });

const SHOW_NAMES = [
    'Bad Girl大過佬',
    '公子會',
    '雲妮鍾情',
    '在晴朗的一天出發',
    '西加航空',
    '口水多過浪花',
    '聖艾粒LaLaLaLa',
];

describe.each([
    ['Duo 打開・橫', DUO_OPEN_LANDSCAPE],
    ['HomeView', HOME_VIEW],
])('HomePage shelf split on %s', (_name, viewport) => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
        stubViewport(viewport);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        openHomePlayerCard();
        restoreMiniPlayer();
    });

    it('should pin the wide banner above the tabs, outside the card list', () => {
        renderWithProviders(<HomePage />);

        const banner = screen.getByRole('img', { name: BANNER_ALT });
        expect(banner).toHaveAttribute('src', bannerWide);
        expect(shelf()).not.toContainElement(banner);
        expect(screen.getByRole('main')).toHaveAttribute('data-shelf');
    });

    it('should list every show and today as cards in the shows tab', () => {
        renderWithProviders(<HomePage />);

        const names = within(shelf())
            .getAllByRole('button')
            .map((b) => b.getAttribute('aria-label'));
        expect(names).toEqual([...SHOW_NAMES, t('home.today')]);
    });

    it('should lay the cards in two columns when there is no player card', () => {
        renderWithProviders(<HomePage />);

        expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'fill');
        expect(shelf()).not.toHaveAttribute('data-stacked');
    });

    it('should stack the cards beside the player card while something plays', async () => {
        await arriveHomeWith(BADGIRL_TODAY);

        expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'split');
        expect(shelf()).toHaveAttribute('data-stacked');
        expect(screen.getByRole('region', { name: SHOW_CARD })).toBeInTheDocument();
    });

    it('should stack the drama shelf too', async () => {
        await arriveHomeWith(BADGIRL_TODAY);
        await userEvent.click(screen.getByRole('button', { name: t('home.tabDramas') }));

        expect(screen.getByRole('navigation', { name: t('home.dramasNav') })).toHaveAttribute(
            'data-stacked',
        );
    });

    it('should open a show page from its card', async () => {
        renderWithProviders(<HomePage />, {
            extraRoutes: [{ path: '/show/:id', element: <p>show page</p> }],
        });

        await userEvent.click(within(shelf()).getByRole('button', { name: 'Bad Girl大過佬' }));

        expect(await screen.findByText('show page')).toBeInTheDocument();
    });
});

describe('HomePage on an existing wide landscape screen', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should keep the banner-in-grid layout (no shelf)', () => {
        stubWideLandscape();
        renderWithProviders(<HomePage />);

        expect(screen.getByRole('main')).not.toHaveAttribute('data-shelf');
    });
});
