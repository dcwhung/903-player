import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import packageJson from '../../package.json';
import { PowerIcon } from '../components/icons/icons';
import { recording, renderWithProviders } from '../../tests/renderWithProviders';
import { dailyEpisodesOf, seriesEpisodesOf } from '../dramas';
import { openHomePlayerCard } from '../hooks/homePlayerCardClosed';
import { restoreMiniPlayer } from '../hooks/miniPlayerDismissed';
import { usePlayer } from '../player/usePlayer';
import { dailyNewestFirst, episodesInArc } from '../selectors/dramas';
import type { Track } from '../types/track';
import { HomePage } from './HomePage';

const BANNER_ALT = '903 叱咤 Player：隨時隨地，音樂・節目・一click 即聽';
const SHOW_CARD = '正在播放（今日節目）';
const DRAMA_CARD = '正在播放（廣播劇）';
/** 卡角 ✕：同 mini player 左滑關閉一樣（停播） */
const CLOSE = '關閉播放器';

const BADGIRL_TODAY = recording('badgirl', '2026-10-19', '1000');
const WANNI_TODAY = recording('wanni', '2026-10-19', '1300');
const RECORDINGS = [
    recording('badgirl', '2026-10-15', '1000'),
    recording('badgirl', '2026-10-16', '1000'),
    BADGIRL_TODAY,
    WANNI_TODAY,
];

/**
 * 闊橫版（WIDE_BANNER_QUERY：打橫、≥ 640 闊、≥ 562 高）。
 * 手機打橫（max-height: 561px）同減少動畫唔符合
 */
const stubWideLandscape = () => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: query.includes('landscape') && !query.includes('max-height'),
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
};

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

const arriveHomeWith = async (target: Track) => {
    const view = renderWithProviders(<HomePage />, {
        route: '/elsewhere',
        recordings: RECORDINGS,
        extraRoutes: [{ path: '/elsewhere', element: <PlayThenGoHome target={target} /> }],
    });
    await userEvent.click(screen.getByRole('button', { name: 'play then home' }));
    await screen.findByRole('main');
    return view;
};

describe('HomePage on a wide landscape screen', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        openHomePlayerCard();
        restoreMiniPlayer();
    });

    describe('without a mini player', () => {
        it('should put the banner first in a grid filling the page, with the version on it', () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />);

            const nav = screen.getByRole('navigation', { name: '節目' });
            expect(nav).toContainElement(screen.getByRole('img', { name: BANNER_ALT }));
            expect(within(nav).getByText(`v${packageJson.version}`)).toBeInTheDocument();
            expect(within(nav).getAllByRole('button')).toHaveLength(8);
            expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
            expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'fill');
            expect(screen.queryByRole('region', { name: SHOW_CARD })).not.toBeInTheDocument();
        });

        it('should fill the grid with the dramas on the 廣播劇 tab', async () => {
            stubWideLandscape();
            vi.setSystemTime(new Date('2026-10-23T08:00:00Z'));
            renderWithProviders(<HomePage />);

            await userEvent.click(screen.getByRole('button', { name: '廣播劇' }));

            const nav = screen.getByRole('navigation', { name: '廣播劇' });
            expect(nav).toContainElement(screen.getByRole('img', { name: BANNER_ALT }));
            expect(within(nav).getAllByRole('button')).toHaveLength(5);
        });
    });

    describe('with a mini player', () => {
        it('should split the page: grid on the left, player card on the right, no bottom mini player', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });

            const card = await screen.findByRole('region', { name: SHOW_CARD });
            expect(screen.getAllByRole('region', { name: SHOW_CARD })).toHaveLength(1);
            expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'split');
            expect(within(card).getByRole('slider', { name: '播放進度' })).toBeInTheDocument();
            expect(card).not.toContainElement(screen.getByRole('navigation', { name: '節目' }));
            expect(card).toHaveTextContent('Bad Girl大過佬');
        });

        it('should play today’s show from the card', async () => {
            stubWideLandscape();
            const { audio } = renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            const card = await screen.findByRole('region', { name: SHOW_CARD });

            await userEvent.click(within(card).getByRole('button', { name: '播放' }));

            expect(audio.src).toBe(BADGIRL_TODAY.url);
            expect(audio.play).toHaveBeenCalled();
        });

        it('should open the show page from the header row of the card', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            const card = await screen.findByRole('region', { name: SHOW_CARD });

            await userEvent.click(
                within(card).getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' }),
            );

            expect(screen.getByTestId('location')).toHaveTextContent('/show/badgirl');
        });

        it('should stop playback from the corner ✕ and keep a handle for the closed show', async () => {
            stubWideLandscape();
            const { audio } = await arriveHomeWith(WANNI_TODAY);
            await screen.findByRole('region', { name: SHOW_CARD });
            audio.pause.mockClear();

            await userEvent.click(screen.getByRole('button', { name: CLOSE }));

            expect(screen.queryByRole('region', { name: SHOW_CARD })).not.toBeInTheDocument();
            expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'fillWithHandle');
            expect(audio.pause).toHaveBeenCalled();
            expect(
                screen.getByRole('button', { name: '打開播放器：雲妮鍾情' }),
            ).toBeInTheDocument();
        });

        it('should use the mini player’s close icon on the corner button', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            await screen.findByRole('region', { name: SHOW_CARD });

            const icon = render(<PowerIcon />).container.querySelector('svg');
            const button = screen.getByRole('button', { name: CLOSE });
            expect(button.querySelector('svg')?.innerHTML).toBe(icon?.innerHTML);
        });

        it('should name the handle only through the close / open transition CSS', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            await screen.findByRole('region', { name: SHOW_CARD });

            await userEvent.click(screen.getByRole('button', { name: CLOSE }));

            // 平時冇名：返主頁（back）時成頁唔會縮入 26px 把手（S-642）
            const handle = screen.getByRole('button', { name: '打開播放器：Bad Girl大過佬' });
            expect(handle.style.getPropertyValue('view-transition-name')).toBe('');
            expect(handle).toHaveAttribute('data-home-handle');
        });

        it('should bring the closed show back paused from the handle', async () => {
            stubWideLandscape();
            const { audio } = await arriveHomeWith(WANNI_TODAY);
            await screen.findByRole('region', { name: SHOW_CARD });
            await userEvent.click(screen.getByRole('button', { name: CLOSE }));
            const plays = audio.play.mock.calls.length;

            await userEvent.click(screen.getByRole('button', { name: '打開播放器：雲妮鍾情' }));

            const card = screen.getByRole('region', { name: SHOW_CARD });
            expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'split');
            expect(card).toHaveTextContent('雲妮鍾情');
            expect(within(card).getByRole('button', { name: '播放' })).toBeInTheDocument();
            expect(audio.play).toHaveBeenCalledTimes(plays);
        });

        it('should keep a handle for a closed drama and bring it back paused', async () => {
            stubWideLandscape();
            const { audio } = await arriveHomeWith(seriesEpisodesOf('chisee')[0]!);
            await screen.findByRole('region', { name: DRAMA_CARD });
            await userEvent.click(screen.getByRole('button', { name: CLOSE }));
            const plays = audio.play.mock.calls.length;

            await userEvent.click(
                screen.getByRole('button', { name: '打開播放器：芝See菇Bi Family' }),
            );

            expect(screen.getByRole('region', { name: DRAMA_CARD })).toBeInTheDocument();
            expect(audio.play).toHaveBeenCalledTimes(plays);
        });
    });

    describe('switching between today’s shows on the card', () => {
        const swipeLeft = (target: HTMLElement) => {
            fireEvent.pointerDown(target, { clientX: 300, clientY: 10 });
            fireEvent.pointerUp(target, { clientX: 150, clientY: 10 });
        };

        it('should show dots under the header row and switch show from a dot', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            const card = await screen.findByRole('region', { name: SHOW_CARD });

            const dots = within(card).getByRole('group', { name: '今日第 1 個節目，共 2 個' });
            await userEvent.click(within(dots).getByRole('button', { name: '雲妮鍾情' }));

            expect(
                within(card).getByRole('button', { name: '開啟 雲妮鍾情 節目頁' }),
            ).toBeInTheDocument();
        });

        it('should switch show with a horizontal swipe on the card', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            const card = await screen.findByRole('region', { name: SHOW_CARD });

            swipeLeft(within(card).getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' }));

            expect(card).toHaveTextContent('雲妮鍾情');
        });

        it('should leave the show alone when the swipe starts on the disc', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            const card = await screen.findByRole('region', { name: SHOW_CARD });

            swipeLeft(within(card).getByRole('slider', { name: '播放進度' }));

            expect(card).toHaveTextContent('Bad Girl大過佬');
        });

        it('should play on the first tap of 播放 right after a swipe changed show', async () => {
            stubWideLandscape();
            const { audio } = renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            const card = await screen.findByRole('region', { name: SHOW_CARD });
            swipeLeft(within(card).getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' }));

            await userEvent.click(within(card).getByRole('button', { name: '播放' }));

            expect(audio.src).toBe(WANNI_TODAY.url);
            expect(audio.play).toHaveBeenCalled();
        });

        it('should tag today’s show next to its name in the header row', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            const card = await screen.findByRole('region', { name: SHOW_CARD });

            const header = within(card).getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' });
            expect(header.querySelector('[data-tag]')).toHaveTextContent('今日');
        });

        it('should have no dots for a single drama episode', async () => {
            stubWideLandscape();
            await arriveHomeWith(seriesEpisodesOf('chisee')[0]!);
            const card = await screen.findByRole('region', { name: DRAMA_CARD });

            expect(within(card).queryByRole('group')).not.toBeInTheDocument();
        });
    });

    describe('focus after closing or reopening the card', () => {
        const HEADER = '開啟 Bad Girl大過佬 節目頁';
        const HANDLE = '打開播放器：Bad Girl大過佬';

        it('should move focus to the handle after ✕, and to the card after reopening from it', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            await screen.findByRole('region', { name: SHOW_CARD });

            await userEvent.click(screen.getByRole('button', { name: CLOSE }));
            expect(screen.getByRole('button', { name: HANDLE })).toHaveFocus();

            await userEvent.click(screen.getByRole('button', { name: HANDLE }));
            expect(screen.getByRole('button', { name: HEADER })).toHaveFocus();
        });

        it('should leave focus alone when the card comes back because playback started', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            await screen.findByRole('region', { name: SHOW_CARD });
            await userEvent.click(screen.getByRole('button', { name: CLOSE }));

            act(() => {
                restoreMiniPlayer();
                openHomePlayerCard();
            });

            expect(screen.getByRole('button', { name: HEADER })).not.toHaveFocus();
        });
    });

    describe('episode list on the card (same as the page list)', () => {
        const FIRST = seriesEpisodesOf('chisee')[0]!;
        const ARC = episodesInArc(seriesEpisodesOf('chisee'), FIRST.arc);
        const scrollTo = vi.fn();

        beforeEach(() => {
            HTMLElement.prototype.scrollTo = scrollTo;
            Element.prototype.scrollIntoView = vi.fn();
        });

        const listOf = (card: HTMLElement) => within(card).getByRole('region', { name: '集數' });

        it('should list the whole arc of a series drama, current row marked and scrolled to', async () => {
            stubWideLandscape();
            await arriveHomeWith(FIRST);
            const card = await screen.findByRole('region', { name: DRAMA_CARD });

            const list = listOf(card);
            expect(list).toHaveTextContent(`共 ${ARC.length} 集`);
            expect(within(list).getAllByRole('listitem')).toHaveLength(ARC.length);
            expect(within(list).getByRole('button', { current: true })).toHaveAccessibleName(
                new RegExp(FIRST.title ?? ''),
            );
            expect(scrollTo).toHaveBeenCalled();
        });

        it('should play another row without leaving home', async () => {
            stubWideLandscape();
            const { audio } = await arriveHomeWith(FIRST);
            const list = listOf(await screen.findByRole('region', { name: DRAMA_CARD }));

            const rows = within(list).getAllByRole('button', { name: /^播放 / });
            await userEvent.click(rows[rows.length - 1] as HTMLElement);

            expect(audio.src).toBe(ARC[ARC.length - 1]?.url);
            expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
        });

        it('should list every episode of a daily drama like its page', async () => {
            stubWideLandscape();
            const episodes = dailyNewestFirst(dailyEpisodesOf('c18'));
            await arriveHomeWith(episodes[1]!);
            const list = listOf(await screen.findByRole('region', { name: DRAMA_CARD }));

            expect(within(list).getAllByRole('listitem')).toHaveLength(episodes.length);
            expect(within(list).getByRole('button', { current: true })).toBeInTheDocument();
        });

        it('should list every episode of the show like the show page, on any height', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            const list = listOf(await screen.findByRole('region', { name: SHOW_CARD }));

            expect(list).toHaveTextContent('共 3 集');
            expect(
                within(list)
                    .getAllByRole('listitem')
                    .map((row) => row.textContent),
            ).toEqual([
                expect.stringContaining('19/10'),
                expect.stringContaining('16/10'),
                expect.stringContaining('15/10'),
            ]);
            expect(within(list).getByRole('button', { current: true })).toHaveAccessibleName(
                /19\/10/,
            );
        });

        it('should keep the page heading, with no 下一集 / 昔日集數 / 全部', async () => {
            stubWideLandscape();
            renderWithProviders(<HomePage />, { recordings: RECORDINGS });
            const card = await screen.findByRole('region', { name: SHOW_CARD });

            expect(card).not.toHaveTextContent(/下一集|昔日集數/);
            expect(
                within(card).queryByRole('button', { name: '全部集數' }),
            ).not.toBeInTheDocument();
        });
    });
});
