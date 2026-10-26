import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import packageJson from '../../package.json';
import { recording, renderWithProviders } from '../../tests/renderWithProviders';
import { HOME_THEME } from '../config/showThemes';
import { usePlayer } from '../player/usePlayer';
import { seriesEpisodesOf } from '../dramas';
import { saveProgress } from '../services/progressStore';
import type { Recording } from '../types/recording';
import type { Track } from '../types/track';
import { HomePage } from './HomePage';

const BANNER_ALT = '903 叱咤 Player：隨時隨地，音樂・節目・一click 即聽';

const RECORDINGS = [
    recording('gongzi', '2026-10-10'),
    recording('gongzi', '2026-10-17'),
    recording('badgirl', '2026-10-19', '1000'),
    recording('wanni', '2026-10-19', '1300'),
];

/** 模擬喺其他頁播緊某集，再返主頁 */
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

const arriveHomeWith = async (target: Track, recordings = RECORDINGS) => {
    const view = renderWithProviders(<HomePage />, {
        route: '/elsewhere',
        recordings,
        extraRoutes: [{ path: '/elsewhere', element: <PlayThenGoHome target={target} /> }],
    });
    await userEvent.click(screen.getByRole('button', { name: 'play then home' }));
    await screen.findByRole('navigation');
    return view;
};

describe('HomePage', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('lists seven artwork tiles plus today, in order', () => {
        renderWithProviders(<HomePage />);

        const nav = screen.getByRole('navigation');
        expect(
            [...nav.querySelectorAll('button')].map(
                (b) => b.getAttribute('aria-label') ?? b.textContent,
            ),
        ).toEqual([
            'Bad Girl大過佬',
            '公子會',
            '雲妮鍾情',
            '在晴朗的一天出發',
            '西加航空',
            '口水多過浪花',
            '聖艾粒LaLaLaLa',
            '今日節目',
        ]);
    });

    it('marks shows with an unwatched episode today as 新', () => {
        saveProgress(RECORDINGS[3]?.url ?? '', 990, 1000);
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });

        const nav = within(screen.getByRole('navigation'));
        expect(nav.getByRole('button', { name: 'Bad Girl大過佬，今日有新一集' })).toHaveTextContent(
            '新',
        );
        expect(nav.getByRole('button', { name: '雲妮鍾情' })).not.toHaveTextContent('新');
        expect(nav.getByRole('button', { name: '公子會' })).not.toHaveTextContent('新');
    });

    it('should render the banner image as the only page heading when rendered', () => {
        renderWithProviders(<HomePage />);

        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveAccessibleName(BANNER_ALT);
        const banner = screen.getByRole('img', { name: BANNER_ALT });
        expect(headings[0]).toContainElement(banner);
        // 橫額喺節目格之前（頁頂）
        const position = banner.compareDocumentPosition(screen.getByRole('navigation'));
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('should offer the wide banner to landscape screens taller than a phone', () => {
        renderWithProviders(<HomePage />);

        const source = screen.getByRole('img', { name: BANNER_ALT }).previousElementSibling;
        expect(source?.tagName).toBe('SOURCE');
        expect(source).toHaveAttribute(
            'media',
            '(orientation: landscape) and (min-width: 640px) and (min-height: 562px)',
        );
        expect(source?.getAttribute('srcset')).toMatch(/banner-wide/);
    });

    it('should put the banner in the tile grid, before the shows, on a phone held sideways', () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn((query: string) => ({
                matches: query.includes('max-height: 561px') || query.includes('landscape'),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        );
        renderWithProviders(<HomePage />);

        const nav = screen.getByRole('navigation');
        const banner = screen.getByRole('img', { name: BANNER_ALT });
        expect(nav).toContainElement(banner);
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        const firstShow = screen.getByRole('button', { name: 'Bad Girl大過佬' });
        expect(
            banner.compareDocumentPosition(firstShow) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it('should not show the old header text when rendered', () => {
        renderWithProviders(<HomePage />);

        expect(screen.queryByText(/903 player/i)).not.toBeInTheDocument();
        expect(screen.queryByText('收聽節目')).not.toBeInTheDocument();
    });

    it('should apply the home theme vars when rendered', () => {
        renderWithProviders(<HomePage />);

        const scope = screen.getByRole('main').closest('[data-theme-scope]') as HTMLElement;
        expect(scope).not.toBeNull();
        expect(scope.style.getPropertyValue('--theme-bg')).toBe(HOME_THEME.bg);
        expect(scope.style.getPropertyValue('--theme-title')).toBe(HOME_THEME.title);
    });

    it('pauses playback when home is shown without a today recording', () => {
        const { audio } = renderWithProviders(<HomePage />);

        expect(audio.pause).toHaveBeenCalled();
    });

    it('keeps playing when arriving home with a today recording playing', async () => {
        const { audio } = await arriveHomeWith(RECORDINGS[3] as Recording);

        expect(await screen.findByRole('button', { name: '暫停' })).toBeInTheDocument();
        expect(audio.pause).not.toHaveBeenCalled();
    });

    it('shows a mini player for today’s first show and plays it on demand', async () => {
        const { audio } = renderWithProviders(<HomePage />, { recordings: RECORDINGS });

        const mini = await screen.findByRole('region', { name: '正在播放（今日節目）' });
        expect(mini).toHaveTextContent('Bad Girl大過佬');
        expect(mini).toHaveTextContent('今日 19/10（一）');

        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        expect(audio.src).toBe(RECORDINGS[2]?.url);
        expect(audio.play).toHaveBeenCalled();
    });

    it('should paint the page canvas with the gradient bottom, even with a floating mini player', async () => {
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await screen.findByRole('region', { name: '正在播放（今日節目）' });

        expect(document.documentElement.style.getPropertyValue('--page-canvas')).toBe(
            'var(--home-bg-bottom)',
        );
    });

    it('swipes the mini player to the next show of today', async () => {
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        const mini = await screen.findByRole('region', { name: '正在播放（今日節目）' });

        fireEvent.pointerDown(mini, { clientX: 300, clientY: 10 });
        fireEvent.pointerUp(mini, { clientX: 150, clientY: 10 });

        expect(mini).toHaveTextContent('雲妮鍾情');
    });

    it('opens the show page from the mini player', async () => {
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });

        await userEvent.click(
            await screen.findByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' }),
        );

        expect(screen.getByTestId('location')).toHaveTextContent('/show/badgirl');
    });

    it('starts the latest episode and opens the show page', async () => {
        const { audio } = renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await waitFor(() =>
            expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'false'),
        );

        await userEvent.click(screen.getByRole('button', { name: '公子會' }));

        expect(audio.src).toBe(RECORDINGS[1]?.url);
        expect(audio.play).toHaveBeenCalled();
        expect(screen.getByTestId('location')).toHaveTextContent('/show/gongzi');
    });

    it('starts the first show of today and opens the today page', async () => {
        const { audio } = renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await waitFor(() =>
            expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'false'),
        );

        await userEvent.click(screen.getByRole('button', { name: '今日節目' }));

        expect(audio.src).toBe(RECORDINGS[2]?.url);
        expect(screen.getByTestId('location')).toHaveTextContent('/today');
    });

    it('should show the app version on the banner, outside its heading, when rendered', async () => {
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });

        const version = await screen.findByText(`v${packageJson.version}`);
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveAccessibleName(BANNER_ALT);
        expect(heading).not.toContainElement(version);
        const position = screen.getByRole('navigation').compareDocumentPosition(version);
        expect(position & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });

    it('still navigates when recordings are not loaded yet', async () => {
        const { audio } = renderWithProviders(<HomePage />, {
            prober: () => new Promise(() => {}),
        });

        await userEvent.click(screen.getByRole('button', { name: '公子會' }));

        expect(audio.play).not.toHaveBeenCalled();
        expect(screen.getByTestId('location')).toHaveTextContent('/show/gongzi');
    });

    describe('廣播劇 tab', () => {
        const openDramas = async () => {
            await userEvent.click(screen.getByRole('button', { name: '廣播劇' }));
            return screen.getByRole('navigation', { name: '廣播劇' });
        };

        it('starts on the 節目 tab', () => {
            renderWithProviders(<HomePage />);

            const tabs = screen.getByRole('group', { name: '分類' });
            expect(within(tabs).getByRole('button', { name: '節目' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
            expect(screen.getByRole('navigation', { name: '節目' })).toBeInTheDocument();
            expect(screen.queryByRole('navigation', { name: '廣播劇' })).not.toBeInTheDocument();
        });

        it('lists the enabled dramas instead of the shows, leaving out 18 樓 C 座 for now', async () => {
            vi.setSystemTime(new Date('2026-10-23T08:00:00Z')); // 18 樓 C 座今日有新集都唔出
            renderWithProviders(<HomePage />);

            const nav = await openDramas();

            expect(
                within(nav)
                    .getAllByRole('button')
                    .map((b) => b.getAttribute('aria-label')),
            ).toEqual(['芝See菇Bi Family', '黃金少年', '森美小儀系列', '少爺占系列']);
            expect(screen.queryByRole('navigation', { name: '節目' })).not.toBeInTheDocument();
        });

        it('shows the 短篇 count bottom-right until something has been played', async () => {
            renderWithProviders(<HomePage />);
            const nav = await openDramas();

            expect(within(nav).getByText('12 個短篇').dataset.corner).toBe('bottom');
            expect(within(nav).queryByText('繼續收聽')).not.toBeInTheDocument();
        });

        it('counts 黃金少年 in seasons, 全 4 季', async () => {
            renderWithProviders(<HomePage />);
            const nav = await openDramas();

            const tile = within(nav).getByRole('button', { name: /^黃金少年/ });
            expect(within(tile).getByText('全 4 季')).toBeInTheDocument();
        });

        it('offers 繼續收聽 with the episode to continue and how far it got', async () => {
            const friends = seriesEpisodesOf('chisee').filter((e) => e.arc === '好朋友手牽手');
            saveProgress(friends[1]?.url ?? '', 250, 1000);
            renderWithProviders(<HomePage />);
            const nav = await openDramas();

            const tile = within(nav).getByRole('button', {
                name: '芝See菇Bi Family，繼續收聽 好朋友手牽手 · 第 2 集 朋友不同',
            });
            expect(within(tile).getByText('繼續收聽')).toBeInTheDocument();
            expect(within(tile).getByText('12 個短篇')).toBeInTheDocument();
            expect(tile.querySelector('[data-continue-fill]')).toHaveStyle({ width: '25%' });
        });

        it('leaves the tile plain while the drama plays, as the mini player already shows it', async () => {
            const friends = seriesEpisodesOf('chisee').filter((e) => e.arc === '好朋友手牽手');
            saveProgress(friends[1]?.url ?? '', 250, 1000);
            await arriveHomeWith(friends[1]!);
            await userEvent.click(screen.getByRole('button', { name: '廣播劇' }));

            const nav = screen.getByRole('navigation', { name: '廣播劇' });
            expect(
                within(nav).getByRole('button', { name: '芝See菇Bi Family' }),
            ).toBeInTheDocument();
            expect(within(nav).queryByText('繼續收聽')).not.toBeInTheDocument();
            expect(within(nav).getByText('12 個短篇').dataset.corner).toBe('bottom');
        });

        it('only opens the page of a series drama never listened to, without playing it', async () => {
            const { audio } = renderWithProviders(<HomePage />);
            const nav = await openDramas();

            await userEvent.click(within(nav).getByRole('button', { name: '芝See菇Bi Family' }));

            expect(audio.src).toBe('');
            expect(audio.play).not.toHaveBeenCalled();
            expect(screen.getByTestId('location')).toHaveTextContent('/drama/chisee');
        });

        it('keeps playing whatever plays when opening a series drama for the first time', async () => {
            const { audio } = await arriveHomeWith(RECORDINGS[3] as Recording);
            const plays = audio.play.mock.calls.length;
            const nav = await openDramas();

            await userEvent.click(within(nav).getByRole('button', { name: '黃金少年' }));

            expect(audio.src).toBe(RECORDINGS[3]?.url);
            expect(audio.play).toHaveBeenCalledTimes(plays);
            expect(screen.getByTestId('location')).toHaveTextContent('/drama/golden');
        });

        it('resumes a series drama listened to before and opens its page when its tile is tapped', async () => {
            const friends = seriesEpisodesOf('chisee').filter((e) => e.arc === '好朋友手牽手');
            saveProgress(friends[1]?.url ?? '', 250, 1000);
            const { audio } = renderWithProviders(<HomePage />);
            const nav = await openDramas();

            await userEvent.click(within(nav).getByRole('button', { name: /^芝See菇Bi Family/ }));

            expect(audio.src).toBe(friends[1]?.url);
            expect(audio.play).toHaveBeenCalled();
            expect(screen.getByTestId('location')).toHaveTextContent('/drama/chisee');
        });

        it('keeps a drama playing at home and opens its page from the mini player', async () => {
            const episode = seriesEpisodesOf('chisee')[0];
            if (!episode) throw new Error('missing fixture');
            const { audio } = await arriveHomeWith(episode);

            await userEvent.click(
                screen.getByRole('button', { name: '開啟 芝See菇Bi Family 廣播劇頁' }),
            );

            expect(audio.pause).not.toHaveBeenCalled();
            expect(screen.getByTestId('location')).toHaveTextContent('/drama/chisee');
        });

        it('remembers the chosen tab next time home opens', async () => {
            const { unmount } = renderWithProviders(<HomePage />);
            await openDramas();
            unmount();

            renderWithProviders(<HomePage />);

            expect(screen.getByRole('navigation', { name: '廣播劇' })).toBeInTheDocument();
        });
    });
});
