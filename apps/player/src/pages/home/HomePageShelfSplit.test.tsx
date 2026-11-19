import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import { stubViewport, stubWideLandscape } from '../../../tests/landscape';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { openHomePlayerCard } from '../../hooks/homePlayerCardClosed';
import { addBookmark } from '../../services/bookmarkStore';
import { restoreMiniPlayer } from '../../hooks/miniPlayerDismissed';
import { usePlayer } from '../../player/usePlayer';
import type { Track } from '../../types/track';
import { t } from '../../i18n/t';
import bannerWide from '../../assets/banner-wide.webp';
import { HomePage } from './HomePage';

/*
 * 新主頁（P10 lane 3，_mockups_/iphone-duo 打開・橫、_mockups_/home-view 主頁）：
 * 有播放卡（一欄）：左欄頂固定闊版橫額 + 分類掣 + 疊卡 scroller，右欄播放卡；
 * 冇播放卡 / 閂咗卡（兩欄或以上）：用返原本闊橫版填滿格（用戶 2026-11-18）。
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

// 有播放卡先分兩欄：得 Duo 打開・橫；HomeView 主頁永遠唔出卡（P10 v2.0.2，見 HomePageSquareHandle.test.tsx）
describe('HomePage shelf split on Duo 打開・橫', () => {
    beforeEach(() => setUp(DUO_OPEN_LANDSCAPE));
    afterEach(tearDown);

    it('should pin the wide banner above the tabs, outside the card list', async () => {
        await arriveHomeWith(BADGIRL_TODAY);

        const banner = screen.getByRole('img', { name: BANNER_ALT });
        expect(banner).toHaveAttribute('src', bannerWide);
        expect(shelf()).not.toContainElement(banner);
        expect(screen.getByRole('main')).toHaveAttribute('data-shelf');
    });

    it('should list every show and today as cards in the shows tab', async () => {
        await arriveHomeWith(BADGIRL_TODAY);

        const names = within(shelf())
            .getAllByRole('button')
            .map((b) => b.getAttribute('aria-label'));
        // 讀屏名同節目格一樣（今日有新一集就講埋，home.showNew）
        expect(names).toEqual([
            t('home.showNew', { name: SHOW_NAMES[0] ?? '' }),
            ...SHOW_NAMES.slice(1),
            t('home.today'),
        ]);
    });

    it('should not draw an empty corner pill on the today card', async () => {
        await arriveHomeWith(BADGIRL_TODAY);

        const today = within(shelf()).getByRole('button', { name: t('home.today') });
        expect(today.closest('[data-zoom-key]')?.querySelector('[data-corner]')).toBeNull();
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
});

describe.each([
    ['Duo 打開・橫', DUO_OPEN_LANDSCAPE],
    ['HomeView', HOME_VIEW],
])('HomePage fill grid on %s', (_name, viewport) => {
    beforeEach(() => setUp(viewport));
    afterEach(tearDown);

    it('should use the original fill grid, banner first, when there is no player card', () => {
        renderWithProviders(<HomePage />);

        expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'fill');
        expect(shelf()).not.toHaveAttribute('data-stacked');
        expect(shelf()).toContainElement(screen.getByRole('img', { name: BANNER_ALT }));
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

// 有嘢播時收藏 tab：Duo 打開・橫左欄夠闊，照用闊版；HomeView 主頁冇卡（P10 v2.0.2），收藏 tab 全闊亦用闊版
describe.each([
    ['Duo 打開・橫', DUO_OPEN_LANDSCAPE],
    ['HomeView', HOME_VIEW],
])('HomePage saved tab while something plays on %s', (_name, viewport) => {
    beforeEach(() => setUp(viewport));
    afterEach(tearDown);

    it('should lay the saved tab out as wide', async () => {
        addBookmark(BADGIRL_TODAY);
        await arriveHomeWith(BADGIRL_TODAY);
        await userEvent.click(screen.getByRole('button', { name: t('home.tabSaved') }));

        expect(document.querySelector('[data-saved-mode]')).toHaveAttribute('data-layout', 'wide');
    });
});
