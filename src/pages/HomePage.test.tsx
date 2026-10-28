import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import packageJson from '../../package.json';
import { recording, renderWithProviders } from '../../tests/renderWithProviders';
import { HOME_THEME } from '../config/showThemes';
import { usePlayer } from '../player/usePlayer';
import { seriesEpisodesOf } from '../dramas';
import { findShow } from '../shows';
import { saveProgress } from '../services/progressStore';
import type { Recording } from '../types/recording';
import type { Track } from '../types/track';
import { HomePage } from './HomePage';
import { ShowPage } from './ShowPage';

const BANNER_ALT = '903 叱咤 Player：隨時隨地，音樂・節目・一click 即聽';

const RECORDINGS = [
    recording('gongzi', '2026-10-10'),
    recording('gongzi', '2026-10-17'),
    recording('badgirl', '2026-10-19', '1000'),
    recording('wanni', '2026-10-19', '1300'),
];

/** 模擬喺其他頁播緊某集，再返主頁 */
const PlayThenGoHome = ({ target, autoplay }: { target: Track; autoplay: boolean }) => {
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

/** autoplay false：淨係載入（例如喺全集揀咗一行），未播所以未有進度 */
const arriveHomeWith = async (target: Track, recordings = RECORDINGS, autoplay = true) => {
    const view = renderWithProviders(<HomePage />, {
        route: '/elsewhere',
        recordings,
        extraRoutes: [
            {
                path: '/elsewhere',
                element: <PlayThenGoHome target={target} autoplay={autoplay} />,
            },
        ],
    });
    await userEvent.click(screen.getByRole('button', { name: 'play then home' }));
    await screen.findByRole('navigation');
    return view;
};

/** 手機打橫（SHORT_LANDSCAPE_QUERY 同 LANDSCAPE_QUERY 都符合） */
const stubPhoneSideways = () => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: query.includes('max-height: 561px') || query.includes('landscape'),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
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

    it('shows each show by its 16:9 tile, not its disc', () => {
        renderWithProviders(<HomePage />);

        const tile = within(screen.getByRole('navigation')).getByRole('button', { name: '公子會' });
        expect(tile.querySelector('img')?.getAttribute('src')).toBe(findShow('gongzi')?.tileArt);
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
        stubPhoneSideways();
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

    it('should keep the version on the in-grid banner and lay out every show plus 今日節目', () => {
        stubPhoneSideways();
        renderWithProviders(<HomePage />);

        const nav = screen.getByRole('navigation', { name: '節目' });
        // 7 個節目 + 今日節目，全部喺共用嘅手機打橫格入面（一屏放晒）
        expect(within(nav).getAllByRole('button')).toHaveLength(8);
        expect(nav).toHaveAttribute('data-scroll', 'false');
        expect(within(nav).getByText(`v${packageJson.version}`)).toBeInTheDocument();
    });

    it('should put the banner and every drama in the shared grid on a phone held sideways', async () => {
        stubPhoneSideways();
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z'));
        renderWithProviders(<HomePage />);

        await userEvent.click(screen.getByRole('button', { name: '廣播劇' }));

        const nav = screen.getByRole('navigation', { name: '廣播劇' });
        expect(nav).toContainElement(screen.getByRole('img', { name: BANNER_ALT }));
        expect(within(nav).getAllByRole('button')).toHaveLength(5);
        expect(within(nav).getByText(`v${packageJson.version}`)).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
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
        // 副題淨係日子；「今日」改為節目名旁邊嘅標籤
        expect(mini).toHaveTextContent('19/10（一）');
        expect(mini.querySelector('[data-tag]')).toHaveTextContent('今日');

        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        expect(audio.src).toBe(RECORDINGS[2]?.url);
        expect(audio.play).toHaveBeenCalled();
    });

    it('should flag the page while the mini player shows, so the home only reserves its room then (any orientation)', async () => {
        const { unmount } = renderWithProviders(<HomePage />);
        expect(screen.getByRole('main')).not.toHaveAttribute('data-mini-player');
        unmount();

        renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await screen.findByRole('region', { name: '正在播放（今日節目）' });
        expect(screen.getByRole('main')).toHaveAttribute('data-mini-player', 'multi');
    });

    it('should tell the page a single-audio mini player shows, so it reserves the shorter room', async () => {
        const episode = seriesEpisodesOf('chisee')[0]!;
        await arriveHomeWith(episode);

        await screen.findByRole('region', { name: '正在播放（廣播劇）' });
        expect(screen.getByRole('main')).toHaveAttribute('data-mini-player', 'single');
    });

    it('should paint the page canvas with the gradient bottom, even with a floating mini player', async () => {
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await screen.findByRole('region', { name: '正在播放（今日節目）' });

        expect(document.documentElement.style.getPropertyValue('--page-canvas')).toBe(
            'var(--home-bg-bottom)',
        );
    });

    it('keeps an older episode played on the show page going at home, first in the mini player as 重溫', async () => {
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
        const old = recording('badgirl', '2026-10-12', '1000');
        const { audio } = renderWithProviders(<ShowPage />, {
            route: '/show/badgirl',
            path: '/show/:showId',
            recordings: [old, ...RECORDINGS],
            extraRoutes: [{ path: '/', element: <HomePage /> }],
        });
        await userEvent.click(await screen.findByRole('button', { name: /^(?:播放|暫停) 12\/10/ }));
        expect(audio.src).toBe(old.url);

        await userEvent.click(screen.getByRole('button', { name: '返回主頁' }));

        const mini = await screen.findByRole('region', { name: '正在播放（重溫及今日節目）' });
        expect(audio.src).toBe(old.url);
        expect(audio.pause).not.toHaveBeenCalled();
        expect(within(mini).getByRole('button', { name: '暫停' })).toBeInTheDocument();
        expect(mini.querySelector('[data-tag]')).toHaveTextContent('重溫');
        expect(mini).toHaveTextContent('12/10（一）');
        expect(
            within(mini).getByRole('button', { name: 'Bad Girl大過佬，重溫 12/10（一）' }),
        ).toHaveAttribute('aria-current', 'true');
    });

    // 節目頁自己自動播嘅舊集都照播，同今日節目一齊顯示
    it('keeps an older episode the show page played by itself going at home, as 重溫 next to today', async () => {
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
        const { audio } = renderWithProviders(<ShowPage />, {
            route: '/show/gongzi',
            path: '/show/:showId',
            recordings: RECORDINGS,
            extraRoutes: [{ path: '/', element: <HomePage /> }],
        });
        await waitFor(() => expect(audio.src).toBe(RECORDINGS[1]?.url));

        await userEvent.click(screen.getByRole('button', { name: '返回主頁' }));

        const mini = await screen.findByRole('region', { name: '正在播放（重溫及今日節目）' });
        expect(audio.src).toBe(RECORDINGS[1]?.url);
        expect(audio.pause).not.toHaveBeenCalled();
        expect(mini.querySelector('[data-tag]')).toHaveTextContent('重溫');
        expect(mini).toHaveTextContent('17/10（六）');
    });

    // S-507：重溫同今日係同一個節目，由「今日」嗰項撳入節目頁，節目頁要跟返今日
    it('opens the show page on today’s episode when opened from today, next to a 重溫 of the same show', async () => {
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
        const old = recording('badgirl', '2026-10-12', '1000');
        const today = RECORDINGS[2] as Recording;
        const { audio } = renderWithProviders(<ShowPage />, {
            route: '/show/badgirl',
            path: '/show/:showId',
            recordings: [old, ...RECORDINGS],
            extraRoutes: [{ path: '/', element: <HomePage /> }],
        });
        await userEvent.click(await screen.findByRole('button', { name: /^(?:播放|暫停) 12\/10/ }));
        await userEvent.click(screen.getByRole('button', { name: '返回主頁' }));
        const mini = await screen.findByRole('region', { name: '正在播放（重溫及今日節目）' });

        await userEvent.click(within(mini).getByRole('button', { name: 'Bad Girl大過佬' }));
        await userEvent.click(
            within(mini).getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' }),
        );

        expect(screen.getByTestId('location')).toHaveTextContent('/show/badgirl');
        await waitFor(() => expect(audio.src).toBe(today.url));
        expect(
            screen.getByRole('button', { name: /^(?:播放|暫停) 19\/10/, current: true }),
        ).toBeInTheDocument();

        // 帶入嚟嘅 state 用完就清：之後自己揀返舊集，唔會再被拉返今日（S-532）
        await userEvent.click(screen.getByRole('button', { name: /^(?:播放|暫停) 12\/10/ }));
        await act(async () => {});
        expect(audio.src).toBe(old.url);
    });

    it('keeps the 重溫 episode when opened from the 重溫 item', async () => {
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
        const old = recording('badgirl', '2026-10-12', '1000');
        const { audio } = renderWithProviders(<ShowPage />, {
            route: '/show/badgirl',
            path: '/show/:showId',
            recordings: [old, ...RECORDINGS],
            extraRoutes: [{ path: '/', element: <HomePage /> }],
        });
        await userEvent.click(await screen.findByRole('button', { name: /^(?:播放|暫停) 12\/10/ }));
        await userEvent.click(screen.getByRole('button', { name: '返回主頁' }));
        const mini = await screen.findByRole('region', { name: '正在播放（重溫及今日節目）' });

        await userEvent.click(
            within(mini).getByRole('button', {
                name: '開啟 Bad Girl大過佬 節目頁，重溫 12/10（一）',
            }),
        );

        expect(screen.getByTestId('location')).toHaveTextContent('/show/badgirl');
        expect(audio.src).toBe(old.url);
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
        /** 直版疊卡：撳暗咗嘅卡先捲佢做 focus（jsdom 冇 element.scrollTo），再撳先入劇集頁 */
        const tapTwice = async (tile: HTMLElement) => {
            (tile.parentElement as HTMLElement).scrollTo = vi.fn();
            await userEvent.click(tile);
            await userEvent.click(tile);
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
            ).toEqual([
                '蘭茜夫人劇場',
                '少爺占系列',
                '森美小儀系列',
                // S-482：芝See 冇頂層 addedAt，用最新短篇（10-25），排喺黃金少年（10-24）前面
                '芝See菇Bi Family',
                '黃金少年',
            ]);
            expect(screen.queryByRole('navigation', { name: '節目' })).not.toBeInTheDocument();
        });

        it('puts the dramas being listened to first, finished ones last', async () => {
            seriesEpisodesOf('jim').forEach((e) => saveProgress(e.url, 990, 1000));
            vi.setSystemTime(new Date('2026-10-23T08:05:00Z'));
            saveProgress(seriesEpisodesOf('golden')[0]?.url ?? '', 250, 1000);
            vi.setSystemTime(new Date('2026-10-23T08:10:00Z')); // 最近聽緊嘅係森美小儀
            saveProgress(seriesEpisodesOf('sammy-kitty')[0]?.url ?? '', 250, 1000);
            renderWithProviders(<HomePage />);

            const nav = await openDramas();

            expect(
                within(nav)
                    .getAllByRole('button')
                    .map((b) => b.getAttribute('aria-label')?.split('，')[0]),
            ).toEqual([
                '森美小儀系列',
                '黃金少年',
                '蘭茜夫人劇場',
                '芝See菇Bi Family',
                '少爺占系列',
            ]);
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

            await tapTwice(within(nav).getByRole('button', { name: '芝See菇Bi Family' }));

            expect(audio.src).toBe('');
            expect(audio.play).not.toHaveBeenCalled();
            expect(screen.getByTestId('location')).toHaveTextContent('/drama/chisee');
        });

        it('keeps playing whatever plays when opening a series drama for the first time', async () => {
            const { audio } = await arriveHomeWith(RECORDINGS[3] as Recording);
            const plays = audio.play.mock.calls.length;
            const nav = await openDramas();

            await tapTwice(within(nav).getByRole('button', { name: '黃金少年' }));

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

        it('plays the episode already loaded from 全集 when its tile is tapped, though it has no progress yet', async () => {
            const youth = seriesEpisodesOf('chisee').find((e) => e.arc === '青春期');
            if (!youth) throw new Error('missing fixture');
            const { audio } = await arriveHomeWith(youth, RECORDINGS, false);
            const nav = await openDramas();

            await tapTwice(within(nav).getByRole('button', { name: '芝See菇Bi Family' }));

            expect(audio.src).toBe(youth.url);
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
